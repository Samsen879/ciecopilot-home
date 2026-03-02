#!/usr/bin/env python3
"""Shared environment loading helpers for scripts/*."""
from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]


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
