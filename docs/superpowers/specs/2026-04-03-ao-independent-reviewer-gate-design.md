# AO Independent Reviewer Gate Design

**Date:** 2026-04-03  
**Scope:** add a durable AO-native independent reviewer gate so implementation workers cannot self-approve a completed slice  
**Status:** approved in-session  
**Applies to branch reality:** current repo-root AO control plane after phase 1-6 completion  
**Depends on:** [AO 完全态路线图](/home/samsen/code/ciecopilot-home/docs/setup/AO_COMPLETE_STATE_ROADMAP.md), [AO Control Plane Operations](/home/samsen/code/ciecopilot-home/docs/setup/AO_CONTROL_PLANE_OPERATIONS.md), [AO Controller Runbook](/home/samsen/code/ciecopilot-home/docs/setup/AO_CONTROLLER_RUNBOOK.md), [AO Lifecycle Runbook](/home/samsen/code/ciecopilot-home/docs/setup/AO_LIFECYCLE_RUNBOOK.md)

## Goal

Add a real second-layer review gate to AO.

The core outcome is simple:

- an implementation worker may finish a slice
- that worker may not self-clear the slice
- a new independent reviewer session must inspect the fixed target before AO can advance to `notify_human_ready`

This reviewer layer must be durable, operator-visible, and hard to bypass.

## Problem Statement

The current AO control plane has:

- task ownership and continuity
- bounded phase-4 assist execution
- durable task / closeout state
- phase-6 soak and operational evidence

But it still lacks an internal independent review layer.

Today, the system can determine that a task is healthy enough to continue or that a PR is approved and green. What it does **not** currently enforce is:

- a separate reviewer session
- a durable review request and verdict record
- a freeze on the implementation worker during review
- a hard gate requiring an independent review pass before human-ready status

That gap matters because implementation and self-review performed by the same AI session are structurally weak. The implementation worker already carries its own assumptions, shortcuts, and blind spots. Without a separate reviewer, the system risks accepting work that only appears correct from the perspective of the same session that wrote it.

## User-Approved Requirements

This design reflects explicit in-session decisions:

- trigger independent review on every explicitly declared reviewable slice, not only at final PR merge time
- the implementation worker must emit an explicit `ready_for_review` signal
- first release supports both explicit and inferred trigger concepts, but only explicit triggering is enabled
- the reviewer must run as a new independent session, not as the implementation worker re-labeled
- the reviewer is read-only
- the reviewer may read repo contents, inspect AO state, run local verification commands, and query GitHub in read-only mode
- the reviewer may not edit files, push commits, or write GitHub review verdicts
- review is a hard gate: without `pass`, AO must not enter `notify_human_ready`
- once review starts, the implementation worker is frozen until the reviewer returns a verdict
- AO defines a required minimum verification baseline; the reviewer may add more checks
- review applies to a task slice / branch regardless of whether a PR already exists

## Recommended Approach

Add a new AO-native review control surface named `ao-review`.

Do **not** overload `ao-manage` or `ao-handoff` to perform review workflow duties. Those commands already represent different control-plane concerns:

- `ao-manage` owns task lifecycle and ownership admission
- `ao-handoff` owns successor routing and continuity transfer
- `ao-review` should own review requests, reviewer claim state, review freeze, and review verdicts

The review gate should sit between implementation completion and the existing human-ready release surface.

Current simplified flow:

1. implementation worker finishes a slice
2. AO may eventually reach `notify_human_ready`

Target flow:

1. implementation worker finishes a slice
2. implementation worker explicitly requests review with `ready_for_review`
3. AO freezes implementation progress for that task
4. independent reviewer session claims the review
5. reviewer returns `pass`, `changes_required`, or `escalate_human`
6. only `pass` allows AO to proceed to `notify_human_ready`

## Architecture

### New Durable Surface

Add durable review records to the AO state repository.

The control plane should persist:

- review requests
- reviewer claim information
- target branch and target head SHA
- required verification baseline
- final verdict and findings summary
- review freeze posture for the task

This review record becomes the authoritative explanation surface for:

- why the task is blocked
- who is reviewing it
- what SHA is under review
- why the reviewer passed or rejected it

### New Command Surface

Add a new CLI family:

- `ao-review request`
- `ao-review claim`
- `ao-review verdict`
- `ao-review inspect`

This command family is the only supported way to create and resolve independent review state.

### Controller Integration

The controller should not spawn reviewer sessions automatically in the first release.

Instead, controller and `ao-state` must respect review posture as a hard gate:

- if a task requires independent review and no `review_passed` record exists for the current target SHA, the controller must not allow the task to advance to `notify_human_ready`
- if a review is pending or escalated, the controller should report that state directly instead of re-deriving release readiness from PR status alone

This keeps the review layer durable and enforceable without prematurely expanding automation risk.

## Review State Model

Each task has review posture in addition to continuity posture.

Recommended review postures:

- `idle`
- `review_pending`
- `review_changes_required`
- `review_passed`
- `review_escalated`

Recommended review record lifecycle:

- `open`: implementation worker requested review but no reviewer has claimed it yet
- `claimed`: reviewer session has claimed the review and the target SHA is frozen
- `passed`: reviewer accepted the target slice
- `changes_required`: reviewer rejected the slice and sent it back to implementation
- `escalated`: reviewer could not safely resolve within reviewer authority
- `cancelled`: prior review request became stale because target SHA or request context changed

Hard constraints:

- only one active review per task at a time
- every review binds to one fixed `target_head_sha`
- if the target SHA changes, the prior review must be cancelled rather than silently reused

## Review Record Contract

The first release should persist a review record with fields equivalent to:

- `review_id`
- `task_id`
- `issue_number`
- `pr_number`
- `requested_by_session`
- `implementation_session`
- `reviewer_session`
- `target_branch`
- `target_head_sha`
- `status`
- `trigger_kind`
- `verification_baseline`
- `findings_summary`
- `verdict`
- `freeze_status`
- `created_at`
- `updated_at`

The design intent is not to freeze exact JSON names prematurely, but the state must cover those semantics.

## Reviewer Session Contract

The reviewer must be independent from the implementation session.

Minimum independence rules:

- reviewer session name must differ from the implementation session name
- reviewer claim must fail closed when the claimant matches the implementation owner
- reviewer is not allowed to mutate the implementation branch or worktree

Reviewer permissions:

- may read repository files
- may inspect diffs and branch state
- may run local verification commands
- may inspect `ao-state`
- may query GitHub read-only state such as PR metadata and checks

Reviewer restrictions:

- may not edit files
- may not create commits
- may not push
- may not merge
- may not write GitHub review decisions
- may not silently replace implementation ownership

This keeps the reviewer layer strict and legible. It is a verifier, not a second implementation worker.

## Trigger Contract

The first release must support only explicit review requests.

Trigger rule:

- implementation worker emits an explicit `ready_for_review` request through `ao-review request`

Future inferred triggers may be supported later, but they must remain disabled by default until there is evidence they do not create spurious or mistimed review requests.

Reasoning:

- explicit triggering is less magical
- explicit triggering is easier to audit
- explicit triggering reduces accidental reviewer churn

## Freeze Contract

Once a review request becomes active, the implementation worker is frozen.

That freeze should be durable and inspectable, not just a prompt instruction.

Expected behavior:

- AO records the task as review-frozen
- implementation-side progression to further delivery states is blocked
- controller output and `ao-state` must explain that review is in progress
- the freeze is lifted only when review resolves to `changes_required` or `passed`
- `escalate_human` keeps the task blocked until an operator resolves the situation

This freeze is necessary to ensure the reviewer is inspecting a stable target.

## Verification Baseline

AO should define a required minimum verification baseline attached to the review request.

Reviewer must run this baseline. Reviewer may add additional checks.

Minimum baseline categories:

- workspace sanity:
  - `git status --short`
- task / control-plane sanity:
  - `ao-state --json`
- scoped local verification:
  - task-relevant test or verification commands recorded in the request
- PR read-only inspection when a PR exists:
  - `gh pr view --json ...`
  - `gh pr checks`

The exact baseline command set can evolve, but the presence of a baseline itself is mandatory. The reviewer should not be free to skip verification entirely.

## Verdict Contract

Allowed verdicts:

- `pass`
- `changes_required`
- `escalate_human`

Verdict meanings:

### `pass`

Use only when:

- required verification baseline passed
- target SHA still matches the requested review target
- no blocking defects were found
- reviewer is willing to clear the slice for the next human-facing stage

### `changes_required`

Use when:

- reviewer found a concrete defect
- implementation does not match the claimed completion state
- required verification is missing or fails
- task can continue safely through more implementation work without human policy escalation

### `escalate_human`

Use when:

- reviewer cannot safely make the call within read-only authority
- issue involves product or architecture judgment beyond the reviewer boundary
- environment or credential gaps prevent a trustworthy verdict
- the situation suggests a higher-level control decision rather than ordinary implementation rework

No other verdicts should be accepted in the first release.

## `ao-state` And Operator Visibility

`ao-state` should expose review information directly.

Recommended additions:

- `reviews.summary`
  - open count
  - claimed count
  - passed count
  - changes-required count
  - escalated count
- `reviews.inspections[*]`
  - task id
  - issue number
  - implementation session
  - reviewer session
  - target branch
  - target SHA
  - review posture
  - verdict
  - freeze status
  - blocking reason

Operators should be able to answer:

- is this task waiting on review
- who is reviewing it
- what exact SHA is under review
- why can it not advance
- did review pass or send it back

## Controller And Lifecycle Integration

This design does not replace `reconcile`, `doctor`, `lifecycle`, or continuity.

Instead, it adds a new gating layer that release decisions must respect.

Integration rules:

- lifecycle may still derive `notify_human_ready`
- controller assist may still evaluate low-risk actions
- but final release advancement must fail closed without `review_passed` for the current target SHA

This means:

- `approved_and_green` is no longer sufficient by itself for human-ready progression when the independent review requirement applies
- review pass becomes a prerequisite in the same way clean policy and clean runtime preflight are prerequisites for bounded assist execution

## First-Release Non-Goals

The first release deliberately does **not** include:

- automatic spawning of reviewer sessions by the controller
- inferred review triggering enabled by default
- reviewer edits to the implementation branch
- reviewer commits or pushes
- reviewer-authored GitHub approve/request-changes writes
- multiple reviewers or voting
- automatic merge after review
- replacing human review with AO review

The first release should be strict and narrow. That is a feature, not a limitation.

## Risks And Mitigations

### Risk: reviewer gate becomes a soft convention instead of a hard barrier

Mitigation:

- make review state durable
- make controller fail closed without review pass
- expose review posture in `ao-state`

### Risk: implementation worker mutates the target during review

Mitigation:

- freeze implementation progression
- bind review to one fixed target SHA
- cancel stale reviews on SHA drift

### Risk: reviewer is not truly independent

Mitigation:

- require reviewer session identity distinct from implementation owner
- fail closed on same-session claims
- keep reviewer read-only

### Risk: review becomes noisy or over-triggered

Mitigation:

- enable only explicit `ready_for_review` in first release
- require one active review per task
- do not infer review requests from PR state yet

### Risk: reviewers skip meaningful verification

Mitigation:

- require an AO-defined verification baseline
- persist that baseline in the review request
- tie `pass` to completed baseline execution

## Acceptance Criteria

The feature is complete only when all of the following are true:

- an implementation worker can create an explicit review request for a task slice
- the review request freezes implementation progression durably
- a separate reviewer session can claim the review
- same-session reviewer claims fail closed
- reviewer can record only `pass`, `changes_required`, or `escalate_human`
- tasks without `review_passed` for the target SHA cannot advance to `notify_human_ready`
- `changes_required` reliably returns the task to implementation flow
- `ao-state` can explain current review posture and blocking reason
- audit history shows request, claim, verdict, and resolution steps

## Verification Strategy

The implementation should prove the contract through focused AO tests and operator-facing evidence.

Required verification themes:

- review state contract tests
- `ao-review` CLI tests
- controller gating tests proving `notify_human_ready` is blocked without review pass
- task freeze tests
- same-session reviewer rejection tests
- target-SHA drift invalidation tests
- `ao-state` reporting tests
- one real repo-local operator rehearsal demonstrating:
  - implementation request
  - reviewer claim
  - review verdict
  - gated or released outcome

## Rollout Recommendation

Ship this as a narrow first release:

1. durable review contracts and CLI
2. `ao-state` visibility
3. controller hard gate
4. focused rehearsal and runbook updates

Do not combine the first release with automatic reviewer spawning or broader autonomy expansion.

The point of this change is to raise review rigor, not to increase automation surface area at the same time.
