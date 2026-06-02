#!/usr/bin/env python3
"""Build local-only pre-shard render/crop evidence for 9709 new-paper input rows."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
import json
from pathlib import Path
import sys
from typing import Any, Iterable

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.pdf_page_locator_v1 import (  # noqa: E402
    _candidate_page_indices,
    extract_pdf_text_pages,
)


SCHEMA_VERSION = "9709_new_papers_pre_shard_crop_gate_v1"
CROP_MANIFEST_SCHEMA_VERSION = "9709_new_papers_pre_shard_crop_manifest_v1"
LOCAL_METHOD = "pymupdf_text_words_question_band_v1"
NEW_SESSION_YEARS = ("m25", "s25", "w24", "w25")
MIN_CROP_WIDTH = 120
MIN_CROP_HEIGHT = 80


@dataclass(frozen=True)
class InputRow:
    item: dict[str, Any]
    input_manifest_path: Path
    row_index: int


@dataclass(frozen=True)
class QuestionStart:
    q_number: int
    page_index: int
    y0: float
    x0: float
    text: str


@dataclass
class PdfContext:
    source_pdf: Path
    shard_id: str
    pdf_stem: str
    page_count: int
    rendered_page_paths: list[Path]
    text_pages: list[list[str]]
    question_starts: dict[int, QuestionStart]


def discover_new_input_manifests(manifest_dir: str | Path = "data/manifests") -> list[Path]:
    root = Path(manifest_dir)
    return [
        root / f"9709_p{paper}_{session_year}_standard_001_input_v1.json"
        for paper in range(1, 7)
        for session_year in NEW_SESSION_YEARS
        if (root / f"9709_p{paper}_{session_year}_standard_001_input_v1.json").exists()
    ]


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


def _load_input_rows(
    manifest_paths: Iterable[str | Path],
    *,
    workspace_root: Path,
) -> tuple[list[InputRow], list[dict[str, Any]]]:
    rows: list[InputRow] = []
    blockers: list[dict[str, Any]] = []
    seen_storage_keys: dict[str, str] = {}
    for manifest_path_like in manifest_paths:
        manifest_path = _resolve_path(manifest_path_like, workspace_root=workspace_root)
        if not manifest_path.exists():
            blockers.append(
                {
                    "reason": "input_manifest_missing",
                    "input_manifest_path": _display_path(manifest_path, workspace_root=workspace_root),
                }
            )
            continue
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        items = payload.get("items")
        if not isinstance(items, list):
            blockers.append(
                {
                    "reason": "input_manifest_items_not_list",
                    "input_manifest_path": _display_path(manifest_path, workspace_root=workspace_root),
                }
            )
            continue
        for row_index, item in enumerate(items):
            if not isinstance(item, dict):
                blockers.append(
                    {
                        "reason": "input_manifest_row_not_object",
                        "input_manifest_path": _display_path(manifest_path, workspace_root=workspace_root),
                        "row_index": row_index,
                    }
                )
                continue
            storage_key = str(item.get("storage_key") or "")
            if not storage_key:
                blockers.append(
                    {
                        "reason": "storage_key_missing",
                        "input_manifest_path": _display_path(manifest_path, workspace_root=workspace_root),
                        "row_index": row_index,
                    }
                )
                continue
            if storage_key in seen_storage_keys:
                blockers.append(
                    {
                        "reason": "duplicate_storage_key",
                        "storage_key": storage_key,
                        "first_input_manifest_path": seen_storage_keys[storage_key],
                        "input_manifest_path": _display_path(manifest_path, workspace_root=workspace_root),
                    }
                )
                continue
            seen_storage_keys[storage_key] = _display_path(manifest_path, workspace_root=workspace_root)
            source_pdf = item.get("source_pdf")
            if not source_pdf or not _resolve_path(str(source_pdf), workspace_root=workspace_root).exists():
                blockers.append(
                    {
                        "reason": "source_pdf_missing",
                        "storage_key": storage_key,
                        "source_pdf": str(source_pdf or ""),
                        "input_manifest_path": _display_path(manifest_path, workspace_root=workspace_root),
                    }
                )
            rows.append(InputRow(item=item, input_manifest_path=manifest_path, row_index=row_index))
    return rows, blockers


def _render_all_pdf_pages(
    pdf_path: Path,
    *,
    output_dir: Path,
    scale: float,
) -> list[Path]:
    try:
        import fitz  # type: ignore
    except ImportError as error:  # pragma: no cover - environment guard
        raise RuntimeError("PyMuPDF/fitz is required for PDF page rendering") from error

    output_dir.mkdir(parents=True, exist_ok=True)
    rendered: list[Path] = []
    with fitz.open(str(pdf_path)) as document:
        matrix = fitz.Matrix(scale, scale)
        for page_index in range(len(document)):
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            output_path = output_dir / f"{pdf_path.stem}_page_{page_index + 1:03d}.png"
            pixmap.save(str(output_path))
            rendered.append(output_path)
    return rendered


def _extract_question_starts(pdf_path: Path, *, x_max: float = 70.0) -> dict[int, QuestionStart]:
    try:
        import fitz  # type: ignore
    except ImportError as error:  # pragma: no cover - environment guard
        raise RuntimeError("PyMuPDF/fitz is required for PDF word-position extraction") from error

    starts: dict[int, QuestionStart] = {}
    with fitz.open(str(pdf_path)) as document:
        for page_index, page in enumerate(document):
            if page_index == 0:
                continue
            for word in page.get_text("words"):
                x0, y0, _x1, _y1, text, *_rest = word
                token = str(text).strip().rstrip(".")
                if not token.isdigit():
                    continue
                q_number = int(token)
                if q_number < 1 or q_number > 15:
                    continue
                if float(x0) > x_max or float(y0) <= 35:
                    continue
                starts.setdefault(
                    q_number,
                    QuestionStart(
                        q_number=q_number,
                        page_index=page_index,
                        y0=float(y0),
                        x0=float(x0),
                        text=str(text),
                    ),
                )
    return starts


def _build_pdf_context(
    *,
    source_pdf: Path,
    shard_id: str,
    output_root: Path,
    render_scale: float,
) -> PdfContext:
    pdf_stem = source_pdf.stem
    rendered_page_paths = _render_all_pdf_pages(
        source_pdf,
        output_dir=output_root / shard_id / "renders" / pdf_stem,
        scale=render_scale,
    )
    text_pages = extract_pdf_text_pages(source_pdf)
    question_starts = _extract_question_starts(source_pdf)
    return PdfContext(
        source_pdf=source_pdf,
        shard_id=shard_id,
        pdf_stem=pdf_stem,
        page_count=len(rendered_page_paths),
        rendered_page_paths=rendered_page_paths,
        text_pages=text_pages,
        question_starts=question_starts,
    )


def _question_page_indices(
    context: PdfContext,
    *,
    q_number: int,
    max_pages: int,
) -> list[int]:
    start = context.question_starts.get(q_number)
    if start is None:
        return []
    return _candidate_page_indices(
        context.text_pages,
        start.page_index,
        q_number,
        max_pages,
    )


def _next_question_start_on_page(
    context: PdfContext,
    *,
    q_number: int,
    page_index: int,
    after_y: float | None,
) -> QuestionStart | None:
    candidates = [
        start
        for next_q, start in context.question_starts.items()
        if next_q > q_number
        and start.page_index == page_index
        and (after_y is None or start.y0 > after_y + 8)
    ]
    if not candidates:
        return None
    return min(candidates, key=lambda start: (start.y0, start.q_number))


def _page_crop_bounds(
    context: PdfContext,
    *,
    q_number: int,
    page_index: int,
    is_first_page: bool,
    padding_points: float,
) -> list[float] | None:
    try:
        import fitz  # type: ignore
    except ImportError as error:  # pragma: no cover - environment guard
        raise RuntimeError("PyMuPDF/fitz is required for PDF crop bounds") from error

    with fitz.open(str(context.source_pdf)) as document:
        page = document.load_page(page_index)
        page_height = float(page.rect.height)
        start = context.question_starts.get(q_number) if is_first_page else None
        top = max(0.0, (start.y0 if start else 0.0) - padding_points)
        next_start = _next_question_start_on_page(
            context,
            q_number=q_number,
            page_index=page_index,
            after_y=start.y0 if start else None,
        )
        bottom = page_height
        if next_start is not None:
            bottom = max(top + 1.0, next_start.y0 - padding_points)
        if bottom <= top:
            return None
        return [0.0, top, float(page.rect.width), bottom]


def _crop_box_to_pixels(
    crop_box_points: list[float],
    *,
    rendered_width: int,
    rendered_height: int,
    page_width_points: float,
    page_height_points: float,
) -> list[int]:
    x1, y1, x2, y2 = crop_box_points
    scale_x = rendered_width / page_width_points
    scale_y = rendered_height / page_height_points
    return [
        max(0, min(rendered_width - 1, round(x1 * scale_x))),
        max(0, min(rendered_height - 1, round(y1 * scale_y))),
        max(1, min(rendered_width, round(x2 * scale_x))),
        max(1, min(rendered_height, round(y2 * scale_y))),
    ]


def _write_question_crop(
    context: PdfContext,
    *,
    q_number: int,
    page_index: int,
    crop_box_points: list[float],
    output_root: Path,
    workspace_root: Path,
) -> dict[str, Any]:
    try:
        import fitz  # type: ignore
    except ImportError as error:  # pragma: no cover - environment guard
        raise RuntimeError("PyMuPDF/fitz is required for PDF crop scaling") from error

    rendered_path = context.rendered_page_paths[page_index]
    with Image.open(rendered_path) as image, fitz.open(str(context.source_pdf)) as document:
        page = document.load_page(page_index)
        pixel_box = _crop_box_to_pixels(
            crop_box_points,
            rendered_width=image.width,
            rendered_height=image.height,
            page_width_points=float(page.rect.width),
            page_height_points=float(page.rect.height),
        )
        q_dir = output_root / context.shard_id / "question-crops" / context.pdf_stem / f"q{q_number:02d}"
        q_dir.mkdir(parents=True, exist_ok=True)
        crop_path = q_dir / f"q{q_number:02d}_page_{page_index + 1:03d}.png"
        image.crop(tuple(pixel_box)).save(crop_path)
    return {
        "page_index": page_index,
        "rendered_pdf_page_path": _display_path(rendered_path, workspace_root=workspace_root),
        "crop_path": _display_path(crop_path, workspace_root=workspace_root),
        "crop_box_points": [round(value, 3) for value in crop_box_points],
        "crop_box_pixels": pixel_box,
    }


def _validate_crop_record(record: dict[str, Any], *, workspace_root: Path) -> list[str]:
    issues: list[str] = []
    rendered = _resolve_path(record["rendered_pdf_page_path"], workspace_root=workspace_root)
    crop = _resolve_path(record["crop_path"], workspace_root=workspace_root)
    if not rendered.exists():
        issues.append("referenced_rendered_page_missing")
    if not crop.exists():
        issues.append("crop_file_missing")
        return issues
    if crop.stat().st_size <= 0:
        issues.append("crop_file_empty")
        return issues
    try:
        with Image.open(crop) as image:
            if image.width < MIN_CROP_WIDTH or image.height < MIN_CROP_HEIGHT:
                issues.append("crop_dimensions_too_small")
            if image.width <= 0 or image.height <= 0:
                issues.append("crop_image_empty")
    except Exception:
        issues.append("crop_image_unreadable")
    return issues


def _blocked_item(
    row: InputRow,
    *,
    reason: str,
    workspace_root: Path,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    item = row.item
    return {
        "storage_key": item.get("storage_key"),
        "source_pdf": str(item.get("source_pdf") or ""),
        "q_number": item.get("q_number"),
        "shard_id": item.get("shard_id"),
        "input_manifest_path": _display_path(row.input_manifest_path, workspace_root=workspace_root),
        "page_indices": [],
        "page_range": None,
        "rendered_pdf_page_paths": [],
        "crop_paths": [],
        "crop_records": [],
        "crop_status": "blocked",
        "blocker_reason": reason,
        "local_extraction_crop_method": LOCAL_METHOD,
        "visual_review_required": True,
        "visual_review_reason": "not_vlm_reviewed_local_only",
        **(details or {}),
    }


def _build_row_crop_item(
    row: InputRow,
    *,
    context: PdfContext,
    output_root: Path,
    workspace_root: Path,
    max_pages: int,
    padding_points: float,
) -> dict[str, Any]:
    source = row.item
    q_number = int(source["q_number"])
    start = context.question_starts.get(q_number)
    if start is None:
        return _blocked_item(
            row,
            reason="question_header_word_not_found",
            workspace_root=workspace_root,
            details={
                "blocker_detail": "No strict left-margin printed question number was found in the PDF text layer.",
            },
        )

    page_indices = _question_page_indices(context, q_number=q_number, max_pages=max_pages)
    if not page_indices:
        return _blocked_item(
            row,
            reason="question_page_indices_not_resolved",
            workspace_root=workspace_root,
        )

    crop_records: list[dict[str, Any]] = []
    validation_issues: list[str] = []
    for page_index in page_indices:
        if page_index < 0 or page_index >= len(context.rendered_page_paths):
            validation_issues.append(f"page_index_out_of_range:{page_index}")
            continue
        bounds = _page_crop_bounds(
            context,
            q_number=q_number,
            page_index=page_index,
            is_first_page=page_index == start.page_index,
            padding_points=padding_points,
        )
        if bounds is None:
            validation_issues.append(f"invalid_crop_bounds:page_{page_index}")
            continue
        record = _write_question_crop(
            context,
            q_number=q_number,
            page_index=page_index,
            crop_box_points=bounds,
            output_root=output_root,
            workspace_root=workspace_root,
        )
        record_issues = _validate_crop_record(record, workspace_root=workspace_root)
        if record_issues:
            validation_issues.extend(f"{issue}:page_{page_index}" for issue in record_issues)
        crop_records.append(record)

    if validation_issues or not crop_records:
        return _blocked_item(
            row,
            reason="crop_mechanical_validation_failed",
            workspace_root=workspace_root,
            details={
                "page_indices": page_indices,
                "crop_records": crop_records,
                "crop_paths": [record["crop_path"] for record in crop_records],
                "rendered_pdf_page_paths": [record["rendered_pdf_page_path"] for record in crop_records],
                "validation_issues": validation_issues,
            },
        )

    return {
        **source,
        "source_pdf": _display_path(context.source_pdf, workspace_root=workspace_root),
        "input_manifest_path": _display_path(row.input_manifest_path, workspace_root=workspace_root),
        "rendered_pdf_page_paths": [record["rendered_pdf_page_path"] for record in crop_records],
        "crop_paths": [record["crop_path"] for record in crop_records],
        "page_indices": page_indices,
        "page_range": {
            "start_page_index": min(page_indices),
            "end_page_index": max(page_indices),
        },
        "crop_records": crop_records,
        "crop_status": "complete",
        "local_extraction_crop_method": LOCAL_METHOD,
        "visual_review_required": True,
        "visual_review_reason": "not_vlm_reviewed_local_only",
        "mechanical_validation": {
            "crop_files_exist": True,
            "crop_images_non_empty": True,
            "crop_dimensions_reasonable": True,
            "referenced_rendered_pages_exist": True,
        },
    }


def _manifest_payload(
    *,
    items: list[dict[str, Any]],
    manifest_paths: list[Path],
    generated_on: str,
    output_root: Path,
    workspace_root: Path,
) -> dict[str, Any]:
    return {
        "schema_version": CROP_MANIFEST_SCHEMA_VERSION,
        "manifest_id": "9709_new_papers_2026_06_02_pre_shard_crop_manifest_v1",
        "generated_on": generated_on,
        "scope": {
            "stage": "pre-shard screenshot/crop gate",
            "source": "24 source-promoted new-paper input shard manifests",
            "not_page_chain_surface": True,
            "not_production_ready": True,
            "not_vlm_reviewed": True,
            "not_authority_db_search_release_closeout": True,
            "output_root": _display_path(output_root, workspace_root=workspace_root),
            "input_manifest_paths": [
                _display_path(path, workspace_root=workspace_root) for path in manifest_paths
            ],
        },
        "item_count": len(items),
        "items": items,
    }


def _summarize(
    *,
    crop_items: list[dict[str, Any]],
    pdf_contexts: list[PdfContext],
    input_manifest_paths: list[Path],
    input_blockers: list[dict[str, Any]],
    generated_on: str,
    workspace_root: Path,
) -> dict[str, Any]:
    complete = [item for item in crop_items if item.get("crop_status") == "complete"]
    blocked = [item for item in crop_items if item.get("crop_status") == "blocked"]
    multi_page = [item for item in complete if len(item.get("page_indices") or []) > 1]
    per_shard: dict[str, dict[str, Any]] = {}
    shard_ids = sorted({str(item.get("shard_id")) for item in crop_items if item.get("shard_id")})
    for shard_id in shard_ids:
        rows = [item for item in crop_items if item.get("shard_id") == shard_id]
        per_shard[shard_id] = {
            "total_rows": len(rows),
            "crop_rows_complete": sum(1 for item in rows if item.get("crop_status") == "complete"),
            "missing_crops": sum(1 for item in rows if not item.get("crop_paths")),
            "multi_page_rows": sum(1 for item in rows if len(item.get("page_indices") or []) > 1),
            "blocker_rows": sum(1 for item in rows if item.get("crop_status") == "blocked"),
            "visual_review_required_rows": sum(
                1 for item in rows if item.get("visual_review_required") is True
            ),
            "source_pdfs": sorted({str(item.get("source_pdf")) for item in rows if item.get("source_pdf")}),
        }

    blocker_counts = Counter(str(item.get("blocker_reason")) for item in blocked)
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "summary": {
            "input_shard_manifests": len(input_manifest_paths),
            "pdfs_rendered": len(pdf_contexts),
            "rendered_pages": sum(context.page_count for context in pdf_contexts),
            "total_rows": len(crop_items),
            "crop_rows_complete": len(complete),
            "pre_shard_crop_rows": len(crop_items),
            "missing_crops": sum(1 for item in crop_items if not item.get("crop_paths")),
            "multi_page_rows": len(multi_page),
            "ambiguous_rows": 0,
            "blocker_rows": len(blocked),
            "visual_review_required_rows": sum(
                1 for item in crop_items if item.get("visual_review_required") is True
            ),
            "input_blockers": len(input_blockers),
            "blocker_reasons": dict(sorted(blocker_counts.items())),
            "gate_verdict": (
                "blocked_requires_input_manifest_or_locator_fix"
                if blocked or input_blockers
                else "local_pre_shard_crop_prep_ready_for_formal_page_chain_visual_authority_flow"
            ),
        },
        "stop_boundary": {
            "stage": "pre-shard screenshot/crop gate",
            "not_production_ready": True,
            "not_vlm_reviewed": True,
            "authority_alignment_run": False,
            "db_backfill_run": False,
            "question_analysis_run": False,
            "search_gate_run": False,
            "release_preflight_run": False,
        },
        "per_shard": per_shard,
        "input_blockers": input_blockers,
        "blockers": [
            {
                "storage_key": item.get("storage_key"),
                "source_pdf": item.get("source_pdf"),
                "q_number": item.get("q_number"),
                "shard_id": item.get("shard_id"),
                "reason": item.get("blocker_reason"),
                "detail": item.get("blocker_detail"),
                "input_manifest_path": item.get("input_manifest_path"),
            }
            for item in blocked
        ],
        "review_queue": [
            {
                "storage_key": item.get("storage_key"),
                "source_pdf": item.get("source_pdf"),
                "q_number": item.get("q_number"),
                "shard_id": item.get("shard_id"),
                "reason": item.get("visual_review_reason"),
                "crop_paths": item.get("crop_paths"),
            }
            for item in crop_items
            if item.get("visual_review_required") is True
        ],
        "pdfs": [
            {
                "source_pdf": _display_path(context.source_pdf, workspace_root=workspace_root),
                "shard_id": context.shard_id,
                "pdf_stem": context.pdf_stem,
                "page_count": context.page_count,
                "rendered_page_paths": [
                    _display_path(path, workspace_root=workspace_root)
                    for path in context.rendered_page_paths
                ],
                "detected_question_numbers": sorted(context.question_starts),
            }
            for context in pdf_contexts
        ],
    }


def _markdown_report(report: dict[str, Any], *, crop_manifest_path: str | Path | None) -> str:
    summary = report["summary"]
    lines = [
        "# 9709 new-paper pre-shard screenshot/crop gate",
        "",
        f"日期: {report['generated_on']}",
        "",
        "## Verdict",
        "",
    ]
    if summary["blocker_rows"] or summary["input_blockers"]:
        lines.append(
            "Gate blocked: local render/crop preparation found rows that do not have a strict left-margin printed question header in the source PDF text layer."
        )
    else:
        lines.append(
            "Gate passed only for local screenshot preparation: the rows have local render/crop artifacts and can enter the formal shard page-chain/visual/authority flow."
        )
    lines.extend(
        [
            "",
            "This is a `pre-shard screenshot/crop gate`.",
            "",
            "- Not production-ready.",
            "- Not VLM-reviewed.",
            "- Not authority/DB/search/release closeout.",
            "- External VLM/API calls: `0`.",
            "",
            "## Summary",
            "",
            f"- input shard manifests: `{summary['input_shard_manifests']}`",
            f"- PDFs rendered: `{summary['pdfs_rendered']}`",
            f"- rendered pages: `{summary['rendered_pages']}`",
            f"- total rows: `{summary['total_rows']}`",
            f"- pre-shard crop manifest rows: `{summary['pre_shard_crop_rows']}`",
            f"- crop rows complete: `{summary['crop_rows_complete']}`",
            f"- missing crops: `{summary['missing_crops']}`",
            f"- multi-page rows: `{summary['multi_page_rows']}`",
            f"- ambiguous rows: `{summary['ambiguous_rows']}`",
            f"- blocker rows: `{summary['blocker_rows']}`",
            f"- visual review still required rows: `{summary['visual_review_required_rows']}`",
        ]
    )
    if crop_manifest_path:
        lines.append(f"- pre-shard crop manifest: `{crop_manifest_path}`")
    lines.extend(["", "## Per-Shard Counts", "", "| Shard | Rows | Complete | Missing crops | Multi-page | Blockers |", "| --- | ---: | ---: | ---: | ---: | ---: |"])
    for shard_id, counts in report["per_shard"].items():
        lines.append(
            f"| `{shard_id}` | {counts['total_rows']} | {counts['crop_rows_complete']} | {counts['missing_crops']} | {counts['multi_page_rows']} | {counts['blocker_rows']} |"
        )

    lines.extend(["", "## Blockers", ""])
    if report["blockers"]:
        lines.extend(["| Storage key | Source PDF | q | Reason |", "| --- | --- | ---: | --- |"])
        for blocker in report["blockers"]:
            lines.append(
                f"| `{blocker['storage_key']}` | `{blocker['source_pdf']}` | {blocker['q_number']} | `{blocker['reason']}` |"
            )
    else:
        lines.append("No blocker rows.")

    lines.extend(
        [
            "",
            "## Stop Boundary",
            "",
            "Stop here. This artifact only establishes local screenshot/crop preparation status before formal shard production begins. It does not run authority alignment, DB backfill, question analysis, search gate, release preflight, or any external DashScope/Qwen VLM/API call.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_pre_shard_crop_gate(
    *,
    manifest_paths: list[str | Path],
    output_root: str | Path,
    workspace_root: str | Path = ".",
    generated_on: str | None = None,
    render_scale: float = 2.0,
    max_pages: int = 4,
    padding_points: float = 18.0,
) -> dict[str, Any]:
    workspace = Path(workspace_root).resolve()
    output_root_path = _resolve_path(output_root, workspace_root=workspace)
    generated = generated_on or date.today().isoformat()
    resolved_manifest_paths = [_resolve_path(path, workspace_root=workspace) for path in manifest_paths]
    rows, input_blockers = _load_input_rows(resolved_manifest_paths, workspace_root=workspace)

    contexts_by_key: dict[tuple[str, str], PdfContext] = {}
    for row in rows:
        item = row.item
        source_pdf_value = item.get("source_pdf")
        shard_id = str(item.get("shard_id") or "unknown_shard")
        if not source_pdf_value:
            continue
        source_pdf = _resolve_path(str(source_pdf_value), workspace_root=workspace)
        if not source_pdf.exists():
            continue
        key = (shard_id, source_pdf.as_posix())
        if key not in contexts_by_key:
            contexts_by_key[key] = _build_pdf_context(
                source_pdf=source_pdf,
                shard_id=shard_id,
                output_root=output_root_path,
                render_scale=render_scale,
            )

    crop_items: list[dict[str, Any]] = []
    for row in rows:
        item = row.item
        source_pdf_value = item.get("source_pdf")
        if not source_pdf_value:
            crop_items.append(_blocked_item(row, reason="source_pdf_missing", workspace_root=workspace))
            continue
        source_pdf = _resolve_path(str(source_pdf_value), workspace_root=workspace)
        shard_id = str(item.get("shard_id") or "unknown_shard")
        context = contexts_by_key.get((shard_id, source_pdf.as_posix()))
        if context is None:
            crop_items.append(_blocked_item(row, reason="source_pdf_missing", workspace_root=workspace))
            continue
        crop_items.append(
            _build_row_crop_item(
                row,
                context=context,
                output_root=output_root_path,
                workspace_root=workspace,
                max_pages=max_pages,
                padding_points=padding_points,
            )
        )

    pdf_contexts = sorted(
        contexts_by_key.values(),
        key=lambda context: (context.shard_id, context.source_pdf.as_posix()),
    )
    crop_manifest = _manifest_payload(
        items=crop_items,
        manifest_paths=resolved_manifest_paths,
        generated_on=generated,
        output_root=output_root_path,
        workspace_root=workspace,
    )
    report = _summarize(
        crop_items=crop_items,
        pdf_contexts=pdf_contexts,
        input_manifest_paths=resolved_manifest_paths,
        input_blockers=input_blockers,
        generated_on=generated,
        workspace_root=workspace,
    )
    return {"crop_manifest": crop_manifest, "report": report}


def write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build local-only 9709 pre-shard crop gate artifacts.")
    parser.add_argument("--manifest-dir", type=Path, default=Path("data/manifests"))
    parser.add_argument("--input-manifest", action="append", type=Path, default=[])
    parser.add_argument("--output-root", type=Path, default=Path("tmp/pdf-page-chain/new-papers-pre-shard"))
    parser.add_argument(
        "--crop-manifest",
        type=Path,
        default=Path("data/manifests/9709_new_papers_2026_06_02_pre_shard_crop_manifest_v1.json"),
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        default=Path("docs/reports/2026-06-02-9709-new-paper-pre-shard-screenshot-crop-gate.json"),
    )
    parser.add_argument(
        "--report-md",
        type=Path,
        default=Path("docs/reports/2026-06-02-9709-new-paper-pre-shard-screenshot-crop-gate.md"),
    )
    parser.add_argument("--generated-on", default=None)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--max-pages", type=int, default=4)
    parser.add_argument("--padding-points", type=float, default=18.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    manifest_paths = args.input_manifest or discover_new_input_manifests(args.manifest_dir)
    result = build_pre_shard_crop_gate(
        manifest_paths=manifest_paths,
        output_root=args.output_root,
        workspace_root=Path.cwd(),
        generated_on=args.generated_on,
        render_scale=args.render_scale,
        max_pages=args.max_pages,
        padding_points=args.padding_points,
    )
    write_json(args.crop_manifest, result["crop_manifest"])
    write_json(args.report_json, result["report"])
    args.report_md.parent.mkdir(parents=True, exist_ok=True)
    args.report_md.write_text(
        _markdown_report(result["report"], crop_manifest_path=args.crop_manifest.as_posix()),
        encoding="utf-8",
    )
    summary = result["report"]["summary"]
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["input_shard_manifests"] == 24 and summary["pre_shard_crop_rows"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
