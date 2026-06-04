# 9231 Question Shard Split Gate

- generated_on: `2026-06-04`
- gate_status: `shard_split_ready_pending_crop_render_text_gates`
- This is not production-ready and does not claim canonical question text.
- No external VLM/API or OCR rerun was used.
- DB/search/RAG consumption claimed: false.

## Repo-Truth Conclusion

Conclusion: 9231 row foundation has been split into 9709-style paper/session-year shard manifests, pending local crop/render, OCR/text evidence, v1/v2 text, and normalized_plain_text consumption gates.

## Gate Counts

| metric | value |
| --- | --- |
| source row count | 1593 |
| shard count | 64 |
| input manifests | 64 |
| page-chain surface manifests | 64 |
| question row count | 1593 |
| text-only ready rows | 0 |
| image-context required rows | 1593 |
| blockers | 0 |
| DB/search/RAG consumption claimed | false |

## Paper Split

| paper | shards | question rows |
| --- | --- | --- |
| p1 | 20 | 532 |
| p2 | 20 | 566 |
| p3 | 12 | 264 |
| p4 | 12 | 231 |

## Artifacts

| artifact | path | rows |
| --- | --- | --- |
| combined manifest | data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json | 1593 |
| input manifests | 64 files | 1593 |
| page-chain surface manifests | 64 files | 1593 |
| report json | docs/reports/2026-06-04-9231-question-shard-split-gate.json | n/a |
| report markdown | docs/reports/2026-06-04-9231-question-shard-split-gate.md | n/a |

## Blockers

- none

## Next Executable Gates

- Choose one shard, for example `9231_p1_s25_standard_001`, and run local render/crop validation against only that shard.
- Attach row-level OCR/text evidence for that shard without external VLM/API unless scope is explicitly expanded.
- Build shard-scoped question_plain_text_v1/v2 after crop/text evidence exists.
- Run shard-scoped normalized_plain_text consumption gate before claiming search/read-model/RAG consumption.

## Verification Inputs

- `git status --short --branch`
- `npm run workflow:codex-preflight -- --json`
- `data/manifests/9231_p{1..4}_source_locator_001_page_chain_surface_v1.json`
- `data/manifests/9231_p{1..4}_{sessionYear}_standard_001_input_v1.json`
- `data/manifests/9231_p{1..4}_{sessionYear}_standard_001_page_chain_surface_v1.json`

## Workflow Gaps

- package.json missing workflow:codex-preflight script; recorded as workflow gap, not content blocker
