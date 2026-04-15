from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.contracts import validate_qwen_wave1_output  # noqa: E402
from scripts.vlm.qwen_lane_runner_v1 import (  # noqa: E402
    build_provider_for_job,
    run_lane_job,
)


def _job(**overrides):
    job = {
        "storage_key": "9709/s20_qp_12/questions/q02.png",
        "route": "ocr_lane",
        "lane": "ocr",
        "provider": "windows-qwen",
        "model": "qwen-vl-ocr",
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
        model = "qwen-vl-ocr"

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
