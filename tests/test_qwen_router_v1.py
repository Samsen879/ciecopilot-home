from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.create_jobs_from_manifest import build_manifest_jobs  # noqa: E402
from scripts.vlm.qwen_router_v1 import route_manifest_item  # noqa: E402


def _item(**overrides):
    item = {
        "storage_key": "9709/s20_qp_12/questions/q02.png",
        "syllabus_code": "9709",
        "year": 2020,
        "session": "s",
        "paper": 1,
        "variant": 2,
        "q_number": 2,
        "primary_topic_path": "9709.p1.trigonometry",
        "route_hint": "ocr_lane",
        "diagram_present": False,
        "formula_dense": True,
        "table_heavy": False,
        "surface_evidence_status": "asset_audited",
        "gate_critical": False,
        "requires_review": False,
        "descriptor_required": True,
    }
    item.update(overrides)
    return item


def test_route_manifest_item_prefers_review_lane_for_gate_critical_unknown_surface():
    decision = route_manifest_item(
        _item(
            route_hint="review_lane",
            diagram_present=None,
            formula_dense=None,
            table_heavy=None,
            gate_critical=True,
            requires_review=True,
            surface_evidence_status="unknown_requires_primary_asset_replay",
        )
    )

    assert decision.route == "review_lane"
    assert decision.lane == "review"
    assert decision.model == "qwen3.6-plus"
    assert decision.lazy_attach_original_image is True
    assert decision.enable_thinking is False
    assert decision.response_format == {"type": "json_object"}
    assert "gate_critical" in decision.decision_reasons
    assert "unknown_surface_flags" in decision.decision_reasons


def test_route_manifest_item_selects_diagram_lane_for_evidence_backed_diagram_rows():
    decision = route_manifest_item(
        _item(
            route_hint="diagram_lane",
            paper=3,
            variant=1,
            q_number=8,
            primary_topic_path="9709.p3.trigonometry",
            diagram_present=True,
            formula_dense=False,
            table_heavy=False,
        )
    )

    assert decision.route == "diagram_lane"
    assert decision.lane == "diagram"
    assert decision.model == "qwen3-vl-plus"
    assert decision.lazy_attach_original_image is True
    assert "diagram_present" in decision.decision_reasons


def test_route_manifest_item_selects_ocr_lane_for_formula_dense_text_dominant_rows():
    decision = route_manifest_item(
        _item(
            route_hint="ocr_lane",
            diagram_present=False,
            formula_dense=True,
            table_heavy=False,
        )
    )

    assert decision.route == "ocr_lane"
    assert decision.lane == "ocr"
    assert decision.model == "qwen-vl-ocr"
    assert decision.lazy_attach_original_image is False
    assert "formula_dense" in decision.decision_reasons


def test_build_manifest_jobs_carries_lane_provider_model_and_prompt_metadata():
    jobs = build_manifest_jobs({"manifest_id": "unit-test", "items": [_item(route_hint="diagram_lane", diagram_present=True, formula_dense=False)]})

    assert len(jobs) == 1
    job = jobs[0]
    assert job["route"] == "diagram_lane"
    assert job["lane"] == "diagram"
    assert job["provider"] == "windows-qwen"
    assert job["model"] == "qwen3-vl-plus"
    assert job["prompt_template_id"] == "diagram_specialist"
    assert job["prompt_template_version"] == "v1"
    assert job["response_schema_version"] == "v1"
    assert job["enable_thinking"] is False
    assert job["response_format"] == {"type": "json_object"}
