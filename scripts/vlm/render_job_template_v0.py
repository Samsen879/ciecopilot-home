#!/usr/bin/env python3
"""
render_job_template_v0.py - render a strict JSON template for a VLM job

Usage:
    python scripts/vlm/render_job_template_v0.py --job-id <uuid>
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.db_utils import connect


LEAKAGE_POLICY = (
    "DO NOT provide final numeric answers. "
    "DO NOT include mark scheme / grading points. "
    "Only describe what the question asks, given data, required output form."
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Render job template JSON")
    parser.add_argument("--job-id", required=True)
    args = parser.parse_args()

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT job_id, storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
                       q_number, subpart, extractor_version, provider, model, prompt_version
                FROM vlm_jobs_v0
                WHERE job_id = %s
                """,
                (args.job_id,),
            )
            row = cur.fetchone()

    if not row:
        print(f"Error: job_id not found: {args.job_id}")
        return 2

    (
        job_id, storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
        q_number, subpart, extractor_version, provider, model, prompt_version
    ) = row

    template = {
        "leakage_policy": LEAKAGE_POLICY,
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
        "status": "ok",
        "confidence": 0.5,
        "summary": "",
        "question_type": "",
        "answer_form": "other",
        "math_expressions_latex": [],
        "variables": [],
        "units": [],
        "leakage_flags": {},
        "provider": provider,
        "model": model,
        "prompt_version": prompt_version,
        "extractor_version": extractor_version,
        "response_sha256": "",
        "raw_json": {},
    }

    print(json.dumps(template, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
