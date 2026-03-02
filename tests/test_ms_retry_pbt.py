"""Property-based tests for call_ms_vlm_with_retry() in ms_vlm_call.py.

# Feature: ms-rubric-extraction, Property 7: 可重试错误的退避重试

Uses hypothesis to verify:
- For ANY sequence of K HTTP 429 failures followed by a success (K < max_retries),
  the system returns the successful result.
- time.sleep is called K times with correct exponential backoff delays:
  base_delay * 2^attempt + jitter (where jitter is mocked to a fixed value).

**Validates: Requirements 2.4**
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_vlm_call import call_ms_vlm_with_retry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_rate_limit_error():
    """Create a mock exception that looks like an HTTP 429 rate-limit error."""
    exc = Exception("Rate limit exceeded")
    exc.status_code = 429
    return exc


def _make_success_result(raw_text: str = '{"rubric_points": []}'):
    """Build a successful VLM call result dict."""
    return {
        "raw_text": raw_text,
        "input_tokens": 100,
        "output_tokens": 50,
    }


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

MAX_RETRIES = 5

# K: number of 429 failures before success, 0 <= K < max_retries
_num_failures = st.integers(min_value=0, max_value=MAX_RETRIES - 1)

# base_delay: positive float for backoff base
_base_delay = st.floats(min_value=0.1, max_value=10.0, allow_nan=False, allow_infinity=False)

# fixed jitter value to mock random.uniform(0, 1)
_jitter = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)


# ---------------------------------------------------------------------------
# Property 7: 可重试错误的退避重试
# ---------------------------------------------------------------------------


class TestProperty7RetryableErrorBackoff:
    """
    **Property 7**: For ANY sequence of K HTTP 429 failures (K < max_retries)
    followed by a successful API call, the system should:
    1. Eventually return the successful result
    2. Call time.sleep exactly K times
    3. Each sleep delay matches base_delay * 2^attempt + jitter

    **Validates: Requirements 2.4**
    """

    @given(k=_num_failures, base_delay=_base_delay, jitter=_jitter)
    @settings(max_examples=100, deadline=None)
    def test_retry_returns_success_after_k_failures(
        self, k: int, base_delay: float, jitter: float
    ):
        """After K retryable 429 errors, the K+1 call succeeds and returns the result."""
        success_result = _make_success_result()
        rate_limit_error = _make_rate_limit_error()

        # Build side_effect: K failures then 1 success
        side_effects: list = [rate_limit_error] * k + [success_result]

        with (
            patch("scripts.ms.ms_vlm_call.call_ms_vlm", side_effect=side_effects) as mock_call,
            patch("scripts.ms.ms_vlm_call.time.sleep") as mock_sleep,
            patch("scripts.ms.ms_vlm_call.random.uniform", return_value=jitter),
        ):
            result = call_ms_vlm_with_retry(
                image_path=Path("/fake/image.png"),
                job={"job_id": "test"},
                client=MagicMock(),
                config=MagicMock(model="qwen-vl-max"),
                max_retries=MAX_RETRIES,
                base_delay=base_delay,
            )

            # 1. Should return the successful result
            assert result == success_result

            # 2. call_ms_vlm should be called exactly K+1 times
            assert mock_call.call_count == k + 1

            # 3. time.sleep should be called exactly K times
            assert mock_sleep.call_count == k

    @given(k=_num_failures, base_delay=_base_delay, jitter=_jitter)
    @settings(max_examples=100, deadline=None)
    def test_sleep_delays_follow_exponential_backoff(
        self, k: int, base_delay: float, jitter: float
    ):
        """Each sleep delay equals base_delay * 2^attempt + jitter."""
        success_result = _make_success_result()
        rate_limit_error = _make_rate_limit_error()

        side_effects: list = [rate_limit_error] * k + [success_result]

        with (
            patch("scripts.ms.ms_vlm_call.call_ms_vlm", side_effect=side_effects),
            patch("scripts.ms.ms_vlm_call.time.sleep") as mock_sleep,
            patch("scripts.ms.ms_vlm_call.random.uniform", return_value=jitter),
        ):
            call_ms_vlm_with_retry(
                image_path=Path("/fake/image.png"),
                job={"job_id": "test"},
                client=MagicMock(),
                config=MagicMock(model="qwen-vl-max"),
                max_retries=MAX_RETRIES,
                base_delay=base_delay,
            )

            # Verify each sleep call has the correct exponential delay
            expected_delays = [
                base_delay * (2 ** attempt) + jitter
                for attempt in range(k)
            ]

            actual_delays = [c.args[0] for c in mock_sleep.call_args_list]

            assert len(actual_delays) == len(expected_delays)
            for attempt, (actual, expected) in enumerate(
                zip(actual_delays, expected_delays)
            ):
                assert actual == pytest.approx(expected, rel=1e-9), (
                    f"Attempt {attempt}: expected delay {expected}, got {actual}"
                )
