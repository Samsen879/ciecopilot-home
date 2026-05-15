# 9709 p3_w_standard_001 warning disposition

## Scope

This disposition covers the remaining page-chain warning in `p3_w_standard_001` after targeted rerun:

- source PDF: `data/past-papers/9709Mathematics/paper3/9709_w16_qp_33.pdf`
- question: `q07`
- warning: `subpart_mark_count_mismatch`
- payload: `tmp/pdf-page-chain/full-scaleout/p3_w_standard_001/outputs/9709_w16_qp_33_page_chain.json`

## Visual Review

Rendered page reviewed:

- `tmp/pdf-page-chain/full-scaleout/p3_w_standard_001/renders/9709_w16_qp_33/9709_w16_qp_33_page_003.png`

The page-chain boundary is accepted. `q07` is wholly present on rendered page `003`. It is not truncated and is not merged with another numbered question.

The raw mark/subpart extraction is not accepted for write-back as-is. The page-chain output recorded labels as `["(i)", "(ii)", "(a)", "(b)", "(iii)"]` and marks as `[2, 4, 3]`. The visual paper layout shows that `(ii)(a)` and `(ii)(b)` share the single `[4]` allocation for part `(ii)`.

## Disposition

- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- diagram_present: `false`
- normalized subpart labels: `["(i)", "(ii)(a)/(ii)(b)", "(iii)"]`
- normalized marks: `[2, 4, 3]`
- write-back posture: allowed only with normalized structure, not raw page-chain labels
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review

This clears the page-chain warning as a blocker for the shard, but it does not make the shard production-ready. The next step is `p3_w_standard_001` screenshot/evidence bundle generation, followed by post-extraction review before any analysis backfill or gate.
