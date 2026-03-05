"""End-to-end integration tests for the VLM batch processor worker_loop.

Exercises the full pipeline: claim → pre_check → call_vlm → parse → submit
using unittest.mock.patch to mock individual functions at the module level.

Test scenarios:
1. Happy path (success): full flow completes, stats.success incremented
2. Deferred path (contact sheet): pre_check returns deferred
3. Error path (file not found): pre_check returns error
4. Needs review path: parse_response returns needs_review result
5. Blocked path (leakage detected): submit_result returns "blocked"
6. Parse failure path: parse_response returns None
7. Multiple jobs in sequence: 3 jobs processed, stats correct

Validates: Requirements 1.2, 2.2, 2.3, 4.5, 8.2
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from threading import Event
from unittest.mock import MagicMock, patch

import pytest

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import worker_loop, Config, Stats

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_MOD = "scripts.vlm.batch_process_v0"

_SAMPLE_JOB = {
    "job_id": "job-001",
    "storage_key": "9709/s23/qp_12/q01.png",
    "sha256": "a" * 64,
    "syllabus_code": "9709",
    "session": "s23",
    "year": 2023,
    "doc_type": "qp",
    "paper": "1",
    "variant": "2",
    "q_number": "1",
    "subpart": None,
    "extractor_version": "v0",
    "provider": "dashscope",
    "model": "qwen3-vl-flash",
    "prompt_version": "v1",
}

_VALID_VLM_JSON = json.dumps({
    "question_type": "calculation",
    "math_expressions_latex": ["x^2 + 3x = 0"],
    "variables": ["x"],
    "units": [],
    "diagram_elements": [],
    "answer_form": "exact",
    "confidence": 0.9,
    "summary": "Solve the quadratic equation for x.",
})

_OK_RESULT = {
    "storage_key": "9709/s23/qp_12/q01.png",
    "sha256": "a" * 64,
    "syllabus_code": "9709",
    "session": "s23",
    "year": 2023,
    "doc_type": "qp",
    "paper": "1",
    "variant": "2",
    "q_number": "1",
    "subpart": None,
    "extractor_version": "v0",
    "provider": "dashscope",
    "model": "qwen3-vl-flash",
    "prompt_version": "v1",
    "question_type": "calculation",
    "math_expressions_latex": ["x^2 + 3x = 0"],
    "variables": ["x"],
    "units": [],
    "diagram_elements": [],
    "answer_form": "exact",
    "confidence": 0.9,
    "summary": "Solve the quadratic equation for x.",
    "status": "ok",
}

_NEEDS_REVIEW_RESULT = {
    **_OK_RESULT,
    "question_type": "other",
    "summary": None,
    "confidence": 0.3,
    "status": "needs_review",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fresh_config(**overrides) -> Config:
    """Create a Config with sensible test defaults."""
    defaults = dict(
        workers=1,
        status=["pending"],
        max_jobs=None,
        assets_root=Path("/fake/assets"),
        dry_run=False,
        allow_remote=False,
        stale_timeout_minutes=10,
    )
    defaults.update(overrides)
    return Config(**defaults)


def _fresh_stats() -> Stats:
    return Stats()


def _fresh_stop() -> Event:
    return Event()


def _job(job_id: str = "job-001", **overrides) -> dict:
    """Return a copy of _SAMPLE_JOB with optional overrides."""
    j = {**_SAMPLE_JOB, "job_id": job_id}
    j.update(overrides)
    return j


# ---------------------------------------------------------------------------
# 1. Happy path – full success flow
# ---------------------------------------------------------------------------

class TestIntegrationHappyPath:
    """Validates: Requirements 1.2, 4.5

    claim_job → pre_check ok → call_vlm returns valid JSON →
    parse_response returns result → submit_result returns "done" →
    stats.success incremented.
    """

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.submit_result", return_value="done")
    @patch(f"{_MOD}.parse_response", return_value=_OK_RESULT.copy())
    @patch(f"{_MOD}.call_vlm_with_retry", return_value=(_VALID_VLM_JSON, 150, 80))
    @patch(f"{_MOD}.pre_check", return_value=("ok", Path("/fake/assets/q01.png"), None))
    @patch(f"{_MOD}.claim_job")
    def test_success_end_to_end(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_submit, mock_mark,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()
        pool = MagicMock()
        client = MagicMock()

        mock_claim.side_effect = [_job(), None]

        worker_loop("w-0", config, stats, pool, client, stop)

        # claim_job called twice (job + None sentinel)
        assert mock_claim.call_count == 2
        # pre_check called with the job and assets_root
        mock_pre.assert_called_once()
        assert mock_pre.call_args[0][0]["job_id"] == "job-001"
        # VLM API called once
        mock_vlm.assert_called_once()
        # parse_response called with raw text from VLM
        mock_parse.assert_called_once_with(_VALID_VLM_JSON, mock_pre.call_args[0][0])
        # submit_result called with pool, job_id, and parsed result
        mock_submit.assert_called_once()
        assert mock_submit.call_args[0][1] == "job-001"
        # mark_job_status NOT called (success path doesn't use it)
        mock_mark.assert_not_called()
        # Stats
        assert stats.success == 1
        assert stats.error == 0
        assert stats.blocked == 0
        assert stats.deferred == 0
        assert stats.api_calls == 1
        assert stats.input_tokens == 150
        assert stats.output_tokens == 80


# ---------------------------------------------------------------------------
# 2. Deferred path – contact sheet detected
# ---------------------------------------------------------------------------

class TestIntegrationDeferredPath:
    """Validates: Requirements 2.2, 2.3

    claim_job → pre_check returns "deferred" (contact sheet) →
    mark_job_status called with "deferred" → stats.deferred incremented.
    """

    @patch(f"{_MOD}.submit_result")
    @patch(f"{_MOD}.call_vlm_with_retry")
    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.pre_check", return_value=("deferred", None, "contact_sheet"))
    @patch(f"{_MOD}.claim_job")
    def test_contact_sheet_deferred(
        self, mock_claim, mock_pre, mock_mark, mock_vlm, mock_submit,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()

        job = _job(storage_key="9709/s23/qp_12/contact_sheet_01.png")
        mock_claim.side_effect = [job, None]

        worker_loop("w-0", config, stats, MagicMock(), MagicMock(), stop)

        # mark_job_status called with deferred
        mock_mark.assert_called_once_with(
            mock_claim.call_args_list[0][0][0],  # pool
            "job-001",
            "blocked",
            "contact_sheet",
        )
        # VLM and submit should NOT be called
        mock_vlm.assert_not_called()
        mock_submit.assert_not_called()
        # Stats
        assert stats.blocked == 1
        assert stats.success == 0
        assert stats.error == 0


# ---------------------------------------------------------------------------
# 3. Error path – file not found
# ---------------------------------------------------------------------------

class TestIntegrationErrorFileNotFound:
    """Validates: Requirements 2.2

    claim_job → pre_check returns "error" (file not found) →
    mark_job_status called with "error" → stats.error incremented.
    """

    @patch(f"{_MOD}.submit_result")
    @patch(f"{_MOD}.call_vlm_with_retry")
    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.pre_check", return_value=("error", None, "file_not_found"))
    @patch(f"{_MOD}.claim_job")
    def test_file_not_found_error(
        self, mock_claim, mock_pre, mock_mark, mock_vlm, mock_submit,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()

        mock_claim.side_effect = [_job(), None]

        worker_loop("w-0", config, stats, MagicMock(), MagicMock(), stop)

        # mark_job_status called with error
        mock_mark.assert_called_once()
        args = mock_mark.call_args[0]
        assert args[1] == "job-001"
        assert args[2] == "error"
        assert args[3] == "file_not_found"
        # VLM and submit should NOT be called
        mock_vlm.assert_not_called()
        mock_submit.assert_not_called()
        # Stats
        assert stats.error == 1
        assert stats.success == 0
        assert stats.deferred == 0


# ---------------------------------------------------------------------------
# 4. Needs review path
# ---------------------------------------------------------------------------

class TestIntegrationNeedsReviewPath:
    """Validates: Requirements 8.2

    claim_job → pre_check ok → call_vlm returns JSON with missing summary
    and question_type="other" → parse_response returns result with
    status="needs_review" → submit_result returns "done" →
    stats.needs_review incremented.
    """

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.submit_result", return_value="done")
    @patch(f"{_MOD}.parse_response", return_value=_NEEDS_REVIEW_RESULT.copy())
    @patch(f"{_MOD}.call_vlm_with_retry", return_value=('{"question_type":"other"}', 100, 40))
    @patch(f"{_MOD}.pre_check", return_value=("ok", Path("/fake/assets/q01.png"), None))
    @patch(f"{_MOD}.claim_job")
    def test_needs_review_increments_stats(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_submit, mock_mark,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()

        mock_claim.side_effect = [_job(), None]

        worker_loop("w-0", config, stats, MagicMock(), MagicMock(), stop)

        # submit_result was called (returns "done")
        mock_submit.assert_called_once()
        # The parsed result has status="needs_review", so both success and
        # needs_review should be incremented per the worker_loop logic:
        #   submit_status == "done" → stats.success += 1
        #   result["status"] == "needs_review" → stats.needs_review += 1
        assert stats.success == 1
        assert stats.needs_review == 1
        assert stats.error == 0
        assert stats.blocked == 0
        # mark_job_status NOT called (submit handled the DB update)
        mock_mark.assert_not_called()


# ---------------------------------------------------------------------------
# 5. Blocked path – leakage detected
# ---------------------------------------------------------------------------

class TestIntegrationBlockedPath:
    """Validates: Requirements 4.5

    claim_job → pre_check ok → call_vlm returns JSON with leakage content →
    parse_response returns result → submit_result returns "blocked" →
    stats.blocked incremented.
    """

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.submit_result", return_value="blocked")
    @patch(f"{_MOD}.parse_response", return_value=_OK_RESULT.copy())
    @patch(f"{_MOD}.call_vlm_with_retry", return_value=(_VALID_VLM_JSON, 120, 60))
    @patch(f"{_MOD}.pre_check", return_value=("ok", Path("/fake/assets/q01.png"), None))
    @patch(f"{_MOD}.claim_job")
    def test_blocked_leakage_detected(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_submit, mock_mark,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()

        mock_claim.side_effect = [_job(), None]

        worker_loop("w-0", config, stats, MagicMock(), MagicMock(), stop)

        # submit_result called and returned "blocked"
        mock_submit.assert_called_once()
        # Stats
        assert stats.blocked == 1
        assert stats.success == 0
        assert stats.error == 0
        # API was still called
        assert stats.api_calls == 1
        assert stats.input_tokens == 120
        assert stats.output_tokens == 60
        # mark_job_status NOT called (submit_result handles status)
        mock_mark.assert_not_called()


# ---------------------------------------------------------------------------
# 6. Parse failure path
# ---------------------------------------------------------------------------

class TestIntegrationParseFailure:
    """Validates: Requirements 8.2

    claim_job → pre_check ok → call_vlm returns garbage text →
    parse_response returns None → mark_job_status called with
    "error", "parse_failed" → stats.error incremented.
    """

    @patch(f"{_MOD}.submit_result")
    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.parse_response", return_value=None)
    @patch(f"{_MOD}.call_vlm_with_retry", return_value=("this is not json at all!!!", 90, 30))
    @patch(f"{_MOD}.pre_check", return_value=("ok", Path("/fake/assets/q01.png"), None))
    @patch(f"{_MOD}.claim_job")
    def test_parse_failure_marks_error(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_mark, mock_submit,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()

        mock_claim.side_effect = [_job(), None]

        worker_loop("w-0", config, stats, MagicMock(), MagicMock(), stop)

        # mark_job_status called with error + parse_failed
        mock_mark.assert_called_once()
        args = mock_mark.call_args[0]
        assert args[1] == "job-001"
        assert args[2] == "error"
        assert args[3] == "parse_failed"
        # submit_result should NOT be called (parse failed before submit)
        mock_submit.assert_not_called()
        # Stats
        assert stats.error == 1
        assert stats.success == 0
        # Parse failure triggers one strict retry before the job is marked error.
        assert mock_vlm.call_count == 2
        assert mock_parse.call_count == 2
        assert stats.api_calls == 2
        assert stats.input_tokens == 180
        assert stats.output_tokens == 60


# ---------------------------------------------------------------------------
# 7. Multiple jobs in sequence
# ---------------------------------------------------------------------------

class TestIntegrationMultipleJobs:
    """Validates: Requirements 1.2, 2.2, 2.3, 4.5, 8.2

    claim_job returns 3 jobs then None → verify all 3 are processed
    and stats are correct. Tests a mix of outcomes:
      job-001: success
      job-002: deferred (contact sheet)
      job-003: blocked (leakage)
    """

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.submit_result")
    @patch(f"{_MOD}.parse_response")
    @patch(f"{_MOD}.call_vlm_with_retry")
    @patch(f"{_MOD}.pre_check")
    @patch(f"{_MOD}.claim_job")
    def test_three_jobs_mixed_outcomes(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_submit, mock_mark,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()

        job1 = _job("job-001")
        job2 = _job("job-002", storage_key="9709/s23/qp_12/contact_sheet.png")
        job3 = _job("job-003")

        mock_claim.side_effect = [job1, job2, job3, None]

        # pre_check: job1 ok, job2 deferred, job3 ok
        mock_pre.side_effect = [
            ("ok", Path("/fake/assets/q01.png"), None),
            ("deferred", None, "contact_sheet"),
            ("ok", Path("/fake/assets/q03.png"), None),
        ]

        # VLM: called for job1 and job3 only
        mock_vlm.side_effect = [
            (_VALID_VLM_JSON, 150, 80),
            (_VALID_VLM_JSON, 130, 70),
        ]

        # parse: called for job1 and job3 only
        mock_parse.side_effect = [
            _OK_RESULT.copy(),
            _OK_RESULT.copy(),
        ]

        # submit: job1 → done, job3 → blocked
        mock_submit.side_effect = ["done", "blocked"]

        worker_loop("w-0", config, stats, MagicMock(), MagicMock(), stop)

        # All 4 claim calls (3 jobs + None)
        assert mock_claim.call_count == 4
        # pre_check called 3 times (once per job)
        assert mock_pre.call_count == 3
        # VLM called 2 times (job1 + job3, not job2)
        assert mock_vlm.call_count == 2
        # parse called 2 times
        assert mock_parse.call_count == 2
        # submit called 2 times
        assert mock_submit.call_count == 2
        # mark_job_status called once for the deferred job
        mock_mark.assert_called_once()
        mark_args = mock_mark.call_args[0]
        assert mark_args[1] == "job-002"
        assert mark_args[2] == "blocked"

        # Final stats
        assert stats.success == 1    # job-001
        assert stats.blocked == 2    # job-002 (contact sheet) + job-003 (leakage)
        assert stats.error == 0
        assert stats.needs_review == 0
        assert stats.api_calls == 2
        assert stats.input_tokens == 280   # 150 + 130
        assert stats.output_tokens == 150  # 80 + 70
        assert stats.total_done == 3


class TestIntegrationMultipleJobsAllPaths:
    """Extended multi-job test covering all status paths in a single run.

    Validates: Requirements 1.2, 2.2, 2.3, 4.5, 8.2

    job-001: success (done)
    job-002: deferred (contact sheet)
    job-003: error (file not found)
    job-004: needs_review (low quality)
    job-005: blocked (leakage)
    job-006: error (parse failure)
    """

    @patch(f"{_MOD}.mark_job_status")
    @patch(f"{_MOD}.submit_result")
    @patch(f"{_MOD}.parse_response")
    @patch(f"{_MOD}.call_vlm_with_retry")
    @patch(f"{_MOD}.pre_check")
    @patch(f"{_MOD}.claim_job")
    def test_six_jobs_all_paths(
        self, mock_claim, mock_pre, mock_vlm, mock_parse, mock_submit, mock_mark,
    ):
        config = _fresh_config()
        stats = _fresh_stats()
        stop = _fresh_stop()

        jobs = [_job(f"job-{i:03d}") for i in range(1, 7)]
        mock_claim.side_effect = jobs + [None]

        # pre_check results per job
        mock_pre.side_effect = [
            ("ok", Path("/fake/assets/q01.png"), None),       # job-001: ok
            ("deferred", None, "contact_sheet"),               # job-002: deferred
            ("error", None, "file_not_found"),                 # job-003: error
            ("ok", Path("/fake/assets/q04.png"), None),       # job-004: ok
            ("ok", Path("/fake/assets/q05.png"), None),       # job-005: ok
            ("ok", Path("/fake/assets/q06.png"), None),       # job-006: ok
        ]

        # VLM: job-004 (needs_review) and job-006 (parse failure) each retry once.
        mock_vlm.side_effect = [
            (_VALID_VLM_JSON, 100, 50),   # job-001
            ('{"question_type":"other"}', 80, 30),  # job-004 first pass
            ('{"question_type":"other"}', 85, 35),  # job-004 strict retry
            (_VALID_VLM_JSON, 110, 55),   # job-005
            ("garbage text!!!", 90, 40),  # job-006 first pass
            ("garbage text!!!", 95, 45),  # job-006 strict retry
        ]

        # parse: called for each API response, including retries.
        mock_parse.side_effect = [
            _OK_RESULT.copy(),              # job-001: ok
            _NEEDS_REVIEW_RESULT.copy(),    # job-004: needs_review
            _NEEDS_REVIEW_RESULT.copy(),    # job-004 strict retry still needs review
            _OK_RESULT.copy(),              # job-005: ok (leakage detected at submit)
            None,                           # job-006: parse failure
            None,                           # job-006 strict retry: still parse failure
        ]

        # submit: called for job-001, job-004, job-005 (not job-006)
        mock_submit.side_effect = [
            "done",     # job-001
            "done",     # job-004 (needs_review result, but submit returns done)
            "blocked",  # job-005
        ]

        worker_loop("w-0", config, stats, MagicMock(), MagicMock(), stop)

        # Verify claim called 7 times (6 jobs + None)
        assert mock_claim.call_count == 7

        # mark_job_status called for: deferred (job-002), error (job-003),
        # parse_failed (job-006)
        assert mock_mark.call_count == 3
        mark_calls = mock_mark.call_args_list
        # job-002: blocked (contact sheet)
        assert mark_calls[0][0][1] == "job-002"
        assert mark_calls[0][0][2] == "blocked"
        assert mark_calls[0][0][3] == "contact_sheet"
        # job-003: error
        assert mark_calls[1][0][1] == "job-003"
        assert mark_calls[1][0][2] == "error"
        assert mark_calls[1][0][3] == "file_not_found"
        # job-006: parse_failed
        assert mark_calls[2][0][1] == "job-006"
        assert mark_calls[2][0][2] == "error"
        assert mark_calls[2][0][3] == "parse_failed"

        # Final stats
        assert stats.success == 2       # job-001 + job-004
        assert stats.error == 2         # job-003 + job-006
        assert stats.needs_review == 1  # job-004
        assert stats.blocked == 2       # job-002 (contact sheet) + job-005 (leakage)
        assert stats.api_calls == 6     # job-001, 004x2, 005, 006x2
        assert stats.input_tokens == 560   # 100 + 80 + 85 + 110 + 90 + 95
        assert stats.output_tokens == 255  # 50 + 30 + 35 + 55 + 40 + 45
        # total_done = success + error + blocked + deferred + needs_review
        # = 2 + 2 + 2 + 0 + 1 = 7 (needs_review is additive on top of success)
        assert stats.total_done == 7
