#!/usr/bin/env python3
import argparse
import json
import os
import operator
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = ROOT / "runs" / "backend"
OUT = RUNS_DIR / "backend_gate_summary.json"
DEFAULT_POLICY = ROOT / "config" / "backend_gate_policy.json"
DB_ENV_KEYS = ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL")
ENV_FILES = (".env.local", ".env")
PATH_TOKEN_RE = re.compile(r"([^\.\[\]]+)|\[(\d+)\]")
DEFAULT_STATUS_MODEL = {
    "pass_values": ["pass", "ok", "success", "ready"],
    "degraded_values": ["warn", "warning", "degraded", "missing", "unknown", "skipped", "in_progress"],
    "blocked_values": ["fail", "failed", "error", "blocked"],
}
DEFAULT_STRICT_REQUIRED = {
    "block_on_non_pass": True,
    "block_raw_statuses": ["skipped", "missing", "unknown", "missing_artifact"],
}
NUMERIC_COMPARATORS = {
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
}
VALUE_COMPARATORS = {
    "==": operator.eq,
    "!=": operator.ne,
}
MIGRATION_AUDIT_GATE = "migration_file_audit"


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run all Phase2 backend gates and emit unified summary.")
    parser.add_argument(
        "--strict-required",
        action="store_true",
        help="Fail process when required gates are not PASS (skipped counts as failure).",
    )
    parser.add_argument(
        "--policy",
        default=str(DEFAULT_POLICY.relative_to(ROOT)).replace("\\", "/"),
        help="Gate policy JSON path (relative to repo root by default).",
    )
    parser.add_argument(
        "--skip-steps",
        action="store_true",
        help="Skip command execution and only evaluate policy artifacts.",
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


def normalize_status(raw_status: Any, status_model: dict[str, Any]) -> str:
    pass_values = status_model.get("pass_values", DEFAULT_STATUS_MODEL["pass_values"])
    degraded_values = status_model.get("degraded_values", DEFAULT_STATUS_MODEL["degraded_values"])
    blocked_values = status_model.get("blocked_values", DEFAULT_STATUS_MODEL["blocked_values"])

    if isinstance(raw_status, bool):
        return "pass" if raw_status else "blocked"
    if raw_status is None:
        return "degraded"

    for candidate in pass_values:
        if _status_value_match(raw_status, candidate):
            return "pass"
    for candidate in degraded_values:
        if _status_value_match(raw_status, candidate):
            return "degraded"
    for candidate in blocked_values:
        if _status_value_match(raw_status, candidate):
            return "blocked"

    if isinstance(raw_status, str):
        normalized = raw_status.strip().lower()
        if normalized in {"pass", "ok", "success"}:
            return "pass"
        if normalized in {"warn", "warning", "degraded", "unknown", "missing", "skipped", "in_progress"}:
            return "degraded"
        if normalized in {"fail", "failed", "error", "blocked"}:
            return "blocked"
    return "degraded"


def _status_value_match(actual: Any, expected: Any) -> bool:
    if isinstance(actual, str) and isinstance(expected, str):
        return actual.strip().lower() == expected.strip().lower()
    return actual == expected


def resolve_path(payload: Any, dotted_path: str) -> Any:
    if dotted_path == "":
        return payload

    value = payload
    for match in PATH_TOKEN_RE.finditer(dotted_path):
        key, idx_text = match.groups()
        if key is not None:
            if not isinstance(value, dict):
                return None
            value = value.get(key)
            continue

        if not isinstance(value, list):
            return None
        idx = int(idx_text)
        if idx < 0 or idx >= len(value):
            return None
        value = value[idx]
    return value


def read_policy(policy_path: Path) -> dict[str, Any]:
    policy = read_payload(policy_path)
    if not isinstance(policy, dict):
        raise SystemExit(f"Invalid gate policy JSON: {policy_path}")
    gates = policy.get("gates")
    if not isinstance(gates, dict) or not gates:
        raise SystemExit(f"Policy missing non-empty 'gates' map: {policy_path}")
    return policy


def read_strict_required_cfg(policy: dict[str, Any]) -> dict[str, Any]:
    strict_cfg = policy.get("strict_required")
    if not isinstance(strict_cfg, dict):
        return DEFAULT_STRICT_REQUIRED

    block_on_non_pass = strict_cfg.get("block_on_non_pass", DEFAULT_STRICT_REQUIRED["block_on_non_pass"])
    raw_statuses = strict_cfg.get("block_raw_statuses", DEFAULT_STRICT_REQUIRED["block_raw_statuses"])
    if not isinstance(raw_statuses, list):
        raw_statuses = DEFAULT_STRICT_REQUIRED["block_raw_statuses"]

    sanitized = []
    for item in raw_statuses:
        if not isinstance(item, str):
            continue
        token = item.strip().lower()
        if token:
            sanitized.append(token)

    return {
        "block_on_non_pass": bool(block_on_non_pass),
        "block_raw_statuses": sanitized or DEFAULT_STRICT_REQUIRED["block_raw_statuses"],
    }


def to_repo_rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def resolve_policy_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return ROOT / path


def coerce_float(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_raw_status_token(raw_status: Any) -> str:
    if isinstance(raw_status, str):
        token = raw_status.strip().lower()
        return token if token else "unknown"
    if isinstance(raw_status, bool):
        return "true" if raw_status else "false"
    if raw_status is None:
        return "unknown"
    return str(raw_status).strip().lower() or "unknown"


def evaluate_metric_check(payload: dict[str, Any] | None, check_cfg: dict[str, Any]) -> dict[str, Any]:
    name = str(check_cfg.get("name") or check_cfg.get("path") or "unnamed_check")
    dotted_path = str(check_cfg.get("path") or "")
    op = str(check_cfg.get("op") or "==")
    target = check_cfg.get("target")
    on_fail = str(check_cfg.get("on_fail") or "blocked")

    actual = resolve_path(payload, dotted_path) if payload is not None and dotted_path else None
    passed = False
    reason = ""

    if op == "exists":
        passed = actual is not None
    elif op == "is_true":
        passed = actual is True
    elif op == "is_false":
        passed = actual is False
    elif op in NUMERIC_COMPARATORS:
        actual_num = coerce_float(actual)
        target_num = coerce_float(target)
        if actual_num is None or target_num is None:
            passed = False
            reason = "non_numeric_operand"
        else:
            passed = bool(NUMERIC_COMPARATORS[op](actual_num, target_num))
    elif op in VALUE_COMPARATORS:
        comparator = VALUE_COMPARATORS[op]
        passed = bool(comparator(actual, target))
    else:
        passed = False
        reason = f"unsupported_operator:{op}"

    result = {
        "name": name,
        "path": dotted_path,
        "op": op,
        "target": target,
        "actual": actual,
        "pass": passed,
        "on_fail": on_fail,
    }
    if reason:
        result["reason"] = reason
    return result


def merge_status(base_status: str, failed_checks: list[dict[str, Any]]) -> str:
    status = base_status
    for failed in failed_checks:
        on_fail = str(failed.get("on_fail") or "blocked").strip().lower()
        if on_fail not in {"degraded", "blocked"}:
            on_fail = "blocked"
        if status == "blocked":
            continue
        if on_fail == "blocked":
            status = "blocked"
        elif status == "pass":
            status = "degraded"
    return status


def evaluate_gate(
    name: str,
    gate_cfg: dict[str, Any],
    payload: dict[str, Any] | None,
    artifact_path: Path,
    status_model: dict[str, Any],
) -> dict[str, Any]:
    status_path = str(gate_cfg.get("status_path") or "status")
    raw_status = resolve_path(payload, status_path) if payload is not None else None
    base_status = normalize_status(raw_status, status_model) if payload is not None else "blocked"

    raw_checks = gate_cfg.get("metric_checks", [])
    checks: list[dict[str, Any]] = []
    if isinstance(raw_checks, list):
        for item in raw_checks:
            if isinstance(item, dict):
                checks.append(evaluate_metric_check(payload, item))

    failed_checks = [item for item in checks if not item.get("pass", False)]
    final_status = merge_status(base_status, failed_checks)

    metric_snapshot: dict[str, Any] = {}
    raw_snapshot = gate_cfg.get("metric_snapshot", [])
    if isinstance(raw_snapshot, list):
        for item in raw_snapshot:
            if not isinstance(item, dict):
                continue
            metric_name = str(item.get("name") or "").strip()
            metric_path = str(item.get("path") or "").strip()
            if not metric_name or not metric_path or payload is None:
                continue
            metric_snapshot[metric_name] = resolve_path(payload, metric_path)

    return {
        "name": name,
        "level": str(gate_cfg.get("level") or "advisory"),
        "artifact": to_repo_rel(artifact_path),
        "artifact_exists": payload is not None,
        "status_path": status_path,
        "raw_status": raw_status if payload is not None else "missing_artifact",
        "status": final_status,
        "metric_checks": checks,
        "metric_snapshot": metric_snapshot,
    }


def summarize_quality_signals(gate_payloads: dict[str, dict[str, Any] | None]) -> dict[str, Any]:
    summary: dict[str, Any] = {}

    a1_payload = gate_payloads.get("a1_topic_link_quality")
    if isinstance(a1_payload, dict):
        summary["a1_topic_link_quality"] = {
            "available": True,
            "gate_pass": bool(a1_payload.get("gate_pass", False)),
            "topic_primary_precision": a1_payload.get("topic_primary_precision"),
            "non_fallback_precision": a1_payload.get("non_fallback_precision"),
            "unreadable_ratio": a1_payload.get("unreadable_ratio"),
        }
    else:
        summary["a1_topic_link_quality"] = {"available": False}

    b2_payload = gate_payloads.get("b2_mark_engine_ci")
    if isinstance(b2_payload, dict):
        b2_metrics = b2_payload.get("metrics") if isinstance(b2_payload.get("metrics"), dict) else {}
        b2_gate = b2_payload.get("gate") if isinstance(b2_payload.get("gate"), dict) else {}
        summary["b2_mark_engine_ci"] = {
            "available": True,
            "gate_pass": bool(b2_payload.get("pass", b2_gate.get("pass", False))),
            "step_level_f1": b2_metrics.get("step_level_f1"),
            "rubric_coverage_f1": b2_metrics.get("rubric_coverage_f1"),
            "uncertain_rate": b2_metrics.get("uncertain_rate"),
            "parse_fail_rate": b2_metrics.get("parse_fail_rate"),
        }
    else:
        summary["b2_mark_engine_ci"] = {"available": False}

    rag_payload = gate_payloads.get("rag_decision_benchmark")
    if isinstance(rag_payload, dict):
        recommendation = (
            rag_payload.get("recommendation") if isinstance(rag_payload.get("recommendation"), dict) else {}
        )
        selected_strategy = recommendation.get("selected_strategy")
        strategies = rag_payload.get("strategies") if isinstance(rag_payload.get("strategies"), list) else []
        selected_metrics: dict[str, Any] = {}
        if selected_strategy:
            for item in strategies:
                if not isinstance(item, dict):
                    continue
                if item.get("strategy") == selected_strategy:
                    metrics = item.get("metrics")
                    if isinstance(metrics, dict):
                        selected_metrics = metrics
                    break
        pass_count = sum(1 for item in strategies if isinstance(item, dict) and bool(item.get("pass")))
        summary["rag_decision_benchmark"] = {
            "available": True,
            "status": rag_payload.get("status"),
            "selected_strategy": selected_strategy,
            "selected_strategy_metrics": selected_metrics,
            "strategies_passing_thresholds": pass_count,
            "thresholds": rag_payload.get("thresholds", {}),
        }
    else:
        summary["rag_decision_benchmark"] = {"available": False}

    rag_s13_payload = gate_payloads.get("rag_s1_3_regression")
    if isinstance(rag_s13_payload, dict):
        failed_checks = (
            rag_s13_payload.get("failed_checks")
            if isinstance(rag_s13_payload.get("failed_checks"), list)
            else []
        )
        summary["rag_s1_3_regression"] = {
            "available": True,
            "status": rag_s13_payload.get("status"),
            "total_requests": rag_s13_payload.get("total_requests"),
            "failed_check_count": len(failed_checks),
            "failed_checks": failed_checks[:20],
        }
    else:
        summary["rag_s1_3_regression"] = {"available": False}

    return summary


def _strip_git_quote(path: str) -> str:
    path = path.strip()
    if len(path) >= 2 and path[0] == path[-1] == '"':
        return path[1:-1]
    return path


def collect_migration_file_audit() -> dict[str, Any]:
    cmd = ["git", "status", "--porcelain", "--untracked-files=all", "--", "supabase/migrations"]
    try:
        result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    except Exception as exc:
        return {
            "name": MIGRATION_AUDIT_GATE,
            "level": "advisory",
            "artifact": "git:status --porcelain supabase/migrations",
            "artifact_exists": False,
            "status_path": "git_status_porcelain",
            "raw_status": "git_invocation_failed",
            "status": "degraded",
            "status_reason": "git_invocation_failed",
            "risk_signals": {
                "deleted_tracked_count": 0,
                "untracked_count": 0,
                "modified_count": 0,
                "rename_count": 0,
                "deleted_tracked": [],
                "untracked": [],
                "modified": [],
                "renamed": [],
                "git_exit_code": None,
                "git_stderr_tail": str(exc)[-300:],
            },
            "metric_checks": [],
            "metric_snapshot": {},
        }

    deleted_tracked: list[str] = []
    untracked: list[str] = []
    modified: list[str] = []
    renamed: list[str] = []

    lines = [line for line in (result.stdout or "").splitlines() if line.strip()]
    for line in lines:
        if line.startswith("?? "):
            path = _strip_git_quote(line[3:])
            untracked.append(path)
            continue

        if len(line) < 4:
            continue
        index_status = line[0]
        worktree_status = line[1]
        raw_path = _strip_git_quote(line[3:])
        path = raw_path.split(" -> ", 1)[-1] if " -> " in raw_path else raw_path

        if "D" in (index_status, worktree_status):
            deleted_tracked.append(path)
        elif "R" in (index_status, worktree_status):
            renamed.append(path)
        elif index_status not in {" ", "?"} or worktree_status not in {" ", "?"}:
            modified.append(path)

    has_risk = bool(deleted_tracked or untracked)
    if result.returncode != 0:
        status = "degraded"
        reason = "git_status_non_zero_exit"
    elif has_risk:
        status = "degraded"
        reason = "deleted_or_untracked_migration_files_detected"
    else:
        status = "pass"
        reason = "clean"

    return {
        "name": MIGRATION_AUDIT_GATE,
        "level": "advisory",
        "artifact": "git:status --porcelain supabase/migrations",
        "artifact_exists": result.returncode == 0,
        "status_path": "git_status_porcelain",
        "raw_status": reason,
        "status": status,
        "status_reason": reason,
        "risk_signals": {
            "deleted_tracked_count": len(deleted_tracked),
            "untracked_count": len(untracked),
            "modified_count": len(modified),
            "rename_count": len(renamed),
            "deleted_tracked": deleted_tracked[:40],
            "untracked": untracked[:40],
            "modified": modified[:40],
            "renamed": renamed[:40],
            "git_exit_code": result.returncode,
            "git_stderr_tail": (result.stderr or "")[-400:],
        },
        "metric_checks": [],
        "metric_snapshot": {},
    }


def build_strict_required_blockers(
    required: list[str],
    gate_evaluations: dict[str, dict[str, Any]],
    strict_cfg: dict[str, Any],
) -> list[dict[str, Any]]:
    blockers: list[dict[str, Any]] = []
    block_on_non_pass = bool(strict_cfg.get("block_on_non_pass", True))
    block_raw_statuses = {
        str(item).strip().lower()
        for item in strict_cfg.get("block_raw_statuses", DEFAULT_STRICT_REQUIRED["block_raw_statuses"])
        if str(item).strip()
    }

    for gate_name in required:
        gate = gate_evaluations.get(gate_name)
        if not isinstance(gate, dict):
            continue
        status = str(gate.get("status") or "unknown")
        raw_token = normalize_raw_status_token(gate.get("raw_status"))
        artifact_exists = bool(gate.get("artifact_exists"))
        should_block = False
        reasons: list[str] = []

        if block_on_non_pass and status != "pass":
            should_block = True
            reasons.append("required_gate_non_pass")
        if (not artifact_exists) or (raw_token in block_raw_statuses):
            should_block = True
            reasons.append("required_gate_missing_or_skipped")

        if not should_block:
            continue

        blockers.append(
            {
                "name": gate_name,
                "status": status,
                "raw_status": gate.get("raw_status"),
                "artifact_exists": artifact_exists,
                "reasons": reasons,
            }
        )
    return blockers


def main() -> None:
    args = parse_args()
    hydrate_database_url_from_env_files()

    policy_path = resolve_policy_path(args.policy)
    policy = read_policy(policy_path)
    strict_cfg = read_strict_required_cfg(policy)
    gates = policy.get("gates", {})
    status_model = (
        policy.get("status_model")
        if isinstance(policy.get("status_model"), dict)
        else DEFAULT_STATUS_MODEL
    )

    steps: list[dict[str, Any]] = []
    if not args.skip_steps:
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

    artifacts: dict[str, Path] = {}
    for gate_name, gate_cfg_any in gates.items():
        if not isinstance(gate_cfg_any, dict):
            continue
        artifact_raw = gate_cfg_any.get("artifact")
        if not isinstance(artifact_raw, str) or not artifact_raw.strip():
            continue
        artifact_path = Path(artifact_raw)
        if not artifact_path.is_absolute():
            artifact_path = ROOT / artifact_path
        artifacts[gate_name] = artifact_path

    gate_payloads: dict[str, dict[str, Any] | None] = {}
    gate_evaluations: dict[str, dict[str, Any]] = {}
    for gate_name, gate_cfg_any in gates.items():
        if not isinstance(gate_cfg_any, dict):
            continue
        artifact_path = artifacts.get(gate_name)
        if artifact_path is None:
            continue
        payload = read_payload(artifact_path)
        gate_payloads[gate_name] = payload
        gate_evaluations[gate_name] = evaluate_gate(
            gate_name,
            gate_cfg_any,
            payload,
            artifact_path,
            status_model,
        )

    migration_audit = collect_migration_file_audit()
    gate_evaluations[MIGRATION_AUDIT_GATE] = migration_audit

    gate_status = {name: gate["status"] for name, gate in gate_evaluations.items()}
    required = [
        name
        for name, gate_cfg_any in gates.items()
        if isinstance(gate_cfg_any, dict) and str(gate_cfg_any.get("level", "advisory")) == "required"
    ]
    advisory = [
        name
        for name, gate_cfg_any in gates.items()
        if isinstance(gate_cfg_any, dict) and str(gate_cfg_any.get("level", "advisory")) != "required"
    ]
    if MIGRATION_AUDIT_GATE not in advisory:
        advisory.append(MIGRATION_AUDIT_GATE)

    required_failures = [name for name in required if gate_status.get(name) != "pass"]
    required_blocked = [name for name in required if gate_status.get(name) == "blocked"]
    required_degraded = [name for name in required if gate_status.get(name) == "degraded"]
    advisory_alerts = [name for name in advisory if gate_status.get(name) != "pass"]
    any_step_fail = any(step["status"] != "pass" for step in steps)
    strict_required_blockers = build_strict_required_blockers(required, gate_evaluations, strict_cfg)
    strict_required_triggered = bool(args.strict_required and strict_required_blockers)

    consistency_ready = bool((gate_payloads.get("backend_consistency") or {}).get("upgrade_required_ready", False))
    rag_decision = (gate_payloads.get("rag_decision_benchmark") or {}).get("recommendation", {})

    if strict_required_triggered:
        overall_status = "blocked"
    elif required_blocked:
        overall_status = "blocked"
    elif any_step_fail or advisory_alerts:
        overall_status = "degraded"
    elif required_degraded:
        overall_status = "degraded"
    else:
        overall_status = "pass"

    payload = {
        "generated_at": utc_now(),
        "overall_status": overall_status,
        "strict_required": bool(args.strict_required),
        "strict_required_policy": strict_cfg,
        "strict_required_triggered": strict_required_triggered,
        "skip_steps": bool(args.skip_steps),
        "gate_policy": {
            "path": to_repo_rel(policy_path),
            "version": policy.get("version"),
            "required_gates": list(required),
            "advisory_gates": list(advisory),
            "upgrade_rules": policy.get("upgrade_rules", []),
        },
        "required_gates": list(required),
        "advisory_gates": list(advisory),
        "required_failures": required_failures,
        "required_blocked": required_blocked,
        "required_degraded": required_degraded,
        "strict_required_blockers": strict_required_blockers,
        "advisory_alerts": advisory_alerts,
        "gate_status": gate_status,
        "gate_evaluations": gate_evaluations,
        "quality_signal_summary": summarize_quality_signals(gate_payloads),
        "milestone_hints": {
            "m1_route_and_security_ready": (
                gate_status.get("api_route_integration") == "pass"
                and gate_status.get("security_baseline") == "pass"
            ),
            "m2_upgrade_required_ready": consistency_ready,
            "m3_rag_recommendation": rag_decision,
        },
        "steps": steps,
        "artifacts": {name: to_repo_rel(path) for name, path in artifacts.items()},
        "repro_commands": [
            "python scripts/phase2/run_backend_gate.py",
            "python scripts/phase2/run_backend_gate.py --strict-required",
            "python scripts/phase2/run_backend_gate.py --skip-steps --policy config/backend_gate_policy.json",
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(OUT))

    if strict_required_triggered:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
