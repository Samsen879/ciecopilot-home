# 9709 p4_s_standard_001 warning disposition

## Scope

This disposition covers the only page-chain warning in `p4_s_standard_001`:

- source PDF: `data/past-papers/9709Mathematics/paper4/9709_s16_qp_43.pdf`
- question: `q06`
- warning: `subpart_mark_count_mismatch`
- payload: `tmp/pdf-page-chain/full-scaleout/p4_s_standard_001/outputs/9709_s16_qp_43_page_chain.json`

## Review

The extracted q06 text contains part `(i)` with subparts `(a)` and `(b)`, followed by part `(ii)`. The printed mark allocations are `[6]` for the combined part `(i)(a,b)` work and `[4]` for part `(ii)`. The raw page-chain labels listed three labels but only two mark blocks, causing the validator warning.

## Disposition

- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- diagram_present: `false`
- normalized subpart labels: `["(i)(a,b)", "(ii)"]`
- normalized marks: `[6, 4]`
- write-back posture: allowed only with normalized mark-bearing structure, not raw page-chain labels
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review

This clears the page-chain warning as a batch blocker. It does not by itself make the shard production-ready; the shard must still pass review crops, evidence bundle review, targeted visual disposition, authority alignment, DB coverage, search gate, and final release preflight.
