"""Property-based tests for compute_sample_size() in qc_sampler.py.

# Feature: ms-rubric-extraction, Property 24: 分层抽样大小

Uses hypothesis to verify:
- Sample size equals max(80, ceil(0.05 * ready_rows)) for positive inputs
- Sample size is always >= 80 (the minimum)
- Sample size is always >= ceil(0.05 * ready_rows) for positive inputs
- Zero and negative inputs return the minimum (80)
- Boundary at 1600 where 0.05 * 1600 = 80

**Validates: Requirements 6.1**
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.qc_sampler import compute_sample_size


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Positive row counts (typical usage)
_positive_rows = st.integers(min_value=1, max_value=10_000_000)

# Non-negative row counts (includes zero)
_non_negative_rows = st.integers(min_value=0, max_value=10_000_000)

# All integers including negatives (edge cases)
_any_rows = st.integers(min_value=-1_000_000, max_value=10_000_000)


# ---------------------------------------------------------------------------
# Property 24: 分层抽样大小
# ---------------------------------------------------------------------------


class TestProperty24StratifiedSampleSize:
    """
    **Property 24**: For ANY ready dataset, the QC sample count must equal
    ``max(80, ceil(0.05 * ready_rows))``, and the sample must cover all
    ``syllabus_code/session/paper`` strata.

    This test class validates the pure ``compute_sample_size`` function.

    **Validates: Requirements 6.1**
    """

    @given(ready_rows=_positive_rows)
    @settings(max_examples=100)
    def test_sample_size_matches_formula(self, ready_rows: int):
        """For any positive ready_rows, result == max(80, ceil(0.05 * ready_rows))."""
        expected = max(80, math.ceil(0.05 * ready_rows))
        actual = compute_sample_size(ready_rows)
        assert actual == expected, (
            f"ready_rows={ready_rows}: expected {expected}, got {actual}"
        )

    @given(ready_rows=_any_rows)
    @settings(max_examples=100)
    def test_sample_size_always_at_least_minimum(self, ready_rows: int):
        """For any input (including zero and negatives), result >= 80."""
        actual = compute_sample_size(ready_rows)
        assert actual >= 80, (
            f"ready_rows={ready_rows}: sample size {actual} < minimum 80"
        )

    @given(ready_rows=_positive_rows)
    @settings(max_examples=100)
    def test_sample_size_at_least_five_percent(self, ready_rows: int):
        """For any positive ready_rows, result >= ceil(0.05 * ready_rows)."""
        five_pct = math.ceil(0.05 * ready_rows)
        actual = compute_sample_size(ready_rows)
        assert actual >= five_pct, (
            f"ready_rows={ready_rows}: sample size {actual} < 5% ceiling {five_pct}"
        )

    @given(ready_rows=st.integers(min_value=-1_000_000, max_value=0))
    @settings(max_examples=100)
    def test_zero_and_negative_return_minimum(self, ready_rows: int):
        """For zero or negative ready_rows, result is exactly 80."""
        actual = compute_sample_size(ready_rows)
        assert actual == 80, (
            f"ready_rows={ready_rows}: expected 80, got {actual}"
        )

    def test_boundary_at_1600(self):
        """At ready_rows=1600, 0.05*1600=80 exactly, so result is 80."""
        assert compute_sample_size(1600) == 80

    def test_boundary_at_1601(self):
        """At ready_rows=1601, ceil(0.05*1601)=81 > 80, so result is 81."""
        assert compute_sample_size(1601) == 81

    @given(ready_rows=_positive_rows)
    @settings(max_examples=100)
    def test_result_is_integer(self, ready_rows: int):
        """Result is always an integer."""
        actual = compute_sample_size(ready_rows)
        assert isinstance(actual, int), (
            f"ready_rows={ready_rows}: result type is {type(actual)}, expected int"
        )
