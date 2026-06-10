#!/usr/bin/env python3
"""Build the 9702 Phase 5 visual review acceptance gate."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
from typing import Any

from PIL import Image


SCHEMA_VERSION = "9702_visual_review_gate_v1"
SIDECAR_SCHEMA_VERSION = "9702_visual_review_sidecar_manifest_v1"
DEFAULT_GENERATED_ON = "2026-06-09"
DEFAULT_PHASE4_MANIFEST = Path("data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json")
DEFAULT_REVIEW_JSON = Path("docs/reports/2026-06-09-9702-visual-review-vlm.json")
DEFAULT_SIDECAR_MANIFEST = Path("data/manifests/9702_visual_review_2026_06_09_manifest_v1.json")
DEFAULT_GATE_JSON = Path("docs/reports/2026-06-09-9702-visual-review-gate.json")
DEFAULT_GATE_MD = Path("docs/reports/2026-06-09-9702-visual-review-gate.md")
NONBLANK_LUMA_THRESHOLD = 250


def read_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_path(path: str | Path, *, workspace_root: str | Path) -> str:
    resolved_root = Path(workspace_root).resolve()
    resolved_path = Path(path)
    if not resolved_path.is_absolute():
        return str(resolved_path).replace("\\", "/")
    try:
        return str(resolved_path.resolve().relative_to(resolved_root)).replace("\\", "/")
    except ValueError:
        return str(resolved_path).replace("\\", "/")


def resolve_path(path: str | Path, *, workspace_root: str | Path) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return Path(workspace_root) / candidate


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def image_is_nonblank(path: Path) -> bool:
    with Image.open(path) as image:
        if image.width <= 0 or image.height <= 0:
            return False
        extrema = image.convert("L").getextrema()
    return bool(extrema and extrema[0] < NONBLANK_LUMA_THRESHOLD)


def _selected_identity(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "storage_key": row.get("storage_key"),
        "source_pdf": row.get("source_pdf"),
        "source_locator_surface_manifest_path": row.get("source_locator_surface_manifest_path"),
        "q_number": row.get("q_number"),
        "page_numbers": as_list(row.get("page_numbers")),
    }


def _visual_evidence_paths(review_item: dict[str, Any] | None, row: dict[str, Any]) -> list[str]:
    source = review_item or {}
    paths = as_list(source.get("visual_evidence_paths"))
    if not paths and source.get("visual_evidence_path"):
        paths = [source["visual_evidence_path"]]
    if not paths:
        paths = as_list(row.get("review_crop_paths")) or as_list(row.get("crop_paths"))
    return [str(path).replace("\\", "/") for path in paths]


def _has_reason_or_warning(review_item: dict[str, Any]) -> bool:
    reason = str(review_item.get("review_reason") or review_item.get("reason") or "").strip()
    warnings = as_list(review_item.get("review_warnings")) or as_list(review_item.get("warnings"))
    return bool(reason or warnings)


def _review_status(review_item: dict[str, Any] | None) -> str:
    if not review_item:
        return "missing"
    status = str(review_item.get("visual_review_status") or review_item.get("status") or "").strip().lower()
    return status if status in {"accepted", "rejected", "ambiguous"} else "ambiguous"


def _review_lookup(items: list[dict[str, Any]]) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    by_key: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        storage_key = str(item.get("storage_key") or "")
        if storage_key:
            by_key.setdefault(storage_key, []).append(item)
    duplicates = [
        {"storage_key": storage_key, "count": len(matches)}
        for storage_key, matches in sorted(by_key.items())
        if len(matches) > 1
    ]
    return {storage_key: matches[-1] for storage_key, matches in by_key.items()}, duplicates


def _build_sidecar_item(
    *,
    row: dict[str, Any],
    review_item: dict[str, Any] | None,
    workspace_root: Path,
) -> tuple[dict[str, Any], dict[str, int], list[dict[str, Any]]]:
    status = _review_status(review_item)
    evidence_paths = _visual_evidence_paths(review_item, row)
    counters = Counter()
    blockers: list[dict[str, Any]] = []

    if status == "missing":
        counters["missing_review_rows"] += 1
        blockers.append({"type": "missing_review", **_selected_identity(row)})
    if status in {"rejected", "ambiguous"}:
        counters["nonaccepted_visual_review_rows"] += 1
        blockers.append(
            {
                "type": "nonaccepted_visual_review_status",
                "visual_review_status": status,
                "review_reason": (review_item or {}).get("review_reason") or (review_item or {}).get("reason"),
                "review_warnings": as_list((review_item or {}).get("review_warnings")) or as_list((review_item or {}).get("warnings")),
                **_selected_identity(row),
            },
        )
    if review_item and review_item.get("production_ready_claimed") is not False:
        counters["production_ready_claimed_rows"] += 1
        blockers.append({"type": "production_ready_claimed", **_selected_identity(row)})
    if review_item and not _has_reason_or_warning(review_item):
        counters["rows_missing_reason_or_warning"] += 1
        blockers.append({"type": "missing_reason_or_warning", **_selected_identity(row)})
    if not evidence_paths:
        counters["rows_missing_visual_evidence"] += 1
        blockers.append({"type": "missing_visual_evidence", **_selected_identity(row)})
    for evidence_path in evidence_paths:
        resolved = resolve_path(evidence_path, workspace_root=workspace_root)
        if not resolved.exists():
            counters["missing_evidence_files"] += 1
            blockers.append({"type": "missing_evidence_file", "path": evidence_path, **_selected_identity(row)})
            continue
        try:
            if not image_is_nonblank(resolved):
                counters["blank_evidence_files"] += 1
                blockers.append({"type": "blank_evidence_file", "path": evidence_path, **_selected_identity(row)})
        except Exception as error:  # noqa: BLE001 - report unreadable evidence detail.
            counters["unreadable_evidence_files"] += 1
            blockers.append(
                {
                    "type": "unreadable_evidence_file",
                    "path": evidence_path,
                    "error": str(error),
                    **_selected_identity(row),
                },
            )

    if review_item:
        if review_item.get("source_pdf") != row.get("source_pdf"):
            counters["source_identity_mismatch_rows"] += 1
            blockers.append({"type": "source_identity_mismatch", **_selected_identity(row)})
        if review_item.get("q_number") != row.get("q_number"):
            counters["q_identity_mismatch_rows"] += 1
            blockers.append({"type": "q_identity_mismatch", **_selected_identity(row)})
        if review_item.get("external_vlm_or_api_used") is True:
            if not review_item.get("vlm_model"):
                counters["vlm_model_missing_rows"] += 1
                blockers.append({"type": "vlm_model_missing", **_selected_identity(row)})
            if not review_item.get("vlm_transport"):
                counters["vlm_transport_missing_rows"] += 1
                blockers.append({"type": "vlm_transport_missing", **_selected_identity(row)})

    sidecar_item = {
        **_selected_identity(row),
        "subject_code": "9702",
        "visual_review_status": status,
        "review_method": (review_item or {}).get("review_method"),
        "reviewed_by": (review_item or {}).get("reviewed_by"),
        "reviewed_on": (review_item or {}).get("reviewed_on"),
        "review_reason": (review_item or {}).get("review_reason") or (review_item or {}).get("reason"),
        "review_warnings": as_list((review_item or {}).get("review_warnings")) or as_list((review_item or {}).get("warnings")),
        "visual_evidence_paths": evidence_paths,
        "external_vlm_or_api_used": (review_item or {}).get("external_vlm_or_api_used", False),
        "vlm_model": (review_item or {}).get("vlm_model"),
        "vlm_transport": (review_item or {}).get("vlm_transport"),
        "vlm_response_id": (review_item or {}).get("vlm_response_id"),
        "vlm_response_model": (review_item or {}).get("vlm_response_model"),
        "vlm_usage": (review_item or {}).get("vlm_usage") or {},
        "vlm_checked": (review_item or {}).get("vlm_checked") or {},
        "production_ready_claimed": False,
        "normalized_text_generated": False,
        "authority_alignment_generated": False,
        "db_search_read_model_rag_writes": 0,
    }
    return sidecar_item, dict(counters), blockers


def _sum_counters(counter_dicts: list[dict[str, int]]) -> Counter:
    total: Counter = Counter()
    for item in counter_dicts:
        total.update(item)
    return total


def build_gate(
    *,
    workspace_root: str | Path,
    generated_on: str,
    phase4_manifest_path: str | Path,
    review_json_path: str | Path,
    sidecar_manifest_path: str | Path,
    gate_json_path: str | Path,
    gate_md_path: str | Path,
) -> dict[str, Any]:
    root = Path(workspace_root)
    phase4_path = resolve_path(phase4_manifest_path, workspace_root=root)
    review_path = resolve_path(review_json_path, workspace_root=root)
    sidecar_path = resolve_path(sidecar_manifest_path, workspace_root=root)
    gate_json = resolve_path(gate_json_path, workspace_root=root)
    gate_md = resolve_path(gate_md_path, workspace_root=root)

    phase4 = read_json(phase4_path)
    review = read_json(review_path)
    if phase4.get("schema_version") != "9702_full_row_surface_manifest_v1":
        raise RuntimeError(f"unexpected_phase4_manifest_schema:{phase4.get('schema_version')}")
    if phase4.get("subject_code") != "9702" or review.get("subject_code") != "9702":
        raise RuntimeError("visual_review_gate_subject_must_be_9702")

    selected_rows = [row for row in as_list(phase4.get("items")) if isinstance(row, dict) and row.get("crop_status") == "complete"]
    review_items = [item for item in as_list(review.get("items")) if isinstance(item, dict)]
    lookup, duplicate_review_storage_keys = _review_lookup(review_items)
    sidecar_items: list[dict[str, Any]] = []
    blocker_items: list[dict[str, Any]] = []
    per_row_counters: list[dict[str, int]] = []
    status_counts: Counter = Counter()

    for row in selected_rows:
        review_item = lookup.get(str(row.get("storage_key") or ""))
        sidecar_item, counters, blockers = _build_sidecar_item(
            row=row,
            review_item=review_item,
            workspace_root=root,
        )
        sidecar_items.append(sidecar_item)
        per_row_counters.append(counters)
        blocker_items.extend(blockers)
        status_counts.update([sidecar_item["visual_review_status"]])

    row_counter = _sum_counters(per_row_counters)
    duplicate_selected_storage_keys = [
        {"storage_key": storage_key, "count": count}
        for storage_key, count in sorted(Counter(str(row.get("storage_key") or "") for row in selected_rows).items())
        if count > 1
    ]
    extra_review_storage_keys = sorted(
        storage_key
        for storage_key in lookup
        if storage_key not in {str(row.get("storage_key") or "") for row in selected_rows}
    )
    blocker_count = (
        len(blocker_items)
        + len(duplicate_review_storage_keys)
        + len(duplicate_selected_storage_keys)
        + len(extra_review_storage_keys)
    )
    counts = {
        "selected_rows": len(selected_rows),
        "reviewed_rows": len(selected_rows) - row_counter.get("missing_review_rows", 0),
        "accepted_rows": status_counts.get("accepted", 0),
        "rejected_rows": status_counts.get("rejected", 0),
        "ambiguous_rows": status_counts.get("ambiguous", 0),
        "missing_review_rows": row_counter.get("missing_review_rows", 0),
        "rows_with_visual_evidence": len(selected_rows) - row_counter.get("rows_missing_visual_evidence", 0),
        "rows_missing_visual_evidence": row_counter.get("rows_missing_visual_evidence", 0),
        "missing_evidence_files": row_counter.get("missing_evidence_files", 0),
        "blank_evidence_files": row_counter.get("blank_evidence_files", 0),
        "unreadable_evidence_files": row_counter.get("unreadable_evidence_files", 0),
        "duplicate_visual_review_storage_keys": len(duplicate_review_storage_keys),
        "duplicate_selected_storage_keys": len(duplicate_selected_storage_keys),
        "extra_review_storage_keys": len(extra_review_storage_keys),
        "source_identity_mismatch_rows": row_counter.get("source_identity_mismatch_rows", 0),
        "q_identity_mismatch_rows": row_counter.get("q_identity_mismatch_rows", 0),
        "rows_missing_reason_or_warning": row_counter.get("rows_missing_reason_or_warning", 0),
        "vlm_model_missing_rows": row_counter.get("vlm_model_missing_rows", 0),
        "vlm_transport_missing_rows": row_counter.get("vlm_transport_missing_rows", 0),
        "production_ready_claimed_rows": row_counter.get("production_ready_claimed_rows", 0),
        "blocker_count": blocker_count,
    }
    gate_pass = (
        counts["reviewed_rows"] == counts["selected_rows"]
        and counts["accepted_rows"] == counts["selected_rows"]
        and counts["rejected_rows"] == 0
        and counts["ambiguous_rows"] == 0
        and blocker_count == 0
        and review.get("production_ready_claimed") is False
        and phase4.get("production_ready_claimed") is False
    )
    sidecar = {
        "schema_version": SIDECAR_SCHEMA_VERSION,
        "manifest_id": Path(sidecar_manifest_path).name.replace(".json", ""),
        "generated_on": generated_on,
        "subject_code": "9702",
        "stage": "9702_phase5_visual_review_sidecar",
        "source_phase4_manifest_path": repo_path(phase4_path, workspace_root=root),
        "source_visual_review_json_path": repo_path(review_path, workspace_root=root),
        "production_ready_claimed": False,
        "item_count": len(sidecar_items),
        "items": sidecar_items,
    }
    gate = {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "subject_code": "9702",
        "gate_status": "passed" if gate_pass else "blocked",
        "production_ready_claimed": False,
        "external_vlm_or_api_used": bool(review.get("external_vlm_or_api_used")),
        "review_method": review.get("review_method"),
        "vlm": {
            "model": review.get("model"),
            "transport": review.get("transport"),
            "reviewed_by": review.get("reviewed_by"),
            "usage": review.get("summary", {}).get("vlm_usage", {}),
        },
        "artifacts": {
            "phase4_row_surface_manifest": repo_path(phase4_path, workspace_root=root),
            "visual_review_json": repo_path(review_path, workspace_root=root),
            "visual_review_sidecar_manifest": repo_path(sidecar_path, workspace_root=root),
        },
        "counts": counts,
        "blockers": {
            "rows": blocker_items,
            "duplicate_visual_review_storage_keys": duplicate_review_storage_keys,
            "duplicate_selected_storage_keys": duplicate_selected_storage_keys,
            "extra_review_storage_keys": extra_review_storage_keys,
        },
        "claim_boundary": {
            "visual_acceptance_only": True,
            "canonical_question_text_claimed": False,
            "normalized_plain_text_claimed": False,
            "authority_alignment_claimed": False,
            "db_search_read_model_rag_consumption_claimed": False,
            "production_ready_claimed": False,
        },
    }
    write_json(sidecar_path, sidecar)
    write_json(gate_json, gate)
    gate_md.parent.mkdir(parents=True, exist_ok=True)
    gate_md.write_text(render_gate_markdown(gate), encoding="utf-8")
    return gate


def render_gate_markdown(gate: dict[str, Any]) -> str:
    counts = gate["counts"]
    lines = [
        "# 9702 visual review acceptance gate",
        "",
        f"- generated_on: `{gate['generated_on']}`",
        f"- gate_status: `{gate['gate_status']}`",
        "- scope: `Phase 5 visual acceptance only`",
        "- production_ready_claimed: `false`",
        f"- review_method: `{gate.get('review_method')}`",
        f"- vlm_model: `{gate.get('vlm', {}).get('model')}`",
        f"- vlm_transport: `{gate.get('vlm', {}).get('transport')}`",
        "",
        "## Counts",
        "",
        f"- selected_rows: `{counts['selected_rows']}`",
        f"- reviewed_rows: `{counts['reviewed_rows']}`",
        f"- accepted_rows: `{counts['accepted_rows']}`",
        f"- rejected_rows: `{counts['rejected_rows']}`",
        f"- ambiguous_rows: `{counts['ambiguous_rows']}`",
        f"- missing_review_rows: `{counts['missing_review_rows']}`",
        f"- rows_with_visual_evidence: `{counts['rows_with_visual_evidence']}`",
        f"- rows_missing_visual_evidence: `{counts['rows_missing_visual_evidence']}`",
        f"- duplicate_visual_review_storage_keys: `{counts['duplicate_visual_review_storage_keys']}`",
        f"- blocker_count: `{counts['blocker_count']}`",
        "",
        "## Artifacts",
        "",
        f"- phase4_row_surface_manifest: `{gate['artifacts']['phase4_row_surface_manifest']}`",
        f"- visual_review_json: `{gate['artifacts']['visual_review_json']}`",
        f"- visual_review_sidecar_manifest: `{gate['artifacts']['visual_review_sidecar_manifest']}`",
        "",
        "## Boundary",
        "",
        "This gate proves only that the Phase 4 accepted row crops/surfaces have row-level visual review dispositions and usable visual evidence. It does not claim normalized text, authority alignment, local consumption, DB/search/read-model/RAG writes, semantic retrieval quality, or production readiness.",
    ]
    return "\n".join(lines) + "\n"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the 9702 Phase 5 visual review acceptance gate.")
    parser.add_argument("--generated-on", default=DEFAULT_GENERATED_ON)
    parser.add_argument("--phase4-manifest", type=Path, default=DEFAULT_PHASE4_MANIFEST)
    parser.add_argument("--visual-review-json", type=Path, default=DEFAULT_REVIEW_JSON)
    parser.add_argument("--sidecar-manifest", type=Path, default=DEFAULT_SIDECAR_MANIFEST)
    parser.add_argument("--gate-json", type=Path, default=DEFAULT_GATE_JSON)
    parser.add_argument("--gate-md", type=Path, default=DEFAULT_GATE_MD)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    generated_on = args.generated_on or date.today().isoformat()
    gate = build_gate(
        workspace_root=Path.cwd(),
        generated_on=generated_on,
        phase4_manifest_path=args.phase4_manifest,
        review_json_path=args.visual_review_json,
        sidecar_manifest_path=args.sidecar_manifest,
        gate_json_path=args.gate_json,
        gate_md_path=args.gate_md,
    )
    print(json.dumps({"gate_status": gate["gate_status"], "counts": gate["counts"]}, ensure_ascii=False, indent=2))
    return 0 if gate["gate_status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
