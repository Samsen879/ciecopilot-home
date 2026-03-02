"""Property-based tests for cycle detection in dependency resolver.

# Feature: ms-rubric-extraction, Property 19: 依赖环检测

Uses hypothesis to verify:
- For ANY dependency graph containing a cycle (A->B->C->A), all rubric
  points participating in the cycle must have ``status='needs_review'``
  and ``parse_flags.cycle=true``.
- Non-cycle points in the same scope must NOT be marked with cycle=true.

**Validates: Requirements 4.5**
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

from scripts.ms.dependency_resolver import detect_cycles, resolve_dependencies

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_SCOPE_KEY = ("sk/test/ms.png", 1, "", "v1", "dashscope", "qwen-vl-max", "ms_v1")

# Labels guaranteed unique within a test scope
_UNIQUE_LABELS = [
    "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8",
    "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
    "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8",
]

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


def _parse_flags(params: dict) -> dict:
    """Parse parse_flags from update params (may be str or dict)."""
    pf = params["parse_flags"]
    if isinstance(pf, str):
        pf = json.loads(pf)
    return pf


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------


@st.composite
def _simple_cycle(draw):
    """Generate a cycle of length 2-8 where each point depends on the next,
    and the last depends on the first.  All labels are unique so Phase 1
    resolves successfully, and the cycle is detected in Phase 2.

    Returns ``(rows, cycle_rids)`` where *cycle_rids* is the set of
    rubric_id strings forming the cycle.
    """
    cycle_len = draw(st.integers(min_value=2, max_value=8))
    labels = draw(
        st.lists(
            st.sampled_from(_UNIQUE_LABELS),
            min_size=cycle_len,
            max_size=cycle_len,
            unique=True,
        )
    )

    rids = [str(uuid.uuid4()) for _ in range(cycle_len)]

    rows = []
    for i, (rid, label) in enumerate(zip(rids, labels)):
        # Each point depends on the NEXT point's label; last wraps to first
        dep_label = labels[(i + 1) % cycle_len]
        rows.append((
            rid,
            label,
            i,             # step_index
            [dep_label],   # depends_on_labels
            "draft",
            "{}",
        ))

    return rows, set(rids)


@st.composite
def _cycle_with_non_cycle_points(draw):
    """Generate a scope containing both a cycle and non-cycle points.
    Non-cycle points have no dependencies (or depend on a unique label
    that resolves cleanly).

    Returns ``(rows, cycle_rids, non_cycle_rids)``.
    """
    # Cycle portion
    cycle_len = draw(st.integers(min_value=2, max_value=6))
    n_extra = draw(st.integers(min_value=1, max_value=4))

    total = cycle_len + n_extra
    labels = draw(
        st.lists(
            st.sampled_from(_UNIQUE_LABELS),
            min_size=total,
            max_size=total,
            unique=True,
        )
    )

    cycle_labels = labels[:cycle_len]
    extra_labels = labels[cycle_len:]

    cycle_rids = [str(uuid.uuid4()) for _ in range(cycle_len)]
    extra_rids = [str(uuid.uuid4()) for _ in range(n_extra)]

    rows = []
    # Cycle points
    for i, (rid, label) in enumerate(zip(cycle_rids, cycle_labels)):
        dep_label = cycle_labels[(i + 1) % cycle_len]
        rows.append((rid, label, i, [dep_label], "draft", "{}"))

    # Non-cycle points (no dependencies)
    for j, (rid, label) in enumerate(zip(extra_rids, extra_labels)):
        rows.append((rid, label, cycle_len + j, [], "draft", "{}"))

    return rows, set(cycle_rids), set(extra_rids)


# ---------------------------------------------------------------------------
# Property 19: 依赖环检测
# ---------------------------------------------------------------------------


class TestProperty19CycleDetection:
    """
    **Property 19**: For ANY dependency graph containing a cycle
    (A->B->C->A), all rubric points participating in the cycle must have
    ``status='needs_review'`` and ``parse_flags.cycle=true``.

    **Validates: Requirements 4.5**
    """

    # --- Test 1: detect_cycles function directly ---

    @given(data=_simple_cycle())
    @settings(max_examples=100, deadline=None)
    def test_detect_cycles_finds_cycle(self, data):
        """detect_cycles should find at least one cycle when the graph
        contains a known cycle."""
        rows, cycle_rids = data

        # Build the resolved graph as detect_cycles expects:
        # Each point's depends_on should be the UUID of the point whose
        # label it references.
        label_to_rid = {row[1]: row[0] for row in rows}
        points = []
        for row in rows:
            rid, label, step_idx, dep_labels, status, pf = row
            resolved_deps = [label_to_rid[dl] for dl in dep_labels]
            points.append({"rubric_id": rid, "depends_on": resolved_deps})

        cycles = detect_cycles(points)

        assert len(cycles) >= 1, (
            f"Expected at least 1 cycle, got {len(cycles)}"
        )

        # All nodes in the detected cycles should be from our cycle_rids
        detected_ids: set[str] = set()
        for cycle in cycles:
            for rid in cycle:
                detected_ids.add(rid)

        # Every detected node must be a cycle participant
        assert detected_ids.issubset(cycle_rids), (
            f"Detected cycle nodes {detected_ids - cycle_rids} are not in "
            f"the expected cycle set"
        )

    # --- Test 2: Full resolve_dependencies with cycle ---

    @given(data=_simple_cycle())
    @settings(max_examples=100, deadline=None)
    def test_cycle_points_get_needs_review(self, data):
        """All points in a cycle should get status='needs_review' and
        parse_flags.cycle=true after resolve_dependencies."""
        rows, cycle_rids = data

        pool, cursor = _build_mock_pool(rows)
        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        update_map = _extract_update_map(cursor, len(rows))

        for rid in cycle_rids:
            assert rid in update_map, f"Cycle point {rid} not in updates"
            params = update_map[rid]
            pf = _parse_flags(params)

            assert params["status"] == "needs_review", (
                f"Cycle point {rid} should have status='needs_review', "
                f"got '{params['status']}'"
            )
            assert pf.get("cycle") is True, (
                f"Cycle point {rid} should have parse_flags.cycle=true, "
                f"got parse_flags={pf}"
            )

        assert result["cycles"] >= 1, (
            f"Expected cycles >= 1, got {result['cycles']}"
        )

    # --- Test 3: Non-cycle points not affected ---

    @given(data=_cycle_with_non_cycle_points())
    @settings(max_examples=100, deadline=None)
    def test_non_cycle_points_not_marked_cycle(self, data):
        """Points NOT participating in a cycle should NOT have
        parse_flags.cycle=true."""
        rows, cycle_rids, non_cycle_rids = data

        pool, cursor = _build_mock_pool(rows)
        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        update_map = _extract_update_map(cursor, len(rows))

        for rid in non_cycle_rids:
            assert rid in update_map, f"Non-cycle point {rid} not in updates"
            params = update_map[rid]
            pf = _parse_flags(params)

            assert pf.get("cycle") is not True, (
                f"Non-cycle point {rid} should NOT have cycle=true, "
                f"got parse_flags={pf}"
            )

        # Cycle points should still be marked
        for rid in cycle_rids:
            params = update_map[rid]
            pf = _parse_flags(params)
            assert pf.get("cycle") is True, (
                f"Cycle point {rid} should have cycle=true"
            )

    # --- Test 4: 2-node cycle (minimal) ---

    @given(st.data())
    @settings(max_examples=100, deadline=None)
    def test_two_node_cycle(self, data):
        """Minimal cycle: A->B, B->A."""
        labels = data.draw(
            st.lists(
                st.sampled_from(_UNIQUE_LABELS),
                min_size=2,
                max_size=2,
                unique=True,
            )
        )
        rid_a = str(uuid.uuid4())
        rid_b = str(uuid.uuid4())

        rows = [
            (rid_a, labels[0], 0, [labels[1]], "draft", "{}"),
            (rid_b, labels[1], 1, [labels[0]], "draft", "{}"),
        ]

        pool, cursor = _build_mock_pool(rows)
        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        update_map = _extract_update_map(cursor, 2)

        for rid in [rid_a, rid_b]:
            params = update_map[rid]
            pf = _parse_flags(params)
            assert params["status"] == "needs_review"
            assert pf.get("cycle") is True

        assert result["cycles"] >= 1

    # --- Test 5: detect_cycles returns empty for acyclic graph ---

    @given(
        n_points=st.integers(min_value=2, max_value=8),
    )
    @settings(max_examples=100, deadline=None)
    def test_detect_cycles_empty_for_acyclic(self, n_points: int):
        """detect_cycles should return an empty list for a strictly
        acyclic (chain) graph: A->B->C->... (no back edge)."""
        rids = [str(uuid.uuid4()) for _ in range(n_points)]

        # Linear chain: each depends on the next, last has no deps
        points = []
        for i, rid in enumerate(rids):
            deps = [rids[i + 1]] if i < n_points - 1 else []
            points.append({"rubric_id": rid, "depends_on": deps})

        cycles = detect_cycles(points)
        assert cycles == [], (
            f"Acyclic chain should have no cycles, got {cycles}"
        )
