#!/usr/bin/env python3
"""Step-Level Alignment (SLA) v0: align student steps to rubric points."""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.marking.engine_config_v0 import get_alignment_thresholds, load_marking_engine_config
from scripts.marking.marking_semantics_v1 import build_uncertain_reason


TOKEN_RE = re.compile(r"[a-z0-9]+")
DEFAULT_MIN_CONFIDENCE, DEFAULT_UNCERTAIN_MARGIN = get_alignment_thresholds()


@dataclass
class Step:
    step_id: str
    text: str


@dataclass
class RubricPoint:
    rubric_id: str
    mark_label: str
    description: str


def normalize_text(value: str) -> str:
    text = value.lower().strip()
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"[^a-z0-9+\-*/=(). ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(value: str) -> list[str]:
    return TOKEN_RE.findall(normalize_text(value))


def jaccard_similarity(a: list[str], b: list[str]) -> float:
    if not a or not b:
        return 0.0
    sa = set(a)
    sb = set(b)
    inter = len(sa & sb)
    union = len(sa | sb)
    if union == 0:
        return 0.0
    return inter / union


def alignment_score(step_text: str, rubric_text: str) -> float:
    t1 = tokenize(step_text)
    t2 = tokenize(rubric_text)
    jac = jaccard_similarity(t1, t2)
    seq = SequenceMatcher(None, normalize_text(step_text), normalize_text(rubric_text)).ratio()
    # Weighted blend for robustness on short/long text.
    score = 0.65 * jac + 0.35 * seq
    return max(0.0, min(1.0, score))


def align_steps(
    steps: list[Step],
    rubric_points: list[RubricPoint],
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    uncertain_margin: float = DEFAULT_UNCERTAIN_MARGIN,
    include_uncertain_reason: bool = False,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    if not rubric_points:
        for step in steps:
            item = {
                "step_id": step.step_id,
                "status": "uncertain",
                "confidence": 0.0,
                "rubric_id": None,
                "mark_label": None,
                "reason": "no_rubric_points",
            }
            if include_uncertain_reason:
                item["uncertain_reason"] = build_uncertain_reason("no_rubric_points")
            results.append(item)
        return results

    for step in steps:
        best: RubricPoint | None = None
        best_score = -math.inf

        for rp in rubric_points:
            basis = f"{rp.mark_label} {rp.description}".strip()
            score = alignment_score(step.text, basis)
            if score > best_score:
                best_score = score
                best = rp

        assert best is not None
        confidence = round(float(best_score), 4)
        status = "aligned" if best_score >= min_confidence else "uncertain"
        reason = "below_threshold" if status == "uncertain" else "best_match"

        # Borderline matches are always uncertain in v0 fail-safe mode.
        if min_confidence <= best_score < (min_confidence + uncertain_margin):
            status = "uncertain"
            reason = "borderline_score"

        item = {
            "step_id": step.step_id,
            "status": status,
            "confidence": confidence,
            "rubric_id": best.rubric_id,
            "mark_label": best.mark_label,
            "reason": reason,
        }
        if include_uncertain_reason:
            item["uncertain_reason"] = build_uncertain_reason(reason, awarded=(status == "aligned"))
        results.append(item)

    return results


def parse_steps(raw: list[dict[str, Any]]) -> list[Step]:
    out: list[Step] = []
    for i, item in enumerate(raw):
        step_id = str(item.get("step_id") or f"s{i+1}")
        text = str(item.get("text") or "").strip()
        out.append(Step(step_id=step_id, text=text))
    return out


def parse_rubric_points(raw: list[dict[str, Any]]) -> list[RubricPoint]:
    out: list[RubricPoint] = []
    for i, item in enumerate(raw):
        rubric_id = str(item.get("rubric_id") or f"r{i+1}")
        mark_label = str(item.get("mark_label") or "U").strip()
        description = str(item.get("description") or "").strip()
        out.append(RubricPoint(rubric_id=rubric_id, mark_label=mark_label, description=description))
    return out


def run_from_payload(
    payload: dict[str, Any],
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    uncertain_margin: float = DEFAULT_UNCERTAIN_MARGIN,
    include_uncertain_reason: bool = False,
) -> dict[str, Any]:
    steps = parse_steps(payload.get("steps", []))
    rubric_points = parse_rubric_points(payload.get("rubric_points", []))
    alignments = align_steps(
        steps=steps,
        rubric_points=rubric_points,
        min_confidence=min_confidence,
        uncertain_margin=uncertain_margin,
        include_uncertain_reason=include_uncertain_reason,
    )
    return {
        "min_confidence": min_confidence,
        "uncertain_margin": uncertain_margin,
        "steps_total": len(steps),
        "rubric_points_total": len(rubric_points),
        "alignments": alignments,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SLA v0 step-to-rubric aligner")
    parser.add_argument("--input", type=Path, required=True, help="JSON payload file with steps and rubric_points")
    parser.add_argument("--output", type=Path, help="Output JSON path (default: print stdout)")
    parser.add_argument(
        "--threshold-config",
        type=Path,
        default=None,
        help="Optional threshold config path (default: config/marking_engine_v0.json)",
    )
    parser.add_argument("--min-confidence", type=float, default=None)
    parser.add_argument("--uncertain-margin", type=float, default=None)
    parser.add_argument("--include-uncertain-reason", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    cfg = load_marking_engine_config(args.threshold_config)
    cfg_min_confidence, cfg_uncertain_margin = get_alignment_thresholds(config=cfg)
    min_confidence = cfg_min_confidence if args.min_confidence is None else float(args.min_confidence)
    uncertain_margin = cfg_uncertain_margin if args.uncertain_margin is None else float(args.uncertain_margin)
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    result = run_from_payload(
        payload,
        min_confidence=min_confidence,
        uncertain_margin=uncertain_margin,
        include_uncertain_reason=bool(args.include_uncertain_reason),
    )
    output = json.dumps(result, ensure_ascii=True, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output + "\n", encoding="utf-8")
        print(f"wrote={args.output}")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
