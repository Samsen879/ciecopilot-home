# 9709 p1_s_watermarked_001 warning disposition

## Scope

This disposition covers the only page-chain warning in `p1_s_watermarked_001`:

- source PDF: `data/past-papers/9709Mathematics/paper1/WM_9709_s20_qp_11.pdf`
- question: `q06`
- warning: `subpart_mark_count_mismatch`
- payload: `tmp/pdf-page-chain/full-scaleout/p1_s_watermarked_001/outputs/WM_9709_s20_qp_11_page_chain.json`

## Visual review

Rendered page reviewed:

- `tmp/pdf-page-chain/full-scaleout/p1_s_watermarked_001/renders/WM_9709_s20_qp_11/WM_9709_s20_qp_11_page_007.png`

The page-chain boundary is accepted. `q06` is fully contained on rendered page `007`. There is no evidence that the question was truncated or merged with another numbered question.

The raw mark/subpart extraction is not accepted for write-back as-is. The page-chain output recorded labels as `["(a)", "(b)"]` and marks as `[4, 2, 2]`, but the rendered page shows only:

- `(a)` with `[4]`
- `(b)` with `[2]`

## Disposition

- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- diagram_present: `false`
- normalized subpart labels: `["(a)", "(b)"]`
- normalized marks: `[4, 2]`
- write-back posture: allowed only with normalized structure, not raw page-chain marks
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review
- visual posture: keep human review required because the source PDF is watermarked

This clears the page-chain warning as a blocker for the shard, but it does not make the shard production-ready. The next step is `p1_s_watermarked_001` screenshot/evidence bundle generation, followed by post-extraction review before any analysis backfill or gate.
