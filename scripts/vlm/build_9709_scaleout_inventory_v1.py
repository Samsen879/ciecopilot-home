#!/usr/bin/env python3
"""Build full 9709 PDF inventory, scale-out manifest, and shard plan."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import csv
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.build_pdf_page_full_paper_manifest_v1 import (  # noqa: E402
    build_full_paper_manifest,
    parse_pdf_identity,
)


SCHEMA_VERSION = "9709_full_scaleout_inventory_v1"
MANIFEST_SCHEMA_VERSION = "9709_full_scaleout_manifest_v1"
DEFAULT_PDF_ROOT = Path("data/past-papers/9709Mathematics")
DEFAULT_EVIDENCE_PATHS = (
    Path("docs/reports/2026-04-25-9709-surface-triage-evidence-bundles-final.json"),
    Path("docs/reports/2026-04-23-9709-prompt-backfill-evidence-bundles.json"),
    Path("docs/reports/2026-04-23-9709-provider-failure-rerun-evidence-bundles.json"),
)
DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
SESSION_ORDER = {"m": 0, "s": 1, "w": 2}


def discover_9709_pdfs(pdf_root: str | Path = DEFAULT_PDF_ROOT) -> list[Path]:
    return sorted(Path(pdf_root).glob("paper*/*.pdf"))


def classify_pdf_risk(pdf_path: str | Path) -> dict[str, Any]:
    path = Path(pdf_path)
    identity = parse_pdf_identity(path)
    watermarked = path.name.startswith("WM_")
    if identity.paper in {1, 3}:
        family = "p1_p3"
        risk_tier = "core"
        risk_tags = ["paper_1_or_3_core_classifier_covered"]
    elif identity.paper in {2, 4}:
        family = "p2_p4"
        risk_tier = "medium"
        risk_tags = ["paper_2_or_4_needs_mechanics_release_coverage"]
    elif identity.paper in {5, 6}:
        family = "p5_p6"
        risk_tier = "high"
        risk_tags = ["paper_5_or_6_outside_current_release_scope"]
    else:
        family = f"paper{identity.paper}"
        risk_tier = "high"
        risk_tags = ["unknown_9709_paper_family"]

    if watermarked:
        risk_tags.append("watermarked_source_pdf")
    return {
        "subject_code": identity.subject_code,
        "session": identity.session,
        "year": identity.year,
        "paper": identity.paper,
        "variant": identity.variant,
        "pdf_stem": identity.pdf_stem,
        "watermarked": watermarked,
        "paper_family": family,
        "group_key": f"p{identity.paper}_{identity.session}_{'watermarked' if watermarked else 'standard'}",
        "risk_tier": risk_tier,
        "risk_tags": risk_tags,
    }


def _counter_to_sorted_dict(counter: Counter) -> dict[str, int]:
    return {str(key): counter[key] for key in sorted(counter)}


def _pdf_record_sort_key(record: dict[str, Any]) -> tuple[int, int, int, str]:
    return (
        int(record["paper"]),
        SESSION_ORDER.get(str(record["session"]), 99),
        1 if record["watermarked"] else 0,
        str(record["pdf_path"]),
    )


def _row_from_manifest_item(
    *,
    item: dict[str, Any],
    pdf_path: Path,
    pdf_risk: dict[str, Any],
    evidence_storage_keys: set[str],
    screenshot_storage_keys: set[str],
) -> dict[str, Any]:
    q_number = int(item["q_number"])
    storage_key = str(item["storage_key"])
    risk_tags = list(pdf_risk["risk_tags"])
    return {
        "storage_key": storage_key,
        "syllabus_code": "9709",
        "year": pdf_risk["year"],
        "session": pdf_risk["session"],
        "paper": pdf_risk["paper"],
        "variant": pdf_risk["variant"],
        "q_number": q_number,
        "source_pdf": str(pdf_path),
        "source_pdf_watermarked": bool(pdf_risk["watermarked"]),
        "paper_family": pdf_risk["paper_family"],
        "group_key": pdf_risk["group_key"],
        "risk_tier": pdf_risk["risk_tier"],
        "risk_tags": risk_tags,
        "existing_repo_png": storage_key in screenshot_storage_keys,
        "existing_tracked_evidence": storage_key in evidence_storage_keys,
        "shard_id": None,
    }


def _assign_shards(
    pdf_records: list[dict[str, Any]],
    *,
    shard_size: int,
) -> list[dict[str, Any]]:
    shards: list[dict[str, Any]] = []
    group_counters: Counter[str] = Counter()

    def flush(group_key: str, rows: list[dict[str, Any]], pdfs: list[dict[str, Any]]) -> None:
        if not rows:
            return
        group_counters[group_key] += 1
        shard_id = f"{group_key}_{group_counters[group_key]:03d}"
        for row in rows:
            row["shard_id"] = shard_id
        shards.append(
            {
                "shard_id": shard_id,
                "group_key": group_key,
                "risk_tier": _max_risk_tier(row["risk_tier"] for row in rows),
                "item_count": len(rows),
                "pdf_count": len(pdfs),
                "pdf_paths": [record["pdf_path"] for record in pdfs],
                "paper_set": sorted({row["paper"] for row in rows}),
                "session_set": sorted({row["session"] for row in rows}),
                "risk_tags": sorted({tag for row in rows for tag in row["risk_tags"]}),
            }
        )

    current_group: str | None = None
    current_rows: list[dict[str, Any]] = []
    current_pdfs: list[dict[str, Any]] = []
    for record in pdf_records:
        group_key = record["group_key"]
        rows = record["items"]
        if not rows:
            continue
        if current_group != group_key:
            if current_group is not None:
                flush(current_group, current_rows, current_pdfs)
            current_group = group_key
            current_rows = []
            current_pdfs = []
        if current_rows and len(current_rows) + len(rows) > shard_size:
            flush(group_key, current_rows, current_pdfs)
            current_rows = []
            current_pdfs = []
        current_rows.extend(rows)
        current_pdfs.append(record)
    if current_group is not None:
        flush(current_group, current_rows, current_pdfs)
    return shards


def _max_risk_tier(tiers: Any) -> str:
    order = {"core": 0, "medium": 1, "high": 2}
    return max((str(tier) for tier in tiers), key=lambda tier: order.get(tier, 99))


def build_scaleout_inventory(
    pdf_paths: list[str | Path],
    *,
    shard_size: int = 300,
    max_question_number: int = 15,
    low_score_threshold: int = 30,
    generated_on: str | None = None,
    evidence_storage_keys: set[str] | None = None,
    screenshot_storage_keys: set[str] | None = None,
    paper_manifest_builder: Callable[..., dict[str, Any]] = build_full_paper_manifest,
) -> dict[str, Any]:
    evidence_storage_keys = evidence_storage_keys or set()
    screenshot_storage_keys = screenshot_storage_keys or set()
    pdf_records: list[dict[str, Any]] = []
    all_items: list[dict[str, Any]] = []

    for pdf_path_like in sorted(Path(path) for path in pdf_paths):
        pdf_risk = classify_pdf_risk(pdf_path_like)
        paper_manifest = paper_manifest_builder(
            pdf_path_like,
            max_question_number=max_question_number,
            low_score_threshold=low_score_threshold,
        )
        rows = [
            _row_from_manifest_item(
                item=item,
                pdf_path=Path(pdf_path_like),
                pdf_risk=pdf_risk,
                evidence_storage_keys=evidence_storage_keys,
                screenshot_storage_keys=screenshot_storage_keys,
            )
            for item in paper_manifest.get("items") or []
        ]
        locator_summary = paper_manifest.get("locator_audit", {}).get("summary", {})
        record = {
            "pdf_path": str(pdf_path_like),
            **pdf_risk,
            "locator_summary": locator_summary,
            "parseable_question_rows": len(rows),
            "items": rows,
        }
        pdf_records.append(record)
        all_items.extend(rows)

    pdf_records.sort(key=_pdf_record_sort_key)
    shards = _assign_shards(pdf_records, shard_size=shard_size)
    all_items = [row for record in pdf_records for row in record["items"]]

    by_paper = Counter(record["paper"] for record in pdf_records)
    by_session = Counter(record["session"] for record in pdf_records)
    rows_by_paper = Counter(row["paper"] for row in all_items)
    risk_tag_counts = Counter(tag for row in all_items for tag in row["risk_tags"])
    targeted = sum(int(record["locator_summary"].get("targeted_questions", 0)) for record in pdf_records)
    found = sum(int(record["locator_summary"].get("found", 0)) for record in pdf_records)
    missing = sum(int(record["locator_summary"].get("missing", 0)) for record in pdf_records)
    low_score = sum(int(record["locator_summary"].get("low_score", 0)) for record in pdf_records)
    excluded_low_score = sum(int(record["locator_summary"].get("excluded_low_score", 0)) for record in pdf_records)
    multi_page = sum(int(record["locator_summary"].get("multi_page", 0)) for record in pdf_records)

    return {
        "schema_version": SCHEMA_VERSION,
        "inventory_id": "9709_full_scaleout_inventory_v1",
        "generated_on": generated_on or date.today().isoformat(),
        "subject_code": "9709",
        "parameters": {
            "shard_size": shard_size,
            "max_question_number": max_question_number,
            "low_score_threshold": low_score_threshold,
            "shard_boundary": "pdfs are kept intact; shards do not intentionally mix paper families or watermarked/non-watermarked PDFs",
        },
        "summary": {
            "pdfs_total": len(pdf_records),
            "watermarked_pdfs": sum(1 for record in pdf_records if record["watermarked"]),
            "by_paper": _counter_to_sorted_dict(by_paper),
            "by_session": _counter_to_sorted_dict(by_session),
            "question_rows_targeted": targeted,
            "question_rows_found": found,
            "question_rows_parseable": len(all_items),
            "question_rows_missing": missing,
            "question_rows_low_score": low_score,
            "question_rows_excluded_low_score": excluded_low_score,
            "question_rows_multi_page": multi_page,
            "parseable_rows_by_paper": _counter_to_sorted_dict(rows_by_paper),
            "existing_repo_png_rows": sum(1 for row in all_items if row["existing_repo_png"]),
            "missing_repo_png_rows": sum(1 for row in all_items if not row["existing_repo_png"]),
            "existing_tracked_evidence_rows": sum(1 for row in all_items if row["existing_tracked_evidence"]),
            "missing_tracked_evidence_rows": sum(1 for row in all_items if not row["existing_tracked_evidence"]),
            "risk_tag_counts": _counter_to_sorted_dict(risk_tag_counts),
            "shards_total": len(shards),
            "shard_size": shard_size,
        },
        "pdfs": [
            {key: value for key, value in record.items() if key != "items"}
            for record in pdf_records
        ],
        "items": all_items,
        "shards": shards,
    }


def build_scaleout_manifest(inventory: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "manifest_id": "9709_full_scaleout_manifest_v1",
        "subject_code": "9709",
        "generated_on": inventory.get("generated_on"),
        "scope": {
            "source_inventory_id": inventory.get("inventory_id"),
            "source_inventory_schema_version": inventory.get("schema_version"),
            "question_rows_parseable": inventory.get("summary", {}).get("question_rows_parseable"),
            "shards_total": inventory.get("summary", {}).get("shards_total"),
            "operator_decision": "inventory_and_shard_plan_only; do not run VLM extraction or DB backfill without explicit approval",
        },
        "shards": inventory.get("shards", []),
        "items": [
            {
                "storage_key": row["storage_key"],
                "syllabus_code": row["syllabus_code"],
                "year": row["year"],
                "session": row["session"],
                "paper": row["paper"],
                "variant": row["variant"],
                "q_number": row["q_number"],
                "source_pdf": row["source_pdf"],
                "source_pdf_watermarked": row["source_pdf_watermarked"],
                "shard_id": row["shard_id"],
                "risk_tier": row["risk_tier"],
                "risk_tags": row["risk_tags"],
                "route_hint": "pdf_page_chain",
                "diagram_present": None,
                "formula_dense": None,
                "table_heavy": None,
                "surface_evidence_status": "not_yet_extracted",
                "requires_review": True,
                "source": SCHEMA_VERSION,
            }
            for row in inventory.get("items", [])
        ],
    }


def load_evidence_storage_keys(paths: list[str | Path]) -> set[str]:
    keys: set[str] = set()
    for path_like in paths:
        path = Path(path_like)
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows = []
        if isinstance(payload, dict):
            for key in ("bundles", "items", "results", "outputs"):
                value = payload.get(key)
                if isinstance(value, list):
                    rows.extend(value)
        elif isinstance(payload, list):
            rows.extend(payload)
        for row in rows:
            if isinstance(row, dict) and isinstance(row.get("storage_key"), str):
                keys.add(row["storage_key"])
    return keys


def collect_screenshot_storage_keys(roots: list[str | Path]) -> set[str]:
    keys: set[str] = set()
    for root_like in roots:
        root = Path(root_like)
        if not root.exists():
            continue
        for png_path in root.glob("9709/*/questions/q*.png"):
            keys.add(str(png_path.relative_to(root)).replace("\\", "/"))
    return keys


def build_db_coverage_sql(csv_path: str | Path) -> str:
    csv_literal = str(csv_path).replace("\\", "\\\\").replace("'", "''")
    return f"""
\\set QUIET 1
\\pset tuples_only on
\\pset format unaligned
CREATE TEMP TABLE manifest_items (
  storage_key text NOT NULL,
  q_number integer NOT NULL
);
\\copy manifest_items (storage_key, q_number) FROM '{csv_literal}' WITH (FORMAT csv, HEADER true)
WITH matched AS (
  SELECT
    mi.storage_key,
    mi.q_number,
    qb.question_id,
    lqas.classification_snapshot_id AS active_snapshot_id
  FROM manifest_items mi
  LEFT JOIN public.question_bank qb
    ON qb.storage_key = mi.storage_key
   AND qb.q_number = mi.q_number
   AND qb.subject_code = '9709'
   AND qb.source_kind = 'paper_question'
  LEFT JOIN public.learning_question_analysis_snapshots lqas
    ON lqas.question_id = qb.question_id
   AND lqas.superseded_by_snapshot_id IS NULL
)
SELECT jsonb_pretty(jsonb_build_object(
  'status', 'available',
  'expected_rows', (SELECT COUNT(*) FROM manifest_items),
  'registry_rows', (SELECT COUNT(*) FROM matched WHERE question_id IS NOT NULL),
  'active_analysis_rows', (SELECT COUNT(*) FROM matched WHERE active_snapshot_id IS NOT NULL),
  'missing_registry_rows', (SELECT COUNT(*) FROM matched WHERE question_id IS NULL),
  'missing_active_analysis_rows', (SELECT COUNT(*) FROM matched WHERE active_snapshot_id IS NULL)
));
"""


def query_db_coverage(
    items: list[dict[str, Any]],
    *,
    database_url: str = DEFAULT_DATABASE_URL,
    psql_bin: str | None = None,
) -> dict[str, Any]:
    psql = psql_bin or shutil.which("psql")
    if not psql:
        return {"status": "unavailable", "reason": "psql_not_found"}
    with tempfile.TemporaryDirectory(prefix="9709-scaleout-db-") as temp_dir:
        csv_path = Path(temp_dir) / "items.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["storage_key", "q_number"])
            writer.writeheader()
            for item in items:
                writer.writerow({"storage_key": item["storage_key"], "q_number": item["q_number"]})
        sql = build_db_coverage_sql(csv_path)
        result = subprocess.run(
            [psql, "-q", database_url, "-v", "ON_ERROR_STOP=1"],
            input=sql,
            text=True,
            capture_output=True,
            check=False,
        )
    if result.returncode != 0:
        return {
            "status": "unavailable",
            "reason": "psql_failed",
            "error": result.stderr.strip() or result.stdout.strip(),
        }
    return json.loads(result.stdout)


def write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_summary_markdown(path: str | Path, *, inventory: dict[str, Any], manifest_path: str | Path) -> None:
    summary = inventory["summary"]
    db = inventory.get("db_coverage", {"status": "not_requested"})
    shard_rows = "\n".join(
        f"| `{shard['shard_id']}` | {shard['item_count']} | {shard['pdf_count']} | "
        f"{','.join(str(paper) for paper in shard['paper_set'])} | {shard['risk_tier']} | "
        f"{', '.join(shard['risk_tags'])} |"
        for shard in inventory["shards"]
    )
    content = f"""# 9709 全量截图与 analysis scale-out inventory

## 范围

本报告只完成全量 inventory、scale-out manifest 与分片跑批计划。没有调用 VLM，没有重建截图，没有写数据库，也没有声明全量 production-ready。

## Inventory 结果

- PDFs total: `{summary['pdfs_total']}`
- watermarked PDFs: `{summary['watermarked_pdfs']}`
- targeted question slots: `{summary['question_rows_targeted']}`
- locator found rows: `{summary['question_rows_found']}`
- parseable question rows: `{summary['question_rows_parseable']}`
- missing locator rows: `{summary['question_rows_missing']}`
- low-score rows: `{summary['question_rows_low_score']}`
- multi-page locator rows: `{summary['question_rows_multi_page']}`
- durable repo PNG rows: `{summary['existing_repo_png_rows']}`
- missing durable repo PNG rows: `{summary['missing_repo_png_rows']}`
- tracked evidence rows: `{summary['existing_tracked_evidence_rows']}`
- missing tracked evidence rows: `{summary['missing_tracked_evidence_rows']}`

Note: `targeted question slots` means the dry locator probed q01-q15 for each PDF. `missing locator rows` are unresolved probe slots, not proof that a real printed question is missing.

## DB coverage

```json
{json.dumps(db, ensure_ascii=False, indent=2)}
```

## Manifest

- scale-out manifest: `{manifest_path}`
- shard size: `{summary['shard_size']}`
- shards total: `{summary['shards_total']}`

## Shards

| shard | rows | PDFs | papers | risk | risk tags |
| --- | ---: | ---: | --- | --- | --- |
{shard_rows}

## 执行停点

1. 先按 shard 跑 PDF page-chain dry-run/evaluator，禁止混跑 paper、session 与 watermarked/non-watermarked PDF。
2. 每个 shard 生成截图/evidence bundle 后，先跑 diff 和 release-preflight-style consistency check。
3. 对 warning/high-risk 做人工抽查，尤其是 diagram/table/multi-page/watermark。
4. 人工确认后再做 analysis backfill、search/classifier/release gate。
5. 只有单个 shard 通过 gate，才能说该 shard production-ready；不能把当前 inventory 当作全量 ready 证明。
"""
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(content, encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build 9709 full scale-out inventory and shard manifest.")
    parser.add_argument("--pdf-root", type=Path, default=DEFAULT_PDF_ROOT)
    parser.add_argument("--inventory-output", type=Path, required=True)
    parser.add_argument("--manifest-output", type=Path, required=True)
    parser.add_argument("--summary-output", type=Path, required=True)
    parser.add_argument("--shard-size", type=int, default=300)
    parser.add_argument("--max-question-number", type=int, default=15)
    parser.add_argument("--low-score-threshold", type=int, default=30)
    parser.add_argument("--generated-on", default=date.today().isoformat())
    parser.add_argument("--evidence", action="append", type=Path, default=list(DEFAULT_EVIDENCE_PATHS))
    parser.add_argument("--screenshot-root", action="append", type=Path, default=[Path("data")])
    parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL)
    parser.add_argument("--no-db", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    pdf_paths = discover_9709_pdfs(args.pdf_root)
    if not pdf_paths:
        raise SystemExit(f"No 9709 PDFs found under {args.pdf_root}")
    inventory = build_scaleout_inventory(
        pdf_paths,
        shard_size=args.shard_size,
        max_question_number=args.max_question_number,
        low_score_threshold=args.low_score_threshold,
        generated_on=args.generated_on,
        evidence_storage_keys=load_evidence_storage_keys(args.evidence),
        screenshot_storage_keys=collect_screenshot_storage_keys(args.screenshot_root),
    )
    if args.no_db:
        inventory["db_coverage"] = {"status": "not_requested"}
    else:
        inventory["db_coverage"] = query_db_coverage(
            inventory["items"],
            database_url=args.database_url,
        )
    manifest = build_scaleout_manifest(inventory)
    write_json(args.inventory_output, inventory)
    write_json(args.manifest_output, manifest)
    write_summary_markdown(args.summary_output, inventory=inventory, manifest_path=args.manifest_output)
    print(
        json.dumps(
            {
                "inventory_output": str(args.inventory_output),
                "manifest_output": str(args.manifest_output),
                "summary_output": str(args.summary_output),
                "pdfs_total": inventory["summary"]["pdfs_total"],
                "question_rows_parseable": inventory["summary"]["question_rows_parseable"],
                "shards_total": inventory["summary"]["shards_total"],
                "db_coverage": inventory["db_coverage"],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
