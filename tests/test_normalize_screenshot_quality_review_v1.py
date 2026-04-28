from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.normalize_screenshot_quality_review_v1 import (  # noqa: E402
    normalize_screenshot_quality_payload,
)


def _result(
    *,
    manifest_position: int = 0,
    q_number: int = 7,
    crop_count: int = 2,
    review: dict | None = None,
) -> dict:
    return {
        "manifest_position": manifest_position,
        "storage_key": f"9709/test/questions/q{q_number:02d}.png",
        "q_number": q_number,
        "pdf_stem": "9709_test_qp_13",
        "crop_count": crop_count,
        "crop_paths": [
            f"/tmp/q{q_number:02d}_page_010.png",
            f"/tmp/q{q_number:02d}_page_011.png",
        ][:crop_count],
        "failure_reason": None,
        "review": review
        or {
            "quality": "fail",
            "completeness": "major_cutoff",
            "contains_target_question": "unclear",
            "neighbor_question_contamination": "major",
            "blank_or_noise": False,
            "too_tight": False,
            "diagram_quality": "not_applicable",
            "watermark_present": False,
            "text_readability": "good",
            "expected_question_number_visible": True,
            "issues": ["截图包含第7题(a)与第11题(b)，属相邻题目严重混入"],
            "brief_reason": "第11题(b)实际只是第二页顶部页码11导致的题号误判",
        },
    }


def _projection(
    *,
    manifest_position: int = 0,
    q_number: int = 7,
    page_indices: list[int] | None = None,
    ocr_text: str = "",
    diagram_present: bool = False,
) -> dict:
    return {
        "manifest_position": manifest_position,
        "storage_key": f"9709/test/questions/q{q_number:02d}.png",
        "q_number": q_number,
        "extraction": {
            "ocr_text": ocr_text,
            "diagram_present": diagram_present,
            "page_indices": page_indices if page_indices is not None else [9, 10],
            "subpart_labels": ["(a)", "(b)"],
        },
    }


def _payload(result: dict, projection: dict) -> tuple[dict, dict]:
    return (
        {
            "schema_version": "quality_review_test",
            "source_projection": "projection-test.json",
            "summary": {"total": 1, "quality_fail": 1},
            "results": [result],
        },
        {
            "schema_version": "projection_test",
            "items": [projection],
        },
    )


def test_page_header_question_number_confusion_is_normalized_to_pass():
    quality_payload, projection_payload = _payload(
        _result(),
        _projection(
            ocr_text="7 (a) Express tan^2 theta ...\n(b) The diagram shows y = sin x and y = 2 cos x.",
            diagram_present=True,
            page_indices=[9, 10],
        ),
    )

    normalized = normalize_screenshot_quality_payload(quality_payload, projection_payload)
    result = normalized["results"][0]

    assert result["review"]["quality"] == "pass"
    assert result["review"]["completeness"] == "complete"
    assert result["review"]["neighbor_question_contamination"] == "none"
    assert result["qc_normalization"]["changed"] is True
    assert result["qc_normalization"]["rules"] == ["page_header_question_number_confusion"]
    assert normalized["summary"]["quality_fail"] == 0
    assert normalized["summary"]["quality_pass"] == 1
    assert normalized["summary"]["normalized_from_fail_to_pass"] == 1


def test_student_drawn_argand_prompt_does_not_require_preprinted_diagram():
    quality_payload, projection_payload = _payload(
        _result(
            q_number=4,
            crop_count=1,
            review={
                "quality": "fail",
                "completeness": "complete",
                "contains_target_question": "yes",
                "neighbor_question_contamination": "none",
                "blank_or_noise": False,
                "too_tight": False,
                "diagram_quality": "missing",
                "watermark_present": False,
                "text_readability": "good",
                "expected_question_number_visible": True,
                "issues": ["missing_diagram"],
                "brief_reason": "题目要求 Argand diagram，但截图中没有预印图。",
            },
        ),
        _projection(
            q_number=4,
            page_indices=[3],
            ocr_text="4 On a sketch of an Argand diagram, shade the region whose points represent complex numbers z.",
            diagram_present=False,
        ),
    )

    normalized = normalize_screenshot_quality_payload(quality_payload, projection_payload)
    result = normalized["results"][0]

    assert result["review"]["quality"] == "pass"
    assert result["review"]["diagram_quality"] == "not_applicable"
    assert result["qc_normalization"]["rules"] == ["student_drawn_diagram_prompt"]


def test_real_neighbor_contamination_that_is_not_a_page_number_remains_fail():
    quality_payload, projection_payload = _payload(
        _result(
            review={
                "quality": "fail",
                "completeness": "major_cutoff",
                "contains_target_question": "unclear",
                "neighbor_question_contamination": "major",
                "blank_or_noise": False,
                "too_tight": False,
                "diagram_quality": "not_applicable",
                "watermark_present": False,
                "text_readability": "good",
                "expected_question_number_visible": True,
                "issues": ["截图包含第7题与第8题，是真实相邻题污染"],
                "brief_reason": "第8题不是当前截图的页码，不能自动降级。",
            }
        ),
        _projection(
            ocr_text="7 (a) Express tan^2 theta ...",
            diagram_present=False,
            page_indices=[9, 10],
        ),
    )

    normalized = normalize_screenshot_quality_payload(quality_payload, projection_payload)

    assert normalized["results"][0]["review"]["quality"] == "fail"
    assert normalized["results"][0]["qc_normalization"]["changed"] is False


def test_missing_printed_diagram_remains_fail():
    quality_payload, projection_payload = _payload(
        _result(
            crop_count=1,
            review={
                "quality": "fail",
                "completeness": "major_cutoff",
                "contains_target_question": "yes",
                "neighbor_question_contamination": "none",
                "blank_or_noise": False,
                "too_tight": False,
                "diagram_quality": "missing",
                "watermark_present": False,
                "text_readability": "good",
                "expected_question_number_visible": True,
                "issues": ["missing_diagram"],
                "brief_reason": "题干引用 Fig. 1，但截图没有图。",
            },
        ),
        _projection(
            ocr_text="7 Fig. 1 shows the graph of a function. Use the graph to find...",
            diagram_present=True,
            page_indices=[6],
        ),
    )

    normalized = normalize_screenshot_quality_payload(quality_payload, projection_payload)

    assert normalized["results"][0]["review"]["quality"] == "fail"
    assert normalized["results"][0]["qc_normalization"]["changed"] is False


def test_student_drawn_argand_prompt_cleans_non_failing_missing_diagram_flags():
    quality_payload, projection_payload = _payload(
        _result(
            q_number=5,
            crop_count=1,
            review={
                "quality": "pass",
                "completeness": "complete",
                "contains_target_question": "yes",
                "neighbor_question_contamination": "none",
                "blank_or_noise": False,
                "too_tight": False,
                "diagram_quality": "missing",
                "watermark_present": True,
                "text_readability": "good",
                "expected_question_number_visible": True,
                "issues": ["diagram_missing", "watermark_present"],
                "brief_reason": "完整，但题目要求的 Argand 图未在图中显示。",
            },
        ),
        _projection(
            q_number=5,
            page_indices=[4],
            ocr_text="5 Sketch an Argand diagram showing the points representing z.",
            diagram_present=False,
        ),
    )

    normalized = normalize_screenshot_quality_payload(quality_payload, projection_payload)
    result = normalized["results"][0]

    assert result["review"]["quality"] == "pass"
    assert result["review"]["diagram_quality"] == "not_applicable"
    assert result["review"]["issues"] == ["watermark_present", "qc_normalized:student_drawn_diagram_prompt"]
    assert result["qc_normalization"]["changed"] is True
    assert result["qc_normalization"]["original_quality"] == "pass"
    assert normalized["summary"]["diagram_missing"] == 0
