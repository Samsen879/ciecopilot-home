"""Persistence layer for MS rubric points.

Provides fingerprint computation, audit hashing, and single-transaction
upsert of rubric_points + vlm_ms_jobs status update.

Requirements: 2.7, 3.4, 3.5, 3.6, 3.7
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import uuid
from typing import Any

from scripts.ms.ms_prompt import derive_kind

logger = logging.getLogger(__name__)
_MARK_LABEL_RE = re.compile(r"^[MAB]\d+$")

# ---------------------------------------------------------------------------
# Fingerprint & audit hash
# ---------------------------------------------------------------------------


def compute_point_fingerprint(
    mark_label: str,
    description: str,
    marks: int,
    depends_on_labels: list[str],
) -> str:
    """Compute a deterministic SHA-256 fingerprint for idempotent upsert.

    The fingerprint is based on the business-meaningful fields only
    (not step_index), so reordering does not create duplicates.
    """
    payload = json.dumps(
        {
            "mark_label": mark_label,
            "description": description,
            "marks": marks,
            "depends_on_labels": sorted(depends_on_labels),
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def compute_response_sha256(raw_json: str) -> str:
    """Compute SHA-256 of the raw VLM response string for audit trail."""
    return hashlib.sha256(raw_json.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# SQL templates
# ---------------------------------------------------------------------------

_UPSERT_RUBRIC_SQL = """
INSERT INTO rubric_points (
    rubric_id, storage_key, paper_id, q_number, subpart, step_index,
    mark_label, kind, description, marks,
    depends_on_labels, depends_on, ft_mode, expected_answer_latex,
    confidence, confidence_source, status, parse_flags,
    source, run_id, extractor_version, provider, model, prompt_version,
    raw_json, response_sha256, point_fingerprint
) VALUES (
    %(rubric_id)s, %(storage_key)s, %(paper_id)s, %(q_number)s,
    %(subpart)s, %(step_index)s,
    %(mark_label)s, %(kind)s, %(description)s, %(marks)s,
    %(depends_on_labels)s, %(depends_on)s, %(ft_mode)s,
    %(expected_answer_latex)s,
    %(confidence)s, %(confidence_source)s, %(status)s,
    %(parse_flags)s,
    %(source)s, %(run_id)s, %(extractor_version)s, %(provider)s,
    %(model)s, %(prompt_version)s,
    %(raw_json)s, %(response_sha256)s, %(point_fingerprint)s
)
ON CONFLICT (
    storage_key, q_number, COALESCE(subpart, ''),
    point_fingerprint, extractor_version, provider, model, prompt_version
)
DO UPDATE SET
    step_index            = EXCLUDED.step_index,
    kind                  = EXCLUDED.kind,
    description           = EXCLUDED.description,
    marks                 = EXCLUDED.marks,
    depends_on_labels     = EXCLUDED.depends_on_labels,
    ft_mode               = EXCLUDED.ft_mode,
    expected_answer_latex  = EXCLUDED.expected_answer_latex,
    confidence            = EXCLUDED.confidence,
    confidence_source     = EXCLUDED.confidence_source,
    status                = EXCLUDED.status,
    parse_flags           = EXCLUDED.parse_flags,
    run_id                = EXCLUDED.run_id,
    raw_json              = EXCLUDED.raw_json,
    response_sha256       = EXCLUDED.response_sha256,
    updated_at            = now()
"""

_UPDATE_JOB_DONE_SQL = """
UPDATE vlm_ms_jobs
   SET status     = %(status)s,
       updated_at = now()
 WHERE job_id = %(job_id)s
"""

_UPDATE_JOB_ERROR_SQL = """
UPDATE vlm_ms_jobs
   SET status     = 'error',
       last_error = %(last_error)s,
       updated_at = now()
 WHERE job_id = %(job_id)s
"""


# ---------------------------------------------------------------------------
# Single-transaction upsert
# ---------------------------------------------------------------------------


def _build_row_params(
    job: dict,
    point: dict,
    step_index: int,
    run_id: str,
    raw_json: str,
    response_sha256: str,
) -> dict[str, Any]:
    """Build the parameter dict for a single rubric_points INSERT row."""
    mark_label = str(point.get("mark_label", "")).strip().upper()
    description = str(point.get("description", ""))
    marks = int(point.get("marks", 1))
    depends_on_labels = list(point.get("depends_on_labels", []))

    # Derive kind; labels that fail strict regex should be needs_review.
    kind, kind_valid = derive_kind(mark_label)
    label_valid = kind_valid and bool(_MARK_LABEL_RE.match(mark_label))
    status = "draft"
    parse_flags: dict[str, Any] = {}

    if not label_valid:
        status = "needs_review"
        parse_flags["label_invalid"] = True

    fingerprint = compute_point_fingerprint(
        mark_label, description, marks, depends_on_labels,
    )

    ft_mode = str(point.get("ft_mode", "none"))
    if ft_mode not in ("none", "follow_through", "carried_accuracy", "unknown"):
        ft_mode = "unknown"

    confidence = point.get("confidence", 0.0)
    confidence_source = str(point.get("confidence_source", "model"))
    if confidence_source not in ("model", "heuristic", "manual"):
        confidence_source = "model"

    return {
        "rubric_id": str(uuid.uuid4()),
        "storage_key": job["storage_key"],
        "paper_id": job.get("paper_id"),
        "q_number": job["q_number"],
        "subpart": job.get("subpart"),
        "step_index": step_index,
        "mark_label": mark_label,
        "kind": kind,
        "description": description,
        "marks": marks,
        "depends_on_labels": depends_on_labels,
        "depends_on": [],
        "ft_mode": ft_mode,
        "expected_answer_latex": point.get("expected_answer_latex"),
        "confidence": float(confidence),
        "confidence_source": confidence_source,
        "status": status,
        "parse_flags": json.dumps(parse_flags, ensure_ascii=False),
        "source": "vlm",
        "run_id": run_id,
        "extractor_version": job["extractor_version"],
        "provider": job["provider"],
        "model": job["model"],
        "prompt_version": job["prompt_version"],
        "raw_json": raw_json,
        "response_sha256": response_sha256,
        "point_fingerprint": fingerprint,
    }


def persist_rubric_points(
    pool: Any,
    job: dict,
    points: list[dict],
    run_id: str,
    raw_json: str,
    response_sha256: str,
) -> str:
    """Upsert rubric_points and update vlm_ms_jobs in a single transaction.

    Returns the final job status string ('done' or 'error').
    """
    job_id = job["job_id"]
    conn = None
    try:
        conn = pool.getconn()
        with conn.cursor() as cur:
            for idx, point in enumerate(points):
                params = _build_row_params(
                    job, point, idx, run_id, raw_json, response_sha256,
                )
                cur.execute(_UPSERT_RUBRIC_SQL, params)

            cur.execute(_UPDATE_JOB_DONE_SQL, {
                "status": "done",
                "job_id": job_id,
            })
        conn.commit()
        logger.info("Persisted %d rubric points for job %s", len(points), job_id)
        return "done"

    except Exception as exc:
        if conn is not None:
            conn.rollback()
        error_msg = str(exc)[:500]
        logger.error("persist_rubric_points failed for job %s: %s", job_id, error_msg)
        # Best-effort: mark job as error
        try:
            err_conn = pool.getconn()
            try:
                with err_conn.cursor() as err_cur:
                    err_cur.execute(_UPDATE_JOB_ERROR_SQL, {
                        "last_error": error_msg,
                        "job_id": job_id,
                    })
                err_conn.commit()
            finally:
                pool.putconn(err_conn)
        except Exception:
            pass
        return "error"

    finally:
        if conn is not None:
            pool.putconn(conn)
