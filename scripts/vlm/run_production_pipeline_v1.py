#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


from scripts.common.env import load_project_env
ROOT = Path(__file__).resolve().parents[2]


def load_env() -> None:
    load_project_env()



def run(cmd: list[str]) -> None:
    print(f"$ {' '.join(cmd)}")
    completed = subprocess.run(cmd, cwd=str(ROOT), text=True)
    if completed.returncode != 0:
        raise SystemExit(completed.returncode)


def main() -> int:
    parser = argparse.ArgumentParser(description="One-shot production pipeline for VLM descriptions v1")
    parser.add_argument("--database-url", default=None, help="Override DATABASE_URL for this run")
    parser.add_argument("--with-spot-check", action="store_true", help="Run 45-sample VLM spot-check on v1")
    parser.add_argument("--recover-errors", action="store_true", help="Try to recover non-ok rows in v1 before publish")
    parser.add_argument("--sync-v0", action="store_true", help="Backfill latest v0 rows from v1 at end of pipeline")
    parser.add_argument("--spot-json", default="docs/reports/vlm_qc_spot_check_v1.json")
    args = parser.parse_args()

    load_env()
    if args.database_url:
        os.environ["DATABASE_URL"] = args.database_url
    if not os.environ.get("DATABASE_URL"):
        raise SystemExit("DATABASE_URL is required")

    run([sys.executable, "scripts/vlm/build_production_table_v1.py"])
    run([sys.executable, "scripts/vlm/fill_empty_summaries_v1.py", "--target", "question_descriptions_v1", "--limit", "500", "--sleep", "0.2"])
    if args.recover_errors:
        run(
            [
                sys.executable,
                "scripts/vlm/recover_error_rows_v1.py",
                "--table",
                "question_descriptions_v1",
                "--limit",
                "200",
                "--sleep",
                "0.5",
                "--out-json",
                "docs/reports/vlm_error_recovery_20260208.json",
                "--mirror-v0",
            ]
        )
    run([sys.executable, "scripts/vlm/publish_production_view_v1.py", "--source", "question_descriptions_v1", "--view", "question_descriptions_prod_v1"])

    if args.with_spot_check:
        run(
            [
                sys.executable,
                "scripts/vlm/qc_vlm_spot_check.py",
                "--table",
                "question_descriptions_v1",
                "--output-json",
                args.spot_json,
            ]
        )

    run(
        [
            sys.executable,
            "scripts/vlm/qc_gate_v1.py",
            "--table",
            "question_descriptions_v1",
            "--coverage-mode",
            "jobs_done",
            "--spot-json",
            args.spot_json,
            "--out-json",
            "docs/reports/vlm_production_gate_v1.json",
            "--out-md",
            "docs/reports/vlm_production_gate_v1.md",
        ]
    )
    run(
        [
            sys.executable,
            "scripts/vlm/qc_gate_v1.py",
            "--table",
            "question_descriptions_prod_v1",
            "--coverage-mode",
            "off",
            "--spot-json",
            args.spot_json,
            "--out-json",
            "docs/reports/vlm_production_gate_prod_v1.json",
            "--out-md",
            "docs/reports/vlm_production_gate_prod_v1.md",
        ]
    )

    if args.sync_v0:
        run([sys.executable, "scripts/vlm/sync_v1_to_v0_latest.py", "--source", "question_descriptions_v1"])

    print("pipeline=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
