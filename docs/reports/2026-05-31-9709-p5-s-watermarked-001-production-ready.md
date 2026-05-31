# 9709 p5_s_watermarked_001 production-ready closeout

Verdict: `p5_s_watermarked_001` is shard-scoped `production-ready`.

## Scope

- source PDFs: `data/past-papers/9709Mathematics/paper5/WM_9709_s20_qp_51.pdf`, `data/past-papers/9709Mathematics/paper5/WM_9709_s20_qp_52.pdf`, `data/past-papers/9709Mathematics/paper5/WM_9709_s20_qp_53.pdf`
- manifest rows: `21`
- ready manifest: `docs/reports/2026-05-31-9709-p5-s-watermarked-001-ready-manifest.json`

## Visual And Extraction

- page-chain PDFs passed: `3/3`
- extracted questions: `21`
- route counts: `{"diagram_lane":4,"ocr_lane":17}`
- targeted VLM raw accepted/rejected: `17/4`
- operator accepted/rejected/overrides: `21/0/4`
- post-extraction review: `pass`, blockers `0`, warnings `0`

## Authority And Runtime

- authority sidecar rows: `21`
- topic distribution: `{"9709.p5.discrete_random_variables":5,"9709.p5.permutations_and_combinations":4,"9709.p5.probability":3,"9709.p5.the_normal_distribution":5,"9709.p5.representation_of_data":4}`
- release preflight: `pass`, blockers `0`, warnings `42`

## DB Coverage

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

## Search Gate

- gate_pass: `true`
- exact_structured_match_rate: `1`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `1`
- null_summary_rate: `0`

## Boundary

- This closes only p5_s_watermarked_001.
- Full 9709 production readiness remains shard-bound and still requires remaining shard closeouts.
- Paper 5/6 authority-ready warnings remain expected scope warnings until full P5/P6 production policy is finalized.
- Watermarked source status is accepted only for this shard because targeted/operator visual review found no content occlusion; 4 watermark-only VLM rejections were operator-overridden under that contract.
- This report does not authorize mixing additional shards into the same batch.

## Artifacts

- `data/manifests/9709_p5_s_watermarked_001_input_v1.json`
- `data/manifests/9709_p5_s_watermarked_001_page_chain_surface_v1.json`
- `data/manifests/9709_p5_s_watermarked_001_authority_sidecar_v1.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-page-chain-report.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-page-chain-projection.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-page-chain-bundle-summary.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-resolution-audit.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-lane-results.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-evidence-bundles.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-targeted-visual-vlm-review.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-vlm-assisted-visual-disposition.md`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-vlm-assisted-visual-dispositions.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-operator-visual-disposition.md`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-operator-visual-dispositions.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-post-extraction-review-pass.md`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-authority-layer.md`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-authority-layer.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-authority-manifest.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-aligned-manifest.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-ready-manifest.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-authority-evidence-bundles.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-db-coverage.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-search-gate-report.md`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-search-gate.json`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-release-preflight-final.md`
- `docs/reports/2026-05-31-9709-p5-s-watermarked-001-release-preflight-final.json`
