#!/usr/bin/env python3
"""Tests for the unified A1 quality gate script.

Covers:
- Metric calculation correctness (given known inputs)
- Threshold blocking: gate_pass=true when all met, false when any fails
- JSON output structure validation
- Input snapshot fields present
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.evaluation.eval_a1_topic_link_manual_audit import AuditRow, PredictionRow
from scripts.evaluation.run_a1_quality_gate import (
    THRESHOLDS,
    build_json_summary,
    compute_metrics,
    evaluate_thresholds,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _audit(
    key: str,
    paper: int = 1,
    strategy: str = "keyword_match",
    gold_primary: str = "math/algebra",
    gold_secondary: str = "",
    verdict: str = "correct",
) -> AuditRow:
    return AuditRow(
        storage_key=key,
        paper=paper,
        predicted_strategy_csv=strategy,
        gold_primary_node_path=gold_primary,
        gold_secondary_node_path=gold_secondary,
        verdict=verdict,
    )


def _pred(
    key: str,
    paper: int = 1,
    strategy: str = "keyword_match",
    node_path: str = "math/algebra",
    count: int = 1,
) -> PredictionRow:
    return PredictionRow(
        storage_key=key,
        paper=paper,
        predicted_strategy_db=strategy,
        predicted_primary_node_path=node_path,
        primary_row_count=count,
    )


# ---------------------------------------------------------------------------
# Metric calculation correctness
# ---------------------------------------------------------------------------

class TestComputeMetrics:
    """Verify metric formulas with known inputs."""

    def test_all_correct(self):
        """10 correct rows → precision=1.0, unreadable=0."""
        rows = [_audit(f"q{i}") for i in range(10)]
        preds = {f"q{i}": _pred(f"q{i}") for i in range(10)}
        m = compute_metrics(rows, preds)

        assert m["audited_total"] == 10
        assert m["topic_primary_precision"] == pytest.approx(1.0)
        assert m["non_fallback_precision"] == pytest.approx(1.0)
        assert m["unreadable_ratio"] == pytest.approx(0.0)

    def test_mixed_verdicts(self):
        """8 correct + 1 wrong + 1 unreadable out of 10."""
        rows = [_audit(f"q{i}") for i in range(8)]
        rows.append(_audit("q8", verdict="wrong"))
        rows.append(_audit("q9", verdict="unreadable"))
        preds = {f"q{i}": _pred(f"q{i}") for i in range(10)}

        m = compute_metrics(rows, preds)

        assert m["audited_total"] == 10
        assert m["unreadable_count"] == 1
        # scored_total = 10 - 1 = 9
        # correct=8, fallback_acceptable=0 → precision = 8/9
        assert m["topic_primary_precision"] == pytest.approx(8 / 9)
        assert m["unreadable_ratio"] == pytest.approx(0.1)

    def test_fallback_acceptable_counts_toward_precision(self):
        """fallback_acceptable adds to numerator of topic_primary_precision."""
        rows = [
            _audit("q0", verdict="correct"),
            _audit("q1", verdict="correct"),
            _audit("q2", verdict="fallback_acceptable", strategy="paper_fallback"),
            _audit("q3", verdict="wrong"),
        ]
        preds = {
            "q0": _pred("q0"),
            "q1": _pred("q1"),
            "q2": _pred("q2", strategy="paper_fallback"),
            "q3": _pred("q3"),
        }
        m = compute_metrics(rows, preds)

        # scored_total=4, correct=2, fallback_acceptable=1 → (2+1)/4 = 0.75
        assert m["topic_primary_precision"] == pytest.approx(0.75)

    def test_non_fallback_precision_excludes_paper_fallback(self):
        """paper_fallback rows are excluded from non_fallback_precision."""
        rows = [
            _audit("q0", verdict="correct", strategy="keyword_match"),
            _audit("q1", verdict="wrong", strategy="keyword_match"),
            _audit("q2", verdict="correct", strategy="paper_fallback"),
            _audit("q3", verdict="fallback_acceptable", strategy="paper_fallback"),
        ]
        preds = {
            "q0": _pred("q0", strategy="keyword_match"),
            "q1": _pred("q1", strategy="keyword_match"),
            "q2": _pred("q2", strategy="paper_fallback"),
            "q3": _pred("q3", strategy="paper_fallback"),
        }
        m = compute_metrics(rows, preds)

        # non_fallback: q0 (correct) + q1 (wrong) = total 2, correct 1
        assert m["non_fallback_total"] == 2
        assert m["non_fallback_correct"] == 1
        assert m["non_fallback_precision"] == pytest.approx(0.5)

    def test_empty_predictions(self):
        """Missing predictions → prediction_missing_count incremented."""
        rows = [_audit("q0"), _audit("q1")]
        preds: dict[str, PredictionRow] = {}
        m = compute_metrics(rows, preds)

        assert m["prediction_missing_count"] == 2

    def test_strategy_distribution(self):
        """strategy_distribution aggregates across papers."""
        rows = [
            _audit("q0", paper=1, strategy="keyword_match"),
            _audit("q1", paper=1, strategy="keyword_match"),
            _audit("q2", paper=3, strategy="paper_fallback"),
        ]
        preds = {
            "q0": _pred("q0", strategy="keyword_match"),
            "q1": _pred("q1", strategy="keyword_match"),
            "q2": _pred("q2", strategy="paper_fallback"),
        }
        m = compute_metrics(rows, preds)

        assert m["strategy_distribution"]["keyword_match"] == 2
        assert m["strategy_distribution"]["paper_fallback"] == 1


# ---------------------------------------------------------------------------
# Threshold blocking
# ---------------------------------------------------------------------------

class TestEvaluateThresholds:
    """Verify gate_pass logic against threshold values."""

    def test_all_pass(self):
        metrics = {
            "topic_primary_precision": 0.90,
            "non_fallback_precision": 0.95,
            "unreadable_ratio": 0.02,
        }
        result = evaluate_thresholds(metrics)
        assert result["gate_pass"] is True
        assert result["release_blocked"] is False
        for detail in result["thresholds"].values():
            assert detail["pass"] is True

    def test_topic_primary_precision_fail(self):
        metrics = {
            "topic_primary_precision": 0.80,  # below 0.85
            "non_fallback_precision": 0.95,
            "unreadable_ratio": 0.02,
        }
        result = evaluate_thresholds(metrics)
        assert result["gate_pass"] is False
        assert result["release_blocked"] is True
        assert result["thresholds"]["topic_primary_precision"]["pass"] is False

    def test_non_fallback_precision_fail(self):
        metrics = {
            "topic_primary_precision": 0.90,
            "non_fallback_precision": 0.85,  # below 0.90
            "unreadable_ratio": 0.02,
        }
        result = evaluate_thresholds(metrics)
        assert result["gate_pass"] is False
        assert result["thresholds"]["non_fallback_precision"]["pass"] is False

    def test_unreadable_ratio_fail(self):
        metrics = {
            "topic_primary_precision": 0.90,
            "non_fallback_precision": 0.95,
            "unreadable_ratio": 0.10,  # above 0.05
        }
        result = evaluate_thresholds(metrics)
        assert result["gate_pass"] is False
        assert result["thresholds"]["unreadable_ratio"]["pass"] is False

    def test_boundary_values_pass(self):
        """Exact threshold values should pass."""
        metrics = {
            "topic_primary_precision": 0.85,
            "non_fallback_precision": 0.90,
            "unreadable_ratio": 0.05,
        }
        result = evaluate_thresholds(metrics)
        assert result["gate_pass"] is True

    def test_multiple_failures(self):
        metrics = {
            "topic_primary_precision": 0.50,
            "non_fallback_precision": 0.50,
            "unreadable_ratio": 0.50,
        }
        result = evaluate_thresholds(metrics)
        assert result["gate_pass"] is False
        failed = [k for k, v in result["thresholds"].items() if not v["pass"]]
        assert len(failed) == 3


# ---------------------------------------------------------------------------
# JSON summary structure
# ---------------------------------------------------------------------------

class TestBuildJsonSummary:
    """Verify JSON summary has all required fields."""

    def _make_summary(self, gate_pass: bool = True) -> dict:
        metrics = {
            "audited_total": 20,
            "topic_primary_precision": 0.90,
            "non_fallback_precision": 0.95,
            "unreadable_ratio": 0.02,
            "strategy_distribution": {"keyword_match": 15, "paper_fallback": 5},
        }
        gate_result = {
            "gate_pass": gate_pass,
            "release_blocked": not gate_pass,
            "thresholds": {
                "topic_primary_precision": {"required": 0.85, "actual": 0.90, "pass": True},
                "non_fallback_precision": {"required": 0.90, "actual": 0.95, "pass": True},
                "unreadable_ratio": {"required": 0.05, "actual": 0.02, "pass": True},
            },
        }
        return build_json_summary(
            metrics,
            gate_result,
            input_csv=Path("data/audit.csv"),
            csv_sha256="abc123def456",
            source="a1_keyword_mapper_v1",
            generated_at="2026-02-15T12:00:00+00:00",
        )

    def test_required_fields_present(self):
        s = self._make_summary()
        required = [
            "generated_at_utc",
            "input_csv",
            "input_csv_sha256",
            "source",
            "audited_total",
            "topic_primary_precision",
            "non_fallback_precision",
            "unreadable_ratio",
            "strategy_distribution",
            "gate_pass",
            "release_blocked",
            "thresholds",
        ]
        for field in required:
            assert field in s, f"Missing field: {field}"

    def test_input_snapshot_fields(self):
        """Input snapshot: CSV path, SHA256, source, timestamp."""
        s = self._make_summary()
        assert s["input_csv"] == "data/audit.csv"
        assert s["input_csv_sha256"] == "abc123def456"
        assert s["source"] == "a1_keyword_mapper_v1"
        assert s["generated_at_utc"] == "2026-02-15T12:00:00+00:00"

    def test_threshold_detail_structure(self):
        s = self._make_summary()
        for name in THRESHOLDS:
            detail = s["thresholds"][name]
            assert "required" in detail
            assert "actual" in detail
            assert "pass" in detail

    def test_json_serializable(self):
        """Summary must be JSON-serializable."""
        s = self._make_summary()
        dumped = json.dumps(s)
        loaded = json.loads(dumped)
        assert loaded == s

    def test_gate_fail_reflected(self):
        s = self._make_summary(gate_pass=False)
        assert s["gate_pass"] is False
        assert s["release_blocked"] is True
