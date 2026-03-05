"""Dependency resolver for rubric points.

Resolves ``depends_on_labels`` (text tags like ``["M1"]``) to
``depends_on`` (UUID arrays) within a question scope, detects cycles,
and transitions status from ``draft`` to ``ready`` or ``needs_review``.

Can be re-run independently without calling VLM.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
"""

from __future__ import annotations

import json
import logging
import sys
from collections import defaultdict
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

_FETCH_SCOPE_SQL = """
SELECT rubric_id, mark_label, step_index, depends_on_labels, status, parse_flags
  FROM rubric_points
 WHERE storage_key        = %(storage_key)s
   AND q_number           = %(q_number)s
   AND COALESCE(subpart, '') = %(subpart)s
   AND extractor_version  = %(extractor_version)s
   AND provider           = %(provider)s
   AND model              = %(model)s
   AND prompt_version     = %(prompt_version)s
 ORDER BY step_index
"""

_UPDATE_POINT_SQL = """
UPDATE rubric_points
   SET depends_on  = %(depends_on)s,
       status      = %(status)s,
       parse_flags = %(parse_flags)s,
       updated_at  = now()
 WHERE rubric_id = %(rubric_id)s
"""

_DISTINCT_SCOPES_SQL = """
SELECT DISTINCT
       storage_key,
       q_number,
       COALESCE(subpart, '') AS subpart,
       extractor_version,
       provider,
       model,
       prompt_version
  FROM rubric_points
 WHERE status = 'draft'
"""

_DISTINCT_SCOPES_FILTERED_SQL = """
SELECT DISTINCT
       rp.storage_key,
       rp.q_number,
       COALESCE(rp.subpart, '') AS subpart,
       rp.extractor_version,
       rp.provider,
       rp.model,
       rp.prompt_version
  FROM rubric_points rp
  JOIN vlm_ms_jobs j ON j.storage_key = rp.storage_key
 WHERE rp.status = 'draft'
"""


# ---------------------------------------------------------------------------
# Cycle detection
# ---------------------------------------------------------------------------


def detect_cycles(points: list[dict]) -> list[list[str]]:
    """Detect cycles in the dependency graph using DFS.

    *points* is a list of dicts with at least ``rubric_id`` and
    ``depends_on`` (list of UUID strings).

    Returns a list of cycles, where each cycle is a list of rubric_id
    strings forming the loop.
    """
    # Collect all node IDs first
    id_set: set[str] = {str(pt["rubric_id"]) for pt in points}

    # Build adjacency list: rubric_id -> list of rubric_id it depends on
    # Only include edges to nodes within this scope
    adj: dict[str, list[str]] = {}
    for pt in points:
        rid = str(pt["rubric_id"])
        deps = pt.get("depends_on") or []
        adj[rid] = [str(d) for d in deps if str(d) in id_set]

    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {rid: WHITE for rid in id_set}
    parent: dict[str, str | None] = {rid: None for rid in id_set}
    cycles: list[list[str]] = []

    def _dfs(u: str) -> None:
        color[u] = GRAY
        for v in adj.get(u, []):
            if color[v] == GRAY:
                # Back edge found – extract cycle
                cycle = [v]
                node = u
                while node != v:
                    cycle.append(node)
                    node = parent[node]  # type: ignore[assignment]
                cycle.append(v)
                cycle.reverse()
                cycles.append(cycle)
            elif color[v] == WHITE:
                parent[v] = u
                _dfs(v)
        color[u] = BLACK

    for rid in id_set:
        if color[rid] == WHITE:
            _dfs(rid)

    return cycles


# ---------------------------------------------------------------------------
# Core resolver
# ---------------------------------------------------------------------------


def resolve_dependencies(
    pool: Any,
    scope_key: tuple,
    dry_run: bool = False,
) -> dict:
    """Resolve ``depends_on_labels`` to ``depends_on`` (UUID[]) within a
    question scope.

    *scope_key* = ``(storage_key, q_number, coalesce(subpart,''),
    extractor_version, provider, model, prompt_version)``

    Resolution rules:
    1. Exact match of ``mark_label`` within the same scope.
    2. When duplicate labels exist, pick the nearest preceding
       ``step_index`` relative to the current point.
    3. Still ambiguous → ``status='needs_review'``,
       ``parse_flags.ambiguous_candidates``.
    4. No match → ``status='needs_review'``,
       ``parse_flags.unresolved_labels``.
    5. Cycle detected → ``status='needs_review'``,
       ``parse_flags.cycle=true``.
    6. All resolved successfully → ``status='ready'``.

    Returns ``{resolved, unresolved, ambiguous, cycles, total}``.
    """
    (storage_key, q_number, subpart,
     extractor_version, provider, model, prompt_version) = scope_key

    params = {
        "storage_key": storage_key,
        "q_number": q_number,
        "subpart": subpart,
        "extractor_version": extractor_version,
        "provider": provider,
        "model": model,
        "prompt_version": prompt_version,
    }

    # --- Fetch all points in scope ---
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(_FETCH_SCOPE_SQL, params)
            rows = cur.fetchall()
    finally:
        pool.putconn(conn)

    if not rows:
        return {"resolved": 0, "unresolved": 0, "ambiguous": 0, "cycles": 0, "total": 0}

    columns = ["rubric_id", "mark_label", "step_index", "depends_on_labels", "status", "parse_flags"]
    points = [dict(zip(columns, row)) for row in rows]

    # Build label index: mark_label -> list of (rubric_id, step_index)
    label_index: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for pt in points:
        label_index[pt["mark_label"]].append((str(pt["rubric_id"]), pt["step_index"]))

    # --- Phase 1: resolve labels to UUIDs ---
    counters = {"resolved": 0, "unresolved": 0, "ambiguous": 0, "cycles": 0, "total": len(points)}
    updates: list[dict] = []  # list of {rubric_id, depends_on, status, parse_flags}

    for pt in points:
        rubric_id = str(pt["rubric_id"])
        step_idx = pt["step_index"]
        dep_labels = pt["depends_on_labels"] or []
        # Preserve existing parse_flags (e.g. label_invalid from persist)
        existing_flags = pt["parse_flags"] if isinstance(pt["parse_flags"], dict) else {}
        if isinstance(existing_flags, str):
            try:
                existing_flags = json.loads(existing_flags)
            except (json.JSONDecodeError, TypeError):
                existing_flags = {}

        parse_flags: dict[str, Any] = dict(existing_flags)
        resolved_uuids: list[str] = []
        point_unresolved: list[str] = []
        point_ambiguous: list[dict] = []
        has_issue = False

        # If label_invalid was already set, keep needs_review
        if parse_flags.get("label_invalid"):
            has_issue = True

        if not dep_labels:
            # No dependencies to resolve
            updates.append({
                "rubric_id": rubric_id,
                "depends_on": [],
                "status": "needs_review" if has_issue else "ready",
                "parse_flags": parse_flags,
            })
            if not has_issue:
                counters["resolved"] += 1
            continue

        for label in dep_labels:
            candidates = label_index.get(label, [])
            if not candidates:
                point_unresolved.append(label)
                has_issue = True
                continue

            if len(candidates) == 1:
                resolved_uuids.append(candidates[0][0])
                continue

            # Multiple candidates – pick nearest preceding step_index
            preceding = [(rid, si) for rid, si in candidates if si < step_idx]
            if len(preceding) == 1:
                resolved_uuids.append(preceding[0][0])
                continue
            elif len(preceding) > 1:
                # Pick the one with the largest step_index (nearest preceding)
                nearest = max(preceding, key=lambda x: x[1])
                # Check if there are ties at the same step_index
                at_nearest = [r for r, s in preceding if s == nearest[1]]
                if len(at_nearest) == 1:
                    resolved_uuids.append(nearest[0])
                    continue
                else:
                    # Still ambiguous
                    point_ambiguous.append({
                        "label": label,
                        "candidates": [rid for rid, _ in candidates],
                    })
                    has_issue = True
                    continue
            else:
                # No preceding candidates – ambiguous
                point_ambiguous.append({
                    "label": label,
                    "candidates": [rid for rid, _ in candidates],
                })
                has_issue = True
                continue

        if point_unresolved:
            parse_flags["unresolved_labels"] = point_unresolved
            counters["unresolved"] += 1
        if point_ambiguous:
            parse_flags["ambiguous_candidates"] = point_ambiguous
            counters["ambiguous"] += 1

        updates.append({
            "rubric_id": rubric_id,
            "depends_on": resolved_uuids,
            "status": "needs_review" if has_issue else "ready",
            "parse_flags": parse_flags,
        })
        if not has_issue:
            counters["resolved"] += 1

    # --- Phase 2: cycle detection ---
    # Build the resolved graph for cycle detection
    cycle_points = [
        {"rubric_id": u["rubric_id"], "depends_on": u["depends_on"]}
        for u in updates
    ]
    cycles = detect_cycles(cycle_points)

    if cycles:
        # Collect all rubric_ids involved in any cycle
        cycle_ids: set[str] = set()
        for cycle in cycles:
            for rid in cycle:
                cycle_ids.add(rid)

        for u in updates:
            if u["rubric_id"] in cycle_ids:
                u["status"] = "needs_review"
                u["parse_flags"]["cycle"] = True

        counters["cycles"] = len(cycles)
        # Adjust resolved count: cycle participants that were previously
        # counted as resolved need to be un-counted
        for u in updates:
            if u["rubric_id"] in cycle_ids and u["parse_flags"].get("cycle"):
                # Only subtract if it was previously counted as resolved
                # (no unresolved/ambiguous issues)
                if not u["parse_flags"].get("unresolved_labels") and not u["parse_flags"].get("ambiguous_candidates"):
                    if not u["parse_flags"].get("label_invalid"):
                        counters["resolved"] = max(0, counters["resolved"] - 1)

    # --- Phase 3: write back ---
    if dry_run:
        logger.info(
            "Dry-run: scope=%s total=%d resolved=%d unresolved=%d ambiguous=%d cycles=%d",
            scope_key, counters["total"], counters["resolved"],
            counters["unresolved"], counters["ambiguous"], counters["cycles"],
        )
        return counters

    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            for u in updates:
                cur.execute(_UPDATE_POINT_SQL, {
                    "rubric_id": u["rubric_id"],
                    "depends_on": u["depends_on"],
                    "status": u["status"],
                    "parse_flags": json.dumps(u["parse_flags"], ensure_ascii=False),
                })
        conn.commit()
        logger.info(
            "Resolved scope=%s total=%d resolved=%d unresolved=%d ambiguous=%d cycles=%d",
            scope_key, counters["total"], counters["resolved"],
            counters["unresolved"], counters["ambiguous"], counters["cycles"],
        )
    except Exception:
        conn.rollback()
        logger.error("Failed to write dependency resolution for scope=%s", scope_key, exc_info=True)
        raise
    finally:
        pool.putconn(conn)

    return counters


# ---------------------------------------------------------------------------
# Batch resolve: iterate over all draft scopes
# ---------------------------------------------------------------------------


def resolve_all(
    pool: Any,
    dry_run: bool = False,
    syllabus_code: str | None = None,
    session: str | None = None,
    paper: int | None = None,
) -> dict:
    """Resolve dependencies for all scopes that have ``draft`` points.

    Optional filters narrow the set of scopes via a JOIN to
    ``vlm_ms_jobs`` (which carries syllabus_code/session/paper).

    Returns aggregate counters ``{resolved, unresolved, ambiguous,
    cycles, total, scopes}``.
    """
    has_filter = any(v is not None for v in (syllabus_code, session, paper))

    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            if has_filter:
                # Build dynamic WHERE clause
                clauses: list[str] = []
                params: dict[str, Any] = {}
                if syllabus_code is not None:
                    clauses.append("j.syllabus_code = %(syllabus_code)s")
                    params["syllabus_code"] = syllabus_code
                if session is not None:
                    clauses.append("j.session = %(session)s")
                    params["session"] = session
                if paper is not None:
                    clauses.append("j.paper = %(paper)s")
                    params["paper"] = paper

                sql = _DISTINCT_SCOPES_FILTERED_SQL
                if clauses:
                    sql += " AND " + " AND ".join(clauses)
                cur.execute(sql, params)
            else:
                cur.execute(_DISTINCT_SCOPES_SQL)

            scope_rows = cur.fetchall()
    finally:
        pool.putconn(conn)

    totals = {"resolved": 0, "unresolved": 0, "ambiguous": 0, "cycles": 0, "total": 0, "scopes": 0}

    for row in scope_rows:
        scope_key = tuple(row)
        result = resolve_dependencies(pool, scope_key, dry_run=dry_run)
        for k in ("resolved", "unresolved", "ambiguous", "cycles", "total"):
            totals[k] += result[k]
        totals["scopes"] += 1

    logger.info(
        "resolve_all complete: scopes=%d total=%d resolved=%d "
        "unresolved=%d ambiguous=%d cycles=%d",
        totals["scopes"], totals["total"], totals["resolved"],
        totals["unresolved"], totals["ambiguous"], totals["cycles"],
    )
    return totals


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_resolver_args(argv: list[str] | None = None):
    """Parse CLI arguments for the dependency resolver."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Resolve rubric point dependencies (labels → UUIDs)",
    )
    parser.add_argument(
        "--syllabus-code", type=str, default=None,
        help="Filter by syllabus code (e.g. 9709)",
    )
    parser.add_argument(
        "--session", type=str, default=None,
        help="Filter by session (e.g. m17, s18)",
    )
    parser.add_argument(
        "--paper", type=int, default=None,
        help="Filter by paper number (e.g. 1, 2)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Skip DB writes, only report what would change",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for the dependency resolver."""
    import os

    from dotenv import load_dotenv  # type: ignore

    load_dotenv()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    args = parse_resolver_args(argv)

    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: DATABASE_URL or SUPABASE_DB_URL must be set", file=sys.stderr)
        return 1

    import psycopg2.pool  # type: ignore

    pool = psycopg2.pool.ThreadedConnectionPool(1, 4, db_url)

    try:
        result = resolve_all(
            pool,
            dry_run=args.dry_run,
            syllabus_code=args.syllabus_code,
            session=args.session,
            paper=args.paper,
        )

        print("=" * 60)
        print("Dependency Resolution Summary")
        print(f"  Scopes processed: {result['scopes']}")
        print(f"  Total points:     {result['total']}")
        print(f"  Resolved (ready): {result['resolved']}")
        print(f"  Unresolved:       {result['unresolved']}")
        print(f"  Ambiguous:        {result['ambiguous']}")
        print(f"  Cycles:           {result['cycles']}")
        if args.dry_run:
            print("  Mode:             dry-run (no DB writes)")
        print("=" * 60)

        return 0
    except Exception as exc:
        logger.error("Dependency resolution failed: %s", exc, exc_info=True)
        return 1
    finally:
        try:
            pool.closeall()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
