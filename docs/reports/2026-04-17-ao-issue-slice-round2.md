# AO Round 2 Issue Slice

**Date:** 2026-04-17  
**Status:** created on GitHub  
**Stage baseline:** `Phase C-release tranche: 9709 Closed-Loop Release Readiness`  
**Tracker:** `#227`  
**Primary planning docs:**  
- `docs/superpowers/specs/2026-04-17-9709-closed-loop-release-readiness-design.md`  
- `docs/superpowers/plans/2026-04-17-9709-closed-loop-release-readiness.md`

## Purpose

This document records the second AO issue slice after `#211-#218`, treating that earlier batch as complete and gated.

This round is designed to convert the frozen contract surface into one feature-flagged, release-ready `9709` closed loop.

## Tracker

- `#227` 9709 Closed-Loop Release Readiness Tracker

## Issue Set

### Issue A

- `#228` Runtime Effects 1/2: materialize `LearningUpdateProposed` into idempotent downstream effect receipts

**Role**

Build the downstream effect engine and persisted receipt/debt state so `LearningUpdateProposed` stops being a dead-end contract.

### Issue B

- `#229` Runtime Effects 2/2: wire downstream effect execution into bridge and reconciliation paths

**Role**

Connect the effect engine to the real bridge path without violating the frozen best-effort request-path success rules.

### Issue C

- `#230` 9709 Adapter Runtime: execute pilot `adapter_method` contracts in marking runtime

**Role**

Make the approved `9709` pilot rubric templates runtime-executable rather than only schema-valid.

### Issue D

- `#231` Artifact Content Activation: persist body/version content and materialize renderable pilot artifacts

**Role**

Turn pilot artifacts into real content-bearing, versioned learning objects that can occupy workspace slots.

### Issue E

- `#232` Scheduler Core Upgrade: replace simplified route weights with a bounded P1 factor model for 9709

**Role**

Upgrade the real `9709` release slice from the current simplified route heuristic to a bounded factor-based scheduler plus minimal runtime state.

### Issue F

- `#233` Closed-Loop Release Gate: prove feature-flagged 9709 release readiness end to end

**Role**

Own the final proof surface: fixture, gate, flags, and release-readiness report.

## Dependency Graph

1. `#228` can start immediately.
2. `#229` depends on `#228`.
3. `#230` depends on `#228`.
4. `#231` depends on `#228` and assumes `#214/#215` are already complete.
5. `#232` depends on `#228` and `#229`.
6. `#233` depends on `#229`, `#230`, `#231`, and `#232`.

## Recommended Execution Order

1. `#228`
2. `#229`
3. `#230`
4. `#231`
5. `#232`
6. `#233`

## Parallelism Notes

- `#230` can begin once `#228` has stabilized enough to define the runtime execution contract.
- `#231` can run partly in parallel with `#229/#230`, because it primarily depends on artifact lifecycle/residency being already settled and on runtime effect outputs becoming real.
- `#232` should not close before `#229`, because the upgraded scheduler needs real downstream review generation inputs.
- `#233` is intentionally the final integration issue and should not be used as a place to redesign earlier contracts.

## Explicitly Excluded From This Slice

- graph schema or graph-driven product features
- broad explainability work beyond release evidence needs
- `9702` / `9231` authoritative rollout
- homepage / browse IA redesign
- broad frontend visual redesign

## Interpretation

Round 2 is not a generic runtime cleanup batch.

It is the smallest issue slice that can turn the current frozen `9709` runtime contracts into one behind-flag closed loop that AO can prove as release-ready.
