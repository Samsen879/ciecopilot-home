from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.providers import WindowsHostQwenProvider, get_provider  # noqa: E402


def test_get_provider_returns_windows_host_qwen_provider():
    provider = get_provider("windows-qwen", "qwen3.6-plus", lane="ocr")

    assert isinstance(provider, WindowsHostQwenProvider)
    assert provider.name == "windows-qwen"
    assert provider.model == "qwen3.6-plus"
    assert provider.lane == "ocr"


def test_windows_host_qwen_provider_calls_wrapper_with_ocr_lane_contract_and_normalizes_empty_fields(tmp_path):
    image_path = tmp_path / "q02.png"
    image_path.write_bytes(b"fake-image")

    captured = {}

    def fake_call(request, **kwargs):
        captured["request"] = request
        return {
            "choices": [
                {
                    "message": {
                        "content": '{"ocr_text":"","formula_latex_list":"","subquestion_blocks":"","layout_hints":"","symbol_inventory":[],"table_blocks":"","line_boxes":"","ocr_confidence":""}'
                    }
                }
            ]
        }

    provider = WindowsHostQwenProvider(model="qwen3.6-plus", lane="ocr")

    with patch("scripts.vlm.providers.call_qwen_openai_v1", side_effect=fake_call):
        result = provider.generate(image_path)

    assert captured["request"]["model"] == "qwen3.6-plus"
    assert captured["request"]["max_tokens"] == 768
    assert captured["request"]["enable_thinking"] is False
    assert captured["request"]["response_format"] == {"type": "json_object"}
    prompt_text = captured["request"]["messages"][0]["content"][0]["text"]
    assert "ocr_text" in prompt_text
    assert "line_boxes" not in prompt_text
    assert "table_blocks" not in prompt_text
    assert "symbol_inventory" not in prompt_text
    assert "question_type" not in prompt_text
    assert captured["request"]["messages"][0]["content"][1] == {
        "type": "image_path",
        "image_path": str(image_path),
    }
    assert result == {
        "ocr_text": "",
        "formula_latex_list": [],
        "subquestion_blocks": [],
        "layout_hints": [],
        "symbol_inventory": [],
        "table_blocks": [],
        "line_boxes": [],
        "ocr_confidence": 0.0,
    }


def test_windows_host_qwen_provider_builds_diagram_lane_contract(tmp_path):
    image_path = tmp_path / "q02.png"
    image_path.write_bytes(b"fake-image")

    captured = {}

    def fake_call(request, **kwargs):
        captured["request"] = request
        return {
            "choices": [
                {
                    "message": {
                        "content": '{"diagram_present":true,"diagram_type":"graph","diagram_elements":["curve"],"axes_labels":["x","y"],"curve_point_annotations":[],"shape_relations":[],"object_grounding":[],"spatial_evidence":[],"diagram_confidence":0.9}'
                    }
                }
            ]
        }

    provider = WindowsHostQwenProvider(model="qwen3-vl-plus", lane="diagram")

    with patch("scripts.vlm.providers.call_qwen_openai_v1", side_effect=fake_call):
        result = provider.generate(image_path)

    prompt_text = captured["request"]["messages"][0]["content"][0]["text"]
    assert "diagram_present" in prompt_text
    assert "ocr_text" not in prompt_text
    assert result["diagram_present"] is True
    assert result["diagram_type"] == "graph"


def test_windows_host_qwen_provider_builds_review_lane_contract_and_normalizes_minimal_extraction(tmp_path):
    image_path = tmp_path / "q06.png"
    image_path.write_bytes(b"fake-image")

    captured = {}

    def fake_call(request, **kwargs):
        captured["request"] = request
        return {
            "choices": [
                {
                    "message": {
                        "content": '{"ocr_text":"Find the coordinates of the turning point.","formula_latex_list":["y=(x-1)^2-4"],"subquestion_blocks":["(a)"],"layout_hints":["single column"],"diagram_present":false,"diagram_elements":[],"spatial_evidence":[],"requires_review":true,"review_reasons":["gate_critical"],"ambiguity_flags":["unknown_surface"],"review_summary":"Needs specialist review","review_confidence":0.65}'
                    }
                }
            ]
        }

    provider = WindowsHostQwenProvider(model="qwen3.6-plus", lane="review")

    with patch("scripts.vlm.providers.call_qwen_openai_v1", side_effect=fake_call):
        result = provider.generate(image_path)

    assert captured["request"]["max_tokens"] == 768
    prompt_text = captured["request"]["messages"][0]["content"][0]["text"]
    assert "requires_review" in prompt_text
    assert "ocr_text" in prompt_text
    assert "formula_latex_list" in prompt_text
    assert "question_type" not in prompt_text
    assert result["ocr_text"] == "Find the coordinates of the turning point."
    assert result["formula_latex_list"] == ["y=(x-1)^2-4"]
    assert result["diagram_present"] is False
    assert result["requires_review"] is True
    assert result["review_summary"] == "Needs specialist review"


def test_windows_host_qwen_provider_rejects_non_json_wrapper_output(tmp_path):
    image_path = tmp_path / "q02.png"
    image_path.write_bytes(b"fake-image")

    provider = WindowsHostQwenProvider(model="qwen3.6-plus", lane="ocr")

    with patch(
        "scripts.vlm.providers.call_qwen_openai_v1",
        return_value={"choices": [{"message": {"content": "not-json"}}]},
    ):
        try:
            provider.generate(image_path)
        except ValueError as exc:
            assert "valid JSON object" in str(exc)
        else:
            raise AssertionError("Expected ValueError for non-JSON wrapper output")
