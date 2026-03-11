from __future__ import annotations

import argparse
import json
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from build_review_queue import build_review_queue_document
from make_contact_sheet import make_contact_sheet
from pdf_contamination_detector import SCAN_SCHEMA_VERSION, analyze_single_pdf
from scan_qc_anomalies import scan_qc


SUBJECT_ROOTS = {
    "9709": {
        "past_papers": Path("data") / "past-papers" / "9709Mathematics",
        "mark_schemes": Path("data") / "mark-schemes" / "9709Mathematics",
    },
    "9702": {
        "past_papers": Path("data") / "past-papers" / "9702Physics",
        "mark_schemes": Path("data") / "mark-schemes" / "9702Physics",
    },
    "9231": {
        "past_papers": Path("data") / "past-papers" / "9231Further-Mathematics",
        "mark_schemes": Path("data") / "mark-schemes" / "9231Further-Mathematics",
    },
}
REVIEW_PRIORITY = {
    "render_failed": 0,
    "qr_code_detected": 0,
    "wechat_or_qq_detected": 0,
    "non_cie_branding_detected": 0,
    "suspicious_watermark_or_overlay": 0,
    "ocr_or_detection_failed": 1,
    "url_or_domain_detected": 1,
    "suspicious_cover_or_tail_page": 2,
}
HARD_HOLD_ISSUES = {
    "render_failed",
    "qr_code_detected",
    "wechat_or_qq_detected",
    "non_cie_branding_detected",
    "suspicious_watermark_or_overlay",
    "ocr_or_detection_failed",
}
LIGHT_REVIEW_ISSUES = {
    "url_or_domain_detected",
    "suspicious_cover_or_tail_page",
}


def json_dumps(data):
    return json.dumps(data, ensure_ascii=False, indent=2)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def resolve_roots(subject: str, past_root: str | None, mark_root: str | None) -> dict[str, Path]:
    if subject not in SUBJECT_ROOTS:
        raise SystemExit(f"Unsupported subject '{subject}'. Use explicit roots if needed.")
    defaults = SUBJECT_ROOTS[subject]
    return {
        "past_papers": Path(past_root) if past_root else defaults["past_papers"],
        "mark_schemes": Path(mark_root) if mark_root else defaults["mark_schemes"],
    }


def build_targets(subject: str, roots: dict[str, Path]) -> list[tuple[Path, str]]:
    targets: list[tuple[Path, str]] = []
    for pdf_path in sorted(roots["past_papers"].rglob("*.pdf")):
        targets.append((pdf_path, "past_paper_pdf"))
    for pdf_path in sorted(roots["mark_schemes"].rglob("*.pdf")):
        targets.append((pdf_path, "mark_scheme_pdf"))
    return targets


def recommendation_for_result(result: dict) -> str:
    issues = set(result.get("issue_types", []))
    if result.get("status") == "failed":
        return "block"
    if issues & HARD_HOLD_ISSUES:
        return "block"
    if issues & LIGHT_REVIEW_ISSUES:
        return "manual_review"
    if result.get("status") == "flagged":
        return "manual_review"
    return "allow"


def make_flagged_contact_sheet(result: dict, evidence_root: Path) -> str | None:
    if result.get("status") == "clean":
        return None
    image_paths = [
        Path(page["screenshot_path"])
        for page in result.get("flagged_pages", [])
        if page.get("screenshot_path")
    ]
    if not image_paths:
        return None
    contact_path = evidence_root / result["source_type"] / result["stem"] / "flagged_pages_contact_sheet.png"
    make_contact_sheet(image_paths, contact_path, cols=4, thumb_width=280)
    return str(contact_path.resolve()) if contact_path.exists() else None


def build_review_entries(results: list[dict]) -> list[dict]:
    anomalies = []
    for result in results:
        for page in result.get("flagged_pages", []):
            for issue_type in page.get("issue_types", []):
                anomalies.append(
                    {
                        "paper": result["pdf_path"],
                        "pdf_path": result["pdf_path"],
                        "file": Path(page["screenshot_path"]).name,
                        "page_number": page["page_number"],
                        "issue": issue_type,
                        "issue_type": issue_type,
                        "reason": page["reason"],
                        "screenshot_path": page["screenshot_path"],
                        "source_type": result["source_type"],
                        "stem": result["stem"],
                        "recommendation": recommendation_for_result(result),
                    }
                )
    review_doc = build_review_queue_document(
        {
            "root": "",
            "totals": {"pdf_count": len(results), "flagged_pdf_count": sum(1 for item in results if item["status"] != "clean")},
            "anomalies": anomalies,
        },
        priority=REVIEW_PRIORITY,
    )
    final_entries = []
    for item in review_doc["queue"]:
        priority = REVIEW_PRIORITY.get(item["issue_type"], 9)
        final_entries.append(
            {
                "pdf_path": item["pdf_path"],
                "page_number": item["page_number"],
                "issue_type": item["issue_type"],
                "priority": priority,
                "reason": item["reason"],
                "screenshot_path": item["screenshot_path"],
                "review_status": "pending",
                "source_type": item["source_type"],
                "stem": item["stem"],
                "recommendation": item["recommendation"],
            }
        )
    return final_entries


def summarize_results(results: list[dict]) -> dict:
    totals = Counter()
    issue_type_counts = Counter()
    issue_page_counts = Counter()
    source_type_counts = Counter()
    block_paths = []
    manual_review_paths = []
    clean_paths = []

    for result in results:
        totals["pdf_count"] += 1
        totals["page_count"] += result.get("page_count", 0)
        source_type_counts[result["source_type"]] += 1
        for issue in set(result.get("issue_types", [])):
            issue_type_counts[issue] += 1
        for page in result.get("flagged_pages", []):
            for issue in page.get("issue_types", []):
                issue_page_counts[issue] += 1

        recommendation = recommendation_for_result(result)
        result["ingest_recommendation"] = recommendation
        if result["status"] == "clean":
            totals["clean_pdf_count"] += 1
            clean_paths.append(result["pdf_path"])
        elif result["status"] == "failed":
            totals["failed_pdf_count"] += 1
            block_paths.append(result["pdf_path"])
        else:
            totals["flagged_pdf_count"] += 1
            if recommendation == "block":
                block_paths.append(result["pdf_path"])
            else:
                manual_review_paths.append(result["pdf_path"])

    return {
        "totals": dict(totals),
        "clean_pdf_count": totals.get("clean_pdf_count", 0),
        "flagged_pdf_count": totals.get("flagged_pdf_count", 0),
        "failed_pdf_count": totals.get("failed_pdf_count", 0),
        "issue_type_counts": dict(issue_type_counts),
        "issue_page_counts": dict(issue_page_counts),
        "source_type_counts": dict(source_type_counts),
        "clean_pool_pdf_paths": clean_paths,
        "holdout_pdf_paths": block_paths,
        "light_review_pdf_paths": manual_review_paths,
    }


def build_markdown_report(
    report_path: Path,
    json_path: Path,
    review_queue_path: Path,
    qc_audit_path: Path,
    summary: dict,
    results: list[dict],
    subject: str,
    roots: dict[str, Path],
    evidence_root: Path,
) -> str:
    obvious_qr = [
        item
        for item in results
        if {"qr_code_detected", "wechat_or_qq_detected", "non_cie_branding_detected"} & set(item.get("issue_types", []))
    ][:12]
    soft_review = [item for item in results if item.get("ingest_recommendation") == "manual_review"][:20]
    blocked = [item for item in results if item.get("ingest_recommendation") == "block"][:20]

    lines = [
        f"# RAG Step 3 PDF Source Sanitation Scan ({subject})",
        "",
        f"- Generated at: {datetime.now(timezone.utc).isoformat()}",
        f"- Scope subject: {subject}",
        f"- Past papers root: {roots['past_papers'].resolve()}",
        f"- Mark schemes root: {roots['mark_schemes'].resolve()}",
        f"- Evidence root: {evidence_root.resolve()}",
        f"- Machine-readable report: {json_path.resolve()}",
        f"- Review queue: {review_queue_path.resolve()}",
        f"- Render QC audit: {qc_audit_path.resolve()}",
        f"- This scan performed no DB writes, no ingest, and no migration changes.",
        "",
        "## Headline",
        "",
        f"- Clean PDFs: {summary['clean_pdf_count']}",
        f"- Flagged PDFs: {summary['flagged_pdf_count']}",
        f"- Failed PDFs: {summary['failed_pdf_count']}",
        f"- PDFs that should not enter canonical build yet: {len(summary['holdout_pdf_paths'])}",
        f"- PDFs that need manual review before a decision: {len(summary['light_review_pdf_paths'])}",
        "",
        "## Most Common Issue Types",
        "",
    ]
    for issue_type, count in sorted(summary["issue_type_counts"].items(), key=lambda item: (-item[1], item[0])):
        lines.append(f"- {issue_type}: {count} PDFs")

    lines.extend(
        [
            "",
            "## Decision Answers",
            "",
            (
                f"1. 9709 candidate PDFs scanned: {summary['totals'].get('pdf_count', 0)}. "
                f"Clean={summary['clean_pdf_count']}, flagged={summary['flagged_pdf_count']}, failed={summary['failed_pdf_count']}."
            ),
            (
                "2. The most common contamination types are listed above from `issue_type_counts` in the JSON report. "
                f"See `{json_path.resolve()}`."
            ),
            (
                "3. Obvious third-party ad/QR evidence exists."
                if obvious_qr
                else "3. No obvious high-confidence QR/ad pages were detected in this run."
            ),
            (
                f"4. {len(summary['holdout_pdf_paths'])} PDFs are currently recommended to stay out of canonical build."
            ),
            (
                f"5. {len(summary['light_review_pdf_paths'])} PDFs are light-review candidates with softer heuristics such as suspicious cover/tail pages or domain hits."
            ),
            (
                f"6. Until review is complete, every PDF with `status != clean` in `{json_path.resolve()}` should be excluded from the clean pool."
            ),
            "",
            "## High-Confidence Examples",
            "",
        ]
    )
    if obvious_qr:
        for item in obvious_qr:
            pages = ", ".join(str(page["page_number"]) for page in item["flagged_pages"][:6])
            lines.append(f"- {item['pdf_path']} | issues={', '.join(item['issue_types'])} | pages={pages}")
    else:
        lines.append("- None")

    lines.extend(["", "## Holdout Examples", ""])
    if blocked:
        for item in blocked:
            lines.append(f"- {item['pdf_path']} | status={item['status']} | issues={', '.join(item['issue_types'])}")
    else:
        lines.append("- None")

    lines.extend(["", "## Light Review Examples", ""])
    if soft_review:
        for item in soft_review:
            lines.append(f"- {item['pdf_path']} | issues={', '.join(item['issue_types'])}")
    else:
        lines.append("- None")

    lines.extend(
        [
            "",
            "## Audit Notes",
            "",
            "- `clean` means no suspicious signal fired in this automated pass.",
            "- `flagged` means at least one suspicious page needs review or holdout action.",
            "- `failed` means rendering or detection failed enough that the PDF should not be treated as sanitized.",
            "- Page screenshots and any flagged contact sheets live under the evidence root above.",
        ]
    )
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Run a PDF source sanitation scan for official corpus candidates.")
    parser.add_argument("--subject", default="9709")
    parser.add_argument("--past-papers-root")
    parser.add_argument("--mark-schemes-root")
    parser.add_argument("--dpi", type=int, default=144)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument(
        "--evidence-root",
        default="runs/backend/rag_step3_pdf_sanitation_scan_9709_evidence",
    )
    parser.add_argument(
        "--out-json",
        default="runs/backend/rag_step3_pdf_sanitation_scan_9709.json",
    )
    parser.add_argument(
        "--out-review-queue",
        default="runs/backend/rag_step3_pdf_sanitation_review_queue_9709.json",
    )
    parser.add_argument(
        "--out-md",
        default="docs/reports/rag_step3_pdf_sanitation_scan_9709.md",
    )
    parser.add_argument(
        "--out-qc-audit",
        default="runs/backend/rag_step3_pdf_sanitation_render_qc_9709.json",
    )
    args = parser.parse_args()

    roots = resolve_roots(args.subject, args.past_papers_root, args.mark_schemes_root)
    targets = build_targets(args.subject, roots)
    if args.limit:
        targets = targets[: args.limit]

    out_json = Path(args.out_json)
    out_review_queue = Path(args.out_review_queue)
    out_md = Path(args.out_md)
    out_qc_audit = Path(args.out_qc_audit)
    evidence_root = Path(args.evidence_root)
    ensure_dir(out_json.parent)
    ensure_dir(out_review_queue.parent)
    ensure_dir(out_md.parent)
    ensure_dir(out_qc_audit.parent)
    ensure_dir(evidence_root)

    indexed_results = []
    pending_targets = []
    total_targets = len(targets)
    for index, (pdf_path, source_type) in enumerate(targets, start=1):
        result_path = evidence_root / source_type / pdf_path.stem / "result.json"
        reused_result = None
        if args.resume and result_path.exists():
            reused_result = json.loads(result_path.read_text(encoding="utf-8"))
            if (
                reused_result.get("schema_version") != SCAN_SCHEMA_VERSION
                or reused_result.get("scan_dpi") != args.dpi
                or reused_result.get("status") != "clean"
            ):
                reused_result = None
        if reused_result is not None:
            if index == 1 or index == total_targets or index % 25 == 0:
                print(f"[{index}/{total_targets}] resumed {pdf_path}", flush=True)
            indexed_results.append((index, reused_result))
        else:
            pending_targets.append((index, pdf_path, source_type))

    if args.workers <= 1:
        for index, pdf_path, source_type in pending_targets:
            if index == 1 or index == total_targets or index % 10 == 0:
                print(f"[{index}/{total_targets}] scanning {pdf_path}", flush=True)
            result = analyze_single_pdf(pdf_path, source_type, args.subject, evidence_root, args.dpi)
            result["scan_dpi"] = args.dpi
            result["contact_sheet_path"] = make_flagged_contact_sheet(result, evidence_root)
            result_path = evidence_root / source_type / result["stem"] / "result.json"
            result_path.write_text(json_dumps(result), encoding="utf-8")
            indexed_results.append((index, result))
    else:
        with ProcessPoolExecutor(max_workers=args.workers) as executor:
            future_map = {
                executor.submit(
                    analyze_single_pdf,
                    pdf_path,
                    source_type,
                    args.subject,
                    evidence_root,
                    args.dpi,
                ): (index, pdf_path, source_type)
                for index, pdf_path, source_type in pending_targets
            }
            completed = 0
            for future in as_completed(future_map):
                index, pdf_path, source_type = future_map[future]
                completed += 1
                print(f"[{completed}/{len(pending_targets)} pending done] {pdf_path}", flush=True)
                try:
                    result = future.result()
                except Exception as exc:
                    result = {
                        "schema_version": SCAN_SCHEMA_VERSION,
                        "pdf_path": str(pdf_path.resolve()),
                        "source_type": source_type,
                        "subject": args.subject,
                        "paper_id": pdf_path.stem,
                        "stem": pdf_path.stem,
                        "status": "failed",
                        "issue_types": ["render_failed"],
                        "flagged_pages": [],
                        "screenshot_paths": [],
                        "notes": [f"Worker failed: {exc}"],
                        "detection_confidence": 1.0,
                        "confidence_band": "high",
                        "page_count": 0,
                        "contact_sheet_path": None,
                        "evidence_index_path": None,
                        "qc_summary_path": None,
                        "scan_dpi": args.dpi,
                    }
                result["scan_dpi"] = args.dpi
                result["contact_sheet_path"] = make_flagged_contact_sheet(result, evidence_root)
                result_path = evidence_root / source_type / result["stem"] / "result.json"
                result_path.write_text(json_dumps(result), encoding="utf-8")
                indexed_results.append((index, result))

    results = [result for _, result in sorted(indexed_results, key=lambda item: item[0])]

    qc_totals, qc_anomalies = scan_qc(evidence_root)
    qc_doc = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "root": str(evidence_root.resolve()),
        "totals": qc_totals,
        "anomalies": qc_anomalies,
    }
    out_qc_audit.write_text(json_dumps(qc_doc), encoding="utf-8")

    summary = summarize_results(results)
    review_entries = build_review_entries(results)
    review_doc = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scope": {
            "subject": args.subject,
            "past_papers_root": str(roots["past_papers"].resolve()),
            "mark_schemes_root": str(roots["mark_schemes"].resolve()),
        },
        "queue_entry_count": len(review_entries),
        "holdout_pdf_count": len(summary["holdout_pdf_paths"]),
        "manual_review_pdf_count": len(summary["light_review_pdf_paths"]),
        "queue": review_entries,
    }
    out_review_queue.write_text(json_dumps(review_doc), encoding="utf-8")

    report_doc = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scan_schema_version": SCAN_SCHEMA_VERSION,
        "scope": {
            "subject": args.subject,
            "past_papers_root": str(roots["past_papers"].resolve()),
            "mark_schemes_root": str(roots["mark_schemes"].resolve()),
            "evidence_root": str(evidence_root.resolve()),
        },
        **summary,
        "review_queue_path": str(out_review_queue.resolve()),
        "render_qc_audit_path": str(out_qc_audit.resolve()),
        "per_pdf_results": results,
    }
    out_json.write_text(json_dumps(report_doc), encoding="utf-8")

    markdown = build_markdown_report(
        out_md,
        out_json,
        out_review_queue,
        out_qc_audit,
        summary,
        results,
        args.subject,
        roots,
        evidence_root,
    )
    out_md.write_text(markdown, encoding="utf-8")


if __name__ == "__main__":
    main()
