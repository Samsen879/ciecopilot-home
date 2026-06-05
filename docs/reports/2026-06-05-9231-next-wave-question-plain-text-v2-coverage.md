# 9231 question plain text v2 coverage

Verdict: pass. The v1 text layer has been normalized into v2 with text-only/image-context classification and zero gate blockers.

## Scope

- Subject: 9231
- Generated on: 2026-06-04
- Input artifact: docs/reports/2026-06-04-9709-question-plain-text-v1.json
- JSON artifact: docs/reports/2026-06-05-9231-next-wave-question-plain-text-v2.json
- Boundary: deterministic local transform from v1 only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation.
- v2 additions: normalized text, math expression candidates, normalized subquestion blocks, marks totals, text-only vs image-context answering mode.

## Aggregate Gate

| metric | value |
| production rows | 477 |
| v2 rows | 477 |
| normalized plain text rows | 477 |
| strict text-only ready rows | 379 |
| image-context rows with assets | 98/98 |
| diagram rows | 56 |
| table-heavy rows | 45 |
| rows with math expressions | 391 |
| formula-dense rows with math expressions | 391/399 |
| formula-dense rows without math expressions | 8 |
| structured subquestion rows | 0 |
| partial subquestion rows | 0 |
| unstructured subquestion rows | 0 |
| fallback text-block rows | 477 |
| duplicate storage keys | 0 |
| missing normalized plain text | 0 |
| missing image asset | 0 |
| blockers | 0 |

## Source Split

| source version | rows | normalized text | text-only ready | image context + assets | formula dense + math | formula dense no math | structured | partial | unstructured | fallback |
| 9231_wave1_surface_v1 | 477 | 477 | 379 | 98/98 | 391/399 | 8 | 0 | 0 | 0 | 477 |

## Blockers

- none
