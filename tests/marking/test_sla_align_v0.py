from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.marking.sla_align_v0 import DEFAULT_MIN_CONFIDENCE, DEFAULT_UNCERTAIN_MARGIN, run_from_payload
from scripts.marking.marking_semantics_v1 import normalize_uncertain_reason


def test_aligns_clear_quadratic_match():
    payload = {
        "steps": [
            {
                "step_id": "s1",
                "text": "Use the discriminant to find two real roots of the quadratic equation.",
            }
        ],
        "rubric_points": [
            {"rubric_id": "r1", "mark_label": "M1", "description": "Apply discriminant for quadratic roots"},
            {"rubric_id": "r2", "mark_label": "A1", "description": "Correct final numeric roots"},
        ],
    }
    out = run_from_payload(payload, min_confidence=0.55, uncertain_margin=0.15)
    item = out["alignments"][0]
    assert item["rubric_id"] == "r1"
    assert item["status"] in {"aligned", "uncertain"}
    assert item["confidence"] > 0.2
    assert "uncertain_reason" not in item


def test_borderline_score_forced_uncertain():
    payload = {
        "steps": [{"step_id": "s1", "text": "Some weakly related text"}],
        "rubric_points": [{"rubric_id": "r1", "mark_label": "M1", "description": "Unrelated vector operation"}],
    }
    out = run_from_payload(payload, min_confidence=0.30, uncertain_margin=0.30)
    item = out["alignments"][0]
    assert item["status"] == "uncertain"
    assert "uncertain_reason" not in item


def test_no_rubric_points_is_uncertain():
    payload = {
        "steps": [{"step_id": "s1", "text": "Differentiate and set to zero"}],
        "rubric_points": [],
    }
    out = run_from_payload(payload, min_confidence=0.55, uncertain_margin=0.15)
    item = out["alignments"][0]
    assert item["status"] == "uncertain"
    assert item["reason"] == "no_rubric_points"
    assert "uncertain_reason" not in item


def test_optional_uncertain_reason_payload_is_stable():
    payload = {
        "steps": [{"step_id": "s1", "text": "Some weakly related text"}],
        "rubric_points": [{"rubric_id": "r1", "mark_label": "M1", "description": "Unrelated vector operation"}],
    }
    out = run_from_payload(
        payload,
        min_confidence=0.30,
        uncertain_margin=0.30,
        include_uncertain_reason=True,
    )
    item = out["alignments"][0]
    assert item["uncertain_reason"]["is_uncertain"] is True
    assert item["uncertain_reason"]["code"] == normalize_uncertain_reason(item["reason"], awarded=False)


def test_run_from_payload_uses_frozen_defaults():
    payload = {
        "steps": [{"step_id": "s1", "text": "Apply chain rule then simplify"}],
        "rubric_points": [{"rubric_id": "r1", "mark_label": "M1", "description": "apply chain rule"}],
    }
    out = run_from_payload(payload)
    assert out["min_confidence"] == DEFAULT_MIN_CONFIDENCE
    assert out["uncertain_margin"] == DEFAULT_UNCERTAIN_MARGIN
