# 2026-04-18 Issue 232 Scheduler Factor Coverage Report

## Scope

This report records the bounded scheduler-core upgrade delivered for issue `#232`
on branch `task/232-scheduler-core-upgrade`.

The slice stays inside the approved `9709` release-readiness boundary:

- replace route-weight-first ranking with a bounded factor profile stored on the
  real scheduler policy
- preserve stable target identity and active-task dedupe semantics
- keep existing route / mode / priority fields as compatibility shims
- preserve the existing review-task write lifecycle coverage used by the closed
  loop

The slice does not widen into graph enrichment, broader explainability changes,
frontend UX work, or second-subject allocation policy.

## Delivered Changes

Scheduler policy now derives and stores a bounded `factor_profile` in
`api/learning/lib/review/review-scheduler-policy.js`.

The ranking comparator now prefers `factor_profile.total_score` before the
legacy compatibility ordering, so bounded factor totals drive queue ordering
instead of raw route weights alone.

Stable-target merge behavior now keeps the stronger factor profile when a new
candidate folds into an existing active review task.

The real generation path in `api/learning/lib/review/review-task-service.js`
now forwards question-classification confidence inputs into the scheduler seed so
band vulnerability is derived from runtime truth instead of test-only fixtures.

Focused tests were added in:

- `api/learning/__tests__/review-scheduler-policy.test.js`
- `api/learning/__tests__/review-task-service.test.js`

## Factor Coverage

| Factor | Runtime source used in this slice | Bounded scoring in this slice |
| --- | --- | --- |
| Freshness | `scheduler_policy.freshness_bucket` / derived route bucket | `fresh=2`, `cooling=1`, `current=0`, `stale=1` |
| Overdue pressure | `due_at` compared with verification `now` | `0` when not overdue, `1` when overdue under 24h, `2` when overdue 24h or more |
| Band vulnerability | `question_context.confidence_band` or derived band from `classification_confidence` | `high=0`, `medium=1`, `low=2` |
| Trigger urgency | compatibility route (`short_delay`, `immediate_repair`, etc.) | `spaced_review=0`, `short_delay=1`, `exam_polish=1`, `immediate_repair=2`, `regression_recovery=3` |
| Exam proximity | `learner_goal === exam_polish` or route `exam_polish` | `0` or `1` |
| Regression severity | `regression_recovery` input or route `regression_recovery` | `0` or `2` |

The bounded total used for ranking is the sum of those six factor scores.

## Verification

Commands run from the task worktree:

```bash
npm test -- api/learning/__tests__/review-scheduler-policy.test.js
npm test -- api/learning/__tests__/review-task-service.test.js -t "review task service generation"
npm test -- api/learning/__tests__/review-task-service.test.js -t "review task service write semantics"
```

Observed result:

- scheduler-policy suite passed with the new bounded-factor seed and ranking assertions
- review-task generation subset passed with bounded-factor generation and dedupe preservation assertions
- review-task write-semantics subset passed, preserving the explicit lifecycle guardrails already used as minimal runtime-state coverage for this slice

## Residual Risks

- Verification stayed focused to the scheduler-core slice. I did not claim the
  full `api/learning/__tests__/review-task-service.test.js` file is green,
  because unrelated orchestration assertions outside `#232` were already failing
  before this closeout pass.
- The bounded factor model is intentionally compact for release readiness. It is
  not a full theoretical scheduling surface and does not include graph-derived
  enrichment.
- Exam proximity remains a bounded binary signal in this slice because the
  current runtime path carries goal posture, not richer exam-deadline truth.
