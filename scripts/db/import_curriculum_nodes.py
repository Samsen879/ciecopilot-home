#!/usr/bin/env python3
"""Idempotent importer for curriculum_nodes (Phase 1 A1)."""
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
from scripts.vlm.db_utils import connect, json_param


TOPIC_PATH_RE = re.compile(r"^[a-z0-9_]+(\.[a-z0-9_]+)*$")
DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> None:
    keys = ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL")
    if any(os.environ.get(k) for k in keys):
        return
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL
    print(f"DATABASE_URL not set; fallback to local default: {DEFAULT_LOCAL_DB_URL}")


def load_source(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _normalize_path(value: str | None, field_name: str, idx: int) -> str | None:
    if value is None:
        return None
    path = str(value).strip().lower()
    if not path:
        return None
    if not TOPIC_PATH_RE.fullmatch(path):
        raise ValueError(f"nodes[{idx}].{field_name} invalid: {path!r}")
    return path


def normalize_nodes(payload: dict[str, Any], version_tag: str) -> list[dict[str, Any]]:
    raw_nodes = payload.get("nodes")
    if not isinstance(raw_nodes, list) or not raw_nodes:
        raise ValueError("source JSON must contain non-empty `nodes` list")

    default_syllabus = str(payload.get("syllabus_code", "")).strip()
    default_version = str(payload.get("version_tag") or version_tag).strip()

    normalized: list[dict[str, Any]] = []
    for idx, item in enumerate(raw_nodes):
        if not isinstance(item, dict):
            raise ValueError(f"nodes[{idx}] must be object")

        topic_path = _normalize_path(item.get("topic_path"), "topic_path", idx)
        if not topic_path:
            raise ValueError(f"nodes[{idx}].topic_path is required")

        parent_path = _normalize_path(item.get("parent_topic_path"), "parent_topic_path", idx)
        if not parent_path and "." in topic_path:
            parent_path = topic_path.rsplit(".", 1)[0]

        title = str(item.get("title", "")).strip()
        if not title:
            raise ValueError(f"nodes[{idx}].title is required")

        syllabus_code = str(item.get("syllabus_code") or default_syllabus).strip()
        if not syllabus_code:
            raise ValueError(f"nodes[{idx}] missing syllabus_code and no top-level default")

        node_version = str(item.get("version_tag") or default_version or version_tag).strip()
        if not node_version:
            raise ValueError(f"nodes[{idx}].version_tag resolved empty")

        level_raw = item.get("level")
        level = str(level_raw).strip() if level_raw is not None else None
        if level == "":
            level = None

        paper_raw = item.get("paper")
        paper = None if paper_raw in (None, "") else int(paper_raw)

        sort_order_raw = item.get("sort_order")
        sort_order = int(sort_order_raw) if sort_order_raw is not None else idx * 10

        metadata = item.get("metadata", {})
        if metadata is None:
            metadata = {}
        if not isinstance(metadata, dict):
            raise ValueError(f"nodes[{idx}].metadata must be object")

        normalized.append(
            {
                "topic_path": topic_path,
                "parent_topic_path": parent_path,
                "title": title,
                "syllabus_code": syllabus_code,
                "version_tag": node_version,
                "level": level,
                "paper": paper,
                "sort_order": sort_order,
                "metadata": metadata,
            }
        )

    # Duplicate path guard.
    paths = [n["topic_path"] for n in normalized]
    dupes = [p for p, cnt in Counter(paths).items() if cnt > 1]
    if dupes:
        raise ValueError(f"duplicate topic_path found: {', '.join(sorted(dupes))}")

    # Sort by depth for parent-first upsert.
    normalized.sort(key=lambda n: (n["topic_path"].count("."), n["sort_order"], n["topic_path"]))
    return normalized


def ensure_curriculum_schema(cur: Any) -> None:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name='curriculum_nodes'
        """
    )
    found = {row[0] for row in cur.fetchall()}
    required = {
        "node_id",
        "syllabus_code",
        "topic_path",
        "title",
        "level",
        "paper",
        "version_tag",
        "parent_id",
        "sort_order",
        "metadata",
    }
    missing = sorted(required - found)
    if missing:
        raise RuntimeError(
            "curriculum_nodes missing required columns: "
            + ", ".join(missing)
            + ". Apply migration first."
        )


def fetch_existing_node_ids(cur: Any, paths: set[str]) -> dict[str, str]:
    if not paths:
        return {}
    cur.execute(
        """
        SELECT topic_path::text, node_id::text
        FROM public.curriculum_nodes
        WHERE topic_path::text = ANY(%s)
        """,
        (list(paths),),
    )
    return {topic_path: node_id for topic_path, node_id in cur.fetchall()}


def print_summary(nodes: list[dict[str, Any]], source: Path, version_tag: str) -> None:
    papers = Counter(str(n["paper"]) if n["paper"] is not None else "none" for n in nodes)
    levels = Counter(n["level"] or "none" for n in nodes)
    print(f"source={source}")
    print(f"resolved_version_tag={version_tag}")
    print(f"total_nodes={len(nodes)}")
    print("paper_counts=" + ", ".join(f"{k}:{papers[k]}" for k in sorted(papers)))
    print("level_counts=" + ", ".join(f"{k}:{levels[k]}" for k in sorted(levels)))


def dry_run(nodes: list[dict[str, Any]], existing: dict[str, str]) -> int:
    existing_paths = set(existing.keys())
    input_paths = {n["topic_path"] for n in nodes}
    to_insert = sorted(input_paths - existing_paths)
    to_update = sorted(input_paths & existing_paths)

    print("mode=dry-run")
    print(f"would_insert={len(to_insert)}")
    print(f"would_update={len(to_update)}")
    if to_insert:
        print("sample_inserts=" + ", ".join(to_insert[:5]))
    if to_update:
        print("sample_updates=" + ", ".join(to_update[:5]))
    return 0


def upsert_nodes(cur: Any, nodes: list[dict[str, Any]], known_ids: dict[str, str]) -> tuple[int, int]:
    insert_count = 0
    update_count = 0

    sql = """
        INSERT INTO public.curriculum_nodes (
            syllabus_code,
            topic_path,
            title,
            level,
            paper,
            version_tag,
            parent_id,
            sort_order,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            %(syllabus_code)s,
            %(topic_path)s::ltree,
            %(title)s,
            %(level)s,
            %(paper)s,
            %(version_tag)s,
            %(parent_id)s::uuid,
            %(sort_order)s,
            %(metadata)s,
            now(),
            now()
        )
        ON CONFLICT (topic_path)
        DO UPDATE SET
            syllabus_code = EXCLUDED.syllabus_code,
            title = EXCLUDED.title,
            level = EXCLUDED.level,
            paper = EXCLUDED.paper,
            version_tag = EXCLUDED.version_tag,
            parent_id = EXCLUDED.parent_id,
            sort_order = EXCLUDED.sort_order,
            metadata = EXCLUDED.metadata,
            updated_at = now()
        RETURNING node_id::text, (xmax = 0) AS inserted
    """

    for node in nodes:
        parent_path = node["parent_topic_path"]
        parent_id = None
        if parent_path:
            parent_id = known_ids.get(parent_path)
            if not parent_id:
                raise RuntimeError(
                    f"parent not found for {node['topic_path']}: {parent_path}. "
                    "Ensure parent exists in source or DB."
                )

        payload = dict(node)
        payload["parent_id"] = parent_id
        payload["metadata"] = json_param(payload["metadata"])

        cur.execute(sql, payload)
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(f"failed to upsert node: {node['topic_path']}")

        node_id, inserted = row
        known_ids[node["topic_path"]] = node_id
        if inserted:
            insert_count += 1
        else:
            update_count += 1

    return insert_count, update_count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import curriculum nodes into public.curriculum_nodes")
    parser.add_argument("--source", required=True, type=Path, help="Structured syllabus JSON source")
    parser.add_argument("--version-tag", default="2025-2027_v1", help="Default version tag for imported nodes")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print plan without writing")
    parser.add_argument("--upsert", action="store_true", help="Write changes to DB via idempotent upsert")
    parser.add_argument("--allow-remote", action="store_true", help="Allow non-local DB URL (disabled by default)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.source.exists():
        print(f"Error: source file not found: {args.source}", file=sys.stderr)
        return 2

    load_env()
    ensure_db_url()
    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    payload = load_source(args.source)
    nodes = normalize_nodes(payload, args.version_tag)
    print_summary(nodes, args.source, args.version_tag)

    if not args.dry_run and not args.upsert:
        print("Error: use --dry-run for preview or --upsert to write changes.", file=sys.stderr)
        return 2

    node_paths = {n["topic_path"] for n in nodes}
    lookup_paths = set(node_paths)
    lookup_paths.update(n["parent_topic_path"] for n in nodes if n["parent_topic_path"])

    with connect() as conn:
        with conn.cursor() as cur:
            ensure_curriculum_schema(cur)
            known_ids = fetch_existing_node_ids(cur, lookup_paths)

            unresolved = sorted(
                {
                    n["parent_topic_path"]
                    for n in nodes
                    if n["parent_topic_path"]
                    and n["parent_topic_path"] not in known_ids
                    and n["parent_topic_path"] not in node_paths
                }
            )
            if unresolved:
                print("Error: unresolved parent paths:", file=sys.stderr)
                for p in unresolved:
                    print(f"- {p}", file=sys.stderr)
                return 2

            if args.dry_run:
                return dry_run(nodes, known_ids)

            inserted, updated = upsert_nodes(cur, nodes, known_ids)
            conn.commit()

    print("mode=upsert")
    print(f"inserted={inserted}")
    print(f"updated={updated}")
    print(f"total_processed={len(nodes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
