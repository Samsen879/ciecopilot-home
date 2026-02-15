"""Tests for scripts.ms.ms_vlm_call – single call and retry wrapper.

Validates Requirements 2.1 (VLM call) and 2.4 (retry logic).
"""
from __future__ import annotations

import base64
import types
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scripts.ms.ms_vlm_call import (
    _is_retryable_error,
    call_ms_vlm,
    call_ms_vlm_with_retry,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@dataclass
class _FakeConfig:
    model: str = "qwen-vl-max"


def _job(**overrides) -> dict:
    base = {
        "job_id": "00000000-0000-0000-0000-000000000001",
        "storage_key": "9709/m17/ms/q1",
        "q_number": 1,
        "subpart": None,
        "syllabus_code": "9709",
        "session": "m17",
        "paper": 1,
        "variant": 1,
    }
    base.update(overrides)
    return base


def _make_mock_client(raw_text="[]", prompt_tokens=10, completion_tokens=5):
    """Return a mock OpenAI client that returns a canned response."""
    usage = types.SimpleNamespace(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    message = types.SimpleNamespace(content=raw_text)
    choice = types.SimpleNamespace(message=message)
    response = types.SimpleNamespace(choices=[choice], usage=usage)

    client = MagicMock()
    client.chat.completions.create.return_value = response
    return client


class _RetryableError(Exception):
    """Simulates a retryable HTTP error."""

    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"HTTP {status_code}")


class _NonRetryableError(Exception):
    """Simulates a non-retryable HTTP error (e.g. 400)."""

    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"HTTP {status_code}")


# ---------------------------------------------------------------------------
# _is_retryable_error
# ---------------------------------------------------------------------------


class TestIsRetryableError:
    def test_429_is_retryable(self):
        assert _is_retryable_error(_RetryableError(429)) is True

    def test_500_is_retryable(self):
        assert _is_retryable_error(_RetryableError(500)) is True

    def test_502_is_retryable(self):
        assert _is_retryable_error(_RetryableError(502)) is True

    def test_503_is_retryable(self):
        assert _is_retryable_error(_RetryableError(503)) is True

    def test_400_is_not_retryable(self):
        assert _is_retryable_error(_NonRetryableError(400)) is False

    def test_401_is_not_retryable(self):
        assert _is_retryable_error(_NonRetryableError(401)) is False

    def test_403_is_not_retryable(self):
        assert _is_retryable_error(_NonRetryableError(403)) is False

    def test_404_is_not_retryable(self):
        assert _is_retryable_error(_NonRetryableError(404)) is False

    def test_generic_exception_not_retryable(self):
        assert _is_retryable_error(ValueError("oops")) is False


# ---------------------------------------------------------------------------
# call_ms_vlm
# ---------------------------------------------------------------------------


class TestCallMsVlm:
    def test_returns_dict_with_expected_keys(self, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")
        client = _make_mock_client("some text", 100, 50)

        result = call_ms_vlm(img, _job(), client, _FakeConfig())

        assert set(result.keys()) == {"raw_text", "input_tokens", "output_tokens"}

    def test_returns_correct_raw_text(self, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")
        client = _make_mock_client('{"rubric_points": []}', 10, 5)

        result = call_ms_vlm(img, _job(), client, _FakeConfig())

        assert result["raw_text"] == '{"rubric_points": []}'

    def test_returns_correct_token_counts(self, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")
        client = _make_mock_client("text", 123, 456)

        result = call_ms_vlm(img, _job(), client, _FakeConfig())

        assert result["input_tokens"] == 123
        assert result["output_tokens"] == 456

    def test_encodes_image_as_base64(self, tmp_path):
        img = tmp_path / "test.png"
        raw_bytes = b"\x89PNG\r\ntest image data"
        img.write_bytes(raw_bytes)
        client = _make_mock_client()

        call_ms_vlm(img, _job(), client, _FakeConfig())

        call_args = client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]
        user_content = messages[1]["content"]
        image_part = user_content[0]
        expected_b64 = base64.b64encode(raw_bytes).decode("ascii")
        assert image_part["image_url"]["url"] == f"data:image/png;base64,{expected_b64}"

    def test_passes_correct_model(self, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")
        client = _make_mock_client()

        call_ms_vlm(img, _job(), client, _FakeConfig(model="qwen-vl-plus"))

        call_args = client.chat.completions.create.call_args
        assert call_args.kwargs["model"] == "qwen-vl-plus"

    def test_messages_structure(self, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")
        client = _make_mock_client()

        call_ms_vlm(img, _job(), client, _FakeConfig())

        call_args = client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert isinstance(messages[1]["content"], list)
        assert len(messages[1]["content"]) == 2
        assert messages[1]["content"][0]["type"] == "image_url"
        assert messages[1]["content"][1]["type"] == "text"

    def test_disables_thinking(self, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")
        client = _make_mock_client()

        call_ms_vlm(img, _job(), client, _FakeConfig())

        call_args = client.chat.completions.create.call_args
        assert call_args.kwargs["extra_body"] == {"enable_thinking": False}


# ---------------------------------------------------------------------------
# call_ms_vlm_with_retry
# ---------------------------------------------------------------------------


class TestCallMsVlmWithRetry:
    @patch("scripts.ms.ms_vlm_call.time.sleep")
    def test_succeeds_on_first_try(self, mock_sleep, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")
        client = _make_mock_client("ok", 10, 5)

        result = call_ms_vlm_with_retry(img, _job(), client, _FakeConfig())

        assert result["raw_text"] == "ok"
        mock_sleep.assert_not_called()

    @patch("scripts.ms.ms_vlm_call.time.sleep")
    def test_retries_on_429_then_succeeds(self, mock_sleep, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")

        # First 2 calls raise 429, third succeeds
        client = _make_mock_client("success", 10, 5)
        call_count = 0
        original_create = client.chat.completions.create

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise _RetryableError(429)
            return original_create(**kwargs)

        client.chat.completions.create = MagicMock(side_effect=side_effect)

        result = call_ms_vlm_with_retry(
            img, _job(), client, _FakeConfig(), max_retries=5, base_delay=2.0,
        )

        assert result["raw_text"] == "success"
        assert mock_sleep.call_count == 2

    @patch("scripts.ms.ms_vlm_call.time.sleep")
    def test_retries_on_500_then_succeeds(self, mock_sleep, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")

        client = _make_mock_client("ok", 10, 5)
        call_count = 0
        original_create = client.chat.completions.create

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 1:
                raise _RetryableError(500)
            return original_create(**kwargs)

        client.chat.completions.create = MagicMock(side_effect=side_effect)

        result = call_ms_vlm_with_retry(
            img, _job(), client, _FakeConfig(), max_retries=5, base_delay=2.0,
        )

        assert result["raw_text"] == "ok"
        assert mock_sleep.call_count == 1

    @patch("scripts.ms.ms_vlm_call.time.sleep")
    def test_raises_after_max_retries_exhausted(self, mock_sleep, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")

        client = MagicMock()
        client.chat.completions.create.side_effect = _RetryableError(429)

        with pytest.raises(_RetryableError):
            call_ms_vlm_with_retry(
                img, _job(), client, _FakeConfig(), max_retries=3, base_delay=0.01,
            )

        assert mock_sleep.call_count == 3

    @patch("scripts.ms.ms_vlm_call.time.sleep")
    def test_non_retryable_error_raises_immediately(self, mock_sleep, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")

        client = MagicMock()
        client.chat.completions.create.side_effect = _NonRetryableError(400)

        with pytest.raises(_NonRetryableError):
            call_ms_vlm_with_retry(
                img, _job(), client, _FakeConfig(), max_retries=5, base_delay=0.01,
            )

        mock_sleep.assert_not_called()

    @patch("scripts.ms.ms_vlm_call.random.uniform", return_value=0.5)
    @patch("scripts.ms.ms_vlm_call.time.sleep")
    def test_exponential_backoff_delays(self, mock_sleep, mock_uniform, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")

        client = MagicMock()
        client.chat.completions.create.side_effect = _RetryableError(429)

        with pytest.raises(_RetryableError):
            call_ms_vlm_with_retry(
                img, _job(), client, _FakeConfig(), max_retries=4, base_delay=2.0,
            )

        # Expected delays: 2*2^0+0.5=2.5, 2*2^1+0.5=4.5, 2*2^2+0.5=8.5, 2*2^3+0.5=16.5
        delays = [call.args[0] for call in mock_sleep.call_args_list]
        assert delays == pytest.approx([2.5, 4.5, 8.5, 16.5])

    @patch("scripts.ms.ms_vlm_call.time.sleep")
    def test_retries_on_502_gateway_error(self, mock_sleep, tmp_path):
        img = tmp_path / "test.png"
        img.write_bytes(b"\x89PNG\r\n")

        client = _make_mock_client("recovered", 10, 5)
        call_count = 0
        original_create = client.chat.completions.create

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 1:
                raise _RetryableError(502)
            return original_create(**kwargs)

        client.chat.completions.create = MagicMock(side_effect=side_effect)

        result = call_ms_vlm_with_retry(
            img, _job(), client, _FakeConfig(), max_retries=3, base_delay=0.01,
        )

        assert result["raw_text"] == "recovered"
