#!/usr/bin/env python3
"""
Preflight 0.3: Audit rubric_points for multi-version samples.

Identifies questions (storage_key + q_number + subpart) that have
multiple distinct source_version values, which is critical for the
version-selection logic in evaluate-v1.

Output: runs/phase1/preflight_rubric_version_audit.json

Usage:
  python scripts/phase1/preflight_rubric_version_audit.py
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
OUTPUT_FILE = OUTPUT_DIR / "preflight_rubric_version_audit.json"


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
    """Query rubric_points for multi-version questions."""
    import psycopg2  # type: ignore

    db_url = _get_db_url()
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            # Total rubric_points rows
            cur.execute("SELECT COUNT(*) FROM public.rubric_points;")
            total_rows = cur.fetchone()[0]

            # Distinct source_version values
            cur.execute("""
                SELECT
                    concat_ws(':',
                        extractor_version, provider, model, prompt_version
                    ) AS source_version,
                    COUNT(*) AS cnt
                FROM public.rubric_points
                WHERE status = 'ready'
                GROUP BY 1
                ORDER BY cnt DESC;
            """)
            version_distribution = {row[0]: row[1] for row in cur.fetchall()}

            # Questions with multiple source_versions (ready only)
            cur.execute("""
                SELECT
                    storage_key,
                    q_number,
                    COALESCE(subpart, '') AS subpart,
                    COUNT(DISTINCT concat_ws(':',
                        extractor_version, provider, model, prompt_version
                    )) AS version_count
                FROM public.rubric_points
                WHERE status = 'ready'
                GROUP BY storage_key, q_number, COALESCE(subpart, '')
                HAVING COUNT(DISTINCT concat_ws(':',
                    extractor_version, provider, model, prompt_version
                )) > 1
                ORDER BY version_count DESC
                LIMIT 50;
            """)
            cols = [d[0] for d in cur.description]
            multi_version_questions = [
                dict(zip(cols, row)) for row in cur.fetchall()
            ]

            # Count of all unique questions
            cur.execute("""
                SELECT COUNT(DISTINCT (storage_key, q_number, COALESCE(subpart, '')))
                FROM public.rubric_points
                WHERE status = 'ready';
            """)
            unique_questions = cur.fetchone()[0]

            # Count of multi-version questions
            cur.execute("""
                SELECT COUNT(*) FROM (
                    SELECT storage_key, q_number, COALESCE(subpart, '')
                    FROM public.rubric_points
                    WHERE status = 'ready'
                    GROUP BY storage_key, q_number, COALESCE(subpart, '')
                    HAVING COUNT(DISTINCT concat_ws(':',
                        extractor_version, provider, model, prompt_version
                    )) > 1
                ) sub;
            """)
            multi_version_count = cur.fetchone()[0]

    finally:
        conn.close()

    return {
        "audit": "preflight_rubric_version",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_rubric_points_rows": total_rows,
        "unique_ready_questions": unique_questions,
        "multi_version_question_count": multi_version_count,
        "single_version_question_count": unique_questions - multi_version_count,
        "version_distribution": version_distribution,
        "multi_version_samples": multi_version_questions,
        "version_selection_impact": (
            "Version picker needed"
            if multi_version_count > 0
            else "All questions single-version — picker trivial"
        ),
    }


def main() -> int:
    _load_env()
    print("Running rubric_points multi-version audit...")
    result = run_audit()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(result, indent=2, default=str, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Audit written to {OUTPUT_FILE}")
    print(f"  total_rubric_points_rows={result['total_rubric_points_rows']}")
    print(f"  unique_ready_questions={result['unique_ready_questions']}")
    print(f"  multi_version_count={result['multi_version_question_count']}")
    print(f"  impact: {result['version_selection_impact']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
