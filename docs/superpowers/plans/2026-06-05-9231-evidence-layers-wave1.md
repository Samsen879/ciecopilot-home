# 9231 Evidence Layers Wave1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four missing evidence layers for the 16 selected 9231 wave1 shards with explicit user authorization for external VLM/API calls and costs, while avoiding unproven DB/search/RAG claims.

**Architecture:** Add a VLM-backed visual review runner under `scripts/vlm/`, then deterministic layer builders under `scripts/learning/`, each with focused tests and durable JSON/Markdown reports under `docs/reports/`. Surface manifests receive explicit per-layer status fields; final production readiness remains machine-gated.

**Tech Stack:** Python Qwen/DashScope OpenAI-compatible VLM client, Node.js ESM scripts, Jest, local `pdfjs-dist` text layer, existing 9231 shard/crop manifests.

---

## Chunk 1: Visual Review Layer

**Files:**
- Create: `scripts/vlm/run_9231_visual_review_wave1_vlm.py`
- Create: `tests/test_run_9231_visual_review_wave1_vlm.py`
- Create: `scripts/learning/build_9231_visual_review_wave1_gate.js`
- Create: `scripts/learning/__tests__/build-9231-visual-review-wave1-gate.test.js`
- Modify: selected `data/manifests/9231_*_page_chain_surface_v1.json`
- Create: `docs/reports/2026-06-05-9231-*-visual-review-closeout.{json,md}`
- Create: `docs/reports/2026-06-05-9231-visual-review-wave1-gate.{json,md}`

- [x] Write failing tests for VLM request/provenance and deterministic disposition merging.
- [x] Implement VLM stack-image review using `qwen_openai_client_v1`.
- [x] Generate per-shard visual review reports.
- [x] Verify 441/441 visual rows accepted only when VLM and crop/render evidence agree.

## Chunk 2: Question Plain Text v1/v2

**Files:**
- Create: `scripts/learning/build_9231_question_plain_text_v1.js`
- Create: `scripts/learning/__tests__/build-9231-question-plain-text-v1.test.js`
- Create: `docs/reports/2026-06-05-9231-question-plain-text-v1.json`
- Create: `docs/reports/2026-06-05-9231-question-plain-text-v1-coverage.md`
- Create: `docs/reports/2026-06-05-9231-question-plain-text-v2.json`
- Create: `docs/reports/2026-06-05-9231-question-plain-text-v2-coverage.md`

- [x] Write failing tests for pdfjs page-range text extraction and normalized text output.
- [x] Extract conservative per-row plain text from local PDF text layer.
- [x] Split `text_only_ready` and `image_context_required`.
- [x] Verify all 441 selected rows receive `normalized_plain_text`.

## Chunk 3: Authority Alignment

**Files:**
- Create: `scripts/learning/build_9231_authority_alignment_wave1.js`
- Create: `scripts/learning/__tests__/build-9231-authority-alignment-wave1.test.js`
- Create: `docs/reports/2026-06-05-9231-authority-alignment-wave1.json`
- Create: `docs/reports/2026-06-05-9231-authority-alignment-wave1.md`

- [x] Write failing tests for deterministic 9231 paper/component authority paths.
- [x] Build authority sidecars from paper/component plus extracted text signals.
- [x] Mark unresolved detailed-topic gaps explicitly without guessing.
- [x] Verify 441/441 rows have authority sidecar records.

## Chunk 4: Local Consumption Gate

**Files:**
- Create: `scripts/learning/run_9231_question_plain_text_v2_consumption_gate.js`
- Modify: `scripts/learning/lib/question-plain-text-v2-consumption.js`
- Create: `scripts/learning/__tests__/run-9231-question-plain-text-v2-consumption-gate.test.js`
- Create: `docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json`
- Create: `docs/reports/2026-06-05-9231-question-plain-text-v2-consumption-gate.md`

- [x] Write failing tests proving search/read-model/RAG rows prefer `normalized_plain_text`.
- [x] Generate local consumption rows for 441 selected questions.
- [x] Preserve `text_only_ready` and `image_context_required` in consumption output.
- [x] Verify no fallback to legacy search-text-only fields.

## Chunk 5: Final Closeout

- [x] Run final evidence-layers wave1 gate after layers are present; keep `production_ready_claimed=false` and avoid live DB/deployed search/online RAG claims.
- [x] Update `docs/reports/INDEX.md`.
- [x] Run focused Jest, machine closure validation, preflight, and `git diff --check`.
- [ ] Commit, push, open PR, wait for checks, and merge.
