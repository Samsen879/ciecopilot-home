"""Property-based tests for ambiguous label handling in dependency resolver.

# Feature: ms-rubric-extraction, Property 18: 歧义标签处理

Uses hypothesis to verify:
- For ANY scope with duplicate ``mark_label`` values, the resolver should
  prefer the nearest preceding ``step_index`` match.
- If still ambiguous (no preceding candidates, or ties at the same
  step_index), ``status`` must be ``needs_review`` and
  ``parse_flags.ambiguous_candidates`` must record the candidate list.

**Validates: Requirements 4.4**
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

_SCOPE_KEY = ("sk/test/ms.png", 1, "", "v1", "dashscope", "qwen-vl-max", "ms_v1")

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

# Labels used for duplication
_dup_label_pool = ["M1", "M2", "A1", "A2", "B1", "B2"]


@st.composite
def _nearest_preceding_resolves(draw):
    """Generate a scenario where duplicate labels exist but the nearest
    preceding step_index uniquely resolves the dependency.

    Layout:
    - Two (or more) points share the same ``mark_label`` at different
      step_index values.
    - A dependent point at a higher step_index references that label.
    - Exactly one candidate precedes the dependent point, OR multiple
      precede but the nearest one is unique (no ties).

    Returns ``(rows, dependent_rid, expected_resolved_rid)``.
    """
    dup_label = draw(st.sampled_from(_dup_label_pool))

    # Create 2-4 points with the same label at distinct step_indices
    n_dups = draw(st.integers(min_value=2, max_value=4))
    dup_steps = sorted(draw(
        st.lists(
            st.integers(min_value=0, max_value=50),
            min_size=n_dups,
            max_size=n_dups,
            unique=True,
        )
    ))

    dup_rids = [str(uuid.uuid4()) for _ in range(n_dups)]

    # The dependent point must be at a step_index higher than at least one
    # duplicate, and the nearest preceding must be unique (no tie).
    dep_step = draw(st.integers(
        min_value=dup_steps[0] + 1,
        max_value=100,
    ))

    # Preceding candidates: those with step_index < dep_step
    preceding = [(rid, si) for rid, si in zip(dup_rids, dup_steps) if si < dep_step]
    assume(len(preceding) >= 1)

    # The nearest preceding is the one with max step_index
    nearest_step = max(s for _, s in preceding)
    at_nearest = [r for r, s in preceding if s == nearest_step]
    # For this strategy we want unique resolution (no tie)
    assume(len(at_nearest) == 1)

    expected_resolved_rid = at_nearest[0]
    dep_rid = str(uuid.uuid4())

    rows = []
    for rid, si in zip(dup_rids, dup_steps):
        rows.append((rid, dup_label, si, [], "draft", "{}"))

    # Add the dependent point with a different label
    dep_label = draw(st.sampled_from(["M9", "A9", "B9"]))
    rows.append((dep_rid, dep_label, dep_step, [dup_label], "draft", "{}"))

    return rows, dep_rid, expected_resolved_rid


@st.composite
def _no_preceding_ambiguous(draw):
    """Generate a scenario where duplicate labels exist but ALL candidates
    have step_index >= the dependent point, so no preceding candidate
    exists and the result is ambiguous.

    Returns ``(rows, dep_rid, dup_label, candidate_rids)``.
    """
    dup_label = draw(st.sampled_from(_dup_label_pool))

    n_dups = draw(st.integers(min_value=2, max_value=4))
    # All duplicates at step_index > dep_step
    dep_step = draw(st.integers(min_value=0, max_value=10))
    dup_steps = sorted(draw(
        st.lists(
            st.integers(min_value=dep_step + 1, max_value=100),
            min_size=n_dups,
            max_size=n_dups,
            unique=True,
        )
    ))

    dup_rids = [str(uuid.uuid4()) for _ in range(n_dups)]
    dep_rid = str(uuid.uuid4())

    rows = []
    # Dependent point comes first (lowest step_index)
    dep_label = draw(st.sampled_from(["M9", "A9", "B9"]))
    rows.append((dep_rid, dep_label, dep_step, [dup_label], "draft", "{}"))

    for rid, si in zip(dup_rids, dup_steps):
        rows.append((rid, dup_label, si, [], "draft", "{}"))

    return rows, dep_rid, dup_label, dup_rids


@st.composite
def _same_step_tie_ambiguous(draw):
    """Generate a scenario where multiple candidates share the same
    nearest preceding step_index, creating an unresolvable tie.

    Returns ``(rows, dep_rid, dup_label, candidate_rids)``.
    """
    dup_label = draw(st.sampled_from(_dup_label_pool))

    # At least 2 candidates at the SAME step_index (tie)
    n_tied = draw(st.integers(min_value=2, max_value=4))
    tied_step = draw(st.integers(min_value=0, max_value=50))
    tied_rids = [str(uuid.uuid4()) for _ in range(n_tied)]

    dep_step = tied_step + draw(st.integers(min_value=1, max_value=50))
    dep_rid = str(uuid.uuid4())

    rows = []
    for rid in tied_rids:
        rows.append((rid, dup_label, tied_step, [], "draft", "{}"))

    dep_label = draw(st.sampled_from(["M9", "A9", "B9"]))
    rows.append((dep_rid, dep_label, dep_step, [dup_label], "draft", "{}"))

    # All tied_rids are candidates
    all_candidate_rids = tied_rids

    return rows, dep_rid, dup_label, all_candidate_rids


# ---------------------------------------------------------------------------
# Property 18: 歧义标签处理
# ---------------------------------------------------------------------------


class TestProperty18AmbiguousLabels:
    """
    **Property 18**: For ANY scope with duplicate ``mark_label`` values,
    the resolver should prefer the nearest preceding ``step_index`` match.
    If still ambiguous, ``status`` must be ``needs_review`` and
    ``parse_flags.ambiguous_candidates`` must record the candidate list.

    **Validates: Requirements 4.4**
    """

    @given(data=_nearest_preceding_resolves())
    @settings(max_examples=100, deadline=None)
    def test_nearest_preceding_resolves_uniquely(self, data):
        """When duplicate labels exist but the nearest preceding
        step_index uniquely identifies one candidate, the dependency
        should resolve successfully (status='ready')."""
        rows, dep_rid, expected_resolved_rid = data

        pool, cursor = _build_mock_pool(rows)
        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        update_map = _extract_update_map(cursor, len(rows))

        params = update_map[dep_rid]
        pf = _parse_flags(params)

        # Should resolve, not be ambiguous
        assert params["status"] == "ready", (
            f"Dependent point {dep_rid} should be 'ready' when nearest "
            f"preceding resolves uniquely, got '{params['status']}'"
        )
        assert "ambiguous_candidates" not in pf, (
            f"Should not have ambiguous_candidates when resolved: {pf}"
        )
        # depends_on should contain the expected resolved UUID
        assert expected_resolved_rid in params["depends_on"], (
            f"Expected {expected_resolved_rid} in depends_on, "
            f"got {params['depends_on']}"
        )

    @given(data=_no_preceding_ambiguous())
    @settings(max_examples=100, deadline=None)
    def test_no_preceding_candidates_is_ambiguous(self, data):
        """When duplicate labels exist but no candidate precedes the
        dependent point (all at higher step_index), the result should
        be ambiguous with needs_review status."""
        rows, dep_rid, dup_label, candidate_rids = data

        pool, cursor = _build_mock_pool(rows)
        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        update_map = _extract_update_map(cursor, len(rows))

        params = update_map[dep_rid]
        pf = _parse_flags(params)

        # Must be needs_review
        assert params["status"] == "needs_review", (
            f"Point {dep_rid} with no preceding candidates should be "
            f"'needs_review', got '{params['status']}'"
        )

        # Must have ambiguous_candidates
        assert "ambiguous_candidates" in pf, (
            f"Missing 'ambiguous_candidates' in parse_flags: {pf}"
        )

        # Find the entry for our duplicate label
        amb_entries = pf["ambiguous_candidates"]
        matching = [e for e in amb_entries if e["label"] == dup_label]
        assert len(matching) == 1, (
            f"Expected exactly 1 ambiguous entry for label '{dup_label}', "
            f"got {len(matching)}: {amb_entries}"
        )

        # Candidates should include all duplicate rubric_ids
        recorded_candidates = set(matching[0]["candidates"])
        expected_candidates = set(candidate_rids)
        assert expected_candidates == recorded_candidates, (
            f"Expected candidates {expected_candidates}, "
            f"got {recorded_candidates}"
        )

        # Counter check
        assert result["ambiguous"] >= 1

    @given(data=_same_step_tie_ambiguous())
    @settings(max_examples=100, deadline=None)
    def test_same_step_index_tie_is_ambiguous(self, data):
        """When multiple candidates share the same nearest preceding
        step_index (a tie), the result should be ambiguous."""
        rows, dep_rid, dup_label, candidate_rids = data

        pool, cursor = _build_mock_pool(rows)
        result = resolve_dependencies(pool, _SCOPE_KEY, dry_run=False)

        update_map = _extract_update_map(cursor, len(rows))

        params = update_map[dep_rid]
        pf = _parse_flags(params)

        # Must be needs_review
        assert params["status"] == "needs_review", (
            f"Point {dep_rid} with tied step_index should be "
            f"'needs_review', got '{params['status']}'"
        )

        # Must have ambiguous_candidates
        assert "ambiguous_candidates" in pf, (
            f"Missing 'ambiguous_candidates' in parse_flags: {pf}"
        )

        amb_entries = pf["ambiguous_candidates"]
        matching = [e for e in amb_entries if e["label"] == dup_label]
        assert len(matching) == 1, (
            f"Expected 1 ambiguous entry for '{dup_label}', "
            f"got {len(matching)}: {amb_entries}"
        )

        # All candidate_rids should appear in the recorded candidates
        recorded_candidates = set(matching[0]["candidates"])
        for crid in candidate_rids:
            assert crid in recorded_candidates, (
                f"Candidate {crid} not in recorded candidates: "
                f"{recorded_candidates}"
            )

        assert result["ambiguous"] >= 1
