# 9709 p1_s_standard_001 warning disposition

## Scope

This disposition covers the only page-chain warning in `p1_s_standard_001`:

- source PDF: `data/past-papers/9709Mathematics/paper1/9709_s18_qp_13.pdf`
- question: `q07`
- warning: `subpart_mark_count_mismatch`
- payload: `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/outputs/9709_s18_qp_13_page_chain.json`

## Visual review

Rendered pages reviewed:

- `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/renders/9709_s18_qp_13/9709_s18_qp_13_page_010.png`
- `tmp/pdf-page-chain/full-scaleout/p1_s_standard_001/renders/9709_s18_qp_13/9709_s18_qp_13_page_011.png`

The page-chain boundary is accepted. `q07` starts on rendered page `010` and continues to rendered page `011`. There is no evidence that the question was truncated or merged with another numbered question.

The raw mark/subpart extraction is not accepted for write-back as-is. The page-chain output recorded labels as `["(a)", "(i)", "(ii)"]` and marks as `[3, 2, 2, 2]`, which under-represents the nested structure across parts `(a)` and `(b)`.

## Disposition

- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- diagram_present: `true`
- normalized subpart labels: `["(a)(i)", "(a)(ii)", "(b)(i)", "(b)(ii)"]`
- normalized marks: `[3, 2, 2, 2]`
- write-back posture: allowed only with normalized structure, not raw page-chain labels
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review
- visual posture: keep human review required because part `(b)` is diagram-backed and on the second rendered page

This clears the page-chain warning as a blocker for the shard, but it does not make the shard production-ready. The next step is `p1_s_standard_001` screenshot/evidence bundle generation, followed by post-extraction review before any analysis backfill or gate.
