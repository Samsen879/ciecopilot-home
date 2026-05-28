# 9709 p3_s_watermarked_001 warning disposition

日期: 2026-05-16

## Scope

- shard id: `p3_s_watermarked_001`
- payload: `tmp/pdf-page-chain/full-scaleout/p3_s_watermarked_001/outputs/WM_9709_s20_qp_31_page_chain.json`
- warning: `subpart_mark_count_mismatch`
- affected item: `9709/s20_qp_31/questions/q10.png`

## Visual Review

Reviewed rendered pages:

- `tmp/pdf-page-chain/full-scaleout/p3_s_watermarked_001/renders/WM_9709_s20_qp_31/WM_9709_s20_qp_31_page_016.png`
- `tmp/pdf-page-chain/full-scaleout/p3_s_watermarked_001/renders/WM_9709_s20_qp_31/WM_9709_s20_qp_31_page_017.png`

The visible paper shows q10(a)(i) `[3]`, q10(a)(ii) `[3]`, q10(b)(i) `[4]`, and q10(b)(ii) `[2]`. The raw page-chain labels collapsed repeated nested roman labels into a flat distinct-label list.

## Disposition

- blocker: `false`
- disposition: `accepted_with_normalized_structure`
- normalized labels: `(a)(i)`, `(a)(ii)`, `(b)(i)`, `(b)(ii)`
- normalized marks: `3`, `3`, `4`, `2`
- write-back allowed without normalization: `false`

This disposition accepts the page-chain boundary while requiring normalized nested subpart labels before downstream bundle and write-back usage.
