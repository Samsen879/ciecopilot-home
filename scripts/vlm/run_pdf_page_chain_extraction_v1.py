#!/usr/bin/env python3
"""Extract 9709 questions by scanning every rendered PDF page in order."""
from __future__ import annotations

import argparse
from collections import defaultdict
import json
from pathlib import Path
import re
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.common.env import load_project_env
from scripts.vlm.pdf_page_locator_v1 import extract_pdf_text_pages, render_pdf_pages
from scripts.vlm.qwen_openai_client_v1 import call_qwen_openai_v1


DEFAULT_MODEL = "qwen3-vl-plus"


def build_page_chain_request(
    *,
    model: str,
    pdf_name: str,
    page_index: int,
    total_pages: int,
    page_image_path: str | Path,
    carry_state: dict[str, Any] | None = None,
    max_tokens: int = 4096,
) -> dict[str, Any]:
    carry_state = carry_state or {
        "open_q_number": None,
        "open_subpart_label": None,
        "last_seen_q_number": None,
        "reason": "",
    }
    prompt = (
        "Return one valid JSON object only. "
        "You are extracting Cambridge 9709 Mathematics exam question fragments from one rendered original PDF page. "
        f"PDF: {pdf_name}. Current page: {page_index + 1} of {total_pages}. "
        f"Carry state from previous page: {json.dumps(carry_state, ensure_ascii=False)}. "
        "Read the full page visually. Ignore page numbers, UCLES headers, copyright footers, turn-over labels, and answer lines. "
        "If this page visibly starts a new printed question number, that visible new question number overrides the carry state. "
        "Detect every printed question fragment on this page. A fragment can be a new numbered question, or a continuation "
        "of the open previous question if this page starts with labels such as (b), (ii), (iii), Hence, Find, Show, or continued text. "
        "For continuation fragments, set q_number to the carried open_q_number when the page clearly continues it. "
        "Do not solve the problem. Preserve exact question text and formula meaning. "
        "Return keys: page_index, fragments, carry_state, warnings. "
        "Each fragment must include: q_number, fragment_kind, bbox_norm, subpart_labels, ocr_text, marks, has_diagram, "
        "diagram_summary, diagram_elements, continues_from_previous_page, continues_to_next_page, ends_question_on_this_page, evidence. "
        "bbox_norm is [x1,y1,x2,y2] normalized to this single page. "
        "fragment_kind must be one of: new_question, continuation, furniture_or_blank. "
        "carry_state must include: open_q_number, open_subpart_label, last_seen_q_number, reason. "
        "If the page contains no question content, return fragments as an empty array and carry_state unchanged unless the page proves closure. "
        "Use booleans for has_diagram, continues_from_previous_page, continues_to_next_page, ends_question_on_this_page. "
        "Use arrays for fragments, subpart_labels, marks, diagram_elements, evidence, warnings. "
        "Do not include markdown fences."
    )
    return {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_path", "image_path": str(page_image_path)},
                ],
            }
        ],
        "max_tokens": max_tokens,
        "temperature": 0,
        "enable_thinking": False,
        "response_format": {"type": "json_object"},
    }


def run_page_chain_request(
    *,
    model: str,
    pdf_name: str,
    page_index: int,
    total_pages: int,
    page_image_path: str | Path,
    carry_state: dict[str, Any] | None,
    client=call_qwen_openai_v1,
) -> dict[str, Any]:
    response = client(
        build_page_chain_request(
            model=model,
            pdf_name=pdf_name,
            page_index=page_index,
            total_pages=total_pages,
            page_image_path=page_image_path,
            carry_state=carry_state,
        )
    )
    content = response["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("page-chain response must be a JSON object")
    return parsed


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _normalize_q_number(value: Any) -> int | None:
    try:
        q_number = int(value)
    except (TypeError, ValueError):
        return None
    return q_number if q_number > 0 else None


_ROMAN_SUBPART_LABELS = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}
_SUBPART_LABEL_RE = re.compile(r"^\(([A-Za-z]+|\d+)\)$")
_SUBPART_LABEL_SCAN_RE = re.compile(r"\(([A-Za-z]+|\d+)\)")


def _split_compound_subpart_label(label: str) -> list[str]:
    return [f"({match.group(1)})" for match in _SUBPART_LABEL_SCAN_RE.finditer(label)]


def _fragment_mentions_any_label(fragment: dict[str, Any]) -> bool:
    labels = [str(label).strip() for label in _as_list(fragment.get("subpart_labels")) if str(label).strip()]
    if not labels:
        return True
    text = str(fragment.get("ocr_text") or "")
    for label in labels:
        if label in text:
            return True
        parts = _split_compound_subpart_label(label)
        if parts and all(part in text for part in parts):
            return True
    return False


def _estimated_answer_subpart_count(labels: list[Any]) -> int:
    normalized = [str(label).strip().lower() for label in labels if str(label).strip()]
    if not normalized:
        return 0
    if any(len(_split_compound_subpart_label(label)) > 1 for label in normalized):
        return len(normalized)

    alpha_count = 0
    roman_count = 0
    for label in normalized:
        match = _SUBPART_LABEL_RE.match(label)
        if not match:
            continue
        value = match.group(1)
        if value in _ROMAN_SUBPART_LABELS:
            roman_count += 1
        elif len(value) == 1 and value.isalpha():
            alpha_count += 1

    if alpha_count and roman_count:
        return max(alpha_count + roman_count - 1, 1)
    return len(normalized)


def detect_leading_question_number(text_lines: list[str], *, max_question_number: int = 20) -> int | None:
    lines = [line.strip() for line in text_lines if str(line).strip()]
    if lines and lines[0].isdigit():
        lines = lines[1:]
    while lines and (
        "UCLES" in lines[0]
        or lines[0].startswith("9709/")
        or lines[0].lower() in {"[turn over", "turn over"}
    ):
        lines = lines[1:]
    if not lines:
        return None
    compact = " ".join(lines[0].split())
    if compact.startswith(("(", "[", "BLANK PAGE")):
        return None
    if compact.isdigit():
        q_number = int(compact)
        return q_number if 1 <= q_number <= max_question_number else None
    match = re.match(r"^(\d{1,2})\s+\S", compact)
    if match:
        q_number = int(match.group(1))
        return q_number if 1 <= q_number <= max_question_number else None
    return None


def _blank_page(text_lines: list[str]) -> bool:
    return any(str(line).strip().upper() == "BLANK PAGE" for line in text_lines)


def _answer_only_page(text_lines: list[str]) -> bool:
    joined = " ".join(str(line).strip().lower() for line in text_lines if str(line).strip())
    joined = " ".join(joined.split())
    return "additional page" in joined and "question number must be clearly shown" in joined


def normalize_page_chain_result(
    result: dict[str, Any],
    *,
    source_page_index: int,
    text_lines: list[str],
    carry_state: dict[str, Any] | None,
) -> dict[str, Any]:
    normalized = dict(result)
    detected_q_number = detect_leading_question_number(text_lines)
    carry_q_number = _normalize_q_number((carry_state or {}).get("open_q_number"))
    last_seen_q_number = _normalize_q_number((carry_state or {}).get("last_seen_q_number"))
    prior_q_number = carry_q_number or last_seen_q_number
    if detected_q_number is not None and (carry_q_number or last_seen_q_number):
        if detected_q_number < prior_q_number:
            warnings = _as_list(normalized.get("warnings"))
            warnings.append("ignored_regressive_leading_question_number")
            normalized["warnings"] = warnings
            detected_q_number = None
    fallback_q_number = prior_q_number
    normalized["model_page_index"] = result.get("page_index")
    normalized["page_index"] = source_page_index
    normalized["source_page_index"] = source_page_index
    normalized["detected_leading_q_number"] = detected_q_number

    fragments: list[dict[str, Any]] = []
    meaningful_q_numbers: list[int] = []
    raw_fragments = _as_list(result.get("fragments"))
    is_non_question_page = _blank_page(text_lines) or _answer_only_page(text_lines)
    if is_non_question_page:
        if raw_fragments:
            warnings = _as_list(normalized.get("warnings"))
            warnings.append("dropped_model_fragments_on_blank_or_answer_page")
            normalized["warnings"] = warnings
    else:
        for raw_fragment in raw_fragments:
            if not isinstance(raw_fragment, dict):
                continue
            fragment = dict(raw_fragment)
            if fragment.get("fragment_kind") == "furniture_or_blank":
                fragments.append(fragment)
                continue
            q_number = _normalize_q_number(fragment.get("q_number"))
            if detected_q_number is not None and (
                q_number is None
                or q_number == carry_q_number
                or q_number == last_seen_q_number
                or bool(fragment.get("continues_from_previous_page"))
            ):
                q_number = detected_q_number
                fragment["q_number"] = detected_q_number
                if fragment.get("fragment_kind") == "continuation":
                    fragment["fragment_kind"] = "new_question"
                    fragment["continues_from_previous_page"] = False
            elif detected_q_number is None and fallback_q_number is not None:
                q_number = fallback_q_number
                fragment["q_number"] = fallback_q_number
                fragment["fragment_kind"] = "continuation"
                fragment["continues_from_previous_page"] = True
            if q_number is not None:
                meaningful_q_numbers.append(q_number)
            fragments.append(fragment)

    normalized["fragments"] = fragments
    model_carry = result.get("carry_state") if isinstance(result.get("carry_state"), dict) else {}
    next_open = _normalize_q_number(model_carry.get("open_q_number"))
    if is_non_question_page:
        next_open = None
    elif meaningful_q_numbers:
        last_q_number = meaningful_q_numbers[-1]
        if detected_q_number is not None and next_open not in {None, detected_q_number, last_q_number, last_q_number + 1}:
            next_open = last_q_number
        if detected_q_number is None and fallback_q_number is not None and next_open not in {None, fallback_q_number, fallback_q_number + 1}:
            next_open = fallback_q_number
        if next_open == last_q_number + 1:
            next_open = None
    next_last_seen = meaningful_q_numbers[-1] if meaningful_q_numbers else last_seen_q_number
    normalized["carry_state"] = {
        "open_q_number": next_open,
        "open_subpart_label": model_carry.get("open_subpart_label") if next_open else None,
        "last_seen_q_number": next_last_seen,
        "reason": model_carry.get("reason", ""),
    }
    return normalized


def merge_page_fragments(page_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[int, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    for page_result in page_results:
        page_index = int(page_result.get("source_page_index", page_result.get("page_index", 0)))
        for fragment in _as_list(page_result.get("fragments")):
            if not isinstance(fragment, dict):
                continue
            q_number = _normalize_q_number(fragment.get("q_number"))
            if q_number is None:
                continue
            if fragment.get("fragment_kind") == "furniture_or_blank":
                continue
            grouped[q_number].append((page_index, fragment))

    questions: list[dict[str, Any]] = []
    for q_number in sorted(grouped):
        entries = sorted(grouped[q_number], key=lambda item: item[0])
        text_parts: list[str] = []
        subparts: list[str] = []
        marks: list[Any] = []
        diagram_elements: list[Any] = []
        evidence: list[Any] = []
        has_diagram = False
        continues_to_next_page = False
        for _page_index, fragment in entries:
            text = str(fragment.get("ocr_text") or "").strip()
            if text:
                text_parts.append(text)
            if _fragment_mentions_any_label(fragment):
                subparts.extend(str(item) for item in _as_list(fragment.get("subpart_labels")) if str(item).strip())
                marks.extend(_as_list(fragment.get("marks")))
            diagram_elements.extend(_as_list(fragment.get("diagram_elements")))
            evidence.extend(_as_list(fragment.get("evidence")))
            has_diagram = has_diagram or bool(fragment.get("has_diagram"))
            continues_to_next_page = continues_to_next_page or bool(fragment.get("continues_to_next_page"))

        questions.append(
            {
                "q_number": q_number,
                "page_indices": sorted({page_index for page_index, _fragment in entries}),
                "fragment_count": len(entries),
                "ocr_text": "\n".join(text_parts),
                "subpart_labels": list(dict.fromkeys(subparts)),
                "marks": marks,
                "has_diagram": has_diagram,
                "diagram_elements": diagram_elements,
                "continues_to_next_page": continues_to_next_page,
                "evidence": evidence,
            }
        )
    return questions


def validate_page_chain_questions(questions: list[dict[str, Any]]) -> dict[str, Any]:
    blockers: list[str] = []
    warnings: list[str] = []

    q_numbers = [_normalize_q_number(question.get("q_number")) for question in questions]
    q_numbers = [q_number for q_number in q_numbers if q_number is not None]
    if q_numbers:
        expected = list(range(min(q_numbers), max(q_numbers) + 1))
        if sorted(q_numbers) != expected:
            blockers.append("question_number_gap")
        if len(set(q_numbers)) != len(q_numbers):
            blockers.append("duplicate_question_number")

    previous_last_page = -1
    for question in sorted(questions, key=lambda item: int(item.get("q_number") or 0)):
        q_number = _normalize_q_number(question.get("q_number"))
        page_indices = []
        for value in _as_list(question.get("page_indices")):
            try:
                page_indices.append(int(value))
            except (TypeError, ValueError):
                continue
        if not page_indices:
            blockers.append("missing_question_page_indices")
        elif page_indices != sorted(set(page_indices)):
            blockers.append("invalid_question_page_indices")
        elif any((right - left) > 1 for left, right in zip(page_indices, page_indices[1:])):
            blockers.append("question_page_gap")
        if page_indices and page_indices[0] < previous_last_page:
            blockers.append("question_page_order_regression")
        if page_indices:
            previous_last_page = max(previous_last_page, page_indices[-1])

        text = str(question.get("ocr_text") or "").lower()
        if "additional page" in text and "question number" in text and "shown" in text:
            blockers.append("answer_only_page_contamination")
        if "blank page" in text:
            blockers.append("blank_page_contamination")
        if not str(question.get("ocr_text") or "").strip():
            blockers.append("missing_question_ocr_text")

        subpart_count = _estimated_answer_subpart_count(_as_list(question.get("subpart_labels")))
        mark_count = len(_as_list(question.get("marks")))
        if subpart_count > 0 and mark_count > 0 and subpart_count != mark_count:
            warnings.append("subpart_mark_count_mismatch")
        if q_number is not None and q_number > 20:
            warnings.append("suspicious_question_number")

    return {
        "status": "blocked" if blockers else "passed",
        "blockers": list(dict.fromkeys(blockers)),
        "warnings": list(dict.fromkeys(warnings)),
    }


def build_page_chain_payload(
    *,
    pdf_path: str | Path,
    model: str,
    total_pages: int,
    page_results: list[dict[str, Any]],
) -> dict[str, Any]:
    questions = merge_page_fragments(page_results)
    return {
        "schema_version": "pdf_page_chain_extraction_v1",
        "pdf_path": str(pdf_path),
        "model": model,
        "total_pages": total_pages,
        "processed_pages": len(page_results),
        "page_results": page_results,
        "questions": questions,
        "validation": validate_page_chain_questions(questions),
    }


def write_payload(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run_pdf_page_chain(
    *,
    pdf_path: str | Path,
    render_root: str | Path,
    output: str | Path,
    model: str = DEFAULT_MODEL,
    max_pages: int | None = None,
    resume: bool = True,
) -> dict[str, Any]:
    load_project_env()
    pdf_path = Path(pdf_path)
    text_pages = extract_pdf_text_pages(pdf_path)
    total_pages = len(text_pages)
    page_indices = list(range(total_pages if max_pages is None else min(total_pages, max_pages)))
    rendered_paths = render_pdf_pages(
        pdf_path,
        page_indices,
        output_dir=Path(render_root) / pdf_path.stem,
    )

    output_path = Path(output)
    page_results: list[dict[str, Any]] = []
    if resume and output_path.exists():
        try:
            existing = json.loads(output_path.read_text(encoding="utf-8"))
            page_results = list(existing.get("page_results") or [])
        except json.JSONDecodeError:
            page_results = []

    done_pages = {int(item.get("page_index")) for item in page_results if isinstance(item, dict)}
    carry_state: dict[str, Any] | None = None
    if page_results:
        carry_state = page_results[-1].get("carry_state") if isinstance(page_results[-1], dict) else None

    for page_index, rendered_path in zip(page_indices, rendered_paths):
        if page_index in done_pages:
            continue
        result = run_page_chain_request(
            model=model,
            pdf_name=pdf_path.name,
            page_index=page_index,
            total_pages=total_pages,
            page_image_path=rendered_path,
            carry_state=carry_state,
        )
        result = normalize_page_chain_result(
            result,
            source_page_index=page_index,
            text_lines=text_pages[page_index],
            carry_state=carry_state,
        )
        result["rendered_page_path"] = str(rendered_path)
        page_results.append(result)
        carry_state = result.get("carry_state") if isinstance(result.get("carry_state"), dict) else carry_state

        payload = build_page_chain_payload(
            pdf_path=pdf_path,
            model=model,
            total_pages=total_pages,
            page_results=page_results,
        )
        write_payload(output_path, payload)
        print(
            "page_chain_progress:",
            f"{len(page_results)}/{len(page_indices)}",
            f"page={page_index + 1}",
            f"questions={len(payload['questions'])}",
            f"open={carry_state.get('open_q_number') if isinstance(carry_state, dict) else None}",
            flush=True,
        )

    final_payload = build_page_chain_payload(
        pdf_path=pdf_path,
        model=model,
        total_pages=total_pages,
        page_results=page_results,
    )
    write_payload(output_path, final_payload)
    return final_payload


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run PDF page-chain 9709 extraction.")
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--render-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-pages", type=int)
    parser.add_argument("--no-resume", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    payload = run_pdf_page_chain(
        pdf_path=args.pdf,
        render_root=args.render_root,
        output=args.output,
        model=args.model,
        max_pages=args.max_pages,
        resume=not args.no_resume,
    )
    print(
        json.dumps(
            {
                "processed_pages": payload["processed_pages"],
                "questions": len(payload["questions"]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
