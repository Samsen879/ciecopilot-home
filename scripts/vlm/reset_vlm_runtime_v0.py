#!/usr/bin/env python3
"""Reset VLM runtime tables for a clean full rerun (local DB only)."""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local
from scripts.vlm.db_utils import connect


DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def load_env() -> None:
    load_project_env()



def ensure_db_url(override: str | None) -> str:
    if override:
        os.environ["DATABASE_URL"] = override
        return override
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        v = os.environ.get(key)
        if v:
            os.environ["DATABASE_URL"] = v
            return v
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL
    return DEFAULT_LOCAL_DB_URL


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Reset VLM runtime tables for clean rerun")
    p.add_argument("--database-url", default=None, help="Override DATABASE_URL")
    p.add_argument("--yes", action="store_true", help="Confirm destructive truncate on VLM runtime tables")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    if not args.yes:
        print("Refusing to run without --yes")
        return 2

    load_env()
    db_url = ensure_db_url(args.database_url)
    enforce_local(False, env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"])
    print(f"DATABASE_URL={db_url}")

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "TRUNCATE TABLE public.vlm_runs_v0, public.vlm_jobs_v0, public.question_descriptions_v1, public.question_descriptions_v0 RESTART IDENTITY"
            )
            conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.vlm_jobs_v0")
            jobs = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_v0")
            qd_v0 = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_v1")
            qd_v1 = cur.fetchone()[0]
    print(f"reset_done jobs={jobs} qd_v0={qd_v0} qd_v1={qd_v1}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
