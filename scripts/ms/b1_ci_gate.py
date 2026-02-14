#!/usr/bin/env python3
"""B1 Rubric Extraction CI Gate.

Runs four checks in sequence:
1. All B1 tests pass (pytest test/test_ms_*.py)
2. Migration SQL applies cleanly against a real database
3. B2 contract validator passes
4. QC thresholds pass (qc_sampler --enforce-thresholds)

On failure, outputs artifacts:
- docs/reports/b1_rubric_qc_report.md
- runs/ms/b1_contract_failures.json
- runs/ms/b1_gate_summary.json

Requirements: 9.3
"""
from __future__ import annotations

import glob
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION_PATH = ROOT / "supabase/migrations/20260214120000_b1_rubric_extraction.sql"


def _env_true(name: str) -> bool:
    value = (os.environ.get(name) or "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _db_url() -> str | None:
    return os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")


def run_b1_tests() -> dict:
    """Run all B1 tests via pytest. Returns {passed, exit_code, output}."""
    try:
        test_files = sorted(glob.glob(os.path.join(str(ROOT), "test", "test_ms_*.py")))
        if not test_files:
            return {"passed": False, "exit_code": -1, "output": "No test_ms_*.py files found"}
        result = subprocess.run(
            [sys.executable, "-m", "pytest"] + test_files + ["-q", "--tb=short"],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(ROOT),
        )
        return {
            "passed": result.returncode == 0,
            "exit_code": result.returncode,
            "output": (result.stdout + result.stderr)[-2000:],
        }
    except Exception as exc:
        return {"passed": False, "exit_code": -1, "output": str(exc)[:500]}


def run_migration_check() -> dict:
    """Apply migration SQL to database and verify required objects exist."""
    if _env_true("B1_SKIP_MIGRATION"):
        return {"passed": True, "skipped": True, "output": "Skipped: B1_SKIP_MIGRATION=1"}

    db_url = _db_url()
    if not db_url:
        return {"passed": False, "output": "DATABASE_URL/SUPABASE_DB_URL is required for migration check"}

    if not MIGRATION_PATH.exists():
        return {"passed": False, "output": f"Migration file not found: {MIGRATION_PATH}"}

    try:
        sql = MIGRATION_PATH.read_text(encoding="utf-8")
    except Exception as exc:
        return {"passed": False, "output": f"Cannot read migration: {exc}"}

    if len(sql.strip()) < 100:
        return {"passed": False, "output": "Migration file suspiciously short"}

    conn = None
    try:
        import psycopg2  # type: ignore

        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            cur.execute(sql)
            required = (
                "public.vlm_ms_jobs",
                "public.vlm_ms_runs",
                "public.rubric_points",
                "public.rubric_points_ready_v1",
            )
            missing: list[str] = []
            for rel in required:
                cur.execute("SELECT to_regclass(%s)", (rel,))
                if cur.fetchone()[0] is None:
                    missing.append(rel)
        conn.commit()
        if missing:
            return {"passed": False, "output": "Missing required relation(s): " + ", ".join(missing)}
        return {"passed": True, "output": "Migration applied and required relations verified"}
    except Exception as exc:
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        return {"passed": False, "output": f"Migration apply failed: {exc}"[:2000]}
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def run_contract_check() -> dict:
    """Run B2 contract validator against ready view."""
    if _env_true("B1_SKIP_CONTRACT"):
        return {"passed": True, "skipped": True, "output": "Skipped: B1_SKIP_CONTRACT=1"}

    if not _db_url():
        return {"passed": False, "output": "DATABASE_URL/SUPABASE_DB_URL is required for contract check"}

    try:
        result = subprocess.run(
            [sys.executable, "scripts/ms/contract_validator.py"],
            capture_output=True,
            text=True,
            timeout=180,
            cwd=str(ROOT),
        )
        return {
            "passed": result.returncode == 0,
            "skipped": False,
            "output": (result.stdout + result.stderr)[-2000:],
        }
    except Exception as exc:
        return {"passed": False, "skipped": False, "output": str(exc)[:500]}


def run_qc_check() -> dict:
    """Run QC sampler with threshold enforcement. Returns {passed, skipped, output}."""
    if _env_true("B1_SKIP_QC"):
        return {"passed": True, "skipped": True, "output": "Skipped: B1_SKIP_QC=1"}

    if not _db_url():
        return {"passed": False, "skipped": False, "output": "DATABASE_URL/SUPABASE_DB_URL is required for QC check"}

    try:
        result = subprocess.run(
            [
                sys.executable,
                "scripts/ms/qc_sampler.py",
                "--enforce-thresholds",
                "--output",
                "docs/reports/b1_rubric_qc_report.md",
            ],
            capture_output=True,
            text=True,
            timeout=180,
            cwd=str(ROOT),
        )
        return {
            "passed": result.returncode == 0,
            "skipped": False,
            "output": (result.stdout + result.stderr)[-2000:],
        }
    except Exception as exc:
        return {"passed": False, "skipped": False, "output": str(exc)[:500]}


def run_gate() -> int:
    """Execute the full B1 CI gate. Returns exit code (0=pass, 1=fail)."""
    summary: dict = {
        "gate": "b1-rubric-extraction-gate",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {},
    }

    summary["checks"]["tests"] = run_b1_tests()
    summary["checks"]["migration"] = run_migration_check()
    summary["checks"]["contract"] = run_contract_check()
    summary["checks"]["qc"] = run_qc_check()

    all_passed = all(check.get("passed", False) for check in summary["checks"].values())
    summary["passed"] = all_passed
    summary["result"] = "passed" if all_passed else "failed"

    runs_dir = ROOT / "runs" / "ms"
    runs_dir.mkdir(parents=True, exist_ok=True)
    summary_path = runs_dir / "b1_gate_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("=" * 60)
    print(f"B1 CI Gate: {'PASSED' if all_passed else 'FAILED'}")
    for name, check in summary["checks"].items():
        status = "PASS" if check.get("passed") else "FAIL"
        skipped = " (skipped)" if check.get("skipped") else ""
        print(f"  {name}: {status}{skipped}")
    print(f"  Summary: {summary_path}")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(run_gate())
