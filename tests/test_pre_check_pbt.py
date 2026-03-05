"""Property-based tests for pre_check() in batch_process_v0.py.

Uses hypothesis to verify classification correctness across random
filenames and file-existence combinations.

**Validates: Requirements 2.2, 2.3**
"""
from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path so the import works
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.batch_process_v0 import pre_check

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Alphabet for generating filenames: letters, digits, underscores, hyphens, dots
_FILENAME_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-."

# Strategy for general filenames (non-empty, reasonable length)
_filename_st = st.text(
    alphabet=_FILENAME_ALPHABET,
    min_size=1,
    max_size=60,
)

# Regex matching the contact-sheet pattern (same as production code)
_CONTACT_SHEET_RE = re.compile(r"contact|sheet", re.IGNORECASE)

# Windows reserved device names that always "exist" regardless of directory.
# Must be excluded from strategies that rely on file-existence checks.
_WIN_RESERVED_NAMES = frozenset({
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
})


def _is_win_reserved(name: str) -> bool:
    """Return True if *name* (ignoring extension) is a Windows reserved device name."""
    stem = name.split(".")[0].upper()
    return stem in _WIN_RESERVED_NAMES


# Strategy for filenames that CONTAIN "contact" or "sheet" (case-insensitive)
_contact_sheet_word = st.sampled_from(["contact", "sheet", "Contact", "Sheet", "CONTACT", "SHEET", "CoNtAcT", "sHEeT"])

_contact_sheet_filename_st = st.builds(
    lambda prefix, word, suffix, ext: f"{prefix}{word}{suffix}.{ext}",
    prefix=st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789_-", min_size=0, max_size=15),
    word=_contact_sheet_word,
    suffix=st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789_-", min_size=0, max_size=15),
    ext=st.sampled_from(["png", "jpg", "pdf", "jpeg"]),
)

# Strategy for filenames that do NOT contain "contact" or "sheet"
# Also exclude names that are just dots (`.`, `..`) since those resolve to
# existing directories and are not real filenames.
# Also exclude Windows reserved device names (NUL, CON, etc.) which always
# appear to "exist" on Windows regardless of directory.
_non_contact_sheet_filename_st = _filename_st.filter(
    lambda name: (
        not _CONTACT_SHEET_RE.search(name)
        and name.strip(".") != ""  # exclude ".", "..", "...", etc.
        and not _is_win_reserved(name)
    )
)


def _job(storage_key: str) -> dict:
    """Return a minimal job dict with the given storage_key."""
    return {"storage_key": storage_key}


# ---------------------------------------------------------------------------
# Property 3a: Contact sheet filenames → always deferred
# ---------------------------------------------------------------------------

class TestProperty3aContactSheetAlwaysDeferred:
    """
    **Property 3a**: For ANY filename containing "contact" or "sheet"
    (case-insensitive), pre_check ALWAYS returns
    ("deferred", None, "contact_sheet") regardless of file existence.

    **Validates: Requirements 2.2, 2.3**
    """

    @given(filename=_contact_sheet_filename_st)
    @settings(max_examples=200)
    def test_contact_sheet_deferred_file_exists(self, filename: str):
        """Contact sheet filenames are deferred even when the file exists."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            # Create the file so it exists
            file_path = tmp_path / filename
            file_path.write_bytes(b"\x89PNG")

            status, path, err = pre_check(_job(filename), tmp_path)

            assert status == "deferred", f"Expected 'deferred' for '{filename}', got '{status}'"
            assert path is None
            assert err == "contact_sheet"

    @given(filename=_contact_sheet_filename_st)
    @settings(max_examples=200)
    def test_contact_sheet_deferred_file_missing(self, filename: str):
        """Contact sheet filenames are deferred even when the file does NOT exist."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            # Do NOT create the file

            status, path, err = pre_check(_job(filename), tmp_path)

            assert status == "deferred", f"Expected 'deferred' for '{filename}', got '{status}'"
            assert path is None
            assert err == "contact_sheet"


# ---------------------------------------------------------------------------
# Property 3b: Non-contact-sheet + file missing → always error
# ---------------------------------------------------------------------------

class TestProperty3bNonContactSheetMissingFile:
    """
    **Property 3b**: For ANY filename NOT containing "contact" or "sheet",
    if the file does NOT exist, pre_check ALWAYS returns
    ("error", None, "file_not_found").

    **Validates: Requirements 2.2, 2.3**
    """

    @given(filename=_non_contact_sheet_filename_st)
    @settings(max_examples=200)
    def test_missing_file_returns_error(self, filename: str):
        """Non-contact-sheet filenames with missing files return error."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            # Do NOT create the file

            status, path, err = pre_check(_job(filename), tmp_path)

            assert status == "error", f"Expected 'error' for missing '{filename}', got '{status}'"
            assert path is None
            assert err == "file_not_found"


# ---------------------------------------------------------------------------
# Property 3c: Non-contact-sheet + file exists → always ok with correct path
# ---------------------------------------------------------------------------

class TestProperty3cNonContactSheetExistingFile:
    """
    **Property 3c**: For ANY filename NOT containing "contact" or "sheet",
    if the file DOES exist, pre_check ALWAYS returns
    ("ok", path, None) where path is the resolved file path.

    **Validates: Requirements 2.2, 2.3**
    """

    @given(filename=_non_contact_sheet_filename_st)
    @settings(max_examples=200)
    def test_existing_file_returns_ok(self, filename: str):
        """Non-contact-sheet filenames with existing files return ok."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            # Create the file
            file_path = tmp_path / filename
            file_path.write_bytes(b"\x89PNG")

            status, path, err = pre_check(_job(filename), tmp_path)

            assert status == "ok", f"Expected 'ok' for existing '{filename}', got '{status}'"
            assert path == file_path, f"Expected path '{file_path}', got '{path}'"
            assert err is None


# ---------------------------------------------------------------------------
# Property 3d: pre_check always returns one of exactly three statuses
# ---------------------------------------------------------------------------

class TestProperty3dExhaustiveStatusValues:
    """
    **Property 3d**: pre_check ALWAYS returns one of exactly three status
    values: "ok", "error", or "deferred".

    **Validates: Requirements 2.2, 2.3**
    """

    @given(
        filename=_filename_st.filter(lambda n: n.strip(".") != "" and not _is_win_reserved(n)),
        file_exists=st.booleans(),
    )
    @settings(max_examples=300)
    def test_status_is_one_of_three(self, filename: str, file_exists: bool):
        """Status is always one of 'ok', 'error', or 'deferred'."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            if file_exists:
                file_path = tmp_path / filename
                file_path.write_bytes(b"data")

            status, path, err = pre_check(_job(filename), tmp_path)

            assert status in {"ok", "error", "deferred"}, (
                f"Unexpected status '{status}' for filename='{filename}', "
                f"file_exists={file_exists}"
            )

            # Additional structural invariants on the tuple
            if status == "ok":
                assert path is not None
                assert err is None
            elif status == "error":
                assert path is None
                assert err is not None
            elif status == "deferred":
                assert path is None
                assert err is not None
