"""Property-based tests for Stats summary completeness.

# Feature: ms-rubric-extraction, Property 29: 汇总统计完整性

Uses hypothesis to verify:
- For ANY completed batch processing run, the summary contains all required
  keys: total_jobs, done, error, needs_review, api_calls, input_tokens,
  output_tokens, estimated_cost.
- The invariant total_jobs = done + error + needs_review always holds.
- estimated_cost is non-negative.

**Validates: Requirements 7.4**
"""
from __future__ import annotations

import sys
import threading
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_batch_process import Stats


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

_non_neg_int = st.integers(min_value=0, max_value=10_000)
_token_count = st.integers(min_value=0, max_value=1_000_000)

REQUIRED_KEYS = {
    "total_jobs",
    "done",
    "error",
    "needs_review",
    "api_calls",
    "input_tokens",
    "output_tokens",
    "estimated_cost",
}


# ---------------------------------------------------------------------------
# Property 29: 汇总统计完整性
# ---------------------------------------------------------------------------


class TestProperty29SummaryCompleteness:
    """
    **Property 29**: For ANY completed batch processing run, the summary
    should contain total_jobs, done, error, needs_review, api_calls,
    input_tokens, output_tokens, estimated_cost, and
    total_jobs = done + error + needs_review.

    **Validates: Requirements 7.4**
    """

    @given(
        done=_non_neg_int,
        error=_non_neg_int,
        needs_review=_non_neg_int,
        api_calls=_non_neg_int,
        input_tokens=_token_count,
        output_tokens=_token_count,
    )
    @settings(max_examples=100, deadline=None)
    def test_summary_contains_all_required_keys_and_invariant(
        self,
        done: int,
        error: int,
        needs_review: int,
        api_calls: int,
        input_tokens: int,
        output_tokens: int,
    ):
        """Summary has all required keys and total_jobs = done + error + needs_review."""
        stats = Stats()
        total_jobs = done + error + needs_review

        # Set counters via increment (the production code path)
        stats.increment("done", done)
        stats.increment("error", error)
        stats.increment("needs_review", needs_review)
        stats.increment("total_jobs", total_jobs)
        stats.increment("api_calls", api_calls)
        stats.increment("input_tokens", input_tokens)
        stats.increment("output_tokens", output_tokens)

        summary = stats.get_summary()

        # 1. All required keys present
        assert REQUIRED_KEYS.issubset(
            summary.keys()
        ), f"Missing keys: {REQUIRED_KEYS - summary.keys()}"

        # 2. Invariant: total_jobs = done + error + needs_review
        assert summary["total_jobs"] == summary["done"] + summary["error"] + summary["needs_review"]

        # 3. Values match what we set
        assert summary["total_jobs"] == total_jobs
        assert summary["done"] == done
        assert summary["error"] == error
        assert summary["needs_review"] == needs_review
        assert summary["api_calls"] == api_calls
        assert summary["input_tokens"] == input_tokens
        assert summary["output_tokens"] == output_tokens

        # 4. estimated_cost is non-negative
        assert summary["estimated_cost"] >= 0

    @given(
        done=_non_neg_int,
        error=_non_neg_int,
        needs_review=_non_neg_int,
        input_tokens=_token_count,
        output_tokens=_token_count,
    )
    @settings(max_examples=100, deadline=None)
    def test_summary_cost_is_consistent_with_tokens(
        self,
        done: int,
        error: int,
        needs_review: int,
        input_tokens: int,
        output_tokens: int,
    ):
        """estimated_cost should be proportional to token counts and non-negative."""
        stats = Stats()
        stats.increment("done", done)
        stats.increment("error", error)
        stats.increment("needs_review", needs_review)
        stats.increment("total_jobs", done + error + needs_review)
        stats.increment("input_tokens", input_tokens)
        stats.increment("output_tokens", output_tokens)

        summary = stats.get_summary()

        # Cost must be non-negative
        assert summary["estimated_cost"] >= 0.0

        # Zero tokens -> zero cost
        if input_tokens == 0 and output_tokens == 0:
            assert summary["estimated_cost"] == 0.0

    @given(
        num_threads=st.integers(min_value=2, max_value=8),
        increments_per_thread=st.integers(min_value=1, max_value=50),
    )
    @settings(max_examples=100, deadline=None)
    def test_thread_safe_increments_preserve_invariant(
        self,
        num_threads: int,
        increments_per_thread: int,
    ):
        """Concurrent increments from multiple threads preserve the invariant."""
        stats = Stats()
        barrier = threading.Barrier(num_threads)

        def worker(status_field: str):
            barrier.wait()
            for _ in range(increments_per_thread):
                stats.increment(status_field, 1)
                stats.increment("total_jobs", 1)

        # Distribute threads across done/error/needs_review
        status_fields = ["done", "error", "needs_review"]
        threads = []
        for i in range(num_threads):
            field = status_fields[i % len(status_fields)]
            t = threading.Thread(target=worker, args=(field,))
            threads.append(t)

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        summary = stats.get_summary()

        # All required keys present
        assert REQUIRED_KEYS.issubset(summary.keys())

        # Invariant holds after concurrent updates
        assert summary["total_jobs"] == summary["done"] + summary["error"] + summary["needs_review"]

        # Total should equal num_threads * increments_per_thread
        assert summary["total_jobs"] == num_threads * increments_per_thread
