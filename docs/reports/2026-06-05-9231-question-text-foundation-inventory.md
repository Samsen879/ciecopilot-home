# 9231 Question Text Foundation Inventory

- generated_on: `2026-06-05`
- status: `inventory_ready`
- verdict: `foundation row-surface-present-partial-text-consumption`
- This is not a production-ready claim.
- This does not claim canonical 9231 question text, DB consumption, deployed search consumption, or online RAG ingestion.
- No external VLM/API or OCR rerun is performed by this inventory gate.

## Repo-Truth Conclusion

Conclusion: `row-surface-present-partial-text-consumption`. Deterministic local row-level locator surfaces exist; crop/image assets are partial: `1527/1593` current rows have manifest-backed crop references; question_plain_text_v2 covers `1443/1593` unique current rows and local normalized_plain_text consumption covers `1443/1593` unique current rows.

## Raw PDF Source Coverage

| metric | value |
| --- | --- |
| question paper root | data/past-papers/9231Further-Mathematics |
| question paper PDFs | 200 |
| question papers by paper | {"p1":62,"p2":62,"p3":38,"p4":38} |
| mark scheme root | data/mark-schemes/9231Further-Mathematics |
| mark scheme PDFs | 156 |
| mark schemes by paper | {"p1":51,"p2":51,"p3":27,"p4":27} |
| grade threshold PDFs | 7 |
| latest promoted 9231 QPs | 44 |
| latest verified 9231 QPs | 44 |

## Row-Level Surface

| metric | value |
| --- | --- |
| data/manifests JSON files | 355 |
| 9231 subject manifests | 151 |
| 9231 input manifests | 68 |
| 9231 page-chain surface manifests | 68 |
| 9231 source-locator surface manifests | 4 |
| 9231 shard-split surface manifests | 64 |
| 9231 current surface family | shard_split |
| 9231 authority sidecars | 0 |
| 9231 question rows | 1593 |
| duplicate storage keys | 0 |

## OCR And Text Evidence

| metric | value |
| --- | --- |
| evidence bundle files | 0 |
| question_plain_text_v1 artifacts | 5 |
| question_plain_text_v1 max rows | 477 |
| question_plain_text_v1 aggregate unique rows | 1443 |
| question_plain_text_v2 artifacts | 5 |
| question_plain_text_v2 max rows | 477 |
| question_plain_text_v2 aggregate unique rows | 1443 |
| question_plain_text_v2 consumption artifacts | 5 |
| question_plain_text_v2 consumption max rows | 477 |
| question_plain_text_v2 consumption aggregate unique rows | 1443 |
| PDF text layer inspected | false |
| PDF text layer status | not_inspected |

## Image And Crop Assets

| metric | value |
| --- | --- |
| scanned roots | ["outputs","tmp","data/crops","public"] |
| subject image files | 7243 |
| surface image asset rows | 1527 |
| surface crop asset rows | 1527 |
| surface rows missing crop assets | 66 |

## DB Search RAG Read-Model Paths

| metric | value |
| --- | --- |
| search normalized_plain_text priority schema contract | present |
| read-model normalized_plain_text schema contract | present |
| local 9231 consumption gate artifacts | 5 |
| DB consumed claimed | false |
| search consumed claimed | false |
| read-model consumed claimed | false |
| RAG consumed claimed | false |

## RAG Seed Or Eval Artifacts

| metric | value |
| --- | --- |
| eval sample files | 2 |
| production evidence files mentioning 9231 | 3 |
| foundation equivalent | false |

## Blockers

- partial_question_plain_text_v2_coverage: 9231 question_plain_text_v2 exists but does not yet cover all current shard-split rows.
- partial_question_plain_text_v2_consumption_coverage: 9231 local normalized_plain_text consumption gate exists but does not yet cover all current shard-split rows.

## Next Executable Gates

- Continue shard waves until question_plain_text_v2 covers every current 9231 shard-split row.
- Continue shard waves until local normalized_plain_text consumption covers every current 9231 shard-split row.

## Workflow Gaps

- none

## Verification Inputs

- `git status --short --branch`
- `npm run workflow:codex-preflight -- --json`
- `data/past-papers/9231Further-Mathematics`
- `data/mark-schemes/9231Further-Mathematics`
- `data/manifests`
- `docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json`
- `supabase/migrations/20260415152950_create_learning_question_search_projection.sql`
- `supabase/migrations/20260413110000_phase_a_question_classified_events.sql`
