from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.run_pdf_page_chain_extraction_v1 import (  # noqa: E402
    detect_leading_question_number,
    merge_page_fragments,
    normalize_page_chain_result,
    validate_page_chain_questions,
)


def test_merge_page_fragments_combines_cross_page_subparts():
    page_results = [
        {
            "page_index": 5,
            "fragments": [
                {
                    "q_number": 4,
                    "fragment_kind": "new_question",
                    "ocr_text": "4 (a) Find the sum. [4]",
                    "subpart_labels": ["(a)"],
                    "marks": [4],
                    "has_diagram": False,
                    "continues_to_next_page": True,
                }
            ],
        },
        {
            "page_index": 6,
            "fragments": [
                {
                    "q_number": 4,
                    "fragment_kind": "continuation",
                    "ocr_text": "(b) Find the total. [3]",
                    "subpart_labels": ["(b)"],
                    "marks": [3],
                    "has_diagram": False,
                    "continues_from_previous_page": True,
                    "continues_to_next_page": False,
                }
            ],
        },
    ]

    questions = merge_page_fragments(page_results)

    assert len(questions) == 1
    assert questions[0]["q_number"] == 4
    assert questions[0]["page_indices"] == [5, 6]
    assert questions[0]["subpart_labels"] == ["(a)", "(b)"]
    assert "(b) Find the total" in questions[0]["ocr_text"]


def test_merge_page_fragments_ignores_subpart_marks_on_stem_only_fragment():
    page_results = [
        {
            "page_index": 5,
            "fragments": [
                {
                    "q_number": 4,
                    "fragment_kind": "new_question",
                    "ocr_text": "4 A particle P moves in a straight line.",
                    "subpart_labels": ["(i)", "(ii)"],
                    "marks": [2, 2],
                    "has_diagram": False,
                },
                {
                    "q_number": 4,
                    "fragment_kind": "continuation",
                    "ocr_text": "(i) Find an expression for v in terms of t.",
                    "subpart_labels": ["(i)"],
                    "marks": [2],
                    "has_diagram": False,
                },
                {
                    "q_number": 4,
                    "fragment_kind": "continuation",
                    "ocr_text": "(ii) Find the two values of t.",
                    "subpart_labels": ["(ii)"],
                    "marks": [2],
                    "has_diagram": False,
                },
            ],
        },
        {
            "page_index": 6,
            "fragments": [
                {
                    "q_number": 4,
                    "fragment_kind": "continuation",
                    "ocr_text": "(iii) Find the minimum velocity.",
                    "subpart_labels": ["(iii)"],
                    "marks": [3],
                    "has_diagram": False,
                }
            ],
        },
    ]

    questions = merge_page_fragments(page_results)

    assert questions[0]["subpart_labels"] == ["(i)", "(ii)", "(iii)"]
    assert questions[0]["marks"] == [2, 2, 3]


def test_merge_page_fragments_keeps_compound_subpart_labels_with_spaced_ocr_text():
    page_results = [
        {
            "page_index": 16,
            "fragments": [
                {
                    "q_number": 10,
                    "fragment_kind": "continuation",
                    "ocr_text": "(b) (i) On an Argand diagram, sketch the locus.",
                    "subpart_labels": ["(b)(i)"],
                    "marks": [2],
                    "has_diagram": True,
                }
            ],
        }
    ]

    questions = merge_page_fragments(page_results)

    assert questions[0]["subpart_labels"] == ["(b)(i)"]
    assert questions[0]["marks"] == [2]


def test_detect_leading_question_number_skips_plain_page_number():
    assert detect_leading_question_number(["14", "8", "O", "A", "B"]) == 8
    assert detect_leading_question_number(["13", "(ii)", "Continue previous question."]) is None
    assert (
        detect_leading_question_number(
            [
                "7",
                "9709/12/M/J/24",
                "© UCLES 2024",
                "[Turn over",
                "The function h is defined by h(x)",
                "x",
                "2",
                "1",
                "2",
                "=",
                "(c) Solve the equation.",
            ]
        )
        is None
    )


def test_normalize_page_result_visible_new_question_overrides_bad_carry():
    result = {
        "page_index": 14,
        "fragments": [
            {
                "q_number": 7,
                "fragment_kind": "continuation",
                "ocr_text": "In the diagram ... (i) Show that angle AXB is 2.498 radians.",
                "subpart_labels": ["(i)"],
                "continues_from_previous_page": True,
            }
        ],
        "carry_state": {"open_q_number": 8, "open_subpart_label": "(ii)", "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=13,
        text_lines=["14", "8", "O", "A", "B", "In the diagram ..."],
        carry_state={"open_q_number": 7, "open_subpart_label": "(iii)"},
    )

    assert normalized["page_index"] == 13
    assert normalized["model_page_index"] == 14
    assert normalized["detected_leading_q_number"] == 8
    assert normalized["fragments"][0]["q_number"] == 8
    assert normalized["fragments"][0]["fragment_kind"] == "new_question"


def test_normalize_page_result_visible_new_question_overrides_last_seen_previous_question():
    result = {
        "page_index": 2,
        "fragments": [
            {
                "q_number": 1,
                "fragment_kind": "new_question",
                "ocr_text": "The variables x and y satisfy the equation y^2 = Ae^(kx). [5]",
                "subpart_labels": [],
                "continues_from_previous_page": False,
            }
        ],
        "carry_state": {"open_q_number": 1, "open_subpart_label": None, "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=2,
        text_lines=[
            "3",
            "2",
            "The variables x and y satisfy the equation y² = Ae^(kx), where A and k are constants.",
            "Find the values of A and k correct to 2 decimal places.",
        ],
        carry_state={"open_q_number": None, "last_seen_q_number": 1},
    )

    assert normalized["detected_leading_q_number"] == 2
    assert normalized["fragments"][0]["q_number"] == 2
    assert normalized["fragments"][0]["fragment_kind"] == "new_question"
    assert normalized["fragments"][0]["continues_from_previous_page"] is False


def test_normalize_page_result_assigns_continuation_to_code_carry():
    result = {
        "page_index": 19,
        "fragments": [
            {
                "q_number": 9,
                "fragment_kind": "continuation",
                "ocr_text": "(ii) Find the volume.",
                "subpart_labels": ["(ii)"],
                "continues_from_previous_page": True,
            }
        ],
        "carry_state": {"open_q_number": 9, "open_subpart_label": "(ii)", "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=18,
        text_lines=["19", "The shaded region is bounded by the curve.", "(ii) Find the volume."],
        carry_state={"open_q_number": 10, "open_subpart_label": "(i)"},
    )

    assert normalized["fragments"][0]["q_number"] == 10
    assert normalized["carry_state"]["open_q_number"] in {None, 10}


def test_normalize_page_result_uses_last_seen_for_closed_question_continuation():
    result = {
        "page_index": 15,
        "fragments": [
            {
                "q_number": 7,
                "fragment_kind": "continuation",
                "ocr_text": "(iii) Find the area of the shaded region.",
                "subpart_labels": ["(iii)"],
                "continues_from_previous_page": True,
            }
        ],
        "carry_state": {"open_q_number": 9, "open_subpart_label": None, "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=14,
        text_lines=["15", "(iii) Find the area of the shaded region.", "[3]"],
        carry_state={"open_q_number": None, "last_seen_q_number": 8},
    )

    assert normalized["fragments"][0]["q_number"] == 8
    assert normalized["carry_state"]["last_seen_q_number"] == 8


def test_normalize_page_result_overrides_model_hallucinated_new_question_when_no_visible_question_number():
    result = {
        "page_index": 6,
        "fragments": [
            {
                "q_number": 2,
                "fragment_kind": "new_question",
                "ocr_text": "The function h is defined by h(x)=1/(x^2+2). (c) Solve the equation. [4]",
                "subpart_labels": ["(c)"],
                "continues_from_previous_page": False,
            }
        ],
        "carry_state": {"open_q_number": 2, "open_subpart_label": "(c)", "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=6,
        text_lines=[
            "7",
            "9709/12/M/J/24",
            "© UCLES 2024",
            "[Turn over",
            "The function h is defined by h(x)",
            "x",
            "2",
            "1",
            "2",
            "=",
            "(c) Solve the equation.",
        ],
        carry_state={"open_q_number": 4, "last_seen_q_number": 4},
    )

    assert normalized["detected_leading_q_number"] is None
    assert normalized["fragments"][0]["q_number"] == 4
    assert normalized["fragments"][0]["fragment_kind"] == "continuation"


def test_normalize_page_result_ignores_regressive_leading_number_inside_continuation_text():
    result = {
        "page_index": 13,
        "fragments": [
            {
                "q_number": 5,
                "fragment_kind": "new_question",
                "ocr_text": "(iii) Find the number of possible selections which contain exactly 1 M and exactly 1 E.",
                "subpart_labels": ["(iii)"],
                "continues_from_previous_page": False,
            }
        ],
        "carry_state": {"open_q_number": 5, "open_subpart_label": "(iii)", "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=12,
        text_lines=[
            "13",
            "5 of the 9 letters of the word MINCEMEAT are selected.",
            "(iii) Find the number of possible selections which contain exactly 1 M and exactly 1 E.",
        ],
        carry_state={"open_q_number": 7, "last_seen_q_number": 7},
    )

    assert normalized["detected_leading_q_number"] is None
    assert normalized["fragments"][0]["q_number"] == 7
    assert normalized["fragments"][0]["fragment_kind"] == "continuation"
    assert "ignored_regressive_leading_question_number" in normalized["warnings"]


def test_normalize_page_result_closes_open_question_on_additional_answer_page():
    result = {
        "page_index": 17,
        "fragments": [],
        "carry_state": {"open_q_number": 11, "open_subpart_label": None, "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=17,
        text_lines=[
            "18",
            "9709/33/M/J/24",
            "© UCLES 2024",
            "Additional page",
            "If you use the following page to complete the answer to any question, the question number must be clearly shown.",
        ],
        carry_state={"open_q_number": 11, "last_seen_q_number": 11},
    )

    assert normalized["carry_state"]["open_q_number"] is None
    assert normalized["carry_state"]["last_seen_q_number"] == 11


def test_normalize_page_result_drops_model_fragments_on_blank_page():
    result = {
        "page_index": 3,
        "fragments": [
            {
                "q_number": 10,
                "fragment_kind": "continuation",
                "ocr_text": "(v) Continue working on the blank page.",
                "subpart_labels": ["(v)"],
                "marks": [],
                "continues_from_previous_page": True,
            }
        ],
        "carry_state": {"open_q_number": 10, "open_subpart_label": "(v)", "reason": "model state"},
    }

    normalized = normalize_page_chain_result(
        result,
        source_page_index=3,
        text_lines=["4", "BLANK PAGE", "9709/12/O/N/16"],
        carry_state={"open_q_number": 10, "last_seen_q_number": 10},
    )

    assert normalized["fragments"] == []
    assert normalized["carry_state"]["open_q_number"] is None
    assert normalized["carry_state"]["last_seen_q_number"] == 10
    assert "dropped_model_fragments_on_blank_or_answer_page" in normalized["warnings"]


def test_validate_page_chain_questions_blocks_missing_question_number():
    validation = validate_page_chain_questions(
        [
            {"q_number": 1, "page_indices": [1], "ocr_text": "Q1", "subpart_labels": [], "marks": [4]},
            {"q_number": 3, "page_indices": [3], "ocr_text": "Q3", "subpart_labels": [], "marks": [5]},
        ]
    )

    assert validation["status"] == "blocked"
    assert "question_number_gap" in validation["blockers"]


def test_validate_page_chain_questions_warns_about_subpart_mark_mismatch():
    validation = validate_page_chain_questions(
        [
            {
                "q_number": 4,
                "page_indices": [5, 6],
                "ocr_text": "Q4 (i) Find v. (ii) Find rest. (iii) Find minimum.",
                "subpart_labels": ["(i)", "(ii)", "(iii)"],
                "marks": [2, 2],
            }
        ]
    )

    assert validation["status"] == "passed"
    assert "subpart_mark_count_mismatch" in validation["warnings"]


def test_validate_page_chain_questions_does_not_warn_for_nested_subpart_marks():
    validation = validate_page_chain_questions(
        [
            {
                "q_number": 5,
                "page_indices": [7, 8],
                "ocr_text": "Q5 (a) Find f. (b) (i) Find g. (ii) Find h.",
                "subpart_labels": ["(a)", "(b)", "(i)", "(ii)"],
                "marks": [4, 2, 3],
            },
            {
                "q_number": 6,
                "page_indices": [9],
                "ocr_text": "Q6 (a) Find p. (b) Find q. (c) (i) Find r. (ii) Find s.",
                "subpart_labels": ["(a)", "(b)", "(c)", "(i)", "(ii)"],
                "marks": [3, 3, 4, 1],
            },
        ]
    )

    assert validation["status"] == "passed"
    assert "subpart_mark_count_mismatch" not in validation["warnings"]


def test_validate_page_chain_questions_does_not_warn_for_compound_subpart_marks():
    validation = validate_page_chain_questions(
        [
            {
                "q_number": 10,
                "page_indices": [15, 16],
                "ocr_text": (
                    "Q10 (a) Solve the equations. [6] "
                    "(b) (i) Sketch the locus. "
                    "(ii) Calculate the least value. [2]"
                ),
                "subpart_labels": ["(a)", "(b)(i)", "(ii)"],
                "marks": [6, 2, 2],
            }
        ]
    )

    assert validation["status"] == "passed"
    assert "subpart_mark_count_mismatch" not in validation["warnings"]


def test_validate_page_chain_questions_blocks_answer_page_contamination():
    validation = validate_page_chain_questions(
        [
            {
                "q_number": 11,
                "page_indices": [15, 17],
                "ocr_text": "11 Find the integral.\nAdditional page. If you use this page, the question number must be shown.",
                "subpart_labels": [],
                "marks": [9],
            }
        ]
    )

    assert validation["status"] == "blocked"
    assert "answer_only_page_contamination" in validation["blockers"]
