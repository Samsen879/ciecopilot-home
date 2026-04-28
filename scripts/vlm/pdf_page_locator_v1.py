#!/usr/bin/env python3
"""PDF-page locator and request builder for page-level 9709 extraction."""
from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
from typing import Any, Iterable

from scripts.vlm.qwen_openai_client_v1 import call_qwen_openai_v1


@dataclass(frozen=True)
class QuestionIdentity:
    subject_code: str
    session: str
    year: int
    paper: int
    variant: int
    q_number: int

    @property
    def yy(self) -> str:
        return f"{self.year % 100:02d}"

    @property
    def pdf_stem(self) -> str:
        return f"{self.subject_code}_{self.session}{self.yy}_qp_{self.paper}{self.variant}"


@dataclass(frozen=True)
class CandidatePages:
    target_q_number: int
    start_page_index: int | None
    page_indices: list[int]
    matched_line: str | None = None
    score: int = 0
    warnings: list[str] | None = None


_STORAGE_KEY_RE = re.compile(
    r"^(?P<subject>\d{4})/"
    r"(?P<session>[smw])(?P<yy>\d{2})_qp_(?P<paper>\d)(?P<variant>\d)/"
    r"questions/q(?P<q>\d{1,2})\.png$",
    re.IGNORECASE,
)

_CONTEXT_TOKENS = (
    "(a)",
    "(b)",
    "(i)",
    "[",
    "find",
    "show",
    "prove",
    "solve",
    "diagram",
    "curve",
    "equation",
    "points",
    "sketch",
)


def parse_storage_key_identity(storage_key: str) -> QuestionIdentity:
    match = _STORAGE_KEY_RE.match(storage_key.strip())
    if not match:
        raise ValueError(f"Unsupported 9709 question storage_key: {storage_key}")
    yy = int(match.group("yy"))
    year = 2000 + yy
    return QuestionIdentity(
        subject_code=match.group("subject"),
        session=match.group("session").lower(),
        year=year,
        paper=int(match.group("paper")),
        variant=int(match.group("variant")),
        q_number=int(match.group("q")),
    )


def resolve_pdf_path(identity: QuestionIdentity, past_papers_root: str | Path) -> Path:
    root = Path(past_papers_root)
    paper_dir = root / f"paper{identity.paper}"
    candidates = sorted(paper_dir.glob(f"*{identity.pdf_stem}.pdf"))
    if not candidates:
        raise FileNotFoundError(f"No PDF found for {identity.pdf_stem} under {paper_dir}")
    return candidates[0]


def _line_has_context(lines: list[str], line_index: int) -> bool:
    window = " ".join(lines[line_index : min(len(lines), line_index + 8)]).lower()
    return any(token in window for token in _CONTEXT_TOKENS)


def _deep_standalone_header_has_context(lines: list[str], line_index: int) -> bool:
    window = " ".join(lines[line_index : min(len(lines), line_index + 45)]).lower()
    has_mark = re.search(r"\[\d+\]", window) is not None
    has_question_language = any(
        token in window
        for token in (
            "(a)",
            "(i)",
            "find",
            "show",
            "prove",
            "solve",
            "given",
            "where",
            "diagram",
            "curve",
            "equation",
            "position vectors",
            "coordinates",
        )
    )
    return has_mark and has_question_language


def _is_pdf_furniture_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    if re.search(r"\b9709/\d{2}/[A-Z]/[A-Z]/\d{2}\b", stripped):
        return True
    if "UCLES" in stripped:
        return True
    if stripped.lower() in {"[turn over", "turn over"}:
        return True
    return False


def _content_lines(lines: list[str]) -> list[str]:
    return lines[_content_start_index(lines) :]


def _content_start_index(lines: list[str]) -> int:
    index = 0
    if lines and _looks_like_top_page_number(lines[0], lines, 0):
        index = 1
    while index < len(lines) and _is_pdf_furniture_line(lines[index]):
        index += 1
    return index


def _content_line_index(lines: list[str], line_index: int) -> int:
    return line_index - _content_start_index(lines)


def _looks_like_top_page_number(line: str, lines: list[str], line_index: int) -> bool:
    if line_index != 0:
        return False
    if not re.match(r"^\s*\d{1,3}\s*$", line):
        return False
    following = "\n".join(lines[1:4])
    return "UCLES" in following or re.search(r"\b9709/\d{2}/[A-Z]/[A-Z]/\d{2}\b", following) is not None


def _previous_lines_allow_deep_question_header(lines: list[str], line_index: int) -> bool:
    previous_window = " ".join(lines[max(0, line_index - 6) : line_index])
    return re.search(r"\[\d+\]", previous_window) is not None or "printed on the next page" in previous_window.lower()


def _previous_window_has_intervening_question_header(
    lines: list[str],
    line_index: int,
    target_q_number: int,
) -> bool:
    window = lines[max(0, line_index - 8) : line_index]
    last_boundary = -1
    for index, raw_line in enumerate(window):
        if re.search(r"\[\d+\]", raw_line) or "printed on the next page" in raw_line.lower():
            last_boundary = index
    for raw_line in window[last_boundary + 1 :]:
        line = " ".join(raw_line.strip().split())
        if not line:
            continue
        match = re.match(r"^(\d{1,2})(?:\s+\S|\.)?$", line)
        if match and int(match.group(1)) != target_q_number:
            return True
    return False


def _looks_like_formula_fragment(lines: list[str], line_index: int) -> bool:
    previous = " ".join(lines[max(0, line_index - 3) : line_index]).strip().lower()
    following = " ".join(lines[line_index + 1 : min(len(lines), line_index + 4)]).strip().lower()
    if previous.endswith(("=", "+", "-", "−", "d", "dy", "dx")):
        return True
    if re.search(r"(dy|dx|sin|cos|tan|ln|log|sqrt|[+\-−=]|\^)$", previous):
        return True
    if re.match(r"^[(@(\[]?\s*[\dxyabcijkprθ!α+\-−=]", following):
        return True
    return False


def _looks_like_pdf_page_number_by_position(lines: list[str], line_index: int, page_index: int | None) -> bool:
    if page_index is None or line_index != 0:
        return False
    stripped = lines[line_index].strip()
    if stripped != str(page_index + 1):
        return False
    if page_index > 0:
        return True
    if any(_is_pdf_furniture_line(line) for line in lines[1:5]):
        return True
    for raw_line in lines[1:5]:
        line = " ".join(raw_line.strip().split())
        if re.match(r"^\d{1,2}(\s+\S)?$", line) and line != stripped:
            return True
    return False


def _question_header_score(
    line: str,
    lines: list[str],
    line_index: int,
    target_q_number: int,
    *,
    page_index: int | None = None,
) -> int:
    stripped = " ".join(line.strip().split())
    if not stripped:
        return 0
    if _looks_like_top_page_number(line, lines, line_index):
        return 0
    if (
        _looks_like_pdf_page_number_by_position(lines, line_index, page_index)
    ):
        return 0
    if re.match(
        rf"^{target_q_number}\s+(?:N|cm|m|kg|g|s|ms|rad|degrees?|°)\b",
        stripped,
        re.IGNORECASE,
    ):
        return 0
    content_index = _content_line_index(lines, line_index)
    if content_index < 0:
        return 0

    exact_standalone = stripped == str(target_q_number)
    exact_prefix = re.match(
        rf"^{target_q_number}\s+(?:[A-Z(]|The\b|A\b|An\b|Let\b|Find\b|Show\b|Solve\b|Use\b)",
        stripped,
    ) is not None
    question_prefix = re.match(rf"^question\s+{target_q_number}\b", stripped, re.IGNORECASE) is not None
    if not (exact_standalone or exact_prefix or question_prefix):
        return 0
    has_context = _line_has_context(lines, line_index)
    deep_standalone = exact_standalone and _deep_standalone_header_has_context(lines, line_index)
    if content_index > 1 and exact_standalone:
        previous_allows_header = _previous_lines_allow_deep_question_header(lines, line_index)
        if _previous_window_has_intervening_question_header(lines, line_index, target_q_number):
            return 0
        if not previous_allows_header and _looks_like_formula_fragment(lines, line_index):
            return 0
        if not previous_allows_header:
            return 0
    if content_index > 1 and not has_context and not deep_standalone:
        return 0

    score = 20
    if content_index == 0:
        score += 10
    elif content_index == 1:
        score += 4
    else:
        score -= min(content_index, 12)
        if deep_standalone:
            score += 10
    if exact_prefix or question_prefix:
        score += 5
    if exact_standalone:
        score += 12
    if has_context:
        score += 8
    return score


def _page_starts_with_question(lines: list[str], q_number: int) -> bool:
    for raw_line in _content_lines(lines)[:4]:
        line = " ".join(raw_line.strip().split())
        if not line:
            continue
        if line == str(q_number):
            return True
        if re.match(rf"^{q_number}\s+\S", line):
            return True
        if re.match(rf"^question\s+{q_number}\b", line, re.IGNORECASE):
            return True
    return False


def _page_looks_like_target_continuation(lines: list[str]) -> bool:
    lines = _content_lines(lines)
    if (
        len(lines) >= 2
        and re.match(r"^\d{1,3}$", lines[0].strip())
        and (
            re.match(r"^\(?[a-z]\)", lines[1].strip(), re.IGNORECASE)
            or re.match(r"^\(?[ivx]+\)", lines[1].strip(), re.IGNORECASE)
            or "continued" in lines[1].lower()
        )
    ):
        lines = lines[1:]
    if not lines:
        return False
    lead = " ".join(lines[:6]).strip().lower()
    if not lead:
        return False
    if re.match(r"^\(?[a-z]\)", lead):
        return True
    if re.match(r"^\(?[ivx]+\)", lead):
        return True
    if "continued" in lead:
        return True
    if lead.startswith(("hence", "find", "show that", "prove that")):
        return True
    return False


def _candidate_page_indices(text_pages: list[list[str]], start_page_index: int, target_q_number: int, max_pages: int) -> list[int]:
    page_indices = [start_page_index]
    for page_index in range(start_page_index + 1, min(len(text_pages), start_page_index + max_pages)):
        if _page_starts_with_question(text_pages[page_index], target_q_number + 1):
            break
        if not _page_looks_like_target_continuation(text_pages[page_index]):
            break
        page_indices.append(page_index)
    return page_indices


def locate_question_pages_from_text_pages(
    text_pages: list[list[str]],
    *,
    target_q_number: int,
    max_pages: int = 2,
) -> CandidatePages:
    best: tuple[int, int, str] | None = None
    for page_index, lines in enumerate(text_pages):
        for line_index, line in enumerate(lines):
            score = _question_header_score(
                line,
                lines,
                line_index,
                target_q_number,
                page_index=page_index,
            )
            if not score:
                continue
            if best is None or score > best[0]:
                best = (score, page_index, " ".join(line.strip().split()))

    if best is None:
        return CandidatePages(
            target_q_number=target_q_number,
            start_page_index=None,
            page_indices=[],
            warnings=["question_start_not_found"],
        )

    score, start_page_index, matched_line = best
    page_indices = _candidate_page_indices(text_pages, start_page_index, target_q_number, max_pages)
    return CandidatePages(
        target_q_number=target_q_number,
        start_page_index=start_page_index,
        page_indices=page_indices,
        matched_line=matched_line,
        score=score,
        warnings=[],
    )


def extract_pdf_text_pages(pdf_path: str | Path) -> list[list[str]]:
    try:
        import fitz  # type: ignore
    except ImportError as error:  # pragma: no cover - environment guard
        raise RuntimeError("PyMuPDF/fitz is required for PDF text-page extraction") from error

    pages: list[list[str]] = []
    with fitz.open(str(pdf_path)) as document:
        for page in document:
            text = page.get_text("text")
            pages.append([line.strip() for line in text.splitlines() if line.strip()])
    return pages


def render_pdf_pages(
    pdf_path: str | Path,
    page_indices: Iterable[int],
    *,
    output_dir: str | Path,
    scale: float = 2.0,
) -> list[Path]:
    try:
        import fitz  # type: ignore
    except ImportError as error:  # pragma: no cover - environment guard
        raise RuntimeError("PyMuPDF/fitz is required for PDF page rendering") from error

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rendered: list[Path] = []
    with fitz.open(str(pdf_path)) as document:
        matrix = fitz.Matrix(scale, scale)
        for page_index in page_indices:
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            output = out_dir / f"{Path(pdf_path).stem}_page_{page_index + 1:03d}.png"
            pixmap.save(str(output))
            rendered.append(output)
    return rendered


def build_pdf_page_question_request(
    *,
    model: str,
    storage_key: str,
    target_q_number: int,
    page_image_paths: list[str | Path],
    max_tokens: int = 4096,
) -> dict[str, Any]:
    next_q = target_q_number + 1
    prompt = (
        "Return one valid JSON object only. "
        f"Target: extract exactly Question {target_q_number} from the rendered original PDF page image(s) for {storage_key}. "
        f"Do not include Question {next_q} or any later question, even if it is visible on the same page. "
        "If the target question continues onto the next rendered page, include only the continued target text and diagrams. "
        "Find the target question boundary visually from the printed question number, subpart labels, marks, and the next question heading. "
        "Return keys: question_number, question_bbox_norm, page_indices, ocr_text, formula_latex_list, "
        "subquestions, marks, has_diagram, diagram_summary, diagram_elements, spatial_evidence, "
        "continues_on_next_page, ends_before_next_question, includes_later_question, confidence, warnings. "
        "question_bbox_norm must be [x1,y1,x2,y2] normalized to the combined visible page image area for the target region. "
        "Use booleans for has_diagram, continues_on_next_page, ends_before_next_question, includes_later_question. "
        "Use arrays for formula_latex_list, subquestions, marks, diagram_elements, spatial_evidence, and warnings. "
        "For a single-part question with no printed subpart labels, subquestions may be an empty array. "
        "Do not solve the problem and do not include markdown fences."
    )
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for image_path in page_image_paths:
        content.append({"type": "image_path", "image_path": str(image_path)})
    return {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": max_tokens,
        "temperature": 0,
        "enable_thinking": False,
        "response_format": {"type": "json_object"},
    }


def run_pdf_page_question_request(
    *,
    model: str,
    storage_key: str,
    target_q_number: int,
    page_image_paths: list[str | Path],
    client=call_qwen_openai_v1,
) -> dict[str, Any]:
    response = client(
        build_pdf_page_question_request(
            model=model,
            storage_key=storage_key,
            target_q_number=target_q_number,
            page_image_paths=page_image_paths,
        )
    )
    content = response["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("PDF-page question extraction response must be a JSON object")
    return parsed
