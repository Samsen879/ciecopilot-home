#!/usr/bin/env python3
"""Project full-PDF page-chain extraction back to selected 9709 manifest rows."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "9709_pdf_page_chain_projection_v1"


class ProjectionError(RuntimeError):
    """Raised when page-chain output cannot be projected without ambiguity."""


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _items(payload: dict[str, Any], *keys: str) -> list[dict[str, Any]]:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, list):
            return value
    return []


def _normalize_pdf_path(value: Any) -> str:
    return str(value or "").replace("\\", "/")


def _payload_index(payload_dir: str | Path) -> tuple[dict[tuple[str, int], list[dict[str, Any]]], dict[str, dict[str, Any]]]:
    by_question: dict[tuple[str, int], list[dict[str, Any]]] = {}
    payloads_by_pdf: dict[str, dict[str, Any]] = {}
    for payload_path in sorted(Path(payload_dir).glob("*.json")):
        payload = _load_json(payload_path)
        pdf_path = _normalize_pdf_path(payload.get("pdf_path"))
        if not pdf_path:
            continue
        payloads_by_pdf[pdf_path] = payload
        for question in payload.get("questions") or []:
            q_number = question.get("q_number")
            if isinstance(q_number, int):
                by_question.setdefault((pdf_path, q_number), []).append(question)
    return by_question, payloads_by_pdf


def _audit_index(audit: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(item.get("storage_key")): item for item in _items(audit, "items")}


def _evidence_index(evidence_payload: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    if not evidence_payload:
        return {}
    return {
        str(item.get("storage_key")): item
        for item in _items(evidence_payload, "bundles", "items")
        if item.get("storage_key")
    }


def _old_fields(
    manifest_item: dict[str, Any],
    evidence_bundle: dict[str, Any] | None,
) -> dict[str, Any]:
    evidence = (evidence_bundle or {}).get("evidence") or {}
    surface_posture = (evidence_bundle or {}).get("surface_posture") or {}
    return {
        "manifest_diagram_present": manifest_item.get("diagram_present"),
        "manifest_formula_dense": manifest_item.get("formula_dense"),
        "manifest_table_heavy": manifest_item.get("table_heavy"),
        "manifest_route_hint": manifest_item.get("route_hint"),
        "manifest_surface_evidence_status": manifest_item.get("surface_evidence_status"),
        "evidence_ocr_text": evidence.get("ocr_text"),
        "evidence_diagram_present": evidence.get("diagram_present"),
        "evidence_diagram_elements": evidence.get("diagram_elements"),
        "surface_posture_diagram_present": surface_posture.get("diagram_present"),
        "overall_alignment_verdict": manifest_item.get("overall_alignment_verdict"),
        "authority_alignment_run_id": manifest_item.get("authority_alignment_run_id"),
    }


def _rendered_page_paths(
    *,
    render_root: str | Path,
    pdf_path: str,
    page_indices: list[int],
) -> list[str]:
    stem = Path(pdf_path).stem
    return [
        str(Path(render_root) / stem / f"{stem}_page_{page_index + 1:03d}.png")
        for page_index in page_indices
    ]


def build_projection(
    *,
    manifest_path: str | Path,
    resolution_audit_path: str | Path,
    payload_dir: str | Path,
    render_root: str | Path,
    expected_count: int | None = 300,
    evidence_bundles_path: str | Path | None = None,
) -> dict[str, Any]:
    manifest = _load_json(manifest_path)
    audit = _load_json(resolution_audit_path)
    evidence = _load_json(evidence_bundles_path) if evidence_bundles_path else None
    manifest_items = _items(manifest, "items")
    audit_by_storage_key = _audit_index(audit)
    evidence_by_storage_key = _evidence_index(evidence)
    questions_by_key, payloads_by_pdf = _payload_index(payload_dir)

    errors: list[str] = []
    projected_items: list[dict[str, Any]] = []

    if expected_count is not None and len(manifest_items) != expected_count:
        errors.append(
            f"manifest item count {len(manifest_items)} does not match expected {expected_count}",
        )

    for index, manifest_item in enumerate(manifest_items, start=1):
        storage_key = str(manifest_item.get("storage_key"))
        audit_item = audit_by_storage_key.get(storage_key)
        if audit_item is None:
            errors.append(f"{storage_key}: no resolution audit row")
            continue

        pdf_path = _normalize_pdf_path(audit_item.get("pdf_path"))
        q_number = audit_item.get("q_number")
        matches = questions_by_key.get((pdf_path, q_number), [])
        if not matches:
            errors.append(f"{storage_key}: no matching extracted question for {pdf_path} q{q_number}")
            continue
        if len(matches) > 1:
            errors.append(f"{storage_key}: multiple extracted questions for {pdf_path} q{q_number}")
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

        payload = payloads_by_pdf.get(pdf_path, {})
        projected_items.append(
            {
                "index": index,
                "storage_key": storage_key,
                "source_pdf_path": pdf_path,
                "q_number": q_number,
                "ocr_text": ocr_text,
                "diagram_present": diagram_present,
                "diagram_elements": question.get("diagram_elements") or [],
                "page_indices": page_indices,
                "marks": question.get("marks") or [],
                "subpart_labels": question.get("subpart_labels") or [],
                "extraction_model": payload.get("model"),
                "extraction_schema_version": payload.get("schema_version"),
                "extraction_run_id": payload.get("run_id"),
                "source_rendered_page_paths": _rendered_page_paths(
                    render_root=render_root,
                    pdf_path=pdf_path,
                    page_indices=page_indices,
                ),
                "old_screenshot_path": storage_key,
                "old": _old_fields(
                    manifest_item,
                    evidence_by_storage_key.get(storage_key),
                ),
            }
        )

    if expected_count is not None and len(projected_items) != expected_count:
        errors.append(
            f"projected item count {len(projected_items)} does not match expected {expected_count}",
        )

    if errors:
        raise ProjectionError("; ".join(errors))

    return {
        "schema_version": SCHEMA_VERSION,
        "manifest_path": str(manifest_path),
        "resolution_audit_path": str(resolution_audit_path),
        "payload_dir": str(payload_dir),
        "render_root": str(render_root),
        "item_count": len(projected_items),
        "items": projected_items,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Project PDF page-chain payloads back to selected manifest rows.",
    )
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--resolution-audit", required=True)
    parser.add_argument("--payload-dir", required=True)
    parser.add_argument("--render-root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--expected-count", type=int, default=300)
    parser.add_argument("--evidence-bundles")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    projection = build_projection(
        manifest_path=args.manifest,
        resolution_audit_path=args.resolution_audit,
        payload_dir=args.payload_dir,
        render_root=args.render_root,
        expected_count=args.expected_count,
        evidence_bundles_path=args.evidence_bundles,
    )
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(projection, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
