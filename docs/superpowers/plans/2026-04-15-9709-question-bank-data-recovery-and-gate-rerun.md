# 9709 Question Bank Data Recovery And Gate Rerun Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover the minimum viable `9709` paper-backed data surfaces so the merged question-search slice can rerun its structured retrieval gate on real data and reach a truthful release decision.

**Architecture:** Treat `AO` as the orchestration, audit, and release-evidence owner, not as the extractor itself. `AO` should first freeze a deterministic pilot manifest, repair missing `curriculum_nodes`, and recover paper-backed `question_bank` rows. `VLM` should then run only on canonical single-question images to populate `question_descriptions_v0`; do not ask it to infer the entire topic graph from whole-paper PDFs. Topic ownership for gate-critical rows should come from a curated manifest backed by existing manual audit evidence, while richer `family_id` / `primary_question_type_id` enrichment can run as a follow-up classification pass after the gate is green.

**Tech Stack:** Supabase/Postgres, existing `scripts/vlm/*` Python pipeline, existing learning question-analysis services/backfill scripts, Node/Jest, Python `pytest`, `psql`, checked-in manual-audit CSVs, JSON manifests/reports.

---

## Why This Plan Exists

The merged retrieval slice already proved that the backend search surface exists. The current blocker is data posture:

- `question_descriptions_v0` has `0` usable `9709` rows in the checked environment.
- `question_bank` has `11` `9709` rows, all `imported_question`, and `0` `paper_question` rows.
- the current gate failed on paper-backed pinned cases because `topic_path` resolution and descriptor coverage were both missing.

This plan is therefore a **data recovery and gate rerun plan**, not a new retrieval-feature plan.

## Hard Starting Assumptions

- This track assumes **Situation A** is true: canonical per-question image assets already exist under `paper_assets` and/or local `questions/q*.png` paths.
- This track must execute from a worktree based on the mainline that already contains the merged retrieval slice:
  - `#194` / commit `2a3ad48`
  - `#195` / commit `c40d400`
  - `#196` / commit `16256297853c6345c2a55a238146af44107a9642`
- Do **not** execute from `task/post-cleanup-baseline` or any worktree that does not already contain:
  - `supabase/migrations/20260415152950_create_learning_question_search_projection.sql`
  - `api/learning/questions/index.js`
  - `scripts/evaluation/run_question_search_gate.js`
- The first target is **gate-green on a deterministic `9709` pilot slice**, not full-subject automation.

## Responsibility Split

### AO Owns

- branch / worktree hygiene
- pilot-slice manifest curation
- curriculum node repair
- VLM job orchestration and QC evidence
- `question_bank` paper-backed row recovery
- deterministic topic backfill from curated evidence
- gate rerun, report writing, and release posture

### VLM Owns

- per-question image understanding for:
  - `summary`
  - `question_type`
  - `answer_form`
  - formula / variable / unit extraction
  - confidence scoring

### VLM Does Not Own For V1

- final `primary_topic_id`
- final `family_id`
- final `primary_question_type_id`
- release decision

Those fields can be enriched later, but the gate-critical topic assignment for this recovery wave should be deterministic and curated.

## Recommended Pilot Scope

The first recovery wave should stay inside one narrow pilot:

- `9709.p1.trigonometry`
- `9709.p3.integration`
- `9709.p3.trigonometry`

This is the smallest slice that:

- covers the existing gate pins
- matches already-audited rows in repo evidence
- gives product enough realistic breadth to test “topic + paper + year” retrieval

## Manifest Contract

Create a single source of truth manifest at:

- `data/manifests/9709_question_search_recovery_v1.json`

The manifest should drive:

- VLM job creation
- `question_bank` paper-backed recovery
- deterministic topic backfill
- audit / report row counts

Each manifest item should include at least:

- `storage_key`
- `syllabus_code`
- `year`
- `session`
- `paper`
- `variant`
- `q_number`
- `primary_topic_path`
- `source_reason`
- `descriptor_required`

For `v1`, the manifest should include at least these exact gate-critical rows:

- `9709/s19_qp_11/questions/q06.png` -> `9709.p1.trigonometry`
- `9709/s16_qp_33/questions/q07.png` -> `9709.p3.integration`

The recommended seed set should then add already-audited correct rows from [a1_topic_link_manual_audit_9709_p1p3_v1.csv](../../../data/eval/a1_topic_link_manual_audit_9709_p1p3_v1.csv):

- `9709/s19_qp_12/questions/q04.png` -> `9709.p1.trigonometry`
- `9709/s20_qp_12/questions/q02.png` -> `9709.p1.trigonometry`
- `9709/s21_qp_11/questions/q07.png` -> `9709.p1.trigonometry`
- `9709/s22_qp_11/questions/q04.png` -> `9709.p1.trigonometry`
- `9709/w19_qp_11/questions/q05.png` -> `9709.p1.trigonometry`
- `9709/s20_qp_33/questions/q02.png` -> `9709.p3.integration`
- `9709/s20_qp_33/questions/q07.png` -> `9709.p3.integration`
- `9709/s21_qp_32/questions/q06.png` -> `9709.p3.integration`
- `9709/s24_qp_31/questions/q08.png` -> `9709.p3.integration`
- `9709/w17_qp_31/questions/q08.png` -> `9709.p3.integration`
- `9709/s21_qp_31/questions/q03.png` -> `9709.p3.trigonometry`
- `9709/w16_qp_32/questions/q03.png` -> `9709.p3.trigonometry`
- `9709/w17_qp_33/questions/q04.png` -> `9709.p3.trigonometry`
- `9709/w18_qp_33/questions/q06.png` -> `9709.p3.trigonometry`
- `9709/w21_qp_31/questions/q02.png` -> `9709.p3.trigonometry`

## Curriculum Node Contract

Create a narrow curriculum seed source at:

- `data/curriculum/9709_question_search_recovery_nodes_v1.json`

The seed must include at least:

- `9709`
- `9709.p1`
- `9709.p1.trigonometry`
- `9709.p3`
- `9709.p3.integration`
- `9709.p3.trigonometry`

Use `version_tag = 2025-2027_v1`.

Do not widen this file into a full-subject curriculum import.

## Planned Files

### Create

- `data/manifests/9709_question_search_recovery_v1.json`
- `data/curriculum/9709_question_search_recovery_nodes_v1.json`
- `scripts/vlm/create_jobs_from_manifest.py`
- `tests/test_vlm_manifest_filter.py`
- `tests/test_create_jobs_from_manifest.py`
- `scripts/learning/lib/paper-question-registry-backfill.js`
- `scripts/learning/run_paper_question_registry_backfill.js`
- `scripts/learning/__tests__/paper-question-registry-backfill.test.js`
- `scripts/learning/__tests__/run-paper-question-registry-backfill.test.js`
- `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`

### Modify

- `scripts/vlm/batch_process_v0.py`
- `scripts/learning/lib/question-analysis-backfill.js`
- `scripts/learning/run_question_analysis_backfill.js`
- `scripts/learning/__tests__/question-analysis-backfill.test.js`
- `scripts/learning/__tests__/run-question-analysis-backfill.test.js`
- `docs/reports/INDEX.md`

### Reference Only

- `scripts/vlm/create_jobs_v0.py`
- `scripts/vlm/batch_process_v0.py`
- `scripts/vlm/qc_stats.py`
- `scripts/vlm/qc_vlm_spot_check.py`
- `scripts/db/import_curriculum_nodes.py`
- `scripts/evaluation/run_question_search_gate.js`
- `data/eval/question_search_gold_9709_v1.json`
- `data/eval/a1_topic_link_manual_audit_9709_p1p3_v1.csv`
- `docs/reports/2026-04-15-question-search-slice-v1-report.md`

## Scope Boundary

- This plan **does** recover `9709` paper-backed search data for the merged retrieval slice.
- This plan **does** use existing question images as the VLM input surface.
- This plan **does not** start from whole-paper PDF segmentation.
- This plan **does not** redesign the retrieval API.
- This plan **does not** promise full-subject `9709` coverage in wave 1.
- This plan **does not** force `question_descriptions_v1` / `question_descriptions_prod_v1` promotion before the first green gate.
- This plan **does not** build student-facing worksheet or free-form AskAI product flows.

## AO Batch Split

This plan should be executed as four AO batches:

- Batch A: preflight, manifest, and curriculum repair
- Batch B: VLM descriptor recovery and QC
- Batch C: paper-question registry recovery and deterministic topic backfill
- Batch D: optional classification enrichment, gate rerun, and release report

## Chunk 0: Preflight And Pilot Freeze

### Task 0: Start from the correct code line and freeze the failing baseline

**Files:**
- Modify: current branch only
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Reference: `docs/reports/2026-04-15-question-search-slice-v1-report.md`

- [ ] **Step 1: Create a fresh worktree from `origin/main` or an equivalent head that contains commit `16256297853c6345c2a55a238146af44107a9642`**

Run: `git merge-base --is-ancestor 16256297853c6345c2a55a238146af44107a9642 HEAD`
Expected: exit code `0`

- [ ] **Step 2: Verify that the merged retrieval-slice files already exist before any data work begins**

Run: `rg --files | rg 'api/learning/questions/index.js|api/learning/lib/questions/question-search-service.js|api/learning/lib/repositories/question-search-repository.js|scripts/evaluation/run_question_search_gate.js|supabase/migrations/20260415152950_create_learning_question_search_projection.sql'`
Expected: all five paths are present

- [ ] **Step 3: Capture the red baseline counts for `9709`**

Run: `psql "$DATABASE_URL" -c "select source_kind, count(*) from public.question_bank where subject_code = '9709' group by 1 order by 1;" -c "select count(*) as qd_9709_ok from public.question_descriptions_v0 where syllabus_code = '9709' and status = 'ok';" -c "select topic_path::text from public.curriculum_nodes where syllabus_code = '9709' and version_tag = '2025-2027_v1' order by 1;"`
Expected: `paper_question = 0`, descriptor count still red or near-zero, required topic paths missing

- [ ] **Step 4: Re-run the current gate once from the correct mainline to freeze the starting fail posture**

Run: `node scripts/evaluation/run_question_search_gate.js --fixture data/eval/question_search_gold_9709_v1.json --report docs/reports/2026-04-15-question-search-slice-v1-report.md`
Expected: exit code `1` with the same data-readiness failure posture

- [ ] **Step 5: Record the baseline counts and fail posture in `2026-04-15-9709-question-bank-data-recovery-report.md`**

Run: `git diff -- docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
Expected: report captures the red starting point before recovery work

### Task 1: Freeze the deterministic pilot manifest

**Files:**
- Create: `data/manifests/9709_question_search_recovery_v1.json`
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Reference: `data/eval/question_search_gold_9709_v1.json`
- Reference: `data/eval/a1_topic_link_manual_audit_9709_p1p3_v1.csv`

- [ ] **Step 1: Create the manifest schema with top-level metadata (`subject_code`, `curriculum_version_tag`, `items`)**
- [ ] **Step 2: Add the two existing gate-pin rows exactly as written above**
- [ ] **Step 3: Add the recommended audited support rows for `9709.p1.trigonometry`, `9709.p3.integration`, and `9709.p3.trigonometry`**
- [ ] **Step 4: Ensure every manifest item includes exact paper identity fields (`year`, `session`, `paper`, `variant`, `q_number`)**
- [ ] **Step 5: Record the final manifest size and per-topic counts in the recovery report**

Run: `jq '.items | length' data/manifests/9709_question_search_recovery_v1.json`
Expected: non-zero count, with both gate-pin rows present

### Task 2: Repair the missing curriculum nodes deterministically

**Files:**
- Create: `data/curriculum/9709_question_search_recovery_nodes_v1.json`
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Reference: `scripts/db/import_curriculum_nodes.py`

- [ ] **Step 1: Create the narrow node seed file with the six required paths**
- [ ] **Step 2: Dry-run the importer and confirm parent paths resolve**

Run: `python3 scripts/db/import_curriculum_nodes.py --source data/curriculum/9709_question_search_recovery_nodes_v1.json --version-tag 2025-2027_v1 --dry-run`
Expected: validation succeeds with no unresolved parents

- [ ] **Step 3: Upsert the node file into `curriculum_nodes`**

Run: `python3 scripts/db/import_curriculum_nodes.py --source data/curriculum/9709_question_search_recovery_nodes_v1.json --version-tag 2025-2027_v1 --upsert`
Expected: inserted/updated counts printed, no schema error

- [ ] **Step 4: Verify the required topic paths now exist**

Run: `psql "$DATABASE_URL" -c "select topic_path::text, title from public.curriculum_nodes where topic_path::text in ('9709','9709.p1','9709.p1.trigonometry','9709.p3','9709.p3.integration','9709.p3.trigonometry') order by 1;"`
Expected: all six rows are present

- [ ] **Step 5: Record before/after node counts in the recovery report**

Run: `git diff -- docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
Expected: report shows curriculum repair completed before descriptor work

## Chunk 1: VLM Descriptor Recovery

### Task 3: Add manifest-driven VLM job creation

**Files:**
- Create: `scripts/vlm/create_jobs_from_manifest.py`
- Create: `tests/test_create_jobs_from_manifest.py`
- Create: `tests/test_vlm_manifest_filter.py`
- Modify: `scripts/vlm/batch_process_v0.py`
- Reference: `scripts/vlm/create_jobs_v0.py`
- Reference: `data/manifests/9709_question_search_recovery_v1.json`

- [ ] **Step 1: Write a failing Python test for reading the manifest and resolving exact `paper_assets` rows by `storage_key`**
- [ ] **Step 2: Write a failing Python test for idempotent `vlm_jobs_v0` insertion that skips already-described rows**
- [ ] **Step 3: Write a failing Python test for `batch_process_v0.py --manifest` so workers only claim manifest-backed jobs**
- [ ] **Step 4: Implement the manifest-driven job creation script**
- [ ] **Step 5: Extend `batch_process_v0.py` with `--manifest` filtering and re-run the Python tests**

Run: `python3 -m pytest tests/test_create_jobs_from_manifest.py tests/test_vlm_manifest_filter.py -q`
Expected: PASS

### Task 4: Seed and run VLM jobs for the frozen manifest

**Files:**
- Modify: current branch only
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Reference: `scripts/vlm/batch_process_v0.py`

- [ ] **Step 1: Dry-run the manifest job creator**

Run: `python3 scripts/vlm/create_jobs_from_manifest.py --manifest data/manifests/9709_question_search_recovery_v1.json --dry-run`
Expected: candidate and eligible counts match the manifest after excluding already-described rows

- [ ] **Step 2: Insert the manifest jobs into `vlm_jobs_v0`**

Run: `python3 scripts/vlm/create_jobs_from_manifest.py --manifest data/manifests/9709_question_search_recovery_v1.json`
Expected: `created > 0` unless the manifest was already fully described

- [ ] **Step 3: Run the VLM batch processor only for the pending manifest jobs**

Run: `python3 scripts/vlm/batch_process_v0.py --manifest data/manifests/9709_question_search_recovery_v1.json --workers 4 --status pending --max-jobs 50`
Expected: jobs move to `done`, `blocked`, or `error`; no contact-sheet rows should be claimed

- [ ] **Step 4: Verify that `question_descriptions_v0` now contains `9709` `status='ok'` rows for the manifest**

Run: `psql "$DATABASE_URL" -c "select count(*) as qd_9709_ok from public.question_descriptions_v0 where syllabus_code = '9709' and status = 'ok';" -c "select storage_key, status, summary from public.question_descriptions_v0 where storage_key in ('9709/s19_qp_11/questions/q06.png','9709/s16_qp_33/questions/q07.png') order by storage_key;"`
Expected: non-zero `qd_9709_ok` count and both gate-pin rows present with usable status / summary

- [ ] **Step 5: Record the processed, blocked, and error counts in the recovery report**

Run: `git diff -- docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
Expected: report shows descriptor recovery progress by status

### Task 5: Run descriptor QC before touching the registry

**Files:**
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Reference: `scripts/vlm/qc_stats.py`
- Reference: `scripts/vlm/qc_vlm_spot_check.py`

- [ ] **Step 1: Generate descriptor QC stats**

Run: `python3 scripts/vlm/qc_stats.py --output-json output/vlm_qc_stats_9709_recovery_v1.json`
Expected: stats JSON written successfully

- [ ] **Step 2: Run a VLM-assisted spot check on `question_descriptions_v0`**

Run: `python3 scripts/vlm/qc_vlm_spot_check.py --table question_descriptions_v0 --output-json output/vlm_spot_check_9709_recovery_v1.json`
Expected: spot-check JSON written successfully

- [ ] **Step 3: Manually inspect low-confidence, blocked, and poor-quality cases that overlap the manifest**
- [ ] **Step 4: Remove or re-run any manifest row whose descriptor is still unusable**
- [ ] **Step 5: Record descriptor pass posture in the recovery report**

Run: `psql "$DATABASE_URL" -c "select storage_key, status, confidence, summary from public.question_descriptions_v0 where syllabus_code = '9709' order by updated_at desc limit 30;"`
Expected: manifest-backed rows now show non-empty summaries for paper-backed candidates

## Chunk 2: Paper-Question Registry Recovery

### Task 6: Add deterministic paper-question registry backfill

**Files:**
- Create: `scripts/learning/lib/paper-question-registry-backfill.js`
- Create: `scripts/learning/run_paper_question_registry_backfill.js`
- Create: `scripts/learning/__tests__/paper-question-registry-backfill.test.js`
- Create: `scripts/learning/__tests__/run-paper-question-registry-backfill.test.js`
- Reference: `api/learning/lib/repositories/question-registry-repository.js`
- Reference: `data/manifests/9709_question_search_recovery_v1.json`

- [ ] **Step 1: Write a failing Jest test for upserting `paper_question` rows into `question_bank` from the manifest**
- [ ] **Step 2: Write a failing Jest test for descriptor-backed `prompt_representation` hydration**
- [ ] **Step 3: Write a failing Jest test for deterministic topic lookup from `primary_topic_path` to `primary_topic_id`**
- [ ] **Step 4: Implement the backfill library and CLI**
- [ ] **Step 5: Re-run the focused Jest suite and confirm green**

Run: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand scripts/learning/__tests__/paper-question-registry-backfill.test.js scripts/learning/__tests__/run-paper-question-registry-backfill.test.js`
Expected: PASS

### Task 7: Upsert `paper_question` rows and deterministic primary topics

**Files:**
- Modify: current branch only
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Reference: `supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql`

- [ ] **Step 1: Dry-run the registry backfill against the manifest**

Run: `node scripts/learning/run_paper_question_registry_backfill.js --manifest data/manifests/9709_question_search_recovery_v1.json --dry-run`
Expected: printed preview shows `paper_question` rows and resolved node ids

- [ ] **Step 2: Execute the registry backfill for real**

Run: `node scripts/learning/run_paper_question_registry_backfill.js --manifest data/manifests/9709_question_search_recovery_v1.json`
Expected: rows inserted or updated idempotently

- [ ] **Step 3: Verify `question_bank` now contains manifest-backed `paper_question` rows**

Run: `psql "$DATABASE_URL" -c "select source_kind, count(*) from public.question_bank where subject_code = '9709' group by 1 order by 1;" -c "select storage_key, q_number, source_kind, subject_code from public.question_bank where source_kind = 'paper_question' and subject_code = '9709' order by storage_key limit 30;"`
Expected: `paper_question > 0`

- [ ] **Step 4: Verify the search projection now exposes the same paper-backed rows**

Run: `psql "$DATABASE_URL" -c "select source_kind, count(*) from public.learning_question_search_projection where subject_code = '9709' group by 1 order by 1;"`
Expected: `paper_question > 0`

- [ ] **Step 5: Record before/after registry counts in the recovery report**

Run: `git diff -- docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
Expected: report shows projection and registry now contain paper-backed rows

## Chunk 3: Optional Classification Enrichment

### Task 8: Extend question-analysis backfill to support `paper_question` envelopes

**Files:**
- Modify: `scripts/learning/lib/question-analysis-backfill.js`
- Modify: `scripts/learning/run_question_analysis_backfill.js`
- Modify: `scripts/learning/__tests__/question-analysis-backfill.test.js`
- Modify: `scripts/learning/__tests__/run-question-analysis-backfill.test.js`
- Reference: `api/learning/lib/question-analysis/question-envelope-contract.js`
- Reference: `api/learning/lib/question-analysis/question-intelligence-service.js`

- [ ] **Step 1: Write a failing test for selecting `paper_question` candidates instead of only `imported_question`**
- [ ] **Step 2: Write a failing test for building a question envelope from descriptor-backed `summary` when `prompt_representation` is missing**
- [ ] **Step 3: Implement `--source-kind paper_question` and `--manifest` support in the backfill CLI**
- [ ] **Step 4: Ensure the paper-question pass fills `family_id`, `primary_question_type_id`, `variant_tags`, and `classification_snapshot_ref` without overwriting deterministic `primary_topic_id`**
- [ ] **Step 5: Re-run the focused backfill tests and confirm green**

Run: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand scripts/learning/__tests__/question-analysis-backfill.test.js scripts/learning/__tests__/run-question-analysis-backfill.test.js`
Expected: PASS

### Task 9: Run optional enrichment only after the deterministic gate path is stable

**Files:**
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`

- [ ] **Step 1: Run the paper-question analysis backfill in dry-run or preview mode if implemented**
- [ ] **Step 2: Execute the backfill for the manifest-backed `paper_question` rows**

Run: `node scripts/learning/run_question_analysis_backfill.js --source-kind paper_question --manifest data/manifests/9709_question_search_recovery_v1.json --force`
Expected: manifest-backed rows receive active snapshots and `QuestionClassified` events

- [ ] **Step 3: Verify enriched fields on the recovered rows**

Run: `psql "$DATABASE_URL" -c "select storage_key, primary_topic_id, family_id, primary_question_type_id, release_scope_status from public.question_bank where subject_code = '9709' and source_kind = 'paper_question' order by storage_key limit 30;"`
Expected: non-null `family_id` / `primary_question_type_id` on at least the enriched pilot rows

- [ ] **Step 4: Record enrichment coverage separately from the gate-critical recovery counts**

Run: `git diff -- docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
Expected: report distinguishes deterministic recovery from optional enrichment

## Chunk 4: Gate Rerun And Release Decision

### Task 10: Verify the data posture before rerunning the gate

**Files:**
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Reference: `data/eval/question_search_gold_9709_v1.json`

- [ ] **Step 1: Confirm both gate-pin storage keys exist in `question_bank` as `paper_question`**
- [ ] **Step 2: Confirm both gate-pin storage keys have `status='ok'` descriptor rows with non-empty `summary`**
- [ ] **Step 3: Confirm both gate-pin topic paths resolve in `curriculum_nodes`**

Run: `psql "$DATABASE_URL" -c "select qb.storage_key, qb.q_number, qb.source_kind, cn.topic_path::text as topic_path, qd.summary from public.question_bank qb left join public.curriculum_nodes cn on cn.node_id = qb.primary_topic_id left join public.question_descriptions_v0 qd on qd.storage_key = qb.storage_key and qd.q_number = qb.q_number and qd.status = 'ok' where qb.storage_key in ('9709/s19_qp_11/questions/q06.png','9709/s16_qp_33/questions/q07.png') order by qb.storage_key;"`
Expected: both rows present with matching topic paths and non-empty summaries

### Task 11: Re-run the structured question-search gate

**Files:**
- Modify: `docs/reports/2026-04-15-question-search-slice-v1-report.md`
- Modify: `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- Modify: `docs/reports/INDEX.md`

- [ ] **Step 1: Re-run the focused question-search suites**

Run: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/question-search-repository.test.js api/learning/__tests__/question-search-service.test.js api/learning/__tests__/question-search-api.test.js scripts/evaluation/__tests__/question-search-gate.test.js`
Expected: PASS

- [ ] **Step 2: Re-run the live gate**

Run: `node scripts/evaluation/run_question_search_gate.js --fixture data/eval/question_search_gold_9709_v1.json --report docs/reports/2026-04-15-question-search-slice-v1-report.md`
Expected: PASS for wave-1 success; if still FAIL, the report must name the remaining data blocker explicitly

- [ ] **Step 3: Capture the post-recovery counts**

Run: `psql "$DATABASE_URL" -c "select source_kind, count(*) from public.learning_question_search_projection where subject_code = '9709' group by 1 order by 1;" -c "select count(*) as qd_9709_ok from public.question_descriptions_v0 where syllabus_code = '9709' and status = 'ok';"`
Expected: paper-backed row count and descriptor count are both materially above zero

- [ ] **Step 4: Add the new recovery report to `docs/reports/INDEX.md`**
- [ ] **Step 5: Write the release decision section in the recovery report**

Run: `git diff -- docs/reports/INDEX.md docs/reports/2026-04-15-question-search-slice-v1-report.md docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
Expected: all report and index updates are visible

## Acceptance Boundary

This plan is complete when all of the following are true:

- the work is executed from the merged retrieval-slice mainline, not a stale pre-merge branch
- `curriculum_nodes` contains `9709.p1.trigonometry`, `9709.p3.integration`, and `9709.p3.trigonometry` under `2025-2027_v1`
- `question_descriptions_v0` contains usable `9709` `status='ok'` rows for the manifest
- `question_bank` contains manifest-backed `paper_question` rows for `9709`
- `learning_question_search_projection` exposes those same paper-backed rows
- the two existing gate-pin paper-backed cases resolve and return non-null summaries
- the live `question_search_gold_9709_v1` gate is rerun from real data
- the final report states either:
  - `gate_pass = true`, or
  - the exact remaining blocker is named as a data defect, not left ambiguous

## Final Recommendation

For this recovery wave, the fastest path to truth is:

1. deterministic manifest-backed topic assignment
2. VLM-backed descriptor recovery from question images
3. paper-question registry backfill
4. gate rerun

Do **not** make VLM the first-line owner of topic reasoning for wave 1.

Use VLM to understand each question image.
Use AO to decide whether the recovered data is good enough to release.
