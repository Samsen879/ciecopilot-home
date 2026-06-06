#!/usr/bin/env python3
"""Build the local-only 9231 WM-final crop/render/surface-ref gate."""
from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.build_9231_pilot_shard_crop_gate_v1 import (  # noqa: E402
    build_9231_pilot_shard_crop_gate,
)


SCHEMA_VERSION = "9231_wm_final_crop_render_gate_v1"
CROP_MANIFEST_SCHEMA_VERSION = "9231_wm_final_crop_manifest_v1"
LOCAL_METHOD = "pymupdf_text_words_question_band_v1"
DEFAULT_S20_REVALIDATION_SHARD_IDS = (
    "9231_p1_s20_standard_001",
    "9231_p2_s20_standard_001",
    "9231_p3_s20_standard_001",
    "9231_p4_s20_standard_001",
)
DEFAULT_W19_GENERATION_SHARD_IDS = (
    "9231_p1_w19_standard_001",
    "9231_p2_w19_standard_001",
)
DEFAULT_EXPECTED_TOTAL_ROWS = 150
DEFAULT_EXPECTED_S20_ROWS = 84
DEFAULT_EXPECTED_W19_ROWS = 66
DEFAULT_GENERATED_ON = "2026-06-06"
DEFAULT_FREEZE_MANIFEST_PATH = Path("data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json")
DEFAULT_REMEDIATION_REPORT_PATH = Path("docs/reports/2026-06-06-9231-wm-source-remediation-gate.json")


def _resolve_path(path_value: str | Path, *, workspace_root: Path) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return workspace_root / path


def _display_path(path_value: str | Path, *, workspace_root: Path) -> str:
    path = Path(path_value)
    try:
        return path.resolve().relative_to(workspace_root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _surface_manifest_path(manifest_root: Path, shard_id: str) -> Path:
    return manifest_root / f"{shard_id}_page_chain_surface_v1.json"


def _input_manifest_path(manifest_root: Path, shard_id: str) -> Path:
    return manifest_root / f"{shard_id}_input_v1.json"


def _surface_identity(manifest_root: Path, shard_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    identities: dict[str, list[dict[str, Any]]] = {}
    for shard_id in shard_ids:
        payload = _read_json(_surface_manifest_path(manifest_root, shard_id))
        items = payload.get("items")
        if not isinstance(items, list):
            raise RuntimeError(f"surface_manifest_items_not_list:{shard_id}")
        identities[shard_id] = [
            {
                "storage_key": item.get("storage_key"),
                "q_number": item.get("q_number"),
                "source_pdf": item.get("source_pdf"),
            }
            for item in items
            if isinstance(item, dict)
        ]
    return identities


def _identity_row_count(identity: dict[str, list[dict[str, Any]]]) -> int:
    return sum(len(rows) for rows in identity.values())


def _validate_expected_counts(
    *,
    s20_identity: dict[str, list[dict[str, Any]]],
    w19_identity: dict[str, list[dict[str, Any]]],
    expected_total_rows: int,
    expected_s20_rows: int,
    expected_w19_rows: int,
) -> None:
    s20_rows = _identity_row_count(s20_identity)
    w19_rows = _identity_row_count(w19_identity)
    total_rows = s20_rows + w19_rows
    mismatches = []
    if s20_rows != expected_s20_rows:
        mismatches.append(f"expected_s20_rows={expected_s20_rows} actual_s20_rows={s20_rows}")
    if w19_rows != expected_w19_rows:
        mismatches.append(f"expected_w19_rows={expected_w19_rows} actual_w19_rows={w19_rows}")
    if total_rows != expected_total_rows:
        mismatches.append(f"expected_total_rows={expected_total_rows} actual_total_rows={total_rows}")
    if mismatches:
        raise RuntimeError("; ".join(mismatches))


def _load_source_remediation_gate(path: Path) -> dict[str, Any]:
    payload = _read_json(path)
    summary = payload.get("summary") if isinstance(payload.get("summary"), dict) else {}
    gate_status = payload.get("gate_status")
    lifted = summary.get("freeze_posture_lifted_by_machine_gate") is True
    after_red_pixels = int(summary.get("total_after_red_pixels") or 0)
    if gate_status != "pass" or not lifted or after_red_pixels != 0:
        raise RuntimeError(
            "source_remediation_gate_not_pass:"
            f"gate_status={gate_status} "
            f"freeze_posture_lifted_by_machine_gate={lifted} "
            f"total_after_red_pixels={after_red_pixels}"
        )
    return payload


def _load_freeze_manifest(path: Path) -> dict[str, Any]:
    payload = _read_json(path)
    items = payload.get("items")
    if not isinstance(items, list):
        raise RuntimeError("freeze_manifest_items_not_list")
    return payload


def _phase_for_storage_keys(result: dict[str, Any], phase: str) -> dict[str, str]:
    phase_by_storage_key: dict[str, str] = {}
    for item in result["crop_manifest"].get("items") or []:
        if isinstance(item, dict) and item.get("storage_key"):
            phase_by_storage_key[str(item["storage_key"])] = phase
    return phase_by_storage_key


def _final_crop_items(
    *,
    s20_result: dict[str, Any],
    w19_result: dict[str, Any],
    workspace_root: Path,
    source_freeze_manifest_path: Path,
    source_remediation_report_path: Path,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    groups = (
        (s20_result, "s20_revalidated_after_source_remediation"),
        (w19_result, "w19_generated_after_source_remediation"),
    )
    for result, phase in groups:
        for item in result["crop_manifest"].get("items") or []:
            if not isinstance(item, dict):
                continue
            updated = deepcopy(item)
            updated.update(
                {
                    "wm_final_crop_phase": phase,
                    "source_freeze_manifest": _display_path(source_freeze_manifest_path, workspace_root=workspace_root),
                    "source_remediation_report": _display_path(
                        source_remediation_report_path,
                        workspace_root=workspace_root,
                    ),
                    "source_remediation_status": "source_bytes_clean_red_pixel_gate_pass",
                    "source_freeze_status": "source_remediated_crop_render_complete",
                    "source_cleanliness_status": "wm_source_remediated_machine_gate_pass",
                    "production_ready_claimed": False,
                    "db_consumption_claimed": False,
                    "search_consumption_claimed": False,
                    "rag_consumption_claimed": False,
                    "external_vlm_or_api_used": False,
                    "external_ocr_rerun_used": False,
                }
            )
            items.append(updated)
    return items


def _crop_manifest(
    *,
    items: list[dict[str, Any]],
    s20_shard_ids: list[str],
    w19_shard_ids: list[str],
    generated_on: str,
    workspace_root: Path,
    source_freeze_manifest_path: Path,
    source_remediation_report_path: Path,
) -> dict[str, Any]:
    generated_token = generated_on.replace("-", "_")
    return {
        "schema_version": CROP_MANIFEST_SCHEMA_VERSION,
        "manifest_id": f"9231_wm_final_crop_manifest_{generated_token}_v1",
        "generated_on": generated_on,
        "subject_code": "9231",
        "scope": {
            "stage": "9231 WM-final crop/render/surface-ref gate",
            "source_freeze_manifest": _display_path(source_freeze_manifest_path, workspace_root=workspace_root),
            "source_remediation_report": _display_path(source_remediation_report_path, workspace_root=workspace_root),
            "s20_revalidation_shard_ids": s20_shard_ids,
            "w19_generation_shard_ids": w19_shard_ids,
            "surface_update": "six WM-final page-chain surface manifests receive remediated local crop/render references only",
            "not_question_plain_text": True,
            "not_authority_or_consumption_gate": True,
            "not_vlm_reviewed": True,
        },
        "item_count": len(items),
        "items": items,
    }


def _row_identity_checks(
    *,
    before_identity: dict[str, list[dict[str, Any]]],
    updated_surfaces: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    for record in updated_surfaces:
        payload = record["payload"]
        shard_id = record["shard_id"]
        before = before_identity[shard_id]
        after = [
            {
                "storage_key": item.get("storage_key"),
                "q_number": item.get("q_number"),
                "source_pdf": item.get("source_pdf"),
            }
            for item in payload.get("items") or []
            if isinstance(item, dict)
        ]
        checks.append(
            {
                "shard_id": shard_id,
                "row_count_before": len(before),
                "row_count_after": len(after),
                "identity_preserved": before == after,
            }
        )
    return checks


def _count_artifact_paths(items: list[dict[str, Any]]) -> int:
    paths: set[str] = set()
    for item in items:
        for key in ("rendered_pdf_page_paths", "crop_paths"):
            for path in item.get(key) or []:
                paths.add(str(path))
    return len(paths)


def _path_exists_and_non_empty(path_value: str, *, workspace_root: Path) -> bool:
    path = _resolve_path(path_value, workspace_root=workspace_root)
    return path.exists() and path.is_file() and path.stat().st_size > 0


def _artifact_validation_summary(items: list[dict[str, Any]], *, workspace_root: Path) -> dict[str, Any]:
    missing_crop_paths: list[str] = []
    missing_render_paths: list[str] = []
    for item in items:
        for crop_path in item.get("crop_paths") or []:
            if not _path_exists_and_non_empty(str(crop_path), workspace_root=workspace_root):
                missing_crop_paths.append(str(crop_path))
        for render_path in item.get("rendered_pdf_page_paths") or []:
            if not _path_exists_and_non_empty(str(render_path), workspace_root=workspace_root):
                missing_render_paths.append(str(render_path))
    return {
        "missing_or_empty_crop_files": missing_crop_paths,
        "missing_or_empty_rendered_pages": missing_render_paths,
        "crop_files_non_empty": not missing_crop_paths,
        "rendered_pages_non_empty": not missing_render_paths,
    }


def _final_surface_record(
    record: dict[str, Any],
    *,
    phase_by_storage_key: dict[str, str],
    generated_on: str,
    workspace_root: Path,
    source_freeze_manifest_path: Path,
    source_remediation_report_path: Path,
    source_remediation_gate: dict[str, Any],
) -> dict[str, Any]:
    payload = deepcopy(record["payload"])
    payload.pop("pilot_crop_gate", None)
    summary = source_remediation_gate.get("summary") if isinstance(source_remediation_gate.get("summary"), dict) else {}
    payload["surface_status"] = "wm_final_crop_render_complete_pending_visual_review"
    payload["source_remediation_gate"] = {
        "schema_version": source_remediation_gate.get("schema_version"),
        "generated_on": source_remediation_gate.get("generated_on"),
        "gate_status": source_remediation_gate.get("gate_status"),
        "freeze_posture_lifted_by_machine_gate": summary.get("freeze_posture_lifted_by_machine_gate") is True,
        "total_after_red_pixels": summary.get("total_after_red_pixels"),
        "report": _display_path(source_remediation_report_path, workspace_root=workspace_root),
    }
    payload["wm_final_crop_gate"] = {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "stage": "9231 WM-final crop/render/surface-ref gate",
        "source_freeze_manifest": _display_path(source_freeze_manifest_path, workspace_root=workspace_root),
        "source_remediation_report": _display_path(source_remediation_report_path, workspace_root=workspace_root),
        "local_extraction_crop_method": LOCAL_METHOD,
        "external_vlm_or_api_calls": 0,
        "external_ocr_reruns": 0,
        "not_production_ready": True,
        "not_question_plain_text": True,
        "not_db_search_rag_consumption": True,
    }

    updated_rows = 0
    complete_rows = 0
    blocker_rows = 0
    for item in payload.get("items") or []:
        if not isinstance(item, dict):
            continue
        storage_key = str(item.get("storage_key") or "")
        phase = phase_by_storage_key.get(storage_key)
        if not phase:
            continue
        updated_rows += 1
        if item.get("crop_status") == "complete":
            complete_rows += 1
        if item.get("crop_status") == "blocked":
            blocker_rows += 1
        item.update(
            {
                "wm_final_crop_phase": phase,
                "source_freeze_status": "source_remediated_crop_render_complete",
                "source_freeze_reason": "source_pdf_bytes_remediated_by_machine_gate_and_crop_render_complete",
                "source_cleanliness_status": "wm_source_remediated_machine_gate_pass",
                "source_remediation_status": "source_bytes_clean_red_pixel_gate_pass",
                "source_remediation_generated_on": source_remediation_gate.get("generated_on"),
                "source_remediation_report": _display_path(source_remediation_report_path, workspace_root=workspace_root),
                "eligible_for_clean_source_wave": True,
                "eligible_for_visual_review_closeout": True,
                "eligible_for_question_plain_text_v1": False,
                "eligible_for_question_plain_text_v2": False,
                "eligible_for_normalized_plain_text_consumption_gate": False,
                "surface_evidence_status": "local_wm_final_crop_render_complete_pending_visual_review",
                "page_chain_surface_status": "wm_final_crop_render_complete_pending_visual_review",
                "visual_review_required": True,
                "visual_review_reason": "local_wm_final_crop_render_complete_pending_visual_review_not_vlm_reviewed",
                "text_evidence_status": item.get("text_evidence_status") or "not_extracted",
                "normalized_plain_text": item.get("normalized_plain_text"),
                "text_consumption_status": "not_ready_missing_question_plain_text",
                "text_only_ready": False,
                "image_context_required": True,
                "production_ready_claimed": False,
                "db_consumption_claimed": False,
                "search_consumption_claimed": False,
                "rag_consumption_claimed": False,
                "external_vlm_or_api_used": False,
                "external_ocr_rerun_used": False,
            }
        )
    return {
        **record,
        "shard_id": str(payload.get("shard_id") or record.get("shard_id") or ""),
        "payload": payload,
        "updated_rows": updated_rows,
        "complete_rows": complete_rows,
        "blocker_rows": blocker_rows,
    }


def _per_shard_surface_counts(updated_surfaces: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    counts: dict[str, dict[str, Any]] = {}
    for record in updated_surfaces:
        shard_id = str(record["shard_id"])
        counts[shard_id] = {
            "surface_manifest": record["repo_path"],
            "surface_rows_updated": record["updated_rows"],
            "crop_rows_complete": record["complete_rows"],
            "blocker_rows": record["blocker_rows"],
        }
    return counts


def _build_report(
    *,
    crop_items: list[dict[str, Any]],
    crop_manifest: dict[str, Any],
    s20_result: dict[str, Any],
    w19_result: dict[str, Any],
    s20_shard_ids: list[str],
    w19_shard_ids: list[str],
    updated_surfaces: list[dict[str, Any]],
    source_freeze_manifest: dict[str, Any],
    source_remediation_gate: dict[str, Any],
    source_freeze_manifest_path: Path,
    source_remediation_report_path: Path,
    row_identity_checks: list[dict[str, Any]],
    generated_on: str,
    workspace_root: Path,
) -> dict[str, Any]:
    crop_status_counts = Counter(str(item.get("crop_status")) for item in crop_items if isinstance(item, dict))
    complete_rows = sum(1 for item in crop_items if item.get("crop_status") == "complete")
    missing_crops = sum(1 for item in crop_items if not item.get("crop_paths"))
    blocker_rows = sum(1 for item in crop_items if item.get("crop_status") == "blocked")
    multi_page_rows = sum(1 for item in crop_items if len(item.get("page_indices") or []) > 1)
    artifact_validation = _artifact_validation_summary(crop_items, workspace_root=workspace_root)
    source_summary = source_remediation_gate.get("summary") if isinstance(source_remediation_gate.get("summary"), dict) else {}
    freeze_summary = (
        source_freeze_manifest.get("summary") if isinstance(source_freeze_manifest.get("summary"), dict) else {}
    )
    row_identity_preserved = all(check["identity_preserved"] for check in row_identity_checks)
    blockers = (
        list(s20_result["report"].get("blockers") or [])
        + list(w19_result["report"].get("blockers") or [])
        + [
            {
                "reason": "row_identity_changed",
                "shard_id": check["shard_id"],
            }
            for check in row_identity_checks
            if not check["identity_preserved"]
        ]
    )
    if artifact_validation["missing_or_empty_crop_files"] or artifact_validation["missing_or_empty_rendered_pages"]:
        blockers.append({"reason": "missing_or_empty_crop_or_render_artifact"})
    gate_status = (
        "wm_final_crop_render_complete_pending_visual_review"
        if crop_items
        and complete_rows == len(crop_items)
        and missing_crops == 0
        and blocker_rows == 0
        and row_identity_preserved
        and artifact_validation["crop_files_non_empty"]
        and artifact_validation["rendered_pages_non_empty"]
        else "wm_final_crop_render_blocked"
    )
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "subject_code": "9231",
        "gate_status": gate_status,
        "boundary": {
            "not_production_ready": True,
            "not_canonical_question_text": True,
            "not_question_plain_text_v1_or_v2": True,
            "not_authority_alignment": True,
            "not_normalized_plain_text_consumption_gate": True,
            "external_vlm_or_api_calls": 0,
            "external_ocr_reruns": 0,
            "db_consumption_claimed": False,
            "search_consumption_claimed": False,
            "read_model_consumption_claimed": False,
            "rag_consumption_claimed": False,
            "visual_review_required": True,
        },
        "source_freeze_gate": {
            "manifest": _display_path(source_freeze_manifest_path, workspace_root=workspace_root),
            "generated_on": source_freeze_manifest.get("generated_on"),
            "summary": freeze_summary,
        },
        "source_remediation_gate": {
            "report": _display_path(source_remediation_report_path, workspace_root=workspace_root),
            "schema_version": source_remediation_gate.get("schema_version"),
            "generated_on": source_remediation_gate.get("generated_on"),
            "gate_status": source_remediation_gate.get("gate_status"),
            "summary": source_summary,
        },
        "summary": {
            "s20_revalidation_shards": len(s20_shard_ids),
            "w19_generation_shards": len(w19_shard_ids),
            "input_shard_manifests": len(s20_shard_ids) + len(w19_shard_ids),
            "surface_manifests_updated": len(updated_surfaces),
            "surface_rows_updated": sum(record["updated_rows"] for record in updated_surfaces),
            "s20_revalidated_rows": len(s20_result["crop_manifest"].get("items") or []),
            "w19_generated_rows": len(w19_result["crop_manifest"].get("items") or []),
            "total_rows": len(crop_items),
            "crop_rows_complete": complete_rows,
            "missing_crops": missing_crops,
            "blocker_rows": blocker_rows,
            "multi_page_rows": multi_page_rows,
            "visual_review_required_rows": sum(
                1 for item in crop_items if item.get("visual_review_required") is True
            ),
            "pdfs_rendered": int(s20_result["report"]["summary"].get("pdfs_rendered") or 0)
            + int(w19_result["report"]["summary"].get("pdfs_rendered") or 0),
            "rendered_pages": int(s20_result["report"]["summary"].get("rendered_pages") or 0)
            + int(w19_result["report"]["summary"].get("rendered_pages") or 0),
            "local_png_artifact_files": _count_artifact_paths(crop_items),
            "crop_files_non_empty": artifact_validation["crop_files_non_empty"],
            "rendered_pages_non_empty": artifact_validation["rendered_pages_non_empty"],
            "missing_or_empty_crop_files": len(artifact_validation["missing_or_empty_crop_files"]),
            "missing_or_empty_rendered_pages": len(artifact_validation["missing_or_empty_rendered_pages"]),
            "row_identity_preserved": row_identity_preserved,
            "external_vlm_or_api_calls": 0,
            "external_ocr_reruns": 0,
            "production_ready_claimed": False,
            "db_search_rag_consumption_claimed": False,
            "crop_status_counts": dict(sorted(crop_status_counts.items())),
        },
        "s20_revalidation_shard_ids": s20_shard_ids,
        "w19_generation_shard_ids": w19_shard_ids,
        "input_manifest_paths": [
            _display_path(_input_manifest_path(Path("data/manifests"), shard_id), workspace_root=Path("."))
            for shard_id in s20_shard_ids + w19_shard_ids
        ],
        "crop_manifest": crop_manifest["manifest_id"],
        "per_shard": {
            **(s20_result["report"].get("per_shard") or {}),
            **(w19_result["report"].get("per_shard") or {}),
        },
        "per_shard_surface_updates": _per_shard_surface_counts(updated_surfaces),
        "row_identity_checks": row_identity_checks,
        "artifact_validation": artifact_validation,
        "blockers": blockers,
        "pdfs": list(s20_result["report"].get("pdfs") or []) + list(w19_result["report"].get("pdfs") or []),
    }


def render_9231_wm_final_crop_render_gate_markdown(
    report: dict[str, Any],
    *,
    crop_manifest_path: str | Path,
) -> str:
    summary = report["summary"]
    source_summary = report.get("source_remediation_gate", {}).get("summary", {})
    lines = [
        "# 9231 WM-Final Crop/Render Gate",
        "",
        f"- generated_on: `{report['generated_on']}`",
        f"- gate_status: `{report['gate_status']}`",
        "- This gate is local deterministic crop/render/surface-ref evidence only.",
        "- No external VLM/API or OCR rerun was used.",
        "- No question_plain_text_v1/v2, authority alignment, DB/search/read-model/RAG, or production gate was run.",
        "",
        "## Source Remediation Input",
        "",
        "| metric | value |",
        "| --- | ---: |",
        f"| remediation gate status | `{report.get('source_remediation_gate', {}).get('gate_status')}` |",
        f"| target source PDFs | {source_summary.get('target_source_pdf_count', 0)} |",
        f"| verified or replaced source PDFs | {source_summary.get('verified_or_replaced_count', 0)} |",
        f"| red-pixel gate passes | {source_summary.get('red_pixel_gate_pass_count', 0)} |",
        f"| after red pixels | {source_summary.get('total_after_red_pixels', 0)} |",
        f"| freeze posture lifted | {str(source_summary.get('freeze_posture_lifted_by_machine_gate') is True).lower()} |",
        "",
        "## Gate Counts",
        "",
        "| metric | value |",
        "| --- | ---: |",
        f"| S20 revalidation shards | {summary['s20_revalidation_shards']} |",
        f"| W19 generation shards | {summary['w19_generation_shards']} |",
        f"| total rows | {summary['total_rows']} |",
        f"| S20 revalidated rows | {summary['s20_revalidated_rows']} |",
        f"| W19 generated rows | {summary['w19_generated_rows']} |",
        f"| crop rows complete | {summary['crop_rows_complete']} |",
        f"| missing crops | {summary['missing_crops']} |",
        f"| blocker rows | {summary['blocker_rows']} |",
        f"| row identity preserved | {str(summary['row_identity_preserved']).lower()} |",
        f"| rendered PDFs | {summary['pdfs_rendered']} |",
        f"| rendered pages | {summary['rendered_pages']} |",
        f"| local PNG artifact references | {summary['local_png_artifact_files']} |",
        f"| crop files non-empty | {str(summary['crop_files_non_empty']).lower()} |",
        f"| rendered pages non-empty | {str(summary['rendered_pages_non_empty']).lower()} |",
        "",
        "## Target Shards",
        "",
        "| shard | rows | complete | missing crops | multi-page | blockers |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for shard_id, counts in report.get("per_shard", {}).items():
        lines.append(
            f"| `{shard_id}` | {counts['total_rows']} | {counts['crop_rows_complete']} | {counts['missing_crops']} | {counts['multi_page_rows']} | {counts['blocker_rows']} |"
        )
    lines.extend(
        [
            "",
            "## Artifacts",
            "",
            "| artifact | path |",
            "| --- | --- |",
            f"| final crop manifest | `{crop_manifest_path}` |",
            f"| source freeze manifest | `{report.get('source_freeze_gate', {}).get('manifest')}` |",
            f"| source remediation report | `{report.get('source_remediation_gate', {}).get('report')}` |",
        ]
    )
    for shard_id, counts in report.get("per_shard_surface_updates", {}).items():
        lines.append(f"| updated surface manifest `{shard_id}` | `{counts['surface_manifest']}` |")
    lines.extend(["", "## Blockers", ""])
    if report.get("blockers"):
        lines.extend(["| reason | shard/storage |", "| --- | --- |"])
        for blocker in report["blockers"]:
            lines.append(
                f"| `{blocker.get('reason')}` | `{blocker.get('shard_id') or blocker.get('storage_key')}` |"
            )
    else:
        lines.append("- none")
    lines.extend(
        [
            "",
            "## Boundary",
            "",
            "- Visual review remains a later gate.",
            "- question_plain_text_v1/v2 generation remains a later gate.",
            "- Authority alignment and local normalized_plain_text consumption remain later gates.",
            "- Production DB/search/read-model/RAG gates remain later gates.",
            "",
        ]
    )
    return "\n".join(lines)


def build_9231_wm_final_crop_render_gate(
    *,
    s20_shard_ids: list[str] | tuple[str, ...] = DEFAULT_S20_REVALIDATION_SHARD_IDS,
    w19_shard_ids: list[str] | tuple[str, ...] = DEFAULT_W19_GENERATION_SHARD_IDS,
    manifest_root: str | Path = "data/manifests",
    s20_output_root: str | Path = "data/crops/9231-wave2-shards",
    w19_output_root: str | Path = "data/crops/9231-wm-final",
    workspace_root: str | Path = ".",
    freeze_manifest_path: str | Path = DEFAULT_FREEZE_MANIFEST_PATH,
    source_remediation_report_path: str | Path = DEFAULT_REMEDIATION_REPORT_PATH,
    generated_on: str | None = None,
    expected_total_rows: int = DEFAULT_EXPECTED_TOTAL_ROWS,
    expected_s20_rows: int = DEFAULT_EXPECTED_S20_ROWS,
    expected_w19_rows: int = DEFAULT_EXPECTED_W19_ROWS,
    render_scale: float = 2.0,
    max_pages: int = 4,
    padding_points: float = 18.0,
) -> dict[str, Any]:
    workspace = Path(workspace_root).resolve()
    manifest_root_path = _resolve_path(manifest_root, workspace_root=workspace)
    freeze_manifest_resolved = _resolve_path(freeze_manifest_path, workspace_root=workspace)
    remediation_report_resolved = _resolve_path(source_remediation_report_path, workspace_root=workspace)
    generated = generated_on or date.today().isoformat()
    s20_ids = [str(value) for value in s20_shard_ids]
    w19_ids = [str(value) for value in w19_shard_ids]
    s20_identity = _surface_identity(manifest_root_path, s20_ids)
    w19_identity = _surface_identity(manifest_root_path, w19_ids)
    _validate_expected_counts(
        s20_identity=s20_identity,
        w19_identity=w19_identity,
        expected_total_rows=expected_total_rows,
        expected_s20_rows=expected_s20_rows,
        expected_w19_rows=expected_w19_rows,
    )
    source_remediation_gate = _load_source_remediation_gate(remediation_report_resolved)
    source_freeze_manifest = _load_freeze_manifest(freeze_manifest_resolved)

    s20_result = build_9231_pilot_shard_crop_gate(
        pilot_shard_ids=s20_ids,
        manifest_root=manifest_root_path,
        output_root=s20_output_root,
        workspace_root=workspace,
        generated_on=generated,
        render_scale=render_scale,
        max_pages=max_pages,
        padding_points=padding_points,
    )
    w19_result = build_9231_pilot_shard_crop_gate(
        pilot_shard_ids=w19_ids,
        manifest_root=manifest_root_path,
        output_root=w19_output_root,
        workspace_root=workspace,
        generated_on=generated,
        render_scale=render_scale,
        max_pages=max_pages,
        padding_points=padding_points,
    )
    phase_by_storage_key = {
        **_phase_for_storage_keys(s20_result, "s20_revalidated_after_source_remediation"),
        **_phase_for_storage_keys(w19_result, "w19_generated_after_source_remediation"),
    }
    updated_surfaces = [
        _final_surface_record(
            {**record, "shard_id": str(record["payload"].get("shard_id") or "")},
            phase_by_storage_key=phase_by_storage_key,
            generated_on=generated,
            workspace_root=workspace,
            source_freeze_manifest_path=freeze_manifest_resolved,
            source_remediation_report_path=remediation_report_resolved,
            source_remediation_gate=source_remediation_gate,
        )
        for record in list(s20_result["updated_surface_manifests"]) + list(w19_result["updated_surface_manifests"])
    ]
    crop_items = _final_crop_items(
        s20_result=s20_result,
        w19_result=w19_result,
        workspace_root=workspace,
        source_freeze_manifest_path=freeze_manifest_resolved,
        source_remediation_report_path=remediation_report_resolved,
    )
    crop_manifest = _crop_manifest(
        items=crop_items,
        s20_shard_ids=s20_ids,
        w19_shard_ids=w19_ids,
        generated_on=generated,
        workspace_root=workspace,
        source_freeze_manifest_path=freeze_manifest_resolved,
        source_remediation_report_path=remediation_report_resolved,
    )
    before_identity = {**s20_identity, **w19_identity}
    row_identity_checks = _row_identity_checks(before_identity=before_identity, updated_surfaces=updated_surfaces)
    if not all(check["identity_preserved"] for check in row_identity_checks):
        raise RuntimeError("row_identity_changed")
    report = _build_report(
        crop_items=crop_items,
        crop_manifest=crop_manifest,
        s20_result=s20_result,
        w19_result=w19_result,
        s20_shard_ids=s20_ids,
        w19_shard_ids=w19_ids,
        updated_surfaces=updated_surfaces,
        source_freeze_manifest=source_freeze_manifest,
        source_remediation_gate=source_remediation_gate,
        source_freeze_manifest_path=freeze_manifest_resolved,
        source_remediation_report_path=remediation_report_resolved,
        row_identity_checks=row_identity_checks,
        generated_on=generated,
        workspace_root=workspace,
    )
    return {
        "crop_manifest": crop_manifest,
        "report": report,
        "updated_surface_manifests": updated_surfaces,
    }


def write_9231_wm_final_crop_render_gate_outputs(
    result: dict[str, Any],
    *,
    crop_manifest_path: str | Path,
    report_json_path: str | Path,
    report_md_path: str | Path,
) -> dict[str, Path]:
    crop_manifest_path = Path(crop_manifest_path)
    report_json_path = Path(report_json_path)
    report_md_path = Path(report_md_path)
    _write_json(crop_manifest_path, result["crop_manifest"])
    _write_json(report_json_path, result["report"])
    report_md_path.parent.mkdir(parents=True, exist_ok=True)
    report_md_path.write_text(
        render_9231_wm_final_crop_render_gate_markdown(
            result["report"],
            crop_manifest_path=crop_manifest_path.as_posix(),
        ),
        encoding="utf-8",
    )
    for record in result["updated_surface_manifests"]:
        _write_json(record["path"], record["payload"])
    return {
        "crop_manifest_path": crop_manifest_path,
        "report_json_path": report_json_path,
        "report_md_path": report_md_path,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build local-only 9231 WM-final crop/render gate artifacts.")
    parser.add_argument("--s20-shard-id", action="append", default=[])
    parser.add_argument("--w19-shard-id", action="append", default=[])
    parser.add_argument("--manifest-root", type=Path, default=Path("data/manifests"))
    parser.add_argument("--s20-output-root", type=Path, default=Path("data/crops/9231-wave2-shards"))
    parser.add_argument("--w19-output-root", type=Path, default=Path("data/crops/9231-wm-final"))
    parser.add_argument("--freeze-manifest", type=Path, default=DEFAULT_FREEZE_MANIFEST_PATH)
    parser.add_argument("--source-remediation-report", type=Path, default=DEFAULT_REMEDIATION_REPORT_PATH)
    parser.add_argument(
        "--crop-manifest",
        type=Path,
        default=Path("data/manifests/9231_wm_final_crop_manifest_2026_06_06_v1.json"),
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        default=Path("docs/reports/2026-06-06-9231-wm-final-crop-render-gate.json"),
    )
    parser.add_argument(
        "--report-md",
        type=Path,
        default=Path("docs/reports/2026-06-06-9231-wm-final-crop-render-gate.md"),
    )
    parser.add_argument("--generated-on", default=DEFAULT_GENERATED_ON)
    parser.add_argument("--expected-total-rows", type=int, default=DEFAULT_EXPECTED_TOTAL_ROWS)
    parser.add_argument("--expected-s20-rows", type=int, default=DEFAULT_EXPECTED_S20_ROWS)
    parser.add_argument("--expected-w19-rows", type=int, default=DEFAULT_EXPECTED_W19_ROWS)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--max-pages", type=int, default=4)
    parser.add_argument("--padding-points", type=float, default=18.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    s20_ids = args.s20_shard_id or list(DEFAULT_S20_REVALIDATION_SHARD_IDS)
    w19_ids = args.w19_shard_id or list(DEFAULT_W19_GENERATION_SHARD_IDS)
    result = build_9231_wm_final_crop_render_gate(
        s20_shard_ids=s20_ids,
        w19_shard_ids=w19_ids,
        manifest_root=args.manifest_root,
        s20_output_root=args.s20_output_root,
        w19_output_root=args.w19_output_root,
        workspace_root=Path.cwd(),
        freeze_manifest_path=args.freeze_manifest,
        source_remediation_report_path=args.source_remediation_report,
        generated_on=args.generated_on,
        expected_total_rows=args.expected_total_rows,
        expected_s20_rows=args.expected_s20_rows,
        expected_w19_rows=args.expected_w19_rows,
        render_scale=args.render_scale,
        max_pages=args.max_pages,
        padding_points=args.padding_points,
    )
    write_9231_wm_final_crop_render_gate_outputs(
        result,
        crop_manifest_path=args.crop_manifest,
        report_json_path=args.report_json,
        report_md_path=args.report_md,
    )
    summary = result["report"]["summary"]
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if result["report"]["gate_status"] == "wm_final_crop_render_complete_pending_visual_review" else 1


if __name__ == "__main__":
    raise SystemExit(main())
