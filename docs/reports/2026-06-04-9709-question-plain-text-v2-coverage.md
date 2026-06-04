# 9709 question plain text v2 coverage

Verdict: pass. The v1 text layer has been normalized into v2 with text-only/image-context classification and zero gate blockers.

## Scope

- Subject: 9709 Mathematics
- Generated on: 2026-06-04
- Input artifact: docs/reports/2026-06-04-9709-question-plain-text-v1.json
- JSON artifact: docs/reports/2026-06-04-9709-question-plain-text-v2.json
- Boundary: deterministic local transform from v1 only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation.
- v2 additions: normalized text, math expression candidates, normalized subquestion blocks, marks totals, text-only vs image-context answering mode.

## Aggregate Gate

| metric | value |
| production rows | 3530 |
| v2 rows | 3530 |
| normalized plain text rows | 3530 |
| strict text-only ready rows | 2672 |
| image-context rows with assets | 858/858 |
| diagram rows | 771 |
| table-heavy rows | 150 |
| rows with math expressions | 2069 |
| formula-dense rows with math expressions | 1551/2136 |
| formula-dense rows without math expressions | 585 |
| structured subquestion rows | 172 |
| partial subquestion rows | 3178 |
| unstructured subquestion rows | 62 |
| fallback text-block rows | 118 |
| duplicate storage keys | 0 |
| missing normalized plain text | 0 |
| missing image asset | 0 |
| blockers | 0 |

## Source Split

| source version | rows | normalized text | text-only ready | image context + assets | formula dense + math | formula dense no math | structured | partial | unstructured | fallback |
| v1 | 2937 | 2937 | 2229 | 708/708 | 1505/1569 | 64 | 172 | 2585 | 62 | 118 |
| v2 | 593 | 593 | 443 | 150/150 | 46/567 | 521 | 0 | 593 | 0 | 0 |

## Blockers

- none
