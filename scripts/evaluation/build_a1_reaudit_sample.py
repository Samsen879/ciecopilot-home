#!/usr/bin/env python3
"""Build a prioritized 60-question re-audit sheet after A1 mapper changes."""
from __future__ import annotations

import argparse
import csv
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local
from scripts.vlm.db_utils import connect


DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


@dataclass
class AuditRow:
    storage_key: str
    paper: int
    old_strategy: str
    gold_primary: str
    gold_secondary: str
    old_verdict: str


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> None:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        if os.environ.get(key):
            return
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL
    print(f"DATABASE_URL not set; fallback to local default: {DEFAULT_LOCAL_DB_URL}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build prioritized 60-question A1 re-audit sheet")
    parser.add_argument("--input", type=Path, required=True, help="Existing manual audit CSV")
    parser.add_argument("--output", type=Path, default=Path("data/eval/a1_topic_link_reaudit_60_v1.csv"))
    parser.add_argument("--size", type=int, default=60)
    parser.add_argument("--source", default="a1_keyword_mapper_v1")
    parser.add_argument("--allow-remote", action="store_true")
    return parser.parse_args()


def read_audit_rows(path: Path) -> list[AuditRow]:
    out: list[AuditRow] = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for rec in reader:
            out.append(
                AuditRow(
                    storage_key=str(rec.get("storage_key") or "").strip(),
                    paper=int(str(rec.get("paper") or "0").strip()),
                    old_strategy=str(rec.get("predicted_strategy") or "").strip(),
                    gold_primary=str(rec.get("gold_primary_node_path") or "").strip(),
                    gold_secondary=str(rec.get("gold_secondary_node_path") or "").strip(),
                    old_verdict=str(rec.get("verdict") or "").strip(),
                )
            )
    return out


def fetch_current_predictions(storage_keys: list[str], source: str) -> dict[str, tuple[str, str]]:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  storage_key,
                  COALESCE(evidence->>'strategy', '') AS strategy,
                  COALESCE(evidence->>'node_path', '') AS node_path
                FROM public.question_concept_links
                WHERE source = %s
                  AND link_type = 'primary'
                  AND storage_key = ANY(%s)
                """,
                (source, storage_keys),
            )
            return {k: (s, p) for k, s, p in cur.fetchall()}


def pick_rows(rows: list[AuditRow], preds: dict[str, tuple[str, str]], size: int) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for r in rows:
        strategy_new, node_new = preds.get(r.storage_key, ("", ""))
        changed = (strategy_new != r.old_strategy) or (node_new != r.gold_primary)
        priority = 0
        if r.old_verdict in {"wrong", "partial"}:
            priority += 3
        if r.old_strategy == "paper_fallback" and strategy_new != "paper_fallback":
            priority += 3
        if changed:
            priority += 2
        if strategy_new == "heuristic_fallback":
            priority += 1

        enriched.append(
            {
                "storage_key": r.storage_key,
                "paper": r.paper,
                "predicted_strategy_new": strategy_new,
                "predicted_primary_node_path_new": node_new,
                "old_verdict": r.old_verdict,
                "gold_primary_node_path": r.gold_primary,
                "gold_secondary_node_path": r.gold_secondary,
                "priority": priority,
            }
        )

    enriched.sort(
        key=lambda x: (
            -int(x["priority"]),
            0 if x["old_verdict"] == "wrong" else 1 if x["old_verdict"] == "partial" else 2,
            str(x["storage_key"]),
        )
    )
    chosen = enriched[:size]
    for c in chosen:
        c.pop("priority", None)
        c["reviewer_verdict"] = ""
        c["reviewer_note"] = ""
    return chosen


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "storage_key",
        "paper",
        "predicted_strategy_new",
        "predicted_primary_node_path_new",
        "old_verdict",
        "gold_primary_node_path",
        "gold_secondary_node_path",
        "reviewer_verdict",
        "reviewer_note",
    ]
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in rows:
            w.writerow(row)


def main() -> int:
    args = parse_args()
    if not args.input.exists():
        print(f"Error: input CSV not found: {args.input}", file=sys.stderr)
        return 2

    load_env()
    ensure_db_url()
    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    rows = read_audit_rows(args.input)
    preds = fetch_current_predictions([r.storage_key for r in rows], args.source)
    chosen = pick_rows(rows, preds, args.size)
    write_csv(args.output, chosen)

    print(f"input_rows={len(rows)}")
    print(f"predictions_found={len(preds)}")
    print(f"output_rows={len(chosen)}")
    print(f"output={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

