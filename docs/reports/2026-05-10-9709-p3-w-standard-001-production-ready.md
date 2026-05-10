# 9709 p3_w_standard_001 production-ready closeout

日期: 2026-05-10

## Scope

本报告只覆盖 `p3_w_standard_001` 这个 shard:

- PDFs: `21`
- paper/session family: Winter P3 standard, `qp_31`, `qp_32`, `qp_33`
- manifest rows: `219`
- source manifest: `data/manifests/9709_p3_w_standard_001_page_chain_surface_v1.json`
- ready manifest: `docs/reports/2026-05-10-9709-p3-w-standard-001-ready-manifest.json`

结论不能外推为 9709 全量 production-ready。当前可宣称的是: `p3_w_standard_001` 在截图/evidence bundle、authority sidecar、registry backfill、analysis backfill、search gate、classifier/release preflight 这一批次闭环上已达到 shard-scoped production-ready。

## Final Verdict

`p3_w_standard_001` status: `production-ready`

条件限定:

- authority 来自 shard-scoped sidecar，不是 inline manifest `primary_topic_path`。
- `219` 条 release preflight warning 全部是 `manifest_primary_topic_missing_sidecar_canonical_present`，属于当前 sidecar-authority 合同下的预期 warning。
- draft classifier registry rows只作为 FK target 和 deterministic classifier output 支撑，不提升 released scoring 覆盖面。
- 本报告不声明任何其他 9709 shard 的 production-ready 状态。

## Visual And Authority Evidence

已完成:

- page-chain extraction: `21/21` PDFs passed
- page-chain warnings: `1`, accepted through warning disposition
- post-extraction review: `pass`
- evidence bundles: `219/219`
- human visual dispositions: `110/110` accepted
- diagram-lane items: `27`
- release blockers after authority alignment: `0`

Authority sidecar:

- path: `data/manifests/9709_p3_w_standard_001_authority_sidecar_v1.json`
- rows: `219`
- existing sidecar reused: `35`
- new visual mappings: `184`
- seeded topic paths: `9`
- new syllabus nodes: `0`

Topic distribution:

| Topic Path | Count |
|---|---:|
| `9709.p3.integration` | 34 |
| `9709.p3.algebra` | 30 |
| `9709.p3.complex_numbers` | 29 |
| `9709.p3.trigonometry` | 24 |
| `9709.p3.logarithmic_and_exponential_functions` | 22 |
| `9709.p3.differential_equations` | 21 |
| `9709.p3.differentiation` | 21 |
| `9709.p3.vectors` | 21 |
| `9709.p3.numerical_solution_of_equations` | 17 |

## Registry And Analysis Backfill

Registry backfill was performed by the authority-ready batch:

- processed: `219`
- inserted: `178`
- updated: `41`
- conflicts: `0`

Analysis hydration completed in the same runner, followed by local DB coverage verification.

Final DB coverage:

| Metric | Value |
|---|---:|
| manifest_count | 219 |
| present | 219 |
| missing_registry | 0 |
| prompt_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| snapshot_ref_missing | 0 |
| joined_snapshots | 219 |
| snapshot_missing | 0 |
| materialized_classifier_missing | 0 |

Release-scope distribution after analysis hydration:

| release_scope_status | type_release_state | Count |
|---|---|---:|
| `non_released_fallback` | `draft` | 142 |
| `non_released_fallback` | `released` | 13 |
| `released_scoring` | `released` | 64 |

## Gate Results

Release preflight:

```bash
node scripts/learning/run_9709_release_preflight.js \
  --manifest data/manifests/9709_p3_w_standard_001_page_chain_surface_v1.json \
  --authority-sidecar data/manifests/9709_p3_w_standard_001_authority_sidecar_v1.json \
  --curriculum-seed data/curriculum/9709_question_search_recovery_nodes_v1.json \
  --evidence-bundles docs/reports/2026-05-10-9709-p3-w-standard-001-authority-evidence-bundles.json \
  --ready-manifest docs/reports/2026-05-10-9709-p3-w-standard-001-ready-manifest.json \
  --expected-count 219 \
  --json-out docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-final.json \
  --markdown-out docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-final.md
```

Result:

- status: `pass`
- blockers: `0`
- warnings: `219`

Question search gate:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report docs/reports/2026-05-10-9709-p3-w-standard-001-search-gate-report.md \
  --json-out docs/reports/2026-05-10-9709-p3-w-standard-001-search-gate.json \
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
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/learning/run_9709_authority_ready_batch.js \
  --manifest data/manifests/9709_p3_w_standard_001_page_chain_surface_v1.json \
  --authority-sidecar data/manifests/9709_p3_w_standard_001_authority_sidecar_v1.json \
  --curriculum-seed data/curriculum/9709_question_search_recovery_nodes_v1.json \
  --lane-results docs/reports/2026-05-10-9709-p3-w-standard-001-lane-results.json \
  --authority-manifest-out docs/reports/2026-05-10-9709-p3-w-standard-001-authority-manifest.json \
  --aligned-manifest-out docs/reports/2026-05-10-9709-p3-w-standard-001-aligned-manifest.json \
  --ready-manifest-out docs/reports/2026-05-10-9709-p3-w-standard-001-ready-manifest.json \
  --evidence-bundles-out docs/reports/2026-05-10-9709-p3-w-standard-001-authority-evidence-bundles.json \
  --release-preflight-json docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-authority-aligned.json \
  --release-preflight-markdown docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-authority-aligned.md \
  --release-preflight-expected-count 219 \
  --gate-report docs/reports/2026-05-10-9709-p3-w-standard-001-search-gate-report.md \
  --gate-json docs/reports/2026-05-10-9709-p3-w-standard-001-search-gate.json \
  --gate-psql-mode direct
```

Result:

- ready_items: `219`
- blocked_items: `0`
- registry processed: `219`
- registry inserted: `178`
- registry updated: `41`
- registry conflicts: `0`
- gate_pass: `true`

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

Result: `8` test suites passed, `80` tests passed.

## Artifacts

- `data/manifests/9709_p3_w_standard_001_page_chain_surface_v1.json`
- `data/manifests/9709_p3_w_standard_001_authority_sidecar_v1.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-page-chain-report.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-page-chain-report.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-warning-disposition.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-warning-disposition.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-evidence-bundle-summary.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-evidence-bundle-summary.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-evidence-bundles.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-human-visual-disposition.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-human-visual-dispositions.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-post-extraction-review.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-post-extraction-review.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-authority-visual-review.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-authority-visual-review.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-authority-manifest.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-aligned-manifest.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-ready-manifest.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-authority-evidence-bundles.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-authority-aligned.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-authority-aligned.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-final.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-release-preflight-final.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-search-gate.json`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-search-gate-report.md`
- `docs/reports/2026-05-10-9709-p3-w-standard-001-db-coverage.json`

## Remaining Boundaries

- This closes only `p3_w_standard_001`.
- Full 9709 scale-out should continue by shard, using the same order: page-chain extraction, visual/extraction disposition, evidence bundle, post-extraction review, authority sidecar, registry backfill, analysis refresh, search gate, release preflight, then shard-scoped production-ready claim.
