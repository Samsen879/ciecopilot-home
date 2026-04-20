#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.create_jobs_from_manifest import build_manifest_jobs, filter_manifest_items, load_manifest


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def file_digest(path: Path | None) -> str | None:
    if path is None or not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_git_command(*args: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
    except Exception:
        return None
    return result.stdout.strip() or None


def normalize_lane_results_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("results", "outputs", "items"):
            rows = payload.get(key)
            if isinstance(rows, list):
                return [row for row in rows if isinstance(row, dict)]
    raise ValueError("lane-results payload must be an array or contain a results/items/outputs array")


def extract_gate_pass(payload: Any) -> bool:
    if isinstance(payload, dict) and isinstance(payload.get("gate"), dict):
        return bool(payload["gate"].get("pass"))
    if isinstance(payload, dict) and "pass" in payload:
        return bool(payload.get("pass"))
    return False


def extract_projection_summary(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict) and isinstance(payload.get("summary"), dict):
        return payload["summary"]
    return {}


def full_review_records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict) and isinstance(payload.get("records"), list):
        return [row for row in payload["records"] if isinstance(row, dict)]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def full_review_record_accepted(record: dict[str, Any]) -> bool:
    review = record.get("review")
    if not isinstance(review, dict):
        return False

    route_verdict = review.get("route_verdict")
    route_ok = route_verdict in {None, "", "appropriate", "cannot_judge"}
    readiness = review.get("descriptor_readiness")
    review_bucket_verdict = review.get("review_bucket_verdict")
    acceptance_ok = readiness == "descriptor_ready" or review_bucket_verdict == "correct"
    return route_ok and acceptance_ok


def compute_full_review_acceptance(payload: Any) -> tuple[float, int, set[str]]:
    records = full_review_records(payload)
    reviewed_keys = {
        record["storage_key"]
        for record in records
        if isinstance(record.get("storage_key"), str) and record["storage_key"].strip()
    }
    if not records:
        return 0.0, 0, reviewed_keys
    accepted = sum(1 for record in records if full_review_record_accepted(record))
    return accepted / len(records), len(records), reviewed_keys


def build_execution_fingerprint(
    *,
    manifest_path: Path,
    lane_results_path: Path,
    gate_path: Path,
    projection_audit_path: Path,
    full_review_path: Path,
    thresholds_path: Path,
    evidence_bundles_path: Path | None,
) -> dict[str, Any]:
    manifest_raw = read_json(manifest_path)
    thresholds_raw = read_json(thresholds_path)
    return {
        "repo_sha": run_git_command("rev-parse", "HEAD"),
        "branch": run_git_command("rev-parse", "--abbrev-ref", "HEAD"),
        "manifest": {
            "path": str(manifest_path),
            "manifest_id": manifest_raw.get("manifest_id"),
            "digest": file_digest(manifest_path),
        },
        "lane_results": {
            "path": str(lane_results_path),
            "digest": file_digest(lane_results_path),
        },
        "gate": {
            "path": str(gate_path),
            "digest": file_digest(gate_path),
        },
        "projection_audit": {
            "path": str(projection_audit_path),
            "digest": file_digest(projection_audit_path),
        },
        "full_review": {
            "path": str(full_review_path),
            "digest": file_digest(full_review_path),
        },
        "thresholds": {
            "path": str(thresholds_path),
            "contract_id": thresholds_raw.get("contract_id"),
            "digest": file_digest(thresholds_path),
        },
        "evidence_bundles": {
            "path": str(evidence_bundles_path) if evidence_bundles_path else None,
            "digest": file_digest(evidence_bundles_path),
        },
    }


def build_wave_a_shard_verdict(
    *,
    manifest: dict[str, Any],
    shard_id: str,
    lane_results_payload: Any,
    gate_payload: Any,
    projection_audit_payload: Any,
    full_review_payload: Any,
    thresholds: dict[str, Any],
    execution_fingerprint: dict[str, Any] | None = None,
) -> dict[str, Any]:
    target_items = filter_manifest_items(manifest, shard_id=shard_id)
    jobs = {
        job["storage_key"]: job
        for job in build_manifest_jobs(manifest, shard_id=shard_id)
    }
    target_storage_keys = [item["storage_key"] for item in target_items]
    target_storage_key_set = set(target_storage_keys)
    lane_results = normalize_lane_results_payload(lane_results_payload)

    lane_results_by_key: dict[str, dict[str, Any]] = {}
    lane_results_out_of_scope: list[str] = []
    for row in lane_results:
        storage_key = row.get("input_asset_id")
        if not isinstance(storage_key, str):
            continue
        if storage_key not in target_storage_key_set:
            lane_results_out_of_scope.append(storage_key)
            continue
        lane_results_by_key[storage_key] = row

    provider_failures = 0
    review_lane_allowlist_violations: list[dict[str, Any]] = []
    route_hint_mismatches: list[dict[str, Any]] = []
    unexpected_review_lane_counts: dict[str, int] = {}

    for item in target_items:
        storage_key = item["storage_key"]
        expected_job = jobs[storage_key]
        lane_row = lane_results_by_key.get(storage_key, {})
        wave1_payload = lane_row.get("wave1") if isinstance(lane_row.get("wave1"), dict) else {}
        actual_route = (
            wave1_payload.get("route")
            or lane_row.get("route")
            or expected_job.get("route")
        )
        difficulty_band = item.get("difficulty_band") or "unknown"

        if lane_row.get("failure_reason"):
            provider_failures += 1

        if actual_route == "review_lane" and expected_job.get("route") != "review_lane":
            unexpected_review_lane_counts[difficulty_band] = unexpected_review_lane_counts.get(difficulty_band, 0) + 1
            review_lane_allowlist_violations.append(
                {
                    "storage_key": storage_key,
                    "difficulty_band": difficulty_band,
                    "expected_route": expected_job.get("route"),
                    "actual_route": actual_route,
                }
            )

        route_match_required = bool(
            (thresholds.get("route_hint_match_required") or {}).get(difficulty_band)
        )
        if route_match_required and actual_route != expected_job.get("route"):
            route_hint_mismatches.append(
                {
                    "storage_key": storage_key,
                    "difficulty_band": difficulty_band,
                    "expected_route": expected_job.get("route"),
                    "actual_route": actual_route,
                }
            )

    gate_pass = extract_gate_pass(gate_payload)
    projection_summary = extract_projection_summary(projection_audit_payload)
    projection_pass = bool(projection_audit_payload.get("pass")) if isinstance(projection_audit_payload, dict) else False
    projection_completeness = float(projection_summary.get("current_shard_projection_completeness", 0) or 0)
    projection_queryability = float(projection_summary.get("current_shard_queryability", 0) or 0)
    duplicate_projection_rows = int(projection_summary.get("duplicate_projection_rows", 0) or 0)
    full_review_acceptance, full_review_sample_size, reviewed_storage_keys = compute_full_review_acceptance(full_review_payload)

    failures: list[dict[str, Any]] = []

    if lane_results_out_of_scope:
        failures.append(
            {
                "code": "lane_results_out_of_scope",
                "storage_keys": sorted(set(lane_results_out_of_scope)),
            }
        )

    if len(lane_results_by_key) != len(target_items):
        failures.append(
            {
                "code": "lane_results_scope_mismatch",
                "expected_target_row_count": len(target_items),
                "actual_lane_result_row_count": len(lane_results_by_key),
            }
        )

    if provider_failures > int(thresholds.get("provider_failure_max", 0)):
        failures.append(
            {
                "code": "provider_failures_exceeded",
                "actual": provider_failures,
                "expected_max": int(thresholds.get("provider_failure_max", 0)),
            }
        )

    if bool(thresholds.get("baseline_gate_pass_required")) and not gate_pass:
        failures.append(
            {
                "code": "baseline_gate_failed",
            }
        )

    if duplicate_projection_rows > int(thresholds.get("duplicate_projection_rows_max", 0)):
        failures.append(
            {
                "code": "duplicate_projection_rows_exceeded",
                "actual": duplicate_projection_rows,
                "expected_max": int(thresholds.get("duplicate_projection_rows_max", 0)),
            }
        )

    if projection_completeness < float(thresholds.get("current_shard_projection_completeness_required", 1)):
        failures.append(
            {
                "code": "current_shard_projection_incomplete",
                "actual": projection_completeness,
                "expected_min": float(thresholds.get("current_shard_projection_completeness_required", 1)),
            }
        )

    if projection_queryability < float(thresholds.get("current_shard_queryability_required", 1)):
        failures.append(
            {
                "code": "current_shard_queryability_below_threshold",
                "actual": projection_queryability,
                "expected_min": float(thresholds.get("current_shard_queryability_required", 1)),
            }
        )

    if not projection_pass:
        failures.append(
            {
                "code": "projection_audit_failed",
            }
        )

    if full_review_acceptance < float(thresholds.get("full_review_min_acceptance", 1)):
        failures.append(
            {
                "code": "full_review_acceptance_below_threshold",
                "actual": full_review_acceptance,
                "expected_min": float(thresholds.get("full_review_min_acceptance", 1)),
            }
        )

    if bool(thresholds.get("review_lane_allowlist_required")) and review_lane_allowlist_violations:
        failures.append(
            {
                "code": "review_lane_allowlist_violated",
                "violations": review_lane_allowlist_violations,
                "source": thresholds.get("review_lane_allowlist_source"),
            }
        )

    if route_hint_mismatches:
        failures.append(
            {
                "code": "route_hint_mismatch_detected",
                "violations": route_hint_mismatches,
            }
        )

    for band, maximum in (thresholds.get("unexpected_review_lane_max") or {}).items():
        actual = unexpected_review_lane_counts.get(band, 0)
        if actual > int(maximum):
            failures.append(
                {
                    "code": "unexpected_review_lane_exceeded",
                    "difficulty_band": band,
                    "actual": actual,
                    "expected_max": int(maximum),
                }
            )

    if bool(thresholds.get("gate_critical_full_review_required")):
        gate_critical_storage_keys = {
            item["storage_key"]
            for item in target_items
            if bool(item.get("gate_critical"))
        }
        missing_gate_critical_reviews = sorted(gate_critical_storage_keys - reviewed_storage_keys)
        if missing_gate_critical_reviews:
            failures.append(
                {
                    "code": "gate_critical_full_review_missing",
                    "storage_keys": missing_gate_critical_reviews,
                }
            )

    return {
        "manifest_id": manifest.get("manifest_id"),
        "shard_id": shard_id,
        "status": "pass" if not failures else "fail",
        "pass": len(failures) == 0,
        "summary": {
            "target_row_count": len(target_items),
            "lane_result_row_count": len(lane_results_by_key),
            "provider_failures": provider_failures,
            "gate_pass": gate_pass,
            "projection_pass": projection_pass,
            "duplicate_projection_rows": duplicate_projection_rows,
            "current_shard_projection_completeness": projection_completeness,
            "current_shard_queryability": projection_queryability,
            "full_review_acceptance": full_review_acceptance,
            "full_review_sample_size": full_review_sample_size,
            "unexpected_review_lane_counts": unexpected_review_lane_counts,
            "route_hint_mismatch_count": len(route_hint_mismatches),
            "review_lane_allowlist_violations": len(review_lane_allowlist_violations),
        },
        "failures": failures,
        "execution_fingerprint": execution_fingerprint or {},
    }


def render_markdown(verdict: dict[str, Any]) -> str:
    lines = [
        "# Wave A Shard Verdict",
        "",
        f"- status: `{verdict['status']}`",
        f"- shard_id: `{verdict['shard_id']}`",
        f"- target_row_count: `{verdict['summary']['target_row_count']}`",
        f"- provider_failures: `{verdict['summary']['provider_failures']}`",
        f"- gate_pass: `{verdict['summary']['gate_pass']}`",
        f"- projection_pass: `{verdict['summary']['projection_pass']}`",
        f"- full_review_acceptance: `{verdict['summary']['full_review_acceptance']}`",
        "",
        "## Failures",
    ]

    if verdict["failures"]:
        for failure in verdict["failures"]:
            lines.append(f"- `{failure['code']}`: `{json.dumps(failure, ensure_ascii=False, sort_keys=True)}`")
    else:
        lines.append("- none")

    lines.extend(
        [
            "",
            "## Execution Fingerprint",
            "",
        ]
    )
    fingerprint = verdict.get("execution_fingerprint", {})
    for key, value in fingerprint.items():
        lines.append(f"- `{key}`: `{json.dumps(value, ensure_ascii=False, sort_keys=True)}`")

    return "\n".join(lines) + "\n"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the canonical Wave A shard verdict.")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--shard-id", required=True, type=str)
    parser.add_argument("--lane-results-json", required=True, type=Path)
    parser.add_argument("--gate-json", required=True, type=Path)
    parser.add_argument("--projection-audit-json", required=True, type=Path)
    parser.add_argument("--full-review-json", required=True, type=Path)
    parser.add_argument("--thresholds-json", required=True, type=Path)
    parser.add_argument("--evidence-bundles-json", type=Path)
    parser.add_argument("--output-json", required=True, type=Path)
    parser.add_argument("--output-md", required=True, type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    manifest = load_manifest(args.manifest)
    lane_results_payload = read_json(args.lane_results_json)
    gate_payload = read_json(args.gate_json)
    projection_audit_payload = read_json(args.projection_audit_json)
    full_review_payload = read_json(args.full_review_json)
    thresholds = read_json(args.thresholds_json)

    verdict = build_wave_a_shard_verdict(
        manifest=manifest,
        shard_id=args.shard_id,
        lane_results_payload=lane_results_payload,
        gate_payload=gate_payload,
        projection_audit_payload=projection_audit_payload,
        full_review_payload=full_review_payload,
        thresholds=thresholds,
        execution_fingerprint=build_execution_fingerprint(
            manifest_path=args.manifest,
            lane_results_path=args.lane_results_json,
            gate_path=args.gate_json,
            projection_audit_path=args.projection_audit_json,
            full_review_path=args.full_review_json,
            thresholds_path=args.thresholds_json,
            evidence_bundles_path=args.evidence_bundles_json,
        ),
    )

    args.output_json.write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    args.output_md.write_text(render_markdown(verdict), encoding="utf-8")
    return 0 if verdict["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
