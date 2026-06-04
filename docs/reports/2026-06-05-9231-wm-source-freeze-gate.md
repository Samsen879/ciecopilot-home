# 9231 WM Source Freeze Gate

- generated_on: `2026-06-05`
- gate_status: `wm_source_frozen_pending_source_remediation`
- This is a filename-based WM source freeze, not a visual-cleanliness proof.
- This is not production-ready and does not claim canonical question text.
- DB/search/RAG consumption claimed: false.
- Mechanical crop blocker status is unchanged; source remediation is required before visual/text/production lanes.

## Gate Counts

| metric | value |
| --- | ---: |
| current surface manifests | 64 |
| scanned rows | 1593 |
| frozen rows | 150 |
| affected source PDFs | 18 |
| affected shards | 6 |
| clean-source rows remaining | 1443 |
| mechanical crop blocker rows | 0 |

## Frozen Crop Status

| crop_status | frozen rows |
| --- | ---: |
| `complete` | 84 |
| `not_generated` | 66 |

## Affected Shards

| shard | frozen rows |
| --- | ---: |
| `9231_p1_s20_standard_001` | 21 |
| `9231_p1_w19_standard_001` | 33 |
| `9231_p2_s20_standard_001` | 24 |
| `9231_p2_w19_standard_001` | 33 |
| `9231_p3_s20_standard_001` | 21 |
| `9231_p4_s20_standard_001` | 18 |

## Affected Source PDFs

| source PDF | frozen rows |
| --- | ---: |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_12.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_13.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_11.pdf` | 11 |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_12.pdf` | 11 |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_13.pdf` | 11 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_21.pdf` | 8 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_22.pdf` | 8 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_23.pdf` | 8 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_21.pdf` | 11 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_22.pdf` | 11 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_23.pdf` | 11 |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_31.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_32.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_33.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_41.pdf` | 6 |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_42.pdf` | 6 |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_43.pdf` | 6 |

## Artifacts

- freeze manifest: `data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json`

## Next Executable Gates

- Replace WM_ source PDFs with clean source PDFs before visual/text/production lanes.
- Rerun deterministic crop/surface-ref gate for remediated frozen rows.
- Only then resume visual review, question_plain_text_v1/v2, and normalized_plain_text consumption gates.
