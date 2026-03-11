from __future__ import annotations

import argparse
import json
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz
import numpy as np
from PIL import Image

from pdf_contamination_detector import analyze_single_pdf


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_footer_targets(vlm_audit_path: Path) -> list[dict[str, Any]]:
    payload = json.loads(vlm_audit_path.read_text(encoding="utf-8"))
    targets = [
        item
        for item in payload.get("per_pdf_results", [])
        if item.get("vlm_pdf_status") == "footer_branding_only"
    ]
    return sorted(targets, key=lambda item: (str(item.get("subject") or ""), str(item.get("candidate_path") or "")))


def detect_logo_bbox(image_path: Path) -> tuple[float, float, float, float] | None:
    image = Image.open(image_path).convert("RGB")
    array = np.array(image)
    height, width = array.shape[:2]

    x_start = int(width * 0.72)
    y_start = int(height * 0.88)
    crop = array[y_start:, x_start:, :]
    if crop.size == 0:
        return None

    channel_range = crop.max(axis=2) - crop.min(axis=2)
    brightness = crop.max(axis=2)
    mask = (channel_range >= 28) & (brightness >= 70)
    ys, xs = np.where(mask)
    if len(xs) < 25:
        return None

    x0 = x_start + int(xs.min())
    x1 = x_start + int(xs.max())
    y0 = y_start + int(ys.min())
    y1 = y_start + int(ys.max())

    pad = 10
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(width - 1, x1 + pad)
    y1 = min(height - 1, y1 + pad)
    return (x0 / width, y0 / height, x1 / width, y1 / height)


def fallback_bbox() -> tuple[float, float, float, float]:
    return (0.82, 0.945, 0.995, 0.995)


def map_ratio_bbox_to_page(page: fitz.Page, bbox: tuple[float, float, float, float]) -> fitz.Rect:
    x0_ratio, y0_ratio, x1_ratio, y1_ratio = bbox
    rect = page.rect
    return fitz.Rect(
        rect.x0 + rect.width * x0_ratio,
        rect.y0 + rect.height * y0_ratio,
        rect.x0 + rect.width * x1_ratio,
        rect.y0 + rect.height * y1_ratio,
    )


def strip_single_pdf(task: dict[str, Any]) -> dict[str, Any]:
    candidate_path = Path(task["candidate_path"])
    out_path = Path(task["out_path"])
    ensure_dir(out_path.parent)

    doc = fitz.open(candidate_path)
    applied_pages = []
    page_bboxes = []

    for page_info in task["non_clean_pages"]:
        page_number = int(page_info["page_number"])
        image_path = Path(page_info["image_path"])
        page = doc.load_page(page_number - 1)
        ratio_bbox = detect_logo_bbox(image_path) or fallback_bbox()
        rect = map_ratio_bbox_to_page(page, ratio_bbox)
        page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
        applied_pages.append(page_number)
        page_bboxes.append(
            {
                "page_number": page_number,
                "ratio_bbox": [round(value, 4) for value in ratio_bbox],
                "rect": [round(rect.x0, 2), round(rect.y0, 2), round(rect.x1, 2), round(rect.y1, 2)],
            }
        )

    doc.save(out_path, deflate=True, garbage=3)
    doc.close()

    return {
        "subject": task["subject"],
        "source_type": task["source_type"],
        "original_pdf_path": task["original_pdf_path"],
        "original_candidate_path": str(candidate_path.resolve()),
        "candidate_url": task.get("candidate_url"),
        "replacement_recommendation": task.get("replacement_recommendation"),
        "candidate_path": str(candidate_path.resolve()),
        "cleaned_pdf_path": str(out_path.resolve()),
        "applied_pages": applied_pages,
        "page_bboxes": page_bboxes,
        "candidate_page_count": task["candidate_page_count"],
        "source_manifest_path": task["source_manifest_path"],
    }


def scan_cleaned_pdf(task: dict[str, Any]) -> dict[str, Any]:
    cleaned_pdf_path = Path(task["cleaned_pdf_path"])
    evidence_root = Path(task["evidence_root"])
    scan_result = analyze_single_pdf(
        cleaned_pdf_path,
        task["source_type"],
        task["subject"],
        evidence_root,
        int(task["dpi"]),
    )
    return {
        **task,
        "rule_scan": {
            "status": scan_result["status"],
            "issue_types": scan_result["issue_types"],
            "evidence_index_path": scan_result["evidence_index_path"],
            "qc_summary_path": scan_result["qc_summary_path"],
            "candidate_page_count": scan_result["page_count"],
        },
        "candidate_path": str(cleaned_pdf_path.resolve()),
        "candidate_evidence_index_path": scan_result["evidence_index_path"],
    }


def build_markdown(out_path: Path, payload: dict[str, Any]) -> None:
    summary = payload["summary"]
    entries = payload["entries"]
    lines = [
        "# Footer Branding Strip Report",
        "",
        f"- Generated at: {payload['generated_at']}",
        f"- Source VLM audit: {payload['source_vlm_audit']}",
        f"- Output root: {payload['output_root']}",
        f"- Evidence root: {payload['evidence_root']}",
        "",
        "## Headline",
        "",
        f"- Target PDFs: {summary['target_pdf_count']}",
        f"- Stripped PDFs: {summary['stripped_pdf_count']}",
        f"- Rule-scan clean after strip: {summary['rule_scan_clean_count']}",
        f"- Rule-scan non-clean after strip: {summary['rule_scan_non_clean_count']}",
        "",
        "## Entries",
        "",
    ]
    for entry in entries[:40]:
        lines.append(
            f"- {entry['original_pdf_path']} -> {entry['cleaned_pdf_path']} | pages={','.join(str(p) for p in entry['applied_pages'])} | rule_scan={entry['rule_scan']['status']}"
        )
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Strip footer branding from VLM-flagged PapaCambridge PDFs.")
    parser.add_argument("--vlm-audit", default="runs/backend/rag_step3_pdf_mirror_vlm_audit.json")
    parser.add_argument("--output-root", default="runs/backend/rag_step3_pdf_footer_stripped_candidates")
    parser.add_argument("--evidence-root", default="runs/backend/rag_step3_pdf_footer_stripped_evidence")
    parser.add_argument("--out-json", default="runs/backend/rag_step3_pdf_footer_stripped_manifest.json")
    parser.add_argument("--out-md", default="docs/reports/rag_step3_pdf_footer_stripped_report.md")
    parser.add_argument("--max-workers", type=int, default=5)
    parser.add_argument("--dpi", type=int, default=144)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    vlm_audit_path = Path(args.vlm_audit)
    output_root = Path(args.output_root)
    evidence_root = Path(args.evidence_root)
    out_json = Path(args.out_json)
    out_md = Path(args.out_md)
    ensure_dir(output_root)
    ensure_dir(evidence_root)
    ensure_dir(out_json.parent)
    ensure_dir(out_md.parent)

    footer_targets = load_footer_targets(vlm_audit_path)
    strip_tasks = []
    for item in footer_targets:
        candidate_path = Path(item["candidate_path"])
        out_path = output_root / str(item["subject"]) / str(item["source_type"]) / candidate_path.name
        strip_tasks.append(
            {
                "subject": item["subject"],
                "source_type": item["source_type"],
                "original_pdf_path": item["original_pdf_path"],
                "candidate_path": item["candidate_path"],
                "candidate_url": item.get("candidate_url"),
                "replacement_recommendation": item.get("replacement_recommendation"),
                "candidate_page_count": item["candidate_page_count"],
                "source_manifest_path": item.get("manifest_path"),
                "non_clean_pages": item["non_clean_pages"],
                "out_path": str(out_path.resolve()),
            }
        )

    stripped_entries = []
    with ProcessPoolExecutor(max_workers=max(1, min(args.max_workers, 5))) as executor:
        future_map = {executor.submit(strip_single_pdf, task): task for task in strip_tasks}
        for future in as_completed(future_map):
            stripped_entries.append(future.result())

    scan_tasks = [
        {
            **entry,
            "evidence_root": str(evidence_root.resolve()),
            "dpi": args.dpi,
        }
        for entry in stripped_entries
    ]

    final_entries = []
    with ProcessPoolExecutor(max_workers=max(1, min(args.max_workers, 5))) as executor:
        future_map = {executor.submit(scan_cleaned_pdf, task): task for task in scan_tasks}
        for future in as_completed(future_map):
            final_entries.append(future.result())

    final_entries = sorted(final_entries, key=lambda item: (item["subject"], item["cleaned_pdf_path"]))
    summary = {
        "target_pdf_count": len(footer_targets),
        "stripped_pdf_count": len(final_entries),
        "rule_scan_clean_count": sum(1 for item in final_entries if item["rule_scan"]["status"] == "clean"),
        "rule_scan_non_clean_count": sum(1 for item in final_entries if item["rule_scan"]["status"] != "clean"),
    }

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_vlm_audit": str(vlm_audit_path.resolve()),
        "output_root": str(output_root.resolve()),
        "evidence_root": str(evidence_root.resolve()),
        "summary": summary,
        "entries": final_entries,
    }
    out_json.write_text(json_dumps(payload), encoding="utf-8")
    build_markdown(out_md, payload)
    print(json_dumps(summary))
    print(f"out_json={out_json.resolve()}")
    print(f"out_md={out_md.resolve()}")


if __name__ == "__main__":
    main()
