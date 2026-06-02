# 9709 new-paper pre-shard screenshot/crop gate

日期: 2026-06-02

## Verdict

Gate blocked: local render/crop preparation found rows that do not have a strict left-margin printed question header in the source PDF text layer.

This is a `pre-shard screenshot/crop gate`.

- Not production-ready.
- Not VLM-reviewed.
- Not authority/DB/search/release closeout.
- External VLM/API calls: `0`.

## Summary

- input shard manifests: `24`
- PDFs rendered: `72`
- rendered pages: `1144`
- total rows: `610`
- pre-shard crop manifest rows: `610`
- crop rows complete: `593`
- missing crops: `17`
- multi-page rows: `186`
- ambiguous rows: `0`
- blocker rows: `17`
- visual review still required rows: `610`
- pre-shard crop manifest: `data/manifests/9709_new_papers_2026_06_02_pre_shard_crop_manifest_v1.json`

## Per-Shard Counts

| Shard | Rows | Complete | Missing crops | Multi-page | Blockers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `p1_m25_standard_001` | 11 | 11 | 0 | 3 | 0 |
| `p1_s25_standard_001` | 42 | 42 | 0 | 17 | 0 |
| `p1_w24_standard_001` | 32 | 32 | 0 | 8 | 0 |
| `p1_w25_standard_001` | 46 | 42 | 4 | 11 | 4 |
| `p2_m25_standard_001` | 8 | 8 | 0 | 2 | 0 |
| `p2_s25_standard_001` | 28 | 28 | 0 | 13 | 0 |
| `p2_w24_standard_001` | 21 | 21 | 0 | 12 | 0 |
| `p2_w25_standard_001` | 36 | 31 | 5 | 6 | 5 |
| `p3_m25_standard_001` | 11 | 11 | 0 | 4 | 0 |
| `p3_s25_standard_001` | 44 | 44 | 0 | 15 | 0 |
| `p3_w24_standard_001` | 32 | 32 | 0 | 17 | 0 |
| `p3_w25_standard_001` | 44 | 44 | 0 | 15 | 0 |
| `p4_m25_standard_001` | 7 | 7 | 0 | 3 | 0 |
| `p4_s25_standard_001` | 34 | 28 | 6 | 5 | 6 |
| `p4_w24_standard_001` | 22 | 22 | 0 | 6 | 0 |
| `p4_w25_standard_001` | 29 | 28 | 1 | 5 | 1 |
| `p5_m25_standard_001` | 6 | 6 | 0 | 4 | 0 |
| `p5_s25_standard_001` | 26 | 26 | 0 | 6 | 0 |
| `p5_w24_standard_001` | 20 | 20 | 0 | 5 | 0 |
| `p5_w25_standard_001` | 28 | 27 | 1 | 9 | 1 |
| `p6_m25_standard_001` | 6 | 6 | 0 | 2 | 0 |
| `p6_s25_standard_001` | 30 | 30 | 0 | 6 | 0 |
| `p6_w24_standard_001` | 21 | 21 | 0 | 4 | 0 |
| `p6_w25_standard_001` | 26 | 26 | 0 | 8 | 0 |

## Blockers

| Storage key | Source PDF | q | Reason |
| --- | --- | ---: | --- |
| `9709/w25_qp_15/questions/q12.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 12 | `question_header_word_not_found` |
| `9709/w25_qp_15/questions/q13.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 13 | `question_header_word_not_found` |
| `9709/w25_qp_15/questions/q14.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 14 | `question_header_word_not_found` |
| `9709/w25_qp_15/questions/q15.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 15 | `question_header_word_not_found` |
| `9709/w25_qp_22/questions/q08.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 8 | `question_header_word_not_found` |
| `9709/w25_qp_22/questions/q09.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 9 | `question_header_word_not_found` |
| `9709/w25_qp_22/questions/q10.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 10 | `question_header_word_not_found` |
| `9709/w25_qp_22/questions/q11.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 11 | `question_header_word_not_found` |
| `9709/w25_qp_22/questions/q12.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 12 | `question_header_word_not_found` |
| `9709/s25_qp_41/questions/q08.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 8 | `question_header_word_not_found` |
| `9709/s25_qp_41/questions/q09.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 9 | `question_header_word_not_found` |
| `9709/s25_qp_41/questions/q10.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 10 | `question_header_word_not_found` |
| `9709/s25_qp_41/questions/q11.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 11 | `question_header_word_not_found` |
| `9709/s25_qp_41/questions/q12.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 12 | `question_header_word_not_found` |
| `9709/s25_qp_45/questions/q12.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_45.pdf` | 12 | `question_header_word_not_found` |
| `9709/w25_qp_45/questions/q07.png` | `data/past-papers/9709Mathematics/paper4/9709_w25_qp_45.pdf` | 7 | `question_header_word_not_found` |
| `9709/w25_qp_51/questions/q11.png` | `data/past-papers/9709Mathematics/paper5/9709_w25_qp_51.pdf` | 11 | `question_header_word_not_found` |

## Verification

- `.venv/bin/python -m pytest tests/test_build_9709_pre_shard_crop_gate_v1.py -q` - pass (`2 passed`).
- `.venv/bin/python - <<validation script>>` - pass: combined manifest rows `610`, pre-shard crop manifest rows `610`, all referenced crop paths exist, all referenced rendered page paths exist, crop rows complete `593`, blocker rows `17`, missing crops `17`.
- `git diff --check` - pass.
- `npm run workflow:codex-preflight -- --json` - verification gap: package script `workflow:codex-preflight` is not defined on this branch.

## Stop Boundary

Stop here. This artifact only establishes local screenshot/crop preparation status before formal shard production begins. It does not run authority alignment, DB backfill, question analysis, search gate, release preflight, or any external DashScope/Qwen VLM/API call.
