#!/usr/bin/env python3
"""
Preflight 0.1: Audit user_errors.source distribution and anomalies.

Queries the user_errors table to produce:
  - source value distribution (count per distinct source)
  - NULL source count
  - anomalous source values (anything not in the expected set)
  - sample rows for each anomalous value

Output: runs/phase1/preflight_user_errors_source_audit.json

Usage:
  python scripts/phase1/preflight_user_errors_audit.py
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from scripts.common.env import load_project_env

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "runs" / "phase1"
OUTPUT_FILE = OUTPUT_DIR / "preflight_user_errors_source_audit.json"

EXPECTED_SOURCES = {"manual", "mark_engine_auto"}


def _load_env() -> None:
    load_project_env()



def _get_db_url() -> str:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        val = os.environ.get(key)
        if val:
            return val
    print(
        "ERROR: DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_DATABASE_URL) must be set",
        file=sys.stderr,
    )
    sys.exit(2)


def run_audit() -> dict:
    """Connect to DB, query user_errors.source distribution, return audit dict."""
    import psycopg2  # type: ignore

    db_url = _get_db_url()
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            # 1. Source distribution
            cur.execute("""
                SELECT COALESCE(source, '__NULL__') AS src, COUNT(*) AS cnt
                FROM public.user_errors
                GROUP BY 1
                ORDER BY cnt DESC;
            """)
            distribution = {row[0]: row[1] for row in cur.fetchall()}

            # 2. Total row count
            cur.execute("SELECT COUNT(*) FROM public.user_errors;")
            total_rows = cur.fetchone()[0]

            # 3. NULL source count
            cur.execute("SELECT COUNT(*) FROM public.user_errors WHERE source IS NULL;")
            null_count = cur.fetchone()[0]

            # 4. Anomalous values (not in expected set and not NULL)
            anomalous = {
                k: v for k, v in distribution.items()
                if k != "__NULL__" and k not in EXPECTED_SOURCES
            }

            # 5. Sample rows for anomalous values (up to 3 per value)
            anomaly_samples: dict[str, list] = {}
            for src_val in anomalous:
                cur.execute("""
                    SELECT id, user_id, storage_key, source, created_at::text
                    FROM public.user_errors
                    WHERE source = %s
                    LIMIT 3;
                """, (src_val,))
                cols = [d[0] for d in cur.description]
                anomaly_samples[src_val] = [
                    dict(zip(cols, row)) for row in cur.fetchall()
                ]

            # 6. Sample NULL rows
            null_samples: list[dict] = []
            if null_count > 0:
                cur.execute("""
                    SELECT id, user_id, storage_key, source, created_at::text
                    FROM public.user_errors
                    WHERE source IS NULL
                    LIMIT 3;
                """)
                cols = [d[0] for d in cur.description]
                null_samples = [dict(zip(cols, row)) for row in cur.fetchall()]

    finally:
        conn.close()

    return {
        "audit": "preflight_user_errors_source",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_rows": total_rows,
        "source_distribution": distribution,
        "null_source_count": null_count,
        "null_samples": null_samples,
        "expected_sources": sorted(EXPECTED_SOURCES),
        "anomalous_sources": anomalous,
        "anomaly_samples": anomaly_samples,
        "migration_action_needed": null_count > 0 or len(anomalous) > 0,
    }


def main() -> int:
    _load_env()
    print("Running user_errors.source audit...")
    result = run_audit()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(result, indent=2, default=str, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Audit written to {OUTPUT_FILE}")
    print(f"  total_rows={result['total_rows']}")
    print(f"  null_source_count={result['null_source_count']}")
    print(f"  anomalous_sources={list(result['anomalous_sources'].keys())}")
    print(f"  migration_action_needed={result['migration_action_needed']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
