#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = ROOT / "runs" / "backend"
OUT = RUNS_DIR / "backend_gate_summary.json"
DB_ENV_KEYS = ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL")
ENV_FILES = (".env.local", ".env")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_cmd(name: str, cmd: list[str]) -> dict[str, Any]:
    started = time.time()
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    return {
        "name": name,
        "command": " ".join(cmd),
        "exit_code": result.returncode,
        "duration_sec": round(time.time() - started, 3),
        "status": "pass" if result.returncode == 0 else "fail",
        "stdout_tail": (result.stdout or "")[-1200:],
        "stderr_tail": (result.stderr or "")[-1200:],
    }


def read_payload(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def read_status(path: Path) -> str:
    payload = read_payload(path)
    if payload is None:
        return "missing"
    status = payload.get("status")
    if isinstance(status, str) and status:
        return status
    return "unknown"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run all Phase2 backend gates and emit unified summary.")
    parser.add_argument(
        "--strict-required",
        action="store_true",
        help="Fail process when required gates are not PASS (skipped counts as failure).",
    )
    return parser.parse_args()


def _strip_wrapping_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def hydrate_database_url_from_env_files() -> None:
    for key in DB_ENV_KEYS:
        value = os.getenv(key)
        if value:
            os.environ["DATABASE_URL"] = value
            return

    for env_file in ENV_FILES:
        path = ROOT / env_file
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, raw_value = line.split("=", 1)
            key = key.strip()
            if key not in DB_ENV_KEYS:
                continue
            value = _strip_wrapping_quotes(raw_value.strip())
            if value:
                os.environ["DATABASE_URL"] = value
                return


def main() -> None:
    args = parse_args()
    hydrate_database_url_from_env_files()

    steps = [
        run_cmd("route_matrix", ["node", "scripts/phase2/generate_route_matrix.js"]),
        run_cmd("api_route_summary", ["node", "scripts/phase2/run_api_route_integration_summary.js"]),
        run_cmd("security_redaction_scan", ["node", "scripts/phase2/scan_security_redaction.js"]),
        run_cmd("security_baseline_report", ["node", "scripts/phase2/run_security_baseline_report.js"]),
        run_cmd("marking_correctness", [sys.executable, "scripts/phase2/run_marking_correctness_gate.py"]),
        run_cmd(
            "supabase_client_unification",
            [sys.executable, "scripts/phase2/run_supabase_client_unification_report.py"],
        ),
        run_cmd("db_contract", [sys.executable, "scripts/phase2/check_db_contract.py"]),
        run_cmd("migration_smoke", [sys.executable, "scripts/phase2/run_migration_smoke.py"]),
        run_cmd("backend_consistency", [sys.executable, "scripts/phase2/check_backend_consistency.py"]),
        run_cmd("rag_decision_benchmark", [sys.executable, "scripts/phase2/run_rag_decision_benchmark.py"]),
    ]

    artifacts = {
        "api_route_integration": RUNS_DIR / "api_route_integration_summary.json",
        "security_baseline": RUNS_DIR / "security_baseline_report.json",
        "marking_correctness": RUNS_DIR / "marking_correctness_summary.json",
        "supabase_client_unification": RUNS_DIR / "supabase_client_unification.json",
        "db_contract": RUNS_DIR / "db_contract_summary.json",
        "migration_smoke": RUNS_DIR / "migration_smoke_summary.json",
        "backend_consistency": RUNS_DIR / "backend_consistency_summary.json",
        "rag_decision_benchmark": RUNS_DIR / "rag_decision_benchmark.json",
    }

    gate_payloads = {name: read_payload(path) for name, path in artifacts.items()}
    gate_status = {name: read_status(path) for name, path in artifacts.items()}
    required = ("api_route_integration", "security_baseline", "marking_correctness", "db_contract")

    required_failures = [name for name in required if gate_status.get(name) != "pass"]
    any_step_fail = any(step["status"] != "pass" for step in steps)

    consistency_ready = bool(
        (gate_payloads.get("backend_consistency") or {}).get("upgrade_required_ready", False)
    )
    rag_decision = (gate_payloads.get("rag_decision_benchmark") or {}).get("recommendation", {})

    if required_failures:
        overall_status = "blocked"
    elif any_step_fail:
        overall_status = "degraded"
    else:
        overall_status = "pass"

    payload = {
        "generated_at": utc_now(),
        "overall_status": overall_status,
        "strict_required": bool(args.strict_required),
        "required_gates": list(required),
        "required_failures": required_failures,
        "gate_status": gate_status,
        "milestone_hints": {
            "m1_route_and_security_ready": (
                gate_status.get("api_route_integration") == "pass"
                and gate_status.get("security_baseline") == "pass"
            ),
            "m2_upgrade_required_ready": consistency_ready,
            "m3_rag_recommendation": rag_decision,
        },
        "steps": steps,
        "artifacts": {name: str(path.relative_to(ROOT)).replace("\\", "/") for name, path in artifacts.items()},
        "repro_commands": [
            "python scripts/phase2/run_backend_gate.py",
            "python scripts/phase2/run_backend_gate.py --strict-required",
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(OUT))

    if args.strict_required and required_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
