# 9709 Closed-Loop Release Readiness Design

**Date:** 2026-04-17  
**Status:** planning baseline  
**Scope:** Define the next AO stage after `#211-#218` are assumed complete and gated.  
**Audience:** AO / Codex / future implementation workers / reviewer AI

## 1. Authority And Assumptions

This design is downstream of these already-read authority documents:

- `docs/reports/2026-04-11-ao-next-phase-execution-roadmap.md`
- `docs/reports/2026-04-12-phase-a-product-decision-record.md`
- `docs/reports/2026-04-14-phase-a-reassessment-report.md`
- `docs/reports/2026-04-16-ao-execution-decision-alignment.md`
- `docs/reports/2026-04-16-ao-issue-slice-round1.md`

This stage definition assumes:

- `#211-#218` are complete, merged, and have passed their focused gates
- Phase A contract landing remains accepted as complete at the contract boundary
- graph / explainability expansion / second-subject rollout stay out of scope for this stage
- the target end-state is **feature-flagged and release-ready**, not default-on

## 2. Stage Definition

The next stage should not be treated as a pure roadmap Phase B or a pure roadmap Phase C.

It is better defined as a convergence tranche:

> **Phase C-release tranche: 9709 Closed-Loop Release Readiness**

This tranche has two deliberate workstreams:

1. **External milestone**
   Make the `9709` pilot families run as a real single-subject closed loop that is ready to release behind flags.
2. **Internal convergence**
   Continue runtime-core deepening, but only where that work directly reduces the release risk of the `9709` closed loop.

This stage is intentionally not "finish all remaining runtime theory." It is a bounded release-readiness stage that forces AO to stop carrying placeholder contracts without execution.

## 3. Goals

By the end of this stage, the system should support a real, auditable, behind-flag `9709` loop:

1. A released-scope `9709` attempt can move from request intake into a durable attempt event stream.
2. `LearningUpdateProposed` no longer stops as a dead-end contract; it drives real idempotent downstream materialization.
3. Pilot rubric templates with `adapter_method` fields are backed by a real execution path instead of schema-only readiness.
4. Review generation stops depending on the current simplified scheduler routes and moves to a bounded P1-style factor model.
5. Artifact candidates become renderable, versioned learning objects for pilot topics instead of long-lived metadata shells.
6. AO can prove the whole loop with an explicit release gate, report, and residual-risk ledger.

## 4. Explicit Non-Goals

This stage should explicitly avoid the following:

- no graph schema expansion as a primary deliverable
- no new mastery/review explainability product surface beyond what is already needed for scheduler/release evidence
- no `9702` or `9231` authoritative rollout
- no homepage / browse IA redesign
- no teacher-facing workflow expansion
- no broad frontend visual redesign
- no attempt to make every historical runtime surface elegant before the loop is releasable

## 5. Exit Gate

This stage should only be considered complete when all of the following are true:

1. **Durable downstream effect application exists**
   A successful `evaluate-v1` run can progress from:
   `AttemptSubmitted -> QuestionClassified -> MarkingCompleted -> LearningUpdateProposed`
   into real, idempotent downstream effects and receipts for:
   - mastery updates
   - durable review task writes
   - artifact candidate generation

2. **9709 pilot marking is executable by contract**
   The 4 approved pilot question types are no longer only "validated templates"; they are backed by a narrow but real `adapter_method` execution layer tied into runtime marking.

3. **Scheduler core is upgraded enough for release readiness**
   The `9709` released slice uses a factor-based scheduler that includes at least:
   - freshness
   - overdue pressure
   - band vulnerability
   - trigger urgency
   - exam proximity
   - regression severity

   The current route-weight-only scheduler may remain as a compatibility layer, but it must no longer be the real decision baseline for this slice.

4. **Artifact content is materially usable**
   Pilot workspace slots no longer rely on long-lived `missing_artifact_content` posture once candidate artifacts are verified/released. Artifact body, version, and lineage behavior must be real.

5. **A closed-loop release gate passes**
   A single repeatable `9709` gold scenario proves:
   - request intake
   - scoring
   - attempt-event persistence
   - downstream materialization
   - scheduler output
   - workspace artifact projection

6. **Rollout remains gated**
   New behavior is exposed behind explicit feature flags, with:
   - a focused gate
   - a phase report
   - a residual-risk section

## 6. Workstream Structure

### 6.1 Workstream A: Runtime Effect Materialization

This workstream closes the largest remaining gap after `#211-#218`.

If Issue A/B/C land the attempt bridge and authority posture correctly, the next missing piece is not another contract doc; it is actual downstream effect application.

Required deliverables:

- an idempotent effect engine that consumes `LearningUpdateProposed`
- durable effect receipts or equivalent persisted outcomes
- dedupe across:
  - event append
  - effect execution
  - replay / retry / reconciliation
- non-blocking failure posture preserved from the bridge layer

This is the backbone workstream. Without it, there is no real closed loop.

### 6.2 Workstream B: 9709 Adapter Runtime Execution

Phase A established executable rubric structure, but runtime execution debt remained open.

This workstream must land:

- a narrow `adapter_method` dispatcher
- binding from pilot rubric templates into actual runtime execution
- explicit authoritative vs conservative execution outcomes for the approved `9709` pilot families

This should stay deliberately narrow:

- only the approved pilot families
- only the adapter methods actually needed for them
- no speculative abstraction for future subjects

### 6.3 Workstream C: Artifact Content Activation

Issues `#214/#215` are assumed to finish lifecycle/residency semantics. That still does not make the artifact layer product-usable.

This workstream must add:

- artifact body storage
- artifact version storage
- rendered-content projection
- candidate artifact materialization from runtime effects
- lineage/supersede behavior that works with the lifecycle and residency contracts already landed

This is the minimum needed to stop the workspace from remaining a shell-driven product.

### 6.4 Workstream D: Scheduler Core Upgrade And Minimal Orchestration

This workstream exists because release-readiness cannot sit on top of the current simplified scheduler forever.

Required deliverables:

- a bounded P1-style factor model for `9709`
- active-task dedupe and stable target identity working with the new factor model
- minimal `phase + mode` runtime semantics only where needed to support:
  - marking
  - learning update
  - review generation

This stage does not need the full theoretical P7 surface, but it does need enough orchestration to stop being a loose collection of services.

### 6.5 Workstream E: Closed-Loop Gate And Rollout Package

This workstream owns the proof surface:

- a reusable closed-loop fixture
- a gate runner
- a release-readiness report
- feature-flag exposure in the relevant runtime/session surfaces

Its job is not to invent new behavior. Its job is to make the stage objectively shippable.

## 7. Recommended Execution Tranches

### Tranche 1: Runtime Effects Base

**Primary outcome:** `LearningUpdateProposed` can drive real downstream effect application.

Scope:

- effect engine
- effect receipts / dedupe
- request-path or reconciliation-path invocation contract

This tranche is the first critical-path block.

### Tranche 2: 9709 Adapter Execution

**Primary outcome:** pilot rubric contracts execute through a real dispatcher.

Scope:

- narrow adapter-method dispatch
- `evaluate-v1` integration
- pilot family fixtures

This tranche can begin in parallel with the latter half of Tranche 1, but cannot close before Tranche 1's effect contract is stable.

### Tranche 3: Artifact Content Layer

**Primary outcome:** candidate artifacts become versioned, renderable learning objects.

Scope:

- schema
- repository/service
- workspace projection compatibility

This tranche can start in parallel after lifecycle/residency semantics are treated as done from `#214/#215`.

### Tranche 4: Scheduler Core Upgrade

**Primary outcome:** released `9709` review generation uses a factor model instead of the current simplified route heuristic.

Scope:

- factor-based scheduler
- minimal orchestration state
- repository/service convergence

This tranche should start once the effect engine output contract is stable enough to generate real review work.

### Tranche 5: Release Gate And Rollout

**Primary outcome:** the whole `9709` loop is provably release-ready behind flags.

Scope:

- closed-loop fixture
- gate runner
- report
- final flag exposure

This tranche is final integration, not the place to keep designing contracts.

## 8. Recommended First Execution Batch For AO

AO should not try to open the whole stage at once. The first batch should be:

1. **Runtime Effects 1/2**
   Land the effect engine contract and idempotent receipts.
2. **Runtime Effects 2/2**
   Wire effect execution into the bridge/reconciliation path and prove non-blocking failure posture.
3. **9709 Adapter Runtime 1/2**
   Land dispatcher + pilot method coverage.
4. **Artifact Content 1/2**
   Add body/version schema and repository/service contract.

That first batch gives the stage a real spine. It is the minimum useful base before the scheduler-core and final release-gate work.

## 9. Main Risks And Controls

### Risk 1: Scope drift into Phase D/E

Control:

- reject graph, expanded explainability, and second-subject work in this stage
- keep every issue tied to the `9709` closed-loop release gate

### Risk 2: Runtime-core work detaches from the release milestone

Control:

- any runtime-core issue must state which release gate row it unlocks
- reject infrastructure work that cannot name a direct release-readiness dependency

### Risk 3: Artifact work stalls at metadata again

Control:

- do not count lifecycle/residency semantics as artifact completion
- require body/version/render projection in the stage gate

### Risk 4: Scheduler work becomes a research rewrite

Control:

- land only the bounded P1 factor set needed for the `9709` slice
- do not fold graph-derived recommendation logic into this stage

### Risk 5: Best-effort bridge semantics hide downstream failure

Control:

- effect execution must produce durable receipts / debt state
- closed-loop gate must include a failure/retry scenario, not only the green path

## 10. Immediate AO Posture

AO's posture for this stage should be:

> **Release-readiness first, runtime convergence second, no Phase D/E bleed-through.**

The system already has enough frozen contract surface. The next stage should be about making those contracts run together as one `9709` loop that is safe to release behind flags.
