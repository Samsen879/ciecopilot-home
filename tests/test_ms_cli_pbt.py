"""Property-based tests for CLI argument parsing in ms_batch_process.py.

# Feature: ms-rubric-extraction, Property 27: CLI 配置解析

Uses hypothesis to verify:
- For ANY valid CLI argument combination, the parsed MSConfig correctly
  reflects all provided argument values.
- Unspecified arguments use their default values.

**Validates: Requirements 7.1**
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.ms_batch_process import parse_ms_args, MSConfig

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Workers: positive integers in a reasonable range
_workers = st.integers(min_value=1, max_value=64)

# Max jobs: positive integers or None
_max_jobs = st.one_of(st.none(), st.integers(min_value=1, max_value=10_000))

# Status: non-empty lists of valid status strings
_VALID_STATUSES = ["pending", "error", "running_stale"]
_status_lists = st.lists(
    st.sampled_from(_VALID_STATUSES),
    min_size=1,
    max_size=3,
    unique=True,
)

# Stale timeout: positive integers (seconds)
_stale_timeout = st.integers(min_value=1, max_value=7200)

# Heartbeat: positive integers (seconds)
_heartbeat = st.integers(min_value=1, max_value=600)

# Dry run: boolean
_dry_run = st.booleans()

# Model: non-empty model name strings
_model = st.sampled_from(["qwen-vl-max", "qwen-vl-plus", "gpt-4o"])

# Base URL: valid URL strings
_base_url = st.sampled_from([
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "https://api.openai.com/v1",
    "https://localhost:8080/v1",
])

# Assets root: simple directory paths
_assets_root = st.sampled_from([".", "/tmp/assets", "data/assets"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_argv(
    workers=None,
    max_jobs=None,
    status_list=None,
    stale_timeout=None,
    heartbeat_secs=None,
    dry_run=None,
    model=None,
    base_url=None,
    assets_root=None,
) -> list[str]:
    """Build a CLI argv list from optional parameter values."""
    argv: list[str] = []
    if workers is not None:
        argv.extend(["--workers", str(workers)])
    if max_jobs is not None:
        argv.extend(["--max-jobs", str(max_jobs)])
    if status_list is not None:
        argv.extend(["--status", ",".join(status_list)])
    if stale_timeout is not None:
        argv.extend(["--stale-timeout-seconds", str(stale_timeout)])
    if heartbeat_secs is not None:
        argv.extend(["--heartbeat-seconds", str(heartbeat_secs)])
    if dry_run is True:
        argv.append("--dry-run")
    if model is not None:
        argv.extend(["--model", model])
    if base_url is not None:
        argv.extend(["--base-url", base_url])
    if assets_root is not None:
        argv.extend(["--assets-root", assets_root])
    return argv


# MSConfig defaults for comparison
_DEFAULTS = MSConfig()


# ---------------------------------------------------------------------------
# Property 27: CLI 配置解析
# ---------------------------------------------------------------------------


class TestProperty27CLIConfigParsing:
    """
    **Property 27**: For ANY valid CLI argument combination, the parsed
    MSConfig correctly reflects all provided argument values. Unspecified
    arguments use their default values.

    **Validates: Requirements 7.1**
    """

    @given(
        workers=_workers,
        max_jobs=_max_jobs,
        status_list=_status_lists,
        stale_timeout=_stale_timeout,
        heartbeat_secs=_heartbeat,
        dry_run=_dry_run,
        model=_model,
        base_url=_base_url,
        assets_root=_assets_root,
    )
    @settings(max_examples=100)
    def test_all_args_reflected_in_config(
        self,
        workers: int,
        max_jobs: int | None,
        status_list: list[str],
        stale_timeout: int,
        heartbeat_secs: int,
        dry_run: bool,
        model: str,
        base_url: str,
        assets_root: str,
    ):
        """When all CLI args are provided, MSConfig reflects every value."""
        argv = _build_argv(
            workers=workers,
            max_jobs=max_jobs,
            status_list=status_list,
            stale_timeout=stale_timeout,
            heartbeat_secs=heartbeat_secs,
            dry_run=dry_run,
            model=model,
            base_url=base_url,
            assets_root=assets_root,
        )
        config = parse_ms_args(argv)

        assert config.workers == workers
        assert config.max_jobs == max_jobs
        assert config.status == status_list
        assert config.stale_timeout_seconds == stale_timeout
        assert config.heartbeat_seconds == heartbeat_secs
        assert config.dry_run == dry_run
        assert config.model == model
        assert config.base_url == base_url
        assert config.assets_root == Path(assets_root)

    @settings(max_examples=100)
    @given(data=st.data())
    def test_unspecified_args_use_defaults(self, data: st.DataObject):
        """When a subset of args is omitted, omitted fields use defaults."""
        # Randomly decide which args to include
        include_workers = data.draw(st.booleans(), label="include_workers")
        include_max_jobs = data.draw(st.booleans(), label="include_max_jobs")
        include_status = data.draw(st.booleans(), label="include_status")
        include_stale = data.draw(st.booleans(), label="include_stale")
        include_hb = data.draw(st.booleans(), label="include_heartbeat")
        include_dry = data.draw(st.booleans(), label="include_dry_run")
        include_model = data.draw(st.booleans(), label="include_model")
        include_url = data.draw(st.booleans(), label="include_base_url")
        include_root = data.draw(st.booleans(), label="include_assets_root")

        workers = data.draw(_workers, label="workers") if include_workers else None
        max_jobs = data.draw(_max_jobs, label="max_jobs") if include_max_jobs else None
        status_list = data.draw(_status_lists, label="status") if include_status else None
        stale_timeout = data.draw(_stale_timeout, label="stale") if include_stale else None
        heartbeat_secs = data.draw(_heartbeat, label="hb") if include_hb else None
        dry_run = data.draw(_dry_run, label="dry") if include_dry else None
        model = data.draw(_model, label="model") if include_model else None
        base_url = data.draw(_base_url, label="url") if include_url else None
        assets_root = data.draw(_assets_root, label="root") if include_root else None

        argv = _build_argv(
            workers=workers,
            max_jobs=max_jobs,
            status_list=status_list,
            stale_timeout=stale_timeout,
            heartbeat_secs=heartbeat_secs,
            dry_run=dry_run,
            model=model,
            base_url=base_url,
            assets_root=assets_root,
        )
        config = parse_ms_args(argv)

        # Specified args should match; omitted args should match defaults
        if include_workers:
            assert config.workers == workers
        else:
            assert config.workers == _DEFAULTS.workers

        if include_max_jobs and max_jobs is not None:
            assert config.max_jobs == max_jobs
        elif not include_max_jobs:
            assert config.max_jobs == _DEFAULTS.max_jobs

        if include_status:
            assert config.status == status_list
        else:
            assert config.status == _DEFAULTS.status

        if include_stale:
            assert config.stale_timeout_seconds == stale_timeout
        else:
            assert config.stale_timeout_seconds == _DEFAULTS.stale_timeout_seconds

        if include_hb:
            assert config.heartbeat_seconds == heartbeat_secs
        else:
            assert config.heartbeat_seconds == _DEFAULTS.heartbeat_seconds

        if include_dry and dry_run:
            assert config.dry_run is True
        elif not include_dry:
            assert config.dry_run == _DEFAULTS.dry_run

        if include_model:
            assert config.model == model
        else:
            assert config.model == _DEFAULTS.model

        if include_url:
            assert config.base_url == base_url
        else:
            assert config.base_url == _DEFAULTS.base_url

        if include_root:
            assert config.assets_root == Path(assets_root)
        else:
            # Default depends on ASSETS_ROOT env var; compare to what parse gives
            assert config.assets_root == _DEFAULTS.assets_root

    @settings(max_examples=100)
    @given(workers=_workers, stale_timeout=_stale_timeout)
    def test_no_args_gives_all_defaults(self, workers: int, stale_timeout: int):
        """Parsing an empty argv produces all default values."""
        config = parse_ms_args([])

        assert config.workers == 4
        assert config.max_jobs is None
        assert config.status == ["pending"]
        assert config.stale_timeout_seconds == 600
        assert config.heartbeat_seconds == 120
        assert config.dry_run is False
        assert config.model == "qwen-vl-max"
        assert config.base_url == "https://dashscope.aliyuncs.com/compatible-mode/v1"

    @given(status_list=_status_lists)
    @settings(max_examples=100)
    def test_status_comma_splitting(self, status_list: list[str]):
        """Comma-separated --status values are correctly split into a list."""
        argv = ["--status", ",".join(status_list)]
        config = parse_ms_args(argv)

        assert config.status == status_list
        assert isinstance(config.status, list)
        assert all(isinstance(s, str) for s in config.status)

    @given(dry_run=_dry_run)
    @settings(max_examples=100)
    def test_dry_run_flag_boolean(self, dry_run: bool):
        """--dry-run flag correctly maps to boolean True; absence maps to False."""
        argv = ["--dry-run"] if dry_run else []
        config = parse_ms_args(argv)

        assert config.dry_run is dry_run
