# 9609 Business Full Resource Source Report

Date: 2026-06-04

## Scope

This run supplements CIE A Level Business source PDFs for `9609`.

The resource scope is `2016-2025` visible past-paper resources from XtraPapers. It includes examiner reports, grade thresholds, inserts, mark schemes, question papers.

Source posture: public mirror candidates from XtraPapers. BestExamHelp is used only as a fallback for candidates that fail download or PDF signature checks. These files have not been independently cross-checked against an authenticated Cambridge School Support Hub source in this run.

## Result

Total promoted PDFs: `577`.

| Type | Count |
| --- | ---: |
| `er` | 23 |
| `gt` | 29 |
| `in` | 57 |
| `ms` | 234 |
| `qp` | 234 |
| Total | 577 |

Target roots:

- `data/past-papers/9609Business`: `234` question-paper PDFs
- `data/supplemental-past-papers/9609Business`: `343` supplemental PDFs

## Target Layout

Question papers were copied into:

- `data/past-papers/9609Business/paperN/`

Supplemental resources were copied into:

- `data/supplemental-past-papers/9609Business/`

Directory conventions:

- Mark schemes: `mark-schemes/paperN/<filename>.pdf`
- Confidential instructions: `confidential-instructions/paperN/<filename>.pdf`
- Grade thresholds: `grade-thresholds/<filename>.pdf`
- Examiner reports: `examiner-reports/<filename>.pdf`
- Inserts or insert-style resources: `inserts/paperN/<filename>.pdf`
- Pre-release materials: `pre-release-materials/paperN/<filename>.pdf`
- Other support files, if discovered: `supporting-materials/<type>/...`

PDF filenames were preserved from the source naming convention.

## Evidence

Machine-readable evidence:

- `docs/reports/2026-06-04-9609-business-2016-2025-full-resource-inventory.json`
- `docs/reports/2026-06-04-9609-business-2016-2025-full-resource-downloads.json`
- `docs/reports/2026-06-04-9609-business-2016-2025-full-resource-promotion.json`

Verification summary:

- Inventory rows: `577`
- Downloaded or cached candidate PDFs: `577`
- Candidate PDF signature checks passed: `577`
- Fallback downloads: `0`
- Promoted target PDFs: `577`
- Target PDF pdfjs parse/page-count checks passed: `577`
- Download errors after retry: `0`
- Promotion or parse errors: `0`

## Explicit Non-Actions

This run did not:

- run page-chain extraction;
- run VLM visual review;
- update manifests, DB rows, search indexes, classifier surfaces, or release gates;
- claim authenticated official-source parity beyond the public mirror candidate evidence recorded above.
