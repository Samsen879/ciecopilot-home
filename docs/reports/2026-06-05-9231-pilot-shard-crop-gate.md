# 9231 Pilot Shard Crop Gate

- generated_on: `2026-06-05`
- gate_status: `pilot_crop_render_complete_pending_visual_review`
- This is not production-ready and does not claim canonical question text.
- No external VLM/API or OCR rerun was used.
- DB/search/read-model/RAG consumption claimed: false.
- Visual review is still required.

## Repo-Truth Conclusion

Conclusion: 5 representative 9231 shards have local deterministic render/crop assets and surface crop references, pending visual review, OCR/text evidence, v1/v2 text, and normalized_plain_text consumption gates.

## Gate Counts

| metric | value |
| --- | ---: |
| pilot shards | 5 |
| input manifests | 5 |
| surface manifests updated | 5 |
| total rows | 145 |
| crop rows complete | 145 |
| missing crops | 0 |
| blocker rows | 0 |
| multi-page rows | 0 |
| rendered PDFs | 19 |
| rendered pages | 284 |
| local PNG artifact files | 429 |
| text-only ready rows | 0 |
| image-context required rows | 145 |

## Pilot Shards

| shard | rows | complete | missing crops | multi-page | blockers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `9231_p1_s16_standard_001` | 33 | 33 | 0 | 0 | 0 |
| `9231_p1_s25_standard_001` | 28 | 28 | 0 | 0 | 0 |
| `9231_p2_s25_standard_001` | 32 | 32 | 0 | 0 | 0 |
| `9231_p3_s25_standard_001` | 28 | 28 | 0 | 0 | 0 |
| `9231_p4_s25_standard_001` | 24 | 24 | 0 | 0 | 0 |

## Artifacts

| artifact | path |
| --- | --- |
| crop manifest | `data/manifests/9231_pilot_shards_2026_06_05_crop_manifest_v1.json` |
| updated surface manifest `9231_p1_s25_standard_001` | `data/manifests/9231_p1_s25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p2_s25_standard_001` | `data/manifests/9231_p2_s25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p3_s25_standard_001` | `data/manifests/9231_p3_s25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p4_s25_standard_001` | `data/manifests/9231_p4_s25_standard_001_page_chain_surface_v1.json` |
| updated surface manifest `9231_p1_s16_standard_001` | `data/manifests/9231_p1_s16_standard_001_page_chain_surface_v1.json` |

## Blockers

- none

## Next Executable Gates

- Spot-check representative crop images visually before broad 9231 rollout.
- If visual review passes, run the same local gate across the remaining shard groups.
- Attach OCR/text evidence after crop coverage exists.
- Build question_plain_text_v1/v2 only after row/evidence coverage exists.
- Run a normalized_plain_text local consumption gate before claiming search/read-model/RAG consumption.
