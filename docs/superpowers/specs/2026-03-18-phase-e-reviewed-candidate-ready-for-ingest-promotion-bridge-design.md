# Phase E Reviewed Candidate To Ready-For-Ingest Promotion Bridge Design

Date: 2026-03-18
Scope: backend RAG only
Status: proposed
Worktree: `phase-e-next`

## Goal

Bridge the Phase D reviewed `governance_seed_only` candidate surface into the existing Phase B governance chain so that a valid reviewed candidate can become a real `pilot_ready_for_ingest` bundle plus a real canonical whitelist entry without any manual whitelist editing.

This slice stops at "ready to be ingested / ready to be considered for rollout".
It does not perform rollout.

In concrete terms, the bridge must:

1. accept a reviewed candidate bundle from the Phase D flow
2. materialize a new `pilot_ready_*` bundle under `data/evidence/production/`
3. update the canonical `data/evidence/production/whitelist_v1.json` in a constrained, atomic, idempotent way
4. prove the new bundle is `release_ready = true` and `ingest_permitted = true` through the existing Phase B validation chain
5. emit a tracked promotion receipt for audit and rollback guidance
6. explicitly avoid touching the retrieval rollout gate

## Locked Facts

Current repository state already establishes the following:

- Phase D shipped a real reviewed-candidate bridge surface in:
  - `scripts/rag/lib/evidence-draft-review.js`
  - `scripts/rag/lib/evidence-draft-promotion-candidate.js`
  - `scripts/rag/run_evidence_draft_review_scaffold.js`
  - `scripts/rag/run_evidence_draft_promotion_candidate.js`
- The Phase D candidate surface currently stops at:
  - reviewed `production_evidence_bundle`
  - `bundle_status = governance_seed_only`
  - no whitelist mutation
  - no rollout mutation
- The tracked Phase B governance truth still lives in checked-in source files, not in ignored runtime outputs:
  - `data/evidence/production/seed_v1/manifest.json`
  - `data/evidence/production/pilot_ready_v1/manifest.json`
  - `data/evidence/production/whitelist_v1.json`
  - `data/evidence/production/rollout_gate_v1.json`
- The current tracked rollout gate still only makes `9702` online.
- Local `runs/backend/**` artifacts may contain richer or newer state, but they are ignored outputs and must not be treated as the source of truth for this slice.
- `S2 advisory_only` remains locked by `runs/backend/rag_s2_release_decision.json`.
- `S1` remains the default production route.
- The telemetry audit now exposes a concrete evidence-gap target:
  - `9231.2` is already flagged as a repeated `S2_EMPTY_EVIDENCE` hotspot
  - the recommended owner surface is `data/evidence/production`

Those facts fix the architectural boundary:

- rollout stays explicit and manual
- bridge automation may mutate governance-ready tracked inputs
- rollout-ready or online-ready does not imply rollout-applied

## Why This Slice Now

Without this slice, the repository has all of the pieces needed to produce a legitimate reviewed candidate, but the final hop into the real governance chain is still manual.

That manual gap has three concrete costs:

1. operators still have to hand-edit the canonical whitelist
2. the reviewed candidate remains a practical island even though it is structurally valid
3. the first real telemetry-driven evidence-gap closure still depends on bespoke human intervention rather than a repeatable backend path

This makes Phase E the correct next bridge:

- Phase B already proved governance and ready-for-ingest posture
- Phase D already proved reviewed candidate compilation
- telemetry already supplies a real backlog signal for `9231.2`

So the missing system capability is not more reporting and not more routing work.
The missing capability is a safe promotion bridge from "reviewed candidate exists" to "ready-for-ingest bundle exists in the canonical governance plane".

## Approaches Considered

### Option A: Canonical Bridge

Default behavior:

- read a reviewed candidate
- write a real `pilot_ready_*` bundle
- update the canonical `whitelist_v1.json`
- emit a promotion receipt
- do not touch `rollout_gate_v1.json`

Pros:

- closes the actual operational gap
- removes the last mandatory manual whitelist edit
- keeps rollout as a separate explicit human action
- aligns exactly with the desired architecture boundary: automation goes to `ready_for_ingest`, not to `online_enabled`

Cons:

- the tool is now allowed to mutate tracked governance inputs
- idempotency and conflict detection must be strong

### Option B: Proposal-First Bridge

Default behavior:

- build promotion outputs
- write only proposal artifacts
- require a later human apply step to update the real whitelist and bundle paths

Pros:

- slightly more conservative
- fewer direct tracked writes in the default mode

Cons:

- keeps the last-mile governance step manual
- preserves the same operator friction that currently makes Phase D a practical island
- creates unnecessary drift risk between proposal text and canonical governance files

### Option C: Promotion Ledger Plus Derived Whitelist

Default behavior:

- append a promotion event or ledger record
- regenerate whitelist from the ledger in a second step

Pros:

- elegant append-only audit shape
- strong historical traceability

Cons:

- introduces a new derived-governance layer that does not currently exist
- conflicts with the decision to keep one canonical whitelist file
- over-designs the problem

## Recommended Design

Choose Option A.

Phase E should implement one canonical promotion bridge whose default behavior is:

1. promote a reviewed candidate into a real `pilot_ready_*` bundle
2. atomically update the canonical whitelist
3. emit a tracked promotion receipt
4. verify the result through the existing manifest, whitelist, release-gate, and ingest-preflight chain
5. leave rollout untouched

The same bridge also supports two restricted modes:

- `--dry-run`
- `--proposal-only`

But those are constrained views of the same bridge, not separate workflows.

## Scope Boundary

This slice stays strictly inside backend RAG governance.

It includes:

- reviewed candidate loading
- target `pilot_ready_*` bundle materialization
- canonical whitelist upsert
- promotion receipt generation
- in-memory and post-write self-validation through existing Phase B governance checks
- deterministic conflict detection

It explicitly excludes:

- rollout gate mutation
- online retrieval activation
- live ingest execution
- Supabase writes
- `S2` route changes
- `S1` default-route changes
- `runs/backend/**` as a truth source
- versioned whitelist files or whitelist indirection layers

## Core Contract

### Default Responsibility

The bridge is responsible for making a reviewed candidate become:

- a tracked `pilot_ready_for_ingest` bundle
- a tracked canonical whitelist entry with:
  - `release_channel = ready_for_ingest`
  - `ingest_allowed = true`
  - `release_ready_expected = true`

The bridge is not responsible for making that bundle become:

- `online_enabled`
- present in `rollout_gate_v1.json`
- live in retrieval

### Canonical Governance Rule

The canonical whitelist remains one file:

- `data/evidence/production/whitelist_v1.json`

Phase E must update that file in place, under strict constraints, rather than generating a new versioned whitelist file.

### Rollout Rule

The bridge must never mutate:

- `data/evidence/production/rollout_gate_v1.json`

That separation is the central guardrail of the slice.

## Input Contract

The bridge input is a reviewed candidate bundle, not a draft bundle.

### Required Candidate Properties

The source candidate must already be a valid `production_evidence_bundle` and must satisfy:

- `bundle_status = governance_seed_only`
- `review.status = approved`
- no active reserved source types
- allowed source types remain inside the Phase B contract
- all items remain inside the production-evidence manifest contract

The bridge must not accept:

- draft bundles that have not been reviewed
- bundles missing item-level review traceability
- bundles that already claim `pilot_ready_for_ingest`
- bundles requiring rollout-gate knowledge to become valid

### Required Operator Inputs

The bridge must require explicit operator intent for the new ready bundle:

- source candidate path:
  - `--candidate-dir`
  - or explicit `--manifest` plus `--items-json`
- target bundle id:
  - `--target-bundle-id`
- one or more approved corpus versions for the whitelist entry:
  - `--approved-corpus-version`
- optional source review identifier when the current candidate surface does not persist it:
  - `--source-review-id`

The design intentionally keeps these explicit.
The tool should not invent corpus versions or promotion identities.

### Default Path Resolution

Default canonical targets:

- bundle directory:
  - `data/evidence/production/<target-bundle-id>/`
- whitelist:
  - `data/evidence/production/whitelist_v1.json`

Optional explicit output overrides may exist for testing, but the default path should be the canonical tracked path.

## Output Contract

### 1. Target Bundle

The bridge writes a new tracked bundle under:

- `data/evidence/production/<target-bundle-id>/manifest.json`
- `data/evidence/production/<target-bundle-id>/items.json`

This bundle is a new artifact.
The bridge must never mutate the source reviewed candidate in place.

### 2. Canonical Whitelist Upsert

The bridge updates:

- `data/evidence/production/whitelist_v1.json`

The update must:

- add or reconcile exactly one entry for the target bundle
- update `allowed_bundle_ids`
- update `allowed_manifest_paths`
- preserve unrelated existing entries
- preserve top-level `allowed_source_types`
- preserve top-level `reserved_source_types`
- preserve `required_restricted_official_posture`

### 3. Promotion Receipt

The bridge writes a tracked promotion receipt that becomes the durable audit record for the promotion.

Recommended default tracked receipt paths:

- JSON:
  - `data/evidence/production/receipts/<target-bundle-id>_promotion_receipt.json`
- Markdown:
  - `docs/reports/rag_phase_e_<target-bundle-id>_promotion_receipt.md`

The receipt is part of source control.
It is not a `runs/backend/**` artifact.

## Promotion Semantics

### Candidate To Pilot-Ready Manifest Mapping

The target bundle should preserve the validated candidate content shape and only make the minimal posture changes required for ready-for-ingest governance.

Fields preserved from candidate:

- `manifest_role`
- `evidence_layer`
- `policy_mode`
- `schema_version`
- `subject_scope`
- `subject_codes`
- `language`
- `declared_source_types`
- `enabled_source_types`
- `allowed_source_types`
- `reserved_source_types`
- `restricted_official_posture`
- review owner / approved posture

Fields changed for the target bundle:

- `bundle_id` -> explicit target bundle id
- `generated_at` -> promotion execution time
- `bundle_status` -> `pilot_ready_for_ingest`
- `items_file` -> `items.json`
- `bundle_item_count` -> recomputed from target items
- `notes` -> append a concise promotion note that names the source candidate and receipt

The bridge should avoid widening the manifest schema unless strictly necessary.
Receipt-level traceability is preferred over adding a second audit layer into the bundle schema.

### Item Mapping

Items should be copied forward from the reviewed candidate as-is except for deterministic metadata normalization needed to keep the target bundle valid.

The bridge must preserve:

- `evidence_id`
- `source_type`
- `subject_code`
- `title`
- `statement`
- `topic_paths`
- `provenance`
- `review`
- `review_trace`

The bridge must not silently rewrite evidence content during promotion.
Content changes belong in the review stage, not in the promotion stage.

### Whitelist Entry Mapping

The whitelist entry derived from the promoted bundle must set:

- `bundle_id = <target-bundle-id>`
- `manifest_path = data/evidence/production/<target-bundle-id>/manifest.json`
- `subject_scope` from the promoted bundle
- `subject_codes` from the promoted bundle
- `allowed_source_types` from the promoted bundle
- `approved_corpus_versions` from explicit operator input
- `release_channel = ready_for_ingest`
- `ingest_allowed = true`
- `release_ready_expected = true`

The bridge must not:

- widen `allowed_source_types`
- add `evidence_reserved`
- create a whitelist entry with empty `approved_corpus_versions`
- mutate unrelated entries

## Canonical Whitelist Update Rules

### Single-File Policy

The whitelist remains one canonical file.
No versioned whitelist variants should be created for normal bridge execution.

### Deterministic Upsert

The bridge should treat the whitelist update as a deterministic upsert by `bundle_id`.

If no matching entry exists:

- insert one new entry

If a matching entry exists and is byte-equivalent to the computed target entry:

- treat the run as an idempotent replay

If a matching entry exists but differs from the computed target entry:

- fail closed with an explicit whitelist-conflict error

The bridge must not silently overwrite a non-equivalent existing entry.

### Top-Level Array Reconciliation

`allowed_bundle_ids` and `allowed_manifest_paths` must be rebuilt from the final entry set rather than hand-appended.

Recommended deterministic ordering:

- stable lexical order by `bundle_id` for entries
- top-level ids and manifest paths derived from that sorted entry set

This keeps diffs predictable and prevents duplicate or stale top-level references.

## Atomicity And Idempotency

### Validation Before Tracked Writes

Before writing any canonical files, the bridge must build the complete target state in memory and verify:

1. source candidate is valid
2. promoted manifest is valid
3. synthesized whitelist is valid
4. release gate result is `release_ready = true`
5. ingest preflight result is `ingest_permitted = true`

If any of these fail, the bridge must not modify tracked canonical governance files.

### Write Ordering

The bridge should stage writes in this order:

1. build target bundle files in a temporary staging directory
2. atomically move or materialize the final target bundle directory
3. atomically replace the canonical whitelist file via temp-file swap
4. write the promotion receipt last

This ordering keeps the semantic activation point clear:

- a staged or newly materialized bundle is inert by itself
- the canonical whitelist update is the governance activation step
- the receipt records only a completed promotion

### Idempotent Replay Rules

Re-running the bridge with the same candidate, same target bundle id, same corpus versions, and same canonical whitelist state should succeed without changing semantic output.

Acceptable replay outcomes:

- target bundle already exists and is identical
- whitelist entry already exists and is identical
- receipt already exists and is identical

Replay must fail if any existing tracked output conflicts with the computed target.

## Validation Chain

Phase E must reuse the existing governance chain rather than inventing a new one.

The bridge should call or reuse:

- `validateProductionEvidenceManifest`
- `validateProductionEvidenceWhitelist`
- `buildProductionEvidenceReleaseGate`
- `buildProductionEvidenceGovernancePreflight` or the existing ingest-preflight contract

The bridge success condition is:

- manifest valid
- whitelist valid
- `release_ready = true`
- `ingest_permitted = true`

The bridge must not require:

- rollout-gate validation
- online verification artifacts
- `runs/backend/**` evidence

## Promotion Receipt Design

The promotion receipt is the durable audit contract for the bridge.

### Receipt Purpose

It should answer:

- what source candidate was promoted
- what target ready-for-ingest bundle was produced
- what whitelist mutation occurred
- what corpus versions were approved
- whether the existing Phase B governance chain passed
- what files would need to be reverted if the promotion must be undone
- whether rollout was touched

### Recommended Receipt Fields

The JSON receipt should include at least:

- `schema_version`
- `stage`
- `promotion_id`
- `mode`
- `promoted_at`
- `source_candidate`
  - `bundle_id`
  - `manifest_path`
  - `items_path`
  - `bundle_status`
  - `source_review_id`
- `target_bundle`
  - `bundle_id`
  - `bundle_dir`
  - `manifest_path`
  - `items_path`
  - `bundle_status`
  - `subject_codes`
- `whitelist_update`
  - `path`
  - `action`
  - `before_hash`
  - `after_hash`
- `approved_corpus_versions`
- `validation`
  - `manifest_valid`
  - `whitelist_valid`
  - `release_ready`
  - `ingest_permitted`
- `rollout_gate`
  - `touched = false`
  - `path = data/evidence/production/rollout_gate_v1.json`
- `rollback_guidance`
  - `strategy = git_restore_or_revert`
  - `paths`

The Markdown receipt should summarize the same information for human review.

### Rollback Model

Phase E rollback is intentionally Git-based, not runtime-automatic.

Rollback should mean:

- revert the target bundle files
- revert the canonical whitelist mutation
- revert the receipt itself if desired

The receipt exists to make that rollback obvious and auditable.
It is not an authorization to mutate rollout automatically.

## Modes

### Default Apply Mode

Default mode performs the real bridge:

- writes canonical `pilot_ready_*`
- writes canonical whitelist update
- writes tracked receipt

### `--dry-run`

`--dry-run` performs all parsing and validation but does not write canonical outputs.

Allowed outputs in `--dry-run`:

- stdout summary
- optional explicit preview JSON / Markdown reports outside canonical governance paths

`--dry-run` must never create:

- a canonical bundle dir
- a canonical whitelist edit
- a tracked promotion receipt

### `--proposal-only`

`--proposal-only` is a write-preview mode for human inspection.

It should:

- build the exact target bundle and whitelist mutation in memory
- write preview outputs into an explicit proposal directory
- emit a proposal receipt preview

It must not:

- write the canonical target bundle
- write the canonical whitelist
- write a tracked canonical receipt

`--proposal-only` should require an explicit proposal output directory to avoid accidental writes into tracked canonical paths.

## First Real Target

The first real execution target should be telemetry-driven rather than synthetic.

Recommended first real target:

- subject: `9231`
- evidence-gap focus: `9231.2`
- shape: single-subject `pilot_ready_*`

This is the right proving ground because:

- telemetry already names it as a repeated evidence gap
- it exercises the real backlog rather than a toy fixture
- it gives the first bridge pass a concrete operator story:
  - reviewed candidate exists
  - bridge makes it ready for ingest
  - rollout still remains a separate explicit decision

The spec remains generic, but the initial execution should be judged against a real `9231` candidate, not only a fixture bundle.

## File Strategy

Recommended new focused units:

- `scripts/rag/lib/production-evidence-promotion-bridge.js`
- `scripts/rag/lib/production-evidence-promotion-receipt.js`
- `scripts/rag/run_production_evidence_promotion_bridge.js`
- `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`
- `scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js`

Recommended focused edits:

- `scripts/rag/lib/production-evidence-whitelist.js`
  - add deterministic upsert helpers or expose normalized serialization helpers
- possibly `scripts/rag/lib/production-evidence-governance-preflight.js`
  - only if a bridge-specific in-memory reuse hook is needed

Expected tracked outputs for the first real promotion:

- `data/evidence/production/<target-bundle-id>/manifest.json`
- `data/evidence/production/<target-bundle-id>/items.json`
- `data/evidence/production/whitelist_v1.json`
- `data/evidence/production/receipts/<target-bundle-id>_promotion_receipt.json`
- `docs/reports/rag_phase_e_<target-bundle-id>_promotion_receipt.md`

## Testing Strategy

This slice should be tested entirely from tracked fixtures and temporary workspaces.

The test contract must not depend on:

- ignored `runs/backend/**` outputs
- local-only rollout artifacts
- external database state

### Required Test Layers

1. library tests for candidate-to-pilot-ready manifest mapping
2. library tests for whitelist upsert behavior
3. conflict tests for non-equivalent existing bundle / whitelist state
4. idempotent replay tests
5. receipt tests
6. CLI tests for:
   - default apply mode
   - `--dry-run`
   - `--proposal-only`
   - explicit path handling
   - conflict exit codes
7. regression tests proving rollout gate files are never modified

### Required Failure Cases

The bridge must fail closed when:

- candidate bundle status is not `governance_seed_only`
- candidate review is incomplete or not approved
- source bundle uses invalid source types
- target bundle already exists with different content
- whitelist already contains a conflicting entry
- `approved_corpus_versions` are missing
- release gate does not return `release_ready = true`
- ingest preflight does not return `ingest_permitted = true`

## Non-Goals

- no automatic rollout
- no rollout-gate edits
- no live ingest execution
- no database writes
- no S2 route or policy changes
- no S1 default-route changes
- no versioned whitelist fan-out
- no dependence on ignored runtime artifacts as governance truth

## Success Criteria

Phase E is successful only if all of the following are true:

1. a reviewed Phase D candidate can become a real tracked `pilot_ready_for_ingest` bundle without manual whitelist editing
2. the canonical whitelist can be updated in place through a constrained, deterministic, idempotent bridge
3. the resulting bundle passes the existing manifest, whitelist, release-gate, and ingest-preflight contracts
4. the bridge does not touch `rollout_gate_v1.json`
5. the bridge does not alter `S2 advisory_only`
6. the bridge does not alter the `S1` default route
7. the bridge produces a tracked promotion receipt that is sufficient for Git-based rollback guidance
8. the first real telemetry-driven evidence-gap candidate can travel through the same path without bespoke manual governance edits
