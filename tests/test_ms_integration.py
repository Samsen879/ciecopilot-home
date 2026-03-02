"""End-to-end integration tests for B1 rubric extraction pipeline.

Tests:
1. Claim → VLM call → parse → persist complete transaction path
2. B2 contract fields consumable by sla_align_v0 / adjudicator_v0
3. Migration SQL dry-run (parseable, idempotent structure)

Requirements: 9.1, 9.2
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path
from threading import Event
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_batch_process import MSConfig, Stats, ms_worker_loop
from scripts.ms.ms_persist import compute_point_fingerprint, compute_response_sha256
from scripts.ms.ms_prompt import parse_ms_response
from scripts.ms.contract_validator import _B2_REQUIRED, _B3_REQUIRED, _VALID_KINDS
from scripts.marking.sla_align_v0 import run_from_payload as sla_run
from scripts.marking.adjudicator_v0 import adjudicate


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_JOB = {
    "job_id": str(uuid.uuid4()),
    "storage_key": "9709/ms/m17_q1.png",
    "sha256": "abc123",
    "paper_id": None,
    "syllabus_code": "9709",
    "session": "m17",
    "year": 2017,
    "paper": 1,
    "variant": 1,
    "q_number": 1,
    "subpart": None,
    "extractor_version": "v1",
    "provider": "dashscope",
    "model": "qwen-vl-max",
    "prompt_version": "ms_v1",
    "attempts": 1,
}

_VLM_RESPONSE = json.dumps({
    "rubric_points": [
        {
            "mark_label": "M1",
            "description": "Use chain rule correctly",
            "marks": 1,
            "depends_on_labels": [],
            "ft_mode": "none",
            "expected_answer_latex": "2x",
            "confidence": 0.95,
        },
        {
            "mark_label": "A1",
            "description": "Obtain correct derivative",
            "marks": 1,
            "depends_on_labels": ["M1"],
            "ft_mode": "none",
            "expected_answer_latex": "2x + 1",
            "confidence": 0.90,
        },
        {
            "mark_label": "B1",
            "description": "State domain correctly",
            "marks": 1,
            "depends_on_labels": [],
            "ft_mode": "none",
            "expected_answer_latex": None,
            "confidence": 0.85,
        },
    ]
})


# ===================================================================
# Test 1: Claim → VLM → Parse → Persist transaction path
# ===================================================================


class TestClaimToPersistTransaction:
    """Integration test: full worker loop claim → VLM → parse → persist."""

    def test_full_pipeline_single_job(self):
        """A single job flows through claim, VLM call, parse, and persist."""
        config = MSConfig(dry_run=False)
        stats = Stats()
        stop_event = Event()
        pool = MagicMock()
        client = MagicMock()
        run_id = str(uuid.uuid4())

        # claim_ms_job returns one job then None
        claim_calls = [0]

        def fake_claim(p, wid, cfg):
            if claim_calls[0] == 0:
                claim_calls[0] += 1
                return dict(_JOB)
            return None

        # Track what persist receives
        persisted = []

        def fake_persist(p, job, points, rid, raw, sha):
            persisted.append({
                "job": job,
                "points": points,
                "run_id": rid,
                "raw_json": raw,
                "response_sha256": sha,
            })
            return "done"

        with (
            patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim),
            patch(
                "scripts.ms.ms_vlm_call.call_ms_vlm_with_retry",
                return_value={
                    "raw_text": _VLM_RESPONSE,
                    "input_tokens": 100,
                    "output_tokens": 50,
                },
            ),
            patch("scripts.ms.ms_persist.persist_rubric_points", side_effect=fake_persist),
        ):
            ms_worker_loop("w_test", config, stats, pool, client, stop_event, run_id)

        # Verify pipeline completed
        assert stats.total_jobs == 1
        assert stats.done == 1
        assert stats.error == 0
        assert stats.api_calls == 1
        assert stats.input_tokens == 100
        assert stats.output_tokens == 50

        # Verify persist was called with correct data
        assert len(persisted) == 1
        p = persisted[0]
        assert p["job"]["storage_key"] == _JOB["storage_key"]
        assert p["run_id"] == run_id
        assert len(p["points"]) == 3
        assert p["response_sha256"] == compute_response_sha256(_VLM_RESPONSE)

        # Verify parsed points have correct structure
        labels = [pt["mark_label"] for pt in p["points"]]
        assert labels == ["M1", "A1", "B1"]

    def test_vlm_failure_marks_error(self):
        """When VLM call fails, job is marked as error."""
        config = MSConfig(dry_run=False)
        stats = Stats()
        stop_event = Event()
        pool = MagicMock()
        client = MagicMock()

        claim_calls = [0]

        def fake_claim(p, wid, cfg):
            if claim_calls[0] == 0:
                claim_calls[0] += 1
                return dict(_JOB)
            return None

        with (
            patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim),
            patch(
                "scripts.ms.ms_vlm_call.call_ms_vlm_with_retry",
                side_effect=Exception("API timeout"),
            ),
            patch("scripts.ms.ms_batch_process._mark_job_error") as mock_mark_err,
            patch("scripts.ms.ms_persist.persist_rubric_points") as mock_persist,
        ):
            ms_worker_loop("w_test", config, stats, pool, client, stop_event)

        assert stats.error == 1
        assert stats.done == 0
        mock_mark_err.assert_called_once()
        mock_persist.assert_not_called()

    def test_parse_failure_marks_error(self):
        """When VLM returns unparseable response, job is marked as error."""
        config = MSConfig(dry_run=False)
        stats = Stats()
        stop_event = Event()
        pool = MagicMock()
        client = MagicMock()

        claim_calls = [0]

        def fake_claim(p, wid, cfg):
            if claim_calls[0] == 0:
                claim_calls[0] += 1
                return dict(_JOB)
            return None

        with (
            patch("scripts.ms.ms_batch_process.claim_ms_job", side_effect=fake_claim),
            patch(
                "scripts.ms.ms_vlm_call.call_ms_vlm_with_retry",
                return_value={
                    "raw_text": "not valid json at all",
                    "input_tokens": 50,
                    "output_tokens": 10,
                },
            ),
            patch("scripts.ms.ms_batch_process._mark_job_error") as mock_mark_err,
            patch("scripts.ms.ms_persist.persist_rubric_points") as mock_persist,
        ):
            ms_worker_loop("w_test", config, stats, pool, client, stop_event)

        assert stats.error == 1
        mock_mark_err.assert_called_once()
        mock_persist.assert_not_called()


# ===================================================================
# Test 2: B2 contract fields consumable by sla_align_v0 / adjudicator_v0
# ===================================================================


class TestB2ContractConsumability:
    """Verify rubric_points_ready_v1 output can be consumed by B2 scripts."""

    @staticmethod
    def _make_ready_points() -> list[dict]:
        """Simulate rubric_points_ready_v1 output."""
        rid_m1 = str(uuid.uuid4())
        rid_a1 = str(uuid.uuid4())
        rid_b1 = str(uuid.uuid4())
        return [
            {
                "rubric_id": rid_m1,
                "mark_label": "M1",
                "description": "Use chain rule correctly",
                "kind": "M",
                "depends_on": [],
                "marks": 1,
                "storage_key": "9709/ms/q1.png",
                "q_number": 1,
                "subpart": None,
                "source_version": "v1:dashscope:qwen-vl-max:ms_v1",
            },
            {
                "rubric_id": rid_a1,
                "mark_label": "A1",
                "description": "Obtain correct derivative",
                "kind": "A",
                "depends_on": [rid_m1],
                "marks": 1,
                "storage_key": "9709/ms/q1.png",
                "q_number": 1,
                "subpart": None,
                "source_version": "v1:dashscope:qwen-vl-max:ms_v1",
            },
            {
                "rubric_id": rid_b1,
                "mark_label": "B1",
                "description": "State domain correctly",
                "kind": "B",
                "depends_on": [],
                "marks": 1,
                "storage_key": "9709/ms/q1.png",
                "q_number": 1,
                "subpart": None,
                "source_version": "v1:dashscope:qwen-vl-max:ms_v1",
            },
        ]

    def test_sla_align_v0_consumes_ready_points(self):
        """sla_align_v0 can consume rubric_points with B2 required fields."""
        points = self._make_ready_points()

        # sla_align_v0 needs: rubric_id, mark_label, description
        payload = {
            "steps": [
                {"step_id": "s1", "text": "Apply chain rule to get derivative"},
                {"step_id": "s2", "text": "The domain is x > 0"},
            ],
            "rubric_points": points,
        }

        result = sla_run(payload)

        assert result["rubric_points_total"] == 3
        assert result["steps_total"] == 2
        assert len(result["alignments"]) == 2
        for alignment in result["alignments"]:
            assert "rubric_id" in alignment
            assert "mark_label" in alignment
            assert "confidence" in alignment
            assert "status" in alignment

    def test_adjudicator_v0_consumes_ready_points(self):
        """adjudicator_v0 can consume rubric_points with B2 required fields."""
        points = self._make_ready_points()

        # adjudicator_v0 needs: rubric_id, mark_label, kind, depends_on, marks
        payload = {
            "rubric_points": points,
            "signals": {
                points[0]["rubric_id"]: {"matched": True, "confidence": 0.9},
                points[1]["rubric_id"]: {"matched": True, "confidence": 0.8},
                points[2]["rubric_id"]: {"matched": True, "confidence": 0.7},
            },
        }

        result = adjudicate(payload)

        assert result["total_points"] == 3
        assert len(result["decisions"]) == 3
        for decision in result["decisions"]:
            assert "rubric_id" in decision
            assert "mark_label" in decision
            assert "kind" in decision
            assert "awarded" in decision

    def test_ready_view_has_all_b2_required_fields(self):
        """Each ready point contains all B2 required fields."""
        points = self._make_ready_points()
        for pt in points:
            for field in _B2_REQUIRED:
                assert field in pt, f"Missing B2 field: {field}"
                assert pt[field] is not None, f"B2 field {field} is None"

    def test_ready_view_has_b3_passthrough_fields(self):
        """Each ready point contains B3 passthrough fields."""
        points = self._make_ready_points()
        for pt in points:
            for field in _B3_REQUIRED:
                assert field in pt, f"Missing B3 field: {field}"
                # subpart may be None legitimately
                if field != "subpart":
                    assert pt[field] is not None, f"B3 field {field} is None"

    def test_adjudicator_respects_dependency_chain(self):
        """adjudicator_v0 correctly uses depends_on for dependency blocking."""
        points = self._make_ready_points()

        # M1 not matched → A1 (depends on M1) should be dependency_blocked
        payload = {
            "rubric_points": points,
            "signals": {
                points[0]["rubric_id"]: {"matched": False, "confidence": 0.1},
                points[1]["rubric_id"]: {"matched": True, "confidence": 0.9},
                points[2]["rubric_id"]: {"matched": True, "confidence": 0.9},
            },
        }

        result = adjudicate(payload)
        decisions = {d["rubric_id"]: d for d in result["decisions"]}

        # M1 not awarded
        assert not decisions[points[0]["rubric_id"]]["awarded"]
        # A1 blocked by M1 dependency
        assert not decisions[points[1]["rubric_id"]]["awarded"]
        assert decisions[points[1]["rubric_id"]]["reason"] == "dependency_blocked"
        # B1 independent, should be awarded
        assert decisions[points[2]["rubric_id"]]["awarded"]


# ===================================================================
# Test 3: Migration dry-run (SQL parseable, idempotent structure)
# ===================================================================


class TestMigrationDryRun:
    """Verify migration SQL file is well-formed and uses idempotent patterns."""

    _MIGRATION_PATH = Path(__file__).resolve().parents[1] / \
        "supabase/migrations/20260214120000_b1_rubric_extraction.sql"

    def test_migration_file_exists(self):
        assert self._MIGRATION_PATH.exists(), "Migration file not found"

    def test_migration_file_readable(self):
        sql = self._MIGRATION_PATH.read_text(encoding="utf-8")
        assert len(sql) > 100, "Migration file too short"

    def test_migration_uses_if_not_exists(self):
        """All CREATE TABLE/INDEX statements use IF NOT EXISTS."""
        sql = self._MIGRATION_PATH.read_text(encoding="utf-8").upper()
        # Every CREATE TABLE should have IF NOT EXISTS
        import re
        tables = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", sql)
        tables_with_guard = re.findall(r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)", sql)
        assert len(tables) == len(tables_with_guard), \
            "Some CREATE TABLE statements missing IF NOT EXISTS"

        # Every CREATE INDEX should have IF NOT EXISTS
        indexes = re.findall(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", sql)
        indexes_with_guard = re.findall(
            r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+(\w+)", sql
        )
        assert len(indexes) == len(indexes_with_guard), \
            "Some CREATE INDEX statements missing IF NOT EXISTS"

    def test_migration_creates_required_tables(self):
        """Migration creates vlm_ms_jobs, vlm_ms_runs, rubric_points."""
        sql = self._MIGRATION_PATH.read_text(encoding="utf-8").lower()
        assert "vlm_ms_jobs" in sql
        assert "vlm_ms_runs" in sql
        assert "rubric_points" in sql

    def test_migration_creates_ready_view(self):
        """Migration creates rubric_points_ready_v1 view."""
        sql = self._MIGRATION_PATH.read_text(encoding="utf-8").lower()
        assert "rubric_points_ready_v1" in sql
        assert "create or replace view" in sql

    def test_migration_has_required_constraints(self):
        """Migration includes key CHECK constraints."""
        sql = self._MIGRATION_PATH.read_text(encoding="utf-8")
        # kind constraint
        assert "kind IN ('M','A','B')" in sql or "kind in ('M','A','B')" in sql.lower()
        # marks > 0
        assert "marks > 0" in sql
        # status constraint
        assert "'draft'" in sql and "'ready'" in sql and "'needs_review'" in sql
        # ft_mode constraint
        assert "'none'" in sql and "'follow_through'" in sql

    def test_migration_view_outputs_source_version(self):
        """The ready view includes source_version computed column."""
        sql = self._MIGRATION_PATH.read_text(encoding="utf-8").lower()
        assert "source_version" in sql
        assert "concat_ws" in sql
