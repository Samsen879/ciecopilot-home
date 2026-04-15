from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import parse_response  # noqa: E402
from scripts.vlm.contracts import extract_qwen_wave1_provenance  # noqa: E402
from scripts.vlm.qc_stats import (  # noqa: E402
    build_wave1_pilot_rows,
    summarize_wave1_pilot_rows,
)
from scripts.vlm.qc_vlm_spot_check import (  # noqa: E402
    build_wave1_prompt,
    parse_json_response,
    select_wave1_spot_check_rows,
)


def test_extract_qwen_wave1_provenance_supports_lane_payloads_and_nested_raw_json():
    lane_payload = {
        "route": "review_lane",
        "lane": "review",
        "prompt_template_id": "review_specialist",
        "prompt_template_version": "v1",
        "response_schema_version": "v1",
        "region": "dashscope-cn",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "lazy_attach_original_image": True,
        "output": {"summary": None, "warnings": ["requires_review"]},
    }

    nested = {"wave1": {"route": "ocr_lane", "lane": "ocr", "lazy_attach_original_image": False}}

    assert extract_qwen_wave1_provenance(lane_payload) == {
        "route": "review_lane",
        "lane": "review",
        "prompt_template_id": "review_specialist",
        "prompt_template_version": "v1",
        "response_schema_version": "v1",
        "region": "dashscope-cn",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "lazy_attach_original_image": True,
        "summary": None,
        "warnings": ["requires_review"],
    }
    assert extract_qwen_wave1_provenance(nested) == {
        "route": "ocr_lane",
        "lane": "ocr",
        "lazy_attach_original_image": False,
    }


def test_parse_response_attaches_wave1_metadata_additively_without_redefining_descriptor_fields():
    job = {
        "storage_key": "9709/s20_qp_12/questions/q02.png",
        "sha256": "a" * 64,
        "syllabus_code": "9709",
        "session": "s",
        "year": 2020,
        "doc_type": "qp",
        "paper": 1,
        "variant": 2,
        "q_number": 2,
        "subpart": None,
        "extractor_version": "qwen_wave1_v1",
        "provider": "windows-qwen",
        "model": "qwen-vl-ocr",
        "prompt_version": "qwen_wave1_v1",
        "manifest_id": "pilot",
        "manifest_position": 3,
        "route": "ocr_lane",
        "lane": "ocr",
        "prompt_template_id": "ocr_specialist",
        "prompt_template_version": "v1",
        "response_schema_version": "v1",
        "region": "dashscope-cn",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "lazy_attach_original_image": False,
        "decision_reasons": ["text_dominant"],
        "route_hint": "ocr_lane",
        "surface_evidence_status": "resolved_from_primary_asset",
        "gate_critical": False,
        "requires_review": False,
    }

    result = parse_response(
        json.dumps(
            {
                "question_type": "calculation",
                "answer_form": "exact",
                "summary": "Solve the trigonometric equation.",
                "math_expressions_latex": ["\\sin x = 1/2"],
                "variables": ["x"],
                "units": [],
                "diagram_elements": [],
                "confidence": 0.88,
            }
        ),
        job,
    )

    assert result["summary"] == "Solve the trigonometric equation."
    assert result["question_type"] == "calculation"
    assert result["wave1"] == {
        "manifest_id": "pilot",
        "manifest_position": 3,
        "route": "ocr_lane",
        "lane": "ocr",
        "prompt_template_id": "ocr_specialist",
        "prompt_template_version": "v1",
        "response_schema_version": "v1",
        "region": "dashscope-cn",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "lazy_attach_original_image": False,
        "decision_reasons": ["text_dominant"],
        "route_hint": "ocr_lane",
        "surface_evidence_status": "resolved_from_primary_asset",
        "gate_critical": False,
        "requires_review": False,
    }


def test_summarize_wave1_pilot_rows_breaks_out_lane_review_and_surface_counts():
    manifest = {
        "manifest_id": "pilot",
        "items": [
            {
                "storage_key": "9709/a.png",
                "syllabus_code": "9709",
                "year": 2024,
                "session": "s",
                "paper": 1,
                "variant": 1,
                "q_number": 1,
                "primary_topic_path": "9709.p1.trigonometry",
                "route_hint": "ocr_lane",
                "diagram_present": False,
                "formula_dense": True,
                "table_heavy": False,
                "surface_evidence_status": "resolved",
                "gate_critical": False,
                "requires_review": False,
            },
            {
                "storage_key": "9709/b.png",
                "syllabus_code": "9709",
                "year": 2024,
                "session": "s",
                "paper": 3,
                "variant": 1,
                "q_number": 7,
                "primary_topic_path": "9709.p3.integration",
                "route_hint": "review_lane",
                "diagram_present": None,
                "formula_dense": None,
                "table_heavy": None,
                "surface_evidence_status": "unknown_requires_primary_asset_replay",
                "gate_critical": True,
                "requires_review": True,
            },
        ],
    }
    lane_results = [
        {
            "input_asset_id": "9709/a.png",
            "route": "ocr_lane",
            "lane": "ocr",
            "model": "qwen-vl-ocr",
            "lazy_attach_original_image": False,
            "confidence": 0.91,
            "failure_reason": None,
            "output": {
                "summary": "Solve the equation.",
                "warnings": [],
                "evidence": [{"field": "ocr_text", "value": "Solve the equation."}],
            },
        },
        {
            "input_asset_id": "9709/b.png",
            "route": "review_lane",
            "lane": "review",
            "model": "qwen3.6-plus",
            "lazy_attach_original_image": True,
            "confidence": 0.0,
            "failure_reason": None,
            "output": {
                "summary": None,
                "warnings": ["requires_review", "lazy_attach_original_image", "unknown_surface_flags"],
                "evidence": [{"field": "requires_review", "value": True}],
            },
        },
    ]

    rows = build_wave1_pilot_rows(manifest, lane_results)
    summary = summarize_wave1_pilot_rows(rows)

    assert summary["rows_by_lane"] == {"ocr": 1, "review": 1}
    assert summary["rows_by_route"] == {"ocr_lane": 1, "review_lane": 1}
    assert summary["diagram_present"] == {"false": 1, "unknown": 1}
    assert summary["requires_review"] == {"false": 1, "true": 1}
    assert summary["lazy_attach_original_image"] == {"false": 1, "true": 1}
    assert summary["descriptor_readiness"] == {
        "descriptor_candidate": 1,
        "review_bucket": 1,
    }


def test_select_wave1_spot_check_rows_prioritizes_gate_critical_and_diagram_rows():
    rows = [
        {"storage_key": "a", "gate_critical": False, "diagram_present": False, "route": "ocr_lane", "manifest_position": 3},
        {"storage_key": "b", "gate_critical": True, "diagram_present": None, "route": "review_lane", "manifest_position": 1},
        {"storage_key": "c", "gate_critical": False, "diagram_present": True, "route": "diagram_lane", "manifest_position": 2},
    ]

    selected = select_wave1_spot_check_rows(rows, sample_size=2)

    assert [row["storage_key"] for row in selected] == ["b", "c"]


def test_build_wave1_prompt_mentions_lane_route_and_review_posture():
    row = {
        "storage_key": "9709/a.png",
        "route": "review_lane",
        "lane": "review",
        "gate_critical": True,
        "diagram_present": None,
        "requires_review": True,
        "lazy_attach_original_image": True,
        "failure_reason": None,
        "confidence": 0.0,
        "summary": None,
        "warnings": ["requires_review", "unknown_surface_flags"],
        "evidence": [{"field": "requires_review", "value": True}],
    }

    prompt = build_wave1_prompt(row)

    assert "review_lane" in prompt
    assert "requires_review" in prompt
    assert "descriptor_ready|review_bucket|unreadable" in prompt


def test_parse_json_response_strips_invalid_control_characters_from_wave1_review_text():
    raw = (
        '{'
        '"descriptor_readiness":"review_bucket",'
        '"route_verdict":"appropriate",'
        '"review_bucket_verdict":"correct",'
        '"comment":"contains bad control â\\x88\\xa0 character",'
        '"issues":["legibility risk"]'
        '}'
    )

    parsed = parse_json_response(raw)

    assert parsed["descriptor_readiness"] == "review_bucket"
    assert "character" in parsed["comment"]
