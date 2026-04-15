# 9709 Qwen Wave 1 Execution Report

Date: 2026-04-16

This report freezes the wave-1 execution posture for issue `#198`. It is a supplemental overlay on top of the main `9709` recovery plan, not a replacement for the later `question_bank` repair, lane execution, or gate rerun work.

## Source Documents

These were the frozen planning inputs used for this issue. They are not present on `origin/main` in this task worktree, so they were read from the local root worktree paths recorded below.

- `/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md`
- `/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md`
- `/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-04-16-9709-qwen-api-wave1-ao-execution-runbook.md`

## Scope Frozen By This Issue

This issue freezes only the following inputs for the `9709` recovery program:

- the deterministic pilot manifest
- the narrow curriculum seed
- the wave-1 router and output contracts
- the baseline red posture and execution policy freeze

This issue does not implement router code, execute Qwen lanes, assemble evidence bundles, or repair `question_bank`.

## Preflight

### Retrieval-Slice Preconditions

The current branch already contains the merged retrieval slice files required by the recovery plan:

- `supabase/migrations/20260415152950_create_learning_question_search_projection.sql`
- `scripts/evaluation/run_question_search_gate.js`
- `api/learning/questions/index.js`
- `api/learning/lib/questions/question-search-service.js`
- `api/learning/lib/repositories/question-search-repository.js`

### Baseline Sync Note

`npm run workflow:baseline:sync` was attempted because the repo-local workflow scripts exist on this branch. The command failed in the root worktree because the local `task/post-cleanup-baseline` branch has no upstream tracking configured:

```text
There is no tracking information for the current branch.
Please specify which branch you want to merge with.
```

That failure did not block issue `#198`, because the required retrieval-slice files and the live database baseline were verified directly from this task worktree.

## Baseline Red Posture

The starting database posture was captured with:

```bash
psql "$DATABASE_URL" \
  -c "select source_kind, count(*) from public.question_bank where subject_code = '9709' group by 1 order by 1;" \
  -c "select count(*) as qd_9709_ok from public.question_descriptions_v0 where syllabus_code = '9709' and status = 'ok';" \
  -c "select topic_path::text from public.curriculum_nodes where syllabus_code = '9709' and version_tag = '2025-2027_v1' order by 1;"
```

Observed results:

- `question_bank`: `11 imported_question`, `0 paper_question`
- `question_descriptions_v0`: `0` rows with `status = 'ok'` for `9709`
- `curriculum_nodes`: only the three browser-fixture topic paths were present

The current gate was re-run with:

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/9709_question_search_gate_issue198_report.md
```

Observed fail posture:

- `exact_structured_match_rate=0.5`
- `subject_leakage_rate=0`
- `metadata_completeness_rate=0.5`
- `null_summary_rate=1`
- `descriptor_source=question_descriptions_v0_status_ok`
- `gate_pass=false`
- `failing_metrics=exact_structured_match_rate, metadata_completeness_rate, null_summary_rate`

## Frozen Pilot Manifest

`data/manifests/9709_question_search_recovery_v1.json` now freezes the wave-1 pilot slice.

Manifest summary:

- `17` deterministic rows
- topic coverage:
  - `9709.p1.trigonometry`: `6`
  - `9709.p3.integration`: `6`
  - `9709.p3.trigonometry`: `5`
- route coverage:
  - `review_lane`: `2`
  - `ocr_lane`: `15`
- gate-critical rows:
  - `9709/s19_qp_11/questions/q06.png`
  - `9709/s16_qp_33/questions/q07.png`

Every manifest item includes the exact paper identity fields required for replay:

- `year`
- `session`
- `paper`
- `variant`
- `q_number`

Every manifest item also includes the wave-1 route fields frozen by this issue:

- `route_hint`
- `diagram_present`
- `formula_dense`
- `table_heavy`
- `gate_critical`
- `requires_review`

### Routing Assumptions

The route metadata was frozen conservatively because the question image assets are not checked into this branch and no local PDF text extraction tool was available in the environment.

- gate-critical rows are pre-routed to `review_lane`
- the remaining seeded rows are pre-routed to `ocr_lane`
- `diagram_present=false` for all current pilot rows until a later manifest delta is backed by checked-in evidence or replayable asset inspection
- `formula_dense=true` and `table_heavy=false` are frozen as the starting posture for the current mathematics pilot

## Frozen Curriculum Seed

`data/curriculum/9709_question_search_recovery_nodes_v1.json` now freezes the minimum curriculum seed required for the pilot topic paths under `version_tag = 2025-2027_v1`.

Frozen nodes:

- `9709`
- `9709.p1`
- `9709.p1.trigonometry`
- `9709.p3`
- `9709.p3.integration`
- `9709.p3.trigonometry`

This file is intentionally narrow and does not widen into a full-subject curriculum import.

## Frozen Contracts

### Router Contract

`data/contracts/9709_qwen_wave1_router_contract_v1.json` freezes:

- the required router input fields from the manifest
- the allowed route outputs: `ocr_lane`, `diagram_lane`, `review_lane`
- the `lazy_attach_original_image` switch
- the required route provenance fields: `region`, `base_url`, `api_key_scope`

### Output Contract

`data/contracts/9709_qwen_wave1_output_contract_v1.json` freezes the machine-consumable output envelope for wave 1.

Required top-level provenance fields:

- `model`
- `route`
- `prompt_template_version`
- `region`
- `base_url`
- `input_asset_id`
- `input_asset_hash`
- `response_schema_version`
- `confidence`
- `failure_reason`
- `output`

Free-text reasoning is not a machine-consumable contract field in wave 1.

## Frozen Execution Policy

The wave-1 pilot is frozen against one region label and one base URL for the full manifest/backfill/gate-replay batch.

- `region`: `dashscope-cn`
- `base_url`: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `api_key_scope`: `DASHSCOPE_API_KEY`
- `enable_thinking=false`
- `response_format={"type":"json_object"}`
- `stateless=true`
- `caller_context_policy=caller_managed`

Interpretation note:

- `dashscope-cn` is an AO-side execution-region label for the single China-hosted DashScope compatible endpoint used by the existing prototype scripts in this repo.
- The pilot must not mix regions or endpoints within the same manifest, backfill, or gate replay batch.

## Blockers And Residual Risk

Observed but non-blocking issues for this freeze task:

- the repo-local baseline sync helper cannot fast-forward until the root-worktree baseline branch has upstream tracking configured
- the three required planning docs are only available in the local root worktree, not on `origin/main`
- the question image assets for the pilot rows are not checked into this task branch
- no local PDF text extraction tool was available, so diagram classification could not be re-audited from primary assets inside this session

These did not block the acceptance criteria for issue `#198`, but they should be kept visible for the later router-execution and evidence-bundle tasks.
