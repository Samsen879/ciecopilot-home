from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.run_pdf_page_question_extraction_v1 import (  # noqa: E402
    load_existing_results,
    normalize_question_bbox_from_rendered_pages,
    run_pdf_page_item,
    write_results_payload,
)


def _item(**overrides):
    item = {
        "storage_key": "9709/s24_qp_13/questions/q09.png",
        "diagram_present": True,
    }
    item.update(overrides)
    return item


def test_run_pdf_page_item_locates_renders_extracts_and_validates(tmp_path):
    pdf_root = tmp_path / "past-papers" / "9709Mathematics"
    pdf_path = pdf_root / "paper1" / "9709_s24_qp_13.pdf"
    pdf_path.parent.mkdir(parents=True)
    pdf_path.write_bytes(b"%PDF fake")

    def fake_text_loader(_pdf_path):
        return [
            ["8 The function f is defined by ..."],
            ["9 The diagram shows two curves.", "(a) Find the shaded area. [5]"],
            ["(b) Hence find the value of k. [3]"],
        ]

    def fake_renderer(_pdf_path, page_indices, *, output_dir):
        out = []
        for page_index in page_indices:
            path = Path(output_dir) / f"page_{page_index + 1}.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"png")
            out.append(path)
        return out

    def fake_request_runner(**kwargs):
        assert kwargs["target_q_number"] == 9
        assert len(kwargs["page_image_paths"]) == 2
        return {
            "question_number": 9,
            "question_bbox_norm": [0.05, 0.1, 0.95, 0.85],
            "page_indices": [0, 1],
            "ocr_text": "9 The diagram shows two curves.\n(a) Find the shaded area. [5]\n(b) Hence find k. [3]",
            "subquestions": [
                {"label": "(a)", "text": "Find the shaded area.", "marks": "[5]"},
                {"label": "(b)", "text": "Hence find k.", "marks": "[3]"},
            ],
            "marks": ["[5]", "[3]"],
            "has_diagram": True,
            "includes_later_question": False,
            "confidence": 0.89,
        }

    result = run_pdf_page_item(
        _item(),
        past_papers_root=pdf_root,
        render_root=tmp_path / "renders",
        model="qwen3-vl-plus",
        text_page_loader=fake_text_loader,
        page_renderer=fake_renderer,
        request_runner=fake_request_runner,
    )

    assert result["storage_key"] == "9709/s24_qp_13/questions/q09.png"
    assert result["candidate_pages"]["page_indices"] == [1, 2]
    assert result["validation"]["status"] == "passed"
    assert result["failure_reason"] is None


def test_run_pdf_page_item_blocks_when_model_ignores_second_rendered_page(tmp_path):
    pdf_root = tmp_path / "past-papers" / "9709Mathematics"
    pdf_path = pdf_root / "paper1" / "9709_s24_qp_13.pdf"
    pdf_path.parent.mkdir(parents=True)
    pdf_path.write_bytes(b"%PDF fake")

    def fake_text_loader(_pdf_path):
        return [
            ["4", "(a)", "Find the sum. [4]"],
            ["2", "(b)", "Find the total. [3]"],
            ["3", "5", "The next question starts. [2]"],
        ]

    def fake_renderer(_pdf_path, page_indices, *, output_dir):
        out = []
        for page_index in page_indices:
            path = Path(output_dir) / f"page_{page_index + 1}.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"png")
            out.append(path)
        return out

    def fake_request_runner(**_kwargs):
        return {
            "question_number": 4,
            "question_bbox_norm": [0.06, 0.04, 0.8, 0.08],
            "page_indices": [0],
            "ocr_text": "4 (a) Find the sum. [4]",
            "subquestions": ["(a)"],
            "marks": ["[4]"],
            "has_diagram": False,
            "includes_later_question": False,
            "ends_before_next_question": True,
            "confidence": 0.98,
        }

    result = run_pdf_page_item(
        _item(storage_key="9709/s24_qp_13/questions/q04.png", diagram_present=False),
        past_papers_root=pdf_root,
        render_root=tmp_path / "renders",
        model="qwen3-vl-plus",
        text_page_loader=fake_text_loader,
        page_renderer=fake_renderer,
        request_runner=fake_request_runner,
    )

    assert result["candidate_pages"]["page_indices"] == [0, 1]
    assert result["validation"]["status"] == "blocked"
    assert "missing_expected_input_page" in result["validation"]["blockers"]


def test_run_pdf_page_item_returns_blocked_payload_when_locator_fails(tmp_path):
    pdf_root = tmp_path / "past-papers" / "9709Mathematics"
    pdf_path = pdf_root / "paper1" / "9709_s24_qp_13.pdf"
    pdf_path.parent.mkdir(parents=True)
    pdf_path.write_bytes(b"%PDF fake")

    result = run_pdf_page_item(
        _item(),
        past_papers_root=pdf_root,
        render_root=tmp_path / "renders",
        model="qwen3-vl-plus",
        text_page_loader=lambda _pdf_path: [["8 Previous question."], ["10 Later question."]],
    )

    assert result["validation"]["status"] == "blocked"
    assert result["validation"]["blockers"] == ["question_start_not_found"]
    assert result["failure_reason"] == "question_start_not_found"


def test_results_payload_round_trips_with_summary(tmp_path):
    output = tmp_path / "results.json"
    results = [
        {
            "storage_key": "a",
            "validation": {"status": "passed", "warnings": ["thin_question_bbox"]},
            "failure_reason": None,
        },
        {
            "storage_key": "b",
            "validation": {"status": "blocked", "blockers": ["bad_boundary"], "warnings": []},
            "failure_reason": "bad",
        },
    ]

    payload = write_results_payload(output, manifest_id="m1", model="qwen3-vl-plus", results=results)

    assert payload["summary"] == {
        "total": 2,
        "passed": 1,
        "blocked": 1,
        "failures": 1,
        "blocker_counts": {"bad_boundary": 1},
        "warning_counts": {"thin_question_bbox": 1},
    }
    assert load_existing_results(output) == results
    assert json.loads(output.read_text(encoding="utf-8"))["manifest_id"] == "m1"


def test_normalize_question_bbox_converts_single_page_pixel_bbox():
    extraction = {
        "question_bbox_norm": [100, 50, 900, 450],
        "warnings": [],
    }

    normalized = normalize_question_bbox_from_rendered_pages(
        extraction,
        rendered_page_paths=[Path("page.png")],
        image_size_loader=lambda _path: (1000, 500),
    )

    assert normalized["question_bbox_norm"] == [0.1, 0.1, 0.9, 0.9]
    assert normalized["original_question_bbox"] == [100, 50, 900, 450]
    assert "normalized_absolute_question_bbox" in normalized["warnings"]
