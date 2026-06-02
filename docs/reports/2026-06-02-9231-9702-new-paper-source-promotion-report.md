# 9231 and 9702 new-paper source promotion report

日期: 2026-06-02

## Verdict

The `9231` Further Mathematics and `9702` Physics new-paper candidate PDFs have been copied into the repo source tree under `data/past-papers/`.

- promoted source PDFs: `90/90`
- `9231`: `44` PDFs
- `9702`: `46` PDFs
- SHA256 verified against the candidate download evidence: `90/90`
- pdfjs parse verified after repo-source write: `90/90`
- page-count verified against the candidate download evidence: `90/90`
- errors: `0`

Source posture remains unchanged from the candidate download step: these files are public mirror candidates. This step promotes them into local repo source paths for the user's requested gap fill, but it does not assert independent official School Support Hub cross-check.

## Inputs

- Gap inventory: `docs/reports/2026-06-02-9231-9702-new-paper-source-gap-inventory.md`
- Candidate download report: `docs/reports/2026-06-02-9231-9702-new-paper-source-candidate-download-report.md`
- Candidate download machine evidence: `docs/reports/2026-06-02-9231-9702-new-paper-source-candidate-downloads.json`
- Promotion machine evidence: `docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json`

## Promoted Counts

| Subject | Session | PDFs | Repo source root |
| --- | --- | ---: | --- |
| `9231` | `w24` | 12 | `data/past-papers/9231Further-Mathematics/` |
| `9231` | `s25` | 16 | `data/past-papers/9231Further-Mathematics/` |
| `9231` | `w25` | 16 | `data/past-papers/9231Further-Mathematics/` |
| `9702` | `s25` | 23 | `data/past-papers/9702Physics/` |
| `9702` | `w25` | 23 | `data/past-papers/9702Physics/` |

## Write Rule

Files were copied from the ignored candidate download roots into the intended repo source paths already recorded in the candidate evidence:

- `tmp/9231_source_candidates/2026-06-02/*.pdf` -> `data/past-papers/9231Further-Mathematics/paper*/`
- `tmp/9702_source_candidates/2026-06-02/*.pdf` -> `data/past-papers/9702Physics/paper*/`

Canonical filenames were preserved exactly as `<subject>_<session>_qp_<component>.pdf`.

## Verification

Pre-copy checks:

- every candidate file existed at the recorded `local_candidate_path`
- every candidate SHA256 matched the recorded `sha256`
- no intended repo source target existed before the copy

Post-copy checks:

- every target file existed at the recorded `intended_repo_source_path`
- every target SHA256 matched the candidate SHA256
- every target byte count matched the candidate byte count
- every target had a `%PDF-` header
- every target parsed with `pdfjs-dist`
- every target page count matched the candidate page count

## Explicit Non-Steps

This step did not run manifest generation, DB import, page-chain extraction, VLM/OCR, search gate, release preflight, or production-ready status updates.
