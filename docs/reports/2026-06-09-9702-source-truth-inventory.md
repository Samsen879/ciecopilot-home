# 9702 source truth inventory

Date: 2026-06-09

## Verdict

Status: `pass`

production_ready_claimed=false

This is a source-truth inventory and source-posture gate for Cambridge 9702 Physics question-paper PDFs only.
No page-chain extraction, VLM/OCR, DB import, search gate, release preflight, or production-ready status update was run.
Source truth is separate from row-surface truth: no accepted 9702 question rows are created by this report.

## Summary

| Metric | Value |
| --- | --- |
| tracked source PDFs | 362 |
| represented once | 362 |
| PDF signature pass | 362 |
| pdfjs parse success | 362 |
| page count present | 362 |
| render sanity pass | 362 |
| first-page identity pass or text-layer unavailable | 362 |
| total pages | 5859 |
| blockers | 0 |

## Counts By Paper

| Paper | Tracked QP PDFs |
| --- | --- |
| `paper1` | 67 |
| `paper2` | 64 |
| `paper3` | 103 |
| `paper4` | 62 |
| `paper5` | 66 |

## Counts By Session

| Session | Tracked QP PDFs |
| --- | --- |
| `m17` | 5 |
| `m18` | 5 |
| `m19` | 5 |
| `m20` | 5 |
| `m21` | 5 |
| `m22` | 5 |
| `m23` | 5 |
| `m24` | 5 |
| `m25` | 5 |
| `s16` | 4 |
| `s17` | 17 |
| `s18` | 17 |
| `s19` | 16 |
| `s20` | 13 |
| `s21` | 16 |
| `s22` | 17 |
| `s23` | 17 |
| `s24` | 17 |
| `s25` | 23 |
| `w16` | 2 |
| `w17` | 16 |
| `w18` | 17 |
| `w19` | 17 |
| `w20` | 17 |
| `w21` | 17 |
| `w22` | 17 |
| `w23` | 17 |
| `w24` | 17 |
| `w25` | 23 |

## Counts By Year

| Year | Tracked QP PDFs |
| --- | --- |
| `2016` | 6 |
| `2017` | 38 |
| `2018` | 39 |
| `2019` | 38 |
| `2020` | 35 |
| `2021` | 38 |
| `2022` | 39 |
| `2023` | 39 |
| `2024` | 39 |
| `2025` | 51 |

## Counts By Component

| Component | Tracked QP PDFs |
| --- | --- |
| `11` | 19 |
| `12` | 28 |
| `13` | 18 |
| `14` | 2 |
| `21` | 18 |
| `22` | 27 |
| `23` | 17 |
| `24` | 2 |
| `31` | 18 |
| `32` | 9 |
| `33` | 27 |
| `34` | 19 |
| `35` | 17 |
| `36` | 9 |
| `37` | 2 |
| `38` | 2 |
| `41` | 17 |
| `42` | 26 |
| `43` | 17 |
| `44` | 2 |
| `51` | 19 |
| `52` | 26 |
| `53` | 19 |
| `54` | 2 |

## Source Posture

| Classification | PDFs |
| --- | --- |
| `ambiguous_or_blocked` | 0 |
| `historical_repo_source` | 316 |
| `official_restricted_or_user_supplied` | 0 |
| `public_mirror_candidate_promoted_2026_06_02` | 46 |

- Historical repo source means a tracked 9702 PDF was not listed in the 2026-06-02 public-mirror promotion evidence.
- Public mirror candidate promoted on 2026-06-02 means the tracked path is listed as a verified 9702 row in the promotion JSON.
- No official restricted/user-supplied evidence was found in the re-read inputs for this phase.

## Row-Surface Separation

| Check | Value |
| --- | --- |
| manifest pattern checked | `data/manifests/9702*.json` |
| 9702 manifest count | 0 |
| row-surface truth present | `false` |

No `data/manifests/9702*.json` files were found.

## Render And Identity Evidence

Every represented source PDF has byte size, SHA256, %PDF- signature evidence, pdfjs parse status, page count, first-page identity status, and representative render sanity evidence in the JSON inventory.

## Blockers

Blocker count: `0`.

## Artifacts

- Machine inventory: `docs/reports/2026-06-09-9702-source-truth-inventory.json`
- Markdown report: `docs/reports/2026-06-09-9702-source-truth-inventory.md`
- Helper script: `scripts/learning/build_9702_source_truth_inventory.js`

## Explicit Non-Steps

- Page-chain extraction: not run.
- Crop generation: not run.
- VLM/OCR: not run.
- DB import or production DB writes: not run.
- Search/read-model/RAG gate: not run.
- Release preflight: not run.
- Production-ready status update: not run.
