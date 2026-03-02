#!/usr/bin/env python3
"""
submit_result_v0.py - validate + upsert VLM result and close job

Usage:
    python scripts/vlm/submit_result_v0.py --job-id <uuid> --result result.json
    cat result.json | python scripts/vlm/submit_result_v0.py --job-id <uuid> --result -
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from typing import Any
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from jsonschema import Draft202012Validator

from scripts.vlm.db_utils import connect, json_param
from scripts.common.local_guard import enforce_local


LEAKAGE_PATTERNS = [
    (r"\b(the\s+)?answer\s+is\b", "answer_disclosure"),
    (r"\btherefore\s+[a-z]\s*=", "solution_step"),
    (r"\bhence\s+[a-z]\s*=", "solution_step"),
    (r"\b(so|thus)\s+[a-z]\s*=\s*\d", "solution_step"),
    (r"\bmark\s*scheme\b", "mark_scheme_ref"),
    (r"\b\d+\s*marks?\b", "mark_allocation"),
    (r"=\s*\d+\.?\d*\s*(m|s|kg|N|J|W|Pa|Hz|V|A|Ω|C|F|H|T|mol|K)\b", "numeric_answer"),
]

SCHEMA = {
    "type": "object",
    "required": [
        "storage_key", "sha256", "syllabus_code", "session", "year", "doc_type",
        "paper", "variant", "q_number", "status", "confidence", "summary",
        "question_type", "answer_form", "math_expressions_latex", "variables",
        "units", "leakage_flags", "provider", "model", "prompt_version",
        "extractor_version"
    ],
    "properties": {
        "leakage_policy": {"type": ["string", "null"]},
        "storage_key": {"type": "string"},
        "sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
        "syllabus_code": {"type": "string"},
        "session": {"type": "string", "enum": ["s", "w", "m"]},
        "year": {"type": "integer"},
        "doc_type": {"type": "string", "const": "qp"},
        "paper": {"type": "integer"},
        "variant": {"type": "integer"},
        "q_number": {"type": ["integer", "null"]},
        "subpart": {"type": ["string", "null"]},
        "status": {"type": "string", "enum": ["ok", "blocked", "error"]},
        "confidence": {"type": ["number", "null"]},
        "summary": {"type": ["string", "null"]},
        "question_type": {"type": ["string", "null"]},
        "answer_form": {"type": ["string", "null"], "enum": ["exact", "approx", "proof", "graph", "table", "other", None]},
        "math_expressions_latex": {"type": "array", "items": {"type": "string"}},
        "variables": {"type": "array", "items": {"type": "string"}},
        "units": {"type": "array", "items": {"type": "string"}},
        "leakage_flags": {"type": "object"},
        "provider": {"type": "string"},
        "model": {"type": "string"},
        "prompt_version": {"type": "string"},
        "extractor_version": {"type": "string"},
        "response_sha256": {"type": ["string", "null"]},
        "raw_json": {"type": ["object", "null"]},
    },
    "additionalProperties": False,
}


def compute_response_sha256(raw: dict) -> str:
    stable = json.dumps(raw, sort_keys=True, ensure_ascii=True).encode()
    return hashlib.sha256(stable).hexdigest()


def detect_leakage(data: dict) -> dict:
    flags: dict[str, Any] = {}
    blocked = False
    skip = {
        "leakage_policy", "storage_key", "sha256", "syllabus_code", "session", "year",
        "doc_type", "paper", "variant", "q_number", "subpart", "provider", "model",
        "prompt_version", "extractor_version", "response_sha256", "raw_json", "leakage_flags"
    }

    def check_text(text: str, field_name: str) -> None:
        nonlocal blocked
        if text is None:
            return
        if len(text) > 240:
            flags[f"{field_name}_too_long"] = len(text)
            blocked = True
        if "\n" in text:
            flags[f"{field_name}_has_newline"] = True
            blocked = True
        for pattern, flag_name in LEAKAGE_PATTERNS:
            if re.search(pattern, text, re.I):
                flags[f"{field_name}_{flag_name}"] = True
                blocked = True
                break

    for key, val in data.items():
        if key in skip:
            continue
        if isinstance(val, str) and val:
            check_text(val, key)
        elif isinstance(val, list):
            for i, item in enumerate(val):
                if isinstance(item, str) and item:
                    check_text(item, f"{key}[{i}]")

    if blocked:
        data["status"] = "blocked"
    return flags


def load_result(path: str) -> dict:
    if path == "-":
        return json.load(sys.stdin)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit VLM result")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--result", required=True, help="path to JSON or '-' for stdin")
    parser.add_argument("--allow-remote", action="store_true", help="允许非本地连接（危险）")
    args = parser.parse_args()

    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    data = load_result(args.result)
    validator = Draft202012Validator(SCHEMA)
    errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
    if errors:
        print("Validation failed:", file=sys.stderr)
        for err in errors[:5]:
            print(f"- {list(err.path)}: {err.message}", file=sys.stderr)
        _mark_job_error(args.job_id, f"validation_failed: {errors[0].message}")
        return 2

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
                       q_number, subpart, extractor_version, provider, model, prompt_version
                FROM vlm_jobs_v0
                WHERE job_id = %s
                """,
                (args.job_id,),
            )
            row = cur.fetchone()
            if not row:
                print(f"Error: job_id not found: {args.job_id}", file=sys.stderr)
                return 2

            (
                storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
                q_number, subpart, extractor_version, provider, model, prompt_version
            ) = row

            # Enforce canonical job fields
            data.update({
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
            })

            leakage_flags = detect_leakage(data)
            merged_flags = {**(data.get("leakage_flags") or {}), **leakage_flags}
            data["leakage_flags"] = merged_flags

            raw_json = data.get("raw_json") or {}
            if not raw_json:
                raw_json = {k: v for k, v in data.items() if k not in ("leakage_policy", "response_sha256", "raw_json")}
            response_sha256 = compute_response_sha256(raw_json)

            insert_sql = """
                INSERT INTO question_descriptions_v0 (
                    storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
                    q_number, subpart, status, confidence, summary, question_type, answer_form,
                    math_expressions_latex, variables, units, leakage_flags, provider, model,
                    prompt_version, extractor_version, response_sha256, raw_json, created_at, updated_at
                )
                VALUES (
                    %(storage_key)s, %(sha256)s, %(syllabus_code)s, %(session)s, %(year)s, %(doc_type)s,
                    %(paper)s, %(variant)s, %(q_number)s, %(subpart)s, %(status)s, %(confidence)s,
                    %(summary)s, %(question_type)s, %(answer_form)s, %(math_expressions_latex)s,
                    %(variables)s, %(units)s, %(leakage_flags)s, %(provider)s, %(model)s,
                    %(prompt_version)s, %(extractor_version)s, %(response_sha256)s, %(raw_json)s,
                    now(), now()
                )
                ON CONFLICT (storage_key, sha256, extractor_version, provider, model, prompt_version)
                DO UPDATE SET
                    status = EXCLUDED.status,
                    confidence = EXCLUDED.confidence,
                    summary = EXCLUDED.summary,
                    question_type = EXCLUDED.question_type,
                    answer_form = EXCLUDED.answer_form,
                    math_expressions_latex = EXCLUDED.math_expressions_latex,
                    variables = EXCLUDED.variables,
                    units = EXCLUDED.units,
                    leakage_flags = EXCLUDED.leakage_flags,
                    response_sha256 = EXCLUDED.response_sha256,
                    raw_json = EXCLUDED.raw_json,
                    updated_at = now();
            """

            payload = {
                "storage_key": data["storage_key"],
                "sha256": data["sha256"],
                "syllabus_code": data["syllabus_code"],
                "session": data["session"],
                "year": data["year"],
                "doc_type": data["doc_type"],
                "paper": data["paper"],
                "variant": data["variant"],
                "q_number": data["q_number"],
                "subpart": data.get("subpart"),
                "status": data["status"],
                "confidence": data.get("confidence"),
                "summary": data.get("summary"),
                "question_type": data.get("question_type"),
                "answer_form": data.get("answer_form") or "other",
                "math_expressions_latex": data.get("math_expressions_latex") or [],
                "variables": data.get("variables") or [],
                "units": data.get("units") or [],
                "leakage_flags": json_param(merged_flags),
                "provider": provider,
                "model": model,
                "prompt_version": prompt_version,
                "extractor_version": extractor_version,
                "response_sha256": response_sha256,
                "raw_json": json_param(raw_json),
            }

            try:
                cur.execute(insert_sql, payload)
                job_status = "blocked" if data["status"] == "blocked" else "done"
                cur.execute(
                    """
                    UPDATE vlm_jobs_v0
                    SET status = %s, last_error = NULL, updated_at = now()
                    WHERE job_id = %s
                    """,
                    (job_status, args.job_id),
                )
            except Exception as e:
                cur.execute(
                    """
                    UPDATE vlm_jobs_v0
                    SET status = 'error', last_error = %s, updated_at = now()
                    WHERE job_id = %s
                    """,
                    (str(e)[:200], args.job_id),
                )
                print(f"DB error: {e}", file=sys.stderr)
                return 2

    print(f"status: {data['status']}")
    print(f"response_sha256: {response_sha256}")
    return 0


def _mark_job_error(job_id: str, message: str) -> None:
    try:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE vlm_jobs_v0
                    SET status = 'error', last_error = %s, updated_at = now()
                    WHERE job_id = %s
                    """,
                    (message[:200], job_id),
                )
    except Exception:
        pass


if __name__ == "__main__":
    raise SystemExit(main())
