# 9709 p6_s_standard_001 warning disposition

status: `accepted`

Scope:

- page-chain final report: `24/24` PDFs passed, `0` blockers
- warning PDFs: `7`
- warning rows dispositioned: `8`
- warning type: `subpart_mark_count_mismatch`

Important recovery note:

- The initial `9709_s17_qp_61` payload extracted only q01-q04.
- Local PDF text confirmed q05-q07 are present.
- A single-PDF retry recovered all `7` questions; the recovered payload replaced the incomplete payload before bundle construction.

Disposition:

- All listed warnings are accepted with normalized subpart structure.
- Normalized marks were read from local PDF text pages and are recorded in `docs/reports/2026-06-01-9709-p6-s-standard-001-warning-disposition.json`.
- No listed warning changes the question boundary or blocks the shard.

This clears page-chain warning handling for `p6_s_standard_001`. It does not by itself make the shard production-ready.
