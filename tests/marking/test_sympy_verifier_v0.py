from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.marking.sympy_verifier_v0 import run_from_payload


def test_equivalent_expression_detected():
    payload = {
        "variable": "x",
        "items": [
            {
                "item_id": "i1",
                "student_expr": "(x-1)*(x+1)",
                "expected_expr": "x^2 - 1",
            }
        ],
    }
    out = run_from_payload(payload)
    assert out["results"][0]["status"] == "equivalent"
    assert out["results"][0]["equivalent"] is True


def test_non_equivalent_expression_detected():
    payload = {
        "variable": "x",
        "items": [{"item_id": "i1", "student_expr": "x+1", "expected_expr": "x-1"}],
    }
    out = run_from_payload(payload)
    assert out["results"][0]["status"] == "not_equivalent"
    assert out["results"][0]["equivalent"] is False


def test_parse_fail_does_not_crash():
    payload = {
        "variable": "x",
        "items": [{"item_id": "i1", "student_expr": "x+(", "expected_expr": "x+1"}],
    }
    out = run_from_payload(payload)
    assert out["results"][0]["status"] == "parse_fail"
    assert out["summary"]["parse_fail"] == 1

