"""Property-based tests for dependency resolution scope isolation.

# Feature: ms-rubric-extraction, Property 15: 依赖解析范围隔离

Uses hypothesis to verify:
- For ANY two different scope_keys, dependency resolution for one scope
  must NEVER reference rubric_ids from the other scope.
- Each call to ``resolve_dependencies`` only sees points returned by
  its own scope-filtered SQL query, so resolved ``depends_on`` UUIDs
  must be a subset of the rubric_ids within that same scope.

**Validates: Requirements 4.1**
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.dependency_resolver import resolve_dependencies

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_SCOPE_KEY_A = ("sk/scope_a/ms.png", 1, "", "v1", "dashscope", "qwen-vl-max", "ms_v1")
_SCOPE_KEY_B = ("sk/scope_b/ms.png", 2, "a", "v1", "dashscope", "qwen-vl-max", "ms_v1")

# Unique labels per scope to avoid accidental overlap
_LABELS_A = ["M1", "M2", "A1", "A2", "B1", "B2"]
_LABELS_B = ["M1", "M2", "A1", "A2", "B1", "B2"]

# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------


def _build_mock_pool_for_scope(scope_rows: list[tuple]):
    """Build a mock pool that returns *scope_rows* on fetchall and
    captures UPDATE executions for later inspection."""
    pool = MagicMock()
    conn = MagicMock()
    cursor = MagicMock()

    pool.getconn.return_value = conn
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    cursor.fetchall.return_value = scope_rows

    return pool, cursor


def _extract_update_map(cursor, n_rows: int) -> dict[str, dict]:
    """Extract rubric_id -> update params from mock cursor calls."""
    all_executes = cursor.execute.call_args_list
    # First call is the SELECT, rest are UPDATEs
    update_executes = all_executes[1:]
    assert len(update_executes) == n_rows, (
        f"Expected {n_rows} UPDATE calls, got {len(update_executes)}"
    )
    update_map: dict[str, dict] = {}
    for call_args in update_executes:
        params = call_args[0][1]
        update_map[params["rubric_id"]] = params
    return update_map


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------


@st.composite
def _two_scope_point_sets(draw):
    """Generate two independent sets of rubric points for two different
    scopes.  Each scope has unique rubric_ids and may have internal
    dependencies (using labels that exist within the same scope).

    Returns ``(rows_a, rids_a, rows_b, rids_b)`` where:
    - *rows_a* / *rows_b* are lists of tuples matching the SQL columns
    - *rids_a* / *rids_b* are sets of rubric_id strings per scope
    """
    n_a = draw(st.integers(min_value=2, max_value=6))
    n_b = draw(st.integers(min_value=2, max_value=6))

    labels_a = draw(st.lists(
        st.sampled_from(_LABELS_A), min_size=n_a, max_size=n_a, unique=True,
    ))
    labels_b = draw(st.lists(
        st.sampled_from(_LABELS_B), min_size=n_b, max_size=n_b, unique=True,
    ))

    # Generate unique UUIDs for each scope
    rids_a = [str(uuid.uuid4()) for _ in range(n_a)]
    rids_b = [str(uuid.uuid4()) for _ in range(n_b)]

    # Ensure no UUID overlap between scopes
    assume(set(rids_a).isdisjoint(set(rids_b)))

    rows_a = []
    for i, (rid, label) in enumerate(zip(rids_a, labels_a)):
        # Optionally depend on a preceding label within scope A
        dep_labels: list[str] = []
        if i > 0 and draw(st.booleans()):
            dep_labels = [draw(st.sampled_from(labels_a[:i]))]
        rows_a.append((rid, label, i, dep_labels, "draft", "{}"))

    rows_b = []
    for i, (rid, label) in enumerate(zip(rids_b, labels_b)):
        dep_labels = []
        if i > 0 and draw(st.booleans()):
            dep_labels = [draw(st.sampled_from(labels_b[:i]))]
        rows_b.append((rid, label, i, dep_labels, "draft", "{}"))

    return rows_a, set(rids_a), rows_b, set(rids_b)


@st.composite
def _scope_with_internal_deps(draw):
    """Generate a single scope with internal dependencies that all
    resolve successfully (unique labels, preceding deps only).

    Returns ``(rows, rids_set)`` where *rids_set* is the set of
    rubric_id strings in this scope.
    """
    n = draw(st.integers(min_value=2, max_value=6))
    labels = draw(st.lists(
        st.sampled_from(_LABELS_A), min_size=n, max_size=n, unique=True,
    ))
    rids = [str(uuid.uuid4()) for _ in range(n)]

    rows = []
    for i, (rid, label) in enumerate(zip(rids, labels)):
        dep_labels: list[str] = []
        if i > 0 and draw(st.booleans()):
            dep_labels = [labels[i - 1]]  # depend on immediately preceding
        rows.append((rid, label, i, dep_labels, "draft", "{}"))

    return rows, set(rids)


# ---------------------------------------------------------------------------
# Property 15: 依赖解析范围隔离
# ---------------------------------------------------------------------------


class TestProperty15ScopeIsolation:
    """
    **Property 15**: For ANY two different scope_keys, dependency
    resolution for one scope must never reference rubric_ids from the
    other scope.

    **Validates: Requirements 4.1**
    """

    @given(data=_two_scope_point_sets())
    @settings(max_examples=100, deadline=None)
    def test_resolved_uuids_only_from_own_scope(self, data):
        """Resolved depends_on UUIDs for scope A must all belong to
        scope A's rubric_ids, and likewise for scope B.  No cross-scope
        references should exist."""
        rows_a, rids_a, rows_b, rids_b = data

        # --- Resolve scope A ---
        pool_a, cursor_a = _build_mock_pool_for_scope(rows_a)
        resolve_dependencies(pool_a, _SCOPE_KEY_A, dry_run=False)

        update_map_a = _extract_update_map(cursor_a, len(rows_a))

        # Collect all resolved UUIDs from scope A
        all_resolved_a: set[str] = set()
        for rid, params in update_map_a.items():
            deps = params.get("depends_on", [])
            all_resolved_a.update(deps)

        # --- Resolve scope B ---
        pool_b, cursor_b = _build_mock_pool_for_scope(rows_b)
        resolve_dependencies(pool_b, _SCOPE_KEY_B, dry_run=False)

        update_map_b = _extract_update_map(cursor_b, len(rows_b))

        # Collect all resolved UUIDs from scope B
        all_resolved_b: set[str] = set()
        for rid, params in update_map_b.items():
            deps = params.get("depends_on", [])
            all_resolved_b.update(deps)

        # --- Property 15 assertions ---

        # All resolved UUIDs from scope A must be within scope A's rids
        leaked_to_a = all_resolved_a - rids_a
        assert not leaked_to_a, (
            f"Scope A resolved depends_on contains UUIDs not in scope A: "
            f"{leaked_to_a}"
        )

        # All resolved UUIDs from scope B must be within scope B's rids
        leaked_to_b = all_resolved_b - rids_b
        assert not leaked_to_b, (
            f"Scope B resolved depends_on contains UUIDs not in scope B: "
            f"{leaked_to_b}"
        )

        # No overlap: scope A's resolved UUIDs must not include any of B's rids
        cross_a_to_b = all_resolved_a & rids_b
        assert not cross_a_to_b, (
            f"Scope A resolved UUIDs reference scope B's rubric_ids: "
            f"{cross_a_to_b}"
        )

        # No overlap: scope B's resolved UUIDs must not include any of A's rids
        cross_b_to_a = all_resolved_b & rids_a
        assert not cross_b_to_a, (
            f"Scope B resolved UUIDs reference scope A's rubric_ids: "
            f"{cross_b_to_a}"
        )

    @given(data=_two_scope_point_sets())
    @settings(max_examples=100, deadline=None)
    def test_scope_a_unaware_of_scope_b_labels(self, data):
        """Even when both scopes use the same mark_label strings (e.g.
        both have "M1"), scope A's resolution must only use scope A's
        rubric_ids.  The mock ensures each scope only sees its own rows."""
        rows_a, rids_a, rows_b, rids_b = data

        # Resolve scope A with only scope A's rows
        pool_a, cursor_a = _build_mock_pool_for_scope(rows_a)
        result_a = resolve_dependencies(pool_a, _SCOPE_KEY_A, dry_run=False)

        update_map_a = _extract_update_map(cursor_a, len(rows_a))

        # Every point updated in scope A must have rubric_id from scope A
        for rid in update_map_a:
            assert rid in rids_a, (
                f"Update for rubric_id {rid} not in scope A's rids"
            )

        # Every depends_on UUID must be from scope A
        for rid, params in update_map_a.items():
            for dep_uuid in params.get("depends_on", []):
                assert dep_uuid in rids_a, (
                    f"Point {rid} in scope A depends on {dep_uuid} "
                    f"which is not in scope A"
                )

        assert result_a["total"] == len(rows_a)

    @given(data=_scope_with_internal_deps())
    @settings(max_examples=100, deadline=None)
    def test_single_scope_self_contained(self, data):
        """A single scope's resolved dependencies must be entirely
        self-contained — all depends_on UUIDs must be rubric_ids from
        the same scope."""
        rows, rids_set = data

        pool, cursor = _build_mock_pool_for_scope(rows)
        result = resolve_dependencies(pool, _SCOPE_KEY_A, dry_run=False)

        update_map = _extract_update_map(cursor, len(rows))

        all_resolved: set[str] = set()
        for rid, params in update_map.items():
            deps = params.get("depends_on", [])
            all_resolved.update(deps)

        # All resolved UUIDs must be within this scope
        outside = all_resolved - rids_set
        assert not outside, (
            f"Resolved UUIDs {outside} are not in the scope's rubric_ids"
        )

        assert result["total"] == len(rows)

    @given(data=_two_scope_point_sets())
    @settings(max_examples=100, deadline=None)
    def test_scope_key_params_passed_to_sql(self, data):
        """Verify that resolve_dependencies passes the correct scope_key
        fields as SQL parameters, ensuring the WHERE clause filters by
        all scope dimensions."""
        rows_a, rids_a, rows_b, rids_b = data

        pool_a, cursor_a = _build_mock_pool_for_scope(rows_a)
        resolve_dependencies(pool_a, _SCOPE_KEY_A, dry_run=False)

        # The first execute call is the SELECT with scope params
        select_call = cursor_a.execute.call_args_list[0]
        sql_text = select_call[0][0]
        sql_params = select_call[0][1]

        # Verify all scope_key fields are in the params
        assert sql_params["storage_key"] == _SCOPE_KEY_A[0]
        assert sql_params["q_number"] == _SCOPE_KEY_A[1]
        assert sql_params["subpart"] == _SCOPE_KEY_A[2]
        assert sql_params["extractor_version"] == _SCOPE_KEY_A[3]
        assert sql_params["provider"] == _SCOPE_KEY_A[4]
        assert sql_params["model"] == _SCOPE_KEY_A[5]
        assert sql_params["prompt_version"] == _SCOPE_KEY_A[6]
