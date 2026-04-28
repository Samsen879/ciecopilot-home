from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.contracts import validate_qwen_wave1_output  # noqa: E402
from scripts.vlm.qwen_lane_runner_v1 import (  # noqa: E402
    build_provider_for_job,
    load_existing_results,
    main,
    run_lane_job,
    write_lane_results,
)


def _job(**overrides):
    job = {
        "storage_key": "9709/s20_qp_12/questions/q02.png",
        "route": "ocr_lane",
        "lane": "ocr",
        "provider": "windows-qwen",
        "model": "qwen3.6-plus",
        "prompt_template_id": "ocr_specialist",
        "prompt_template_version": "v1",
        "response_schema_version": "v1",
        "region": "dashscope-cn",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "requires_review": False,
        "lazy_attach_original_image": False,
    }
    job.update(overrides)
    return job


def test_build_provider_for_job_uses_job_lane_metadata():
    provider = build_provider_for_job(_job(route="diagram_lane", lane="diagram", model="qwen3-vl-plus"))

    assert provider.name == "windows-qwen"
    assert provider.lane == "diagram"
    assert provider.model == "qwen3-vl-plus"


def test_run_lane_job_wraps_provider_output_in_wave1_contract(tmp_path):
    image_path = tmp_path / "q02.png"
    image_path.write_bytes(b"fake-image")

    class FakeProvider:
        name = "windows-qwen"
        model = "qwen3.6-plus"

        def generate(self, _image_path):
            return {
                "ocr_text": "Find the value of x.",
                "formula_latex_list": ["x^2=9"],
                "subquestion_blocks": ["(a)"],
                "layout_hints": ["single column"],
                "symbol_inventory": ["x"],
                "table_blocks": [],
                "line_boxes": [],
                "ocr_confidence": 0.82,
            }

    payload = run_lane_job(_job(), image_path=image_path, provider=FakeProvider())

    validate_qwen_wave1_output(payload)
    assert payload["route"] == "ocr_lane"
    assert payload["provider"] == "windows-qwen"
    assert payload["input_asset_hash"] is not None
    assert payload["failure_reason"] is None
    assert payload["output"]["summary"] == "Find the value of x."
    assert any(entry["field"] == "ocr_text" for entry in payload["output"]["evidence"])


def test_run_lane_job_surfaces_provider_failures_in_contract_envelope(tmp_path):
    image_path = tmp_path / "q07.png"
    image_path.write_bytes(b"fake-image")

    class FailingProvider:
        name = "windows-qwen"
        model = "qwen3.6-plus"

        def generate(self, _image_path):
            raise RuntimeError("network timeout")

    payload = run_lane_job(
        _job(
            route="review_lane",
            lane="review",
            model="qwen3.6-plus",
            prompt_template_id="review_specialist",
            lazy_attach_original_image=True,
            requires_review=True,
        ),
        image_path=image_path,
        provider=FailingProvider(),
    )

    validate_qwen_wave1_output(payload)
    assert payload["route"] == "review_lane"
    assert payload["failure_reason"] == "network timeout"
    assert payload["confidence"] == 0.0
    assert payload["output"]["summary"] is None
    assert "lazy_attach_original_image" in payload["output"]["warnings"]


def test_run_lane_job_uses_review_extraction_fields_when_review_summary_is_blank(tmp_path):
    image_path = tmp_path / "q07.png"
    image_path.write_bytes(b"fake-image")

    class ReviewProvider:
        name = "windows-qwen"
        model = "qwen3.6-plus"

        def generate(self, _image_path):
            return {
                "ocr_text": "State the binomial expansion of (1 + x)^5.",
                "formula_latex_list": ["(1+x)^5"],
                "subquestion_blocks": ["(a)"],
                "layout_hints": ["single column"],
                "diagram_present": False,
                "diagram_elements": [],
                "spatial_evidence": [],
                "requires_review": True,
                "review_reasons": ["unknown_surface_flags"],
                "ambiguity_flags": [],
                "review_summary": "",
                "review_confidence": 0.72,
            }

    payload = run_lane_job(
        _job(
            route="review_lane",
            lane="review",
            model="qwen3.6-plus",
            prompt_template_id="review_specialist",
            lazy_attach_original_image=True,
            requires_review=True,
        ),
        image_path=image_path,
        provider=ReviewProvider(),
    )

    validate_qwen_wave1_output(payload)
    assert payload["route"] == "review_lane"
    assert payload["failure_reason"] is None
    assert payload["confidence"] == 0.72
    assert payload["output"]["summary"] == "State the binomial expansion of (1 + x)^5."
    assert any(
        entry["field"] == "formula_latex_list" and entry["value"] == ["(1+x)^5"]
        for entry in payload["output"]["evidence"]
    )


def test_main_loads_project_env_before_running_manifest(capsys):
    with patch("scripts.vlm.qwen_lane_runner_v1.load_project_env") as mock_load_env:
        with patch(
            "scripts.vlm.qwen_lane_runner_v1._build_jobs_from_args",
            return_value=[],
        ):
            exit_code = main([
                "--manifest",
                "data/manifests/9709_question_search_recovery_v1.json",
                "--dry-run",
            ])

    assert exit_code == 0
    mock_load_env.assert_called_once()
    assert "jobs_planned: 0" in capsys.readouterr().out


def test_lane_result_helpers_round_trip_json_array(tmp_path):
    output = tmp_path / "lane-results.json"
    payloads = [
        build_lane_fixture := {
            "input_asset_id": "9709/s20_qp_12/questions/q02.png",
            "failure_reason": None,
        }
    ]

    write_lane_results(output, payloads)

    assert load_existing_results(output) == [build_lane_fixture]


def test_load_existing_results_ignores_invalid_or_non_array_json(tmp_path):
    output = tmp_path / "lane-results.json"
    output.write_text('{"results":[]}', encoding="utf-8")
    assert load_existing_results(output) == []

    output.write_text("{", encoding="utf-8")
    assert load_existing_results(output) == []


def test_main_retry_failures_replaces_failed_existing_payload(tmp_path):
    output = tmp_path / "lane-results.json"
    write_lane_results(
        output,
        [
            {"input_asset_id": "success.png", "failure_reason": None},
            {"input_asset_id": "failed.png", "failure_reason": "timeout"},
        ],
    )
    jobs = [
        _job(storage_key="success.png"),
        _job(storage_key="failed.png"),
    ]
    retried_payload = {"input_asset_id": "failed.png", "failure_reason": None}

    with patch("scripts.vlm.qwen_lane_runner_v1.load_project_env"):
        with patch("scripts.vlm.qwen_lane_runner_v1._build_jobs_from_args", return_value=jobs):
            with patch("scripts.vlm.qwen_lane_runner_v1.run_lane_job", return_value=retried_payload):
                exit_code = main([
                    "--manifest",
                    "manifest.json",
                    "--output",
                    str(output),
                    "--retry-failures",
                ])

    assert exit_code == 0
    assert load_existing_results(output) == [
        {"input_asset_id": "success.png", "failure_reason": None},
        retried_payload,
    ]


def test_main_dry_run_supports_pre_audit_wave_a_manifest(capsys):
    exit_code = main([
        "--manifest",
        "data/manifests/9709_question_search_expansion_wave_a_v1.json",
        "--dry-run",
    ])

    assert exit_code == 0
    output = capsys.readouterr().out
    assert "jobs_planned: 30" in output
    assert "targeted_identities:" in output
    assert "9709/s17_qp_11/questions/q03.png" in output
    assert "9709/w22_qp_32/questions/q07.png" in output


def test_main_dry_run_filters_wave_a_manifest_by_shard(capsys):
    exit_code = main([
        "--manifest",
        "data/manifests/9709_question_search_expansion_wave_a_v1.json",
        "--shard-id",
        "shard_1",
        "--dry-run",
    ])

    assert exit_code == 0
    output = capsys.readouterr().out
    assert "jobs_planned: 10" in output
    assert "shard_id: shard_1" in output
    assert "9709/s17_qp_11/questions/q03.png" in output
    assert "9709/s16_qp_32/questions/q03.png" in output
    assert "9709/m20_qp_32/questions/q05.png" in output
    assert "9709/m24_qp_12/questions/q04.png" not in output
