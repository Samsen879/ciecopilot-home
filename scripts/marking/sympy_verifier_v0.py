#!/usr/bin/env python3
"""SymPy verifier v0: deterministic expression equivalence checks.

Fail-safe goals:
- parse failures never crash the pipeline
- invalid items are surfaced as parse_fail
- output format is stable for downstream adjudicator usage
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Any

from scripts.marking.marking_semantics_v1 import build_uncertain_reason


_ALLOWED_EXPR = re.compile(r"^[0-9a-zA-Z_+\-*/^()., \t]+$")
_SAMPLES = (-3.0, -2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0, 3.0)

try:
    import sympy as sp  # type: ignore

    HAS_SYMPY = True
except Exception:
    sp = None
    HAS_SYMPY = False


def _normalize_expr(expr: str) -> str:
    text = str(expr or "").strip()
    if not text:
        raise ValueError("empty expression")
    text = text.replace("^", "**")
    if not _ALLOWED_EXPR.fullmatch(text):
        raise ValueError("expression contains unsupported characters")
    return text


def _safe_eval(expr: str, variable: str, value: float) -> float:
    allowed = {
        variable: value,
        "pi": math.pi,
        "e": math.e,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "sqrt": math.sqrt,
        "log": math.log,
        "exp": math.exp,
        "abs": abs,
    }
    out = eval(expr, {"__builtins__": {}}, allowed)  # noqa: S307 - tightly sandboxed namespace
    return float(out)


def _equivalent_by_sampling(student: str, expected: str, variable: str) -> bool:
    for x in _SAMPLES:
        try:
            a = _safe_eval(student, variable, x)
            b = _safe_eval(expected, variable, x)
        except Exception:
            # Skip singular points (e.g., division by zero), continue sampling.
            continue
        if abs(a - b) > 1e-6:
            return False
    return True


def verify_equivalence(
    student_expr: str,
    expected_expr: str,
    variable: str = "x",
    *,
    include_uncertain_reason: bool = False,
) -> dict[str, Any]:
    try:
        student = _normalize_expr(student_expr)
        expected = _normalize_expr(expected_expr)
    except Exception as exc:
        result = {
            "status": "parse_fail",
            "equivalent": False,
            "reason": str(exc),
        }
        if include_uncertain_reason:
            result["uncertain_reason"] = build_uncertain_reason(str(exc), awarded=False)
        return result

    if HAS_SYMPY:
        try:
            symbol = sp.Symbol(variable)  # type: ignore[union-attr]
            left = sp.sympify(student, locals={variable: symbol})  # type: ignore[union-attr]
            right = sp.sympify(expected, locals={variable: symbol})  # type: ignore[union-attr]
            diff = sp.simplify(left - right)  # type: ignore[union-attr]
            equivalent = bool(diff == 0)
            result = {
                "status": "equivalent" if equivalent else "not_equivalent",
                "equivalent": equivalent,
                "reason": "sympy_simplify",
            }
            if include_uncertain_reason:
                result["uncertain_reason"] = build_uncertain_reason(
                    "sympy_simplify",
                    awarded=equivalent,
                )
            return result
        except Exception as exc:
            reason = f"sympy_parse_fail: {exc}"
            result = {
                "status": "parse_fail",
                "equivalent": False,
                "reason": reason,
            }
            if include_uncertain_reason:
                result["uncertain_reason"] = build_uncertain_reason(reason, awarded=False)
            return result

    try:
        equivalent = _equivalent_by_sampling(student, expected, variable=variable)
        result = {
            "status": "equivalent" if equivalent else "not_equivalent",
            "equivalent": equivalent,
            "reason": "numeric_sampling",
        }
        if include_uncertain_reason:
            result["uncertain_reason"] = build_uncertain_reason(
                "numeric_sampling",
                awarded=equivalent,
            )
        return result
    except Exception as exc:
        reason = f"sampling_parse_fail: {exc}"
        result = {
            "status": "parse_fail",
            "equivalent": False,
            "reason": reason,
        }
        if include_uncertain_reason:
            result["uncertain_reason"] = build_uncertain_reason(reason, awarded=False)
        return result


def run_from_payload(payload: dict[str, Any]) -> dict[str, Any]:
    variable = str(payload.get("variable") or "x").strip() or "x"
    items = payload.get("items") or []
    include_uncertain_reason = bool(payload.get("include_uncertain_reason", False))
    results: list[dict[str, Any]] = []
    counts = {"equivalent": 0, "not_equivalent": 0, "parse_fail": 0}

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            result = {
                "item_id": f"i{idx+1}",
                "status": "parse_fail",
                "equivalent": False,
                "reason": "invalid_item",
            }
            if include_uncertain_reason:
                result["uncertain_reason"] = build_uncertain_reason("invalid_item", awarded=False)
            results.append(result)
            counts["parse_fail"] += 1
            continue

        item_id = str(item.get("item_id") or f"i{idx+1}")
        student_expr = str(item.get("student_expr") or "")
        expected_expr = str(item.get("expected_expr") or "")
        verdict = verify_equivalence(
            student_expr,
            expected_expr,
            variable=variable,
            include_uncertain_reason=include_uncertain_reason,
        )
        result = {"item_id": item_id, **verdict}
        results.append(result)
        counts[result["status"]] += 1

    return {
        "variable": variable,
        "engine": "sympy" if HAS_SYMPY else "sampling_fallback",
        "total_items": len(results),
        "summary": counts,
        "results": results,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SymPy verifier v0")
    parser.add_argument("--input", type=Path, required=True, help="JSON payload with items")
    parser.add_argument("--output", type=Path, help="Optional output JSON path")
    parser.add_argument("--include-uncertain-reason", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    if args.include_uncertain_reason:
        payload["include_uncertain_reason"] = True
    out = run_from_payload(payload)
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
