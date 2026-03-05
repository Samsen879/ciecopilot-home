#!/usr/bin/env python3
import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = ROOT / "runs" / "backend" / "rag_strategy_raw_results.json"
DEFAULT_OUTPUT = ROOT / "runs" / "backend" / "rag_decision_benchmark.json"

THRESHOLDS = {
    "correctness_rate": 0.72,
    "evidence_traceability_rate": 0.70,
    "topic_leakage_rate_max": 0.08,
    "p95_latency_ms_max": 1500,
    "avg_cost_usd_max": 0.020,
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def p95(values: list[float]) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    idx = max(math.ceil(len(sorted_values) * 0.95) - 1, 0)
    return float(sorted_values[idx])


def safe_ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def strategy_score(metrics: dict[str, float]) -> float:
    correctness = metrics["correctness_rate"]
    traceability = metrics["evidence_traceability_rate"]
    leakage = metrics["topic_leakage_rate"]
    latency = metrics["p95_latency_ms"]
    cost = metrics["avg_cost_usd"]

    latency_score = max(0.0, 1.0 - (latency / 2500.0))
    cost_score = max(0.0, 1.0 - (cost / 0.03))
    leakage_score = max(0.0, 1.0 - leakage)

    return round(
        0.40 * correctness
        + 0.25 * traceability
        + 0.15 * leakage_score
        + 0.10 * latency_score
        + 0.10 * cost_score,
        4,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compute RAG strategy metrics and decision summary.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Path to raw strategy result JSON.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Path to benchmark summary JSON.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    raw = json.loads(input_path.read_text(encoding="utf-8"))
    rows = raw.get("rows", [])
    strategies = raw.get("strategies", [])

    summary: list[dict[str, Any]] = []
    for strategy in strategies:
        scoped = [row for row in rows if row.get("strategy") == strategy]
        total = len(scoped)
        correct = sum(1 for row in scoped if row.get("correct"))
        traceable = sum(1 for row in scoped if row.get("traceable"))
        leakage = sum(1 for row in scoped if row.get("topic_leakage"))
        latencies = [float(row.get("latency_ms", 0)) for row in scoped]
        costs = [float(row.get("cost_usd", 0)) for row in scoped]

        metrics = {
            "correctness_rate": round(safe_ratio(correct, total), 4),
            "evidence_traceability_rate": round(safe_ratio(traceable, total), 4),
            "topic_leakage_rate": round(safe_ratio(leakage, total), 4),
            "p95_latency_ms": round(p95(latencies), 2),
            "avg_cost_usd": round(sum(costs) / total, 5) if total else 0.0,
            "total_cost_usd": round(sum(costs), 5),
        }

        checks = {
            "correctness": metrics["correctness_rate"] >= THRESHOLDS["correctness_rate"],
            "traceability": metrics["evidence_traceability_rate"] >= THRESHOLDS["evidence_traceability_rate"],
            "leakage": metrics["topic_leakage_rate"] <= THRESHOLDS["topic_leakage_rate_max"],
            "latency": metrics["p95_latency_ms"] <= THRESHOLDS["p95_latency_ms_max"],
            "cost": metrics["avg_cost_usd"] <= THRESHOLDS["avg_cost_usd_max"],
        }

        score = strategy_score(metrics)
        summary.append(
            {
                "strategy": strategy,
                "total_cases": total,
                "metrics": metrics,
                "threshold_checks": checks,
                "pass": all(checks.values()),
                "score": score,
            }
        )

    ranked = sorted(summary, key=lambda item: item["score"], reverse=True)
    passing = [item for item in ranked if item["pass"]]

    if passing:
        recommendation = {
            "decision": "continue_or_shrink_based_on_top_passing_strategy",
            "selected_strategy": passing[0]["strategy"],
            "reason": "At least one strategy passes all thresholds.",
        }
        status = "pass"
    else:
        recommendation = {
            "decision": "pause_new_rag_features",
            "selected_strategy": ranked[0]["strategy"] if ranked else None,
            "reason": "No strategy passes all thresholds.",
        }
        status = "fail"

    payload = {
        "generated_at": utc_now(),
        "status": status,
        "input": str(input_path.relative_to(ROOT)).replace("\\", "/"),
        "thresholds": THRESHOLDS,
        "strategies": summary,
        "ranking": [item["strategy"] for item in ranked],
        "recommendation": recommendation,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(output_path))


if __name__ == "__main__":
    main()
