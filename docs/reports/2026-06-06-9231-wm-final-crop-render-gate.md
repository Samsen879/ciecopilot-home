# 9231 WM-Final Crop/Render Gate

- generated_on: `2026-06-06`
- gate_status: `wm_final_crop_render_complete_pending_visual_review`
- This gate is local deterministic crop/render/surface-ref evidence only.
- No external VLM/API or OCR rerun was used.
- No question_plain_text_v1/v2, authority alignment, DB/search/read-model/RAG, or production gate was run.

## Source Remediation Input

| metric | value |
| --- | ---: |
| remediation gate status | `pass` |
| target source PDFs | 18 |
| verified or replaced source PDFs | 18 |
| red-pixel gate passes | 18 |
| after red pixels | 0 |
| freeze posture lifted | true |

## Gate Counts

| metric | value |
| --- | ---: |
| S20 revalidation shards | 4 |
| W19 generation shards | 2 |
| total rows | 150 |
| S20 revalidated rows | 84 |
| W19 generated rows | 66 |
| crop rows complete | 150 |
| missing crops | 0 |
| blocker rows | 0 |
| row identity preserved | true |
| rendered PDFs | 18 |
| rendered pages | 324 |
| local PNG artifact references | 323 |
| crop files non-empty | true |
| rendered pages non-empty | true |

## Target Shards

| shard | rows | complete | missing crops | multi-page | blockers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `9231_p1_s20_standard_001` | 21 | 21 | 0 | 0 | 0 |
| `9231_p2_s20_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p3_s20_standard_001` | 21 | 21 | 0 | 0 | 0 |
| `9231_p4_s20_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p1_w19_standard_001` | 33 | 33 | 0 | 9 | 0 |
| `9231_p2_w19_standard_001` | 33 | 33 | 0 | 3 | 0 |

## Artifacts

| artifact | path |
| --- | --- |
| final crop manifest | `data/manifests/9231_wm_final_crop_manifest_2026_06_06_v1.json` |
| source freeze manifest | `data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json` |
| source remediation report | `docs/reports/2026-06-06-9231-wm-source-remediation-gate.json` |
| updated surface manifest `9231_p1_s20_standard_001` | `data/manifests/9231_p1_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s20_standard_001` | `data/manifests/9231_p2_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p3_s20_standard_001` | `data/manifests/9231_p3_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_s20_standard_001` | `data/manifests/9231_p4_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_w19_standard_001` | `data/manifests/9231_p1_w19_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w19_standard_001` | `data/manifests/9231_p2_w19_standard_001_page_chain_surface_v1.json` |

## Blockers

- none

## Boundary

- Visual review remains a later gate.
- question_plain_text_v1/v2 generation remains a later gate.
- Authority alignment and local normalized_plain_text consumption remain later gates.
- Production DB/search/read-model/RAG gates remain later gates.
