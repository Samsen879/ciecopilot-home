# AO Lifecycle Runbook

## Scope

This runbook covers the phase-3 repo-local AO lifecycle layer in this repo.

Lifecycle is decide-only:

- it does not recreate AO sessions
- it does not mutate git state
- it does not reassign ownership automatically
- it does not merge PRs directly; assist may execute the explicit `auto_merge_ready_pr` action after gates pass
- it does not act as a repair plane

Lifecycle exists to answer the next control question after phase-1 reconciliation and phase-2 doctor:

- continue the current worker
- restore the prior worker
- hand off to a successor
- hold
- human gate
- merge a release-ready PR through the explicit assist action
- notify the human that a PR appears ready when auto-merge is not the selected path
- notify the human that AO is blocked when a release-facing task chain reaches a human gate

Independent reviewer gate note:

- first release enables only explicit `ready_for_review` requests through `ao-review`
- once a durable review request exists, lifecycle must fail closed for release-facing advancement until that review passes for the current target SHA
- `notify_human_ready` and `notify_human_blocked` remain notification-only; `auto_merge_ready_pr` is the default release-ready action

## When To Run Lifecycle

Run lifecycle when:

- reconciliation truth is already known
- doctor has already covered local continuity posture when needed
- you need deterministic next-step control reasoning
- a trigger such as `ci_failed`, `approved_and_green`, `agent_stuck`, or `agent_exited` needs stable routing

Do not use lifecycle as a substitute for phase-1 truth or phase-2 diagnosis.

## Command Forms

### Project mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js
```

Use this for advisory project-wide triage only.

### Project JSON mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --json
```

### PR mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --pr <number>
```

### Triggered PR mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --pr <number> --trigger ci_failed
```

### Strict mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --pr <number> --trigger approved_and_green --json --strict
```

Equivalent npm wrappers:

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:lifecycle:strict -- --pr <number> --trigger approved_and_green
```

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:lifecycle:strict:pr -- <number> --trigger approved_and_green
```

Strict mode is still decide-only. It does not execute repair or merge actions.

Wrapper note:

- `ao:lifecycle:strict` remains valid in project mode and in PR mode when you forward `--pr <number>`
- `ao:lifecycle:strict:pr` exists to make the PR-scoped strict form explicit without changing lifecycle's underlying strict contract

## Phase Relationship

### Phase 1 reconciliation

Use reconciliation for:

- AO/GitHub truth comparison
- ownership continuity truth
- PR release-readiness truth
- authoritative PR-scoped automation posture

Authoritative PR command:

```bash
node scripts/ao-reconcile.js --pr <number> --json --strict
```

### Phase 2 doctor

Use doctor for:

- local git/worktree diagnosis
- branch/upstream posture checks
- AO artifact review
- suggested local inspection commands

Doctor command:

```bash
node scripts/ao-doctor.js --pr <number>
```

### Phase 3 lifecycle

Use lifecycle for:

- worker routing decisions
- restore-vs-successor decisions
- release-facing hold vs auto-merge decisions
- trigger-specific control reasoning

Lifecycle consumes reconciliation and doctor. It must not replace them.

## Phase-2 Decision Chain Contract

Lifecycle JSON output now carries a shared `decision_chain` object. This is the stable phase-2 machine-readable contract that converges:

- phase-1 truth
- phase-2 diagnosis
- phase-3 control decisions

Read these fields first:

- `decision_chain.contract_status`
- `decision_chain.stages`
- `decision_chain.blocking_reasons`
- `decision_chain.next_actions`
- `decision_chain.next_commands`

Interpretation:

- `authoritative_pr_chain`: explicit PR scope; reconcile and lifecycle are authoritative, doctor is diagnose-only but required in the chain
- `advisory_project_chain`: project-mode inspection only; doctor/lifecycle remain advisory
- `pr_scope_required`: a non-manual trigger was evaluated without explicit PR scope, so the chain cannot be authoritative

## Trigger Vocabulary

Supported triggers:

- `manual`
- `ci_failed`
- `changes_requested`
- `bugbot_comments`
- `merge_conflicts`
- `approved_and_green`
- `agent_stuck`
- `agent_needs_input`
- `agent_exited`

Use underscore names in the CLI, not raw reaction names with hyphens.

## Interpreting Lifecycle Status

Lifecycle `top_status` uses:

1. `source_failure`
2. `human_gate`
3. `handoff`
4. `hold`
5. `observe`
6. `continue`

Interpretation:

- `continue`: lifecycle has a specific next step without a hold or handoff barrier
- `observe`: advisory-only project posture
- `hold`: stop and wait on a known blocking condition
- `handoff`: a successor worker is likely required
- `human_gate`: ambiguity remains too high for safe autonomous control
- `source_failure`: required inputs were not usable enough to decide safely

## Worker Routing vs Release Control

Lifecycle reports two separate decisions:

### Routing decision

This answers:

- continue the current worker
- restore the previous worker
- hand off to a successor
- hold for human

### Release decision

This answers:

- no release action
- wait for CI
- wait for review
- wait for mergeability
- auto-merge the PR after fresh GitHub validation
- notify the human that the PR appears ready when auto-merge is not selected
- notify the human that AO is blocked when release-facing judgment needs human input
- human gate

Important:

- `notify_human_ready` is not auto-merge
- `notify_human_blocked` is audit-only in PR1: it records a GitHub issue comment command with an `ao:blocked-notification` marker, but does not call external chat systems
- PR2 also emits `notify_human_blocked` for PR-scoped `doctor_blocks_control`, because local control blockers require human inspection before autonomous work can resume
- `auto_merge_ready_pr` is default-on for AO-managed PRs when release gates pass
- GitHub remains canonical for mergeability, review, and CI truth

## Suggested Workflow

### For one known PR

1. Run:

```bash
node scripts/ao-reconcile.js --pr <number> --json --strict
```

2. If local continuity is relevant, run:

```bash
node scripts/ao-doctor.js --pr <number>
```

3. Run lifecycle for the real trigger:

```bash
node scripts/ao-lifecycle.js --pr <number> --trigger <trigger> --json --strict
```

4. Read:

- `decision_chain.contract_status`
- `decision_chain.blocking_reasons`
- `decision_chain.next_actions`
- `decision_chain.next_commands`

5. Use `ao:reconcile` / `ao:doctor` only when you need truth-only or diagnose-only drilldown beyond the chain result.

### For broad operator triage

1. Run:

```bash
node scripts/ao-lifecycle.js
```

2. Inspect:

- `top_status`
- `routing_decision`
- `release_decision`
- `decision_chain.contract_status`
- `decision_chain.blocking_reasons`
- `decision_chain.next_actions`
- `decision_chain.next_commands`

Remember that project mode is advisory only.

## Phase-3 Continuity Alignment

Lifecycle remains the decide-only phase-3 layer. The control-plane continuity contract is the companion operator view for restore and handoff readiness.

Keep these aligned:

- lifecycle `routing_decision.action = continue_current_worker` should map to continuity posture `active_owner`
- lifecycle `routing_decision.action = restore_existing_worker` should only be treated as restore-ready when the task also has a valid checkpoint posture
- lifecycle `routing_decision.action = handoff_to_successor` should be read together with `ao-handoff inspect --json` or `ao-state --json` continuity output to distinguish `handoff_pending`, `handoff_granted`, and still-`orphaned` state
- lifecycle `routing_decision.action = hold_for_human` should be treated as authoritative when continuity posture is `ambiguous`

Operator shortcut:

- `decision_chain` answers “why this trigger classified this way?”
- `continuity` answers “which owner path is currently safe to execute?”

Phase-4 assist note:

- lifecycle may propose Class A, B, or C actions
- assist execution only auto-runs the phase-4 Class A allowlist after durable policy `allow` and clean runtime preflight
- `auto_merge_ready_pr` is the default release-ready action
- `notify_human_ready` and `notify_human_blocked` remain notification-only
- `notify_human_blocked` uses the existing action idempotency gate plus a GitHub comment marker shaped like `<!-- ao:blocked-notification key=<project>:pr-<number> -->`

Independent reviewer gate note:

- lifecycle now reads repo-local review state when it exists
- `release_decision.disposition = await_review` is authoritative when review is pending, missing for the requested release path, or stale for the current target SHA
- `release_decision.disposition = no_release_action` with basis `review_changes_required` means implementation should continue instead of advancing to auto-merge
- `release_decision.disposition = human_gate` with basis `review_escalated` means reviewer authority ran out and a human must decide next

## Strict Exit Codes

Phase-3 strict mode uses:

- `0`: continue
- `30`: observe
- `31`: hold
- `32`: handoff
- `33`: human gate
- `34`: source failure
- `35`: invalid CLI usage

Default human mode is permissive:

- `0`: continue, observe, hold, handoff, or human gate
- `3`: source failure
- `4`: invalid CLI usage

## What Phase 3 Still Does Not Solve

Phase 3 does not:

- spawn workers automatically
- restore sessions automatically
- mutate AO runtime automatically
- merge PRs directly from lifecycle without assist execution
- replace GitHub truth
- provide durable lifecycle state storage
- implement a full repo-local control daemon

Those remain later AO work, if they are ever approved for this branch at all.
