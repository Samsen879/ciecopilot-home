"""Property-based tests for check_thresholds() in qc_sampler.py.

# Feature: ms-rubric-extraction, Property 26: 阈值通过/失败判定

Uses hypothesis to verify:
- All metrics at or above thresholds -> passed=True, release_status='release_ok'
- Any single metric failing -> passed=False, release_status='release_blocked'
- All metrics failing -> passed=False, release_status='release_blocked'
- Boundary values (exactly at threshold) pass correctly

**Validates: Requirements 6.3**
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.qc_sampler import check_thresholds


# ---------------------------------------------------------------------------
# Thresholds (mirrored from implementation for manual verification)
# ---------------------------------------------------------------------------

_THRESHOLDS = {
    "mark_label_accuracy": (">=", 0.90),
    "dependency_resolution_rate": (">=", 0.95),
    "needs_review_rate": ("<=", 0.20),
    "ft_default_compliance": ("=", 1.00),
}

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Metric values in [0.0, 1.0]
_metric_value = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)

# Metrics that ALL pass thresholds
_passing_metrics = st.fixed_dictionaries({
    "mark_label_accuracy": st.floats(min_value=0.90, max_value=1.0, allow_nan=False, allow_infinity=False),
    "dependency_resolution_rate": st.floats(min_value=0.95, max_value=1.0, allow_nan=False, allow_infinity=False),
    "needs_review_rate": st.floats(min_value=0.0, max_value=0.20, allow_nan=False, allow_infinity=False),
    "ft_default_compliance": st.just(1.00),
})

# Random metrics (may pass or fail)
_random_metrics = st.fixed_dictionaries({
    "mark_label_accuracy": _metric_value,
    "dependency_resolution_rate": _metric_value,
    "needs_review_rate": _metric_value,
    "ft_default_compliance": _metric_value,
})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _metric_passes(name: str, value: float) -> bool:
    """Manually compute whether a single metric passes its threshold."""
    op, threshold = _THRESHOLDS[name]
    if op == ">=":
        return value >= threshold
    elif op == "<=":
        return value <= threshold
    elif op == "=":
        return abs(value - threshold) < 1e-9
    return False


def _all_pass(metrics: dict) -> bool:
    """Manually compute whether all metrics pass."""
    return all(_metric_passes(k, v) for k, v in metrics.items() if k in _THRESHOLDS)


# ---------------------------------------------------------------------------
# Property 26: 阈值通过/失败判定
# ---------------------------------------------------------------------------


class TestProperty26ThresholdDecision:
    """
    **Property 26**: For ANY metric combination, the result is ``passed=True``
    and ``release_status='release_ok'`` if and only if ALL metrics meet their
    thresholds (accuracy>=0.90, resolution>=0.95, review<=0.20,
    ft_compliance=1.00). Otherwise the result is ``passed=False`` and
    ``release_status='release_blocked'``.

    **Validates: Requirements 6.3**
    """

    @given(metrics=_passing_metrics)
    @settings(max_examples=100)
    def test_all_pass_yields_release_ok(self, metrics: dict):
        """When all metrics meet thresholds, passed=True and release_ok."""
        result = check_thresholds(metrics)
        assert result["passed"] is True, (
            f"Expected passed=True for {metrics}, got {result}"
        )
        assert result["release_status"] == "release_ok", (
            f"Expected release_ok for {metrics}, got {result['release_status']}"
        )
        assert result["blocked_reasons"] == [], (
            f"Expected no blocked_reasons, got {result['blocked_reasons']}"
        )

    @given(metrics=_random_metrics)
    @settings(max_examples=100)
    def test_passed_iff_all_thresholds_met(self, metrics: dict):
        """For any metric combination, passed == (all thresholds met)."""
        result = check_thresholds(metrics)
        expected_passed = _all_pass(metrics)
        assert result["passed"] is expected_passed, (
            f"metrics={metrics}: expected passed={expected_passed}, "
            f"got passed={result['passed']}, details={result['details']}"
        )

    @given(metrics=_random_metrics)
    @settings(max_examples=100)
    def test_release_status_matches_passed(self, metrics: dict):
        """release_status is 'release_ok' iff passed, else 'release_blocked'."""
        result = check_thresholds(metrics)
        if result["passed"]:
            assert result["release_status"] == "release_ok"
        else:
            assert result["release_status"] == "release_blocked"

    @given(metrics=_random_metrics)
    @settings(max_examples=100)
    def test_blocked_reasons_nonempty_when_failed(self, metrics: dict):
        """When passed=False, blocked_reasons must be non-empty."""
        result = check_thresholds(metrics)
        if not result["passed"]:
            assert len(result["blocked_reasons"]) > 0, (
                f"passed=False but blocked_reasons is empty for {metrics}"
            )

    @given(metrics=_random_metrics)
    @settings(max_examples=100)
    def test_details_contain_all_metrics(self, metrics: dict):
        """Details dict must contain an entry for every threshold metric."""
        result = check_thresholds(metrics)
        for name in _THRESHOLDS:
            assert name in result["details"], (
                f"Missing detail for {name}"
            )
            detail = result["details"][name]
            assert "value" in detail
            assert "threshold" in detail
            assert "operator" in detail
            assert "passed" in detail

    # --- Single metric failure tests ---

    @given(
        good=_passing_metrics,
        bad_accuracy=st.floats(min_value=0.0, max_value=0.8999999, allow_nan=False, allow_infinity=False),
    )
    @settings(max_examples=100)
    def test_single_fail_accuracy_blocks(self, good: dict, bad_accuracy: float):
        """If only accuracy fails, result is release_blocked."""
        metrics = {**good, "mark_label_accuracy": bad_accuracy}
        result = check_thresholds(metrics)
        assert result["passed"] is False
        assert result["release_status"] == "release_blocked"

    @given(
        good=_passing_metrics,
        bad_resolution=st.floats(min_value=0.0, max_value=0.9499999, allow_nan=False, allow_infinity=False),
    )
    @settings(max_examples=100)
    def test_single_fail_resolution_blocks(self, good: dict, bad_resolution: float):
        """If only resolution fails, result is release_blocked."""
        metrics = {**good, "dependency_resolution_rate": bad_resolution}
        result = check_thresholds(metrics)
        assert result["passed"] is False
        assert result["release_status"] == "release_blocked"

    @given(
        good=_passing_metrics,
        bad_review=st.floats(min_value=0.2000001, max_value=1.0, allow_nan=False, allow_infinity=False),
    )
    @settings(max_examples=100)
    def test_single_fail_review_blocks(self, good: dict, bad_review: float):
        """If only needs_review_rate fails, result is release_blocked."""
        metrics = {**good, "needs_review_rate": bad_review}
        result = check_thresholds(metrics)
        assert result["passed"] is False
        assert result["release_status"] == "release_blocked"

    @given(
        good=_passing_metrics,
        bad_ft=st.floats(min_value=0.0, max_value=0.9999999, allow_nan=False, allow_infinity=False),
    )
    @settings(max_examples=100)
    def test_single_fail_ft_compliance_blocks(self, good: dict, bad_ft: float):
        """If only ft_compliance fails (not exactly 1.0), result is release_blocked."""
        assume(abs(bad_ft - 1.0) >= 1e-9)  # ensure it actually fails
        metrics = {**good, "ft_default_compliance": bad_ft}
        result = check_thresholds(metrics)
        assert result["passed"] is False
        assert result["release_status"] == "release_blocked"

    # --- Boundary tests ---

    def test_boundary_all_exact_thresholds_pass(self):
        """Exactly at all thresholds should pass."""
        metrics = {
            "mark_label_accuracy": 0.90,
            "dependency_resolution_rate": 0.95,
            "needs_review_rate": 0.20,
            "ft_default_compliance": 1.00,
        }
        result = check_thresholds(metrics)
        assert result["passed"] is True
        assert result["release_status"] == "release_ok"

    def test_boundary_accuracy_just_below(self):
        """Accuracy just below 0.90 should fail."""
        metrics = {
            "mark_label_accuracy": 0.8999999999,
            "dependency_resolution_rate": 0.95,
            "needs_review_rate": 0.20,
            "ft_default_compliance": 1.00,
        }
        result = check_thresholds(metrics)
        assert result["passed"] is False

    def test_boundary_review_just_above(self):
        """needs_review_rate just above 0.20 should fail."""
        metrics = {
            "mark_label_accuracy": 0.90,
            "dependency_resolution_rate": 0.95,
            "needs_review_rate": 0.2000000001,
            "ft_default_compliance": 1.00,
        }
        result = check_thresholds(metrics)
        assert result["passed"] is False

    # --- All fail ---

    def test_all_metrics_fail(self):
        """When all metrics fail, result is release_blocked with 4 reasons."""
        metrics = {
            "mark_label_accuracy": 0.50,
            "dependency_resolution_rate": 0.50,
            "needs_review_rate": 0.80,
            "ft_default_compliance": 0.50,
        }
        result = check_thresholds(metrics)
        assert result["passed"] is False
        assert result["release_status"] == "release_blocked"
        assert len(result["blocked_reasons"]) == 4
