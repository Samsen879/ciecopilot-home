# 9709 p5_m_watermarked_001 production-ready closeout

日期: 2026-05-31

## Scope

本报告只覆盖 `p5_m_watermarked_001`。

- PDFs: `1`
- paper/session family: March 2020 Paper 5 watermarked, `qp_52`
- manifest rows: `6`
- ready manifest: `docs/reports/2026-05-31-9709-p5-m-watermarked-001-ready-manifest.json`

结论不能外推为 9709 全量 production-ready。当前可宣称的是: `p5_m_watermarked_001` 在 page-chain/evidence bundle、targeted/operator visual disposition、post-extraction review、P5 authority sidecar、P5 draft classifier taxonomy support、registry backfill、analysis hydration、DB coverage、search gate、release preflight 这一批次闭环上已达到 shard-scoped production-ready。

## Final Verdict

`p5_m_watermarked_001` status: `production-ready`

条件限定:

- authority 来自 shard-scoped sidecar，不是 inline manifest `primary_topic_path`。
- `12` 条 release preflight warning 包含 `manifest_primary_topic_missing_sidecar_canonical_present=6` 和 `paper_5_or_6_in_authority_ready_batch=6`，均为当前 P5 sidecar-authority 合同下的预期 warning。
- P5 runtime seed 使用 component-scoped `9709.p5.*` paths。
- P5 classifier taxonomy support 只 seed draft FK target rows，不提升 released scoring。
- 本 shard 的 page-chain extraction 和 targeted visual review 使用了已明确批准的外部 VLM/API。
- Watermarked source 在本 shard 中是 review reason，不是自动 blocker；operator disposition 接受 `6/6` 项，记录 `0` 个 override。
- 本报告不声明任何其他 9709 shard 的 production-ready 状态。

## Visual And Authority Evidence

已完成:

- page-chain extraction: `1/1` PDFs passed
- page-chain warnings: `{}`
- evidence bundles: `6/6`
- targeted visual review raw result: `6/6` accepted, `0/6` rejected
- operator visual disposition: `6/6` accepted, `0` overrides
- post-extraction review: `pass`
- diagram-lane items: `2`
- release blockers after authority alignment: `0`

Authority sidecar:

- path: `data/manifests/9709_p5_m_watermarked_001_authority_sidecar_v1.json`
- rows: `6`
- seeded P5 topic paths used: `5`
- runtime seed file: `data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_p5_v1.json`

Topic distribution:

| Topic Path | Count |
|---|---:|
| `9709.p5.permutations_and_combinations` | 2 |
| `9709.p5.probability` | 1 |
| `9709.p5.representation_of_data` | 1 |
| `9709.p5.the_normal_distribution` | 2 |

## Registry And Analysis Backfill

Registry backfill:

- processed: `6`
- inserted: `6`
- updated: `0`
- conflicts: `0`
- curriculum nodes inserted: `4`
- curriculum nodes existing: `35`

Classifier taxonomy:

- draft family: `9709.statistics`
- draft question types: `5`
- migration: `supabase/migrations/20260531153000_seed_9709_p5_classifier_registry_draft.sql`

Analysis hydration:

- processed: `6`
- backfilled: `6`
- skipped: `0`
- forced rerun after P5 classifier seed: `true`

Final DB coverage:

| Metric | Value |
|---|---:|
| present | 6 |
| manifest_count | 6 |
| prompt_missing | 0 |
| joined_snapshots | 6 |
| missing_registry | 0 |
| snapshot_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| snapshot_ref_missing | 0 |
| materialized_classifier_missing | 0 |

Release-scope distribution after analysis hydration:

| release_scope_status | type_release_state | Count |
|---|---|---:|
| `non_released_fallback` | `draft` | 6 |

## Gate Results

Release preflight:

- status: `pass`
- blockers: `0`
- warnings: `12`

Question search gate:

- gate_pass: `true`
- exact_structured_match_rate: `1`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `1`
- null_summary_rate: `0`

## Artifacts

- `data/manifests/9709_p5_m_watermarked_001_input_v1.json`
- `data/manifests/9709_p5_m_watermarked_001_page_chain_surface_v1.json`
- `data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_p5_v1.json`
- `supabase/migrations/20260531153000_seed_9709_p5_classifier_registry_draft.sql`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-page-chain-report.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-page-chain-projection.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-page-chain-bundle-summary.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-resolution-audit.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-lane-results.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-evidence-bundles.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-targeted-visual-vlm-review.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-vlm-assisted-visual-disposition.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-vlm-assisted-visual-dispositions.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-operator-visual-disposition.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-operator-visual-dispositions.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-post-extraction-review.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-post-extraction-review.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-post-extraction-review-pass.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-post-extraction-review-pass.json`
- `data/manifests/9709_p5_m_watermarked_001_authority_sidecar_v1.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-authority-layer.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-authority-layer.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-release-preflight-authority-aligned.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-release-preflight-authority-aligned.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-authority-manifest.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-aligned-manifest.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-ready-manifest.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-authority-evidence-bundles.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-db-coverage.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-search-gate-report.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-search-gate.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-release-preflight-final.md`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-release-preflight-final.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-production-ready.json`
- `docs/reports/2026-05-31-9709-p5-m-watermarked-001-production-ready.md`

## Remaining Boundaries

- This closes only `p5_m_watermarked_001`.
- Full 9709 production readiness remains shard-bound and still requires remaining shard closeouts.
- Paper 5/6 authority-ready warnings remain expected scope warnings until full P5/P6 production policy is finalized.
- This report does not authorize mixing additional shards into the same batch.
