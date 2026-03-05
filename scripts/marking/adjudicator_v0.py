#!/usr/bin/env python3
"""Adjudicator v0: dependency-aware mark decisions with fail-safe FT mode."""
from __future__ import annotations

import argparse
import json
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from scripts.marking.marking_semantics_v1 import build_uncertain_reason


@dataclass
class RubricPoint:
    rubric_id: str
    mark_label: str
    kind: str
    depends_on: list[str] = field(default_factory=list)
    marks: float = 1.0


def _normalize_kind(mark_label: str, kind: str | None) -> str:
    if kind:
        k = kind.strip().upper()
        if k in {"M", "A", "B"}:
            return k
    label = (mark_label or "").strip().upper()
    if label.startswith("M"):
        return "M"
    if label.startswith("A"):
        return "A"
    if label.startswith("B"):
        return "B"
    return "M"


def parse_rubric_points(raw: list[dict[str, Any]]) -> list[RubricPoint]:
    out: list[RubricPoint] = []
    for i, item in enumerate(raw):
        rubric_id = str(item.get("rubric_id") or f"r{i+1}")
        mark_label = str(item.get("mark_label") or rubric_id).strip()
        kind = _normalize_kind(mark_label, item.get("kind"))
        depends_on = [str(x) for x in (item.get("depends_on") or []) if str(x).strip()]
        marks = float(item.get("marks") or 1.0)
        out.append(
            RubricPoint(
                rubric_id=rubric_id,
                mark_label=mark_label,
                kind=kind,
                depends_on=depends_on,
                marks=marks,
            )
        )
    return out


def topological_order(points: list[RubricPoint]) -> list[RubricPoint]:
    by_id = {p.rubric_id: p for p in points}
    indegree = {p.rubric_id: 0 for p in points}
    children: dict[str, list[str]] = defaultdict(list)

    for p in points:
        for dep in p.depends_on:
            if dep in by_id:
                indegree[p.rubric_id] += 1
                children[dep].append(p.rubric_id)

    q: deque[str] = deque(sorted([rid for rid, d in indegree.items() if d == 0]))
    out_ids: list[str] = []
    while q:
        rid = q.popleft()
        out_ids.append(rid)
        for child in sorted(children.get(rid, [])):
            indegree[child] -= 1
            if indegree[child] == 0:
                q.append(child)

    if len(out_ids) != len(points):
        # Cycle fallback: process in input order if graph has cycle.
        return points

    return [by_id[rid] for rid in out_ids]


def adjudicate(payload: dict[str, Any]) -> dict[str, Any]:
    points = parse_rubric_points(payload.get("rubric_points") or [])
    signals = payload.get("signals") or {}
    min_confidence = float(payload.get("min_confidence") or 0.55)
    include_uncertain_reason = bool(payload.get("include_uncertain_reason", False))

    ft = payload.get("ft") or {}
    ft_enabled = bool(ft.get("enabled", False))
    ft_triggered = bool(ft.get("triggered", False))

    ordered = topological_order(points)
    awarded_map: dict[str, bool] = {}
    decisions: list[dict[str, Any]] = []
    total_awarded = 0.0

    for p in ordered:
        signal = signals.get(p.rubric_id) or {}
        matched = bool(signal.get("matched", False))
        confidence = float(signal.get("confidence") or 0.0)

        deps_ok = all(awarded_map.get(dep, False) for dep in p.depends_on if dep in awarded_map)
        dependency_blocked = bool(p.depends_on) and not deps_ok

        awarded = matched and confidence >= min_confidence and not dependency_blocked
        reason = "awarded" if awarded else "not_matched_or_low_confidence"
        if dependency_blocked:
            reason = "dependency_blocked"

        # Fail-tolerant FSM v0: default OFF. When ON and triggered, A/B marks are capped.
        if ft_enabled and ft_triggered and p.kind in {"A", "B"} and awarded:
            awarded = False
            reason = "ft_capped"

        awarded_map[p.rubric_id] = awarded
        if awarded:
            total_awarded += p.marks

        item = {
            "rubric_id": p.rubric_id,
            "mark_label": p.mark_label,
            "kind": p.kind,
            "depends_on": p.depends_on,
            "matched": matched,
            "confidence": round(confidence, 4),
            "awarded": awarded,
            "awarded_marks": p.marks if awarded else 0.0,
            "reason": reason,
        }
        if include_uncertain_reason:
            item["uncertain_reason"] = build_uncertain_reason(reason, awarded=awarded)
        decisions.append(item)

    awarded_count = sum(1 for d in decisions if d["awarded"])
    return {
        "min_confidence": min_confidence,
        "ft": {"enabled": ft_enabled, "triggered": ft_triggered},
        "total_points": len(decisions),
        "awarded_points": awarded_count,
        "total_awarded_marks": total_awarded,
        "decisions": decisions,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Adjudicator v0 (DAG + FT FSM)")
    parser.add_argument("--input", type=Path, required=True, help="JSON payload with rubric_points/signals")
    parser.add_argument("--output", type=Path, help="Optional output JSON path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    out = adjudicate(payload)
    text = json.dumps(out, ensure_ascii=True, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text + "\n", encoding="utf-8")
        print(f"wrote={args.output}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
