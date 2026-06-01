# 9709 p6_w_watermarked_001 warning disposition

status: `accepted`

Scope:

- page-chain final report: `3/3` PDFs passed, `0` blockers
- extracted rows: `21/21`
- warning PDFs: `1`
- warning rows dispositioned: `2`
- warning type: `subpart_mark_count_mismatch`

Disposition:

- `WM_9709_w19_qp_63` q05 is accepted with normalized labels `(i)`, `(ii)`, `(iii)`, `(iv)` and marks `[2, 1, 2, 4]`.
- `WM_9709_w19_qp_63` q07 is accepted with normalized labels `(i)(a)`, `(i)(b)`, `(ii)` and marks `[3, 2, 5]`.
- The source PDFs are watermarked, but these warning dispositions are only about subpart/mark normalization and do not alter question boundaries.

This clears page-chain warning handling for `p6_w_watermarked_001`. It does not by itself make the shard production-ready.
