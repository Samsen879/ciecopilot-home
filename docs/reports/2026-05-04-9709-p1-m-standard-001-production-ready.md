# 9709 p1_m_standard_001 production-ready closeout

日期: 2026-05-04

## Scope

本报告只覆盖 `p1_m_standard_001` 这个 shard:

- PDFs: `8`
- paper/session family: March P1 standard, `qp_12`
- manifest rows: `85`
- source manifest: `data/manifests/9709_p1_m_standard_001_page_chain_surface_v1.json`
- ready manifest: `docs/reports/2026-05-04-9709-p1-m-standard-001-ready-manifest.json`

结论不能外推为 9709 全量 production-ready。当前可宣称的是: `p1_m_standard_001` 在截图/evidence bundle、authority sidecar、registry backfill、analysis backfill、search gate、classifier/release preflight 这一批次闭环上已达到 shard-scoped production-ready。

## Final Verdict

`p1_m_standard_001` status: `production-ready`

条件限定:

- authority 来自 shard-scoped sidecar，不是 inline manifest `primary_topic_path`。
- `85` 条 release preflight warning 全部是 `manifest_primary_topic_missing_sidecar_canonical_present`，属于当前 sidecar-authority 合同下的预期 warning。
- draft classifier registry rows 只作为 FK target 和 deterministic classifier output 支撑，不提升 released scoring 覆盖面。

## Visual And Authority Evidence

已完成:

- `9709_m21_qp_12` q09 warning 已有正式人工 disposition。
- post-extraction review: `pass`
- evidence bundles: `85/85`
- human visual dispositions: `47/47` accepted
- release blockers after authority alignment: `0`

Authority sidecar:

- path: `data/manifests/9709_p1_m_standard_001_authority_sidecar_v1.json`
- rows: `85`
- existing sidecar reused: `30`
- new visual mappings: `55`
- seeded topic paths: `9`
- new syllabus nodes: `0`

Topic distribution:

| Topic Path | Count |
|---|---:|
| `9709.p1.series` | 15 |
| `9709.p1.integration` | 14 |
| `9709.p1.differentiation` | 12 |
| `9709.p1.functions` | 11 |
| `9709.p1.trigonometry` | 9 |
| `9709.p1.quadratics` | 7 |
| `9709.p1.circular_measure` | 7 |
| `9709.p1.coordinate_geometry` | 6 |
| `9709.p3.vectors` | 4 |

## Registry And Analysis Backfill

Registry backfill:

```bash
SUPABASE_PG_COMPAT=true \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/learning/run_paper_question_registry_backfill.js \
  --manifest docs/reports/2026-05-04-9709-p1-m-standard-001-ready-manifest.json \
  --curriculum-seed data/curriculum/9709_question_search_recovery_nodes_v1.json
```

Result:

- processed: `85`
- inserted: `55`
- updated: `30`
- conflicts: `0`

Analysis backfill was run with `--force` after detecting stale skipped snapshots from the previous partial state:

```bash
SUPABASE_PG_COMPAT=true \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/learning/run_question_analysis_backfill.js \
  --force \
  --source-kind paper_question \
  --manifest docs/reports/2026-05-04-9709-p1-m-standard-001-ready-manifest.json \
  --evidence-bundles docs/reports/2026-05-04-9709-p1-m-standard-001-authority-evidence-bundles.json
```

Final run result:

- processed: `85`
- backfilled: `85`
- skipped: `0`

Final DB coverage:

| Metric | Value |
|---|---:|
| manifest_count | 85 |
| present | 85 |
| missing_registry | 0 |
| prompt_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| snapshot_ref_missing | 0 |
| joined_snapshots | 85 |
| snapshot_missing | 0 |
| materialized_classifier_missing | 0 |

Release-scope distribution after final analysis refresh:

| release_scope_status | type_release_state | Count |
|---|---|---:|
| `non_released_fallback` | `draft` | 63 |
| `released_scoring` | `released` | 18 |
| `non_released_fallback` | `released` | 4 |

## Gate Results

Release preflight:

```bash
node scripts/learning/run_9709_release_preflight.js \
  --manifest data/manifests/9709_p1_m_standard_001_page_chain_surface_v1.json \
  --authority-sidecar data/manifests/9709_p1_m_standard_001_authority_sidecar_v1.json \
  --curriculum-seed data/curriculum/9709_question_search_recovery_nodes_v1.json \
  --evidence-bundles docs/reports/2026-05-04-9709-p1-m-standard-001-authority-evidence-bundles.json \
  --ready-manifest docs/reports/2026-05-04-9709-p1-m-standard-001-ready-manifest.json \
  --expected-count 85 \
  --json-out docs/reports/2026-05-04-9709-p1-m-standard-001-release-preflight-final.json \
  --markdown-out docs/reports/2026-05-04-9709-p1-m-standard-001-release-preflight-final.md
```

Result:

- status: `pass`
- blockers: `0`
- warnings: `85`

Question search gate:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report docs/reports/2026-05-04-9709-p1-m-standard-001-search-gate-report.md \
  --json-out docs/reports/2026-05-04-9709-p1-m-standard-001-search-gate.json \
  --psql-mode direct
```

Result:

- gate_pass: `true`
- exact_structured_match_rate: `1`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `1`
- null_summary_rate: `0`
- descriptor_source: `question_descriptions_v0_status_ok`

## Code And Schema Changes

Two code/schema changes were required to make this shard cleanly backfillable:

- `supabase/migrations/20260504160000_seed_9709_p1_classifier_registry_draft.sql`
  - Adds draft FK target rows for deterministic P1 classifier outputs.
  - Does not promote released scoring.
- `api/learning/lib/question-analysis/question-intelligence-service.js`
  - Fixes integration-vs-quadratics precedence so integral prompts containing `x^2` are not misclassified as quadratics when integration application/substitution signals are present.

The schema contract was updated in `api/learning/__tests__/schema-contract.test.js` to freeze the draft registry seed.

## Verification

Passed:

```bash
.venv/bin/python -m pytest \
  tests/test_review_9709_page_chain_shard_bundle_v1.py \
  tests/test_build_9709_page_chain_shard_bundle_v1.py \
  tests/test_build_pdf_page_chain_review_crops_v1.py \
  -q
```

Result: `16 passed`

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/schema-contract.test.js \
  api/learning/__tests__/question-intelligence-service.test.js \
  api/learning/__tests__/question-search-service.test.js \
  api/learning/__tests__/question-search-repository.test.js \
  api/learning/__tests__/released-scope.test.js \
  scripts/learning/__tests__/run-9709-release-preflight.test.js \
  scripts/learning/__tests__/run-question-analysis-backfill.test.js \
  scripts/evaluation/__tests__/question-search-gate.test.js
```

Result: `8 passed`, `79 passed`

## Artifacts

- `data/manifests/9709_p1_m_standard_001_authority_sidecar_v1.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-authority-visual-review.md`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-authority-visual-review.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-authority-manifest.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-aligned-manifest.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-ready-manifest.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-authority-evidence-bundles.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-release-preflight-final.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-release-preflight-final.md`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-search-gate.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-search-gate-report.md`

## Remaining Boundaries

- This closes only `p1_m_standard_001`.
- The older downstream stop report is superseded for this shard by this closeout.
- Full 9709 scale-out should continue by shard, using the same order: visual/extraction disposition, evidence bundle, authority sidecar, registry backfill, forced analysis refresh when prior snapshots are stale, search gate, release preflight, then shard-scoped production-ready claim.
