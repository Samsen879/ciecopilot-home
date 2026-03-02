"""Idempotency test for Phase 1 closure migration.

Executes the migration SQL twice and verifies the database schema is identical
after both runs — tables, indexes, and constraints should all be unchanged.

**Validates: Requirements 2 (AC3/AC4), design section 5**
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Skip if no DATABASE_URL is available
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    os.environ.get("SUPABASE_DB_URL", os.environ.get("SUPABASE_DATABASE_URL")),
)

pytestmark = pytest.mark.skipif(
    DATABASE_URL is None,
    reason="DATABASE_URL not set – skipping DB migration idempotency test",
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_FILE = (
    PROJECT_ROOT
    / "supabase"
    / "migrations"
    / "20260215120000_phase1_closure_v1.sql"
)

# Tables/indexes created or modified by this migration
NEW_TABLE = "marking_runs_v1"
MODIFIED_TABLE = "user_errors"
TABLES_OF_INTEREST = {NEW_TABLE, MODIFIED_TABLE}

EXPECTED_NEW_INDEXES = {
    "idx_marking_runs_v1_user_created",
    "idx_marking_runs_v1_storage_q",
    "uq_user_errors_auto_point",
    "uq_user_errors_manual_storage",
    "idx_user_errors_source",
}

EXPECTED_NEW_CONSTRAINTS = {
    "chk_user_errors_source",
    "chk_user_errors_auto_requirements",
}

DROPPED_INDEX = "idx_user_errors_user_storage_key_unique"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _connect():
    """Return a psycopg2 connection using DATABASE_URL."""
    import psycopg2
    return psycopg2.connect(DATABASE_URL)


def _read_sql(path: Path) -> str:
    assert path.exists(), f"SQL file not found: {path}"
    return path.read_text(encoding="utf-8")


def _snapshot_tables(cur, tables) -> dict:
    cur.execute(
        """
        SELECT table_name, column_name, data_type, is_nullable,
               column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY(%s)
        ORDER BY table_name, ordinal_position
        """,
        (list(tables),),
    )
    return {
        (r[0], r[1]): {
            "data_type": r[2],
            "is_nullable": r[3],
            "column_default": r[4],
            "char_max_length": r[5],
        }
        for r in cur.fetchall()
    }


def _snapshot_indexes(cur, tables) -> dict:
    cur.execute(
        """
        SELECT indexname, tablename, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = ANY(%s)
        ORDER BY indexname
        """,
        (list(tables),),
    )
    return {r[0]: {"tablename": r[1], "indexdef": r[2]} for r in cur.fetchall()}


def _snapshot_constraints(cur, tables) -> dict:
    cur.execute(
        """
        SELECT c.conname, c.contype, c.conrelid::regclass::text,
               pg_get_constraintdef(c.oid) AS condef
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = ANY(%s)
        ORDER BY c.conname
        """,
        (list(tables),),
    )
    return {
        r[0]: {"type": r[1], "table": r[2], "definition": r[3]}
        for r in cur.fetchall()
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestPhase1MigrationIdempotency:
    """Migration 20260215120000_phase1_closure_v1.sql must be idempotent."""

    def test_migration_runs_twice_without_error(self):
        """Executing the migration SQL twice should not raise any errors."""
        sql = _read_sql(MIGRATION_FILE)
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(sql)
        finally:
            conn.close()

    def test_schema_identical_after_double_execution(self):
        """Schema state after two executions must equal state after one."""
        sql = _read_sql(MIGRATION_FILE)
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:

                # --- Run 1 ---
                cur.execute(sql)
                snap1_t = _snapshot_tables(cur, TABLES_OF_INTEREST)
                snap1_i = _snapshot_indexes(cur, TABLES_OF_INTEREST)
                snap1_c = _snapshot_constraints(cur, TABLES_OF_INTEREST)

                # --- Run 2 ---
                cur.execute(sql)
                snap2_t = _snapshot_tables(cur, TABLES_OF_INTEREST)
                snap2_i = _snapshot_indexes(cur, TABLES_OF_INTEREST)
                snap2_c = _snapshot_constraints(cur, TABLES_OF_INTEREST)

            assert snap1_t == snap2_t, f"Table columns differ:\n{snap1_t}\nvs\n{snap2_t}"
            assert snap1_i == snap2_i, f"Indexes differ:\n{snap1_i}\nvs\n{snap2_i}"
            assert snap1_c == snap2_c, f"Constraints differ:\n{snap1_c}\nvs\n{snap2_c}"
        finally:
            conn.close()

    def test_marking_runs_v1_table_exists(self):
        """marking_runs_v1 table must exist after migration."""
        sql = _read_sql(MIGRATION_FILE)
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='marking_runs_v1'
                    """
                )
                assert cur.fetchone() is not None, "marking_runs_v1 table not found"
        finally:
            conn.close()

    def test_old_index_dropped(self):
        """idx_user_errors_user_storage_key_unique must not exist after migration."""
        sql = _read_sql(MIGRATION_FILE)
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT 1 FROM pg_indexes
                    WHERE schemaname='public' AND indexname=%s
                    """,
                    (DROPPED_INDEX,),
                )
                assert cur.fetchone() is None, f"Old index {DROPPED_INDEX} still exists"
        finally:
            conn.close()

    def test_expected_indexes_exist(self):
        """All new indexes must exist after migration."""
        sql = _read_sql(MIGRATION_FILE)
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT indexname FROM pg_indexes
                    WHERE schemaname='public'
                      AND indexname = ANY(%s)
                    """,
                    (list(EXPECTED_NEW_INDEXES),),
                )
                found = {r[0] for r in cur.fetchall()}
            missing = EXPECTED_NEW_INDEXES - found
            assert not missing, f"Missing indexes: {missing}"
        finally:
            conn.close()

    def test_expected_constraints_exist(self):
        """All new CHECK constraints must exist after migration."""
        sql = _read_sql(MIGRATION_FILE)
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT conname FROM pg_constraint
                    WHERE conrelid = 'public.user_errors'::regclass
                      AND conname = ANY(%s)
                    """,
                    (list(EXPECTED_NEW_CONSTRAINTS),),
                )
                found = {r[0] for r in cur.fetchall()}
            missing = EXPECTED_NEW_CONSTRAINTS - found
            assert not missing, f"Missing constraints: {missing}"
        finally:
            conn.close()

    def test_column_count_stable_after_rerun(self):
        """Column counts per table must not change after second execution."""
        sql = _read_sql(MIGRATION_FILE)
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT table_name, count(*)
                    FROM information_schema.columns
                    WHERE table_schema='public'
                      AND table_name = ANY(%s)
                    GROUP BY table_name
                    """,
                    (list(TABLES_OF_INTEREST),),
                )
                counts1 = dict(cur.fetchall())

                cur.execute(sql)
                cur.execute(
                    """
                    SELECT table_name, count(*)
                    FROM information_schema.columns
                    WHERE table_schema='public'
                      AND table_name = ANY(%s)
                    GROUP BY table_name
                    """,
                    (list(TABLES_OF_INTEREST),),
                )
                counts2 = dict(cur.fetchall())

            assert counts1 == counts2, f"Column counts differ: {counts1} vs {counts2}"
        finally:
            conn.close()
