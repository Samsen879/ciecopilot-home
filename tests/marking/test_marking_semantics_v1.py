from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

from scripts.marking.marking_semantics_v1 import (
    build_uncertain_reason,
    normalize_ft_mode,
    normalize_uncertain_reason,
)


NODE_BIN = shutil.which("node")


def _node_available() -> bool:
    if NODE_BIN is None:
        return False
    try:
        result = subprocess.run([NODE_BIN, "--version"], capture_output=True, text=True, timeout=10)
        major = int(result.stdout.strip().lstrip("v").split(".")[0])
        return major >= 18
    except Exception:
        return False


requires_node = pytest.mark.skipif(
    not _node_available(),
    reason="Node.js >= 18 not available; skipping JS/Python semantics parity test",
)


def _run_js_semantics(payload: dict) -> dict:
    js_payload = json.dumps(payload, ensure_ascii=True)
    js_code = (
        "import { normalizeFtMode, buildUncertainReason } "
        "from './api/marking/lib/marking-semantics-v1.js';"
        f"const payload = {js_payload};"
        "const out = {"
        "  ft_modes: payload.ft_modes.map((v) => normalizeFtMode(v)),"
        "  uncertain: payload.uncertain.map((i) => buildUncertainReason(i.reason, { awarded: i.awarded })),"
        "};"
        "console.log(JSON.stringify(out));"
    )
    result = subprocess.run(
        [NODE_BIN, "--input-type=module", "-e", js_code],
        capture_output=True,
        text=True,
        timeout=30,
        cwd=str(ROOT_DIR),
    )
    if result.returncode != 0:
        raise RuntimeError(f"Node semantics run failed: {result.stderr}")
    return json.loads(result.stdout)


def test_ft_mode_aliases_normalize_to_canonical_values():
    assert normalize_ft_mode("ft") == "ft"
    assert normalize_ft_mode("follow_through") == "ft"
    assert normalize_ft_mode("follow-through") == "ft"
    assert normalize_ft_mode("strictft") == "strict_ft"
    assert normalize_ft_mode("strict_ft") == "strict_ft"
    assert normalize_ft_mode(None) == "none"


def test_uncertain_reason_aliases_cover_key_paths():
    assert normalize_uncertain_reason("borderline_score", awarded=False) == "borderline"
    assert normalize_uncertain_reason("dependency_not_met", awarded=False) == "dependency_not_met"
    assert normalize_uncertain_reason("sympy_parse_fail: invalid syntax", awarded=False) == "parse_fail"
    assert normalize_uncertain_reason("best_match", awarded=True) is None


def test_build_uncertain_reason_shape_is_stable():
    uncertain = build_uncertain_reason("borderline_score", awarded=False)
    assert uncertain == {
        "is_uncertain": True,
        "code": "borderline",
        "source_reason": "borderline_score",
    }

    awarded = build_uncertain_reason("best_match", awarded=True)
    assert awarded == {
        "is_uncertain": False,
        "code": None,
        "source_reason": "best_match",
    }


@requires_node
def test_js_python_semantics_match():
    payload = {
        "ft_modes": [
            "none",
            "ft",
            "follow_through",
            "follow-through",
            "strictft",
            "strict_ft",
            "strict-follow-through",
            None,
        ],
        "uncertain": [
            {"reason": "borderline_score", "awarded": False},
            {"reason": "dependency_not_met", "awarded": False},
            {"reason": "dependency_blocked", "awarded": False},
            {"reason": "sympy_parse_fail: unexpected EOF", "awarded": False},
            {"reason": "best_match", "awarded": True},
        ],
    }

    js_out = _run_js_semantics(payload)
    py_out = {
        "ft_modes": [normalize_ft_mode(v) for v in payload["ft_modes"]],
        "uncertain": [
            build_uncertain_reason(item["reason"], awarded=bool(item["awarded"]))
            for item in payload["uncertain"]
        ],
    }
    assert js_out == py_out
