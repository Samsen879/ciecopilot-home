#!/usr/bin/env python3
"""Generate strict Phase1 E2E gate summary JSON."""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SUMMARY_PATH = PROJECT_ROOT / "runs" / "phase1" / "phase1_e2e_gate_summary.json"
A1_GOVERNANCE_PATH = PROJECT_ROOT / "runs" / "a1" / "a1_topic_link_governance_summary.json"
A1_SUMMARY_PATH = PROJECT_ROOT / "runs" / "a1" / "a1_gate_summary.json"
B1_GOVERNANCE_PATH = PROJECT_ROOT / "runs" / "ms" / "b1_rubric_governance_summary.json"
B1_SUMMARY_PATH = PROJECT_ROOT / "runs" / "ms" / "b1_gate_summary.json"
B2_PRE_MIGRATION_PREFLIGHT_PATH = PROJECT_ROOT / "runs" / "phase1" / "phase1_preflight_post_migration.json"
B2_POST_FIXTURE_PREFLIGHT_PATH = PROJECT_ROOT / "runs" / "phase1" / "phase1_preflight_post_fixture.json"
B2_FIXTURE_PATH = PROJECT_ROOT / "runs" / "phase1" / "phase1_e2e_fixture_manifest.json"
B2_SMOKE_PATH = PROJECT_ROOT / "runs" / "phase1" / "evaluate_v1_smoke_response.json"
B2_PARITY_PATH = PROJECT_ROOT / "runs" / "phase1" / "b2_parity_summary.json"
B3_SUMMARY_PATH = PROJECT_ROOT / "runs" / "phase1" / "b3_auto_write_summary.json"


def load_json_safe(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def check_step_status(name: str, check_fn) -> dict:
    try:
        passed, detail = check_fn()
        return {"name": name, "status": "pass" if passed else "fail", "detail": detail}
    except Exception as exc:
        return {"name": name, "status": "error", "detail": str(exc)}


def check_a1_gate() -> tuple[bool, str]:
    data = load_json_safe(A1_SUMMARY_PATH)
    if data is None:
        return False, f"missing or invalid: {A1_SUMMARY_PATH}"
    passed = bool(data.get("gate_pass"))
    return passed, f"gate_pass={passed}"


def check_a1_governance() -> tuple[bool, str]:
    data = load_json_safe(A1_GOVERNANCE_PATH)
    if data is None:
        return False, f"missing or invalid: {A1_GOVERNANCE_PATH}"
    passed = bool(data.get("gate_pass"))
    return passed, (
        "gate_pass={gate_pass}, broken={broken}, stale={stale}, duplicate={duplicate}".format(
            gate_pass=passed,
            broken=data.get("broken_primary_link_count", 0),
            stale=data.get("stale_asset_link_count", 0),
            duplicate=data.get("duplicate_primary_link_storage_key_count", 0),
        )
    )


def check_b1_gate() -> tuple[bool, str]:
    data = load_json_safe(B1_SUMMARY_PATH)
    if data is None:
        return False, f"missing or invalid: {B1_SUMMARY_PATH}"
    passed = bool(data.get("passed")) or data.get("result") == "passed"
    return passed, f"passed={passed}"


def check_b1_governance() -> tuple[bool, str]:
    data = load_json_safe(B1_GOVERNANCE_PATH)
    if data is None:
        return False, f"missing or invalid: {B1_GOVERNANCE_PATH}"
    passed = bool(data.get("gate_pass"))
    return passed, (
        "gate_pass={gate_pass}, ready_rows={ready_rows}, duplicate_keys={duplicate_keys}".format(
            gate_pass=passed,
            ready_rows=data.get("ready_rubric_points_rows", 0),
            duplicate_keys=data.get("duplicate_ready_key_count", 0),
        )
    )


def check_phase1_preflight_post_migration() -> tuple[bool, str]:
    data = load_json_safe(B2_PRE_MIGRATION_PREFLIGHT_PATH)
    if data is None:
        return False, f"missing or invalid: {B2_PRE_MIGRATION_PREFLIGHT_PATH}"
    passed = bool(data.get("gate_pass"))
    return passed, f"gate_pass={passed}"


def check_phase1_fixture() -> tuple[bool, str]:
    data = load_json_safe(B2_FIXTURE_PATH)
    if data is None:
        return False, f"missing or invalid: {B2_FIXTURE_PATH}"
    verification = data.get("verification") or {}
    ready_rows = int(verification.get("ready_rubric_points_rows", 0))
    passed = ready_rows >= 2
    return passed, f"ready_rubric_points_rows={ready_rows}"


def check_phase1_preflight_post_fixture() -> tuple[bool, str]:
    data = load_json_safe(B2_POST_FIXTURE_PREFLIGHT_PATH)
    if data is None:
        return False, f"missing or invalid: {B2_POST_FIXTURE_PREFLIGHT_PATH}"
    passed = bool(data.get("gate_pass"))
    return passed, f"gate_pass={passed}"


def check_b2_smoke() -> tuple[bool, str]:
    data = load_json_safe(B2_SMOKE_PATH)
    if data is None:
        return False, f"missing or invalid: {B2_SMOKE_PATH}"
    status_ok = data.get("status_code") == 200
    body = data.get("body") or {}
    required_ok = (
        isinstance(data.get("request"), dict)
        and isinstance(body.get("run_id"), str)
        and isinstance(body.get("rubric_source_version"), str)
        and isinstance(body.get("scoring_engine_version"), str)
        and isinstance(body.get("decisions"), list)
        and len(body.get("decisions", [])) > 0
    )
    passed = status_ok and required_ok
    return passed, f"status_code={data.get('status_code')}, decisions={len(body.get('decisions', []))}"


def check_b2_parity() -> tuple[bool, str]:
    data = load_json_safe(B2_PARITY_PATH)
    if data is None:
        return False, f"missing or invalid: {B2_PARITY_PATH}"
    passed = bool(data.get("passed"))
    return passed, f"passed={passed}"


def check_b3_auto_write() -> tuple[bool, str]:
    data = load_json_safe(B3_SUMMARY_PATH)
    if data is None:
        return False, f"missing or invalid: {B3_SUMMARY_PATH}"
    passed = (
        bool(data.get("gate_pass"))
        and int(data.get("rows_found", 0)) >= 1
        and int(data.get("invalid_row_count", 0)) == 0
    )
    return (
        passed,
        "gate_pass={gate_pass}, rows_found={rows_found}, invalid_row_count={invalid}".format(
            gate_pass=data.get("gate_pass"),
            rows_found=data.get("rows_found"),
            invalid=data.get("invalid_row_count", 0),
        ),
    )


def main() -> int:
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    steps = [
        check_step_status("phase1_preflight_post_migration", check_phase1_preflight_post_migration),
        check_step_status("a1_quality_gate", check_a1_gate),
        check_step_status("a1_topic_link_governance", check_a1_governance),
        check_step_status("phase1_fixture_manifest", check_phase1_fixture),
        check_step_status("b1_rubric_gate", check_b1_gate),
        check_step_status("b1_rubric_governance", check_b1_governance),
        check_step_status("phase1_preflight_post_fixture", check_phase1_preflight_post_fixture),
        check_step_status("b2_evaluate_v1_smoke", check_b2_smoke),
        check_step_status("b2_js_python_parity", check_b2_parity),
        check_step_status("b3_auto_error_write", check_b3_auto_write),
    ]
    all_pass = all(step["status"] == "pass" for step in steps)
    failed_steps = [step["name"] for step in steps if step["status"] != "pass"]

    summary = {
        "generated_at_utc": generated_at,
        "gate_pass": all_pass,
        "release_blocked": not all_pass,
        "steps": steps,
        "failed_steps": failed_steps,
        "env": {
            "MARKING_V1_ENABLED": os.environ.get("MARKING_V1_ENABLED", "unset"),
            "MARKING_AUTO_ERROR_WRITE_ENABLED": os.environ.get(
                "MARKING_AUTO_ERROR_WRITE_ENABLED", "unset"
            ),
        },
    }
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"[phase1_e2e_summary] gate_pass={all_pass}")
    print(f"[phase1_e2e_summary] failed_steps={failed_steps}")
    print(f"[phase1_e2e_summary] output={SUMMARY_PATH}")
    if failed_steps:
        print(
            f"[phase1_e2e_summary] FAILED: {', '.join(failed_steps)}",
            file=sys.stderr,
        )
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
