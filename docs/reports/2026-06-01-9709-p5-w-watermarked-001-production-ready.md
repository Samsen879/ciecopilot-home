# 9709 p5_w_watermarked_001 production-ready closeout

日期: 2026-06-01

## Scope

本报告只覆盖 `p5_w_watermarked_001`。

- PDFs: `3`
- paper/session family: Winter 2019 Paper 5 watermarked, `qp_51/52/53`; legacy Mechanics 2 crosswalked to current P4 mechanics paths
- manifest rows: `21`
- ready manifest: `docs/reports/2026-06-01-9709-p5-w-watermarked-001-ready-manifest.json`

结论不能外推为 9709 全量 production-ready。当前可宣称的是: `p5_w_watermarked_001` 在 page-chain/evidence bundle、targeted/operator visual disposition、post-extraction review、P4 authority sidecar、registry/analysis DB coverage、search gate、release preflight 这一批次闭环上已达到 shard-scoped production-ready。

## Final Verdict

`p5_w_watermarked_001` status: `production-ready`

条件限定:

- authority 来自 shard-scoped sidecar，不是 inline manifest `primary_topic_path`。
- W19 watermarked Paper 5 是 legacy Mechanics 2，按当前 repo authority crosswalk 到 `9709.p4.*` mechanics paths。
- `42` 条 release preflight warning 包含 expected manifest-topic sidecar warning 和 Paper 5/6 scope warning。
- 本 shard 的 page-chain extraction 和 targeted visual review 使用了已明确批准的外部 VLM/API。
- 本 production-ready closeout 和 authority mapping 步骤没有新的外部 VLM/API 调用。
- 本报告不声明任何其他 9709 shard 的 production-ready 状态。

## Visual And Authority Evidence

已完成:

- page-chain extraction: `3/3` PDFs passed
- page-chain warnings: `{}`
- evidence bundles: `21/21`
- targeted VLM raw result: `15/21` accepted, `6/21` rejected
- operator visual disposition: `21/21` accepted, overrides `6`
- post-extraction review: `pass`, blockers `0`, warnings `0`
- diagram-lane items: `6`
- OCR-lane items: `15`
- release blockers after authority alignment: `0`

Topic distribution:

| Topic Path | Count |
| --- | ---: |
| `9709.p4.energy_work_and_power` | 4 |
| `9709.p4.forces_and_equilibrium` | 5 |
| `9709.p4.kinematics_of_motion_in_a_straight_line` | 6 |
| `9709.p4.newtons_laws_of_motion` | 6 |

## Registry And Analysis Coverage

Final DB coverage:

| Metric | Value |
| --- | ---: |
| present | 21 |
| manifest_count | 21 |
| prompt_missing | 0 |
| joined_snapshots | 21 |
| missing_registry | 0 |
| snapshot_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| snapshot_ref_missing | 0 |
| materialized_classifier_missing | 0 |

Release-scope distribution after analysis hydration:

| release_scope_status | type_release_state | Count |
| --- | --- | ---: |
| `non_released_fallback` | `draft` | 21 |

## Gate Results

Release preflight:

- status: `pass`
- blockers: `0`
- warnings: `42`

| Warning reason | Count |
| --- | ---: |
| `manifest_primary_topic_missing_sidecar_canonical_present` | 21 |
| `paper_5_or_6_in_authority_ready_batch` | 21 |

Question search gate:

- gate_pass: `true`
- exact_structured_match_rate: `1`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `1`
- null_summary_rate: `0`

## Artifacts

- `data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_p5_v1.json`
- `data/manifests/9709_p5_w_watermarked_001_authority_sidecar_v1.json`
- `data/manifests/9709_p5_w_watermarked_001_input_v1.json`
- `data/manifests/9709_p5_w_watermarked_001_page_chain_surface_v1.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-aligned-manifest.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-authority-evidence-bundles.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-authority-layer.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-authority-layer.md`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-authority-manifest.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-db-coverage.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-evidence-bundles.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-lane-results.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-operator-visual-disposition.md`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-operator-visual-dispositions.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-page-chain-bundle-summary.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-page-chain-projection.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-page-chain-report.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-post-extraction-review-pass.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-post-extraction-review-pass.md`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-post-extraction-review.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-post-extraction-review.md`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-ready-manifest.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-release-preflight-final.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-release-preflight-final.md`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-resolution-audit.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-search-gate-report.md`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-search-gate.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-targeted-visual-vlm-review.json`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-vlm-assisted-visual-disposition.md`
- `docs/reports/2026-06-01-9709-p5-w-watermarked-001-vlm-assisted-visual-dispositions.json`

## Remaining Boundaries

- This closes only `p5_w_watermarked_001`.
- Full 9709 production readiness remains shard-bound and still requires remaining shard closeouts.
- The W19 Paper 5 watermarked rows are legacy Mechanics 2; P4 crosswalk is explicit for this shard only.
- Watermarked source status is accepted only under this shard's targeted/operator visual-review contract.
- Paper 5/6 authority-ready warnings remain expected scope warnings until full P5/P6 production policy is finalized.
- This report does not authorize mixing additional shards into the same batch.
