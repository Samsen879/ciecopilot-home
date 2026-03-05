#!/usr/bin/env python3
"""Grid-search threshold calibration for Smart Mark Engine v0."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.marking.engine_config_v0 import (
    get_alignment_thresholds,
    get_integrity_gate_defaults,
    get_quality_gate_defaults,
    get_suite_tier,
    load_marking_engine_config,
)
from scripts.evaluation.eval_mark_engine import DEFAULT_KEY_GROUPS, evaluate_suite, parse_key_groups
from scripts.evaluation.validate_marking_blind_set_integrity import compute_integrity

_DEFAULT_CONFIG = load_marking_engine_config()
_DEFAULT_ALIGNMENT = get_alignment_thresholds(config=_DEFAULT_CONFIG)
_DEFAULT_QUALITY_GATE = get_quality_gate_defaults(config=_DEFAULT_CONFIG)
_DEFAULT_INTEGRITY_GATE = get_integrity_gate_defaults(config=_DEFAULT_CONFIG)


def parse_float_list(value: str) -> list[float]:
    parts = [x.strip() for x in value.split(",") if x.strip()]
    return [float(x) for x in parts]


def summarize_suite(cases: list[dict[str, Any]]) -> dict[str, Any]:
    paper_counts: dict[str, int] = {}
    topic_counts: dict[str, int] = {}
    steps = 0
    for case in cases:
        steps += len(case.get("steps") or [])
        metadata = case.get("metadata") if isinstance(case.get("metadata"), dict) else {}
        paper = str(metadata.get("paper") or "unknown")
        topic = str(metadata.get("topic_path") or "unknown")
        paper_counts[paper] = paper_counts.get(paper, 0) + 1
        topic_counts[topic] = topic_counts.get(topic, 0) + 1
    return {
        "cases": len(cases),
        "steps": steps,
        "paper_counts": dict(sorted(paper_counts.items())),
        "topic_counts": dict(sorted(topic_counts.items())),
    }


def evaluate_for_params(
    *,
    cases: list[dict[str, Any]],
    min_confidence: float,
    uncertain_margin: float,
    step_f1_min: float,
    uncertain_rate_max: float,
    parse_fail_rate_max: float,
    key_group_f1_min: float,
    rubric_coverage_f1_min: float,
    key_groups: tuple[str, ...],
    integrity_result: dict[str, Any] | None,
    enforce_integrity_gate: bool,
) -> dict[str, Any]:
    summary = evaluate_suite(
        cases=cases,
        min_confidence=min_confidence,
        uncertain_margin=uncertain_margin,
        step_f1_min=step_f1_min,
        uncertain_rate_max=uncertain_rate_max,
        parse_fail_rate_max=parse_fail_rate_max,
        key_group_f1_min=key_group_f1_min,
        rubric_coverage_f1_min=rubric_coverage_f1_min,
        key_groups=key_groups,
        integrity_result=integrity_result,
        enforce_integrity_gate=enforce_integrity_gate,
    )
    return {
        "min_confidence": min_confidence,
        "uncertain_margin": uncertain_margin,
        "step_level_f1": summary["metrics"]["step_level_f1"],
        "rubric_coverage_f1": summary["metrics"]["rubric_coverage_f1"],
        "uncertain_rate": summary["metrics"]["uncertain_rate"],
        "parse_fail_rate": summary["metrics"]["parse_fail_rate"],
        "gate": summary["gate"],
        "key_group_metrics": summary["key_group_metrics"],
        "totals": summary["totals"],
    }


def row_sort_key(row: dict[str, Any], default_min_confidence: float, default_uncertain_margin: float) -> tuple[Any, ...]:
    gate = row["gate"]
    distance = abs(row["min_confidence"] - default_min_confidence) + abs(row["uncertain_margin"] - default_uncertain_margin)
    return (
        0 if gate["pass"] else 1,
        -row["step_level_f1"],
        -row["rubric_coverage_f1"],
        row["uncertain_rate"],
        row["parse_fail_rate"],
        distance,
        -row["min_confidence"],
        row["uncertain_margin"],
    )


def render_report(payload: dict[str, Any]) -> str:
    suite = payload["suite_summary"]
    default_row = payload["default_result"]
    recommended = payload["recommended"]
    top_rows = payload["grid_results_sorted"][:10]
    integrity = payload.get("integrity")

    lines = [
        "# B2 Smart Mark Engine Quality Gate v1",
        "",
        f"- generated_at_utc: {payload['generated_at_utc']}",
        f"- suite_path: `{payload['suite_path']}`",
        f"- suite_tier: `{payload.get('suite_tier', 'unspecified')}`",
        f"- total_cases: {suite['cases']}",
        f"- total_steps: {suite['steps']}",
        "",
        "## Coverage",
        "",
        f"- paper_counts: {json.dumps(suite['paper_counts'], ensure_ascii=True)}",
        f"- topic_counts: {json.dumps(suite['topic_counts'], ensure_ascii=True)}",
        "",
        "## Default Parameters",
        "",
        f"- min_confidence: {default_row['min_confidence']:.2f}",
        f"- uncertain_margin: {default_row['uncertain_margin']:.2f}",
        f"- step_level_f1: {default_row['step_level_f1']:.4f}",
        f"- rubric_coverage_f1: {default_row['rubric_coverage_f1']:.4f}",
        f"- uncertain_rate: {default_row['uncertain_rate']:.4f}",
        f"- parse_fail_rate: {default_row['parse_fail_rate']:.4f}",
        f"- gate_pass: {str(default_row['gate']['pass']).lower()}",
        "",
        "## Grid Search Top 10",
        "",
        "| min_confidence | uncertain_margin | step_f1 | coverage_f1 | uncertain_rate | parse_fail_rate | pass |",
        "|---:|---:|---:|---:|---:|---:|---|",
    ]
    for row in top_rows:
        lines.append(
            f"| {row['min_confidence']:.2f} | {row['uncertain_margin']:.2f} | {row['step_level_f1']:.4f} | "
            f"{row['rubric_coverage_f1']:.4f} | {row['uncertain_rate']:.4f} | {row['parse_fail_rate']:.4f} | "
            f"{str(row['gate']['pass']).lower()} |"
        )

    lines.extend(
        [
            "",
            "## Recommended Parameters",
            "",
            f"- min_confidence: {recommended['min_confidence']:.2f}",
            f"- uncertain_margin: {recommended['uncertain_margin']:.2f}",
            f"- step_level_f1: {recommended['step_level_f1']:.4f}",
            f"- rubric_coverage_f1: {recommended['rubric_coverage_f1']:.4f}",
            f"- uncertain_rate: {recommended['uncertain_rate']:.4f}",
            f"- parse_fail_rate: {recommended['parse_fail_rate']:.4f}",
            f"- gate_pass: {str(recommended['gate']['pass']).lower()}",
            "",
            "## Recommendation Rationale",
            "",
            "- Priority 1: meet all gates, including integrity checks.",
            "- Priority 2: maximize step-level F1 and rubric coverage F1.",
            "- Priority 3: minimize uncertain_rate and parse_fail_rate at same F1 level.",
            "",
            "## Key Group Metrics (Recommended)",
            "",
            "| group | steps | f1 | uncertain_rate | parse_fail_rate | pass |",
            "|---|---:|---:|---:|---:|---|",
        ]
    )
    for group, gm in recommended["key_group_metrics"].items():
        lines.append(
            f"| {group} | {gm['steps']} | {gm['f1']:.4f} | {gm['uncertain_rate']:.4f} | "
            f"{gm['parse_fail_rate']:.4f} | {str(recommended['gate']['key_groups'].get(group, False)).lower()} |"
        )

    if isinstance(integrity, dict):
        im = integrity.get("metrics") or {}
        lines.extend(
            [
                "",
                "## Integrity Metrics",
                "",
                f"- storage_key_hit_rate: {float(im.get('storage_key_hit_rate', 0.0)):.4f}",
                f"- step_dup_rate: {float(im.get('step_dup_rate', 0.0)):.4f}",
                f"- fixed_order_gold_rate: {float(im.get('fixed_order_gold_rate', 0.0)):.4f}",
                f"- integrity_pass: {str(bool(integrity.get('pass', False))).lower()}",
            ]
        )
        if integrity.get("storage_key_check_error"):
            lines.append(f"- storage_key_check_error: `{integrity['storage_key_check_error']}`")

    lines.extend(
        [
            "",
            "## Residual Risks",
            "",
            "- Calibration is only meaningful if integrity and linguistic diversity checks pass.",
            "- If grid points are still tied, expand hard-negative and noisy-student cases before freezing thresholds.",
            "",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Calibrate Smart Mark Engine thresholds via grid search")
    parser.add_argument("--suite", type=Path, required=True, help="Path to evaluation suite JSON")
    parser.add_argument("--default-min-confidence", type=float, default=_DEFAULT_ALIGNMENT[0])
    parser.add_argument("--default-uncertain-margin", type=float, default=_DEFAULT_ALIGNMENT[1])
    parser.add_argument("--min-confidence-values", type=str, default="0.45,0.50,0.55,0.60,0.65,0.70")
    parser.add_argument("--uncertain-margin-values", type=str, default="0.05,0.10,0.15,0.20,0.25")
    parser.add_argument("--step-f1-min", type=float, default=_DEFAULT_QUALITY_GATE["step_f1_min"])
    parser.add_argument(
        "--rubric-coverage-f1-min", type=float, default=_DEFAULT_QUALITY_GATE["rubric_coverage_f1_min"]
    )
    parser.add_argument("--uncertain-rate-max", type=float, default=_DEFAULT_QUALITY_GATE["uncertain_rate_max"])
    parser.add_argument("--parse-fail-rate-max", type=float, default=_DEFAULT_QUALITY_GATE["parse_fail_rate_max"])
    parser.add_argument("--key-group-f1-min", type=float, default=_DEFAULT_QUALITY_GATE["key_group_f1_min"])
    parser.add_argument(
        "--key-groups",
        type=str,
        default=",".join(DEFAULT_KEY_GROUPS),
        help="Comma separated key groups. Default: differentiation,integration,complex_numbers,vectors",
    )
    parser.add_argument("--skip-integrity-check", action="store_true")
    parser.add_argument("--integrity-db-table", type=str, default="public.question_descriptions_prod_v1")
    parser.add_argument(
        "--integrity-storage-check",
        choices=("db", "file_exists", "none"),
        default="db",
        help="How to validate storage keys during integrity check.",
    )
    parser.add_argument("--storage-key-base", type=Path, default=Path("."))
    parser.add_argument(
        "--min-storage-key-hit-rate",
        type=float,
        default=_DEFAULT_INTEGRITY_GATE["min_storage_key_hit_rate"],
    )
    parser.add_argument("--max-step-dup-rate", type=float, default=_DEFAULT_INTEGRITY_GATE["max_step_dup_rate"])
    parser.add_argument(
        "--max-fixed-order-gold-rate",
        type=float,
        default=_DEFAULT_INTEGRITY_GATE["max_fixed_order_gold_rate"],
    )
    parser.add_argument(
        "--allow-sanity-tier",
        action="store_true",
        help="Allow running calibration on suites marked tier=sanity (default blocks this).",
    )
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--require-db", action="store_true")
    parser.add_argument(
        "--json-out",
        type=Path,
        default=Path("docs/reports/b2_mark_engine_threshold_calibration_v1.json"),
        help="JSON output path for calibration results",
    )
    parser.add_argument(
        "--report-out",
        type=Path,
        default=Path("docs/reports/b2_mark_engine_quality_gate_v1.md"),
        help="Markdown report output path",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(args.suite.read_text(encoding="utf-8"))
    suite_tier = get_suite_tier(payload)
    if suite_tier == "sanity" and not args.allow_sanity_tier:
        raise SystemExit(
            "Calibration blocked: suite tier is 'sanity'. Use a calibration-tier blind set or pass --allow-sanity-tier."
        )
    cases = payload.get("cases") or []
    key_groups = parse_key_groups(args.key_groups)

    min_conf_values = parse_float_list(args.min_confidence_values)
    uncertain_margin_values = parse_float_list(args.uncertain_margin_values)

    integrity_result: dict[str, Any] | None = None
    if not args.skip_integrity_check:
        integrity_result = compute_integrity(
            suite_path=args.suite,
            cases=cases,
            db_table=args.integrity_db_table,
            storage_key_check=args.integrity_storage_check,
            storage_key_base=args.storage_key_base,
            min_storage_key_hit_rate=args.min_storage_key_hit_rate,
            max_step_dup_rate=args.max_step_dup_rate,
            max_fixed_order_gold_rate=args.max_fixed_order_gold_rate,
            allow_remote=args.allow_remote,
            require_db=args.require_db,
        )

    default_result = evaluate_for_params(
        cases=cases,
        min_confidence=args.default_min_confidence,
        uncertain_margin=args.default_uncertain_margin,
        step_f1_min=args.step_f1_min,
        uncertain_rate_max=args.uncertain_rate_max,
        parse_fail_rate_max=args.parse_fail_rate_max,
        key_group_f1_min=args.key_group_f1_min,
        rubric_coverage_f1_min=args.rubric_coverage_f1_min,
        key_groups=key_groups,
        integrity_result=integrity_result,
        enforce_integrity_gate=not args.skip_integrity_check,
    )

    grid_results: list[dict[str, Any]] = []
    for min_conf in min_conf_values:
        for margin in uncertain_margin_values:
            row = evaluate_for_params(
                cases=cases,
                min_confidence=min_conf,
                uncertain_margin=margin,
                step_f1_min=args.step_f1_min,
                uncertain_rate_max=args.uncertain_rate_max,
                parse_fail_rate_max=args.parse_fail_rate_max,
                key_group_f1_min=args.key_group_f1_min,
                rubric_coverage_f1_min=args.rubric_coverage_f1_min,
                key_groups=key_groups,
                integrity_result=integrity_result,
                enforce_integrity_gate=not args.skip_integrity_check,
            )
            grid_results.append(row)

    grid_sorted = sorted(
        grid_results,
        key=lambda row: row_sort_key(
            row,
            default_min_confidence=args.default_min_confidence,
            default_uncertain_margin=args.default_uncertain_margin,
        ),
    )
    recommended = grid_sorted[0] if grid_sorted else default_result

    out = {
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "suite_path": str(args.suite),
        "suite_tier": suite_tier,
        "suite_summary": summarize_suite(cases),
        "threshold_grid": {
            "min_confidence_values": min_conf_values,
            "uncertain_margin_values": uncertain_margin_values,
        },
        "gate_thresholds": {
            "step_f1_min": args.step_f1_min,
            "rubric_coverage_f1_min": args.rubric_coverage_f1_min,
            "uncertain_rate_max": args.uncertain_rate_max,
            "parse_fail_rate_max": args.parse_fail_rate_max,
            "key_group_f1_min": args.key_group_f1_min,
            "key_groups": list(key_groups),
            "min_storage_key_hit_rate": args.min_storage_key_hit_rate,
            "max_step_dup_rate": args.max_step_dup_rate,
            "max_fixed_order_gold_rate": args.max_fixed_order_gold_rate,
        },
        "integrity": integrity_result,
        "default_result": default_result,
        "grid_results_sorted": grid_sorted,
        "recommended": recommended,
    }

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(out, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    args.report_out.write_text(render_report(out), encoding="utf-8")

    print(f"suite={args.suite}")
    print(f"suite_tier={suite_tier}")
    print(f"default_f1={default_result['step_level_f1']:.4f}")
    print(f"default_rubric_coverage_f1={default_result['rubric_coverage_f1']:.4f}")
    print(f"default_uncertain_rate={default_result['uncertain_rate']:.4f}")
    print(f"default_parse_fail_rate={default_result['parse_fail_rate']:.4f}")
    print(f"default_pass={str(default_result['gate']['pass']).lower()}")
    print(f"recommended_min_confidence={recommended['min_confidence']:.2f}")
    print(f"recommended_uncertain_margin={recommended['uncertain_margin']:.2f}")
    print(f"recommended_f1={recommended['step_level_f1']:.4f}")
    print(f"recommended_rubric_coverage_f1={recommended['rubric_coverage_f1']:.4f}")
    print(f"recommended_uncertain_rate={recommended['uncertain_rate']:.4f}")
    print(f"recommended_parse_fail_rate={recommended['parse_fail_rate']:.4f}")
    print(f"recommended_pass={str(recommended['gate']['pass']).lower()}")
    print(f"json_out={args.json_out}")
    print(f"report_out={args.report_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
