# Learning Runtime 9709 Differential Equations Separable Promotion

Date: 2026-03-25
Issue: `#66`
Promoted scope: `9709.differential_equations.separable`

## Decision

Promote `9709.differential_equations.separable` from fallback-only posture into released scoring.

This promotion stays narrow:

- only the concrete `9709.differential_equations.separable` question type is promoted
- released scoring still requires all runtime gates:
  - registry-backed released question type
  - released rubric ref
  - classification confidence present
  - validated uncertainty posture
- non-promoted differential-equations variants remain explicit `non_released_fallback`
- integration and trigonometry release truth are unchanged

## Evidence Summary

### Blind eval posture

The checked-in blind and hard-blind `9709` marking eval sets still show no direct `differential_equations` coverage:

- `data/eval/marking_eval_set_v2_blind_9709_p1p3.json`: `0` hits
- `data/eval/marking_eval_set_v3_hard_blind_9709_p1p3.json`: `0` hits
- `data/eval/marking_eval_set_v3_hard_blind_9709_p1p3_120.json`: `0` hits
- `data/eval/marking_eval_set_v3_hard_blind_9709_p1p3_seed.json`: `0` hits

That absence is why this promotion uses the released-family evidence gate and stays on a single differential-equations type instead of widening the whole family.

### Topic-link manual audit signal

`data/eval/a1_topic_link_manual_audit_9709_p1p3_v1_review_sheet.csv` shows concentrated Paper 3 signal for exact differential-equation solves:

- `16` `9709.p3.differential_equations` reviewed rows
- `8` rows marked `correct`
- `8` rows marked `partial`
- `0` rows marked `wrong`

Representative exact solve cases that match the promoted separable slice:

- `9709/m22_qp_32/questions/q09.png`: separable first-order equation with initial condition and exact evaluation
- `9709/s18_qp_31/questions/q06.png`: separable decay model with initial condition and exact follow-through
- `9709/s22_qp_32/questions/q06.png`: separable exponential-form equation with initial condition and exact answer
- `9709/w21_qp_32/questions/q07.png`: separable equation yielding explicit `y` in terms of `x`

The partial rows are the reason this stays narrow. They cluster around mixed prompts where differential-equation language appears alongside differentiation or parametric-curve work, for example:

- `9709/m16_qp_32/questions/q06.png`
- `9709/s20_qp_31/questions/q08.png`
- `9709/w22_qp_33/questions/q04.png`

Those mixed prompts are still conservative fallback territory.

## Why This Is Eligible Now

The repo now has enough checked-in evidence to promote one differential-equations type without widening the whole family:

- the clean `correct` audit rows are all Paper 3 exact-solve prompts with initial conditions
- those prompts align with the intended `separable` runtime type rather than generic modelling or differentiation
- the ambiguous mixed-topic rows remain outside the promoted slice, which preserves conservative runtime behavior

This is why the runtime change promotes only `9709.differential_equations.separable` and still requires the rubric, confidence, and uncertainty gates before returning `released_scoring`.

## Runtime Consequence

After this promotion:

- `9709.differential_equations.separable` may return `released_scoring` when all gates pass
- the same type still returns `non_released_fallback` when rubric coverage, confidence, or uncertainty validation is missing
- other `9709.differential_equations.*` variants remain conservative until they earn separate release evidence
