#!/usr/bin/env python3
"""Unified A1 quality gate script.

Single entry point for A1 topic-link quality gate execution.
Orchestrates evaluation, generates markdown report + JSON summary,
and applies threshold blocking (non-zero exit on failure).

Usage:
    python scripts/evaluation/run_a1_quality_gate.py \
        --input <audit_csv> \
        [--source a1_keyword_mapper_v1] \
        [--allow-remote]
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.common.local_guard import enforce_local
from scripts.evaluation.eval_a1_topic_link_manual_audit import (
    AuditRow,
    PredictionRow,
    load_env,
    ensure_db_url,
    normalize,
    parse_audit_csv,
    fetch_predictions,
    pct,
    to_pct_text,
    sha256_of_file,
    md_table,
    write_report,
)
from scripts.vlm.db_utils import connect

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = "a1_keyword_mapper_v1"

REPORT_PATH = PROJECT_ROOT / "docs" / "reports" / "a1_topic_link_quality_gate_latest.md"
SUMMARY_PATH = PROJECT_ROOT / "runs" / "a1" / "a1_gate_summary.json"

THRESHOLDS = {
    "topic_primary_precision": 0.85,
    "non_fallback_precision": 0.90,
    "unreadable_ratio": 0.05,
}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_gate_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Unified A1 topic-link quality gate",
    )
    parser.add_argument("--input", type=Path, required=True, help="Audit CSV path")
    parser.add_argument(
        "--source", default=DEFAULT_SOURCE, help="question_concept_links.source"
    )
    parser.add_argument("--allow-remote", action="store_true")
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------
# Core metric computation (pure, no DB)
# ---------------------------------------------------------------------------

def compute_metrics(
    rows: list[AuditRow],
    predictions: dict[str, PredictionRow],
) -> dict[str, Any]:
    """Compute all gate metrics from audit rows + predictions.

    Returns a dict with all metric values and intermediate data needed
    for report generation and JSON summary.
    """
    verdict_counter: Counter[str] = Counter(r.verdict for r in rows)
    by_paper_strategy: dict[tuple[int, str], int] = defaultdict(int)
    by_strategy_verdict: dict[tuple[str, str], int] = defaultdict(int)

    prediction_missing_count = 0
    strategy_conflict_count = 0
    paper_conflict_count = 0
    multi_primary_count = 0
    verdict_inconsistency_count = 0
    conflict_samples: list[dict[str, str]] = []

    non_fallback_total = 0
    non_fallback_correct = 0

    for row in rows:
        pred = predictions.get(row.storage_key)
        if pred is None or pred.primary_row_count == 0:
            prediction_missing_count += 1
            pred_strategy = row.predicted_strategy_csv
            pred_node_path = ""
        else:
            pred_strategy = pred.predicted_strategy_db
            pred_node_path = pred.predicted_primary_node_path
            if pred.primary_row_count > 1:
                multi_primary_count += 1

        if pred is not None and pred.paper is not None and pred.paper != row.paper:
            paper_conflict_count += 1

        if (
            pred_strategy
            and row.predicted_strategy_csv
            and pred_strategy != row.predicted_strategy_csv
        ):
            strategy_conflict_count += 1

        effective_strategy = pred_strategy or row.predicted_strategy_csv
        by_paper_strategy[(row.paper, effective_strategy or "unknown")] += 1
        by_strategy_verdict[(effective_strategy or "unknown", row.verdict)] += 1

        if row.verdict != "unreadable" and effective_strategy != "paper_fallback":
            non_fallback_total += 1
            if row.verdict == "correct":
                non_fallback_correct += 1

        # conflict sample collection (same logic as existing eval)
        if row.verdict == "correct":
            if not pred_node_path or pred_node_path != row.gold_primary_node_path:
                verdict_inconsistency_count += 1
                conflict_samples.append(_conflict_sample(row, pred_strategy, pred_node_path))
        elif row.verdict == "partial":
            if (
                not pred_node_path
                or not row.gold_secondary_node_path
                or pred_node_path != row.gold_secondary_node_path
            ):
                verdict_inconsistency_count += 1
            conflict_samples.append(_conflict_sample(row, pred_strategy, pred_node_path))
        elif row.verdict == "wrong":
            if pred_node_path and pred_node_path == row.gold_primary_node_path:
                verdict_inconsistency_count += 1
            conflict_samples.append(_conflict_sample(row, pred_strategy, pred_node_path))
        elif row.verdict == "fallback_acceptable":
            if effective_strategy != "paper_fallback":
                verdict_inconsistency_count += 1

    audited_total = len(rows)
    unreadable_count = verdict_counter.get("unreadable", 0)
    scored_total = audited_total - unreadable_count
    correct_count = verdict_counter.get("correct", 0)
    fallback_acceptable_count = verdict_counter.get("fallback_acceptable", 0)

    topic_primary_precision = pct(correct_count + fallback_acceptable_count, scored_total)
    non_fallback_precision = pct(non_fallback_correct, non_fallback_total)
    unreadable_ratio = pct(unreadable_count, audited_total)

    topic_conflict_count = verdict_counter.get("partial", 0) + verdict_counter.get("wrong", 0)
    conflict_count = (
        topic_conflict_count
        + prediction_missing_count
        + strategy_conflict_count
        + paper_conflict_count
        + multi_primary_count
        + verdict_inconsistency_count
    )

    # strategy distribution for JSON summary
    strategy_dist: dict[str, int] = defaultdict(int)
    for (_paper, strategy), count in by_paper_strategy.items():
        strategy_dist[strategy] += count

    return {
        "audited_total": audited_total,
        "scored_total": scored_total,
        "correct_count": correct_count,
        "fallback_acceptable_count": fallback_acceptable_count,
        "unreadable_count": unreadable_count,
        "topic_primary_precision": topic_primary_precision,
        "non_fallback_precision": non_fallback_precision,
        "unreadable_ratio": unreadable_ratio,
        "non_fallback_total": non_fallback_total,
        "non_fallback_correct": non_fallback_correct,
        "conflict_count": conflict_count,
        "topic_conflict_count": topic_conflict_count,
        "prediction_missing_count": prediction_missing_count,
        "strategy_conflict_count": strategy_conflict_count,
        "paper_conflict_count": paper_conflict_count,
        "multi_primary_count": multi_primary_count,
        "verdict_inconsistency_count": verdict_inconsistency_count,
        "verdict_counter": dict(verdict_counter),
        "by_paper_strategy": {
            f"{p}:{s}": c for (p, s), c in sorted(by_paper_strategy.items())
        },
        "strategy_distribution": dict(strategy_dist),
        "conflict_samples": conflict_samples,
    }


def _conflict_sample(
    row: AuditRow, pred_strategy: str, pred_node_path: str
) -> dict[str, str]:
    return {
        "storage_key": row.storage_key,
        "verdict": row.verdict,
        "csv_strategy": row.predicted_strategy_csv,
        "db_strategy": pred_strategy or "(missing)",
        "predicted_path": pred_node_path or "(missing)",
        "gold_primary": row.gold_primary_node_path or "(empty)",
        "gold_secondary": row.gold_secondary_node_path or "",
    }


# ---------------------------------------------------------------------------
# Threshold gate logic
# ---------------------------------------------------------------------------

def evaluate_thresholds(metrics: dict[str, Any]) -> dict[str, Any]:
    """Apply threshold checks. Returns threshold detail dict + gate_pass bool."""
    checks: dict[str, dict[str, Any]] = {}
    all_pass = True

    for name, required in THRESHOLDS.items():
        actual = metrics[name]
        if name == "unreadable_ratio":
            passed = actual <= required
        else:
            passed = actual >= required
        checks[name] = {"required": required, "actual": round(actual, 4), "pass": passed}
        if not passed:
            all_pass = False

    return {"thresholds": checks, "gate_pass": all_pass, "release_blocked": not all_pass}


# ---------------------------------------------------------------------------
# Output generation
# ---------------------------------------------------------------------------

def build_json_summary(
    metrics: dict[str, Any],
    gate_result: dict[str, Any],
    input_csv: Path,
    csv_sha256: str,
    source: str,
    generated_at: str,
) -> dict[str, Any]:
    """Build the machine-readable JSON summary."""
    return {
        "generated_at_utc": generated_at,
        "input_csv": input_csv.as_posix(),
        "input_csv_sha256": csv_sha256,
        "source": source,
        "audited_total": metrics["audited_total"],
        "topic_primary_precision": round(metrics["topic_primary_precision"], 4),
        "non_fallback_precision": round(metrics["non_fallback_precision"], 4),
        "unreadable_ratio": round(metrics["unreadable_ratio"], 4),
        "strategy_distribution": metrics["strategy_distribution"],
        "gate_pass": gate_result["gate_pass"],
        "release_blocked": gate_result["release_blocked"],
        "thresholds": gate_result["thresholds"],
    }


def build_report_lines(
    metrics: dict[str, Any],
    gate_result: dict[str, Any],
    input_csv: Path,
    csv_sha256: str,
    source: str,
    generated_at: str,
) -> list[str]:
    """Build the markdown report lines (same format as existing eval)."""
    gate_pass = gate_result["gate_pass"]
    tpp = metrics["topic_primary_precision"]
    nfp = metrics["non_fallback_precision"]
    ur = metrics["unreadable_ratio"]
    audited_total = metrics["audited_total"]

    lines: list[str] = [
        "# A1 Topic Link Quality Gate Report (Unified)",
        "",
        f"- generated_at_utc: {generated_at}",
        f"- input_csv: `{input_csv.as_posix()}`",
        f"- input_csv_sha256: `{csv_sha256}`",
        f"- source: `{source}`",
        f"- audited_total: {audited_total}",
        "",
        "## Gate Thresholds",
        "",
        "- topic_primary_precision >= 0.85",
        "- non_fallback_precision >= 0.90",
        "- unreadable_count / audited_total <= 0.05",
        "",
        "## Metrics",
        "",
    ]

    metric_rows = [
        ["audited_total", str(audited_total), "-", "-"],
        [
            "topic_primary_precision",
            f"{tpp:.4f}",
            ">= 0.85",
            "pass" if tpp >= 0.85 else "fail",
        ],
        [
            "non_fallback_precision",
            f"{nfp:.4f}",
            ">= 0.90",
            "pass" if nfp >= 0.90 else "fail",
        ],
        [
            "conflict_count",
            str(metrics["conflict_count"]),
            "-",
            "-",
        ],
        [
            "unreadable_count",
            str(metrics["unreadable_count"]),
            "<= 5%",
            "pass" if ur <= 0.05 else "fail",
        ],
        [
            "gate_pass",
            "true" if gate_pass else "false",
            "-",
            "-",
        ],
    ]
    lines.extend(md_table(["metric", "value", "threshold", "status"], metric_rows))

    # verdict distribution
    lines.extend(["", "## Audit Verdict Distribution", ""])
    vc = metrics["verdict_counter"]
    verdict_rows = [
        [k, str(v), to_pct_text(pct(v, audited_total))]
        for k, v in sorted(vc.items())
    ]
    lines.extend(md_table(["verdict", "count", "ratio"], verdict_rows))

    # conflict breakdown
    lines.extend([
        "",
        "## Conflict Breakdown",
        "",
        f"- topic_conflict_count (verdict in wrong/partial): {metrics['topic_conflict_count']}",
        f"- prediction_missing_count: {metrics['prediction_missing_count']}",
        f"- strategy_conflict_count (CSV vs DB): {metrics['strategy_conflict_count']}",
        f"- paper_conflict_count (CSV vs DB): {metrics['paper_conflict_count']}",
        f"- multi_primary_count: {metrics['multi_primary_count']}",
        f"- verdict_inconsistency_count: {metrics['verdict_inconsistency_count']}",
        "",
    ])

    # conflict samples
    samples = metrics.get("conflict_samples", [])
    if samples:
        lines.append("## Conflict Samples")
        lines.append("")
        sample_rows = []
        for item in samples[:40]:
            sample_rows.append([
                item["storage_key"],
                item["verdict"],
                item["csv_strategy"],
                item["db_strategy"],
                item["predicted_path"],
                item["gold_primary"],
                item["gold_secondary"] or "-",
            ])
        lines.extend(md_table(
            ["storage_key", "verdict", "csv_strategy", "db_strategy",
             "predicted_primary", "gold_primary", "gold_secondary"],
            sample_rows,
        ))
        if len(samples) > 40:
            lines.append("")
            lines.append(f"- (truncated) total conflict samples: {len(samples)}")

    return lines


def write_json_summary(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_gate(argv: list[str] | None = None) -> int:
    """Execute the unified A1 quality gate. Returns 0 on pass, 1 on fail."""
    args = parse_gate_args(argv)

    # 1. Parse audit CSV
    rows = parse_audit_csv(args.input)

    # 2. Input snapshot
    csv_sha256 = sha256_of_file(args.input)
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    # 3. DB setup + fetch predictions
    load_env()
    ensure_db_url()
    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    storage_keys = [r.storage_key for r in rows]
    with connect() as conn:
        with conn.cursor() as cur:
            predictions = fetch_predictions(cur, storage_keys, args.source)

    # 4. Compute metrics
    metrics = compute_metrics(rows, predictions)

    # 5. Evaluate thresholds
    gate_result = evaluate_thresholds(metrics)

    # 6. Build outputs
    summary = build_json_summary(
        metrics, gate_result, args.input, csv_sha256, args.source, generated_at,
    )
    report_lines = build_report_lines(
        metrics, gate_result, args.input, csv_sha256, args.source, generated_at,
    )

    # 7. Write outputs
    write_report(REPORT_PATH, report_lines)
    write_json_summary(SUMMARY_PATH, summary)

    # 8. Console output
    print(f"audited_total={metrics['audited_total']}")
    print(f"topic_primary_precision={metrics['topic_primary_precision']:.4f}")
    print(f"non_fallback_precision={metrics['non_fallback_precision']:.4f}")
    print(f"unreadable_ratio={metrics['unreadable_ratio']:.4f}")
    print(f"gate_pass={'true' if gate_result['gate_pass'] else 'false'}")
    print(f"release_blocked={'true' if gate_result['release_blocked'] else 'false'}")
    print(f"report={REPORT_PATH}")
    print(f"summary={SUMMARY_PATH}")

    if not gate_result["gate_pass"]:
        failed = [
            name
            for name, detail in gate_result["thresholds"].items()
            if not detail["pass"]
        ]
        print(f"GATE FAILED: {', '.join(failed)}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(run_gate())
