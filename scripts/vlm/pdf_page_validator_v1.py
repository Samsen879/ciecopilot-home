#!/usr/bin/env python3
"""Boundary and structure validator for PDF-page question extraction."""
from __future__ import annotations

import re
from typing import Any


def _normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    if isinstance(value, (int, float)):
        return bool(value)
    return False


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "\n".join(str(item).strip() for item in value if str(item).strip())
    return str(value).strip()


def _normalize_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _valid_bbox_norm(value: Any) -> bool:
    if not isinstance(value, list) or len(value) != 4:
        return False
    try:
        x1, y1, x2, y2 = [float(part) for part in value]
    except (TypeError, ValueError):
        return False
    return 0 <= x1 < x2 <= 1 and 0 <= y1 < y2 <= 1


def _bbox_shape_warning(value: Any, extraction: dict[str, Any]) -> str | None:
    if not _valid_bbox_norm(value):
        return None
    x1, y1, x2, y2 = [float(part) for part in value]
    width = x2 - x1
    height = y2 - y1
    area = width * height
    has_multi_part_content = (
        len(_normalize_list(extraction.get("subquestions"))) > 1
        or len(_normalize_list(extraction.get("marks"))) > 1
    )
    if height < 0.04 or (height < 0.08 and has_multi_part_content):
        return "thin_question_bbox"
    if width < 0.2:
        return "narrow_question_bbox"
    if area > 0.92:
        return "oversized_question_bbox"
    return None


def _contains_later_question_text(text: str, target_q_number: int) -> bool:
    later_q = target_q_number + 1
    patterns = [
        rf"(?m)^\s*{later_q}\s+(?:[A-Z(]|The\b|A\b|An\b|Let\b|Find\b|Show\b|Solve\b)",
        rf"(?mi)^\s*question\s+{later_q}\b",
    ]
    return any(re.search(pattern, text) for pattern in patterns)


def _joined_region_text(extraction: dict[str, Any]) -> str:
    parts = [_normalize_text(extraction.get("ocr_text"))]
    for key in ("subquestions", "regions", "question_regions"):
        for item in _normalize_list(extraction.get(key)):
            if isinstance(item, dict):
                parts.append(_normalize_text(item.get("text") or item.get("ocr_text") or item.get("label")))
            else:
                parts.append(_normalize_text(item))
    return "\n".join(part for part in parts if part)


def validate_pdf_page_question_extraction(
    *,
    target_q_number: int,
    extraction: dict[str, Any],
    expected_diagram_present: bool | None = None,
    expected_page_count: int | None = None,
) -> dict[str, Any]:
    blockers: list[str] = []
    warnings: list[str] = []

    question_number = extraction.get("question_number")
    try:
        normalized_question_number = int(question_number)
    except (TypeError, ValueError):
        normalized_question_number = None
    if normalized_question_number != target_q_number:
        blockers.append("question_number_mismatch")

    ocr_text = _normalize_text(extraction.get("ocr_text"))
    if not ocr_text:
        blockers.append("missing_ocr_text")

    if not _valid_bbox_norm(extraction.get("question_bbox_norm")):
        blockers.append("invalid_question_bbox_norm")

    if _normalize_bool(extraction.get("includes_later_question")):
        blockers.append("model_reported_later_question_included")

    if extraction.get("ends_before_next_question") is False:
        blockers.append("model_reported_boundary_not_closed")

    if _contains_later_question_text(_joined_region_text(extraction), target_q_number):
        blockers.append("later_question_text_detected")

    if expected_page_count is not None and expected_page_count > 1:
        page_indices = _normalize_list(extraction.get("page_indices"))
        normalized_page_indices: set[int] = set()
        for page_index in page_indices:
            try:
                normalized_page_indices.add(int(page_index))
            except (TypeError, ValueError):
                continue
        expected_page_indices = set(range(expected_page_count))
        if not expected_page_indices.issubset(normalized_page_indices):
            blockers.append("missing_expected_input_page")

    bbox_warning = _bbox_shape_warning(extraction.get("question_bbox_norm"), extraction)
    if bbox_warning:
        warnings.append(bbox_warning)

    marks = _normalize_list(extraction.get("marks"))
    subquestions = _normalize_list(extraction.get("subquestions"))
    if not marks and not subquestions:
        warnings.append("no_marks_or_subquestions")

    if expected_diagram_present is not None:
        has_diagram = _normalize_bool(extraction.get("has_diagram"))
        if has_diagram != expected_diagram_present:
            warnings.append("diagram_presence_mismatch")

    confidence = extraction.get("confidence")
    if isinstance(confidence, (int, float)) and confidence < 0.5:
        warnings.append("low_confidence")

    return {
        "status": "blocked" if blockers else "passed",
        "blockers": list(dict.fromkeys(blockers)),
        "warnings": list(dict.fromkeys(warnings)),
    }
