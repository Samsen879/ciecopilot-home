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
    parser = argparse.ArgumentParser(description="Sync latest v0 rows from v1 by storage_key")
    parser.add_argument("--source", default="question_descriptions_v1")
    args = parser.parse_args()
    load_env()

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                with latest_v0 as (
                  select distinct on (storage_key) id, storage_key
                  from question_descriptions_v0
                  order by storage_key, updated_at desc, id desc
                )
                update question_descriptions_v0 v0
                set status = v1.status,
                    confidence = v1.confidence,
                    summary = v1.summary,
                    question_type = v1.question_type,
                    answer_form = v1.answer_form,
                    math_expressions_latex = v1.math_expressions_latex,
                    variables = v1.variables,
                    units = v1.units,
                    diagram_elements = v1.diagram_elements,
                    leakage_flags = v1.leakage_flags,
                    raw_json = v1.raw_json,
                    response_sha256 = v1.response_sha256,
                    updated_at = now()
                from latest_v0 l
                join {args.source} v1 on v1.storage_key = l.storage_key
                where v0.id = l.id
                """
            )
            updated = cur.rowcount
            conn.commit()
    print(f"updated_latest_v0_rows={updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
