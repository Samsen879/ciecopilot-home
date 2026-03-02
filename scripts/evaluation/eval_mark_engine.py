#!/usr/bin/env python3
"""Evaluate Smart Mark Engine v0 on curated evaluation suites."""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
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
from scripts.evaluation.validate_marking_blind_set_integrity import compute_integrity, parse_gold_targets
from scripts.marking.sla_align_v0 import run_from_payload


_DEFAULT_CONFIG = load_marking_engine_config()
_DEFAULT_ALIGNMENT = get_alignment_thresholds(config=_DEFAULT_CONFIG)
_DEFAULT_QUALITY_GATE = get_quality_gate_defaults(config=_DEFAULT_CONFIG)
_DEFAULT_INTEGRITY_GATE = get_integrity_gate_defaults(config=_DEFAULT_CONFIG)
DEFAULT_KEY_GROUPS = tuple(_DEFAULT_QUALITY_GATE["key_groups"])


@dataclass
class Counts:
    tp: int = 0
    fp: int = 0
    fn: int = 0
    total: int = 0
    uncertain: int = 0
    parse_fail: int = 0

    def precision(self) -> float:
        d = self.tp + self.fp
        return self.tp / d if d else 0.0

    def recall(self) -> float:
        d = self.tp + self.fn
        return self.tp / d if d else 0.0

    def f1(self) -> float:
        p = self.precision()
        r = self.recall()
        return (2 * p * r / (p + r)) if (p + r) else 0.0

    def uncertain_rate(self) -> float:
        return self.uncertain / self.total if self.total else 0.0

    def parse_fail_rate(self) -> float:
        return self.parse_fail / self.total if self.total else 0.0


@dataclass
class CoverageCounts:
    tp: int = 0
    fp: int = 0
    fn: int = 0

    def precision(self) -> float:
        d = self.tp + self.fp
        return self.tp / d if d else 0.0

    def recall(self) -> float:
        d = self.tp + self.fn
        return self.tp / d if d else 0.0

    def f1(self) -> float:
        p = self.precision()
        r = self.recall()
        return (2 * p * r / (p + r)) if (p + r) else 0.0


def add_counts(dst: Counts, src: Counts) -> None:
    dst.tp += src.tp
    dst.fp += src.fp
    dst.fn += src.fn
    dst.total += src.total
    dst.uncertain += src.uncertain
    dst.parse_fail += src.parse_fail


def add_coverage(dst: CoverageCounts, src: CoverageCounts) -> None:
    dst.tp += src.tp
    dst.fp += src.fp
    dst.fn += src.fn


def counts_to_dict(c: Counts) -> dict[str, Any]:
    return {
        "steps": c.total,
        "tp": c.tp,
        "fp": c.fp,
        "fn": c.fn,
        "uncertain": c.uncertain,
        "parse_fail": c.parse_fail,
        "precision": c.precision(),
        "recall": c.recall(),
        "f1": c.f1(),
        "uncertain_rate": c.uncertain_rate(),
        "parse_fail_rate": c.parse_fail_rate(),
    }


def coverage_to_dict(c: CoverageCounts) -> dict[str, Any]:
    return {
        "tp": c.tp,
        "fp": c.fp,
        "fn": c.fn,
        "precision": c.precision(),
        "recall": c.recall(),
        "f1": c.f1(),
    }


def infer_key_group(topic_path: str) -> str | None:
    topic = topic_path.strip().lower()
    if ".differentiation" in topic:
        return "differentiation"
    if ".integration" in topic:
        return "integration"
    if ".complex_numbers" in topic:
        return "complex_numbers"
    if ".vectors" in topic:
        return "vectors"
    return None


def parse_key_groups(value: str | None) -> tuple[str, ...]:
    raw = (value or "").strip()
    if not raw:
        return DEFAULT_KEY_GROUPS
    groups = [x.strip() for x in raw.split(",") if x.strip()]
    return tuple(groups) if groups else DEFAULT_KEY_GROUPS


def evaluate_case(
    case: dict[str, Any],
    min_confidence: float,
    uncertain_margin: float,
) -> tuple[Counts, CoverageCounts, dict[str, Any]]:
    payload = {
        "steps": case.get("steps") or [],
        "rubric_points": case.get("rubric_points") or [],
    }
    out = run_from_payload(payload, min_confidence=min_confidence, uncertain_margin=uncertain_margin)
    alignments = out.get("alignments") or []
    gold = case.get("gold") or {}
    if not isinstance(gold, dict):
        gold = {}

    metadata = case.get("metadata") if isinstance(case.get("metadata"), dict) else {}
    topic_path = str(metadata.get("topic_path") or "unknown")
    steps_raw = case.get("steps") if isinstance(case.get("steps"), list) else []
    step_text_map = {str(item.get("step_id")): str(item.get("text") or "") for item in steps_raw if isinstance(item, dict)}

    c = Counts()
    details: list[dict[str, Any]] = []
    predicted_rubrics: set[str] = set()
    gold_rubrics: set[str] = set()
    for raw_target in gold.values():
        gold_rubrics.update(parse_gold_targets(raw_target))

    for row in alignments:
        step_id = str(row.get("step_id"))
        status = str(row.get("status") or "")
        pred = row.get("rubric_id") if status == "aligned" else None
        if pred is not None:
            predicted_rubrics.add(str(pred))

        expected_ids = parse_gold_targets(gold.get(step_id))
        expected_single = next(iter(expected_ids)) if len(expected_ids) == 1 else None
        reason = str(row.get("reason") or "")
        step_text = step_text_map.get(step_id, "")
        parse_fail = (not step_text.strip()) or reason == "no_rubric_points"

        c.total += 1
        if status == "uncertain":
            c.uncertain += 1
        if parse_fail:
            c.parse_fail += 1

        if pred is not None and str(pred) in expected_ids:
            c.tp += 1
        else:
            if pred is not None:
                c.fp += 1
            if expected_ids:
                c.fn += 1

        details.append(
            {
                "step_id": step_id,
                "status": status,
                "predicted_rubric_id": pred,
                "expected_rubric_id": expected_single,
                "expected_rubric_ids": sorted(expected_ids),
                "confidence": row.get("confidence"),
                "reason": reason,
                "parse_fail": parse_fail,
            }
        )

    cov = CoverageCounts(
        tp=len(predicted_rubrics & gold_rubrics),
        fp=len(predicted_rubrics - gold_rubrics),
        fn=len(gold_rubrics - predicted_rubrics),
    )

    case_out = {
        "case_id": case.get("case_id"),
        "topic_path": topic_path,
        "steps_total": len(alignments),
        "tp": c.tp,
        "fp": c.fp,
        "fn": c.fn,
        "f1": round(c.f1(), 4),
        "uncertain_rate": round(c.uncertain_rate(), 4),
        "parse_fail_rate": round(c.parse_fail_rate(), 4),
        "parse_fail": c.parse_fail,
        "rubric_coverage_tp": cov.tp,
        "rubric_coverage_fp": cov.fp,
        "rubric_coverage_fn": cov.fn,
        "rubric_coverage_f1": round(cov.f1(), 4),
        "metadata": metadata,
        "details": details,
    }
    return c, cov, case_out


def evaluate_suite(
    cases: list[dict[str, Any]],
    min_confidence: float,
    uncertain_margin: float,
    step_f1_min: float,
    uncertain_rate_max: float,
    parse_fail_rate_max: float,
    key_group_f1_min: float,
    rubric_coverage_f1_min: float,
    key_groups: tuple[str, ...],
    integrity_result: dict[str, Any] | None = None,
    enforce_integrity_gate: bool = False,
) -> dict[str, Any]:
    totals = Counts()
    coverage_totals = CoverageCounts()
    case_results: list[dict[str, Any]] = []
    topic_totals: dict[str, Counts] = {}
    key_group_totals: dict[str, Counts] = {g: Counts() for g in key_groups}

    for case in cases:
        c, cov, out = evaluate_case(case, min_confidence=min_confidence, uncertain_margin=uncertain_margin)
        add_counts(totals, c)
        add_coverage(coverage_totals, cov)
        case_results.append(out)

        topic_path = str(out.get("topic_path") or "unknown")
        topic_counter = topic_totals.setdefault(topic_path, Counts())
        add_counts(topic_counter, c)

        group = infer_key_group(topic_path)
        if group and group in key_group_totals:
            add_counts(key_group_totals[group], c)

    metrics = counts_to_dict(totals)
    coverage_metrics = coverage_to_dict(coverage_totals)
    topic_metrics = {topic: counts_to_dict(c) for topic, c in sorted(topic_totals.items())}
    key_group_metrics = {group: counts_to_dict(c) for group, c in key_group_totals.items()}

    integrity_pass = True
    integrity_checks: dict[str, Any] = {}
    if enforce_integrity_gate:
        if integrity_result is None:
            integrity_pass = False
            integrity_checks = {"integrity_result_present": False}
        else:
            integrity_pass = bool(integrity_result.get("pass", False))
            checks_raw = integrity_result.get("checks")
            integrity_checks = checks_raw if isinstance(checks_raw, dict) else {}

    gate: dict[str, Any] = {
        "step_level_f1": metrics["f1"] >= step_f1_min,
        "rubric_coverage_f1": coverage_metrics["f1"] >= rubric_coverage_f1_min,
        "uncertain_rate": metrics["uncertain_rate"] <= uncertain_rate_max,
        "parse_fail_rate": metrics["parse_fail_rate"] <= parse_fail_rate_max,
        "key_groups": {},
        "integrity": integrity_pass,
        "integrity_checks": integrity_checks,
    }
    for group, gm in key_group_metrics.items():
        has_data = gm["steps"] > 0
        gate["key_groups"][group] = has_data and gm["f1"] >= key_group_f1_min

    gate["key_groups_all"] = all(bool(v) for v in gate["key_groups"].values())
    gate["pass"] = (
        gate["step_level_f1"]
        and gate["rubric_coverage_f1"]
        and gate["uncertain_rate"]
        and gate["parse_fail_rate"]
        and gate["key_groups_all"]
        and gate["integrity"]
    )

    return {
        "total_cases": len(cases),
        "totals": {
            "steps": totals.total,
            "tp": totals.tp,
            "fp": totals.fp,
            "fn": totals.fn,
            "uncertain": totals.uncertain,
            "parse_fail": totals.parse_fail,
        },
        "coverage_totals": {
            "tp": coverage_totals.tp,
            "fp": coverage_totals.fp,
            "fn": coverage_totals.fn,
        },
        "metrics": {
            "step_level_precision": metrics["precision"],
            "step_level_recall": metrics["recall"],
            "step_level_f1": metrics["f1"],
            "rubric_coverage_precision": coverage_metrics["precision"],
            "rubric_coverage_recall": coverage_metrics["recall"],
            "rubric_coverage_f1": coverage_metrics["f1"],
            "uncertain_rate": metrics["uncertain_rate"],
            "parse_fail_rate": metrics["parse_fail_rate"],
        },
        "thresholds": {
            "min_confidence": min_confidence,
            "uncertain_margin": uncertain_margin,
            "step_f1_min": step_f1_min,
            "rubric_coverage_f1_min": rubric_coverage_f1_min,
            "uncertain_rate_max": uncertain_rate_max,
            "parse_fail_rate_max": parse_fail_rate_max,
            "key_group_f1_min": key_group_f1_min,
            "key_groups": list(key_groups),
        },
        "gate": gate,
        "pass": gate["pass"],
        "topic_metrics": topic_metrics,
        "key_group_metrics": key_group_metrics,
        "integrity": integrity_result,
        "cases": case_results,
    }


def render_report(summary: dict[str, Any]) -> str:
    ts = summary["generated_at_utc"]
    metrics = summary["metrics"]
    gate = summary["gate"]
    thresholds = summary["thresholds"]

    lines = [
        "# B2 Smart Mark Engine Quality Gate Report",
        "",
        f"- generated_at_utc: {ts}",
        f"- suite_path: `{summary['suite_path']}`",
        f"- suite_tier: `{summary.get('suite_tier', 'unspecified')}`",
        f"- total_cases: {summary['total_cases']}",
        f"- total_steps: {summary['totals']['steps']}",
        "",
        "## Core Metrics",
        "",
        f"- step_level_precision: {metrics['step_level_precision']:.4f}",
        f"- step_level_recall: {metrics['step_level_recall']:.4f}",
        f"- step_level_f1: {metrics['step_level_f1']:.4f}",
        f"- rubric_coverage_precision: {metrics['rubric_coverage_precision']:.4f}",
        f"- rubric_coverage_recall: {metrics['rubric_coverage_recall']:.4f}",
        f"- rubric_coverage_f1: {metrics['rubric_coverage_f1']:.4f}",
        f"- uncertain_rate: {metrics['uncertain_rate']:.4f}",
        f"- parse_fail_rate: {metrics['parse_fail_rate']:.4f}",
        "",
        "## Gate Checks",
        "",
        f"- step_level_f1 >= {thresholds['step_f1_min']:.2f}: {str(gate['step_level_f1']).lower()}",
        f"- rubric_coverage_f1 >= {thresholds['rubric_coverage_f1_min']:.2f}: {str(gate['rubric_coverage_f1']).lower()}",
        f"- uncertain_rate <= {thresholds['uncertain_rate_max']:.2f}: {str(gate['uncertain_rate']).lower()}",
        f"- parse_fail_rate <= {thresholds['parse_fail_rate_max']:.2f}: {str(gate['parse_fail_rate']).lower()}",
        f"- key_group_f1 >= {thresholds['key_group_f1_min']:.2f}: {str(gate['key_groups_all']).lower()}",
        f"- integrity_checks: {str(gate['integrity']).lower()}",
        f"- pass: {str(gate['pass']).lower()}",
        "",
        "## Key Group Metrics",
        "",
        "| group | steps | f1 | uncertain_rate | parse_fail_rate | pass |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for group, gm in summary["key_group_metrics"].items():
        lines.append(
            f"| {group} | {gm['steps']} | {gm['f1']:.4f} | {gm['uncertain_rate']:.4f} | "
            f"{gm['parse_fail_rate']:.4f} | {str(gate['key_groups'].get(group, False)).lower()} |"
        )

    integrity = summary.get("integrity")
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
            ]
        )
        if integrity.get("storage_key_check_error"):
            lines.append(f"- storage_key_check_error: `{integrity['storage_key_check_error']}`")
        if summary.get("integrity_note"):
            lines.append(f"- integrity_note: {summary['integrity_note']}")

    lines.extend(
        [
            "",
            "## Parameters",
            "",
            f"- min_confidence: {thresholds['min_confidence']:.2f}",
            f"- uncertain_margin: {thresholds['uncertain_margin']:.2f}",
            "",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Smart Mark Engine v0")
    parser.add_argument("--suite", type=Path, required=True, help="Path to evaluation suite JSON")
    parser.add_argument("--min-confidence", type=float, default=_DEFAULT_ALIGNMENT[0])
    parser.add_argument("--uncertain-margin", type=float, default=_DEFAULT_ALIGNMENT[1])
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
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--require-db", action="store_true")
    parser.add_argument("--json-out", type=Path, default=Path("docs/reports/b2_mark_engine_eval_v1.json"))
    parser.add_argument("--report-out", type=Path, default=Path("docs/reports/b2_mark_engine_report.md"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(args.suite.read_text(encoding="utf-8"))
    suite_tier = get_suite_tier(payload)
    cases = payload.get("cases") or []
    key_groups = parse_key_groups(args.key_groups)

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

    suite_summary = evaluate_suite(
        cases=cases,
        min_confidence=args.min_confidence,
        uncertain_margin=args.uncertain_margin,
        step_f1_min=args.step_f1_min,
        uncertain_rate_max=args.uncertain_rate_max,
        parse_fail_rate_max=args.parse_fail_rate_max,
        key_group_f1_min=args.key_group_f1_min,
        rubric_coverage_f1_min=args.rubric_coverage_f1_min,
        key_groups=key_groups,
        integrity_result=integrity_result,
        enforce_integrity_gate=not args.skip_integrity_check,
    )

    summary = {
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "suite_path": str(args.suite),
        "suite_tier": suite_tier,
        **suite_summary,
    }

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(summary, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    args.report_out.write_text(render_report(summary), encoding="utf-8")

    print(f"suite={args.suite}")
    print(f"suite_tier={suite_tier}")
    print(f"total_cases={summary['total_cases']}")
    print(f"total_steps={summary['totals']['steps']}")
    print(f"step_level_f1={summary['metrics']['step_level_f1']:.4f}")
    print(f"rubric_coverage_f1={summary['metrics']['rubric_coverage_f1']:.4f}")
    print(f"uncertain_rate={summary['metrics']['uncertain_rate']:.4f}")
    print(f"parse_fail_rate={summary['metrics']['parse_fail_rate']:.4f}")
    if isinstance(integrity_result, dict):
        im = integrity_result.get("metrics") or {}
        print(f"storage_key_hit_rate={float(im.get('storage_key_hit_rate', 0.0)):.4f}")
        print(f"step_dup_rate={float(im.get('step_dup_rate', 0.0)):.4f}")
        print(f"fixed_order_gold_rate={float(im.get('fixed_order_gold_rate', 0.0)):.4f}")
    print(f"threshold_step_f1_min={args.step_f1_min:.4f}")
    print(f"threshold_rubric_coverage_f1_min={args.rubric_coverage_f1_min:.4f}")
    print(f"threshold_uncertain_rate_max={args.uncertain_rate_max:.4f}")
    print(f"threshold_parse_fail_rate_max={args.parse_fail_rate_max:.4f}")
    print(f"pass={str(summary['gate']['pass']).lower()}")
    print(f"json_out={args.json_out}")
    print(f"report_out={args.report_out}")

    return 0 if summary["gate"]["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
