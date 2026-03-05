import argparse
import json
import re
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageChops


def extract_lines(page):
    data = page.get_text("dict")
    lines = []
    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            text = "".join(span.get("text", "") for span in spans).strip()
            if not text:
                continue
            x0 = min(span["bbox"][0] for span in spans)
            y0 = min(span["bbox"][1] for span in spans)
            x1 = max(span["bbox"][2] for span in spans)
            y1 = max(span["bbox"][3] for span in spans)
            lines.append(
                {
                    "text": text,
                    "x0": x0,
                    "y0": y0,
                    "x1": x1,
                    "y1": y1,
                }
            )
    return lines


def kmeans_1d(values, iterations=25):
    if not values:
        return [], [], None, None
    c1 = min(values)
    c2 = max(values)
    if c1 == c2:
        return values, [], c1, None
    for _ in range(iterations):
        cluster1 = []
        cluster2 = []
        for v in values:
            if abs(v - c1) <= abs(v - c2):
                cluster1.append(v)
            else:
                cluster2.append(v)
        if not cluster1 or not cluster2:
            break
        new_c1 = sum(cluster1) / len(cluster1)
        new_c2 = sum(cluster2) / len(cluster2)
        if abs(new_c1 - c1) < 0.01 and abs(new_c2 - c2) < 0.01:
            c1, c2 = new_c1, new_c2
            break
        c1, c2 = new_c1, new_c2
    return cluster1, cluster2, c1, c2


def infer_question_x_threshold(doc, max_q):
    x_values = []
    for page in doc:
        for line in extract_lines(page):
            m = re.match(r"^(\d{1,2})\b", line["text"])
            if not m:
                continue
            num = int(m.group(1))
            if 1 <= num <= max_q:
                x_values.append(line["x0"])
    if not x_values:
        return doc[0].rect.width * 0.2

    x_values.sort()
    n = len(x_values)
    if n < 6:
        return min(x_values) + 20

    # Find the largest gap in x positions and use it as a separator between
    # the left margin question numbers and other stray numbers.
    max_gap = 0
    max_idx = 0
    for i in range(n - 1):
        gap = x_values[i + 1] - x_values[i]
        if gap > max_gap:
            max_gap = gap
            max_idx = i

    if max_gap > 0:
        threshold = (x_values[max_idx] + x_values[max_idx + 1]) / 2
    else:
        threshold = x_values[int(0.2 * n)]

    # Safety: keep threshold in a reasonable left-margin band.
    page_width = doc[0].rect.width
    max_allowed = page_width * 0.4
    return min(threshold, max_allowed)


def find_question_anchors(doc, max_q, x_threshold):
    anchors = []
    baseline_x = estimate_left_margin(doc, max_q)
    max_offset = 18
    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        for line in extract_lines(page):
            m = re.match(r"^(\d{1,2})\b", line["text"])
            if not m:
                continue
            num = int(m.group(1))
            if not (1 <= num <= max_q):
                continue
            if line["x0"] <= x_threshold:
                if baseline_x is not None and abs(line["x0"] - baseline_x) > max_offset:
                    continue
                anchors.append(
                    {
                        "num": num,
                        "page": page_index,
                        "y0": line["y0"],
                        "y1": line["y1"],
                        "x0": line["x0"],
                        "x1": line["x1"],
                        "text": line["text"],
                    }
                )

    anchors.sort(key=lambda a: (a["page"], a["y0"]))

    # Build ordered anchors by expected question number to avoid stray numbers.
    ordered = []
    cursor_page = -1
    cursor_y = -1.0
    for num in range(1, max_q + 1):
        candidates = [
            a
            for a in anchors
            if a["num"] == num
            and (a["page"] > cursor_page or (a["page"] == cursor_page and a["y0"] > cursor_y))
        ]
        if not candidates:
            continue
        anchor = candidates[0]
        ordered.append(anchor)
        cursor_page = anchor["page"]
        cursor_y = anchor["y0"]

    return ordered


def estimate_left_margin(doc, max_q):
    xs = []
    for page in doc:
        for line in extract_lines(page):
            m = re.match(r"^(\d{1,2})\b", line["text"])
            if not m:
                continue
            num = int(m.group(1))
            if 1 <= num <= max_q:
                xs.append(line["x0"])
    if not xs:
        return None
    xs.sort()
    return xs[0]


def trim_whitespace(img, padding=8, threshold=10):
    white_bg = Image.new("RGB", img.size, "white")
    diff = ImageChops.difference(img, white_bg).convert("L")
    bw = diff.point(lambda p: 255 if p > threshold else 0)
    bbox = bw.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(img.width, x1 + padding)
    y1 = min(img.height, y1 + padding)
    return img.crop((x0, y0, x1, y1))


def render_segment(page, rect, scale):
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, clip=rect, alpha=False)
    mode = "RGB"
    img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
    return img


def stack_images(images):
    if not images:
        return None
    max_w = max(img.width for img in images)
    total_h = sum(img.height for img in images)
    out = Image.new("RGB", (max_w, total_h), "white")
    y = 0
    for img in images:
        out.paste(img, (0, y))
        y += img.height
    return out


def build_question_segments(doc, anchors, index, top_pad=2, bottom_pad=2):
    anchor = anchors[index]
    page_index = anchor["page"]
    page = doc.load_page(page_index)
    page_rect = page.rect
    top_y = max(0, anchor["y0"] - top_pad)
    segments = []

    header_bottom, footer_top = detect_content_bounds(page)
    top_y = max(adjust_top_y(page, anchor, top_y), header_bottom)

    if index + 1 < len(anchors):
        next_anchor = anchors[index + 1]
        if next_anchor["page"] == page_index:
            bottom_y = max(top_y, next_anchor["y0"] - bottom_pad)
            bottom_y = min(bottom_y, footer_top)
            segments.append(
                (page_index, fitz.Rect(0, top_y, page_rect.width, bottom_y))
            )
            return segments

        # Current page tail
        bottom_y = footer_top
        segments.append((page_index, fitz.Rect(0, top_y, page_rect.width, bottom_y)))

        # Intermediate full pages
        for p in range(page_index + 1, next_anchor["page"]):
            inter_page = doc.load_page(p)
            rect = inter_page.rect
            inter_header, inter_footer = detect_content_bounds(inter_page)
            if page_has_body_text(inter_page, inter_header, inter_footer):
                segments.append((p, fitz.Rect(0, inter_header, rect.width, inter_footer)))

        # Next page head
        next_page = doc.load_page(next_anchor["page"])
        next_page_rect = next_page.rect
        next_header, _ = detect_content_bounds(next_page)
        bottom_y = max(0, next_anchor["y0"] - bottom_pad)
        segments.append(
            (next_anchor["page"], fitz.Rect(0, next_header, next_page_rect.width, bottom_y))
        )
        return segments

    # Last question: take remainder of pages
    segments.append((page_index, fitz.Rect(0, top_y, page_rect.width, footer_top)))
    for p in range(page_index + 1, doc.page_count):
        tail_page = doc.load_page(p)
        rect = tail_page.rect
        tail_header, tail_footer = detect_content_bounds(tail_page)
        if page_has_body_text(tail_page, tail_header, tail_footer):
            segments.append((p, fitz.Rect(0, tail_header, rect.width, tail_footer)))
    return segments


def adjust_top_y(page, anchor, fallback_top):
    # Include any line that shares the same baseline as the question number.
    anchor_y0 = anchor["y0"]
    anchor_y1 = anchor["y1"]
    min_y0 = None
    for line in extract_lines(page):
        if line["y0"] <= anchor_y1 + 1 and line["y1"] >= anchor_y0 - 1:
            if min_y0 is None or line["y0"] < min_y0:
                min_y0 = line["y0"]
    if min_y0 is None:
        return fallback_top
    return min_y0


def detect_content_bounds(page):
    h = page.rect.height
    w = page.rect.width
    header_limit = h * 0.08
    footer_limit = h * 0.85
    header_bottom = 0.0
    footer_top = h

    for line in extract_lines(page):
        text = line["text"].strip()
        if not text:
            continue
        if line["y0"] < header_limit:
            if "/" in text:
                header_bottom = max(header_bottom, line["y1"])
            elif re.fullmatch(r"\d{1,2}", text) and line["x0"] > w * 0.3:
                header_bottom = max(header_bottom, line["y1"])
        if line["y0"] > footer_limit:
            if (
                "UCLES" in text
                or "Cambridge" in text
                or "BLANK PAGE" in text
                or "Page" in text
                or "page" in text
                or "/" in text
                or (re.fullmatch(r"\d{1,2}", text) and line["x0"] > w * 0.3)
            ):
                footer_top = min(footer_top, line["y0"])

    return header_bottom, footer_top


def page_has_body_text(page, header_bottom, footer_top):
    for line in extract_lines(page):
        text = line["text"].strip()
        if not text:
            continue
        if "BLANK PAGE" in text:
            continue
        if line["y0"] <= header_bottom + 2:
            continue
        if line["y1"] >= footer_top - 2:
            continue
        # Ignore lone page numbers in body regions.
        if re.fullmatch(r"\d{1,2}", text):
            continue
        return True
    return False


def main():
    parser = argparse.ArgumentParser(description="MCQ question screenshot generator")
    parser.add_argument("--pdf", required=True, help="Path to PDF")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--dpi", type=int, default=400, help="Output DPI (default: 400)")
    parser.add_argument("--max-q", type=int, default=40, help="Max question number (default: 40)")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    scale = args.dpi / 72.0

    x_threshold = infer_question_x_threshold(doc, args.max_q)
    anchors = find_question_anchors(doc, args.max_q, x_threshold)

    log = {
        "pdf": str(pdf_path),
        "dpi": args.dpi,
        "scale": scale,
        "page_count": doc.page_count,
        "x_threshold": x_threshold,
        "anchors_detected": len(anchors),
        "anchors": anchors,
        "outputs": [],
    }

    for idx, anchor in enumerate(anchors):
        q_num = anchor["num"]
        segments = build_question_segments(doc, anchors, idx)
        images = []
        for page_index, rect in segments:
            page = doc.load_page(page_index)
            images.append(render_segment(page, rect, scale))
        merged = stack_images(images)
        if merged is None:
            continue
        trimmed = trim_whitespace(merged, padding=8, threshold=12)

        out_name = f"q{q_num:02d}.png"
        out_path = out_dir / out_name
        trimmed.save(out_path, format="PNG", optimize=False)
        log["outputs"].append({"question": q_num, "file": str(out_path)})

    log_path = out_dir / "screenshot_log.json"
    log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
