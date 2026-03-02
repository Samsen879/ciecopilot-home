#!/usr/bin/env python3
"""Validate integrity of B2 blind evaluation sets before scoring gates."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local
from scripts.vlm.db_utils import connect


DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> None:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        if os.environ.get(key):
            return
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL
    print(f"DATABASE_URL not set; fallback to local default: {DEFAULT_LOCAL_DB_URL}")


def normalize_text(value: str) -> str:
    text = value.lower().strip()
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"[^a-z0-9+\-*/=(). ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_gold_targets(value: Any) -> set[str]:
    if value is None:
        return set()
    if isinstance(value, str):
        v = value.strip()
        return {v} if v else set()
    if isinstance(value, (list, tuple, set)):
        out: set[str] = set()
        for item in value:
            if item is None:
                continue
            v = str(item).strip()
            if v:
                out.add(v)
        return out
    v = str(value).strip()
    return {v} if v else set()


def is_fixed_order_gold_case(case: dict[str, Any]) -> bool:
    steps = case.get("steps") or []
    rubric = case.get("rubric_points") or []
    gold = case.get("gold") or {}

    if not (isinstance(gold, dict) and steps and rubric and len(steps) == len(rubric)):
        return False

    s_ids = [str((s or {}).get("step_id") or "") for s in steps]
    r_ids = [str((r or {}).get("rubric_id") or "") for r in rubric]
    if any(not sid for sid in s_ids) or any(not rid for rid in r_ids):
        return False

    for idx, sid in enumerate(s_ids):
        expected = parse_gold_targets(gold.get(sid))
        if len(expected) != 1 or r_ids[idx] not in expected:
            return False
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate marking blind set integrity")
    parser.add_argument("--suite", type=Path, required=True)
    parser.add_argument("--db-table", default="public.question_descriptions_prod_v1")
    parser.add_argument(
        "--storage-key-check",
        choices=("db", "file_exists", "none"),
        default="db",
        help="How to validate storage keys. db: query db table; file_exists: check local path exists; none: skip check.",
    )
    parser.add_argument(
        "--storage-key-base",
        type=Path,
        default=Path("."),
        help="Base directory for storage_key when --storage-key-check=file_exists",
    )
    parser.add_argument("--min-storage-key-hit-rate", type=float, default=0.90)
    parser.add_argument("--max-step-dup-rate", type=float, default=0.30)
    parser.add_argument("--max-fixed-order-gold-rate", type=float, default=0.70)
    parser.add_argument("--json-out", type=Path, default=Path("docs/reports/b2_blind_set_integrity_v1.json"))
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument(
        "--require-db",
        action="store_true",
        help="When storage-key-check=db, raise an error if DB lookup cannot run.",
    )
    return parser.parse_args()


def split_relation(relation: str) -> tuple[str, str]:
    rel = relation.strip().lower()
    if "." not in rel:
        return "public", rel
    schema, table = rel.split(".", 1)
    return schema, table


def db_storage_key_hits(storage_keys: list[str], relation: str) -> int:
    schema, table = split_relation(relation)
    sql = f"SELECT COUNT(*) FROM {schema}.{table} WHERE storage_key = ANY(%s)"
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (storage_keys,))
            return int(cur.fetchone()[0] or 0)


def file_storage_key_hits(storage_keys: list[str], storage_key_base: Path) -> int:
    base = storage_key_base.resolve()
    hits = 0
    for key in storage_keys:
        path = Path(key)
        candidate = path if path.is_absolute() else (base / path)
        if candidate.exists():
            hits += 1
    return hits


def compute_integrity(
    *,
    suite_path: str | Path,
    cases: list[dict[str, Any]],
    db_table: str = "public.question_descriptions_prod_v1",
    storage_key_check: str = "db",
    storage_key_base: Path = Path("."),
    min_storage_key_hit_rate: float = 0.90,
    max_step_dup_rate: float = 0.30,
    max_fixed_order_gold_rate: float = 0.70,
    allow_remote: bool = False,
    require_db: bool = False,
) -> dict[str, Any]:
    storage_keys = [str((c.get("metadata") or {}).get("storage_key") or "").strip() for c in cases]
    storage_keys = [k for k in storage_keys if k]

    step_texts: list[str] = []
    fixed_order_gold_cases = 0
    for case in cases:
        for s in case.get("steps") or []:
            step_texts.append(normalize_text(str((s or {}).get("text") or "")))
        if is_fixed_order_gold_case(case):
            fixed_order_gold_cases += 1

    hits = 0
    storage_key_check_error: str | None = None
    mode = storage_key_check.strip().lower()
    if mode == "db":
        try:
            load_env()
            ensure_db_url()
            enforce_local(
                allow_remote,
                env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
            )
            hits = db_storage_key_hits(storage_keys, db_table) if storage_keys else 0
        except Exception as exc:  # pragma: no cover - depends on external DB state
            storage_key_check_error = str(exc)
            if require_db:
                raise
            hits = 0
        except SystemExit as exc:  # pragma: no cover - guard/driver exits
            storage_key_check_error = f"system_exit:{exc.code}"
            if require_db:
                raise
            hits = 0
    elif mode == "file_exists":
        hits = file_storage_key_hits(storage_keys, storage_key_base)
    elif mode == "none":
        hits = len(storage_keys)
    else:
        raise ValueError(f"Unsupported storage_key_check: {storage_key_check}")

    unique_steps = len(set(step_texts))
    total_steps = len(step_texts)
    step_dup_rate = (total_steps - unique_steps) / total_steps if total_steps else 0.0
    storage_key_hit_rate = hits / len(storage_keys) if storage_keys else 0.0
    fixed_order_gold_rate = fixed_order_gold_cases / len(cases) if cases else 0.0

    checks = {
        "storage_key_hit_rate": (True if mode == "none" else (storage_key_hit_rate >= min_storage_key_hit_rate)),
        "step_dup_rate": step_dup_rate <= max_step_dup_rate,
        "fixed_order_gold_rate": fixed_order_gold_rate <= max_fixed_order_gold_rate,
    }
    passed = all(checks.values())

    return {
        "suite_path": str(suite_path),
        "db_table": db_table,
        "storage_key_check_mode": mode,
        "storage_key_check_error": storage_key_check_error,
        "counts": {
            "cases": len(cases),
            "storage_keys": len(storage_keys),
            "storage_key_hits": hits,
            "steps_total": total_steps,
            "steps_unique": unique_steps,
            "fixed_order_gold_cases": fixed_order_gold_cases,
        },
        "metrics": {
            "storage_key_hit_rate": storage_key_hit_rate,
            "step_dup_rate": step_dup_rate,
            "fixed_order_gold_rate": fixed_order_gold_rate,
        },
        "thresholds": {
            "min_storage_key_hit_rate": min_storage_key_hit_rate,
            "max_step_dup_rate": max_step_dup_rate,
            "max_fixed_order_gold_rate": max_fixed_order_gold_rate,
        },
        "checks": checks,
        "pass": passed,
        "top_repeated_step_texts": Counter(step_texts).most_common(20),
    }


def main() -> int:
    args = parse_args()
    if not args.suite.exists():
        print(f"Error: suite not found: {args.suite}", file=sys.stderr)
        return 2

    payload = json.loads(args.suite.read_text(encoding="utf-8"))
    cases: list[dict[str, Any]] = payload.get("cases") or []
    if not cases:
        print("Error: suite has no cases", file=sys.stderr)
        return 2

    out = compute_integrity(
        suite_path=args.suite,
        cases=cases,
        db_table=args.db_table,
        storage_key_check=args.storage_key_check,
        storage_key_base=args.storage_key_base,
        min_storage_key_hit_rate=args.min_storage_key_hit_rate,
        max_step_dup_rate=args.max_step_dup_rate,
        max_fixed_order_gold_rate=args.max_fixed_order_gold_rate,
        allow_remote=args.allow_remote,
        require_db=args.require_db,
    )
    metrics = out["metrics"]

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(out, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")

    print(f"suite={args.suite}")
    print(f"cases={len(cases)}")
    print(f"storage_key_hit_rate={metrics['storage_key_hit_rate']:.4f}")
    print(f"step_dup_rate={metrics['step_dup_rate']:.4f}")
    print(f"fixed_order_gold_rate={metrics['fixed_order_gold_rate']:.4f}")
    print(f"pass={'true' if out['pass'] else 'false'}")
    print(f"json_out={args.json_out}")
    return 0 if out["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
