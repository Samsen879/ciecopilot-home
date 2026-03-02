#!/usr/bin/env python3
"""
worker_loop_v0.py - claim jobs and print next-step commands
"""
from __future__ import annotations
import argparse
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.db_utils import connect
from scripts.common.local_guard import enforce_local


def main() -> int:
    parser = argparse.ArgumentParser(description="Claim jobs and print next steps")
    parser.add_argument("--batch", type=int, default=1)
    parser.add_argument("--worker-id", type=str, required=True)
    parser.add_argument("--assets-root", type=str, default=os.environ.get("ASSETS_ROOT", "C:\\Users\\Samsen\\cie-assets"))
    parser.add_argument("--allow-remote", action="store_true", help="允许非本地连接（危险）")
    args = parser.parse_args()

    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    assets_root = Path(args.assets_root)

    sql = """
        WITH cte AS (
            SELECT job_id
            FROM vlm_jobs_v0
            WHERE status = 'pending'
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
        RETURNING j.job_id, j.storage_key;
    """

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"limit": args.batch, "worker_id": args.worker_id})
            rows = cur.fetchall()

    if not rows:
        print("No pending jobs.")
        return 0

    for job_id, storage_key in rows:
        local_path = str((assets_root / storage_key).resolve())
        print(f"job_id: {job_id}")
        print(f"local_path: {local_path}")
        print("next:")
        print(f"  python scripts/vlm/render_job_template_v0.py --job-id {job_id} > result_{job_id}.json")
        print("  (open the image above, fill JSON, then submit)")
        print(f"  python scripts/vlm/submit_result_v0.py --job-id {job_id} --result result_{job_id}.json")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
