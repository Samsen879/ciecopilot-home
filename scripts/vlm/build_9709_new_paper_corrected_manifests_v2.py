#!/usr/bin/env python3
"""Build corrected 9709 new-paper pre-shard input manifests from strict PDF headers."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from copy import deepcopy
from dataclasses import dataclass
from datetime import date
import json
from pathlib import Path
import sys
from typing import Any, Iterable

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


COMBINED_SCHEMA_VERSION = "9709_new_papers_2026_06_03_manifest_v2"
SHARD_SCHEMA_VERSION = "9709_new_papers_2026_06_03_shard_input_v2"
COMBINED_MANIFEST_ID = "9709_new_papers_2026_06_03_manifest_v2"
SOURCE_MANIFEST_ID = "9709_new_papers_2026_06_02_manifest_v1"
NEW_SESSION_YEARS = ("m25", "s25", "w24", "w25")
STRICT_HEADER_METHOD = "pymupdf_strict_left_margin_printed_question_header_v2"
ROOT_CAUSE = (
    "v1 locator admitted PDF page numbers or non-header numeric tokens where strict "
    "printed question headers were absent"
)


@dataclass(frozen=True)
class LoadedManifest:
    path: Path
    payload: dict[str, Any]


def discover_v1_input_manifests(manifest_dir: str | Path = "data/manifests") -> list[Path]:
    root = Path(manifest_dir)
    return [
        root / f"9709_p{paper}_{session_year}_standard_001_input_v1.json"
        for paper in range(1, 7)
        for session_year in NEW_SESSION_YEARS
        if (root / f"9709_p{paper}_{session_year}_standard_001_input_v1.json").exists()
    ]


def _resolve_path(path_value: str | Path, *, workspace_root: Path) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return workspace_root / path


def _display_path(path_value: str | Path, *, workspace_root: Path) -> str:
    path = Path(path_value)
    try:
        return path.resolve().relative_to(workspace_root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _strict_printed_question_headers(pdf_path: Path, *, x_max: float = 70.0) -> set[int]:
    try:
        import fitz  # type: ignore
    except ImportError as error:  # pragma: no cover - environment guard
        raise RuntimeError("PyMuPDF/fitz is required for strict PDF question-header detection") from error

    question_numbers: set[int] = set()
    with fitz.open(str(pdf_path)) as document:
        for page_index, page in enumerate(document):
            if page_index == 0:
                continue
            for word in page.get_text("words"):
                x0, y0, _x1, _y1, text, *_rest = word
                token = str(text).strip().rstrip(".")
                if not token.isdigit():
                    continue
                q_number = int(token)
                if q_number < 1 or q_number > 15:
                    continue
                if float(x0) > x_max or float(y0) <= 35:
                    continue
                question_numbers.add(q_number)
    return question_numbers


def _load_manifests(
    manifest_paths: Iterable[str | Path],
    *,
    workspace_root: Path,
) -> list[LoadedManifest]:
    manifests: list[LoadedManifest] = []
    for path_like in manifest_paths:
        path = _resolve_path(path_like, workspace_root=workspace_root)
        manifests.append(LoadedManifest(path=path, payload=_load_json(path)))
    return manifests


def _validate_loaded_manifests(manifests: list[LoadedManifest]) -> None:
    if len(manifests) != 24:
        raise ValueError(f"expected 24 v1 input manifests, found {len(manifests)}")
    for loaded in manifests:
        items = loaded.payload.get("items")
        if not isinstance(items, list):
            raise ValueError(f"manifest items must be a list: {loaded.path}")


def _excluded_row(
    item: dict[str, Any],
    *,
    manifest_path: Path,
    detected_headers: set[int],
    workspace_root: Path,
    reason: str,
) -> dict[str, Any]:
    return {
        "storage_key": item.get("storage_key"),
        "source_pdf": item.get("source_pdf"),
        "q_number": item.get("q_number"),
        "shard_id": item.get("shard_id"),
        "input_manifest_path": _display_path(manifest_path, workspace_root=workspace_root),
        "reason": reason,
        "detected_strict_question_headers": sorted(detected_headers),
    }


def _build_shard_manifest(
    loaded: LoadedManifest,
    *,
    corrected_items: list[dict[str, Any]],
    generated_on: str,
) -> dict[str, Any]:
    payload = deepcopy(loaded.payload)
    shard_id = str(payload.get("shard_id") or "")
    pdf_paths = sorted({str(item["source_pdf"]) for item in corrected_items if item.get("source_pdf")})
    payload.update(
        {
            "schema_version": SHARD_SCHEMA_VERSION,
            "manifest_id": f"{COMBINED_MANIFEST_ID}_{shard_id}",
            "generated_on": generated_on,
            "source_manifest_id": COMBINED_MANIFEST_ID,
            "source_manifest_v1_id": SOURCE_MANIFEST_ID,
            "correction_method": STRICT_HEADER_METHOD,
            "correction_scope": "pre-shard input correction before formal page-chain production",
            "item_count": len(corrected_items),
            "pdf_count": len(pdf_paths),
            "pdf_paths": pdf_paths,
            "items": corrected_items,
        }
    )
    return payload


def _combined_manifest(
    *,
    shard_manifests: list[dict[str, Any]],
    generated_on: str,
    excluded_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    shards: list[dict[str, Any]] = []
    all_items: list[dict[str, Any]] = []
    for payload in shard_manifests:
        items = payload.get("items") or []
        all_items.extend(items)
        shards.append(
            {
                "shard_id": payload.get("shard_id"),
                "group_key": payload.get("group_key"),
                "risk_tier": payload.get("risk_tier"),
                "item_count": len(items),
                "pdf_count": payload.get("pdf_count"),
                "pdf_paths": payload.get("pdf_paths"),
                "paper_set": payload.get("paper_set"),
                "session_year_set": payload.get("session_year_set"),
                "risk_tags": payload.get("risk_tags"),
            }
        )

    return {
        "schema_version": COMBINED_SCHEMA_VERSION,
        "manifest_id": COMBINED_MANIFEST_ID,
        "subject_code": "9709",
        "generated_on": generated_on,
        "source_manifest_id": SOURCE_MANIFEST_ID,
        "scope": {
            "stage": "corrected pre-shard input manifest",
            "correction_method": STRICT_HEADER_METHOD,
            "root_cause": ROOT_CAUSE,
            "not_page_chain_surface": True,
            "not_production_ready": True,
            "not_vlm_reviewed": True,
            "not_authority_db_search_release_closeout": True,
            "external_vlm_api_calls": 0,
            "input_rows_v1": len(all_items) + len(excluded_rows),
            "question_rows_parseable": len(all_items),
            "excluded_false_positive_rows": len(excluded_rows),
            "shards_total": len(shard_manifests),
            "pdfs_total": len({str(item["source_pdf"]) for item in all_items if item.get("source_pdf")}),
        },
        "shards": shards,
    }


def _report_payload(
    *,
    manifests: list[LoadedManifest],
    corrected_by_manifest: dict[Path, list[dict[str, Any]]],
    excluded_rows: list[dict[str, Any]],
    pdf_headers: dict[str, set[int]],
    generated_on: str,
    workspace_root: Path,
) -> dict[str, Any]:
    input_rows = sum(len(loaded.payload.get("items") or []) for loaded in manifests)
    corrected_rows = sum(len(rows) for rows in corrected_by_manifest.values())
    per_shard: dict[str, dict[str, Any]] = {}
    for loaded in manifests:
        shard_id = str(loaded.payload.get("shard_id") or loaded.path.stem)
        rows_v1 = loaded.payload.get("items") or []
        rows_v2 = corrected_by_manifest.get(loaded.path, [])
        per_shard[shard_id] = {
            "input_rows_v1": len(rows_v1),
            "corrected_rows_v2": len(rows_v2),
            "excluded_false_positive_rows": len(rows_v1) - len(rows_v2),
            "source_pdfs": sorted({str(item.get("source_pdf")) for item in rows_v2 if item.get("source_pdf")}),
        }

    excluded_by_source = Counter(str(row.get("source_pdf")) for row in excluded_rows)
    return {
        "schema_version": "9709_new_papers_2026_06_03_corrected_manifest_report_v2",
        "generated_on": generated_on,
        "summary": {
            "input_shard_manifests": len(manifests),
            "input_rows_v1": input_rows,
            "corrected_rows_v2": corrected_rows,
            "excluded_false_positive_rows": len(excluded_rows),
            "shards_v2": len(manifests),
            "pdfs_v2": len(
                {
                    str(item.get("source_pdf"))
                    for rows in corrected_by_manifest.values()
                    for item in rows
                    if item.get("source_pdf")
                }
            ),
            "root_cause": ROOT_CAUSE,
            "next_step": "rerun local-only pre-shard screenshot/crop gate on v2 manifests",
        },
        "stop_boundary": {
            "stage": "corrected pre-shard input manifest",
            "not_page_chain_surface": True,
            "not_production_ready": True,
            "not_vlm_reviewed": True,
            "authority_alignment_run": False,
            "db_backfill_run": False,
            "question_analysis_run": False,
            "search_gate_run": False,
            "release_preflight_run": False,
            "external_vlm_api_calls": 0,
        },
        "per_shard": per_shard,
        "excluded_by_source_pdf": dict(sorted(excluded_by_source.items())),
        "excluded_false_positive_rows": excluded_rows,
        "pdf_strict_question_headers": {
            _display_path(path, workspace_root=workspace_root): sorted(headers)
            for path, headers in sorted(pdf_headers.items())
        },
    }


def _markdown_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# 9709 new-paper corrected v2 pre-shard manifests",
        "",
        f"日期: {report['generated_on']}",
        "",
        "## Verdict",
        "",
        "Corrected v2 input manifests were built by retaining only rows whose `q_number` has a strict left-margin printed question header in the source PDF text layer.",
        "",
        "This is a `pre-shard input correction` that prepares the later `pre-shard screenshot/crop gate` rerun.",
        "",
        "- Not production-ready.",
        "- Not VLM-reviewed.",
        "- Not authority/DB/search/release closeout.",
        "- External VLM/API calls: `0`.",
        "",
        "## Summary",
        "",
        f"- input shard manifests: `{summary['input_shard_manifests']}`",
        f"- v1 rows: `{summary['input_rows_v1']}`",
        f"- corrected v2 rows: `{summary['corrected_rows_v2']}`",
        f"- excluded false-positive rows: `{summary['excluded_false_positive_rows']}`",
        f"- v2 shards: `{summary['shards_v2']}`",
        f"- v2 PDFs: `{summary['pdfs_v2']}`",
        f"- root cause: `{summary['root_cause']}`",
        f"- next step: `{summary['next_step']}`",
        "",
        "## Per-Shard Counts",
        "",
        "| Shard | v1 rows | v2 rows | Excluded |",
        "| --- | ---: | ---: | ---: |",
    ]
    for shard_id, counts in report["per_shard"].items():
        lines.append(
            f"| `{shard_id}` | {counts['input_rows_v1']} | {counts['corrected_rows_v2']} | {counts['excluded_false_positive_rows']} |"
        )

    lines.extend(["", "## Excluded Rows", ""])
    if report["excluded_false_positive_rows"]:
        lines.extend(["| Storage key | Source PDF | q | Reason |", "| --- | --- | ---: | --- |"])
        for row in report["excluded_false_positive_rows"]:
            lines.append(
                f"| `{row['storage_key']}` | `{row['source_pdf']}` | {row['q_number']} | `{row['reason']}` |"
            )
    else:
        lines.append("No excluded rows.")

    lines.extend(
        [
            "",
            "## Stop Boundary",
            "",
            "Stop here for manifest correction. This artifact does not run formal page-chain production, VLM review, authority alignment, DB backfill, question analysis, search gate, release preflight, or any external DashScope/Qwen VLM/API call.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_corrected_manifest_set(
    *,
    manifest_paths: list[str | Path],
    workspace_root: str | Path = ".",
    generated_on: str | None = None,
) -> dict[str, Any]:
    workspace = Path(workspace_root).resolve()
    generated = generated_on or date.today().isoformat()
    manifests = _load_manifests(manifest_paths, workspace_root=workspace)
    _validate_loaded_manifests(manifests)

    corrected_by_manifest: dict[Path, list[dict[str, Any]]] = {}
    excluded_rows: list[dict[str, Any]] = []
    pdf_headers: dict[str, set[int]] = {}
    seen_storage_keys: set[str] = set()

    for loaded in manifests:
        corrected_rows: list[dict[str, Any]] = []
        for item in loaded.payload.get("items") or []:
            storage_key = str(item.get("storage_key") or "")
            if not storage_key:
                raise ValueError(f"missing storage_key in {loaded.path}")
            if storage_key in seen_storage_keys:
                raise ValueError(f"duplicate storage_key: {storage_key}")
            seen_storage_keys.add(storage_key)

            source_pdf_value = item.get("source_pdf")
            if not source_pdf_value:
                excluded_rows.append(
                    _excluded_row(
                        item,
                        manifest_path=loaded.path,
                        detected_headers=set(),
                        workspace_root=workspace,
                        reason="source_pdf_missing",
                    )
                )
                continue
            source_pdf = _resolve_path(str(source_pdf_value), workspace_root=workspace)
            if not source_pdf.exists():
                excluded_rows.append(
                    _excluded_row(
                        item,
                        manifest_path=loaded.path,
                        detected_headers=set(),
                        workspace_root=workspace,
                        reason="source_pdf_missing",
                    )
                )
                continue

            source_key = source_pdf.resolve().as_posix()
            if source_key not in pdf_headers:
                pdf_headers[source_key] = _strict_printed_question_headers(source_pdf)
            detected_headers = pdf_headers[source_key]
            q_number = int(item.get("q_number"))
            if q_number not in detected_headers:
                excluded_rows.append(
                    _excluded_row(
                        item,
                        manifest_path=loaded.path,
                        detected_headers=detected_headers,
                        workspace_root=workspace,
                        reason="strict_printed_question_header_absent",
                    )
                )
                continue
            corrected_rows.append(deepcopy(item))
        corrected_by_manifest[loaded.path] = corrected_rows

    shard_manifests = [
        _build_shard_manifest(
            loaded,
            corrected_items=corrected_by_manifest[loaded.path],
            generated_on=generated,
        )
        for loaded in manifests
    ]
    combined = _combined_manifest(
        shard_manifests=shard_manifests,
        generated_on=generated,
        excluded_rows=excluded_rows,
    )
    report = _report_payload(
        manifests=manifests,
        corrected_by_manifest=corrected_by_manifest,
        excluded_rows=excluded_rows,
        pdf_headers=pdf_headers,
        generated_on=generated,
        workspace_root=workspace,
    )
    return {
        "combined_manifest": combined,
        "shard_manifests": shard_manifests,
        "report": report,
    }


def write_json(path: str | Path, payload: dict[str, Any]) -> None:
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_outputs(
    *,
    result: dict[str, Any],
    output_dir: str | Path,
    combined_manifest_path: str | Path,
    report_json_path: str | Path,
    report_md_path: str | Path,
) -> list[Path]:
    output_root = Path(output_dir)
    written: list[Path] = []
    write_json(combined_manifest_path, result["combined_manifest"])
    written.append(Path(combined_manifest_path))
    for payload in result["shard_manifests"]:
        shard_id = payload["shard_id"]
        path = output_root / f"9709_{shard_id}_input_v2.json"
        write_json(path, payload)
        written.append(path)
    write_json(report_json_path, result["report"])
    written.append(Path(report_json_path))
    report_md = Path(report_md_path)
    report_md.parent.mkdir(parents=True, exist_ok=True)
    report_md.write_text(_markdown_report(result["report"]), encoding="utf-8")
    written.append(report_md)
    return written


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build corrected v2 9709 new-paper input manifests.")
    parser.add_argument("--manifest-dir", type=Path, default=Path("data/manifests"))
    parser.add_argument("--input-manifest", action="append", type=Path, default=[])
    parser.add_argument("--output-dir", type=Path, default=Path("data/manifests"))
    parser.add_argument(
        "--combined-manifest",
        type=Path,
        default=Path("data/manifests/9709_new_papers_2026_06_03_manifest_v2.json"),
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        default=Path("docs/reports/2026-06-03-9709-new-paper-corrected-v2-manifest-report.json"),
    )
    parser.add_argument(
        "--report-md",
        type=Path,
        default=Path("docs/reports/2026-06-03-9709-new-paper-corrected-v2-manifest-report.md"),
    )
    parser.add_argument("--generated-on", default=None)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    manifest_paths = args.input_manifest or discover_v1_input_manifests(args.manifest_dir)
    result = build_corrected_manifest_set(
        manifest_paths=manifest_paths,
        workspace_root=Path.cwd(),
        generated_on=args.generated_on,
    )
    write_outputs(
        result=result,
        output_dir=args.output_dir,
        combined_manifest_path=args.combined_manifest,
        report_json_path=args.report_json,
        report_md_path=args.report_md,
    )
    summary = result["report"]["summary"]
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["input_shard_manifests"] == 24 and summary["corrected_rows_v2"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
