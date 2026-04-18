# 9709 Minimal Complete Loop Current State

Date: 2026-04-16
Status: minimal complete loop achieved locally; branch open, not merged
Branch: `hotfix/9709-wave1-vlm-stabilization`
Closure code commit: `f73a97a`
PR: `#210`

## Purpose

This document records the actual `9709` state after the wave-1 VLM stabilization work, downstream hydration fix, local closure-runner productization, and fresh local gate rerun.

It supersedes the older posture captured in:

- `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
- `docs/reports/2026-04-16-9709-question-search-wave1-closeout-report.md`

Those earlier reports were truthful for the state that existed at the time: real execution had happened, but the slice was still red. This document records the newer state after the remaining downstream and execution-surface blockers were removed.

## Executive Summary

As of 2026-04-16, the `9709` pilot has reached a real minimal complete loop:

1. real `9709` question images have already produced stable structured VLM evidence
2. that evidence can now be turned into machine-consumable evidence bundles
3. paper-backed `question_bank` rows can be hydrated deterministically from those bundles
4. `learning_question_search_projection` can answer the pinned paper-backed gate cases
5. the focused `9709` question-search gate now passes honestly

The important boundary is:

- the latest successful rerun was a fresh local closure rerun using checked-in real VLM outputs
- it was not a fresh second call to the VLM provider for the same `9709` batch

That distinction matters because the remaining work is no longer about "can the model see the image?" It is about stabilizing and generalizing the whole replayable pipeline around already-proven visual evidence.

## Current Branch Posture

The code that achieved this state is already pushed, but it is not merged yet.

- branch: `hotfix/9709-wave1-vlm-stabilization`
- closure code commit: `f73a97a`
- pull request: `#210`

This matters operationally:

- `main` should not yet be described as already containing the full closed-loop result
- the current green state is presently represented by the hotfix branch plus the checked-in artifacts referenced below
- the two documents written on 2026-04-16 are documentation of that state, not new runtime changes by themselves

## What "Minimal Complete Loop" Means Here

This document is intentionally strict about scope.

For `9709`, "minimal complete loop" means:

1. real image inputs were sent through a real VLM execution path
2. the resulting evidence artifact is structured and reusable
3. downstream bundle, hydration, and projection logic can consume that evidence deterministically
4. the pinned question-search gate cases pass in a real local rerun

It does **not** mean:

- the whole `9709` corpus is fully generalized across all future rerun modes
- the broader multi-subject recovery framework is done
- every workstation execution surface is now clean or uniform
- `diagram_lane` coverage has been broadly validated beyond this pilot slice

This distinction is important because the pilot is now honest and usable, but it is still a pilot.

## What Is Green Now

### 1. Wave-1 evidence is structurally usable

The live VLM outputs that matter for downstream use are:

- `docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json`

Those outputs are already non-empty and bundleable. The checked-in evidence bundle rollup is:

- `bundles_planned = 17`
- `ocr_lane = 15`
- `review_lane = 2`
- `lazy_attach_original_image = 17`

Bundle artifact:

- `docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json`

This means the pilot is no longer in the old failure posture where `17/17` rows collapsed into empty-shell `review_lane` triage.

### 2. Paper-backed recovery and downstream hydration both run

The closure flow now succeeds through these stages:

- evidence bundle build
- paper-question registry backfill
- question analysis backfill
- gate rerun

During the fresh local rerun on 2026-04-16:

- `paper_question` registry backfill processed `17`, updated `17`, conflicts `0`
- question analysis backfill processed `17`, backfilled `17`, skipped `0`
- `QuestionClassified` events were emitted for all `17/17` backfilled rows

### 3. The focused `9709` gate is green

Fresh gate result file:

- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json`

Fresh gate report:

- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md`

Actual metrics:

- `exact_structured_match_rate = 1`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 1`
- `null_summary_rate = 0`
- `gate_pass = true`

Pinned paper-backed cases that now pass:

- `9709/s19_qp_11/questions/q06.png`
- `9709/s16_qp_33/questions/q07.png`

### 4. The slice is green for the right reason

The current pass state is not a papered-over green.

The earlier red phase failed with:

- `review_lane = 17/17`
- `summary = null` for all rows
- empty downstream descriptor surface

The current green phase passes because:

- wave-1 evidence is non-empty and stable
- bundle assembly succeeds over real evidence
- paper-backed hydration synthesizes usable summary and retrieval text
- projection rows expose the metadata the gate actually checks

That means the red-to-green transition happened by closing real contracts, not by relaxing thresholds.

## What Changed Between The Old Red State And The New Green State

The old red state had already solved one problem:

- manifest-backed `paper_question` rows existed
- curriculum nodes existed
- imported fallback fixtures still worked

But it still failed because:

- paper-backed prompt/search hydration was incomplete
- local closure execution was ad hoc
- WSL could not reliably reach the local Supabase DB
- the `SUPABASE_PG_COMPAT` compatibility layer was incomplete for the real closure path

The current green state exists because all of the following are now true:

- paper-backed `question_bank` hydration is evidence-driven, not descriptor-row-dependent
- `search_text` synthesis is retrieval-oriented enough for the gate fixtures
- the local closure flow is productized instead of being a one-off shell sequence
- host-side PowerShell runners handle the PG-compatible backfill steps
- gate runner can use Docker-backed `psql`
- PG compat now supports both `.is(...)` chains and the JSONB bindings required by:
  - `question_bank`
  - `learning_question_analysis_snapshots`
  - `learning_question_events`

## Productized Local Closure Path

The standardized runner is:

```bash
node scripts/learning/run_9709_wave1_search_closure.js
```

The runner now executes a fixed 4-step flow:

1. `run_question_evidence_bundle_v1.js`
2. `run_paper_question_registry_backfill_host.ps1`
3. `run_question_analysis_backfill_host.ps1`
4. `run_question_search_gate.js --psql-mode docker`

This is the key difference from the earlier state. The slice no longer depends on remembering an improvised combination of:

- manual `docker exec ... psql`
- ad hoc host/WSL switching
- one-off local verification commands

## Environment Posture

The code and reports are now in a good state, but the local environment still has two caveats that should be treated as real, not cosmetic:

### 1. `supabase db reset` is not healthy in this shell

The direct CLI path was blocked by a broken `npx`/postinstall flow behind the local `supabase` wrapper.

For the 2026-04-16 fresh local rerun, the safer workaround was:

- inspect the local migration table directly in Docker
- detect that the local DB was missing the four `202604*` migrations
- apply those migrations directly into the local Docker-backed DB

That was enough to achieve an honest rerun, but it does mean the local CLI reset path itself still needs separate repair.

### 2. WSL is still not the right execution surface for every DB-backed step

In this session:

- WSL could not reliably connect to local `127.0.0.1:54322`
- Windows host PowerShell could reach that port
- Docker-backed `psql` worked from WSL when run through `docker exec`

That is why the standardized closure path is intentionally mixed-surface:

- host PowerShell for PG-compat backfill steps
- WSL + Docker `psql` for the gate

## What Is Still Not Fully Closed

Even though the minimal loop is green, several things remain deliberately out of scope for the claim being made here.

### 1. This is not yet the full `9709` completion story

The currently proven closure is:

- real wave-1 evidence for the `17` paper-backed rows
- honest green gate behavior for the pinned `9709` fixture cases

The following are still larger follow-up work, not part of the proven closure:

- expanding the same approach to broader search fixtures beyond the pinned pilot cases
- generalizing the mixed-surface local runner into a reusable framework
- cleaning up workstation-specific execution quirks so the whole flow runs from one surface

### 2. Diagram-heavy live coverage is still thin

The pilot proved that structured evidence extraction now works and does not collapse into null summaries. It did **not** prove that `diagram_lane` has been broadly exercised against a larger set of geometry, graphs, or table-heavy pages.

For this reason, the correct statement is:

- `ocr_lane` and `review_lane` are proven usable for the checked `9709` slice
- `diagram_lane` still needs broader live coverage before broader claims are made

### 3. Local infrastructure still has rough edges

The green rerun did not magically make the local stack clean.

Known rough edges still include:

- `supabase db reset` remains unreliable in this shell
- WSL localhost connectivity to the local Supabase port is still inconsistent
- the pilot relies on a mixed Windows-host plus WSL plus Docker execution posture

## Artifact Inventory

### Source evidence

- `docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json`

### Bundle artifact

- `docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json`

### Final gate artifacts

- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json`
- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md`

### Supporting earlier reports

- `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
- `docs/reports/2026-04-16-9709-question-search-wave1-closeout-report.md`

## Code Status

The closure-runner and compatibility work that established this green rerun landed in:

- `e12b556` `fix(search): hydrate 9709 paper-question descriptors and rerun gate`
- `3c8e82a` `fix(search): productize 9709 local closure runner`
- `f73a97a` `fix(search): harden pg-compat closure rerun`

Open PR:

- `https://github.com/Samsen879/ciecopilot-home/pull/210`

## Merge Readiness

The `9709` pilot is now in a merge-review posture, not a rescue posture.

That means:

- the branch has enough evidence to justify review and merge discussion
- AO can resume downstream generalization thinking from a green pilot instead of from a red unknown
- any remaining work before merge is about confidence, portability, and cleanup, not about whether the core loop fundamentally works

## What This Does And Does Not Prove

### Proven now

- `9709` has a real, replayable minimal complete loop
- the wave-1 VLM evidence is sufficient for downstream AO-oriented hydration
- imported browser-fixture fallback cases remain intact
- the pinned paper-backed search cases now pass with real local execution

### Not proven yet

- that every future subject can reuse the same route mix without adjustment
- that `supabase db reset` is healthy in this workstation
- that a fresh second VLM rerun today would produce materially different or better `9709` evidence than `v4`
- that `diagram_lane` has broad enough live coverage beyond the checked probe/pilot scope

## Recommended Next Step

The slice is now in the correct state to hand back to AO.

AO should treat this as:

- not a VLM rescue problem anymore
- not a prompt-only experiment anymore
- a stable pilot closure that can now support broader synthesis and generalization work

Immediate AO-worthy follow-up:

1. decide what parts of the `9709` closure runner should be generalized into a broader local recovery framework
2. decide whether to merge the mixed-surface local runner as-is or wrap it with a cleaner preflight layer
3. expand beyond the `9709` pilot only after preserving the same evidence-first, replayable contract

## Recommended Human Reading Order

If someone needs to understand the state quickly without replaying the whole history, the most useful order is:

1. this document for the current claim and its boundary
2. `docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json` for the stable VLM evidence source
3. `docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json` for the normalized machine-consumable bundle surface
4. `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md` for the final gate outcome

## Honest Bottom Line

On 2026-04-16, the `9709` slice crossed the line from:

- "real assets were executed, but the slice is still red"

to:

- "the pilot has a real minimal complete loop, and the focused gate is green"

That is enough to unblock downstream AO work.
