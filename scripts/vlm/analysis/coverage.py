#!/usr/bin/env python3
"""
coverage.py - Report VLM extraction coverage by syllabus/year/session/paper/variant

Usage:
    python scripts/vlm/analysis/coverage.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from scripts.vlm.db_utils import connect


def main() -> int:
    sql = """
        SELECT
            syllabus_code, year, session, paper, variant,
            SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS ok_count,
            SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked_count,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count,
            COUNT(*) AS total
        FROM question_descriptions_v0
        GROUP BY 1,2,3,4,5
        ORDER BY 1,2,3,4,5;
    """

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

    print("Coverage Report")
    print("=" * 88)
    print(f"{'Syllabus':<8} {'Year':>6} {'Sess':>4} {'Paper':>5} {'Var':>4} {'OK':>6} {'Blocked':>8} {'Error':>6} {'Total':>6}")
    print("-" * 88)

    totals = [0, 0, 0, 0]
    for row in rows:
        syllabus, year, session, paper, variant, ok_c, blocked_c, error_c, total = row
        print(f"{syllabus:<8} {year:>6} {session:>4} {paper:>5} {variant:>4} {ok_c:>6} {blocked_c:>8} {error_c:>6} {total:>6}")
        totals[0] += ok_c
        totals[1] += blocked_c
        totals[2] += error_c
        totals[3] += total

    print("-" * 88)
    print(f"{'TOTAL':<8} {'':>6} {'':>4} {'':>5} {'':>4} {totals[0]:>6} {totals[1]:>8} {totals[2]:>6} {totals[3]:>6}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
