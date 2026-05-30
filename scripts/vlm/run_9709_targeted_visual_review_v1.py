#!/usr/bin/env python3
"""Run targeted visual review for 9709 page-chain post-extraction queues."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
import re
import sys
from typing import Any

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.qwen_openai_client_v1 import call_qwen_openai_v1


SCHEMA_VERSION = "9709_targeted_visual_vlm_review_v1"
DISPOSITION_SCHEMA_VERSION = "9709_vlm_assisted_visual_dispositions_v1"
DEFAULT_MODEL = "qwen3-vl-plus"


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_text(path: str | Path, text: str) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(text, encoding="utf-8")


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _stem_from_source_pdf(source_pdf_path: str | None) -> str:
    if not source_pdf_path:
        return "unknown"
    stem = Path(source_pdf_path).stem
    match = re.match(r"^(?:WM_)?9709_([smw]\d{2}_qp_\d{2})$", stem)
    return match.group(1) if match else stem


def build_targeted_stack_image(
    *,
    review_item: dict[str, Any],
    output_root: str | Path,
    padding_px: int = 16,
) -> str:
    crop_paths = [Path(path) for path in _as_list(review_item.get("review_crop_paths"))]
    if not crop_paths:
        raise ValueError(f"{review_item.get('storage_key')}: no review_crop_paths")
    missing = [str(path) for path in crop_paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"{review_item.get('storage_key')}: missing review crops: {missing[:3]}")

    images = [Image.open(path).convert("RGB") for path in crop_paths]
    try:
        label_height = 36
        width = max(image.width for image in images) + (padding_px * 2)
        height = padding_px + sum(image.height + label_height + padding_px for image in images)
        canvas = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(canvas)
        y = padding_px
        for index, image in enumerate(images, start=1):
            label = f"{review_item.get('storage_key')} crop {index}/{len(images)}"
            draw.text((padding_px, y), label, fill=(0, 0, 0))
            y += label_height
            canvas.paste(image, (padding_px, y))
            y += image.height + padding_px

        source_stem = _stem_from_source_pdf(str(review_item.get("source_pdf_path") or ""))
        q_number = int(review_item.get("q_number") or 0)
        output_path = Path(output_root) / f"{source_stem}_questions_q{q_number:02d}_targeted.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output_path)
        return str(output_path)
    finally:
        for image in images:
            image.close()


def build_visual_review_request(
    *,
    review_item: dict[str, Any],
    stack_image_path: str | Path,
    model: str,
    include_individual_crop_images: bool = False,
) -> dict[str, Any]:
    crop_paths = [str(path) for path in _as_list(review_item.get("review_crop_paths"))]
    crop_count = len(crop_paths)
    prompt = (
        "Return one valid JSON object only. "
        "You are performing visual quality review for one Cambridge 9709 question crop stack. "
        f"Storage key: {review_item.get('storage_key')}. "
        f"Printed question number: {review_item.get('q_number')}. "
        f"Review reasons: {json.dumps(review_item.get('review_reasons') or [])}. "
        f"The primary attached PNG is a single vertical stack image containing {crop_count} labeled crop(s) "
        "in top-to-bottom order. Treat every label of the form 'crop i/N' inside that one stack image as an "
        "included crop/page. Do not reject merely because only one combined PNG is attached. "
        "For multi_page_question, inspect all labeled crops in the combined stack and accept cross-page continuity "
        "when the printed continuation pages are present and legible. "
        "Check only visual legibility, question boundary, diagram/table presence, and cross-page continuity. "
        "Do not solve the problem. Do not decide topic authority. "
        "Return keys: accepted, blockers, warnings, notes, checked. "
        "checked must include booleans or null for question_boundary_accepted, diagram_presence_accepted, "
        "cross_page_continuity_accepted, and visual_legibility_accepted. "
        "Reject only when the crop stack is unreadable, misses required continuation pages, cuts the question boundary, "
        "or contradicts diagram/table presence needed by the review reasons."
    )
    content: list[dict[str, str]] = [
        {"type": "text", "text": prompt},
        {"type": "image_path", "image_path": str(stack_image_path)},
    ]
    if include_individual_crop_images and crop_paths:
        content.append(
            {
                "type": "text",
                "text": "The following individual crop images are the same stack components, in order.",
            }
        )
        for index, crop_path in enumerate(crop_paths, start=1):
            content.extend(
                [
                    {"type": "text", "text": f"Individual crop {index}/{crop_count}: {crop_path}"},
                    {"type": "image_path", "image_path": crop_path},
                ]
            )
    return {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "max_tokens": 1024,
        "temperature": 0,
        "enable_thinking": False,
        "response_format": {"type": "json_object"},
    }


def _parse_vlm_content(response: dict[str, Any]) -> dict[str, Any]:
    content = response["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("visual review response must be a JSON object")
    return parsed


def _normalize_checked(
    checked: dict[str, Any],
    *,
    review_reasons: list[str],
    accepted: bool,
) -> dict[str, bool | None]:
    question_boundary = checked.get("question_boundary_accepted")
    diagram_presence = checked.get("diagram_presence_accepted")
    cross_page = checked.get("cross_page_continuity_accepted")
    return {
        "question_boundary_accepted": question_boundary if isinstance(question_boundary, bool) else accepted,
        "diagram_presence_accepted": (
            diagram_presence if isinstance(diagram_presence, bool) else (accepted if "diagram_lane" in review_reasons else None)
        ),
        "cross_page_continuity_accepted": (
            cross_page if isinstance(cross_page, bool) else (accepted if "multi_page_question" in review_reasons else None)
        ),
    }


def run_visual_review(
    *,
    post_extraction_review_path: str | Path,
    output_root: str | Path,
    json_out: str | Path,
    model: str = DEFAULT_MODEL,
    generated_on: str | None = None,
    storage_keys: set[str] | None = None,
    include_individual_crop_images: bool = False,
    client=call_qwen_openai_v1,
) -> dict[str, Any]:
    source_review = _load_json(post_extraction_review_path)
    queue = _as_list(source_review.get("human_review_queue"))
    if storage_keys:
        wanted = {str(key) for key in storage_keys}
        queue = [item for item in queue if str(item.get("storage_key") or "") in wanted]
        found = {str(item.get("storage_key") or "") for item in queue}
        missing = sorted(wanted - found)
        if missing:
            raise ValueError(f"storage_key not found in post-extraction review queue: {missing}")
    generated = generated_on or date.today().isoformat()
    items: list[dict[str, Any]] = []

    for index, review_item in enumerate(queue, start=1):
        stack_path = build_targeted_stack_image(review_item=review_item, output_root=output_root)
        response = client(
            build_visual_review_request(
                review_item=review_item,
                stack_image_path=stack_path,
                model=model,
                include_individual_crop_images=include_individual_crop_images,
            )
        )
        parsed = _parse_vlm_content(response)
        accepted = bool(parsed.get("accepted"))
        checked = _normalize_checked(
            parsed.get("checked") if isinstance(parsed.get("checked"), dict) else {},
            review_reasons=[str(reason) for reason in _as_list(review_item.get("review_reasons"))],
            accepted=accepted,
        )
        item = {
            **review_item,
            "targeted_stack_image_path": stack_path,
            "vlm_status": "accepted" if accepted else "rejected",
            "status": "accepted" if accepted else "rejected",
            "vlm_checked": checked,
            "vlm_blockers": _as_list(parsed.get("blockers")),
            "vlm_warnings": _as_list(parsed.get("warnings")),
            "vlm_notes": str(parsed.get("notes") or ""),
        }
        items.append(item)
        payload = build_visual_review_payload(
            generated_on=generated,
            shard_id=str(source_review.get("shard_id") or "unknown"),
            source_review=str(post_extraction_review_path),
            model=model,
            items=items,
        )
        _write_json(json_out, payload)
        print(
            "targeted_visual_progress:",
            f"{index}/{len(queue)}",
            f"status={item['status']}",
            f"storage_key={item.get('storage_key')}",
            flush=True,
        )

    payload = build_visual_review_payload(
        generated_on=generated,
        shard_id=str(source_review.get("shard_id") or "unknown"),
        source_review=str(post_extraction_review_path),
        model=model,
        items=items,
    )
    _write_json(json_out, payload)
    return payload


def build_visual_review_payload(
    *,
    generated_on: str,
    shard_id: str,
    source_review: str,
    model: str,
    items: list[dict[str, Any]],
) -> dict[str, Any]:
    accepted = sum(1 for item in items if item.get("status") == "accepted")
    rejected = sum(1 for item in items if item.get("status") == "rejected")
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "shard_id": shard_id,
        "source_review": source_review,
        "transport": "qwen_openai_client_v1",
        "model": model,
        "summary": {
            "items": len(items),
            "accepted": accepted,
            "rejected": rejected,
        },
        "items": items,
    }


def merge_visual_review_payloads(
    base_payload: dict[str, Any],
    retry_payload: dict[str, Any],
) -> dict[str, Any]:
    retry_by_key = {
        str(item.get("storage_key") or ""): item
        for item in _as_list(retry_payload.get("items"))
        if item.get("storage_key")
    }
    merged_items: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in _as_list(base_payload.get("items")):
        storage_key = str(item.get("storage_key") or "")
        if storage_key in retry_by_key:
            merged_items.append(retry_by_key[storage_key])
            seen.add(storage_key)
        else:
            merged_items.append(item)
            if storage_key:
                seen.add(storage_key)
    for storage_key, item in retry_by_key.items():
        if storage_key not in seen:
            merged_items.append(item)

    return build_visual_review_payload(
        generated_on=str(retry_payload.get("generated_on") or base_payload.get("generated_on") or date.today().isoformat()),
        shard_id=str(base_payload.get("shard_id") or retry_payload.get("shard_id") or "unknown"),
        source_review=str(base_payload.get("source_review") or retry_payload.get("source_review") or ""),
        model=str(retry_payload.get("model") or base_payload.get("model") or DEFAULT_MODEL),
        items=merged_items,
    )


def build_visual_dispositions(
    review_payload: dict[str, Any],
    *,
    manifest_id: str,
    evidence_review_path: str,
    reviewed_on: str | None = None,
) -> dict[str, Any]:
    reviewed_date = reviewed_on or date.today().isoformat()
    items: list[dict[str, Any]] = []
    reason_counts: Counter[str] = Counter()
    paper_counts: Counter[str] = Counter()
    for review_item in _as_list(review_payload.get("items")):
        review_reasons = [str(reason) for reason in _as_list(review_item.get("review_reasons"))]
        accepted = review_item.get("status") == "accepted"
        if accepted:
            reason_counts.update(review_reasons)
        paper_counts.update([_stem_from_source_pdf(str(review_item.get("source_pdf_path") or ""))])
        checked = review_item.get("vlm_checked") if isinstance(review_item.get("vlm_checked"), dict) else {}
        visual_checks = {
            "question_boundary_accepted": checked.get("question_boundary_accepted") is True,
        }
        if "diagram_lane" in review_reasons:
            visual_checks["diagram_presence_accepted"] = checked.get("diagram_presence_accepted") is True
        if "multi_page_question" in review_reasons:
            visual_checks["cross_page_continuity_accepted"] = checked.get("cross_page_continuity_accepted") is True
        if "warning_disposition" in review_reasons:
            visual_checks["warning_disposition_accepted"] = accepted
        items.append(
            {
                "storage_key": review_item.get("storage_key"),
                "source_pdf_path": review_item.get("source_pdf_path"),
                "q_number": review_item.get("q_number"),
                "disposition": "accepted" if accepted else "rejected",
                "accepted_review_reasons": review_reasons if accepted else [],
                "visual_checks": visual_checks,
                "reviewed_by": "codex_visual_review_vlm_assisted",
                "reviewed_on": reviewed_date,
                "evidence_source": "targeted_visual_vlm_review",
                "evidence_review_path": evidence_review_path,
                "targeted_stack_image_path": review_item.get("targeted_stack_image_path"),
                "reviewed_crop_paths": review_item.get("review_crop_paths") or [],
                "page_indices": review_item.get("page_indices") or [],
                "vlm_checked": checked,
                "vlm_warnings": review_item.get("vlm_warnings") or [],
                "notes": (
                    "Accepted from targeted VLM visual review evidence. This is a VLM-assisted visual "
                    "disposition for source legibility, question boundary, diagram presence, and cross-page "
                    "continuity only; it is not authority alignment or production-ready approval. "
                    f"VLM notes: {review_item.get('vlm_notes') or ''}"
                )
                if accepted
                else (review_item.get("vlm_notes") or ""),
            }
        )

    accepted_count = sum(1 for item in items if item.get("disposition") == "accepted")
    rejected_count = sum(1 for item in items if item.get("disposition") == "rejected")
    return {
        "schema_version": DISPOSITION_SCHEMA_VERSION,
        "generated_on": str(review_payload.get("generated_on") or reviewed_date),
        "manifest_id": manifest_id,
        "scope": {"shard_id": review_payload.get("shard_id")},
        "reviewed_by": "codex_visual_review_vlm_assisted",
        "reviewed_on": reviewed_date,
        "evidence_source": "targeted_visual_vlm_review",
        "evidence_review_path": evidence_review_path,
        "summary": {
            "items": len(items),
            "accepted": accepted_count,
            "rejected": rejected_count,
            "accepted_review_reason_counts": dict(sorted(reason_counts.items())),
            "paper_counts": dict(sorted(paper_counts.items())),
        },
        "items": items,
    }


def render_disposition_markdown(dispositions: dict[str, Any]) -> str:
    summary = dispositions.get("summary") or {}
    shard_id = (dispositions.get("scope") or {}).get("shard_id") or "unknown"
    reason_counts = summary.get("accepted_review_reason_counts") or {}
    lines = [
        f"# 9709 {shard_id} VLM-assisted visual disposition",
        "",
        f"status: `{'accepted' if summary.get('rejected') == 0 else 'blocked'}`",
        "",
        "## Scope",
        "",
        f"- shard: `{shard_id}`",
        f"- reviewed items: `{summary.get('items')}`",
        "- method: targeted VLM-assisted inspection of rendered review crop stacks",
        "- posture: operator-in-the-loop visual disposition; not authority alignment and not production-ready approval",
        "",
        "## Summary",
        "",
        f"- accepted: `{summary.get('accepted')}`",
        f"- rejected: `{summary.get('rejected')}`",
    ]
    for reason, count in reason_counts.items():
        lines.append(f"- `{reason}`: `{count}`")
    lines.extend(
        [
            "",
            "## Evidence",
            "",
            f"- targeted review JSON: `{dispositions.get('evidence_review_path')}`",
            "",
            "## Stop Point",
            "",
            "This disposition closes only the post-extraction visual queue. Mechanics authority alignment must still prove topic-side coverage before any downstream DB write-back, search gate, or release preflight.",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run targeted 9709 visual VLM review and build dispositions.")
    parser.add_argument("--post-extraction-review", required=True, type=Path)
    parser.add_argument("--stack-output-root", required=True, type=Path)
    parser.add_argument("--targeted-review-json", required=True, type=Path)
    parser.add_argument("--dispositions-json", required=True, type=Path)
    parser.add_argument("--disposition-md", type=Path)
    parser.add_argument("--manifest-id", required=True)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--generated-on")
    parser.add_argument("--storage-key", action="append", default=[])
    parser.add_argument("--merge-base-review-json", type=Path)
    parser.add_argument("--include-individual-crops", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    base_review_payload = _load_json(args.merge_base_review_json) if args.merge_base_review_json else None
    review_payload = run_visual_review(
        post_extraction_review_path=args.post_extraction_review,
        output_root=args.stack_output_root,
        json_out=args.targeted_review_json,
        model=args.model,
        generated_on=args.generated_on,
        storage_keys=set(args.storage_key) if args.storage_key else None,
        include_individual_crop_images=args.include_individual_crops,
    )
    if base_review_payload:
        review_payload = merge_visual_review_payloads(base_review_payload, review_payload)
        _write_json(args.targeted_review_json, review_payload)
    dispositions = build_visual_dispositions(
        review_payload,
        manifest_id=args.manifest_id,
        evidence_review_path=str(args.targeted_review_json),
        reviewed_on=args.generated_on,
    )
    _write_json(args.dispositions_json, dispositions)
    if args.disposition_md:
        _write_text(args.disposition_md, render_disposition_markdown(dispositions))
    print(json.dumps(dispositions["summary"], ensure_ascii=False, indent=2))
    return 0 if dispositions["summary"].get("rejected") == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
