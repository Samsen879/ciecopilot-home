#!/usr/bin/env python3
"""Normalize deterministic false positives in screenshot quality reviews."""
from __future__ import annotations

import argparse
from collections import Counter
import copy
import json
from pathlib import Path
import re
from typing import Any


SCHEMA_VERSION = "9709_vlm_screenshot_quality_qc_normalized_v1"

DRAWN_DIAGRAM_PROMPT_RE = re.compile(
    r"\b("
    r"on\s+(?:a|an)\s+(?:single\s+)?(?:sketch\s+of\s+(?:a|an)\s+)?argand\s+diagram"
    r"|sketch\s+(?:a|an)\s+argand\s+diagram"
    r"|sketch\s+the\s+locus"
    r"|shade\s+the\s+region"
    r"|draw\s+(?:a|the)\s+(?:diagram|graph)"
    r")\b",
    re.IGNORECASE,
)
MISSING_DIAGRAM_RE = re.compile(
    r"("
    r"missing[_\s-]?diagram"
    r"|diagram[_\s-]?missing"
    r"|missing\s+(?:the\s+)?(?:diagram|drawing)"
    r"|no\s+corresponding\s+(?:diagram|drawing|drawn\s+area)"
    r"|缺图"
    r"|(?:缺(?:少|失)|少了).*(?:图形|图示|图表|图区|作图区|预印图|Argand图)"
    r"|(?:图形|图示|图表|图区|作图区|预印图|Argand图).*(?:缺(?:少|失)|missing)"
    r"|没有.*(?:预印图|作图区|图区)"
    r"|无(?:任何|对应).*(?:预印图|作图区|图区)"
    r")",
    re.IGNORECASE,
)
PAGE_NUMBER_MARKER_RE = re.compile(r"\bpage\s+number\b|页码")
ENGLISH_QUESTION_NUMBER_RE = re.compile(r"\b(?:question|q)\s*#?\s*(\d{1,2})\b", re.IGNORECASE)
CHINESE_QUESTION_NUMBER_RE = re.compile(r"(?:第\s*(\d{1,2})\s*题|题\s*(\d{1,2}))")


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _as_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _review_text(review: dict[str, Any]) -> str:
    parts: list[str] = []
    for field in ("brief_reason", "completeness", "contains_target_question", "neighbor_question_contamination", "diagram_quality"):
        value = review.get(field)
        if value not in (None, ""):
            parts.append(str(value))
    parts.extend(str(issue) for issue in _as_list(review.get("issues")) if str(issue))
    return "\n".join(parts)


def _projection_extraction(projection_item: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(projection_item, dict):
        return {}
    extraction = projection_item.get("extraction")
    return extraction if isinstance(extraction, dict) else {}


def _pdf_page_numbers(projection_item: dict[str, Any] | None) -> set[int]:
    extraction = _projection_extraction(projection_item)
    page_numbers: set[int] = set()
    for page_index in _as_list(extraction.get("page_indices")):
        parsed = _as_int(page_index)
        if parsed is not None and parsed >= 0:
            page_numbers.add(parsed + 1)
    return page_numbers


def _claimed_question_numbers(text: str) -> set[int]:
    numbers: set[int] = set()
    for match in ENGLISH_QUESTION_NUMBER_RE.finditer(text):
        parsed = _as_int(match.group(1))
        if parsed is not None:
            numbers.add(parsed)
    for match in CHINESE_QUESTION_NUMBER_RE.finditer(text):
        parsed = _as_int(match.group(1) or match.group(2))
        if parsed is not None:
            numbers.add(parsed)
    return numbers


def _mentions_number_as_page_number(text: str, number: int) -> bool:
    if not PAGE_NUMBER_MARKER_RE.search(text):
        return False
    return re.search(rf"(?<!\d){number}(?!\d)", text) is not None


def is_page_header_question_number_confusion(
    result: dict[str, Any],
    projection_item: dict[str, Any] | None,
) -> bool:
    review = result.get("review") if isinstance(result.get("review"), dict) else {}
    q_number = _as_int(result.get("q_number"))
    if (_as_int(result.get("crop_count")) or 0) < 2:
        return False

    page_numbers = _pdf_page_numbers(projection_item)
    if q_number is not None:
        page_numbers.discard(q_number)
    if not page_numbers:
        return False

    text = _review_text(review)
    claimed = _claimed_question_numbers(text)
    if claimed.intersection(page_numbers):
        return True
    return any(_mentions_number_as_page_number(text, page_number) for page_number in page_numbers)


def is_student_drawn_diagram_prompt(
    projection_item: dict[str, Any] | None,
) -> bool:
    extraction = _projection_extraction(projection_item)
    if extraction.get("diagram_present") is True:
        return False
    ocr_text = str(extraction.get("ocr_text") or "")
    return DRAWN_DIAGRAM_PROMPT_RE.search(ocr_text) is not None


def review_reports_missing_diagram(review: dict[str, Any]) -> bool:
    diagram_quality = str(review.get("diagram_quality") or "").lower()
    if diagram_quality in {"missing", "diagram_missing"}:
        return True
    issue_text = "\n".join(str(issue) for issue in _as_list(review.get("issues")) if str(issue))
    return MISSING_DIAGRAM_RE.search(issue_text) is not None


def _fatal_reasons(review: dict[str, Any]) -> set[str]:
    reasons: set[str] = set()
    if review.get("blank_or_noise") is True:
        reasons.add("blank_or_noise")
    if review.get("too_tight") is True:
        reasons.add("too_tight")
    if str(review.get("neighbor_question_contamination") or "") == "major":
        reasons.add("neighbor_question_contamination")
    if str(review.get("completeness") or "") == "major_cutoff":
        reasons.add("major_cutoff")
    if str(review.get("contains_target_question") or "") in {"no", "unclear"}:
        reasons.add("target_question_unclear")
    if review_reports_missing_diagram(review):
        reasons.add("missing_diagram")
    return reasons


def _covered_reasons(rules: list[str]) -> set[str]:
    covered: set[str] = set()
    if "page_header_question_number_confusion" in rules:
        covered.update(
            {
                "neighbor_question_contamination",
                "major_cutoff",
                "target_question_unclear",
            }
        )
    if "student_drawn_diagram_prompt" in rules:
        covered.add("missing_diagram")
    return covered


def _normalized_brief_reason(rules: list[str]) -> str:
    descriptions = {
        "page_header_question_number_confusion": "the review treated a centered PDF page number as a question number",
        "student_drawn_diagram_prompt": "the prompt asks the student to sketch or shade an Argand diagram, so no preprinted diagram is required",
    }
    joined = "; ".join(descriptions[rule] for rule in rules if rule in descriptions)
    return f"Deterministic QC normalization applied: {joined}."


def _clean_student_drawn_diagram_issues(review: dict[str, Any]) -> list[str]:
    kept: list[str] = []
    for issue in _as_list(review.get("issues")):
        issue_text = str(issue)
        if not issue_text:
            continue
        if issue_text == "diagram_quality" or MISSING_DIAGRAM_RE.search(issue_text):
            continue
        kept.append(issue_text)
    kept.append("qc_normalized:student_drawn_diagram_prompt")
    return kept


def normalize_screenshot_quality_result(
    result: dict[str, Any],
    projection_item: dict[str, Any] | None,
) -> dict[str, Any]:
    normalized = copy.deepcopy(result)
    review = normalized.get("review") if isinstance(normalized.get("review"), dict) else {}
    original_review = copy.deepcopy(review)

    rules: list[str] = []
    if is_page_header_question_number_confusion(normalized, projection_item):
        rules.append("page_header_question_number_confusion")
    if is_student_drawn_diagram_prompt(projection_item) and review_reports_missing_diagram(review):
        rules.append("student_drawn_diagram_prompt")

    fatal_reasons = _fatal_reasons(review)
    covered_reasons = _covered_reasons(rules)
    can_normalize_to_pass = (
        review.get("quality") == "fail"
        and not normalized.get("failure_reason")
        and bool(rules)
        and fatal_reasons.issubset(covered_reasons)
    )

    qc_normalization: dict[str, Any] = {
        "changed": False,
        "rules": rules,
        "original_quality": review.get("quality"),
        "normalized_quality": review.get("quality"),
        "uncovered_reasons": sorted(fatal_reasons.difference(covered_reasons)),
    }

    if can_normalize_to_pass:
        review["quality"] = "pass"
        review["completeness"] = "complete"
        review["contains_target_question"] = "yes"
        review["neighbor_question_contamination"] = "none"
        if "student_drawn_diagram_prompt" in rules:
            review["diagram_quality"] = "not_applicable"
            review["issues"] = [
                f"qc_normalized:{rule}"
                for rule in rules
                if rule != "student_drawn_diagram_prompt"
            ] + ["qc_normalized:student_drawn_diagram_prompt"]
        else:
            review["issues"] = [f"qc_normalized:{rule}" for rule in rules]
        review["brief_reason"] = _normalized_brief_reason(rules)
        qc_normalization.update(
            {
                "changed": True,
                "normalized_quality": "pass",
                "original_review": original_review,
            }
        )
    elif "student_drawn_diagram_prompt" in rules:
        review["diagram_quality"] = "not_applicable"
        review["issues"] = _clean_student_drawn_diagram_issues(review)
        qc_normalization.update(
            {
                "changed": True,
                "normalized_quality": review.get("quality"),
                "original_review": original_review,
            }
        )

    normalized["review"] = review
    normalized["qc_normalization"] = qc_normalization
    return normalized


def summarize_quality_results(results: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter()
    for result in results:
        review = result.get("review") if isinstance(result.get("review"), dict) else {}
        quality = str(review.get("quality") or "")
        if quality == "pass":
            counts["quality_pass"] += 1
        elif quality == "warn":
            counts["quality_warn"] += 1
        elif quality == "fail":
            counts["quality_fail"] += 1
        if result.get("failure_reason"):
            counts["failures"] += 1
        if review.get("blank_or_noise") is True:
            counts["blank_or_noise"] += 1
        if str(review.get("completeness") or "") == "major_cutoff":
            counts["major_cutoff"] += 1
        if review.get("too_tight") is True:
            counts["too_tight"] += 1
        if review_reports_missing_diagram(review):
            counts["diagram_missing"] += 1
        neighbor = str(review.get("neighbor_question_contamination") or "")
        if neighbor == "major":
            counts["neighbor_major"] += 1
        elif neighbor == "minor":
            counts["neighbor_minor"] += 1
        if review.get("watermark_present") is True:
            counts["watermark_present"] += 1
        qc = result.get("qc_normalization") if isinstance(result.get("qc_normalization"), dict) else {}
        if qc.get("changed"):
            counts["normalized_changed"] += 1
            if qc.get("original_quality") == "fail" and qc.get("normalized_quality") == "pass":
                counts["normalized_from_fail_to_pass"] += 1

    return {
        "total": len(results),
        "quality_pass": counts["quality_pass"],
        "quality_warn": counts["quality_warn"],
        "quality_fail": counts["quality_fail"],
        "failures": counts["failures"],
        "blank_or_noise": counts["blank_or_noise"],
        "major_cutoff": counts["major_cutoff"],
        "too_tight": counts["too_tight"],
        "diagram_missing": counts["diagram_missing"],
        "neighbor_major": counts["neighbor_major"],
        "neighbor_minor": counts["neighbor_minor"],
        "watermark_present": counts["watermark_present"],
        "normalized_changed": counts["normalized_changed"],
        "normalized_from_fail_to_pass": counts["normalized_from_fail_to_pass"],
    }


def _projection_index(projection_payload: dict[str, Any]) -> dict[tuple[str, Any], dict[str, Any]]:
    index: dict[tuple[str, Any], dict[str, Any]] = {}
    for item in _as_list(projection_payload.get("items")):
        if not isinstance(item, dict):
            continue
        if item.get("manifest_position") is not None:
            index[("manifest_position", item.get("manifest_position"))] = item
        if item.get("storage_key"):
            index[("storage_key", item.get("storage_key"))] = item
    return index


def _match_projection_item(
    result: dict[str, Any],
    projection_by_key: dict[tuple[str, Any], dict[str, Any]],
) -> dict[str, Any] | None:
    if result.get("manifest_position") is not None:
        item = projection_by_key.get(("manifest_position", result.get("manifest_position")))
        if item is not None:
            return item
    storage_key = result.get("storage_key")
    if storage_key:
        return projection_by_key.get(("storage_key", storage_key))
    return None


def normalize_screenshot_quality_payload(
    quality_payload: dict[str, Any],
    projection_payload: dict[str, Any],
) -> dict[str, Any]:
    projection_by_key = _projection_index(projection_payload)
    results: list[dict[str, Any]] = []
    for result in _as_list(quality_payload.get("results")):
        if not isinstance(result, dict):
            continue
        projection_item = _match_projection_item(result, projection_by_key)
        results.append(normalize_screenshot_quality_result(result, projection_item))

    return {
        "schema_version": SCHEMA_VERSION,
        "base_schema_version": quality_payload.get("schema_version"),
        "source_projection": quality_payload.get("source_projection"),
        "original_summary": quality_payload.get("summary") or {},
        "summary": summarize_quality_results(results),
        "results": results,
    }


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize deterministic screenshot quality review false positives.")
    parser.add_argument("--quality-review", required=True, type=Path)
    parser.add_argument("--projection", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    payload = normalize_screenshot_quality_payload(
        _load_json(args.quality_review),
        _load_json(args.projection),
    )
    payload["source_quality_review"] = str(args.quality_review)
    payload["source_projection"] = str(args.projection)
    _write_json(args.output, payload)
    print(f"wrote_normalized_screenshot_quality: {args.output}")
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
