#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env
from scripts.vlm.db_utils import connect  # noqa: E402


def load_env() -> None:
    load_project_env()



def main() -> int:
    parser = argparse.ArgumentParser(description="Publish production-ready view from question_descriptions_v1")
    parser.add_argument("--source", default="question_descriptions_v1")
    parser.add_argument("--view", default="question_descriptions_prod_v1")
    args = parser.parse_args()

    load_env()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                create or replace view {args.view} as
                select *
                from {args.source}
                where status = 'ok'
                """
            )
            cur.execute(f"select count(*) from {args.source}")
            total = cur.fetchone()[0]
            cur.execute(f"select count(*) from {args.view}")
            published = cur.fetchone()[0]
            cur.execute(
                f"""
                select count(*) filter (where summary is null or btrim(summary)='')
                from {args.view}
                """
            )
            empty = cur.fetchone()[0]
            conn.commit()

    print(f"source={args.source} total={total}")
    print(f"view={args.view} published={published}")
    print(f"empty_summary_in_view={empty}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
