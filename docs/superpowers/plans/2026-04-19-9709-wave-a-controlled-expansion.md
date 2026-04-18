# 9709 Wave A Controlled Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the proven `9709` AO/VLM closed loop from the current `17`-row pilot to a controlled `Wave A` of `30` new single-question assets without regressing replayability, search quality, or the existing green gate posture.

**Architecture:** Keep the current `9709` pipeline shape intact: manifest-selected single-question images feed lane-specific structured VLM outputs, AO-owned evidence bundles and deterministic backfill hydrate the paper-backed search surfaces, and every shard must prove itself through checked-in reports before the next shard starts. `VLM` still owns visual extraction only; final syllabus/topic ownership remains manifest-driven or review-backed.

**Tech Stack:** Existing `scripts/vlm/*` Qwen wave-1 runtime, `scripts/learning/run_9709_wave1_search_closure.js`, paper-question registry backfill, question-analysis backfill, Supabase/Postgres, Node/Jest, Python `pytest`, checked-in manifests/reports, `scripts/evaluation/run_question_search_gate.js`.

---

## Execution Authority

For GitHub issue creation and live Wave A execution, `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md` is authoritative for:

- issue titles
- dependency order
- commands
- required outputs
- stop/go acceptance
- rerun/reset behavior

If this plan conflicts with the issue draft pack on any execution detail, follow the issue draft pack and update this plan before execution continues.

## Read This First

Before opening implementation issues, read:

- `docs/reports/2026-04-16-9709-minimal-complete-loop-current-state.md`
- `docs/reports/2026-04-16-9709-minimal-complete-loop-lessons.md`
- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md`
- `docs/superpowers/specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md`
- `docs/superpowers/plans/2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md`
- `docs/superpowers/plans/2026-04-16-9709-qwen-api-wave1-ao-execution-runbook.md`

This plan assumes the execution branch already contains the real `9709` minimal complete loop surfaces, including:

- `scripts/learning/run_9709_wave1_search_closure.js`
- `scripts/learning/run_paper_question_registry_backfill_host.ps1`
- `scripts/learning/run_question_analysis_backfill_host.ps1`
- checked-in live evidence at `docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json`
- the green gate evidence at `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json`

If those surfaces are not present on the target execution line, do not start Wave A issues yet. Land the closed-loop baseline first.

## Why This Plan Exists

The `9709` work is no longer blocked on "can AO call a VLM at all?" That was already proven.

The next risk is different:

- expanding too broadly and recreating hidden red states
- letting weak routing or weak manifests flood the review lane again
- mixing data expansion with uncontrolled prompt or schema churn
- losing the honest gate-backed posture that made the pilot meaningful

Wave A is therefore not a "full 9709 rollout." It is a controlled expansion that must stay inside the already-proven single-question, manifest-driven, replayable pipeline.

## Hard Scope Boundaries

This plan **will** do:

- expand by `30` new `9709` questions only
- stay within three buckets:
  - `9709.p1.trigonometry`
  - `9709.p3.integration`
  - `9709.p3.trigonometry`
- keep single-question image assets as the only VLM input surface
- execute in `3` shards of `10`, with hard stop/go gates between shards
- require checked-in execution and QC evidence for every shard

This plan **will not** do:

- whole-paper PDF segmentation
- multi-subject rollout
- final topic/family truth delegated to the VLM
- broad prompt/schema redesign unrelated to Wave A
- "just run more data" without new manifest, routing, and QC controls

## Wave A Target Shape

Wave A contains exactly `30` new rows beyond the existing `17`-row recovery manifest.

Bucket mix:

- `10` rows for `9709.p1.trigonometry`
- `10` rows for `9709.p3.integration`
- `10` rows for `9709.p3.trigonometry`

Difficulty mix per bucket:

- `6` clean rows
- `2` medium rows
- `1` OCR-hard row
- `1` diagram/review-heavy row

Shard mix:

- `shard_1`: clean-first validation shard, `10` rows total, only `clean + medium`
- `shard_2`: mixed extraction shard, `10` rows total, introduces the `OCR-hard` rows
- `shard_3`: stress shard, `10` rows total, introduces the `diagram/review-heavy` rows and remaining medium rows

Rules for shard composition:

- every shard must contain all three buckets
- no shard may contain more than `4` rows from the same bucket
- all `diagram/review-heavy` rows must be back-loaded to `shard_3`
- no row may enter Wave A without a predeclared `bucket`, `difficulty_band`, and `shard_id`

## Success Contract

Wave A is only considered successful if all of the following are true:

- all `30` manifest rows complete the lane runner without provider failure
- existing baseline gate fixture `data/eval/question_search_gold_9709_v1.json` stays green after every shard
- every shard produces checked-in:
  - lane results JSON
  - evidence bundles JSON
  - projection audit JSON
  - deterministic full-review JSON
  - canonical shard verdict JSON
  - canonical shard verdict MD
  - shard execution report
  - QC report
- all `30` rows hydrate into paper-backed search surfaces with non-null:
  - `year`
  - `session`
  - `paper_number`
  - `q_number`
  - `summary`
  - `search_text`
- manifest-level `paper` must map deterministically to projection-level `paper_number`, and that mapping must be mechanically verified
- no duplicate paper-backed projection rows exist for any Wave A manifest identity
- every shard proves its own rows are queryable after hydration, not only that the old baseline fixture remains green
- no clean or medium row falls into unexpected `review_lane`
- for `clean` and `medium`, actual lane must match manifest `route_hint`
- rows outside the manifest-justified `review_lane` allowlist must be `0`
- every `gate_critical=true` row is included in deterministic full-review
- every `descriptor_required=true` row is checked for non-empty descriptor-bearing output in QC
- deterministic full-review acceptance is at least `9/10` for each shard
- live shard closure must run with `scope_mode = lane_results` and `cumulative_mode = false`
- only a canonical shard verdict of `pass` can unblock the next shard
- the final Wave A closeout recommends either:
  - proceed to Wave B
  - or stop and open a bounded remediation slice

## Stop Rules

Stop the sequence immediately and do not open the next shard issue if any of the following happen:

- provider failures appear in a shard run
- baseline gate turns red
- a shard creates unexpected `review_lane` fallbacks on clean or medium rows
- paper-backed projection fields become incomplete again
- current-shard projection completeness drops below `100%`
- current-shard direct queryability audit fails
- duplicate projection rows appear for current-shard identities
- live closure scope is anything other than `lane_results`
- deterministic full-review acceptance for the shard drops below `9/10`
- the canonical shard verdict is anything other than `pass`

Open a remediation issue instead of continuing.

## Execution Fingerprint

Every shard execution report, shard verdict artifact, and the final closeout report must record an `Execution Fingerprint` section.

Minimum required fingerprint fields:

- repo commit SHA
- manifest id and manifest digest
- lane-results digest
- evidence-bundles digest
- thresholds contract id and digest
- model / provider identifiers
- prompt template identifiers
- response schema version
- closure runner version or entrypoint path
- DB target identity and `psql` mode
- exact commands executed

Checked-in artifacts without this fingerprint count as incomplete evidence, not replayable evidence.

## Failed Shard Isolation Policy

Wave A cannot continue on top of ambiguous shard side effects.

Rules:

- every shard must run on a known pre-shard baseline state
- if a shard fails stop/go, its side effects must not become the basis for the next shard
- rerun must happen either on a disposable/staging DB or after re-establishing the last known green baseline
- a failed shard rerun must produce a checked-in reset artifact before the next execution attempt
- every failed shard report must state:
  - whether cleanup/reset is required
  - whether the shard is rerun-safe / idempotence-safe
  - which identities were written before failure

Reset artifact contract:

- reset control must target current-shard identities only
- reset artifact path must follow `docs/reports/2026-04-19-9709-wave-a-shard<N>-reset.json`
- reset artifact must record:
  - target identities
  - pre-reset counts
  - deleted counts
  - post-reset counts

## Planned Files

### Create

- `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- `data/contracts/9709_wave_a_thresholds_v1.json`
- `scripts/vlm/qc_wave_a_shard_verdict.py`
- `tests/test_qwen_wave_a_shard_verdict.py`
- `scripts/learning/run_wave_a_projection_audit.js`
- `scripts/learning/__tests__/run-wave-a-projection-audit.test.js`
- `scripts/learning/run_wave_a_shard_reset.js`
- `scripts/learning/__tests__/run-wave-a-shard-reset.test.js`
- `docs/reports/2026-04-19-9709-wave-a-manifest-selection-report.md`
- `docs/reports/2026-04-19-9709-wave-a-surface-audit-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md`
- `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.md`
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.md`
- `docs/reports/2026-04-19-9709-wave-a-shard1-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard2-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard3-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-closeout-report.md`
- `docs/reports/2026-04-19-9709-wave-a-closeout-summary.json`
- `data/eval/question_search_gold_9709_wave_a_v1.json`

### Modify

- `scripts/vlm/create_jobs_from_manifest.py`
- `scripts/vlm/qwen_lane_runner_v1.py`
- `scripts/vlm/qc_stats.py`
- `scripts/vlm/qc_vlm_spot_check.py`
- `scripts/learning/run_9709_wave1_search_closure.js`
- `tests/test_qwen_lane_runner_v1.py`
- `tests/test_qwen_wave1_qc.py`
- `scripts/learning/__tests__/run-9709-wave1-search-closure.test.js`
- `docs/reports/INDEX.md`

### Reference Only

- `data/manifests/9709_question_search_recovery_v1.json`
- `docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json`
- `docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json`
- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md`
- `scripts/learning/run_question_evidence_bundle_v1.js`
- `scripts/learning/run_paper_question_registry_backfill.js`
- `scripts/learning/run_question_analysis_backfill.js`
- `scripts/evaluation/run_question_search_gate.js`

## Issue Map

Execution issue sequence:

1. `9709 baseline: verify minimal complete loop on the execution line`
2. `9709 Wave A: freeze Wave A manifest and selection report`
3. `9709 Wave A: add shard-aware closure, projection audit, verdict, and failed-shard reset controls`
4. `9709 Wave A: complete surface audit, route freeze, and final probe freeze`
5. `9709 Wave A: execute shard 1 and preserve green gate`
6. `9709 Wave A: execute shard 2 and preserve green gate`
7. `9709 Wave A: execute shard 3 and preserve green gate`
8. `9709 Wave A: publish closeout report and Wave B recommendation`

Baseline preflight is mandatory, not optional.

Recommended labels:

- `subject:9709`
- `area:vlm`
- `area:learning-search`
- `type:plan`
- `type:data-pipeline`
- `wave:a`

## Chunk 0: Mandatory Baseline Preflight

### Task 0: Ensure the execution line already contains the real minimal complete loop

**GitHub Issue Title:** `9709 baseline: verify minimal complete loop on the execution line`

**Depends on:** none

**Files:**
- Reference: `docs/reports/2026-04-16-9709-minimal-complete-loop-current-state.md`
- Reference: `scripts/learning/run_9709_wave1_search_closure.js`
- Reference: `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md`

- [ ] **Step 1: Verify that the target branch already contains the closure runner and host backfill wrappers**

Run:
```bash
node - <<'NODE'
const fs = require('fs');
const required = [
  'scripts/learning/run_9709_wave1_search_closure.js',
  'scripts/learning/run_paper_question_registry_backfill_host.ps1',
  'scripts/learning/run_question_analysis_backfill_host.ps1',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: required }, null, 2));
NODE
```

Expected:
- all three paths exist

- [ ] **Step 2: Verify that the checked-in live rerun artifacts are present**

Run:
```bash
node - <<'NODE'
const fs = require('fs');
const required = [
  'docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json',
  'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: required }, null, 2));
NODE
```

Expected:
- both artifact paths exist

- [ ] **Step 3: Re-run the current baseline closure in dry-run mode**

Run:
```bash
node scripts/learning/run_9709_wave1_search_closure.js --dry-run
```

Expected:
- four-step closure plan prints cleanly

- [ ] **Step 4: Re-run the current baseline gate**

Run:
```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/9709-baseline-gate-check.md \
  --json-out /tmp/9709-baseline-gate-check.json \
  --psql-mode docker
```

Expected:
- exit `0`
- `gate_pass = true`

- [ ] **Step 5: Record the baseline execution fingerprint**

The preflight note must record at least:

- current branch
- repo SHA
- baseline fixture path
- gate JSON output path
- `psql` mode

This preflight is mandatory. Do not start Chunk 1 until it is complete.

## Chunk 1: Wave A Manifest Freeze

### Task 1: Create the Wave A manifest and selection report

**GitHub Issue Title:** `9709 Wave A: freeze Wave A manifest and selection report`

**Depends on:** `Chunk 0`

**Files:**
- Create: `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-manifest-selection-report.md`
- Reference: `data/manifests/9709_question_search_recovery_v1.json`
- Reference: `data/eval/a1_topic_link_manual_audit_9709_p1p3_v1.csv`

- [ ] **Step 1: Create the top-level manifest metadata**

The manifest must include at least:

- `schema_version`
- `manifest_id`
- `subject_code`
- `wave`
- `frozen_on`
- `source_documents`
- `items`

- [ ] **Step 2: Add exactly `30` new rows and do not mix them into the old recovery manifest**

Every item must include at least:

- `storage_key`
- `syllabus_code`
- `year`
- `session`
- `paper`
- `variant`
- `q_number`
- `primary_topic_path`
- `bucket`
- `difficulty_band`
- `shard_id`
- `descriptor_required`
- `gate_critical`
- `source_reason`
- `paper_scope_key`

- [ ] **Step 3: Enforce the fixed bucket and difficulty counts**

The final manifest must satisfy:

- `10` rows for `9709.p1.trigonometry`
- `10` rows for `9709.p3.integration`
- `10` rows for `9709.p3.trigonometry`
- per bucket: `6 clean + 2 medium + 1 ocr_hard + 1 diagram_review_heavy`

- [ ] **Step 4: Write the checked-in selection report**

The report must explain:

- why each bucket was chosen
- where the candidate rows came from
- how each row was assigned to `shard_1`, `shard_2`, or `shard_3`
- which rows are intentionally hard and why
- which rows are `gate_critical=true`
- which rows are `descriptor_required=true`
- how manifest `paper` is expected to map to projection `paper_number`

- [ ] **Step 5: Verify manifest counts mechanically**

Run:
```bash
node - <<'NODE'
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('data/manifests/9709_question_search_expansion_wave_a_v1.json', 'utf8'));
const recovery = JSON.parse(fs.readFileSync('data/manifests/9709_question_search_recovery_v1.json', 'utf8'));
const rows = manifest.items || [];
const recoveryKeys = new Set((recovery.items || []).map((row) => row.storage_key));
const byBucket = rows.reduce((acc, row) => ((acc[row.bucket] = (acc[row.bucket] || 0) + 1), acc), {});
const byShard = rows.reduce((acc, row) => ((acc[row.shard_id] = (acc[row.shard_id] || 0) + 1), acc), {});
const shardBucketCounts = {};
const byDifficulty = rows.reduce((acc, row) => {
  const key = `${row.bucket}:${row.difficulty_band}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
for (const row of rows) {
  shardBucketCounts[row.shard_id] ||= {};
  shardBucketCounts[row.shard_id][row.bucket] = (shardBucketCounts[row.shard_id][row.bucket] || 0) + 1;
}
const violations = [];
if (rows.length !== 30) violations.push(`expected 30 rows, got ${rows.length}`);
for (const bucket of ['9709.p1.trigonometry', '9709.p3.integration', '9709.p3.trigonometry']) {
  if (byBucket[bucket] !== 10) violations.push(`bucket ${bucket} expected 10, got ${byBucket[bucket] || 0}`);
}
for (const shard of ['shard_1', 'shard_2', 'shard_3']) {
  if (byShard[shard] !== 10) violations.push(`shard ${shard} expected 10, got ${byShard[shard] || 0}`);
  const shardBuckets = shardBucketCounts[shard] || {};
  for (const bucket of ['9709.p1.trigonometry', '9709.p3.integration', '9709.p3.trigonometry']) {
    if (!shardBuckets[bucket]) violations.push(`shard ${shard} missing bucket ${bucket}`);
    if ((shardBuckets[bucket] || 0) > 4) violations.push(`shard ${shard} bucket ${bucket} exceeds 4 rows`);
  }
}
if (rows.some((row) => row.shard_id === 'shard_1' && ['ocr_hard', 'diagram_review_heavy'].includes(row.difficulty_band))) {
  violations.push('shard_1 contains forbidden hard rows');
}
if (rows.some((row) => row.difficulty_band === 'diagram_review_heavy' && row.shard_id !== 'shard_3')) {
  violations.push('diagram_review_heavy rows must all be in shard_3');
}
if (rows.some((row) => typeof row.descriptor_required !== 'boolean' || typeof row.gate_critical !== 'boolean')) {
  violations.push('descriptor_required and gate_critical must be explicit booleans');
}
if (rows.some((row) => !row.paper_scope_key)) {
  violations.push('paper_scope_key is required for every row');
}
if (new Set(rows.map((row) => row.storage_key)).size !== rows.length) {
  violations.push('storage_key values must be unique');
}
if (new Set(rows.map((row) => row.paper_scope_key)).size !== rows.length) {
  violations.push('paper_scope_key values must be unique');
}
if (rows.some((row) => recoveryKeys.has(row.storage_key))) {
  violations.push('wave-a manifest must not overlap with recovery manifest storage_key set');
}
if (violations.length) {
  console.error(JSON.stringify({ violations, byBucket, byShard, byDifficulty, shardBucketCounts }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ total: rows.length, byBucket, byShard, byDifficulty, shardBucketCounts }, null, 2));
NODE
```

Expected:
- `total = 30`
- every bucket count is `10`
- every shard count is `10`

## Chunk 2: Shard-Aware Tooling, Projection Audit, Verdict, And Reset Controls

### Task 2: Add manifest-aware shard filters, closure scoping, projection audit, canonical verdict reporting, and failed-shard reset controls

**GitHub Issue Title:** `9709 Wave A: add shard-aware closure, projection audit, verdict, and failed-shard reset controls`

**Depends on:** `Chunk 1`

**Files:**
- Create: `data/contracts/9709_wave_a_thresholds_v1.json`
- Create: `scripts/vlm/qc_wave_a_shard_verdict.py`
- Create: `tests/test_qwen_wave_a_shard_verdict.py`
- Create: `scripts/learning/run_wave_a_projection_audit.js`
- Create: `scripts/learning/__tests__/run-wave-a-projection-audit.test.js`
- Create: `scripts/learning/run_wave_a_shard_reset.js`
- Create: `scripts/learning/__tests__/run-wave-a-shard-reset.test.js`
- Modify: `scripts/vlm/create_jobs_from_manifest.py`
- Modify: `scripts/vlm/qwen_lane_runner_v1.py`
- Modify: `scripts/vlm/qc_stats.py`
- Modify: `scripts/vlm/qc_vlm_spot_check.py`
- Modify: `scripts/learning/run_9709_wave1_search_closure.js`
- Modify: `tests/test_qwen_lane_runner_v1.py`
- Modify: `tests/test_qwen_wave1_qc.py`
- Modify: `scripts/learning/__tests__/run-9709-wave1-search-closure.test.js`

- [ ] **Step 1: Extend manifest-driven job creation to support shard filtering**

Required behavior:

- filter by `shard_id`
- preserve existing unfiltered behavior
- print route counts for the filtered subset in dry-run mode
- print targeted identities for the filtered subset in dry-run mode

- [ ] **Step 2: Extend the closure runner to make current-shard scope explicit**

Required behavior:

- accept `--shard-id`
- override manifest path
- override lane-results path
- override evidence-bundle output path
- override gate report paths
- support an explicit authoritative scope mode:
  - `--scope-from-lane-results` for all live shard execution
  - `--scope-from-manifest` for dry-run or reset only
- live shard execution must use `--scope-from-lane-results`
- dry-run must print:
  - `scope_mode`
  - `scope_source`
  - target row count
  - target storage keys
  - `cumulative_mode`
- live execution must exit non-zero if:
  - resolved scope is not current-shard-only
  - `--shard-id` and authoritative scope identities disagree
- keep the existing wave-1 defaults working

- [ ] **Step 3: Create a checked-in Wave A threshold contract**

The JSON contract must define at least:

- `provider_failure_max = 0`
- `baseline_gate_pass_required = true`
- `full_review_min_acceptance = 0.9`
- `unexpected_review_lane_max = 0` for `clean` and `medium`
- `projection_required_fields`
- `current_shard_projection_completeness_required = 1`
- `current_shard_queryability_required = 1`
- `duplicate_projection_rows_max = 0`
- `gate_critical_full_review_required = true`
- `route_hint_match_required = true` for `clean` and `medium`
- `review_lane_allowlist_required = true`
- `review_lane_allowlist_source = manifest`
- `closure_scope_mode_required = "lane_results"` for live shard execution

- [ ] **Step 4: Add a dedicated current-shard projection audit surface**

The audit must verify current-shard identities only:

- all manifest identities are present exactly once in paper-backed projection/search surfaces
- `paper` from manifest maps correctly to projection `paper_number`
- required projection fields are non-null
- at least one direct queryability probe succeeds per current-shard row or per declared audit rule
- the audit exits non-zero on violation
- checked-in positive and negative tests must cover:
  - duplicate projection rows
  - missing required projection fields
  - failed current-shard queryability
  - manifest `paper` to projection `paper_number` mismatch

- [ ] **Step 5: Add a canonical shard verdict aggregator**

The canonical verdict tool must explicitly receive and combine:

- `--lane-results-json`
- `--gate-json`
- `--projection-audit-json`
- `--full-review-json`
- `--thresholds-json`
- optionally `--evidence-bundles-json`

The output must be the only stop/go truth source for shard progression.
- checked-in positive and negative tests must prove verdict failure on threshold breach

- [ ] **Step 6: Add the failed-shard reset control**

Required behavior:

- delete current-shard identities only
- require `--manifest`, `--shard-id`, and explicit scope
- emit JSON with:
  - target identities
  - pre-reset counts
  - deleted counts
  - post-reset counts
- exit non-zero on:
  - out-of-scope delete
  - partial delete
  - unresolved leftovers
- checked-in positive and negative tests must prove reset only touches current-shard identities

- [ ] **Step 7: Make QC output compare actual shard results against the threshold contract**

QC output must report:

- rows attempted
- provider failures
- route distribution
- unexpected review fallbacks
- summary presence
- descriptor coverage for `descriptor_required=true` rows
- deterministic full-review acceptance
- threshold verdicts

- [ ] **Step 8: Verify the new filtering and dry-run surfaces**

Run:
```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --dry-run
```

Run:
```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --dry-run
```

Run:
```bash
node scripts/learning/run_9709_wave1_search_closure.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --lane-results /tmp/9709-wave-a-shard1-results.json \
  --scope-from-lane-results \
  --evidence-bundles-out /tmp/9709-wave-a-shard1-bundles.json \
  --gate-report /tmp/9709-wave-a-shard1-gate.md \
  --gate-json /tmp/9709-wave-a-shard1-gate.json \
  --dry-run
```

Expected:
- dry-run output is clean for full manifest and per-shard execution

Run:
```bash
node scripts/learning/run_wave_a_projection_audit.js --help
```

Run:
```bash
python3 scripts/vlm/qc_wave_a_shard_verdict.py --help
```

Expected:
- projection-audit and shard-verdict entrypoints are present

Run:
```bash
node scripts/learning/run_wave_a_shard_reset.js --help
```

Expected:
- reset entrypoint is present

## Chunk 3: Surface Audit, Route Freeze, And Final Probe Freeze

### Task 3: Resolve Wave A surface metadata before any live rerun

**GitHub Issue Title:** `9709 Wave A: complete surface audit, route freeze, and final probe freeze`

**Depends on:** `Chunk 2`

**Files:**
- Modify: `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-surface-audit-report.md`
- Reference: `docs/reports/2026-04-16-9709-minimal-complete-loop-lessons.md`
- Reference: `docs/reports/2026-04-16-9709-diagram-lane-live-probe-results.json`

- [ ] **Step 1: Audit every Wave A row against the actual single-question asset**

Each row must resolve:

- `diagram_present`
- `formula_dense`
- `table_heavy`
- `ocr_risk`
- `surface_evidence_status`

- [ ] **Step 2: Freeze `route_hint` per row**

Rules:

- default to `ocr_lane` for clean and medium non-diagram rows
- use `diagram_lane` only for real spatial/diagram cases
- reserve `review_lane` for explicitly justified hard rows only

- [ ] **Step 3: Record any intentional review-heavy rows explicitly**

Every intentional `review_lane` or `diagram_review_heavy` row must include:

- a short justification
- why extraction-first alone is insufficient
- why the row still belongs in Wave A instead of later remediation

- [ ] **Step 4: Freeze the final Wave A probe fixture after the surface audit settles**

Create:

- `data/eval/question_search_gold_9709_wave_a_v1.json`

Rules:

- the fixture must be generated only after the final post-audit manifest is frozen
- include all `gate_critical=true` rows
- fill the remaining slots to reach `9` total rows with balanced coverage across the three buckets
- record the manifest digest used to derive the fixture

- [ ] **Step 5: Write the surface-audit report**

The report must summarize:

- route distribution
- hard-row inventory
- any rows removed from the candidate set
- any rows reassigned across shards after the audit
- final probe fixture composition
- all intentional `review_lane` rows and their justifications

- [ ] **Step 6: Mechanically verify no unresolved surface flags or composition violations remain**

Run:
```bash
node - <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
const manifestPath = 'data/manifests/9709_question_search_expansion_wave_a_v1.json';
const fixturePath = 'data/eval/question_search_gold_9709_wave_a_v1.json';
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const fixtureRaw = fs.readFileSync(fixturePath, 'utf8');
const manifestDigest = crypto.createHash('sha256').update(manifestRaw).digest('hex');
const manifest = JSON.parse(manifestRaw);
const rows = manifest.items || [];
const fixture = JSON.parse(fixtureRaw);
const bad = (manifest.items || []).filter((row) =>
  row.diagram_present == null ||
  row.formula_dense == null ||
  row.table_heavy == null ||
  row.ocr_risk == null ||
  !row.route_hint ||
  !row.surface_evidence_status
);
const unjustifiedReview = rows.filter((row) =>
  row.route_hint === 'review_lane' && !(typeof row.review_lane_justification === 'string' && row.review_lane_justification.trim())
);
const fixtureCases = Array.isArray(fixture.cases) ? fixture.cases : [];
const fixtureKeyCounts = fixtureCases.reduce((acc, row) => {
  if (row.storage_key) acc[row.storage_key] = (acc[row.storage_key] || 0) + 1;
  return acc;
}, {});
const gateCriticalKeys = rows.filter((row) => row.gate_critical === true).map((row) => row.storage_key);
const fixtureBucketCounts = fixtureCases.reduce((acc, row) => {
  const bucket = row.bucket || row.primary_topic_path;
  acc[bucket] = (acc[bucket] || 0) + 1;
  return acc;
}, {});
const violations = [];
if (bad.length) violations.push(`unresolved surface fields: ${bad.length}`);
if (unjustifiedReview.length) violations.push(`review_lane rows missing justification: ${unjustifiedReview.length}`);
if (rows.some((row) => row.shard_id === 'shard_1' && ['ocr_hard', 'diagram_review_heavy'].includes(row.difficulty_band))) {
  violations.push('shard_1 contains forbidden hard rows after audit');
}
if (rows.some((row) => row.difficulty_band === 'diagram_review_heavy' && row.shard_id !== 'shard_3')) {
  violations.push('diagram_review_heavy rows escaped shard_3 after audit');
}
if (fixtureCases.length !== 9) violations.push(`wave-a probe fixture must contain 9 cases, got ${fixtureCases.length}`);
for (const key of gateCriticalKeys) {
  if ((fixtureKeyCounts[key] || 0) !== 1) violations.push(`gate_critical row must appear exactly once in probe fixture: ${key}`);
}
for (const bucket of ['9709.p1.trigonometry', '9709.p3.integration', '9709.p3.trigonometry']) {
  if ((fixtureBucketCounts[bucket] || 0) !== 3) {
    violations.push(`probe fixture bucket ${bucket} must equal 3, got ${fixtureBucketCounts[bucket] || 0}`);
  }
}
if ((fixture.manifest_digest || fixture.source_manifest_digest) !== manifestDigest) {
  violations.push('probe fixture must record the final manifest digest used for derivation');
}
if (violations.length) {
  console.error(JSON.stringify({
    violations,
    bad: bad.slice(0, 5),
    unjustifiedReview,
    fixtureBucketCounts,
    manifestDigest,
    recordedManifestDigest: fixture.manifest_digest || fixture.source_manifest_digest || null,
  }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  unresolved: 0,
  reviewed_rows: rows.length,
  fixture_cases: fixtureCases.length,
  fixtureBucketCounts,
  manifestDigest,
}, null, 2));
NODE
```

Expected:
- `unresolved = 0`

## Chunk 4: Shard 1 Execution

### Task 4: Execute the clean-first shard and prove nothing regresses

**GitHub Issue Title:** `9709 Wave A: execute shard 1 and preserve green gate`

**Depends on:** `Chunk 3`

**Files:**
- Create: `docs/reports/2026-04-19-9709-wave-a-shard1-execution-report.md`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md`
- Modify: `docs/reports/INDEX.md`
- Reference: `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- Reference: `data/contracts/9709_wave_a_thresholds_v1.json`

- [ ] **Step 1: Run the lane runner on `shard_1` only**

Run:
```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --output docs/reports/2026-04-19-9709-wave-a-shard1-results.json
```

- [ ] **Step 2: Run the full closure flow for `shard_1`**

Run:
```bash
node scripts/learning/run_9709_wave1_search_closure.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --lane-results docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --scope-from-lane-results \
  --evidence-bundles-out docs/reports/2026-04-19-9709-wave-a-shard1-bundles.json \
  --gate-report docs/reports/2026-04-19-9709-wave-a-shard1-gate-report.md \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard1-gate.json \
  --gate-psql-mode docker
```

- [ ] **Step 3: Run current-shard projection audit**

Run:
```bash
node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json
```

- [ ] **Step 4: Run shard QC and deterministic full-review**

Run:
```bash
python3 scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-qc.json
```

Run:
```bash
python3 scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --shard-id shard_1 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json
```

- [ ] **Step 5: Build the canonical shard-1 verdict**

Run:
```bash
python3 scripts/vlm/qc_wave_a_shard_verdict.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard1-gate.json \
  --projection-audit-json docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json \
  --full-review-json docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json \
  --output-md docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md
```

- [ ] **Step 6: Verify the shard-1 stop/go contract**

Shard 1 only passes if:

- provider failures = `0`
- baseline gate still passes
- unexpected review fallbacks on clean/medium rows = `0`
- rows outside the manifest-justified `review_lane` allowlist = `0`
- for `clean` and `medium`, actual lane matches manifest `route_hint`
- current-shard projection completeness = `100%`
- current-shard direct queryability audit passes
- duplicate projection rows = `0`
- deterministic full-review acceptance >= `9/10`
- shard verdict = `pass`

- [ ] **Step 7: Write the shard-1 execution report and explicitly decide go/no-go for shard 2**

The execution report must include:

- execution fingerprint
- whether the run was current-shard-only or cumulative
- whether any cleanup/reset would be required if shard 1 had failed

Rerun rule:

- if any prior shard-1 attempt ended without `shard verdict = pass`, a checked-in reset artifact must exist before rerun starts

## Chunk 5: Shard 2 Execution

### Task 5: Introduce OCR-hard rows without losing the stable closure path

**GitHub Issue Title:** `9709 Wave A: execute shard 2 and preserve green gate`

**Depends on:** `Chunk 4` green

**Files:**
- Create: `docs/reports/2026-04-19-9709-wave-a-shard2-execution-report.md`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.md`
- Modify: `docs/reports/INDEX.md`
- Reference: `docs/reports/2026-04-19-9709-wave-a-shard1-execution-report.md`

- [ ] **Step 1: Run the lane runner on `shard_2`**

Run:
```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --output docs/reports/2026-04-19-9709-wave-a-shard2-results.json
```

- [ ] **Step 2: Run the full closure flow for `shard_2`**

Run:
```bash
node scripts/learning/run_9709_wave1_search_closure.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --lane-results docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --scope-from-lane-results \
  --evidence-bundles-out docs/reports/2026-04-19-9709-wave-a-shard2-bundles.json \
  --gate-report docs/reports/2026-04-19-9709-wave-a-shard2-gate-report.md \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard2-gate.json \
  --gate-psql-mode docker
```

- [ ] **Step 3: Run current-shard projection audit**

Run:
```bash
node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json
```

- [ ] **Step 4: Run shard QC and deterministic full-review**

Run:
```bash
python3 scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-qc.json
```

Run:
```bash
python3 scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --shard-id shard_2 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-full-review.json
```

- [ ] **Step 5: Build the canonical shard-2 verdict**

Run:
```bash
python3 scripts/vlm/qc_wave_a_shard_verdict.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard2-gate.json \
  --projection-audit-json docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json \
  --full-review-json docs/reports/2026-04-19-9709-wave-a-shard2-full-review.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json \
  --output-md docs/reports/2026-04-19-9709-wave-a-shard2-verdict.md
```

- [ ] **Step 6: Verify the shard-2 stop/go contract**

Shard 2 only passes if:

- provider failures = `0`
- baseline gate still passes
- unexpected review fallbacks on clean/medium rows = `0`
- rows outside the manifest-justified `review_lane` allowlist = `0`
- for `clean` and `medium`, actual lane matches manifest `route_hint`
- current-shard projection completeness = `100%`
- current-shard direct queryability audit passes
- duplicate projection rows = `0`
- deterministic full-review acceptance >= `9/10`
- shard verdict = `pass`

- [ ] **Step 7: Write the shard-2 execution report and explicitly decide go/no-go for shard 3**

Rerun rule:

- if any prior shard-2 attempt ended without `shard verdict = pass`, a checked-in reset artifact must exist before rerun starts

## Chunk 6: Shard 3 Execution

### Task 6: Run the stress shard and prove the hard rows stay bounded

**GitHub Issue Title:** `9709 Wave A: execute shard 3 and preserve green gate`

**Depends on:** `Chunk 5` green

**Files:**
- Create: `docs/reports/2026-04-19-9709-wave-a-shard3-execution-report.md`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json`
- Create: `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.md`
- Modify: `docs/reports/INDEX.md`
- Reference: `docs/reports/2026-04-19-9709-wave-a-shard2-execution-report.md`

- [ ] **Step 1: Run the lane runner on `shard_3`**

Run:
```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --output docs/reports/2026-04-19-9709-wave-a-shard3-results.json
```

- [ ] **Step 2: Run the full closure flow for `shard_3`**

Run:
```bash
node scripts/learning/run_9709_wave1_search_closure.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --lane-results docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --scope-from-lane-results \
  --evidence-bundles-out docs/reports/2026-04-19-9709-wave-a-shard3-bundles.json \
  --gate-report docs/reports/2026-04-19-9709-wave-a-shard3-gate-report.md \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard3-gate.json \
  --gate-psql-mode docker
```

- [ ] **Step 3: Run current-shard projection audit**

Run:
```bash
node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json
```

- [ ] **Step 4: Run shard QC and deterministic full-review**

Run:
```bash
python3 scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-qc.json
```

Run:
```bash
python3 scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --shard-id shard_3 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json
```

- [ ] **Step 5: Build the canonical shard-3 verdict**

Run:
```bash
python3 scripts/vlm/qc_wave_a_shard_verdict.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard3-gate.json \
  --projection-audit-json docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json \
  --full-review-json docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json \
  --output-md docs/reports/2026-04-19-9709-wave-a-shard3-verdict.md
```

- [ ] **Step 6: Verify the shard-3 stop/go contract**

Shard 3 only passes if:

- provider failures = `0`
- baseline gate still passes
- no additional clean/medium rows degrade into review fallback
- rows outside the manifest-justified `review_lane` allowlist = `0`
- for `clean` and `medium`, actual lane matches manifest `route_hint`
- current-shard projection completeness = `100%`
- current-shard direct queryability audit passes
- duplicate projection rows = `0`
- deterministic full-review acceptance >= `9/10`
- shard verdict = `pass`

- [ ] **Step 7: Write the shard-3 execution report and summarize whether Wave A is ready for closeout**

Rerun rule:

- if any prior shard-3 attempt ended without `shard verdict = pass`, a checked-in reset artifact must exist before rerun starts

## Chunk 7: Wave A Closeout

### Task 7: Publish the aggregate closeout and decide whether to open Wave B

**GitHub Issue Title:** `9709 Wave A: publish closeout report and Wave B recommendation`

**Depends on:** `Chunk 6` green

**Files:**
- Create: `docs/reports/2026-04-19-9709-wave-a-closeout-report.md`
- Create: `docs/reports/2026-04-19-9709-wave-a-closeout-summary.json`
- Modify: `docs/reports/INDEX.md`
- Reference: `data/eval/question_search_gold_9709_wave_a_v1.json`
- Reference: all `2026-04-19-9709-wave-a-*` reports produced by `Chunks 1-6`

- [ ] **Step 1: Re-run the baseline fixture one final time**

Run:
```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/9709-wave-a-baseline-final.md \
  --json-out /tmp/9709-wave-a-baseline-final.json \
  --psql-mode docker
```

Expected:
- exit `0`

- [ ] **Step 2: Run the final Wave A probe fixture**

Run:
```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_wave_a_v1.json \
  --report docs/reports/2026-04-19-9709-wave-a-closeout-gate-report.md \
  --json-out docs/reports/2026-04-19-9709-wave-a-closeout-gate.json \
  --psql-mode docker
```

- [ ] **Step 3: Aggregate the three shard reports into one closeout posture**

The closeout report must summarize:

- per-bucket counts
- per-shard results
- route distribution
- review-lane utilization
- paper-backed hydration completeness
- baseline gate result
- Wave A probe fixture result
- shard verdict lineage
- execution fingerprint lineage across all three shards

- [ ] **Step 4: Write the machine-readable closeout summary**

The JSON summary must include at least:

- manifest path + digest
- thresholds path + digest
- shard verdict lineage
- projection/queryability summary
- baseline gate result
- Wave A probe fixture result
- final recommendation

- [ ] **Step 5: Make a binary recommendation**

The report must end with exactly one of:

- `Proceed to Wave B (60 rows, same controls)`
- `Stop after Wave A and open remediation issues`

- [ ] **Step 6: If the answer is remediation, name the exact next issue slices**

Acceptable remediation examples:

- route calibration for one bucket
- OCR-hard prompt/schema repair
- diagram-lane bounded follow-up
- projection hydration regression fix

## Execution Notes

When translating this plan into GitHub issues:

- use one GitHub issue per chunk
- use the explicit `GitHub Issue Title` written in each task block as the issue title
- copy the `Depends on`, `Files`, commands, and acceptance rules directly into the issue body
- do not combine shard execution issues into one large issue
- keep each shard issue blocked on the previous shard's checked-in `pass` verdict

## Final Delivery Standard

The real deliverable for Wave A is not "30 more rows exist somewhere."

The real deliverable is:

- `30` additional `9709` rows selected intentionally
- executed through the same honest replayable closure path
- proven in checked-in reports
- still green on the baseline gate
- clear enough that Wave B can be approved or refused without guesswork
