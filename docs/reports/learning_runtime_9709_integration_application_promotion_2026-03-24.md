# Learning Runtime 9709 Integration Application Promotion

Date: 2026-03-24
Issue: `#50`
Promoted scope: `9709.integration.application`

## Decision

Promote `9709.integration.application` from fallback-only posture into released scoring.

This promotion stays narrow:

- only the concrete `9709.integration.application` question type is promoted
- released scoring still requires all runtime gates:
  - registry-backed released question type
  - released rubric ref
  - classification confidence present
  - validated uncertainty posture
- non-promoted integration variants remain explicit `non_released_fallback`
- differential equations remain out of released scoring scope

## Evidence Summary

### Marking eval coverage

Local blind and hard-blind eval sets already contain recurring `integration.application` coverage:

- `data/eval/marking_eval_set_v2_blind_9709_p1p3.json`: `7` `9709.p[13].integration.application` rows
- `data/eval/marking_eval_set_v3_hard_blind_9709_p1p3.json`: `7` rows
- `data/eval/marking_eval_set_v3_hard_blind_9709_p1p3_120.json`: `14` rows
- `data/eval/marking_eval_set_v3_hard_blind_9709_p1p3_seed.json`: `3` rows

The stronger recurring signal is Paper 3:

- `v2`: `3` Paper 1 rows, `4` Paper 3 rows
- `v3`: `2` Paper 1 rows, `5` Paper 3 rows
- `v3_120`: `4` Paper 1 rows, `10` Paper 3 rows

### Topic-link manual audit signal

`data/eval/a1_topic_link_manual_audit_9709_p1p3_v1_review_sheet.csv` shows strong Paper 3 integration application signal and weaker/more mixed Paper 1 behavior:

- `13` `9709.p3.integration` rows with primary-node verdict `correct`
- `1` `9709.p1.integration` row with primary-node verdict `correct`
- `4` `9709.p3.integration` rows marked `partial`
- `7` `9709.p1.integration` rows marked `wrong`

Representative checked-in examples:

- `9709/m18_qp_12/questions/q01.png`: direct curve-recovery by integration, `correct`
- `9709/s16_qp_32/questions/q03.png`: definite integral application, `correct`
- `9709/s24_qp_32/questions/q06.png`: stationary-point plus definite-integral application, `correct`
- `9709/s22_qp_12/questions/q06.png`: Paper 1 area-bounded case, `wrong`

## Why This Is Eligible Now

The local runtime evidence is strong enough to promote one concrete integration type without widening the full family:

- `9709.integration.application` is already present across the checked-in eval sets
- the manual audit shows repeated clean Paper 3 application coverage
- weaker or mixed cases still exist, especially around Paper 1 and multi-topic prompts

That mix is why the runtime change does not promote broader `integration` family truth. It promotes only one question type and still requires the rubric, confidence, and uncertainty gates before returning `released_scoring`.

## Runtime Consequence

After this promotion:

- `9709.integration.application` may return `released_scoring` when all gates pass
- the same type still returns `non_released_fallback` when rubric coverage, confidence, or uncertainty validation is missing
- other `9709.integration.*` variants remain conservative until they earn separate release evidence
