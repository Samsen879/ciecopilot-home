# 9709 p1_w_watermarked_001 warning disposition

## Scope

This disposition covers the only page-chain warning in `p1_w_watermarked_001`:

- source PDF: `data/past-papers/9709Mathematics/paper1/WM_9709_w19_qp_12.pdf`
- question: `q06`
- warning: `subpart_mark_count_mismatch`
- payload: `tmp/pdf-page-chain/full-scaleout/p1_w_watermarked_001/outputs/WM_9709_w19_qp_12_page_chain.json`

## Visual Review

Rendered pages reviewed:

- `tmp/pdf-page-chain/full-scaleout/p1_w_watermarked_001/renders/WM_9709_w19_qp_12/WM_9709_w19_qp_12_page_010.png`
- `tmp/pdf-page-chain/full-scaleout/p1_w_watermarked_001/renders/WM_9709_w19_qp_12/WM_9709_w19_qp_12_page_011.png`

The page-chain boundary is accepted. `q06` starts on rendered page `010` and continues onto rendered page `011`. There is no evidence that the question was truncated or merged with another numbered question.

The raw mark/subpart extraction is not accepted for write-back as-is. The page-chain output recorded labels as `["(a)", "(b)", "(i)", "(ii)"]` and marks as `[4, 1, 2]`. The visible structure is:

- `(a)` with `[4]`
- `(b)(i)` with `[1]`
- `(b)(ii)` with `[2]`

## Disposition

- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- diagram_present: `false`
- normalized subpart labels: `["(a)", "(b)(i)", "(b)(ii)"]`
- normalized marks: `[4, 1, 2]`
- write-back posture: allowed only with normalized nested structure, not raw page-chain labels
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review
- visual posture: keep human review required because the source PDF is watermarked

This clears the page-chain warning as a blocker for the shard, but it does not make the shard production-ready. The next step is `p1_w_watermarked_001` shard-bundle generation and downstream evidence review.
