"""Shared marking semantics helpers for FT mode and uncertain reasons."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


_SEMANTICS_PATH = Path(__file__).resolve().parents[2] / "api" / "marking" / "lib" / "marking-semantics-v1.json"


@lru_cache(maxsize=1)
def _load_semantics() -> dict[str, Any]:
    with _SEMANTICS_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _candidate_keys(value: Any) -> list[str]:
    raw = str(value if value is not None else "").strip().lower()
    if not raw:
        return []

    base = raw.split(":", 1)[0].strip()
    out: set[str] = set()

    for seed in (raw, base):
        if not seed:
            continue
        out.add(seed)
        underscore = seed.replace(" ", "_").replace("-", "_")
        out.add(underscore)
        out.add(underscore.replace("_", ""))

    return list(out)


def _resolve_alias(aliases: dict[str, str], value: Any, fallback: str) -> str:
    for key in _candidate_keys(value):
        if key in aliases:
            return aliases[key]
    return fallback


def normalize_ft_mode(value: Any) -> str:
    semantics = _load_semantics()
    section = semantics.get("ft_mode") or {}
    aliases = section.get("aliases") or {}
    default = str(section.get("default") or "none")
    return _resolve_alias(aliases, value, default)


def normalize_uncertain_reason(reason: Any, *, awarded: bool = False) -> str | None:
    if awarded:
        return None

    semantics = _load_semantics()
    section = semantics.get("uncertain_reason") or {}
    aliases = section.get("aliases") or {}
    default = str(section.get("default") or "other")
    return _resolve_alias(aliases, reason, default)


def build_uncertain_reason(reason: Any, *, awarded: bool = False) -> dict[str, Any]:
    return {
        "is_uncertain": not awarded,
        "code": normalize_uncertain_reason(reason, awarded=awarded),
        "source_reason": None if reason is None else str(reason),
    }
