from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm import qc_stats as qc_stats_module  # noqa: E402
from scripts.vlm.batch_process_v0 import parse_response  # noqa: E402
from scripts.vlm.contracts import extract_qwen_wave1_provenance  # noqa: E402
from scripts.vlm.qc_stats import (  # noqa: E402
    build_wave1_pilot_rows,
    evaluate_wave_a_thresholds,
    summarize_wave1_pilot_rows,
)
from scripts.vlm.qc_vlm_spot_check import (  # noqa: E402
    build_wave1_prompt,
    compute_wave1_aggregates,
    main,
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
        "model": "qwen3.6-plus",
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
            "model": "qwen3.6-plus",
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


def test_build_wave1_pilot_rows_filters_by_shard_and_tracks_expected_route_metadata():
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
                "difficulty_band": "clean",
                "shard_id": "shard_1",
                "descriptor_required": True,
                "gate_critical": False,
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
                "difficulty_band": "medium",
                "shard_id": "shard_2",
                "descriptor_required": True,
                "gate_critical": True,
            },
        ],
    }
    lane_results = [
        {
            "input_asset_id": "9709/a.png",
            "route": "ocr_lane",
            "lane": "ocr",
            "model": "qwen3.6-plus",
            "output": {"summary": "Solve the equation.", "warnings": [], "evidence": []},
        },
        {
            "input_asset_id": "9709/b.png",
            "route": "review_lane",
            "lane": "review",
            "model": "qwen3.6-plus",
            "output": {"summary": None, "warnings": ["requires_review"], "evidence": []},
        },
    ]

    rows = build_wave1_pilot_rows(manifest, lane_results, shard_id="shard_1")

    assert [row["storage_key"] for row in rows] == ["9709/a.png"]
    assert rows[0]["expected_route"] == "ocr_lane"
    assert rows[0]["route_matches_expected"] is True
    assert rows[0]["difficulty_band"] == "clean"
    assert rows[0]["descriptor_required"] is True


def test_wave1_qc_helpers_report_descriptor_coverage_acceptance_and_threshold_checks():
    rows = [
        {
            "storage_key": "9709/a.png",
            "route": "ocr_lane",
            "expected_route": "ocr_lane",
            "difficulty_band": "clean",
            "descriptor_required": True,
            "descriptor_readiness": "descriptor_candidate",
            "summary": "Descriptor present.",
            "failure_reason": None,
        },
        {
            "storage_key": "9709/b.png",
            "route": "review_lane",
            "expected_route": "ocr_lane",
            "difficulty_band": "medium",
            "descriptor_required": True,
            "descriptor_readiness": "failed",
            "summary": None,
            "failure_reason": "provider timeout",
        },
    ]
    thresholds = {
        "provider_failure_max": 0,
        "unexpected_review_lane_max": {"clean": 0, "medium": 0},
        "route_hint_match_required": {"clean": True, "medium": True},
        "full_review_min_acceptance": 0.9,
    }
    full_review_payload = {
        "records": [
            {
                "storage_key": "9709/a.png",
                "review": {
                    "descriptor_readiness": "descriptor_ready",
                    "route_verdict": "appropriate",
                    "review_bucket_verdict": "correct",
                },
            },
            {
                "storage_key": "9709/b.png",
                "review": {
                    "descriptor_readiness": "review_bucket",
                    "route_verdict": "under_conservative",
                    "review_bucket_verdict": "incorrect",
                },
            },
        ]
    }

    summary = summarize_wave1_pilot_rows(rows)
    threshold_summary = evaluate_wave_a_thresholds(rows, thresholds, full_review_payload=full_review_payload)
    aggregate_summary = compute_wave1_aggregates(full_review_payload["records"])

    assert summary["descriptor_coverage"] == {
        "required_rows": 2,
        "covered_rows": 1,
        "coverage_rate": 0.5,
    }
    assert summary["unexpected_review_fallbacks"] == {"medium": 1}
    assert threshold_summary["provider_failures"] == 1
    assert threshold_summary["full_review_acceptance"] == 0.5
    assert any(check["pass"] is False for check in threshold_summary["threshold_verdicts"])
    assert aggregate_summary["acceptance_summary"] == {
        "accepted_count": 1,
        "reviewed_count": 2,
        "acceptance_rate": 0.5,
    }


def test_collect_stats_loads_wave_a_thresholds_when_thresholds_json_is_provided(tmp_path, monkeypatch):
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
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
                        "difficulty_band": "clean",
                        "route_hint": "ocr_lane",
                        "shard_id": "shard_1",
                        "descriptor_required": True,
                        "gate_critical": False,
                        "requires_review": False,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    lane_results_path = tmp_path / "lane-results.json"
    lane_results_path.write_text(
        json.dumps(
            [
                {
                    "input_asset_id": "9709/a.png",
                    "route": "ocr_lane",
                    "lane": "ocr",
                    "model": "qwen3.6-plus",
                    "failure_reason": None,
                    "output": {
                        "summary": "Solve the equation.",
                        "warnings": [],
                        "evidence": [],
                    },
                }
            ]
        ),
        encoding="utf-8",
    )
    thresholds_path = tmp_path / "thresholds.json"
    thresholds_path.write_text(
        json.dumps(
            {
                "provider_failure_max": 0,
                "unexpected_review_lane_max": {"clean": 0},
                "route_hint_match_required": {"clean": True},
                "full_review_min_acceptance": 0.9,
            }
        ),
        encoding="utf-8",
    )

    class _FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class _FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return _FakeCursor()

    default_row = {
        "total_records": 0,
        "cnt": 0,
        "total_rows": 0,
        "empty_rows": 0,
        "avg_len_non_empty": None,
        "min_confidence": None,
        "max_confidence": None,
        "mean_confidence": None,
        "median_confidence": None,
        "stddev_confidence": None,
    }

    monkeypatch.setattr(qc_stats_module, "get_connection", lambda: _FakeConnection())
    monkeypatch.setattr(qc_stats_module, "query_one", lambda *args, **kwargs: dict(default_row))
    monkeypatch.setattr(qc_stats_module, "query_all", lambda *args, **kwargs: [])

    stats = qc_stats_module.collect_stats(
        manifest_path=manifest_path,
        lane_results_json=lane_results_path,
        shard_id="shard_1",
        thresholds_path=thresholds_path,
    )

    assert stats["wave1_pilot"]["summary"]["total_rows"] == 1
    assert stats["wave1_pilot"]["thresholds"]["provider_failures"] == 0
    assert [check["name"] for check in stats["wave1_pilot"]["thresholds"]["threshold_verdicts"]] == [
        "provider_failures",
        "unexpected_review_fallbacks:clean",
        "route_hint_match:clean",
    ]


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


@pytest.mark.parametrize(
    "argv",
    [
        ["--manifest", "data/manifests/9709_question_search_recovery_v1.json"],
        ["--lane-results-json", "docs/reports/2026-04-16-9709-qwen-wave1-pilot-results.json"],
    ],
)
def test_main_rejects_partial_wave1_cli_flags(argv, capsys):
    with pytest.raises(SystemExit) as exc_info:
        main(argv)

    assert exc_info.value.code == 2
    assert "--manifest and --lane-results-json must be provided together" in capsys.readouterr().err
