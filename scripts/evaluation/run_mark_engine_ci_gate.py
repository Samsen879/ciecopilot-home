#!/usr/bin/env python3
"""Run frozen B2 Smart Mark Engine v0 quality gate in CI."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.evaluation.eval_mark_engine import evaluate_suite, render_report
from scripts.evaluation.validate_marking_blind_set_integrity import compute_integrity
from scripts.marking.engine_config_v0 import (
    DEFAULT_CONFIG_PATH,
    get_alignment_thresholds,
    get_ci_gate_defaults,
    get_integrity_gate_defaults,
    get_quality_gate_defaults,
    get_suite_tier,
    validate_frozen_config,
    load_marking_engine_config,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run CI quality gate for Smart Mark Engine v0")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH, help="Frozen config JSON path")
    parser.add_argument("--suite", type=Path, default=None, help="Override suite path from config")
    parser.add_argument("--integrity-storage-check", choices=("db", "file_exists", "none"), default=None)
    parser.add_argument("--storage-key-base", type=Path, default=None)
    parser.add_argument("--allow-sanity-tier", action="store_true")
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--require-db", action="store_true")
    parser.add_argument("--json-out", type=Path, default=Path("docs/reports/b2_mark_engine_eval_ci_gate.json"))
    parser.add_argument("--report-out", type=Path, default=Path("docs/reports/b2_mark_engine_quality_gate_ci.md"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_marking_engine_config(args.config, require_exists=True, require_valid_json=True)
    issues = validate_frozen_config(config)
    if issues:
        raise SystemExit(f"Invalid frozen config at {args.config}: {', '.join(issues)}")
    align = get_alignment_thresholds(config=config)
    gate_cfg = get_quality_gate_defaults(config=config)
    integrity_cfg = get_integrity_gate_defaults(config=config)
    ci_cfg = get_ci_gate_defaults(config=config)

    suite_path = args.suite or Path(ci_cfg["suite_path"])
    storage_check = args.integrity_storage_check or ci_cfg["integrity_storage_check"]
    storage_key_base = args.storage_key_base or Path(ci_cfg["storage_key_base"])
    storage_check_reason = ci_cfg.get("integrity_storage_check_reason", "")

    payload = json.loads(suite_path.read_text(encoding="utf-8"))
    suite_tier = get_suite_tier(payload)
    if suite_tier == "sanity" and not args.allow_sanity_tier:
        raise SystemExit(
            "CI gate blocked: suite tier is 'sanity'. Use a calibration-tier blind set for gate enforcement."
        )

    cases = payload.get("cases") or []
    key_groups = tuple(str(x) for x in gate_cfg["key_groups"])

    integrity_result = compute_integrity(
        suite_path=suite_path,
        cases=cases,
        storage_key_check=storage_check,
        storage_key_base=storage_key_base,
        min_storage_key_hit_rate=float(integrity_cfg["min_storage_key_hit_rate"]),
        max_step_dup_rate=float(integrity_cfg["max_step_dup_rate"]),
        max_fixed_order_gold_rate=float(integrity_cfg["max_fixed_order_gold_rate"]),
        allow_remote=args.allow_remote,
        require_db=args.require_db,
    )

    integrity_note = None
    if storage_check == "none":
        reason = storage_check_reason or "No reason provided."
        integrity_note = (
            "storage_key_check skipped in CI (mode=none). "
            "This run still enforces step_dup_rate and fixed_order_gold_rate. "
            f"Reason: {reason}"
        )

    suite_summary = evaluate_suite(
        cases=cases,
        min_confidence=float(align[0]),
        uncertain_margin=float(align[1]),
        step_f1_min=float(gate_cfg["step_f1_min"]),
        uncertain_rate_max=float(gate_cfg["uncertain_rate_max"]),
        parse_fail_rate_max=float(gate_cfg["parse_fail_rate_max"]),
        key_group_f1_min=float(gate_cfg["key_group_f1_min"]),
        rubric_coverage_f1_min=float(gate_cfg["rubric_coverage_f1_min"]),
        key_groups=key_groups,
        integrity_result=integrity_result,
        enforce_integrity_gate=True,
    )

    summary: dict[str, Any] = {
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "suite_path": str(suite_path),
        "suite_tier": suite_tier,
        "config_path": str(args.config),
        "integrity_storage_check": storage_check,
        "integrity_note": integrity_note,
        **suite_summary,
    }

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(summary, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    args.report_out.write_text(render_report(summary), encoding="utf-8")

    metrics = summary["metrics"]
    print(f"config={args.config}")
    print(f"suite={suite_path}")
    print(f"suite_tier={suite_tier}")
    print(f"min_confidence={align[0]:.4f}")
    print(f"uncertain_margin={align[1]:.4f}")
    print(f"step_level_f1={metrics['step_level_f1']:.4f}")
    print(f"rubric_coverage_f1={metrics['rubric_coverage_f1']:.4f}")
    print(f"uncertain_rate={metrics['uncertain_rate']:.4f}")
    print(f"parse_fail_rate={metrics['parse_fail_rate']:.4f}")
    print(f"integrity_storage_check={storage_check}")
    if integrity_note:
        print(f"integrity_note={integrity_note}")
    print(f"gate_pass={str(summary['gate']['pass']).lower()}")
    print(f"json_out={args.json_out}")
    print(f"report_out={args.report_out}")

    return 0 if summary["gate"]["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
