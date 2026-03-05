#!/usr/bin/env python3
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RAW_RESULTS = ROOT / "runs" / "backend" / "rag_strategy_raw_results.json"
SUMMARY_RESULTS = ROOT / "runs" / "backend" / "rag_decision_benchmark.json"
REPORT_PATH = ROOT / "docs" / "reports" / "rag_decision_benchmark.md"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_step(args: list[str]) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def markdown_table(summary: dict) -> str:
    lines = [
        "| Strategy | Correctness | Traceability | Leakage | P95 Latency(ms) | Avg Cost($) | Pass | Score |",
        "|---|---:|---:|---:|---:|---:|:---:|---:|",
    ]
    for item in summary.get("strategies", []):
        metrics = item.get("metrics", {})
        lines.append(
            "| {strategy} | {correctness:.2%} | {traceability:.2%} | {leakage:.2%} | {latency:.0f} | {cost:.5f} | {passed} | {score:.4f} |".format(
                strategy=item.get("strategy"),
                correctness=metrics.get("correctness_rate", 0.0),
                traceability=metrics.get("evidence_traceability_rate", 0.0),
                leakage=metrics.get("topic_leakage_rate", 0.0),
                latency=metrics.get("p95_latency_ms", 0.0),
                cost=metrics.get("avg_cost_usd", 0.0),
                passed="Y" if item.get("pass") else "N",
                score=item.get("score", 0.0),
            )
        )
    return "\n".join(lines)


def generate_report() -> None:
    summary = json.loads(SUMMARY_RESULTS.read_text(encoding="utf-8"))
    recommendation = summary.get("recommendation", {})
    thresholds = summary.get("thresholds", {})

    content = f"""# RAG Decision Benchmark (Phase2)

## Scope

- Dataset: `data/eval/rag_decision_set_v1.json`
- Strategies: A Hybrid RAG / B Simplified Retrieval / C No Retrieval / D LLM + Syllabus Prompt
- Generated at: `{summary.get("generated_at")}`

## Thresholds

- Correctness >= {thresholds.get("correctness_rate", 0)}
- Evidence traceability >= {thresholds.get("evidence_traceability_rate", 0)}
- Topic leakage <= {thresholds.get("topic_leakage_rate_max", 0)}
- P95 latency <= {thresholds.get("p95_latency_ms_max", 0)} ms
- Average cost <= {thresholds.get("avg_cost_usd_max", 0)} USD/request

## Result Table

{markdown_table(summary)}

## Recommendation

- Decision: `{recommendation.get("decision")}`
- Selected strategy: `{recommendation.get("selected_strategy")}`
- Reason: {recommendation.get("reason")}

## Reproducibility

```bash
python scripts/phase2/run_rag_decision_benchmark.py
cat runs/backend/rag_decision_benchmark.json
```
"""
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(content, encoding="utf-8")


def main() -> None:
    run_step([sys.executable, "scripts/phase2/rag_strategy_runner.py", "--output", str(RAW_RESULTS)])
    run_step([sys.executable, "scripts/phase2/rag_metrics.py", "--input", str(RAW_RESULTS), "--output", str(SUMMARY_RESULTS)])
    generate_report()
    print(str(SUMMARY_RESULTS))
    print(str(REPORT_PATH))


if __name__ == "__main__":
    main()
