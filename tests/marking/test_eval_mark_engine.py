from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.evaluation.eval_mark_engine import evaluate_suite
from scripts.evaluation.validate_marking_blind_set_integrity import compute_integrity


def _case(
    *,
    case_id: str,
    step_texts: list[str],
    rubrics: list[tuple[str, str]],
    gold: dict[str, str | list[str]],
) -> dict:
    steps = [{"step_id": f"s{i+1}", "text": text} for i, text in enumerate(step_texts)]
    rubric_points = [
        {"rubric_id": rid, "mark_label": label, "description": desc}
        for rid, label, desc in rubrics
    ]
    return {
        "case_id": case_id,
        "steps": steps,
        "rubric_points": rubric_points,
        "gold": gold,
        "metadata": {
            "paper": "P3",
            "topic_path": "9709.p3.differentiation.application",
            "storage_key": "outputs/screenshots/9709/paper3/demo.png",
        },
    }


def test_supports_multi_target_gold_and_coverage_penalty():
    case = _case(
        case_id="c1",
        step_texts=["Differentiate the function carefully."],
        rubrics=[
            ("r1", "M1", "differentiate the function carefully"),
            ("r2", "A1", "substitute the value and solve"),
        ],
        gold={"s1": ["r1", "r2"]},
    )
    out = evaluate_suite(
        cases=[case],
        min_confidence=0.40,
        uncertain_margin=0.01,
        step_f1_min=0.0,
        rubric_coverage_f1_min=0.0,
        uncertain_rate_max=1.0,
        parse_fail_rate_max=1.0,
        key_group_f1_min=0.0,
        key_groups=("differentiation",),
    )
    assert out["metrics"]["step_level_f1"] == 1.0
    assert out["metrics"]["rubric_coverage_precision"] == 1.0
    assert out["metrics"]["rubric_coverage_recall"] == 0.5
    assert out["metrics"]["rubric_coverage_f1"] == 2.0 / 3.0


def test_many_to_one_duplicate_hits_are_deduped_in_coverage():
    case = _case(
        case_id="c2",
        step_texts=[
            "Differentiate the curve.",
            "Differentiate the curve using the same derivative rule.",
        ],
        rubrics=[("r1", "M1", "differentiate the curve"), ("r2", "A1", "solve for x")],
        gold={"s1": "r1", "s2": "r1"},
    )
    out = evaluate_suite(
        cases=[case],
        min_confidence=0.35,
        uncertain_margin=0.01,
        step_f1_min=0.0,
        rubric_coverage_f1_min=0.0,
        uncertain_rate_max=1.0,
        parse_fail_rate_max=1.0,
        key_group_f1_min=0.0,
        key_groups=("differentiation",),
    )
    # Step metric counts both aligned steps.
    assert out["totals"]["tp"] == 2
    # Coverage metric dedupes predicted rubric IDs.
    assert out["coverage_totals"]["tp"] == 1
    assert out["coverage_totals"]["fp"] == 0
    assert out["coverage_totals"]["fn"] == 0


def test_integrity_gate_can_block_otherwise_good_score():
    case1 = _case(
        case_id="c3",
        step_texts=["Use trig identity.", "Solve for theta."],
        rubrics=[("r1", "M1", "use trig identity"), ("r2", "A1", "solve for theta")],
        gold={"s1": "r1", "s2": "r2"},
    )
    case2 = _case(
        case_id="c4",
        step_texts=["Use trig identity.", "Solve for theta."],
        rubrics=[("r1", "M1", "use trig identity"), ("r2", "A1", "solve for theta")],
        gold={"s1": "r1", "s2": "r2"},
    )
    integrity = compute_integrity(
        suite_path="dummy.json",
        cases=[case1, case2],
        storage_key_check="none",
        min_storage_key_hit_rate=0.90,
        max_step_dup_rate=0.20,
        max_fixed_order_gold_rate=0.70,
    )
    out = evaluate_suite(
        cases=[case1, case2],
        min_confidence=0.30,
        uncertain_margin=0.01,
        step_f1_min=0.0,
        rubric_coverage_f1_min=0.0,
        uncertain_rate_max=1.0,
        parse_fail_rate_max=1.0,
        key_group_f1_min=0.0,
        key_groups=("differentiation",),
        integrity_result=integrity,
        enforce_integrity_gate=True,
    )
    assert out["metrics"]["step_level_f1"] == 1.0
    assert out["gate"]["integrity"] is False
    assert out["gate"]["integrity_checks"]["step_dup_rate"] is False
    assert out["gate"]["integrity_checks"]["fixed_order_gold_rate"] is False
    assert out["gate"]["pass"] is False
