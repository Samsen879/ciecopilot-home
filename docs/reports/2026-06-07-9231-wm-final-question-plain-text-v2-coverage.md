# 9231 question plain text v2 coverage

Verdict: pass. The v1 text layer has been normalized into v2 with text-only/image-context classification and zero gate blockers.

## Scope

- Subject: 9231
- Generated on: 2026-06-07
- Input artifact: docs/reports/2026-06-04-9709-question-plain-text-v1.json
- JSON artifact: docs/reports/2026-06-07-9231-wm-final-question-plain-text-v2.json
- Boundary: deterministic local transform from v1 only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation.
- v2 additions: normalized text, math expression candidates, normalized subquestion blocks, marks totals, text-only vs image-context answering mode.

## Aggregate Gate

| metric | value |
| production rows | 150 |
| v2 rows | 150 |
| normalized plain text rows | 150 |
| strict text-only ready rows | 110 |
| image-context rows with assets | 40/40 |
| diagram rows | 23 |
| table-heavy rows | 17 |
| rows with math expressions | 118 |
| formula-dense rows with math expressions | 118/120 |
| formula-dense rows without math expressions | 2 |
| structured subquestion rows | 0 |
| partial subquestion rows | 0 |
| unstructured subquestion rows | 0 |
| fallback text-block rows | 150 |
| duplicate storage keys | 0 |
| missing normalized plain text | 0 |
| missing image asset | 0 |
| blockers | 0 |

## Source Split

| source version | rows | normalized text | text-only ready | image context + assets | formula dense + math | formula dense no math | structured | partial | unstructured | fallback |
| 9231_wm_final_surface_v1 | 150 | 150 | 110 | 40/40 | 118/120 | 2 | 0 | 0 | 0 | 150 |

## Blockers

- none
