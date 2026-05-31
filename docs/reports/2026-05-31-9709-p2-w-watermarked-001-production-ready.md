# 9709 p2_w_watermarked_001 production-ready closeout

日期: 2026-05-31

## Scope

本报告只覆盖 `p2_w_watermarked_001`。

- PDFs: `3`
- paper/session family: Winter 2019 Paper 2 watermarked, `qp_21/22/23`
- manifest rows: `22`
- ready manifest: `docs/reports/2026-05-31-9709-p2-w-watermarked-001-ready-manifest.json`

结论不能外推为 9709 全量 production-ready。当前可宣称的是: `p2_w_watermarked_001` 在 page-chain/evidence bundle、targeted visual disposition、operator watermarked-source disposition、post-extraction review、P2 authority sidecar、registry backfill、analysis hydration、DB coverage、search gate、release preflight 这一批次闭环上已达到 shard-scoped production-ready。

## Final Verdict

`p2_w_watermarked_001` status: `production-ready`

条件限定:

- authority 来自 shard-scoped sidecar，不是 inline manifest `primary_topic_path`。
- `22` 条 release preflight warning 全部是 `manifest_primary_topic_missing_sidecar_canonical_present`，属于当前 sidecar-authority 合同下的预期 warning。
- P2 runtime seed 使用 component-scoped `9709.p2.*` paths；P2/P3 subset statement 仍是 boundary overlay，不把 P2 合并进 P3。
- 本 shard 的 targeted visual review 使用了已明确批准的外部 VLM/API；本 production-ready closeout 步骤没有新的外部 VLM/API 调用。
- Watermarked source 在本 shard 中是 review reason，不是自动 blocker；9 个 raw VLM rejection 已由 operator disposition 复核为内容完整、清晰且 watermark 未遮挡关键内容。
- 本报告不声明任何其他 9709 shard 的 production-ready 状态。

## Visual And Authority Evidence

已完成:

- page-chain extraction: `3/3` PDFs passed
- evidence bundles: `22/22`
- targeted visual review raw result: `13/22` accepted, `9/22` rejected for watermark/source-policy reasons
- operator visual disposition: `22/22` accepted, `9` overrides
- post-extraction review: `pass`
- diagram-lane items: `1`
- release blockers after authority alignment: `0`

Authority sidecar:

- path: `data/manifests/9709_p2_w_watermarked_001_authority_sidecar_v1.json`
- rows: `22`
- seeded P2 topic paths used: `6`
- runtime seed file: `data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_v1.json`

Topic distribution:

| Topic Path | Count |
|---|---:|
| `9709.p2.algebra` | 6 |
| `9709.p2.differentiation` | 6 |
| `9709.p2.integration` | 3 |
| `9709.p2.logarithmic_and_exponential_functions` | 1 |
| `9709.p2.numerical_solution_of_equations` | 3 |
| `9709.p2.trigonometry` | 3 |

## Registry And Analysis Backfill

Registry backfill:

- processed: `22`
- inserted: `22`
- updated: `0`
- conflicts: `0`
- curriculum nodes inserted: `0`
- curriculum nodes existing: `35`

Analysis hydration:

- processed: `22`
- backfilled: `22`
- skipped: `0`

Final DB coverage:

| Metric | Value |
|---|---:|
| present | 22 |
| manifest_count | 22 |
| prompt_missing | 0 |
| joined_snapshots | 22 |
| missing_registry | 0 |
| snapshot_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| snapshot_ref_missing | 0 |
| materialized_classifier_missing | 0 |

Release-scope distribution after analysis hydration:

| release_scope_status | type_release_state | Count |
|---|---|---:|
| `non_released_fallback` | `draft` | 16 |
| `non_released_fallback` | `released` | 3 |
| `released_scoring` | `released` | 3 |

## Gate Results

Release preflight:

- status: `pass`
- blockers: `0`
- warnings: `22`

Question search gate:

- gate_pass: `true`
- exact_structured_match_rate: `1`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `1`
- null_summary_rate: `0`

## Artifacts

- `data/manifests/9709_p2_w_watermarked_001_input_v1.json`
- `data/manifests/9709_p2_w_watermarked_001_page_chain_surface_v1.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-page-chain-report.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-page-chain-projection.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-page-chain-bundle-summary.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-resolution-audit.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-lane-results.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-evidence-bundles.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-targeted-visual-vlm-review.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-vlm-assisted-visual-disposition.md`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-vlm-assisted-visual-dispositions.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-operator-visual-disposition.md`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-operator-visual-dispositions.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-post-extraction-review-pass.md`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-post-extraction-review-pass.json`
- `data/manifests/9709_p2_w_watermarked_001_authority_sidecar_v1.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-authority-layer.md`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-authority-layer.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-release-preflight-authority-aligned.md`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-release-preflight-authority-aligned.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-authority-manifest.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-aligned-manifest.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-ready-manifest.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-authority-evidence-bundles.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-db-coverage.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-search-gate-report.md`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-search-gate.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-release-preflight-final.md`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-release-preflight-final.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-production-ready.json`
- `docs/reports/2026-05-31-9709-p2-w-watermarked-001-production-ready.md`

## Remaining Boundaries

- This closes only `p2_w_watermarked_001`.
- Full 9709 production readiness remains shard-bound and still requires remaining shard closeouts.
- This report does not authorize mixing additional shards into the same batch.
