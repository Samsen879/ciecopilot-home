"""B2 contract validator for rubric_points_ready_v1.

Validates that the ready view output can be directly consumed by
B2 Mark Engine (sla_align_v0.py / adjudicator_v0.py) and that
B3 passthrough fields are present.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1
"""

from __future__ import annotations

import logging
import sys
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

_FETCH_READY_SQL = """
SELECT rubric_id, storage_key, q_number, subpart,
       mark_label, description, kind, depends_on, marks,
       source_version
  FROM rubric_points_ready_v1
"""

_FETCH_SCOPE_IDS_SQL = """
SELECT rubric_id
  FROM rubric_points_ready_v1
 WHERE storage_key = %(storage_key)s
   AND q_number    = %(q_number)s
   AND COALESCE(subpart, '') = %(subpart)s
"""

# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------

_B2_REQUIRED = ("rubric_id", "mark_label", "description", "kind", "depends_on", "marks")
_B3_REQUIRED = ("storage_key", "q_number", "subpart", "source_version")
_VALID_KINDS = {"M", "A", "B"}


def _normalize_depends_on(value: Any) -> list[str]:
    """Normalise depends_on into a list of UUID strings.

    Handles drivers that return Postgres arrays as Python lists/tuples or
    raw array literals like '{}' / '{uuid1,uuid2}'.
    """
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v) for v in value if v is not None and str(v).strip()]
    if isinstance(value, str):
        raw = value.strip()
        if raw in ("", "{}", "[]"):
            return []
        if raw.startswith("{") and raw.endswith("}"):
            inner = raw[1:-1].strip()
            if not inner:
                return []
            parts = [p.strip().strip('"') for p in inner.split(",")]
            return [p for p in parts if p]
        return [raw]
    return [str(value)]


def validate_b2_contract(pool: Any) -> dict:
    """Validate that rubric_points_ready_v1 output can be consumed by B2.

    Checks:
    1. All ready records contain B2 required fields (non-null).
    2. All ready records contain B3 passthrough fields (non-null,
       except subpart which may legitimately be NULL).
    3. kind IN ('M', 'A', 'B').
    4. marks > 0.
    5. Every UUID in depends_on exists as a rubric_id within the
       same scope (storage_key, q_number, COALESCE(subpart, '')).

    Returns ``{valid: bool, failures: [{rubric_id, reason}]}``.
    """
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(_FETCH_READY_SQL)
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        pool.putconn(conn)

    if not rows:
        return {"valid": True, "failures": []}

    failures: list[dict[str, str]] = []

    # --- Build scope index for depends_on validation ---
    # scope -> set of rubric_id strings
    scope_ids: dict[tuple, set[str]] = {}
    for row in rows:
        scope = (
            row["storage_key"],
            row["q_number"],
            row["subpart"] or "",
        )
        scope_ids.setdefault(scope, set()).add(str(row["rubric_id"]))

    # --- Validate each record ---
    for row in rows:
        rid = str(row["rubric_id"])

        # B2 required fields: must be non-null
        for field in _B2_REQUIRED:
            val = row.get(field)
            if val is None:
                failures.append({"rubric_id": rid, "reason": f"B2 required field '{field}' is null"})

        # B3 passthrough fields: non-null except subpart
        for field in _B3_REQUIRED:
            if field == "subpart":
                continue  # subpart may be NULL
            val = row.get(field)
            if val is None:
                failures.append({"rubric_id": rid, "reason": f"B3 passthrough field '{field}' is null"})

        # kind validation
        kind = row.get("kind")
        if kind is not None and kind not in _VALID_KINDS:
            failures.append({"rubric_id": rid, "reason": f"kind '{kind}' not in {_VALID_KINDS}"})

        # marks validation
        marks = row.get("marks")
        if marks is not None and marks <= 0:
            failures.append({"rubric_id": rid, "reason": f"marks={marks} is not > 0"})

        # depends_on UUID reference integrity
        depends_on = _normalize_depends_on(row.get("depends_on"))
        if depends_on:
            scope = (
                row["storage_key"],
                row["q_number"],
                row["subpart"] or "",
            )
            valid_ids = scope_ids.get(scope, set())
            for dep_uuid in depends_on:
                dep_str = str(dep_uuid)
                if dep_str not in valid_ids:
                    failures.append({
                        "rubric_id": rid,
                        "reason": f"depends_on UUID {dep_str} not found in scope {scope}",
                    })

    return {
        "valid": len(failures) == 0,
        "failures": failures,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for B2 contract validation."""
    import json
    import os

    from dotenv import load_dotenv  # type: ignore

    load_dotenv()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: DATABASE_URL or SUPABASE_DB_URL must be set", file=sys.stderr)
        return 1

    import psycopg2.pool  # type: ignore

    pool = psycopg2.pool.ThreadedConnectionPool(1, 4, db_url)

    try:
        result = validate_b2_contract(pool)

        print("=" * 60)
        print("B2 Contract Validation")
        print(f"  Valid: {result['valid']}")
        print(f"  Failures: {len(result['failures'])}")

        if result["failures"]:
            print("\nFailure samples:")
            for f in result["failures"][:20]:
                print(f"  - {f['rubric_id']}: {f['reason']}")
            if len(result["failures"]) > 20:
                print(f"  ... and {len(result['failures']) - 20} more")

            # Write failures to JSON for CI gate
            os.makedirs("runs/ms", exist_ok=True)
            with open("runs/ms/b1_contract_failures.json", "w", encoding="utf-8") as fh:
                json.dump(result, fh, indent=2, ensure_ascii=False, default=str)
            print(f"\n  Full failures written to runs/ms/b1_contract_failures.json")

        print("=" * 60)

        return 0 if result["valid"] else 1
    except Exception as exc:
        logger.error("Contract validation failed: %s", exc, exc_info=True)
        return 1
    finally:
        try:
            pool.closeall()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
