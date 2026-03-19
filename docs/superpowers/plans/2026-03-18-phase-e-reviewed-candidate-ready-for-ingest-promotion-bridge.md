# Phase E Reviewed Candidate To Ready-For-Ingest Promotion Bridge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic bridge that promotes a reviewed `governance_seed_only` candidate into a tracked `pilot_ready_for_ingest` bundle, atomically upserts the canonical whitelist, emits a tracked promotion receipt, and never touches the rollout gate.

**Architecture:** Implement the bridge as a pure promotion library plus a thin CLI wrapper. Reuse the existing Phase B manifest, whitelist, release-gate, and ingest-preflight chain for all validation, expose deterministic whitelist upsert and receipt helpers, and run all tests in temp workspaces seeded from tracked fixtures. Because the current CLI suites in this area use child-process spawning that hits `EPERM` in this harness, first stabilize the nearby CLI tests around direct `main(argv)` invocation with captured stdio, then reuse that pattern for the new bridge CLI.

**Tech Stack:** Node.js ESM, Jest, existing `scripts/rag/lib/*` governance validators, JSON manifests, temp-workspace filesystem tests

---

## File Map

- Create: `scripts/rag/lib/production-evidence-promotion-bridge.js`
  Purpose: Build target `pilot_ready_*` bundle state, synthesize whitelist entry mutations, run in-memory governance validation, and execute `apply` / `dry-run` / `proposal-only` bridge modes.
- Create: `scripts/rag/lib/production-evidence-promotion-receipt.js`
  Purpose: Build and render the tracked promotion receipt JSON / Markdown payloads.
- Create: `scripts/rag/run_production_evidence_promotion_bridge.js`
  Purpose: Parse CLI args, resolve paths, invoke the bridge lib, and set exit codes.
- Create: `scripts/rag/__tests__/helpers/cli-main-harness.js`
  Purpose: Invoke exported CLI `main(argv)` functions inside temp workspaces without `spawnSync`.
- Create: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`
  Purpose: Red/green coverage for candidate-to-pilot-ready synthesis, whitelist upsert, conflicts, idempotency, and apply-mode invariants.
- Create: `scripts/rag/__tests__/production-evidence-promotion-receipt.test.js`
  Purpose: Receipt JSON / Markdown contract coverage.
- Create: `scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js`
  Purpose: CLI coverage for apply mode, `--dry-run`, `--proposal-only`, path handling, repeated corpus-version args, and conflict exits.
- Create: `docs/reports/rag_phase_e_promotion_bridge_operator_guide.md`
  Purpose: Operator-facing guide for bridge modes, receipt interpretation, Git rollback, and the explicit manual handoff to rollout.
- Modify: `scripts/rag/lib/production-evidence-whitelist.js`
  Purpose: Expose deterministic normalization / sort / upsert helpers without changing current validation semantics.
- Modify: `scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js`
  Purpose: Replace `spawnSync`-based CLI execution with direct `main(argv)` invocation.
- Modify: `scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js`
  Purpose: Replace `spawnSync`-based CLI execution with direct `main(argv)` invocation.
- Modify: `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`
  Purpose: Replace `spawnSync`-based CLI execution and artifact seeding with direct imports.
- Modify: `docs/reports/INDEX.md`
  Purpose: Index the new Phase E operator guide.

## Baseline Note

Current focused baseline status that matters to this plan:

- `scripts/rag/__tests__/evidence-draft-review.test.js` passes
- `scripts/rag/__tests__/evidence-draft-promotion-candidate.test.js` passes
- `scripts/rag/__tests__/production-evidence-rollout-status.test.js` passes
- `api/rag/__tests__/production-evidence-rollout.test.js` passes
- the nearby CLI suites fail in this harness because they call `spawnSync(process.execPath, ...)` from Jest temp workspaces and get `EPERM`

That is not a reason to avoid CLI coverage.
It is a reason to stabilize the test pattern before adding another CLI in the same area.

## Chunk 1: Stabilize CLI Test Harness And Core Promotion Synthesis

### Task 1: Stabilize adjacent CLI tests around direct `main(argv)` invocation

**Files:**
- Create: `scripts/rag/__tests__/helpers/cli-main-harness.js`
- Modify: `scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js`
- Modify: `scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js`
- Modify: `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`
- Test: `scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js`
- Test: `scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js`
- Test: `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`

- [ ] **Step 1: Rewrite one existing CLI assertion around an import-based harness and make the focused suite fail for the right reason**

Use this target pattern in the tests:

```js
import { invokeCliMain } from './helpers/cli-main-harness.js';
import { main as reviewScaffoldMain } from '../run_evidence_draft_review_scaffold.js';

const result = await invokeCliMain(reviewScaffoldMain, [
  '--bundle-dir',
  'tmp/sample_draft_bundle',
  '--out-json',
  'tmp/out/decision.json',
  '--reviewer',
  'operator-a',
], { cwd: workspaceRoot });

expect(result.exitCode).toBe(0);
```

- [ ] **Step 2: Run the three adjacent CLI suites to confirm the current baseline still fails before the helper exists**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js scripts/rag/__tests__/run-production-evidence-rollout-status.test.js
```

Expected:

- FAIL
- current or intermediate failure should clearly point at the missing harness or the old `spawnSync(...)=EPERM` path, not at unrelated governance logic

- [ ] **Step 3: Implement the harness and refactor all three CLI suites to use imported `main(argv)` calls**

The helper should:

- temporarily change `process.cwd()` via `process.chdir(...)`
- capture `process.stdout.write` and `process.stderr.write`
- reset `process.exitCode` before each invocation
- return `{ exitCode, stdout, stderr }`
- restore cwd, stdio writers, and `process.exitCode` in `finally`

For `run-production-evidence-rollout-status.test.js`, also replace the `seedVerificationArtifact()` child-process call with an imported call to `main` from `run_production_evidence_first_online_rollout_verification.js`.

- [ ] **Step 4: Re-run the focused CLI suites and confirm green**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js scripts/rag/__tests__/run-production-evidence-rollout-status.test.js
```

Expected:

- PASS
- no `spawnSync ... EPERM`
- output-path assertions still pass

- [ ] **Step 5: Commit the harness stabilization**

```bash
git add scripts/rag/__tests__/helpers/cli-main-harness.js scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js scripts/rag/__tests__/run-production-evidence-rollout-status.test.js
git commit -m "test: stabilize production evidence cli harness"
```

### Task 2: Add failing core bridge synthesis tests and implement the minimal promotion builders

**Files:**
- Create: `scripts/rag/lib/production-evidence-promotion-bridge.js`
- Create: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`
- Test: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`

- [ ] **Step 1: Write failing tests for candidate-to-pilot-ready synthesis using the existing Phase D fixture pipeline**

Do not add a second static reviewed-candidate fixture.
Instead, in test setup:

```js
import { writeEvidenceDraftPromotionCandidateOutputs } from '../lib/evidence-draft-promotion-candidate.js';

const candidate = writeEvidenceDraftPromotionCandidateOutputs({
  bundleDir: fixtureBundleDir,
  decisionJsonPath: completedReviewPath,
  candidateDir: path.join(workspaceRoot, 'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1'),
  candidateBundleId: 'phase_d_gap_fill_candidate_9231_v1',
});
```

Add failing assertions for:

- target manifest `bundle_status = "pilot_ready_for_ingest"`
- target manifest `bundle_id = "phase_e_pilot_ready_9231_v1"`
- preserved `subject_codes = ["9231"]`
- whitelist entry `release_channel = "ready_for_ingest"`
- whitelist entry `ingest_allowed = true`
- whitelist entry `release_ready_expected = true`
- receipt-independent bundle synthesis preserves `review_trace`

- [ ] **Step 2: Run the new bridge core suite to verify it fails before implementation**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
```

Expected:

- FAIL because `production-evidence-promotion-bridge.js` does not exist or the expected exports are missing

- [ ] **Step 3: Implement the minimal synthesis surface**

Start with pure builders only:

- `loadPromotionCandidateBundle(...)`
- `buildPilotReadyBundle({ candidateManifest, candidateItems, targetBundleId, promotedAt, sourceReviewId })`
- `buildPilotReadyWhitelistEntry({ targetManifest, manifestPath, approvedCorpusVersions })`

The target manifest should follow this shape:

```js
{
  ...candidateManifest,
  bundle_id: targetBundleId,
  generated_at: promotedAt,
  bundle_status: 'pilot_ready_for_ingest',
  items_file: 'items.json',
  bundle_item_count: targetItems.length,
  review: {
    status: 'approved',
    owner: candidateManifest.review?.owner || 'phase_e_promotion_bridge',
  },
}
```

- [ ] **Step 4: Re-run the bridge core suite and confirm the synthesis contract passes**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
```

Expected:

- PASS for the basic synthesis cases

- [ ] **Step 5: Commit the new core bridge builders**

```bash
git add scripts/rag/lib/production-evidence-promotion-bridge.js scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
git commit -m "feat: add production evidence promotion bridge builders"
```

### Task 3: Add deterministic whitelist upsert, idempotency, and conflict coverage

**Files:**
- Modify: `scripts/rag/lib/production-evidence-whitelist.js`
- Modify: `scripts/rag/lib/production-evidence-promotion-bridge.js`
- Modify: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`
- Test: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`

- [ ] **Step 1: Extend the bridge test with failing whitelist upsert and replay cases**

Add tests that cover:

- new entry insertion into `whitelist_v1.json`
- deterministic lexical ordering of `entries`, `allowed_bundle_ids`, and `allowed_manifest_paths`
- idempotent replay when the computed entry already exists byte-equivalent
- failure when a same-`bundle_id` entry exists with different `approved_corpus_versions`
- failure when `approved_corpus_versions` is empty

Use a target assertion like:

```js
expect(result.whitelist.entries.find((entry) => entry.bundle_id === 'phase_e_pilot_ready_9231_v1')).toMatchObject({
  release_channel: 'ready_for_ingest',
  ingest_allowed: true,
  release_ready_expected: true,
  approved_corpus_versions: ['rag_production_evidence_pilot_9231_20260318'],
});
```

- [ ] **Step 2: Run the bridge core suite and verify the new whitelist cases fail before the upsert helpers exist**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
```

Expected:

- FAIL on missing upsert / conflict handling

- [ ] **Step 3: Implement deterministic whitelist helpers and wire them into the bridge**

Add focused exports in `production-evidence-whitelist.js`, for example:

```js
export function sortProductionEvidenceWhitelistEntries(entries = []) { ... }
export function buildProductionEvidenceWhitelistDocument({ whitelist, entries }) { ... }
export function upsertProductionEvidenceWhitelistEntry({ whitelist, entry }) { ... }
```

Bridge behavior must be:

- insert when absent
- no-op when equivalent
- throw an explicit conflict error when non-equivalent

- [ ] **Step 4: Re-run the bridge core suite and confirm deterministic whitelist behavior**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-bridge.test.js scripts/rag/__tests__/production-evidence-whitelist.test.js
```

Expected:

- PASS
- existing whitelist validator behavior remains unchanged

- [ ] **Step 5: Commit whitelist upsert and conflict handling**

```bash
git add scripts/rag/lib/production-evidence-whitelist.js scripts/rag/lib/production-evidence-promotion-bridge.js scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
git commit -m "feat: add deterministic whitelist upsert for promotion bridge"
```

## Chunk 2: Validation, Receipt, And File Apply Engine

### Task 4: Add failing receipt and governance-validation tests, then implement the receipt builder

**Files:**
- Create: `scripts/rag/lib/production-evidence-promotion-receipt.js`
- Create: `scripts/rag/__tests__/production-evidence-promotion-receipt.test.js`
- Modify: `scripts/rag/lib/production-evidence-promotion-bridge.js`
- Modify: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`
- Test: `scripts/rag/__tests__/production-evidence-promotion-receipt.test.js`
- Test: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`

- [ ] **Step 1: Write failing tests for the receipt payload and in-memory governance validation**

Add cases that assert:

- receipt `rollout_gate.touched === false`
- receipt includes `source_candidate`, `target_bundle`, `whitelist_update`, `approved_corpus_versions`
- receipt `rollback_guidance.paths` names the target bundle dir, whitelist path, and receipt path
- bridge preview runs the existing governance chain and returns:
  - `manifest_valid = true`
  - `whitelist_valid = true`
  - `release_ready = true`
  - `ingest_permitted = true`

Receipt payload target:

```js
expect(receipt.validation).toMatchObject({
  manifest_valid: true,
  whitelist_valid: true,
  release_ready: true,
  ingest_permitted: true,
});
expect(receipt.rollout_gate).toEqual({
  touched: false,
  path: 'data/evidence/production/rollout_gate_v1.json',
});
```

- [ ] **Step 2: Run the receipt and bridge suites to verify they fail before receipt support exists**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-receipt.test.js scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
```

Expected:

- FAIL because receipt exports do not exist and the bridge preview does not yet include governance validation metadata

- [ ] **Step 3: Implement the receipt builder and preview result composition**

Add:

- `buildProductionEvidencePromotionReceipt(...)`
- `renderProductionEvidencePromotionReceiptReport(...)`

Have the bridge preview call:

- `validateProductionEvidenceManifest`
- `validateProductionEvidenceWhitelist`
- `buildProductionEvidenceReleaseGate`
- `buildProductionEvidenceGovernancePreflight`

and pass those results into the receipt builder.

- [ ] **Step 4: Re-run the focused suites and confirm receipt + validation coverage pass**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-receipt.test.js scripts/rag/__tests__/production-evidence-promotion-bridge.test.js scripts/rag/__tests__/production-evidence-ready-ingest-contract.test.js
```

Expected:

- PASS
- ready-for-ingest contract remains green for existing `pilot_ready_v1`

- [ ] **Step 5: Commit the receipt and validation layer**

```bash
git add scripts/rag/lib/production-evidence-promotion-receipt.js scripts/rag/__tests__/production-evidence-promotion-receipt.test.js scripts/rag/lib/production-evidence-promotion-bridge.js scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
git commit -m "feat: add promotion bridge receipt and validation"
```

### Task 5: Add apply-mode filesystem tests and implement atomic bridge execution

**Files:**
- Modify: `scripts/rag/lib/production-evidence-promotion-bridge.js`
- Modify: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`
- Test: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`

- [ ] **Step 1: Add failing temp-workspace integration tests for `apply`, `dry-run`, and `proposal-only`**

Use a temp workspace seeded with:

- `data/evidence/production/whitelist_v1.json`
- `data/evidence/production/rollout_gate_v1.json`
- a bridge-generated reviewed candidate bundle

Add tests that assert:

- `apply` writes:
  - `data/evidence/production/phase_e_pilot_ready_9231_v1/manifest.json`
  - `data/evidence/production/phase_e_pilot_ready_9231_v1/items.json`
  - updated `data/evidence/production/whitelist_v1.json`
  - receipt JSON / Markdown
- `dry-run` writes none of the canonical files
- `proposal-only` writes only proposal outputs under an explicit proposal directory
- rollout gate bytes are unchanged in all modes
- replaying `apply` with identical input is a no-op

- [ ] **Step 2: Run the bridge suite and verify the mode tests fail before file-write support exists**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
```

Expected:

- FAIL on missing apply-mode execution and missing mode semantics

- [ ] **Step 3: Implement atomic bridge execution**

Add a top-level executor such as:

```js
export async function executeProductionEvidencePromotionBridge({
  rootDir,
  mode,
  candidateManifestPath,
  targetBundleId,
  approvedCorpusVersions,
  whitelistPath = 'data/evidence/production/whitelist_v1.json',
  proposalDir = null,
  receiptJsonPath = null,
  receiptMdPath = null,
}) { ... }
```

Implementation rules:

- build everything in memory first
- validate before mutating tracked outputs
- write bundle files to a staging dir, then move into place
- rewrite whitelist via temp-file swap
- write receipt last
- never read or write `runs/backend/**`
- never touch `rollout_gate_v1.json`

- [ ] **Step 4: Re-run the bridge suite and confirm all mode invariants pass**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/production-evidence-promotion-bridge.test.js scripts/rag/__tests__/production-evidence-promotion-receipt.test.js
```

Expected:

- PASS
- `apply`, `dry-run`, and `proposal-only` all behave exactly as designed

- [ ] **Step 5: Commit the apply engine**

```bash
git add scripts/rag/lib/production-evidence-promotion-bridge.js scripts/rag/__tests__/production-evidence-promotion-bridge.test.js
git commit -m "feat: add production evidence promotion apply engine"
```

## Chunk 3: CLI Surface, Operator Docs, And Focused Verification

### Task 6: Add failing CLI tests and implement the promotion bridge CLI

**Files:**
- Create: `scripts/rag/run_production_evidence_promotion_bridge.js`
- Create: `scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js`
- Modify: `scripts/rag/__tests__/helpers/cli-main-harness.js`
- Test: `scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js`

- [ ] **Step 1: Write failing CLI tests around the import-based harness**

Cover these cases:

- default apply mode writes the canonical bundle + canonical whitelist + receipt
- repeated `--approved-corpus-version` args are collected into an array
- `--dry-run` prints a preview result and writes no canonical outputs
- `--proposal-only --proposal-dir tmp/proposal` writes only proposal outputs
- conflict results set a nonzero exit code
- missing `--target-bundle-id` fails closed

Test pattern:

```js
const result = await invokeCliMain(bridgeMain, [
  '--candidate-dir', 'tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1',
  '--target-bundle-id', 'phase_e_pilot_ready_9231_v1',
  '--approved-corpus-version', 'rag_production_evidence_pilot_9231_20260318',
], { cwd: workspaceRoot });

expect(result.exitCode).toBe(0);
```

- [ ] **Step 2: Run the new CLI suite and confirm it fails before the CLI exists**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js
```

Expected:

- FAIL because the runner file does not exist yet

- [ ] **Step 3: Implement the CLI wrapper**

The CLI should:

- parse repeated `--approved-corpus-version` args
- accept `--candidate-dir` or explicit `--manifest` plus `--items-json`
- require `--target-bundle-id`
- support:
  - `--dry-run`
  - `--proposal-only`
  - `--proposal-dir`
  - optional explicit receipt output paths
- call `executeProductionEvidencePromotionBridge(...)`
- print the canonical written paths or preview paths
- set `process.exitCode = 1` for conflict or validation failures

- [ ] **Step 4: Re-run the CLI suite and confirm green**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js
```

Expected:

- PASS
- no child-process `EPERM`

- [ ] **Step 5: Commit the CLI surface**

```bash
git add scripts/rag/run_production_evidence_promotion_bridge.js scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js scripts/rag/__tests__/helpers/cli-main-harness.js
git commit -m "feat: add production evidence promotion bridge cli"
```

### Task 7: Add the operator guide and report index entry

**Files:**
- Create: `docs/reports/rag_phase_e_promotion_bridge_operator_guide.md`
- Modify: `docs/reports/INDEX.md`

- [ ] **Step 1: Write the operator guide**

The guide must document:

- apply mode
- `--dry-run`
- `--proposal-only`
- required inputs
- where the receipt is written
- how to inspect `release_ready` and `ingest_permitted`
- that rollout remains a separate manual edit to `rollout_gate_v1.json`
- Git-based rollback using the receipt paths

- [ ] **Step 2: Add the guide to the report index**

Update `docs/reports/INDEX.md` so the new Phase E operator guide is discoverable next to the existing telemetry and production-evidence reports.

- [ ] **Step 3: Sanity-check the docs diff**

Run:

```bash
git diff -- docs/reports/rag_phase_e_promotion_bridge_operator_guide.md docs/reports/INDEX.md
```

Expected:

- diff only contains the new guide and one index entry

- [ ] **Step 4: Commit the operator docs**

```bash
git add docs/reports/rag_phase_e_promotion_bridge_operator_guide.md docs/reports/INDEX.md
git commit -m "docs: add promotion bridge operator guide"
```

### Task 8: Run the focused verification matrix and finish with a clean bridge baseline

**Files:**
- Test: `scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js`
- Test: `scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js`
- Test: `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`
- Test: `scripts/rag/__tests__/production-evidence-promotion-bridge.test.js`
- Test: `scripts/rag/__tests__/production-evidence-promotion-receipt.test.js`
- Test: `scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js`
- Test: `scripts/rag/__tests__/production-evidence-whitelist.test.js`
- Test: `scripts/rag/__tests__/production-evidence-ready-ingest-contract.test.js`
- Test: `api/rag/__tests__/production-evidence-rollout.test.js`

- [ ] **Step 1: Run the full focused verification matrix**

Run:

```bash
npm test -- --runInBand scripts/rag/__tests__/run-evidence-draft-review-scaffold.test.js scripts/rag/__tests__/run-evidence-draft-promotion-candidate.test.js scripts/rag/__tests__/run-production-evidence-rollout-status.test.js scripts/rag/__tests__/production-evidence-promotion-bridge.test.js scripts/rag/__tests__/production-evidence-promotion-receipt.test.js scripts/rag/__tests__/run-production-evidence-promotion-bridge.test.js scripts/rag/__tests__/production-evidence-whitelist.test.js scripts/rag/__tests__/production-evidence-ready-ingest-contract.test.js api/rag/__tests__/production-evidence-rollout.test.js
```

Expected:

- all suites pass
- no CLI suite uses `spawnSync`

- [ ] **Step 2: Run one manual bridge smoke in `--dry-run` mode against the deterministic 9231 fixture path**

Run:

```bash
node scripts/rag/run_production_evidence_promotion_bridge.js --candidate-dir scripts/rag/__tests__/fixtures/evidence-drafts/sample_draft_bundle --target-bundle-id phase_e_pilot_ready_9231_v1 --approved-corpus-version rag_production_evidence_pilot_9231_20260318 --dry-run
```

Expected:

- FAIL because this is a draft bundle and not a reviewed candidate
- this proves the CLI rejects pre-Phase-D inputs at the boundary

- [ ] **Step 3: Run one temp-workspace smoke through the reviewed-candidate path**

Create the reviewed candidate inside a temp workspace using the existing Phase D fixture helper and then run:

```bash
node scripts/rag/run_production_evidence_promotion_bridge.js --candidate-dir tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1 --target-bundle-id phase_e_pilot_ready_9231_v1 --approved-corpus-version rag_production_evidence_pilot_9231_20260318 --dry-run
```

Expected:

- exit `0`
- preview says `release_ready = true`
- preview says `ingest_permitted = true`
- preview says rollout gate untouched

- [ ] **Step 4: Verify `git status --short` shows only intentional Phase E files**

Run:

```bash
git status --short
```

Expected:

- only the new bridge files, doc updates, and intentional adjacent test refactors are present
