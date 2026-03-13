# Route A Cross-Subject Replication Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Route A executable for `9702 / 9231` by turning the Step 3 subject-slice pipeline into a subject-aware, governance-aware backend RAG workflow.

**Architecture:** Reuse the existing `9709` Step 3 skeleton instead of inventing a second pipeline. First, make the retrieval-availability sample builder subject-native and generate checked-in `9702 / 9231` subject-slice artifacts. Second, add manifest-aware benchmark scope validation so mixed-subject evals cannot silently run under single-subject corpus-version whitelists.

**Tech Stack:** Node.js ESM, Jest, JSON manifests, existing `scripts/rag/*` eval pipeline

---

## Execution Status: 2026-03-13

- [x] `9702 / 9231` subject-slice sample builder is subject-aware and emits explicit scope metadata.
- [x] Mixed-subject benchmark scope misuse is blocked by manifest-aware validation in `run_s2_augmentation_eval.js`.
- [x] Route A pilot runner now builds a subject-specific readiness profile after coverage and uses it for eval, instead of requiring manual `RAG_S2_READINESS_MAX_TOPIC_DEPTH_BY_SUBJECT`.
- [x] Focused regression suite is green:
  - `npm test -- scripts/rag/__tests__/build-s2-readiness-profile.test.js scripts/rag/__tests__/population-pilot.test.js scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js scripts/rag/__tests__/benchmark-scope.test.js scripts/rag/__tests__/s2-augmentation-eval.test.js`
- [x] Live `9702` pilot now passes under runner-generated readiness profile:
  - `runs/backend/rag_s2_readiness_profile_9702.json` recommends `{"9702":3}`
  - `runs/backend/rag_step3_retrieval_availability_summary_9702.json` reports `route_counts={"s2_augmentation":6}`, `readiness_guard_block_rate=0`, `fallback_rate=0`, `target_slice_quality_vs_s1=0.166667`
  - `runs/backend/rag_step3_restricted_official_population_pilot_summary_9702.json` records `status=pass`
- [x] Live `9231` pilot now passes under runner-generated readiness profile:
  - `runs/backend/rag_s2_readiness_profile_9231.json` recommends `{"9231":3}`
  - `runs/backend/rag_step3_retrieval_availability_summary_9231.json` reports `route_counts={"s2_augmentation":12}`, `final_execution_route_counts={"s2_augmentation":12}`, `readiness_guard_block_rate=0`, `fallback_rate=0`, `target_slice_quality_vs_s1=0.225397`
  - `runs/backend/rag_step3_restricted_official_population_pilot_summary_9231.json` records `status=pass`
- [x] `9231` fallback root cause was isolated and fixed:
  - root cause: `9231.FP2.Hyperbolic_Functions` expanded to nonexistent hop-1 path `9231.FP1.Hyperbolic_Functions`, and `s2-multi-hop-retriever` previously aborted the full S2 request instead of skipping the missing path
  - fix: `api/rag/lib/s2-multi-hop-retriever.js` now skips hop-1 `TOPIC_PATH_NOT_FOUND` / `TOPIC_PATH_MISSING` expansions and continues with remaining valid paths
  - verification: targeted live reruns for `s2-aug-061`, `s2-aug-062`, and `s2-aug-063` all completed with `fallback=NONE`

## Chunk 1: Subject-Aware Retrieval Availability Samples

### Task 1: Add failing tests for subject-native sample selection

**Files:**
- Create: `scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`
- Modify: `scripts/rag/build_step3_retrieval_availability_sample.js`
- Test: `scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`

- [ ] **Step 1: Write the failing test**

Add Jest coverage for:
- `9702` manifest roots are `9702`-native instead of `9709` hard-coded roots
- `9231` manifest roots are `9231`-native
- subject manifests declare `subject_scope`, `subject_codes`, and `corpus_scope_policy`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`
Expected: FAIL because the builder does not expose subject-aware root config and emitted manifests lack scope metadata.

- [ ] **Step 3: Write minimal implementation**

Update `scripts/rag/build_step3_retrieval_availability_sample.js` to:
- replace the single `ROOT_PRIORITY` constant with a subject-keyed priority map
- export pure helpers for tests
- remove the duplicate root-priority pass
- emit manifest fields:
  - `subject_scope`
  - `subject_codes`
  - `corpus_scope_policy`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/rag/build_step3_retrieval_availability_sample.js scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js
git commit -m "test: make step3 retrieval samples subject-aware"
```

### Task 2: Generate checked-in `9702` and `9231` subject-slice artifacts

**Files:**
- Modify: `data/eval/rag_s2_augmentation_eval_v1_manifest.json`
- Create: `data/eval/rag_step3_retrieval_availability_sample_9702.json`
- Create: `data/eval/rag_step3_retrieval_availability_sample_9702_manifest.json`
- Create: `data/eval/rag_step3_retrieval_availability_sample_9231.json`
- Create: `data/eval/rag_step3_retrieval_availability_sample_9231_manifest.json`
- Test: generated JSON files + builder test

- [ ] **Step 1: Write the failing test**

Extend the builder test or add fixture assertions that expect checked-in manifests for `9702` and `9231` to match the current builder output schema.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`
Expected: FAIL because the checked-in artifacts do not exist yet.

- [ ] **Step 3: Generate the minimal artifacts**

Run:

```bash
node scripts/rag/build_step3_retrieval_availability_sample.js --subject 9702 --limit 6 --out-dataset data/eval/rag_step3_retrieval_availability_sample_9702.json --out-manifest data/eval/rag_step3_retrieval_availability_sample_9702_manifest.json
node scripts/rag/build_step3_retrieval_availability_sample.js --subject 9231 --limit 12 --out-dataset data/eval/rag_step3_retrieval_availability_sample_9231.json --out-manifest data/eval/rag_step3_retrieval_availability_sample_9231_manifest.json
```

Update `data/eval/rag_s2_augmentation_eval_v1_manifest.json` to record explicit mixed-subject scope metadata.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data/eval/rag_s2_augmentation_eval_v1_manifest.json data/eval/rag_step3_retrieval_availability_sample_9702.json data/eval/rag_step3_retrieval_availability_sample_9702_manifest.json data/eval/rag_step3_retrieval_availability_sample_9231.json data/eval/rag_step3_retrieval_availability_sample_9231_manifest.json
git commit -m "feat: add route a subject slice retrieval samples"
```

## Chunk 2: Manifest-Aware Benchmark Scope Guard

### Task 3: Add failing tests for benchmark scope validation

**Files:**
- Create: `scripts/rag/__tests__/benchmark-scope.test.js`
- Create: `scripts/rag/lib/benchmark-scope.js`
- Modify: `scripts/rag/run_s2_augmentation_eval.js`
- Test: `scripts/rag/__tests__/benchmark-scope.test.js`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- mixed-subject manifest + single-subject corpus-version list => reject
- single-subject manifest + mismatched single-subject corpus-version list => reject
- single-subject manifest + matching corpus-version list => allow
- no inferable subject in corpus versions => allow but mark scope as `unknown`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/benchmark-scope.test.js`
Expected: FAIL because no scope-validation helper exists yet.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/rag/lib/benchmark-scope.js` with helpers to:
- summarize dataset subject scope
- infer corpus-version subject scope from active `RAG_CORPUS_VERSIONS`
- validate manifest + dataset + corpus-version compatibility

Update `scripts/rag/run_s2_augmentation_eval.js` to:
- capture active corpus versions in `run_config`
- call the scope validator before executing cases
- write `subject_scope_audit` into the summary payload

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/benchmark-scope.test.js`
Expected: PASS

- [ ] **Step 5: Run targeted runner regression**

Run: `npm test -- scripts/rag/__tests__/s2-augmentation-eval.test.js scripts/rag/__tests__/benchmark-scope.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/rag/lib/benchmark-scope.js scripts/rag/run_s2_augmentation_eval.js scripts/rag/__tests__/benchmark-scope.test.js
git commit -m "feat: enforce benchmark scope compatibility"
```

## Chunk 3: Route A Pilot Entry Points

### Task 4: Wire Route A pilot runner to the new subject-slice contract

**Files:**
- Modify: `scripts/rag/run_step3_production_population_pilot.js`
- Test: `scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that the pilot runner points at subject-native sample/manifests and preserves scope metadata when it shells out to the builder / eval runner.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js`
Expected: FAIL because the pilot runner does not yet assert or propagate the new scope metadata.

- [ ] **Step 3: Write minimal implementation**

Update `scripts/rag/run_step3_production_population_pilot.js` to:
- keep subject-specific dataset/manifest outputs as the contract source of truth
- preserve scope metadata through the generated artifacts
- keep restricted-official policy naming clean

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/build-step3-retrieval-availability-sample.test.js scripts/rag/__tests__/benchmark-scope.test.js scripts/rag/__tests__/s2-augmentation-eval.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/rag/run_step3_production_population_pilot.js
git commit -m "feat: align route a pilot runner with subject scope contract"
```

## Execution Notes

- Do not modify `supabase/migrations/*.sql`.
- Do not treat `src/data/data-notes` as production evidence.
- Do not make `OPENAI_API_KEY` a required precondition.
- Prefer offline-verifiable work first. Live `run_s2_augmentation_eval.js` / ingest executions require existing project credentials and should only be run after code-level guards are green.
