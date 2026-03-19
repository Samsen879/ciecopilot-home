#!/usr/bin/env python3
"""Shared environment loading helpers for scripts/*."""
from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ASSETS_ROOT = PROJECT_ROOT.parent / "cie-assets"
LEGACY_ASSETS_ROOT_CANDIDATES = (
    DEFAULT_ASSETS_ROOT,
    Path("/mnt/c/Users/Samsen/cie-assets"),
    Path("/mnt/c/Users/samsen/cie-assets"),
    Path("/mnt/c/users/Samsen/cie-assets"),
    Path("/mnt/c/users/samsen/cie-assets"),
    Path(r"C:\Users\Samsen\cie-assets"),
    Path(r"C:\Users\samsen\cie-assets"),
)


def _iter_env_lines(env_path: Path):
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key:
            yield key, value


def load_project_env(env_file: str = ".env", override: bool = False) -> Path:
    """Load key=value pairs from project root env file into os.environ."""
    env_path = PROJECT_ROOT / env_file
    if not env_path.exists():
        return env_path

    for key, value in _iter_env_lines(env_path):
        if override:
            os.environ[key] = value
        else:
            os.environ.setdefault(key, value)
    return env_path


def resolve_assets_root(default: str | Path | None = None) -> Path:
    """Resolve ASSETS_ROOT with Linux-first fallbacks and legacy path support."""
    env_value = os.environ.get("ASSETS_ROOT")
    if env_value:
        return Path(env_value).expanduser()

    candidates: list[Path] = []
    if default is not None:
        candidates.append(Path(default).expanduser())
    candidates.extend(LEGACY_ASSETS_ROOT_CANDIDATES)

    unique_candidates: list[Path] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate)
        if key in seen:
            continue
        seen.add(key)
        unique_candidates.append(candidate)

    for candidate in unique_candidates:
        if candidate.exists():
            return candidate

    return unique_candidates[0]
