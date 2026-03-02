"""Property-based test for B1 migration idempotency.

Executes the migration SQL twice and verifies the database schema is identical
after both runs — tables, indexes, and constraints should all be unchanged.

# Feature: ms-rubric-extraction, Property 31: 迁移幂等性

**Validates: Requirements 8.2**
"""
from __future__ import annotations

import os
import sys
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
MIGRATION_FILE = PROJECT_ROOT / "supabase" / "migrations" / "20260214120000_b1_rubric_extraction.sql"

# Tables created by the migration
EXPECTED_TABLES = {"vlm_ms_jobs", "vlm_ms_runs", "rubric_points"}

# Indexes created by the migration (name -> table)
EXPECTED_INDEXES = {
    "idx_vlm_ms_jobs_status_locked": "vlm_ms_jobs",
    "idx_rp_storage_status": "rubric_points",
    "idx_rp_fingerprint": "rubric_points",
    "uq_rp_scope_fingerprint_version": "rubric_points",
}

# Views created by the migration
EXPECTED_VIEWS = {"rubric_points_ready_v1"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _connect():
    """Return a psycopg2 connection using DATABASE_URL."""
    import psycopg2
    return psycopg2.connect(DATABASE_URL)


def _read_migration_sql() -> str:
    """Read the migration file content."""
    assert MIGRATION_FILE.exists(), f"Migration file not found: {MIGRATION_FILE}"
    return MIGRATION_FILE.read_text(encoding="utf-8")


def _snapshot_tables(cur) -> dict:
    """Snapshot table columns from information_schema for our tables."""
    cur.execute(
        """
        SELECT table_name, column_name, data_type, is_nullable,
               column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY(%s)
        ORDER BY table_name, ordinal_position
        """,
        (list(EXPECTED_TABLES),),
    )
    rows = cur.fetchall()
    return {
        (r[0], r[1]): {
            "data_type": r[2],
            "is_nullable": r[3],
            "column_default": r[4],
            "char_max_length": r[5],
        }
        for r in rows
    }


def _snapshot_indexes(cur) -> dict:
    """Snapshot indexes from pg_indexes for our tables."""
    cur.execute(
        """
        SELECT indexname, tablename, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = ANY(%s)
        ORDER BY indexname
        """,
        (list(EXPECTED_TABLES),),
    )
    rows = cur.fetchall()
    return {r[0]: {"tablename": r[1], "indexdef": r[2]} for r in rows}


def _snapshot_constraints(cur) -> dict:
    """Snapshot CHECK / UNIQUE / PK / FK constraints for our tables."""
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
        (list(EXPECTED_TABLES),),
    )
    rows = cur.fetchall()
    return {
        r[0]: {"type": r[1], "table": r[2], "definition": r[3]}
        for r in rows
    }


def _snapshot_views(cur) -> dict:
    """Snapshot view definitions for our views."""
    cur.execute(
        """
        SELECT table_name, view_definition
        FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name = ANY(%s)
        ORDER BY table_name
        """,
        (list(EXPECTED_VIEWS),),
    )
    rows = cur.fetchall()
    return {r[0]: r[1] for r in rows}


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------

class TestMigrationIdempotency:
    """
    **Property 31: 迁移幂等性**

    *对于任意* 迁移脚本，执行两次应产生与执行一次相同的数据库状态
    （表、索引、约束均不变）。

    **Validates: Requirements 8.2**
    """

    def test_migration_runs_twice_without_error(self):
        """Executing the migration SQL twice should not raise any errors."""
        sql = _read_migration_sql()
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                # First execution
                cur.execute(sql)
                # Second execution — must not error
                cur.execute(sql)
        finally:
            conn.close()

    def test_schema_identical_after_double_execution(self):
        """Schema state after two executions must equal state after one execution."""
        sql = _read_migration_sql()
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                # --- Run 1 ---
                cur.execute(sql)
                snap1_tables = _snapshot_tables(cur)
                snap1_indexes = _snapshot_indexes(cur)
                snap1_constraints = _snapshot_constraints(cur)
                snap1_views = _snapshot_views(cur)

                # --- Run 2 ---
                cur.execute(sql)
                snap2_tables = _snapshot_tables(cur)
                snap2_indexes = _snapshot_indexes(cur)
                snap2_constraints = _snapshot_constraints(cur)
                snap2_views = _snapshot_views(cur)

            # Compare tables (columns)
            assert snap1_tables == snap2_tables, (
                "Table columns differ after second migration run.\n"
                f"After run 1: {snap1_tables}\n"
                f"After run 2: {snap2_tables}"
            )

            # Compare indexes
            assert snap1_indexes == snap2_indexes, (
                "Indexes differ after second migration run.\n"
                f"After run 1: {snap1_indexes}\n"
                f"After run 2: {snap2_indexes}"
            )

            # Compare constraints
            assert snap1_constraints == snap2_constraints, (
                "Constraints differ after second migration run.\n"
                f"After run 1: {snap1_constraints}\n"
                f"After run 2: {snap2_constraints}"
            )

            # Compare views
            assert snap1_views == snap2_views, (
                "Views differ after second migration run.\n"
                f"After run 1: {snap1_views}\n"
                f"After run 2: {snap2_views}"
            )
        finally:
            conn.close()

    def test_expected_tables_exist(self):
        """All expected tables must exist after migration."""
        sql = _read_migration_sql()
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = ANY(%s)
                    """,
                    (list(EXPECTED_TABLES),),
                )
                found = {r[0] for r in cur.fetchall()}
            missing = EXPECTED_TABLES - found
            assert not missing, f"Missing tables after migration: {missing}"
        finally:
            conn.close()

    def test_expected_indexes_exist(self):
        """All expected indexes must exist after migration."""
        sql = _read_migration_sql()
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT indexname
                    FROM pg_indexes
                    WHERE schemaname = 'public'
                      AND indexname = ANY(%s)
                    """,
                    (list(EXPECTED_INDEXES.keys()),),
                )
                found = {r[0] for r in cur.fetchall()}
            missing = set(EXPECTED_INDEXES.keys()) - found
            assert not missing, f"Missing indexes after migration: {missing}"
        finally:
            conn.close()

    def test_expected_view_exists(self):
        """The rubric_points_ready_v1 view must exist after migration."""
        sql = _read_migration_sql()
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT table_name
                    FROM information_schema.views
                    WHERE table_schema = 'public'
                      AND table_name = ANY(%s)
                    """,
                    (list(EXPECTED_VIEWS),),
                )
                found = {r[0] for r in cur.fetchall()}
            missing = EXPECTED_VIEWS - found
            assert not missing, f"Missing views after migration: {missing}"
        finally:
            conn.close()

    def test_table_count_unchanged_after_second_run(self):
        """Number of columns per table must not change after second execution."""
        sql = _read_migration_sql()
        conn = _connect()
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    """
                    SELECT table_name, count(*)
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = ANY(%s)
                    GROUP BY table_name
                    ORDER BY table_name
                    """,
                    (list(EXPECTED_TABLES),),
                )
                counts1 = dict(cur.fetchall())

                cur.execute(sql)
                cur.execute(
                    """
                    SELECT table_name, count(*)
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = ANY(%s)
                    GROUP BY table_name
                    ORDER BY table_name
                    """,
                    (list(EXPECTED_TABLES),),
                )
                counts2 = dict(cur.fetchall())

            assert counts1 == counts2, (
                "Column counts differ after second migration run.\n"
                f"After run 1: {counts1}\n"
                f"After run 2: {counts2}"
            )
        finally:
            conn.close()
