#!/usr/bin/env python3
"""Run shard-scoped post-extraction review for 9709 page-chain evidence bundles."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
import re
from typing import Any


SCHEMA_VERSION = "9709_page_chain_shard_post_extraction_review_v1"
SHORT_OCR_THRESHOLD = 40


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write_json(path: str | Path, payload: dict[str, Any]) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_text(path: str | Path, text: str) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text, encoding="utf-8")


def _items(payload: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = payload.get(key)
    return value if isinstance(value, list) else []


def _index_by_storage_key(items: list[dict[str, Any]]) -> tuple[dict[str, dict[str, Any]], list[str]]:
    index: dict[str, dict[str, Any]] = {}
    duplicates: list[str] = []
    for item in items:
        storage_key = str(item.get("storage_key") or "")
        if not storage_key:
            continue
        if storage_key in index:
            duplicates.append(storage_key)
            continue
        index[storage_key] = item
    return index, duplicates


def _push_finding(
    findings: list[dict[str, Any]],
    *,
    severity: str,
    reason_code: str,
    storage_key: str | None,
    message: str,
    details: dict[str, Any] | None = None,
) -> None:
    findings.append(
        {
            "severity": severity,
            "reason_code": reason_code,
            "storage_key": storage_key,
            "message": message,
            "details": details or {},
        },
    )


def _as_bool(value: Any) -> bool | None:
    return value if isinstance(value, bool) else None


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _path_exists(path_value: Any) -> bool:
    if not isinstance(path_value, str) or not path_value:
        return False
    return Path(path_value).exists()


def _review_reasons_for_item(
    *,
    manifest_item: dict[str, Any],
    projection_item: dict[str, Any],
    bundle: dict[str, Any],
) -> list[str]:
    reasons: list[str] = []
    route = str(bundle.get("route", {}).get("route") or projection_item.get("route") or "")
    review_posture = bundle.get("review_posture") or {}
    review_reasons = [str(reason) for reason in _as_list(review_posture.get("review_reasons"))]
    ambiguity_flags = [str(flag) for flag in _as_list(review_posture.get("ambiguity_flags"))]

    if route == "diagram_lane" or projection_item.get("diagram_present") is True:
        reasons.append("diagram_lane")
    if len(_as_list(projection_item.get("page_indices"))) > 1:
        reasons.append("multi_page_question")
    if len(str(projection_item.get("ocr_text") or "").strip()) < SHORT_OCR_THRESHOLD:
        reasons.append("short_ocr_text")
    if review_reasons:
        reasons.append("warning_disposition")
    if "ocr_symbol_omission" in ambiguity_flags:
        reasons.append("ocr_symbol_omission")
    if manifest_item.get("source_pdf_watermarked") is True:
        reasons.append("watermarked_source_pdf")

    return sorted(set(reasons))


def _accepted_disposition_result(
    *,
    disposition: dict[str, Any] | None,
    review_reasons: list[str],
) -> tuple[bool, str, list[str], list[str]]:
    if not disposition:
        return False, "missing", review_reasons, []
    if disposition.get("disposition") != "accepted":
        return False, "not_accepted", review_reasons, []

    accepted_reasons = {str(reason) for reason in _as_list(disposition.get("accepted_review_reasons"))}
    missing_reasons = sorted(set(review_reasons) - accepted_reasons)
    visual_checks = disposition.get("visual_checks") if isinstance(disposition.get("visual_checks"), dict) else {}
    required_checks = ["question_boundary_accepted"]
    if "diagram_lane" in review_reasons:
        required_checks.append("diagram_presence_accepted")
    if "multi_page_question" in review_reasons:
        required_checks.append("cross_page_continuity_accepted")
    if "warning_disposition" in review_reasons:
        required_checks.append("warning_disposition_accepted")
    if "ocr_symbol_omission" in review_reasons:
        required_checks.append("ocr_symbol_omission_accepted")

    missing_checks = sorted({check for check in required_checks if visual_checks.get(check) is not True})
    if missing_reasons or missing_checks:
        return False, "incomplete", missing_reasons, missing_checks
    return True, "accepted", [], []


def build_post_extraction_review(
    *,
    manifest_path: str | Path,
    projection_path: str | Path,
    evidence_bundles_path: str | Path,
    human_dispositions_path: str | Path | None = None,
    expected_count: int | None = None,
    generated_on: str | None = None,
) -> dict[str, Any]:
    manifest = _load_json(manifest_path)
    projection = _load_json(projection_path)
    evidence_bundles = _load_json(evidence_bundles_path)
    human_dispositions = _load_json(human_dispositions_path) if human_dispositions_path else {}
    manifest_items = _items(manifest, "items")
    projection_items = _items(projection, "items")
    bundle_items = _items(evidence_bundles, "bundles")
    disposition_items = _items(human_dispositions, "items")
    manifest_by_key, manifest_duplicates = _index_by_storage_key(manifest_items)
    projection_by_key, projection_duplicates = _index_by_storage_key(projection_items)
    bundle_by_key, bundle_duplicates = _index_by_storage_key(bundle_items)
    disposition_by_key, disposition_duplicates = _index_by_storage_key(disposition_items)
    blockers: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    human_review_queue: list[dict[str, Any]] = []
    accepted_human_dispositions: list[dict[str, Any]] = []

    if expected_count is not None:
        for label, items in (
            ("manifest", manifest_items),
            ("projection", projection_items),
            ("evidence_bundles", bundle_items),
        ):
            if len(items) != expected_count:
                _push_finding(
                    blockers,
                    severity="blocker",
                    reason_code=f"{label}_count_mismatch",
                    storage_key=None,
                    message=f"{label} item count does not match expected count.",
                    details={"actual": len(items), "expected": expected_count},
                )

    for label, duplicates in (
        ("manifest", manifest_duplicates),
        ("projection", projection_duplicates),
        ("evidence_bundles", bundle_duplicates),
        ("human_dispositions", disposition_duplicates),
    ):
        for storage_key in duplicates:
            _push_finding(
                blockers,
                severity="blocker",
                reason_code=f"duplicate_{label}_storage_key",
                storage_key=storage_key,
                message=f"{label} contains duplicate storage_key.",
            )

    for storage_key, manifest_item in manifest_by_key.items():
        projection_item = projection_by_key.get(storage_key)
        bundle = bundle_by_key.get(storage_key)
        if not projection_item:
            _push_finding(
                blockers,
                severity="blocker",
                reason_code="missing_projection_item",
                storage_key=storage_key,
                message="Manifest item has no matching projection item.",
            )
            continue
        if not bundle:
            _push_finding(
                blockers,
                severity="blocker",
                reason_code="missing_evidence_bundle",
                storage_key=storage_key,
                message="Manifest item has no matching evidence bundle.",
            )
            continue

        for flag in ("diagram_present", "formula_dense", "table_heavy"):
            if not isinstance(manifest_item.get(flag), bool):
                _push_finding(
                    blockers,
                    severity="blocker",
                    reason_code=f"{flag}_not_boolean",
                    storage_key=storage_key,
                    message=f"Manifest {flag} must be true or false.",
                    details={"value": manifest_item.get(flag)},
                )

        manifest_diagram = _as_bool(manifest_item.get("diagram_present"))
        projection_diagram = _as_bool(projection_item.get("diagram_present"))
        evidence_diagram = _as_bool((bundle.get("evidence") or {}).get("diagram_present"))
        surface_diagram = _as_bool((bundle.get("surface_posture") or {}).get("diagram_present"))
        if len({manifest_diagram, projection_diagram, evidence_diagram, surface_diagram}) != 1:
            _push_finding(
                blockers,
                severity="blocker",
                reason_code="diagram_present_mismatch",
                storage_key=storage_key,
                message="manifest/projection/evidence/surface diagram_present must match.",
                details={
                    "manifest": manifest_diagram,
                    "projection": projection_diagram,
                    "evidence": evidence_diagram,
                    "surface": surface_diagram,
                },
            )

        ocr_text = str((bundle.get("evidence") or {}).get("ocr_text") or "").strip()
        if not ocr_text:
            _push_finding(
                blockers,
                severity="blocker",
                reason_code="ocr_text_empty",
                storage_key=storage_key,
                message="Evidence bundle OCR text is empty.",
            )

        if projection_diagram is True:
            evidence = bundle.get("evidence") or {}
            if not _as_list(evidence.get("diagram_elements")):
                _push_finding(
                    warnings,
                    severity="warning",
                    reason_code="diagram_present_but_elements_empty",
                    storage_key=storage_key,
                    message="Diagram-present item has empty diagram_elements.",
                )
            if not _as_list(evidence.get("spatial_evidence")):
                _push_finding(
                    warnings,
                    severity="warning",
                    reason_code="diagram_present_but_spatial_evidence_empty",
                    storage_key=storage_key,
                    message="Diagram-present item has empty spatial_evidence.",
                )

        missing_render_paths = [
            path for path in _as_list(projection_item.get("source_rendered_page_paths"))
            if not _path_exists(path)
        ]
        if missing_render_paths:
            _push_finding(
                blockers,
                severity="blocker",
                reason_code="missing_rendered_page_path",
                storage_key=storage_key,
                message="Projection references rendered pages that are missing locally.",
                details={"paths": missing_render_paths[:5], "missing_count": len(missing_render_paths)},
            )

        missing_crop_paths = [
            path for path in _as_list(projection_item.get("review_crop_paths"))
            if not _path_exists(path)
        ]
        if missing_crop_paths:
            _push_finding(
                warnings,
                severity="warning",
                reason_code="missing_review_crop_path",
                storage_key=storage_key,
                message="Projection references review crops that are missing locally.",
                details={"paths": missing_crop_paths[:5], "missing_count": len(missing_crop_paths)},
            )

        review_reasons = _review_reasons_for_item(
            manifest_item=manifest_item,
            projection_item=projection_item,
            bundle=bundle,
        )
        if review_reasons:
            disposition = disposition_by_key.get(storage_key)
            disposition_accepted, disposition_status, missing_reasons, missing_checks = _accepted_disposition_result(
                disposition=disposition,
                review_reasons=review_reasons,
            )
            if disposition_accepted:
                accepted_human_dispositions.append(
                    {
                        "storage_key": storage_key,
                        "accepted_review_reasons": review_reasons,
                        "reviewed_by": disposition.get("reviewed_by"),
                        "reviewed_on": disposition.get("reviewed_on"),
                        "notes": disposition.get("notes"),
                    },
                )
            else:
                queue_item = {
                    "storage_key": storage_key,
                    "source_pdf_path": projection_item.get("source_pdf_path"),
                    "q_number": projection_item.get("q_number"),
                    "review_reasons": review_reasons,
                    "route": (bundle.get("route") or {}).get("route"),
                    "page_indices": projection_item.get("page_indices") or [],
                    "review_crop_paths": projection_item.get("review_crop_paths") or [],
                }
                if human_dispositions_path:
                    queue_item["disposition_status"] = disposition_status
                    queue_item["missing_accepted_review_reasons"] = missing_reasons
                    queue_item["missing_visual_checks"] = missing_checks
                human_review_queue.append(queue_item)

    reason_counts = Counter(
        reason
        for item in human_review_queue
        for reason in item.get("review_reasons", [])
    )
    status = "blocked" if blockers else ("needs_human_review" if human_review_queue else "pass")
    shard_id = (
        manifest.get("scope", {}).get("shard_id")
        if isinstance(manifest.get("scope"), dict)
        else None
    ) or projection.get("shard_id")
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on or date.today().isoformat(),
        "shard_id": shard_id,
        "status": status,
        "inputs": {
            "manifest": str(manifest_path),
            "projection": str(projection_path),
            "evidence_bundles": str(evidence_bundles_path),
            "human_dispositions": str(human_dispositions_path) if human_dispositions_path else None,
        },
        "summary": {
            "manifest_items": len(manifest_items),
            "projection_items": len(projection_items),
            "evidence_bundle_items": len(bundle_items),
            "human_disposition_items": len(disposition_items),
            "blockers": len(blockers),
            "warnings": len(warnings),
            "human_review_items": len(human_review_queue),
            "accepted_human_dispositions": len(accepted_human_dispositions),
            "manual_review_reason_counts": dict(sorted(reason_counts.items())),
        },
        "blockers": blockers,
        "warnings": warnings,
        "human_review_queue": human_review_queue,
        "accepted_human_dispositions": accepted_human_dispositions,
    }


def render_review_markdown(review: dict[str, Any]) -> str:
    summary = review.get("summary") or {}
    reason_counts = summary.get("manual_review_reason_counts") or {}
    shard_id = str(review.get("shard_id") or "unknown")
    lines = [
        f"# 9709 {shard_id} post-extraction review",
        "",
        f"status: `{review.get('status')}`",
        "",
        "## Summary",
        "",
        f"- manifest items: `{summary.get('manifest_items')}`",
        f"- projection items: `{summary.get('projection_items')}`",
        f"- evidence bundle items: `{summary.get('evidence_bundle_items')}`",
        f"- human disposition items: `{summary.get('human_disposition_items')}`",
        f"- blockers: `{summary.get('blockers')}`",
        f"- warnings: `{summary.get('warnings')}`",
        f"- human review items: `{summary.get('human_review_items')}`",
        f"- accepted human dispositions: `{summary.get('accepted_human_dispositions')}`",
        "",
        "## Manual Review Reasons",
        "",
    ]
    if reason_counts:
        lines.extend(f"- `{reason}`: `{count}`" for reason, count in reason_counts.items())
    else:
        lines.append("None.")
    lines.extend(
        [
            "",
            "## Blockers",
            "",
        ],
    )
    blockers = review.get("blockers") or []
    if blockers:
        lines.extend(f"- `{item['reason_code']}` {item.get('storage_key') or ''}: {item['message']}" for item in blockers)
    else:
        lines.append("None.")
    lines.extend(
        [
            "",
            "## Stop Point",
            "",
            "Do not run analysis backfill, DB write-back, search/classifier checks, or release gates while this review status is not `pass`.",
            "",
        ],
    )
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Review a 9709 page-chain shard evidence bundle.")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--projection", required=True, type=Path)
    parser.add_argument("--evidence-bundles", required=True, type=Path)
    parser.add_argument("--human-dispositions", type=Path)
    parser.add_argument("--expected-count", type=int)
    parser.add_argument("--generated-on")
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--markdown-out", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    review = build_post_extraction_review(
        manifest_path=args.manifest,
        projection_path=args.projection,
        evidence_bundles_path=args.evidence_bundles,
        human_dispositions_path=args.human_dispositions,
        expected_count=args.expected_count,
        generated_on=args.generated_on,
    )
    if args.json_out:
        _write_json(args.json_out, review)
    if args.markdown_out:
        _write_text(args.markdown_out, render_review_markdown(review))
    print(json.dumps({"status": review["status"], **review["summary"]}, ensure_ascii=False, indent=2))
    return 1 if review["status"] == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
