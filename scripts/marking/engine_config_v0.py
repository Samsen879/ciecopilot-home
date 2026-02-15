#!/usr/bin/env python3
"""Frozen configuration loader for B2 Smart Mark Engine v0."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DEFAULT_KEY_GROUPS = ("differentiation", "integration", "complex_numbers", "vectors")

DEFAULT_ALIGNMENT_THRESHOLDS = {
    "min_confidence": 0.45,
    "uncertain_margin": 0.05,
}

DEFAULT_QUALITY_GATE = {
    "step_f1_min": 0.85,
    "rubric_coverage_f1_min": 0.80,
    "uncertain_rate_max": 0.30,
    "parse_fail_rate_max": 0.05,
    "key_group_f1_min": 0.80,
    "key_groups": list(DEFAULT_KEY_GROUPS),
}

DEFAULT_INTEGRITY_GATE = {
    "min_storage_key_hit_rate": 0.90,
    "max_step_dup_rate": 0.30,
    "max_fixed_order_gold_rate": 0.70,
}

DEFAULT_CI_GATE = {
    "suite_path": "data/eval/marking_eval_set_v3_hard_blind_9709_p1p3_120.json",
    "integrity_storage_check": "none",
    "storage_key_base": ".",
    "integrity_storage_check_reason": (
        "CI runner has no local screenshot assets; skip storage_key existence check in CI."
    ),
}

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "marking_engine_v0.json"


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _to_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def load_marking_engine_config(
    config_path: Path | None = None,
    *,
    require_exists: bool = False,
    require_valid_json: bool = False,
) -> dict[str, Any]:
    path = config_path or DEFAULT_CONFIG_PATH
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        if require_exists:
            raise
        return {}
    except json.JSONDecodeError:
        if require_valid_json:
            raise
        return {}
    return _as_dict(raw)


def get_alignment_thresholds(
    *,
    config: dict[str, Any] | None = None,
    config_path: Path | None = None,
) -> tuple[float, float]:
    cfg = config if config is not None else load_marking_engine_config(config_path)
    section = _as_dict(cfg.get("alignment_thresholds"))
    min_conf = _to_float(section.get("min_confidence"), DEFAULT_ALIGNMENT_THRESHOLDS["min_confidence"])
    margin = _to_float(section.get("uncertain_margin"), DEFAULT_ALIGNMENT_THRESHOLDS["uncertain_margin"])
    return min_conf, margin


def get_quality_gate_defaults(
    *,
    config: dict[str, Any] | None = None,
    config_path: Path | None = None,
) -> dict[str, Any]:
    cfg = config if config is not None else load_marking_engine_config(config_path)
    section = _as_dict(cfg.get("quality_gate"))
    key_groups_raw = section.get("key_groups")
    if isinstance(key_groups_raw, list):
        key_groups = [str(x).strip() for x in key_groups_raw if str(x).strip()]
    else:
        key_groups = list(DEFAULT_QUALITY_GATE["key_groups"])

    return {
        "step_f1_min": _to_float(section.get("step_f1_min"), DEFAULT_QUALITY_GATE["step_f1_min"]),
        "rubric_coverage_f1_min": _to_float(
            section.get("rubric_coverage_f1_min"), DEFAULT_QUALITY_GATE["rubric_coverage_f1_min"]
        ),
        "uncertain_rate_max": _to_float(section.get("uncertain_rate_max"), DEFAULT_QUALITY_GATE["uncertain_rate_max"]),
        "parse_fail_rate_max": _to_float(
            section.get("parse_fail_rate_max"), DEFAULT_QUALITY_GATE["parse_fail_rate_max"]
        ),
        "key_group_f1_min": _to_float(section.get("key_group_f1_min"), DEFAULT_QUALITY_GATE["key_group_f1_min"]),
        "key_groups": key_groups or list(DEFAULT_QUALITY_GATE["key_groups"]),
    }


def get_integrity_gate_defaults(
    *,
    config: dict[str, Any] | None = None,
    config_path: Path | None = None,
) -> dict[str, float]:
    cfg = config if config is not None else load_marking_engine_config(config_path)
    section = _as_dict(cfg.get("integrity_gate"))
    return {
        "min_storage_key_hit_rate": _to_float(
            section.get("min_storage_key_hit_rate"), DEFAULT_INTEGRITY_GATE["min_storage_key_hit_rate"]
        ),
        "max_step_dup_rate": _to_float(section.get("max_step_dup_rate"), DEFAULT_INTEGRITY_GATE["max_step_dup_rate"]),
        "max_fixed_order_gold_rate": _to_float(
            section.get("max_fixed_order_gold_rate"), DEFAULT_INTEGRITY_GATE["max_fixed_order_gold_rate"]
        ),
    }


def get_ci_gate_defaults(
    *,
    config: dict[str, Any] | None = None,
    config_path: Path | None = None,
) -> dict[str, str]:
    cfg = config if config is not None else load_marking_engine_config(config_path)
    section = _as_dict(cfg.get("ci_gate"))
    suite_path = str(section.get("suite_path") or DEFAULT_CI_GATE["suite_path"])
    integrity_storage_check = str(section.get("integrity_storage_check") or DEFAULT_CI_GATE["integrity_storage_check"])
    storage_key_base = str(section.get("storage_key_base") or DEFAULT_CI_GATE["storage_key_base"])
    storage_check_reason = str(
        section.get("integrity_storage_check_reason") or DEFAULT_CI_GATE["integrity_storage_check_reason"]
    )
    return {
        "suite_path": suite_path,
        "integrity_storage_check": integrity_storage_check,
        "storage_key_base": storage_key_base,
        "integrity_storage_check_reason": storage_check_reason,
    }


def get_suite_tier(payload: dict[str, Any]) -> str:
    tier = payload.get("tier")
    if isinstance(tier, str) and tier.strip():
        return tier.strip().lower()
    meta = payload.get("metadata")
    if isinstance(meta, dict):
        mt = meta.get("tier")
        if isinstance(mt, str) and mt.strip():
            return mt.strip().lower()
    return "unspecified"


def validate_frozen_config(config: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if not isinstance(config, dict):
        return ["config_root_not_object"]

    required_sections = ("alignment_thresholds", "quality_gate", "integrity_gate", "ci_gate")
    for section in required_sections:
        if not isinstance(config.get(section), dict):
            issues.append(f"missing_or_invalid_section:{section}")

    align = _as_dict(config.get("alignment_thresholds"))
    if "min_confidence" not in align:
        issues.append("missing_alignment_thresholds.min_confidence")
    if "uncertain_margin" not in align:
        issues.append("missing_alignment_thresholds.uncertain_margin")

    qg = _as_dict(config.get("quality_gate"))
    for key in (
        "step_f1_min",
        "rubric_coverage_f1_min",
        "uncertain_rate_max",
        "parse_fail_rate_max",
        "key_group_f1_min",
        "key_groups",
    ):
        if key not in qg:
            issues.append(f"missing_quality_gate.{key}")

    ig = _as_dict(config.get("integrity_gate"))
    for key in ("min_storage_key_hit_rate", "max_step_dup_rate", "max_fixed_order_gold_rate"):
        if key not in ig:
            issues.append(f"missing_integrity_gate.{key}")

    ci = _as_dict(config.get("ci_gate"))
    for key in ("suite_path", "integrity_storage_check", "storage_key_base"):
        if key not in ci:
            issues.append(f"missing_ci_gate.{key}")
    if "integrity_storage_check_reason" not in ci:
        issues.append("missing_ci_gate.integrity_storage_check_reason")

    return issues
