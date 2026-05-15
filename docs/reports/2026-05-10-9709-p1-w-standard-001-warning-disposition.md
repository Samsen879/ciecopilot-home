# 9709 p1_w_standard_001 warning disposition

## Scope

This disposition covers the remaining page-chain warnings in `p1_w_standard_001`:

- `data/past-papers/9709Mathematics/paper1/9709_w18_qp_11.pdf`, q11, `subpart_mark_count_mismatch`
- `data/past-papers/9709Mathematics/paper1/9709_w21_qp_11.pdf`, q05, `subpart_mark_count_mismatch`
- `data/past-papers/9709Mathematics/paper1/9709_w23_qp_11.pdf`, q02, `subpart_mark_count_mismatch`

## Visual Review

Rendered pages reviewed:

- `tmp/pdf-page-chain/full-scaleout/p1_w_standard_001/renders/9709_w18_qp_11/9709_w18_qp_11_page_018.png`
- `tmp/pdf-page-chain/full-scaleout/p1_w_standard_001/renders/9709_w18_qp_11/9709_w18_qp_11_page_019.png`
- `tmp/pdf-page-chain/full-scaleout/p1_w_standard_001/renders/9709_w21_qp_11/9709_w21_qp_11_page_007.png`
- `tmp/pdf-page-chain/full-scaleout/p1_w_standard_001/renders/9709_w23_qp_11/9709_w23_qp_11_page_004.png`

The page-chain boundaries are accepted for all three questions. None of the reviewed questions is truncated or merged with another numbered question.

The raw mark/subpart extraction is not accepted for write-back as-is:

- q11 in `9709_w18_qp_11.pdf` records labels `["(a)", "(i)", "(ii)", "(b)"]` and marks `[1, 3, 2, 4]`, but the rendered pages show the normalized mark-bearing structure `(a)(i)`, `(a)(ii)`, `(b)(i)`, `(b)(ii)`.
- q05 in `9709_w21_qp_11.pdf` records labels `["(a)", "(b)"]` and marks `[3, 1, 1]`, but part `(b)` contains two roman subparts with one mark each.
- q02 in `9709_w23_qp_11.pdf` records labels `["A", "B", "C"]` and marks `[4]`, but A/B/C are multiple-choice answer statements, not mark-bearing subparts.

## Disposition

- disposition: `accepted_with_normalized_structure`
- blockers: `0`
- write-back posture: allowed only with normalized structure, not raw page-chain labels
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review

This clears the page-chain warnings as blockers for the shard, but it does not make the shard production-ready. The next step is `p1_w_standard_001` screenshot/evidence bundle generation, followed by post-extraction review before any analysis backfill or gate.
