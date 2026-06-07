# 9231 shard production-ready workflow

日期: 2026-06-06

## Purpose

This is the repeatable workflow for promoting a batch of Cambridge 9231 shard rows from evidence-ready to production-ready.

The workflow is batch-scoped. A passing batch only claims production readiness for the listed shards and rows. It does not claim all-9231 readiness.

## Phase 0: Repo Truth And Batch Selection

Start from `origin/main` truth and a clean task branch.

Required checks:

- `git status --short --branch`
- `npm run workflow:codex-preflight -- --json`
- Confirm the batch has explicit shard ids, row counts, and evidence artifact paths.

Do not select rows from RAG sample or pilot files as row-surface truth. Row-surface truth must come from page-chain surface manifests and durable evidence-layer reports.

## Phase 1: Source And Locator Surface

A shard can enter the workflow only when every row has durable source and locator evidence.

Required evidence:

- Source PDF path under `data/past-papers/9231Further-Mathematics/...`
- Page-chain surface manifest under `data/manifests/..._page_chain_surface_v1.json`
- Stable `storage_key`, `q_number`, `source_pdf`, `source_surface_manifest`, and manifest row index
- Crop or rendered page assets when the row requires image context

Gate outcome:

- All selected rows have source PDF and row locator.
- Missing row surface means the batch is blocked by missing row surface, not production-ready.

## Phase 2: Crop And Visual Evidence

The row must have deterministic local render/crop artifacts before text and production promotion.

Required evidence:

- Rendered PDF pages for every source page used by selected rows
- Question crop image assets for selected rows
- Visual review gate accepts every selected row

Allowed tooling:

- Local deterministic PDF render/crop tools
- External VLM visual review only when explicitly authorized by the operator

Gate outcome:

- `visual_review_accepted_rows == selected_rows`
- `visual_review_blocked_rows == 0`

## Phase 3: Question Plain Text V1

V1 captures durable plain question text from the local PDF text layer.

Required evidence:

- `question_plain_text_v1` JSON report
- V1 coverage markdown report
- Every selected row has a V1 plain text row or the batch is blocked

Gate outcome:

- `plain_text_v1_rows == selected_rows`
- `blockers == 0`

## Phase 4: Question Plain Text V2

V2 is the canonical normalized plain-text layer consumed downstream.

Required evidence:

- `question_plain_text_v2` JSON report
- V2 coverage markdown report
- Every selected row has `normalized_plain_text`
- Every selected row is classified as either `text_only_ready` or `image_context_required`

Gate outcome:

- `normalized_plain_text_rows == selected_rows`
- `text_only_ready_rows + image_context_required_rows == selected_rows`
- `blockers == 0`

## Phase 5: Authority Alignment

Authority alignment attaches the row to the subject/component authority surface without overclaiming detailed syllabus taxonomy.

Required evidence:

- Authority alignment JSON and markdown reports
- Component-level alignment for every selected row
- Topic hints where deterministic hints are available

Gate outcome:

- `authority_component_aligned_rows == selected_rows`
- Detailed canonical syllabus topic may remain unresolved; this does not block the foundation row-surface classifier.
- Do not claim detailed 9231 scoring taxonomy unless a separate gate proves it.

## Phase 6: Local Consumption Gate

Before production promotion, local search/read-model/RAG consumers must prove they prefer `question_plain_text_v2.normalized_plain_text`.

Required evidence:

- V2 consumption JSON
- V2 consumption gate markdown
- Local search rows use `question_plain_text_v2.normalized_plain_text`
- Local read-model prompt uses `question_plain_text_v2.normalized_plain_text`
- Local RAG content uses `question_plain_text_v2.normalized_plain_text`
- Legacy `search_text`-only rows are zero

Gate outcome:

- `search_rows_using_normalized_plain_text == selected_rows`
- `read_model_rows_using_normalized_plain_text == selected_rows`
- `rag_rows_using_normalized_plain_text == selected_rows`
- `legacy_search_text_only_rows == 0`

At this point the batch is evidence-ready, not production-ready.

## Phase 7: Production Surface Promotion

Production promotion writes the selected rows into production-facing local DB surfaces.

Production writes:

- `question_bank` row for every selected row
- `learning_question_analysis_snapshots` active snapshot for every selected row
- `learning_question_search_projection` exposes `search_text` sourced from `normalized_plain_text`
- `learning_question_registry_projection` exposes `normalized_plain_text` and prompt representation
- `public.chunks` contains one `question_plain_text_v2` chunk per selected row for the 9231 question-aware corpus

Each production row must carry source/crop/v2/authority/local-consumption evidence in provenance, including artifact paths.

Current command pattern:

```bash
node scripts/learning/run_9231_wave4_production_ready_gate.js --batch-id <batch_id> --apply-db --update-index
```

The script name is historical. The batch id controls the selected artifact set and production report names.

## Phase 8: Production Gates

A batch may claim `production_ready_claimed=true` only after all production gates pass.

Required DB coverage metrics:

- `present == selected_rows`
- `manifest_count == selected_rows`
- `joined_snapshots == selected_rows`
- `missing_registry == 0`
- `prompt_missing == 0`
- `provenance_missing == 0`
- `normalized_plain_text_missing == 0`
- `search_text_missing == 0`
- `search_text_source_not_normalized == 0`
- `snapshot_ref_missing == 0`
- `snapshot_missing == 0`
- `materialized_classifier_missing == 0`
- `rag_chunk_missing == 0`

Required production search metrics:

- `rows == selected_rows`
- `search_rows_using_normalized_plain_text == selected_rows`
- `search_text_matches_normalized_plain_text == selected_rows`
- `projection_normalized_plain_text_matches == selected_rows`

Required production read-model metrics:

- `rows == selected_rows`
- `read_model_rows_using_normalized_plain_text == selected_rows`
- `registry_normalized_plain_text_matches == selected_rows`
- `prompt_representation_matches_normalized_plain_text == selected_rows`
- `provenance_normalized_plain_text_matches == selected_rows`

Required production RAG metrics:

- `rows == selected_rows`
- `rag_rows_using_normalized_plain_text == selected_rows`
- `rag_content_matches_normalized_plain_text == selected_rows`
- `rag_chunks_present == selected_rows`
- `rag_chunks_with_fts == selected_rows`

RAG boundary:

- This proves deterministic `public.chunks` consumption of normalized plain text.
- It does not claim external embedding generation or semantic retrieval-quality evaluation.

## Phase 9: Closeout Artifacts

Every successful batch must emit durable artifacts.

Required outputs:

- Production surface manifest under `data/manifests/`
- DB coverage gate JSON
- Production search gate JSON
- Production read-model gate JSON
- Production RAG consumption gate JSON
- Aggregate production-ready closeout markdown
- Aggregate production-ready gate JSON
- Per-shard production-ready closeout markdown and JSON for every selected shard
- Updated `docs/reports/INDEX.md`

The aggregate closeout must state:

- selected shard count
- selected row count
- text-only ready row count
- image-context required row count
- `production_ready_claimed=true`
- DB/search/read-model/RAG evidence paths
- scope boundary that the claim applies only to this batch

## Phase 10: Verification, PR, And Merge

Before commit:

- Run focused Jest tests for the production gate.
- Run adjacent 9231 evidence-layer regression tests.
- Run the 9709 production aggregate regression test to protect the mature workflow pattern.
- Run `git diff --cached --check`.
- Read back DB/search/read-model/RAG counts directly when a DB promotion was performed.

Expected verification pattern:

```bash
npm test -- scripts/learning/__tests__/run-9231-wave4-production-ready-gate.test.js
npm test -- scripts/learning/__tests__/build-9231-evidence-layers-wave1-gate.test.js
npm test -- scripts/learning/__tests__/run-9709-new-paper-v2-production-ready-aggregate-gate.test.js
git diff --cached --check
```

For GitHub:

- Push a `codex/*` or `task/*` branch.
- Open a PR with scope, gate evidence, and verification commands.
- Wait for required checks to pass.
- If PR becomes behind or dirty, rebase on `origin/main`, force-push with lease, rerun verification, then merge.

## Phase 11: Full All-9231 Aggregate Closeout

Run the full aggregate gate only after every batch production-ready PR has merged to `origin/main`.

Current command pattern:

```bash
node scripts/learning/run_9231_full_production_ready_aggregate_gate.js --generated-on <YYYY-MM-DD> --update-index
```

The full aggregate gate is readback-only. It does not promote rows. It re-reads:

- `data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json`
- all 64 shard page-chain surface manifests referenced by the shard split manifest
- all five 9231 production surface manifests
- live local DB/search/read-model/RAG state for the 1593 production rows

The full aggregate may claim all-9231 `production_ready_claimed=true` only when these checks all pass:

- full production-ready row coverage: `1593/1593`
- shard coverage: `64/64`
- source QP coverage: `200/200`
- DB/question_bank registry coverage: `1593/1593`
- production search coverage: `1593/1593`, source `question_plain_text_v2.normalized_plain_text`
- production read-model coverage: `1593/1593`, source `question_plain_text_v2.normalized_plain_text`
- production RAG chunk coverage: `1593/1593`, source `question_plain_text_v2.normalized_plain_text`
- duplicate `storage_key`/`q_number` rows: `0`
- remaining blockers: `0`

The full aggregate closeout must state that this is row-level question-text production readiness, not a claim of perfect semantic retrieval quality or detailed syllabus-topic canonicalization.

## Current Batch Ids

The current reusable production gate supports these batch ids:

- `wave4`: 10 shards / 191 rows
- `wave3_wave2_batch2`: 16 shards / 334 rows
- `next_wave_16`: 16 shards / 477 rows
- `wave1`: 16 shards / 441 rows
- `wm_final_150`: 6 shards / 150 rows

Add future batch ids by extending `PRODUCTION_BATCHES` in `scripts/learning/run_9231_wave4_production_ready_gate.js` with:

- `batchId`
- `reportSlug`
- `manifestSlug`
- `logPrefix`
- `label`
- `productionWave`
- `expectedRows`
- `scopeDescription`
- `v2Artifacts`
- `authorityArtifacts`
- `consumptionArtifacts`
- `evidenceGateArtifacts`

## Stop Conditions

Stop and do not claim production readiness if any of these are true:

- Source PDF or row surface is missing.
- Crop/render evidence is incomplete for selected rows.
- Visual review has rejected or blocked rows.
- V1 or V2 row count is short.
- `normalized_plain_text` is missing or mismatched.
- Authority component alignment is short.
- Local search/read-model/RAG normalized consumption is short.
- DB/search/read-model/RAG production gates do not cover every selected row.
- Any production gate has blockers.

When a stop condition occurs, report the batch as blocked with the missing evidence layer and do not set `production_ready_claimed=true`.
