#!/usr/bin/env python3
"""
Integration tests for the evaluate-v1 full flow.

Covers (Task 12):
  12.2 — Rubric resolution scenarios:
    - ready 正常路径
    - no-ready 阻断
    - 多版本选择
    - 合同缺失阻断
    - compat_mode 返回结构
  12.3 — Auto-write linkage scenarios:
    - 写入成功
    - 写入部分失败
    - 去重生效

Since evaluate-v1 is a serverless-style API function (JS), these tests validate
the LOGIC and DB contract expectations using mock-based simulation of the
Supabase client responses. Each test exercises the same sequence the real
handler follows:
  1. Rubric resolution (version selection → ready fetch → contract check)
  2. Decision engine (Jaccard scoring → dependency chain)
  3. Auto error writer (candidate filter → node_id → upsert)
  4. Run repository (audit persist)

**Validates: Requirements 1, 2**
"""
from __future__ import annotations

import copy
import json
import uuid
from dataclasses import dataclass, field
from typing import Any

import pytest

# ═══════════════════════════════════════════════════════════════════════════════
# Lightweight Python re-implementation of the JS modules for integration testing
# ═══════════════════════════════════════════════════════════════════════════════

# ── Error classes (mirror JS) ────────────────────────────────────────────────

class RubricNotReadyError(Exception):
    """409 — no ready rubric found."""
    def __init__(self, message="No ready rubric found for the given scope."):
        super().__init__(message)
        self.status_code = 409
        self.code = "rubric_not_ready"


class RubricContractInvalidError(Exception):
    """422 — rubric points missing required contract fields."""
    def __init__(self, message="Rubric points missing required contract fields.", details=None):
        super().__init__(message)
        self.status_code = 422
        self.code = "rubric_contract_invalid"
        self.details = details or []


# ── Contract validation ──────────────────────────────────────────────────────

CONTRACT_REQUIRED_FIELDS = ["rubric_id", "mark_label", "kind", "depends_on", "marks"]


def validate_contract(points: list[dict]) -> tuple[bool, list[dict]]:
    violations = []
    for pt in points:
        missing = [f for f in CONTRACT_REQUIRED_FIELDS if pt.get(f) is None]
        if missing:
            violations.append({
                "rubric_id": pt.get("rubric_id", "unknown"),
                "missing_fields": missing,
            })
    return (len(violations) == 0, violations)


# ── Version selection (mirrors rubric-resolver-v1.js) ────────────────────────

def select_latest_version(rubric_rows: list[dict], subpart_norm: str) -> str | None:
    """Pick latest source_version from base-table rows (status=ready)."""
    filtered = [
        r for r in rubric_rows
        if (r.get("subpart") or "") == subpart_norm
    ]
    if not filtered:
        return None

    groups: dict[str, float] = {}
    for r in filtered:
        sv = ":".join([
            r.get("extractor_version", ""),
            r.get("provider", ""),
            r.get("model", ""),
            r.get("prompt_version", ""),
        ])
        from datetime import datetime
        ts = datetime.fromisoformat(r["updated_at"].replace("Z", "+00:00")).timestamp()
        if sv not in groups or ts > groups[sv]:
            groups[sv] = ts

    best_version = None
    best_ts = float("-inf")
    for sv, ts in groups.items():
        if ts > best_ts or (ts == best_ts and sv > (best_version or "")):
            best_version = sv
            best_ts = ts
    return best_version


# ── Rubric resolver ──────────────────────────────────────────────────────────

def resolve_rubric(
    *,
    rubric_base_rows: list[dict],
    ready_view_rows: list[dict],
    storage_key: str,
    q_number: int,
    subpart: str | None = None,
    rubric_source_version: str | None = None,
) -> dict:
    subpart_norm = subpart or ""

    if rubric_source_version:
        selected = rubric_source_version
    else:
        selected = select_latest_version(rubric_base_rows, subpart_norm)

    if not selected:
        raise RubricNotReadyError(
            f"No ready rubric for storage_key={storage_key}, "
            f"q_number={q_number}, subpart='{subpart_norm}'."
        )

    points = [
        r for r in ready_view_rows
        if r.get("source_version") == selected
        and (r.get("subpart") or "") == subpart_norm
    ]

    if not points:
        raise RubricNotReadyError(
            f"No ready rubric points in view for version={selected}."
        )

    valid, violations = validate_contract(points)
    if not valid:
        raise RubricContractInvalidError(
            f"Rubric contract invalid: {len(violations)} point(s) missing required fields.",
            details=violations,
        )

    return {
        "rubric_source_version": selected,
        "rubric_points": points,
        "rubric_rows_used": len(points),
    }


# ── Decision engine (mirrors decision-engine-v1.js) ─────────────────────────

SCORING_ENGINE_VERSION = "b2_smart_mark_engine_v1"
DEFAULT_MIN_CONFIDENCE = 0.55
DEFAULT_UNCERTAIN_MARGIN = 0.15


import re
import math


def _normalize(text: str) -> str:
    t = str(text or "").lower()
    t = re.sub(r"[\r\n\t]+", " ", t)
    t = re.sub(r"[^a-z0-9+\-*/=(). ]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", _normalize(text))


def _jaccard(a: list[str], b: list[str]) -> float:
    if not a or not b:
        return 0.0
    sa, sb = set(a), set(b)
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union > 0 else 0.0


def _validate_dependencies(rubric_points: list[dict]) -> dict[str, str]:
    id_set = {rp["rubric_id"] for rp in rubric_points}
    errors: dict[str, str] = {}
    for rp in rubric_points:
        deps = rp.get("depends_on") or []
        if not isinstance(deps, list):
            continue
        for dep_id in deps:
            if dep_id not in id_set:
                errors[rp["rubric_id"]] = "dependency_error"
                break
    return errors


def run_decision_engine(
    *,
    student_steps: list[dict],
    rubric_points: list[dict],
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    uncertain_margin: float = DEFAULT_UNCERTAIN_MARGIN,
    compat_mode: str | None = None,
) -> dict:
    dep_errors = _validate_dependencies(rubric_points)

    raw_scores: dict[str, tuple[str | None, float]] = {}
    for rp in rubric_points:
        basis = f"{rp.get('mark_label', '')} {rp.get('description', '')}".strip()
        basis_tokens = _tokenize(basis)
        best_step_id = None
        best_score = 0.0
        for step in student_steps:
            step_tokens = _tokenize(str(step.get("text", "")))
            score = _jaccard(basis_tokens, step_tokens)
            if score > best_score:
                best_score = score
                best_step_id = str(step.get("step_id", ""))
        raw_scores[rp["rubric_id"]] = (best_step_id, round(best_score, 4))

    decisions_map: dict[str, dict] = {}
    for rp in rubric_points:
        step_id, confidence = raw_scores[rp["rubric_id"]]
        marks = int(rp.get("marks", 0) or 0)

        if rp["rubric_id"] in dep_errors:
            decisions_map[rp["rubric_id"]] = {
                "rubric_id": rp["rubric_id"],
                "mark_label": rp["mark_label"],
                "reason": "dependency_error",
                "awarded": False,
                "awarded_marks": 0,
            }
            continue

        if confidence >= min_confidence + uncertain_margin:
            awarded, reason = True, "best_match"
        elif confidence >= min_confidence:
            awarded, reason = False, "borderline_score"
        else:
            awarded, reason = False, "below_threshold"

        decisions_map[rp["rubric_id"]] = {
            "rubric_id": rp["rubric_id"],
            "mark_label": rp["mark_label"],
            "reason": reason,
            "awarded": awarded,
            "awarded_marks": marks if awarded else 0,
        }

    # Dependency chain check
    for rp in rubric_points:
        deps = rp.get("depends_on") or []
        if not isinstance(deps, list) or not deps:
            continue
        if rp["rubric_id"] in dep_errors:
            continue
        d = decisions_map.get(rp["rubric_id"])
        if not d:
            continue
        for dep_id in deps:
            dep_d = decisions_map.get(dep_id)
            if not dep_d or not dep_d["awarded"]:
                d["awarded"] = False
                d["awarded_marks"] = 0
                d["reason"] = "dependency_not_met"
                break

    decisions = [decisions_map[rp["rubric_id"]] for rp in rubric_points]
    result: dict[str, Any] = {"decisions": decisions}

    if compat_mode == "v0":
        result["alignments"] = _build_v0_alignments(rubric_points, student_steps, decisions_map)

    return result


def _build_v0_alignments(rubric_points, student_steps, decisions_map):
    alignments = []
    for idx, step in enumerate(student_steps):
        step_id = str(step.get("step_id", f"s{idx+1}"))
        step_text = str(step.get("text", ""))
        if not rubric_points:
            alignments.append({
                "step_id": step_id, "status": "uncertain", "confidence": 0,
                "rubric_id": None, "mark_label": None, "reason": "no_rubric_points",
            })
            continue
        basis_tokens = _tokenize(step_text)
        best_rid, best_ml, best_conf = None, None, 0.0
        for rp in rubric_points:
            rp_basis = f"{rp.get('mark_label', '')} {rp.get('description', '')}".strip()
            score = _jaccard(basis_tokens, _tokenize(rp_basis))
            if score > best_conf:
                best_conf = score
                best_rid = rp["rubric_id"]
                best_ml = rp["mark_label"]
        best_conf = round(best_conf, 4)
        decision = decisions_map.get(best_rid) if best_rid else None
        if not decision:
            status, reason = "uncertain", "no_match"
        elif decision["awarded"]:
            status, reason = "aligned", decision["reason"]
        else:
            status, reason = "uncertain", decision["reason"]
        alignments.append({
            "step_id": step_id, "status": status, "confidence": best_conf,
            "rubric_id": best_rid, "mark_label": best_ml, "reason": reason,
        })
    return alignments


# ── Auto error candidate logic (mirrors error-event-writer.js) ───────────────

ERROR_CANDIDATE_REASONS = {
    "below_threshold", "borderline_score", "dependency_not_met",
    "dependency_error", "no_match",
}


def is_error_candidate(decision: dict) -> bool:
    if decision.get("awarded") is False:
        return True
    if decision.get("reason") in ERROR_CANDIDATE_REASONS:
        return True
    return False


def filter_candidates(decisions: list[dict]) -> list[dict]:
    return [d for d in decisions if is_error_candidate(d)]


def build_error_row(decision: dict, context: dict, node_id: str | None) -> dict:
    parts = (context.get("storage_key") or "").split("/")
    syllabus_code = parts[0] if parts else None
    paper = "/".join(parts[1:3]) if len(parts) >= 3 else None
    metadata = {
        "decision_reason": decision["reason"],
        "rubric_id": decision["rubric_id"],
        "run_id": context["run_id"],
        "rubric_source_version": context["rubric_source_version"],
        "scoring_engine_version": context["scoring_engine_version"],
        "mark_label": decision["mark_label"],
    }
    if context.get("subpart"):
        metadata["subpart"] = context["subpart"]
    return {
        "user_id": context["user_id"],
        "storage_key": context["storage_key"],
        "syllabus_code": syllabus_code,
        "paper": paper,
        "q_number": context["q_number"],
        "node_id": node_id,
        "source": "mark_engine_auto",
        "question": f"{decision.get('mark_label', '')} — auto-detected error",
        "metadata": metadata,
    }


# ── Mock upsert store (simulates user_errors table) ─────────────────────────

@dataclass
class MockUserErrorsStore:
    """In-memory store simulating user_errors with partial unique indexes."""
    rows: list[dict] = field(default_factory=list)
    fail_rubric_ids: set[str] = field(default_factory=set)  # rubric_ids that should fail on write

    def _auto_key(self, row: dict) -> tuple:
        meta = row.get("metadata", {})
        return (
            row["user_id"],
            row["storage_key"],
            row["q_number"],
            meta.get("rubric_id", ""),
            meta.get("rubric_source_version", ""),
        )

    def upsert(self, row: dict) -> str:
        """Returns 'written', 'deduped', or 'failed'."""
        rid = row.get("metadata", {}).get("rubric_id", "")
        if rid in self.fail_rubric_ids:
            raise Exception(f"Simulated write failure for rubric_id={rid}")

        if row.get("source") == "mark_engine_auto":
            key = self._auto_key(row)
            for existing in self.rows:
                if existing.get("source") == "mark_engine_auto" and self._auto_key(existing) == key:
                    return "deduped"
        self.rows.append(copy.deepcopy(row))
        return "written"


def write_auto_errors(
    *,
    decisions: list[dict],
    context: dict,
    node_id: str | None,
    store: MockUserErrorsStore,
) -> dict:
    candidates = filter_candidates(decisions)
    if not candidates:
        return {
            "status": "success",
            "counts": {"candidates": 0, "written": 0, "deduped": 0, "failed": 0},
        }

    written = deduped = failed = 0
    for d in candidates:
        row = build_error_row(d, context, node_id)
        try:
            outcome = store.upsert(row)
            if outcome == "written":
                written += 1
            elif outcome == "deduped":
                deduped += 1
            else:
                failed += 1
        except Exception:
            failed += 1

    if failed == 0:
        status = "success"
    elif written > 0 or deduped > 0:
        status = "partial"
    else:
        status = "failed"

    return {
        "status": status,
        "counts": {"candidates": len(candidates), "written": written, "deduped": deduped, "failed": failed},
    }


# ── Full evaluate-v1 flow simulation ────────────────────────────────────────

def simulate_evaluate_v1(
    *,
    request_body: dict,
    rubric_base_rows: list[dict],
    ready_view_rows: list[dict],
    concept_links: list[dict] | None = None,
    store: MockUserErrorsStore | None = None,
    auto_write_enabled: bool = True,
) -> dict:
    """Simulate the full evaluate-v1 handler flow, returning the response dict."""
    run_id = str(uuid.uuid4())

    # Validate request
    body = request_body
    if "rubric_points" in body:
        return {"status_code": 400, "error": "rubric_input_forbidden", "run_id": run_id}

    required = ["user_id", "storage_key", "q_number", "student_steps"]
    missing = [f for f in required if f not in body or body[f] is None]
    if "student_steps" in body and not isinstance(body["student_steps"], list):
        missing.append("student_steps")
    if missing:
        return {"status_code": 400, "error": "missing_required_fields", "run_id": run_id, "missing": missing}

    user_id = body["user_id"]
    storage_key = body["storage_key"]
    q_number = body["q_number"]
    subpart = body.get("subpart")
    student_steps = body["student_steps"]
    requested_version = body.get("rubric_source_version")
    compat_mode = body.get("compat_mode")

    # Rubric resolution
    try:
        resolved = resolve_rubric(
            rubric_base_rows=rubric_base_rows,
            ready_view_rows=ready_view_rows,
            storage_key=storage_key,
            q_number=q_number,
            subpart=subpart,
            rubric_source_version=requested_version,
        )
    except RubricNotReadyError as e:
        return {"status_code": 409, "error": "rubric_not_ready", "run_id": run_id, "message": str(e)}
    except RubricContractInvalidError as e:
        return {"status_code": 422, "error": "rubric_contract_invalid", "run_id": run_id,
                "message": str(e), "details": e.details}

    rubric_source_version = resolved["rubric_source_version"]
    rubric_points = resolved["rubric_points"]
    rubric_rows_used = resolved["rubric_rows_used"]

    # Decision engine
    engine_result = run_decision_engine(
        student_steps=student_steps,
        rubric_points=rubric_points,
        compat_mode=compat_mode,
    )
    decisions = engine_result["decisions"]

    # Auto error writer
    error_book_write_status = "success"
    error_book_write_counts = {"candidates": 0, "written": 0, "deduped": 0, "failed": 0}

    if auto_write_enabled and store is not None:
        node_id = None
        if concept_links:
            priority = ["ai_agent_reclassify", "a1_keyword_mapper_v1"]
            sorted_links = sorted(
                concept_links,
                key=lambda x: priority.index(x["source"]) if x["source"] in priority else len(priority),
            )
            node_id = sorted_links[0]["node_id"] if sorted_links else None

        context = {
            "user_id": user_id,
            "storage_key": storage_key,
            "q_number": q_number,
            "subpart": subpart,
            "run_id": run_id,
            "rubric_source_version": rubric_source_version,
            "scoring_engine_version": SCORING_ENGINE_VERSION,
        }
        write_result = write_auto_errors(
            decisions=decisions, context=context, node_id=node_id, store=store,
        )
        error_book_write_status = write_result["status"]
        error_book_write_counts = write_result["counts"]

    response = {
        "status_code": 200,
        "run_id": run_id,
        "rubric_source_version": rubric_source_version,
        "scoring_engine_version": SCORING_ENGINE_VERSION,
        "rubric_rows_used": rubric_rows_used,
        "decisions": decisions,
        "error_book_write_status": error_book_write_status,
        "error_book_write_counts": error_book_write_counts,
    }

    if compat_mode == "v0" and "alignments" in engine_result:
        response["alignments"] = engine_result["alignments"]

    return response


# ═══════════════════════════════════════════════════════════════════════════════
# Test Fixtures
# ═══════════════════════════════════════════════════════════════════════════════

def _make_base_row(**overrides) -> dict:
    """A rubric_points base-table row (for version selection)."""
    base = {
        "rubric_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "storage_key": "9709/s22/qp11/q01.png",
        "q_number": 1,
        "subpart": None,
        "status": "ready",
        "extractor_version": "v1",
        "provider": "openai",
        "model": "gpt-4-turbo",
        "prompt_version": "p1",
        "updated_at": "2026-02-15T10:00:00Z",
    }
    base.update(overrides)
    return base


def _make_ready_point(**overrides) -> dict:
    """A rubric_points_ready_v1 view row."""
    base = {
        "rubric_id": "aaaaaaaa-0000-0000-0000-000000000001",
        "storage_key": "9709/s22/qp11/q01.png",
        "q_number": 1,
        "subpart": None,
        "step_index": 1,
        "mark_label": "M1",
        "kind": "M",
        "description": "Correct method for differentiation",
        "marks": 1,
        "depends_on": [],
        "source_version": "v1:openai:gpt-4-turbo:p1",
    }
    base.update(overrides)
    return base


def _make_request(**overrides) -> dict:
    base = {
        "user_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "storage_key": "9709/s22/qp11/q01.png",
        "q_number": 1,
        "student_steps": [
            {"step_id": "s1", "text": "differentiation method applied correctly"},
            {"step_id": "s2", "text": "final answer x = 3"},
        ],
    }
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════════════════════
# 12.2 — Rubric Resolution Scenarios
# ═══════════════════════════════════════════════════════════════════════════════

class TestReadyNormalPath:
    """12.2: ready 正常路径 — ready rubric exists, version selected, decisions produced."""

    def test_normal_flow_returns_200_with_decisions(self):
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(),
            _make_ready_point(
                rubric_id="aaaaaaaa-0000-0000-0000-000000000002",
                mark_label="A1", step_index=2,
                description="Correct final answer",
            ),
        ]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 200
        assert resp["rubric_source_version"] == "v1:openai:gpt-4-turbo:p1"
        assert resp["scoring_engine_version"] == SCORING_ENGINE_VERSION
        assert resp["rubric_rows_used"] == 2
        assert len(resp["decisions"]) == 2

    def test_response_contains_run_id(self):
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=[_make_base_row()],
            ready_view_rows=[_make_ready_point()],
            auto_write_enabled=False,
        )
        assert "run_id" in resp
        # UUID format
        uuid.UUID(resp["run_id"])  # raises if invalid

    def test_decisions_have_required_fields(self):
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=[_make_base_row()],
            ready_view_rows=[_make_ready_point()],
            auto_write_enabled=False,
        )
        for d in resp["decisions"]:
            assert "rubric_id" in d
            assert "mark_label" in d
            assert "reason" in d
            assert "awarded" in d
            assert "awarded_marks" in d


class TestNoReadyBlocking:
    """12.2: no-ready 阻断 — no ready rubric → 409."""

    def test_returns_409_when_no_base_rows(self):
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=[],
            ready_view_rows=[],
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 409
        assert resp["error"] == "rubric_not_ready"

    def test_returns_409_when_base_exists_but_view_empty(self):
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=[_make_base_row()],
            ready_view_rows=[],  # version selected but no view rows
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 409
        assert resp["error"] == "rubric_not_ready"


class TestMultiVersionSelection:
    """12.2: 多版本选择 — multiple versions, latest by updated_at wins."""

    def test_selects_latest_version_by_updated_at(self):
        base_rows = [
            _make_base_row(extractor_version="v1", updated_at="2026-02-14T10:00:00Z"),
            _make_base_row(extractor_version="v2", updated_at="2026-02-15T10:00:00Z"),
        ]
        ready_rows = [
            _make_ready_point(source_version="v2:openai:gpt-4-turbo:p1"),
        ]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 200
        assert resp["rubric_source_version"] == "v2:openai:gpt-4-turbo:p1"

    def test_tiebreaker_uses_source_version_desc(self):
        ts = "2026-02-15T10:00:00Z"
        base_rows = [
            _make_base_row(extractor_version="v1", updated_at=ts),
            _make_base_row(extractor_version="v2", updated_at=ts),
        ]
        ready_rows = [
            _make_ready_point(source_version="v2:openai:gpt-4-turbo:p1"),
        ]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        # v2:... > v1:... lexicographically
        assert resp["rubric_source_version"] == "v2:openai:gpt-4-turbo:p1"

    def test_does_not_mix_versions(self):
        """Only rubric points from the selected version are used."""
        base_rows = [
            _make_base_row(extractor_version="v1", updated_at="2026-02-14T10:00:00Z"),
            _make_base_row(extractor_version="v2", updated_at="2026-02-15T10:00:00Z"),
        ]
        ready_rows = [
            _make_ready_point(
                rubric_id="r-v1", source_version="v1:openai:gpt-4-turbo:p1",
            ),
            _make_ready_point(
                rubric_id="r-v2", source_version="v2:openai:gpt-4-turbo:p1",
            ),
        ]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 200
        # Only v2 points should be used
        used_ids = {d["rubric_id"] for d in resp["decisions"]}
        assert "r-v2" in used_ids
        assert "r-v1" not in used_ids


class TestContractMissingBlocking:
    """12.2: 合同缺失阻断 — missing required fields → 422."""

    def test_returns_422_when_marks_missing(self):
        base_rows = [_make_base_row()]
        ready_rows = [_make_ready_point(marks=None)]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 422
        assert resp["error"] == "rubric_contract_invalid"
        assert any("marks" in v["missing_fields"] for v in resp["details"])

    def test_returns_422_when_kind_missing(self):
        base_rows = [_make_base_row()]
        ready_rows = [_make_ready_point(kind=None)]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 422
        assert resp["error"] == "rubric_contract_invalid"

    def test_returns_422_when_mark_label_missing(self):
        base_rows = [_make_base_row()]
        ready_rows = [_make_ready_point(mark_label=None)]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 422
        assert resp["error"] == "rubric_contract_invalid"

    def test_details_list_all_violations(self):
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(rubric_id="r1", marks=None, kind=None),
            _make_ready_point(rubric_id="r2", depends_on=None),
        ]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 422
        assert len(resp["details"]) == 2


class TestCompatModeResponse:
    """12.2: compat_mode 返回结构 — v0 mode adds alignments[]."""

    def test_compat_v0_includes_alignments(self):
        base_rows = [_make_base_row()]
        ready_rows = [_make_ready_point()]
        resp = simulate_evaluate_v1(
            request_body=_make_request(compat_mode="v0"),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 200
        assert "alignments" in resp
        assert isinstance(resp["alignments"], list)
        # One alignment per student step
        assert len(resp["alignments"]) == 2

    def test_compat_v0_alignment_has_required_fields(self):
        base_rows = [_make_base_row()]
        ready_rows = [_make_ready_point()]
        resp = simulate_evaluate_v1(
            request_body=_make_request(compat_mode="v0"),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        for a in resp["alignments"]:
            assert "step_id" in a
            assert "status" in a
            assert "confidence" in a
            assert "rubric_id" in a
            assert "mark_label" in a
            assert "reason" in a

    def test_default_mode_no_alignments(self):
        base_rows = [_make_base_row()]
        ready_rows = [_make_ready_point()]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert "alignments" not in resp

    def test_decisions_always_present_regardless_of_compat(self):
        base_rows = [_make_base_row()]
        ready_rows = [_make_ready_point()]
        resp = simulate_evaluate_v1(
            request_body=_make_request(compat_mode="v0"),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert "decisions" in resp
        assert len(resp["decisions"]) >= 1


# ═══════════════════════════════════════════════════════════════════════════════
# 12.3 — Auto-Write Linkage Scenarios
# ═══════════════════════════════════════════════════════════════════════════════

class TestAutoWriteSuccess:
    """12.3: 写入成功 — decisions with awarded=false produce user_errors rows."""

    def _make_multi_point_fixture(self):
        """Two rubric points: one high-match (awarded), one low-match (not awarded)."""
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(
                rubric_id="rp-m1",
                mark_label="M1",
                description="Correct method for differentiation",
                step_index=1,
            ),
            _make_ready_point(
                rubric_id="rp-a1",
                mark_label="A1",
                description="Completely unrelated topic about quantum physics",
                step_index=2,
            ),
        ]
        return base_rows, ready_rows

    def test_auto_write_creates_error_rows(self):
        base_rows, ready_rows = self._make_multi_point_fixture()
        store = MockUserErrorsStore()
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        assert resp["status_code"] == 200
        # At least one decision should be not-awarded → candidate for error write
        not_awarded = [d for d in resp["decisions"] if not d["awarded"]]
        assert len(not_awarded) >= 1
        assert resp["error_book_write_counts"]["candidates"] >= 1
        assert resp["error_book_write_counts"]["written"] >= 1

    def test_written_rows_have_correct_source(self):
        base_rows, ready_rows = self._make_multi_point_fixture()
        store = MockUserErrorsStore()
        simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        for row in store.rows:
            assert row["source"] == "mark_engine_auto"

    def test_written_rows_have_required_metadata(self):
        base_rows, ready_rows = self._make_multi_point_fixture()
        store = MockUserErrorsStore()
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        for row in store.rows:
            meta = row["metadata"]
            assert "decision_reason" in meta
            assert "rubric_id" in meta
            assert "run_id" in meta
            assert meta["run_id"] == resp["run_id"]
            assert "rubric_source_version" in meta
            assert "scoring_engine_version" in meta
            assert "mark_label" in meta

    def test_write_status_is_success(self):
        base_rows, ready_rows = self._make_multi_point_fixture()
        store = MockUserErrorsStore()
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        assert resp["error_book_write_status"] == "success"
        assert resp["error_book_write_counts"]["failed"] == 0

    def test_node_id_resolved_from_concept_links(self):
        base_rows, ready_rows = self._make_multi_point_fixture()
        store = MockUserErrorsStore()
        concept_links = [
            {"node_id": "node-abc", "source": "ai_agent_reclassify", "link_type": "primary"},
        ]
        simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
            concept_links=concept_links,
        )
        for row in store.rows:
            assert row["node_id"] == "node-abc"

    def test_node_id_null_when_no_concept_links(self):
        base_rows, ready_rows = self._make_multi_point_fixture()
        store = MockUserErrorsStore()
        simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
            concept_links=None,
        )
        for row in store.rows:
            assert row["node_id"] is None


class TestAutoWritePartialFailure:
    """12.3: 写入部分失败 — some writes succeed, some fail → partial status."""

    def test_partial_failure_status(self):
        base_rows = [_make_base_row()]
        # Three rubric points, all with low-match descriptions to ensure not-awarded
        ready_rows = [
            _make_ready_point(rubric_id="rp-ok", mark_label="M1",
                              description="Quantum entanglement theory", step_index=1),
            _make_ready_point(rubric_id="rp-fail", mark_label="A1",
                              description="Thermodynamic entropy analysis", step_index=2),
            _make_ready_point(rubric_id="rp-ok2", mark_label="B1",
                              description="Relativistic mass calculation", step_index=3),
        ]
        store = MockUserErrorsStore(fail_rubric_ids={"rp-fail"})
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        assert resp["status_code"] == 200  # main scoring still succeeds
        assert resp["error_book_write_status"] == "partial"
        assert resp["error_book_write_counts"]["failed"] >= 1
        assert resp["error_book_write_counts"]["written"] >= 1

    def test_main_scoring_succeeds_despite_write_failure(self):
        """Scoring response is 200 even when auto-write partially fails."""
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(rubric_id="rp-1", mark_label="M1",
                              description="Obscure topic not in student steps", step_index=1),
        ]
        store = MockUserErrorsStore(fail_rubric_ids={"rp-1"})
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        assert resp["status_code"] == 200
        assert "decisions" in resp
        assert resp["error_book_write_status"] == "failed"


class TestAutoWriteDedup:
    """12.3: 去重生效 — same run replayed → no duplicate rows (upsert idempotency)."""

    def test_replay_does_not_duplicate(self):
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(rubric_id="rp-dup", mark_label="M1",
                              description="Obscure topic xyz", step_index=1),
        ]
        store = MockUserErrorsStore()

        # First call
        resp1 = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        rows_after_first = len(store.rows)
        assert resp1["error_book_write_counts"]["written"] >= 1

        # Second call (replay) — same store, same data
        resp2 = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        rows_after_second = len(store.rows)

        # No new rows should be added
        assert rows_after_second == rows_after_first
        assert resp2["error_book_write_counts"]["deduped"] >= 1
        assert resp2["error_book_write_counts"]["written"] == 0

    def test_different_rubric_points_can_coexist(self):
        """Same storage_key but different rubric_ids should both be written."""
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(rubric_id="rp-a", mark_label="M1",
                              description="Topic alpha not in steps", step_index=1),
            _make_ready_point(rubric_id="rp-b", mark_label="A1",
                              description="Topic beta not in steps", step_index=2),
        ]
        store = MockUserErrorsStore()
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )
        # Both should be candidates (low match) and both written
        not_awarded = [d for d in resp["decisions"] if not d["awarded"]]
        assert len(not_awarded) >= 2
        assert resp["error_book_write_counts"]["written"] >= 2
        # Verify distinct rubric_ids in store
        stored_rids = {r["metadata"]["rubric_id"] for r in store.rows}
        assert "rp-a" in stored_rids
        assert "rp-b" in stored_rids

    def test_manual_and_auto_records_coexist(self):
        """Auto-write should not interfere with pre-existing manual records."""
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(rubric_id="rp-auto", mark_label="M1",
                              description="Unrelated topic for auto", step_index=1),
        ]
        store = MockUserErrorsStore()
        # Pre-populate a manual record for the same storage_key
        store.rows.append({
            "user_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "storage_key": "9709/s22/qp11/q01.png",
            "source": "manual",
            "q_number": 1,
            "metadata": {},
        })
        manual_count_before = len([r for r in store.rows if r["source"] == "manual"])

        simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=True,
            store=store,
        )

        manual_count_after = len([r for r in store.rows if r["source"] == "manual"])
        auto_count = len([r for r in store.rows if r["source"] == "mark_engine_auto"])

        # Manual record untouched
        assert manual_count_after == manual_count_before
        # Auto record added
        assert auto_count >= 1


# ═══════════════════════════════════════════════════════════════════════════════
# Additional edge-case coverage
# ═══════════════════════════════════════════════════════════════════════════════

class TestRequestValidation:
    """Request validation edge cases (mirrors JS handler)."""

    def test_rubric_points_in_request_returns_400(self):
        resp = simulate_evaluate_v1(
            request_body={**_make_request(), "rubric_points": [{"rubric_id": "r1"}]},
            rubric_base_rows=[],
            ready_view_rows=[],
        )
        assert resp["status_code"] == 400
        assert resp["error"] == "rubric_input_forbidden"

    def test_missing_user_id_returns_400(self):
        req = _make_request()
        del req["user_id"]
        resp = simulate_evaluate_v1(
            request_body=req,
            rubric_base_rows=[],
            ready_view_rows=[],
        )
        assert resp["status_code"] == 400
        assert resp["error"] == "missing_required_fields"


class TestDependencyHandling:
    """Decision engine dependency chain validation."""

    def test_dependency_not_met_cascades(self):
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(
                rubric_id="rp-m1", mark_label="M1",
                description="Unrelated topic xyz", step_index=1, depends_on=[],
            ),
            _make_ready_point(
                rubric_id="rp-a1", mark_label="A1",
                description="Also unrelated abc", step_index=2, depends_on=["rp-m1"],
            ),
        ]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 200
        d_map = {d["rubric_id"]: d for d in resp["decisions"]}
        # M1 not awarded (low match) → A1 should be dependency_not_met
        if not d_map["rp-m1"]["awarded"]:
            assert d_map["rp-a1"]["reason"] == "dependency_not_met"
            assert d_map["rp-a1"]["awarded"] is False

    def test_missing_dependency_triggers_error(self):
        base_rows = [_make_base_row()]
        ready_rows = [
            _make_ready_point(
                rubric_id="rp-a1", mark_label="A1",
                description="Some topic", step_index=1,
                depends_on=["rp-nonexistent"],
            ),
        ]
        resp = simulate_evaluate_v1(
            request_body=_make_request(),
            rubric_base_rows=base_rows,
            ready_view_rows=ready_rows,
            auto_write_enabled=False,
        )
        assert resp["status_code"] == 200
        d = resp["decisions"][0]
        assert d["reason"] == "dependency_error"
        assert d["awarded"] is False
