# AO Reviewer Gate Rehearsal

## Scope

This report captures one real repo-local rehearsal of the independent reviewer gate on 2026-04-03.

The goal was to confirm three things with live control-plane state:

- `ao-review request` creates a durable freeze
- a separate reviewer session can claim and resolve that freeze
- `ao-state` and `ao-review inspect` explain why progression is blocked or released

## Environment

- repo root: `/home/samsen/code/ciecopilot-home`
- project id: `ao-review-rehearsal-20260403`
- execution mode: repo-local CLI against a temporary rehearsal project id to avoid touching the default AO state

## Command Sequence

Implementation-side task enrollment:

```bash
node scripts/ao-manage.js enroll \
  --project ao-review-rehearsal-20260403 \
  --issue 9251 \
  --title "AO reviewer gate rehearsal" \
  --branch task/9251-review-rehearsal \
  --worktree /tmp/ao-review-rehearsal-9251 \
  --pr 9251 \
  --owner-session cie-9251-impl \
  --owner-session-id session-9251-impl \
  --json
```

Implementation-side review request:

```bash
node scripts/ao-review.js request \
  --project ao-review-rehearsal-20260403 \
  --issue 9251 \
  --requested-by-session cie-9251-impl \
  --requested-by-session-id session-9251-impl \
  --implementation-session cie-9251-impl \
  --implementation-session-id session-9251-impl \
  --target-branch task/9251-review-rehearsal \
  --target-sha 98b555aa14e9268563596c6320aa3cc02221cae7 \
  --verification-baseline-json '[{"category":"workspace_sanity","commands":["git status --short"]},{"category":"control_plane_sanity","commands":["node scripts/ao-state.js --project ao-review-rehearsal-20260403 --json"]}]' \
  --json
```

State inspection while frozen:

```bash
node scripts/ao-review.js inspect --project ao-review-rehearsal-20260403 --issue 9251 --json
node scripts/ao-state.js --project ao-review-rehearsal-20260403 --json
```

Independent reviewer claim:

```bash
node scripts/ao-review.js claim \
  --project ao-review-rehearsal-20260403 \
  --issue 9251 \
  --reviewer-session cie-9251-review \
  --reviewer-session-id session-9251-review \
  --json
```

Reviewer verdict:

```bash
node scripts/ao-review.js verdict \
  --project ao-review-rehearsal-20260403 \
  --issue 9251 \
  --verdict pass \
  --findings-summary-json '[]' \
  --baseline-execution-json '{"status":"attested","summary":"Required baseline commands executed during rehearsal.","recorded_at":"2026-04-03T15:44:05.000Z","attested_by_session_name":"cie-9251-review","attested_by_session_id":"session-9251-review","commands_run":["git status --short","node scripts/ao-state.js --project ao-review-rehearsal-20260403 --json"]}' \
  --json
```

State inspection after verdict:

```bash
node scripts/ao-review.js inspect --project ao-review-rehearsal-20260403 --issue 9251 --json
node scripts/ao-state.js --project ao-review-rehearsal-20260403 --json
```

## Observed State Changes

Before reviewer claim:

- `ao-review inspect` returned `status=open`
- derived `posture=review_pending`
- `freeze_status=active`
- `reviewer_session_name=null`
- `ao-state --json` reported `reviews.summary.open_count=1`
- `ao-state --json` reported `tasks.inspections[*].closeout_status=hold`

After reviewer claim:

- `status=claimed`
- `posture` remained `review_pending`
- `freeze_status` remained `active`
- reviewer identity became visible in durable state
- review record `updated_at` advanced to `2026-04-03T15:43:53.042Z`

After pass verdict:

- `status=passed`
- `posture=review_passed`
- `freeze_status=released`
- baseline execution evidence was attached to the review record
- review record `updated_at` advanced to `2026-04-03T15:44:05.004Z`

`ao-state --json` matched that progression:

- `reviews.summary.freeze_active_count` moved from `1` to `0`
- `reviews.inspections[*].posture` moved from `review_pending` to `review_passed`
- `reviews.summary.passed_count` moved to `1`
- `tasks.inspections[*].closeout_status` moved from `hold` to `active`
- the task stopped presenting a review-blocking hold posture once the reviewer cleared the target SHA

## Gate Interpretation

This rehearsal confirmed the intended first-release behavior:

- the gate becomes real only after durable `ao-review` state exists
- the implementation session cannot self-clear the review
- the freeze remains active while the review is `open` or `claimed`
- the gate releases only after a verdict for the fixed `target_head_sha`
- the explanation surface is inspectable from both `ao-review` and `ao-state`

## Operational Notes

- rehearsal used a non-default AO project id to avoid polluting the main project state
- the rehearsal used a minimal task enrollment, so the generated TaskSpec stayed `invalid`; that did not block the review-gate state transition being exercised here
- the review remained notification-only and did not imply merge authority
- the durable fields were sufficient to answer “why is this blocked?” and “why is it released now?” without re-reading prompt text
