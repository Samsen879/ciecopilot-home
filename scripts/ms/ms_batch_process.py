"""MS batch processor – job claiming, heartbeat, run management, and worker loop.

This module provides the complete batch processing pipeline for the Mark
Scheme rubric extraction system: task-queue primitives, thread-safe stats,
worker loop (claim → VLM call → parse → persist), and CLI main entry point.

Requirements: 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4, 7.5
"""
from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from threading import Event, Lock, Thread
from typing import Any

logger = logging.getLogger(__name__)

# Structured error logger – writes JSON lines for failed jobs
_error_logger = logging.getLogger(__name__ + ".errors")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@dataclass
class MSConfig:
    """Batch processor configuration, populated from CLI args."""

    workers: int = 4
    max_jobs: int | None = None
    status: list[str] = field(default_factory=lambda: ["pending"])
    stale_timeout_seconds: int = 600
    heartbeat_seconds: int = 120
    dry_run: bool = False
    model: str = "qwen-vl-max"
    base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    assets_root: Path = field(
        default_factory=lambda: Path(os.environ.get("ASSETS_ROOT", "."))
    )


def parse_ms_args(argv: list[str] | None = None) -> MSConfig:
    """Parse CLI arguments into an MSConfig dataclass."""
    import argparse

    parser = argparse.ArgumentParser(
        description="MS rubric extraction batch processor",
    )
    parser.add_argument(
        "--workers", type=int, default=4,
        help="Number of concurrent workers (default: 4)",
    )
    parser.add_argument(
        "--max-jobs", type=int, default=None,
        help="Maximum number of jobs to process (default: unlimited)",
    )
    parser.add_argument(
        "--status", type=str, default="pending",
        help="Job status(es) to claim, comma-separated (default: pending). "
             "E.g. --status pending,error,running_stale",
    )
    parser.add_argument(
        "--stale-timeout-seconds", type=int, default=600,
        help="Seconds before a running job is considered stale (default: 600)",
    )
    parser.add_argument(
        "--heartbeat-seconds", type=int, default=120,
        help="Heartbeat interval in seconds (default: 120)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Skip API calls and DB writes, output plan only",
    )
    parser.add_argument(
        "--model", type=str, default="qwen-vl-max",
        help="VLM model name (default: qwen-vl-max)",
    )
    parser.add_argument(
        "--base-url", type=str,
        default="https://dashscope.aliyuncs.com/compatible-mode/v1",
        help="DashScope API base URL",
    )
    parser.add_argument(
        "--assets-root", type=str,
        default=os.environ.get("ASSETS_ROOT", "."),
        help="Local assets root directory",
    )

    args = parser.parse_args(argv)

    return MSConfig(
        workers=args.workers,
        max_jobs=args.max_jobs,
        status=[s.strip() for s in args.status.split(",")],
        stale_timeout_seconds=args.stale_timeout_seconds,
        heartbeat_seconds=args.heartbeat_seconds,
        dry_run=args.dry_run,
        model=args.model,
        base_url=args.base_url,
        assets_root=Path(args.assets_root),
    )


# ---------------------------------------------------------------------------
# SQL – job claiming
# ---------------------------------------------------------------------------

# The WHERE clause handles two cases:
#   1. Normal statuses from config.status (e.g. pending, error)
#   2. Stale running jobs: status='running' AND locked_at expired
# The virtual status 'running_stale' in --status maps to case 2.

_CLAIM_SQL = """
    WITH cte AS (
        SELECT job_id
        FROM vlm_ms_jobs
        WHERE (status = ANY(%(statuses)s))
           OR (%(include_stale)s AND status = 'running'
               AND locked_at < now() - make_interval(secs => %(stale_timeout)s))
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE vlm_ms_jobs j
    SET status     = 'running',
        locked_by  = %(worker_id)s,
        locked_at  = now(),
        attempts   = attempts + 1,
        updated_at = now()
    FROM cte
    WHERE j.job_id = cte.job_id
    RETURNING j.job_id, j.storage_key, j.sha256, j.paper_id,
              j.syllabus_code, j.session, j.year, j.paper, j.variant,
              j.q_number, j.subpart,
              j.extractor_version, j.provider, j.model, j.prompt_version,
              j.attempts;
"""

_CLAIM_COLUMNS = (
    "job_id", "storage_key", "sha256", "paper_id",
    "syllabus_code", "session", "year", "paper", "variant",
    "q_number", "subpart",
    "extractor_version", "provider", "model", "prompt_version",
    "attempts",
)

# ---------------------------------------------------------------------------
# SQL – heartbeat
# ---------------------------------------------------------------------------

_HEARTBEAT_SQL = """
    UPDATE vlm_ms_jobs
       SET locked_at  = now(),
           updated_at = now()
     WHERE job_id   = %(job_id)s
       AND locked_by = %(worker_id)s
"""

# ---------------------------------------------------------------------------
# SQL – run management
# ---------------------------------------------------------------------------

_CREATE_RUN_SQL = """
    INSERT INTO vlm_ms_runs (run_id, status, config)
    VALUES (%(run_id)s, 'running', %(config)s)
    RETURNING run_id
"""

_FINISH_RUN_SQL = """
    UPDATE vlm_ms_runs
       SET finished_at   = now(),
           status        = %(status)s,
           counts        = %(counts)s,
           error_summary = %(error_summary)s
     WHERE run_id = %(run_id)s
"""


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------


def claim_ms_job(pool: Any, worker_id: str, config: MSConfig) -> dict | None:
    """Atomically claim one MS job using SELECT FOR UPDATE SKIP LOCKED.

    Handles both normal status filtering and stale-running reclaim.
    The virtual status ``running_stale`` in *config.status* enables
    reclaiming jobs whose ``locked_at`` exceeds *stale_timeout_seconds*.

    Returns a dict of job fields or ``None`` when the queue is empty.
    """
    # Separate real DB statuses from the virtual 'running_stale' flag
    real_statuses = [s for s in config.status if s != "running_stale"]
    include_stale = "running_stale" in config.status

    params = {
        "statuses": real_statuses,
        "include_stale": include_stale,
        "stale_timeout": config.stale_timeout_seconds,
        "worker_id": worker_id,
    }

    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(_CLAIM_SQL, params)
            row = cur.fetchone()
        conn.commit()
    finally:
        pool.putconn(conn)

    if row is None:
        return None

    return dict(zip(_CLAIM_COLUMNS, row))


def heartbeat(pool: Any, job_id: str, worker_id: str) -> None:
    """Refresh ``locked_at`` to prevent stale-timeout reclaim."""
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(_HEARTBEAT_SQL, {
                "job_id": job_id,
                "worker_id": worker_id,
            })
        conn.commit()
    finally:
        pool.putconn(conn)


def create_ms_run(pool: Any, config: MSConfig) -> str:
    """Create a ``vlm_ms_runs`` record and return the *run_id*."""
    run_id = str(uuid.uuid4())
    config_json = json.dumps({
        "workers": config.workers,
        "max_jobs": config.max_jobs,
        "status": config.status,
        "stale_timeout_seconds": config.stale_timeout_seconds,
        "heartbeat_seconds": config.heartbeat_seconds,
        "dry_run": config.dry_run,
        "model": config.model,
        "base_url": config.base_url,
        "assets_root": str(config.assets_root),
    }, ensure_ascii=False)

    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(_CREATE_RUN_SQL, {
                "run_id": run_id,
                "config": config_json,
            })
        conn.commit()
        logger.info("Created MS run %s", run_id)
    finally:
        pool.putconn(conn)

    return run_id


def finish_ms_run(
    pool: Any,
    run_id: str,
    status: str,
    counts: dict,
    error_summary: str | None = None,
) -> None:
    """Finalise a run record with statistics and optional error summary."""
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(_FINISH_RUN_SQL, {
                "run_id": run_id,
                "status": status,
                "counts": json.dumps(counts, ensure_ascii=False),
                "error_summary": error_summary,
            })
        conn.commit()
        logger.info("Finished MS run %s → %s", run_id, status)
    finally:
        pool.putconn(conn)


# ---------------------------------------------------------------------------
# SQL – mark job error (standalone, outside persist transaction)
# ---------------------------------------------------------------------------

_MARK_JOB_ERROR_SQL = """
    UPDATE vlm_ms_jobs
       SET status     = 'error',
           last_error = %(last_error)s,
           updated_at = now()
     WHERE job_id = %(job_id)s
"""


def _mark_job_error(pool: Any, job_id: str, error_msg: str) -> None:
    """Best-effort helper to mark a job as error outside the persist path."""
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(_MARK_JOB_ERROR_SQL, {
                "job_id": job_id,
                "last_error": error_msg[:500],
            })
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
    finally:
        pool.putconn(conn)


# ---------------------------------------------------------------------------
# Thread-safe Stats counter
# ---------------------------------------------------------------------------

# Cost assumptions (configurable via environment)
_INPUT_COST_PER_1K = float(os.environ.get("MS_INPUT_COST_PER_1K", "0.003"))
_OUTPUT_COST_PER_1K = float(os.environ.get("MS_OUTPUT_COST_PER_1K", "0.006"))


@dataclass
class Stats:
    """Thread-safe counters for MS batch processing statistics."""

    total_jobs: int = 0
    done: int = 0
    error: int = 0
    needs_review: int = 0
    api_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    _lock: Lock = field(default_factory=Lock, repr=False)
    _start_time: float = field(default_factory=time.time, repr=False)

    def increment(self, field_name: str, amount: int = 1) -> None:
        """Atomically increment a named counter."""
        with self._lock:
            setattr(self, field_name, getattr(self, field_name) + amount)

    def get_summary(self) -> dict:
        """Return a snapshot dict of all counters plus derived fields."""
        with self._lock:
            elapsed = time.time() - self._start_time
            est_cost = (
                self.input_tokens * _INPUT_COST_PER_1K
                + self.output_tokens * _OUTPUT_COST_PER_1K
            ) / 1000
            return {
                "total_jobs": self.total_jobs,
                "done": self.done,
                "error": self.error,
                "needs_review": self.needs_review,
                "api_calls": self.api_calls,
                "input_tokens": self.input_tokens,
                "output_tokens": self.output_tokens,
                "estimated_cost": round(est_cost, 6),
                "elapsed_seconds": round(elapsed, 1),
            }

    def maybe_log_progress(self) -> None:
        """Print progress every 10 completed jobs."""
        total = self.total_jobs
        if total > 0 and total % 10 == 0:
            elapsed = time.time() - self._start_time
            rate = total / elapsed * 60 if elapsed > 0 else 0
            with self._lock:
                logger.info(
                    "[progress] %d jobs | done=%d err=%d review=%d | %.1f jobs/min",
                    total, self.done, self.error, self.needs_review, rate,
                )

    def summary_str(self) -> str:
        """Return a human-readable summary string."""
        s = self.get_summary()
        elapsed = s["elapsed_seconds"]
        rate = s["total_jobs"] / elapsed * 60 if elapsed > 0 else 0
        return (
            f"\n{'=' * 60}\n"
            f"MS Batch Complete\n"
            f"  Total jobs:    {s['total_jobs']}\n"
            f"  Done:          {s['done']}\n"
            f"  Error:         {s['error']}\n"
            f"  Needs review:  {s['needs_review']}\n"
            f"  API calls:     {s['api_calls']}\n"
            f"  Tokens:        {s['input_tokens']} in / {s['output_tokens']} out\n"
            f"  Est cost:      ${s['estimated_cost']:.6f}\n"
            f"  Elapsed:       {elapsed:.1f}s ({rate:.1f} jobs/min)\n"
            f"{'=' * 60}"
        )


# ---------------------------------------------------------------------------
# Structured error logging
# ---------------------------------------------------------------------------


def _log_structured_error(
    job_id: str,
    storage_key: str,
    error_code: str,
    error_message: str,
    worker_id: str | None = None,
    run_id: str | None = None,
) -> None:
    """Write a structured JSON error line for failed jobs."""
    entry = {
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "job_id": job_id,
        "storage_key": storage_key,
        "error_code": error_code,
        "error_message": error_message,
    }
    if worker_id is not None:
        entry["worker_id"] = worker_id
    if run_id:
        entry["run_id"] = run_id
    _error_logger.error(json.dumps(entry, ensure_ascii=False))


def _configure_error_logger() -> None:
    """Configure JSONL file sink for structured worker errors."""
    if _error_logger.handlers:
        return

    path = Path(os.environ.get("MS_ERROR_LOG_PATH", "runs/ms/ms_worker_errors.jsonl"))
    path.parent.mkdir(parents=True, exist_ok=True)

    handler = logging.FileHandler(path, encoding="utf-8")
    # One JSON document per line for downstream parsing.
    handler.setFormatter(logging.Formatter("%(message)s"))
    _error_logger.setLevel(logging.ERROR)
    _error_logger.addHandler(handler)
    _error_logger.propagate = True


def _job_heartbeat_loop(
    pool: Any,
    job_id: str,
    worker_id: str,
    heartbeat_seconds: int,
    stop_event: Event,
) -> None:
    """Background heartbeat loop for one running job."""
    interval = max(1, int(heartbeat_seconds))
    while not stop_event.wait(interval):
        try:
            heartbeat(pool, job_id, worker_id)
        except Exception as exc:
            logger.warning(
                "Heartbeat failed for job %s by %s: %s",
                job_id, worker_id, exc,
            )


# ---------------------------------------------------------------------------
# Worker loop
# ---------------------------------------------------------------------------


def ms_worker_loop(
    worker_id: str,
    config: MSConfig,
    stats: Stats,
    pool: Any,
    client: Any,
    stop_event: Event,
    run_id: str = "",
) -> None:
    """Single worker loop: claim → VLM call → parse → persist.

    Runs until *stop_event* is set, no more jobs are available, or
    *max_jobs* is reached.

    Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
    """
    from scripts.ms.ms_persist import compute_response_sha256, persist_rubric_points
    from scripts.ms.ms_prompt import derive_kind, parse_ms_response
    from scripts.ms.ms_vlm_call import call_ms_vlm_with_retry

    while not stop_event.is_set():
        # Check max_jobs limit
        if config.max_jobs is not None and stats.total_jobs >= config.max_jobs:
            break

        try:
            # --- Claim a job ---
            job = claim_ms_job(pool, worker_id, config)
            if job is None:
                break  # Queue exhausted

            job_id = str(job["job_id"])
            storage_key = job.get("storage_key", "")

            stats.increment("total_jobs")

            # --- Dry-run mode: skip API and DB ---
            if config.dry_run:
                logger.info("[dry-run] %s: would process %s", worker_id, storage_key)
                stats.increment("done")
                stats.maybe_log_progress()
                continue

            # --- Resolve image path ---
            image_path = config.assets_root / storage_key

            heartbeat_stop: Event | None = None
            heartbeat_thread: Thread | None = None
            try:
                # Keep lock alive while a long VLM call / persist is running.
                heartbeat_stop = Event()
                heartbeat_thread = Thread(
                    target=_job_heartbeat_loop,
                    args=(
                        pool,
                        job_id,
                        worker_id,
                        config.heartbeat_seconds,
                        heartbeat_stop,
                    ),
                    daemon=True,
                )
                heartbeat_thread.start()

                # --- VLM call with retry ---
                try:
                    vlm_result = call_ms_vlm_with_retry(
                        image_path, job, client, config,
                    )
                except Exception as exc:
                    error_code = "vlm_call_failed"
                    error_msg = str(exc)[:500]
                    _mark_job_error(pool, job_id, error_msg)
                    _log_structured_error(
                        job_id,
                        storage_key,
                        error_code,
                        error_msg,
                        worker_id=worker_id,
                        run_id=run_id,
                    )
                    stats.increment("error")
                    stats.maybe_log_progress()
                    continue

                raw_text = vlm_result["raw_text"]
                stats.increment("api_calls")
                stats.increment("input_tokens", vlm_result["input_tokens"])
                stats.increment("output_tokens", vlm_result["output_tokens"])

                # --- Parse response ---
                points = parse_ms_response(raw_text, job)
                if points is None:
                    error_code = "json_parse_failed"
                    error_msg = "Failed to parse VLM response as valid rubric JSON"
                    _mark_job_error(pool, job_id, error_msg)
                    _log_structured_error(
                        job_id,
                        storage_key,
                        error_code,
                        error_msg,
                        worker_id=worker_id,
                        run_id=run_id,
                    )
                    stats.increment("error")
                    stats.maybe_log_progress()
                    continue

                # --- Persist rubric points ---
                response_sha256 = compute_response_sha256(raw_text)
                try:
                    job_status = persist_rubric_points(
                        pool, job, points, run_id, raw_text, response_sha256,
                    )
                except Exception as exc:
                    error_code = "persist_failed"
                    error_msg = str(exc)[:500]
                    _log_structured_error(
                        job_id,
                        storage_key,
                        error_code,
                        error_msg,
                        worker_id=worker_id,
                        run_id=run_id,
                    )
                    stats.increment("error")
                    stats.maybe_log_progress()
                    continue
            finally:
                if heartbeat_stop is not None:
                    heartbeat_stop.set()
                if heartbeat_thread is not None:
                    heartbeat_thread.join(timeout=1.0)

            # --- Update stats based on outcome ---
            if job_status == "done":
                stats.increment("done")
                # points from parse_ms_response do not carry DB status; infer
                # pre-resolver needs_review candidates using label validity.
                if any(not derive_kind(str(pt.get("mark_label", "")))[1] for pt in points):
                    stats.increment("needs_review")
            else:
                stats.increment("error")

            # --- Progress log every 10 jobs ---
            stats.maybe_log_progress()

        except Exception as exc:
            # Catch-all: don't let one job crash the worker
            logger.error("Worker %s unexpected error: %s", worker_id, exc, exc_info=True)
            stats.increment("error")
            stats.maybe_log_progress()
            continue


# ---------------------------------------------------------------------------
# .env loader
# ---------------------------------------------------------------------------


def _load_env() -> None:
    """Load .env file from project root if it exists."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    if key.strip() not in os.environ:
                        os.environ[key.strip()] = val.strip()


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    """Main entry point for the MS rubric extraction batch processor.

    Parses CLI arguments, initialises pool/client, registers signal
    handlers, launches worker threads, and prints a final summary.

    Returns 0 on success, non-zero on error.
    """
    _load_env()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    config = parse_ms_args(argv)

    # --- Dry-run: print plan and exit ---
    if config.dry_run:
        print("=" * 60)
        print("MS Rubric Extraction (dry-run)")
        print(f"  Workers:        {config.workers}")
        print(f"  Status:         {','.join(config.status)}")
        print(f"  Max jobs:       {config.max_jobs or 'unlimited'}")
        print(f"  Assets root:    {config.assets_root}")
        print(f"  Model:          {config.model}")
        print(f"  Stale timeout:  {config.stale_timeout_seconds}s")
        print(f"  Heartbeat:      {config.heartbeat_seconds}s")
        print("=" * 60)
        print("Dry-run mode: no API calls or DB writes.")
        return 0

    _configure_error_logger()

    # --- Validate API key ---
    api_key = os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: DASHSCOPE_API_KEY or OPENAI_API_KEY must be set", file=sys.stderr)
        return 1

    # --- Initialise connection pool ---
    import psycopg2.pool  # type: ignore

    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("ERROR: DATABASE_URL or SUPABASE_DB_URL must be set", file=sys.stderr)
        return 1

    pool = psycopg2.pool.ThreadedConnectionPool(1, config.workers + 2, db_url)

    # --- Initialise OpenAI-compatible client ---
    from openai import OpenAI  # type: ignore

    client = OpenAI(api_key=api_key, base_url=config.base_url)

    # --- Stats and stop event ---
    stats = Stats()
    stop_event = Event()

    # --- Signal handlers for graceful shutdown ---
    def _handle_signal(signum, _frame):
        logger.info("Received signal %s, shutting down gracefully...", signum)
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_signal)
    try:
        signal.signal(signal.SIGTERM, _handle_signal)
    except (OSError, AttributeError):
        pass  # SIGTERM not available on Windows

    # --- Create run record ---
    run_id = create_ms_run(pool, config)

    # --- Startup banner ---
    print("=" * 60)
    print("MS Rubric Extraction Batch Processor")
    print(f"  Run ID:         {run_id}")
    print(f"  Workers:        {config.workers}")
    print(f"  Status:         {','.join(config.status)}")
    print(f"  Max jobs:       {config.max_jobs or 'unlimited'}")
    print(f"  Assets root:    {config.assets_root}")
    print(f"  Model:          {config.model}")
    print(f"  Stale timeout:  {config.stale_timeout_seconds}s")
    print(f"  Heartbeat:      {config.heartbeat_seconds}s")
    print("=" * 60)

    # --- Launch workers ---
    run_status = "success"
    error_summary = None

    try:
        with ThreadPoolExecutor(max_workers=config.workers) as executor:
            futures = []
            for i in range(config.workers):
                wid = f"ms_worker_{i}"
                fut = executor.submit(
                    ms_worker_loop, wid, config, stats, pool, client,
                    stop_event, run_id,
                )
                futures.append(fut)

            for fut in futures:
                try:
                    fut.result()
                except Exception as exc:
                    logger.error("Worker raised: %s", exc, exc_info=True)

    except Exception as exc:
        run_status = "failed"
        error_summary = str(exc)[:1000]
        logger.error("Batch run failed: %s", exc, exc_info=True)

    # --- Determine run status ---
    summary = stats.get_summary()
    if summary["error"] > 0 and summary["done"] == 0:
        run_status = "failed"
        error_summary = f"{summary['error']} jobs failed, 0 succeeded"

    # --- Finish run record ---
    try:
        finish_ms_run(pool, run_id, run_status, summary, error_summary)
    except Exception as exc:
        logger.error("Failed to finish run record: %s", exc)

    # --- Print summary ---
    print(stats.summary_str())

    # --- Cleanup ---
    try:
        pool.closeall()
    except Exception:
        pass

    return 0 if run_status == "success" else 1


if __name__ == "__main__":
    sys.exit(main())
