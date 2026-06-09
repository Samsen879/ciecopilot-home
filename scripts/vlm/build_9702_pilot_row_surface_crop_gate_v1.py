#!/usr/bin/env python3
"""Build 9702 pilot row-surface and crop/render gate artifacts."""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date
import json
from pathlib import Path
import re
from typing import Any

from PIL import Image


SUBJECT_CODE = "9702"
LOCATOR_METHOD = "fitz_text_words_left_margin_9702_pilot_v1"
CROP_METHOD = "pymupdf_rendered_page_question_band_9702_pilot_v1"
ROW_SURFACE_SCHEMA = "9702_pilot_page_chain_surface_v1"
CROP_MANIFEST_SCHEMA = "9702_pilot_crop_manifest_v1"
ROW_GATE_SCHEMA = "9702_pilot_row_surface_gate_v1"
CROP_GATE_SCHEMA = "9702_pilot_crop_render_gate_v1"
DEFAULT_GENERATED_ON = "2026-06-09"
DEFAULT_SLUG = "structural_risk"
MIN_CROP_WIDTH = 120
MIN_CROP_HEIGHT = 80


@dataclass(frozen=True)
class PilotSource:
    source_pdf: str
    q_numbers: tuple[int, ...]
    reason: str
    expected_diagrams_or_tables: bool
    expected_multi_page_question: bool


DEFAULT_PILOT_SOURCES = (
    PilotSource(
        source_pdf="data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
        q_numbers=tuple(range(1, 41)),
        reason="Paper 1 multiple-choice pages; dense standalone row headers.",
        expected_diagrams_or_tables=False,
        expected_multi_page_question=False,
    ),
    PilotSource(
        source_pdf="data/past-papers/9702Physics/paper2/9702_s20_qp_23.pdf",
        q_numbers=tuple(range(1, 8)),
        reason="Paper 2 structured theory questions with multi-page candidates.",
        expected_diagrams_or_tables=False,
        expected_multi_page_question=True,
    ),
    PilotSource(
        source_pdf="data/past-papers/9702Physics/paper3/9702_s23_qp_33.pdf",
        q_numbers=(1, 2),
        reason="Paper 3 practical/experimental question style.",
        expected_diagrams_or_tables=True,
        expected_multi_page_question=True,
    ),
    PilotSource(
        source_pdf="data/past-papers/9702Physics/paper4/9702_w18_qp_42.pdf",
        q_numbers=tuple(range(1, 13)),
        reason="Paper 4 advanced structured questions with diagrams/data.",
        expected_diagrams_or_tables=True,
        expected_multi_page_question=True,
    ),
    PilotSource(
        source_pdf="data/past-papers/9702Physics/paper5/9702_w24_qp_52.pdf",
        q_numbers=(1, 2),
        reason="Paper 5 planning/analysis/statistics style, present in source truth.",
        expected_diagrams_or_tables=False,
        expected_multi_page_question=True,
    ),
)


def repo_path(path_value: str | Path, *, workspace_root: Path) -> str:
    path = Path(path_value)
    if not path.is_absolute():
        path = workspace_root / path
    try:
        return path.resolve().relative_to(workspace_root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def resolve_path(path_value: str | Path, *, workspace_root: Path) -> Path:
    path = Path(path_value)
    return path if path.is_absolute() else workspace_root / path


def parse_9702_source_pdf_path(source_pdf: str | Path) -> dict[str, Any]:
    source = str(source_pdf).replace("\\", "/")
    match = re.match(
        r"^data/past-papers/9702Physics/paper([1-5])/(9702_([msw])(\d{2})_qp_([1-5])(\d)\.pdf)$",
        source,
        re.IGNORECASE,
    )
    if not match:
        raise ValueError(f"Unsupported 9702 source PDF path: {source_pdf}")
    paper_dir, file_name, session, yy, paper, variant = match.groups()
    year = 2000 + int(yy)
    return {
        "subject_code": SUBJECT_CODE,
        "paper": int(paper),
        "paper_dir": f"paper{paper_dir}",
        "session": session.lower(),
        "session_year": f"{session.lower()}{yy}",
        "year": year,
        "component": f"{paper}{variant}",
        "variant": int(variant),
        "source_pdf": source,
        "source_pdf_stem": file_name.replace(".pdf", ""),
    }


def storage_key_for(meta: dict[str, Any], q_number: int) -> str:
    return f"{SUBJECT_CODE}/{meta['session_year']}_qp_{meta['component']}/questions/q{q_number:02d}.png"


def score_question_header_candidate(
    *,
    q_number: int,
    line_text: str,
    first_token_x: float,
    first_token_y: float,
) -> dict[str, Any]:
    compact = " ".join(str(line_text or "").strip().split())
    if not compact:
        return {"accepted": False, "score": 0, "reason": "empty_line"}
    tokens = compact.split()
    expected = str(q_number)
    first = tokens[0].rstrip(".)")
    question_word = len(tokens) >= 2 and tokens[0].lower() == "question" and tokens[1].rstrip(".)") == expected
    if first != expected and not question_word:
        if any(token.rstrip(".)") == expected for token in tokens[1:]):
            return {"accepted": False, "score": 0, "reason": "numeric_token_not_first"}
        return {"accepted": False, "score": 0, "reason": "not_target_question"}
    if first_token_x > 75 or first_token_y <= 35:
        return {"accepted": False, "score": 0, "reason": "outside_header_margin"}

    tail = tokens[2:] if question_word else tokens[1:]
    tail_text = " ".join(tail).lower()
    if tail_text.startswith(("/", "cm", "mm", "kg", "ms")):
        return {"accepted": False, "score": 0, "reason": "measurement_tail"}
    if re.match(r"^\d+(?:\.\d+)?\b", tail_text):
        return {"accepted": False, "score": 0, "reason": "numeric_measurement_tail"}

    score = 32 if not tail else 26
    if question_word:
        score = 34
    return {"accepted": True, "score": score, "reason": "strict_left_margin_question_header"}


def build_surface_row(
    *,
    meta: dict[str, Any],
    q_number: int,
    source_pdf_page_count: int,
    locator: dict[str, Any],
    page_indices: list[int],
    source_manifest_path: str,
    selection_reason: str,
) -> dict[str, Any]:
    page_numbers = [page_index + 1 for page_index in page_indices]
    return {
        "storage_key": storage_key_for(meta, q_number),
        "subject_code": SUBJECT_CODE,
        "syllabus_code": SUBJECT_CODE,
        "paper": meta["paper"],
        "session": meta["session"],
        "session_year": meta["session_year"],
        "year": meta["year"],
        "component": meta["component"],
        "variant": meta["variant"],
        "source_pdf": meta["source_pdf"],
        "source_pdf_page_count": source_pdf_page_count,
        "source_pdf_stem": meta["source_pdf_stem"],
        "q_number": q_number,
        "source_locator_surface_manifest_path": source_manifest_path,
        "source_locator_surface_manifest_reason": selection_reason,
        "locator_method": LOCATOR_METHOD,
        "locator_status": "resolved",
        "locator_confidence": min(0.99, round(0.65 + (float(locator.get("score", 0)) / 100), 3)),
        "locator": {**locator, "method": LOCATOR_METHOD},
        "page_indices": page_indices,
        "page_numbers": page_numbers,
        "page_range": {
            "start_page_index": page_indices[0],
            "end_page_index": page_indices[-1],
            "start_page_number": page_numbers[0],
            "end_page_number": page_numbers[-1],
        },
        "route_hint": "pdf_page_chain_locator",
        "rendered_pdf_page_paths": [],
        "crop_paths": [],
        "review_crop_paths": [],
        "crop_status": "not_generated",
        "surface_evidence_status": "locator_resolved_pending_crop_render_and_visual_review",
        "page_chain_surface_status": "locator_rows_ready_pending_crop_render_visual_review",
        "text_evidence_status": "not_extracted",
        "normalized_plain_text": None,
        "text_consumption_status": "not_ready_missing_question_plain_text",
        "text_only_ready": False,
        "image_context_required": True,
        "requires_review": True,
        "visual_review_required": True,
        "visual_review_reason": "not_rendered_or_cropped_not_vlm_reviewed",
        "production_ready_claimed": False,
        "db_consumption_claimed": False,
        "search_consumption_claimed": False,
        "rag_consumption_claimed": False,
        "external_vlm_or_api_used": False,
        "external_ocr_rerun_used": False,
    }


def line_records_for_page(page: Any) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    for word in sorted(page.get_text("words"), key=lambda item: (round(float(item[1]), 1), float(item[0]))):
        x0, y0, x1, y1, text, *_rest = word
        if not str(text).strip():
            continue
        matched = None
        for line in lines:
            if abs(line["y"] - float(y0)) <= 2.0:
                matched = line
                break
        if matched is None:
            matched = {"y": float(y0), "words": []}
            lines.append(matched)
        matched["words"].append(
            {
                "x0": float(x0),
                "x1": float(x1),
                "y0": float(y0),
                "y1": float(y1),
                "text": str(text).strip(),
            },
        )

    records = []
    for line in lines:
        words = sorted(line["words"], key=lambda item: item["x0"])
        records.append(
            {
                "text": " ".join(word["text"] for word in words),
                "x": words[0]["x0"],
                "y": line["y"],
                "words": words,
            },
        )
    return records


def detect_question_headers(
    source_pdf_path: Path,
    *,
    expected_q_numbers: tuple[int, ...],
) -> tuple[dict[int, dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], int]:
    import fitz  # type: ignore

    accepted: dict[int, dict[str, Any]] = {}
    rejected: list[dict[str, Any]] = []
    ambiguous: list[dict[str, Any]] = []
    expected = set(expected_q_numbers)
    with fitz.open(str(source_pdf_path)) as document:
        page_count = document.page_count
        for page_index in range(1, document.page_count):
            page = document.load_page(page_index)
            for line in line_records_for_page(page):
                tokens = line["text"].split()
                for token_index, token in enumerate(tokens):
                    stripped = token.rstrip(".)")
                    if not stripped.isdigit():
                        continue
                    q_number = int(stripped)
                    if q_number not in expected:
                        continue
                    word_index = min(token_index, len(line["words"]) - 1)
                    token_word = line["words"][word_index]
                    score = score_question_header_candidate(
                        q_number=q_number,
                        line_text=line["text"],
                        first_token_x=float(token_word["x0"]),
                        first_token_y=float(token_word["y0"]),
                    )
                    record = {
                        "q_number": q_number,
                        "page_index": page_index,
                        "page_number": page_index + 1,
                        "text": stripped,
                        "x": round(float(token_word["x0"]), 3),
                        "y": round(float(token_word["y0"]), 3),
                        "line_text": line["text"],
                        "score": score["score"],
                        "reason": score["reason"],
                    }
                    if not score["accepted"]:
                        rejected.append(record)
                        continue
                    if q_number in accepted:
                        ambiguous.append({"q_number": q_number, "candidate": record, "accepted": accepted[q_number]})
                        continue
                    accepted[q_number] = record
        return accepted, rejected, ambiguous, page_count


def page_indices_for_headers(headers: dict[int, dict[str, Any]], q_number: int, page_count: int, max_pages: int) -> list[int]:
    ordered = sorted(headers.values(), key=lambda item: (item["page_index"], item["y"], item["q_number"]))
    current = headers[q_number]
    later = [
        header
        for header in ordered
        if (header["page_index"], header["y"]) > (current["page_index"], current["y"])
    ]
    end = page_count - 1
    if later:
        next_header = later[0]
        end = current["page_index"] if next_header["page_index"] == current["page_index"] else next_header["page_index"] - 1
    end = min(end, current["page_index"] + max_pages - 1)
    return list(range(current["page_index"], end + 1))


def render_pdf_pages(source_pdf_path: Path, *, output_root: Path, scale: float) -> list[Path]:
    import fitz  # type: ignore

    output_dir = output_root / "renders" / source_pdf_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)
    rendered = []
    with fitz.open(str(source_pdf_path)) as document:
        matrix = fitz.Matrix(scale, scale)
        for page_index in range(document.page_count):
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            output = output_dir / f"{source_pdf_path.stem}_page_{page_index + 1:03d}.png"
            pixmap.save(str(output))
            rendered.append(output)
    return rendered


def crop_box_to_pixels(
    box: tuple[float, float, float, float],
    *,
    rendered_width: int,
    rendered_height: int,
    page_width: float,
    page_height: float,
) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    scale_x = rendered_width / page_width
    scale_y = rendered_height / page_height
    return (
        max(0, min(rendered_width - 1, round(x1 * scale_x))),
        max(0, min(rendered_height - 1, round(y1 * scale_y))),
        max(1, min(rendered_width, round(x2 * scale_x))),
        max(1, min(rendered_height, round(y2 * scale_y))),
    )


def build_crop_records(
    *,
    source_pdf_path: Path,
    row: dict[str, Any],
    headers: dict[int, dict[str, Any]],
    rendered_paths: list[Path],
    output_root: Path,
    workspace_root: Path,
    padding_points: float,
) -> tuple[list[dict[str, Any]], list[str]]:
    import fitz  # type: ignore

    q_number = int(row["q_number"])
    current = headers[q_number]
    later_on_start_page = [
        header
        for header in headers.values()
        if header["page_index"] == current["page_index"]
        and (header["page_index"], header["y"]) > (current["page_index"], current["y"])
    ]
    next_on_start_page = sorted(later_on_start_page, key=lambda item: item["y"])[0] if later_on_start_page else None
    crop_dir = output_root / "question-crops" / source_pdf_path.stem / f"q{q_number:02d}"
    crop_dir.mkdir(parents=True, exist_ok=True)
    records = []
    issues = []

    with fitz.open(str(source_pdf_path)) as document:
        for page_index in row["page_indices"]:
            page = document.load_page(page_index)
            top = max(0.0, current["y"] - padding_points) if page_index == current["page_index"] else 0.0
            bottom = float(page.rect.height)
            if next_on_start_page and page_index == current["page_index"]:
                bottom = max(top + 1.0, next_on_start_page["y"] - padding_points)
            box_points = (0.0, top, float(page.rect.width), bottom)

            rendered_path = rendered_paths[page_index]
            with Image.open(rendered_path) as image:
                pixel_box = crop_box_to_pixels(
                    box_points,
                    rendered_width=image.width,
                    rendered_height=image.height,
                    page_width=float(page.rect.width),
                    page_height=float(page.rect.height),
                )
                crop_path = crop_dir / f"q{q_number:02d}_page_{page_index + 1:03d}.png"
                image.crop(pixel_box).save(crop_path)

            record = {
                "page_index": page_index,
                "page_number": page_index + 1,
                "rendered_pdf_page_path": repo_path(rendered_path, workspace_root=workspace_root),
                "crop_path": repo_path(crop_path, workspace_root=workspace_root),
                "crop_box_points": [round(value, 3) for value in box_points],
                "crop_box_pixels": list(pixel_box),
            }
            record_issues = validate_crop_record(record, workspace_root=workspace_root)
            issues.extend(f"{issue}:page_{page_index + 1}" for issue in record_issues)
            records.append(record)
    return records, issues


def validate_crop_record(record: dict[str, Any], *, workspace_root: Path) -> list[str]:
    issues = []
    rendered = resolve_path(record["rendered_pdf_page_path"], workspace_root=workspace_root)
    crop = resolve_path(record["crop_path"], workspace_root=workspace_root)
    if not rendered.exists() or rendered.stat().st_size <= 0:
        issues.append("rendered_page_missing_or_empty")
    if not crop.exists() or crop.stat().st_size <= 0:
        issues.append("crop_missing_or_empty")
        return issues
    try:
        with Image.open(crop) as image:
            if image.width < MIN_CROP_WIDTH or image.height < MIN_CROP_HEIGHT:
                issues.append("crop_dimensions_too_small")
    except Exception:
        issues.append("crop_unreadable")
    return issues


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def render_row_gate_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# 9702 pilot row-surface gate",
        "",
        f"- generated_on: `{report['generated_on']}`",
        f"- gate_status: `{report['gate_status']}`",
        "- production_ready_claimed: `false`",
        "- external VLM/API calls: `0`",
        "- DB/search/read-model/RAG writes: `0`",
        "",
        "## Pilot Selection",
        "",
        "| source | pages | expected rows | reason |",
        "| --- | ---: | ---: | --- |",
    ]
    for source in report["pilot_selection"]:
        lines.append(f"| `{source['source_pdf']}` | {source['page_count']} | {source['expected_row_count']} | {source['reason']} |")
    lines.extend(
        [
            "",
            "## Counts",
            "",
            f"- accepted_rows: `{report['counts']['accepted_rows']}`",
            f"- duplicate_row_identities: `{report['counts']['duplicate_row_identities']}`",
            f"- missing_printed_headers: `{report['counts']['missing_printed_headers']}`",
            f"- ambiguous_boundaries: `{report['counts']['ambiguous_boundaries']}`",
            f"- rejected_false_positive_candidates: `{report['counts']['rejected_false_positive_candidates']}`",
            f"- production_ready_claimed: `{str(report['production_ready_claimed']).lower()}`",
            "",
            "## Rejected / Ambiguous Rows",
            "",
            "```json",
            json.dumps(report["rejections"], ensure_ascii=False, indent=2),
            "```",
            "",
            "## Boundary",
            "",
            "This is a pilot foundation gate only. It does not claim all-9702 readiness and does not run production DB, search, read-model, or RAG writes.",
        ],
    )
    return "\n".join(lines) + "\n"


def render_crop_gate_markdown(report: dict[str, Any]) -> str:
    return "\n".join(
        [
            "# 9702 pilot crop/render gate",
            "",
            f"- generated_on: `{report['generated_on']}`",
            f"- gate_status: `{report['gate_status']}`",
            "- production_ready_claimed: `false`",
            "- external VLM/API calls: `0`",
            "- DB/search/read-model/RAG writes: `0`",
            "",
            "## Counts",
            "",
            f"- crop_rows_total: `{report['counts']['crop_rows_total']}`",
            f"- crop_rows_complete: `{report['counts']['crop_rows_complete']}`",
            f"- missing_crop_files: `{report['counts']['missing_crop_files']}`",
            f"- missing_rendered_pages: `{report['counts']['missing_rendered_pages']}`",
            f"- multi_page_rows: `{report['counts']['multi_page_rows']}`",
            f"- rendered_pages: `{report['counts']['rendered_pages']}`",
            "",
            "## Blockers",
            "",
            "```json",
            json.dumps(report["blockers"], ensure_ascii=False, indent=2),
            "```",
            "",
            "## Boundary",
            "",
            "This output validates local render/crop presence only. Visual acceptance, text normalization, authority alignment, and production writes remain out of scope.",
        ],
    ) + "\n"


def build_gate(
    *,
    workspace_root: Path,
    generated_on: str,
    slug: str,
    output_root: Path,
    row_manifest_path: Path,
    crop_manifest_path: Path,
    row_report_json_path: Path,
    row_report_md_path: Path,
    crop_report_json_path: Path,
    crop_report_md_path: Path,
    render_scale: float,
    max_pages_per_row: int,
    padding_points: float,
) -> dict[str, Any]:
    rows = []
    crop_items = []
    pilot_selection = []
    missing_headers = []
    ambiguous = []
    rejected = []
    rendered_page_count = 0
    row_manifest_repo_path = repo_path(row_manifest_path, workspace_root=workspace_root)
    render_cache: dict[str, list[Path]] = {}
    headers_cache: dict[str, dict[int, dict[str, Any]]] = {}

    for pilot in DEFAULT_PILOT_SOURCES:
        source_pdf = resolve_path(pilot.source_pdf, workspace_root=workspace_root)
        meta = parse_9702_source_pdf_path(pilot.source_pdf)
        headers, source_rejected, source_ambiguous, page_count = detect_question_headers(
            source_pdf,
            expected_q_numbers=pilot.q_numbers,
        )
        rendered = render_pdf_pages(source_pdf, output_root=output_root, scale=render_scale)
        render_cache[pilot.source_pdf] = rendered
        headers_cache[pilot.source_pdf] = headers
        rendered_page_count += len(rendered)
        missing = [q for q in pilot.q_numbers if q not in headers]
        missing_headers.extend(
            {
                "source_pdf": pilot.source_pdf,
                "q_number": q,
                "reason": "missing_printed_question_header",
            }
            for q in missing
        )
        ambiguous.extend({"source_pdf": pilot.source_pdf, **item} for item in source_ambiguous)
        rejected.extend({"source_pdf": pilot.source_pdf, **item} for item in source_rejected)
        pilot_selection.append(
            {
                "source_pdf": pilot.source_pdf,
                "page_count": page_count,
                "expected_row_count": len(pilot.q_numbers),
                "detected_row_count": len(headers),
                "missing_header_count": len(missing),
                "reason": pilot.reason,
                "expected_diagrams_or_tables": pilot.expected_diagrams_or_tables,
                "expected_multi_page_question": pilot.expected_multi_page_question,
            },
        )

        for q_number in pilot.q_numbers:
            if q_number not in headers:
                continue
            page_indices = page_indices_for_headers(headers, q_number, page_count, max_pages_per_row)
            row = build_surface_row(
                meta=meta,
                q_number=q_number,
                source_pdf_page_count=page_count,
                locator=headers[q_number],
                page_indices=page_indices,
                source_manifest_path=row_manifest_repo_path,
                selection_reason=pilot.reason,
            )
            rows.append(row)

    seen = set()
    duplicate_row_identities = []
    for row in rows:
        identity = (
            row["subject_code"],
            row["paper"],
            row["session_year"],
            row["component"],
            row["source_pdf"],
            row["storage_key"],
            row["q_number"],
        )
        if identity in seen:
            duplicate_row_identities.append({"storage_key": row["storage_key"], "q_number": row["q_number"]})
        seen.add(identity)

    for row in rows:
        source_pdf = row["source_pdf"]
        source_pdf_path = resolve_path(source_pdf, workspace_root=workspace_root)
        crop_records, crop_issues = build_crop_records(
            source_pdf_path=source_pdf_path,
            row=row,
            headers=headers_cache[source_pdf],
            rendered_paths=render_cache[source_pdf],
            output_root=output_root,
            workspace_root=workspace_root,
            padding_points=padding_points,
        )
        crop_status = "complete" if not crop_issues else "blocked"
        updated_row = {
            **row,
            "rendered_pdf_page_paths": [record["rendered_pdf_page_path"] for record in crop_records],
            "crop_paths": [record["crop_path"] for record in crop_records],
            "review_crop_paths": [record["crop_path"] for record in crop_records],
            "crop_records": crop_records,
            "crop_status": crop_status,
            "local_extraction_crop_method": CROP_METHOD,
            "surface_evidence_status": (
                "local_pilot_crop_render_complete_pending_visual_review"
                if crop_status == "complete"
                else "local_pilot_crop_render_blocked"
            ),
            "page_chain_surface_status": (
                "pilot_crop_render_complete_pending_visual_review"
                if crop_status == "complete"
                else "pilot_crop_render_blocked"
            ),
            "visual_review_reason": "local_crop_render_complete_not_vlm_reviewed",
            "mechanical_validation": {
                "crop_files_exist": crop_status == "complete",
                "crop_images_non_empty": crop_status == "complete",
                "referenced_rendered_pages_exist": crop_status == "complete",
                "validation_issues": crop_issues,
            },
        }
        crop_items.append(updated_row)

    row_manifest = {
        "schema_version": ROW_SURFACE_SCHEMA,
        "manifest_id": row_manifest_path.name.replace(".json", ""),
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "pilot_slug": slug,
        "stage": "9702_pilot_row_surface_locator",
        "surface_status": "pilot_crop_render_complete_pending_visual_review",
        "production_ready_claimed": False,
        "item_count": len(crop_items),
        "source_pdf_count": len(DEFAULT_PILOT_SOURCES),
        "source_pdf_paths": [source.source_pdf for source in DEFAULT_PILOT_SOURCES],
        "boundary": {
            "local_deterministic_locator_surface": True,
            "production_ready_claimed": False,
            "canonical_question_text_claimed": False,
            "normalized_plain_text_claimed": False,
            "db_consumption_claimed": False,
            "search_consumption_claimed": False,
            "rag_consumption_claimed": False,
            "external_vlm_or_api_used": False,
            "external_ocr_rerun_used": False,
        },
        "pilot_selection": pilot_selection,
        "items": crop_items,
    }
    crop_manifest = {
        "schema_version": CROP_MANIFEST_SCHEMA,
        "manifest_id": crop_manifest_path.name.replace(".json", ""),
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "source_manifest_path": row_manifest_repo_path,
        "output_root": repo_path(output_root, workspace_root=workspace_root),
        "production_ready_claimed": False,
        "item_count": len(crop_items),
        "items": crop_items,
    }

    missing_crop_files = sum(1 for item in crop_items if item["crop_status"] != "complete")
    missing_rendered_pages = sum(1 for item in crop_items if not item["rendered_pdf_page_paths"])
    gate_pass = not duplicate_row_identities and not missing_headers and not ambiguous and not missing_crop_files and not missing_rendered_pages
    row_report = {
        "schema_version": ROW_GATE_SCHEMA,
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "pilot_slug": slug,
        "gate_status": "passed" if gate_pass else "blocked",
        "production_ready_claimed": False,
        "external_vlm_or_api_used": False,
        "external_ocr_rerun_used": False,
        "db_consumption_claimed": False,
        "search_consumption_claimed": False,
        "rag_consumption_claimed": False,
        "pilot_selection": pilot_selection,
        "artifacts": {
            "page_chain_surface_manifest": row_manifest_repo_path,
            "crop_manifest": repo_path(crop_manifest_path, workspace_root=workspace_root),
        },
        "counts": {
            "accepted_rows": len(crop_items),
            "duplicate_row_identities": len(duplicate_row_identities),
            "missing_printed_headers": len(missing_headers),
            "ambiguous_boundaries": len(ambiguous),
            "rejected_false_positive_candidates": len(rejected),
            "missing_crop_files": missing_crop_files,
            "missing_rendered_pages": missing_rendered_pages,
        },
        "rejections": {
            "missing_printed_headers": missing_headers,
            "ambiguous_boundaries": ambiguous,
            "false_positive_candidates": rejected,
            "duplicate_row_identities": duplicate_row_identities,
        },
        "stop_boundary": {
            "production_ready_claimed": False,
            "full_scaleout_authorized": False,
            "visual_acceptance_claimed": False,
            "text_normalization_claimed": False,
            "db_search_read_model_rag_writes": 0,
        },
    }
    crop_report = {
        "schema_version": CROP_GATE_SCHEMA,
        "generated_on": generated_on,
        "subject_code": SUBJECT_CODE,
        "pilot_slug": slug,
        "gate_status": "passed" if gate_pass else "blocked",
        "production_ready_claimed": False,
        "external_vlm_or_api_used": False,
        "external_ocr_rerun_used": False,
        "db_consumption_claimed": False,
        "search_consumption_claimed": False,
        "rag_consumption_claimed": False,
        "artifacts": {
            "page_chain_surface_manifest": row_manifest_repo_path,
            "crop_manifest": repo_path(crop_manifest_path, workspace_root=workspace_root),
        },
        "counts": {
            "crop_rows_total": len(crop_items),
            "crop_rows_complete": sum(1 for item in crop_items if item["crop_status"] == "complete"),
            "missing_crop_files": missing_crop_files,
            "missing_rendered_pages": missing_rendered_pages,
            "multi_page_rows": sum(1 for item in crop_items if len(item["page_indices"]) > 1),
            "rendered_pages": rendered_page_count,
            "duplicate_row_identities": len(duplicate_row_identities),
        },
        "blockers": [
            {
                "storage_key": item["storage_key"],
                "source_pdf": item["source_pdf"],
                "q_number": item["q_number"],
                "validation": item["mechanical_validation"],
            }
            for item in crop_items
            if item["crop_status"] != "complete"
        ],
        "stop_boundary": {
            "production_ready_claimed": False,
            "full_scaleout_authorized": False,
            "visual_acceptance_claimed": False,
            "text_normalization_claimed": False,
            "db_search_read_model_rag_writes": 0,
        },
    }

    write_json(row_manifest_path, row_manifest)
    write_json(crop_manifest_path, crop_manifest)
    write_json(row_report_json_path, row_report)
    write_json(crop_report_json_path, crop_report)
    row_report_md_path.parent.mkdir(parents=True, exist_ok=True)
    crop_report_md_path.parent.mkdir(parents=True, exist_ok=True)
    row_report_md_path.write_text(render_row_gate_markdown(row_report), encoding="utf-8")
    crop_report_md_path.write_text(render_crop_gate_markdown(crop_report), encoding="utf-8")

    return {"row_report": row_report, "crop_report": crop_report}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build 9702 pilot row-surface and crop/render gate artifacts.")
    parser.add_argument("--generated-on", default=DEFAULT_GENERATED_ON)
    parser.add_argument("--slug", default=DEFAULT_SLUG)
    parser.add_argument("--output-root", type=Path, default=Path("data/crops/9702-pilot"))
    parser.add_argument(
        "--row-manifest",
        type=Path,
        default=Path("data/manifests/9702_pilot_structural_risk_page_chain_surface_v1.json"),
    )
    parser.add_argument(
        "--crop-manifest",
        type=Path,
        default=Path("data/manifests/9702_pilot_crop_manifest_2026_06_09_v1.json"),
    )
    parser.add_argument(
        "--row-report-json",
        type=Path,
        default=Path("docs/reports/2026-06-09-9702-pilot-row-surface-gate.json"),
    )
    parser.add_argument(
        "--row-report-md",
        type=Path,
        default=Path("docs/reports/2026-06-09-9702-pilot-row-surface-gate.md"),
    )
    parser.add_argument(
        "--crop-report-json",
        type=Path,
        default=Path("docs/reports/2026-06-09-9702-pilot-crop-render-gate.json"),
    )
    parser.add_argument(
        "--crop-report-md",
        type=Path,
        default=Path("docs/reports/2026-06-09-9702-pilot-crop-render-gate.md"),
    )
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--max-pages-per-row", type=int, default=8)
    parser.add_argument("--padding-points", type=float, default=20.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    workspace_root = Path.cwd()
    result = build_gate(
        workspace_root=workspace_root,
        generated_on=args.generated_on or date.today().isoformat(),
        slug=args.slug,
        output_root=args.output_root,
        row_manifest_path=args.row_manifest,
        crop_manifest_path=args.crop_manifest,
        row_report_json_path=args.row_report_json,
        row_report_md_path=args.row_report_md,
        crop_report_json_path=args.crop_report_json,
        crop_report_md_path=args.crop_report_md,
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
    return 0 if result["row_report"]["gate_status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
