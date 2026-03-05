"""Unit tests for scripts/ms/seed_ms_jobs.py

Tests the seed_ms_jobs function and CLI entry point.
Requirements: 1.2, 1.3
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.seed_ms_jobs import seed_ms_jobs, main, _SELECT_MS_ASSETS_SQL, _INSERT_JOB_SQL


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_asset_row(
    storage_key="9702/s17_ms_12/ms_question_img/q1.png",
    sha256="a" * 64,
    paper_id="00000000-0000-0000-0000-000000000001",
    syllabus_code="9702",
    session="s",
    year=2017,
    paper=1,
    variant=2,
    q_number=1,
    subpart=None,
):
    return (storage_key, sha256, paper_id, syllabus_code, session,
            year, paper, variant, q_number, subpart)


def _mock_connect(assets, insert_rowcount=1):
    """Return a mock connection whose cursor returns *assets* on SELECT
    and sets rowcount=insert_rowcount on INSERT."""
    conn = MagicMock()
    cur = MagicMock()

    # Track call sequence: first cursor context is SELECT, second is INSERT loop
    cursor_calls = [0]

    def cursor_side_effect():
        ctx = MagicMock()
        idx = cursor_calls[0]
        cursor_calls[0] += 1
        if idx == 0:
            # SELECT cursor
            ctx.__enter__ = MagicMock(return_value=cur)
            cur.fetchall.return_value = assets
        else:
            # INSERT cursor
            insert_cur = MagicMock()
            insert_cur.rowcount = insert_rowcount
            ctx.__enter__ = MagicMock(return_value=insert_cur)
        ctx.__exit__ = MagicMock(return_value=False)
        return ctx

    conn.cursor.side_effect = cursor_side_effect
    return conn


# ---------------------------------------------------------------------------
# Tests: seed_ms_jobs function
# ---------------------------------------------------------------------------

class TestSeedMsJobs:
    """Tests for the core seed_ms_jobs function."""

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_dry_run_no_inserts(self, mock_connect):
        assets = [_make_asset_row(), _make_asset_row(storage_key="q2.png")]
        conn = _mock_connect(assets)
        mock_connect.return_value = conn

        result = seed_ms_jobs(extractor_version="v0.1", dry_run=True)

        assert result["total"] == 2
        assert result["inserted"] == 0
        assert result["skipped"] == 0
        # Should NOT have opened a second cursor for inserts
        assert conn.cursor.call_count == 1
        conn.commit.assert_not_called()

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_inserts_all_new(self, mock_connect):
        assets = [_make_asset_row(), _make_asset_row(storage_key="q2.png")]
        conn = _mock_connect(assets, insert_rowcount=1)
        mock_connect.return_value = conn

        result = seed_ms_jobs(extractor_version="v0.1")

        assert result["total"] == 2
        assert result["inserted"] == 2
        assert result["skipped"] == 0
        conn.commit.assert_called_once()

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_skips_existing(self, mock_connect):
        assets = [_make_asset_row()]
        conn = _mock_connect(assets, insert_rowcount=0)  # ON CONFLICT DO NOTHING
        mock_connect.return_value = conn

        result = seed_ms_jobs(extractor_version="v0.1")

        assert result["total"] == 1
        assert result["inserted"] == 0
        assert result["skipped"] == 1

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_empty_assets(self, mock_connect):
        conn = _mock_connect([], insert_rowcount=0)
        mock_connect.return_value = conn

        result = seed_ms_jobs(extractor_version="v0.1")

        assert result == {"inserted": 0, "skipped": 0, "total": 0}

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_rollback_on_error(self, mock_connect):
        assets = [_make_asset_row()]
        conn = MagicMock()
        select_cur = MagicMock()
        select_cur.fetchall.return_value = assets
        insert_cur = MagicMock()
        insert_cur.execute.side_effect = Exception("DB error")

        call_idx = [0]
        def cursor_side_effect():
            ctx = MagicMock()
            idx = call_idx[0]
            call_idx[0] += 1
            if idx == 0:
                ctx.__enter__ = MagicMock(return_value=select_cur)
            else:
                ctx.__enter__ = MagicMock(return_value=insert_cur)
            ctx.__exit__ = MagicMock(return_value=False)
            return ctx

        conn.cursor.side_effect = cursor_side_effect
        mock_connect.return_value = conn

        with pytest.raises(Exception, match="DB error"):
            seed_ms_jobs(extractor_version="v0.1")

        conn.rollback.assert_called_once()
        conn.close.assert_called_once()

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_connection_always_closed(self, mock_connect):
        conn = _mock_connect([])
        mock_connect.return_value = conn

        seed_ms_jobs(extractor_version="v0.1")
        conn.close.assert_called_once()

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_default_params(self, mock_connect):
        conn = _mock_connect([])
        mock_connect.return_value = conn

        seed_ms_jobs(extractor_version="v0.1")
        # Verify defaults are used (no error = defaults accepted)

    @patch("scripts.ms.seed_ms_jobs.connect")
    def test_custom_params_passed_to_insert(self, mock_connect):
        asset = _make_asset_row()
        conn = MagicMock()
        select_cur = MagicMock()
        select_cur.fetchall.return_value = [asset]
        insert_cur = MagicMock()
        insert_cur.rowcount = 1

        call_idx = [0]
        def cursor_side_effect():
            ctx = MagicMock()
            idx = call_idx[0]
            call_idx[0] += 1
            if idx == 0:
                ctx.__enter__ = MagicMock(return_value=select_cur)
            else:
                ctx.__enter__ = MagicMock(return_value=insert_cur)
            ctx.__exit__ = MagicMock(return_value=False)
            return ctx

        conn.cursor.side_effect = cursor_side_effect
        mock_connect.return_value = conn

        seed_ms_jobs(
            extractor_version="v0.2",
            provider="openai",
            model="gpt-4o",
            prompt_version="ms_v2",
        )

        # Check the params passed to INSERT
        insert_call = insert_cur.execute.call_args
        params = insert_call[0][1]
        assert params["extractor_version"] == "v0.2"
        assert params["provider"] == "openai"
        assert params["model"] == "gpt-4o"
        assert params["prompt_version"] == "ms_v2"


# ---------------------------------------------------------------------------
# Tests: CLI
# ---------------------------------------------------------------------------

class TestSeedCLI:
    """Tests for the CLI entry point."""

    @patch("scripts.ms.seed_ms_jobs.seed_ms_jobs")
    def test_cli_required_args(self, mock_seed):
        mock_seed.return_value = {"inserted": 0, "skipped": 0, "total": 0}
        with patch("sys.argv", ["seed_ms_jobs.py", "--extractor-version", "v0.1"]):
            assert main() == 0
        mock_seed.assert_called_once_with(
            extractor_version="v0.1",
            provider="dashscope",
            model="qwen-vl-max",
            prompt_version="ms_v1",
            dry_run=False,
        )

    @patch("scripts.ms.seed_ms_jobs.seed_ms_jobs")
    def test_cli_dry_run(self, mock_seed):
        mock_seed.return_value = {"inserted": 0, "skipped": 0, "total": 5}
        with patch("sys.argv", ["seed_ms_jobs.py", "--extractor-version", "v0.1", "--dry-run"]):
            assert main() == 0
        mock_seed.assert_called_once_with(
            extractor_version="v0.1",
            provider="dashscope",
            model="qwen-vl-max",
            prompt_version="ms_v1",
            dry_run=True,
        )

    @patch("scripts.ms.seed_ms_jobs.seed_ms_jobs")
    def test_cli_custom_params(self, mock_seed):
        mock_seed.return_value = {"inserted": 3, "skipped": 2, "total": 5}
        with patch("sys.argv", [
            "seed_ms_jobs.py",
            "--extractor-version", "v0.2",
            "--provider", "openai",
            "--model", "gpt-4o",
            "--prompt-version", "ms_v2",
        ]):
            assert main() == 0
        mock_seed.assert_called_once_with(
            extractor_version="v0.2",
            provider="openai",
            model="gpt-4o",
            prompt_version="ms_v2",
            dry_run=False,
        )

    def test_cli_missing_extractor_version(self):
        with patch("sys.argv", ["seed_ms_jobs.py"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 2  # argparse error
