# 9608 / 9618 Computer Science Full Resource Source Report

Date: 2026-06-04

## Scope

This run supplements CIE A Level Computer Science source PDFs for both syllabus generations:

- `9608` Computer Science legacy syllabus
- `9618` Computer Science current syllabus

The resource scope is `2016-2025` visible past-paper resources. It includes question papers, mark schemes, grade thresholds, examiner reports, inserts, pre-release materials, and one visible technical update resource.

Source posture: public mirror candidates from XtraPapers, with targeted BestExamHelp fallbacks where XtraPapers was missing, empty, or pdfjs-invalid. These files have not been independently cross-checked against an authenticated Cambridge School Support Hub source in this run.

## Result

Total promoted PDFs: `619`.

| Syllabus | `qp` | `ms` | `gt` | `er` | `in` | `pre_release` | `other` | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `9608` | 120 | 131 | 10 | 0 | 0 | 78 | 1 | 340 |
| `9618` | 118 | 118 | 9 | 5 | 29 | 0 | 0 | 279 |
| Total | 238 | 249 | 19 | 5 | 29 | 78 | 1 | 619 |

Target roots:

- `data/past-papers`: `238` question-paper PDFs
- `data/supplemental-past-papers`: `381` non-question-paper PDFs

## Target Layout

Question papers were copied into:

- `data/past-papers/9608Computer-Science/paperN/`
- `data/past-papers/9618Computer-Science/paperN/`

Supplemental resources were copied into:

- `data/supplemental-past-papers/9608Computer-Science/`
- `data/supplemental-past-papers/9618Computer-Science/`

Directory conventions:

- Mark schemes: `mark-schemes/paperN/<filename>.pdf`
- Grade thresholds: `grade-thresholds/<filename>.pdf`
- Examiner reports: `examiner-reports/<filename>.pdf`
- Inserts: `inserts/paperN/<filename>.pdf`
- Pre-release materials: `pre-release-materials/paperN/<filename>.pdf`
- Other resources: `other-resources/<filename>.pdf`

PDF filenames were preserved from the source naming convention.

## Fallbacks

Most resources came from XtraPapers. BestExamHelp was used only for targeted gaps:

- `29` files for `9618_s22`, because XtraPapers did not expose the `2022 May/June` `9618` session.
- `1` file for `9618_w25_in_22.pdf`, because XtraPapers returned an empty response.
- `2` files for `9608_w17_pm_43.pdf` and `9608_w17_qp_11.pdf`, because the XtraPapers copies had valid PDF signatures but failed pdfjs parsing.

## Evidence

Machine-readable evidence:

- `docs/reports/2026-06-04-9608-9618-computer-science-2016-2025-full-resource-inventory.json`
- `docs/reports/2026-06-04-9608-9618-computer-science-2016-2025-full-resource-downloads.json`
- `docs/reports/2026-06-04-9608-9618-computer-science-2016-2025-full-resource-promotion.json`

Verification summary:

- Inventory rows: `619`
- Downloaded or cached candidate PDFs: `619`
- Candidate PDF signature checks passed: `619`
- Promoted target PDFs: `619`
- Target PDF pdfjs parse/page-count checks passed: `619`
- Download errors: `0`
- Promotion or parse errors: `0`

## Explicit Non-Actions

This run did not:

- run page-chain extraction;
- run VLM visual review;
- update manifests, DB rows, search indexes, classifier surfaces, or release gates;
- claim authenticated official-source parity beyond the public mirror candidate evidence recorded above.
