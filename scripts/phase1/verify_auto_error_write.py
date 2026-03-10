#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.phase1.common import (
    RUN_DIR,
    load_env,
    read_json_file,
    require_db_url,
    utc_now_iso,
    write_json_file,
)

FIXTURE_PATH = RUN_DIR / "phase1_e2e_fixture_manifest.json"
SMOKE_PATH = RUN_DIR / "evaluate_v1_smoke_response.json"
OUTPUT_PATH = RUN_DIR / "b3_auto_write_summary.json"
EXCLUDED_REASONS = {"dependency_not_met", "dependency_error", "uncertain"}


def _load_fixture() -> dict:
    fixture = read_json_file(FIXTURE_PATH)
    if fixture is None:
        raise RuntimeError(f"missing or invalid fixture manifest: {FIXTURE_PATH}")
    return fixture


def _load_smoke() -> dict:
    smoke = read_json_file(SMOKE_PATH)
    if smoke is None:
        raise RuntimeError(f"missing or invalid smoke artifact: {SMOKE_PATH}")
    return smoke


def run_verification() -> dict:
    import psycopg2  # type: ignore

    fixture = _load_fixture()
    smoke = _load_smoke()
    idempotency = fixture.get("idempotency") or {}
    request_id = idempotency.get("request_id")
    run_idempotency_key = idempotency.get("run_idempotency_key")
    user_id = fixture.get("user_id")

    if not request_id or not run_idempotency_key or not user_id:
        raise RuntimeError("fixture manifest is missing idempotency metadata")

    conn = psycopg2.connect(require_db_url())
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    attempt_id,
                    storage_key,
                    q_number,
                    COALESCE(subpart, ''),
                    topic_path::text,
                    node_id::text
                FROM public.attempts
                WHERE user_id = %s
                  AND idempotency_key = %s
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (user_id, request_id),
            )
            attempt_row = cur.fetchone()

            if attempt_row is None:
                return {
                    "generated_at_utc": utc_now_iso(),
                    "gate_pass": False,
                    "release_blocked": True,
                    "reason": "attempt row not found",
                    "fixture_request_id": request_id,
                    "rows_found": 0,
                }

            attempt = {
                "attempt_id": attempt_row[0],
                "storage_key": attempt_row[1],
                "q_number": attempt_row[2],
                "subpart": attempt_row[3],
                "topic_path": attempt_row[4],
                "node_id": attempt_row[5],
            }

            cur.execute(
                """
                SELECT
                    mark_run_id,
                    status,
                    decision_write_status,
                    engine_version,
                    rubric_version
                FROM public.mark_runs
                WHERE attempt_id = %s
                  AND run_idempotency_key = %s
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (attempt["attempt_id"], run_idempotency_key),
            )
            mark_run_row = cur.fetchone()
            if mark_run_row is None:
                return {
                    "generated_at_utc": utc_now_iso(),
                    "gate_pass": False,
                    "release_blocked": True,
                    "reason": "mark_run row not found",
                    "fixture_request_id": request_id,
                    "attempt": attempt,
                    "rows_found": 0,
                }

            mark_run = {
                "mark_run_id": mark_run_row[0],
                "status": mark_run_row[1],
                "decision_write_status": mark_run_row[2],
                "engine_version": mark_run_row[3],
                "rubric_version": mark_run_row[4],
            }

            cur.execute(
                """
                SELECT
                    mark_decision_id,
                    rubric_id,
                    awarded,
                    reason
                FROM public.mark_decisions
                WHERE mark_run_id = %s
                ORDER BY created_at ASC;
                """,
                (mark_run["mark_run_id"],),
            )
            decision_rows = cur.fetchall()
            error_candidates = [
                {
                    "mark_decision_id": row[0],
                    "rubric_id": row[1],
                    "reason": row[3],
                }
                for row in decision_rows
                if row[2] is False and row[3] not in EXCLUDED_REASONS
            ]

            cur.execute(
                """
                SELECT
                    error_event_id::text,
                    mark_decision_id::text,
                    misconception_tag,
                    severity
                FROM public.error_events
                WHERE attempt_id = %s
                ORDER BY created_at ASC;
                """,
                (attempt["attempt_id"],),
            )
            error_event_rows = [
                {
                    "error_event_id": row[0],
                    "mark_decision_id": row[1],
                    "misconception_tag": row[2],
                    "severity": row[3],
                }
                for row in cur.fetchall()
            ]
    finally:
        conn.close()

    smoke_body = smoke.get("body") or {}
    error_event_count = len(error_event_rows)
    candidate_count = len(error_candidates)
    gate_pass = (
        smoke.get("status_code") == 200
        and mark_run["decision_write_status"] == "success"
        and len(decision_rows) > 0
        and candidate_count > 0
        and error_event_count >= candidate_count
    )
    return {
        "generated_at_utc": utc_now_iso(),
        "gate_pass": gate_pass,
        "release_blocked": not gate_pass,
        "fixture_request_id": request_id,
        "run_id": smoke_body.get("run_id"),
        "attempt": attempt,
        "mark_run": mark_run,
        "mark_decision_count": len(decision_rows),
        "error_candidate_count": candidate_count,
        "rows_found": error_event_count,
        "error_event_count": error_event_count,
        "error_candidates": error_candidates,
        "error_event_samples": error_event_rows[:10],
    }


def main() -> int:
    load_env()
    result = run_verification()
    write_json_file(OUTPUT_PATH, result)
    print(f"[phase1 b3] gate_pass={result['gate_pass']}")
    print(f"[phase1 b3] error_candidate_count={result.get('error_candidate_count', 0)}")
    print(f"[phase1 b3] rows_found={result.get('rows_found', 0)}")
    print(f"[phase1 b3] output={OUTPUT_PATH}")
    return 0 if result["gate_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
