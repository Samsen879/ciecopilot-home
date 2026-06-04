#!/usr/bin/env python3
"""Build shard-scoped local artifacts from corrected 9709 new-paper v2 crops."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import hashlib
import json
from pathlib import Path
from typing import Any


SURFACE_SCHEMA_VERSION = "9709_new_paper_page_chain_surface_v2"
LANE_RESULTS_SCHEMA_VERSION = "9709_new_paper_shard_lane_results_v2"
AUTHORITY_SIDECAR_SCHEMA_VERSION = "9709_new_paper_authority_sidecar_v2"
SUMMARY_SCHEMA_VERSION = "9709_new_paper_shard_artifacts_summary_v2"
PENDING_SURFACE_STATUS = "pre_shard_crops_ready_pending_visual_review"
ACCEPTED_SURFACE_STATUS = "local_visual_review_accepted"
LOCAL_REVIEW_MODEL = "codex-local-visual-review"
DEFAULT_CURRICULUM_VERSION_TAG = "2025-2027_v1"


class ShardArtifactError(ValueError):
    """Raised when v2 shard artifact generation must fail closed."""


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write_json(path: str | Path, payload: dict[str, Any]) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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


def _hash_payload(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _normalize_bool(value: Any, *, field_name: str, storage_key: str) -> bool:
    if isinstance(value, bool):
        return value
    raise ShardArtifactError(f"{storage_key}: local visual disposition requires boolean {field_name}.")


def _normalize_topic(value: Any, *, field_name: str, storage_key: str) -> str:
    normalized = str(value or "").strip()
    if not normalized:
        raise ShardArtifactError(f"{storage_key}: local visual disposition requires {field_name}.")
    return normalized


def _require_v2_schema(payload: dict[str, Any], *, label: str) -> None:
    schema = str(payload.get("schema_version") or "")
    if "_v2" not in schema:
        raise ShardArtifactError(f"{label} must be a corrected v2 payload; got schema_version={schema!r}.")


def _items(payload: dict[str, Any], *, label: str) -> list[dict[str, Any]]:
    items = payload.get("items")
    if not isinstance(items, list):
        raise ShardArtifactError(f"{label} must contain an items array.")
    if not all(isinstance(item, dict) for item in items):
        raise ShardArtifactError(f"{label} items must be objects.")
    return items


def _index_by_storage_key(items: list[dict[str, Any]], *, label: str) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    duplicates: list[str] = []
    for item in items:
        storage_key = str(item.get("storage_key") or "")
        if not storage_key:
            raise ShardArtifactError(f"{label} contains an item without storage_key.")
        if storage_key in index:
            duplicates.append(storage_key)
            continue
        index[storage_key] = item
    if duplicates:
        raise ShardArtifactError(f"{label} contains duplicate storage_key values: {', '.join(sorted(duplicates))}")
    return index


def _load_visual_dispositions(path: str | Path | None) -> dict[str, dict[str, Any]]:
    if not path:
        return {}
    payload = _load_json(path)
    _require_v2_schema(payload, label="visual dispositions")
    return _index_by_storage_key(_items(payload, label="visual dispositions"), label="visual dispositions")


def _load_curriculum_seed(path: str | Path | None) -> tuple[set[str], str]:
    if not path:
        return set(), DEFAULT_CURRICULUM_VERSION_TAG
    payload = _load_json(path)
    nodes = payload.get("nodes")
    if not isinstance(nodes, list):
        raise ShardArtifactError("curriculum seed must contain a nodes array.")
    topic_paths = {
        str(node.get("topic_path") or "").strip()
        for node in nodes
        if isinstance(node, dict) and str(node.get("topic_path") or "").strip()
    }
    version_tag = str(payload.get("version_tag") or DEFAULT_CURRICULUM_VERSION_TAG).strip()
    return topic_paths, version_tag or DEFAULT_CURRICULUM_VERSION_TAG


def _validate_local_paths(item: dict[str, Any], *, workspace_root: Path) -> None:
    storage_key = str(item.get("storage_key") or "")
    for field in ("rendered_pdf_page_paths", "crop_paths"):
        paths = _as_list(item.get(field))
        if not paths:
            raise ShardArtifactError(f"{storage_key}: {field} is empty.")
        missing = [
            path
            for path in paths
            if not _resolve_path(str(path), workspace_root=workspace_root).exists()
        ]
        if missing:
            raise ShardArtifactError(f"{storage_key}: missing {field}: {missing[:3]}")


def _validate_crop_row(crop_item: dict[str, Any], *, workspace_root: Path) -> None:
    storage_key = str(crop_item.get("storage_key") or "")
    if crop_item.get("crop_status") != "complete":
        raise ShardArtifactError(f"{storage_key}: crop_status must be complete.")
    mechanical_validation = crop_item.get("mechanical_validation")
    if not isinstance(mechanical_validation, dict) or not all(
        mechanical_validation.get(field) is True
        for field in (
            "crop_files_exist",
            "crop_images_non_empty",
            "crop_dimensions_reasonable",
            "referenced_rendered_pages_exist",
        )
    ):
        raise ShardArtifactError(f"{storage_key}: mechanical_validation is not complete.")
    _validate_local_paths(crop_item, workspace_root=workspace_root)


def _review_status_for_item(
    *,
    storage_key: str,
    disposition: dict[str, Any] | None,
) -> tuple[str, bool]:
    if not disposition:
        return "pending", True
    if disposition.get("disposition") != "accepted":
        raise ShardArtifactError(f"{storage_key}: local visual disposition must be accepted before authority flow.")
    return "accepted", False


def _surface_item_from_crop(
    *,
    manifest_item: dict[str, Any],
    crop_item: dict[str, Any],
    disposition: dict[str, Any] | None,
) -> dict[str, Any]:
    storage_key = str(manifest_item.get("storage_key") or "")
    visual_review_status, requires_review = _review_status_for_item(storage_key=storage_key, disposition=disposition)
    if disposition:
        diagram_present = _normalize_bool(disposition.get("diagram_present"), field_name="diagram_present", storage_key=storage_key)
        formula_dense = _normalize_bool(disposition.get("formula_dense"), field_name="formula_dense", storage_key=storage_key)
        table_heavy = _normalize_bool(disposition.get("table_heavy"), field_name="table_heavy", storage_key=storage_key)
        route_hint = str(disposition.get("route_hint") or ("diagram_lane" if diagram_present else "ocr_lane"))
        surface_status = ACCEPTED_SURFACE_STATUS
    else:
        diagram_present = manifest_item.get("diagram_present")
        formula_dense = manifest_item.get("formula_dense")
        table_heavy = manifest_item.get("table_heavy")
        route_hint = manifest_item.get("route_hint")
        surface_status = PENDING_SURFACE_STATUS

    return {
        **manifest_item,
        "diagram_present": diagram_present,
        "formula_dense": formula_dense,
        "table_heavy": table_heavy,
        "route_hint": route_hint,
        "gate_critical": bool(manifest_item.get("gate_critical", False)),
        "descriptor_required": True,
        "surface_evidence_status": surface_status,
        "requires_review": requires_review,
        "visual_review_status": visual_review_status,
        "visual_review_method": str(disposition.get("reviewed_by") or LOCAL_REVIEW_MODEL) if disposition else None,
        "external_vlm_api_calls": 0,
        "page_chain_surface_status": "projected_from_corrected_v2_pre_shard_crops",
        "source_rendered_page_paths": _as_list(crop_item.get("rendered_pdf_page_paths")),
        "review_crop_paths": _as_list(crop_item.get("crop_paths")),
        "rendered_pdf_page_paths": _as_list(crop_item.get("rendered_pdf_page_paths")),
        "crop_paths": _as_list(crop_item.get("crop_paths")),
        "page_indices": _as_list(crop_item.get("page_indices")),
        "page_range": crop_item.get("page_range"),
        "crop_records": _as_list(crop_item.get("crop_records")),
        "crop_status": crop_item.get("crop_status"),
        "local_extraction_crop_method": crop_item.get("local_extraction_crop_method"),
        "visual_disposition": disposition,
    }


def _layout_hints(surface_item: dict[str, Any]) -> list[str]:
    return [
        f"source_pdf={surface_item.get('source_pdf')}",
        f"q_number={surface_item.get('q_number')}",
        f"page_indices={surface_item.get('page_indices')}",
        f"review_crop_paths={surface_item.get('review_crop_paths')}",
    ]


def _lane_result_for_item(surface_item: dict[str, Any], disposition: dict[str, Any]) -> dict[str, Any]:
    storage_key = str(surface_item.get("storage_key") or "")
    visual_topic_guess = _normalize_topic(
        disposition.get("visual_topic_guess") or disposition.get("authority_topic_path"),
        field_name="visual_topic_guess",
        storage_key=storage_key,
    )
    route = str(disposition.get("route_hint") or surface_item.get("route_hint") or "ocr_lane")
    question_text = str(disposition.get("question_text") or disposition.get("question_text_summary") or "").strip()
    evidence_entries = [
        {"field": "ocr_text", "value": question_text},
        {"field": "formula_latex_list", "value": _as_list(disposition.get("formula_latex_list"))},
        {"field": "subquestion_blocks", "value": _as_list(disposition.get("subquestion_blocks"))},
        {"field": "layout_hints", "value": _layout_hints(surface_item)},
        {"field": "diagram_present", "value": surface_item.get("diagram_present")},
        {"field": "diagram_elements", "value": _as_list(disposition.get("diagram_elements"))},
        {"field": "spatial_evidence", "value": _as_list(disposition.get("spatial_evidence"))},
        {"field": "visual_topic_guess", "value": visual_topic_guess},
        {"field": "visual_topic_guess_status", "value": "accepted_by_operator_review"},
        {"field": "local_visual_review_method", "value": str(disposition.get("reviewed_by") or LOCAL_REVIEW_MODEL)},
        {"field": "review_summary", "value": str(disposition.get("review_notes") or "").strip() or None},
    ]
    return {
        "route": route,
        "model": LOCAL_REVIEW_MODEL,
        "prompt_template_version": "local_visual_review_v2",
        "region": "local",
        "base_url": None,
        "api_key_scope": None,
        "input_asset_id": storage_key,
        "input_asset_hash": _hash_payload(
            {
                "storage_key": storage_key,
                "crop_paths": surface_item.get("review_crop_paths"),
                "rendered_pdf_page_paths": surface_item.get("source_rendered_page_paths"),
                "question_text": question_text,
                "visual_topic_guess": visual_topic_guess,
            }
        ),
        "response_schema_version": "9709_new_paper_local_visual_review_v2",
        "confidence": 1.0,
        "failure_reason": None,
        "output": {
            "summary": question_text or None,
            "evidence": evidence_entries,
            "warnings": [],
        },
    }


def _authority_sidecar_item(
    *,
    surface_item: dict[str, Any],
    disposition: dict[str, Any],
    curriculum_version_tag: str,
    visual_dispositions_path: str | Path | None,
    crop_manifest_path: str | Path,
    workspace_root: Path,
) -> dict[str, Any]:
    storage_key = str(surface_item.get("storage_key") or "")
    topic_path = _normalize_topic(disposition.get("authority_topic_path"), field_name="authority_topic_path", storage_key=storage_key)
    visual_locator = (
        _display_path(visual_dispositions_path, workspace_root=workspace_root)
        if visual_dispositions_path
        else "local_visual_dispositions_inline"
    )
    crop_locator = _display_path(crop_manifest_path, workspace_root=workspace_root)
    return {
        "storage_key": storage_key,
        "authority_input_pack": {
            "canonical_primary_topic_path": topic_path,
            "curriculum_version_tag": curriculum_version_tag,
            "topic_authority_sources": [
                "operator_visual_review",
                "repo_corrected_v2_pre_shard_crop_manifest",
            ],
            "topic_authority_refs": [
                {
                    "kind": "operator_visual_review",
                    "locator": visual_locator,
                    "note": (
                        f"storage_key={storage_key}; local visual review accepted crop boundary, "
                        f"surface flags, and topic mapping to {topic_path}; external_vlm_api_calls=0."
                    ),
                },
                {
                    "kind": "repo_corrected_v2_pre_shard_crop_manifest",
                    "locator": crop_locator,
                    "note": (
                        f"storage_key={storage_key}; page_indices={surface_item.get('page_indices')}; "
                        "crop_status=complete from corrected v2 pre-shard crop manifest."
                    ),
                },
            ],
            "cross_paper_dependency_note": disposition.get("cross_paper_dependency_note"),
        },
    }


def build_new_paper_shard_artifacts(
    *,
    input_manifest_path: str | Path,
    crop_manifest_path: str | Path,
    visual_dispositions_path: str | Path | None = None,
    curriculum_seed_path: str | Path | None = None,
    workspace_root: str | Path = ".",
    generated_on: str | None = None,
) -> dict[str, Any]:
    workspace_root_path = Path(workspace_root)
    generated = generated_on or date.today().isoformat()
    input_manifest = _load_json(input_manifest_path)
    crop_manifest = _load_json(crop_manifest_path)
    _require_v2_schema(input_manifest, label="input manifest")
    _require_v2_schema(crop_manifest, label="crop manifest")

    manifest_items = _items(input_manifest, label="input manifest")
    crop_items_all = _items(crop_manifest, label="crop manifest")
    manifest_by_key = _index_by_storage_key(manifest_items, label="input manifest")
    shard_id = str(input_manifest.get("shard_id") or "")
    if not shard_id:
        raise ShardArtifactError("input manifest requires shard_id.")
    crop_items = [item for item in crop_items_all if item.get("shard_id") == shard_id]
    crop_by_key = _index_by_storage_key(crop_items, label=f"crop manifest shard {shard_id}")
    if len(crop_by_key) != len(manifest_by_key):
        raise ShardArtifactError(
            f"{shard_id}: crop row count {len(crop_by_key)} does not match input row count {len(manifest_by_key)}."
        )

    visual_dispositions = _load_visual_dispositions(visual_dispositions_path)
    accepted_visual = bool(visual_dispositions)
    if accepted_visual and set(visual_dispositions) != set(manifest_by_key):
        missing = sorted(set(manifest_by_key) - set(visual_dispositions))
        extra = sorted(set(visual_dispositions) - set(manifest_by_key))
        raise ShardArtifactError(f"{shard_id}: visual disposition keys mismatch; missing={missing[:3]}, extra={extra[:3]}.")

    curriculum_topics, curriculum_version_tag = _load_curriculum_seed(curriculum_seed_path)
    surface_items: list[dict[str, Any]] = []
    lane_results: list[dict[str, Any]] = []
    sidecar_items: list[dict[str, Any]] = []
    review_status_counts: Counter[str] = Counter()

    for manifest_item in manifest_items:
        storage_key = str(manifest_item.get("storage_key") or "")
        crop_item = crop_by_key.get(storage_key)
        if not crop_item:
            raise ShardArtifactError(f"{storage_key}: missing corrected v2 crop row.")
        _validate_crop_row(crop_item, workspace_root=workspace_root_path)
        disposition = visual_dispositions.get(storage_key)
        surface_item = _surface_item_from_crop(
            manifest_item=manifest_item,
            crop_item=crop_item,
            disposition=disposition,
        )
        surface_items.append(surface_item)
        review_status_counts[str(surface_item.get("visual_review_status") or "unknown")] += 1

        if disposition:
            topic_path = _normalize_topic(disposition.get("authority_topic_path"), field_name="authority_topic_path", storage_key=storage_key)
            if curriculum_topics and topic_path not in curriculum_topics:
                raise ShardArtifactError(f"{storage_key}: authority_topic_path is not in curriculum seed: {topic_path}")
            lane_results.append(_lane_result_for_item(surface_item, disposition))
            sidecar_items.append(
                _authority_sidecar_item(
                    surface_item=surface_item,
                    disposition=disposition,
                    curriculum_version_tag=curriculum_version_tag,
                    visual_dispositions_path=visual_dispositions_path,
                    crop_manifest_path=crop_manifest_path,
                    workspace_root=workspace_root_path,
                )
            )

    visual_review_status = "accepted" if accepted_visual else "pending"
    surface_manifest = {
        **{key: value for key, value in input_manifest.items() if key != "items"},
        "schema_version": SURFACE_SCHEMA_VERSION,
        "manifest_id": f"{input_manifest.get('manifest_id')}_page_chain_surface_v2",
        "source_manifest_id": input_manifest.get("manifest_id"),
        "source_crop_manifest_id": crop_manifest.get("manifest_id"),
        "generated_on": generated,
        "scope": {
            "shard_id": shard_id,
            "input_manifest_path": _display_path(input_manifest_path, workspace_root=workspace_root_path),
            "crop_manifest_path": _display_path(crop_manifest_path, workspace_root=workspace_root_path),
            "artifact_stage": "formal shard page-chain surface from corrected v2 pre-shard crops",
            "visual_review_status": visual_review_status,
            "not_production_ready": True,
            "not_vlm_reviewed": True,
            "external_vlm_api_calls": 0,
        },
        "item_count": len(surface_items),
        "items": surface_items,
    }
    lane_results_payload = {
        "schema_version": LANE_RESULTS_SCHEMA_VERSION,
        "source_manifest_id": surface_manifest["manifest_id"],
        "generated_on": generated,
        "review_method": LOCAL_REVIEW_MODEL if accepted_visual else None,
        "external_vlm_api_calls": 0,
        "results": lane_results,
    }
    authority_sidecar = {
        "schema_version": AUTHORITY_SIDECAR_SCHEMA_VERSION,
        "sidecar_id": f"{shard_id}_authority_sidecar_v2",
        "subject_code": "9709",
        "curriculum_version_tag": curriculum_version_tag,
        "generated_on": generated,
        "scope": {
            "shard_id": shard_id,
            "manifest_path": surface_manifest["manifest_id"],
            "item_count": len(sidecar_items),
            "visual_review_status": visual_review_status,
            "external_vlm_api_calls": 0,
        },
        "items": sidecar_items,
    }
    summary = {
        "schema_version": SUMMARY_SCHEMA_VERSION,
        "generated_on": generated,
        "shard_id": shard_id,
        "input_manifest": _display_path(input_manifest_path, workspace_root=workspace_root_path),
        "crop_manifest": _display_path(crop_manifest_path, workspace_root=workspace_root_path),
        "visual_dispositions": (
            _display_path(visual_dispositions_path, workspace_root=workspace_root_path)
            if visual_dispositions_path
            else None
        ),
        "surface_items": len(surface_items),
        "lane_result_items": len(lane_results),
        "authority_sidecar_items": len(sidecar_items),
        "visual_review_status": visual_review_status,
        "visual_review_status_counts": dict(sorted(review_status_counts.items())),
        "external_vlm_api_calls": 0,
        "blockers": [],
    }
    return {
        "surface_manifest": surface_manifest,
        "lane_results": lane_results_payload,
        "authority_sidecar": authority_sidecar,
        "summary": summary,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build local v2 shard artifacts for 9709 new-paper rows.")
    parser.add_argument("--input-manifest", required=True, type=Path)
    parser.add_argument("--crop-manifest", required=True, type=Path)
    parser.add_argument("--visual-dispositions", type=Path)
    parser.add_argument("--curriculum-seed", type=Path)
    parser.add_argument("--workspace-root", type=Path, default=Path("."))
    parser.add_argument("--generated-on")
    parser.add_argument("--surface-manifest-out", type=Path)
    parser.add_argument("--lane-results-out", type=Path)
    parser.add_argument("--authority-sidecar-out", type=Path)
    parser.add_argument("--summary-out", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    result = build_new_paper_shard_artifacts(
        input_manifest_path=args.input_manifest,
        crop_manifest_path=args.crop_manifest,
        visual_dispositions_path=args.visual_dispositions,
        curriculum_seed_path=args.curriculum_seed,
        workspace_root=args.workspace_root,
        generated_on=args.generated_on,
    )
    if args.surface_manifest_out:
        _write_json(args.surface_manifest_out, result["surface_manifest"])
    if args.lane_results_out:
        _write_json(args.lane_results_out, result["lane_results"])
    if args.authority_sidecar_out:
        _write_json(args.authority_sidecar_out, result["authority_sidecar"])
    if args.summary_out:
        _write_json(args.summary_out, result["summary"])
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
