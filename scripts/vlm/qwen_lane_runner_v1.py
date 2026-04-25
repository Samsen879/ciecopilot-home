#!/usr/bin/env python3
"""Additive manifest-driven Qwen lane runner for the wave-1 runtime."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.common.env import load_project_env, resolve_assets_root
from scripts.vlm.contracts import validate_qwen_wave1_output
from scripts.vlm.create_jobs_from_manifest import build_manifest_jobs, load_manifest, summarize_jobs
from scripts.vlm.providers import get_provider


def build_provider_for_job(job: dict[str, Any]):
    return get_provider(
        job["provider"],
        job["model"],
        lane=job["lane"],
        prompt_template_id=job.get("prompt_template_id"),
        prompt_template_version=job.get("prompt_template_version", "v1"),
    )


def _compute_file_sha256(path: Path) -> str | None:
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _confidence_from_output(lane_output: dict[str, Any]) -> float:
    for key in ("ocr_confidence", "diagram_confidence", "review_confidence", "confidence"):
        value = lane_output.get(key)
        if isinstance(value, (int, float)):
            return max(0.0, min(1.0, float(value)))
    return 0.0


def _summary_from_output(job: dict[str, Any], lane_output: dict[str, Any]) -> str | None:
    def _first_non_empty(*values: Any) -> str | None:
        for value in values:
            if isinstance(value, str):
                stripped = value.strip()
                if stripped:
                    return stripped
        return None

    if job["route"] == "ocr_lane":
        return _first_non_empty(lane_output.get("ocr_text"))
    if job["route"] == "diagram_lane":
        return _first_non_empty(
            lane_output.get("diagram_type"),
            *(lane_output.get("spatial_evidence") or []),
            *(lane_output.get("diagram_elements") or []),
        )
    if job["route"] == "review_lane":
        return _first_non_empty(
            lane_output.get("review_summary"),
            lane_output.get("ocr_text"),
            *(lane_output.get("spatial_evidence") or []),
            *(lane_output.get("diagram_elements") or []),
        )
    return None


def _warnings_for_job(
    job: dict[str, Any],
    *,
    failure_reason: str | None = None,
) -> list[str]:
    warnings: list[str] = []
    if job.get("requires_review"):
        warnings.append("requires_review")
    if job.get("lazy_attach_original_image"):
        warnings.append("lazy_attach_original_image")
    if any(job.get(flag) is None for flag in ("diagram_present", "formula_dense", "table_heavy")):
        warnings.append("unknown_surface_flags")
    if failure_reason:
        warnings.append("provider_failure")
    return list(dict.fromkeys(warnings))


def build_lane_output(
    job: dict[str, Any],
    lane_output: dict[str, Any],
    *,
    input_asset_hash: str | None,
    failure_reason: str | None = None,
) -> dict[str, Any]:
    payload = {
        "provider": job["provider"],
        "model": job["model"],
        "route": job["route"],
        "lane": job["lane"],
        "prompt_template_id": job["prompt_template_id"],
        "prompt_template_version": job["prompt_template_version"],
        "region": job["region"],
        "base_url": job["base_url"],
        "input_asset_id": job["storage_key"],
        "input_asset_hash": input_asset_hash,
        "response_schema_version": job["response_schema_version"],
        "confidence": _confidence_from_output(lane_output),
        "failure_reason": failure_reason,
        "lazy_attach_original_image": bool(job.get("lazy_attach_original_image")),
        "output": {
            "summary": None if failure_reason else _summary_from_output(job, lane_output),
            "evidence": [] if failure_reason else [
                {"field": key, "value": value}
                for key, value in lane_output.items()
            ],
            "warnings": _warnings_for_job(job, failure_reason=failure_reason),
        },
    }
    return validate_qwen_wave1_output(payload)


def run_lane_job(
    job: dict[str, Any],
    *,
    image_path: str | Path,
    provider=None,
) -> dict[str, Any]:
    resolved_image_path = Path(image_path)
    input_asset_hash = _compute_file_sha256(resolved_image_path)
    runtime_provider = provider or build_provider_for_job(job)

    try:
        lane_output = runtime_provider.generate(resolved_image_path)
    except Exception as error:  # pragma: no cover - tested through public envelope
        return build_lane_output(
            job,
            {},
            input_asset_hash=input_asset_hash,
            failure_reason=str(error),
        )

    return build_lane_output(
        job,
        lane_output,
        input_asset_hash=input_asset_hash,
    )


def _build_jobs_from_args(args: argparse.Namespace) -> list[dict[str, Any]]:
    manifest = load_manifest(args.manifest)
    jobs = build_manifest_jobs(manifest, shard_id=args.shard_id)
    if args.max_jobs is not None:
        jobs = jobs[:args.max_jobs]
    return jobs


def load_existing_results(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return payload if isinstance(payload, list) else []


def write_lane_results(path: Path, payloads: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payloads, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run additive Qwen wave-1 jobs from a frozen manifest.",
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--assets-root", type=Path, default=resolve_assets_root())
    parser.add_argument("--max-jobs", type=int)
    parser.add_argument("--shard-id", type=str)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument("--retry-failures", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    load_project_env()
    args = parse_args(argv)
    jobs = _build_jobs_from_args(args)

    if args.dry_run:
        summary = summarize_jobs(jobs)
        if args.shard_id:
            print(f"shard_id: {args.shard_id}")
        print(f"jobs_planned: {summary['jobs_planned']}")
        for route, count in sorted(summary["route_counts"].items()):
            print(f"{route}: {count}")
        print("targeted_identities:")
        for storage_key in summary["targeted_identities"]:
            print(f"- {storage_key}")
        return 0

    existing_payloads = []
    if args.output and not args.no_resume:
        existing_payloads = load_existing_results(args.output)
    payloads_by_asset_id = {}
    for payload in existing_payloads:
        asset_id = payload.get("input_asset_id")
        if not asset_id:
            continue
        if args.retry_failures and payload.get("failure_reason"):
            continue
        payloads_by_asset_id[asset_id] = payload
    payloads = [
        payloads_by_asset_id[job["storage_key"]]
        for job in jobs
        if job.get("storage_key") in payloads_by_asset_id
    ]

    if payloads:
        print(f"resume_existing_results: {len(payloads)}")

    total = len(jobs)
    for job in jobs:
        if job["storage_key"] in payloads_by_asset_id:
            continue
        image_path = args.assets_root / job["storage_key"]
        payload = run_lane_job(job, image_path=image_path)
        payloads_by_asset_id[job["storage_key"]] = payload
        payloads.append(payload)
        if args.output:
            write_lane_results(args.output, payloads)
            print(
                f"lane_progress: {len(payloads)}/{total} "
                f"storage_key={job['storage_key']} "
                f"route={job['route']} "
                f"failures={sum(1 for entry in payloads if entry.get('failure_reason'))}",
                flush=True,
            )

    if args.output:
        write_lane_results(args.output, payloads)
        print(f"wrote_results: {args.output}")
    else:
        print(json.dumps(payloads, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
