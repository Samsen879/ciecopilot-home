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
| watermarked source PDFs by filename | 12 |
| rows from watermarked source filenames | 84 |
| mechanical crop blocker | false |

| source PDF | rows |
| --- | ---: |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_12.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_13.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_21.pdf` | 8 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_22.pdf` | 8 |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_23.pdf` | 8 |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_31.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_32.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_33.pdf` | 7 |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_41.pdf` | 6 |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_42.pdf` | 6 |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_43.pdf` | 6 |

- This risk is filename/path-based and does not prove visual watermark presence or absence on every crop.
- It does not change deterministic crop completion status; visual review/source remediation remains a later gate.

## Gate Counts

| metric | value |
| --- | ---: |
| wave2 shards | 16 |
| input manifests | 16 |
| surface manifests updated | 16 |
| total rows | 413 |
| crop rows complete | 413 |
| missing crops | 0 |
| blocker rows | 0 |
| multi-page rows | 14 |
| rendered PDFs | 52 |
| rendered pages | 792 |
| local PNG artifact files | 1224 |
| text-only ready rows | 0 |
| image-context required rows | 413 |

## Wave2 Shards

| shard | rows | complete | missing crops | multi-page | blockers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `9231_p1_s18_standard_001` | 33 | 33 | 0 | 14 | 0 |
| `9231_p1_s20_standard_001` | 21 | 21 | 0 | 0 | 0 |
| `9231_p1_s24_standard_001` | 21 | 21 | 0 | 0 | 0 |
| `9231_p1_w16_standard_001` | 33 | 33 | 0 | 0 | 0 |
| `9231_p1_w25_standard_001` | 28 | 28 | 0 | 0 | 0 |
| `9231_p2_s16_standard_001` | 33 | 33 | 0 | 0 | 0 |
| `9231_p2_s20_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p2_s24_standard_001` | 24 | 24 | 0 | 0 | 0 |
| `9231_p2_w16_standard_001` | 30 | 30 | 0 | 0 | 0 |
| `9231_p2_w25_standard_001` | 32 | 32 | 0 | 0 | 0 |
| `9231_p3_s20_standard_001` | 21 | 21 | 0 | 0 | 0 |
| `9231_p3_s24_standard_001` | 21 | 21 | 0 | 0 | 0 |
| `9231_p3_w25_standard_001` | 28 | 28 | 0 | 0 | 0 |
| `9231_p4_s20_standard_001` | 18 | 18 | 0 | 0 | 0 |
| `9231_p4_s24_standard_001` | 20 | 20 | 0 | 0 | 0 |
| `9231_p4_w25_standard_001` | 26 | 26 | 0 | 0 | 0 |

## Artifacts

| artifact | path |
| --- | --- |
| crop manifest | `data/manifests/9231_wave2_shards_2026_06_05_crop_manifest_v1.json` |
| updated surface manifest `9231_p1_w25_standard_001` | `data/manifests/9231_p1_w25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w25_standard_001` | `data/manifests/9231_p2_w25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p3_w25_standard_001` | `data/manifests/9231_p3_w25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_w25_standard_001` | `data/manifests/9231_p4_w25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_s24_standard_001` | `data/manifests/9231_p1_s24_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s24_standard_001` | `data/manifests/9231_p2_s24_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p3_s24_standard_001` | `data/manifests/9231_p3_s24_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_s24_standard_001` | `data/manifests/9231_p4_s24_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_s20_standard_001` | `data/manifests/9231_p1_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s20_standard_001` | `data/manifests/9231_p2_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p3_s20_standard_001` | `data/manifests/9231_p3_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_s20_standard_001` | `data/manifests/9231_p4_s20_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_w16_standard_001` | `data/manifests/9231_p1_w16_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s16_standard_001` | `data/manifests/9231_p2_s16_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_w16_standard_001` | `data/manifests/9231_p2_w16_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_s18_standard_001` | `data/manifests/9231_p1_s18_standard_001_page_chain_surface_v1.json` |

## Blockers

- none

## Next Executable Gates

- Spot-check representative wave2 crop images visually before broad 9231 rollout.
- If visual review passes, run the same local gate across the remaining shard groups.
- Attach OCR/text evidence after crop coverage exists.
- Build question_plain_text_v1/v2 only after row/evidence coverage exists.
- Run a normalized_plain_text local consumption gate before claiming search/read-model/RAG consumption.
