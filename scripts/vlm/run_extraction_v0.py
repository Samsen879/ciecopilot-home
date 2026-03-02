#!/usr/bin/env python3
"""
run_extraction_v0.py - VLM extraction pipeline with DB integration

Usage:
    python run_extraction_v0.py --dry-run
    python run_extraction_v0.py --provider openai --max-jobs 200 --concurrency 4
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env
from scripts.vlm.contracts import leakage_guard, compute_response_sha256
from scripts.vlm.providers import get_provider, RetryableError

# Storage key pattern: 9231/WM_9231_s20_qp_11/questions/q01.png or 9231/s16_qp_11/questions/q01.png
STORAGE_KEY_RE = re.compile(r"^(\d{4})/(?:WM_\d{4}_)?([swm])(\d{2})_(qp|ms)_(\d)(\d)/questions/(q\d{1,2}[a-z]?(?:_[ivx]+)?|contact_sheet)\.png$", re.I)
Q_FILENAME_RE = re.compile(r"^q(\d{1,2})([a-z])?(?:_([ivx]+))?$", re.I)

def scan_local_assets(config: Config) -> list[dict]:
    """Scan ASSETS_ROOT for question images."""
    result = []
    root = config.assets_root
    
    for img_path in sorted(root.rglob("questions/q*.png")):
        storage_key = str(img_path.relative_to(root)).replace("\\", "/")
        
        # Parse metadata from path
        meta = parse_storage_key(storage_key)
        if not meta:
            continue
        if meta.get("doc_type") != "qp":
            continue
        
        # Apply filters
        if config.filters.get("syllabus_code") and meta.get("syllabus_code") != config.filters["syllabus_code"]:
            continue
        if config.filters.get("year") and meta.get("year") != config.filters["year"]:
            continue
        if config.filters.get("session") and meta.get("session") != config.filters["session"]:
            continue
        if config.filters.get("paper") and meta.get("paper") != config.filters["paper"]:
            continue
        if config.filters.get("variant") and meta.get("variant") != config.filters["variant"]:
            continue
        
        result.append({
            "storage_key": storage_key,
            "sha256": sha256_file(img_path),
            **meta,
        })
        
        if len(result) >= config.max_jobs * 2:
            break
    
    return result

@dataclass
class Config:
    assets_root: Path
    provider: str
    model: str
    prompt_version: str
    extractor_version: str
    concurrency: int
    max_jobs: int
    rate_limit_rps: float
    budget_minutes: int
    dry_run: bool
    filters: dict

class RateLimiter:
    def __init__(self, rps: float):
        self.min_interval = 1.0 / rps if rps > 0 else 0
        self.last_call = 0.0
        self.lock = Lock()
    
    def acquire(self):
        with self.lock:
            now = time.time()
            wait = self.min_interval - (now - self.last_call)
            if wait > 0:
                time.sleep(wait)
            self.last_call = time.time()

class SupabaseClient:
    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    
    def _request(self, method: str, endpoint: str, data: dict | None = None, params: dict | None = None) -> Any:
        url = f"{self.url}/rest/v1/{endpoint}"
        if params:
            url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
        
        req = urllib.request.Request(url, method=method)
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "return=representation")
        
        if data:
            req.data = json.dumps(data).encode()
        
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            return json.loads(resp.read()) if resp.read else None
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            raise Exception(f"HTTP {e.code}: {body[:200]}")
    
    def select(self, table: str, params: dict) -> list[dict]:
        return self._request("GET", table, params=params) or []
    
    def insert(self, table: str, data: list[dict]) -> list[dict]:
        return self._request("POST", table, data=data) or []
    
    def upsert(self, table: str, data: list[dict], on_conflict: str) -> list[dict]:
        url = f"{self.url}/rest/v1/{table}"
        req = urllib.request.Request(url, method="POST")
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "return=representation,resolution=merge-duplicates")
        req.data = json.dumps(data).encode()
        
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            return json.loads(resp.read()) if resp.read else []
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            raise Exception(f"HTTP {e.code}: {body[:200]}")
    
    def update(self, table: str, data: dict, filters: dict) -> list[dict]:
        params = {f"{k}": f"eq.{v}" for k, v in filters.items()}
        return self._request("PATCH", table, data=data, params=params) or []

def parse_storage_key(key: str) -> dict | None:
    m = STORAGE_KEY_RE.match(key)
    if not m:
        return None
    syllabus, session, year, doc_type, paper, variant, filename = m.groups()
    
    q_number, subpart = 0, None
    stem = Path(filename).stem
    qm = Q_FILENAME_RE.match(stem)
    if qm:
        q_number = int(qm.group(1))
        if qm.group(2):
            subpart = qm.group(2).lower()
            if qm.group(3):
                subpart += f"_{qm.group(3).lower()}"
    
    return {
        "syllabus_code": syllabus,
        "session": session,
        "year": 2000 + int(year),
        "doc_type": doc_type,
        "paper": int(paper),
        "variant": int(variant),
        "q_number": q_number,
        "subpart": subpart,
    }

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def get_candidates(db: SupabaseClient, config: Config) -> list[dict]:
    """Get question_img assets. Try DB first, fallback to local scan."""
    # Try DB first
    params = {
        "asset_type": "eq.question_img",
        "select": "storage_key,sha256,q_number,subpart,paper_id",
        "limit": str(config.max_jobs * 2),
    }
    files = db.select("paper_assets", params)
    
    if files:
        # DB has data, use it
        paper_ids = list(set(f["paper_id"] for f in files if f.get("paper_id")))
        papers_map = {}
        if paper_ids:
            for pid in paper_ids[:100]:
                p_params = {"id": f"eq.{pid}", "select": "id,syllabus_code,year,session,paper,variant,doc_type"}
                rows = db.select("exam_papers", p_params)
                for r in rows:
                    papers_map[r["id"]] = r
        
        result = []
        for f in files:
            paper = papers_map.get(f.get("paper_id"), {})
            if paper.get("doc_type") != "qp":
                continue
            if config.filters.get("syllabus_code") and paper.get("syllabus_code") != config.filters["syllabus_code"]:
                continue
            if config.filters.get("year") and paper.get("year") != config.filters["year"]:
                continue
            result.append({
                "storage_key": f["storage_key"],
                "sha256": f["sha256"],
                "syllabus_code": paper.get("syllabus_code"),
                "session": paper.get("session"),
                "year": paper.get("year"),
                "paper": paper.get("paper"),
                "variant": paper.get("variant"),
                "q_number": f.get("q_number"),
                "subpart": f.get("subpart"),
            })
        return result
    
    # Fallback: scan local ASSETS_ROOT
    print("DB empty, scanning local ASSETS_ROOT...")
    return scan_local_assets(config)

def get_existing_keys(db: SupabaseClient, config: Config) -> set[str]:
    """Get unique keys already in question_descriptions_v0."""
    params = {
        "select": "storage_key,sha256",
        "extractor_version": f"eq.{config.extractor_version}",
        "provider": f"eq.{config.provider}",
        "model": f"eq.{config.model}",
        "prompt_version": f"eq.{config.prompt_version}",
    }
    rows = db.select("question_descriptions_v0", params)
    return {f"{r['storage_key']}|{r['sha256']}" for r in rows}

def create_run_record(db: SupabaseClient, config: Config) -> str:
    """Create vlm_runs_v0 record, return run_id."""
    data = [{
        "status": "running",
        "config": {
            "provider": config.provider,
            "model": config.model,
            "prompt_version": config.prompt_version,
            "extractor_version": config.extractor_version,
            "concurrency": config.concurrency,
            "max_jobs": config.max_jobs,
            "rate_limit_rps": config.rate_limit_rps,
            "budget_minutes": config.budget_minutes,
            "filters": config.filters,
        },
        "counts": {},
    }]
    result = db.insert("vlm_runs_v0", data)
    return result[0]["run_id"]

def update_run_record(db: SupabaseClient, run_id: str, status: str, counts: dict, error: str | None = None):
    db.update("vlm_runs_v0", {
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "counts": counts,
        "error_summary": error,
    }, {"run_id": run_id})

def process_one(asset: dict, config: Config, provider, rate_limiter: RateLimiter) -> dict:
    """Process single asset. Returns result dict with status."""
    storage_key = asset["storage_key"]
    sha256 = asset["sha256"]
    
    # Parse metadata from storage_key
    meta = parse_storage_key(storage_key)
    if not meta:
        return {"status": "error", "error": "invalid_storage_key", "storage_key": storage_key}
    
    # Check file exists
    img_path = config.assets_root / storage_key
    if not img_path.exists():
        return {"status": "error", "error": "file_not_found", "storage_key": storage_key}
    
    # Rate limit
    rate_limiter.acquire()
    
    # Call provider with retry
    max_retries = 5
    for attempt in range(max_retries):
        try:
            extracted = provider.generate(img_path)
            break
        except RetryableError as e:
            if attempt == max_retries - 1:
                return {"status": "error", "error": f"max_retries: {e}", "storage_key": storage_key}
            wait = (2 ** attempt) + (time.time() % 1)  # Exponential backoff + jitter
            time.sleep(wait)
        except Exception as e:
            return {"status": "error", "error": str(e)[:100], "storage_key": storage_key}
    
    # Build result
    result = {
        "storage_key": storage_key,
        "sha256": sha256,
        **meta,
        "question_type": extracted.get("question_type"),
        "math_expressions_latex": extracted.get("math_expressions_latex", []),
        "variables": extracted.get("variables", []),
        "units": extracted.get("units", []),
        "answer_form": extracted.get("answer_form", "other"),
        "confidence": extracted.get("confidence", 0.5),
        "summary": extracted.get("summary"),
        "provider": config.provider,
        "model": config.model,
        "prompt_version": config.prompt_version,
        "extractor_version": config.extractor_version,
        "status": "ok",
        "errors": [],
    }
    
    # Apply leakage guard
    result, leakage_flags = leakage_guard(result)
    result["leakage_flags"] = leakage_flags
    result["response_sha256"] = compute_response_sha256(extracted)
    result["raw_json"] = extracted
    
    return result

def run_pipeline(config: Config):
    """Main pipeline execution."""
    db = SupabaseClient()
    provider = get_provider(config.provider, config.model)
    rate_limiter = RateLimiter(config.rate_limit_rps)
    
    print(f"Provider: {provider.name}, Model: {provider.model}")
    print(f"Config: concurrency={config.concurrency}, max_jobs={config.max_jobs}, rate_limit={config.rate_limit_rps} rps")
    
    # Get candidates
    print("Fetching candidates from paper_assets...")
    candidates = get_candidates(db, config)
    print(f"Found {len(candidates)} question_img assets")
    
    # Filter out existing
    print("Checking existing descriptions...")
    existing = get_existing_keys(db, config)
    to_process = [c for c in candidates if f"{c['storage_key']}|{c['sha256']}" not in existing]
    print(f"To process: {len(to_process)} (skipping {len(candidates) - len(to_process)} existing)")
    
    # Apply max_jobs limit
    to_process = to_process[:config.max_jobs]
    
    if config.dry_run:
        print(f"\n[DRY-RUN] Would process {len(to_process)} assets")
        print(f"[DRY-RUN] Skipped existing: {len(candidates) - len(to_process)}")
        return
    
    if not to_process:
        print("Nothing to process.")
        return
    
    # Create run record
    run_id = create_run_record(db, config)
    print(f"Run ID: {run_id}")
    
    # Process with concurrency
    counts = {"processed": 0, "blocked": 0, "errors": 0, "inserted": 0}
    start_time = time.time()
    budget_seconds = config.budget_minutes * 60
    results_to_insert = []
    
    def should_stop():
        return (time.time() - start_time) > budget_seconds
    
    try:
        with ThreadPoolExecutor(max_workers=config.concurrency) as executor:
            futures = {executor.submit(process_one, asset, config, provider, rate_limiter): asset 
                      for asset in to_process}
            
            for future in as_completed(futures):
                if should_stop():
                    print(f"\nBudget limit reached ({config.budget_minutes} min)")
                    break
                
                result = future.result()
                
                if result["status"] == "error":
                    counts["errors"] += 1
                elif result["status"] == "blocked":
                    counts["blocked"] += 1
                    results_to_insert.append(result)
                else:
                    counts["processed"] += 1
                    results_to_insert.append(result)
                
                # Batch insert every 50
                if len(results_to_insert) >= 50:
                    _insert_batch(db, results_to_insert, counts)
                    results_to_insert = []
                
                # Progress
                total = counts["processed"] + counts["blocked"] + counts["errors"]
                if total % 10 == 0:
                    elapsed = time.time() - start_time
                    rate = total / elapsed * 60 if elapsed > 0 else 0
                    print(f"Progress: {total}/{len(to_process)} | ok={counts['processed']} blocked={counts['blocked']} err={counts['errors']} | {rate:.1f}/min")
        
        # Insert remaining
        if results_to_insert:
            _insert_batch(db, results_to_insert, counts)
        
        update_run_record(db, run_id, "success", counts)
        
    except Exception as e:
        update_run_record(db, run_id, "failed", counts, str(e)[:500])
        raise
    
    print(f"\nDone! processed={counts['processed']} blocked={counts['blocked']} errors={counts['errors']} inserted={counts['inserted']}")

def _insert_batch(db: SupabaseClient, results: list[dict], counts: dict):
    """Insert batch to question_descriptions_v0."""
    # Prepare for DB insert
    rows = []
    for r in results:
        rows.append({
            "storage_key": r["storage_key"],
            "sha256": r["sha256"],
            "syllabus_code": r["syllabus_code"],
            "session": r["session"],
            "year": r["year"],
            "doc_type": r["doc_type"],
            "paper": r["paper"],
            "variant": r["variant"],
            "q_number": r["q_number"],
            "subpart": r["subpart"],
            "status": r["status"],
            "confidence": r.get("confidence"),
            "summary": r.get("summary"),
            "question_type": r.get("question_type"),
            "answer_form": r.get("answer_form"),
            "math_expressions_latex": r.get("math_expressions_latex", []),
            "variables": r.get("variables", []),
            "units": r.get("units", []),
            "leakage_flags": r.get("leakage_flags", {}),
            "provider": r["provider"],
            "model": r["model"],
            "prompt_version": r["prompt_version"],
            "extractor_version": r["extractor_version"],
            "response_sha256": r.get("response_sha256"),
            "raw_json": r.get("raw_json", {}),
        })
    
    try:
        db.upsert("question_descriptions_v0", rows, 
                  "storage_key,sha256,extractor_version,provider,model,prompt_version")
        counts["inserted"] += len(rows)
    except Exception as e:
        print(f"Insert error: {e}")

def main():
    parser = argparse.ArgumentParser(description="VLM extraction pipeline")
    parser.add_argument("--assets-root", type=Path, default=Path("/mnt/c/users/samsen/cie-assets"))
    parser.add_argument("--provider", default="auto", help="mock|openai|auto")
    parser.add_argument("--model", default="gpt-4o-mini")
    parser.add_argument("--prompt-version", default="v0.1")
    parser.add_argument("--extractor-version", default="vlm_v0")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--max-jobs", type=int, default=500)
    parser.add_argument("--rate-limit-rps", type=float, default=1.0)
    parser.add_argument("--budget-minutes", type=int, default=60)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--syllabus-code")
    parser.add_argument("--year", type=int)
    parser.add_argument("--session")
    parser.add_argument("--paper", type=int)
    parser.add_argument("--variant", type=int)
    args = parser.parse_args()
    
    config = Config(
        assets_root=args.assets_root,
        provider=args.provider,
        model=args.model,
        prompt_version=args.prompt_version,
        extractor_version=args.extractor_version,
        concurrency=args.concurrency,
        max_jobs=args.max_jobs,
        rate_limit_rps=args.rate_limit_rps,
        budget_minutes=args.budget_minutes,
        dry_run=args.dry_run,
        filters={
            "syllabus_code": args.syllabus_code,
            "year": args.year,
            "session": args.session,
            "paper": args.paper,
            "variant": args.variant,
        }
    )
    
    run_pipeline(config)

def load_env():
    load_project_env()


if __name__ == "__main__":
    load_env()
    main()
