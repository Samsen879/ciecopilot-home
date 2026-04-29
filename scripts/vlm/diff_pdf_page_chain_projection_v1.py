#!/usr/bin/env python3
"""Build a human-review diff for 9709 PDF page-chain projections."""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "9709_pdf_page_chain_projection_diff_v1"


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip().lower()


def _old_diagram_present(old: dict[str, Any]) -> bool | None:
    for key in (
        "evidence_diagram_present",
        "surface_posture_diagram_present",
        "manifest_diagram_present",
    ):
        value = old.get(key)
        if isinstance(value, bool):
            return value
    return None


def _old_list(old: dict[str, Any], key: str) -> list[Any] | None:
    value = old.get(key)
    return value if isinstance(value, list) else None


def classify_item(item: dict[str, Any]) -> dict[str, Any]:
    old = item.get("old") or {}
    old_text = old.get("evidence_ocr_text")
    new_text = item.get("ocr_text")
    old_diagram = _old_diagram_present(old)
    new_diagram = item.get("diagram_present")
    diff_classes: list[str] = []
    changed_fields: list[str] = []
    review_reasons: list[str] = []

    if not _normalize_text(old_text):
        diff_classes.append("missing_old_evidence")
        review_reasons.append("old OCR evidence is missing")
    elif _normalize_text(old_text) != _normalize_text(new_text):
        diff_classes.append("text_changed")
        changed_fields.append("ocr_text")
        review_reasons.append("OCR text changed")

    if old_diagram is None:
        if "missing_old_evidence" not in diff_classes:
            diff_classes.append("missing_old_evidence")
        review_reasons.append("old diagram evidence is missing")
    elif old_diagram != new_diagram:
        diff_classes.append("diagram_changed")
        changed_fields.append("diagram_present")
        review_reasons.append("diagram_present changed")

    old_diagram_elements = _old_list(old, "evidence_diagram_elements")
    if old_diagram_elements is not None and old_diagram_elements != (item.get("diagram_elements") or []):
        if "structure_changed" not in diff_classes:
            diff_classes.append("structure_changed")
        changed_fields.append("diagram_elements")
        review_reasons.append("diagram elements changed")

    # Old 300 evidence usually lacks marks and subparts. Compare only when present.
    for old_key, new_key in (
        ("evidence_marks", "marks"),
        ("evidence_subpart_labels", "subpart_labels"),
        ("evidence_page_indices", "page_indices"),
    ):
        old_value = _old_list(old, old_key)
        if old_value is not None and old_value != (item.get(new_key) or []):
            if "structure_changed" not in diff_classes:
                diff_classes.append("structure_changed")
            changed_fields.append(new_key)
            review_reasons.append(f"{new_key} changed")

    if not str(new_text or "").strip() or len(str(new_text or "").strip()) < 30:
        review_reasons.append("new OCR text is empty or unusually short")
    if new_diagram is True:
        review_reasons.append("new extraction includes diagram/table evidence")

    if not diff_classes:
        diff_classes.append("unchanged")

    old_alignment_verdict_stale = (
        old.get("overall_alignment_verdict") == "ready"
        and diff_classes != ["unchanged"]
    )
    if old_alignment_verdict_stale:
        review_reasons.append("old authority alignment verdict is stale")

    requires_human_review = bool(review_reasons)

    return {
        "storage_key": item.get("storage_key"),
        "source_pdf_path": item.get("source_pdf_path"),
        "q_number": item.get("q_number"),
        "diff_classes": diff_classes,
        "changed_fields": sorted(set(changed_fields)),
        "requires_human_review": requires_human_review,
        "review_reasons": sorted(set(review_reasons)),
        "old_alignment_verdict_stale": old_alignment_verdict_stale,
        "old": {
            "ocr_text": old_text,
            "diagram_present": old_diagram,
            "diagram_elements": old.get("evidence_diagram_elements"),
            "overall_alignment_verdict": old.get("overall_alignment_verdict"),
            "old_screenshot_path": item.get("old_screenshot_path"),
        },
        "new": {
            "ocr_text": item.get("ocr_text"),
            "diagram_present": item.get("diagram_present"),
            "diagram_elements": item.get("diagram_elements") or [],
            "page_indices": item.get("page_indices") or [],
            "marks": item.get("marks") or [],
            "subpart_labels": item.get("subpart_labels") or [],
            "source_rendered_page_paths": item.get("source_rendered_page_paths") or [],
        },
    }


def build_diff_report(*, projection_path: str | Path) -> dict[str, Any]:
    projection = _load_json(projection_path)
    rows = [classify_item(item) for item in projection.get("items") or []]
    class_counts: Counter[str] = Counter()
    for row in rows:
        class_counts.update(row["diff_classes"])
    return {
        "schema_version": SCHEMA_VERSION,
        "source_projection": str(projection_path),
        "total_items": len(rows),
        "class_counts": dict(sorted(class_counts.items())),
        "requires_human_review_count": sum(1 for row in rows if row["requires_human_review"]),
        "items": rows,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare a PDF page-chain projection against old 300-batch evidence.",
    )
    parser.add_argument("--projection", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    report = build_diff_report(projection_path=args.projection)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
