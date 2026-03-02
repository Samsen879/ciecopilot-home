from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def test_calibration_blocks_sanity_tier_suite():
    repo = Path(__file__).resolve().parents[2]
    cmd = [
        sys.executable,
        "scripts/evaluation/calibrate_mark_engine_thresholds.py",
        "--suite",
        "data/eval/marking_eval_set_v2_blind_9709_p1p3.json",
        "--skip-integrity-check",
    ]
    out = subprocess.run(cmd, cwd=repo, capture_output=True, text=True)
    assert out.returncode != 0
    assert "tier is 'sanity'" in (out.stdout + out.stderr)
