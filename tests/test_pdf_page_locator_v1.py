from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.pdf_page_locator_v1 import (  # noqa: E402
    build_pdf_page_question_request,
    locate_question_pages_from_text_pages,
    parse_storage_key_identity,
    resolve_pdf_path,
)


def test_parse_storage_key_identity_extracts_paper_variant_and_question():
    identity = parse_storage_key_identity("9709/s24_qp_13/questions/q09.png")

    assert identity.subject_code == "9709"
    assert identity.session == "s"
    assert identity.year == 2024
    assert identity.paper == 1
    assert identity.variant == 3
    assert identity.q_number == 9
    assert identity.pdf_stem == "9709_s24_qp_13"


def test_resolve_pdf_path_accepts_wm_prefixed_pdfs(tmp_path):
    paper_dir = tmp_path / "9709Mathematics" / "paper1"
    paper_dir.mkdir(parents=True)
    expected = paper_dir / "WM_9709_s20_qp_13.pdf"
    expected.write_bytes(b"%PDF fake")

    identity = parse_storage_key_identity("9709/s20_qp_13/questions/q04.png")

    assert resolve_pdf_path(identity, tmp_path / "9709Mathematics") == expected


def test_locator_detects_question_number_on_first_content_line():
    pages = [
        [
            "6",
            "The diagram shows a sector AOB of a circle.",
            "(a) Find the area of the shaded region. [5]",
        ],
        [
            "7",
            "Functions f and g are defined as follows.",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=6)

    assert candidate.start_page_index == 0
    assert candidate.page_indices == [0]
    assert "question_start_not_found" not in candidate.warnings


def test_locator_includes_next_page_when_it_looks_like_target_continuation():
    pages = [
        [
            "9 The diagram shows the curve y = f(x).",
            "(a) Find the coordinates of A. [5]",
        ],
        [
            "(b) Hence find the value of k. [3]",
        ],
        [
            "10",
            "A new question starts here.",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=9)

    assert candidate.start_page_index == 0
    assert candidate.page_indices == [0, 1]


def test_locator_includes_continuation_after_plain_top_page_number():
    pages = [
        ["6", "4", "(a)", "An arithmetic progression has a first term of 32.", "[4]"],
        ["7", "(b)", "Each year a school allocates money for the library.", "[3]"],
        ["8", "5", "The equation of a curve is y = 2 cos x. [2]"],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=4)

    assert candidate.start_page_index == 0
    assert candidate.page_indices == [0, 1]


def test_locator_does_not_strip_plain_top_page_number_for_weak_continuation_words():
    pages = [
        ["6", "4", "Find the value of k. [4]"],
        ["7", "Find the gradient of the curve. [3]"],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=4)

    assert candidate.page_indices == [0]


def test_locator_ignores_pdf_page_number_that_matches_question_number():
    pages = [
        [
            "9",
            "9709/13/M/J/24",
            "© UCLES 2024",
            "[Turn over",
            "7",
            "The first term of an arithmetic progression is 1.5.",
        ],
        [
            "12",
            "9709/13/M/J/24",
            "© UCLES 2024",
            "9",
            "The diagram shows the curve with equation y = x^2 + 3.",
            "(a) Find the equation of the tangent. [5]",
        ],
        [
            "13",
            "9709/13/M/J/24",
            "© UCLES 2024",
            "[Turn over",
            "(b) The region shaded in the diagram is enclosed by the curve. [3]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=9)

    assert candidate.start_page_index == 1
    assert candidate.page_indices == [1, 2]
    assert candidate.matched_line == "9"


def test_locator_ignores_bare_line_zero_pdf_page_number_without_header():
    pages = [
        ["cover"],
        ["1", "Find the coefficient. [3]"],
        [
            "3",
            "(ii) This is a continuation from the previous question.",
            "[2]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=3)

    assert candidate.start_page_index is None
    assert candidate.warnings == ["question_start_not_found"]


def test_locator_prefers_question_header_over_same_number_inside_body_text():
    pages = [
        [
            "6",
            "9709/13/M/J/24",
            "© UCLES 2024",
            "4",
            "(a) Show that the equation can be written in the form ...",
        ],
        [
            "14",
            "9709/13/M/J/24",
            "© UCLES 2024",
            "10 The geometric progression has first term 2.",
            "(a) Find the value of r.",
            "4 significant figures.",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=4)

    assert candidate.start_page_index == 0
    assert candidate.matched_line == "4"


def test_locator_finds_deep_standalone_question_header_on_dense_page():
    pages = [
        ["cover"],
        [
            "2",
            "1",
            "Functions f and g are defined by",
            "[3]",
            "2",
            "A curve is such that dy/dx = ...",
            "[4]",
            "3",
            "Relative to an origin O, the position vectors of points A and B are given by",
            "[4]",
            "4",
            "Find the term that is independent of x in the expansion of",
            "(i)",
            "[2]",
            "(ii)",
            "[4]",
            "5",
            "1",
            "30",
            "1",
            "C",
            "B",
            "A",
            "M",
            "x",
            "x",
            "In the diagram, triangle ABC is right-angled at C and M is the mid-point of BC.",
            "(i) find AM in terms of x,",
            "[3]",
            "(ii) show that ...",
            "[2]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=5)

    assert candidate.start_page_index == 1
    assert candidate.matched_line == "5"


def test_locator_ignores_first_line_page_number_on_old_pdf_text_layer():
    pages = [
        ["cover"],
        [
            "2",
            "1",
            "Functions f and g are defined by",
            "[3]",
            "2",
            "A curve is such that dy/dx = ...",
            "[4]",
            "3",
            "Relative to an origin O, the position vectors of points A and B are given by",
            "[4]",
        ],
        [
            "3",
            "6",
            "The diagram shows a circle.",
            "[3]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=3)

    assert candidate.start_page_index == 1
    assert candidate.matched_line == "3"


def test_locator_ignores_standalone_number_inside_formula_fragment():
    pages = [
        [
            "2",
            "A curve is such that dy",
            "dx =",
            "8",
            "(5 - 2x)^2. Given that the curve passes through (2, 7), find the equation.",
            "[4]",
        ],
        [
            "3",
            "7",
            "Some previous question. [3]",
            "8",
            "Three points have coordinates A, B and C. Find the value of k.",
            "[4]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=8)

    assert candidate.start_page_index == 1
    assert candidate.matched_line == "8"


def test_locator_ignores_measurement_that_starts_with_target_number():
    pages = [
        ["cover"],
        [
            "14",
            "8",
            "O",
            "A",
            "B",
            "12 cm",
            "10 cm",
            "In the diagram, OAXB is a sector of a circle.",
            "[3]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=12)

    assert candidate.start_page_index is None


def test_locator_ignores_force_unit_that_starts_with_target_number():
    pages = [
        ["cover"],
        [
            "2",
            "A particle is pulled by a force of",
            "15 N",
            "Find the acceleration.",
            "[4]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=15)

    assert candidate.start_page_index is None


def test_locator_ignores_force_unit_sentence_that_starts_with_target_number():
    pages = [
        ["cover"],
        [
            "3",
            "The system has forces of",
            "8 N and 10 N. The forces are in equilibrium.",
            "[3]",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=8)

    assert candidate.start_page_index is None


def test_locator_prefers_target_question_over_nearby_later_question():
    pages = [
        [
            "5",
            "The diagram for Question 4 is continued from the previous page.",
            "6 The curve C has equation y = x^2 - 4x.",
        ],
        [
            "7",
            "Solve the equation.",
        ],
    ]

    candidate = locate_question_pages_from_text_pages(pages, target_q_number=6)

    assert candidate.start_page_index == 0
    assert candidate.matched_line == "6 The curve C has equation y = x^2 - 4x."


def test_build_pdf_page_question_request_demands_target_only_boundaries(tmp_path):
    page_1 = tmp_path / "page_12.png"
    page_2 = tmp_path / "page_13.png"
    page_1.write_bytes(b"fake")
    page_2.write_bytes(b"fake")

    request = build_pdf_page_question_request(
        model="qwen3-vl-plus",
        storage_key="9709/s24_qp_13/questions/q09.png",
        target_q_number=9,
        page_image_paths=[page_1, page_2],
    )

    content = request["messages"][0]["content"]
    prompt = content[0]["text"]
    assert request["model"] == "qwen3-vl-plus"
    assert "Question 9" in prompt
    assert "Do not include Question 10" in prompt
    assert [part["image_path"] for part in content[1:]] == [str(page_1), str(page_2)]
