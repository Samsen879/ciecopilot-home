# 9709 Wave A GitHub Issue Drafts

**Date:** 2026-04-19  
**Status:** draft for external AI review before GitHub creation  
**Source plan:** `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`  
**Purpose:** convert the Wave A execution plan into directly copyable GitHub issue drafts without losing stop/go rigor

## Review Intent

这份文档不是新的策略稿，而是把已经冻结的 Wave A 计划拆成可直接创建的 GitHub issue 草案。

建议让别的 AI 审阅时重点检查：

1. issue 边界是否清楚，是否还有明显过宽或过窄的切分。
2. 依赖顺序是否闭合，是否存在“后置 issue 需要前置 issue 额外产物但正文没写出来”的问题。
3. 每个 shard 的 stop/go 是否已经机械化，而不是停留在人工判断。
4. closure / projection / verdict / full-review 四条验证面是否都接上了。
5. 有没有遗漏会导致“baseline 仍绿，但新行并未真正闭环”的风险。

## Suggested Creation Order

建议创建顺序：

1. tracker
2. baseline preflight
3. Wave A manifest freeze
4. shard-aware closure / projection audit / verdict / reset controls
5. surface audit / route freeze / final probe freeze
6. shard 1 execution
7. shard 2 execution
8. shard 3 execution
9. closeout

规则：

- `shard_2` 只能在 `shard_1 verdict = pass` 后创建或转入 active
- `shard_3` 只能在 `shard_2 verdict = pass` 后创建或转入 active
- closeout 只能在 `shard_3 verdict = pass` 后进入 active

## Suggested Labels

- `subject:9709`
- `area:vlm`
- `area:learning-search`
- `type:data-pipeline`
- `wave:a`

额外建议：

- tracker 用 `type:tracker`
- manifest / audit / closeout 用 `type:plan`
- shard 执行 issue 用 `type:execution`

## Tracker Draft

**Title:** `9709 Wave A Controlled Expansion Tracker`

**Labels:** `subject:9709`, `area:vlm`, `area:learning-search`, `type:tracker`, `wave:a`

**Body:**

```md
## Goal

Expand the proven `9709` AO/VLM closed loop from the current `17`-row pilot to a controlled `Wave A` of `30` new single-question assets without regressing replayability, search quality, or the current green baseline gate.

## Governing Doc

- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- issue draft pack: `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`

## Rules Of Engagement

- stay inside `9709.p1.trigonometry`, `9709.p3.integration`, `9709.p3.trigonometry`
- use single-question images only
- execute in `3` shards of `10`
- keep the existing baseline gate green after every shard
- do not continue to the next shard without a checked-in shard verdict of `pass`

## Issue Checklist

- [ ] `9709 baseline: verify minimal complete loop on the execution line`
- [ ] `9709 Wave A: freeze Wave A manifest and selection report`
- [ ] `9709 Wave A: add shard-aware closure, projection audit, verdict, and failed-shard reset controls`
- [ ] `9709 Wave A: complete surface audit, route freeze, and final probe freeze`
- [ ] `9709 Wave A: execute shard 1 and preserve green gate`
- [ ] `9709 Wave A: execute shard 2 and preserve green gate`
- [ ] `9709 Wave A: execute shard 3 and preserve green gate`
- [ ] `9709 Wave A: publish closeout report and Wave B recommendation`

## Dependency Rules

1. Baseline preflight must complete before Wave A work starts.
2. Manifest freeze must complete before tooling changes.
3. Tooling/verdict/reset controls must complete before surface audit.
4. Surface audit/final probe freeze must complete before shard execution.
5. `shard_2` depends on `shard_1 verdict = pass`.
6. `shard_3` depends on `shard_2 verdict = pass`.
7. Closeout depends on `shard_3 verdict = pass`.

## Stop Rules

Stop and open remediation instead of continuing if any shard produces:

- provider failures
- baseline gate regression
- incomplete projection fields
- failed current-shard queryability audit
- duplicate projection rows
- unexpected review-lane fallback on clean/medium rows
- deterministic full-review acceptance below `9/10`
- shard verdict other than `pass`
```

## Issue 1

**Title:** `9709 baseline: verify minimal complete loop on the execution line`

**Labels:** `subject:9709`, `area:learning-search`, `type:plan`, `wave:a`

**Depends on:** none

**Body:**

```md
## Goal

Verify that the target execution line already contains the real `9709` minimal complete loop before any Wave A expansion work starts.

## Why

All Wave A success claims depend on a truthful baseline:

- closure runner exists
- host backfill wrappers exist
- checked-in live VLM evidence exists
- current baseline gate still reruns green

If this is not true, Wave A must not start yet.

## Reference

- `docs/reports/2026-04-16-9709-minimal-complete-loop-current-state.md`
- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md`
- `scripts/learning/run_9709_wave1_search_closure.js`

## Scope

- verify required closure runner and host wrappers exist
- verify checked-in live rerun artifacts exist
- rerun baseline closure in dry-run mode
- rerun current baseline gate
- record execution fingerprint

## Commands

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

```bash
node scripts/learning/run_9709_wave1_search_closure.js --dry-run
```

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/9709-baseline-gate-check.md \
  --json-out /tmp/9709-baseline-gate-check.json \
  --psql-mode docker
```

## Acceptance

- required closure surfaces exist
- required checked-in rerun artifacts exist
- baseline closure dry-run prints a clean 4-step plan
- baseline gate exits `0`
- issue comment or linked note records execution fingerprint:
  - current branch
  - repo SHA
  - baseline fixture path
  - gate JSON path
  - `psql` mode

## Non-Goals

- no new Wave A data
- no prompt/schema changes
- no shard execution
```

## Issue 2

**Title:** `9709 Wave A: freeze Wave A manifest and selection report`

**Labels:** `subject:9709`, `area:vlm`, `type:plan`, `wave:a`

**Depends on:** `9709 baseline: verify minimal complete loop on the execution line`

**Body:**

```md
## Goal

Freeze a new Wave A manifest containing exactly `30` new `9709` rows, with balanced bucket and shard composition, plus a checked-in selection report explaining why these rows belong in Wave A.

## Files

- create `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- create `docs/reports/2026-04-19-9709-wave-a-manifest-selection-report.md`

## Required Manifest Fields

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

## Required Composition

- `10` rows for `9709.p1.trigonometry`
- `10` rows for `9709.p3.integration`
- `10` rows for `9709.p3.trigonometry`
- per bucket:
  - `6 clean`
  - `2 medium`
  - `1 ocr_hard`
  - `1 diagram_review_heavy`
- every shard must contain all three buckets
- no shard may contain more than `4` rows from the same bucket
- `shard_1` may not contain `ocr_hard` or `diagram_review_heavy`
- all `diagram_review_heavy` rows must be in `shard_3`

## Selection Report Must Explain

- why each bucket was chosen
- candidate row sources
- why each row was assigned to `shard_1`, `shard_2`, or `shard_3`
- which rows are intentionally hard
- which rows are `gate_critical=true`
- which rows are `descriptor_required=true`
- how manifest `paper` is expected to map to projection `paper_number`

## Verification

```bash
node - <<'NODE'
const fs = require('fs');

const wave = JSON.parse(fs.readFileSync('data/manifests/9709_question_search_expansion_wave_a_v1.json', 'utf8'));
const recovery = JSON.parse(fs.readFileSync('data/manifests/9709_question_search_recovery_v1.json', 'utf8'));

const rows = wave.items || [];
const recoveryRows = recovery.items || [];

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

const duplicates = (values) =>
  [...new Set(values.filter((value, idx, arr) => value && arr.indexOf(value) !== idx))];

const dupStorage = duplicates(rows.map((row) => row.storage_key));
const dupPaperScope = duplicates(rows.map((row) => row.paper_scope_key));

const recoveryStorage = new Set(recoveryRows.map((row) => row.storage_key).filter(Boolean));
const recoveryPaperScope = new Set(recoveryRows.map((row) => row.paper_scope_key).filter(Boolean));

const overlapStorage = rows
  .filter((row) => recoveryStorage.has(row.storage_key))
  .map((row) => row.storage_key);

const overlapPaperScope = rows
  .filter((row) => recoveryPaperScope.has(row.paper_scope_key))
  .map((row) => row.paper_scope_key);

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

if (dupStorage.length) {
  violations.push(`duplicate storage_key values: ${dupStorage.join(', ')}`);
}

if (dupPaperScope.length) {
  violations.push(`duplicate paper_scope_key values: ${dupPaperScope.join(', ')}`);
}

if (overlapStorage.length) {
  violations.push(`storage_key overlap with recovery manifest: ${overlapStorage.join(', ')}`);
}

if (overlapPaperScope.length) {
  violations.push(`paper_scope_key overlap with recovery manifest: ${overlapPaperScope.join(', ')}`);
}

if (violations.length) {
  console.error(JSON.stringify({
    violations,
    byBucket,
    byShard,
    byDifficulty,
    shardBucketCounts,
    dupStorage,
    dupPaperScope,
    overlapStorage,
    overlapPaperScope,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  total: rows.length,
  byBucket,
  byShard,
  byDifficulty,
  shardBucketCounts,
  dupStorage: 0,
  dupPaperScope: 0,
  overlapStorage: 0,
  overlapPaperScope: 0,
}, null, 2));
NODE
```

## Acceptance

- manifest file exists and contains exactly `30` new rows
- all composition rules are mechanically satisfied
- `storage_key` values are unique
- `paper_scope_key` values are unique
- there is no unintended overlap with `data/manifests/9709_question_search_recovery_v1.json`
- selection report is checked in
- no Wave A row is added to the old recovery manifest

## Non-Goals

- no routing/tooling changes
- no live VLM rerun
- no projection hydration
```

## Issue 3

**Title:** `9709 Wave A: add shard-aware closure, projection audit, verdict, and failed-shard reset controls`

**Labels:** `subject:9709`, `area:vlm`, `area:learning-search`, `type:data-pipeline`, `wave:a`

**Depends on:** `9709 Wave A: freeze Wave A manifest and selection report`

**Body:**

```md
## Goal

Add the missing execution-control surfaces that make Wave A shards mechanically trustworthy:

- shard-aware lane runner filtering
- explicit closure runner scoping
- current-shard projection audit
- canonical shard verdict aggregation
- failed-shard reset controls

## Files

- create `data/contracts/9709_wave_a_thresholds_v1.json`
- create `scripts/vlm/qc_wave_a_shard_verdict.py`
- create `tests/test_qwen_wave_a_shard_verdict.py`
- create `scripts/learning/run_wave_a_projection_audit.js`
- create `scripts/learning/__tests__/run-wave-a-projection-audit.test.js`
- create `scripts/learning/run_wave_a_shard_reset.js`
- create `scripts/learning/__tests__/run-wave-a-shard-reset.test.js`
- modify `scripts/vlm/create_jobs_from_manifest.py`
- modify `scripts/vlm/qwen_lane_runner_v1.py`
- modify `scripts/vlm/qc_stats.py`
- modify `scripts/vlm/qc_vlm_spot_check.py`
- modify `scripts/learning/run_9709_wave1_search_closure.js`
- modify tests for lane runner / qc / closure

## Required Behavior

### Manifest-driven job creation

- support `--shard-id`
- preserve unfiltered behavior
- dry-run prints route counts and targeted identities

### Closure runner

- accept `--shard-id`
- support explicit authoritative scope mode:
  - `--scope-from-lane-results` for all live shard execution
  - `--scope-from-manifest` for dry-run or reset only
- live shard issues must use `--scope-from-lane-results`
- dry-run prints:
  - `scope_mode`
  - `scope_source`
  - target row count
  - target storage keys
  - `cumulative_mode`
- live output must also print:
  - `scope_mode`
  - `scope_source`
  - target row count
  - target storage keys
  - `cumulative_mode`
- exit non-zero if resolved scope is not current-shard-only
- exit non-zero if `--shard-id` and authoritative scope identities disagree

### Threshold contract

Must define at least:

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

### Projection audit

Must verify current-shard identities only:

- rows exist exactly once in paper-backed projection/search surfaces
- manifest `paper` maps correctly to projection `paper_number`
- required projection fields are non-null
- direct queryability rule passes
- exits non-zero on violation

### Canonical shard verdict

Must aggregate:

- `--lane-results-json`
- `--gate-json`
- `--projection-audit-json`
- `--full-review-json`
- `--thresholds-json`
- optionally `--evidence-bundles-json`

This verdict JSON/MD becomes the only stop/go truth source.

### Failed-shard reset

- delete current-shard identities only
- require `--manifest`, `--shard-id`, and explicit scope
- emit JSON with:
  - target identities
  - pre-reset counts
  - deleted counts
  - post-reset counts
- exit non-zero on out-of-scope delete, partial delete, or unresolved leftovers

## Verification

```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --dry-run
```

```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --dry-run
```

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

```bash
node scripts/learning/run_wave_a_projection_audit.js --help
```

```bash
python3 scripts/vlm/qc_wave_a_shard_verdict.py --help
```

```bash
node scripts/learning/run_wave_a_shard_reset.js --help
```

## Acceptance

- shard filtering works
- closure scope is explicit and inspectable in dry-run
- live closure enforces `scope_mode = lane_results` and `cumulative_mode = false`
- projection audit has checked-in positive and negative tests
- projection audit exits non-zero on:
  - duplicate projection rows
  - missing required projection fields
  - failed current-shard queryability
  - manifest `paper` to projection `paper_number` mismatch
- canonical shard verdict has checked-in positive and negative tests
- canonical shard verdict exits non-zero when any threshold contract fails
- failed-shard reset has checked-in positive and negative tests
- failed-shard reset exits non-zero on out-of-scope delete, partial delete, or unresolved leftovers
- QC can report descriptor coverage for `descriptor_required=true` rows
- QC/verdict consume manifest-driven route rules for `route_hint` and justified `review_lane`
- tooling changes remain additive to existing wave-1 behavior

## Non-Goals

- no surface audit yet
- no probe fixture freeze yet
- no live shard execution yet
```

## Issue 4

**Title:** `9709 Wave A: complete surface audit, route freeze, and final probe freeze`

**Labels:** `subject:9709`, `area:vlm`, `type:plan`, `wave:a`

**Depends on:** `9709 Wave A: add shard-aware closure, projection audit, verdict, and failed-shard reset controls`

**Body:**

```md
## Goal

Resolve Wave A surface metadata before any live shard rerun, freeze `route_hint` per row, and generate the final Wave A probe fixture only after the post-audit manifest is final.

## Files

- modify `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- create `docs/reports/2026-04-19-9709-wave-a-surface-audit-report.md`
- create `data/eval/question_search_gold_9709_wave_a_v1.json`

## Required Surface Fields

Every Wave A row must resolve:

- `diagram_present`
- `formula_dense`
- `table_heavy`
- `ocr_risk`
- `surface_evidence_status`

## Required Route Rules

- default to `ocr_lane` for clean/medium non-diagram rows
- use `diagram_lane` only for real spatial/diagram cases
- reserve `review_lane` for explicitly justified hard rows only

Every intentional `review_lane` row must include a non-empty justification field.

## Probe Fixture Rules

- generate only after the final post-audit manifest is frozen
- include all `gate_critical=true` rows
- fill remaining slots to reach `9` total cases with balanced bucket coverage
- record the manifest digest used to derive the fixture

## Surface Audit Report Must Summarize

- route distribution
- hard-row inventory
- rows removed from candidate set
- rows reassigned across shards
- final probe fixture composition
- all intentional `review_lane` rows and their justifications

## Verification

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
const fixture = JSON.parse(fixtureRaw);
const rows = manifest.items || [];
const fixtureCases = Array.isArray(fixture.cases) ? fixture.cases : [];
const fixtureKeyCounts = fixtureCases.reduce((acc, row) => {
  if (row.storage_key) acc[row.storage_key] = (acc[row.storage_key] || 0) + 1;
  return acc;
}, {});
const gateCriticalKeys = rows.filter((row) => row.gate_critical === true).map((row) => row.storage_key);
const fixtureBucketCounts = fixtureCases.reduce((acc, row) => {
  const bucket = row.bucket || row.primary_topic_path;
  if (bucket) acc[bucket] = (acc[bucket] || 0) + 1;
  return acc;
}, {});
const bad = rows.filter((row) =>
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
const violations = [];
if (bad.length) violations.push(`unresolved surface fields: ${bad.length}`);
if (unjustifiedReview.length) violations.push(`review_lane rows missing justification: ${unjustifiedReview.length}`);
if (rows.some((row) => row.shard_id === 'shard_1' && ['ocr_hard', 'diagram_review_heavy'].includes(row.difficulty_band))) {
  violations.push('shard_1 contains forbidden hard rows after audit');
}
if (rows.some((row) => row.difficulty_band === 'diagram_review_heavy' && row.shard_id !== 'shard_3')) {
  violations.push('diagram_review_heavy rows escaped shard_3 after audit');
}
if (fixtureCases.length !== 9) {
  violations.push(`wave-a probe fixture must contain 9 cases, got ${fixtureCases.length}`);
}
for (const key of gateCriticalKeys) {
  if ((fixtureKeyCounts[key] || 0) !== 1) {
    violations.push(`gate_critical row must appear exactly once in probe fixture: ${key}`);
  }
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

## Acceptance

- all surface fields resolved
- no unjustified `review_lane` row remains
- post-audit manifest is final
- final probe fixture is mechanically verified to:
  - include every `gate_critical=true` row exactly once
  - contain exactly `9` total cases
  - preserve balanced bucket coverage
  - record the final manifest digest used for derivation
- surface audit report is checked in

## Non-Goals

- no live shard execution yet
- no closeout recommendation yet
```

## Issue 5

**Title:** `9709 Wave A: execute shard 1 and preserve green gate`

**Labels:** `subject:9709`, `area:vlm`, `area:learning-search`, `type:execution`, `wave:a`

**Depends on:** `9709 Wave A: complete surface audit, route freeze, and final probe freeze`

**Body:**

```md
## Goal

Run the clean-first shard, prove current-shard rows actually hydrate/query correctly, and produce the canonical shard-1 verdict.

## Outputs

- `docs/reports/2026-04-19-9709-wave-a-shard1-results.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-bundles.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-qc.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md`
- `docs/reports/2026-04-19-9709-wave-a-shard1-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard1-reset.json` when rerun is required

## Commands

```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --output docs/reports/2026-04-19-9709-wave-a-shard1-results.json
```

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

```bash
node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json
```

```bash
python3 scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-qc.json
```

```bash
python3 scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --shard-id shard_1 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json
```

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

## Stop/Go Acceptance

Shard 1 passes only if:

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

## Execution Report Must Include

- execution fingerprint
- explicit confirmation that `scope_mode = lane_results` and `cumulative_mode = false`
- whether cleanup/reset would have been required on failure

Execution fingerprint must include at least:

- repo SHA
- branch
- manifest path + digest
- thresholds path + digest
- model identifiers
- prompt/schema identifiers
- closure scope mode/source
- DB target alias
- `psql` mode
- all output artifact paths + digests

## Rerun / Cleanup Recovery

If any prior attempt for this shard ended without `shard verdict = pass`, run the shard reset first and attach the checked-in reset JSON before rerunning.

No rerun may start until the reset artifact proves that only current-shard identities were removed from the Wave A write surfaces.

Run the reset before any rerun. Example for `shard_1`:

```bash
node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-reset.json
```

## Non-Goals

- no shard 2 work
- no Wave B planning
```

## Issue 6

**Title:** `9709 Wave A: execute shard 2 and preserve green gate`

**Labels:** `subject:9709`, `area:vlm`, `area:learning-search`, `type:execution`, `wave:a`

**Depends on:** `9709 Wave A: execute shard 1 and preserve green gate`

**Body:**

```md
## Goal

Run the OCR-hard introduction shard without losing the stable closure path proven in shard 1.

## Outputs

- `docs/reports/2026-04-19-9709-wave-a-shard2-results.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-bundles.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-gate-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard2-gate.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-qc.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-full-review.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.md`
- `docs/reports/2026-04-19-9709-wave-a-shard2-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard2-reset.json` when rerun is required

## Commands

```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --output docs/reports/2026-04-19-9709-wave-a-shard2-results.json
```

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

```bash
node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json
```

```bash
python3 scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-qc.json
```

```bash
python3 scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --shard-id shard_2 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-full-review.json
```

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

## Stop/Go Acceptance

Shard 2 passes only if:

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

## Execution Report Must Include

- execution fingerprint
- shard-2-specific OCR-hard observations
- explicit confirmation that `scope_mode = lane_results` and `cumulative_mode = false`
- whether any rerun/cleanup would be required on failure

Execution fingerprint must include at least:

- repo SHA
- branch
- manifest path + digest
- thresholds path + digest
- model identifiers
- prompt/schema identifiers
- closure scope mode/source
- DB target alias
- `psql` mode
- all output artifact paths + digests

## Rerun / Cleanup Recovery

If any prior attempt for this shard ended without `shard verdict = pass`, run the shard reset first and attach the checked-in reset JSON before rerunning.

No rerun may start until the reset artifact proves that only current-shard identities were removed from the Wave A write surfaces.

Run the reset before any rerun. Example for `shard_2`:

```bash
node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-reset.json
```

## Non-Goals

- no shard 3 work
- no closeout recommendation yet
```

## Issue 7

**Title:** `9709 Wave A: execute shard 3 and preserve green gate`

**Labels:** `subject:9709`, `area:vlm`, `area:learning-search`, `type:execution`, `wave:a`

**Depends on:** `9709 Wave A: execute shard 2 and preserve green gate`

**Body:**

```md
## Goal

Run the stress shard, containing the declared hardest rows, and prove the hard cases stay bounded instead of causing a broader regression.

## Outputs

- `docs/reports/2026-04-19-9709-wave-a-shard3-results.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-bundles.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-gate-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard3-gate.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-qc.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.md`
- `docs/reports/2026-04-19-9709-wave-a-shard3-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard3-reset.json` when rerun is required

## Commands

```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --output docs/reports/2026-04-19-9709-wave-a-shard3-results.json
```

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

```bash
node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json
```

```bash
python3 scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-qc.json
```

```bash
python3 scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --shard-id shard_3 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json
```

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

## Stop/Go Acceptance

Shard 3 passes only if:

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

## Execution Report Must Include

- execution fingerprint
- hard-row inventory outcome
- explicit confirmation that `scope_mode = lane_results` and `cumulative_mode = false`
- whether any failed-shard isolation would have been required

Execution fingerprint must include at least:

- repo SHA
- branch
- manifest path + digest
- thresholds path + digest
- model identifiers
- prompt/schema identifiers
- closure scope mode/source
- DB target alias
- `psql` mode
- all output artifact paths + digests

## Rerun / Cleanup Recovery

If any prior attempt for this shard ended without `shard verdict = pass`, run the shard reset first and attach the checked-in reset JSON before rerunning.

No rerun may start until the reset artifact proves that only current-shard identities were removed from the Wave A write surfaces.

Run the reset before any rerun. Example for `shard_3`:

```bash
node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-reset.json
```

## Non-Goals

- no Wave B recommendation yet
```

## Issue 8

**Title:** `9709 Wave A: publish closeout report and Wave B recommendation`

**Labels:** `subject:9709`, `area:learning-search`, `type:plan`, `wave:a`

**Depends on:** `9709 Wave A: execute shard 3 and preserve green gate`

**Body:**

```md
## Goal

Aggregate the three passing shard results into a single Wave A closeout posture and make one binary recommendation: proceed to Wave B or stop and remediate.

## Files

- create `docs/reports/2026-04-19-9709-wave-a-closeout-report.md`
- create `docs/reports/2026-04-19-9709-wave-a-closeout-summary.json`
- update `docs/reports/INDEX.md`

## Required Final Checks

### Baseline fixture rerun

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/9709-wave-a-baseline-final.md \
  --json-out /tmp/9709-wave-a-baseline-final.json \
  --psql-mode docker
```

### Final Wave A probe fixture

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_wave_a_v1.json \
  --report docs/reports/2026-04-19-9709-wave-a-closeout-gate-report.md \
  --json-out docs/reports/2026-04-19-9709-wave-a-closeout-gate.json \
  --psql-mode docker
```

## Closeout Report Must Summarize

- per-bucket counts
- per-shard results
- route distribution
- review-lane utilization
- paper-backed hydration completeness
- baseline gate result
- Wave A probe fixture result
- shard verdict lineage
- execution fingerprint lineage across all three shards

## Machine-Readable Summary

Write `docs/reports/2026-04-19-9709-wave-a-closeout-summary.json` with at least:

- manifest path + digest
- thresholds path + digest
- shard verdict lineage
- projection/queryability summary
- baseline gate result
- Wave A probe fixture result
- final recommendation

## Final Recommendation

The report must end with exactly one of:

- `Proceed to Wave B (60 rows, same controls)`
- `Stop after Wave A and open remediation issues`

If the answer is remediation, list the exact next issue slices. Acceptable examples:

- route calibration for one bucket
- OCR-hard prompt/schema repair
- diagram-lane bounded follow-up
- projection hydration regression fix

## Acceptance

- baseline fixture reruns green
- final Wave A probe fixture runs cleanly
- closeout report is checked in
- closeout summary JSON is checked in
- recommendation is binary and explicit

## Non-Goals

- do not start Wave B implementation in this issue
- do not silently soften thresholds here
```

## Notes For External AI Review

建议让别的 AI 在这份 issue 草案上给出的是“issue 切分和执行闭环”的审阅，不是重写整体策略。

最值得它检查的点：

- tracker 是否还缺少一个单独 remediation slot
- Issue 3 是否过宽，是否要再拆成 tooling issue + verdict issue
- Issue 5/6/7 是否还需要把 failed-shard cleanup 写成更强的显式步骤
- closeout issue 是否还缺一个 final aggregate machine-readable summary JSON
