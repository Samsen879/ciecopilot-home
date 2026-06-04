# 9709 question plain text v1 coverage

Verdict: pass. All production surface rows have canonical plain text; diagram/layout-dependent rows retain image asset references.

## Scope

- Subject: 9709 Mathematics
- Generated on: 2026-06-04
- JSON artifact: docs/reports/2026-06-04-9709-question-plain-text-v1.json
- Boundary: local canonical text export only; no OCR rerun, no external VLM/API call, no DB write, no RAG/search mutation.
- Text priority: `surface.visual_disposition.question_text`, then selected `evidence.ocr_text`.
- Diagram/layout-dependent questions keep `image_assets`; no-diagram questions are text-addressable and still retain provenance paths.

## Aggregate Gate

| metric | value |
| surface manifest files | 60 |
| evidence bundle files | 133 |
| production rows | 3530 |
| plain text rows | 3530 |
| no-diagram rows with plain text | 2759/2759 |
| diagram rows with text + image asset | 771/771 |
| layout-dependent rows with image asset | 858/858 |
| duplicate storage keys | 0 |
| missing evidence bundle | 0 |
| missing plain text | 0 |
| missing image asset | 0 |
| blockers | 0 |

## Source Split

| source version | surface manifests | rows | plain text | no diagram text | diagram text + image | missing evidence | missing text |
| v1 | 36 | 2937 | 2937 | 2287/2287 | 650/650 | 0 | 0 |
| v2 | 24 | 593 | 593 | 472/472 | 121/121 | 0 | 0 |

## Blockers

- none
