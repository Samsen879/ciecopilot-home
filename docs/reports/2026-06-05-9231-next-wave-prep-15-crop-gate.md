# 9231 Wave2 Shard Crop Gate

- generated_on: `2026-06-05`
- gate_status: `wave2_crop_render_complete_pending_visual_review`
- This is not production-ready and does not claim canonical question text.
- No external VLM/API or OCR rerun was used.
- DB/search/read-model/RAG consumption claimed: false.
- Visual review is still required.

## Repo-Truth Conclusion

Conclusion: 16 representative 9231 wave2 shards have local deterministic render/crop assets and surface crop references, pending visual review, OCR/text evidence, v1/v2 text, and normalized_plain_text consumption gates.

## Selection Strategy

| bucket | shards |
| --- | --- |
| newest untested winter 2025 | `9231_p1_w25_standard_001`, `9231_p2_w25_standard_001`, `9231_p3_w25_standard_001`, `9231_p4_w25_standard_001` |
| recent summer 2024 all papers | `9231_p1_s24_standard_001`, `9231_p2_s24_standard_001`, `9231_p3_s24_standard_001`, `9231_p4_s24_standard_001` |
| first p3/p4-era summer 2020 all papers | `9231_p1_s20_standard_001`, `9231_p2_s20_standard_001`, `9231_p3_s20_standard_001`, `9231_p4_s20_standard_001` |
| legacy p1/p2-only era | `9231_p1_w16_standard_001`, `9231_p2_s16_standard_001`, `9231_p2_w16_standard_001`, `9231_p1_s18_standard_001` |

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
| wave2 shards | 15 |
| input manifests | 15 |
| surface manifests updated | 15 |
| total rows | 444 |
| crop rows complete | 444 |
| missing crops | 0 |
| blocker rows | 0 |
| multi-page rows | 96 |
| rendered PDFs | 45 |
| rendered pages | 984 |
| local PNG artifact files | 1532 |
| text-only ready rows | 0 |
| image-context required rows | 444 |

## Wave2 Shards

| shard | rows | complete | missing crops | multi-page | blockers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `9231_p1_s17_standard_001` | 35 | 35 | 0 | 17 | 0 |
| `9231_p1_s19_standard_001` | 33 | 33 | 0 | 10 | 0 |
| `9231_p1_w17_standard_001` | 33 | 33 | 0 | 15 | 0 |
| `9231_p1_w18_standard_001` | 33 | 33 | 0 | 16 | 0 |
| `9231_p2_s17_standard_001` | 33 | 33 | 0 | 5 | 0 |
| `9231_p2_s18_standard_001` | 33 | 33 | 0 | 4 | 0 |
| `9231_p2_s19_standard_001` | 33 | 33 | 0 | 13 | 0 |
| `9231_p2_s21_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p2_s22_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p2_s23_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p2_w17_standard_001` | 33 | 33 | 0 | 6 | 0 |
| `9231_p2_w18_standard_001` | 33 | 33 | 0 | 10 | 0 |
| `9231_p2_w20_standard_001` | 25 | 25 | 0 | 0 | 0 |
| `9231_p2_w21_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p2_w22_standard_001` | 24 | 24 | 0 | 0 | 0 |

## Artifacts

| artifact | path |
| --- | --- |
| crop manifest | `data/manifests/9231_next_wave_prep_15_2026_06_05_crop_manifest_v1.json` |
| updated surface manifest `9231_p1_s17_standard_001` | `data/manifests/9231_p1_s17_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_s19_standard_001` | `data/manifests/9231_p1_s19_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_w17_standard_001` | `data/manifests/9231_p1_w17_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_w18_standard_001` | `data/manifests/9231_p1_w18_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s17_standard_001` | `data/manifests/9231_p2_s17_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s18_standard_001` | `data/manifests/9231_p2_s18_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s19_standard_001` | `data/manifests/9231_p2_s19_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w17_standard_001` | `data/manifests/9231_p2_w17_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w18_standard_001` | `data/manifests/9231_p2_w18_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w20_standard_001` | `data/manifests/9231_p2_w20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s21_standard_001` | `data/manifests/9231_p2_s21_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s22_standard_001` | `data/manifests/9231_p2_s22_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s23_standard_001` | `data/manifests/9231_p2_s23_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w21_standard_001` | `data/manifests/9231_p2_w21_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w22_standard_001` | `data/manifests/9231_p2_w22_standard_001_page_chain_surface_v1.json` |

## Blockers

- none

## Next Executable Gates

- Spot-check representative wave2 crop images visually before broad 9231 rollout.
- If visual review passes, run the same local gate across the remaining shard groups.
- Attach OCR/text evidence after crop coverage exists.
- Build question_plain_text_v1/v2 only after row/evidence coverage exists.
- Run a normalized_plain_text local consumption gate before claiming search/read-model/RAG consumption.
