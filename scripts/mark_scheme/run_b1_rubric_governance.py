#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.common.env import load_project_env
from scripts.phase1.common import require_db_url, utc_now_iso, write_json_file
from scripts.phase1.preflight_rubric_version_audit import (
    OUTPUT_FILE as RUBRIC_VERSION_AUDIT_PATH,
)
from scripts.phase1.preflight_rubric_version_audit import run_audit as run_rubric_version_audit

SUMMARY_PATH = PROJECT_ROOT / "runs" / "ms" / "b1_gate_summary.json"
OUTPUT_PATH = PROJECT_ROOT / "runs" / "ms" / "b1_rubric_governance_summary.json"


def _run_command(cmd: list[str]) -> dict:
    result = subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
        timeout=600,
    )
    output = (result.stdout + result.stderr).strip()
    return {
        "command": cmd,
        "exit_code": result.returncode,
        "passed": result.returncode == 0,
        "output_tail": output[-4000:],
    }


def _load_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def _query_governance() -> dict:
    import psycopg2  # type: ignore

    conn = psycopg2.connect(require_db_url())
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.rubric_points
                WHERE status = 'ready';
                """
            )
            ready_rubric_points_rows = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM public.rubric_points_ready_v1;")
            ready_view_rows = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*)
                FROM (
                    SELECT
                        storage_key,
                        q_number,
                        COALESCE(subpart, ''),
                        point_fingerprint,
                        extractor_version,
                        provider,
                        model,
                        prompt_version
                    FROM public.rubric_points
                    WHERE status = 'ready'
                    GROUP BY
                        storage_key,
                        q_number,
                        COALESCE(subpart, ''),
                        point_fingerprint,
                        extractor_version,
                        provider,
                        model,
                        prompt_version
                    HAVING COUNT(*) > 1
                ) dup;
                """
            )
            duplicate_ready_key_count = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.rubric_points
                WHERE status = 'ready'
                  AND (
                    extractor_version IS NULL
                    OR provider IS NULL
                    OR model IS NULL
                    OR prompt_version IS NULL
                  );
                """
            )
            missing_source_version_component_count = cur.fetchone()[0]
    finally:
        conn.close()

    return {
        "ready_rubric_points_rows": ready_rubric_points_rows,
        "ready_view_rows": ready_view_rows,
        "duplicate_ready_key_count": duplicate_ready_key_count,
        "missing_source_version_component_count": missing_source_version_component_count,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run B1 rubric governance audit")
    parser.add_argument("--seed", action="store_true", help="Seed deterministic B1 fixture data first")
    parser.add_argument(
        "--min-ready-rows",
        type=int,
        default=1,
        help="Minimum ready rubric rows expected after the gate finishes",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_project_env()

    steps: list[dict] = []
    if args.seed:
        steps.append(_run_command([sys.executable, "scripts/ms/seed_b1_gate_fixture.py"]))
        if not steps[-1]["passed"]:
            summary = {
                "generated_at_utc": utc_now_iso(),
                "gate_pass": False,
                "release_blocked": True,
                "reason": "seed failed",
                "steps": steps,
            }
            write_json_file(OUTPUT_PATH, summary)
            return 1

    steps.append(_run_command([sys.executable, "scripts/ms/b1_ci_gate.py"]))
    gate_summary = _load_json(SUMMARY_PATH)
    rubric_version_audit = run_rubric_version_audit(min_ready_rows=args.min_ready_rows)
    write_json_file(RUBRIC_VERSION_AUDIT_PATH, rubric_version_audit)
    try:
        governance = _query_governance()
    except Exception as exc:
        governance = {"governance_query_error": str(exc)}

    b1_gate_pass = bool(gate_summary and (gate_summary.get("passed") or gate_summary.get("result") == "passed"))
    gate_pass = (
        b1_gate_pass
        and bool(rubric_version_audit.get("gate_pass"))
        and "governance_query_error" not in governance
        and int(governance.get("duplicate_ready_key_count", 0)) == 0
        and int(governance.get("missing_source_version_component_count", 0)) == 0
    )

    summary = {
        "generated_at_utc": utc_now_iso(),
        "gate_pass": gate_pass,
        "release_blocked": not gate_pass,
        "b1_gate_pass": b1_gate_pass,
        "minimum_ready_rows_required": args.min_ready_rows,
        "steps": steps,
        "rubric_version_audit": rubric_version_audit,
        **governance,
    }
    write_json_file(OUTPUT_PATH, summary)

    print(f"[b1 governance] gate_pass={gate_pass}")
    print(
        "[b1 governance] ready_rows={ready_rows} ready_view_rows={ready_view_rows} duplicate_keys={duplicate_keys}".format(
            ready_rows=summary.get("ready_rubric_points_rows", 0),
            ready_view_rows=summary.get("ready_view_rows", 0),
            duplicate_keys=summary.get("duplicate_ready_key_count", 0),
        )
    )
    print(f"[b1 governance] output={OUTPUT_PATH}")
    return 0 if gate_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
