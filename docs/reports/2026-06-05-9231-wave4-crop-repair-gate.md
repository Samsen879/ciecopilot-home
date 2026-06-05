# 9231 Wave4 Crop Repair Gate

- generated_on: `2026-06-05`
- gate_status: `wave4_crop_render_complete_pending_visual_review`
- This is not production-ready and does not claim canonical question text.
- No external VLM/API or OCR rerun was used.
- DB/search/read-model/RAG consumption claimed: false.
- Visual review is still required before v1/v2 text-layer generation.

## Repo-Truth Conclusion

Conclusion: the remaining clean 9231 crop/render-incomplete wave4 shards now have local deterministic render/crop assets and surface crop references, pending visual review and text evidence gates.

## Selection Strategy

| bucket | shards |
| --- | --- |
| remaining clean crop/render-incomplete Paper 2 and Paper 4 shards after wave3 | `9231_p2_w23_standard_001`, `9231_p2_w24_standard_001`, `9231_p4_s21_standard_001`, `9231_p4_s22_standard_001`, `9231_p4_s23_standard_001`, `9231_p4_w20_standard_001`, `9231_p4_w21_standard_001`, `9231_p4_w22_standard_001`, `9231_p4_w23_standard_001`, `9231_p4_w24_standard_001` |

## Source Cleanliness Risk

| metric | value |
| --- | ---: |
| watermarked source PDFs by filename | 0 |
| rows from watermarked source filenames | 0 |
| mechanical crop blocker | false |

- This risk is filename/path-based and does not prove visual watermark presence or absence on every crop.
- It does not change deterministic crop completion status; visual review/source remediation remains a later gate.

## Gate Counts

| metric | value |
| --- | ---: |
| wave4 shards | 10 |
| input manifests | 10 |
| surface manifests updated | 10 |
| total rows | 191 |
| crop rows complete | 191 |
| missing crops | 0 |
| blocker rows | 0 |
| multi-page rows | 0 |
| rendered PDFs | 30 |
| rendered pages | 452 |
| local PNG artifact files | 643 |
| text-only ready rows | 0 |
| image-context required rows | 191 |

## Wave4 Shards

| shard | rows | complete | missing crops | multi-page | blockers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `9231_p2_w23_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p2_w24_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p4_s21_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p4_s22_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p4_s23_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p4_w20_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p4_w21_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p4_w22_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p4_w23_standard_001` | 17 | 17 | 0 | 0 | 0 |
| `9231_p4_w24_standard_001` | 18 | 18 | 0 | 0 | 0 |

## Artifacts

| artifact | path |
| --- | --- |
| crop manifest | `data/manifests/9231_wave4_crop_repair_2026_06_05_crop_manifest_v1.json` |
| updated surface manifest `9231_p2_w23_standard_001` | `data/manifests/9231_p2_w23_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w24_standard_001` | `data/manifests/9231_p2_w24_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_s21_standard_001` | `data/manifests/9231_p4_s21_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_s22_standard_001` | `data/manifests/9231_p4_s22_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_s23_standard_001` | `data/manifests/9231_p4_s23_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_w20_standard_001` | `data/manifests/9231_p4_w20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_w21_standard_001` | `data/manifests/9231_p4_w21_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_w22_standard_001` | `data/manifests/9231_p4_w22_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_w23_standard_001` | `data/manifests/9231_p4_w23_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_w24_standard_001` | `data/manifests/9231_p4_w24_standard_001_page_chain_surface_v1.json` |

## Blockers

- none

## Next Executable Gates

- Refresh the next-wave candidate gate; clean repaired rows should become visual-review candidates.
- Run visual review before question_plain_text_v1/v2 generation.
- Attach authority and local normalized_plain_text consumption only after v2 exists.
