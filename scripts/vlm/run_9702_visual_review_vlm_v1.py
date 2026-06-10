#!/usr/bin/env python3
"""Run VLM-backed visual review for 9702 Phase 5 row crops."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
import sys
import time
from typing import Any, Iterable

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.qwen_openai_client_v1 import call_qwen_openai_v1  # noqa: E402


SCHEMA_VERSION = "9702_visual_review_vlm_v1"
DEFAULT_MODEL = "qwen3-vl-plus"
DEFAULT_GENERATED_ON = "2026-06-09"
DEFAULT_PHASE4_MANIFEST = Path("data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json")
DEFAULT_VISUAL_REVIEW_JSON = Path("docs/reports/2026-06-09-9702-visual-review-vlm.json")
TRANSPORT = "qwen_openai_client_v1"
REVIEWED_BY = "qwen_vlm_external_authorized"


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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


def _shard_id_from_surface_manifest(path: str | None) -> str:
    if not path:
        return "unknown"
    name = Path(path).name
    suffix = "_page_chain_surface_v1.json"
    if name.endswith(suffix):
        return name[: -len(suffix)]
    return Path(path).stem


def build_review_items_from_phase4_manifest(
    phase4_manifest_path: str | Path,
    *,
    root_dir: str | Path = ".",
) -> list[dict[str, Any]]:
    manifest = _load_json(phase4_manifest_path)
    if manifest.get("schema_version") != "9702_full_row_surface_manifest_v1":
        raise RuntimeError(f"unexpected_phase4_manifest_schema:{manifest.get('schema_version')}")
    if manifest.get("subject_code") != "9702":
        raise RuntimeError("phase4_manifest_subject_not_9702")
    if manifest.get("production_ready_claimed") is not False:
        raise RuntimeError("phase4_manifest_must_not_claim_production_ready")

    items: list[dict[str, Any]] = []
    for row in _as_list(manifest.get("items")):
        if not isinstance(row, dict):
            continue
        if row.get("crop_status") != "complete":
            continue
        surface_manifest = str(row.get("source_locator_surface_manifest_path") or "")
        evidence_paths = [
            _repo_path(path, root_dir)
            for path in (_as_list(row.get("review_crop_paths")) or _as_list(row.get("crop_paths")))
        ]
        items.append(
            {
                "storage_key": row.get("storage_key"),
                "source_pdf": row.get("source_pdf"),
                "source_pdf_stem": row.get("source_pdf_stem"),
                "source_locator_surface_manifest_path": surface_manifest,
                "shard_id": _shard_id_from_surface_manifest(surface_manifest),
                "subject_code": "9702",
                "paper": row.get("paper"),
                "session_year": row.get("session_year"),
                "component": row.get("component"),
                "q_number": row.get("q_number"),
                "page_numbers": _as_list(row.get("page_numbers")),
                "page_range": row.get("page_range"),
                "visual_evidence_paths": evidence_paths,
                "review_reasons": [
                    "9702_phase5_full_row_visual_boundary_acceptance",
                    "question_legibility",
                    "diagram_table_continuity_if_present",
                ],
            },
        )
    return items


def build_visual_review_request(
    *,
    review_item: dict[str, Any],
    model: str,
) -> dict[str, Any]:
    evidence_paths = [str(path) for path in _as_list(review_item.get("visual_evidence_paths"))]
    prompt = (
        "Return one valid JSON object only. "
        "You are performing visual quality review for one Cambridge 9702 Physics printed question crop or crop stack. "
        f"Storage key: {review_item.get('storage_key')}. "
        f"Source PDF: {review_item.get('source_pdf')}. "
        f"Printed question number: {review_item.get('q_number')}. "
        f"Page numbers: {json.dumps(review_item.get('page_numbers') or [])}. "
        f"Page range: {json.dumps(review_item.get('page_range') or {})}. "
        f"Review reasons: {json.dumps(review_item.get('review_reasons') or [])}. "
        f"The attached image(s) are the Phase 4 accepted row crop evidence, in order, for this one row. "
        "Check whether the full printed question boundary is visually distinguishable, whether the question text is legible, "
        "and whether diagrams, tables, formulae, answer options, or continuation pages shown in the crop evidence appear coherent. "
        "Treat officially printed BLANK PAGE, continuation, copyright, or end pages as acceptable boundary evidence "
        "when the preceding crop contains the complete printed question and answer options. "
        "Do not confuse officially printed BLANK PAGE evidence with truly blank image files, missing crop files, or non-question crops. "
        "Do not solve the problem. Do not transcribe the question. Do not generate normalized text. "
        "Do not decide authority/topic alignment. Do not make any production-readiness claim. "
        "Return keys: disposition, reason, warnings, checked. "
        "Keep reason to 12 words or fewer. Use [] for warnings unless a specific visual risk exists. "
        "disposition must be exactly accepted, rejected, or ambiguous. "
        "checked must include booleans or null for question_boundary_accepted, visual_legibility_accepted, "
        "diagram_or_table_continuity_accepted, and full_printed_question_boundary_distinguishable. "
        "Use rejected only when the evidence is visibly wrong, blank, unreadable, missing required visual content, or cut at the wrong boundary. "
        "Use ambiguous when the evidence may be usable but you cannot reliably distinguish the full printed question boundary."
    )
    content: list[dict[str, str]] = [{"type": "text", "text": prompt}]
    for index, path in enumerate(evidence_paths, start=1):
        content.extend(
            [
                {"type": "text", "text": f"9702 visual evidence image {index}/{len(evidence_paths)}: {path}"},
                {"type": "image_path", "image_path": path},
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


def build_batch_visual_review_request(
    *,
    review_items: list[dict[str, Any]],
    model: str,
) -> dict[str, Any]:
    identities = [
        {
            "storage_key": item.get("storage_key"),
            "source_pdf": item.get("source_pdf"),
            "q_number": item.get("q_number"),
            "page_numbers": item.get("page_numbers") or [],
            "page_range": item.get("page_range") or {},
        }
        for item in review_items
    ]
    prompt = (
        "Return one valid JSON object only. "
        "You are performing visual quality review for a batch of Cambridge 9702 Physics printed question crop evidence. "
        "Rows to review: "
        f"{json.dumps(identities, ensure_ascii=False)}. "
        "Each row below is followed by its Phase 4 accepted crop image evidence in order. "
        "For every row, check whether the full printed question boundary is visually distinguishable, whether the question text is legible, "
        "and whether diagrams, tables, formulae, answer options, or continuation pages shown in the crop evidence appear coherent. "
        "Treat officially printed BLANK PAGE, continuation, copyright, or end pages as acceptable boundary evidence "
        "when the preceding crop contains the complete printed question and answer options. "
        "Do not confuse officially printed BLANK PAGE evidence with truly blank image files, missing crop files, or non-question crops. "
        "Do not solve any problem. Do not transcribe the questions. Do not generate normalized text. "
        "Do not decide authority/topic alignment. Do not make any production-readiness claim. "
        "Return keys: items. items must be an array with exactly one object per storage_key. "
        "Each object must include storage_key, disposition, reason, warnings, checked. "
        "Keep reason to 12 words or fewer. Use [] for warnings unless a specific visual risk exists. "
        "disposition must be exactly accepted, rejected, or ambiguous. "
        "checked must include booleans or null for question_boundary_accepted, visual_legibility_accepted, "
        "diagram_or_table_continuity_accepted, and full_printed_question_boundary_distinguishable. "
        "Use rejected only when the evidence is visibly wrong, blank, unreadable, missing required visual content, or cut at the wrong boundary. "
        "Use ambiguous when the evidence may be usable but you cannot reliably distinguish the full printed question boundary."
    )
    content: list[dict[str, str]] = [{"type": "text", "text": prompt}]
    for row_index, item in enumerate(review_items, start=1):
        evidence_paths = [str(path) for path in _as_list(item.get("visual_evidence_paths"))]
        content.append(
            {
                "type": "text",
                "text": (
                    f"Row {row_index}/{len(review_items)} storage_key={item.get('storage_key')} "
                    f"q_number={item.get('q_number')} evidence_count={len(evidence_paths)}"
                ),
            },
        )
        for image_index, path in enumerate(evidence_paths, start=1):
            content.extend(
                [
                    {
                        "type": "text",
                        "text": (
                            f"Row {row_index}/{len(review_items)} image {image_index}/{len(evidence_paths)} "
                            f"for storage_key={item.get('storage_key')}: {path}"
                        ),
                    },
                    {"type": "image_path", "image_path": path},
                ],
            )
    return {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": max(512, min(4096, 160 * len(review_items))),
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


def _parse_batch_vlm_content(response: dict[str, Any]) -> list[dict[str, Any]]:
    parsed = _parse_vlm_content(response)
    items = parsed.get("items")
    if not isinstance(items, list):
        raise ValueError("batch visual review response must include an items array")
    return [item for item in items if isinstance(item, dict)]


def _normalize_disposition(parsed: dict[str, Any]) -> str:
    disposition = str(parsed.get("disposition") or "").strip().lower()
    if disposition in {"accepted", "rejected", "ambiguous"}:
        return disposition
    if isinstance(parsed.get("accepted"), bool):
        return "accepted" if parsed["accepted"] else "rejected"
    return "ambiguous"


def _normalize_checked(value: Any, *, disposition: str) -> dict[str, bool | None]:
    checked = value if isinstance(value, dict) else {}
    accepted = disposition == "accepted"

    def bool_or_default(key: str, default: bool | None) -> bool | None:
        raw = checked.get(key)
        return raw if isinstance(raw, bool) else default

    return {
        "question_boundary_accepted": bool_or_default("question_boundary_accepted", accepted),
        "visual_legibility_accepted": bool_or_default("visual_legibility_accepted", accepted),
        "diagram_or_table_continuity_accepted": bool_or_default("diagram_or_table_continuity_accepted", None),
        "full_printed_question_boundary_distinguishable": bool_or_default(
            "full_printed_question_boundary_distinguishable",
            accepted,
        ),
    }


def _normalize_usage(value: Any) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    usage: dict[str, int] = {}
    for key, raw in value.items():
        if isinstance(raw, bool):
            continue
        if isinstance(raw, int):
            usage[str(key)] = raw
        elif isinstance(raw, float) and raw.is_integer():
            usage[str(key)] = int(raw)
    return usage


def _usage_totals(items: list[dict[str, Any]]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for item in items:
        for key, value in _normalize_usage(item.get("vlm_usage")).items():
            totals[key] = totals.get(key, 0) + value
    return dict(sorted(totals.items()))


def _build_payload(
    *,
    generated_on: str,
    model: str,
    items: list[dict[str, Any]],
    selected_rows: int,
    phase4_manifest_path: str | Path | None = None,
) -> dict[str, Any]:
    counts = Counter(str(item.get("visual_review_status") or item.get("status") or "missing") for item in items)
    summary: dict[str, Any] = {
        "selected_rows": selected_rows,
        "reviewed_rows": len(items),
        "accepted_rows": counts.get("accepted", 0),
        "rejected_rows": counts.get("rejected", 0),
        "ambiguous_rows": counts.get("ambiguous", 0),
    }
    usage_totals = _usage_totals(items)
    if usage_totals:
        summary["vlm_usage"] = usage_totals
    payload: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "subject_code": "9702",
        "stage": "9702_phase5_full_visual_review",
        "review_method": "external_vlm",
        "reviewed_by": REVIEWED_BY,
        "transport": TRANSPORT,
        "model": model,
        "authorization": {
            "external_vlm_api_authorized_by_issue_407": True,
            "external_data_transfer_authorized_by_issue_407": True,
            "phase_scope": "visual_review_only",
        },
        "production_ready_claimed": False,
        "external_vlm_or_api_used": True,
        "db_search_read_model_rag_writes": 0,
        "summary": summary,
        "shard_counts": dict(sorted(Counter(str(item.get("shard_id") or "unknown") for item in items).items())),
        "items": items,
    }
    if phase4_manifest_path:
        payload["source_phase4_manifest_path"] = str(phase4_manifest_path).replace("\\", "/")
    return payload


def _review_item_from_response(
    *,
    review_item: dict[str, Any],
    parsed: dict[str, Any],
    response: dict[str, Any],
    generated_on: str,
    model: str,
    batch_index: int,
) -> dict[str, Any]:
    disposition = _normalize_disposition(parsed)
    return {
        **review_item,
        "status": disposition,
        "visual_review_status": disposition,
        "review_method": "external_vlm",
        "reviewed_by": REVIEWED_BY,
        "reviewed_on": generated_on,
        "external_vlm_or_api_used": True,
        "vlm_model": model,
        "vlm_transport": TRANSPORT,
        "vlm_response_id": response.get("id"),
        "vlm_response_model": response.get("model"),
        "vlm_batch_index": batch_index,
        "vlm_usage": _normalize_usage(response.get("usage")),
        "vlm_checked": _normalize_checked(parsed.get("checked"), disposition=disposition),
        "review_reason": str(parsed.get("reason") or parsed.get("notes") or ""),
        "review_warnings": _as_list(parsed.get("warnings")),
        "production_ready_claimed": False,
        "normalized_text_generated": False,
        "authority_alignment_generated": False,
        "db_search_read_model_rag_writes": 0,
    }


def _load_existing_items(path: str | Path, *, accepted_only: bool = False) -> list[dict[str, Any]]:
    resolved = Path(path)
    if not resolved.exists():
        return []
    payload = _load_json(resolved)
    items = [item for item in _as_list(payload.get("items")) if isinstance(item, dict)]
    if accepted_only:
        return [item for item in items if item.get("visual_review_status") == "accepted"]
    return items


def _resume_identity(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "storage_key": str(item.get("storage_key") or ""),
        "source_pdf": str(item.get("source_pdf") or ""),
        "source_locator_surface_manifest_path": str(item.get("source_locator_surface_manifest_path") or ""),
        "q_number": item.get("q_number"),
        "page_numbers": _as_list(item.get("page_numbers")),
        "page_range": item.get("page_range") if isinstance(item.get("page_range"), dict) else {},
        "visual_evidence_paths": [
            str(path).replace("\\", "/") for path in _as_list(item.get("visual_evidence_paths"))
        ],
    }


def filter_resume_items_for_current_inventory(
    *,
    existing_items: Iterable[dict[str, Any]],
    current_review_items: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    current_by_storage_key = {
        str(item.get("storage_key") or ""): item
        for item in current_review_items
        if item.get("storage_key")
    }
    matched_items: list[dict[str, Any]] = []
    matched_storage_keys: set[str] = set()
    previous_item_count = 0
    accepted_results = 0
    stale_accepted_retried = 0
    nonaccepted_retried = 0

    for existing_item in existing_items:
        previous_item_count += 1
        if existing_item.get("visual_review_status") != "accepted":
            nonaccepted_retried += 1
            continue
        accepted_results += 1
        storage_key = str(existing_item.get("storage_key") or "")
        current_item = current_by_storage_key.get(storage_key)
        if (
            not current_item
            or storage_key in matched_storage_keys
            or _resume_identity(existing_item) != _resume_identity(current_item)
        ):
            stale_accepted_retried += 1
            continue
        matched_items.append(existing_item)
        matched_storage_keys.add(storage_key)

    return {
        "items": matched_items,
        "stats": {
            "previous_item_count": previous_item_count,
            "accepted_results": accepted_results,
            "matched_current_rows": len(matched_items),
            "stale_accepted_retried": stale_accepted_retried,
            "nonaccepted_retried": nonaccepted_retried,
        },
    }


def run_visual_review_items(
    *,
    review_items: Iterable[dict[str, Any]],
    json_out: str | Path,
    model: str = DEFAULT_MODEL,
    generated_on: str = DEFAULT_GENERATED_ON,
    root_dir: str | Path = ".",
    client=call_qwen_openai_v1,
    initial_items: Iterable[dict[str, Any]] | None = None,
    max_attempts: int = 3,
    selected_rows: int | None = None,
    phase4_manifest_path: str | Path | None = None,
    batch_size: int = 1,
    stop_on_nonaccepted: bool = False,
) -> dict[str, Any]:
    items: list[dict[str, Any]] = list(initial_items or [])
    queue = list(review_items)
    total_selected_rows = selected_rows if selected_rows is not None else len(items) + len(queue)
    effective_batch_size = max(1, int(batch_size or 1))
    batches = [queue[index : index + effective_batch_size] for index in range(0, len(queue), effective_batch_size)]
    for batch_index, batch in enumerate(batches, start=1):
        for review_item in batch:
            evidence_paths = [str(path) for path in _as_list(review_item.get("visual_evidence_paths"))]
            if not evidence_paths:
                raise ValueError(f"{review_item.get('storage_key')}: no visual_evidence_paths")
            missing = [path for path in evidence_paths if not _resolve(path, root_dir).exists()]
            if missing:
                raise FileNotFoundError(f"{review_item.get('storage_key')}: missing visual evidence paths: {missing[:3]}")

        request = (
            build_visual_review_request(review_item=batch[0], model=model)
            if len(batch) == 1
            else build_batch_visual_review_request(review_items=batch, model=model)
        )
        response = None
        last_error: Exception | None = None
        for attempt in range(1, max(1, max_attempts) + 1):
            try:
                response = client(request)
                break
            except Exception as error:  # noqa: BLE001 - preserve external transport detail.
                last_error = error
                if attempt >= max(1, max_attempts):
                    raise
                print(
                    "9702_visual_review_retry:",
                    f"attempt={attempt + 1}/{max_attempts}",
                    f"batch_index={batch_index}/{len(batches)}",
                    f"error={error}",
                    flush=True,
                )
                time.sleep(min(30, 5 * attempt))
        if response is None:
            raise RuntimeError(f"visual review request failed without response: {last_error}")

        if len(batch) == 1:
            parsed_items = {str(batch[0].get("storage_key")): _parse_vlm_content(response)}
        else:
            parsed_items = {
                str(parsed.get("storage_key") or ""): parsed
                for parsed in _parse_batch_vlm_content(response)
            }

        new_items = []
        for review_item in batch:
            storage_key = str(review_item.get("storage_key") or "")
            parsed = parsed_items.get(storage_key)
            if parsed is None:
                parsed = {
                    "disposition": "ambiguous",
                    "reason": "VLM batch response omitted this storage_key.",
                    "warnings": ["missing_batch_response_item"],
                    "checked": {
                        "question_boundary_accepted": None,
                        "visual_legibility_accepted": None,
                        "diagram_or_table_continuity_accepted": None,
                        "full_printed_question_boundary_distinguishable": None,
                    },
                }
            new_items.append(
                _review_item_from_response(
                    review_item=review_item,
                    parsed=parsed,
                    response=response,
                    generated_on=generated_on,
                    model=model,
                    batch_index=batch_index,
                ),
            )
        items.extend(new_items)
        batch_payload = _build_payload(
            generated_on=generated_on,
            model=model,
            items=items,
            selected_rows=total_selected_rows,
            phase4_manifest_path=phase4_manifest_path,
        )
        _write_json(json_out, batch_payload)
        print(
            "9702_visual_review_progress:",
            f"{len(items)}/{total_selected_rows}",
            f"batch_index={batch_index}/{len(batches)}",
            f"accepted={sum(1 for item in new_items if item['status'] == 'accepted')}",
            f"rejected={sum(1 for item in new_items if item['status'] == 'rejected')}",
            f"ambiguous={sum(1 for item in new_items if item['status'] == 'ambiguous')}",
            flush=True,
        )
        if stop_on_nonaccepted and any(item["status"] != "accepted" for item in new_items):
            print(
                "9702_visual_review_stop_on_nonaccepted:",
                f"batch_index={batch_index}/{len(batches)}",
                f"reviewed_rows={batch_payload['summary']['reviewed_rows']}",
                f"accepted_rows={batch_payload['summary']['accepted_rows']}",
                f"rejected_rows={batch_payload['summary']['rejected_rows']}",
                f"ambiguous_rows={batch_payload['summary']['ambiguous_rows']}",
                flush=True,
            )
            return batch_payload

    payload = _build_payload(
        generated_on=generated_on,
        model=model,
        items=items,
        selected_rows=total_selected_rows,
        phase4_manifest_path=phase4_manifest_path,
    )
    _write_json(json_out, payload)
    return payload


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run 9702 Phase 5 VLM visual review.")
    parser.add_argument("--phase4-manifest", type=Path, default=DEFAULT_PHASE4_MANIFEST)
    parser.add_argument("--visual-review-json", type=Path, default=DEFAULT_VISUAL_REVIEW_JSON)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--generated-on", default=DEFAULT_GENERATED_ON)
    parser.add_argument("--storage-key", action="append", default=[])
    parser.add_argument("--resume-existing", action="store_true")
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--client-timeout", type=int, default=90)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--stop-on-nonaccepted", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    root_dir = Path.cwd()
    generated_on = args.generated_on or date.today().isoformat()
    all_review_items = build_review_items_from_phase4_manifest(args.phase4_manifest, root_dir=root_dir)
    review_items = list(all_review_items)
    if args.storage_key:
        wanted = set(args.storage_key)
        review_items = [item for item in review_items if str(item.get("storage_key")) in wanted]
        found = {str(item.get("storage_key")) for item in review_items}
        missing = sorted(wanted - found)
        if missing:
            raise ValueError(f"storage_key not found in Phase 4 accepted rows: {missing}")
    existing_items: list[dict[str, Any]] = []
    resume_stats: dict[str, int] | None = None
    if args.resume_existing:
        resume = filter_resume_items_for_current_inventory(
            existing_items=_load_existing_items(args.visual_review_json),
            current_review_items=all_review_items,
        )
        existing_items = resume["items"]
        resume_stats = resume["stats"]

    if resume_stats and resume_stats["previous_item_count"]:
        completed_storage_keys = {
            str(item.get("storage_key"))
            for item in existing_items
            if item.get("storage_key") and item.get("visual_review_status") == "accepted"
        }
        review_items = [
            item
            for item in review_items
            if str(item.get("storage_key")) not in completed_storage_keys
        ]
        print(f"resume_existing_results: {resume_stats['previous_item_count']}", flush=True)
        print(f"resume_existing_accepted_results: {resume_stats['accepted_results']}", flush=True)
        print(f"resume_existing_matched_current_rows: {resume_stats['matched_current_rows']}", flush=True)
        print(f"resume_existing_stale_accepted_retried: {resume_stats['stale_accepted_retried']}", flush=True)
        print(f"resume_existing_nonaccepted_retried: {resume_stats['nonaccepted_retried']}", flush=True)
        print(f"resume_remaining_items: {len(review_items)}", flush=True)
    payload = run_visual_review_items(
        review_items=review_items,
        json_out=args.visual_review_json,
        model=args.model,
        generated_on=generated_on,
        root_dir=root_dir,
        initial_items=existing_items,
        max_attempts=args.max_attempts,
        selected_rows=len(all_review_items) if not args.storage_key else len(review_items) + len(existing_items),
        phase4_manifest_path=args.phase4_manifest,
        batch_size=args.batch_size,
        stop_on_nonaccepted=args.stop_on_nonaccepted,
        client=lambda request: call_qwen_openai_v1(request, timeout=args.client_timeout),
    )
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    summary = payload["summary"]
    return 0 if (
        summary.get("reviewed_rows") == summary.get("selected_rows")
        and summary.get("accepted_rows") == summary.get("selected_rows")
        and summary.get("rejected_rows") == 0
        and summary.get("ambiguous_rows") == 0
    ) else 1


if __name__ == "__main__":
    raise SystemExit(main())
