# Phase B Production Evidence Ready-Ingest Pilot Design

Date: 2026-03-13
Scope: backend RAG only
Status: implemented-and-validated

## Goal

Advance Phase B from governance-only validation into one tightly scoped real pilot that proves:

1. a real `production_evidence` bundle can be governance-valid
2. the same bundle can become `release_ready = true`
3. the same bundle can become `ingest_permitted = true`
4. the bundle can then be written into Supabase through the existing canonical chunk path

This slice still does not activate `production_evidence` as a live retrieval source.

Current boundary:

- live write into Supabase: implemented
- post-write audit: implemented
- default online retrieval exposure: blocked by retrieval-side exclusion of `evidence_authored`, `evidence_transformed`, and `evidence_reserved` unless explicitly cleared

## Locked Facts

Current Phase B has already established:

- a distinct `production_evidence` policy mode
- a manifest validator
- a whitelist
- a release gate
- an ingest preflight
- a governance status summary
- a unified governance preflight

The checked-in seed bundle remains intentionally non-ingestable:

- `bundle_status = governance_seed_only`
- whitelist posture is `release_channel = offline_governance_only`
- `ingest_allowed = false`
- `release_ready_expected = false`

Those facts are fixed in:

- `data/evidence/production/seed_v1/manifest.json`
- `data/evidence/production/whitelist_v1.json`
- `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`
- `runs/backend/rag_phase_b_production_evidence_governance_status.json`
- `runs/backend/rag_phase_b_production_evidence_governance_preflight.json`

The repo also already has a canonical chunk write path:

- `scripts/rag/lib/canonical-chunks.js`
- `scripts/rag_ingest.js`
- `api/lib/supabase/client.js`

So the missing proof is no longer governance. The missing proof is a controlled real bundle ingest.

## Why This Slice Now

Without this slice, Phase B remains structurally correct but operationally incomplete.

We would know that:

- the governance box is valid
- the whitelist / release gate / preflight chain works

But we would still not know that:

- a real authored / transformed bundle can satisfy the stronger ready-for-ingest posture
- a real bundle can survive dry-run, write, and write-audit
- the new layer can write to Supabase without being confused with `restricted_official`, `note_md`, or the generic research ingest path

That makes this slice the correct bridge from "governance infrastructure" to "real backend evidence asset".

## Approaches Considered

### Option A: Dedicated Pilot Writer, No Retrieval Wiring

Create one real pilot bundle, whitelist it as `ready_for_ingest`, add a dedicated `production_evidence` ingest runner, and verify successful Supabase writes plus post-write audit.

Pros:

- keeps the pilot isolated from existing note/pdf ingest flows
- cleanest way to prove the new layer can stand on its own
- lowest risk of mixing `production_evidence` with `restricted_official`
- does not prematurely activate live retrieval; retrieval defaults exclude pilot source types until an explicit opt-in is added

Cons:

- introduces a small dedicated writer path
- later integration into broader retrieval flows still remains future work

### Option B: Extend Generic `rag_ingest.js`

Teach the existing ingestion script to accept `production_evidence` manifests directly.

Pros:

- fewer top-level scripts
- reuses an already-proven write path

Cons:

- increases the risk of mixing research / note / pdf flows with the new layer
- makes the first real pilot harder to reason about
- creates more branchy logic inside a large script

### Option C: Pilot Ingest Plus Immediate Retrieval Activation

Build the real pilot bundle, write it to Supabase, and immediately connect it to retrieval.

Pros:

- fastest path to visible product impact

Cons:

- collapses two separate risks into one change
- makes it harder to distinguish ingest correctness from retrieval behavior
- violates the current Phase B boundary that the new layer is not yet a live retrieval source

## Recommended Design

Choose Option A.

This gives Phase B its first real operational proof while preserving the current no-live-retrieval boundary.

In plain terms:

- write to Supabase: yes
- promote to live retrieval: not yet, because retrieval now defaults to excluding `production_evidence` source types until an explicit opt-in is added

That keeps the experiment interpretable.

## Pilot Scope

### 1. Real Pilot Bundle

The implemented real pilot bundle lives under `data/evidence/production/pilot_ready_v1/`.

Recommended posture:

- single-subject first
- small item count
- mixed authored + transformed items
- human-reviewed content

Recommended size:

- `5-20` items total

Recommended first rollout shape:

- `subject_scope = single_subject`
- one subject code only
- all items marked `review.status = approved`

The goal of the first pilot is not broad coverage. The goal is operational proof with minimal blast radius.

### 2. Keep The Governance Seed Untouched

Do not mutate the existing seed into a real bundle.

The seed stays as:

- governance-only
- non-ingestable
- non-release-ready

This preserves the clean distinction between:

- the box test
- the first real asset

## Ready-For-Ingest Contract

The pilot bundle must satisfy everything the governance seed satisfies, plus these extra conditions:

- whitelist entry uses `release_channel = ready_for_ingest`
- whitelist entry sets `ingest_allowed = true`
- whitelist entry sets `release_ready_expected = true`
- manifest `bundle_status` is no longer `governance_seed_only`
- every pilot item uses `review.status = approved`
- no reserved source types are active
- no `note_md`
- no `data-notes`
- no `past_paper_pdf` / `mark_scheme_pdf` as active evidence
- transformed items continue to use official materials only as provenance context

The release gate should become the point that distinguishes:

- governance-valid but not ingestable
- governance-valid and ready-for-ingest

## Dedicated Ingest Path

The pilot uses one dedicated runner instead of extending the generic ingestion path first.

Recommended shape:

- `scripts/rag/run_production_evidence_ingest.js`

The runner should:

1. load manifest + items
2. load whitelist
3. run unified governance preflight first
4. abort unless `governance_valid = true`, `release_ready = true`, and `ingest_permitted = true`
5. build canonical chunk rows for each pilot item
6. write to Supabase through the existing canonical chunk helpers
7. emit a full JSON / Markdown ingest summary

This runner must support:

- `--dry-run`
- `--manifest`
- `--whitelist`
- `--corpus-version`
- optional explicit output paths

## Canonical Row Mapping

The pilot writer should reuse the existing canonical write machinery rather than invent a second storage shape.

Each `production_evidence` item should map to canonical chunk rows as follows:

- `source_type` stays `evidence_authored` or `evidence_transformed`
- `syllabus_code` comes from `subject_code`
- one canonical row is produced per `topic_path`
- `topic_path` is the concrete target topic path
- `source_ref` must include stable pilot metadata so identity is deterministic

Recommended `source_ref` fields:

- `bundle_id`
- `evidence_id`
- `subject_code`
- `topic_path`
- `review_status`
- `provenance_method`
- compact upstream ref ids for transformed evidence

Using one row per `topic_path` avoids ambiguous multi-topic writes while keeping the mapping auditable.

## Environment And Safety

Live write mode requires:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or equivalent existing service-role path
- one embedding provider key through the existing non-OpenAI-first env contract

This slice must not make `OPENAI_API_KEY` mandatory.

The writer must fail closed when:

- Supabase service credentials are missing
- embedding credentials are missing in live mode
- governance preflight is not fully green

`--dry-run` should still work without performing any DB write.

## Post-Write Audit

Do not treat "insert returned success" as sufficient proof.

The pilot emits one post-write audit artifact that records:

- attempted rows
- inserted rows
- updated rows
- skipped existing rows
- chunk ids returned by Supabase
- subject codes written
- source types written
- corpus version used

Optionally add a dedicated readback audit runner that re-queries the inserted ids and verifies:

- `source_type`
- `source_ref`
- `corpus_version`
- `topic_path`
- `content_hash`

The first real pilot is only complete after this audit exists.

## Reporting Outputs

The pilot slice should emit:

- one ingest JSON summary
- one ingest Markdown report
- one post-write audit JSON summary
- one post-write audit Markdown report

These artifacts are the current evidence trail for release review and later paper-quality evidence accumulation.

## File Strategy

Implemented files:

- `data/evidence/production/pilot_ready_v1/manifest.json`
- `data/evidence/production/pilot_ready_v1/items.json`
- `scripts/rag/lib/production-evidence-ingest.js`
- `scripts/rag/lib/production-evidence-post-write-audit.js`
- `scripts/rag/run_production_evidence_ingest.js`
- `scripts/rag/run_production_evidence_post_write_audit.js`
- `scripts/rag/__tests__/production-evidence-ingest.test.js`
- `scripts/rag/__tests__/production-evidence-post-write-audit.test.js`

Recommended modified files:

- `data/evidence/production/whitelist_v1.json`
- `scripts/rag/lib/production-evidence-release-gate.js`
- `scripts/rag/lib/production-evidence-governance-preflight.js`
- `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`

## Non-Goals

- no frontend integration
- no `supabase/migrations/*.sql`
- no live retrieval activation changes beyond the default retrieval-side exclusion that keeps the pilot out of online results
- no relabeling of `restricted_official` as public production evidence
- no promotion of `note_md` / `data-notes`
- no broad multi-subject production evidence rollout in the first pilot

## Success Criteria

This slice is successful only if all of the following are true:

1. the governance seed still remains blocked
2. the new pilot bundle becomes `governance_valid = true`
3. the new pilot bundle becomes `release_ready = true`
4. the new pilot bundle becomes `ingest_permitted = true`
5. dry-run produces the expected canonical rows
6. live run writes rows into Supabase through the canonical path
7. post-write audit confirms the written rows match the pilot bundle
8. no live retrieval activation is introduced in the same change, and retrieval-side exclusion remains enabled by default
