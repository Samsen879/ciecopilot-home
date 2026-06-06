# 9231 WM Final Visual Review Gate

- generated_on: `2026-06-07`
- status: `pass`
- visual_review_gate_passed: `true`
- production_ready_claimed: `false`
- source VLM review JSON: `docs/reports/2026-06-07-9231-wm-final-visual-review-vlm.json`
- External VLM/API use was explicitly authorized for this evidence layer. This gate does not claim v1/v2 text readiness, authority alignment, DB/search/read-model/RAG consumption, or production readiness.

## Counts

| metric | value |
| --- | ---: |
| selected shards | 6 |
| expected rows | 150 |
| selected rows | 150 |
| reviewed rows | 150 |
| accepted rows | 150 |
| rejected rows | 0 |
| missing review rows | 0 |
| duplicate review storage keys | 0 |
| updated surface manifests | 6 |
| passed shards | 6 |
| blocked shards | 0 |
| blockers | 0 |

## Token Usage

| metric | value |
| --- | ---: |
| completion_tokens | 22025 |
| prompt_tokens | 339184 |
| total_tokens | 361209 |

## Artifacts

- source remediation gate: `docs/reports/2026-06-06-9231-wm-source-remediation-gate.json`
- crop/render gate: `docs/reports/2026-06-06-9231-wm-final-crop-render-gate.json`
- crop manifest: `data/manifests/9231_wm_final_crop_manifest_2026_06_06_v1.json`
- VLM review JSON: `docs/reports/2026-06-07-9231-wm-final-visual-review-vlm.json`
- gate JSON: `docs/reports/2026-06-07-9231-wm-final-visual-review-gate.json`

## Shards

| shard | status | rows | accepted | blocked |
| --- | --- | ---: | ---: | ---: |
| `9231_p1_s20_standard_001` | `pass` | 21 | 21 | 0 |
| `9231_p1_w19_standard_001` | `pass` | 33 | 33 | 0 |
| `9231_p2_s20_standard_001` | `pass` | 24 | 24 | 0 |
| `9231_p2_w19_standard_001` | `pass` | 33 | 33 | 0 |
| `9231_p3_s20_standard_001` | `pass` | 21 | 21 | 0 |
| `9231_p4_s20_standard_001` | `pass` | 18 | 18 | 0 |

## Blockers

| check | storage_key |
| --- | --- |
| none |  |
