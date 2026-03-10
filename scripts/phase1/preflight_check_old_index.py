#!/usr/bin/env python3
"""
Preflight 0.2: Check whether the legacy unique index
  idx_user_errors_user_storage_key_unique
exists on public.user_errors.

This index must be dropped before the new partial unique indexes
(uq_user_errors_auto_point / uq_user_errors_manual_storage) can be created.

Usage:
  python scripts/phase1/preflight_check_old_index.py
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.phase1.common import RUN_DIR, load_env, require_db_url, utc_now_iso, write_json_file
OLD_INDEX_NAME = "idx_user_errors_user_storage_key_unique"
OUTPUT_FILE = RUN_DIR / "preflight_old_index_audit.json"


def check_index() -> dict:
    """Return dict with index existence info and definition if found."""
    import psycopg2  # type: ignore

    db_url = require_db_url()
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename  = 'user_errors'
                  AND indexname  = %s;
            """, (OLD_INDEX_NAME,))
            row = cur.fetchone()

            # Also list all indexes on user_errors for context
            cur.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename  = 'user_errors'
                ORDER BY indexname;
            """)
            all_indexes = [
                {"name": r[0], "definition": r[1]} for r in cur.fetchall()
            ]
    finally:
        conn.close()

    exists = row is not None
    return {
        "check": "preflight_old_index_exists",
        "timestamp": utc_now_iso(),
        "index_name": OLD_INDEX_NAME,
        "exists": exists,
        "definition": row[1] if exists else None,
        "action_required": "DROP INDEX before migration" if exists else "none — already absent",
        "all_user_errors_indexes": all_indexes,
        "gate_pass": not exists,
        "release_blocked": exists,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit legacy user_errors unique index")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when the legacy index still exists",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_env()
    print(f"Checking for legacy index: {OLD_INDEX_NAME} ...")
    result = check_index()
    write_json_file(OUTPUT_FILE, result)

    if result["exists"]:
        print(f"  FOUND — definition: {result['definition']}")
        print("  Action: must be dropped in migration 1.4")
    else:
        print("  NOT FOUND — no drop needed (already absent or never created)")

    print(f"\nAll indexes on user_errors ({len(result['all_user_errors_indexes'])}):")
    for idx in result["all_user_errors_indexes"]:
        print(f"  - {idx['name']}")
    print(f"Audit written to {OUTPUT_FILE}")

    return 1 if args.strict and not result["gate_pass"] else 0


if __name__ == "__main__":
    sys.exit(main())
