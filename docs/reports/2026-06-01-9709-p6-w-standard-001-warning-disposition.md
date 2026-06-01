# 9709 p6_w_standard_001 warning disposition

status: `accepted`

Scope:

- page-chain final report: `21/21` PDFs passed, `0` blockers
- warning PDFs after retry correction: `6`
- warning rows dispositioned: `6`
- warning type: `subpart_mark_count_mismatch`

Recovery notes:

- `9709_w18_qp_63` had an incomplete payload after a transient HTTP error. The incomplete backup was moved outside the payload glob and the PDF was regenerated.
- `9709_w16_qp_63` initially mixed several printed questions into q01. A single-PDF retry produced clean q01-q07 boundaries and replaced the flawed payload.

Disposition:

- All listed warnings are accepted with normalized subpart structure.
- Normalized marks were read from local PDF text pages and are recorded in `docs/reports/2026-06-01-9709-p6-w-standard-001-warning-disposition.json`.
- No listed warning changes the question boundary or blocks the shard.

This clears page-chain warning handling for `p6_w_standard_001`. It does not by itself make the shard production-ready.
