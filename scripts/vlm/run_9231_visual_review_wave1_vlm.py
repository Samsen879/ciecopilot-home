#!/usr/bin/env python3
"""Run VLM-backed visual review for 9231 wave1 question crops."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
import re
import sys
import time
from typing import Any, Iterable

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.qwen_openai_client_v1 import call_qwen_openai_v1


SCHEMA_VERSION = "9231_visual_review_wave1_vlm_v1"
DEFAULT_MODEL = "qwen3-vl-plus"
DEFAULT_GENERATED_ON = "2026-06-05"


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _load_existing_items(path: str | Path) -> list[dict[str, Any]]:
    resolved = Path(path)
    if not resolved.exists():
        return []
    payload = _load_json(resolved)
    return [item for item in _as_list(payload.get("items")) if isinstance(item, dict)]


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _repo_path(path: str | Path, root_dir: str | Path) -> str:
    resolved_root = Path(root_dir).resolve()
    resolved_path = Path(path)
    if not resolved_path.is_absolute():
        return str(resolved_path).replace("\\", "/")
    try:
        return str(resolved_path.resolve().relative_to(resolved_root)).replace("\\", "/")
    except ValueError:
        return str(resolved_path).replace("\\", "/")


def _resolve(path: str | Path, root_dir: str | Path) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return Path(root_dir) / candidate


def _paper_stem(source_pdf_path: str | None) -> str:
    if not source_pdf_path:
        return "unknown"
    return Path(source_pdf_path).stem


def build_wave1_review_items_from_surface(
    surface_manifest_path: str | Path,
    *,
    root_dir: str | Path = ".",
) -> list[dict[str, Any]]:
    surface = _load_json(surface_manifest_path)
    shard_id = str(surface.get("shard_id") or Path(surface_manifest_path).stem)
    items: list[dict[str, Any]] = []
    for row in _as_list(surface.get("items")):
        review_crop_paths = [
            _repo_path(path, root_dir)
            for path in (_as_list(row.get("review_crop_paths")) or _as_list(row.get("crop_paths")))
        ]
        items.append(
            {
                "storage_key": row.get("storage_key"),
                "source_pdf_path": row.get("source_pdf"),
                "shard_id": shard_id,
                "q_number": row.get("q_number"),
                "page_numbers": _as_list(row.get("page_numbers")),
                "review_crop_paths": review_crop_paths,
                "review_reasons": [
                    "9231_wave1_crop_boundary",
                    "question_legibility",
                ],
            },
        )
    return items


def build_targeted_stack_image(
    *,
    review_item: dict[str, Any],
    output_root: str | Path,
    root_dir: str | Path = ".",
    padding_px: int = 16,
) -> str:
    crop_paths = [_resolve(path, root_dir) for path in _as_list(review_item.get("review_crop_paths"))]
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

        source_stem = _paper_stem(str(review_item.get("source_pdf_path") or ""))
        q_number = int(review_item.get("q_number") or 0)
        output_path = Path(output_root) / review_item.get("shard_id", "unknown") / f"{source_stem}_q{q_number:02d}_visual_review.png"
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
        "You are performing visual quality review for one Cambridge 9231 Further Mathematics question crop stack. "
        f"Storage key: {review_item.get('storage_key')}. "
        f"Printed question number: {review_item.get('q_number')}. "
        f"Page numbers: {json.dumps(review_item.get('page_numbers') or [])}. "
        f"Review reasons: {json.dumps(review_item.get('review_reasons') or [])}. "
        f"The primary attached PNG is a single vertical stack image containing {crop_count} labeled crop(s) "
        "in top-to-bottom order. Treat every label of the form 'crop i/N' inside that one stack image as an included crop/page. "
        "Check visual legibility, whether the printed question boundary is included, and whether continuation pages shown in the stack are coherent. "
        "Do not solve the problem. Do not decide syllabus topic authority. Do not transcribe the full question. "
        "Return keys: accepted, blockers, warnings, notes, checked. "
        "checked must include booleans or null for question_boundary_accepted, visual_legibility_accepted, "
        "cross_page_continuity_accepted, and diagram_or_table_presence_accepted. "
        "Reject only when unreadable, cropped at the wrong boundary, missing obvious continuation content, or missing a diagram/table that is visibly required."
    )
    content: list[dict[str, str]] = [
        {"type": "text", "text": prompt},
        {"type": "image_path", "image_path": str(stack_image_path)},
    ]
    if include_individual_crop_images and crop_paths:
        content.append({"type": "text", "text": "The following individual crop images are the same stack components, in order."})
        for index, crop_path in enumerate(crop_paths, start=1):
            content.extend(
                [
                    {"type": "text", "text": f"Individual crop {index}/{crop_count}: {crop_path}"},
                    {"type": "image_path", "image_path": crop_path},
                ],
            )
    return {
        "model": model,
        "messages": [{"role": "user", "content": content}],
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


def _normalize_checked(value: Any, *, accepted: bool) -> dict[str, bool | None]:
    checked = value if isinstance(value, dict) else {}
    return {
        "question_boundary_accepted": checked.get("question_boundary_accepted") if isinstance(checked.get("question_boundary_accepted"), bool) else accepted,
        "visual_legibility_accepted": checked.get("visual_legibility_accepted") if isinstance(checked.get("visual_legibility_accepted"), bool) else accepted,
        "cross_page_continuity_accepted": checked.get("cross_page_continuity_accepted") if isinstance(checked.get("cross_page_continuity_accepted"), bool) else None,
        "diagram_or_table_presence_accepted": checked.get("diagram_or_table_presence_accepted") if isinstance(checked.get("diagram_or_table_presence_accepted"), bool) else None,
    }


def _build_payload(
    *,
    generated_on: str,
    model: str,
    items: list[dict[str, Any]],
) -> dict[str, Any]:
    accepted = sum(1 for item in items if item.get("status") == "accepted")
    rejected = sum(1 for item in items if item.get("status") == "rejected")
    by_shard = Counter(str(item.get("shard_id") or "unknown") for item in items)
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "subject_code": "9231",
        "reviewed_by": "qwen_vlm_external_authorized",
        "transport": "qwen_openai_client_v1",
        "model": model,
        "authorization": {
            "external_vlm_api_authorized_by_user": True,
            "external_costs_authorized_by_user": True,
            "external_data_transfer_authorized_by_user": True,
        },
        "summary": {
            "items": len(items),
            "accepted": accepted,
            "rejected": rejected,
        },
        "shard_counts": dict(sorted(by_shard.items())),
        "items": items,
    }


def run_visual_review_items(
    *,
    review_items: Iterable[dict[str, Any]],
    output_root: str | Path,
    json_out: str | Path,
    model: str = DEFAULT_MODEL,
    generated_on: str = DEFAULT_GENERATED_ON,
    include_individual_crop_images: bool = False,
    root_dir: str | Path = ".",
    client=call_qwen_openai_v1,
    initial_items: Iterable[dict[str, Any]] | None = None,
    max_attempts: int = 3,
) -> dict[str, Any]:
    items: list[dict[str, Any]] = list(initial_items or [])
    queue = list(review_items)
    for index, review_item in enumerate(queue, start=1):
        stack_path = build_targeted_stack_image(
            review_item=review_item,
            output_root=output_root,
            root_dir=root_dir,
        )
        request = build_visual_review_request(
            review_item=review_item,
            stack_image_path=stack_path,
            model=model,
            include_individual_crop_images=include_individual_crop_images,
        )
        response = None
        last_error: Exception | None = None
        for attempt in range(1, max(1, max_attempts) + 1):
            try:
                response = client(request)
                break
            except Exception as error:  # noqa: BLE001 - preserve external client error detail.
                last_error = error
                if attempt >= max(1, max_attempts):
                    raise
                print(
                    "9231_visual_review_retry:",
                    f"attempt={attempt + 1}/{max_attempts}",
                    f"storage_key={review_item.get('storage_key')}",
                    f"error={error}",
                    flush=True,
                )
                time.sleep(min(30, 5 * attempt))
        if response is None:
            raise RuntimeError(f"visual review request failed without response: {last_error}")
        parsed = _parse_vlm_content(response)
        accepted = bool(parsed.get("accepted"))
        item = {
            **review_item,
            "targeted_stack_image_path": stack_path,
            "status": "accepted" if accepted else "rejected",
            "visual_review_status": "accepted" if accepted else "rejected",
            "reviewed_by": "qwen_vlm_external_authorized",
            "reviewed_on": generated_on,
            "external_vlm_or_api_used": True,
            "vlm_model": model,
            "vlm_transport": "qwen_openai_client_v1",
            "vlm_response_id": response.get("id"),
            "vlm_checked": _normalize_checked(parsed.get("checked"), accepted=accepted),
            "vlm_blockers": _as_list(parsed.get("blockers")),
            "vlm_warnings": _as_list(parsed.get("warnings")),
            "vlm_notes": str(parsed.get("notes") or ""),
        }
        items.append(item)
        _write_json(
            json_out,
            _build_payload(generated_on=generated_on, model=model, items=items),
        )
        print(
            "9231_visual_review_progress:",
            f"{index}/{len(queue)}",
            f"status={item['status']}",
            f"storage_key={item.get('storage_key')}",
            flush=True,
        )
    payload = _build_payload(generated_on=generated_on, model=model, items=items)
    _write_json(json_out, payload)
    return payload


def _surface_manifest_paths_from_selection(selection_manifest: str | Path) -> list[str]:
    payload = _load_json(selection_manifest)
    paths = {
        str(item.get("source_manifest") or "")
        for item in _as_list(payload.get("items"))
        if item.get("source_manifest")
    }
    return sorted(paths)


def build_review_items_from_surface_paths(
    surface_manifest_paths: Iterable[str | Path],
    *,
    root_dir: str | Path,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for surface_path in surface_manifest_paths:
        items.extend(build_wave1_review_items_from_surface(_resolve(surface_path, root_dir), root_dir=root_dir))
    return items


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run VLM-backed 9231 wave1 visual review.")
    parser.add_argument("--selection-manifest", type=Path, default=Path("data/manifests/9231_production_ready_wave1_16_2026_06_05_manifest_v1.json"))
    parser.add_argument("--surface-manifest", action="append", default=[])
    parser.add_argument("--stack-output-root", required=True, type=Path)
    parser.add_argument("--targeted-review-json", required=True, type=Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--generated-on", default=DEFAULT_GENERATED_ON)
    parser.add_argument("--storage-key", action="append", default=[])
    parser.add_argument("--include-individual-crops", action="store_true")
    parser.add_argument("--resume-existing", action="store_true")
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--client-timeout", type=int, default=90)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    root_dir = Path.cwd()
    surface_paths = args.surface_manifest or _surface_manifest_paths_from_selection(args.selection_manifest)
    review_items = build_review_items_from_surface_paths(surface_paths, root_dir=root_dir)
    if args.storage_key:
        wanted = set(args.storage_key)
        review_items = [item for item in review_items if str(item.get("storage_key")) in wanted]
        found = {str(item.get("storage_key")) for item in review_items}
        missing = sorted(wanted - found)
        if missing:
            raise ValueError(f"storage_key not found in selected review items: {missing}")
    existing_items = _load_existing_items(args.targeted_review_json) if args.resume_existing else []
    if existing_items:
        completed_storage_keys = {
            str(item.get("storage_key"))
            for item in existing_items
            if item.get("storage_key") and item.get("status") in {"accepted", "rejected"}
        }
        review_items = [
            item
            for item in review_items
            if str(item.get("storage_key")) not in completed_storage_keys
        ]
        print(f"resume_existing_results: {len(existing_items)}", flush=True)
        print(f"resume_remaining_items: {len(review_items)}", flush=True)
    payload = run_visual_review_items(
        review_items=review_items,
        output_root=args.stack_output_root,
        json_out=args.targeted_review_json,
        model=args.model,
        generated_on=args.generated_on,
        include_individual_crop_images=args.include_individual_crops,
        root_dir=root_dir,
        initial_items=existing_items,
        max_attempts=args.max_attempts,
        client=lambda request: call_qwen_openai_v1(request, timeout=args.client_timeout),
    )
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    return 0 if payload["summary"].get("rejected") == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
