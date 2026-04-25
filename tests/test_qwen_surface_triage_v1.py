from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.qwen_surface_triage_v1 import (  # noqa: E402
    apply_manifest_diagram_gold,
    build_surface_triage_result,
    summarize_surface_triage,
)


def test_build_surface_triage_result_wraps_provider_output_and_preserves_manifest_flags(tmp_path):
    image_path = tmp_path / "q09.png"
    image_path.write_bytes(b"fake-image")
    item = {
        "storage_key": "9709/s24_qp_13/questions/q09.png",
        "diagram_present": False,
        "formula_dense": None,
        "table_heavy": None,
    }

    result = build_surface_triage_result(
        item,
        {
            "diagram_present": True,
            "formula_dense": True,
            "table_heavy": False,
            "surface_confidence": 0.87,
            "surface_reasons": ["printed request to sketch is not a printed diagram"],
        },
        image_path=image_path,
        model="qwen3.6-plus",
    )

    assert result["schema_version"] == "surface_triage_v1"
    assert result["storage_key"] == "9709/s24_qp_13/questions/q09.png"
    assert result["input_asset_hash"] is not None
    assert result["manifest_surface_flags"]["diagram_present"] is False
    assert result["triage"]["diagram_present"] is True
    assert result["effective_surface_flags"]["diagram_present"] is False
    assert result["effective_surface_flags"]["formula_dense"] is True
    assert result["effective_surface_flags"]["table_heavy"] is False
    assert result["qwen_diagram_disagrees_with_manifest"] is True


def test_apply_manifest_diagram_gold_keeps_qwen_diagram_when_manifest_is_unknown(tmp_path):
    image_path = tmp_path / "q09.png"
    image_path.write_bytes(b"fake-image")
    item = {"storage_key": "9709/s24_qp_13/questions/q09.png", "diagram_present": None}

    flags = apply_manifest_diagram_gold(
        item,
        {"diagram_present": True, "formula_dense": False, "table_heavy": False},
    )

    assert flags == {
        "diagram_present": True,
        "formula_dense": False,
        "table_heavy": False,
    }


def test_summarize_surface_triage_counts_disagreements_and_missing_flags():
    summary = summarize_surface_triage([
        {
            "storage_key": "a",
            "qwen_diagram_disagrees_with_manifest": True,
            "effective_surface_flags": {
                "diagram_present": False,
                "formula_dense": True,
                "table_heavy": False,
            },
        },
        {
            "storage_key": "b",
            "qwen_diagram_disagrees_with_manifest": False,
            "effective_surface_flags": {
                "diagram_present": True,
                "formula_dense": None,
                "table_heavy": False,
            },
        },
    ])

    assert summary == {
        "total": 2,
        "diagram_present_true": 1,
        "diagram_present_false": 1,
        "formula_dense_true": 1,
        "formula_dense_false": 0,
        "table_heavy_true": 0,
        "table_heavy_false": 2,
        "qwen_diagram_disagreements": 1,
        "missing_effective_surface_flags": 1,
    }
