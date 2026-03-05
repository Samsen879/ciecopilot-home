#!/usr/bin/env python3
"""Evaluate manual audit labels for A1 topic-link quality gate."""
from __future__ import annotations

import argparse
import csv
import hashlib
import os
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local
from scripts.vlm.db_utils import connect


DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DEFAULT_SOURCE = "a1_keyword_mapper_v1"
VALID_VERDICTS = {"correct", "partial", "wrong", "fallback_acceptable", "unreadable"}


@dataclass
class AuditRow:
    storage_key: str
    paper: int
    predicted_strategy_csv: str
    gold_primary_node_path: str
    gold_secondary_node_path: str
    verdict: str


@dataclass
class PredictionRow:
    storage_key: str
    paper: int | None
    predicted_strategy_db: str
    predicted_primary_node_path: str
    primary_row_count: int


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> None:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        if os.environ.get(key):
            return
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL
    print(f"DATABASE_URL not set; fallback to local default: {DEFAULT_LOCAL_DB_URL}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate A1 manual topic-link audit CSV")
    parser.add_argument("--input", type=Path, required=True, help="Audit CSV path")
    parser.add_argument("--out", type=Path, required=True, help="Output markdown report path")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="question_concept_links.source to evaluate")
    parser.add_argument("--allow-remote", action="store_true")
    return parser.parse_args()


def normalize(v: str | None) -> str:
    return (v or "").strip()


def parse_audit_csv(path: Path) -> list[AuditRow]:
    if not path.exists():
        raise FileNotFoundError(f"input CSV not found: {path}")

    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise RuntimeError("input CSV missing header")

        required = {
            "storage_key",
            "paper",
            "predicted_strategy",
            "gold_primary_node_path",
            "gold_secondary_node_path",
            "verdict",
        }
        missing = sorted(required - set(reader.fieldnames))
        if missing:
            raise RuntimeError(f"input CSV missing required columns: {', '.join(missing)}")

        rows: list[AuditRow] = []
        seen_keys: set[str] = set()
        for i, rec in enumerate(reader, start=2):
            storage_key = normalize(rec.get("storage_key"))
            if not storage_key:
                raise RuntimeError(f"row {i}: storage_key is empty")
            if storage_key in seen_keys:
                raise RuntimeError(f"row {i}: duplicate storage_key {storage_key}")
            seen_keys.add(storage_key)

            paper_raw = normalize(rec.get("paper"))
            if not paper_raw.isdigit():
                raise RuntimeError(f"row {i}: invalid paper value {paper_raw!r}")
            paper = int(paper_raw)

            verdict = normalize(rec.get("verdict"))
            if verdict not in VALID_VERDICTS:
                raise RuntimeError(f"row {i}: invalid verdict {verdict!r}")

            rows.append(
                AuditRow(
                    storage_key=storage_key,
                    paper=paper,
                    predicted_strategy_csv=normalize(rec.get("predicted_strategy")),
                    gold_primary_node_path=normalize(rec.get("gold_primary_node_path")),
                    gold_secondary_node_path=normalize(rec.get("gold_secondary_node_path")),
                    verdict=verdict,
                )
            )

    if not rows:
        raise RuntimeError("input CSV has no data rows")
    return rows


def fetch_predictions(cur: Any, storage_keys: list[str], source: str) -> dict[str, PredictionRow]:
    cur.execute(
        """
        WITH paper_lookup AS (
            SELECT storage_key, paper::int AS paper
            FROM public.question_descriptions_prod_v1
            WHERE storage_key = ANY(%s)
        ),
        primary_links AS (
            SELECT
                storage_key,
                COUNT(*)::int AS primary_row_count,
                MIN(COALESCE(evidence->>'strategy', '')) AS predicted_strategy_db,
                MIN(COALESCE(evidence->>'node_path', '')) AS predicted_primary_node_path
            FROM public.question_concept_links
            WHERE source = %s
              AND link_type = 'primary'
              AND storage_key = ANY(%s)
            GROUP BY storage_key
        )
        SELECT
            k.storage_key,
            p.paper,
            COALESCE(pl.predicted_strategy_db, '') AS predicted_strategy_db,
            COALESCE(pl.predicted_primary_node_path, '') AS predicted_primary_node_path,
            COALESCE(pl.primary_row_count, 0) AS primary_row_count
        FROM UNNEST(%s::text[]) AS k(storage_key)
        LEFT JOIN paper_lookup p ON p.storage_key = k.storage_key
        LEFT JOIN primary_links pl ON pl.storage_key = k.storage_key
        """,
        (storage_keys, source, storage_keys, storage_keys),
    )

    out: dict[str, PredictionRow] = {}
    for storage_key, paper, strategy, node_path, primary_row_count in cur.fetchall():
        out[storage_key] = PredictionRow(
            storage_key=storage_key,
            paper=paper,
            predicted_strategy_db=normalize(strategy),
            predicted_primary_node_path=normalize(node_path),
            primary_row_count=int(primary_row_count or 0),
        )
    return out


def pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def to_pct_text(value: float) -> str:
    return f"{value * 100:.2f}%"


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def md_table(headers: list[str], rows: list[list[str]]) -> list[str]:
    line1 = "| " + " | ".join(headers) + " |"
    line2 = "| " + " | ".join("---" for _ in headers) + " |"
    body = ["| " + " | ".join(r) + " |" for r in rows]
    return [line1, line2, *body]


def write_report(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    rows = parse_audit_csv(args.input)

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

    verdict_counter = Counter(r.verdict for r in rows)
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

        if pred_strategy and row.predicted_strategy_csv and pred_strategy != row.predicted_strategy_csv:
            strategy_conflict_count += 1

        effective_strategy = pred_strategy or row.predicted_strategy_csv
        by_paper_strategy[(row.paper, effective_strategy or "unknown")] += 1
        by_strategy_verdict[(effective_strategy or "unknown", row.verdict)] += 1

        if row.verdict != "unreadable" and effective_strategy != "paper_fallback":
            non_fallback_total += 1
            if row.verdict == "correct":
                non_fallback_correct += 1

        if row.verdict == "correct":
            if not pred_node_path or pred_node_path != row.gold_primary_node_path:
                verdict_inconsistency_count += 1
                conflict_samples.append(
                    {
                        "storage_key": row.storage_key,
                        "verdict": row.verdict,
                        "csv_strategy": row.predicted_strategy_csv,
                        "db_strategy": pred_strategy,
                        "predicted_path": pred_node_path or "(missing)",
                        "gold_primary": row.gold_primary_node_path or "(empty)",
                        "gold_secondary": row.gold_secondary_node_path or "",
                    }
                )
        elif row.verdict == "partial":
            if (
                not pred_node_path
                or not row.gold_secondary_node_path
                or pred_node_path != row.gold_secondary_node_path
            ):
                verdict_inconsistency_count += 1
            conflict_samples.append(
                {
                    "storage_key": row.storage_key,
                    "verdict": row.verdict,
                    "csv_strategy": row.predicted_strategy_csv,
                    "db_strategy": pred_strategy,
                    "predicted_path": pred_node_path or "(missing)",
                    "gold_primary": row.gold_primary_node_path or "(empty)",
                    "gold_secondary": row.gold_secondary_node_path or "",
                }
            )
        elif row.verdict == "wrong":
            if pred_node_path and pred_node_path == row.gold_primary_node_path:
                verdict_inconsistency_count += 1
            conflict_samples.append(
                {
                    "storage_key": row.storage_key,
                    "verdict": row.verdict,
                    "csv_strategy": row.predicted_strategy_csv,
                    "db_strategy": pred_strategy,
                    "predicted_path": pred_node_path or "(missing)",
                    "gold_primary": row.gold_primary_node_path or "(empty)",
                    "gold_secondary": row.gold_secondary_node_path or "",
                }
            )
        elif row.verdict == "fallback_acceptable":
            if effective_strategy != "paper_fallback":
                verdict_inconsistency_count += 1

    audited_total = len(rows)
    unreadable_count = verdict_counter.get("unreadable", 0)
    scored_total = audited_total - unreadable_count
    correct_count = verdict_counter.get("correct", 0)
    fallback_acceptable_count = verdict_counter.get("fallback_acceptable", 0)

    topic_primary_accuracy = pct(correct_count, scored_total)
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

    gate_pass = (
        topic_primary_precision >= 0.85
        and non_fallback_precision >= 0.90
        and unreadable_ratio <= 0.05
    )

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    report_lines: list[str] = [
        "# A1 Topic Link Quality Gate Report (9709 P1/P3 v1)",
        "",
        f"- generated_at_utc: {now}",
        f"- input_csv: `{args.input.as_posix()}`",
        f"- input_csv_sha256: `{sha256_of_file(args.input)}`",
        f"- source: `{args.source}`",
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
        ["topic_primary_accuracy", f"{topic_primary_accuracy:.4f}", "-", "-"],
        [
            "topic_primary_precision",
            f"{topic_primary_precision:.4f}",
            ">= 0.85",
            "pass" if topic_primary_precision >= 0.85 else "fail",
        ],
        [
            "non_fallback_precision",
            f"{non_fallback_precision:.4f}",
            ">= 0.90",
            "pass" if non_fallback_precision >= 0.90 else "fail",
        ],
        ["conflict_count", str(conflict_count), "-", "-"],
        ["unreadable_count", str(unreadable_count), "<= 5%", "pass" if unreadable_ratio <= 0.05 else "fail"],
        ["gate_pass", "true" if gate_pass else "false", "-", "-"],
    ]
    report_lines.extend(md_table(["metric", "value", "threshold", "status"], metric_rows))

    report_lines.extend(
        [
            "",
            "## Audit Verdict Distribution",
            "",
        ]
    )
    verdict_rows = [
        [k, str(v), to_pct_text(pct(v, audited_total))]
        for k, v in sorted(verdict_counter.items(), key=lambda x: x[0])
    ]
    report_lines.extend(md_table(["verdict", "count", "ratio"], verdict_rows))

    report_lines.extend(["", "## Stratified Coverage (Paper x Strategy)", ""])
    strat_rows = [
        [str(paper), strategy, str(count), to_pct_text(pct(count, audited_total))]
        for (paper, strategy), count in sorted(by_paper_strategy.items(), key=lambda x: (x[0][0], x[0][1]))
    ]
    report_lines.extend(md_table(["paper", "strategy", "count", "ratio"], strat_rows))

    report_lines.extend(
        [
            "",
            "## Conflict Breakdown",
            "",
            f"- topic_conflict_count (verdict in wrong/partial): {topic_conflict_count}",
            f"- prediction_missing_count: {prediction_missing_count}",
            f"- strategy_conflict_count (CSV vs DB): {strategy_conflict_count}",
            f"- paper_conflict_count (CSV vs DB): {paper_conflict_count}",
            f"- multi_primary_count: {multi_primary_count}",
            f"- verdict_inconsistency_count: {verdict_inconsistency_count}",
            "",
        ]
    )

    if conflict_samples:
        report_lines.append("## Conflict Samples")
        report_lines.append("")
        sample_rows = []
        for item in conflict_samples[:40]:
            sample_rows.append(
                [
                    item["storage_key"],
                    item["verdict"],
                    item["csv_strategy"],
                    item["db_strategy"] or "(missing)",
                    item["predicted_path"],
                    item["gold_primary"],
                    item["gold_secondary"] or "-",
                ]
            )
        report_lines.extend(
            md_table(
                [
                    "storage_key",
                    "verdict",
                    "csv_strategy",
                    "db_strategy",
                    "predicted_primary",
                    "gold_primary",
                    "gold_secondary",
                ],
                sample_rows,
            )
        )
        if len(conflict_samples) > 40:
            report_lines.append("")
            report_lines.append(f"- (truncated) total conflict samples: {len(conflict_samples)}")

    write_report(args.out, report_lines)

    print(f"audited_total={audited_total}")
    print(f"topic_primary_accuracy={topic_primary_accuracy:.4f}")
    print(f"topic_primary_precision={topic_primary_precision:.4f}")
    print(f"non_fallback_precision={non_fallback_precision:.4f}")
    print(f"conflict_count={conflict_count}")
    print(f"unreadable_count={unreadable_count}")
    print(f"gate_pass={'true' if gate_pass else 'false'}")
    print(f"report={args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
