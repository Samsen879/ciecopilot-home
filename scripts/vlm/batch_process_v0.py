#!/usr/bin/env python3
"""
batch_process_v0.py - VLM batch processor using DashScope qwen3-vl-flash

Atomically claims pending/blocked jobs from vlm_jobs_v0, reads local images,
calls DashScope API, applies leakage detection, and submits results.

Usage:
    python scripts/vlm/batch_process_v0.py --workers 4 --max-jobs 100
    python scripts/vlm/batch_process_v0.py --dry-run --status pending
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local


# ---------------------------------------------------------------------------
# .env file loader
# ---------------------------------------------------------------------------

def _load_env() -> None:
    load_project_env()


_load_env()


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass
class Config:
    """Batch processor configuration, populated from CLI args."""
    workers: int = 4
    status: list[str] = field(default_factory=lambda: ["pending"])
    max_jobs: int | None = None
    assets_root: Path = field(default_factory=lambda: Path(
        os.environ.get("ASSETS_ROOT", r"C:\Users\Samsen\cie-assets")
    ))
    dry_run: bool = False
    allow_remote: bool = False
    stale_timeout_minutes: int = 10
    model: str = "qwen3-vl-flash"
    base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    auto_publish_v1: bool = False
    auto_spot_check_v1: bool = False


def parse_args(argv: list[str] | None = None) -> Config:
    """Parse CLI arguments into a Config dataclass."""
    parser = argparse.ArgumentParser(
        description="VLM batch processor - DashScope qwen3-vl-flash",
    )
    parser.add_argument(
        "--workers", type=int, default=4,
        help="Number of concurrent workers (default: 4)",
    )
    parser.add_argument(
        "--status", type=str, default="pending",
        help="Job status(es) to claim, comma-separated (default: pending). "
             "E.g. --status error,blocked",
    )
    parser.add_argument(
        "--max-jobs", type=int, default=None,
        help="Maximum number of jobs to process (default: unlimited)",
    )
    parser.add_argument(
        "--assets-root", type=str,
        default=os.environ.get("ASSETS_ROOT", r"C:\Users\Samsen\cie-assets"),
        help="Local assets root directory",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Skip API calls and DB submissions",
    )
    parser.add_argument(
        "--allow-remote", action="store_true",
        help="Allow remote DB connections (dangerous)",
    )
    parser.add_argument(
        "--stale-timeout", type=int, default=10,
        help="Minutes before a running job is considered stale (default: 10)",
    )
    parser.add_argument(
        "--auto-publish-v1", action="store_true",
        help="After batch completes, run production publish pipeline for v1",
    )
    parser.add_argument(
        "--auto-spot-check-v1", action="store_true",
        help="When used with --auto-publish-v1, also run 45-sample VLM spot-check",
    )

    args = parser.parse_args(argv)

    return Config(
        workers=args.workers,
        status=[s.strip() for s in args.status.split(",")],
        max_jobs=args.max_jobs,
        assets_root=Path(args.assets_root),
        dry_run=args.dry_run,
        allow_remote=args.allow_remote,
        stale_timeout_minutes=args.stale_timeout,
        auto_publish_v1=args.auto_publish_v1,
        auto_spot_check_v1=args.auto_spot_check_v1,
    )


def validate_api_key() -> str:
    """Return DASHSCOPE_API_KEY or exit with error."""
    key = os.environ.get("DASHSCOPE_API_KEY")
    if not key:
        print(
            "Error: DASHSCOPE_API_KEY environment variable is required.",
            file=sys.stderr,
        )
        sys.exit(2)
    return key


# ---------------------------------------------------------------------------
# Stats (thread-safe counters)
# ---------------------------------------------------------------------------

@dataclass
class Stats:
    """Thread-safe counters for batch processing statistics."""
    success: int = 0
    error: int = 0
    blocked: int = 0
    deferred: int = 0
    needs_review: int = 0
    api_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)
    _start_time: float = field(default_factory=time.time, repr=False)

    def increment(self, field_name: str, amount: int = 1) -> None:
        with self._lock:
            setattr(self, field_name, getattr(self, field_name) + amount)

    @property
    def total_done(self) -> int:
        with self._lock:
            return self.success + self.error + self.blocked + self.deferred + self.needs_review

    def maybe_log_progress(self) -> None:
        """Print progress every 10 completed jobs."""
        total = self.total_done
        if total > 0 and total % 10 == 0:
            elapsed = time.time() - self._start_time
            rate = total / elapsed * 60 if elapsed > 0 else 0
            with self._lock:
                print(
                    f"[progress] {total} done | "
                    f"ok={self.success} err={self.error} blocked={self.blocked} "
                    f"deferred={self.deferred} review={self.needs_review} | "
                    f"{rate:.1f} jobs/min"
                )

    def summary(self) -> str:
        """Return final summary string."""
        elapsed = time.time() - self._start_time
        total = self.total_done
        rate = total / elapsed * 60 if elapsed > 0 else 0
        # Rough cost estimate: qwen3-vl-flash pricing
        # Input: ~0.002 CNY/1k tokens, Output: ~0.006 CNY/1k tokens
        est_cost_cny = (self.input_tokens * 0.002 + self.output_tokens * 0.006) / 1000
        with self._lock:
            return (
                f"\n{'='*60}\n"
                f"Batch complete\n"
                f"  Total:    {total}\n"
                f"  Success:  {self.success}\n"
                f"  Error:    {self.error}\n"
                f"  Blocked:  {self.blocked}\n"
                f"  Deferred: {self.deferred}\n"
                f"  Review:   {self.needs_review}\n"
                f"  API calls:{self.api_calls}\n"
                f"  Tokens:   {self.input_tokens} in / {self.output_tokens} out\n"
                f"  Est cost: ¥{est_cost_cny:.4f}\n"
                f"  Elapsed:  {elapsed:.1f}s ({rate:.1f} jobs/min)\n"
                f"{'='*60}"
            )


# ---------------------------------------------------------------------------
# Database connection pool
# ---------------------------------------------------------------------------

from scripts.vlm.db_utils import get_db_url, json_param


def init_pool(config: Config):
    """
    Create a connection pool with pool_size = workers + 2.

    Tries psycopg_pool.ConnectionPool first, falls back to
    psycopg2.pool.ThreadedConnectionPool.

    Returns a pool object that supports:
      - pool.getconn() / pool.putconn(conn)  (psycopg2 style)
      - pool.connection() context manager     (psycopg3 style)
    """
    db_url = get_db_url()
    pool_size = config.workers + 2

    # Try psycopg (v3) pool first
    try:
        from psycopg_pool import ConnectionPool  # type: ignore

        pool = ConnectionPool(
            conninfo=db_url,
            min_size=pool_size,
            max_size=pool_size,
            kwargs={"application_name": "vlm_batch_v0"},
        )
        pool._driver = "psycopg"
        return pool
    except ImportError:
        pass

    # Fallback to psycopg2 ThreadedConnectionPool
    try:
        from psycopg2.pool import ThreadedConnectionPool  # type: ignore

        pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=pool_size,
            dsn=db_url,
            application_name="vlm_batch_v0",
        )
        pool._driver = "psycopg2"
        return pool
    except ImportError:
        print(
            "Error: psycopg_pool or psycopg2 is required.\n"
            "  pip install psycopg[pool] or pip install psycopg2-binary",
            file=sys.stderr,
        )
        sys.exit(2)


# ---------------------------------------------------------------------------
# Job claiming
# ---------------------------------------------------------------------------

_CLAIM_SQL = """
    WITH cte AS (
        SELECT job_id
        FROM vlm_jobs_v0
        WHERE (status = ANY(%(statuses)s)
               AND (last_error IS NULL OR last_error NOT IN ('contact_sheet', 'file_not_found')))
           OR (status = 'running'
               AND locked_at < now() - make_interval(mins => %(stale_timeout)s))
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE vlm_jobs_v0 j
    SET status     = 'running',
        locked_by  = %(worker_id)s,
        locked_at  = now(),
        attempts   = attempts + 1,
        updated_at = now()
    FROM cte
    WHERE j.job_id = cte.job_id
    RETURNING j.job_id, j.storage_key, j.sha256, j.syllabus_code, j.session,
              j.year, j.doc_type, j.paper, j.variant, j.q_number, j.subpart,
              j.extractor_version, j.provider, j.model, j.prompt_version;
"""

_CLAIM_COLUMNS = (
    "job_id", "storage_key", "sha256", "syllabus_code", "session",
    "year", "doc_type", "paper", "variant", "q_number", "subpart",
    "extractor_version", "provider", "model", "prompt_version",
)


def claim_job(
    pool,
    worker_id: str,
    status: list[str],
    stale_timeout_minutes: int,
) -> dict | None:
    """Atomically claim one pending/blocked or stale-running job.

    Uses SELECT ... FOR UPDATE SKIP LOCKED to avoid contention between
    concurrent workers.  Returns a dict of job fields or None when the
    queue is empty.

    Handles both psycopg (v3) and psycopg2 connection pool drivers.
    """
    params = {
        "statuses": status,
        "worker_id": worker_id,
        "stale_timeout": stale_timeout_minutes,
    }

    driver = getattr(pool, "_driver", "psycopg2")

    if driver == "psycopg":
        # psycopg v3 pool – use context-manager based connection
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(_CLAIM_SQL, params)
                row = cur.fetchone()
            conn.commit()
    else:
        # psycopg2 ThreadedConnectionPool
        conn = pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(_CLAIM_SQL, params)
                row = cur.fetchone()
            conn.commit()
        finally:
            pool.putconn(conn)

    if row is None:
        return None

    return dict(zip(_CLAIM_COLUMNS, row))


# ---------------------------------------------------------------------------
# File pre-check
# ---------------------------------------------------------------------------

import re

_CONTACT_SHEET_RE = re.compile(r"contact|sheet", re.IGNORECASE)


def pre_check(
    job: dict,
    assets_root: Path,
) -> tuple[str, Path | None, str | None]:
    """Check file existence and detect contact sheets.

    Joins *assets_root* with the job's ``storage_key`` to obtain the local
    file path, then applies two checks:

    1. **Contact-sheet detection** – if the filename (case-insensitive)
       contains ``"contact"`` or ``"sheet"``, the job is deferred regardless
       of whether the file exists on disk.
    2. **File existence** – if the resolved path does not point to an
       existing file, the job is marked as an error.

    Returns a 3-tuple ``(status, local_path, error_msg)``:

    * ``("ok",       Path(...), None)``            – file ready for processing
    * ``("error",    None,      "file_not_found")`` – file missing
    * ``("deferred", None,      "contact_sheet")``  – contact sheet detected

    Requirements: 2.1, 2.2, 2.3
    """
    local_path = assets_root / job["storage_key"]

    # Contact-sheet detection takes priority (even if file doesn't exist)
    if _CONTACT_SHEET_RE.search(local_path.name):
        return ("deferred", None, "contact_sheet")

    if not local_path.exists():
        return ("error", None, "file_not_found")

    return ("ok", local_path, None)


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a structured-data extractor for Cambridge International Examinations (CIE) \
past-paper question images.

Analyse the provided image and return a single JSON object that describes the \
question. Output **pure JSON only** — no markdown fences, no commentary, no \
explanation before or after the JSON.

### Required JSON schema

{
  "question_type": "<string>  one of: calculation, proof, graph, definition, multiple_choice, explanation, planning, analysis, MCQ, other",
  "math_expressions_latex": ["<string>  LaTeX expressions found in the question"],
  "variables": ["<string>  variable names used"],
  "units": ["<string>  physical units mentioned"],
  "diagram_elements": ["<string>  brief descriptions of diagram components"],
  "answer_form": "<string>  one of: exact, approx, proof, graph, table, other",
  "confidence": <float 0.0-1.0>,
  "summary": "<string>  brief description of what the question asks, max 120 chars"
}

Field notes:
- If a list field has no items, return an empty list [].
- "confidence" reflects how certain you are about the extraction quality.
- "summary" must be at most 120 characters.

### Leakage policy — STRICTLY follow these rules

- Do NOT include the answer or solution in any field.
- Do NOT include mark scheme content.
- Do NOT include mark allocations (e.g. "[3 marks]").
- Only describe what the question asks, not how to solve it.\
"""

_STRICT_SYSTEM_PROMPT = """\
You are a strict JSON extractor for Cambridge International Examinations (CIE) question images.

Output MUST be a single valid JSON object only (no markdown, no extra text).
Do not omit required keys. If uncertain, use best estimate with low confidence.

Required JSON keys:
question_type, math_expressions_latex, variables, units, diagram_elements, answer_form, confidence, summary

Allowed values:
- question_type: calculation, proof, graph, definition, multiple_choice, explanation, planning, analysis, MCQ, other
- answer_form: exact, approx, proof, graph, table, other
- confidence: float in [0,1]
- summary: non-empty plain sentence describing what the question asks (max 180 chars)

Rules:
- Never include final answers or mark-scheme content.
- For multiple-choice style questions, prefer question_type=multiple_choice and answer_form=other.
- If image is unreadable, still return all keys with summary="image unreadable" and low confidence.
"""


def build_prompt(job: dict, strict_mode: bool = False) -> tuple[str, str]:
    """Build system and user prompts for VLM extraction.

    Returns (system_prompt, user_prompt).

    Requirements: 6.1, 6.2, 6.3, 6.4
    """
    system_prompt = _STRICT_SYSTEM_PROMPT if strict_mode else _SYSTEM_PROMPT

    # Build user prompt with question context
    parts: list[str] = ["Extract a structured description from this question image."]
    if strict_mode:
        parts.append("Strict mode: return all required keys and ensure summary is not empty.")

    context_fields = {
        "syllabus_code": job.get("syllabus_code"),
        "paper": job.get("paper"),
        "q_number": job.get("q_number"),
        "subpart": job.get("subpart"),
    }

    context_parts: list[str] = []
    for key, value in context_fields.items():
        if value is not None:
            context_parts.append(f"{key}={value}")

    if context_parts:
        parts.append("Question context: " + ", ".join(context_parts) + ".")

    user_prompt = "\n".join(parts)

    return system_prompt, user_prompt


# ---------------------------------------------------------------------------
# VLM API call
# ---------------------------------------------------------------------------

import base64


def call_vlm(
    image_path: Path,
    job: dict,
    client,  # openai.OpenAI instance
    config: Config,
    strict_mode: bool = False,
) -> tuple[str, int, int]:
    """Call DashScope VLM API with the image.

    Reads the image file, encodes it as base64, builds the prompt using
    ``build_prompt``, and sends a chat completion request via the OpenAI SDK.

    Returns ``(raw_text, input_tokens, output_tokens)``.
    Raises on API errors (retry logic is handled by the caller/wrapper).

    Requirements: 3.1, 3.2, 3.6
    """
    # 1. Read image and encode to base64
    image_bytes = image_path.read_bytes()
    b64 = base64.b64encode(image_bytes).decode("ascii")

    # 2. Build prompts from job context
    system_prompt, user_prompt = build_prompt(job, strict_mode=strict_mode)

    # 3. Build messages list with image and text
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

    # 4. Call the API
    response = client.chat.completions.create(
        model=config.model,
        messages=messages,
        extra_body={"enable_thinking": False},
    )

    # 5. Extract raw text from response
    raw_text = response.choices[0].message.content

    # 6. Extract token counts from usage
    input_tokens = response.usage.prompt_tokens
    output_tokens = response.usage.completion_tokens

    return (raw_text, input_tokens, output_tokens)


# ---------------------------------------------------------------------------
# Retry logic
# ---------------------------------------------------------------------------


def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if an exception represents an HTTP 429 rate-limit error.

    Handles both ``openai.RateLimitError`` and any generic exception that
    carries a ``status_code == 429`` attribute (useful when the openai
    package is not installed in the test environment).
    """
    try:
        import openai  # type: ignore

        if isinstance(exc, openai.RateLimitError):
            return True
    except ImportError:
        pass

    return getattr(exc, "status_code", None) == 429


def call_vlm_with_retry(
    image_path: Path,
    job: dict,
    client,
    config: Config,
    strict_mode: bool = False,
    max_retries: int = 5,
    base_delay: float = 2.0,
) -> tuple[str, int, int]:
    """Call VLM API with exponential backoff retry on HTTP 429.

    Wraps :func:`call_vlm` and adds retry behaviour:

    1. Attempt ``call_vlm(image_path, job, client, config)``.
    2. If the call raises an ``openai.RateLimitError`` **or** any exception
       whose ``status_code`` attribute equals ``429``, sleep for
       ``base_delay * 2 ** attempt`` seconds and retry.
    3. After *max_retries* consecutive failures the last exception is
       re-raised so the caller can mark the job as *error*.
    4. Any non-429 exception is raised immediately (no retry).

    Returns ``(raw_text, input_tokens, output_tokens)`` on success.

    Requirements: 3.4, 3.5
    """
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            return call_vlm(image_path, job, client, config, strict_mode=strict_mode)
        except Exception as exc:
            if not _is_rate_limit_error(exc):
                raise  # non-retryable → propagate immediately

            last_exc = exc
            delay = base_delay * (2 ** attempt)
            time.sleep(delay)

    # All retries exhausted – raise the last 429 error
    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

import json

_CODE_BLOCK_RE = re.compile(
    r"```(?:json)?\s*\n(.*?)\n\s*```",
    re.DOTALL,
)

# Fields to copy from the job dict into the result
_JOB_COPY_FIELDS = (
    "storage_key", "sha256", "syllabus_code", "session", "year",
    "doc_type", "paper", "variant", "q_number", "subpart",
    "extractor_version", "provider", "model", "prompt_version",
)

# Default values for VLM output fields
_VLM_DEFAULTS: dict[str, object] = {
    "question_type": "other",
    "math_expressions_latex": [],
    "variables": [],
    "units": [],
    "diagram_elements": [],
    "answer_form": "other",
    "confidence": 0.5,
    "summary": None,
}

# Valid enum values matching DB CHECK constraints
_VALID_ANSWER_FORMS = {"exact", "approx", "proof", "graph", "table", "other"}
_VALID_QUESTION_TYPES = {"calculation", "proof", "graph", "definition", "multiple_choice", "explanation", "planning", "analysis", "MCQ", "other"}

_QUESTION_TYPE_ALIASES = {
    "mcq": "multiple_choice",
    "multiple choice": "multiple_choice",
    "multiple-choice": "multiple_choice",
    "contact_sheet": "other",
    "contact sheet": "other",
    "not_a_question": "other",
    "unknown": "other",
    "calculus": "calculation",
    "mechanics": "calculation",
    "statistics": "analysis",
}

_ANSWER_FORM_ALIASES = {
    "numeric": "exact",
    "number": "exact",
    "calculation": "exact",
    "mcq": "other",
    "multiple_choice": "other",
    "multiple-choice": "other",
    "choice": "other",
}


def _normalize_question_type(value) -> tuple[str, bool]:
    if not isinstance(value, str):
        return ("other", bool(value is not None))
    raw = value.strip()
    lowered = raw.lower()
    if raw in _VALID_QUESTION_TYPES:
        return (raw, False)
    if lowered in _QUESTION_TYPE_ALIASES:
        mapped = _QUESTION_TYPE_ALIASES[lowered]
        return (mapped, True)
    if lowered in _VALID_QUESTION_TYPES:
        return (lowered, True)
    return ("other", True)


def _normalize_answer_form(value, question_type: str) -> tuple[str, bool]:
    if question_type in {"multiple_choice", "MCQ"}:
        return ("other", True if value not in ("other", None, "") else False)
    if not isinstance(value, str):
        return ("other", bool(value is not None))
    raw = value.strip()
    lowered = raw.lower()
    if raw in _VALID_ANSWER_FORMS:
        return (raw, False)
    if lowered in _ANSWER_FORM_ALIASES:
        mapped = _ANSWER_FORM_ALIASES[lowered]
        return (mapped, True)
    if lowered in _VALID_ANSWER_FORMS:
        return (lowered, True)
    return ("other", True)


def _normalize_summary(value) -> tuple[str | None, bool]:
    if value is None:
        return (None, False)
    if not isinstance(value, str):
        return (str(value).strip()[:180] or None, True)
    compact = " ".join(value.replace("\n", " ").split())
    if len(compact) > 180:
        return (compact[:180], True)
    return (compact or None, compact != value)


def _list_of_strings(value) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if item is None:
            continue
        s = str(item).strip()
        if s:
            out.append(s)
    return out


def _is_summary_missing(summary) -> bool:
    return summary is None or (isinstance(summary, str) and summary.strip() == "")


def _needs_retry(result: dict) -> bool:
    # Retry only for clearly incomplete outputs.
    return _is_summary_missing(result.get("summary")) or (
        result.get("question_type") == "other"
        and result.get("answer_form") == "other"
        and len(result.get("math_expressions_latex", [])) == 0
    )


def _quality_score(result: dict) -> int:
    score = 0
    if not _is_summary_missing(result.get("summary")):
        score += 3
    if result.get("question_type") != "other":
        score += 2
    if result.get("answer_form") != "other":
        score += 1
    score += min(len(result.get("math_expressions_latex", [])), 2)
    score += min(len(result.get("variables", [])), 2)
    score += min(len(result.get("units", [])), 1)
    return score


def parse_response(raw_text: str, job: dict) -> dict | None:
    """Parse VLM response text into a structured result dict.

    Attempts direct JSON parsing first, then tries to extract JSON from
    markdown code blocks (```json ... ``` or ``` ... ```).

    Returns a dict with all required fields populated (with defaults where
    needed), or None if parsing completely fails.

    Requirements: 3.3, 8.1, 8.2, 8.3 (mapped to Req 4.1, 4.2, 4.3)
    """
    # Step 1: Try direct JSON parse
    parsed: dict | None = None
    try:
        parsed = json.loads(raw_text)
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # Step 2: Try extracting from markdown code block
    if parsed is None:
        match = _CODE_BLOCK_RE.search(raw_text if raw_text else "")
        if match:
            try:
                parsed = json.loads(match.group(1))
            except (json.JSONDecodeError, TypeError, ValueError):
                pass

    # Step 3: Complete parse failure → return None
    if parsed is None or not isinstance(parsed, dict):
        return None

    # Step 4: Build result dict – start with defaults, overlay parsed values
    result: dict = {}

    # Apply defaults, then overlay with parsed values
    for key, default_value in _VLM_DEFAULTS.items():
        value = parsed.get(key)
        if value is not None:
            result[key] = value
        else:
            # Use a copy of mutable defaults to avoid shared state
            result[key] = list(default_value) if isinstance(default_value, list) else default_value

    # Copy job metadata fields
    for key in _JOB_COPY_FIELDS:
        if key in job:
            result[key] = job[key]

    # Step 5: Normalize list fields and enums
    result["math_expressions_latex"] = _list_of_strings(result.get("math_expressions_latex"))
    result["variables"] = _list_of_strings(result.get("variables"))
    result["units"] = _list_of_strings(result.get("units"))
    result["diagram_elements"] = _list_of_strings(result.get("diagram_elements"))

    normalization_flags: list[str] = []
    qt, qt_changed = _normalize_question_type(result.get("question_type"))
    if qt_changed:
        normalization_flags.append("question_type")
    result["question_type"] = qt

    af, af_changed = _normalize_answer_form(result.get("answer_form"), qt)
    if af_changed:
        normalization_flags.append("answer_form")
    result["answer_form"] = af

    summary, summary_changed = _normalize_summary(result.get("summary"))
    if summary_changed:
        normalization_flags.append("summary")
    result["summary"] = summary

    # Step 6: Normalize confidence
    try:
        conf = float(result.get("confidence", 0.5))
    except Exception:
        conf = 0.3
        normalization_flags.append("confidence")
    conf = min(1.0, max(0.0, conf))
    result["confidence"] = conf

    # Step 7: Quality check – missing critical fields -> needs_review
    review_reasons: list[str] = []
    if _is_summary_missing(result.get("summary")):
        review_reasons.append("summary_missing")
    if result.get("question_type") == "other":
        review_reasons.append("question_type_other")
    if result.get("answer_form") == "other":
        review_reasons.append("answer_form_other")

    if review_reasons:
        result["confidence"] = min(result["confidence"], 0.3)
        result["status"] = "needs_review"
    else:
        result["status"] = "ok"

    if normalization_flags:
        result["normalization_flags"] = normalization_flags
    if review_reasons:
        result["review_reasons"] = review_reasons

    return result


# ---------------------------------------------------------------------------
# Result submission
# ---------------------------------------------------------------------------

from scripts.vlm.contracts import leakage_guard, compute_response_sha256

_UPSERT_SQL = """
    INSERT INTO question_descriptions_v0 (
        storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
        q_number, subpart, status, confidence, summary, question_type, answer_form,
        math_expressions_latex, variables, units, diagram_elements, leakage_flags, provider, model,
        prompt_version, extractor_version, response_sha256, raw_json, created_at, updated_at
    )
    VALUES (
        %(storage_key)s, %(sha256)s, %(syllabus_code)s, %(session)s, %(year)s, %(doc_type)s,
        %(paper)s, %(variant)s, %(q_number)s, %(subpart)s, %(status)s, %(confidence)s,
        %(summary)s, %(question_type)s, %(answer_form)s, %(math_expressions_latex)s,
        %(variables)s, %(units)s, %(diagram_elements)s, %(leakage_flags)s::jsonb, %(provider)s, %(model)s,
        %(prompt_version)s, %(extractor_version)s, %(response_sha256)s, %(raw_json)s::jsonb,
        now(), now()
    )
    ON CONFLICT (storage_key, sha256, extractor_version, provider, model, prompt_version)
    DO UPDATE SET
        status = EXCLUDED.status,
        confidence = EXCLUDED.confidence,
        summary = EXCLUDED.summary,
        question_type = EXCLUDED.question_type,
        answer_form = EXCLUDED.answer_form,
        math_expressions_latex = EXCLUDED.math_expressions_latex,
        variables = EXCLUDED.variables,
        units = EXCLUDED.units,
        diagram_elements = EXCLUDED.diagram_elements,
        leakage_flags = EXCLUDED.leakage_flags,
        response_sha256 = EXCLUDED.response_sha256,
        raw_json = EXCLUDED.raw_json,
        updated_at = now();
"""

_UPDATE_JOB_SQL = """
    UPDATE vlm_jobs_v0
    SET status = %(status)s, last_error = NULL, updated_at = now()
    WHERE job_id = %(job_id)s
"""

_ERROR_JOB_SQL = """
    UPDATE vlm_jobs_v0
    SET status = 'error', last_error = %(last_error)s, updated_at = now()
    WHERE job_id = %(job_id)s
"""


def submit_result(pool, job_id: str, result: dict) -> str:
    """Submit parsed result to database.

    Applies leakage detection, computes response SHA256, then in a single
    transaction: upserts question_descriptions_v0 and updates vlm_jobs_v0.

    Returns the final job status ("done", "blocked", or "error").

    Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
    """
    # 1. Apply leakage detection (may mutate result["status"] to "blocked")
    data, leakage_flags = leakage_guard(result)

    # 2. Compute response SHA256 for audit trail
    response_sha256 = compute_response_sha256(result)

    # 3. DB schema only allows ok/blocked/error; downgrade needs_review to error.
    if data.get("status") == "needs_review":
        data["status"] = "error"

    # 4. Determine job status based on leakage detection outcome
    job_status = "blocked" if data["status"] == "blocked" else "done"

    # 5. Build the upsert payload
    raw_json = {k: v for k, v in data.items()
                if k not in ("leakage_policy", "response_sha256", "raw_json")}

    payload = {
        "storage_key": data["storage_key"],
        "sha256": data["sha256"],
        "syllabus_code": data.get("syllabus_code"),
        "session": data.get("session"),
        "year": data.get("year"),
        "doc_type": data.get("doc_type"),
        "paper": data.get("paper"),
        "variant": data.get("variant"),
        "q_number": data.get("q_number"),
        "subpart": data.get("subpart"),
        "status": data["status"],
        "confidence": data.get("confidence"),
        "summary": data.get("summary"),
        "question_type": data.get("question_type"),
        "answer_form": data.get("answer_form") or "other",
        "math_expressions_latex": data.get("math_expressions_latex") or [],
        "variables": data.get("variables") or [],
        "units": data.get("units") or [],
        "diagram_elements": data.get("diagram_elements") or [],
        "leakage_flags": json_param(leakage_flags),
        "provider": data["provider"],
        "model": data["model"],
        "prompt_version": data["prompt_version"],
        "extractor_version": data["extractor_version"],
        "response_sha256": response_sha256,
        "raw_json": json_param(raw_json),
    }

    job_params = {"status": job_status, "job_id": job_id}

    # 5. Execute in a single transaction (handles both pool drivers)
    driver = getattr(pool, "_driver", "psycopg2")

    try:
        if driver == "psycopg":
            with pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(_UPSERT_SQL, payload)
                    cur.execute(_UPDATE_JOB_SQL, job_params)
                conn.commit()
        else:
            conn = pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute(_UPSERT_SQL, payload)
                    cur.execute(_UPDATE_JOB_SQL, job_params)
                conn.commit()
            finally:
                pool.putconn(conn)
    except Exception as exc:
        # DB error → mark job as error
        error_msg = str(exc)[:200]
        try:
            if driver == "psycopg":
                with pool.connection() as err_conn:
                    with err_conn.cursor() as err_cur:
                        err_cur.execute(_ERROR_JOB_SQL, {
                            "last_error": error_msg,
                            "job_id": job_id,
                        })
                    err_conn.commit()
            else:
                err_conn = pool.getconn()
                try:
                    with err_conn.cursor() as err_cur:
                        err_cur.execute(_ERROR_JOB_SQL, {
                            "last_error": error_msg,
                            "job_id": job_id,
                        })
                    err_conn.commit()
                finally:
                    pool.putconn(err_conn)
        except Exception:
            pass  # Best-effort error marking
        return "error"

    return job_status


# ---------------------------------------------------------------------------
# Job status helper
# ---------------------------------------------------------------------------

import logging
from threading import Event

_MARK_STATUS_SQL = """
    UPDATE vlm_jobs_v0
    SET status = %(status)s,
        last_error = %(last_error)s,
        updated_at = now()
    WHERE job_id = %(job_id)s
"""


def mark_job_status(
    pool,
    job_id: str,
    status: str,
    error_msg: str | None = None,
) -> None:
    """Update job status in vlm_jobs_v0. Unified status update helper.

    Sets the job's status, last_error, and updated_at fields in a single
    short-lived transaction.

    Requirements: 2.2, 2.3, 3.5, 4.6 (Req 5.1, 5.2)
    """
    params = {
        "job_id": job_id,
        "status": status,
        "last_error": error_msg,
    }

    driver = getattr(pool, "_driver", "psycopg2")

    if driver == "psycopg":
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(_MARK_STATUS_SQL, params)
            conn.commit()
    else:
        conn = pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(_MARK_STATUS_SQL, params)
            conn.commit()
        finally:
            pool.putconn(conn)


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------

# Set up a dedicated file logger for batch errors
_error_logger = logging.getLogger("vlm_batch_errors")
_error_logger.setLevel(logging.ERROR)
if not _error_logger.handlers:
    _error_fh = logging.FileHandler("vlm_batch_errors.log")
    _error_fh.setLevel(logging.ERROR)
    _error_fh.setFormatter(
        logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    )
    _error_logger.addHandler(_error_fh)


def worker_loop(
    worker_id: str,
    config: Config,
    stats: Stats,
    pool,
    client,
    stop_event: Event,
) -> None:
    """Single worker loop: claim → pre_check → call_vlm → parse → submit.

    Runs until stop_event is set, no more jobs available, or max_jobs reached.

    Requirements: 1.4, 7.2, 7.3, 6.2, 6.4 (mapped to Req 1.4, 7.1, 7.3, 8.2, 8.4)
    """
    while True:
        # --- a. Check stop_event ---
        if stop_event.is_set():
            break

        # --- b. Check max_jobs limit ---
        if config.max_jobs is not None and stats.total_done >= config.max_jobs:
            break

        try:
            # --- c. Claim a job ---
            job = claim_job(pool, worker_id, config.status, config.stale_timeout_minutes)
            if job is None:
                break  # No more jobs available

            job_id = job["job_id"]

            # --- d. Pre-check file ---
            status, local_path, error_msg = pre_check(job, config.assets_root)

            if status == "deferred":
                mark_job_status(pool, job_id, "blocked", "contact_sheet")
                stats.increment("blocked")
                continue

            if status == "error":
                mark_job_status(pool, job_id, "error", error_msg)
                stats.increment("error")
                continue

            # --- e. Dry-run mode ---
            if config.dry_run:
                print(f"[dry-run] {worker_id}: would process {job.get('storage_key', job_id)}")
                stats.increment("success")
                continue

            # --- f. Call VLM API with retry ---
            raw_text, in_tok, out_tok = call_vlm_with_retry(
                local_path, job, client, config,
            )
            stats.increment("api_calls")
            stats.increment("input_tokens", in_tok)
            stats.increment("output_tokens", out_tok)

            # --- g. Parse response ---
            result = parse_response(raw_text, job)
            if result is None:
                # Parse fallback: retry one strict call before failing the job.
                try:
                    raw_text_2, in_tok_2, out_tok_2 = call_vlm_with_retry(
                        local_path, job, client, config, strict_mode=True
                    )
                    stats.increment("api_calls")
                    stats.increment("input_tokens", in_tok_2)
                    stats.increment("output_tokens", out_tok_2)
                    result = parse_response(raw_text_2, job)
                except Exception:
                    result = None

                if result is None:
                    mark_job_status(pool, job_id, "error", "parse_failed")
                    stats.increment("error")
                    continue

            # Retry once with stricter prompt if result is clearly incomplete.
            if _needs_retry(result):
                try:
                    raw_text_2, in_tok_2, out_tok_2 = call_vlm_with_retry(
                        local_path, job, client, config, strict_mode=True
                    )
                    stats.increment("api_calls")
                    stats.increment("input_tokens", in_tok_2)
                    stats.increment("output_tokens", out_tok_2)
                    result_2 = parse_response(raw_text_2, job)
                    if result_2 is not None and _quality_score(result_2) >= _quality_score(result):
                        result = result_2
                except Exception:
                    # Keep original parse result; status handling below will catch low-quality output.
                    pass

            # --- h. Submit result ---
            submit_status = submit_result(pool, job_id, result)

            if submit_status == "done":
                stats.increment("success")
            elif submit_status == "blocked":
                stats.increment("blocked")
            elif submit_status == "error":
                stats.increment("error")

            # Check if the parsed result itself was needs_review
            if result.get("status") == "needs_review":
                stats.increment("needs_review")

            # --- i. Log progress ---
            stats.maybe_log_progress()

        except Exception as exc:
            # --- j. Catch-all error handler ---
            _error_logger.error(
                "Worker %s encountered error: %s", worker_id, exc, exc_info=True,
            )
            stats.increment("error")
            continue

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

import signal
from concurrent.futures import ThreadPoolExecutor


def main(argv: list[str] | None = None) -> int:
    """Main entry point for the VLM batch processor.

    Parses CLI arguments, validates environment, initialises the connection
    pool and OpenAI client, registers signal handlers, launches worker
    threads, and prints a final summary when all workers finish.

    Returns 0 on success, non-zero on error.

    Requirements: 1.1, 1.5, 5.2, 6.3
    """
    # 1. Parse CLI args
    config = parse_args(argv)

    # 2. Validate API key (skip if dry_run)
    api_key: str | None = None
    if not config.dry_run:
        api_key = validate_api_key()

    # 3. Enforce local guard (skip if dry_run)
    if not config.dry_run:
        enforce_local(
            config.allow_remote,
            env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
        )

    # 4. Initialise connection pool (skip if dry_run)
    pool = None
    if not config.dry_run:
        pool = init_pool(config)

    # 5. Initialise OpenAI client (skip if dry_run)
    client = None
    if not config.dry_run:
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=api_key, base_url=config.base_url)

    # 6. Create Stats and stop_event
    stats = Stats()
    stop_event = Event()

    # Dry-run in this script is validation-only mode: no DB/API side effects.
    if config.dry_run:
        print("=" * 60)
        print("VLM Batch Processor (validation dry-run)")
        print(f"  Workers:      {config.workers}")
        print(f"  Status:       {','.join(config.status)}")
        print(f"  Max jobs:     {config.max_jobs or 'unlimited'}")
        print(f"  Assets root:  {config.assets_root}")
        print(f"  Model:        {config.model}")
        print(f"  Dry run:      {config.dry_run}")
        print("=" * 60)
        print("Dry-run mode skips DB claiming/submission and API calls.")
        return 0

    # 7. Register signal handlers
    def handle_signal(signum, frame):
        print(f"\nReceived signal {signum}, shutting down gracefully...")
        stop_event.set()

    signal.signal(signal.SIGINT, handle_signal)
    try:
        signal.signal(signal.SIGTERM, handle_signal)
    except (OSError, AttributeError):
        pass  # SIGTERM not available on Windows

    # 8. Print startup banner
    print("=" * 60)
    print("VLM Batch Processor")
    print(f"  Workers:      {config.workers}")
    print(f"  Status:       {','.join(config.status)}")
    print(f"  Max jobs:     {config.max_jobs or 'unlimited'}")
    print(f"  Assets root:  {config.assets_root}")
    print(f"  Model:        {config.model}")
    print(f"  Dry run:      {config.dry_run}")
    print(f"  Allow remote: {config.allow_remote}")
    print(f"  Stale timeout:{config.stale_timeout_minutes} min")
    print("=" * 60)

    # 9. Start ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=config.workers) as executor:
        futures = []
        for i in range(config.workers):
            worker_id = f"vlm_worker_{i}"
            fut = executor.submit(
                worker_loop, worker_id, config, stats, pool, client, stop_event,
            )
            futures.append(fut)

        # Wait for all workers to complete
        for fut in futures:
            try:
                fut.result()
            except Exception as exc:
                _error_logger.error("Worker raised: %s", exc, exc_info=True)

    # 10. Print final summary
    print(stats.summary())

    # 10.1 Optional production publish pipeline
    if config.auto_publish_v1:
        cmd = [sys.executable, "scripts/vlm/run_production_pipeline_v1.py"]
        if config.auto_spot_check_v1:
            cmd.append("--with-spot-check")
        print("[post] Running production publish pipeline:")
        print("[post] " + " ".join(cmd))
        try:
            completed = subprocess.run(cmd, check=False)
            if completed.returncode != 0:
                print(f"[post] publish pipeline failed with code {completed.returncode}")
                return completed.returncode
        except Exception as exc:
            print(f"[post] publish pipeline failed to start: {exc}")
            return 2

    # 11. Close pool if not dry_run
    if pool is not None:
        try:
            pool.close()
        except Exception:
            pass  # Best-effort pool cleanup

    return 0


if __name__ == "__main__":
    sys.exit(main())
