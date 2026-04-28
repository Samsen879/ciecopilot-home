from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.run_pdf_page_chain_batch_evaluator_v1 import (  # noqa: E402
    build_batch_report,
    default_pdf_output_path,
    rebuild_payload_from_page_results,
    run_batch_evaluator,
    run_payload_evaluator,
    summarize_page_chain_payload,
)


def _payload(pdf_path: str, *, status: str = "passed", blockers=None, warnings=None, questions=10):
    return {
        "schema_version": "pdf_page_chain_extraction_v1",
        "pdf_path": pdf_path,
        "model": "qwen3-vl-plus",
        "total_pages": 20,
        "processed_pages": 20,
        "questions": [
            {"q_number": index + 1, "page_indices": [index + 1], "ocr_text": f"Question {index + 1}"}
            for index in range(questions)
        ],
        "validation": {
            "status": status,
            "blockers": blockers or [],
            "warnings": warnings or [],
        },
    }


def test_summarize_page_chain_payload_counts_questions_and_validation():
    summary = summarize_page_chain_payload(_payload("paper.pdf", warnings=["subpart_mark_count_mismatch"]))

    assert summary == {
        "pdf_path": "paper.pdf",
        "status": "passed",
        "question_count": 10,
        "processed_pages": 20,
        "total_pages": 20,
        "blockers": [],
        "warnings": ["subpart_mark_count_mismatch"],
    }


def test_summarize_page_chain_payload_recomputes_missing_validation():
    payload = _payload("legacy.pdf")
    payload.pop("validation")

    summary = summarize_page_chain_payload(payload)

    assert summary["status"] == "passed"
    assert summary["blockers"] == []


def test_build_batch_report_aggregates_blockers_and_warnings():
    report = build_batch_report(
        [
            summarize_page_chain_payload(_payload("a.pdf")),
            summarize_page_chain_payload(
                _payload("b.pdf", status="blocked", blockers=["question_number_gap"], warnings=["x"])
            ),
        ],
        model="qwen3-vl-plus",
    )

    assert report["summary"] == {
        "total_pdfs": 2,
        "passed_pdfs": 1,
        "blocked_pdfs": 1,
        "warning_pdfs": 1,
        "blocker_counts": {"question_number_gap": 1},
        "warning_counts": {"x": 1},
    }


def test_run_batch_evaluator_reuses_existing_payload(tmp_path):
    pdf = tmp_path / "9709_s24_qp_33.pdf"
    pdf.write_text("fake", encoding="utf-8")
    output_root = tmp_path / "outputs"
    output_path = default_pdf_output_path(output_root, pdf)
    output_path.parent.mkdir(parents=True)
    output_path.write_text(json.dumps(_payload(str(pdf), questions=11)), encoding="utf-8")
    report_path = tmp_path / "report.json"

    calls = []

    report = run_batch_evaluator(
        pdf_paths=[pdf],
        output_root=output_root,
        render_root=tmp_path / "renders",
        report_path=report_path,
        model="qwen3-vl-plus",
        reuse_existing=True,
        runner=lambda **kwargs: calls.append(kwargs) or _payload(str(pdf)),
    )

    assert calls == []
    assert report["summary"]["passed_pdfs"] == 1
    assert report["items"][0]["question_count"] == 11
    assert json.loads(report_path.read_text(encoding="utf-8")) == report


def test_run_batch_evaluator_runs_missing_payload(tmp_path):
    pdf = tmp_path / "9709_s18_qp_41.pdf"
    pdf.write_text("fake", encoding="utf-8")
    report_path = tmp_path / "report.json"

    def fake_runner(**kwargs):
        assert kwargs["pdf_path"] == pdf
        assert kwargs["output"] == default_pdf_output_path(tmp_path / "outputs", pdf)
        return _payload(str(pdf), questions=7)

    report = run_batch_evaluator(
        pdf_paths=[pdf],
        output_root=tmp_path / "outputs",
        render_root=tmp_path / "renders",
        report_path=report_path,
        model="qwen3-vl-plus",
        reuse_existing=True,
        runner=fake_runner,
    )

    assert report["items"][0]["question_count"] == 7
    assert report["summary"]["passed_pdfs"] == 1


def test_run_payload_evaluator_summarizes_existing_payload_files(tmp_path):
    payload_path = tmp_path / "existing_v3.json"
    payload_path.write_text(json.dumps(_payload("existing.pdf", questions=10)), encoding="utf-8")
    report_path = tmp_path / "report.json"

    report = run_payload_evaluator(
        payload_paths=[payload_path],
        report_path=report_path,
        model="qwen3-vl-plus",
    )

    assert report["summary"]["total_pdfs"] == 1
    assert report["items"][0]["payload_path"] == str(payload_path)
    assert json.loads(report_path.read_text(encoding="utf-8")) == report


def test_rebuild_payload_from_page_results_uses_current_normalization(tmp_path):
    pdf = tmp_path / "paper.pdf"
    pdf.write_text("fake", encoding="utf-8")
    payload = {
        "schema_version": "pdf_page_chain_extraction_v1",
        "pdf_path": str(pdf),
        "model": "qwen3-vl-plus",
        "total_pages": 2,
        "processed_pages": 2,
        "page_results": [
            {
                "page_index": 0,
                "fragments": [
                    {
                        "q_number": 4,
                        "fragment_kind": "new_question",
                        "ocr_text": "4 (a) Find x. [2]",
                        "subpart_labels": ["(a)"],
                        "marks": [2],
                    }
                ],
                "carry_state": {"open_q_number": 4, "last_seen_q_number": 4},
            },
            {
                "page_index": 1,
                "fragments": [
                    {
                        "q_number": 2,
                        "fragment_kind": "new_question",
                        "ocr_text": "(b) Find y. [3]",
                        "subpart_labels": ["(b)"],
                        "marks": [3],
                    }
                ],
                "carry_state": {"open_q_number": 2, "last_seen_q_number": 2},
            },
        ],
    }

    rebuilt = rebuild_payload_from_page_results(
        payload,
        text_page_loader=lambda _path: [
            ["1", "4", "(a) Find x. [2]"],
            ["2", "(b) Find y. [3]"],
        ],
    )

    assert [question["q_number"] for question in rebuilt["questions"]] == [4]
    assert rebuilt["questions"][0]["subpart_labels"] == ["(a)", "(b)"]
