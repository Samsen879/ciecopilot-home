"""Property-based tests for unresolved label handling in dependency resolver.

# Feature: ms-rubric-extraction, Property 17: 未解析标签处理

Uses hypothesis to verify:
- For ANY rubric point whose ``depends_on_labels`` contains a label that
  does NOT exist in the same scope, ``status`` must be ``needs_review``
  and ``parse_flags.unresolved_labels`` must contain that label.

**Validates: Requirements 4.3**
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, call

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.dependency_resolver import resolve_dependencies

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Valid mark labels that exist in the scope
_valid_label = st.sampled_from(["M1", "M2", "A1", "A2", "B1", "B2", "M3", "A3"])

# Labels that will NOT exist in the scope (used as unresolved references)
_ghost_label = st.sampled_from([
    "M99", "A99", "B99", "X1", "Z5", "M100", "A200", "NOPE", "Q1",
])

# Fixed scope key for all tests
_SCOPE_KEY = ("sk/test/ms.png", 1, "", "v1", "dashscope", "qwen-vl-max", "ms_v1")


@st.composite
def _rubric_points_with_ghosts(draw):
    """Generate a list of rubric points where at least one point depends on
    a label that does not exist in the scope.

    Returns ``(rows, ghost_map)`` where:
    - *rows* is a list of tuples matching the SQL fetch columns:
      ``(rubric_id, mark_label, step_index, depends_on_labels, status, parse_flags)``
    - *ghost_map* is ``{rubric_id: [ghost_labels]}`` for points that
      reference non-existent labels.
    """
    # Decide how many "real" points to create (at least 1)
    n_real = draw(st.integers(min_value=1, max_value=8))

    # Pick unique labels for the real points
    all_labels = ["M1", "M2", "M3", "A1", "A2", "A3", "B1", "B2"]
    used_labels = draw(
        st.lists(
            st.sampled_from(all_labels),
            min_size=n_real,
            max_size=n_real,
            unique=True,
        )
    )

    rows = []
    ghost_map: dict[str, list[str]] = {}

    for i, label in enumerate(used_labels):
        rid = str(uuid.uuid4())
        step_index = i

        # Decide if this point has ghost dependencies
        has_ghost = draw(st.booleans())

        dep_labels: list[str] = []
        ghosts: list[str] = []

        if has_ghost:
            # Add 1-3 ghost labels
            n_ghosts = draw(st.integers(min_value=1, max_value=3))
            ghosts = draw(
                st.lists(
                    _ghost_label,
                    min_size=n_ghosts,
                    max_size=n_ghosts,
                    unique=True,
                )
            )
            # Make sure none of the ghost labels accidentally match a real label
            ghosts = [g for g in ghosts if g not in used_labels]
            if not ghosts:
                # Force at least one truly non-existent label
                ghosts = ["ZZZZZ_NONEXISTENT"]
            dep_labels.extend(ghosts)
            ghost_map[rid] = ghosts

        # Optionally also depend on a real label (valid dep)
        if draw(st.booleans()) and i > 0:
            # Pick a preceding label to depend on
            valid_dep = draw(st.sampled_from(used_labels[:i]))
            dep_labels.append(valid_dep)

        rows.append((
            rid,           # rubric_id
            label,         # mark_label
            step_index,    # step_index
            dep_labels,    # depends_on_labels
            "draft",       # status
            "{}",          # parse_flags (JSON string)
        ))

    # Ensure at least one point has ghost deps
    assume(len(ghost_map) > 0)

    return rows, ghost_map


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------

def _build_mock_pool(rows: list[tuple]):
    """Build a mock pool that returns *rows* on fetchall and captures
    UPDATE executions for later inspection."""
    pool = MagicMock()
    conn = MagicMock()
    cursor = MagicMock()

    pool.getconn.return_value = conn
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    cursor.fetchall.return_value = rows

    return pool, cursor


# ---------------------------------------------------------------------------
# Property 17: 未解析标签处理
# ---------------------------------------------------------------------------


class TestProperty17UnresolvedLabels:
    """
    **Property 17**: For ANY rubric point whose ``depends_on_labels``
    contains a label that does not exist within the same scope,
    ``status`` must be ``needs_review`` and
    ``parse_flags.unresolved_labels`` must contain that label.

    **Validates: Requirements 4.3**
    """

    @given(data=_rubric_points_with_ghosts())
    @settings(max_examples=100, deadline=None)
    def test_unresolved_labels_set_needs_review(self, data):
        """Points referencing non-existent labels get needs_review status
        and unresolved_labels in parse_flags."""
        rows, ghost_map = data

        pool, cursor = _build_mock_pool(rows)

        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        # Collect all UPDATE calls
        update_calls = cursor.execute.call_args_list
        # First call is the SELECT (fetchall), subsequent are UPDATEs
        # Actually, the SELECT uses a separate cursor context; the UPDATE
        # calls happen in a second getconn() context.
        # Let's inspect the second pool.getconn() call's cursor.

        # The implementation calls pool.getconn() twice:
        # 1st for SELECT (read phase)
        # 2nd for UPDATE (write phase)
        assert pool.getconn.call_count == 2, (
            f"Expected 2 getconn calls, got {pool.getconn.call_count}"
        )

        # Since both getconn() calls return the same mock conn,
        # all cursor.execute calls are on the same cursor mock.
        # The first execute is the SELECT, the rest are UPDATEs.
        all_executes = cursor.execute.call_args_list

        # First call is the SELECT
        # Remaining calls are UPDATEs (one per point)
        update_executes = all_executes[1:]  # skip the SELECT

        assert len(update_executes) == len(rows), (
            f"Expected {len(rows)} UPDATE calls, got {len(update_executes)}"
        )

        # Build a map: rubric_id -> update params
        update_map: dict[str, dict] = {}
        for call_args in update_executes:
            params = call_args[0][1]  # positional arg [1] is the params dict
            update_map[params["rubric_id"]] = params

        # Verify Property 17 for every point with ghost dependencies
        for rid, ghost_labels in ghost_map.items():
            assert rid in update_map, f"rubric_id {rid} not found in updates"
            params = update_map[rid]

            # Status must be needs_review
            assert params["status"] == "needs_review", (
                f"Point {rid} with unresolved labels {ghost_labels} "
                f"should have status='needs_review', got '{params['status']}'"
            )

            # parse_flags must contain unresolved_labels with the ghost labels
            pf = params["parse_flags"]
            if isinstance(pf, str):
                pf = json.loads(pf)

            assert "unresolved_labels" in pf, (
                f"Point {rid} missing 'unresolved_labels' in parse_flags: {pf}"
            )

            for gl in ghost_labels:
                assert gl in pf["unresolved_labels"], (
                    f"Ghost label '{gl}' not found in unresolved_labels "
                    f"for point {rid}: {pf['unresolved_labels']}"
                )

        # Also verify counters
        assert result["unresolved"] >= 1, (
            f"Expected at least 1 unresolved, got {result['unresolved']}"
        )
        assert result["total"] == len(rows)

    @given(data=_rubric_points_with_ghosts())
    @settings(max_examples=100, deadline=None)
    def test_points_without_ghosts_not_marked_unresolved(self, data):
        """Points that do NOT reference non-existent labels should NOT
        have unresolved_labels in their parse_flags (unless they have
        other issues like cycles)."""
        rows, ghost_map = data

        pool, cursor = _build_mock_pool(rows)

        resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        all_executes = cursor.execute.call_args_list
        update_executes = all_executes[1:]

        # Build update map
        update_map: dict[str, dict] = {}
        for call_args in update_executes:
            params = call_args[0][1]
            update_map[params["rubric_id"]] = params

        # Check points that have NO ghost deps
        ghost_rids = set(ghost_map.keys())
        for rid, params in update_map.items():
            if rid not in ghost_rids:
                pf = params["parse_flags"]
                if isinstance(pf, str):
                    pf = json.loads(pf)
                # Should not have unresolved_labels
                assert "unresolved_labels" not in pf or pf["unresolved_labels"] == [], (
                    f"Point {rid} without ghost deps should not have "
                    f"unresolved_labels, got: {pf}"
                )

    @given(
        n_ghosts=st.integers(min_value=1, max_value=5),
    )
    @settings(max_examples=100, deadline=None)
    def test_single_point_all_deps_unresolved(self, n_ghosts: int):
        """A single point whose ALL dependencies are non-existent labels
        should be needs_review with all labels in unresolved_labels."""
        rid = str(uuid.uuid4())
        ghost_labels = [f"GHOST_{i}" for i in range(n_ghosts)]

        rows = [(
            rid,
            "M1",
            0,
            ghost_labels,
            "draft",
            "{}",
        )]

        pool, cursor = _build_mock_pool(rows)

        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        # Get the UPDATE params
        all_executes = cursor.execute.call_args_list
        update_executes = all_executes[1:]
        assert len(update_executes) == 1

        params = update_executes[0][0][1]
        assert params["status"] == "needs_review"

        pf = params["parse_flags"]
        if isinstance(pf, str):
            pf = json.loads(pf)

        assert set(pf["unresolved_labels"]) == set(ghost_labels)
        assert result["unresolved"] == 1
        assert result["total"] == 1
