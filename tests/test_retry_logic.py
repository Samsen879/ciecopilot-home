"""Unit tests for call_vlm_with_retry exponential backoff logic.

Tests cover:
  1. Success on first try → returns result directly
  2. Retries on 429 and succeeds on 2nd try
  3. Retries on 429 and succeeds on 5th try
  4. Exhausts all retries → raises the exception
  5. Non-429 error → raises immediately without retry
  6. Exponential backoff timing (verify sleep calls)

Requirements: 3.4, 3.5
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import Config, call_vlm_with_retry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class MockRateLimitError(Exception):
    """Simulates an HTTP 429 rate-limit error."""

    def __init__(self):
        self.status_code = 429
        super().__init__("Rate limit exceeded")


class MockServerError(Exception):
    """Simulates a non-retryable server error (e.g. 500)."""

    def __init__(self):
        self.status_code = 500
        super().__init__("Internal server error")


# Shared fixtures
_DUMMY_IMAGE = Path("/tmp/fake_image.png")
_DUMMY_JOB = {"job_id": "test-1", "storage_key": "img.png"}
_DUMMY_CLIENT = MagicMock()
_DUMMY_CONFIG = Config()
_SUCCESS_RESULT = ('{"question_type":"calculation"}', 100, 50)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@patch("scripts.vlm.batch_process_v0.time.sleep", return_value=None)
@patch("scripts.vlm.batch_process_v0.call_vlm")
class TestCallVlmWithRetry:
    """Tests for call_vlm_with_retry."""

    def test_success_on_first_try(self, mock_call_vlm, mock_sleep):
        """Succeeds on first try → returns result directly, no sleep."""
        mock_call_vlm.return_value = _SUCCESS_RESULT

        result = call_vlm_with_retry(
            _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
        )

        assert result == _SUCCESS_RESULT
        mock_call_vlm.assert_called_once()
        mock_sleep.assert_not_called()

    def test_retries_on_429_succeeds_second_try(self, mock_call_vlm, mock_sleep):
        """Retries on 429 and succeeds on 2nd try."""
        mock_call_vlm.side_effect = [
            MockRateLimitError(),
            _SUCCESS_RESULT,
        ]

        result = call_vlm_with_retry(
            _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
        )

        assert result == _SUCCESS_RESULT
        assert mock_call_vlm.call_count == 2
        mock_sleep.assert_called_once_with(2.0)  # base_delay * 2^0

    def test_retries_on_429_succeeds_fifth_try(self, mock_call_vlm, mock_sleep):
        """Retries on 429 and succeeds on 5th try."""
        mock_call_vlm.side_effect = [
            MockRateLimitError(),
            MockRateLimitError(),
            MockRateLimitError(),
            MockRateLimitError(),
            _SUCCESS_RESULT,
        ]

        result = call_vlm_with_retry(
            _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
        )

        assert result == _SUCCESS_RESULT
        assert mock_call_vlm.call_count == 5
        assert mock_sleep.call_count == 4

    def test_exhausts_all_retries(self, mock_call_vlm, mock_sleep):
        """Exhausts all retries → raises the exception."""
        mock_call_vlm.side_effect = MockRateLimitError()

        with pytest.raises(MockRateLimitError):
            call_vlm_with_retry(
                _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
                max_retries=5,
            )

        assert mock_call_vlm.call_count == 5
        assert mock_sleep.call_count == 5

    def test_non_429_error_raises_immediately(self, mock_call_vlm, mock_sleep):
        """Non-429 error → raises immediately without retry."""
        mock_call_vlm.side_effect = MockServerError()

        with pytest.raises(MockServerError):
            call_vlm_with_retry(
                _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
            )

        mock_call_vlm.assert_called_once()
        mock_sleep.assert_not_called()

    def test_exponential_backoff_timing(self, mock_call_vlm, mock_sleep):
        """Verify exponential backoff sleep durations: 2, 4, 8, 16, 32."""
        mock_call_vlm.side_effect = MockRateLimitError()

        with pytest.raises(MockRateLimitError):
            call_vlm_with_retry(
                _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
                max_retries=5,
                base_delay=2.0,
            )

        expected_delays = [2.0, 4.0, 8.0, 16.0, 32.0]
        actual_delays = [call.args[0] for call in mock_sleep.call_args_list]
        assert actual_delays == expected_delays

    def test_custom_max_retries(self, mock_call_vlm, mock_sleep):
        """Respects custom max_retries parameter."""
        mock_call_vlm.side_effect = MockRateLimitError()

        with pytest.raises(MockRateLimitError):
            call_vlm_with_retry(
                _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
                max_retries=2,
            )

        assert mock_call_vlm.call_count == 2
        assert mock_sleep.call_count == 2

    def test_custom_base_delay(self, mock_call_vlm, mock_sleep):
        """Respects custom base_delay parameter."""
        mock_call_vlm.side_effect = [
            MockRateLimitError(),
            MockRateLimitError(),
            _SUCCESS_RESULT,
        ]

        result = call_vlm_with_retry(
            _DUMMY_IMAGE, _DUMMY_JOB, _DUMMY_CLIENT, _DUMMY_CONFIG,
            base_delay=3.0,
        )

        assert result == _SUCCESS_RESULT
        expected_delays = [3.0, 6.0]  # 3*2^0, 3*2^1
        actual_delays = [call.args[0] for call in mock_sleep.call_args_list]
        assert actual_delays == expected_delays
