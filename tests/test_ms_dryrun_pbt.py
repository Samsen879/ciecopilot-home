"""Property-based tests for dry-run mode in ms_worker_loop.

# Feature: ms-rubric-extraction, Property 28: Dry-run 无副作用

Uses hypothesis to verify:
- For ANY dry_run=True execution with N randomly generated jobs,
  no API calls (call_ms_vlm_with_retry), no DB writes (persist_rubric_points,
  _mark_job_error), and no heartbeat calls should occur.
- Stats.done should equal the number of jobs processed.

**Validates: Requirements 7.2**
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from threading import Event
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_batch_process import MSConfig, Stats, ms_worker_loop


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Number of fake jobs the mock claim_ms_job will return before returning None
_num_jobs = st.integers(min_value=0, max_value=20)

# Random config parameters that should not affect dry-run behaviour
_workers = st.integers(min_value=1, max_value=8)
_stale_timeout = st.integers(min_value=60, max_value=3600)
_heartbeat_seconds = st.integers(min_value=10, max_value=600)

# Random job field values
_storage_key = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="/_-."),
    min_size=1,
    max_size=80,
)
_q_number = st.integers(min_value=1, max_value=20)
_subpart = st.one_of(st.none(), st.text(min_size=1, max_size=4, alphabet="abcdi"))
_syllabus_code = st.sampled_from(["9709", "9231", "9702"])
_session = st.sampled_from(["m", "s", "w"])
_year = st.integers(min_value=2015, max_value=2025)
_paper = st.integers(min_value=1, max_value=6)
_variant = st.integers(min_value=1, max_value=3)


@st.composite
def _fake_job(draw):
    """Generate a random fake job dict matching claim_ms_job output."""
    return {
        "job_id": str(uuid.uuid4()),
        "storage_key": draw(_storage_key),
        "sha256": "abc123",
        "paper_id": None,
        "syllabus_code": draw(_syllabus_code),
        "session": draw(_session),
        "year": draw(_year),
        "paper": draw(_paper),
        "variant": draw(_variant),
        "q_number": draw(_q_number),
        "subpart": draw(_subpart),
        "extractor_version": "v1",
        "provider": "dashscope",
        "model": "qwen-vl-max",
        "prompt_version": "ms_v1",
        "attempts": 1,
    }


# ---------------------------------------------------------------------------
# Property 28: Dry-run 无副作用
# ---------------------------------------------------------------------------


class TestProperty28DryRunNoSideEffects:
    """
    **Property 28**: For ANY dry_run=True execution, no API calls or
    database writes should occur.

    Specifically, when config.dry_run=True:
    1. call_ms_vlm_with_retry is NEVER called
    2. persist_rubric_points is NEVER called
    3. _mark_job_error is NEVER called
    4. heartbeat is NEVER called
    5. stats.done equals the number of jobs processed
    6. stats.api_calls remains 0

    **Validates: Requirements 7.2**
    """

    @given(
        jobs=st.lists(_fake_job(), min_size=0, max_size=15),
        workers_val=_workers,
        stale_timeout_val=_stale_timeout,
        heartbeat_val=_heartbeat_seconds,
    )
    @settings(max_examples=100, deadline=None)
    def test_dry_run_no_vlm_no_persist_no_heartbeat(
        self,
        jobs: list[dict],
        workers_val: int,
        stale_timeout_val: int,
        heartbeat_val: int,
    ):
        """Dry-run processes N jobs without any API calls or DB writes."""
        n = len(jobs)

        config = MSConfig(
            workers=workers_val,
            dry_run=True,
            stale_timeout_seconds=stale_timeout_val,
            heartbeat_seconds=heartbeat_val,
        )
        stats = Stats()
        stop_event = Event()
        pool = MagicMock()
        client = MagicMock()

        # Mock claim_ms_job to return jobs one by one, then None
        claim_index = [0]

        def fake_claim(p, wid, cfg):
            idx = claim_index[0]
            if idx < n:
                claim_index[0] += 1
                return jobs[idx]
            return None

        with (
            patch(
                "scripts.ms.ms_batch_process.claim_ms_job",
                side_effect=fake_claim,
            ) as mock_claim,
            patch(
                "scripts.ms.ms_vlm_call.call_ms_vlm_with_retry",
            ) as mock_vlm,
            patch(
                "scripts.ms.ms_persist.persist_rubric_points",
            ) as mock_persist,
            patch(
                "scripts.ms.ms_batch_process._mark_job_error",
            ) as mock_mark_error,
            patch(
                "scripts.ms.ms_batch_process.heartbeat",
            ) as mock_heartbeat,
        ):
            ms_worker_loop("w_test", config, stats, pool, client, stop_event)

            # 1. VLM call should NEVER be invoked
            mock_vlm.assert_not_called()

            # 2. persist_rubric_points should NEVER be invoked
            mock_persist.assert_not_called()

            # 3. _mark_job_error should NEVER be invoked
            mock_mark_error.assert_not_called()

            # 4. heartbeat should NEVER be invoked
            mock_heartbeat.assert_not_called()

            # 5. stats.done should equal number of jobs processed
            assert stats.done == n

            # 6. stats.api_calls should remain 0
            assert stats.api_calls == 0

            # 7. stats.error should remain 0
            assert stats.error == 0

            # 8. stats.total_jobs should equal number of jobs
            assert stats.total_jobs == n

    @given(
        jobs=st.lists(_fake_job(), min_size=1, max_size=10),
        max_jobs_val=st.integers(min_value=1, max_value=5),
    )
    @settings(max_examples=100, deadline=None)
    def test_dry_run_respects_max_jobs_limit(
        self,
        jobs: list[dict],
        max_jobs_val: int,
    ):
        """Dry-run with max_jobs stops after processing at most max_jobs items."""
        expected_processed = min(max_jobs_val, len(jobs))

        config = MSConfig(dry_run=True, max_jobs=max_jobs_val)
        stats = Stats()
        stop_event = Event()
        pool = MagicMock()
        client = MagicMock()

        claim_index = [0]

        def fake_claim(p, wid, cfg):
            idx = claim_index[0]
            if idx < len(jobs):
                claim_index[0] += 1
                return jobs[idx]
            return None

        with (
            patch(
                "scripts.ms.ms_batch_process.claim_ms_job",
                side_effect=fake_claim,
            ),
            patch(
                "scripts.ms.ms_vlm_call.call_ms_vlm_with_retry",
            ) as mock_vlm,
            patch(
                "scripts.ms.ms_persist.persist_rubric_points",
            ) as mock_persist,
            patch(
                "scripts.ms.ms_batch_process._mark_job_error",
            ) as mock_mark_error,
            patch(
                "scripts.ms.ms_batch_process.heartbeat",
            ) as mock_heartbeat,
        ):
            ms_worker_loop("w_test", config, stats, pool, client, stop_event)

            # No side effects regardless of max_jobs
            mock_vlm.assert_not_called()
            mock_persist.assert_not_called()
            mock_mark_error.assert_not_called()
            mock_heartbeat.assert_not_called()

            # Should process exactly min(max_jobs, len(jobs))
            assert stats.total_jobs == expected_processed
            assert stats.done == expected_processed
            assert stats.api_calls == 0
