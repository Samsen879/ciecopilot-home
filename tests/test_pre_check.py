"""Tests for pre_check() in batch_process_v0.py.

Uses the ``tmp_path`` pytest fixture to create temporary files and
directories, verifying file-existence checks and contact-sheet detection.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import pre_check


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _job(storage_key: str) -> dict:
    """Return a minimal job dict with the given storage_key."""
    return {"storage_key": storage_key}


# ---------------------------------------------------------------------------
# Tests – file exists and is NOT a contact sheet → ("ok", path, None)
# ---------------------------------------------------------------------------

class TestPreCheckOk:
    """File exists on disk and is not a contact sheet."""

    def test_returns_ok_with_resolved_path(self, tmp_path: Path):
        # Create a real file
        (tmp_path / "9709" / "s23").mkdir(parents=True)
        img = tmp_path / "9709" / "s23" / "q01.png"
        img.write_bytes(b"\x89PNG")

        status, path, err = pre_check(_job("9709/s23/q01.png"), tmp_path)

        assert status == "ok"
        assert path == img
        assert err is None

    def test_ok_with_nested_directory(self, tmp_path: Path):
        (tmp_path / "a" / "b" / "c").mkdir(parents=True)
        img = tmp_path / "a" / "b" / "c" / "image.png"
        img.write_bytes(b"data")

        status, path, err = pre_check(_job("a/b/c/image.png"), tmp_path)

        assert status == "ok"
        assert path == img
        assert err is None


# ---------------------------------------------------------------------------
# Tests – file does NOT exist → ("error", None, "file_not_found")
# ---------------------------------------------------------------------------

class TestPreCheckFileNotFound:
    """File does not exist on disk (and is not a contact sheet)."""

    def test_returns_error_when_file_missing(self, tmp_path: Path):
        status, path, err = pre_check(
            _job("9709/s23/q01.png"), tmp_path,
        )

        assert status == "error"
        assert path is None
        assert err == "file_not_found"

    def test_returns_error_when_directory_missing(self, tmp_path: Path):
        status, path, err = pre_check(
            _job("nonexistent/dir/file.png"), tmp_path,
        )

        assert status == "error"
        assert path is None
        assert err == "file_not_found"


# ---------------------------------------------------------------------------
# Tests – contact sheet detection → ("deferred", None, "contact_sheet")
# ---------------------------------------------------------------------------

class TestPreCheckContactSheet:
    """Filename contains 'contact' or 'sheet' (case-insensitive)."""

    def test_contact_in_filename(self, tmp_path: Path):
        # File exists but should still be deferred
        img = tmp_path / "contact_overview.png"
        img.write_bytes(b"data")

        status, path, err = pre_check(_job("contact_overview.png"), tmp_path)

        assert status == "deferred"
        assert path is None
        assert err == "contact_sheet"

    def test_sheet_in_filename(self, tmp_path: Path):
        img = tmp_path / "summary_sheet.png"
        img.write_bytes(b"data")

        status, path, err = pre_check(_job("summary_sheet.png"), tmp_path)

        assert status == "deferred"
        assert path is None
        assert err == "contact_sheet"

    def test_case_insensitive_detection(self, tmp_path: Path):
        img = tmp_path / "CONTACT_SHEET.png"
        img.write_bytes(b"data")

        status, path, err = pre_check(_job("CONTACT_SHEET.png"), tmp_path)

        assert status == "deferred"
        assert path is None
        assert err == "contact_sheet"

    def test_contact_sheet_deferred_even_when_file_missing(self, tmp_path: Path):
        """Contact sheet detection should take priority over file existence."""
        status, path, err = pre_check(
            _job("some/path/contact_grid.png"), tmp_path,
        )

        assert status == "deferred"
        assert path is None
        assert err == "contact_sheet"

    def test_sheet_deferred_even_when_file_missing(self, tmp_path: Path):
        status, path, err = pre_check(
            _job("missing/thumbnail_sheet.png"), tmp_path,
        )

        assert status == "deferred"
        assert path is None
        assert err == "contact_sheet"

    def test_mixed_case_contact(self, tmp_path: Path):
        img = tmp_path / "CoNtAcT_page.png"
        img.write_bytes(b"data")

        status, path, err = pre_check(_job("CoNtAcT_page.png"), tmp_path)

        assert status == "deferred"
        assert path is None
        assert err == "contact_sheet"

    def test_mixed_case_sheet(self, tmp_path: Path):
        img = tmp_path / "myShEeT.png"
        img.write_bytes(b"data")

        status, path, err = pre_check(_job("myShEeT.png"), tmp_path)

        assert status == "deferred"
        assert path is None
        assert err == "contact_sheet"
