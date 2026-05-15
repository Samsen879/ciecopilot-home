# 9709 p3_m_standard_001 production-ready closeout

日期: 2026-05-05

## Scope

本报告只覆盖 `p3_m_standard_001` 这个 shard:

- PDFs: `8`
- paper/session family: March P3 standard, `qp_32`
- manifest rows: `83`
- source manifest: `data/manifests/9709_p3_m_standard_001_page_chain_surface_v1.json`
- ready manifest: `docs/reports/2026-05-05-9709-p3-m-standard-001-ready-manifest.json`

结论不能外推为 9709 全量 production-ready。当前可宣称的是: `p3_m_standard_001` 在截图/evidence bundle、authority sidecar、registry backfill、analysis backfill、search gate、classifier/release preflight 这一批次闭环上已达到 shard-scoped production-ready。

## Final Verdict

`p3_m_standard_001` status: `production-ready`

条件限定:

- authority 来自 shard-scoped sidecar，不是 inline manifest `primary_topic_path`。
- `83` 条 release preflight warning 全部是 `manifest_primary_topic_missing_sidecar_canonical_present`，属于当前 sidecar-authority 合同下的预期 warning。
- draft classifier registry rows 只作为 FK target 和 deterministic classifier output 支撑，不提升 released scoring 覆盖面。
- 本报告不声明任何其他 9709 shard 的 production-ready 状态。

## Visual And Authority Evidence

已完成:

- page-chain extraction: `8/8` PDFs passed
- page-chain warnings: `0`
- post-extraction review: `pass`
- evidence bundles: `83/83`
- human visual dispositions: `39/39` accepted
- release blockers after authority alignment: `0`

Authority sidecar:

- path: `data/manifests/9709_p3_m_standard_001_authority_sidecar_v1.json`
- rows: `83`
- existing sidecar reused: `16`
- new visual mappings: `67`
- seeded topic paths: `9`
- new syllabus nodes: `0`

Topic distribution:

| Topic Path | Count |
|---|---:|
| `9709.p3.integration` | 14 |
| `9709.p3.complex_numbers` | 11 |
| `9709.p3.algebra` | 10 |
| `9709.p3.trigonometry` | 9 |
| `9709.p3.differential_equations` | 8 |
| `9709.p3.logarithmic_and_exponential_functions` | 8 |
| `9709.p3.numerical_solution_of_equations` | 8 |
| `9709.p3.vectors` | 8 |
| `9709.p3.differentiation` | 7 |

## Registry And Analysis Backfill

Registry backfill was performed by the authority-ready batch before analysis hydration stopped on missing draft classifier FK targets.

Result:

- processed: `83`
- inserted: `67`
- updated: `16`
- conflicts: `0`

The stop reason was a real schema-seed gap: deterministic P3 analysis emitted draft classifier family/type ids that were not present in `learning_question_families` / `learning_question_types`. The fix adds draft FK target rows only:

- `supabase/migrations/20260505120000_seed_9709_p3_classifier_registry_draft.sql`
- `api/learning/__tests__/schema-contract.test.js`

Analysis backfill was then run with `--force`:

```bash
SUPABASE_PG_COMPAT=true \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/learning/run_question_analysis_backfill.js \
  --force \
  --source-kind paper_question \
  --manifest docs/reports/2026-05-05-9709-p3-m-standard-001-ready-manifest.json \
  --evidence-bundles docs/reports/2026-05-05-9709-p3-m-standard-001-authority-evidence-bundles.json
```

Final run result:

- processed: `83`
- backfilled: `83`
- skipped: `0`

Final DB coverage:

| Metric | Value |
|---|---:|
| manifest_count | 83 |
| present | 83 |
| missing_registry | 0 |
| prompt_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| snapshot_ref_missing | 0 |
| joined_snapshots | 83 |
| snapshot_missing | 0 |
| materialized_classifier_missing | 0 |

Release-scope distribution after final analysis refresh:

| release_scope_status | type_release_state | Count |
|---|---|---:|
| `non_released_fallback` | `draft` | 53 |
| `non_released_fallback` | `released` | 6 |
| `released_scoring` | `released` | 24 |

## Gate Results

Release preflight:

```bash
node scripts/learning/run_9709_release_preflight.js \
  --manifest data/manifests/9709_p3_m_standard_001_page_chain_surface_v1.json \
  --authority-sidecar data/manifests/9709_p3_m_standard_001_authority_sidecar_v1.json \
  --curriculum-seed data/curriculum/9709_question_search_recovery_nodes_v1.json \
  --evidence-bundles docs/reports/2026-05-05-9709-p3-m-standard-001-authority-evidence-bundles.json \
  --ready-manifest docs/reports/2026-05-05-9709-p3-m-standard-001-ready-manifest.json \
  --expected-count 83 \
  --json-out docs/reports/2026-05-05-9709-p3-m-standard-001-release-preflight-final.json \
  --markdown-out docs/reports/2026-05-05-9709-p3-m-standard-001-release-preflight-final.md
```

Result:

- status: `pass`
- blockers: `0`
- warnings: `83`

Question search gate:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report docs/reports/2026-05-05-9709-p3-m-standard-001-search-gate-report.md \
  --json-out docs/reports/2026-05-05-9709-p3-m-standard-001-search-gate.json \
  --psql-mode direct
```

Result:

- gate_pass: `true`
- exact_structured_match_rate: `1`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `1`
- null_summary_rate: `0`
- descriptor_source: `question_descriptions_v0_status_ok`

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

Result: `8 passed`, `80 passed`

## Artifacts

- `data/manifests/9709_p3_m_standard_001_authority_sidecar_v1.json`
- `data/manifests/9709_p3_m_standard_001_page_chain_surface_v1.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-page-chain-report.md`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-page-chain-report.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-evidence-bundle-summary.md`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-evidence-bundle-summary.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-evidence-bundles.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-human-visual-disposition.md`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-human-visual-dispositions.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-post-extraction-review.md`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-post-extraction-review.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-authority-visual-review.md`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-authority-visual-review.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-authority-manifest.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-aligned-manifest.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-ready-manifest.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-authority-evidence-bundles.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-release-preflight-final.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-release-preflight-final.md`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-search-gate.json`
- `docs/reports/2026-05-05-9709-p3-m-standard-001-search-gate-report.md`

## Remaining Boundaries

- This closes only `p3_m_standard_001`.
- Full 9709 scale-out should continue by shard, using the same order: page-chain extraction, visual/extraction disposition, evidence bundle, post-extraction review, authority sidecar, registry backfill, forced analysis refresh when prior snapshots are stale, search gate, release preflight, then shard-scoped production-ready claim.
