# AO Review Runbook

## Scope

This runbook defines the first-release independent reviewer gate for repo-local AO.

The gate exists to answer one control question:

- has a separate reviewer session cleared this exact target SHA yet?

It does not grant merge authority.

## First-Release Contract

Independent review is explicit-only in v1.

Trigger rule:

- implementation reaches an intentional `ready_for_review` point
- implementation records that intent with `ao-review request`
- AO freezes release-facing progression for that task until review resolves

First-release constraints:

- reviewer must be a separate session from the implementation owner
- same-session reviewer claims fail closed
- reviewer is read-only by convention in v1
- reviewer may inspect repo state, `ao-state`, and GitHub read-only state
- reviewer may not edit files, push, merge, or replace implementation ownership
- `auto_merge_ready_pr` remains blocked until review passes for the exact target SHA

## Review Commands

Request review:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-review.js request \
  --issue 125 \
  --requested-by-session cie-125-impl \
  --requested-by-session-id session-125-impl \
  --implementation-session cie-125-impl \
  --implementation-session-id session-125-impl \
  --target-branch task/125-reviewer-gate \
  --target-sha abc123 \
  --verification-baseline-json '[{"category":"workspace_sanity","commands":["git status --short"]},{"category":"control_plane_sanity","commands":["node scripts/ao-state.js --json"]}]'
```

Claim review from the independent reviewer session:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-review.js claim \
  --issue 125 \
  --reviewer-session cie-125-review \
  --reviewer-session-id session-125-review
```

Record a pass verdict with baseline execution evidence:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-review.js verdict \
  --issue 125 \
  --verdict pass \
  --findings-summary-json '[]' \
  --baseline-execution-json '{"status":"attested","summary":"Required baseline commands executed.","recorded_at":"2026-04-03T14:40:00.000Z","attested_by_session_name":"cie-125-review","attested_by_session_id":"session-125-review","commands_run":["git status --short","node scripts/ao-state.js --json"]}'
```

Inspect the durable review posture:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-review.js inspect --issue 125 --json
```

## Posture Vocabulary

- `review_pending`: review exists and release-facing progression is frozen
- `review_changes_required`: review sent the slice back to implementation
- `review_passed`: reviewer cleared the current target SHA
- `review_escalated`: reviewer authority ended and a human must decide next

Lifecycle status mapping:

- `open` and `claimed` map to `review_pending`
- `passed` maps to `review_passed`
- `changes_required` maps to `review_changes_required`
- `escalated` maps to `review_escalated`
- `cancelled` returns posture to `idle`

## Freeze Rule

Freeze is durable, not prompt-only.

Operator reading path:

- `node scripts/ao-review.js inspect --issue <n> --json`
- `node scripts/ao-state.js --json`
- `node scripts/ao-lifecycle.js --pr <n> --trigger approved_and_green --json --strict`

Read these fields first:

- `posture`
- `freeze_status`
- `reviewer_session_name`
- `target_head_sha`
- `blocking_reason`
- `release_decision.disposition`
- `release_decision.basis`
- `decision_chain.blocking_reasons`
- `decision_chain.next_actions`

Interpretation:

- `review_pending` means AO must not advance to `auto_merge_ready_pr`
- `review_changes_required` means implementation may continue, but the prior review result does not clear release progression
- `review_escalated` means hold for human judgment
- `review_passed` only clears the exact `target_head_sha` that was reviewed
- if the live head SHA drifts, the old review becomes stale and the gate returns to `await_review`

## Verification Baseline

Review requests must include a non-empty baseline.

Minimum categories:

- `workspace_sanity`
- `control_plane_sanity`
- `scoped_verification`
- `pr_readonly`

Pass-path rule:

- a `pass` verdict requires baseline execution evidence
- first release accepts reviewer-attested baseline execution summary as the durable evidence surface

## Controller And State Surfaces

Read these machine surfaces when the operator asks why AO can or cannot advance:

- `ao-controller --json`: `task_results[*].release_decision`
- `ao-controller --json`: `task_results[*].decision_chain`
- `ao-controller --json`: `task_results[*].assist_actions[*]`
- `ao-state --json`: `reviews.summary`
- `ao-state --json`: `reviews.inspections[*]`
- `ao-manage ... --json`: result-level `review`

Typical answers:

- “Why can’t AO auto-merge this PR?”
  Read `release_decision.disposition`, `release_decision.basis`, and `reviews.inspections[*].posture`.

- “Why is this frozen?”  
  Read `freeze_status`, `blocking_reason`, and `reviewer_session_name`.

- “Why did this become stale again?”  
  Compare `target_head_sha` against the current PR head SHA and look for `review_target_mismatch`.

## Operating Guardrails

- do not treat reviewer approval as merge approval
- do not let the implementation session claim its own review
- do not use `ao-manage resume` to bypass an active review freeze
- do not silently reuse a passed review after the target SHA changes
- do not widen reviewer authority until there is separate evidence that read-only review is stable
