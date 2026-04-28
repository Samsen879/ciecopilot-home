#!/usr/bin/env python3
"""Build a PDF-page extraction manifest for every detected question in one paper."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.pdf_page_locator_v1 import (
    QuestionIdentity,
    extract_pdf_text_pages,
    locate_question_pages_from_text_pages,
)


_PDF_NAME_RE = re.compile(
    r"^(?:WM_)?(?P<subject>\d{4})_(?P<session>[smw])(?P<yy>\d{2})_qp_(?P<paper>\d)(?P<variant>\d)\.pdf$",
    re.IGNORECASE,
)


def parse_pdf_identity(pdf_path: str | Path) -> QuestionIdentity:
    name = Path(pdf_path).name
    match = _PDF_NAME_RE.match(name)
    if not match:
        raise ValueError(f"Unsupported 9709 PDF filename: {name}")
    yy = int(match.group("yy"))
    return QuestionIdentity(
        subject_code=match.group("subject"),
        session=match.group("session").lower(),
        year=2000 + yy,
        paper=int(match.group("paper")),
        variant=int(match.group("variant")),
        q_number=0,
    )


def _storage_key_for_question(identity: QuestionIdentity, q_number: int) -> str:
    return (
        f"{identity.subject_code}/{identity.session}{identity.yy}_qp_"
        f"{identity.paper}{identity.variant}/questions/q{q_number:02d}.png"
    )


def _item_for_question(identity: QuestionIdentity, q_number: int) -> dict[str, Any]:
    return {
        "storage_key": _storage_key_for_question(identity, q_number),
        "syllabus_code": identity.subject_code,
        "year": identity.year,
        "session": identity.session,
        "paper": identity.paper,
        "variant": identity.variant,
        "q_number": q_number,
        "diagram_present": None,
        "formula_dense": None,
        "table_heavy": None,
        "source": "pdf_page_full_paper_manifest_v1",
    }


def _audit_summary(entries: list[dict[str, Any]], *, low_score_threshold: int) -> dict[str, int]:
    found = [entry for entry in entries if entry["found"]]
    included = [entry for entry in entries if entry.get("included")]
    return {
        "targeted_questions": len(entries),
        "found": len(found),
        "included": len(included),
        "missing": len(entries) - len(found),
        "multi_page": sum(1 for entry in found if len(entry["page_indices"]) > 1),
        "low_score": sum(1 for entry in found if entry["score"] < low_score_threshold),
        "excluded_low_score": sum(
            1
            for entry in found
            if entry["score"] < low_score_threshold and not entry.get("included")
        ),
    }


def build_full_paper_manifest(
    pdf_path: str | Path,
    *,
    max_question_number: int = 15,
    low_score_threshold: int = 30,
    text_page_loader: Callable[[Path], list[list[str]]] = extract_pdf_text_pages,
) -> dict[str, Any]:
    resolved_pdf_path = Path(pdf_path)
    identity = parse_pdf_identity(resolved_pdf_path)
    text_pages = text_page_loader(resolved_pdf_path)
    entries: list[dict[str, Any]] = []
    items: list[dict[str, Any]] = []

    for q_number in range(1, max_question_number + 1):
        candidate = locate_question_pages_from_text_pages(
            text_pages,
            target_q_number=q_number,
        )
        found = candidate.start_page_index is not None
        included = found and candidate.score >= low_score_threshold
        entry = {
            "q_number": q_number,
            "found": found,
            "included": included,
            "start_page_index": candidate.start_page_index,
            "page_indices": candidate.page_indices,
            "matched_line": candidate.matched_line,
            "score": candidate.score,
            "warnings": list(candidate.warnings or []),
        }
        if found and candidate.score < low_score_threshold:
            entry["warnings"].append("low_locator_score")
        entries.append(entry)
        if included:
            items.append(_item_for_question(identity, q_number))

    return {
        "schema_version": "pdf_page_full_paper_manifest_v1",
        "manifest_id": f"{identity.pdf_stem}_full_pdf_page_v1",
        "subject_code": identity.subject_code,
        "source_pdf": str(resolved_pdf_path),
        "scope": {
            "session": identity.session,
            "year": identity.year,
            "paper": identity.paper,
            "variant": identity.variant,
            "max_question_number": max_question_number,
        },
        "items": items,
        "locator_audit": {
            "summary": _audit_summary(entries, low_score_threshold=low_score_threshold),
            "entries": entries,
        },
    }


def write_manifest(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a full-paper PDF-page extraction manifest.")
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-question-number", type=int, default=15)
    parser.add_argument("--low-score-threshold", type=int, default=30)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    payload = build_full_paper_manifest(
        args.pdf,
        max_question_number=args.max_question_number,
        low_score_threshold=args.low_score_threshold,
    )
    write_manifest(args.output, payload)
    print(f"wrote_full_paper_manifest: {args.output}")
    print(json.dumps(payload["locator_audit"]["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
