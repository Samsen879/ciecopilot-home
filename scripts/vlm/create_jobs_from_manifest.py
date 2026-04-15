#!/usr/bin/env python3
"""Materialize additive Qwen wave-1 job plans from a frozen manifest."""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.vlm.qwen_router_v1 import route_manifest_item

DEFAULT_EXTRACTOR_VERSION = "qwen_wave1_v1"


def load_manifest(manifest_path: str | Path) -> dict[str, Any]:
    return json.loads(Path(manifest_path).read_text(encoding="utf-8"))


def build_manifest_job(
    item: dict[str, Any],
    *,
    manifest_id: str,
    position: int,
) -> dict[str, Any]:
    decision = route_manifest_item(item)
    return {
        "manifest_id": manifest_id,
        "manifest_position": position,
        "storage_key": item["storage_key"],
        "syllabus_code": item["syllabus_code"],
        "year": item["year"],
        "session": item["session"],
        "paper": item["paper"],
        "variant": item["variant"],
        "q_number": item["q_number"],
        "primary_topic_path": item["primary_topic_path"],
        "descriptor_required": item.get("descriptor_required", False),
        "gate_critical": item["gate_critical"],
        "requires_review": item["requires_review"],
        "diagram_present": item.get("diagram_present"),
        "formula_dense": item.get("formula_dense"),
        "table_heavy": item.get("table_heavy"),
        "route_hint": item.get("route_hint"),
        "surface_evidence_status": item.get("surface_evidence_status"),
        "extractor_version": DEFAULT_EXTRACTOR_VERSION,
        **decision.to_dict(),
    }


def build_manifest_jobs(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    manifest_id = manifest.get("manifest_id", "unknown_manifest")
    items = manifest.get("items", [])
    return [
        build_manifest_job(item, manifest_id=manifest_id, position=index)
        for index, item in enumerate(items)
    ]


def summarize_jobs(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    route_counts = Counter(job["route"] for job in jobs)
    model_counts = Counter(job["model"] for job in jobs)
    provider_counts = Counter(job["provider"] for job in jobs)
    prompt_counts = Counter(
        f"{job['prompt_template_id']}@{job['prompt_template_version']}" for job in jobs
    )
    return {
        "jobs_planned": len(jobs),
        "route_counts": dict(sorted(route_counts.items())),
        "model_counts": dict(sorted(model_counts.items())),
        "provider_counts": dict(sorted(provider_counts.items())),
        "prompt_counts": dict(sorted(prompt_counts.items())),
    }


def _write_output(output_path: Path, manifest: dict[str, Any], jobs: list[dict[str, Any]]) -> None:
    payload = {
        "manifest_id": manifest.get("manifest_id"),
        "jobs": jobs,
        "summary": summarize_jobs(jobs),
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create additive Qwen wave-1 jobs from a frozen manifest.",
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output", type=Path, help="Optional path to write the materialized job plan JSON.")
    parser.add_argument("--dry-run", action="store_true", help="Print counts without materializing a job plan file.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    manifest = load_manifest(args.manifest)
    jobs = build_manifest_jobs(manifest)
    summary = summarize_jobs(jobs)

    print(f"manifest_id: {manifest.get('manifest_id', 'unknown')}")
    print(f"jobs_planned: {summary['jobs_planned']}")
    for route, count in summary["route_counts"].items():
        print(f"{route}: {count}")

    if args.dry_run:
        return 0

    if args.output:
        _write_output(args.output, manifest, jobs)
        print(f"wrote_job_plan: {args.output}")
        return 0

    print(json.dumps({"manifest_id": manifest.get("manifest_id"), "jobs": jobs}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
