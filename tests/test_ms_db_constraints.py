"""Property-based test for B1 rubric_points database constraints.

Generates invalid data via hypothesis and verifies the database rejects
constraint-violating INSERTs while accepting valid rows.

# Feature: ms-rubric-extraction, Property 32: 数据库约束执行

**Validates: Requirements 8.3**
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

import pytest
from hypothesis import given, settings, HealthCheck
import hypothesis.strategies as st

# ---------------------------------------------------------------------------
# Skip if no DATABASE_URL
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    os.environ.get("SUPABASE_DB_URL", os.environ.get("SUPABASE_DATABASE_URL")),
)

pytestmark = pytest.mark.skipif(
    DATABASE_URL is None,
    reason="DATABASE_URL not set – skipping DB constraint tests",
)

# ---------------------------------------------------------------------------
# Paths & constants
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_FILE = (
    PROJECT_ROOT / "supabase" / "migrations"
    / "20260214120000_b1_rubric_extraction.sql"
)

VALID_KINDS = ("M", "A", "B")
VALID_STATUSES = ("draft", "ready", "needs_review")
VALID_FT_MODES = ("none", "follow_through", "carried_accuracy", "unknown")
VALID_CONFIDENCE_SOURCES = ("model", "heuristic", "manual")

# PostgreSQL INT range
_PG_INT_MIN = -2_147_483_648
_PG_INT_MAX = 2_147_483_647


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _connect():
    import psycopg2
    return psycopg2.connect(DATABASE_URL)


def _ensure_migration(conn):
    """Run migration idempotently so tables exist."""
    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    prev = conn.autocommit
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.autocommit = prev


def _ensure_run_id(conn) -> str:
    """Insert a vlm_ms_runs record and return its run_id (needed for FK)."""
    rid = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO vlm_ms_runs (run_id, status) VALUES (%s, 'running')",
            (rid,),
        )
    conn.commit()
    return rid


# Column order for the INSERT statement
_COLUMNS = (
    "rubric_id", "storage_key", "q_number", "step_index",
    "mark_label", "kind", "description", "marks",
    "depends_on_labels", "depends_on",
    "ft_mode", "expected_answer_latex",
    "confidence", "confidence_source", "status", "parse_flags",
    "source", "run_id",
    "extractor_version", "provider", "model", "prompt_version",
    "raw_json", "response_sha256", "point_fingerprint",
)

_INSERT_SQL = (
    "INSERT INTO rubric_points ("
    + ", ".join(_COLUMNS)
    + ") VALUES ("
    + ", ".join(["%s"] * len(_COLUMNS))
    + ")"
)


def _valid_row(run_id: str) -> dict:
    """Return a dict of column values that satisfy ALL constraints."""
    return {
        "rubric_id": str(uuid.uuid4()),
        "storage_key": "test/ms/9709_s20_ms_11.png",
        "q_number": 1,
        "step_index": 0,
        "mark_label": "M1",
        "kind": "M",
        "description": "Apply chain rule",
        "marks": 1,
        "depends_on_labels": "{}",
        "depends_on": "{}",
        "ft_mode": "none",
        "expected_answer_latex": None,
        "confidence": 0.9,
        "confidence_source": "model",
        "status": "draft",
        "parse_flags": "{}",
        "source": "vlm",
        "run_id": run_id,
        "extractor_version": "v1",
        "provider": "dashscope",
        "model": "qwen-vl-max",
        "prompt_version": "ms_v1",
        "raw_json": "{}",
        "response_sha256": "abc123",
        "point_fingerprint": str(uuid.uuid4()),
    }


def _row_tuple(row: dict) -> tuple:
    """Convert row dict to a tuple matching _COLUMNS order."""
    return tuple(row[c] for c in _COLUMNS)


def _insert_and_expect_reject(conn, row: dict):
    """Try to INSERT inside a SAVEPOINT; assert the DB rejects it.

    Uses SAVEPOINT/ROLLBACK TO so the outer transaction stays usable
    across many hypothesis iterations on a shared connection.
    """
    import psycopg2
    cur = conn.cursor()
    try:
        cur.execute("SAVEPOINT sp_constraint_test")
        try:
            cur.execute(_INSERT_SQL, _row_tuple(row))
            # If we get here the INSERT succeeded — that's a failure
            cur.execute("ROLLBACK TO SAVEPOINT sp_constraint_test")
            pytest.fail(
                "Expected DB to reject row but INSERT succeeded"
            )
        except (psycopg2.errors.CheckViolation, psycopg2.IntegrityError):
            cur.execute("ROLLBACK TO SAVEPOINT sp_constraint_test")
        finally:
            cur.execute("RELEASE SAVEPOINT sp_constraint_test")
    finally:
        cur.close()


# ---------------------------------------------------------------------------
# Hypothesis strategies — generate invalid values (no NUL bytes)
# ---------------------------------------------------------------------------

# Printable-safe text alphabet (excludes \x00 which psycopg2 rejects)
_pg_safe_text = st.text(
    alphabet=st.characters(blacklist_categories=("Cs",), blacklist_characters="\x00"),
    min_size=1,
    max_size=20,
)

_invalid_kind_st = _pg_safe_text.filter(lambda s: s not in VALID_KINDS)
_invalid_status_st = _pg_safe_text.filter(lambda s: s not in VALID_STATUSES)
_invalid_ft_mode_st = _pg_safe_text.filter(lambda s: s not in VALID_FT_MODES)
_invalid_confidence_source_st = _pg_safe_text.filter(
    lambda s: s not in VALID_CONFIDENCE_SOURCES
)

# marks <= 0, bounded to PG INT range
_non_positive_marks_st = st.integers(min_value=_PG_INT_MIN, max_value=0)

# confidence outside [0.0, 1.0]
_out_of_range_confidence_st = st.one_of(
    st.floats(max_value=-0.001, allow_nan=False, allow_infinity=False),
    st.floats(min_value=1.001, max_value=1e6, allow_nan=False, allow_infinity=False),
)

# mark_label that does NOT match ^[MAB][0-9]+$ (for ready-state check)
_invalid_mark_label_for_ready_st = _pg_safe_text.filter(
    lambda s: not __import__("re").match(r"^[MAB][0-9]+$", s)
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db_conn():
    """Module-scoped connection with migration applied."""
    conn = _connect()
    _ensure_migration(conn)
    yield conn
    conn.close()


@pytest.fixture(scope="module")
def run_id(db_conn):
    """A valid vlm_ms_runs.run_id for FK satisfaction."""
    return _ensure_run_id(db_conn)


# ---------------------------------------------------------------------------
# Property 32 tests — invalid data must be rejected
# ---------------------------------------------------------------------------

class TestDBConstraintRejection:
    """
    **Property 32: 数据库约束执行**

    *对于任意* 违反约束的数据（kind 不在 M/A/B、marks<=0、status 不在
    draft/ready/needs_review、ft_mode 非法、confidence 越界、confidence_source
    非法、或 status='ready' 但 mark_label 不匹配 ^[MAB][0-9]+$），
    数据库应拒绝插入。

    **Validates: Requirements 8.3**
    """

    @given(bad_kind=_invalid_kind_st)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_reject_invalid_kind(self, db_conn, run_id, bad_kind):
        """kind not in ('M','A','B') must be rejected."""
        row = _valid_row(run_id)
        row["kind"] = bad_kind
        _insert_and_expect_reject(db_conn, row)

    @given(bad_marks=_non_positive_marks_st)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_reject_non_positive_marks(self, db_conn, run_id, bad_marks):
        """marks <= 0 must be rejected."""
        row = _valid_row(run_id)
        row["marks"] = bad_marks
        _insert_and_expect_reject(db_conn, row)

    @given(bad_status=_invalid_status_st)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_reject_invalid_status(self, db_conn, run_id, bad_status):
        """status not in ('draft','ready','needs_review') must be rejected."""
        row = _valid_row(run_id)
        row["status"] = bad_status
        _insert_and_expect_reject(db_conn, row)

    @given(bad_ft=_invalid_ft_mode_st)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_reject_invalid_ft_mode(self, db_conn, run_id, bad_ft):
        """ft_mode not in valid enum must be rejected."""
        row = _valid_row(run_id)
        row["ft_mode"] = bad_ft
        _insert_and_expect_reject(db_conn, row)

    @given(bad_conf=_out_of_range_confidence_st)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_reject_out_of_range_confidence(self, db_conn, run_id, bad_conf):
        """confidence outside [0.0, 1.0] must be rejected."""
        row = _valid_row(run_id)
        row["confidence"] = bad_conf
        _insert_and_expect_reject(db_conn, row)

    @given(bad_cs=_invalid_confidence_source_st)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_reject_invalid_confidence_source(self, db_conn, run_id, bad_cs):
        """confidence_source not in valid enum must be rejected."""
        row = _valid_row(run_id)
        row["confidence_source"] = bad_cs
        _insert_and_expect_reject(db_conn, row)

    @given(bad_label=_invalid_mark_label_for_ready_st)
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_reject_ready_with_invalid_mark_label(self, db_conn, run_id, bad_label):
        """status='ready' with mark_label not matching ^[MAB][0-9]+$ must be rejected."""
        row = _valid_row(run_id)
        row["status"] = "ready"
        row["mark_label"] = bad_label
        _insert_and_expect_reject(db_conn, row)


# ---------------------------------------------------------------------------
# Positive tests — valid data IS accepted
# ---------------------------------------------------------------------------

class TestDBConstraintAcceptance:
    """Valid rows must be accepted by the database."""

    def _insert_and_cleanup(self, conn, row):
        """Insert a row, assert success, then delete it."""
        cur = conn.cursor()
        try:
            cur.execute("SAVEPOINT sp_accept")
            cur.execute(_INSERT_SQL, _row_tuple(row))
            cur.execute(
                "DELETE FROM rubric_points WHERE rubric_id = %s",
                (row["rubric_id"],),
            )
            cur.execute("RELEASE SAVEPOINT sp_accept")
        except Exception:
            cur.execute("ROLLBACK TO SAVEPOINT sp_accept")
            cur.execute("RELEASE SAVEPOINT sp_accept")
            raise
        finally:
            cur.close()

    def test_valid_row_accepted(self, db_conn, run_id):
        """A fully valid row should INSERT without error."""
        self._insert_and_cleanup(db_conn, _valid_row(run_id))

    def test_valid_ready_row_accepted(self, db_conn, run_id):
        """A valid row with status='ready' and proper mark_label is accepted."""
        row = _valid_row(run_id)
        row["status"] = "ready"
        row["mark_label"] = "A2"
        row["kind"] = "A"
        self._insert_and_cleanup(db_conn, row)

    def test_draft_with_irregular_label_accepted(self, db_conn, run_id):
        """status='draft' accepts any mark_label (constraint only on ready)."""
        row = _valid_row(run_id)
        row["status"] = "draft"
        row["mark_label"] = "X99"
        self._insert_and_cleanup(db_conn, row)

    def test_needs_review_with_irregular_label_accepted(self, db_conn, run_id):
        """status='needs_review' accepts any mark_label."""
        row = _valid_row(run_id)
        row["status"] = "needs_review"
        row["mark_label"] = "ZZZ"
        self._insert_and_cleanup(db_conn, row)
