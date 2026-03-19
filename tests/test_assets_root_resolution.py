"""Tests for shared assets-root resolution and legacy VLM script defaults."""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _reload_module(module_name: str):
    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


def test_resolve_assets_root_prefers_env(monkeypatch, tmp_path):
    from scripts.common import env as env_module

    monkeypatch.setenv("ASSETS_ROOT", str(tmp_path))

    assert hasattr(env_module, "resolve_assets_root")
    assert env_module.resolve_assets_root() == tmp_path


def test_resolve_assets_root_falls_back_to_first_existing_candidate(monkeypatch, tmp_path):
    from scripts.common import env as env_module

    linux_assets = tmp_path / "linux-assets"
    legacy_assets = tmp_path / "legacy-assets"
    linux_assets.mkdir()
    legacy_assets.mkdir()
    monkeypatch.delenv("ASSETS_ROOT", raising=False)

    assert hasattr(env_module, "LEGACY_ASSETS_ROOT_CANDIDATES")
    monkeypatch.setattr(
        env_module,
        "LEGACY_ASSETS_ROOT_CANDIDATES",
        (linux_assets, legacy_assets),
        raising=False,
    )

    assert hasattr(env_module, "resolve_assets_root")
    assert env_module.resolve_assets_root() == linux_assets


@pytest.mark.parametrize(
    ("module_name", "constant_name"),
    [
        ("scripts.vlm.fill_empty_summaries_v1", "ASSETS_ROOT"),
        ("scripts.vlm.recover_error_rows_v1", "ASSETS_ROOT"),
        ("scripts.vlm.qc_vlm_spot_check", "ASSETS_ROOT"),
    ],
)
def test_legacy_vlm_modules_read_assets_root_from_env(
    monkeypatch,
    tmp_path,
    module_name: str,
    constant_name: str,
):
    monkeypatch.setenv("ASSETS_ROOT", str(tmp_path))

    module = _reload_module(module_name)

    assert getattr(module, constant_name) == tmp_path


def test_run_extraction_uses_env_assets_root_by_default(monkeypatch, tmp_path):
    monkeypatch.setenv("ASSETS_ROOT", str(tmp_path))
    module = _reload_module("scripts.vlm.run_extraction_v0")

    captured = {}

    def fake_run_pipeline(config):
        captured["assets_root"] = config.assets_root

    monkeypatch.setattr(module, "run_pipeline", fake_run_pipeline)
    monkeypatch.setattr(
        sys,
        "argv",
        ["run_extraction_v0.py", "--dry-run", "--max-jobs", "1"],
    )

    module.main()

    assert captured["assets_root"] == tmp_path
