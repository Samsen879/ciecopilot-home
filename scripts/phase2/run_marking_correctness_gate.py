#!/usr/bin/env python3
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "runs" / "backend" / "marking_correctness_summary.json"
OUT_MARKING = ROOT / "runs" / "marking" / "marking_correctness_summary.json"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def run_step(name: str, cmd: list[str]) -> dict:
    start = time.time()
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    duration = round(time.time() - start, 3)
    return {
        "name": name,
        "command": " ".join(cmd),
        "exit_code": result.returncode,
        "duration_sec": duration,
        "status": "pass" if result.returncode == 0 else "fail",
        "stdout_tail": (result.stdout or "")[-1500:],
        "stderr_tail": (result.stderr or "")[-1500:],
    }


def main():
    steps = [
        run_step(
            "jest_marking_decision",
            [
                "node",
                "--experimental-vm-modules",
                "node_modules/jest/bin/jest.js",
                "api/marking/__tests__/decision-engine-v1.test.js",
                "api/marking/__tests__/decision-engine-v1-ft-cao.test.js",
                "api/marking/__tests__/evaluate-v1.test.js",
                "tests/evidence-ledger/evaluate-v1-integration.test.js",
                "--runInBand",
            ],
        ),
        run_step(
            "pytest_js_python_parity_v1",
            ["pytest", "tests/marking/test_js_python_parity_v1.py", "-q"],
        ),
    ]

    status = "pass" if all(s["status"] == "pass" for s in steps) else "fail"
    payload = {
        "generated_at": utc_now(),
        "status": status,
        "steps": steps,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_MARKING.parent.mkdir(parents=True, exist_ok=True)
    OUT_MARKING.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(OUT)
    if status != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
