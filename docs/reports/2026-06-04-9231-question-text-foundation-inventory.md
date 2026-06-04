# 9231 Question Text Foundation Inventory

- generated_on: `2026-06-04`
- status: `blocked`
- verdict: `foundation blocked-by-missing-row-surface`
- This is not a production-ready claim.
- This does not claim canonical 9231 question text, DB consumption, deployed search consumption, or online RAG ingestion.
- No external VLM/API or OCR rerun is performed by this inventory gate.

## Repo-Truth Conclusion

Conclusion: `blocked-by-missing-row-surface`. Raw source PDFs exist, but row-level production surface evidence must be built before 9231 can enter question_plain_text_v1/v2.

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
| data/manifests JSON files | 204 |
| 9231 subject manifests | 0 |
| 9231 input manifests | 0 |
| 9231 page-chain surface manifests | 0 |
| 9231 authority sidecars | 0 |
| 9231 question rows | 0 |
| duplicate storage keys | 0 |

## OCR And Text Evidence

| metric | value |
| --- | --- |
| evidence bundle files | 0 |
| question_plain_text_v1 artifacts | 0 |
| question_plain_text_v2 artifacts | 0 |
| question_plain_text_v2 consumption artifacts | 0 |
| PDF text layer inspected | true |
| PDF text layer status | parsed |

## Image And Crop Assets

| metric | value |
| --- | --- |
| scanned roots | ["public"] |
| subject image files | 0 |
| surface image asset rows | 0 |
| surface crop asset rows | 0 |

## DB Search RAG Read-Model Paths

| metric | value |
| --- | --- |
| search normalized_plain_text priority schema contract | present |
| read-model normalized_plain_text schema contract | present |
| local 9231 consumption gate artifacts | 0 |
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

- missing_input_manifest: No 9231 input/locator manifest exists under data/manifests.
- missing_page_chain_surface_manifest: No 9231 page-chain surface manifest exists under data/manifests.
- missing_question_row_surface: No 9231 row-level question surface rows can be counted.
- missing_ocr_evidence_bundle: No 9231 row-level evidence-bundle OCR/text artifact exists.
- missing_question_plain_text_v1_artifact: No 9231 question_plain_text_v1 artifact exists.
- missing_question_plain_text_v2_artifact: No 9231 question_plain_text_v2 artifact exists.
- missing_question_plain_text_v2_consumption_gate: No 9231 normalized_plain_text local consumption gate artifact exists.
- missing_manifest_backed_image_or_crop_assets: No manifest-backed 9231 image/crop asset surface exists.

## Next Executable Gates

- Build deterministic 9231 source/locator input manifests from data/past-papers/9231Further-Mathematics.
- Build and verify 9231 page-chain surface manifests with stable storage_key rows.
- Generate local deterministic page render/crop assets for each row and count missing crops.
- Attach OCR/text evidence bundles without external VLM/API calls unless scope is explicitly expanded.
- Only after row/evidence coverage exists, run 9231 question_plain_text_v1/v2 and normalized_plain_text consumption gates.

## Workflow Gaps

- npm run workflow:codex-preflight -- --json is missing from package.json in this repo snapshot; recorded as workflow gap, not a content blocker.

## Verification Inputs

- `git status --short --branch`
- `npm run workflow:codex-preflight -- --json`
- `data/past-papers/9231Further-Mathematics`
- `data/mark-schemes/9231Further-Mathematics`
- `data/manifests`
- `docs/reports/2026-06-02-9231-9702-new-paper-source-promotion.json`
- `supabase/migrations/20260415152950_create_learning_question_search_projection.sql`
- `supabase/migrations/20260413110000_phase_a_question_classified_events.sql`
