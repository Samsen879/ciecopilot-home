#!/usr/bin/env python3
"""Batch evaluator for PDF page-chain extraction outputs."""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import sys
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.run_pdf_page_chain_extraction_v1 import (
    DEFAULT_MODEL,
    build_page_chain_payload,
    normalize_page_chain_result,
    run_pdf_page_chain,
    validate_page_chain_questions,
)
from scripts.vlm.pdf_page_locator_v1 import extract_pdf_text_pages


def default_pdf_output_path(output_root: str | Path, pdf_path: str | Path) -> Path:
    return Path(output_root) / f"{Path(pdf_path).stem}_page_chain.json"


def load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def summarize_page_chain_payload(payload: dict[str, Any]) -> dict[str, Any]:
    questions = payload.get("questions") if isinstance(payload.get("questions"), list) else []
    validation = (
        payload.get("validation")
        if isinstance(payload.get("validation"), dict)
        else validate_page_chain_questions(questions)
    )
    return {
        "pdf_path": str(payload.get("pdf_path") or ""),
        "status": str(validation.get("status") or "blocked"),
        "question_count": len(questions),
        "processed_pages": int(payload.get("processed_pages") or 0),
        "total_pages": int(payload.get("total_pages") or 0),
        "blockers": [str(item) for item in validation.get("blockers") or []],
        "warnings": [str(item) for item in validation.get("warnings") or []],
    }


def rebuild_payload_from_page_results(
    payload: dict[str, Any],
    *,
    text_page_loader: Callable[[Path], list[list[str]]] = extract_pdf_text_pages,
) -> dict[str, Any]:
    page_results = payload.get("page_results")
    pdf_path_value = payload.get("pdf_path")
    if not isinstance(page_results, list) or not pdf_path_value:
        return payload
    pdf_path = Path(str(pdf_path_value))
    if not pdf_path.exists():
        return payload
    text_pages = text_page_loader(pdf_path)
    normalized: list[dict[str, Any]] = []
    carry_state: dict[str, Any] | None = None
    for index, page_result in enumerate(page_results):
        if not isinstance(page_result, dict):
            continue
        source_page_index = int(page_result.get("source_page_index", page_result.get("page_index", index)) or index)
        text_lines = text_pages[source_page_index] if 0 <= source_page_index < len(text_pages) else []
        normalized_page = normalize_page_chain_result(
            page_result,
            source_page_index=source_page_index,
            text_lines=text_lines,
            carry_state=carry_state,
        )
        normalized.append(normalized_page)
        carry_state = normalized_page.get("carry_state") if isinstance(normalized_page.get("carry_state"), dict) else carry_state
    return build_page_chain_payload(
        pdf_path=pdf_path,
        model=str(payload.get("model") or DEFAULT_MODEL),
        total_pages=int(payload.get("total_pages") or len(text_pages)),
        page_results=normalized,
    )


def build_batch_report(items: list[dict[str, Any]], *, model: str) -> dict[str, Any]:
    blocker_counts: Counter[str] = Counter()
    warning_counts: Counter[str] = Counter()
    for item in items:
        blocker_counts.update(item.get("blockers") or [])
        warning_counts.update(item.get("warnings") or [])

    return {
        "schema_version": "pdf_page_chain_batch_evaluation_v1",
        "model": model,
        "summary": {
            "total_pdfs": len(items),
            "passed_pdfs": sum(1 for item in items if item.get("status") == "passed"),
            "blocked_pdfs": sum(1 for item in items if item.get("status") == "blocked"),
            "warning_pdfs": sum(1 for item in items if item.get("warnings")),
            "blocker_counts": dict(sorted(blocker_counts.items())),
            "warning_counts": dict(sorted(warning_counts.items())),
        },
        "items": items,
    }


def collect_pdf_paths(
    *,
    pdf_paths: list[str | Path] | None = None,
    pdf_list: str | Path | None = None,
    pdf_globs: list[str] | None = None,
    max_pdfs: int | None = None,
) -> list[Path]:
    collected: list[Path] = []
    for path in pdf_paths or []:
        collected.append(Path(path))
    if pdf_list:
        for line in Path(pdf_list).read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                collected.append(Path(stripped))
    for pattern in pdf_globs or []:
        collected.extend(sorted(Path().glob(pattern)))

    unique: list[Path] = []
    seen: set[str] = set()
    for path in collected:
        key = str(path)
        if key not in seen:
            unique.append(path)
            seen.add(key)
    if max_pdfs is not None:
        unique = unique[:max_pdfs]
    return unique


def run_batch_evaluator(
    *,
    pdf_paths: list[str | Path],
    output_root: str | Path,
    render_root: str | Path,
    report_path: str | Path,
    model: str = DEFAULT_MODEL,
    reuse_existing: bool = True,
    resume: bool = True,
    max_pages: int | None = None,
    runner: Callable[..., dict[str, Any]] = run_pdf_page_chain,
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    output_root = Path(output_root)
    render_root = Path(render_root)

    for pdf_path_like in pdf_paths:
        pdf_path = Path(pdf_path_like)
        output_path = default_pdf_output_path(output_root, pdf_path)
        if reuse_existing and output_path.exists():
            payload = load_json(output_path)
        else:
            payload = runner(
                pdf_path=pdf_path,
                render_root=render_root,
                output=output_path,
                model=model,
                max_pages=max_pages,
                resume=resume,
            )
        summary = summarize_page_chain_payload(payload)
        summary["output_path"] = str(output_path)
        items.append(summary)
        print(
            "page_chain_batch_progress:",
            f"{len(items)}/{len(pdf_paths)}",
            f"pdf={pdf_path.name}",
            f"status={summary['status']}",
            f"questions={summary['question_count']}",
            flush=True,
        )

    report = build_batch_report(items, model=model)
    write_json(report_path, report)
    return report


def run_payload_evaluator(
    *,
    payload_paths: list[str | Path],
    report_path: str | Path,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    for payload_path_like in payload_paths:
        payload_path = Path(payload_path_like)
        payload = rebuild_payload_from_page_results(load_json(payload_path))
        summary = summarize_page_chain_payload(payload)
        summary["payload_path"] = str(payload_path)
        items.append(summary)
        print(
            "page_chain_payload_eval_progress:",
            f"{len(items)}/{len(payload_paths)}",
            f"payload={payload_path.name}",
            f"status={summary['status']}",
            f"questions={summary['question_count']}",
            flush=True,
        )
    report = build_batch_report(items, model=model)
    write_json(report_path, report)
    return report


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run/evaluate PDF page-chain extraction for multiple PDFs.")
    parser.add_argument("--pdf", action="append", default=[], type=Path)
    parser.add_argument("--pdf-list", type=Path)
    parser.add_argument("--pdf-glob", action="append", default=[])
    parser.add_argument("--payload", action="append", default=[], type=Path)
    parser.add_argument("--output-root", type=Path)
    parser.add_argument("--render-root", type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-pdfs", type=int)
    parser.add_argument("--max-pages", type=int)
    parser.add_argument("--no-reuse-existing", action="store_true")
    parser.add_argument("--no-resume", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.payload:
        report = run_payload_evaluator(
            payload_paths=args.payload,
            report_path=args.report,
            model=args.model,
        )
        print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
        return 0

    pdf_paths = collect_pdf_paths(
        pdf_paths=args.pdf,
        pdf_list=args.pdf_list,
        pdf_globs=args.pdf_glob,
        max_pdfs=args.max_pdfs,
    )
    if not pdf_paths:
        raise SystemExit("No PDFs provided. Use --pdf, --pdf-list, or --pdf-glob.")
    if args.output_root is None or args.render_root is None:
        raise SystemExit("--output-root and --render-root are required when running PDFs.")
    report = run_batch_evaluator(
        pdf_paths=pdf_paths,
        output_root=args.output_root,
        render_root=args.render_root,
        report_path=args.report,
        model=args.model,
        reuse_existing=not args.no_reuse_existing,
        resume=not args.no_resume,
        max_pages=args.max_pages,
    )
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
