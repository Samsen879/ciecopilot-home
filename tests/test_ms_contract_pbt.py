"""Property-based tests for Ready view contract validation.

# Feature: ms-rubric-extraction, Property 21: Ready 视图契约

Uses hypothesis to verify:
- For ANY rubric_points dataset (with mixed draft/ready/needs_review status),
  the ``rubric_points_ready_v1`` view should only return ``status='ready'``
  records, and each record must contain B2 required fields (rubric_id,
  mark_label, description, kind, depends_on, marks) and B3 required fields
  (storage_key, q_number, subpart, rubric_id, mark_label, kind, source_version).

The test validates ``validate_b2_contract`` by mocking the pool to return
rows as if queried from the ready view.

**Validates: Requirements 5.1, 5.2, 10.1**
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
_label_st = st.sampled_from(["M1", "M2", "A1", "A2", "B1", "B2", "M3", "A3"])
_storage_key_st = st.sampled_from(["sk/math/q1.png", "sk/math/q2.png", "sk/phys/q1.png"])
_q_number_st = st.integers(min_value=1, max_value=12)
_subpart_st = st.one_of(st.none(), st.sampled_from(["a", "b", "c", "i", "ii"]))
_source_version_st = st.just("v1:dashscope:qwen-vl-max:ms_v1")


@st.composite
def _valid_ready_rows(draw):
    """Generate a list of fully valid ready-view rows.

    All B2 and B3 required fields are non-null (except subpart which may
    be NULL), kind is valid, marks > 0, and depends_on UUIDs reference
    existing rubric_ids within the same scope.
    """
    n = draw(st.integers(min_value=1, max_value=10))

    # Fix scope so depends_on references are valid
    storage_key = draw(_storage_key_st)
    q_number = draw(_q_number_st)
    subpart = draw(_subpart_st)

    rids = [str(uuid.uuid4()) for _ in range(n)]

    rows = []
    for i, rid in enumerate(rids):
        kind = draw(_kind_st)
        label = f"{kind}{i + 1}"
        description = f"Step {i + 1} description"
        marks = draw(_marks_st)
        source_version = draw(_source_version_st)

        # depends_on: optionally reference preceding rubric_ids
        deps: list[str] = []
        if i > 0 and draw(st.booleans()):
            dep_idx = draw(st.integers(min_value=0, max_value=i - 1))
            deps = [rids[dep_idx]]

        rows.append((
            rid,            # rubric_id
            storage_key,    # storage_key
            q_number,       # q_number
            subpart,        # subpart (may be None)
            label,          # mark_label
            description,    # description
            kind,           # kind
            deps,           # depends_on
            marks,          # marks
            source_version, # source_version
        ))

    return rows


@st.composite
def _rows_with_null_b2_field(draw):
    """Generate rows where at least one row has a null B2 required field."""
    base_rows = draw(_valid_ready_rows())
    assume(len(base_rows) >= 1)

    # Pick a row to corrupt
    idx = draw(st.integers(min_value=0, max_value=len(base_rows) - 1))
    row = list(base_rows[idx])

    # B2 required fields and their column indices
    b2_field_indices = {
        "rubric_id": 0,
        "mark_label": 4,
        "description": 5,
        "kind": 6,
        "depends_on": 7,
        "marks": 8,
    }
    field_name = draw(st.sampled_from(list(b2_field_indices.keys())))
    col_idx = b2_field_indices[field_name]
    row[col_idx] = None

    corrupted_rid = row[0]  # may be None if rubric_id was nulled
    result = list(base_rows)
    result[idx] = tuple(row)
    return result, idx, field_name, corrupted_rid


@st.composite
def _rows_with_invalid_kind(draw):
    """Generate rows where at least one row has an invalid kind value."""
    base_rows = draw(_valid_ready_rows())
    assume(len(base_rows) >= 1)

    idx = draw(st.integers(min_value=0, max_value=len(base_rows) - 1))
    row = list(base_rows[idx])

    invalid_kind = draw(st.sampled_from(["X", "Z", "D", "m", "a", "b", "1"]))
    row[6] = invalid_kind  # kind column

    result = list(base_rows)
    result[idx] = tuple(row)
    return result, idx, row[0]


@st.composite
def _rows_with_bad_marks(draw):
    """Generate rows where at least one row has marks <= 0."""
    base_rows = draw(_valid_ready_rows())
    assume(len(base_rows) >= 1)

    idx = draw(st.integers(min_value=0, max_value=len(base_rows) - 1))
    row = list(base_rows[idx])

    bad_marks = draw(st.integers(min_value=-10, max_value=0))
    row[8] = bad_marks  # marks column

    result = list(base_rows)
    result[idx] = tuple(row)
    return result, idx, row[0]


@st.composite
def _rows_with_dangling_depends_on(draw):
    """Generate rows where at least one row has a depends_on UUID that
    does not exist in the same scope."""
    base_rows = draw(_valid_ready_rows())
    assume(len(base_rows) >= 1)

    idx = draw(st.integers(min_value=0, max_value=len(base_rows) - 1))
    row = list(base_rows[idx])

    # Add a non-existent UUID to depends_on
    phantom_uuid = str(uuid.uuid4())
    existing_deps = row[7] or []
    row[7] = existing_deps + [phantom_uuid]

    result = list(base_rows)
    result[idx] = tuple(row)
    return result, idx, row[0], phantom_uuid


# ---------------------------------------------------------------------------
# Property 21: Ready 视图契约
# ---------------------------------------------------------------------------


class TestProperty21ReadyViewContract:
    """
    **Property 21**: For ANY ``rubric_points`` dataset (with mixed
    draft/ready/needs_review status), ``rubric_points_ready_v1`` view
    should only return ``status='ready'`` records, and each record must
    contain B2 required fields (rubric_id, mark_label, description,
    kind, depends_on, marks) and B3 required fields (storage_key,
    q_number, subpart, rubric_id, mark_label, kind, source_version).

    **Validates: Requirements 5.1, 5.2, 10.1**
    """

    # --- Valid datasets: contract passes ---

    @given(rows=_valid_ready_rows())
    @settings(max_examples=100, deadline=None)
    def test_valid_ready_rows_pass_contract(self, rows):
        """All-valid ready rows should produce valid=True with no failures."""
        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is True, (
            f"Expected valid=True for all-valid rows, got failures: "
            f"{result['failures']}"
        )
        assert result["failures"] == []

    @settings(max_examples=100, deadline=None)
    @given(data=st.data())
    def test_empty_view_passes(self, data):
        """An empty ready view (no rows) should pass validation."""
        pool = _build_mock_pool([])
        result = validate_b2_contract(pool)

        assert result["valid"] is True
        assert result["failures"] == []

    # --- Null B2 fields: contract fails ---

    @given(data=_rows_with_null_b2_field())
    @settings(max_examples=100, deadline=None)
    def test_null_b2_field_reported(self, data):
        """A row with a null B2 required field should produce a failure."""
        rows, corrupted_idx, field_name, corrupted_rid = data

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is False, (
            f"Expected valid=False when B2 field '{field_name}' is null"
        )
        assert len(result["failures"]) >= 1

        # At least one failure should mention the null field
        reasons = [f["reason"] for f in result["failures"]]
        has_relevant = any(field_name in r for r in reasons)
        assert has_relevant, (
            f"No failure mentions field '{field_name}'. Reasons: {reasons}"
        )

    # --- Invalid kind: contract fails ---

    @given(data=_rows_with_invalid_kind())
    @settings(max_examples=100, deadline=None)
    def test_invalid_kind_reported(self, data):
        """A row with kind not in ('M','A','B') should produce a failure."""
        rows, corrupted_idx, corrupted_rid = data

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is False, (
            f"Expected valid=False when kind is invalid"
        )

        reasons = [f["reason"] for f in result["failures"]]
        has_kind_failure = any("kind" in r for r in reasons)
        assert has_kind_failure, (
            f"No failure mentions 'kind'. Reasons: {reasons}"
        )

    # --- Bad marks: contract fails ---

    @given(data=_rows_with_bad_marks())
    @settings(max_examples=100, deadline=None)
    def test_bad_marks_reported(self, data):
        """A row with marks <= 0 should produce a failure."""
        rows, corrupted_idx, corrupted_rid = data

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is False, (
            f"Expected valid=False when marks <= 0"
        )

        reasons = [f["reason"] for f in result["failures"]]
        has_marks_failure = any("marks" in r for r in reasons)
        assert has_marks_failure, (
            f"No failure mentions 'marks'. Reasons: {reasons}"
        )

    # --- Dangling depends_on: contract fails ---

    @given(data=_rows_with_dangling_depends_on())
    @settings(max_examples=100, deadline=None)
    def test_dangling_depends_on_reported(self, data):
        """A row with a depends_on UUID not in the same scope should
        produce a failure."""
        rows, corrupted_idx, corrupted_rid, phantom_uuid = data

        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is False, (
            f"Expected valid=False when depends_on references non-existent UUID"
        )

        reasons = [f["reason"] for f in result["failures"]]
        has_dep_failure = any("depends_on" in r for r in reasons)
        assert has_dep_failure, (
            f"No failure mentions 'depends_on'. Reasons: {reasons}"
        )

    # --- B3 passthrough fields ---

    @given(rows=_valid_ready_rows())
    @settings(max_examples=100, deadline=None)
    def test_b3_fields_present_in_valid_rows(self, rows):
        """Valid ready rows must have B3 passthrough fields (storage_key,
        q_number, source_version) non-null. subpart may be null."""
        pool = _build_mock_pool(rows)
        result = validate_b2_contract(pool)

        assert result["valid"] is True, (
            f"Valid rows should pass B3 field checks too: {result['failures']}"
        )

    @given(rows=_valid_ready_rows())
    @settings(max_examples=100, deadline=None)
    def test_null_b3_storage_key_reported(self, rows):
        """A row with null storage_key (B3 field) should produce a failure."""
        assume(len(rows) >= 1)

        corrupted = list(rows)
        row = list(corrupted[0])
        row[1] = None  # storage_key
        corrupted[0] = tuple(row)

        pool = _build_mock_pool(corrupted)
        result = validate_b2_contract(pool)

        assert result["valid"] is False
        reasons = [f["reason"] for f in result["failures"]]
        has_b3_failure = any("storage_key" in r for r in reasons)
        assert has_b3_failure, (
            f"No failure mentions 'storage_key'. Reasons: {reasons}"
        )

    @given(rows=_valid_ready_rows())
    @settings(max_examples=100, deadline=None)
    def test_null_b3_source_version_reported(self, rows):
        """A row with null source_version (B3 field) should produce a failure."""
        assume(len(rows) >= 1)

        corrupted = list(rows)
        row = list(corrupted[0])
        row[9] = None  # source_version
        corrupted[0] = tuple(row)

        pool = _build_mock_pool(corrupted)
        result = validate_b2_contract(pool)

        assert result["valid"] is False
        reasons = [f["reason"] for f in result["failures"]]
        has_b3_failure = any("source_version" in r for r in reasons)
        assert has_b3_failure, (
            f"No failure mentions 'source_version'. Reasons: {reasons}"
        )

    # --- Null subpart is allowed ---

    @given(rows=_valid_ready_rows())
    @settings(max_examples=100, deadline=None)
    def test_null_subpart_allowed(self, rows):
        """subpart=NULL is legitimate and should NOT cause a failure."""
        # Force all subparts to None
        nulled = []
        for row in rows:
            r = list(row)
            r[3] = None  # subpart
            nulled.append(tuple(r))

        pool = _build_mock_pool(nulled)
        result = validate_b2_contract(pool)

        assert result["valid"] is True, (
            f"Null subpart should be allowed, got failures: {result['failures']}"
        )
