#!/usr/bin/env python3
"""Run independent Qwen surface triage before 9709 evidence routing."""
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
from scripts.vlm.providers import get_provider

SURFACE_FLAGS = ("diagram_present", "formula_dense", "table_heavy")
SCHEMA_VERSION = "surface_triage_v1"
DEFAULT_MODEL = "qwen3.6-plus"


def _compute_file_sha256(path: Path) -> str | None:
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _nullable_bool(value: Any) -> bool | None:
    return value if isinstance(value, bool) else None


def apply_manifest_diagram_gold(
    item: dict[str, Any],
    triage: dict[str, Any],
) -> dict[str, bool | None]:
    manifest_diagram = _nullable_bool(item.get("diagram_present"))
    return {
        "diagram_present": manifest_diagram
        if manifest_diagram is not None
        else _nullable_bool(triage.get("diagram_present")),
        "formula_dense": _nullable_bool(triage.get("formula_dense")),
        "table_heavy": _nullable_bool(triage.get("table_heavy")),
    }


def build_surface_triage_result(
    item: dict[str, Any],
    triage: dict[str, Any],
    *,
    image_path: Path,
    model: str = DEFAULT_MODEL,
    failure_reason: str | None = None,
) -> dict[str, Any]:
    effective = apply_manifest_diagram_gold(item, triage)
    manifest_diagram = _nullable_bool(item.get("diagram_present"))
    qwen_diagram = _nullable_bool(triage.get("diagram_present"))
    return {
        "schema_version": SCHEMA_VERSION,
        "storage_key": item.get("storage_key"),
        "model": model,
        "provider": "windows-qwen",
        "prompt_template_id": "surface_triage",
        "prompt_template_version": "v1",
        "input_asset_hash": _compute_file_sha256(image_path),
        "failure_reason": failure_reason,
        "manifest_surface_flags": {
            flag: _nullable_bool(item.get(flag)) for flag in SURFACE_FLAGS
        },
        "triage": {
            "diagram_present": qwen_diagram,
            "formula_dense": _nullable_bool(triage.get("formula_dense")),
            "table_heavy": _nullable_bool(triage.get("table_heavy")),
            "surface_confidence": triage.get("surface_confidence")
            if isinstance(triage.get("surface_confidence"), (int, float))
            else None,
            "surface_reasons": triage.get("surface_reasons")
            if isinstance(triage.get("surface_reasons"), list)
            else [],
        },
        "effective_surface_flags": effective,
        "qwen_diagram_disagrees_with_manifest": (
            manifest_diagram is not None
            and qwen_diagram is not None
            and manifest_diagram != qwen_diagram
        ),
    }


def summarize_surface_triage(results: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter()
    for result in results:
        flags = result.get("effective_surface_flags") or {}
        for flag in SURFACE_FLAGS:
            value = flags.get(flag)
            if value is True:
                counts[f"{flag}_true"] += 1
            elif value is False:
                counts[f"{flag}_false"] += 1
        if result.get("qwen_diagram_disagrees_with_manifest"):
            counts["qwen_diagram_disagreements"] += 1
        if any(flags.get(flag) is None for flag in SURFACE_FLAGS):
            counts["missing_effective_surface_flags"] += 1

    return {
        "total": len(results),
        "diagram_present_true": counts["diagram_present_true"],
        "diagram_present_false": counts["diagram_present_false"],
        "formula_dense_true": counts["formula_dense_true"],
        "formula_dense_false": counts["formula_dense_false"],
        "table_heavy_true": counts["table_heavy_true"],
        "table_heavy_false": counts["table_heavy_false"],
        "qwen_diagram_disagreements": counts["qwen_diagram_disagreements"],
        "missing_effective_surface_flags": counts["missing_effective_surface_flags"],
    }


def run_surface_triage_item(
    item: dict[str, Any],
    *,
    image_path: Path,
    provider=None,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    runtime_provider = provider or get_provider(
        "windows-qwen",
        model=model,
        lane="surface_triage",
        prompt_template_id="surface_triage",
        prompt_template_version="v1",
    )
    try:
        triage = runtime_provider.generate(image_path)
        failure_reason = None
    except Exception as error:  # pragma: no cover - exercised by operational reruns
        triage = {}
        failure_reason = str(error)
    return build_surface_triage_result(
        item,
        triage,
        image_path=image_path,
        model=model,
        failure_reason=failure_reason,
    )


def load_manifest(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_existing_results(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    results = payload.get("results") if isinstance(payload, dict) else None
    return results if isinstance(results, list) else []


def write_surface_triage_payload(
    path: Path,
    *,
    manifest_id: str | None,
    model: str,
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    payload = {
        "schema_version": "surface_triage_run_v1",
        "manifest_id": manifest_id,
        "model": model,
        "summary": summarize_surface_triage(results),
        "results": results,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Qwen surface triage for a manifest.")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--assets-root", type=Path, default=resolve_assets_root())
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-items", type=int)
    parser.add_argument("--no-resume", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    load_project_env()
    args = parse_args(argv)
    manifest = load_manifest(args.manifest)
    items = list(manifest.get("items") or [])
    if args.max_items is not None:
        items = items[: args.max_items]

    existing_results = [] if args.no_resume else load_existing_results(args.output)
    results_by_storage_key = {
        result.get("storage_key"): result
        for result in existing_results
        if result.get("storage_key")
    }
    results: list[dict[str, Any]] = [
        results_by_storage_key[item["storage_key"]]
        for item in items
        if item.get("storage_key") in results_by_storage_key
    ]

    provider = get_provider(
        "windows-qwen",
        model=args.model,
        lane="surface_triage",
        prompt_template_id="surface_triage",
        prompt_template_version="v1",
    )
    total = len(items)
    if results:
        print(f"resume_existing_results: {len(results)}")
    for index, item in enumerate(items, start=1):
        storage_key = item["storage_key"]
        if storage_key in results_by_storage_key:
            continue
        result = run_surface_triage_item(
            item,
            image_path=args.assets_root / storage_key,
            provider=provider,
            model=args.model,
        )
        results_by_storage_key[storage_key] = result
        results.append(result)
        payload = write_surface_triage_payload(
            args.output,
            manifest_id=manifest.get("manifest_id"),
            model=args.model,
            results=results,
        )
        print(
            f"surface_triage_progress: {len(results)}/{total} "
            f"storage_key={storage_key} "
            f"failures={sum(1 for entry in results if entry.get('failure_reason'))} "
            f"missing_flags={payload['summary']['missing_effective_surface_flags']}",
            flush=True,
        )

    payload = write_surface_triage_payload(
        args.output,
        manifest_id=manifest.get("manifest_id"),
        model=args.model,
        results=results,
    )
    print(f"wrote_surface_triage: {args.output}")
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
