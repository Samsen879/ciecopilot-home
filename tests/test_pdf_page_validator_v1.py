from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.pdf_page_validator_v1 import validate_pdf_page_question_extraction  # noqa: E402


def test_validator_blocks_later_question_text_even_when_model_flag_is_false():
    result = validate_pdf_page_question_extraction(
        target_q_number=4,
        extraction={
            "question_number": 4,
            "ocr_text": "4 Expand (1 + 3x)^6 in ascending powers of x. [5]\n5 A pulley is shown in the diagram.",
            "question_bbox_norm": [0.05, 0.1, 0.95, 0.55],
            "subquestions": [],
            "marks": ["[5]"],
            "has_diagram": False,
            "includes_later_question": False,
            "confidence": 0.86,
        },
    )

    assert result["status"] == "blocked"
    assert "later_question_text_detected" in result["blockers"]


def test_validator_does_not_treat_equation_coefficient_as_later_question():
    result = validate_pdf_page_question_extraction(
        target_q_number=7,
        extraction={
            "question_number": 7,
            "ocr_text": "7 Let f(x)=8x^3+54x^2-17x-21.\n(c) Hence solve the equation\n8 cos^3 theta + 54 cos^2 theta - 17 cos theta - 21 = 0. [3]",
            "question_bbox_norm": [0.08, 0.08, 0.92, 0.93],
            "subquestions": ["(a)", "(b)", "(c)"],
            "marks": ["[1]", "[2]", "[3]"],
            "has_diagram": False,
            "includes_later_question": False,
            "ends_before_next_question": True,
            "confidence": 0.98,
        },
    )

    assert result["status"] == "passed"
    assert "later_question_text_detected" not in result["blockers"]


def test_validator_allows_single_part_question_without_subquestion_labels():
    result = validate_pdf_page_question_extraction(
        target_q_number=4,
        extraction={
            "question_number": 4,
            "ocr_text": "4 Expand (1 + 3x)^6 in ascending powers of x. [5]",
            "question_bbox_norm": [0.08, 0.12, 0.91, 0.38],
            "subquestions": [],
            "marks": ["[5]"],
            "has_diagram": False,
            "includes_later_question": False,
            "confidence": 0.91,
        },
    )

    assert result["status"] == "passed"
    assert result["blockers"] == []


def test_validator_blocks_missing_ocr_text_and_bad_bbox():
    result = validate_pdf_page_question_extraction(
        target_q_number=9,
        extraction={
            "question_number": 9,
            "ocr_text": "",
            "question_bbox_norm": [0.8, 0.2, 0.2, 0.4],
            "subquestions": [{"label": "(a)", "text": "Find x.", "marks": "[2]"}],
            "marks": ["[2]"],
            "has_diagram": True,
            "includes_later_question": False,
            "confidence": 0.7,
        },
    )

    assert result["status"] == "blocked"
    assert "missing_ocr_text" in result["blockers"]
    assert "invalid_question_bbox_norm" in result["blockers"]


def test_validator_flags_expected_diagram_mismatch_as_warning_not_blocker():
    result = validate_pdf_page_question_extraction(
        target_q_number=2,
        extraction={
            "question_number": 2,
            "ocr_text": "2 The diagram shows two curves on a coordinate grid. [4]",
            "question_bbox_norm": [0.1, 0.2, 0.9, 0.7],
            "subquestions": [],
            "marks": ["[4]"],
            "has_diagram": False,
            "includes_later_question": False,
            "confidence": 0.82,
        },
        expected_diagram_present=True,
    )

    assert result["status"] == "passed"
    assert "diagram_presence_mismatch" in result["warnings"]


def test_validator_blocks_when_model_says_target_does_not_end_before_next_question():
    result = validate_pdf_page_question_extraction(
        target_q_number=9,
        extraction={
            "question_number": 9,
            "ocr_text": "9 The diagram shows a curve. [5]",
            "question_bbox_norm": [0.1, 0.1, 0.9, 0.8],
            "subquestions": [],
            "marks": ["[5]"],
            "has_diagram": True,
            "includes_later_question": False,
            "ends_before_next_question": False,
            "confidence": 0.91,
        },
    )

    assert result["status"] == "blocked"
    assert "model_reported_boundary_not_closed" in result["blockers"]


def test_validator_warns_about_suspicious_bbox_shape():
    result = validate_pdf_page_question_extraction(
        target_q_number=8,
        extraction={
            "question_number": 8,
            "ocr_text": "8 Find the coordinates of P.\n(a) Find x. [4]\n(b) Find y. [4]",
            "question_bbox_norm": [0.08, 0.085, 0.92, 0.16],
            "subquestions": ["(a)", "(b)"],
            "marks": ["[4]", "[4]"],
            "has_diagram": False,
            "includes_later_question": False,
            "ends_before_next_question": True,
            "confidence": 0.98,
        },
    )

    assert result["status"] == "passed"
    assert "thin_question_bbox" in result["warnings"]


def test_validator_allows_thin_bbox_for_single_line_question():
    result = validate_pdf_page_question_extraction(
        target_q_number=1,
        extraction={
            "question_number": 1,
            "ocr_text": "1 A particle P is projected vertically upwards with speed 24 m s^-1 from a point 5 m above ground level. Find the time from projection until P reaches the ground. [3]",
            "question_bbox_norm": [0.07, 0.075, 0.92, 0.125],
            "subquestions": [],
            "marks": ["[3]"],
            "has_diagram": False,
            "includes_later_question": False,
            "ends_before_next_question": True,
            "confidence": 0.98,
        },
    )

    assert result["status"] == "passed"
    assert "thin_question_bbox" not in result["warnings"]


def test_validator_allows_thin_bbox_for_line_wrapped_single_part_question():
    result = validate_pdf_page_question_extraction(
        target_q_number=4,
        extraction={
            "question_number": 4,
            "ocr_text": "4 The positive numbers p and q are such that\nln(p/q) = a and ln(q^2p) = b.\nExpress ln(p^7q) in terms of a and b. [4]",
            "question_bbox_norm": [0.06885, 0.042755, 0.769102, 0.103919],
            "subquestions": [],
            "marks": ["[4]"],
            "has_diagram": False,
            "includes_later_question": False,
            "ends_before_next_question": True,
            "confidence": 0.98,
        },
    )

    assert result["status"] == "passed"
    assert "thin_question_bbox" not in result["warnings"]


def test_validator_blocks_when_multi_page_input_is_not_covered():
    result = validate_pdf_page_question_extraction(
        target_q_number=4,
        extraction={
            "question_number": 4,
            "ocr_text": "4 (a) Find the sum. [4]",
            "question_bbox_norm": [0.06, 0.04, 0.8, 0.08],
            "page_indices": [0],
            "subquestions": ["(a)"],
            "marks": ["[4]"],
            "has_diagram": False,
            "includes_later_question": False,
            "ends_before_next_question": True,
            "confidence": 0.98,
        },
        expected_page_count=2,
    )

    assert result["status"] == "blocked"
    assert "missing_expected_input_page" in result["blockers"]
