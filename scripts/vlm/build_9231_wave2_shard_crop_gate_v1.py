#!/usr/bin/env python3
"""Build local-only render/crop evidence for 9231 wave2 representative shards."""
from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.build_9231_pilot_shard_crop_gate_v1 import (  # noqa: E402
    build_9231_pilot_shard_crop_gate,
)


SCHEMA_VERSION = "9231_wave2_shard_crop_gate_v1"
CROP_MANIFEST_SCHEMA_VERSION = "9231_wave2_shard_crop_manifest_v1"
DEFAULT_WAVE2_SHARD_IDS = (
    "9231_p1_w25_standard_001",
    "9231_p2_w25_standard_001",
    "9231_p3_w25_standard_001",
    "9231_p4_w25_standard_001",
    "9231_p1_s24_standard_001",
    "9231_p2_s24_standard_001",
    "9231_p3_s24_standard_001",
    "9231_p4_s24_standard_001",
    "9231_p1_s20_standard_001",
    "9231_p2_s20_standard_001",
    "9231_p3_s20_standard_001",
    "9231_p4_s20_standard_001",
    "9231_p1_w16_standard_001",
    "9231_p2_s16_standard_001",
    "9231_p2_w16_standard_001",
    "9231_p1_s18_standard_001",
)
SELECTION_STRATEGY = (
    {
        "bucket": "newest untested winter 2025",
        "shard_ids": DEFAULT_WAVE2_SHARD_IDS[0:4],
    },
    {
        "bucket": "recent summer 2024 all papers",
        "shard_ids": DEFAULT_WAVE2_SHARD_IDS[4:8],
    },
    {
        "bucket": "first p3/p4-era summer 2020 all papers",
        "shard_ids": DEFAULT_WAVE2_SHARD_IDS[8:12],
    },
    {
        "bucket": "legacy p1/p2-only era",
        "shard_ids": DEFAULT_WAVE2_SHARD_IDS[12:16],
    },
)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _replace_wave2_strings(value: Any) -> Any:
    if isinstance(value, str):
        return (
            value.replace("local_pilot_crop_render", "local_wave2_crop_render")
            .replace("pilot_crop_render", "wave2_crop_render")
            .replace("9231 pilot shard", "9231 wave2 shard")
            .replace("9231 pilot shards", "9231 wave2 shards")
            .replace("representative 9231 pilot", "representative 9231 wave2")
            .replace("pilot page-chain", "wave2 page-chain")
        )
    if isinstance(value, list):
        return [_replace_wave2_strings(item) for item in value]
    if isinstance(value, dict):
        return {key: _replace_wave2_strings(item) for key, item in value.items()}
    return value


def _wave2_crop_manifest(crop_manifest: dict[str, Any], *, generated_on: str) -> dict[str, Any]:
    updated = _replace_wave2_strings(crop_manifest)
    updated["schema_version"] = CROP_MANIFEST_SCHEMA_VERSION
    updated["manifest_id"] = f"9231_wave2_shards_{generated_on.replace('-', '_')}_crop_manifest_v1"
    scope = dict(updated.get("scope") or {})
    scope.update(
        {
            "stage": "9231 wave2 shard render/crop gate",
            "source_scope_label": "16 representative 9231 wave2 shard input manifests",
            "surface_update": "wave2 page-chain surface manifests receive local crop/render references only",
            "not_question_plain_text": True,
            "not_normalized_plain_text_consumption_gate": True,
        }
    )
    updated["scope"] = scope
    return updated


def _source_cleanliness_risks(crop_manifest: dict[str, Any]) -> dict[str, Any]:
    by_pdf: dict[str, int] = {}
    for item in crop_manifest.get("items") or []:
        if not isinstance(item, dict):
            continue
        source_pdf = str(item.get("source_pdf") or "")
        if not Path(source_pdf).name.startswith("WM_"):
            continue
        by_pdf[source_pdf] = by_pdf.get(source_pdf, 0) + 1

    return {
        "risk_status": (
            "watermarked_source_paths_present_visual_review_required"
            if by_pdf
            else "no_watermarked_source_paths_detected_by_filename"
        ),
        "watermarked_source_pdf_count": len(by_pdf),
        "watermarked_source_row_count": sum(by_pdf.values()),
        "watermarked_source_pdfs": dict(sorted(by_pdf.items())),
        "mechanical_crop_blocker": False,
        "notes": [
            "This is a filename/path-based local risk flag only.",
            "It does not prove visual watermark presence or absence on every crop.",
            "It does not change deterministic crop completion status.",
        ],
    }


def _wave2_surface_record(record: dict[str, Any], *, generated_on: str) -> dict[str, Any]:
    payload = _replace_wave2_strings(record["payload"])
    pilot_gate = payload.pop("pilot_crop_gate", {})
    payload["wave2_crop_gate"] = {
        **pilot_gate,
        "schema_version": SCHEMA_VERSION,
        "generated_on": generated_on,
        "stage": "9231 wave2 shard render/crop gate",
        "not_production_ready": True,
        "not_question_plain_text": True,
        "not_db_search_rag_consumption": True,
    }
    return {
        **record,
        "payload": payload,
    }


def _wave2_report(
    report: dict[str, Any],
    *,
    wave2_shard_ids: list[str],
    generated_on: str,
    source_cleanliness_risks: dict[str, Any],
) -> dict[str, Any]:
    updated = _replace_wave2_strings(report)
    updated["schema_version"] = SCHEMA_VERSION
    updated["generated_on"] = generated_on
    updated["gate_status"] = str(updated.get("gate_status") or "").replace(
        "pilot_crop_render",
        "wave2_crop_render",
    )
    summary = dict(updated.get("summary") or {})
    summary["wave2_shards"] = summary.pop("pilot_shards", len(wave2_shard_ids))
    updated["summary"] = summary
    updated.pop("pilot_shard_ids", None)
    updated["wave2_shard_ids"] = wave2_shard_ids
    updated["selection_strategy"] = [
        {"bucket": item["bucket"], "shard_ids": list(item["shard_ids"])}
        for item in SELECTION_STRATEGY
    ]
    updated["source_cleanliness_risks"] = source_cleanliness_risks
    return updated


def render_9231_wave2_shard_crop_gate_markdown(
    report: dict[str, Any],
    *,
    crop_manifest_path: str | Path,
) -> str:
    summary = report["summary"]
    lines = [
        "# 9231 Wave2 Shard Crop Gate",
        "",
        f"- generated_on: `{report['generated_on']}`",
        f"- gate_status: `{report['gate_status']}`",
        "- This is not production-ready and does not claim canonical question text.",
        "- No external VLM/API or OCR rerun was used.",
        "- DB/search/read-model/RAG consumption claimed: false.",
        "- Visual review is still required.",
        "",
        "## Repo-Truth Conclusion",
        "",
        (
            "Conclusion: 16 representative 9231 wave2 shards have local deterministic render/crop assets and surface crop references, pending visual review, OCR/text evidence, v1/v2 text, and normalized_plain_text consumption gates."
            if report["gate_status"] == "wave2_crop_render_complete_pending_visual_review"
            else "Conclusion: 9231 wave2 shard crop gate is blocked and needs local locator/crop fixes before broader rollout."
        ),
        "",
        "## Selection Strategy",
        "",
        "| bucket | shards |",
        "| --- | --- |",
    ]
    for item in report.get("selection_strategy", []):
        shards = ", ".join(f"`{shard_id}`" for shard_id in item["shard_ids"])
        lines.append(f"| {item['bucket']} | {shards} |")
    risks = report.get("source_cleanliness_risks") or {}
    lines.extend(
        [
            "",
            "## Source Cleanliness Risk",
            "",
            "| metric | value |",
            "| --- | ---: |",
            f"| watermarked source PDFs by filename | {risks.get('watermarked_source_pdf_count', 0)} |",
            f"| rows from watermarked source filenames | {risks.get('watermarked_source_row_count', 0)} |",
            f"| mechanical crop blocker | {str(risks.get('mechanical_crop_blocker', False)).lower()} |",
            "",
        ]
    )
    if risks.get("watermarked_source_pdfs"):
        lines.extend(["| source PDF | rows |", "| --- | ---: |"])
        for source_pdf, row_count in risks["watermarked_source_pdfs"].items():
            lines.append(f"| `{source_pdf}` | {row_count} |")
        lines.append("")
    lines.extend(
        [
            "- This risk is filename/path-based and does not prove visual watermark presence or absence on every crop.",
            "- It does not change deterministic crop completion status; visual review/source remediation remains a later gate.",
        ]
    )
    lines.extend(
        [
            "",
            "## Gate Counts",
            "",
            "| metric | value |",
            "| --- | ---: |",
            f"| wave2 shards | {summary['wave2_shards']} |",
            f"| input manifests | {summary['input_shard_manifests']} |",
            f"| surface manifests updated | {summary['surface_manifests_updated']} |",
            f"| total rows | {summary['total_rows']} |",
            f"| crop rows complete | {summary['crop_rows_complete']} |",
            f"| missing crops | {summary['missing_crops']} |",
            f"| blocker rows | {summary['blocker_rows']} |",
            f"| multi-page rows | {summary['multi_page_rows']} |",
            f"| rendered PDFs | {summary['pdfs_rendered']} |",
            f"| rendered pages | {summary['rendered_pages']} |",
            f"| local PNG artifact files | {summary['local_png_artifact_files']} |",
            f"| text-only ready rows | {summary['text_only_ready_rows']} |",
            f"| image-context required rows | {summary['image_context_required_rows']} |",
            "",
            "## Wave2 Shards",
            "",
            "| shard | rows | complete | missing crops | multi-page | blockers |",
            "| --- | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for shard_id, counts in report.get("per_shard", {}).items():
        lines.append(
            f"| `{shard_id}` | {counts['total_rows']} | {counts['crop_rows_complete']} | {counts['missing_crops']} | {counts['multi_page_rows']} | {counts['blocker_rows']} |"
        )
    lines.extend(
        [
            "",
            "## Artifacts",
            "",
            "| artifact | path |",
            "| --- | --- |",
            f"| crop manifest | `{crop_manifest_path}` |",
        ]
    )
    for shard_id, counts in report.get("per_shard_surface_updates", {}).items():
        lines.append(f"| updated surface manifest `{shard_id}` | `{counts['surface_manifest']}` |")
    lines.extend(["", "## Blockers", ""])
    if report.get("blockers"):
        lines.extend(["| reason | shard/storage |", "| --- | --- |"])
        for blocker in report["blockers"]:
            lines.append(
                f"| `{blocker.get('reason')}` | `{blocker.get('shard_id') or blocker.get('storage_key')}` |"
            )
    else:
        lines.append("- none")
    lines.extend(
        [
            "",
            "## Next Executable Gates",
            "",
            "- Spot-check representative wave2 crop images visually before broad 9231 rollout.",
            "- If visual review passes, run the same local gate across the remaining shard groups.",
            "- Attach OCR/text evidence after crop coverage exists.",
            "- Build question_plain_text_v1/v2 only after row/evidence coverage exists.",
            "- Run a normalized_plain_text local consumption gate before claiming search/read-model/RAG consumption.",
            "",
        ]
    )
    return "\n".join(lines)


def build_9231_wave2_shard_crop_gate(
    *,
    wave2_shard_ids: list[str] | tuple[str, ...] = DEFAULT_WAVE2_SHARD_IDS,
    manifest_root: str | Path = "data/manifests",
    output_root: str | Path = "data/crops/9231-wave2-shards",
    workspace_root: str | Path = ".",
    generated_on: str | None = None,
    render_scale: float = 2.0,
    max_pages: int = 4,
    padding_points: float = 18.0,
) -> dict[str, Any]:
    generated = generated_on or date.today().isoformat()
    wave2_ids = [str(value) for value in wave2_shard_ids]
    result = build_9231_pilot_shard_crop_gate(
        pilot_shard_ids=wave2_ids,
        manifest_root=manifest_root,
        output_root=output_root,
        workspace_root=workspace_root,
        generated_on=generated,
        render_scale=render_scale,
        max_pages=max_pages,
        padding_points=padding_points,
    )
    updated_surfaces = [
        _wave2_surface_record(record, generated_on=generated)
        for record in result["updated_surface_manifests"]
    ]
    crop_manifest = _wave2_crop_manifest(result["crop_manifest"], generated_on=generated)
    return {
        "crop_manifest": crop_manifest,
        "report": _wave2_report(
            result["report"],
            wave2_shard_ids=wave2_ids,
            generated_on=generated,
            source_cleanliness_risks=_source_cleanliness_risks(crop_manifest),
        ),
        "updated_surface_manifests": updated_surfaces,
    }


def write_9231_wave2_shard_crop_gate_outputs(
    result: dict[str, Any],
    *,
    crop_manifest_path: str | Path,
    report_json_path: str | Path,
    report_md_path: str | Path,
) -> dict[str, Path]:
    crop_manifest_path = Path(crop_manifest_path)
    report_json_path = Path(report_json_path)
    report_md_path = Path(report_md_path)
    _write_json(crop_manifest_path, result["crop_manifest"])
    _write_json(report_json_path, result["report"])
    report_md_path.parent.mkdir(parents=True, exist_ok=True)
    report_md_path.write_text(
        render_9231_wave2_shard_crop_gate_markdown(
            result["report"],
            crop_manifest_path=crop_manifest_path.as_posix(),
        ),
        encoding="utf-8",
    )
    for record in result["updated_surface_manifests"]:
        _write_json(record["path"], record["payload"])
    return {
        "crop_manifest_path": crop_manifest_path,
        "report_json_path": report_json_path,
        "report_md_path": report_md_path,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build local-only 9231 wave2 shard crop gate artifacts.")
    parser.add_argument("--wave2-shard-id", action="append", default=[])
    parser.add_argument("--manifest-root", type=Path, default=Path("data/manifests"))
    parser.add_argument("--output-root", type=Path, default=Path("data/crops/9231-wave2-shards"))
    parser.add_argument(
        "--crop-manifest",
        type=Path,
        default=Path("data/manifests/9231_wave2_shards_2026_06_05_crop_manifest_v1.json"),
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        default=Path("docs/reports/2026-06-05-9231-wave2-shard-crop-gate.json"),
    )
    parser.add_argument(
        "--report-md",
        type=Path,
        default=Path("docs/reports/2026-06-05-9231-wave2-shard-crop-gate.md"),
    )
    parser.add_argument("--generated-on", default=None)
    parser.add_argument("--render-scale", type=float, default=2.0)
    parser.add_argument("--max-pages", type=int, default=4)
    parser.add_argument("--padding-points", type=float, default=18.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    wave2_ids = args.wave2_shard_id or list(DEFAULT_WAVE2_SHARD_IDS)
    result = build_9231_wave2_shard_crop_gate(
        wave2_shard_ids=wave2_ids,
        manifest_root=args.manifest_root,
        output_root=args.output_root,
        workspace_root=Path.cwd(),
        generated_on=args.generated_on,
        render_scale=args.render_scale,
        max_pages=args.max_pages,
        padding_points=args.padding_points,
    )
    write_9231_wave2_shard_crop_gate_outputs(
        result,
        crop_manifest_path=args.crop_manifest,
        report_json_path=args.report_json,
        report_md_path=args.report_md,
    )
    summary = result["report"]["summary"]
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if result["report"]["gate_status"] == "wave2_crop_render_complete_pending_visual_review" else 1


if __name__ == "__main__":
    raise SystemExit(main())
