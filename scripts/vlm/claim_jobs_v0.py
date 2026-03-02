#!/usr/bin/env python3
"""
claim_jobs_v0.py - atomically claim pending VLM jobs

Usage:
    python scripts/vlm/claim_jobs_v0.py --batch 1 --worker-id codex-1
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.db_utils import connect
from scripts.common.local_guard import enforce_local


def main() -> int:
    parser = argparse.ArgumentParser(description="Claim pending VLM jobs")
    parser.add_argument("--batch", type=int, default=1)
    parser.add_argument("--worker-id", type=str, required=True)
    parser.add_argument("--partition-mod", type=int, default=None, help="分桶总数（用于严格分配）")
    parser.add_argument("--partition-idx", type=int, default=None, help="分桶编号（0-based）")
    parser.add_argument("--status", type=str, default="pending", choices=["pending", "blocked"], help="要领取的任务状态")
    parser.add_argument("--assets-root", type=str, default=os.environ.get("ASSETS_ROOT", "C:\\Users\\Samsen\\cie-assets"))
    parser.add_argument("--allow-remote", action="store_true", help="允许非本地连接（危险）")
    args = parser.parse_args()

    if (args.partition_mod is None) ^ (args.partition_idx is None):
        parser.error("--partition-mod 和 --partition-idx 必须同时提供")
    if args.partition_mod is not None:
        if args.partition_mod <= 0:
            parser.error("--partition-mod 必须为正整数")
        if args.partition_idx < 0 or args.partition_idx >= args.partition_mod:
            parser.error("--partition-idx 必须在 0..partition_mod-1 范围内")

    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    assets_root = Path(args.assets_root)

    partition_sql = ""
    params = {"limit": args.batch, "worker_id": args.worker_id, "status": args.status}
    if args.partition_mod is not None:
        partition_sql = "AND mod(abs(hashtext(storage_key)), %(partition_mod)s) = %(partition_idx)s"
        params.update({"partition_mod": args.partition_mod, "partition_idx": args.partition_idx})

    sql = f"""
        WITH cte AS (
            SELECT job_id
            FROM vlm_jobs_v0
            WHERE status = %(status)s
            {partition_sql}
            ORDER BY created_at
            LIMIT %(limit)s
            FOR UPDATE SKIP LOCKED
        )
        UPDATE vlm_jobs_v0 j
        SET status = 'running',
            locked_by = %(worker_id)s,
            locked_at = now(),
            attempts = attempts + 1,
            updated_at = now()
        FROM cte
        WHERE j.job_id = cte.job_id
        RETURNING j.job_id, j.storage_key, j.sha256, j.syllabus_code, j.session, j.year,
                  j.doc_type, j.paper, j.variant, j.q_number, j.subpart, j.extractor_version,
                  j.provider, j.model, j.prompt_version;
    """

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    for row in rows:
        job_id, storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant, q_number, subpart, extractor_version, provider, model, prompt_version = row
        local_path = str((assets_root / storage_key).resolve())
        print(json.dumps({
            "job_id": str(job_id),
            "storage_key": storage_key,
            "sha256": sha256,
            "syllabus_code": syllabus_code,
            "session": session,
            "year": year,
            "doc_type": doc_type,
            "paper": paper,
            "variant": variant,
            "q_number": q_number,
            "subpart": subpart,
            "extractor_version": extractor_version,
            "provider": provider,
            "model": model,
            "prompt_version": prompt_version,
            "local_path": local_path,
        }))

    if not rows:
        print(f"No {args.status} jobs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
