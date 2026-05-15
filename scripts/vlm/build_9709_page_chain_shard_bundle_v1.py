#!/usr/bin/env python3
"""Build shard-scoped 9709 page-chain projection and evidence inputs."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.run_pdf_page_chain_batch_evaluator_v1 import rebuild_payload_from_page_results


SCHEMA_VERSION = "9709_page_chain_shard_bundle_v1"
RESOLUTION_AUDIT_SCHEMA_VERSION = "9709_page_chain_shard_resolution_audit_v1"
PROJECTION_SCHEMA_VERSION = "9709_page_chain_shard_projection_v1"
LANE_RESULTS_SCHEMA_VERSION = "9709_page_chain_shard_lane_results_v1"

FORMULA_RE = re.compile(
    r"(?:\\b(?:sin|cos|tan|ln|log|exp|sqrt|theta|pi)\\b|[=^_√πθ∫∞≤≥<>±]|\\d+[a-zA-Z]|[a-zA-Z]\\^\\d)",
    re.IGNORECASE,
)


class ShardBundleError(RuntimeError):
    """Raised when a page-chain shard cannot be projected safely."""


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write_json(path: str | Path, payload: dict[str, Any]) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _normalize_pdf_path(value: Any) -> str:
    return str(value or "").replace("\\", "/")


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _hash_payload(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _question_key(pdf_path: Any, q_number: Any) -> tuple[str, int | None]:
    try:
        parsed_q = int(q_number)
    except (TypeError, ValueError):
        parsed_q = None
    return (_normalize_pdf_path(pdf_path), parsed_q)


def _load_payloads(payload_dir: str | Path) -> tuple[dict[tuple[str, int], list[dict[str, Any]]], dict[str, dict[str, Any]]]:
    questions_by_key: dict[tuple[str, int], list[dict[str, Any]]] = {}
    payloads_by_pdf: dict[str, dict[str, Any]] = {}

    for payload_path in sorted(Path(payload_dir).glob("*.json")):
        raw_payload = _load_json(payload_path)
        payload = (
            rebuild_payload_from_page_results(raw_payload)
            if raw_payload.get("page_results")
            else raw_payload
        )
        pdf_path = _normalize_pdf_path(payload.get("pdf_path"))
        if not pdf_path:
            continue
        payloads_by_pdf[pdf_path] = payload
        for question in payload.get("questions") or []:
            key = _question_key(pdf_path, question.get("q_number"))
            if key[1] is None:
                continue
            questions_by_key.setdefault(key, []).append(question)

    return questions_by_key, payloads_by_pdf


def _dispositions_by_storage_key(path: str | Path | None) -> dict[str, dict[str, Any]]:
    if not path:
        return {}
    payload = _load_json(path)
    dispositions: dict[str, dict[str, Any]] = {}
    for item in payload.get("items") or []:
        storage_key = str(item.get("storage_key") or "")
        if storage_key:
            dispositions[storage_key] = item
    return dispositions


def _looks_formula_dense(text: str, *, has_diagram: bool) -> bool:
    if has_diagram:
        return False
    return bool(FORMULA_RE.search(text or ""))


def _looks_table_heavy(text: str, diagram_elements: list[Any]) -> bool:
    haystack = " ".join([str(text or ""), *[str(element) for element in diagram_elements]]).lower()
    return any(token in haystack for token in (" table", " tabular", "frequency table", "grid of values"))


def _subquestion_blocks(labels: list[Any], marks: list[Any]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for index, label in enumerate(labels):
        block: dict[str, Any] = {"label": str(label)}
        if index < len(marks):
            block["marks"] = marks[index]
        blocks.append(block)
    if not blocks and marks:
        blocks.append({"label": None, "marks": marks[0] if len(marks) == 1 else marks})
    return blocks


def _rendered_page_paths(*, render_root: str | Path, pdf_path: str, page_indices: list[int]) -> list[str]:
    stem = Path(pdf_path).stem
    return [
        str(Path(render_root) / stem / f"{stem}_page_{page_index + 1:03d}.png")
        for page_index in page_indices
    ]


def _review_crop_paths(*, review_crop_root: str | Path, pdf_path: str, q_number: int) -> list[str]:
    stem = Path(pdf_path).stem
    q_dir = Path(review_crop_root) / stem / f"q{q_number:02d}"
    if not q_dir.exists():
        return []
    return [str(path) for path in sorted(q_dir.glob("*.png"))]


def _lane_output_for_item(
    *,
    manifest_item: dict[str, Any],
    projected_item: dict[str, Any],
    disposition: dict[str, Any] | None,
) -> dict[str, Any]:
    route = projected_item["route"]
    evidence_entries: list[dict[str, Any]] = [
        {"field": "ocr_text", "value": projected_item["ocr_text"]},
        {"field": "formula_latex_list", "value": []},
        {
            "field": "subquestion_blocks",
            "value": _subquestion_blocks(projected_item["subpart_labels"], projected_item["marks"]),
        },
        {
            "field": "layout_hints",
            "value": [
                f"source_pdf={projected_item['source_pdf_path']}",
                f"q_number={projected_item['q_number']}",
                f"page_indices={projected_item['page_indices']}",
            ],
        },
        {"field": "diagram_present", "value": projected_item["diagram_present"]},
        {"field": "diagram_elements", "value": projected_item["diagram_elements"]},
        {
            "field": "spatial_evidence",
            "value": projected_item["raw_page_chain"].get("evidence") or [],
        },
    ]
    warnings: list[str] = []
    if disposition:
        evidence_entries.extend(
            [
                {"field": "requires_review", "value": True},
                {"field": "review_reasons", "value": disposition.get("review_reasons") or []},
                {"field": "ambiguity_flags", "value": disposition.get("ambiguity_flags") or []},
                {"field": "review_summary", "value": disposition.get("review_summary")},
                {"field": "warning_disposition", "value": disposition.get("disposition")},
            ],
        )
        warnings.append(str(disposition.get("warning") or "page_chain_warning"))

    return {
        "route": route,
        "model": projected_item.get("extraction_model") or "qwen3-vl-plus",
        "prompt_template_version": "pdf_page_chain_v1",
        "region": "dashscope-cn",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "api_key_scope": "DASHSCOPE_API_KEY",
        "input_asset_id": manifest_item.get("storage_key"),
        "input_asset_hash": _hash_payload(
            {
                "storage_key": manifest_item.get("storage_key"),
                "crop_output_paths": projected_item.get("review_crop_paths") or [],
                "rendered_page_paths": projected_item.get("source_rendered_page_paths") or [],
                "ocr_text": projected_item.get("ocr_text"),
            },
        ),
        "response_schema_version": "question_evidence_bundle_v1_from_page_chain",
        "confidence": 0.98 if not disposition else 0.9,
        "failure_reason": None,
        "output": {
            "summary": None,
            "evidence": evidence_entries,
            "warnings": warnings,
        },
    }


def build_shard_bundle(
    *,
    manifest_path: str | Path,
    payload_dir: str | Path,
    render_root: str | Path,
    review_crop_root: str | Path,
    output_root: str | Path,
    warning_disposition_path: str | Path | None = None,
    expected_count: int | None = None,
    generated_on: str | None = None,
) -> dict[str, Any]:
    manifest = _load_json(manifest_path)
    manifest_items = manifest.get("items") or []
    questions_by_key, payloads_by_pdf = _load_payloads(payload_dir)
    dispositions = _dispositions_by_storage_key(warning_disposition_path)
    output_root = Path(output_root)

    if expected_count is not None and len(manifest_items) != expected_count:
        raise ShardBundleError(f"manifest item count {len(manifest_items)} does not match expected {expected_count}")

    resolution_items: list[dict[str, Any]] = []
    projection_items: list[dict[str, Any]] = []
    triaged_items: list[dict[str, Any]] = []
    lane_results: list[dict[str, Any]] = []
    errors: list[str] = []

    for index, manifest_item in enumerate(manifest_items, start=1):
        storage_key = str(manifest_item.get("storage_key") or "")
        pdf_path = _normalize_pdf_path(manifest_item.get("source_pdf"))
        q_number = manifest_item.get("q_number")
        key = _question_key(pdf_path, q_number)
        matches = questions_by_key.get(key, [])
        if not matches:
            errors.append(f"{storage_key}: no matching extracted question for {pdf_path} q{q_number}")
            continue
        if len(matches) > 1:
            errors.append(f"{storage_key}: multiple matching extracted questions for {pdf_path} q{q_number}")
            continue

        question = matches[0]
        ocr_text = str(question.get("ocr_text") or "").strip()
        if not ocr_text:
            errors.append(f"{storage_key}: empty ocr_text")
            continue
        diagram_present = question.get("has_diagram")
        if not isinstance(diagram_present, bool):
            errors.append(f"{storage_key}: diagram_present cannot be resolved to a boolean")
            continue
        page_indices = question.get("page_indices") or []
        if not all(isinstance(page_index, int) for page_index in page_indices):
            errors.append(f"{storage_key}: page_indices must be integers")
            continue

        disposition = dispositions.get(storage_key)
        raw_marks = _as_list(question.get("marks"))
        raw_subparts = _as_list(question.get("subpart_labels"))
        marks = _as_list(disposition.get("normalized_marks")) if disposition and "normalized_marks" in disposition else raw_marks
        subpart_labels = (
            _as_list(disposition.get("normalized_subpart_labels"))
            if disposition and "normalized_subpart_labels" in disposition
            else raw_subparts
        )
        diagram_elements = _as_list(question.get("diagram_elements"))
        crop_paths = _review_crop_paths(review_crop_root=review_crop_root, pdf_path=pdf_path, q_number=int(q_number))
        rendered_paths = _rendered_page_paths(render_root=render_root, pdf_path=pdf_path, page_indices=page_indices)
        payload = payloads_by_pdf.get(pdf_path, {})
        route = "diagram_lane" if diagram_present else "ocr_lane"
        formula_dense = _looks_formula_dense(ocr_text, has_diagram=diagram_present)
        table_heavy = _looks_table_heavy(ocr_text, diagram_elements)

        resolution_items.append(
            {
                "storage_key": storage_key,
                "pdf_path": pdf_path,
                "q_number": q_number,
                "source_pdf_watermarked": bool(manifest_item.get("source_pdf_watermarked")),
            },
        )
        projected_item = {
            "index": index,
            "storage_key": storage_key,
            "source_pdf_path": pdf_path,
            "q_number": q_number,
            "ocr_text": ocr_text,
            "diagram_present": diagram_present,
            "diagram_elements": diagram_elements,
            "page_indices": page_indices,
            "marks": marks,
            "subpart_labels": subpart_labels,
            "route": route,
            "formula_dense": formula_dense,
            "table_heavy": table_heavy,
            "extraction_model": payload.get("model"),
            "extraction_schema_version": payload.get("schema_version"),
            "source_rendered_page_paths": rendered_paths,
            "review_crop_paths": crop_paths,
            "raw_page_chain": {
                "marks": raw_marks,
                "subpart_labels": raw_subparts,
                "evidence": _as_list(question.get("evidence")),
            },
            "warning_disposition": disposition,
        }
        projection_items.append(projected_item)

        triaged_item = {
            **manifest_item,
            "primary_topic_path": manifest_item.get("primary_topic_path"),
            "gate_critical": bool(manifest_item.get("gate_critical")),
            "route_hint": route,
            "diagram_present": diagram_present,
            "formula_dense": formula_dense,
            "table_heavy": table_heavy,
            "surface_evidence_status": "page_chain_extracted_pending_review",
            "descriptor_required": True,
            "requires_review": True,
            "page_chain_projection_status": "projected",
            "source_rendered_page_paths": rendered_paths,
            "review_crop_paths": crop_paths,
        }
        triaged_items.append(triaged_item)
        lane_results.append(
            _lane_output_for_item(
                manifest_item=triaged_item,
                projected_item=projected_item,
                disposition=disposition,
            ),
        )

    if errors:
        raise ShardBundleError("; ".join(errors))
    if expected_count is not None and len(projection_items) != expected_count:
        raise ShardBundleError(f"projected item count {len(projection_items)} does not match expected {expected_count}")

    shard_id = next((item.get("shard_id") for item in manifest_items if item.get("shard_id")), None)
    manifest_id = str(manifest.get("manifest_id") or shard_id or "unknown")
    generated = generated_on or date.today().isoformat()
    resolution_audit = {
        "schema_version": RESOLUTION_AUDIT_SCHEMA_VERSION,
        "manifest_id": manifest_id,
        "shard_id": shard_id,
        "generated_on": generated,
        "item_count": len(resolution_items),
        "items": resolution_items,
    }
    projection = {
        "schema_version": PROJECTION_SCHEMA_VERSION,
        "manifest_id": manifest_id,
        "shard_id": shard_id,
        "generated_on": generated,
        "manifest_path": str(manifest_path),
        "payload_dir": str(payload_dir),
        "render_root": str(render_root),
        "review_crop_root": str(review_crop_root),
        "item_count": len(projection_items),
        "items": projection_items,
    }
    triaged_manifest = {
        **{key: value for key, value in manifest.items() if key != "items"},
        "schema_version": "9709_page_chain_triaged_manifest_v1",
        "manifest_id": f"{manifest_id}_page_chain_surface_v1",
        "source_manifest_id": manifest_id,
        "generated_on": generated,
        "items": triaged_items,
    }
    lane_results_payload = {
        "schema_version": LANE_RESULTS_SCHEMA_VERSION,
        "source_manifest_id": manifest_id,
        "triaged_manifest_id": triaged_manifest["manifest_id"],
        "generated_on": generated,
        "results": lane_results,
    }

    diagram_counts = Counter("true" if item["diagram_present"] else "false" for item in projection_items)
    route_counts = Counter(item["route"] for item in projection_items)
    summary = {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated,
        "manifest_id": manifest_id,
        "shard_id": shard_id,
        "projected_items": len(projection_items),
        "diagram_present": {key: diagram_counts.get(key, 0) for key in ("true", "false")},
        "route_counts": dict(sorted(route_counts.items())),
        "warning_dispositions_applied": sum(1 for item in projection_items if item.get("warning_disposition")),
    }

    paths = {
        "resolution_audit": str(output_root / "resolution-audit.json"),
        "projection": str(output_root / "projection.json"),
        "triaged_manifest": str(output_root / "triaged-manifest.json"),
        "lane_results": str(output_root / "lane-results.json"),
        "summary": str(output_root / "summary.json"),
    }
    _write_json(paths["resolution_audit"], resolution_audit)
    _write_json(paths["projection"], projection)
    _write_json(paths["triaged_manifest"], triaged_manifest)
    _write_json(paths["lane_results"], lane_results_payload)
    _write_json(paths["summary"], summary)

    return {"schema_version": SCHEMA_VERSION, "summary": summary, "paths": paths}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build 9709 shard page-chain projection and evidence inputs.")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--payload-dir", required=True, type=Path)
    parser.add_argument("--render-root", required=True, type=Path)
    parser.add_argument("--review-crop-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--warning-disposition", type=Path)
    parser.add_argument("--expected-count", type=int)
    parser.add_argument("--generated-on")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    result = build_shard_bundle(
        manifest_path=args.manifest,
        payload_dir=args.payload_dir,
        render_root=args.render_root,
        review_crop_root=args.review_crop_root,
        output_root=args.output_root,
        warning_disposition_path=args.warning_disposition,
        expected_count=args.expected_count,
        generated_on=args.generated_on,
    )
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
