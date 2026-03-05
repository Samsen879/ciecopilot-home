import argparse
import json
import re
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageChops


ROMAN_PARTS = {
    "i",
    "ii",
    "iii",
    "iv",
    "v",
    "vi",
    "vii",
    "viii",
    "ix",
    "x",
}


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


def trim_whitespace(img, padding=16, threshold=10):
    white_bg = Image.new("RGB", img.size, "white")
    diff = ImageChops.difference(img, white_bg).convert("L")
    bw = diff.point(lambda p: 255 if p > threshold else 0)
    bbox = bw.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    if x1 <= x0 or y1 <= y0:
        return img
    y0 = max(0, y0 - padding)
    y1 = min(img.height, y1 + padding)
    if y1 <= y0:
        return img
    # Always keep full width to avoid ultra-narrow strips on sparse rows.
    return img.crop((0, y0, img.width, y1))


def render_segment(page, rect, scale):
    # Transform mediabox coordinates to rotated page.rect coordinates if needed
    if page.rotation:
        rect = rect * page.rotation_matrix
        rect = rect & page.rect
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, clip=rect, alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
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


def detect_content_bounds(page):
    # Use mediabox for coordinate calculations since extract_lines returns mediabox coords
    mbox = page.mediabox
    h = mbox.height
    w = mbox.width
    header_limit = h * 0.08
    footer_limit = h * 0.9
    header_bottom = 0.0
    footer_top = h

    for line in extract_lines(page):
        text = line["text"].strip()
        if not text:
            continue
        if line["y0"] < header_limit:
            if "/" in text:
                header_bottom = max(header_bottom, line["y1"])
            elif re.fullmatch(r"\d{1,2}", text) and line["x0"] > w * 0.7:
                header_bottom = max(header_bottom, line["y1"])
        if line["y0"] > footer_limit:
            if (
                "UCLES" in text
                or "Cambridge" in text
                or "BLANK PAGE" in text
                or "Page" in text
                or "page" in text
                or "/" in text
                or (re.fullmatch(r"\d{1,2}", text) and line["x0"] > w * 0.7)
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
        if re.fullmatch(r"\d{1,2}", text):
            continue
        return True
    return False


def adjust_top_y(page, anchor, fallback_top):
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


def count_mark_tokens(text):
    return len(re.findall(r"\b[A-Z]{1,2}\d\b", text))


def header_token_score(page):
    tokens = set()
    for line in extract_lines(page):
        text = line["text"].strip().lower()
        if text in {"question", "answer", "marks", "guidance"}:
            tokens.add(text)
    return len(tokens)


def estimate_question_row_count(page, x_limit):
    count = 0
    pattern = re.compile(r"^\d{1,2}(\([a-zivx]+\))*$", re.I)
    for line in extract_lines(page):
        if line["x0"] > x_limit:
            continue
        compact = re.sub(r"\s+", "", line["text"])
        compact = compact.replace(".", "")
        if pattern.fullmatch(compact):
            count += 1
    return count


def find_content_start_page(doc):
    for idx in range(doc.page_count):
        page = doc.load_page(idx)
        if header_token_score(page) >= 3:
            return idx, True

    for idx in range(doc.page_count):
        page = doc.load_page(idx)
        q_count = estimate_question_row_count(page, page.mediabox.width * 0.15)
        mark_count = count_mark_tokens(page.get_text())
        if q_count >= 2 and mark_count >= 2:
            return idx, False

    for idx in range(doc.page_count):
        page = doc.load_page(idx)
        q_count = estimate_question_row_count(page, page.mediabox.width * 0.15)
        if q_count >= 15:
            return idx, False

    return 0, False


def parse_question_label(text):
    compact = re.sub(r"\s+", "", text)
    compact = compact.replace(".", "")
    if not compact or not compact[0].isdigit():
        return None

    match = re.match(r"^(\d{1,2})(.*)$", compact)
    if not match:
        return None
    num = int(match.group(1))
    rest = match.group(2)

    parts = []
    if rest and not rest.startswith("("):
        ch = rest[0]
        if ch.isascii() and ch.isalpha() and ch.lower() in "abcdefghijklmnopqrstuvwxyz":
            parts.append(ch.lower())
            rest = rest[1:]

    tokens = re.findall(r"\(([a-zivx]+)\)", rest, flags=re.I)
    parts.extend([token.lower() for token in tokens])

    cleaned = re.sub(r"\([a-zivx]+\)", "", rest, flags=re.I)
    if cleaned:
        return None

    name = f"q{num:02d}"
    if parts:
        first = parts[0]
        if first in ROMAN_PARTS:
            name = f"{name}_{first}"
        else:
            name = f"{name}{first}"
        for token in parts[1:]:
            name = f"{name}_{token}"

    return {
        "name": name,
        "num": num,
        "parts": parts,
    }


def build_row_labels(page, col_left, col_right, header_bottom, footer_top, y_tol=1.2):
    segments = []
    for line in extract_lines(page):
        if line["x0"] > col_right or line["x0"] < col_left:
            continue
        if line["y0"] <= header_bottom + 1 or line["y0"] >= footer_top - 1:
            continue
        segments.append(line)

    segments.sort(key=lambda s: (s["y0"], s["x0"]))
    rows = []
    for seg in segments:
        if not rows or abs(seg["y0"] - rows[-1]["y0"]) > y_tol:
            rows.append({"y0": seg["y0"], "segments": [seg]})
        else:
            rows[-1]["segments"].append(seg)

    labels = []
    last_question_text = None
    for row in rows:
        current = None
        current_x1 = None
        row_y1 = max(seg["y1"] for seg in row["segments"])
        for seg in sorted(row["segments"], key=lambda s: s["x0"]):
            text = seg["text"].strip()
            if not text:
                continue
            if text[0].isdigit():
                if current:
                    break
                current = text
                current_x0 = seg["x0"]
                current_x1 = seg["x1"]
                num_match = re.match(r"^\d{1,2}", text)
                if num_match:
                    last_question_text = num_match.group(0)
            elif text.startswith("(") and current:
                compact = re.sub(r"\s+", "", text)
                if re.fullmatch(r"(\([a-zivx]+\))+", compact, re.I):
                    current = f"{current} {compact}"
                    current_x1 = max(current_x1, seg["x1"])
            elif text.startswith("(") and last_question_text and not current:
                compact = re.sub(r"\s+", "", text)
                if re.fullmatch(r"(\([a-zivx]+\))+", compact, re.I):
                    current = f"{last_question_text} {compact}"
                    current_x0 = seg["x0"]
                    current_x1 = seg["x1"]
            else:
                if current:
                    break
                continue
        if current and parse_question_label(current):
            labels.append(
                {
                    "text": current,
                    "x0": current_x0,
                    "x1": current_x1,
                    "y0": row["y0"],
                    "y1": row_y1,
                }
            )

    return labels


def infer_question_column(page):
    header_bottom, footer_top = detect_content_bounds(page)
    labels = build_row_labels(
        page, 0, page.mediabox.width * 0.25, header_bottom, footer_top
    )
    subpart_xs = []
    digit_xs = []
    for label in labels:
        parsed = parse_question_label(label["text"])
        if not parsed:
            continue
        if parsed["parts"]:
            subpart_xs.append(label["x0"])
        else:
            digit_xs.append(label["x0"])

    if subpart_xs:
        col_right = max(subpart_xs) + 12
    elif digit_xs:
        baseline = min(digit_xs)
        col_right = baseline + min(page.mediabox.width * 0.1, 60)
    else:
        col_right = page.mediabox.width * 0.18

    return min(col_right, page.mediabox.width * 0.4)


def infer_question_columns(page):
    header_bottom, footer_top = detect_content_bounds(page)
    # Prefer explicit "Question" header column(s) if present.
    header_columns = []
    header_lines = []
    for line in extract_lines(page):
        text = line["text"].strip().lower()
        if text not in {"question", "answer"}:
            continue
        if line["y0"] <= header_bottom + 1 or line["y0"] >= footer_top - 1:
            continue
        header_lines.append({**line, "text": text})
    if header_lines:
        questions = sorted([h for h in header_lines if h["text"] == "question"], key=lambda h: h["x0"])
        answers = [h for h in header_lines if h["text"] == "answer"]
        for i, q in enumerate(questions):
            left = max(0, q["x0"] - 6)
            right = None
            # Find answer with same x position (for table layouts)
            same_x_answers = [a for a in answers if abs(a["x0"] - q["x0"]) < 10]
            if same_x_answers:
                # Table layout: question and answer in same column
                if i + 1 < len(questions):
                    next_q = questions[i + 1]
                    right = (q["x1"] + next_q["x0"]) / 2
                else:
                    # Last column: extend to page width * 0.6
                    right = page.mediabox.width * 0.6
            if right is None:
                # Traditional layout: answer is to the right of question
                candidates = [a for a in answers if a["x0"] > q["x0"] + 20]
                if candidates:
                    nearest = min(candidates, key=lambda a: a["x0"])
                    right = (q["x1"] + nearest["x0"]) / 2
            if right is None:
                right = min(page.mediabox.width * 0.35, q["x1"] + 24)
            # Keep the question column tight to avoid picking digits from the answer column.
            max_q_width = min(page.mediabox.width * 0.28, 160)
            right = min(right, q["x1"] + max_q_width)
            if right <= left + 10:
                right = min(page.mediabox.width * 0.35, left + 48)
            header_columns.append((left, right))
    if header_columns:
        header_columns.sort(key=lambda x: x[0])
        return header_columns

    candidates = []
    for line in extract_lines(page):
        if line["y0"] <= header_bottom + 1 or line["y0"] >= footer_top - 1:
            continue
        parsed = parse_question_label(line["text"])
        if not parsed:
            continue
        candidates.append({"x0": line["x0"], "parts": parsed["parts"]})

    if not candidates:
        width = page.mediabox.width
        return [(0, width * 0.18)]

    xs = sorted(item["x0"] for item in candidates)
    width = page.mediabox.width
    max_gap = 0
    max_idx = 0
    for i in range(len(xs) - 1):
        gap = xs[i + 1] - xs[i]
        if gap > max_gap:
            max_gap = gap
            max_idx = i

    columns = []
    if max_gap > width * 0.15:
        split = (xs[max_idx] + xs[max_idx + 1]) / 2
        column_sets = [
            [c for c in candidates if c["x0"] <= split],
            [c for c in candidates if c["x0"] > split],
        ]
    else:
        column_sets = [candidates]

    for col in column_sets:
        col_xs = [c["x0"] for c in col]
        sub_xs = [c["x0"] for c in col if c["parts"]]
        left = max(0, min(col_xs) - 6)
        right = (max(sub_xs) if sub_xs else max(col_xs)) + 12
        right = min(right, width * 0.95)
        columns.append((left, right))

    return columns


def filter_anchors(anchors, page_width, column_right=None):
    if not anchors:
        return []
    digit_margin = min(page_width * 0.05, 40)
    subpart_margin = min(page_width * 0.08, 80)
    max_num_pre = max((a["num"] for a in anchors if a["parts"]), default=0)
    num_cap = max_num_pre if max_num_pre else 20
    left_xs = sorted(
        a["x0"]
        for a in anchors
        if a["num"] > 0 and a["num"] <= num_cap
    )
    if left_xs:
        idx = max(0, int(len(left_xs) * 0.1))
        baseline_x = left_xs[idx]
    else:
        baseline_x = min(a["x0"] for a in anchors)

    col_limit = None
    if column_right is not None:
        col_limit = column_right + min(page_width * 0.02, 20)

    pos_counts = {}
    for a in anchors:
        key = (a["num"], round(a["x0"], 1), round(a["y0"], 1))
        pos_counts[key] = pos_counts.get(key, 0) + 1

    def is_left_label(anchor):
        base_margin = subpart_margin if anchor["parts"] else digit_margin
        col_left = anchor.get("col_left")
        col_right = anchor.get("col_right")
        if col_left is not None and col_right is not None:
            col_width = max(0, col_right - col_left)
            ratio = 0.9 if anchor["parts"] else 0.85
            max_margin = min(page_width * 0.35, 140)
            margin = max(base_margin, col_width * ratio)
            margin = min(margin, max_margin)
            return anchor["x0"] <= col_left + margin
        return anchor["x0"] <= baseline_x + base_margin

    nums_with_parts = {
        a["num"] for a in anchors if a["parts"] and is_left_label(a)
    }
    max_num = max(nums_with_parts, default=0)

    filtered = []
    seen = set()
    for anchor in anchors:
        name = anchor["name"]
        if name in seen:
            continue
        key = (anchor["num"], round(anchor["x0"], 1), round(anchor["y0"], 1))
        if pos_counts.get(key, 0) >= 3:
            continue
        if anchor["parts"]:
            if not is_left_label(anchor):
                continue
            if col_limit is not None and anchor["x0"] > col_limit:
                continue
            filtered.append(anchor)
            seen.add(name)
            continue
        if anchor["num"] <= 0:
            continue
        if anchor["num"] in nums_with_parts:
            continue
        if not is_left_label(anchor):
            continue
        if col_limit is not None and anchor["x0"] > col_limit:
            continue
        if max_num and anchor["num"] > max_num:
            continue
        filtered.append(anchor)
        seen.add(name)
    return filtered


def find_question_anchors(doc, start_page):
    anchors = []
    column_right = None
    page_width = None
    for page_index in range(start_page, doc.page_count):
        page = doc.load_page(page_index)
        if page_width is None:
            page_width = page.mediabox.width
        else:
            page_width = max(page_width, page.mediabox.width)
        header_bottom, footer_top = detect_content_bounds(page)
        columns = infer_question_columns(page)
        if columns:
            page_col_right = max(right for _, right in columns)
            if column_right is None or page_col_right > column_right:
                column_right = page_col_right
        for col_left, col_right in columns:
            labels = build_row_labels(page, col_left, col_right, header_bottom, footer_top)
            for label in labels:
                parsed = parse_question_label(label["text"])
                if not parsed:
                    continue
                anchors.append(
                    {
                        "name": parsed["name"],
                        "num": parsed["num"],
                        "parts": parsed["parts"],
                        "page": page_index,
                        "y0": label["y0"],
                        "y1": label["y1"],
                        "x0": label["x0"],
                        "x1": label["x1"],
                        "text": label["text"],
                        "col_left": col_left,
                        "col_right": col_right,
                    }
                )

    anchors.sort(key=lambda a: (a["page"], a["y0"], a["x0"]))
    if page_width is None:
        page_width = doc[0].mediabox.width
    anchors = filter_anchors(anchors, page_width, column_right)
    return anchors, column_right


def group_anchors_by_row(anchors, y_tol=12, doc=None):
    groups = []
    for anchor in anchors:
        # For rotated pages, group by page instead of y0
        is_rotated = False
        if doc is not None:
            page = doc.load_page(anchor["page"])
            is_rotated = page.rotation in (90, 270)
        
        if is_rotated:
            # Group all anchors on same rotated page together
            if not groups or anchor["page"] != groups[-1]["page"]:
                groups.append(
                    {
                        "page": anchor["page"],
                        "y0": anchor["y0"],
                        "y1": anchor["y1"],
                        "x0": anchor["x0"],
                        "labels": [anchor],
                    }
                )
            else:
                groups[-1]["y1"] = max(groups[-1]["y1"], anchor["y1"])
                groups[-1]["x0"] = min(groups[-1]["x0"], anchor["x0"])
                groups[-1]["labels"].append(anchor)
        else:
            # Original logic for non-rotated pages
            if (
                not groups
                or anchor["page"] != groups[-1]["page"]
                or abs(anchor["y0"] - groups[-1]["y0"]) > y_tol
            ):
                groups.append(
                    {
                        "page": anchor["page"],
                        "y0": anchor["y0"],
                        "y1": anchor["y1"],
                        "x0": anchor["x0"],
                        "labels": [anchor],
                    }
                )
            else:
                groups[-1]["y1"] = max(groups[-1]["y1"], anchor["y1"])
                groups[-1]["x0"] = min(groups[-1]["x0"], anchor["x0"])
                groups[-1]["labels"].append(anchor)
    return groups


def build_question_segments(
    doc,
    anchors,
    index,
    top_pad=2,
    bottom_pad=2,
    min_height_pts=60,
    same_page_min_span_pts=120,
):
    # Ensure anchors are in row order for slicing.
    ordered = sorted(anchors, key=lambda a: (a["page"], a["y0"], a["x0"]))
    anchor = anchors[index]
    try:
        ordered_index = ordered.index(anchor)
    except ValueError:
        ordered_index = index
    page_index = anchor["page"]
    page = doc.load_page(page_index)
    # Use mediabox for coordinates since extract_lines returns mediabox coords
    page_rect = page.mediabox
    
    # For rotated table-style PDFs, only crop current page
    is_table_style = page.rotation in (90, 270)
    
    top_y = max(0, anchor["y0"] - top_pad)
    header_bottom, footer_top = detect_content_bounds(page)
    if footer_top - top_y < min_height_pts:
        footer_top = min(page_rect.height, top_y + min_height_pts)
    top_y = max(adjust_top_y(page, anchor, top_y), header_bottom)

    segments = []

    if ordered_index + 1 < len(ordered):
        next_anchor = ordered[ordered_index + 1]
        if next_anchor["page"] == page_index:
            bottom_y = max(top_y, next_anchor["y0"] - bottom_pad)
            if bottom_y - top_y < min_height_pts:
                bottom_y = min(footer_top, top_y + min_height_pts)
            bottom_y = min(bottom_y, footer_top)
            if bottom_y <= top_y:
                return segments
            segments.append((page_index, fitz.Rect(0, top_y, page_rect.width, bottom_y)))
            return segments

        # For table-style PDFs, only include current page (full height)
        if is_table_style:
            segments.append((page_index, fitz.Rect(0, header_bottom, page_rect.width, footer_top)))
            return segments

        # For questions starting near page end, include a minimum span on this page.
        bottom_y = footer_top
        if bottom_y - top_y < same_page_min_span_pts:
            bottom_y = min(page_rect.height, top_y + same_page_min_span_pts)
        segments.append((page_index, fitz.Rect(0, top_y, page_rect.width, bottom_y)))

        for p in range(page_index + 1, next_anchor["page"]):
            inter_page = doc.load_page(p)
            inter_mbox = inter_page.mediabox
            inter_header, inter_footer = detect_content_bounds(inter_page)
            if page_has_body_text(inter_page, inter_header, inter_footer):
                segments.append((p, fitz.Rect(0, inter_header, inter_mbox.width, inter_footer)))

        next_page = doc.load_page(next_anchor["page"])
        next_mbox = next_page.mediabox
        next_header, _ = detect_content_bounds(next_page)
        bottom_y = max(0, next_anchor["y0"] - bottom_pad)
        segments.append(
            (next_anchor["page"], fitz.Rect(0, next_header, next_mbox.width, bottom_y))
        )
        return segments

    segments.append((page_index, fitz.Rect(0, top_y, page_rect.width, footer_top)))
    for p in range(page_index + 1, doc.page_count):
        tail_page = doc.load_page(p)
        tail_mbox = tail_page.mediabox
        tail_header, tail_footer = detect_content_bounds(tail_page)
        if page_has_body_text(tail_page, tail_header, tail_footer):
            segments.append((p, fitz.Rect(0, tail_header, tail_mbox.width, tail_footer)))
    return segments
    return segments


def main():
    parser = argparse.ArgumentParser(description="Mark Scheme question screenshot generator")
    parser.add_argument("--pdf", required=True, help="Path to MS PDF")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--dpi", type=int, default=400, help="Output DPI (default: 400)")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    scale = args.dpi / 72.0

    is_grade_threshold = pdf_path.stem.lower().endswith("_gt")
    start_page, header_found = find_content_start_page(doc)
    anchors, column_right = find_question_anchors(doc, start_page)
    anchor_groups = group_anchors_by_row(anchors, doc=doc)

    log = {
        "pdf": str(pdf_path),
        "dpi": args.dpi,
        "scale": scale,
        "page_count": doc.page_count,
        "start_page": start_page,
        "header_found": header_found,
        "column_right": column_right,
        "anchors_detected": len(anchors),
        "anchors": anchors,
        "anchor_groups": [
            {
                "page": group["page"],
                "y0": group["y0"],
                "y1": group["y1"],
                "labels": [label["name"] for label in group["labels"]],
            }
            for group in anchor_groups
        ],
        "outputs": [],
    }

    if is_grade_threshold:
        log["start_page"] = 0
        log["anchors_detected"] = 0
        log["anchors"] = []
        log["anchor_groups"] = []
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)
            rect = page.rect
            img = render_segment(page, rect, scale)
            trimmed = trim_whitespace(img, padding=16, threshold=10)
            out_name = f"q{page_index+1:02d}.png"
            out_path = out_dir / out_name
            trimmed.save(out_path, format="PNG", optimize=False)
            log["outputs"].append({"question": out_name.replace(".png", ""), "file": str(out_path)})
        log_path = out_dir / "screenshot_log.json"
        log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
        return

    if not anchor_groups:
        log_path = out_dir / "screenshot_log.json"
        log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
        return

    for idx, anchor in enumerate(anchor_groups):
        segments = build_question_segments(doc, anchor_groups, idx)
        images = []
        for page_index, rect in segments:
            page = doc.load_page(page_index)
            images.append(render_segment(page, rect, scale))
        merged = stack_images(images)
        if merged is None:
            continue

        labels = anchor["labels"]
        # All labels in same row share the same screenshot
        trimmed = trim_whitespace(merged, padding=16, threshold=10)
        min_output_px = max(120, int(scale * 24))
        if trimmed.width < min_output_px or trimmed.height < min_output_px:
            trimmed = merged
        for label in labels:
            out_name = f"{label['name']}.png"
            out_path = out_dir / out_name
            trimmed.save(out_path, format="PNG", optimize=False)
            log["outputs"].append({"question": label["name"], "file": str(out_path)})

    log_path = out_dir / "screenshot_log.json"
    log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
