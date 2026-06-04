# 9231 Question Row Foundation Gate

- generated_on: `2026-06-04`
- gate_status: `row_foundation_ready_pending_text_image_gates`
- locator_method: `pdfjs_text_items_strict_left_margin_question_header_v1`
- This is not production-ready and does not claim canonical question text.
- No external VLM/API or OCR rerun was used.
- DB/search/RAG consumption claimed: false.

## Repo-Truth Conclusion

Conclusion: deterministic 9231 source PDF locator rows now exist as local page-chain surface manifests, pending crop/render, visual review, row-level text evidence, v1/v2 plain-text gates, and local normalized_plain_text consumption gates.

## Gate Counts

| metric | value |
| --- | --- |
| source PDF count | 200 |
| PDFs parse OK | 200 |
| page count total | 3464 |
| question row count | 1593 |
| input manifests | 4 |
| page-chain surface manifests | 4 |
| text-only ready rows | 0 |
| image-context required rows | 1593 |
| blockers | 0 |
| DB/search/RAG consumption claimed | false |

## Paper Split

| paper | source PDFs | question rows |
| --- | --- | --- |
| p1 | 62 | 532 |
| p2 | 62 | 566 |
| p3 | 38 | 264 |
| p4 | 38 | 231 |

## Question Count Histogram

| questions per PDF | PDF count |
| --- | --- |
| 5 | 1 |
| 6 | 35 |
| 7 | 78 |
| 8 | 37 |
| 9 | 1 |
| 10 | 3 |
| 11 | 43 |
| 12 | 2 |

## Artifacts

| artifact | path | rows |
| --- | --- | --- |
| combined manifest | data/manifests/9231_question_row_foundation_2026_06_04_manifest_v1.json | 1593 |
| input manifest | data/manifests/9231_p1_source_locator_001_input_v1.json | 532 |
| input manifest | data/manifests/9231_p2_source_locator_001_input_v1.json | 566 |
| input manifest | data/manifests/9231_p3_source_locator_001_input_v1.json | 264 |
| input manifest | data/manifests/9231_p4_source_locator_001_input_v1.json | 231 |
| page-chain surface manifest | data/manifests/9231_p1_source_locator_001_page_chain_surface_v1.json | 532 |
| page-chain surface manifest | data/manifests/9231_p2_source_locator_001_page_chain_surface_v1.json | 566 |
| page-chain surface manifest | data/manifests/9231_p3_source_locator_001_page_chain_surface_v1.json | 264 |
| page-chain surface manifest | data/manifests/9231_p4_source_locator_001_page_chain_surface_v1.json | 231 |
| report json | docs/reports/2026-06-04-9231-question-row-foundation-gate.json | n/a |
| report markdown | docs/reports/2026-06-04-9231-question-row-foundation-gate.md | n/a |

## Blockers

- none

## Next Executable Gates

- Render/crop each row locally and validate referenced crop assets.
- Attach row-level OCR/text evidence without external VLM/API unless scope is explicitly expanded.
- Build 9231 question_plain_text_v1/v2 only after row evidence exists.
- Run a 9231 local normalized_plain_text consumption gate before claiming search/read-model/RAG consumption.

## Verification Inputs

- `git status --short --branch`
- `npm run workflow:codex-preflight -- --json`
- `data/past-papers/9231Further-Mathematics`
- `pdfjs-dist/legacy/build/pdf.mjs local text-item coordinates`
- `data/manifests/9231_p{1..4}_source_locator_001_input_v1.json`
- `data/manifests/9231_p{1..4}_source_locator_001_page_chain_surface_v1.json`

## Workflow Gaps

- package.json missing workflow:codex-preflight script; recorded as workflow gap, not content blocker
