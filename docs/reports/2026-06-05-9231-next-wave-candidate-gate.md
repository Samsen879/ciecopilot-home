# 9231 Next-Wave Candidate Gate

- generated_on: `2026-06-05`
- gate_status: `candidate_inventory_ready`
- verdict: `no_next_wave_candidates_available`
- production_ready_claimed: `false`
- This is a candidate inventory only: not question_plain_text_v1/v2, not a visual review gate, and not a DB/search/RAG consumption gate.
- External VLM/API calls: 0. External OCR reruns: 0.

## Criteria

| # | gate | posture |
| ---: | --- | --- |
| 1 | clean source | `WM_` and `frozen_pending_source_remediation` rows excluded |
| 2 | crop/render complete | local crop, review crop, and render files must exist |
| 3 | not covered | visual/text/consumption-covered rows excluded by `storage_key` |
| 4 | complete shards | candidates ranked by completion ratio then candidate row count |
| 5 | source/basic validation | source PDF existence/header/page-count and optional pdfjs parse; duplicate `storage_key` rows blocked |

## Counts

| metric | value |
| --- | ---: |
| surface manifests scanned | 64 |
| scanned rows | 1593 |
| crop-ready rows | 1002 |
| crop/render incomplete rows | 591 |
| already covered rows | 918 |
| WM/frozen rows | 150 |
| duplicate storage-key rows | 0 |
| candidate rows | 0 |
| candidate shards | 0 |
| recommended shards | 0 |
| candidate source PDFs | 0 |
| source PDF parse inspected | true |
| candidate source PDFs pdfjs parse OK | 0 |
| candidate rows with source PDF parse OK | 0 |
| blockers | 0 |

## Recommended Shards

| shard | candidate rows | total rows | completion | source PDFs |
| --- | ---: | ---: | ---: | ---: |
| none | 0 | 0 | 0 | 0 |

## Blockers

| check | count | detail |
| --- | ---: | --- |
| none | 0 |  |

## Artifacts

- candidate manifest: `data/manifests/9231_next_wave_candidates_2026_06_05_manifest_v1.json`
- JSON report: `docs/reports/2026-06-05-9231-next-wave-candidate-gate.json`

## Coverage Inputs

- `docs/reports/2026-06-05-9231-visual-review-wave1-gate.json`
- `docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.json`
- `docs/reports/2026-06-05-9231-question-plain-text-v2.json`
- `docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json`
