# 9709 p5_w_standard_001 warning disposition

## Scope

This disposition covers the single page-chain warning in p5_w_standard_001.

| Storage key | Warning | Disposition | Normalized marks |
|---|---|---|---:|
| 9709/w20_qp_51/questions/q01.png | subpart_mark_count_mismatch | accepted_with_normalized_structure | [2,2] |

## Review

This warning is a mark-allocation normalization case. PDF text evidence for 9709_w20_qp_51.pdf page 2 shows part (a) has [2] and part (b) has [2]; page-chain captured only the first mark block. The question boundary is accepted.

## Disposition

- disposition: accepted_with_normalized_structure
- blocker: false
- write-back posture: allowed only with normalized mark-bearing structure, not raw page-chain labels/marks
- review posture: keep requires_review=true through evidence bundle and post-extraction review

This clears the page-chain warning as a batch blocker. It does not by itself make the shard production-ready; the shard must still pass review crops, evidence bundle review, targeted visual disposition, authority alignment, DB coverage, search gate, and final release preflight.
