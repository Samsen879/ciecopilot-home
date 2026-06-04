# 9709 Question Plain Text v2 Consumption Gate

- status: `pass`
- generated_on: `2026-06-04`
- source artifact: `docs/reports/2026-06-04-9709-question-plain-text-v2.json`
- rows read: `3530`
- This is a local deterministic consumption gate.
- It does not claim live DB, deployed search, or online RAG ingestion has already run.
- It does not rerun OCR/VLM and does not call external APIs.

## Gate Summary

| metric | value |
| --- | --- |
| rows read | 3530 |
| normalized_plain_text rows | 3530 |
| text-only ready rows | 2672 |
| image-context required rows | 858 |
| image-context rows with assets | 858 |
| search rows using normalized_plain_text | 3530 |
| read-model rows using normalized_plain_text | 3530 |
| RAG rows using normalized_plain_text | 3530 |
| legacy search_text-only rows | 0 |

## Consumption Contract

- search uses `question_plain_text_v2.normalized_plain_text` as `search_text`.
- read-model rows use `normalized_plain_text` as `prompt_representation.value` and provenance `search_text`.
- RAG candidate rows use `normalized_plain_text` as chunk `content` with source_type `question_plain_text_v2`.
- `text_only_ready` rows are separable from `image_context_required` rows.

## Blockers

- none

## Workflow Gaps

- `npm run workflow:codex-preflight -- --json` is missing from package.json in this repo snapshot; recorded as workflow gap, not a content blocker.
