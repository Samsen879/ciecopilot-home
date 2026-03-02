from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.marking.adjudicator_v0 import adjudicate


def _base_payload():
    return {
        "min_confidence": 0.55,
        "rubric_points": [
            {"rubric_id": "m1", "mark_label": "M1", "kind": "M", "depends_on": []},
            {"rubric_id": "a1", "mark_label": "A1", "kind": "A", "depends_on": ["m1"]},
        ],
        "signals": {
            "m1": {"matched": True, "confidence": 0.90},
            "a1": {"matched": True, "confidence": 0.88},
        },
        "ft": {"enabled": False, "triggered": False},
    }


def test_dependency_chain_awards_a_after_m():
    out = adjudicate(_base_payload())
    dec = {d["rubric_id"]: d for d in out["decisions"]}
    assert dec["m1"]["awarded"] is True
    assert dec["a1"]["awarded"] is True


def test_dependency_blocks_answer_mark():
    payload = _base_payload()
    payload["signals"]["m1"] = {"matched": False, "confidence": 0.10}
    out = adjudicate(payload)
    dec = {d["rubric_id"]: d for d in out["decisions"]}
    assert dec["m1"]["awarded"] is False
    assert dec["a1"]["awarded"] is False
    assert dec["a1"]["reason"] == "dependency_blocked"


def test_ft_default_off_and_explicit_on_behavior():
    payload = _base_payload()
    out = adjudicate(payload)
    dec = {d["rubric_id"]: d for d in out["decisions"]}
    assert dec["a1"]["awarded"] is True

    payload["ft"] = {"enabled": True, "triggered": True}
    out2 = adjudicate(payload)
    dec2 = {d["rubric_id"]: d for d in out2["decisions"]}
    assert dec2["m1"]["awarded"] is True
    assert dec2["a1"]["awarded"] is False
    assert dec2["a1"]["reason"] == "ft_capped"

