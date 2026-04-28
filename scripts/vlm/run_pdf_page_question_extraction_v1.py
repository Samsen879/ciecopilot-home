#!/usr/bin/env python3
"""Run PDF-page question extraction from original 9709 PDFs."""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import sys
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.common.env import load_project_env
from scripts.vlm.pdf_page_locator_v1 import (
    extract_pdf_text_pages,
    locate_question_pages_from_text_pages,
    parse_storage_key_identity,
    render_pdf_pages,
    resolve_pdf_path,
    run_pdf_page_question_request,
)
from scripts.vlm.pdf_page_validator_v1 import validate_pdf_page_question_extraction


DEFAULT_MODEL = "qwen3-vl-plus"
DEFAULT_PAST_PAPERS_ROOT = Path("data/past-papers/9709Mathematics")


def _candidate_payload(candidate) -> dict[str, Any]:
    return {
        "target_q_number": candidate.target_q_number,
        "start_page_index": candidate.start_page_index,
        "page_indices": candidate.page_indices,
        "matched_line": candidate.matched_line,
        "score": candidate.score,
        "warnings": candidate.warnings or [],
    }


def _default_image_size_loader(path: Path) -> tuple[int, int]:
    from PIL import Image

    with Image.open(path) as image:
        return image.size


def normalize_question_bbox_from_rendered_pages(
    extraction: dict[str, Any],
    *,
    rendered_page_paths: list[Path],
    image_size_loader: Callable[[Path], tuple[int, int]] = _default_image_size_loader,
) -> dict[str, Any]:
    bbox = extraction.get("question_bbox_norm")
    if not isinstance(bbox, list) or len(bbox) != 4:
        return extraction
    try:
        x1, y1, x2, y2 = [float(value) for value in bbox]
    except (TypeError, ValueError):
        return extraction
    if all(0 <= value <= 1 for value in (x1, y1, x2, y2)):
        return extraction
    if len(rendered_page_paths) != 1:
        return extraction
    width, height = image_size_loader(rendered_page_paths[0])
    if width <= 0 or height <= 0:
        return extraction
    if not (0 <= x1 < x2 <= width and 0 <= y1 < y2 <= height):
        return extraction

    normalized = dict(extraction)
    normalized["original_question_bbox"] = bbox
    normalized["question_bbox_norm"] = [
        round(x1 / width, 6),
        round(y1 / height, 6),
        round(x2 / width, 6),
        round(y2 / height, 6),
    ]
    warnings = list(normalized.get("warnings") or [])
    warnings.append("normalized_absolute_question_bbox")
    normalized["warnings"] = list(dict.fromkeys(str(warning) for warning in warnings if warning))
    return normalized


def run_pdf_page_item(
    item: dict[str, Any],
    *,
    past_papers_root: str | Path = DEFAULT_PAST_PAPERS_ROOT,
    render_root: str | Path,
    model: str = DEFAULT_MODEL,
    text_page_loader: Callable[[Path], list[list[str]]] = extract_pdf_text_pages,
    page_renderer: Callable[..., list[Path]] = render_pdf_pages,
    request_runner: Callable[..., dict[str, Any]] = run_pdf_page_question_request,
) -> dict[str, Any]:
    storage_key = item["storage_key"]
    identity = parse_storage_key_identity(storage_key)
    pdf_path = resolve_pdf_path(identity, past_papers_root)
    text_pages = text_page_loader(pdf_path)
    candidate = locate_question_pages_from_text_pages(
        text_pages,
        target_q_number=identity.q_number,
    )
    base_payload: dict[str, Any] = {
        "schema_version": "pdf_page_question_extraction_v1",
        "storage_key": storage_key,
        "model": model,
        "pdf_path": str(pdf_path),
        "candidate_pages": _candidate_payload(candidate),
        "rendered_page_paths": [],
        "extraction": None,
        "validation": None,
        "failure_reason": None,
    }

    if candidate.start_page_index is None:
        base_payload["validation"] = {
            "status": "blocked",
            "blockers": ["question_start_not_found"],
            "warnings": candidate.warnings or [],
        }
        base_payload["failure_reason"] = "question_start_not_found"
        return base_payload

    rendered_paths = page_renderer(
        pdf_path,
        candidate.page_indices,
        output_dir=Path(render_root) / storage_key.replace("/", "__").removesuffix(".png"),
    )
    base_payload["rendered_page_paths"] = [str(path) for path in rendered_paths]
    extraction = request_runner(
        model=model,
        storage_key=storage_key,
        target_q_number=identity.q_number,
        page_image_paths=rendered_paths,
    )
    extraction = normalize_question_bbox_from_rendered_pages(
        extraction,
        rendered_page_paths=rendered_paths,
    )
    validation = validate_pdf_page_question_extraction(
        target_q_number=identity.q_number,
        extraction=extraction,
        expected_diagram_present=item.get("diagram_present")
        if isinstance(item.get("diagram_present"), bool)
        else None,
        expected_page_count=len(rendered_paths),
    )
    base_payload["extraction"] = extraction
    base_payload["validation"] = validation
    if validation["status"] == "blocked":
        base_payload["failure_reason"] = ",".join(validation["blockers"])
    return base_payload


def summarize_results(results: list[dict[str, Any]]) -> dict[str, int]:
    total = len(results)
    passed = sum(1 for result in results if (result.get("validation") or {}).get("status") == "passed")
    blocked = sum(1 for result in results if (result.get("validation") or {}).get("status") == "blocked")
    failures = sum(1 for result in results if result.get("failure_reason"))
    blocker_counts: Counter[str] = Counter()
    warning_counts: Counter[str] = Counter()
    for result in results:
        validation = result.get("validation") or {}
        for blocker in validation.get("blockers") or []:
            blocker_counts[str(blocker)] += 1
        for warning in validation.get("warnings") or []:
            warning_counts[str(warning)] += 1
    return {
        "total": total,
        "passed": passed,
        "blocked": blocked,
        "failures": failures,
        "blocker_counts": dict(sorted(blocker_counts.items())),
        "warning_counts": dict(sorted(warning_counts.items())),
    }


def load_manifest(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_existing_results(path: str | Path) -> list[dict[str, Any]]:
    resolved = Path(path)
    if not resolved.exists():
        return []
    try:
        payload = json.loads(resolved.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    results = payload.get("results") if isinstance(payload, dict) else None
    return results if isinstance(results, list) else []


def write_results_payload(
    path: str | Path,
    *,
    manifest_id: str | None,
    model: str,
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    payload = {
        "schema_version": "pdf_page_question_extraction_run_v1",
        "manifest_id": manifest_id,
        "model": model,
        "summary": summarize_results(results),
        "results": results,
    }
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run PDF-page 9709 question extraction.")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--past-papers-root", type=Path, default=DEFAULT_PAST_PAPERS_ROOT)
    parser.add_argument("--render-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-items", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument("--retry-blocked", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    load_project_env()
    args = parse_args(argv)
    manifest = load_manifest(args.manifest)
    items = list(manifest.get("items") or [])
    if args.max_items is not None:
        items = items[: args.max_items]

    if args.dry_run:
        print(f"items_planned: {len(items)}")
        print(f"model: {args.model}")
        print(f"past_papers_root: {args.past_papers_root}")
        print(f"render_root: {args.render_root}")
        return 0

    existing = [] if args.no_resume else load_existing_results(args.output)
    results_by_key = {}
    for result in existing:
        storage_key = result.get("storage_key")
        if not storage_key:
            continue
        if args.retry_blocked and (result.get("validation") or {}).get("status") == "blocked":
            continue
        results_by_key[storage_key] = result

    results = [
        results_by_key[item["storage_key"]]
        for item in items
        if item.get("storage_key") in results_by_key
    ]
    total = len(items)
    if results:
        print(f"resume_existing_results: {len(results)}")

    for item in items:
        storage_key = item["storage_key"]
        if storage_key in results_by_key:
            continue
        try:
            result = run_pdf_page_item(
                item,
                past_papers_root=args.past_papers_root,
                render_root=args.render_root,
                model=args.model,
            )
        except Exception as error:  # pragma: no cover - operational guard
            result = {
                "schema_version": "pdf_page_question_extraction_v1",
                "storage_key": storage_key,
                "model": args.model,
                "pdf_path": None,
                "candidate_pages": None,
                "rendered_page_paths": [],
                "extraction": None,
                "validation": {
                    "status": "blocked",
                    "blockers": ["runner_exception"],
                    "warnings": [],
                },
                "failure_reason": str(error),
            }
        results_by_key[storage_key] = result
        results.append(result)
        payload = write_results_payload(
            args.output,
            manifest_id=manifest.get("manifest_id"),
            model=args.model,
            results=results,
        )
        print(
            f"pdf_page_progress: {len(results)}/{total} "
            f"storage_key={storage_key} "
            f"passed={payload['summary']['passed']} "
            f"blocked={payload['summary']['blocked']}",
            flush=True,
        )

    payload = write_results_payload(
        args.output,
        manifest_id=manifest.get("manifest_id"),
        model=args.model,
        results=results,
    )
    print(f"wrote_pdf_page_results: {args.output}")
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
