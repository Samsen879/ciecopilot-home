#!/usr/bin/env python3
"""Deterministic manifest router for the additive Qwen wave-1 runtime."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from functools import lru_cache
import argparse
import json
from pathlib import Path
import sys
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
ROUTER_CONTRACT_PATH = PROJECT_ROOT / "data/contracts/9709_qwen_wave1_router_contract_v1.json"

ROUTE_TO_LANE = {
    "ocr_lane": "ocr",
    "diagram_lane": "diagram",
    "review_lane": "review",
}
PROMPT_TEMPLATE_IDS = {
    "ocr_lane": "ocr_specialist",
    "diagram_lane": "diagram_specialist",
    "review_lane": "review_specialist",
}
PROMPT_TEMPLATE_VERSION = "v1"
RESPONSE_SCHEMA_VERSION = "v1"
DEFAULT_PROVIDER_NAME = "windows-qwen"
SURFACE_FLAGS = ("diagram_present", "formula_dense", "table_heavy")


class QwenRouterError(ValueError):
    """Raised when the manifest row cannot be routed deterministically."""


@dataclass(frozen=True)
class RouteDecision:
    route: str
    lane: str
    provider: str
    model: str
    prompt_template_id: str
    prompt_template_version: str
    response_schema_version: str
    lazy_attach_original_image: bool
    region: str
    base_url: str
    api_key_scope: str
    stateless: bool
    response_format: dict[str, str]
    enable_thinking: bool
    decision_reasons: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["decision_reasons"] = list(self.decision_reasons)
        payload["response_format"] = dict(self.response_format)
        return payload


@lru_cache(maxsize=1)
def load_router_contract() -> dict[str, Any]:
    return json.loads(ROUTER_CONTRACT_PATH.read_text(encoding="utf-8"))


def _missing_required_fields(item: dict[str, Any], contract: dict[str, Any]) -> list[str]:
    required_fields = contract.get("router_input_required_fields", [])
    return [field for field in required_fields if field not in item]


def _surface_flags_unknown(item: dict[str, Any]) -> bool:
    return any(item.get(field) is None for field in SURFACE_FLAGS)


def _missing_surface_flags(item: dict[str, Any]) -> list[str]:
    return [
        field for field in SURFACE_FLAGS
        if not isinstance(item.get(field), bool)
    ]


def _should_use_diagram_lane_for_verified_gate_critical_row(item: dict[str, Any]) -> bool:
    return (
        item.get("gate_critical") is True
        and item.get("requires_review") is False
        and item.get("route_hint") == "diagram_lane"
        and item.get("diagram_present") is True
        and item.get("formula_dense") is False
        and item.get("table_heavy") is False
        and item.get("surface_evidence_status") == "verified_primary_asset"
    )


def build_route_decision(
    route: str,
    decision_reasons: list[str],
    contract: dict[str, Any] | None = None,
) -> RouteDecision:
    scope = contract or load_router_contract()
    try:
        route_contract = scope["routes"][route]
    except KeyError as error:
        raise QwenRouterError(f"Unknown route: {route}") from error

    runtime = scope["runtime_freeze"]
    return RouteDecision(
        route=route,
        lane=ROUTE_TO_LANE[route],
        provider=DEFAULT_PROVIDER_NAME,
        model=route_contract["model"],
        prompt_template_id=PROMPT_TEMPLATE_IDS[route],
        prompt_template_version=PROMPT_TEMPLATE_VERSION,
        response_schema_version=RESPONSE_SCHEMA_VERSION,
        lazy_attach_original_image=bool(route_contract["lazy_attach_original_image"]),
        region=runtime["region"],
        base_url=runtime["base_url"],
        api_key_scope=runtime["api_key_scope"],
        stateless=bool(runtime["stateless"]),
        response_format=dict(runtime["response_format"]),
        enable_thinking=bool(runtime["enable_thinking"]),
        decision_reasons=tuple(dict.fromkeys(decision_reasons)),
    )


def route_manifest_item(
    item: dict[str, Any],
    contract: dict[str, Any] | None = None,
) -> RouteDecision:
    scope = contract or load_router_contract()
    missing = _missing_required_fields(item, scope)
    if missing:
        raise QwenRouterError(
            f"Manifest row missing required router fields: {', '.join(missing)}"
        )
    missing_surface_flags = _missing_surface_flags(item)
    if missing_surface_flags:
        raise QwenRouterError(
            "Surface triage required before routing; missing boolean surface flags: "
            + ", ".join(missing_surface_flags)
        )

    reasons: list[str] = []
    if item.get("gate_critical"):
        reasons.append("gate_critical")
    if item.get("requires_review"):
        reasons.append("requires_review")
    surface_flags_unknown = _surface_flags_unknown(item)
    if surface_flags_unknown:
        reasons.append("unknown_surface_flags")

    if _should_use_diagram_lane_for_verified_gate_critical_row(item):
        return build_route_decision("diagram_lane", [*reasons, "diagram_present"], scope)

    if item.get("gate_critical"):
        return build_route_decision("review_lane", reasons, scope)

    if item.get("diagram_present") is True:
        return build_route_decision("diagram_lane", ["diagram_present"], scope)

    if item.get("table_heavy") is True:
        return build_route_decision("ocr_lane", ["table_heavy"], scope)

    if item.get("formula_dense") is True:
        return build_route_decision("ocr_lane", ["formula_dense"], scope)

    route_hint = item.get("route_hint")
    if route_hint == "diagram_lane":
        return build_route_decision("diagram_lane", ["route_hint"], scope)
    if route_hint == "ocr_lane":
        return build_route_decision("ocr_lane", ["text_dominant"], scope)

    if item.get("diagram_present") is False:
        return build_route_decision("ocr_lane", ["text_dominant"], scope)

    if surface_flags_unknown or item.get("requires_review"):
        return build_route_decision(
            "ocr_lane",
            [*reasons, "extraction_first_unknown_surface"],
            scope,
        )

    return build_route_decision("review_lane", ["router_fallback"], scope)


def route_manifest_items(items: list[dict[str, Any]]) -> list[RouteDecision]:
    return [route_manifest_item(item) for item in items]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Route a frozen Qwen wave-1 manifest into OCR/diagram/review lanes.",
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--json", action="store_true", help="Emit full routed rows as JSON.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    routed = [
        {
            "storage_key": item["storage_key"],
            **route_manifest_item(item).to_dict(),
        }
        for item in manifest.get("items", [])
    ]

    if args.json:
        print(json.dumps(routed, ensure_ascii=False, indent=2))
        return 0

    counts: dict[str, int] = {}
    for row in routed:
        counts[row["route"]] = counts.get(row["route"], 0) + 1

    print(f"manifest_id: {manifest.get('manifest_id', 'unknown')}")
    print(f"jobs_planned: {len(routed)}")
    for route in sorted(counts):
        print(f"{route}: {counts[route]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
