#!/usr/bin/env python3
"""Build 9702 full row-surface and crop/render scaleout gate artifacts."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import re
import sys
from typing import Any

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.build_9702_pilot_row_surface_crop_gate_v1 import (  # noqa: E402
    build_crop_records,
    build_surface_row,
    detect_question_headers,
    page_indices_for_headers,
    parse_9702_source_pdf_path,
    render_pdf_pages,
    repo_path,
    resolve_path,
    validate_crop_record,
)


SUBJECT_CODE = "9702"
GENERATED_TOKEN = "2026_06_09"
DEFAULT_GENERATED_ON = "2026-06-09"
DEFAULT_SOURCE_INVENTORY_PATH = Path("docs/reports/2026-06-09-9702-source-truth-inventory.json")
DEFAULT_OUTPUT_ROOT = Path("data/crops/9702-full-scaleout")
DEFAULT_MANIFEST_ROOT = Path("data/manifests")
DEFAULT_REPORT_ROOT = Path("docs/reports")

INPUT_SCHEMA = "9702_full_page_chain_input_v1"
SHARD_SURFACE_SCHEMA = "9702_full_page_chain_surface_v1"
FULL_ROW_SURFACE_SCHEMA = "9702_full_row_surface_manifest_v1"
FULL_CROP_MANIFEST_SCHEMA = "9702_full_crop_manifest_v1"
ROW_GATE_SCHEMA = "9702_full_row_surface_gate_v1"
CROP_GATE_SCHEMA = "9702_full_crop_render_gate_v1"
SHARD_CLOSEOUT_SCHEMA = "9702_full_shard_row_surface_crop_closeout_v1"

LOCATOR_METHOD = "fitz_text_words_left_margin_9702_full_scaleout_v1"
CROP_METHOD = "pymupdf_rendered_page_question_band_9702_full_scaleout_v1"
MIN_CROP_WIDTH = 120
MIN_CROP_HEIGHT = 80
NONBLANK_LUMA_THRESHOLD = 250


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def source_class_slug(classification: str) -> str:
    if classification == "historical_repo_source":
        return "historical"
    if classification == "public_mirror_candidate_promoted_2026_06_02":
        return "promoted_public"
    slug = re.sub(r"[^a-z0-9]+", "_", str(classification or "").strip().lower()).strip("_")
    return slug or "unknown"


def expected_q_numbers_for_paper(paper_number: int) -> tuple[int, ...]:
    ranges = {
        1: range(1, 41),
        2: range(1, 8),
        3: range(1, 3),
        4: range(1, 13),
        5: range(1, 3),
    }
    if paper_number not in ranges:
        raise ValueError(f"unsupported_9702_paper:{paper_number}")
    return tuple(ranges[paper_number])


def shard_id_for_record(record: dict[str, Any]) -> str:
    paper_number = int(record["paper_number"])
    session_code = str(record["session_code"]).lower()
    source_class = source_class_slug(record.get("source_posture", {}).get("classification", ""))
    return f"9702_p{paper_number}_{session_code}_{source_class}_001"


def build_shard_strategy(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record.get("status") != "pass":
            continue
        grouped[shard_id_for_record(record)].append(record)

    shards = []
    for shard_id in sorted(grouped):
        source_records = sorted(grouped[shard_id], key=lambda item: str(item["repo_path"]))
        first = source_records[0]
        source_class = source_class_slug(first.get("source_posture", {}).get("classification", ""))
        shards.append(
            {
                "shard_id": shard_id,
                "subject_code": SUBJECT_CODE,
                "paper": int(first["paper_number"]),
                "session_code": str(first["session_code"]).lower(),
                "source_class": source_class,
                "source_pdf_count": len(source_records),
                "source_pdf_paths": [record["repo_path"] for record in source_records],
                "input_manifest_path": f"data/manifests/{shard_id}_input_v1.json",
                "surface_manifest_path": f"data/manifests/{shard_id}_page_chain_surface_v1.json",
                "namespace_note": (
                    "9702 full scaleout page-chain/crop namespace; separate from pilot, remediation, "
                    "visual-review, text, authority, and production namespaces"
                ),
                "records": source_records,
            }
        )
    return shards


def find_duplicate_row_identities(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts = Counter((str(row.get("storage_key")), int(row.get("q_number"))) for row in rows)
    return [
        {"storage_key": storage_key, "q_number": q_number, "count": count}
        for (storage_key, q_number), count in sorted(counts.items())
        if count > 1
    ]


def image_is_nonblank(path: Path) -> bool:
    with Image.open(path) as image:
        if image.width <= 0 or image.height <= 0:
            return False
        extrema = image.convert("L").getextrema()
    return bool(extrema and extrema[0] < NONBLANK_LUMA_THRESHOLD)


def validate_crop_record_full(record: dict[str, Any], *, workspace_root: Path) -> list[str]:
    issues = validate_crop_record(record, workspace_root=workspace_root)
    rendered_path = resolve_path(record["rendered_pdf_page_path"], workspace_root=workspace_root)
    crop_path = resolve_path(record["crop_path"], workspace_root=workspace_root)
    try:
        if not image_is_nonblank(rendered_path):
            issues.append("rendered_page_blank")
    except Exception:
        issues.append("rendered_page_unreadable")
    try:
        with Image.open(crop_path) as crop_image:
            if crop_image.width < MIN_CROP_WIDTH or crop_image.height < MIN_CROP_HEIGHT:
                if "crop_dimensions_too_small" not in issues:
                    issues.append("crop_dimensions_too_small")
        if not image_is_nonblank(crop_path):
            issues.append("crop_blank")
    except Exception:
        if "crop_unreadable" not in issues:
            issues.append("crop_unreadable")
    return sorted(set(issues))


def full_surface_row(
    *,
    meta: dict[str, Any],
    q_number: int,
    source_pdf_page_count: int,
    locator: dict[str, Any],
    page_indices: list[int],
    source_manifest_path: str,
    selection_reason: str,
    source_inventory_record: dict[str, Any],
) -> dict[str, Any]:
    row = build_surface_row(
        meta=meta,
        q_number=q_number,
        source_pdf_page_count=source_pdf_page_count,
        locator=locator,
        page_indices=page_indices,
        source_manifest_path=source_manifest_path,
        selection_reason=selection_reason,
    )
    row.update(
        {
            "locator_method": LOCATOR_METHOD,
            "source_locator_surface_manifest_reason": selection_reason,
            "source_inventory_record": {
                "inventory_report": DEFAULT_SOURCE_INVENTORY_PATH.as_posix(),
                "status": source_inventory_record.get("status"),
                "sha256": source_inventory_record.get("sha256"),
                "source_posture_classification": source_inventory_record.get("source_posture", {}).get("classification"),
                "parser_page_count": source_inventory_record.get("parser", {}).get("page_count"),
                "render_sanity_status": source_inventory_record.get("render_sanity", {}).get("status"),
            },
            "surface_evidence_status": "locator_resolved_pending_crop_render_and_visual_review",
            "page_chain_surface_status": "locator_rows_ready_pending_crop_render_visual_review",
            "full_scaleout_stage": "row_surface_crop_render_only",
            "production_ready_claimed": False,
            "db_consumption_claimed": False,
            "search_consumption_claimed": False,
            "rag_consumption_claimed": False,
            "external_vlm_or_api_used": False,
            "external_ocr_rerun_used": False,
        }
    )
    row["locator"] = {**row["locator"], "method": LOCATOR_METHOD}
    return row


def unpromoted_missing_record(source_record: dict[str, Any], q_number: int, detected_q_numbers: list[int]) -> dict[str, Any]:
    return {
        "source_pdf": source_record["repo_path"],
        "q_number": q_number,
        "page_number": None,
        "paper": int(source_record["paper_number"]),
        "session_year": source_record["session_id"],
        "component": source_record["component_id"],
        "reason": "broad_paper_question_candidate_not_detected_by_full_scaleout_locator",
        "detected_q_numbers": detected_q_numbers,
        "promoted": False,
        "recommended_remediation": (
            "Do not promote this broad-range candidate without source-specific locator review; "
            "paper formats may legitimately have fewer printed questions."
        ),
    }


def unpromoted_ambiguous_records(source_record: dict[str, Any], ambiguous: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for item in ambiguous:
        candidate = item.get("candidate", {})
        accepted = item.get("accepted", {})
        records.append(
            {
                "source_pdf": source_record["repo_path"],
                "q_number": item.get("q_number"),
                "page_number": candidate.get("page_number"),
                "paper": int(source_record["paper_number"]),
                "session_year": source_record["session_id"],
                "component": source_record["component_id"],
                "reason": "equal_scoring_duplicate_question_header_candidate",
                "candidate": candidate,
                "competing_candidate": accepted,
                "promoted": False,
                "recommended_remediation": "Resolve the locator manually before downstream visual/text promotion.",
            }
        )
    return records


def unpromoted_rejected_records(source_record: dict[str, Any], rejected: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for item in rejected:
        records.append(
            {
                "source_pdf": source_record["repo_path"],
                "q_number": item.get("q_number"),
                "page_number": item.get("page_number"),
                "paper": int(source_record["paper_number"]),
                "session_year": source_record["session_id"],
                "component": source_record["component_id"],
                "reason": item.get("reason"),
                "candidate": item,
                "promoted": False,
                "recommended_remediation": "No action unless a later visual/text phase identifies this candidate as a true row boundary.",
            }
        )
    return records


def input_manifest_for_shard(
    *,
    shard: dict[str, Any],
    generated_on: str,
    source_inventory_path: Path,
    workspace_root: Path,
) -> dict[str, Any]:
    return {
        "schema_version": INPUT_SCHEMA,
        "manifest_id": f"{shard['shard_id']}_input_v1",
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "stage": "9702_full_page_chain_input",
        "source_inventory_path": repo_path(source_inventory_path, workspace_root=workspace_root),
        "production_ready_claimed": False,
        "external_vlm_or_api_calls": 0,
        "db_search_read_model_rag_writes": 0,
        "shard_strategy": {
            "shard_id": shard["shard_id"],
            "paper": shard["paper"],
            "session_code": shard["session_code"],
            "source_class": shard["source_class"],
            "stable_namespace": True,
            "future_namespace_collision_avoided": True,
        },
        "source_pdf_count": shard["source_pdf_count"],
        "items": [
            {
                "source_pdf": record["repo_path"],
                "canonical_paper_id": record.get("canonical_paper_id"),
                "paper": int(record["paper_number"]),
                "session_year": record["session_id"],
                "component": record["component_id"],
                "variant": record.get("variant"),
                "source_status": record.get("status"),
                "source_posture_classification": record.get("source_posture", {}).get("classification"),
                "expected_q_number_candidates": list(expected_q_numbers_for_paper(int(record["paper_number"]))),
                "parser_page_count": record.get("parser", {}).get("page_count"),
                "sha256": record.get("sha256"),
            }
            for record in shard["records"]
        ],
    }


def surface_manifest_for_shard(
    *,
    shard: dict[str, Any],
    generated_on: str,
    rows: list[dict[str, Any]],
    unpromoted_summary: dict[str, int],
) -> dict[str, Any]:
    return {
        "schema_version": SHARD_SURFACE_SCHEMA,
        "manifest_id": f"{shard['shard_id']}_page_chain_surface_v1",
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "stage": "9702_full_row_surface_crop_render_only",
        "surface_status": "full_crop_render_complete_pending_visual_review",
        "production_ready_claimed": False,
        "item_count": len(rows),
        "source_pdf_count": shard["source_pdf_count"],
        "source_pdf_paths": shard["source_pdf_paths"],
        "boundary": {
            "row_surface_crop_readiness_only": True,
            "visual_acceptance_claimed": False,
            "canonical_question_text_claimed": False,
            "normalized_plain_text_claimed": False,
            "authority_alignment_claimed": False,
            "db_consumption_claimed": False,
            "search_consumption_claimed": False,
            "rag_consumption_claimed": False,
            "production_ready_claimed": False,
            "external_vlm_or_api_calls": 0,
            "db_search_read_model_rag_writes": 0,
        },
        "shard_strategy": {
            "shard_id": shard["shard_id"],
            "paper": shard["paper"],
            "session_code": shard["session_code"],
            "source_class": shard["source_class"],
        },
        "unpromoted_locator_summary": unpromoted_summary,
        "items": rows,
    }


def update_row_with_crop(
    *,
    row: dict[str, Any],
    crop_records: list[dict[str, Any]],
    crop_issues: list[str],
) -> dict[str, Any]:
    crop_status = "complete" if not crop_issues else "blocked"
    updated = deepcopy(row)
    updated.update(
        {
            "rendered_pdf_page_paths": [record["rendered_pdf_page_path"] for record in crop_records],
            "crop_paths": [record["crop_path"] for record in crop_records],
            "review_crop_paths": [record["crop_path"] for record in crop_records],
            "crop_records": crop_records,
            "crop_status": crop_status,
            "local_extraction_crop_method": CROP_METHOD,
            "surface_evidence_status": (
                "local_full_crop_render_complete_pending_visual_review"
                if crop_status == "complete"
                else "local_full_crop_render_blocked"
            ),
            "page_chain_surface_status": (
                "full_crop_render_complete_pending_visual_review"
                if crop_status == "complete"
                else "full_crop_render_blocked"
            ),
            "visual_review_reason": "local_full_crop_render_complete_not_vlm_reviewed",
            "mechanical_validation": {
                "crop_files_exist": crop_status == "complete",
                "crop_images_non_empty": crop_status == "complete",
                "crop_images_nonblank": crop_status == "complete",
                "referenced_rendered_pages_exist": crop_status == "complete",
                "referenced_rendered_pages_nonblank": crop_status == "complete",
                "validation_issues": crop_issues,
            },
        }
    )
    return updated


def build_gate(
    *,
    workspace_root: Path,
    generated_on: str,
    source_inventory_path: Path,
    output_root: Path,
    manifest_root: Path,
    report_root: Path,
    render_scale: float,
    max_pages_per_row: int,
    padding_points: float,
) -> dict[str, Any]:
    inventory = read_json(resolve_path(source_inventory_path, workspace_root=workspace_root))
    records = inventory.get("records")
    if not isinstance(records, list):
        raise RuntimeError("source_inventory_records_not_list")
    if inventory.get("subject_code") != SUBJECT_CODE:
        raise RuntimeError("source_inventory_subject_not_9702")

    shards = build_shard_strategy(records)
    all_rows: list[dict[str, Any]] = []
    all_crop_items: list[dict[str, Any]] = []
    all_missing: list[dict[str, Any]] = []
    all_ambiguous: list[dict[str, Any]] = []
    all_rejected: list[dict[str, Any]] = []
    source_summaries: list[dict[str, Any]] = []
    shard_results: list[dict[str, Any]] = []
    rendered_page_count = 0
    rendered_page_paths: set[str] = set()
    crop_paths: set[str] = set()

    for shard in shards:
        shard_rows: list[dict[str, Any]] = []
        shard_missing: list[dict[str, Any]] = []
        shard_ambiguous: list[dict[str, Any]] = []
        shard_rejected: list[dict[str, Any]] = []
        shard_rendered_pages = 0
        surface_manifest_path = manifest_root / f"{shard['shard_id']}_page_chain_surface_v1.json"
        surface_manifest_repo_path = repo_path(surface_manifest_path, workspace_root=workspace_root)

        for source_record in shard["records"]:
            source_pdf = source_record["repo_path"]
            source_pdf_path = resolve_path(source_pdf, workspace_root=workspace_root)
            meta = parse_9702_source_pdf_path(source_pdf)
            expected_q_numbers = expected_q_numbers_for_paper(int(source_record["paper_number"]))
            headers, rejected, ambiguous, page_count = detect_question_headers(
                source_pdf_path,
                expected_q_numbers=expected_q_numbers,
            )
            ambiguous_q_numbers = {int(item["q_number"]) for item in ambiguous if item.get("q_number") is not None}
            detected_q_numbers = sorted(int(q) for q in headers)
            missing_q_numbers = [q for q in expected_q_numbers if q not in headers]
            missing_records = [
                unpromoted_missing_record(source_record, q_number, detected_q_numbers)
                for q_number in missing_q_numbers
            ]
            ambiguous_records = unpromoted_ambiguous_records(source_record, ambiguous)
            rejected_records = unpromoted_rejected_records(source_record, rejected)
            shard_missing.extend(missing_records)
            shard_ambiguous.extend(ambiguous_records)
            shard_rejected.extend(rejected_records)

            rendered = render_pdf_pages(source_pdf_path, output_root=output_root, scale=render_scale)
            rendered_page_count += len(rendered)
            shard_rendered_pages += len(rendered)

            for q_number in detected_q_numbers:
                if q_number in ambiguous_q_numbers:
                    continue
                page_indices = page_indices_for_headers(headers, q_number, page_count, max_pages_per_row)
                row = full_surface_row(
                    meta=meta,
                    q_number=q_number,
                    source_pdf_page_count=page_count,
                    locator=headers[q_number],
                    page_indices=page_indices,
                    source_manifest_path=surface_manifest_repo_path,
                    selection_reason=(
                        "Phase 1 source-pass PDF; Phase 3 deterministic left-margin locator scaled to "
                        f"{shard['shard_id']}"
                    ),
                    source_inventory_record=source_record,
                )
                crop_records, crop_issues = build_crop_records(
                    source_pdf_path=source_pdf_path,
                    row=row,
                    headers=headers,
                    rendered_paths=rendered,
                    output_root=output_root,
                    workspace_root=workspace_root,
                    padding_points=padding_points,
                )
                full_issues = list(crop_issues)
                for crop_record in crop_records:
                    full_issues.extend(validate_crop_record_full(crop_record, workspace_root=workspace_root))
                updated_row = update_row_with_crop(
                    row=row,
                    crop_records=crop_records,
                    crop_issues=sorted(set(full_issues)),
                )
                shard_rows.append(updated_row)
                rendered_page_paths.update(updated_row["rendered_pdf_page_paths"])
                crop_paths.update(updated_row["crop_paths"])

            source_summaries.append(
                {
                    "source_pdf": source_pdf,
                    "shard_id": shard["shard_id"],
                    "paper": int(source_record["paper_number"]),
                    "session_year": source_record["session_id"],
                    "component": source_record["component_id"],
                    "page_count": page_count,
                    "expected_q_number_candidate_count": len(expected_q_numbers),
                    "detected_q_number_count": len(detected_q_numbers),
                    "accepted_row_count": len([q for q in detected_q_numbers if q not in ambiguous_q_numbers]),
                    "unpromoted_missing_candidate_count": len(missing_records),
                    "unpromoted_ambiguous_candidate_count": len(ambiguous_records),
                    "rejected_false_positive_candidate_count": len(rejected_records),
                    "rendered_page_count": len(rendered),
                }
            )

        all_rows.extend(shard_rows)
        all_crop_items.extend(shard_rows)
        all_missing.extend(shard_missing)
        all_ambiguous.extend(shard_ambiguous)
        all_rejected.extend(shard_rejected)
        shard_results.append(
            {
                "shard": shard,
                "rows": shard_rows,
                "missing": shard_missing,
                "ambiguous": shard_ambiguous,
                "rejected": shard_rejected,
                "rendered_pages": shard_rendered_pages,
            }
        )

    duplicate_row_identities = find_duplicate_row_identities(all_rows)
    source_missing = [
        {"source_pdf": row["source_pdf"], "storage_key": row["storage_key"], "q_number": row["q_number"]}
        for row in all_rows
        if not resolve_path(row["source_pdf"], workspace_root=workspace_root).exists()
    ]
    crop_blockers = [
        {
            "storage_key": row["storage_key"],
            "source_pdf": row["source_pdf"],
            "q_number": row["q_number"],
            "validation": row.get("mechanical_validation", {}),
        }
        for row in all_crop_items
        if row.get("crop_status") != "complete"
    ]
    missing_crop_files = sum(1 for row in all_crop_items if not row.get("crop_paths"))
    missing_rendered_pages = sum(1 for row in all_crop_items if not row.get("rendered_pdf_page_paths"))
    manifest_membership = Counter(
        (row["storage_key"], row["q_number"], row["source_locator_surface_manifest_path"])
        for row in all_rows
    )
    row_identity_membership = Counter((row["storage_key"], row["q_number"]) for row in all_rows)
    manifest_membership_duplicate_count = sum(1 for count in manifest_membership.values() if count > 1)
    row_identity_multiple_manifest_count = sum(1 for count in row_identity_membership.values() if count != 1)
    accepted_source_pdf_count = len({row["source_pdf"] for row in all_rows})
    source_pdf_with_zero_rows = [
        summary["source_pdf"]
        for summary in source_summaries
        if summary["accepted_row_count"] == 0
    ]

    blocker_count = (
        len(duplicate_row_identities)
        + len(source_missing)
        + len(crop_blockers)
        + missing_crop_files
        + missing_rendered_pages
        + manifest_membership_duplicate_count
        + row_identity_multiple_manifest_count
        + len(source_pdf_with_zero_rows)
    )
    gate_pass = blocker_count == 0

    generated_token = generated_on.replace("-", "_")
    full_row_manifest_path = manifest_root / f"9702_full_row_surface_{generated_token}_manifest_v1.json"
    full_crop_manifest_path = manifest_root / f"9702_full_crop_manifest_{generated_token}_v1.json"
    row_report_json_path = report_root / f"{generated_on}-9702-full-row-surface-gate.json"
    row_report_md_path = report_root / f"{generated_on}-9702-full-row-surface-gate.md"
    crop_report_json_path = report_root / f"{generated_on}-9702-full-crop-render-gate.json"
    crop_report_md_path = report_root / f"{generated_on}-9702-full-crop-render-gate.md"

    shard_closeouts = []
    for result in shard_results:
        shard = result["shard"]
        counts = {
            "accepted_rows": len(result["rows"]),
            "source_pdf_count": shard["source_pdf_count"],
            "rendered_pages": result["rendered_pages"],
            "missing_candidate_count": len(result["missing"]),
            "ambiguous_candidate_count": len(result["ambiguous"]),
            "rejected_false_positive_candidate_count": len(result["rejected"]),
            "crop_rows_complete": sum(1 for row in result["rows"] if row.get("crop_status") == "complete"),
            "missing_crop_files": sum(1 for row in result["rows"] if not row.get("crop_paths")),
            "missing_rendered_pages": sum(1 for row in result["rows"] if not row.get("rendered_pdf_page_paths")),
        }
        shard_closeout = {
            "schema_version": SHARD_CLOSEOUT_SCHEMA,
            "generated_on": generated_on,
            "subject_code": SUBJECT_CODE,
            "shard_id": shard["shard_id"],
            "gate_status": "passed" if counts["missing_crop_files"] == 0 and counts["missing_rendered_pages"] == 0 else "blocked",
            "production_ready_claimed": False,
            "counts": counts,
            "artifacts": {
                "input_manifest": shard["input_manifest_path"],
                "page_chain_surface_manifest": shard["surface_manifest_path"],
                "aggregate_row_surface_manifest": repo_path(full_row_manifest_path, workspace_root=workspace_root),
                "aggregate_crop_manifest": repo_path(full_crop_manifest_path, workspace_root=workspace_root),
            },
            "boundary": {
                "row_surface_crop_readiness_only": True,
                "visual_acceptance_claimed": False,
                "text_normalization_claimed": False,
                "authority_alignment_claimed": False,
                "production_ready_claimed": False,
                "external_vlm_or_api_calls": 0,
                "db_search_read_model_rag_writes": 0,
            },
            "unpromoted_locator_candidates": {
                "missing": result["missing"],
                "ambiguous": result["ambiguous"],
                "rejected_false_positive_candidates": result["rejected"],
            },
        }
        closeout_json_path = report_root / f"{generated_on}-{shard['shard_id']}-row-surface-crop-closeout.json"
        closeout_md_path = report_root / f"{generated_on}-{shard['shard_id']}-row-surface-crop-closeout.md"
        shard_closeouts.append(
            {
                "shard_id": shard["shard_id"],
                "json_path": repo_path(closeout_json_path, workspace_root=workspace_root),
                "md_path": repo_path(closeout_md_path, workspace_root=workspace_root),
                "counts": counts,
                "payload": shard_closeout,
            }
        )

    full_row_manifest = {
        "schema_version": FULL_ROW_SURFACE_SCHEMA,
        "manifest_id": full_row_manifest_path.name.replace(".json", ""),
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "stage": "9702_full_row_surface_crop_render_only",
        "production_ready_claimed": False,
        "source_inventory_path": repo_path(source_inventory_path, workspace_root=workspace_root),
        "source_pdf_count": len([record for record in records if record.get("status") == "pass"]),
        "accepted_source_pdf_count": accepted_source_pdf_count,
        "item_count": len(all_rows),
        "shard_count": len(shards),
        "shards": [
            {
                "shard_id": result["shard"]["shard_id"],
                "input_manifest_path": result["shard"]["input_manifest_path"],
                "page_chain_surface_manifest_path": result["shard"]["surface_manifest_path"],
                "accepted_rows": len(result["rows"]),
                "source_pdf_count": result["shard"]["source_pdf_count"],
            }
            for result in shard_results
        ],
        "boundary": {
            "row_surface_crop_readiness_only": True,
            "visual_acceptance_claimed": False,
            "canonical_question_text_claimed": False,
            "normalized_plain_text_claimed": False,
            "authority_alignment_claimed": False,
            "db_consumption_claimed": False,
            "search_consumption_claimed": False,
            "rag_consumption_claimed": False,
            "production_ready_claimed": False,
            "external_vlm_or_api_calls": 0,
            "db_search_read_model_rag_writes": 0,
        },
        "items": all_rows,
    }
    full_crop_manifest = {
        "schema_version": FULL_CROP_MANIFEST_SCHEMA,
        "manifest_id": full_crop_manifest_path.name.replace(".json", ""),
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "source_row_surface_manifest_path": repo_path(full_row_manifest_path, workspace_root=workspace_root),
        "output_root": repo_path(output_root, workspace_root=workspace_root),
        "production_ready_claimed": False,
        "item_count": len(all_crop_items),
        "items": all_crop_items,
    }

    row_counts = {
        "phase1_source_pdf_count": len([record for record in records if record.get("status") == "pass"]),
        "source_pdf_count_with_accepted_rows": accepted_source_pdf_count,
        "source_pdf_with_zero_accepted_rows": len(source_pdf_with_zero_rows),
        "accepted_rows": len(all_rows),
        "duplicate_storage_key_q_number_rows": len(duplicate_row_identities),
        "row_identity_multiple_manifest_count": row_identity_multiple_manifest_count,
        "manifest_membership_duplicate_count": manifest_membership_duplicate_count,
        "unpromoted_missing_candidate_count": len(all_missing),
        "unpromoted_ambiguous_candidate_count": len(all_ambiguous),
        "rejected_false_positive_candidate_count": len(all_rejected),
        "blocker_count": blocker_count,
    }
    crop_counts = {
        "crop_rows_total": len(all_crop_items),
        "crop_rows_complete": sum(1 for row in all_crop_items if row.get("crop_status") == "complete"),
        "missing_crop_files": missing_crop_files,
        "missing_rendered_pages": missing_rendered_pages,
        "crop_image_paths": len(crop_paths),
        "rendered_page_paths_referenced_by_rows": len(rendered_page_paths),
        "rendered_pages_generated": rendered_page_count,
        "multi_page_rows": sum(1 for row in all_crop_items if len(row.get("page_indices") or []) > 1),
        "duplicate_storage_key_q_number_rows": len(duplicate_row_identities),
        "blocker_count": blocker_count,
    }

    common_artifacts = {
        "full_row_surface_manifest": repo_path(full_row_manifest_path, workspace_root=workspace_root),
        "full_crop_manifest": repo_path(full_crop_manifest_path, workspace_root=workspace_root),
        "page_chain_surface_manifests": [result["shard"]["surface_manifest_path"] for result in shard_results],
        "input_manifests": [result["shard"]["input_manifest_path"] for result in shard_results],
        "shard_closeouts": [
            {"shard_id": item["shard_id"], "json_path": item["json_path"], "md_path": item["md_path"]}
            for item in shard_closeouts
        ],
    }
    unpromoted = {
        "missing": all_missing,
        "ambiguous": all_ambiguous,
        "rejected_false_positive_candidates": all_rejected,
    }
    row_report = {
        "schema_version": ROW_GATE_SCHEMA,
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "gate_status": "passed" if gate_pass else "blocked",
        "production_ready_claimed": False,
        "external_vlm_or_api_calls": 0,
        "db_search_read_model_rag_writes": 0,
        "artifacts": common_artifacts,
        "counts": row_counts,
        "source_summaries": source_summaries,
        "shard_strategy": [
            {
                key: value
                for key, value in result["shard"].items()
                if key != "records"
            }
            for result in shard_results
        ],
        "unpromoted_locator_candidates": unpromoted,
        "blockers": {
            "duplicate_row_identities": duplicate_row_identities,
            "source_missing": source_missing,
            "source_pdf_with_zero_accepted_rows": source_pdf_with_zero_rows,
            "crop_blockers": crop_blockers,
        },
        "claim_boundary": {
            "row_surface_crop_readiness_only": True,
            "visual_acceptance_claimed": False,
            "text_normalization_claimed": False,
            "authority_alignment_claimed": False,
            "db_search_read_model_rag_consumption_claimed": False,
            "production_ready_claimed": False,
        },
    }
    crop_report = {
        "schema_version": CROP_GATE_SCHEMA,
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "gate_status": "passed" if gate_pass else "blocked",
        "production_ready_claimed": False,
        "external_vlm_or_api_calls": 0,
        "db_search_read_model_rag_writes": 0,
        "artifacts": common_artifacts,
        "counts": crop_counts,
        "blockers": crop_blockers,
        "unpromoted_locator_candidates": unpromoted,
        "claim_boundary": {
            "row_surface_crop_readiness_only": True,
            "visual_acceptance_claimed": False,
            "text_normalization_claimed": False,
            "authority_alignment_claimed": False,
            "db_search_read_model_rag_consumption_claimed": False,
            "production_ready_claimed": False,
        },
    }

    for result in shard_results:
        shard = result["shard"]
        input_manifest_path = manifest_root / f"{shard['shard_id']}_input_v1.json"
        surface_manifest_path = manifest_root / f"{shard['shard_id']}_page_chain_surface_v1.json"
        write_json(
            input_manifest_path,
            input_manifest_for_shard(
                shard=shard,
                generated_on=generated_on,
                source_inventory_path=source_inventory_path,
                workspace_root=workspace_root,
            ),
        )
        write_json(
            surface_manifest_path,
            surface_manifest_for_shard(
                shard=shard,
                generated_on=generated_on,
                rows=result["rows"],
                unpromoted_summary={
                    "missing": len(result["missing"]),
                    "ambiguous": len(result["ambiguous"]),
                    "rejected_false_positive_candidates": len(result["rejected"]),
                },
            ),
        )

    write_json(full_row_manifest_path, full_row_manifest)
    write_json(full_crop_manifest_path, full_crop_manifest)
    write_json(row_report_json_path, row_report)
    write_json(crop_report_json_path, crop_report)
    row_report_md_path.parent.mkdir(parents=True, exist_ok=True)
    crop_report_md_path.parent.mkdir(parents=True, exist_ok=True)
    row_report_md_path.write_text(render_row_gate_markdown(row_report), encoding="utf-8")
    crop_report_md_path.write_text(render_crop_gate_markdown(crop_report), encoding="utf-8")

    for item in shard_closeouts:
        closeout_json_path = report_root / Path(item["json_path"]).name
        closeout_md_path = report_root / Path(item["md_path"]).name
        write_json(closeout_json_path, item["payload"])
        closeout_md_path.write_text(render_shard_closeout_markdown(item["payload"]), encoding="utf-8")

    return {"row_report": row_report, "crop_report": crop_report}


def render_row_gate_markdown(report: dict[str, Any]) -> str:
    counts = report["counts"]
    lines = [
        "# 9702 full row-surface gate",
        "",
        f"- generated_on: `{report['generated_on']}`",
        f"- gate_status: `{report['gate_status']}`",
        "- scope: `row-surface/crop readiness only`",
        "- production_ready_claimed: `false`",
        "- external VLM/API calls: `0`",
        "- DB/search/read-model/RAG writes: `0`",
        "",
        "## Counts",
        "",
        f"- phase1_source_pdf_count: `{counts['phase1_source_pdf_count']}`",
        f"- source_pdf_count_with_accepted_rows: `{counts['source_pdf_count_with_accepted_rows']}`",
        f"- accepted_rows: `{counts['accepted_rows']}`",
        f"- duplicate_storage_key_q_number_rows: `{counts['duplicate_storage_key_q_number_rows']}`",
        f"- unpromoted_missing_candidate_count: `{counts['unpromoted_missing_candidate_count']}`",
        f"- unpromoted_ambiguous_candidate_count: `{counts['unpromoted_ambiguous_candidate_count']}`",
        f"- rejected_false_positive_candidate_count: `{counts['rejected_false_positive_candidate_count']}`",
        f"- blocker_count: `{counts['blocker_count']}`",
        "",
        "## Artifacts",
        "",
        f"- full_row_surface_manifest: `{report['artifacts']['full_row_surface_manifest']}`",
        f"- full_crop_manifest: `{report['artifacts']['full_crop_manifest']}`",
        f"- shard_manifest_count: `{len(report['artifacts']['page_chain_surface_manifests'])}`",
        f"- shard_closeout_count: `{len(report['artifacts']['shard_closeouts'])}`",
        "",
        "## Boundary",
        "",
        "This gate records deterministic row-surface and crop/render evidence only. It does not claim visual acceptance, normalized text, authority alignment, local consumption, production writes, or production readiness.",
    ]
    return "\n".join(lines) + "\n"


def render_crop_gate_markdown(report: dict[str, Any]) -> str:
    counts = report["counts"]
    lines = [
        "# 9702 full crop/render gate",
        "",
        f"- generated_on: `{report['generated_on']}`",
        f"- gate_status: `{report['gate_status']}`",
        "- scope: `row-surface/crop readiness only`",
        "- production_ready_claimed: `false`",
        "- external VLM/API calls: `0`",
        "- DB/search/read-model/RAG writes: `0`",
        "",
        "## Counts",
        "",
        f"- crop_rows_total: `{counts['crop_rows_total']}`",
        f"- crop_rows_complete: `{counts['crop_rows_complete']}`",
        f"- missing_crop_files: `{counts['missing_crop_files']}`",
        f"- missing_rendered_pages: `{counts['missing_rendered_pages']}`",
        f"- crop_image_paths: `{counts['crop_image_paths']}`",
        f"- rendered_page_paths_referenced_by_rows: `{counts['rendered_page_paths_referenced_by_rows']}`",
        f"- rendered_pages_generated: `{counts['rendered_pages_generated']}`",
        f"- multi_page_rows: `{counts['multi_page_rows']}`",
        f"- blocker_count: `{counts['blocker_count']}`",
        "",
        "## Boundary",
        "",
        "This gate validates local render/crop presence and nonblank image evidence only. Visual review, text normalization, authority alignment, and production DB/search/read-model/RAG writes remain out of scope.",
    ]
    return "\n".join(lines) + "\n"


def render_shard_closeout_markdown(report: dict[str, Any]) -> str:
    counts = report["counts"]
    lines = [
        f"# 9702 {report['shard_id']} row-surface/crop closeout",
        "",
        f"- generated_on: `{report['generated_on']}`",
        f"- gate_status: `{report['gate_status']}`",
        "- production_ready_claimed: `false`",
        "",
        "## Counts",
        "",
        f"- source_pdf_count: `{counts['source_pdf_count']}`",
        f"- accepted_rows: `{counts['accepted_rows']}`",
        f"- crop_rows_complete: `{counts['crop_rows_complete']}`",
        f"- missing_crop_files: `{counts['missing_crop_files']}`",
        f"- missing_rendered_pages: `{counts['missing_rendered_pages']}`",
        f"- missing_candidate_count: `{counts['missing_candidate_count']}`",
        f"- ambiguous_candidate_count: `{counts['ambiguous_candidate_count']}`",
        f"- rejected_false_positive_candidate_count: `{counts['rejected_false_positive_candidate_count']}`",
        "",
        "## Boundary",
        "",
        "Shard closeout is local row-surface/crop evidence only; downstream visual/text/authority/production phases remain unclaimed.",
    ]
    return "\n".join(lines) + "\n"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build 9702 full row-surface and crop/render gate artifacts.")
    parser.add_argument("--generated-on", default=DEFAULT_GENERATED_ON)
    parser.add_argument("--source-inventory", type=Path, default=DEFAULT_SOURCE_INVENTORY_PATH)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--manifest-root", type=Path, default=DEFAULT_MANIFEST_ROOT)
    parser.add_argument("--report-root", type=Path, default=DEFAULT_REPORT_ROOT)
    parser.add_argument("--render-scale", type=float, default=1.35)
    parser.add_argument("--max-pages-per-row", type=int, default=8)
    parser.add_argument("--padding-points", type=float, default=20.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    workspace_root = Path.cwd()
    generated_on = args.generated_on or date.today().isoformat()
    result = build_gate(
        workspace_root=workspace_root,
        generated_on=generated_on,
        source_inventory_path=args.source_inventory,
        output_root=args.output_root,
        manifest_root=args.manifest_root,
        report_root=args.report_root,
        render_scale=args.render_scale,
        max_pages_per_row=args.max_pages_per_row,
        padding_points=args.padding_points,
    )
    output = {
        "row_gate_status": result["row_report"]["gate_status"],
        "crop_gate_status": result["crop_report"]["gate_status"],
        "row_counts": result["row_report"]["counts"],
        "crop_counts": result["crop_report"]["counts"],
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if output["row_gate_status"] == "passed" and output["crop_gate_status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
