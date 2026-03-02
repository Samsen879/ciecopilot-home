"""Property-based tests for depends_on referential integrity.

# Feature: ms-rubric-extraction, Property 22: depends_on 引用完整性

Uses hypothesis to verify:
- For ANY ``status='ready'`` rubric point, every UUID in ``depends_on``
  must exist as a ``rubric_id`` within the same scope
  (storage_key, q_number, COALESCE(subpart, '')).

The test validates the depends_on referential integrity check inside
``validate_b2_contract`` by mocking the pool to return rows as if
queried from the ``rubric_points_ready_v1`` view.

**Validates: Requirements 5.3**
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.contract_validator import validate_b2_contract

# ---------------------------------------------------------------------------
# Constants – column order returned by _FETCH_READY_SQL
# ---------------------------------------------------------------------------

_READY_COLUMNS = [
    "rubric_id", "storage_key", "q_number", "subpart",
    "mark_label", "description", "kind", "depends_on", "marks",
    "source_version",
]

_VALID_KINDS = ("M", "A", "B")

# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------


def _build_mock_pool(rows: list[tuple]):
    """Build a mock pool whose cursor returns *rows* with the correct
    ``cursor.description`` matching ``_READY_COLUMNS``."""
    pool = MagicMock()
    conn = MagicMock()
    cursor = MagicMock()

    pool.getconn.return_value = conn
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

    cursor.description = [
        (col, None, None, None, None, None, None) for col in _READY_COLUMNS
    ]
    cursor.fetchall.return_value = rows

    return pool


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

_kind_st = st.sampled_from(list(_VALID_KINDS))
_marks_st = st.integers(min_value=1, max_value=20)
_storage_key_st = st.sampled_from(["sk/math/q1.png", "sk/math/q2.png", "sk/phys/q1.png"])
_q_number_st = st.integers(min_value=1, max_value=12)
_subpart_st = st.one_of(st.none(), st.sampled_from(["a", "b", "c"]))
_source_version_st = st.just("v1:dashscope:qwen-vl-max:ms_v1")


def _make_row(
    rid: str,
    storage_key: str,
    q_number: int,
    subpart: str | None,
    kind: str,
    index: int,
    marks: int,
    depends_on: list[str],
) -> tuple:
    """Build a single ready-view row tuple."""
    return (
        rid,
        storage_key,
        q_number,
        subpart,
        f"{kind}{index + 1}",   # mark_label
        f"Step {index + 1}",    # description
        kind,                   # kind
        depends_on,             # depends_on
        marks,                  # marks
        "v1:dashscope:qwen-vl-max:ms_v1",  # source_version
    )


@st.composite
def _valid_single_scope_rows(draw):
    """Generate rows within a single scope where all depends_on UUIDs
    reference existing rubric_ids in the same scope."""
    n = draw(st.integers(min_value=2, max_value=8))
    storage_key = draw(_storage_key_st)
    q_number = draw(_q_number_st)
    subpart = draw(_subpart_st)

    rids = [str(uuid.uuid4()) for _ in range(n)]
    rows = []
    for i, rid in enumerate(rids):
        kind = draw(_kind_st)
        marks = draw(_marks_st)
        # depends_on references only preceding rubric_ids in same scope
        deps: list[str] = []
        if i > 0:
            num_deps = draw(st.integers(min_value=0, max_value=min(i, 3)))
            if num_deps > 0:
                dep_indices = draw(
                    st.lists(
                        st.integers(min_value=0, max_value=i - 1),
                        min_size=num_deps,
                        max_size=num_deps,
                        unique=True,
                    )
                )
                deps = [rids[j] for j in dep_indices]
        rows.append(_make_row(rid, storage_key, q_number, subpart, kind, i, marks, deps))
    return rows


@st.composite
def _multi_scope_valid_rows(draw):
    """Generate rows across multiple scopes, each with valid internal
    depends_on references."""
    num_scopes = draw(st.integers(min_value=2, max_value=4))
    all_rows = []
    for _ in range(num_scopes):
        scope_rows = draw(_valid_single_scope_rows())
        all_rows.extend(scope_rows)
    return all_rows


@st.composite
def _rows_with_dangling_uuid(draw):
    """Generate rows where at least one row has a depends_on UUID that
    does NOT exist as any rubric_id in the same scope."""
    base_rows = draw(_valid_single_scope_rows())
    assume(len(base_rows) >= 1)

    idx = draw(st.integers(min_value=0, max_value=len(base_rows) - 1))
    row = list(base_rows[idx])

    phantom_uuid = str(uuid.uuid4())
    existing_deps = row[7] or []
    row[7] = existing_deps + [phantom_uuid]

    result = list(base_rows)
    result[idx] = tuple(row)
    return result, str(row[0]), phantom_uuid


@st.composite
def _rows_with_cross_scope_dep(draw):
    """Generate rows across two scopes where one row references a
    rubric_id from a different scope — this should be flagged as invalid."""
    # Scope A
    sk_a = "sk/scope_a/q1.png"
    q_a = 1
    sub_a = "a"
    rid_a = str(uuid.uuid4())
    row_a = _make_row(rid_a, sk_a, q_a, sub_a, "M", 0, draw(_marks_st), [])

    # Scope B
    sk_b = "sk/scope_b/q2.png"
    q_b = 2
    sub_b = "b"
    rid_b1 = str(uuid.uuid4())
    rid_b2 = str(uuid.uuid4())
    row_b1 = _make_row(rid_b1, sk_b, q_b, sub_b, "A", 0, draw(_marks_st), [])
    # row_b2 depends on rid_a which is in scope A — cross-scope violation
    row_b2 = _make_row(rid_b2, sk_b, q_b, sub_b, "B", 1, draw(_marks_st), [rid_a])

    return [row_a, row_b1, row_b2], rid_b2, rid_a


@st.composite
def _rows_with_multiple_dangling(draw):
    """Generate rows where multiple depends_on UUIDs are dangling."""
    base_rows = draw(_valid_single_scope_rows())
    assume(len(base_rows) >= 2)

    phantom_uuids = [str(uuid.uuid4()) for _ in range(draw(st.integers(min_value=2, max_value=4)))]

    # Corrupt two different rows
    idx1 = 0
    idx2 = len(base_rows) - 1

    row1 = list(base_rows[idx1])
    row1[7] = (row1[7] or []) + [phantom_uuids[0]]
    result = list(base_rows)
    result[idx1] = tuple(row1)

    row2 = list(result[idx2])
    row2[7] = (row2[7] or []) + phantom_uuids[1:]
    result[idx2] = tuple(row2)

    return result, phantom_uuids


# ---------------------------------------------------------------------------
# Property 22: depends_on 引用完整性
# ---------------------------------------------------------------------------


class TestProperty22DependsOnIntegrity:
    """
    **Property 22**: For ANY ``status='ready'`` rubric point, every UUID
    in ``depends_on`` must exist as a ``rubric_id`` within the same scope
    (storage_key, q_number, COALESCE(subpart, '')).

    **Validates: Requirements 5.3**
    """

    # --- Valid: all depends_on UUIDs exist in same scope ---

    @given(rows=_valid_single_scope_rows())
    @settings(max_examples=100, deadline=None)
    def test_valid_deps_single_scope_pass(self, rows):
        """When all depends_on UUIDs reference existing rubric_ids in the
        same scope, validation should pass with no failures."""
        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is True, (
            f"Expected valid=True for valid single-scope deps, "
            f"got failures: {result['failures']}"
        )
        assert result["failures"] == []

    @given(rows=_multi_scope_valid_rows())
    @settings(max_examples=100, deadline=None)
    def test_valid_deps_multi_scope_pass(self, rows):
        """When multiple scopes each have valid internal depends_on
        references, validation should pass."""
        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is True, (
            f"Expected valid=True for valid multi-scope deps, "
            f"got failures: {result['failures']}"
        )
        assert result["failures"] == []

    @settings(max_examples=100, deadline=None)
    @given(data=st.data())
    def test_empty_depends_on_pass(self, data):
        """Rows with empty depends_on arrays should always pass the
        depends_on integrity check."""
        n = data.draw(st.integers(min_value=1, max_value=5))
        storage_key = data.draw(_storage_key_st)
        q_number = data.draw(_q_number_st)
        subpart = data.draw(_subpart_st)

        rows = []
        for i in range(n):
            kind = data.draw(_kind_st)
            marks = data.draw(_marks_st)
            rows.append(_make_row(
                str(uuid.uuid4()), storage_key, q_number, subpart,
                kind, i, marks, [],
            ))

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is True
        assert result["failures"] == []

    # --- Invalid: dangling depends_on UUID ---

    @given(data=_rows_with_dangling_uuid())
    @settings(max_examples=100, deadline=None)
    def test_dangling_uuid_detected(self, data):
        """A depends_on UUID that does not exist in the same scope
        should produce a failure mentioning 'depends_on'."""
        rows, corrupted_rid, phantom_uuid = data

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is False, (
            f"Expected valid=False for dangling depends_on UUID {phantom_uuid}"
        )
        reasons = [f["reason"] for f in result["failures"]]
        has_dep_failure = any("depends_on" in r and phantom_uuid in r for r in reasons)
        assert has_dep_failure, (
            f"No failure mentions depends_on UUID {phantom_uuid}. Reasons: {reasons}"
        )

    # --- Invalid: cross-scope depends_on reference ---

    @given(data=_rows_with_cross_scope_dep())
    @settings(max_examples=100, deadline=None)
    def test_cross_scope_dep_detected(self, data):
        """A depends_on UUID that exists in a different scope should be
        flagged as invalid — scopes are isolated."""
        rows, violating_rid, cross_scope_uuid = data

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is False, (
            f"Expected valid=False for cross-scope depends_on reference"
        )
        reasons = [f["reason"] for f in result["failures"]]
        has_cross_scope = any(
            "depends_on" in r and cross_scope_uuid in r for r in reasons
        )
        assert has_cross_scope, (
            f"No failure mentions cross-scope UUID {cross_scope_uuid}. "
            f"Reasons: {reasons}"
        )

    # --- Invalid: multiple dangling UUIDs across rows ---

    @given(data=_rows_with_multiple_dangling())
    @settings(max_examples=100, deadline=None)
    def test_multiple_dangling_all_reported(self, data):
        """When multiple rows have dangling depends_on UUIDs, every
        dangling UUID should appear in the failure list."""
        rows, phantom_uuids = data

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is False, (
            f"Expected valid=False for multiple dangling depends_on UUIDs"
        )
        all_reasons = " ".join(f["reason"] for f in result["failures"])
        for puuid in phantom_uuids:
            assert puuid in all_reasons, (
                f"Phantom UUID {puuid} not found in failure reasons: "
                f"{result['failures']}"
            )
