from __future__ import annotations

import difflib
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import cv2
import fitz
import numpy as np
from PIL import Image

from batch_ms_screenshots import quick_qc
from structured_screenshot import extract_lines


SCAN_SCHEMA_VERSION = 4
OFFICIAL_DOMAINS = {
    "cambridgeinternational.org",
    "cambridge.org",
    "cie.org.uk",
    "cie.org",
    "ucles.org",
    "ucles.org.uk",
    "cle.org",
    "cle.org.uk",
}
OFFICIAL_MARKERS = (
    "cambridge assessment international education",
    "cambridge international examinations",
    "cambridge international education",
    "cambridge international as & a level",
    "cambridge international as and a level",
    "cambridge international",
    "ucles",
    "cambridgeassessment.org.uk",
    "cambridgeinternational.org",
)
SUSPICIOUS_BRANDS = {
    "papacambridge": "papacambridge",
    "papa cambridge": "papacambridge",
    "gceguide": "gceguide",
    "gce guide": "gceguide",
    "xtremepapers": "xtremepapers",
    "xtreme papers": "xtremepapers",
    "dynamicpapers": "dynamicpapers",
    "dynamic papers": "dynamicpapers",
    "exam-mate": "exam-mate",
    "exam mate": "exam-mate",
    "bestexamhelp": "bestexamhelp",
    "best exam help": "bestexamhelp",
    "znotes": "znotes",
    "save my exams": "savemyexams",
    "savemyexams": "savemyexams",
    "scribd": "scribd",
    "studylib": "studylib",
    "telegram": "telegram",
    "youtube": "youtube",
    "bilibili": "bilibili",
    "xiaohongshu": "xiaohongshu",
}
WECHAT_OR_QQ_PATTERNS = (
    re.compile(r"\bwechat\b", re.I),
    re.compile(r"微信"),
    re.compile(r"公众号"),
    re.compile(r"微信号"),
    re.compile(r"QQ群"),
    re.compile(r"qq群", re.I),
    re.compile(r"q群", re.I),
    re.compile(r"\bqq\s*[:：-]?\s*\d{5,}\b", re.I),
    re.compile(r"\bvx\s*[:：-]?\s*[A-Za-z0-9_-]{5,}\b", re.I),
    re.compile(r"\bwx\s*[:：-]?\s*[A-Za-z0-9_-]{5,}\b", re.I),
)
DOMAIN_RE = re.compile(
    r"(?:(?:https?://)|(?:www\.))?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|org|net|cn|cc|co|info|me|tv|io|edu|uk)\b(?:/[^\s<>()\]]*)?",
    re.I,
)
PAGE_FILE_RE = re.compile(r"page_(\d{3})\.(?:jpg|png)$", re.I)
_QR_DETECTOR = cv2.QRCodeDetector()
_OCR_READER = None


def parse_pdf_identity(pdf_path: Path, source_type: str, subject: str) -> dict[str, Any]:
    stem = pdf_path.stem
    match = re.match(
        r"^(?P<subject>\d{4})_(?P<session>[msw])(?P<year>\d{2})_(?P<kind>qp|ms)_(?P<paper>\d{2})$",
        stem,
        re.I,
    )
    paper_id = stem
    session = None
    year = None
    paper_number = None
    if match:
        session = match.group("session").lower()
        year = 2000 + int(match.group("year"))
        paper_number = int(match.group("paper"))
        paper_id = f"{match.group('subject')}_{session}{match.group('year')}_{match.group('paper')}"

    return {
        "pdf_path": str(pdf_path.resolve()),
        "source_type": source_type,
        "subject": subject,
        "paper_id": paper_id,
        "stem": stem,
        "session": session,
        "year": year,
        "paper_number": paper_number,
    }


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def render_page_image(page: fitz.Page, dpi: int) -> Image.Image:
    scale = dpi / 72.0
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def save_page_image(image: Image.Image, out_path: Path) -> None:
    ensure_dir(out_path.parent)
    image.save(out_path, format="JPEG", quality=88, optimize=True)


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def count_official_markers(*texts: str) -> int:
    corpus = "\n".join(texts).lower()
    return sum(1 for marker in OFFICIAL_MARKERS if marker in corpus)


def extract_domains(*texts: str) -> list[str]:
    domains = []
    seen = set()
    corpus = "\n".join(texts)
    for match in DOMAIN_RE.finditer(corpus):
        token = match.group(0).strip(".,;:)]}>")
        if not re.search(r"[A-Za-z]", token):
            continue
        cleaned = re.sub(r"^https?://", "", token, flags=re.I)
        cleaned = re.sub(r"^www\.", "", cleaned, flags=re.I)
        cleaned = cleaned.lower()
        host = cleaned.split("/", 1)[0]
        normalized_host = host.replace("wnw.", "www.").replace("vvv.", "www.")
        base_host = normalized_host[4:] if normalized_host.startswith("www.") else normalized_host
        compact_www_host = base_host[3:] if base_host.startswith("www") and len(base_host) > 3 else None
        substantive_labels = [
            label
            for label in re.split(r"\.", base_host)
            if label and label not in {"www", "org", "com", "net", "cn", "uk", "co"}
        ]
        if any(base_host == domain or base_host.endswith(f".{domain}") for domain in OFFICIAL_DOMAINS):
            continue
        if compact_www_host and any(
            compact_www_host == domain or compact_www_host.endswith(f".{domain}") for domain in OFFICIAL_DOMAINS
        ):
            continue
        if any(difflib.SequenceMatcher(None, base_host, domain).ratio() >= 0.9 for domain in OFFICIAL_DOMAINS):
            continue
        if base_host in {"org.uk", "co.uk", "com.cn", "net.cn", "org.cn"}:
            continue
        if not substantive_labels or max(len(label) for label in substantive_labels) < 4:
            continue
        if cleaned in seen:
            continue
        seen.add(cleaned)
        domains.append(cleaned)
    return domains


def extract_brand_hits(*texts: str) -> list[str]:
    corpus = "\n".join(texts).lower()
    hits = []
    seen = set()
    for raw, normalized in SUSPICIOUS_BRANDS.items():
        if raw in corpus and normalized not in seen:
            seen.add(normalized)
            hits.append(normalized)
    return hits


def extract_wechat_or_qq_hits(*texts: str) -> list[str]:
    corpus = "\n".join(texts)
    hits = []
    seen = set()
    for pattern in WECHAT_OR_QQ_PATTERNS:
        if pattern.search(corpus):
            token = pattern.pattern
            if token not in seen:
                seen.add(token)
                hits.append(pattern.pattern)
    return hits


def maybe_get_ocr_reader():
    global _OCR_READER
    if _OCR_READER is None:
        import easyocr

        _OCR_READER = easyocr.Reader(["en", "ch_sim"], gpu=False)
    return _OCR_READER


def run_ocr(image: Image.Image) -> tuple[str, str | None]:
    try:
        reader = maybe_get_ocr_reader()
        ocr_image = image.copy()
        ocr_image.thumbnail((1200, 1600))
        result = reader.readtext(np.array(ocr_image), detail=0, paragraph=True)
        text = " ".join(str(item) for item in result)
        return normalize_text(text), None
    except Exception as exc:  # pragma: no cover - exercised in integration run
        return "", str(exc)


def is_benign_qr_error(error: str | None) -> bool:
    if not error:
        return False
    lowered = error.lower()
    benign_markers = [
        "invalid qr code source points",
        "contourarea(src_points) > 0.0",
        "cv::convexhull",
        "total >= 0 && (depth == cv_32f || depth == cv_32s)",
    ]
    return any(marker in lowered for marker in benign_markers)


def detect_qr(image: Image.Image) -> tuple[list[str], str | None]:
    array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    payloads = []
    errors = []
    try:
        ok, decoded_info, points, _ = _QR_DETECTOR.detectAndDecodeMulti(array)
        if ok and decoded_info:
            payloads.extend([item.strip() for item in decoded_info if item and item.strip()])
    except Exception as exc:  # pragma: no cover - exercised in integration run
        if not is_benign_qr_error(str(exc)):
            errors.append(str(exc))
    try:
        if not payloads:
            single_data, single_points, _ = _QR_DETECTOR.detectAndDecode(array)
            if single_data and single_data.strip():
                payloads.append(single_data.strip())
    except Exception as exc:  # pragma: no cover - exercised in integration run
        if not is_benign_qr_error(str(exc)):
            errors.append(str(exc))
    return payloads, " | ".join(errors) if errors else None


def should_run_ocr(
    page_number: int,
    page_count: int,
    embedded_text: str,
    line_count: int,
    image_count: int,
    qr_payloads: list[str],
) -> bool:
    midpoint = max(1, (page_count + 1) // 2)
    boundary_pages = {1, page_count}
    if page_number in boundary_pages or page_number == midpoint:
        return True
    if qr_payloads:
        return True
    text_len = len(normalize_text(embedded_text))
    if text_len < 80:
        return True
    if text_len < 180 and image_count > 0:
        return True
    if line_count < 6 and image_count > 0:
        return True
    return False


def add_issue(
    page_result: dict[str, Any],
    issue_type: str,
    reason: str,
    confidence: float,
    evidence: dict[str, Any] | None = None,
) -> None:
    existing = page_result["issue_records"]
    if any(item["issue_type"] == issue_type and item["reason"] == reason for item in existing):
        return
    page_result["issue_records"].append(
        {
            "issue_type": issue_type,
            "reason": reason,
            "confidence": round(confidence, 2),
            "evidence": evidence or {},
        }
    )


def finalize_page_issues(page_result: dict[str, Any]) -> None:
    records = sorted(
        page_result["issue_records"],
        key=lambda item: (-item["confidence"], item["issue_type"], item["reason"]),
    )
    page_result["issue_records"] = records
    page_result["issue_types"] = [item["issue_type"] for item in records]
    page_result["max_issue_confidence"] = max(
        (item["confidence"] for item in records),
        default=0.0,
    )


def confidence_band(score: float) -> str:
    if score >= 0.9:
        return "high"
    if score >= 0.65:
        return "medium"
    if score > 0:
        return "low"
    return "none"


def analyze_single_pdf(
    pdf_path: Path,
    source_type: str,
    subject: str,
    evidence_root: Path,
    dpi: int,
) -> dict[str, Any]:
    meta = parse_pdf_identity(pdf_path, source_type, subject)
    pdf_dir = evidence_root / source_type / meta["stem"]
    pages_dir = pdf_dir / "pages"
    ensure_dir(pages_dir)

    result: dict[str, Any] = {
        "schema_version": SCAN_SCHEMA_VERSION,
        **meta,
        "status": "clean",
        "issue_types": [],
        "flagged_pages": [],
        "screenshot_paths": [],
        "notes": [],
        "detection_confidence": 0.0,
        "confidence_band": "none",
        "page_count": 0,
        "contact_sheet_path": None,
        "evidence_index_path": None,
        "qc_summary_path": None,
    }

    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:
        result["status"] = "failed"
        result["issue_types"] = ["render_failed"]
        result["notes"].append(f"Failed to open PDF: {exc}")
        result["detection_confidence"] = 1.0
        result["confidence_band"] = "high"
        return result

    page_results: list[dict[str, Any]] = []
    qc_summary: dict[str, Any] = {}
    page_count = doc.page_count
    result["page_count"] = page_count

    for page_index in range(page_count):
        page_number = page_index + 1
        page = doc.load_page(page_index)
        page_output_path = pages_dir / f"page_{page_number:03d}.jpg"
        page_result: dict[str, Any] = {
            "page_number": page_number,
            "screenshot_path": str(page_output_path.resolve()),
            "issue_records": [],
            "issue_types": [],
            "max_issue_confidence": 0.0,
            "embedded_text": "",
            "ocr_text": "",
            "domains": [],
            "brand_hits": [],
            "wechat_or_qq_hits": [],
            "qr_payloads": [],
            "official_marker_count": 0,
            "line_count": 0,
            "image_count": 0,
            "embedded_text_len": 0,
            "ocr_text_len": 0,
        }
        try:
            image = render_page_image(page, dpi)
            save_page_image(image, page_output_path)
            qc_summary[page_output_path.name] = quick_qc(page_output_path)
        except Exception as exc:
            add_issue(
                page_result,
                "render_failed",
                f"Page render failed: {exc}",
                1.0,
            )
            finalize_page_issues(page_result)
            page_results.append(page_result)
            result["screenshot_paths"].append(
                {
                    "page_number": page_number,
                    "path": str(page_output_path.resolve()),
                }
            )
            continue

        lines = extract_lines(page)
        embedded_text = normalize_text(page.get_text())
        qr_payloads, qr_error = detect_qr(image)
        if qr_error:
            add_issue(
                page_result,
                "ocr_or_detection_failed",
                f"QR detection failed: {qr_error}",
                0.9,
            )

        page_result["embedded_text"] = embedded_text
        page_result["embedded_text_len"] = len(embedded_text)
        page_result["line_count"] = len(lines)
        page_result["image_count"] = len(page.get_images(full=True))
        page_result["qr_payloads"] = qr_payloads

        ocr_text = ""
        ocr_error = None
        if should_run_ocr(
            page_number,
            page_count,
            embedded_text,
            page_result["line_count"],
            page_result["image_count"],
            qr_payloads,
        ):
            ocr_text, ocr_error = run_ocr(image)
            page_result["ocr_text"] = ocr_text
            page_result["ocr_text_len"] = len(ocr_text)
            if ocr_error:
                add_issue(
                    page_result,
                    "ocr_or_detection_failed",
                    f"OCR failed: {ocr_error}",
                    0.85,
                )

        combined_text = "\n".join(part for part in (embedded_text, ocr_text) if part)
        page_result["official_marker_count"] = count_official_markers(embedded_text, ocr_text)
        page_result["domains"] = extract_domains(embedded_text, ocr_text)
        page_result["brand_hits"] = extract_brand_hits(embedded_text, ocr_text)
        page_result["wechat_or_qq_hits"] = extract_wechat_or_qq_hits(embedded_text, ocr_text)

        if qr_payloads:
            add_issue(
                page_result,
                "qr_code_detected",
                f"QR code detected on page {page_number}",
                0.98,
                {"payloads": qr_payloads},
            )
        if page_result["domains"]:
            add_issue(
                page_result,
                "url_or_domain_detected",
                f"Non-official domain or URL detected: {', '.join(page_result['domains'])}",
                0.92,
                {"domains": page_result["domains"]},
            )
        if page_result["wechat_or_qq_hits"]:
            add_issue(
                page_result,
                "wechat_or_qq_detected",
                f"WeChat/QQ marker detected on page {page_number}",
                0.96,
                {"markers": page_result["wechat_or_qq_hits"]},
            )
        if page_result["brand_hits"]:
            add_issue(
                page_result,
                "non_cie_branding_detected",
                f"Third-party branding detected: {', '.join(page_result['brand_hits'])}",
                0.97,
                {"brands": page_result["brand_hits"]},
            )

        is_cover_or_tail = page_number in (1, page_count)
        low_text_page = len(combined_text) < 120
        low_official_confidence = page_result["official_marker_count"] == 0
        sparse_page = page_result["line_count"] < 8
        image_heavy_page = page_result["image_count"] > 0
        if is_cover_or_tail and (
            page_result["qr_payloads"]
            or page_result["domains"]
            or page_result["brand_hits"]
            or page_result["wechat_or_qq_hits"]
            or (low_official_confidence and low_text_page and (sparse_page or image_heavy_page))
        ):
            add_issue(
                page_result,
                "suspicious_cover_or_tail_page",
                (
                    "Cover/tail page looks non-standard or contains suspicious overlays"
                    if page_result["issue_records"]
                    else "Cover/tail page lacks official markers and has sparse visual structure"
                ),
                0.72 if not page_result["issue_records"] else 0.88,
                {
                    "official_marker_count": page_result["official_marker_count"],
                    "line_count": page_result["line_count"],
                    "image_count": page_result["image_count"],
                },
            )

        finalize_page_issues(page_result)
        page_results.append(page_result)
        result["screenshot_paths"].append(
            {
                "page_number": page_number,
                "path": str(page_output_path.resolve()),
            }
        )

    watermark_hits = infer_watermark_or_overlay_hits(page_results, page_count)
    page_lookup = {page["page_number"]: page for page in page_results}
    for page_number, reasons in watermark_hits.items():
        page_result = page_lookup[page_number]
        for reason, confidence, evidence in reasons:
            add_issue(
                page_result,
                "suspicious_watermark_or_overlay",
                reason,
                confidence,
                evidence,
            )
        finalize_page_issues(page_result)

    qc_path = pdf_dir / "qc_summary.json"
    qc_path.write_text(json_dumps(qc_summary), encoding="utf-8")
    result["qc_summary_path"] = str(qc_path.resolve())

    result["flagged_pages"] = [
        {
            "page_number": page["page_number"],
            "issue_types": page["issue_types"],
            "reason": "; ".join(item["reason"] for item in page["issue_records"]),
            "screenshot_path": page["screenshot_path"],
            "detection_confidence": page["max_issue_confidence"],
            "confidence_band": confidence_band(page["max_issue_confidence"]),
            "evidence": [item["evidence"] for item in page["issue_records"] if item["evidence"]],
        }
        for page in page_results
        if page["issue_types"]
    ]

    issue_counter = Counter()
    max_confidence = 0.0
    has_render_failure = False
    has_detection_failure = False
    for page in page_results:
        if "render_failed" in page["issue_types"]:
            has_render_failure = True
        if "ocr_or_detection_failed" in page["issue_types"]:
            has_detection_failure = True
        issue_counter.update(page["issue_types"])
        max_confidence = max(max_confidence, page["max_issue_confidence"])

    result["issue_types"] = sorted(issue_counter)
    result["detection_confidence"] = round(max_confidence, 2)
    result["confidence_band"] = confidence_band(max_confidence)

    if has_render_failure:
        result["status"] = "failed"
        result["notes"].append("At least one page could not be rendered.")
    elif has_detection_failure and not result["flagged_pages"]:
        result["status"] = "failed"
        result["notes"].append("Detection pipeline failed on at least one page without alternative evidence.")
    elif result["flagged_pages"]:
        result["status"] = "flagged"
    else:
        result["status"] = "clean"

    flagged_index_path = pdf_dir / "flagged_page_index.json"
    flagged_index_path.write_text(
        json_dumps(
            {
                "pdf_path": result["pdf_path"],
                "status": result["status"],
                "flagged_pages": result["flagged_pages"],
            }
        ),
        encoding="utf-8",
    )
    result["evidence_index_path"] = str(flagged_index_path.resolve())
    return result


def infer_watermark_or_overlay_hits(
    page_results: list[dict[str, Any]],
    page_count: int,
) -> dict[int, list[tuple[str, float, dict[str, Any]]]]:
    token_pages: dict[str, set[int]] = defaultdict(set)

    for page in page_results:
        page_number = page["page_number"]
        for domain in page["domains"]:
            token_pages[domain].add(page_number)
        for brand in page["brand_hits"]:
            token_pages[brand].add(page_number)
        for marker in page["wechat_or_qq_hits"]:
            token_pages[marker].add(page_number)

    flagged: dict[int, list[tuple[str, float, dict[str, Any]]]] = {}
    for token, pages in token_pages.items():
        sorted_pages = sorted(pages)
        repeated = len(sorted_pages) >= 2
        middle_pages = [p for p in sorted_pages if p not in (1, page_count)]
        for page in page_results:
            if page["page_number"] not in pages:
                continue
            overlay_like = repeated
            ocr_only = page["page_number"] not in (1, page_count) and (
                token in extract_domains(page["ocr_text"]) or token in extract_brand_hits(page["ocr_text"])
            )
            if not overlay_like and not ocr_only:
                continue
            reason = (
                f"Suspicious token '{token}' repeats across pages {sorted_pages}, suggesting watermark or overlay"
                if overlay_like
                else f"Suspicious token '{token}' appears only in OCR output on a content page"
            )
            confidence = 0.94 if middle_pages else 0.82
            flagged.setdefault(page["page_number"], []).append(
                (
                    reason,
                    confidence,
                    {"token": token, "pages": sorted_pages},
                )
            )
    return flagged


def json_dumps(data: Any) -> str:
    import json

    return json.dumps(data, ensure_ascii=False, indent=2)
