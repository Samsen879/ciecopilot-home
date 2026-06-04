#!/usr/bin/env python3
"""Build local-only render/crop evidence for representative 9231 pilot shards."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.build_9709_pre_shard_crop_gate_v1 import (  # noqa: E402
    build_pre_shard_crop_gate,
)


SCHEMA_VERSION = "9231_pilot_shard_crop_gate_v1"
CROP_MANIFEST_SCHEMA_VERSION = "9231_pilot_shard_crop_manifest_v1"
LOCAL_METHOD = "pymupdf_text_words_question_band_v1"
DEFAULT_PILOT_SHARD_IDS = (
    "9231_p1_s25_standard_001",
    "9231_p2_s25_standard_001",
    "9231_p3_s25_standard_001",
    "9231_p4_s25_standard_001",
    "9231_p1_s16_standard_001",
)


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


def _input_manifest_path(manifest_root: Path, shard_id: str) -> Path:
    return manifest_root / f"{shard_id}_input_v1.json"


def _surface_manifest_path(manifest_root: Path, shard_id: str) -> Path:
    return manifest_root / f"{shard_id}_page_chain_surface_v1.json"


def _crop_items_by_storage_key(crop_manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    items = crop_manifest.get("items")
    if not isinstance(items, list):
        return {}
    return {
        str(item.get("storage_key")): item
        for item in items
        if isinstance(item, dict) and item.get("storage_key")
    }


def _pilot_surface_status(rows: list[dict[str, Any]]) -> str:
    if any(row.get("crop_status") == "blocked" for row in rows):
        return "pilot_crop_render_partial_blocked_pending_visual_review"
    return "pilot_crop_render_complete_pending_visual_review"


def _merge_crop_fields(surface_item: dict[str, Any], crop_item: dict[str, Any]) -> dict[str, Any]:
    merged = dict(surface_item)
    crop_status = crop_item.get("crop_status")
    common_flags = {
        "text_evidence_status": surface_item.get("text_evidence_status") or "not_extracted",
        "normalized_plain_text": surface_item.get("normalized_plain_text"),
        "text_consumption_status": "not_ready_missing_question_plain_text",
        "text_only_ready": False,
        "image_context_required": True,
        "requires_review": True,
        "visual_review_required": True,
        "production_ready_claimed": False,
        "db_consumption_claimed": False,
        "search_consumption_claimed": False,
        "rag_consumption_claimed": False,
        "external_vlm_or_api_used": False,
        "external_ocr_rerun_used": False,
    }
    if crop_status == "complete":
        merged.update(
            {
                **common_flags,
                "rendered_pdf_page_paths": list(crop_item.get("rendered_pdf_page_paths") or []),
                "crop_paths": list(crop_item.get("crop_paths") or []),
                "review_crop_paths": list(crop_item.get("crop_paths") or []),
                "crop_records": list(crop_item.get("crop_records") or []),
                "page_indices": list(crop_item.get("page_indices") or []),
                "page_range": crop_item.get("page_range"),
                "crop_status": "complete",
                "local_extraction_crop_method": crop_item.get("local_extraction_crop_method") or LOCAL_METHOD,
                "surface_evidence_status": "local_pilot_crop_render_complete_pending_visual_review",
                "page_chain_surface_status": "pilot_crop_render_complete_pending_visual_review",
                "visual_review_reason": "local_crop_render_complete_pending_visual_review_not_vlm_reviewed",
                "mechanical_validation": crop_item.get("mechanical_validation") or {},
            }
        )
        return merged

    merged.update(
        {
            **common_flags,
            "rendered_pdf_page_paths": list(crop_item.get("rendered_pdf_page_paths") or []),
            "crop_paths": list(crop_item.get("crop_paths") or []),
            "review_crop_paths": [],
            "crop_records": list(crop_item.get("crop_records") or []),
            "page_indices": list(crop_item.get("page_indices") or []),
            "page_range": crop_item.get("page_range"),
            "crop_status": "blocked",
            "crop_blocker_reason": crop_item.get("blocker_reason") or "unknown_crop_blocker",
            "local_extraction_crop_method": crop_item.get("local_extraction_crop_method") or LOCAL_METHOD,
            "surface_evidence_status": "local_pilot_crop_render_blocked_pending_fix",
            "page_chain_surface_status": "pilot_crop_render_blocked_pending_fix",
            "visual_review_reason": "local_crop_render_blocked_not_vlm_reviewed",
            "mechanical_validation": {
                "crop_files_exist": False,
                "crop_images_non_empty": False,
                "referenced_rendered_pages_exist": False,
            },
        }
    )
    return merged


def _updated_surface_manifests(
    *,
    pilot_shard_ids: list[str],
    manifest_root: Path,
    crop_manifest: dict[str, Any],
    generated_on: str,
    workspace_root: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    crop_by_storage_key = _crop_items_by_storage_key(crop_manifest)
    updated: list[dict[str, Any]] = []
    blockers: list[dict[str, Any]] = []

    for shard_id in pilot_shard_ids:
        surface_path = _surface_manifest_path(manifest_root, shard_id)
        if not surface_path.exists():
            blockers.append(
                {
                    "reason": "surface_manifest_missing",
                    "shard_id": shard_id,
                    "surface_manifest_path": _display_path(surface_path, workspace_root=workspace_root),
                }
            )
            continue

        payload = _read_json(surface_path)
        items = payload.get("items")
        if not isinstance(items, list):
            blockers.append(
                {
                    "reason": "surface_manifest_items_not_list",
                    "shard_id": shard_id,
                    "surface_manifest_path": _display_path(surface_path, workspace_root=workspace_root),
                }
            )
            continue

        merged_items: list[dict[str, Any]] = []
        updated_rows = 0
        complete_rows = 0
        blocker_rows = 0
        for item in items:
            if not isinstance(item, dict):
                merged_items.append(item)
                continue
            storage_key = str(item.get("storage_key") or "")
            crop_item = crop_by_storage_key.get(storage_key)
            if not crop_item:
                merged_items.append(item)
                continue
            merged = _merge_crop_fields(item, crop_item)
            merged_items.append(merged)
            updated_rows += 1
            if merged.get("crop_status") == "complete":
                complete_rows += 1
            if merged.get("crop_status") == "blocked":
                blocker_rows += 1

        updated_payload = {
            **payload,
            "items": merged_items,
            "surface_status": _pilot_surface_status(merged_items),
            "pilot_crop_gate": {
                "schema_version": SCHEMA_VERSION,
                "generated_on": generated_on,
                "local_extraction_crop_method": LOCAL_METHOD,
                "external_vlm_or_api_calls": 0,
                "external_ocr_reruns": 0,
                "not_production_ready": True,
                "not_question_plain_text": True,
                "not_db_search_rag_consumption": True,
            },
        }
        updated.append(
            {
                "path": surface_path,
                "repo_path": _display_path(surface_path, workspace_root=workspace_root),
                "payload": updated_payload,
                "updated_rows": updated_rows,
                "complete_rows": complete_rows,
                "blocker_rows": blocker_rows,
            }
        )
    return updated, blockers


def _per_shard_surface_counts(updated_surfaces: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    counts: dict[str, dict[str, Any]] = {}
    for record in updated_surfaces:
        payload = record["payload"]
        shard_id = str(payload.get("shard_id") or Path(record["repo_path"]).name.replace("_page_chain_surface_v1.json", ""))
        counts[shard_id] = {
            "surface_manifest": record["repo_path"],
            "surface_rows_updated": record["updated_rows"],
            "crop_rows_complete": record["complete_rows"],
            "blocker_rows": record["blocker_rows"],
        }
    return counts


def _count_png_files(root: Path) -> int:
    if not root.exists():
        return 0
    return sum(1 for path in root.rglob("*.png") if path.is_file())


def _build_report(
    *,
    crop_report: dict[str, Any],
    crop_manifest: dict[str, Any],
    pilot_shard_ids: list[str],
    manifest_paths: list[Path],
    updated_surfaces: list[dict[str, Any]],
    surface_blockers: list[dict[str, Any]],
    output_root: Path,
    generated_on: str,
    workspace_root: Path,
) -> dict[str, Any]:
    summary = crop_report.get("summary", {})
    surface_rows_updated = sum(record["updated_rows"] for record in updated_surfaces)
    surface_blocker_rows = sum(record["blocker_rows"] for record in updated_surfaces)
    crop_items = crop_manifest.get("items") if isinstance(crop_manifest.get("items"), list) else []
    crop_status_counts = Counter(str(item.get("crop_status")) for item in crop_items if isinstance(item, dict))
    total_rows = int(summary.get("total_rows") or 0)
    blockers = list(crop_report.get("blockers") or []) + surface_blockers
    gate_status = (
        "pilot_crop_render_complete_pending_visual_review"
        if total_rows
        and int(summary.get("missing_crops") or 0) == 0
        and int(summary.get("blocker_rows") or 0) == 0
        and not surface_blockers
        else "pilot_crop_render_blocked"
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
            "not_normalized_plain_text_consumption_gate": True,
            "external_vlm_or_api_calls": 0,
            "external_ocr_reruns": 0,
            "db_consumption_claimed": False,
            "search_consumption_claimed": False,
            "read_model_consumption_claimed": False,
            "rag_consumption_claimed": False,
            "visual_review_required": True,
        },
        "summary": {
            "pilot_shards": len(pilot_shard_ids),
            "input_shard_manifests": len(manifest_paths),
            "surface_manifests_updated": len(updated_surfaces),
            "surface_rows_updated": surface_rows_updated,
            "surface_blocker_rows": surface_blocker_rows,
            "pdfs_rendered": summary.get("pdfs_rendered", 0),
            "rendered_pages": summary.get("rendered_pages", 0),
            "local_png_artifact_files": _count_png_files(output_root),
            "total_rows": total_rows,
            "crop_rows_complete": summary.get("crop_rows_complete", 0),
            "missing_crops": summary.get("missing_crops", 0),
            "multi_page_rows": summary.get("multi_page_rows", 0),
            "blocker_rows": summary.get("blocker_rows", 0),
            "visual_review_required_rows": summary.get("visual_review_required_rows", 0),
            "text_only_ready_rows": 0,
            "image_context_required_rows": total_rows,
            "external_vlm_or_api_calls": 0,
            "external_ocr_reruns": 0,
            "production_ready_claimed": False,
            "db_search_rag_consumption_claimed": False,
            "crop_status_counts": dict(sorted(crop_status_counts.items())),
        },
        "pilot_shard_ids": pilot_shard_ids,
        "input_manifest_paths": [
            _display_path(path, workspace_root=workspace_root)
            for path in manifest_paths
        ],
        "per_shard": crop_report.get("per_shard", {}),
        "per_shard_surface_updates": _per_shard_surface_counts(updated_surfaces),
        "blockers": blockers,
        "pdfs": crop_report.get("pdfs", []),
    }


def render_9231_pilot_shard_crop_gate_markdown(
    report: dict[str, Any],
    *,
    crop_manifest_path: str | Path,
) -> str:
    summary = report["summary"]
    lines = [
        "# 9231 Pilot Shard Crop Gate",
        "",
        f"- generated_on: `{report['generated_on']}`",
        f"- gate_status: `{report['gate_status']}`",
        "- This is not production-ready and does not claim canonical question text.",
        "- No external VLM/API or OCR rerun was used.",
        "- DB/search/read-model/RAG consumption claimed: false.",
        "- Visual review is still required.",
        "",
        "## Repo-Truth Conclusion",
        "",
        (
            "Conclusion: 5 representative 9231 shards have local deterministic render/crop assets and surface crop references, pending visual review, OCR/text evidence, v1/v2 text, and normalized_plain_text consumption gates."
            if report["gate_status"] == "pilot_crop_render_complete_pending_visual_review"
            else "Conclusion: 9231 pilot shard crop gate is blocked and needs local locator/crop fixes before broader rollout."
        ),
        "",
        "## Gate Counts",
        "",
        "| metric | value |",
        "| --- | ---: |",
        f"| pilot shards | {summary['pilot_shards']} |",
        f"| input manifests | {summary['input_shard_manifests']} |",
        f"| surface manifests updated | {summary['surface_manifests_updated']} |",
        f"| total rows | {summary['total_rows']} |",
        f"| crop rows complete | {summary['crop_rows_complete']} |",
        f"| missing crops | {summary['missing_crops']} |",
        f"| blocker rows | {summary['blocker_rows']} |",
        f"| multi-page rows | {summary['multi_page_rows']} |",
        f"| rendered PDFs | {summary['pdfs_rendered']} |",
        f"| rendered pages | {summary['rendered_pages']} |",
        f"| local PNG artifact files | {summary['local_png_artifact_files']} |",
        f"| text-only ready rows | {summary['text_only_ready_rows']} |",
        f"| image-context required rows | {summary['image_context_required_rows']} |",
        "",
        "## Pilot Shards",
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
            f"| crop manifest | `{crop_manifest_path}` |",
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
            "## Next Executable Gates",
            "",
            "- Spot-check representative crop images visually before broad 9231 rollout.",
            "- If visual review passes, run the same local gate across the remaining shard groups.",
            "- Attach OCR/text evidence after crop coverage exists.",
            "- Build question_plain_text_v1/v2 only after row/evidence coverage exists.",
            "- Run a normalized_plain_text local consumption gate before claiming search/read-model/RAG consumption.",
            "",
        ]
    )
    return "\n".join(lines)


def build_9231_pilot_shard_crop_gate(
    *,
    pilot_shard_ids: list[str] | tuple[str, ...] = DEFAULT_PILOT_SHARD_IDS,
    manifest_root: str | Path = "data/manifests",
    output_root: str | Path = "data/crops/9231-pilot-shards",
    workspace_root: str | Path = ".",
    generated_on: str | None = None,
    render_scale: float = 2.0,
    max_pages: int = 4,
    padding_points: float = 18.0,
) -> dict[str, Any]:
    workspace = Path(workspace_root).resolve()
    manifest_root_path = _resolve_path(manifest_root, workspace_root=workspace)
    pilot_ids = [str(value) for value in pilot_shard_ids]
    generated = generated_on or date.today().isoformat()
    manifest_paths = [_input_manifest_path(manifest_root_path, shard_id) for shard_id in pilot_ids]

    crop_result = build_pre_shard_crop_gate(
        manifest_paths=manifest_paths,
        output_root=output_root,
        workspace_root=workspace,
        generated_on=generated,
        render_scale=render_scale,
        max_pages=max_pages,
        padding_points=padding_points,
        crop_manifest_id=f"9231_pilot_shards_{generated.replace('-', '_')}_crop_manifest_v1",
        crop_manifest_schema_version=CROP_MANIFEST_SCHEMA_VERSION,
        source_scope_label=f"{len(pilot_ids)} representative 9231 pilot shard input manifests",
    )
    crop_manifest = crop_result["crop_manifest"]
    crop_manifest["subject_code"] = "9231"
    crop_manifest["scope"].update(
        {
            "stage": "9231 pilot shard render/crop gate",
            "not_question_plain_text": True,
            "not_normalized_plain_text_consumption_gate": True,
            "surface_update": "pilot page-chain surface manifests receive local crop/render references only",
        }
    )

    updated_surfaces, surface_blockers = _updated_surface_manifests(
        pilot_shard_ids=pilot_ids,
        manifest_root=manifest_root_path,
        crop_manifest=crop_manifest,
        generated_on=generated,
        workspace_root=workspace,
    )
    report = _build_report(
        crop_report=crop_result["report"],
        crop_manifest=crop_manifest,
        pilot_shard_ids=pilot_ids,
        manifest_paths=manifest_paths,
        updated_surfaces=updated_surfaces,
        surface_blockers=surface_blockers,
        output_root=_resolve_path(output_root, workspace_root=workspace),
        generated_on=generated,
        workspace_root=workspace,
    )
    return {
        "crop_manifest": crop_manifest,
        "report": report,
        "updated_surface_manifests": updated_surfaces,
    }


def write_9231_pilot_shard_crop_gate_outputs(
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
        render_9231_pilot_shard_crop_gate_markdown(
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
    parser = argparse.ArgumentParser(description="Build local-only 9231 pilot shard crop gate artifacts.")
    parser.add_argument("--pilot-shard-id", action="append", default=[])
    parser.add_argument("--manifest-root", type=Path, default=Path("data/manifests"))
    parser.add_argument("--output-root", type=Path, default=Path("data/crops/9231-pilot-shards"))
    parser.add_argument(
        "--crop-manifest",
        type=Path,
        default=Path("data/manifests/9231_pilot_shards_2026_06_05_crop_manifest_v1.json"),
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        default=Path("docs/reports/2026-06-05-9231-pilot-shard-crop-gate.json"),
    )
    parser.add_argument(
        "--report-md",
        type=Path,
        default=Path("docs/reports/2026-06-05-9231-pilot-shard-crop-gate.md"),
    )
    parser.add_argument("--generated-on", default=None)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--max-pages", type=int, default=4)
    parser.add_argument("--padding-points", type=float, default=18.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    pilot_ids = args.pilot_shard_id or list(DEFAULT_PILOT_SHARD_IDS)
    result = build_9231_pilot_shard_crop_gate(
        pilot_shard_ids=pilot_ids,
        manifest_root=args.manifest_root,
        output_root=args.output_root,
        workspace_root=Path.cwd(),
        generated_on=args.generated_on,
        render_scale=args.render_scale,
        max_pages=args.max_pages,
        padding_points=args.padding_points,
    )
    write_9231_pilot_shard_crop_gate_outputs(
        result,
        crop_manifest_path=args.crop_manifest,
        report_json_path=args.report_json,
        report_md_path=args.report_md,
    )
    summary = result["report"]["summary"]
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if result["report"]["gate_status"] == "pilot_crop_render_complete_pending_visual_review" else 1


if __name__ == "__main__":
    raise SystemExit(main())
