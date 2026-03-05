#!/usr/bin/env python3
"""Best-effort local DB recovery after accidental `supabase db reset`."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import uuid
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local
from scripts.vlm.db_utils import connect, json_param


DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
PAPER_DIR_RE = re.compile(
    r"^(?:WM_)?(?P<syllabus>\d{4})_(?P<session>[swm])(?P<year>\d{2})_(?P<doc_type>qp|ms)_(?P<paper>\d)(?P<variant>\d)$",
    re.IGNORECASE,
)
QUESTION_FILE_RE = re.compile(r"^q(\d{1,2})([a-z])?(?:_([ivx]+))?$", re.IGNORECASE)
PAGE_FILE_RE = re.compile(r"^page_(\d+)$", re.IGNORECASE)
VALID_ANSWER_FORM = {"exact", "approx", "proof", "graph", "table", "other"}
JOB_STATUS_SET = {"pending", "running", "done", "blocked", "error"}
JOB_NS = uuid.UUID("4a2f9f5e-9cdf-4e6c-8f9b-8d6554b5a5f7")


@dataclass
class AssetRow:
    asset_type: str
    storage_key: str
    sha256: str
    page_number: int | None
    q_number: int | None
    subpart: str | None
    file_size: int


@dataclass
class PaperRow:
    syllabus_code: str
    year: int
    session: str
    paper: int
    variant: int
    doc_type: str
    page_count: int | None
    source_sha256: str | None
    assets: list[AssetRow]


@dataclass
class DescriptionRow:
    storage_key: str
    sha256: str
    syllabus_code: str
    session: str
    year: int
    doc_type: str
    paper: int
    variant: int
    q_number: int | None
    subpart: str | None
    status: str
    confidence: float | None
    summary: str | None
    question_type: str | None
    answer_form: str | None
    math_expressions_latex: list[str]
    variables: list[str]
    units: list[str]
    leakage_flags: dict[str, Any]
    provider: str
    model: str
    prompt_version: str
    extractor_version: str
    response_sha256: str
    raw_json: dict[str, Any]


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> str:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        value = os.environ.get(key)
        if value:
            return value
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL
    return DEFAULT_LOCAL_DB_URL


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_question_filename(name: str) -> tuple[int | None, str | None]:
    stem = Path(name).stem
    m = QUESTION_FILE_RE.match(stem)
    if not m:
        return None, None
    q_raw, alpha, roman = m.groups()
    q_number = int(q_raw)
    subpart = None
    if alpha:
        subpart = alpha.lower()
        if roman:
            subpart = f"{subpart}_{roman.lower()}"
    return q_number, subpart


def scan_paper_dirs(screens_root: Path) -> list[PaperRow]:
    papers: list[PaperRow] = []
    seen: set[tuple[str, int, str, int, int, str]] = set()

    for d in screens_root.rglob("*"):
        if not d.is_dir():
            continue
        m = PAPER_DIR_RE.match(d.name)
        if not m:
            continue

        syllabus_code = m.group("syllabus")
        session = m.group("session").lower()
        year = 2000 + int(m.group("year"))
        doc_type = m.group("doc_type").lower()
        paper = int(m.group("paper"))
        variant = int(m.group("variant"))
        key = (syllabus_code, year, session, paper, variant, doc_type)
        if key in seen:
            continue
        seen.add(key)

        assets: list[AssetRow] = []
        page_count = 0

        canonical_dir = f"{session}{str(year)[2:]}_{doc_type}_{paper}{variant}"
        for file in sorted(d.iterdir()):
            if not file.is_file():
                continue
            lname = file.name.lower()
            if file.suffix.lower() != ".png":
                continue

            storage_base = f"{syllabus_code}/{canonical_dir}"
            file_sha = sha256_file(file)
            fsize = file.stat().st_size

            if lname == "contact_sheet.png":
                assets.append(
                    AssetRow(
                        asset_type="contact_sheet",
                        storage_key=f"{storage_base}/contact_sheet.png",
                        sha256=file_sha,
                        page_number=None,
                        q_number=None,
                        subpart=None,
                        file_size=fsize,
                    )
                )
                continue

            page_m = PAGE_FILE_RE.match(file.stem)
            if page_m:
                page_count = max(page_count, int(page_m.group(1)))
                assets.append(
                    AssetRow(
                        asset_type="qp_page" if doc_type == "qp" else "ms_page",
                        storage_key=f"{storage_base}/pages/{file.name}",
                        sha256=file_sha,
                        page_number=int(page_m.group(1)),
                        q_number=None,
                        subpart=None,
                        file_size=fsize,
                    )
                )
                continue

            q_number, subpart = parse_question_filename(file.name)
            if q_number is not None:
                assets.append(
                    AssetRow(
                        asset_type="question_img" if doc_type == "qp" else "ms_question_img",
                        storage_key=f"{storage_base}/questions/{file.name}",
                        sha256=file_sha,
                        page_number=None,
                        q_number=q_number,
                        subpart=subpart,
                        file_size=fsize,
                    )
                )
                continue

        if assets:
            papers.append(
                PaperRow(
                    syllabus_code=syllabus_code,
                    year=year,
                    session=session,
                    paper=paper,
                    variant=variant,
                    doc_type=doc_type,
                    page_count=page_count if page_count > 0 else None,
                    source_sha256=None,
                    assets=assets,
                )
            )

    papers.sort(key=lambda p: (p.syllabus_code, p.year, p.session, p.paper, p.variant, p.doc_type))
    return papers


def parse_result_file(path: Path) -> dict[str, Any] | None:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except Exception:
        return None
    try:
        data = json.loads(text)
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    return data


def compute_response_sha256(raw_json: dict[str, Any]) -> str:
    payload = json.dumps(raw_json, ensure_ascii=True, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def as_list_str(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if x is not None]
    return [str(value)]


def normalize_description(raw: dict[str, Any]) -> DescriptionRow | None:
    required = [
        "storage_key",
        "sha256",
        "syllabus_code",
        "session",
        "year",
        "doc_type",
        "paper",
        "variant",
        "status",
        "provider",
        "model",
        "prompt_version",
        "extractor_version",
    ]
    for k in required:
        if k not in raw:
            return None

    storage_key = str(raw["storage_key"]).strip()
    sha256 = str(raw["sha256"]).strip().lower()
    if not storage_key or not re.fullmatch(r"[a-f0-9]{64}", sha256):
        return None

    session = str(raw["session"]).strip().lower()
    if session not in {"s", "w", "m"}:
        return None

    doc_type = str(raw["doc_type"]).strip().lower()
    if doc_type != "qp":
        return None

    status = str(raw.get("status", "error")).strip().lower()
    if status not in {"ok", "blocked", "error"}:
        status = "error"

    answer_form_raw = raw.get("answer_form")
    answer_form = str(answer_form_raw).strip().lower() if answer_form_raw is not None else None
    if answer_form is not None and answer_form not in VALID_ANSWER_FORM:
        answer_form = "other"

    leakage_flags = raw.get("leakage_flags")
    if not isinstance(leakage_flags, dict):
        leakage_flags = {}

    raw_json = raw.get("raw_json")
    if not isinstance(raw_json, dict):
        raw_json = {}

    response_sha256 = str(raw.get("response_sha256") or "").strip().lower()
    if not re.fullmatch(r"[a-f0-9]{64}", response_sha256):
        response_sha256 = compute_response_sha256(raw_json)

    confidence = raw.get("confidence")
    if confidence is not None:
        try:
            confidence = float(confidence)
        except Exception:
            confidence = None

    q_number = raw.get("q_number")
    try:
        q_number = int(q_number) if q_number is not None else None
    except Exception:
        q_number = None

    return DescriptionRow(
        storage_key=storage_key,
        sha256=sha256,
        syllabus_code=str(raw["syllabus_code"]).strip(),
        session=session,
        year=int(raw["year"]),
        doc_type=doc_type,
        paper=int(raw["paper"]),
        variant=int(raw["variant"]),
        q_number=q_number,
        subpart=(str(raw.get("subpart")).strip() if raw.get("subpart") is not None else None),
        status=status,
        confidence=confidence,
        summary=(str(raw.get("summary")).strip() if raw.get("summary") is not None else None),
        question_type=(str(raw.get("question_type")).strip() if raw.get("question_type") is not None else None),
        answer_form=answer_form,
        math_expressions_latex=as_list_str(raw.get("math_expressions_latex")),
        variables=as_list_str(raw.get("variables")),
        units=as_list_str(raw.get("units")),
        leakage_flags=leakage_flags,
        provider=str(raw["provider"]).strip(),
        model=str(raw["model"]).strip(),
        prompt_version=str(raw["prompt_version"]).strip(),
        extractor_version=str(raw["extractor_version"]).strip(),
        response_sha256=response_sha256,
        raw_json=raw_json,
    )


def scan_descriptions(runs_root: Path) -> tuple[list[DescriptionRow], int]:
    rows: list[DescriptionRow] = []
    skipped = 0
    for path in runs_root.rglob("result_*.json"):
        raw = parse_result_file(path)
        if raw is None:
            skipped += 1
            continue
        row = normalize_description(raw)
        if row is None:
            skipped += 1
            continue
        rows.append(row)
    rows.sort(key=lambda r: (r.storage_key, r.provider, r.model, r.prompt_version, r.extractor_version))
    return rows, skipped


def scan_progress_index(runs_root: Path) -> dict[str, tuple[str, str]]:
    """Return storage_key -> (job_id, status)."""
    mapping: dict[str, tuple[str, str]] = {}
    for path in runs_root.rglob("progress.jsonl"):
        try:
            lines = path.read_text(encoding="utf-8-sig").splitlines()
        except Exception:
            continue
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            if not isinstance(rec, dict):
                continue
            storage_key = rec.get("storage_key")
            job_id = rec.get("job_id")
            status = str(rec.get("status", "")).lower()
            if not storage_key or not job_id:
                continue
            if status not in JOB_STATUS_SET:
                status = "done"
            mapping[str(storage_key)] = (str(job_id), status)
    return mapping


def restore_exam_and_assets(cur: Any, papers: list[PaperRow]) -> dict[str, int]:
    stats = Counter()
    exam_sql = """
        INSERT INTO public.exam_papers (
            syllabus_code, year, session, paper, variant, doc_type,
            page_count, source_sha256, created_at, updated_at
        ) VALUES (
            %(syllabus_code)s, %(year)s, %(session)s, %(paper)s, %(variant)s, %(doc_type)s,
            %(page_count)s, %(source_sha256)s, now(), now()
        )
        ON CONFLICT (syllabus_code, year, session, paper, variant, doc_type) DO UPDATE
        SET page_count = COALESCE(EXCLUDED.page_count, exam_papers.page_count),
            source_sha256 = COALESCE(EXCLUDED.source_sha256, exam_papers.source_sha256),
            updated_at = now()
        RETURNING id::text, (xmax = 0) AS inserted
    """
    asset_sql = """
        INSERT INTO public.paper_assets (
            paper_id, asset_type, storage_key, sha256,
            page_number, q_number, subpart, width, height, file_size,
            created_at, updated_at
        ) VALUES (
            %(paper_id)s::uuid, %(asset_type)s, %(storage_key)s, %(sha256)s,
            %(page_number)s, %(q_number)s, %(subpart)s, NULL, NULL, %(file_size)s,
            now(), now()
        )
        ON CONFLICT (storage_key) DO UPDATE
        SET paper_id = EXCLUDED.paper_id,
            asset_type = EXCLUDED.asset_type,
            sha256 = EXCLUDED.sha256,
            page_number = EXCLUDED.page_number,
            q_number = EXCLUDED.q_number,
            subpart = EXCLUDED.subpart,
            file_size = EXCLUDED.file_size,
            updated_at = now()
        RETURNING (xmax = 0) AS inserted
    """

    for paper in papers:
        cur.execute(exam_sql, paper.__dict__)
        paper_id, inserted = cur.fetchone()
        stats["exam_inserted" if inserted else "exam_updated"] += 1
        stats["paper_rows"] += 1

        for asset in paper.assets:
            cur.execute(
                asset_sql,
                {
                    "paper_id": paper_id,
                    **asset.__dict__,
                },
            )
            a_ins = cur.fetchone()[0]
            stats["asset_inserted" if a_ins else "asset_updated"] += 1
            stats["asset_rows"] += 1

    return dict(stats)


def restore_descriptions(cur: Any, rows: list[DescriptionRow]) -> dict[str, int]:
    stats = Counter()
    qd_sql = """
        INSERT INTO public.question_descriptions_v0 (
            storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
            q_number, subpart, status, confidence, summary, question_type, answer_form,
            math_expressions_latex, variables, units, leakage_flags, provider, model,
            prompt_version, extractor_version, response_sha256, raw_json, created_at, updated_at
        ) VALUES (
            %(storage_key)s, %(sha256)s, %(syllabus_code)s, %(session)s, %(year)s, %(doc_type)s, %(paper)s, %(variant)s,
            %(q_number)s, %(subpart)s, %(status)s, %(confidence)s, %(summary)s, %(question_type)s, %(answer_form)s,
            %(math_expressions_latex)s, %(variables)s, %(units)s, %(leakage_flags)s, %(provider)s, %(model)s,
            %(prompt_version)s, %(extractor_version)s, %(response_sha256)s, %(raw_json)s, now(), now()
        )
        ON CONFLICT (storage_key, sha256, extractor_version, provider, model, prompt_version) DO UPDATE
        SET status = EXCLUDED.status,
            confidence = EXCLUDED.confidence,
            summary = EXCLUDED.summary,
            question_type = EXCLUDED.question_type,
            answer_form = EXCLUDED.answer_form,
            math_expressions_latex = EXCLUDED.math_expressions_latex,
            variables = EXCLUDED.variables,
            units = EXCLUDED.units,
            leakage_flags = EXCLUDED.leakage_flags,
            response_sha256 = EXCLUDED.response_sha256,
            raw_json = EXCLUDED.raw_json,
            updated_at = now()
        RETURNING (xmax = 0) AS inserted
    """

    for row in rows:
        payload = row.__dict__.copy()
        payload["leakage_flags"] = json_param(payload["leakage_flags"])
        payload["raw_json"] = json_param(payload["raw_json"])
        cur.execute(qd_sql, payload)
        inserted = cur.fetchone()[0]
        stats["qd_inserted" if inserted else "qd_updated"] += 1
        stats["qd_rows"] += 1
    return dict(stats)


def make_job_id(row: DescriptionRow) -> str:
    token = "|".join(
        [
            row.storage_key,
            row.sha256,
            row.extractor_version,
            row.provider,
            row.model,
            row.prompt_version,
        ]
    )
    return str(uuid.uuid5(JOB_NS, token))


def restore_jobs(cur: Any, rows: list[DescriptionRow], progress_idx: dict[str, tuple[str, str]]) -> dict[str, int]:
    stats = Counter()
    job_sql = """
        INSERT INTO public.vlm_jobs_v0 (
            job_id, storage_key, sha256, syllabus_code, session, year, doc_type, paper, variant,
            q_number, subpart, extractor_version, provider, model, prompt_version,
            status, attempts, last_error, locked_by, locked_at, created_at, updated_at
        ) VALUES (
            %(job_id)s::uuid, %(storage_key)s, %(sha256)s, %(syllabus_code)s, %(session)s, %(year)s, %(doc_type)s, %(paper)s, %(variant)s,
            %(q_number)s, %(subpart)s, %(extractor_version)s, %(provider)s, %(model)s, %(prompt_version)s,
            %(status)s, 1, NULL, NULL, NULL, now(), now()
        )
        ON CONFLICT (storage_key, sha256, extractor_version, provider, model, prompt_version) DO UPDATE
        SET status = EXCLUDED.status,
            attempts = GREATEST(vlm_jobs_v0.attempts, EXCLUDED.attempts),
            last_error = NULL,
            locked_by = NULL,
            locked_at = NULL,
            updated_at = now()
        RETURNING (xmax = 0) AS inserted
    """

    for row in rows:
        # Keep job_id deterministic per job identity to avoid collisions from
        # inconsistent historical progress logs.
        job_id = make_job_id(row)
        progress = progress_idx.get(row.storage_key)
        if progress:
            _, p_status = progress
            status = p_status if p_status in JOB_STATUS_SET else ("blocked" if row.status == "blocked" else "done")
        else:
            status = "blocked" if row.status == "blocked" else "done"

        cur.execute(
            job_sql,
            {
                "job_id": job_id,
                "storage_key": row.storage_key,
                "sha256": row.sha256,
                "syllabus_code": row.syllabus_code,
                "session": row.session,
                "year": row.year,
                "doc_type": row.doc_type,
                "paper": row.paper,
                "variant": row.variant,
                "q_number": row.q_number,
                "subpart": row.subpart,
                "extractor_version": row.extractor_version,
                "provider": row.provider,
                "model": row.model,
                "prompt_version": row.prompt_version,
                "status": status,
            },
        )
        inserted = cur.fetchone()[0]
        stats["jobs_inserted" if inserted else "jobs_updated"] += 1
        stats["jobs_rows"] += 1
    return dict(stats)


def run_cmd(cmd: list[str], env: dict[str, str]) -> None:
    proc = subprocess.run(cmd, env=env, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"command failed ({proc.returncode}): {' '.join(cmd)}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Recover local DB data after reset (best-effort)")
    p.add_argument("--screens-root", type=Path, default=Path("outputs/screenshots"))
    p.add_argument("--runs-root", type=Path, default=Path("runs"))
    p.add_argument("--skip-assets", action="store_true")
    p.add_argument("--skip-descriptions", action="store_true")
    p.add_argument("--skip-jobs", action="store_true")
    p.add_argument("--skip-v1-rebuild", action="store_true")
    p.add_argument("--skip-links", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--allow-remote", action="store_true")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    load_env()
    db_url = ensure_db_url()
    enforce_local(args.allow_remote, env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"])

    print(f"DATABASE_URL={db_url}")
    print(f"screens_root={args.screens_root}")
    print(f"runs_root={args.runs_root}")

    papers = [] if args.skip_assets else scan_paper_dirs(args.screens_root)
    descriptions, skipped_results = ([], 0) if args.skip_descriptions else scan_descriptions(args.runs_root)
    progress_idx = {} if args.skip_jobs else scan_progress_index(args.runs_root)

    print(f"paper_dirs_detected={len(papers)}")
    print(f"description_rows_detected={len(descriptions)}")
    print(f"result_files_skipped={skipped_results}")
    print(f"progress_entries_detected={len(progress_idx)}")

    if args.dry_run:
        print("dry_run=true (no writes)")
        return 0

    with connect() as conn:
        with conn.cursor() as cur:
            if papers:
                a_stats = restore_exam_and_assets(cur, papers)
                print("assets_restore=" + json.dumps(a_stats, ensure_ascii=True))
            if descriptions:
                d_stats = restore_descriptions(cur, descriptions)
                print("descriptions_restore=" + json.dumps(d_stats, ensure_ascii=True))
            if descriptions and not args.skip_jobs:
                j_stats = restore_jobs(cur, descriptions, progress_idx)
                print("jobs_restore=" + json.dumps(j_stats, ensure_ascii=True))
            conn.commit()

    env = os.environ.copy()
    env["DATABASE_URL"] = db_url

    if not args.skip_v1_rebuild:
        run_cmd([sys.executable, "scripts/vlm/build_production_table_v1.py", "--target", "question_descriptions_v1"], env)
        run_cmd(
            [
                sys.executable,
                "scripts/vlm/publish_production_view_v1.py",
                "--source",
                "question_descriptions_v1",
                "--view",
                "question_descriptions_prod_v1",
            ],
            env,
        )

    if not args.skip_links:
        run_cmd(
            [
                sys.executable,
                "scripts/db/link_questions_to_nodes.py",
                "--syllabus",
                "9709",
                "--papers",
                "1,3",
                "--upsert",
            ],
            env,
        )

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.paper_assets")
            paper_assets = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_v0")
            qd_v0 = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.vlm_jobs_v0")
            jobs = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_v1")
            qd_v1 = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_descriptions_prod_v1")
            qd_prod = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.question_concept_links")
            qcl = cur.fetchone()[0]
    print(f"final_counts paper_assets={paper_assets} qd_v0={qd_v0} vlm_jobs_v0={jobs} qd_v1={qd_v1} qd_prod={qd_prod} qcl={qcl}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
