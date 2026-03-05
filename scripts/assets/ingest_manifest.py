#!/usr/bin/env python3
"""
ingest_manifest.py - 将 scan_assets.py 输出的 manifest 入库到 Supabase

Canonical tables: exam_papers, paper_assets, ingest_runs

依赖: pip install psycopg[binary]

环境变量:
    DATABASE_URL / SUPABASE_DB_URL / SUPABASE_DATABASE_URL - 本地 Postgres 连接串
    SUPABASE_URL - Supabase 项目 URL (用于本地安全校验)
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local


def load_env():
    load_project_env()



def get_db_url() -> str:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        val = os.environ.get(key)
        if val:
            return val
    print("错误: 需要设置 DATABASE_URL (或 SUPABASE_DB_URL / SUPABASE_DATABASE_URL)", file=sys.stderr)
    sys.exit(2)


def get_file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def make_paper_key(m: dict) -> tuple:
    return (m['syllabus_code'], m['year'], m['session'], m['paper'], m['variant'], m['doc_type'])


def dry_run_ingest(manifests: list, manifest_sha256: str, run_note: str, max_papers: int, max_assets: int):
    """Dry-run: 只统计，不写 DB"""
    papers_count = min(len(manifests), max_papers) if max_papers else len(manifests)
    assets_count = sum(len(m.get('assets', [])) for m in manifests[:papers_count])
    if max_assets:
        assets_count = min(assets_count, max_assets)
    
    print("\n=== DRY-RUN Summary ===")
    print(f"manifest_sha256: {manifest_sha256[:16]}...")
    print(f"run_note: {run_note or '(none)'}")
    print(f"papers_to_process: {papers_count}")
    print(f"assets_to_process: {assets_count}")
    print("\n[DRY-RUN] No database writes performed.")
    return 0


def real_ingest(
    manifests: list,
    manifest_sha256: str,
    manifest_path: str,
    run_note: str,
    max_papers: int,
    max_assets: int,
):
    """Real ingest: 写入 Postgres (canonical tables)"""
    try:
        import psycopg
        from psycopg.types.json import Json
    except ImportError:
        print("错误: 需要安装 psycopg 库", file=sys.stderr)
        sys.exit(2)

    db_url = get_db_url()
    conn = psycopg.connect(db_url)
    conn.autocommit = True

    stats = {
        "papers_inserted": 0,
        "papers_updated": 0,
        "papers_skipped": 0,
        "assets_inserted": 0,
        "assets_updated": 0,
        "assets_skipped": 0,
        "errors": [],
    }

    processed_assets = 0
    processed_papers = 0
    run_id = None

    exam_paper_upsert_sql = """
        INSERT INTO exam_papers (
            syllabus_code, year, session, paper, variant, doc_type,
            page_count, source_sha256, created_at, updated_at
        )
        VALUES (
            %(syllabus_code)s, %(year)s, %(session)s, %(paper)s, %(variant)s, %(doc_type)s,
            %(page_count)s, %(source_sha256)s, now(), now()
        )
        ON CONFLICT (syllabus_code, year, session, paper, variant, doc_type) DO UPDATE
        SET
            page_count = COALESCE(EXCLUDED.page_count, exam_papers.page_count),
            source_sha256 = COALESCE(EXCLUDED.source_sha256, exam_papers.source_sha256),
            updated_at = now()
        WHERE
            (EXCLUDED.page_count IS NOT NULL AND exam_papers.page_count IS DISTINCT FROM EXCLUDED.page_count)
            OR (EXCLUDED.source_sha256 IS NOT NULL AND exam_papers.source_sha256 IS DISTINCT FROM EXCLUDED.source_sha256)
        RETURNING id, (xmax = 0) AS inserted;
    """

    exam_paper_select_sql = """
        SELECT id FROM exam_papers
        WHERE syllabus_code = %(syllabus_code)s
          AND year = %(year)s
          AND session = %(session)s
          AND paper = %(paper)s
          AND variant = %(variant)s
          AND doc_type = %(doc_type)s;
    """

    asset_upsert_sql = """
        INSERT INTO paper_assets (
            paper_id, asset_type, storage_key, sha256,
            page_number, q_number, subpart, width, height, file_size,
            created_at, updated_at
        )
        VALUES (
            %(paper_id)s, %(asset_type)s, %(storage_key)s, %(sha256)s,
            %(page_number)s, %(q_number)s, %(subpart)s, %(width)s, %(height)s, %(file_size)s,
            now(), now()
        )
        ON CONFLICT (storage_key) DO UPDATE
        SET
            paper_id = EXCLUDED.paper_id,
            asset_type = EXCLUDED.asset_type,
            sha256 = EXCLUDED.sha256,
            page_number = EXCLUDED.page_number,
            q_number = EXCLUDED.q_number,
            subpart = EXCLUDED.subpart,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            file_size = EXCLUDED.file_size,
            updated_at = now()
        WHERE
            paper_assets.paper_id IS DISTINCT FROM EXCLUDED.paper_id
            OR paper_assets.asset_type IS DISTINCT FROM EXCLUDED.asset_type
            OR paper_assets.sha256 IS DISTINCT FROM EXCLUDED.sha256
            OR paper_assets.page_number IS DISTINCT FROM EXCLUDED.page_number
            OR paper_assets.q_number IS DISTINCT FROM EXCLUDED.q_number
            OR paper_assets.subpart IS DISTINCT FROM EXCLUDED.subpart
            OR paper_assets.width IS DISTINCT FROM EXCLUDED.width
            OR paper_assets.height IS DISTINCT FROM EXCLUDED.height
            OR paper_assets.file_size IS DISTINCT FROM EXCLUDED.file_size
        RETURNING id, (xmax = 0) AS inserted;
    """

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ingest_runs (
                    run_type, status, manifest_sha256, manifest_path, note,
                    papers_total, started_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, now())
                RETURNING id;
                """,
                ("full_scan", "running", manifest_sha256, manifest_path, run_note, len(manifests)),
            )
            run_id = cur.fetchone()[0]

            for i, m in enumerate(manifests):
                if max_papers and i >= max_papers:
                    break

                try:
                    processed_papers += 1
                    paper_payload = {
                        "syllabus_code": m["syllabus_code"],
                        "year": m["year"],
                        "session": m["session"],
                        "paper": m["paper"],
                        "variant": m["variant"],
                        "doc_type": m["doc_type"],
                        "page_count": m.get("page_count"),
                        "source_sha256": m.get("source_sha256"),
                    }

                    cur.execute(exam_paper_upsert_sql, paper_payload)
                    row = cur.fetchone()
                    if row:
                        paper_id, inserted = row
                        if inserted:
                            stats["papers_inserted"] += 1
                        else:
                            stats["papers_updated"] += 1
                    else:
                        cur.execute(exam_paper_select_sql, paper_payload)
                        paper_id = cur.fetchone()[0]
                        stats["papers_skipped"] += 1

                    for asset in m.get("assets", []):
                        if max_assets and processed_assets >= max_assets:
                            break

                        asset_payload = {
                            "paper_id": paper_id,
                            "asset_type": asset["asset_type"],
                            "storage_key": asset["storage_key"],
                            "sha256": asset["sha256"],
                            "page_number": asset.get("page_number"),
                            "q_number": asset.get("q_number"),
                            "subpart": asset.get("subpart"),
                            "width": asset.get("width"),
                            "height": asset.get("height"),
                            "file_size": asset.get("file_size"),
                        }

                        cur.execute(asset_upsert_sql, asset_payload)
                        asset_row = cur.fetchone()
                        if asset_row:
                            inserted = asset_row[1]
                            if inserted:
                                stats["assets_inserted"] += 1
                            else:
                                stats["assets_updated"] += 1
                        else:
                            stats["assets_skipped"] += 1

                        processed_assets += 1

                    if max_assets and processed_assets >= max_assets:
                        break

                except Exception as e:
                    stats["errors"].append({"paper": str(make_paper_key(m)), "error": str(e)[:200]})

            final_status = "success" if not stats["errors"] else "failed"
            error_summary = None
            if stats["errors"]:
                error_summary = f"{len(stats['errors'])} errors; first: {stats['errors'][0].get('error', '')}"

            cur.execute(
                """
                UPDATE ingest_runs
                SET
                    status = %s,
                    papers_inserted = %s,
                    papers_updated = %s,
                    assets_total = %s,
                    assets_inserted = %s,
                    assets_skipped = %s,
                    errors_count = %s,
                    errors = %s,
                    completed_at = now(),
                    finished_at = now(),
                    error_summary = %s
                WHERE id = %s;
                """,
                (
                    final_status,
                    stats["papers_inserted"],
                    stats["papers_updated"],
                    processed_assets,
                    stats["assets_inserted"],
                    stats["assets_skipped"],
                    len(stats["errors"]),
                    Json(stats["errors"][:50]) if stats["errors"] else None,
                    error_summary,
                    run_id,
                ),
            )

    finally:
        conn.close()

    papers_skipped = max(processed_papers - stats["papers_inserted"] - stats["papers_updated"], 0)

    print("\n=== INGEST Summary ===")
    print(f"run_id: {run_id}")
    print(f"status: {'success' if not stats['errors'] else 'failed'}")
    print(f"papers_inserted: {stats['papers_inserted']}")
    print(f"papers_updated: {stats['papers_updated']}")
    print(f"papers_skipped: {papers_skipped}")
    print(f"assets_inserted: {stats['assets_inserted']}")
    print(f"assets_updated: {stats['assets_updated']}")
    print(f"assets_skipped: {stats['assets_skipped']}")
    print(f"errors: {len(stats['errors'])}")

    return 0 if not stats["errors"] else 1


def main():
    parser = argparse.ArgumentParser(description="Ingest manifest to Supabase")
    parser.add_argument("--input", "-i", type=Path, required=True, help="scan 输出的 JSON")
    parser.add_argument("--dry-run", action="store_true", help="只统计，不写 DB")
    parser.add_argument("--run-note", type=str, default="", help="运行备注")
    parser.add_argument("--max-papers", type=int, help="最多处理的 paper 数")
    parser.add_argument("--max-assets", type=int, help="最多处理的 asset 数")
    parser.add_argument("--allow-remote", action="store_true", help="允许非本地连接（危险）")
    args = parser.parse_args()
    
    if not args.input.exists():
        print(f"错误: 文件不存在: {args.input}", file=sys.stderr)
        sys.exit(2)
    
    data = load_manifest(args.input)
    manifests = data.get("manifests", [])
    manifest_sha256 = get_file_sha256(args.input)

    print(f"Loaded: {len(manifests)} manifests from {args.input}")
    print(f"Skipped in scan: {data.get('skipped_count', 0)}")

    load_env()
    enforce_local(
        args.allow_remote,
        env_keys=["SUPABASE_URL", "DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )
    
    if args.dry_run:
        return dry_run_ingest(manifests, manifest_sha256, args.run_note, args.max_papers, args.max_assets)
    else:
        return real_ingest(manifests, manifest_sha256, str(args.input), args.run_note, args.max_papers, args.max_assets)


if __name__ == "__main__":
    sys.exit(main())
