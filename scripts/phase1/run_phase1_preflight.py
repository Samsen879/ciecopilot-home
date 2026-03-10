#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Callable

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.phase1.common import RUN_DIR, load_env, read_json_file, utc_now_iso, write_json_file
from scripts.phase1.preflight_check_old_index import OUTPUT_FILE as OLD_INDEX_OUTPUT
from scripts.phase1.preflight_check_old_index import check_index
from scripts.phase1.preflight_rubric_version_audit import OUTPUT_FILE as RUBRIC_AUDIT_OUTPUT
from scripts.phase1.preflight_rubric_version_audit import run_audit as run_rubric_version_audit
from scripts.phase1.preflight_user_errors_audit import OUTPUT_FILE as USER_ERRORS_OUTPUT
from scripts.phase1.preflight_user_errors_audit import run_audit as run_user_errors_audit

FIXTURE_MANIFEST_PATH = RUN_DIR / "phase1_e2e_fixture_manifest.json"


def _run_check(name: str, fn: Callable[[], dict]) -> dict:
    try:
        payload = fn()
        gate_pass = bool(payload.get("gate_pass", False))
        return {
            "name": name,
            "status": "pass" if gate_pass else "fail",
            "detail": payload,
        }
    except Exception as exc:
        return {
            "name": name,
            "status": "error",
            "detail": {"message": str(exc)},
        }


def _check_fixture_manifest() -> dict:
    manifest = read_json_file(FIXTURE_MANIFEST_PATH)
    if manifest is None:
        return {
            "check": "phase1_fixture_manifest",
            "timestamp": utc_now_iso(),
            "gate_pass": False,
            "release_blocked": True,
            "reason": f"missing or invalid fixture manifest: {FIXTURE_MANIFEST_PATH}",
        }

    required_values = [
        ("storage_key", manifest.get("storage_key")),
        ("q_number", manifest.get("q_number")),
        ("user_id", manifest.get("user_id")),
        ("question_id", manifest.get("question_id")),
        ("rubric_source_version", manifest.get("rubric_source_version")),
        ("request_id", (manifest.get("idempotency") or {}).get("request_id")),
        (
            "run_idempotency_key",
            (manifest.get("idempotency") or {}).get("run_idempotency_key"),
        ),
        ("student_steps", (manifest.get("smoke_request") or {}).get("student_steps")),
    ]
    missing = [name for name, value in required_values if value in (None, "", [])]
    verification = manifest.get("verification") or {}
    ready_rows = int(verification.get("ready_rubric_points_rows", 0))
    gate_pass = not missing and ready_rows >= 2
    return {
        "check": "phase1_fixture_manifest",
        "timestamp": utc_now_iso(),
        "gate_pass": gate_pass,
        "release_blocked": not gate_pass,
        "missing_fields": missing,
        "ready_rubric_points_rows": ready_rows,
        "manifest_path": str(FIXTURE_MANIFEST_PATH),
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Phase1 governance preflight bundle")
    parser.add_argument(
        "--stage",
        choices=["post-migration", "post-fixture"],
        required=True,
        help="Which preflight bundle to run",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when any bundled check fails",
    )
    parser.add_argument(
        "--min-ready-rows",
        type=int,
        default=2,
        help="Minimum ready rubric rows required during --stage post-fixture",
    )
    return parser.parse_args(argv)


def build_checks(stage: str, min_ready_rows: int) -> list[tuple[str, Callable[[], dict], Path | None]]:
    if stage == "post-migration":
        return [
            ("user_errors_source_audit", run_user_errors_audit, USER_ERRORS_OUTPUT),
            ("legacy_user_errors_index", check_index, OLD_INDEX_OUTPUT),
        ]
    return [
        ("phase1_fixture_manifest", _check_fixture_manifest, None),
        (
            "rubric_version_audit",
            lambda: run_rubric_version_audit(min_ready_rows=min_ready_rows),
            RUBRIC_AUDIT_OUTPUT,
        ),
    ]


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_env()

    checks = []
    for name, fn, output_path in build_checks(args.stage, args.min_ready_rows):
        result = _run_check(name, fn)
        detail = result.get("detail")
        if isinstance(detail, dict) and output_path is not None:
            write_json_file(output_path, detail)
        checks.append(result)

    gate_pass = all(check["status"] == "pass" for check in checks)
    output_path = RUN_DIR / f"phase1_preflight_{args.stage.replace('-', '_')}.json"
    summary = {
        "generated_at_utc": utc_now_iso(),
        "stage": args.stage,
        "gate_pass": gate_pass,
        "release_blocked": not gate_pass,
        "checks": checks,
    }
    write_json_file(output_path, summary)

    print(f"[phase1 preflight] stage={args.stage}")
    for check in checks:
        print(f"[phase1 preflight] {check['name']}={check['status']}")
    print(f"[phase1 preflight] output={output_path}")

    return 1 if args.strict and not gate_pass else 0


if __name__ == "__main__":
    raise SystemExit(main())
