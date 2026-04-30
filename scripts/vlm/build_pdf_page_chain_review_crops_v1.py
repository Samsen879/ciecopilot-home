#!/usr/bin/env python3
"""Build local review crops from PDF page-chain payloads."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from typing import Any

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.run_pdf_page_chain_batch_evaluator_v1 import rebuild_payload_from_page_results


QUESTION_NUMBER_RE = re.compile(r"^\d{1,2}$")


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _q_number(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _bbox_to_pixels(bbox_norm: list[Any], *, page_width: int, page_height: int) -> list[int] | None:
    if len(bbox_norm) != 4:
        return None
    try:
        x1, y1, x2, y2 = [float(value) for value in bbox_norm]
    except (TypeError, ValueError):
        return None
    if x2 <= x1 or y2 <= y1:
        return None
    divisor = 1.0 if max(x1, y1, x2, y2) <= 1.0 else 1000.0
    return [
        round((x1 / divisor) * page_width),
        round((y1 / divisor) * page_height),
        round((x2 / divisor) * page_width),
        round((y2 / divisor) * page_height),
    ]


def _clamp_box(box: list[int], *, page_width: int, page_height: int) -> list[int]:
    x1, y1, x2, y2 = box
    x1 = max(0, min(page_width - 1, x1))
    y1 = max(0, min(page_height - 1, y1))
    x2 = max(x1 + 1, min(page_width, x2))
    y2 = max(y1 + 1, min(page_height, y2))
    return [x1, y1, x2, y2]


def compute_question_page_bands(
    page_result: dict[str, Any],
    *,
    page_width: int,
    page_height: int,
    padding_px: int = 24,
    question_start_y_by_number: dict[int, int] | None = None,
) -> list[dict[str, Any]]:
    fragments: list[dict[str, Any]] = []
    for fragment in _as_list(page_result.get("fragments")):
        if not isinstance(fragment, dict):
            continue
        q_number = _q_number(fragment.get("q_number"))
        if q_number is None or fragment.get("fragment_kind") == "furniture_or_blank":
            continue
        bbox = _bbox_to_pixels(_as_list(fragment.get("bbox_norm")), page_width=page_width, page_height=page_height)
        if bbox is None:
            continue
        ocr_text = str(fragment.get("ocr_text") or "").lower()
        fragments.append(
            {
                "q_number": q_number,
                "bbox": bbox,
                "fragment": fragment,
                "has_diagram": bool(fragment.get("has_diagram")) or "diagram" in ocr_text,
            }
        )

    if not fragments:
        return []

    grouped: dict[int, list[list[int]]] = {}
    first_order: dict[int, int] = {}
    for index, item in enumerate(fragments):
        q_number = int(item["q_number"])
        grouped.setdefault(q_number, []).append(item["bbox"])
        first_order.setdefault(q_number, index)

    starts: list[dict[str, Any]] = []
    for q_number, boxes in grouped.items():
        pdf_start_y = (question_start_y_by_number or {}).get(q_number)
        y1 = min(box[1] for box in boxes)
        y2 = max(box[3] for box in boxes)
        if pdf_start_y is not None:
            y1 = max(0, min(page_height - 1, int(pdf_start_y)))
            y2 = max(y2, y1 + 1)
        starts.append(
            {
                "q_number": q_number,
                "order": first_order[q_number],
                "x1": min(box[0] for box in boxes),
                "y1": y1,
                "x2": max(box[2] for box in boxes),
                "y2": y2,
                "has_diagram": any(item["has_diagram"] for item in fragments if item["q_number"] == q_number),
                "has_pdf_start": pdf_start_y is not None,
            }
        )
    starts.sort(key=lambda item: (item["y1"], item["order"]))

    bands: list[dict[str, Any]] = []
    for index, item in enumerate(starts):
        next_y = page_height
        next_start: dict[str, Any] | None = None
        for later in starts[index + 1 :]:
            if later["y1"] > item["y1"] and later["q_number"] != item["q_number"]:
                next_y = later["y1"]
                next_start = later
                break
        crop_top = item["y1"] - padding_px
        if item["has_diagram"] and not item["has_pdf_start"]:
            if index == 0:
                crop_top = 0
            else:
                crop_top = min(crop_top, starts[index - 1]["y2"] + padding_px)
        crop_bottom = next_y - padding_px if next_y < page_height else page_height
        if next_y < page_height:
            crop_bottom = min(
                next_y + padding_px,
                max(crop_bottom, item["y2"] + (padding_px * 2)),
            )
            if next_start and next_start["has_pdf_start"]:
                crop_bottom = min(crop_bottom, next_y - padding_px)
        crop_box = _clamp_box(
            [
                0,
                crop_top,
                page_width,
                crop_bottom,
            ],
            page_width=page_width,
            page_height=page_height,
        )
        bands.append(
            {
                "q_number": item["q_number"],
                "source_page_index": page_result.get("source_page_index", page_result.get("page_index")),
                "crop_box": crop_box,
            }
        )
    return bands


def _resolve_path(path_value: str | Path, *, workspace_root: Path) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return workspace_root / path


def _load_pdf_question_starts(
    pdf_path: Path,
    *,
    page_index: int,
    rendered_page_height: int,
) -> dict[int, int]:
    try:
        import fitz
    except ImportError:
        return {}
    if not pdf_path.exists():
        return {}
    try:
        with fitz.open(pdf_path) as document:
            if page_index < 0 or page_index >= len(document):
                return {}
            page = document[page_index]
            left_limit = float(page.rect.width) * 0.18
            scale_y = rendered_page_height / float(page.rect.height)
            starts: dict[int, int] = {}
            for word in page.get_text("words"):
                x0, y0, _x1, _y1, text, *_rest = word
                if x0 > left_limit or not QUESTION_NUMBER_RE.match(str(text).strip()):
                    continue
                q_number = _q_number(text)
                if q_number is None:
                    continue
                starts[q_number] = min(starts.get(q_number, rendered_page_height), round(y0 * scale_y))
            return starts
    except Exception:
        return {}


def build_review_crops_for_payload(
    payload_path: str | Path,
    *,
    output_root: str | Path,
    workspace_root: str | Path | None = None,
    padding_px: int = 32,
) -> dict[str, Any]:
    workspace = Path(workspace_root) if workspace_root else Path.cwd()
    payload_path = _resolve_path(payload_path, workspace_root=workspace)
    payload = rebuild_payload_from_page_results(json.loads(payload_path.read_text(encoding="utf-8")))
    pdf_stem = Path(str(payload.get("pdf_path") or payload_path.stem)).stem
    pdf_path = _resolve_path(str(payload.get("pdf_path") or ""), workspace_root=workspace) if payload.get("pdf_path") else None
    pdf_output_root = Path(output_root) / pdf_stem
    pdf_output_root.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    question_numbers: set[int] = set()
    for page_result in _as_list(payload.get("page_results")):
        if not isinstance(page_result, dict):
            continue
        rendered_page_path = page_result.get("rendered_page_path")
        if not rendered_page_path:
            continue
        image_path = _resolve_path(str(rendered_page_path), workspace_root=workspace)
        if not image_path.exists():
            records.append({"status": "missing_render", "rendered_page_path": str(rendered_page_path)})
            continue
        with Image.open(image_path) as image:
            width, height = image.size
            source_page_index = int(page_result.get("source_page_index", page_result.get("page_index") or 0))
            question_start_y_by_number = (
                _load_pdf_question_starts(pdf_path, page_index=source_page_index, rendered_page_height=height)
                if pdf_path
                else {}
            )
            bands = compute_question_page_bands(
                page_result,
                page_width=width,
                page_height=height,
                padding_px=padding_px,
                question_start_y_by_number=question_start_y_by_number,
            )
            for band in bands:
                q_number = int(band["q_number"])
                question_numbers.add(q_number)
                source_page_index = int(band.get("source_page_index") or 0)
                q_dir = pdf_output_root / f"q{q_number:02d}"
                q_dir.mkdir(parents=True, exist_ok=True)
                output_path = q_dir / f"q{q_number:02d}_page_{source_page_index + 1:03d}.png"
                image.crop(tuple(band["crop_box"])).save(output_path)
                records.append(
                    {
                        "status": "written",
                        "q_number": q_number,
                        "source_page_index": source_page_index,
                        "source_rendered_page_path": str(image_path),
                        "crop_box": band["crop_box"],
                        "output_path": str(output_path),
                    }
                )

    summary = {
        "schema_version": "pdf_page_chain_review_crops_v1",
        "payload_path": str(payload_path),
        "pdf_stem": pdf_stem,
        "question_count": len(question_numbers),
        "crop_count": sum(1 for record in records if record.get("status") == "written"),
        "records": records,
    }
    (pdf_output_root / "index.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def build_review_crops(
    *,
    payload_paths: list[str | Path],
    output_root: str | Path,
    workspace_root: str | Path | None = None,
    padding_px: int = 32,
) -> dict[str, Any]:
    output_root = Path(output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    items = [
        build_review_crops_for_payload(
            payload_path,
            output_root=output_root,
            workspace_root=workspace_root,
            padding_px=padding_px,
        )
        for payload_path in payload_paths
    ]
    summary = {
        "schema_version": "pdf_page_chain_review_crops_batch_v1",
        "payload_count": len(items),
        "question_count": sum(int(item.get("question_count") or 0) for item in items),
        "crop_count": sum(int(item.get("crop_count") or 0) for item in items),
        "items": items,
    }
    (output_root / "index.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build review crops from PDF page-chain payloads.")
    parser.add_argument("--payload", action="append", default=[], type=Path)
    parser.add_argument("--payload-glob", action="append", default=[])
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--padding-px", default=32, type=int)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    payload_paths = list(args.payload)
    for pattern in args.payload_glob:
        payload_paths.extend(sorted(Path().glob(pattern)))
    if not payload_paths:
        raise SystemExit("No payloads provided. Use --payload or --payload-glob.")
    summary = build_review_crops(payload_paths=payload_paths, output_root=args.output_root, padding_px=args.padding_px)
    print(json.dumps({key: summary[key] for key in ["payload_count", "question_count", "crop_count"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
