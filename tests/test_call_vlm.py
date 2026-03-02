"""Tests for call_vlm() in batch_process_v0.py.

Verifies that the VLM API call function correctly:
- Reads and base64-encodes image files
- Builds the correct message structure
- Passes the correct model name and extra_body
- Extracts raw text and token counts from the response
- Calls build_prompt with the job dict

**Validates: Requirements 3.1, 3.2, 3.6**
"""
from __future__ import annotations

import base64
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import Config, call_vlm


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _job(**kwargs) -> dict:
    """Return a job dict with sensible defaults, overridden by kwargs."""
    defaults = {
        "job_id": "test-001",
        "storage_key": "9709/s23/q01.png",
        "sha256": "abc123",
        "syllabus_code": "9709",
        "paper": 1,
        "q_number": 3,
        "subpart": "a",
    }
    defaults.update(kwargs)
    return defaults


def _make_mock_client(
    raw_text: str = '{"question_type": "calculation"}',
    prompt_tokens: int = 100,
    completion_tokens: int = 50,
) -> MagicMock:
    """Create a mock OpenAI client that returns a realistic response."""
    usage = SimpleNamespace(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    message = SimpleNamespace(content=raw_text)
    choice = SimpleNamespace(message=message)
    response = SimpleNamespace(choices=[choice], usage=usage)

    client = MagicMock()
    client.chat.completions.create.return_value = response
    return client


def _config(**kwargs) -> Config:
    """Return a Config with sensible defaults, overridden by kwargs."""
    return Config(**kwargs)


# ---------------------------------------------------------------------------
# Tests – Req 3.1: image base64 encoding
# ---------------------------------------------------------------------------

class TestCallVlmBase64Encoding:
    """Req 3.1: call_vlm SHALL read image file and encode as base64."""

    def test_encodes_image_as_base64_correctly(self, tmp_path):
        """The image bytes should be base64-encoded in the API request."""
        # Create a test image file with known content
        image_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        image_path = tmp_path / "test_q01.png"
        image_path.write_bytes(image_content)

        client = _make_mock_client()
        config = _config()

        call_vlm(image_path, _job(), client, config)

        # Verify the base64 encoding in the API call
        call_args = client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]
        user_content = messages[1]["content"]

        # Find the image_url entry
        image_entry = next(
            item for item in user_content if item["type"] == "image_url"
        )
        url = image_entry["image_url"]["url"]

        # Extract the base64 portion and verify it decodes to original bytes
        prefix = "data:image/png;base64,"
        assert url.startswith(prefix)
        decoded = base64.b64decode(url[len(prefix):])
        assert decoded == image_content

    def test_reads_actual_file_bytes(self, tmp_path):
        """call_vlm should read the file at the given path."""
        unique_content = b"unique-image-bytes-12345"
        image_path = tmp_path / "unique.png"
        image_path.write_bytes(unique_content)

        client = _make_mock_client()
        config = _config()

        call_vlm(image_path, _job(), client, config)

        call_args = client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]
        user_content = messages[1]["content"]
        image_entry = next(
            item for item in user_content if item["type"] == "image_url"
        )
        url = image_entry["image_url"]["url"]
        b64_part = url.split(",", 1)[1]
        assert base64.b64decode(b64_part) == unique_content


# ---------------------------------------------------------------------------
# Tests – Req 3.2: correct API request parameters
# ---------------------------------------------------------------------------

class TestCallVlmApiRequest:
    """Req 3.2: call_vlm SHALL use OpenAI SDK with correct parameters."""

    def test_passes_correct_model_name(self, tmp_path):
        """Model should be config.model (default: qwen3-vl-flash)."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        client = _make_mock_client()
        config = _config()

        call_vlm(image_path, _job(), client, config)

        call_args = client.chat.completions.create.call_args
        assert call_args.kwargs["model"] == "qwen3-vl-flash"

    def test_passes_custom_model_name(self, tmp_path):
        """Model should respect config.model override."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        client = _make_mock_client()
        config = _config(model="qwen3-vl-max")

        call_vlm(image_path, _job(), client, config)

        call_args = client.chat.completions.create.call_args
        assert call_args.kwargs["model"] == "qwen3-vl-max"

    def test_passes_extra_body_with_enable_thinking_false(self, tmp_path):
        """extra_body should contain enable_thinking=False."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        client = _make_mock_client()
        config = _config()

        call_vlm(image_path, _job(), client, config)

        call_args = client.chat.completions.create.call_args
        assert call_args.kwargs["extra_body"] == {"enable_thinking": False}

    def test_image_url_format(self, tmp_path):
        """Image URL should use data:image/png;base64,{b64} format."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"test-bytes")

        client = _make_mock_client()
        config = _config()

        call_vlm(image_path, _job(), client, config)

        call_args = client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]
        user_content = messages[1]["content"]
        image_entry = next(
            item for item in user_content if item["type"] == "image_url"
        )
        url = image_entry["image_url"]["url"]
        assert url.startswith("data:image/png;base64,")

    def test_messages_structure(self, tmp_path):
        """Messages should have system + user roles with correct structure."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"test-bytes")

        client = _make_mock_client()
        config = _config()

        call_vlm(image_path, _job(), client, config)

        call_args = client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert isinstance(messages[0]["content"], str)
        assert messages[1]["role"] == "user"
        assert isinstance(messages[1]["content"], list)

        # User content should have image_url and text entries
        user_content = messages[1]["content"]
        types = [item["type"] for item in user_content]
        assert "image_url" in types
        assert "text" in types


# ---------------------------------------------------------------------------
# Tests – Response extraction
# ---------------------------------------------------------------------------

class TestCallVlmResponse:
    """call_vlm SHALL return correct raw_text and token counts."""

    def test_returns_correct_raw_text(self, tmp_path):
        """raw_text should match response.choices[0].message.content."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        expected_text = '{"question_type": "calculation", "confidence": 0.9}'
        client = _make_mock_client(raw_text=expected_text)
        config = _config()

        raw_text, _, _ = call_vlm(image_path, _job(), client, config)
        assert raw_text == expected_text

    def test_returns_correct_input_tokens(self, tmp_path):
        """input_tokens should match response.usage.prompt_tokens."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        client = _make_mock_client(prompt_tokens=250)
        config = _config()

        _, input_tokens, _ = call_vlm(image_path, _job(), client, config)
        assert input_tokens == 250

    def test_returns_correct_output_tokens(self, tmp_path):
        """output_tokens should match response.usage.completion_tokens."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        client = _make_mock_client(completion_tokens=75)
        config = _config()

        _, _, output_tokens = call_vlm(image_path, _job(), client, config)
        assert output_tokens == 75

    def test_returns_tuple_of_three(self, tmp_path):
        """Return value should be a 3-tuple (str, int, int)."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        client = _make_mock_client()
        config = _config()

        result = call_vlm(image_path, _job(), client, config)
        assert isinstance(result, tuple)
        assert len(result) == 3
        assert isinstance(result[0], str)
        assert isinstance(result[1], int)
        assert isinstance(result[2], int)


# ---------------------------------------------------------------------------
# Tests – build_prompt integration
# ---------------------------------------------------------------------------

class TestCallVlmBuildPrompt:
    """call_vlm SHALL call build_prompt with the job dict."""

    def test_calls_build_prompt_with_job(self, tmp_path):
        """build_prompt should be called with the provided job dict."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        job = _job(syllabus_code="9702", paper=2, q_number=5, subpart="b")
        client = _make_mock_client()
        config = _config()

        with patch(
            "scripts.vlm.batch_process_v0.build_prompt",
            wraps=__import__(
                "scripts.vlm.batch_process_v0", fromlist=["build_prompt"]
            ).build_prompt,
        ) as mock_build_prompt:
            call_vlm(image_path, job, client, config)
            mock_build_prompt.assert_called_once_with(job, strict_mode=False)

    def test_user_prompt_appears_in_messages(self, tmp_path):
        """The user prompt from build_prompt should appear in messages."""
        image_path = tmp_path / "q01.png"
        image_path.write_bytes(b"fake-image")

        job = _job(syllabus_code="9702", paper=2, q_number=5, subpart="b")
        client = _make_mock_client()
        config = _config()

        call_vlm(image_path, job, client, config)

        call_args = client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]
        user_content = messages[1]["content"]
        text_entry = next(
            item for item in user_content if item["type"] == "text"
        )
        # The user prompt should contain the context fields
        assert "syllabus_code=9702" in text_entry["text"]
        assert "paper=2" in text_entry["text"]
