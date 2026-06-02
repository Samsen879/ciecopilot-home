# 9709 new-paper source gap inventory

日期: 2026-06-02

## Verdict

当前 repo 的 `9709` production-ready 口径已覆盖现有 surface-manifest inventory，但最新 paper source 还没有入库。

只读缺口结论:

- current repo source PDFs: `360` question paper PDFs under `data/past-papers/9709Mathematics/`.
- current surface manifest paper ids: `360` paper ids across `36` surface manifests.
- current aggregate gate: `pass`, `production-ready`, `2937` current surface rows.
- repo source/manifest coverage currently reaches `2024 May/June`; it does not contain `2024 Oct/Nov` or any `2025` question paper PDFs.
- candidate new-paper gap from public mirror indexes: `72` question paper PDFs.

This report is read-only. It does not download files, write source PDFs, modify manifests, run page-chain extraction, call external VLM/API, backfill DB rows, or update production-ready status.

## Evidence Sources

Repo truth:

- source root: `data/past-papers/9709Mathematics/`
- manifest root: `data/manifests/9709_p*_page_chain_surface_v1.json`
- aggregate gate: `docs/reports/2026-06-02-9709-full-production-ready-aggregate-gate.json`
- aggregate closeout: `docs/reports/2026-06-02-9709-full-production-ready-closeout.md`

External visibility check:

- Cambridge official public page says it exposes only a selection of papers and points registered schools to School Support Hub for wider resources: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/past-papers/
- Cambridge official public page currently lists only selected June 2024 papers: `11`, `21`, `31`, `41`, `51`, `61`.
- PapaCambridge viewer/index shows `2024 Oct/Nov` `9709_w24_qp_*` question papers as public mirror candidates: https://pastpapers.papacambridge.com/viewer/caie/as-and-a-level-mathematics-9709-mathematics-97092024-oct-nov-9709-w24-qp-11-pdf
- XtraPapers index shows `2025 March` `9709_m25_qp_*` candidates: https://xtrapapers.co/papers/caie/as-and-a-level/mathematics-9709/2025-march
- XtraPapers index shows `2025 May/June` `9709_s25_qp_*` candidates: https://xtrapapers.co/papers/caie/as-and-a-level/mathematics-9709/2025-may-june
- XtraPapers index shows `2025 Oct/Nov` `9709_w25_qp_*` candidates: https://xtrapapers.co/papers/caie/as-and-a-level/mathematics-9709/2025-oct-nov

Important source posture:

- Cambridge official public page is not a full latest-paper source. It is only a public selection.
- Public mirror entries are candidate source evidence only. They still need download, SHA256, PDF identity, render sanity, and cross-source validation before any repo source write.
- 2025 May/June and 2025 Oct/Nov include variant `5` components (`15`, `25`, `35`, `45`, `55`, `65`) in the public mirror index. Treat these as new candidate variants, not as typos or duplicates of variants `1/2/3`.

## Current Repo Coverage

| Year | Repo source QP PDFs | Surface manifest paper ids | Status |
| --- | ---: | ---: | --- |
| `2016` | 42 | 42 | complete in current inventory |
| `2017` | 42 | 42 | complete in current inventory |
| `2018` | 42 | 42 | complete in current inventory |
| `2019` | 42 | 42 | complete in current inventory |
| `2020` | 42 | 42 | complete in current inventory |
| `2021` | 42 | 42 | complete in current inventory |
| `2022` | 42 | 42 | complete in current inventory |
| `2023` | 42 | 42 | complete in current inventory |
| `2024` | 24 | 24 | missing `2024 Oct/Nov` candidate set |
| `2025` | 0 | 0 | missing all candidate sets found below |

Current 2024 repo coverage is `m24` plus `s24`. There are no local `9709_w24_qp_*.pdf`, `9709_m25_qp_*.pdf`, `9709_s25_qp_*.pdf`, or `9709_w25_qp_*.pdf` source files in the checked inventory.

## Candidate Gap Summary

| Candidate session | Candidate QP PDFs | Repo source present | Surface manifest present | Gap status |
| --- | ---: | ---: | ---: | --- |
| `2024 Oct/Nov` (`w24`) | 18 | 0 | 0 | acquire candidates |
| `2025 March` (`m25`) | 6 | 0 | 0 | acquire candidates |
| `2025 May/June` (`s25`) | 24 | 0 | 0 | acquire candidates; includes variant `5` |
| `2025 Oct/Nov` (`w25`) | 24 | 0 | 0 | acquire candidates; includes variant `5` |
| total | 72 | 0 | 0 | not in production-ready inventory |

## Missing Candidate Paper IDs

### `2024 Oct/Nov` (`w24`), 18 PDFs

- `9709_w24_qp_11.pdf`
- `9709_w24_qp_12.pdf`
- `9709_w24_qp_13.pdf`
- `9709_w24_qp_21.pdf`
- `9709_w24_qp_22.pdf`
- `9709_w24_qp_23.pdf`
- `9709_w24_qp_31.pdf`
- `9709_w24_qp_32.pdf`
- `9709_w24_qp_33.pdf`
- `9709_w24_qp_41.pdf`
- `9709_w24_qp_42.pdf`
- `9709_w24_qp_43.pdf`
- `9709_w24_qp_51.pdf`
- `9709_w24_qp_52.pdf`
- `9709_w24_qp_53.pdf`
- `9709_w24_qp_61.pdf`
- `9709_w24_qp_62.pdf`
- `9709_w24_qp_63.pdf`

### `2025 March` (`m25`), 6 PDFs

- `9709_m25_qp_12.pdf`
- `9709_m25_qp_22.pdf`
- `9709_m25_qp_32.pdf`
- `9709_m25_qp_42.pdf`
- `9709_m25_qp_52.pdf`
- `9709_m25_qp_62.pdf`

### `2025 May/June` (`s25`), 24 PDFs

- `9709_s25_qp_11.pdf`
- `9709_s25_qp_12.pdf`
- `9709_s25_qp_13.pdf`
- `9709_s25_qp_15.pdf`
- `9709_s25_qp_21.pdf`
- `9709_s25_qp_22.pdf`
- `9709_s25_qp_23.pdf`
- `9709_s25_qp_25.pdf`
- `9709_s25_qp_31.pdf`
- `9709_s25_qp_32.pdf`
- `9709_s25_qp_33.pdf`
- `9709_s25_qp_35.pdf`
- `9709_s25_qp_41.pdf`
- `9709_s25_qp_42.pdf`
- `9709_s25_qp_43.pdf`
- `9709_s25_qp_45.pdf`
- `9709_s25_qp_51.pdf`
- `9709_s25_qp_52.pdf`
- `9709_s25_qp_53.pdf`
- `9709_s25_qp_55.pdf`
- `9709_s25_qp_61.pdf`
- `9709_s25_qp_62.pdf`
- `9709_s25_qp_63.pdf`
- `9709_s25_qp_65.pdf`

### `2025 Oct/Nov` (`w25`), 24 PDFs

- `9709_w25_qp_11.pdf`
- `9709_w25_qp_12.pdf`
- `9709_w25_qp_13.pdf`
- `9709_w25_qp_15.pdf`
- `9709_w25_qp_21.pdf`
- `9709_w25_qp_22.pdf`
- `9709_w25_qp_23.pdf`
- `9709_w25_qp_25.pdf`
- `9709_w25_qp_31.pdf`
- `9709_w25_qp_32.pdf`
- `9709_w25_qp_33.pdf`
- `9709_w25_qp_35.pdf`
- `9709_w25_qp_41.pdf`
- `9709_w25_qp_42.pdf`
- `9709_w25_qp_43.pdf`
- `9709_w25_qp_45.pdf`
- `9709_w25_qp_51.pdf`
- `9709_w25_qp_52.pdf`
- `9709_w25_qp_53.pdf`
- `9709_w25_qp_55.pdf`
- `9709_w25_qp_61.pdf`
- `9709_w25_qp_62.pdf`
- `9709_w25_qp_63.pdf`
- `9709_w25_qp_65.pdf`

## Not Counted Yet

`2026` papers are not included in this actionable gap count. On 2026-06-02, current 2026 exam discussion/leak/cancellation material is not a stable source inventory for ingestion. Add 2026 only after an official public listing, School Support Hub/user-supplied official export, or stable post-results mirror index exists and passes the same candidate verification contract.

## Next Step

Proceed to candidate acquisition only after operator approval:

1. Download candidate PDFs into `tmp/9709_source_candidates/YYYY-MM-DD/` without writing repo source paths.
2. Record URL, bytes, SHA256, PDF version/page count, first-page identity, and render sanity for every candidate.
3. Cross-check at least one independent mirror or official/user-supplied source where available.
4. Stop again before source write, manifest creation, or external VLM/page-chain execution.
