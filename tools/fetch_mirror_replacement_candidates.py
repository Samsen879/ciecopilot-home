from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import urllib.parse
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz
import requests
import urllib3

from pdf_contamination_detector import analyze_single_pdf


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


MIRRORS = {
    "papacambridge": {
        "kind": "direct_pdf",
        "base_url": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/{filename}",
    },
}


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_targets(scan_reports: list[Path], subject_filter: set[str] | None = None) -> list[dict[str, Any]]:
    targets: list[dict[str, Any]] = []
    for report_path in scan_reports:
        payload = read_json(report_path)
        for result in payload.get("per_pdf_results", []):
            if result.get("status") == "clean":
                continue
            subject = str(result.get("subject") or "")
            if subject_filter and subject not in subject_filter:
                continue
            result = dict(result)
            result["scan_report_path"] = str(report_path.resolve())
            targets.append(result)
    return sorted(
        targets,
        key=lambda item: (str(item.get("subject") or ""), str(item.get("source_type") or ""), str(item.get("stem") or "")),
    )


def remediation_class(result: dict[str, Any]) -> str:
    issues = set(result.get("issue_types", []))
    if "suspicious_watermark_or_overlay" in issues:
        return "overlay"
    if "qr_code_detected" in issues:
        return "inserted_page"
    return "uncertain"


def candidate_filenames(original_name: str) -> list[str]:
    names: list[str] = []
    normalized = str(original_name or "").strip()
    if not normalized:
        return names
    if normalized.upper().startswith("WM_"):
        names.append(normalized[3:])
    names.append(normalized)
    deduped: list[str] = []
    seen = set()
    for name in names:
        lowered = name.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped.append(name)
    return deduped


def mirror_urls(mirror_name: str, file_name: str) -> list[str]:
    mirror = MIRRORS[mirror_name]
    encoded = urllib.parse.quote(file_name)
    return [mirror["base_url"].format(filename=encoded)]


def safe_page_count(pdf_path: Path) -> int | None:
    try:
        with fitz.open(pdf_path) as doc:
            return doc.page_count
    except Exception:
        return None


def is_pdf_header(file_path: Path) -> bool:
    try:
        with file_path.open("rb") as handle:
            return handle.read(8).startswith(b"%PDF-")
    except OSError:
        return False


def download_from_mirror(
    target: dict[str, Any],
    mirror_name: str,
    staging_root: Path,
    timeout_seconds: int,
) -> dict[str, Any]:
    original_pdf_path = Path(target["pdf_path"])
    original_name = original_pdf_path.name
    target_dir = staging_root / str(target["subject"]) / str(target["source_type"]) / str(target["stem"]) / mirror_name
    ensure_dir(target_dir)

    attempts = []
    for candidate_name in candidate_filenames(original_name):
        out_path = target_dir / candidate_name
        if out_path.exists() and is_pdf_header(out_path):
            return {
                "download_status": "cached",
                "mirror_name": mirror_name,
                "candidate_name": candidate_name,
                "candidate_path": str(out_path.resolve()),
                "candidate_url": mirror_urls(mirror_name, candidate_name)[0],
                "file_size": out_path.stat().st_size,
                "candidate_page_count": safe_page_count(out_path),
                "attempts": attempts,
            }

        for url in mirror_urls(mirror_name, candidate_name):
            tmp_path = out_path.with_suffix(out_path.suffix + ".part")
            try:
                with requests.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0"},
                    stream=True,
                    timeout=(15, timeout_seconds),
                    verify=False,
                    allow_redirects=True,
                ) as response:
                    status_code = int(response.status_code)
                    content_type = str(response.headers.get("content-type") or "")
                    attempts.append(
                        {
                            "url": url,
                            "status_code": status_code,
                            "content_type": content_type,
                        }
                    )
                    if status_code != 200:
                        continue
                    with tmp_path.open("wb") as handle:
                        for chunk in response.iter_content(chunk_size=1024 * 256):
                            if chunk:
                                handle.write(chunk)
                if not is_pdf_header(tmp_path):
                    tmp_path.unlink(missing_ok=True)
                    attempts[-1]["error"] = "missing_pdf_header"
                    continue
                shutil.move(str(tmp_path), str(out_path))
                return {
                    "download_status": "downloaded",
                    "mirror_name": mirror_name,
                    "candidate_name": candidate_name,
                    "candidate_path": str(out_path.resolve()),
                    "candidate_url": url,
                    "file_size": out_path.stat().st_size,
                    "candidate_page_count": safe_page_count(out_path),
                    "attempts": attempts,
                }
            except Exception as exc:  # pragma: no cover - integration path
                attempts.append({"url": url, "error": str(exc)})
                tmp_path.unlink(missing_ok=True)

            try:
                command = [
                    "curl.exe",
                    "-k",
                    "--http1.1",
                    "-L",
                    "--fail",
                    "--silent",
                    "--show-error",
                    "-o",
                    str(tmp_path),
                    url,
                ]
                completed = subprocess.run(command, capture_output=True, text=True, check=False)
                attempts.append(
                    {
                        "url": url,
                        "fallback": "curl.exe",
                        "returncode": completed.returncode,
                        "stderr": (completed.stderr or "").strip()[:500],
                    }
                )
                if completed.returncode != 0 or not is_pdf_header(tmp_path):
                    tmp_path.unlink(missing_ok=True)
                    continue
                shutil.move(str(tmp_path), str(out_path))
                return {
                    "download_status": "downloaded",
                    "mirror_name": mirror_name,
                    "candidate_name": candidate_name,
                    "candidate_path": str(out_path.resolve()),
                    "candidate_url": url,
                    "file_size": out_path.stat().st_size,
                    "candidate_page_count": safe_page_count(out_path),
                    "attempts": attempts,
                }
            except Exception as exc:  # pragma: no cover - integration path
                attempts.append({"url": url, "fallback": "curl.exe", "error": str(exc)})
                tmp_path.unlink(missing_ok=True)

    return {
        "download_status": "failed",
        "mirror_name": mirror_name,
        "candidate_name": None,
        "candidate_path": None,
        "candidate_url": None,
        "file_size": None,
        "candidate_page_count": None,
        "attempts": attempts,
    }


def scan_downloaded_candidate(task: dict[str, Any]) -> dict[str, Any]:
    candidate_path = Path(task["candidate_path"])
    evidence_root = Path(task["evidence_root"])
    result = analyze_single_pdf(
        candidate_path,
        task["source_type"],
        task["subject"],
        evidence_root,
        int(task["dpi"]),
    )
    return result


def replacement_recommendation(original: dict[str, Any], candidate_scan: dict[str, Any] | None, downloaded: dict[str, Any]) -> str:
    if downloaded.get("download_status") not in {"downloaded", "cached"}:
        return "no_candidate"
    if not candidate_scan:
        return "candidate_scan_failed"
    if candidate_scan.get("status") != "clean":
        return "reject_candidate"

    original_page_count = int(original.get("page_count") or 0)
    candidate_page_count = int(candidate_scan.get("page_count") or 0)
    delta = original_page_count - candidate_page_count
    kind = remediation_class(original)
    flagged_page_count = len(original.get("flagged_pages") or [])

    if kind == "overlay":
        return "replace_candidate_ready" if delta == 0 else "manual_compare"
    if kind == "inserted_page":
        if 0 <= delta <= max(1, flagged_page_count):
            return "replace_candidate_ready"
        return "manual_compare"
    return "manual_compare"


def build_manifest_entry(
    original: dict[str, Any],
    downloaded: dict[str, Any],
    candidate_scan: dict[str, Any] | None,
) -> dict[str, Any]:
    original_page_count = int(original.get("page_count") or 0)
    candidate_page_count = int((candidate_scan or {}).get("page_count") or downloaded.get("candidate_page_count") or 0)
    recommendation = replacement_recommendation(original, candidate_scan, downloaded)
    return {
        "subject": original.get("subject"),
        "source_type": original.get("source_type"),
        "original_pdf_path": original.get("pdf_path"),
        "original_stem": original.get("stem"),
        "original_status": original.get("status"),
        "original_issue_types": original.get("issue_types", []),
        "original_flagged_pages": [page.get("page_number") for page in original.get("flagged_pages", [])],
        "original_page_count": original_page_count,
        "remediation_class": remediation_class(original),
        "scan_report_path": original.get("scan_report_path"),
        "mirror_name": downloaded.get("mirror_name"),
        "candidate_url": downloaded.get("candidate_url"),
        "candidate_name": downloaded.get("candidate_name"),
        "candidate_path": downloaded.get("candidate_path"),
        "download_status": downloaded.get("download_status"),
        "download_attempts": downloaded.get("attempts", []),
        "candidate_file_size": downloaded.get("file_size"),
        "candidate_page_count": candidate_page_count,
        "page_count_delta": original_page_count - candidate_page_count if candidate_page_count else None,
        "candidate_sanitation_status": (candidate_scan or {}).get("status"),
        "candidate_sanitation_issue_types": (candidate_scan or {}).get("issue_types", []),
        "candidate_sanitation_confidence_band": (candidate_scan or {}).get("confidence_band"),
        "candidate_evidence_index_path": (candidate_scan or {}).get("evidence_index_path"),
        "candidate_qc_summary_path": (candidate_scan or {}).get("qc_summary_path"),
        "candidate_contact_sheet_path": (candidate_scan or {}).get("contact_sheet_path"),
        "replacement_recommendation": recommendation,
    }


def summarize_manifest(entries: list[dict[str, Any]]) -> dict[str, Any]:
    totals = Counter()
    by_subject = defaultdict(Counter)
    by_recommendation = Counter()
    by_mirror = Counter()

    for entry in entries:
        subject = str(entry.get("subject") or "unknown")
        totals["target_count"] += 1
        by_subject[subject]["target_count"] += 1
        by_recommendation[entry.get("replacement_recommendation") or "unknown"] += 1
        by_mirror[entry.get("mirror_name") or "unknown"] += 1

        download_status = str(entry.get("download_status") or "unknown")
        totals[f"download_{download_status}"] += 1
        by_subject[subject][f"download_{download_status}"] += 1

        sanitation_status = str(entry.get("candidate_sanitation_status") or "not_scanned")
        totals[f"candidate_{sanitation_status}"] += 1
        by_subject[subject][f"candidate_{sanitation_status}"] += 1

    return {
        "totals": dict(totals),
        "by_subject": {subject: dict(counter) for subject, counter in sorted(by_subject.items())},
        "by_recommendation": dict(by_recommendation),
        "by_mirror": dict(by_mirror),
    }


def build_markdown_report(
    out_path: Path,
    manifest_path: Path,
    entries: list[dict[str, Any]],
    summary: dict[str, Any],
    scan_reports: list[Path],
    staging_root: Path,
    evidence_root: Path,
) -> str:
    lines = [
        "# RAG Step 3 Mirror Refetch Candidate Report",
        "",
        f"- Generated at: {datetime.now(timezone.utc).isoformat()}",
        f"- Manifest JSON: {manifest_path.resolve()}",
        f"- Scan reports used: {', '.join(str(path.resolve()) for path in scan_reports)}",
        f"- Staging root: {staging_root.resolve()}",
        f"- Evidence root: {evidence_root.resolve()}",
        "",
        "## Headline",
        "",
        f"- Targets: {summary['totals'].get('target_count', 0)}",
        f"- Downloaded or cached candidates: {summary['totals'].get('download_downloaded', 0) + summary['totals'].get('download_cached', 0)}",
        f"- Clean candidate PDFs after re-scan: {summary['totals'].get('candidate_clean', 0)}",
        f"- Replacement-ready candidates: {summary['by_recommendation'].get('replace_candidate_ready', 0)}",
        f"- Manual-compare candidates: {summary['by_recommendation'].get('manual_compare', 0)}",
        f"- Rejected candidates: {summary['by_recommendation'].get('reject_candidate', 0)}",
        f"- No-candidate failures: {summary['by_recommendation'].get('no_candidate', 0)}",
        "",
        "## By Subject",
        "",
    ]

    for subject, counters in summary.get("by_subject", {}).items():
        lines.append(
            (
                f"- {subject}: targets={counters.get('target_count', 0)}, "
                f"downloaded_or_cached={counters.get('download_downloaded', 0) + counters.get('download_cached', 0)}, "
                f"candidate_clean={counters.get('candidate_clean', 0)}, "
                f"candidate_flagged={counters.get('candidate_flagged', 0)}, "
                f"candidate_failed={counters.get('candidate_failed', 0)}"
            )
        )

    lines.extend(["", "## Replacement-Ready Examples", ""])
    ready = [item for item in entries if item.get("replacement_recommendation") == "replace_candidate_ready"][:20]
    if ready:
        for item in ready:
            lines.append(
                (
                    f"- {item['original_pdf_path']} -> {item['candidate_path']} "
                    f"| mirror={item['mirror_name']} | page_count={item['original_page_count']}->{item['candidate_page_count']}"
                )
            )
    else:
        lines.append("- None")

    lines.extend(["", "## Manual Compare Needed", ""])
    manual = [item for item in entries if item.get("replacement_recommendation") == "manual_compare"][:20]
    if manual:
        for item in manual:
            lines.append(
                (
                    f"- {item['original_pdf_path']} -> {item['candidate_path']} "
                    f"| issues={','.join(item.get('original_issue_types') or [])} "
                    f"| page_count={item['original_page_count']}->{item['candidate_page_count']}"
                )
            )
    else:
        lines.append("- None")

    lines.extend(["", "## Failed or Rejected", ""])
    rejected = [
        item
        for item in entries
        if item.get("replacement_recommendation") in {"reject_candidate", "no_candidate", "candidate_scan_failed"}
    ][:20]
    if rejected:
        for item in rejected:
            lines.append(
                (
                    f"- {item['original_pdf_path']} | recommendation={item['replacement_recommendation']} "
                    f"| candidate_status={item.get('candidate_sanitation_status')} | url={item.get('candidate_url')}"
                )
            )
    else:
        lines.append("- None")

    report = "\n".join(lines) + "\n"
    out_path.write_text(report, encoding="utf-8")
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch and verify mirror replacement candidates for flagged PDF assets.")
    parser.add_argument("--scan-report", action="append", required=True, help="Sanitation scan JSON path. Repeat for multiple subjects.")
    parser.add_argument("--subject", action="append", help="Optional subject filter. Repeatable.")
    parser.add_argument("--mirror", action="append", default=["papacambridge"], choices=sorted(MIRRORS), help="Mirror to query.")
    parser.add_argument("--staging-root", default="runs/backend/rag_step3_pdf_mirror_refetch_candidates")
    parser.add_argument("--evidence-root", default="runs/backend/rag_step3_pdf_mirror_refetch_evidence")
    parser.add_argument("--out-json", default="runs/backend/rag_step3_pdf_mirror_refetch_manifest.json")
    parser.add_argument("--out-md", default="docs/reports/rag_step3_pdf_mirror_refetch.md")
    parser.add_argument("--max-workers", type=int, default=5)
    parser.add_argument("--dpi", type=int, default=144)
    parser.add_argument("--timeout-seconds", type=int, default=60)
    parser.add_argument("--limit", type=int, default=0, help="Optional limit for dry runs.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    scan_reports = [Path(path) for path in args.scan_report]
    subject_filter = set(args.subject or [])
    staging_root = Path(args.staging_root)
    evidence_root = Path(args.evidence_root)
    out_json = Path(args.out_json)
    out_md = Path(args.out_md)

    ensure_dir(staging_root)
    ensure_dir(evidence_root)
    ensure_dir(out_json.parent)
    ensure_dir(out_md.parent)

    targets = load_targets(scan_reports, subject_filter or None)
    if args.limit and args.limit > 0:
        targets = targets[: args.limit]

    downloads: list[tuple[dict[str, Any], dict[str, Any]]] = []
    with ThreadPoolExecutor(max_workers=max(1, min(args.max_workers, 5))) as executor:
        future_map = {}
        for target in targets:
            for mirror_name in args.mirror:
                future = executor.submit(
                    download_from_mirror,
                    target,
                    mirror_name,
                    staging_root,
                    args.timeout_seconds,
                )
                future_map[future] = (target, mirror_name)

        best_download_by_original: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {}
        for future in as_completed(future_map):
            target, mirror_name = future_map[future]
            downloaded = future.result()
            key = target["pdf_path"]
            existing = best_download_by_original.get(key)
            current_ok = downloaded.get("download_status") in {"downloaded", "cached"}
            existing_ok = existing and existing[1].get("download_status") in {"downloaded", "cached"}
            if not existing or (current_ok and not existing_ok):
                best_download_by_original[key] = (target, downloaded)
            elif not existing_ok and not current_ok:
                if len(downloaded.get("attempts", [])) > len(existing[1].get("attempts", [])):
                    best_download_by_original[key] = (target, downloaded)

        downloads = list(best_download_by_original.values())

    scan_tasks = [
        {
            "candidate_path": downloaded["candidate_path"],
            "source_type": target["source_type"],
            "subject": target["subject"],
            "evidence_root": str(evidence_root),
            "dpi": args.dpi,
        }
        for target, downloaded in downloads
        if downloaded.get("download_status") in {"downloaded", "cached"} and downloaded.get("candidate_path")
    ]

    scan_results_by_path: dict[str, dict[str, Any]] = {}
    with ProcessPoolExecutor(max_workers=max(1, min(args.max_workers, 5))) as executor:
        future_map = {executor.submit(scan_downloaded_candidate, task): task for task in scan_tasks}
        for future in as_completed(future_map):
            task = future_map[future]
            result = future.result()
            scan_results_by_path[task["candidate_path"]] = result

    entries = []
    for target, downloaded in downloads:
        candidate_scan = scan_results_by_path.get(downloaded.get("candidate_path") or "")
        entries.append(build_manifest_entry(target, downloaded, candidate_scan))

    summary = summarize_manifest(entries)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mirrors": args.mirror,
        "scan_reports": [str(path.resolve()) for path in scan_reports],
        "staging_root": str(staging_root.resolve()),
        "evidence_root": str(evidence_root.resolve()),
        "summary": summary,
        "entries": entries,
    }
    out_json.write_text(json_dumps(payload), encoding="utf-8")
    build_markdown_report(out_md, out_json, entries, summary, scan_reports, staging_root, evidence_root)

    print(json_dumps(summary))
    print(f"manifest_json={out_json.resolve()}")
    print(f"report_md={out_md.resolve()}")


if __name__ == "__main__":
    main()
