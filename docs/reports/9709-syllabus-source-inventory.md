# 9709 syllabus source inventory and raw snapshot

Issue: #287
Parent tracker: #286

## Locked source

This issue locks a single official Cambridge source for raw extraction:

- Subject: Cambridge International AS & A Level Mathematics `9709`
- Exam years: `2026-2027`
- Syllabus version: `Version 4`, published December 2025
- Official qualification page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/
- Official PDF: https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf
- Accessed date: `2026-04-27`
- SHA-256: `dd0131f3cd8d4e3c270e7936cbb909c15f4cb8053f8337b67c16e8ec0b8bc5e5`
- HTTP `Last-Modified`: `Mon, 22 Dec 2025 10:14:43 GMT`
- HTTP `ETag`: `"20ffd1ca2b73dc1:0"`

The official page also exposes other exam-year ranges and a syllabus-update PDF. Those are recorded in `source_inventory.json` as non-baseline observations. They were not mixed into the raw section baseline.

## Produced artifacts

- `data/syllabus/9709/source_inventory.json`
- `data/syllabus/9709/raw_sections_v1.json`
- `data/syllabus/9709/raw_text_snapshot_v1.txt`

The raw text snapshot preserves page order from the official PDF. The structured raw sections use stable IDs under `cambridge-9709-syllabus-2026-2027-v4` and attach `source_document`, `page_ref`, `section_ref`, and `extraction_confidence` to every section.

## Coverage summary

- Source PDF pages: `62`
- Covered pages: `pp. 1-62`
- Parsed raw section records: `54`
- Ambiguous section records: `39`
- Section records requiring human handling: `40`

Unparsed at row/cell granularity:

- Assessment overview and route/component tables, `pp. 10-17`: retained in section 2 raw text, but not split into canonical table cells.
- MF19 formulae and statistical table rows, `pp. 43-55`: retained page-wise only because mathematical notation and table layout require visual/human comparison before any canonical extraction.

Ambiguous sections are not discarded. They are marked because PDF text extraction can distort mathematical notation, superscripts/subscripts, or two-column table alignment.

## Existing repo file classification

| Path | Classification | Authority posture | Canonical authority | Allowed use |
| --- | --- | --- | --- | --- |
| `data/syllabus/9709syllabus.txt` | `deprecated` | `legacy_non_authoritative` | no | Historical audit or manual comparison only after the official raw source is locked. |
| `data/syllabus/9709_p1_p3_nodes_v1.json` | `legacy_non_authoritative` | `legacy_non_authoritative` | no | P1/P3 comparison input only. |
| `data/curriculum/9709_question_search_recovery_nodes_v1.json` | `candidate_comparison_input` | `candidate_comparison_input` | no | Compare existing runtime seed against locked official raw sections. |
| `data/curriculum/9709_authority_ready_batch_300_nodes_v2.json` | `candidate_comparison_input` | `candidate_comparison_input` | no | Compare batch seed coverage against locked official raw sections. |

No existing repo syllabus or curriculum file is promoted to canonical authority by this issue.

## Guardrails

- No topic rewriting was performed.
- No canonical topic tree was generated.
- No unofficial source was used as a baseline.
- No boundary inference beyond faithful raw extraction was performed.
- Existing runtime seeds remain downstream comparison material until a separate canonicalization issue explicitly reconciles them against this raw source layer.
