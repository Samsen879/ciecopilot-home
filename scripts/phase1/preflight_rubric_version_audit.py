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

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.phase1.common import RUN_DIR, load_env, require_db_url, utc_now_iso, write_json_file

OUTPUT_FILE = RUN_DIR / "preflight_rubric_version_audit.json"


def run_audit(min_ready_rows: int = 0) -> dict:
    """Query rubric_points for multi-version questions."""
    import psycopg2  # type: ignore

    db_url = require_db_url()
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            # Total rubric_points rows
            cur.execute("SELECT COUNT(*) FROM public.rubric_points;")
            total_rows = cur.fetchone()[0]

            cur.execute("""
                SELECT COUNT(*)
                FROM public.rubric_points
                WHERE status = 'ready';
            """)
            ready_rows = cur.fetchone()[0]

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

    gate_pass = ready_rows >= min_ready_rows
    return {
        "audit": "preflight_rubric_version",
        "timestamp": utc_now_iso(),
        "total_rubric_points_rows": total_rows,
        "ready_rubric_points_rows": ready_rows,
        "unique_ready_questions": unique_questions,
        "multi_version_question_count": multi_version_count,
        "single_version_question_count": unique_questions - multi_version_count,
        "version_distribution": version_distribution,
        "multi_version_samples": multi_version_questions,
        "minimum_ready_rows_required": min_ready_rows,
        "version_selection_impact": (
            "Version picker needed"
            if multi_version_count > 0
            else "All questions single-version — picker trivial"
        ),
        "gate_pass": gate_pass,
        "release_blocked": not gate_pass,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit ready rubric version distribution")
    parser.add_argument(
        "--min-ready-rows",
        type=int,
        default=0,
        help="Require at least this many ready rubric_points rows",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when ready_rubric_points_rows is below --min-ready-rows",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_env()
    print("Running rubric_points multi-version audit...")
    result = run_audit(min_ready_rows=args.min_ready_rows)

    write_json_file(OUTPUT_FILE, result)
    print(f"Audit written to {OUTPUT_FILE}")
    print(f"  total_rubric_points_rows={result['total_rubric_points_rows']}")
    print(f"  ready_rubric_points_rows={result['ready_rubric_points_rows']}")
    print(f"  unique_ready_questions={result['unique_ready_questions']}")
    print(f"  multi_version_count={result['multi_version_question_count']}")
    print(f"  impact: {result['version_selection_impact']}")
    return 1 if args.strict and not result["gate_pass"] else 0


if __name__ == "__main__":
    sys.exit(main())
