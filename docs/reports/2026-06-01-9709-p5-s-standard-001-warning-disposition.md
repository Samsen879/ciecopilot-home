# 9709 p5_s_standard_001 warning disposition

## Scope

This disposition covers the three page-chain warnings in `p5_s_standard_001`.

| Storage key | Warning | Disposition | Normalized marks |
|---|---|---|---:|
| `9709/s21_qp_51/questions/q04.png` | `subpart_mark_count_mismatch` | `accepted_with_normalized_structure` | `[3,2,2]` |
| `9709/s22_qp_53/questions/q03.png` | `subpart_mark_count_mismatch` | `accepted_with_normalized_structure` | `[3,3]` |
| `9709/s23_qp_53/questions/q06.png` | `subpart_mark_count_mismatch` | `accepted_with_normalized_structure` | `[3,3,4]` |

## Review

All three warnings are mark-allocation normalization cases. The question boundaries are accepted, and the rendered/PDF text evidence shows the missing printed mark blocks. No warning is a blocker.

- `9709/s21_qp_51/questions/q04.png`: printed marks are `[3,2,2]` for `(a),(b),(c)`; page-chain omitted the continuation-page `[2]` for `(c)`.
- `9709/s22_qp_53/questions/q03.png`: printed marks are `[3,3]` for `(a),(b)`; page-chain omitted the `[3]` for `(b)`.
- `9709/s23_qp_53/questions/q06.png`: printed marks are `[3,3,4]` for `(a),(b),(c)`; page-chain omitted the `[3]` for `(b)`.

## Disposition

- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- write-back posture: allowed only with normalized mark-bearing structure, not raw page-chain labels/marks
- review posture: keep `requires_review=true` through evidence bundle and post-extraction review

This clears the page-chain warnings as batch blockers. It does not by itself make the shard production-ready; the shard must still pass review crops, evidence bundle review, targeted visual disposition, authority alignment, DB coverage, search gate, and final release preflight.
