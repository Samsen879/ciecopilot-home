"""MS VLM call layer – single call and retry wrapper.

Provides ``call_ms_vlm`` for a single DashScope API call and
``call_ms_vlm_with_retry`` with exponential backoff for transient errors.

Requirements: 2.1, 2.4
"""
from __future__ import annotations

import base64
import logging
import random
import time
from pathlib import Path
from typing import Any

from scripts.ms.ms_prompt import build_ms_prompt

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Retryable error detection
# ---------------------------------------------------------------------------


def _is_retryable_error(exc: Exception) -> bool:
    """Return True for HTTP 429 (rate-limit) and 5xx (server) errors.

    Handles:
    - ``openai.RateLimitError`` (429)
    - ``openai.APIStatusError`` with status_code >= 500
    - Any exception with a ``status_code`` attribute matching the above
    """
    try:
        import openai

        if isinstance(exc, openai.RateLimitError):
            return True
        if isinstance(exc, openai.APIStatusError) and exc.status_code >= 500:
            return True
    except ImportError:
        pass

    status = getattr(exc, "status_code", None)
    if status is not None:
        return status == 429 or status >= 500
    return False


# ---------------------------------------------------------------------------
# Single VLM call
# ---------------------------------------------------------------------------


def call_ms_vlm(
    image_path: Path,
    job: dict,
    client: Any,
    config: Any,
) -> dict:
    """Call DashScope VLM API with an MS screenshot image.

    Reads *image_path*, base64-encodes it, builds the MS prompt via
    ``build_ms_prompt``, and sends a chat completion request through the
    OpenAI-compatible *client*.

    Returns ``{"raw_text": str, "input_tokens": int, "output_tokens": int}``.
    Raises on API errors (retry is handled by the caller).
    """
    image_bytes = image_path.read_bytes()
    b64 = base64.b64encode(image_bytes).decode("ascii")

    system_prompt, user_prompt = build_ms_prompt(job)

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{b64}"},
                },
                {"type": "text", "text": user_prompt},
            ],
        },
    ]

    response = client.chat.completions.create(
        model=config.model,
        messages=messages,
        extra_body={"enable_thinking": False},
    )

    raw_text = response.choices[0].message.content
    input_tokens = response.usage.prompt_tokens
    output_tokens = response.usage.completion_tokens

    return {
        "raw_text": raw_text,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }


# ---------------------------------------------------------------------------
# Retry wrapper
# ---------------------------------------------------------------------------


def call_ms_vlm_with_retry(
    image_path: Path,
    job: dict,
    client: Any,
    config: Any,
    max_retries: int = 5,
    base_delay: float = 2.0,
) -> dict:
    """Call ``call_ms_vlm`` with exponential backoff on retryable errors.

    Retry behaviour:
    1. Attempt ``call_ms_vlm(image_path, job, client, config)``.
    2. On HTTP 429 or 5xx, sleep ``base_delay * 2**attempt + jitter``
       (jitter is uniform random in [0, 1]) and retry.
    3. After *max_retries* consecutive failures the last exception is
       re-raised.
    4. Non-retryable errors (e.g. 4xx other than 429) raise immediately.

    Returns ``{"raw_text": str, "input_tokens": int, "output_tokens": int}``.
    """
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            return call_ms_vlm(image_path, job, client, config)
        except Exception as exc:
            if not _is_retryable_error(exc):
                raise

            last_exc = exc
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            logger.warning(
                "Retryable error (attempt %d/%d), sleeping %.1fs: %s",
                attempt + 1,
                max_retries,
                delay,
                exc,
            )
            time.sleep(delay)

    raise last_exc  # type: ignore[misc]
