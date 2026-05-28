# 9709 p3_m_watermarked_001 production-ready closeout

日期: 2026-05-15

## Scope

本报告只覆盖 `p3_m_watermarked_001` 这个 shard:

- PDFs: `1`
- paper/session family: March P3 watermarked, `WM_9709_m20_qp_32`
- manifest rows: `10`
- source manifest: `data/manifests/9709_p3_m_watermarked_001_page_chain_surface_v1.json`
- ready manifest: `docs/reports/2026-05-15-9709-p3-m-watermarked-001-ready-manifest.json`

结论不能外推为 9709 全量 production-ready。当前可宣称的是: `p3_m_watermarked_001` 在截图/evidence bundle、human visual disposition、authority sidecar、registry backfill、analysis backfill、search gate、classifier/release preflight 这一批次闭环上已达到 shard-scoped production-ready。

## Final Verdict

`p3_m_watermarked_001` status: `production-ready`

条件限定:

- authority 来自 shard-scoped sidecar，不是 inline manifest `primary_topic_path`。
- `10` 条 release preflight warning 全部是 `manifest_primary_topic_missing_sidecar_canonical_present`，属于当前 sidecar-authority 合同下的预期 warning。
- watermarked source PDF 已经过 human visual disposition；水印位于题目工作区/答案区下方或下方空白区域，没有遮挡题干、公式、图像标签或跨页续题内容。
- 本轮没有新增 syllabus node，没有新增 topic path，也没有发明 prompt text。
- 本报告不声明任何其他 9709 shard 的 production-ready 状态。

## Visual And Authority Evidence

已完成:

- page-chain extraction: `1/1` PDFs passed
- page-chain warnings: `0`
- evidence bundles: `10/10`
- review crops: `16`
- human visual dispositions: `10/10` accepted
- post-extraction review: `pass`
- diagram-lane items: `1`
- multi-page items: `6`
- release blockers after authority alignment: `0`

Authority sidecar:

- path: `data/manifests/9709_p3_m_watermarked_001_authority_sidecar_v1.json`
- rows: `10`
- seeded topic paths used: `9`
- new syllabus nodes: `0`

Topic distribution:

| Topic Path | Count |
|---|---:|
| `9709.p3.algebra` | 2 |
| `9709.p3.complex_numbers` | 1 |
| `9709.p3.differential_equations` | 1 |
| `9709.p3.differentiation` | 1 |
| `9709.p3.integration` | 1 |
| `9709.p3.logarithmic_and_exponential_functions` | 1 |
| `9709.p3.numerical_solution_of_equations` | 1 |
| `9709.p3.trigonometry` | 1 |
| `9709.p3.vectors` | 1 |

## Registry And Analysis Backfill

Registry backfill was performed by the authority-ready batch:

- processed: `10`
- inserted: `8`
- updated: `2`
- conflicts: `0`

Analysis hydration completed in the same runner:

- processed: `10`
- backfilled: `10`
- skipped: `0`

Final DB coverage:

| Metric | Value |
|---|---:|
| manifest_count | 10 |
| present | 10 |
| missing_registry | 0 |
| prompt_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| snapshot_ref_missing | 0 |
| joined_snapshots | 10 |
| snapshot_missing | 0 |
| materialized_classifier_missing | 0 |

Release-scope distribution after analysis hydration:

| release_scope_status | type_release_state | Count |
|---|---|---:|
| `non_released_fallback` | `draft` | 7 |
| `non_released_fallback` | `released` | 1 |
| `released_scoring` | `released` | 2 |

## Gate Results

Release preflight:

```bash
node scripts/learning/run_9709_authority_ready_batch.js \
  --manifest data/manifests/9709_p3_m_watermarked_001_page_chain_surface_v1.json \
  --authority-sidecar data/manifests/9709_p3_m_watermarked_001_authority_sidecar_v1.json \
  --curriculum-seed data/curriculum/9709_question_search_recovery_nodes_v1.json \
  --lane-results docs/reports/2026-05-15-9709-p3-m-watermarked-001-lane-results.json \
  --authority-manifest-out docs/reports/2026-05-15-9709-p3-m-watermarked-001-authority-manifest.json \
  --aligned-manifest-out docs/reports/2026-05-15-9709-p3-m-watermarked-001-aligned-manifest.json \
  --ready-manifest-out docs/reports/2026-05-15-9709-p3-m-watermarked-001-ready-manifest.json \
  --evidence-bundles-out docs/reports/2026-05-15-9709-p3-m-watermarked-001-authority-evidence-bundles.json \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --gate-report docs/reports/2026-05-15-9709-p3-m-watermarked-001-search-gate-report.md \
  --gate-json docs/reports/2026-05-15-9709-p3-m-watermarked-001-search-gate.json \
  --release-preflight-json docs/reports/2026-05-15-9709-p3-m-watermarked-001-release-preflight-final.json \
  --release-preflight-markdown docs/reports/2026-05-15-9709-p3-m-watermarked-001-release-preflight-final.md \
  --release-preflight-expected-count 10 \
  --gate-psql-mode direct
```

Result:

- ready_items: `10`
- blocked_items: `0`
- release_preflight_status: `pass`
- release_preflight_blockers: `0`
- release_preflight_warnings: `10`
- gate_pass: `true`

Question search gate:

- gate_pass: `true`
- exact_structured_match_rate: `1`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `1`
- null_summary_rate: `0`

Independent local DB coverage:

- connection: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- input: `docs/reports/2026-05-15-9709-p3-m-watermarked-001-ready-manifest.json`
- output: `docs/reports/2026-05-15-9709-p3-m-watermarked-001-db-coverage.json`

Result:

- manifest_count: `10`
- present: `10`
- missing_registry: `0`
- joined_snapshots: `10`
- snapshot_missing: `0`
- prompt_missing: `0`
- provenance_missing: `0`
- search_text_missing: `0`
- snapshot_ref_missing: `0`
- materialized_classifier_missing: `0`

## Artifacts

- `data/manifests/9709_p3_m_watermarked_001_page_chain_surface_v1.json`
- `data/manifests/9709_p3_m_watermarked_001_authority_sidecar_v1.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-page-chain-report.md`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-page-chain-report.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-evidence-bundle-summary.md`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-evidence-bundles.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-human-visual-disposition.md`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-human-visual-dispositions.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-post-extraction-review.md`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-post-extraction-review.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-authority-visual-review.md`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-authority-visual-review.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-authority-manifest.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-aligned-manifest.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-ready-manifest.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-authority-evidence-bundles.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-search-gate.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-search-gate-report.md`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-release-preflight-final.json`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-release-preflight-final.md`
- `docs/reports/2026-05-15-9709-p3-m-watermarked-001-db-coverage.json`

## Remaining Boundaries

- This closes only `p3_m_watermarked_001`.
- Full 9709 scale-out should continue by shard.
- The next watermarked shard remains a separate operator decision; this report does not authorize mixing additional shards into the same batch.
