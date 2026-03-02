"""Property-based tests for max-jobs limit in worker_loop().

Uses hypothesis to verify that the total number of jobs processed by
worker_loop NEVER exceeds config.max_jobs, regardless of the max_jobs value.

**Validates: Requirements 7.3**
"""
from __future__ import annotations

import sys
from pathlib import Path
from threading import Event
from unittest.mock import patch, MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# Ensure the project root is on sys.path so the import works
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


# ---------------------------------------------------------------------------
# Property 10: max-jobs limit
#
# For ANY max_jobs value (1–100), the total number of jobs processed by
# worker_loop NEVER exceeds max_jobs.
#
# In dry-run mode with pre_check returning "ok", each loop iteration
# claims a job, passes pre_check, prints a dry-run message, and increments
# stats.success.  The loop checks stats.total_done >= max_jobs at the top
# of each iteration and breaks when the limit is reached.
#
# We mock claim_job to always return a job (simulating an infinite queue)
# and pre_check to always return "ok", so the ONLY reason the loop stops
# is the max_jobs guard.
#
# **Validates: Requirements 7.3**
# ---------------------------------------------------------------------------


class TestProperty10MaxJobsLimit:
    """
    **Property 10**: For ANY max_jobs value in [1, 100], worker_loop
    processes at most max_jobs jobs.  With an infinite job queue (claim_job
    always succeeds) and dry-run mode (no API/DB), the loop MUST stop
    exactly when stats.total_done reaches max_jobs.

    **Validates: Requirements 7.3**
    """

    @given(max_jobs=st.integers(min_value=1, max_value=100))
    @settings(max_examples=50)
    def test_total_done_never_exceeds_max_jobs(self, max_jobs: int):
        """total_done is always <= max_jobs after worker_loop completes."""
        config = Config(
            workers=1,
            max_jobs=max_jobs,
            dry_run=True,
            assets_root=Path("/fake"),
        )
        stats = Stats()
        stop_event = Event()

        with patch(f"{_MOD}.claim_job", return_value=_SAMPLE_JOB.copy()), \
             patch(f"{_MOD}.pre_check", return_value=("ok", Path("/fake/q01.png"), None)):
            worker_loop("w-test", config, stats, None, None, stop_event)

        assert stats.total_done <= max_jobs, (
            f"total_done={stats.total_done} exceeded max_jobs={max_jobs}"
        )

    @given(max_jobs=st.integers(min_value=1, max_value=100))
    @settings(max_examples=50)
    def test_total_done_equals_max_jobs_exactly(self, max_jobs: int):
        """With an infinite queue and no errors, total_done == max_jobs exactly."""
        config = Config(
            workers=1,
            max_jobs=max_jobs,
            dry_run=True,
            assets_root=Path("/fake"),
        )
        stats = Stats()
        stop_event = Event()

        with patch(f"{_MOD}.claim_job", return_value=_SAMPLE_JOB.copy()), \
             patch(f"{_MOD}.pre_check", return_value=("ok", Path("/fake/q01.png"), None)):
            worker_loop("w-test", config, stats, None, None, stop_event)

        assert stats.total_done == max_jobs, (
            f"Expected total_done={max_jobs}, got {stats.total_done}"
        )
