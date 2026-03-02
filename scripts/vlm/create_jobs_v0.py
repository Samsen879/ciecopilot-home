#!/usr/bin/env python3
"""
create_jobs_v0.py - create VLM jobs from canonical paper_assets

Usage:
    python scripts/vlm/create_jobs_v0.py --limit 500
    python scripts/vlm/create_jobs_v0.py --syllabus-code 9709 --year 2023 --session s
"""
from __future__ import annotations
import argparse
from typing import Any
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.db_utils import connect
from scripts.common.local_guard import enforce_local


def build_filters(args) -> tuple[str, dict[str, Any]]:
    where = [
        "ep.doc_type = 'qp'",
        "pa.asset_type = 'question_img'",
        "NOT (pa.storage_key ~* '/questions/contact_sheet\\.png$')",
    ]
    params: dict[str, Any] = {
        "extractor_version": args.extractor_version,
        "prompt_version": args.prompt_version,
        "provider": args.provider,
        "model": args.model,
    }

    if args.syllabus_code:
        where.append("ep.syllabus_code = %(syllabus_code)s")
        params["syllabus_code"] = args.syllabus_code
    if args.year:
        where.append("ep.year = %(year)s")
        params["year"] = args.year
    if args.session:
        where.append("ep.session = %(session)s")
        params["session"] = args.session
    if args.paper:
        where.append("ep.paper = %(paper)s")
        params["paper"] = args.paper
    if args.variant:
        where.append("ep.variant = %(variant)s")
        params["variant"] = args.variant

    return " AND ".join(where), params


def count_candidates(cur, where_sql: str, params: dict[str, Any], limit: int | None) -> int:
    limit_sql = " LIMIT %(limit)s" if limit else ""
    if limit:
        params = {**params, "limit": limit}
    sql = f"""
        SELECT COUNT(*)
        FROM (
            SELECT 1
            FROM paper_assets pa
            JOIN exam_papers ep ON ep.id = pa.paper_id
            WHERE {where_sql}
            ORDER BY pa.storage_key
            {limit_sql}
        ) t;
    """
    cur.execute(sql, params)
    return int(cur.fetchone()[0])


def count_eligible(cur, where_sql: str, params: dict[str, Any], limit: int | None) -> int:
    limit_sql = " LIMIT %(limit)s" if limit else ""
    if limit:
        params = {**params, "limit": limit}
    sql = f"""
        WITH candidates AS (
            SELECT pa.storage_key, pa.sha256
            FROM paper_assets pa
            JOIN exam_papers ep ON ep.id = pa.paper_id
            WHERE {where_sql}
            ORDER BY pa.storage_key
            {limit_sql}
        )
        SELECT COUNT(*)
        FROM candidates c
        LEFT JOIN question_descriptions_v0 qd
          ON qd.storage_key = c.storage_key
         AND qd.sha256 = c.sha256
         AND qd.extractor_version = %(extractor_version)s
         AND qd.prompt_version = %(prompt_version)s
         AND qd.provider = %(provider)s
         AND qd.model = %(model)s
        WHERE qd.id IS NULL;
    """
    cur.execute(sql, params)
    return int(cur.fetchone()[0])


def insert_jobs(cur, where_sql: str, params: dict[str, Any], limit: int | None) -> int:
    limit_sql = " LIMIT %(limit)s" if limit else ""
    if limit:
        params = {**params, "limit": limit}
    sql = f"""
        WITH candidates AS (
            SELECT
                pa.storage_key,
                pa.sha256,
                ep.syllabus_code,
                ep.session,
                ep.year,
                ep.doc_type,
                ep.paper,
                ep.variant,
                pa.q_number,
                pa.subpart
            FROM paper_assets pa
            JOIN exam_papers ep ON ep.id = pa.paper_id
            WHERE {where_sql}
            ORDER BY pa.storage_key
            {limit_sql}
        ), eligible AS (
            SELECT c.*
            FROM candidates c
            LEFT JOIN question_descriptions_v0 qd
              ON qd.storage_key = c.storage_key
             AND qd.sha256 = c.sha256
             AND qd.extractor_version = %(extractor_version)s
             AND qd.prompt_version = %(prompt_version)s
             AND qd.provider = %(provider)s
             AND qd.model = %(model)s
            WHERE qd.id IS NULL
        )
        INSERT INTO vlm_jobs_v0 (
            storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
            q_number, subpart, extractor_version, provider, model, prompt_version, status, attempts
        )
        SELECT
            storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
            q_number, subpart, %(extractor_version)s, %(provider)s, %(model)s, %(prompt_version)s,
            'pending', 0
        FROM eligible
        ON CONFLICT (storage_key, sha256, extractor_version, provider, model, prompt_version) DO NOTHING
        RETURNING job_id;
    """
    cur.execute(sql, params)
    rows = cur.fetchall()
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create VLM jobs from canonical paper_assets")
    parser.add_argument("--syllabus-code", type=str)
    parser.add_argument("--year", type=int)
    parser.add_argument("--session", type=str, choices=["s", "w", "m"])
    parser.add_argument("--paper", type=int)
    parser.add_argument("--variant", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--extractor-version", type=str, default="v0")
    parser.add_argument("--prompt-version", type=str, default="v0")
    parser.add_argument("--provider", type=str, default="codex")
    parser.add_argument("--model", type=str, default="codex-cli")
    parser.add_argument("--allow-remote", action="store_true", help="允许非本地连接（危险）")
    args = parser.parse_args()

    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    where_sql, params = build_filters(args)

    with connect() as conn:
        with conn.cursor() as cur:
            candidates = count_candidates(cur, where_sql, params, args.limit)
            eligible = count_eligible(cur, where_sql, params, args.limit)

            if args.dry_run:
                print("DRY-RUN: no inserts")
                print(f"candidates_total: {candidates}")
                print(f"eligible_no_description: {eligible}")
                print(f"created: 0")
                print(f"skipped_existing: {eligible}")
                print(f"skipped_described: {candidates - eligible}")
                return 0

            created = insert_jobs(cur, where_sql, params, args.limit)
            skipped_existing = max(eligible - created, 0)
            skipped_described = max(candidates - eligible, 0)

            print(f"candidates_total: {candidates}")
            print(f"eligible_no_description: {eligible}")
            print(f"created: {created}")
            print(f"skipped_existing: {skipped_existing}")
            print(f"skipped_described: {skipped_described}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
