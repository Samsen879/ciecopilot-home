# PRD Learning Runtime Foundation Bridge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** historical bridge / non-normative after contract freeze

**Document precedence:** [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md) > [2026-03-20-prd-learning-runtime-contract-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md) > [2026-03-20-prd-learning-runtime-pilot-slice-execution.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md) > this bridge doc.

**Use of this document now:** stage rationale, sequencing context, and historical bridge only. Do not treat it as the active runtime contract or the active execution task list once the downstream contract and pilot execution docs are frozen.

**Goal:** Close the largest gap between the current codebase and PRD v4.1 by shipping the first PRD-aligned, `9709`-first learning runtime slice: session-centric AskAI, conservative learning-state orchestration, topic workspace, artifact inbox/pin flow, and review queue entry for a tightly scoped pilot.

**Architecture:** Reuse the existing low-level primitives that are already real and tested: `curriculum_nodes`, `question_bank`, `question_concept_links`, the Evidence Ledger (`attempts -> mark_runs -> mark_decisions -> error_events`), `user_learning_profiles`, `error-book`, and the current RAG boundary/evidence stack. Do **not** stretch the old Study Hub / Learning Path / `ai_tutoring_sessions` product model into the PRD runtime; instead, add a new learning-runtime domain layer that wraps existing primitives with PRD contracts (`Study Session`, `active_scope_bundle`, `Workspace`, `Artifact`, `ReviewTask`, reconciliation, non-released fallback).

**Tech Stack:** React + Vite, Node API handlers, Supabase/Postgres migrations + RPC/read models, Jest + Python tests, existing RAG/marking/evidence-ledger infrastructure.

---

## Chunk 1: Current-State Truth And Stage Decision

### What is already real and reusable

- `api/rag/**` is the active AskAI backend surface, with strong boundary handling, evidence assembly, telemetry, and subject/topic containment.
- `api/marking/evaluate-v1.js` plus `api/marking/lib/**` already provides a real online scoring path backed by the Evidence Ledger.
- `attempts`, `mark_runs`, `mark_decisions`, `error_events`, `question_bank`, `question_concept_links`, and `user_learning_profiles` form a real lower-layer learning evidence base.
- `api/evidence/context.js` already exposes a thin evidence-context read model from `user_learning_profiles`, `attempts`, `mark_runs`, and `error_events`.
- `api/error-book/**` is a real service/read model, not a mock.
- `tests/evidence-ledger/**`, `tests/aggregation/**`, `tests/error-book/**`, and `api/rag/__tests__/**` give the current codebase meaningful contract coverage.

### What is currently legacy or structurally misaligned with the PRD

- `src/pages/AskAI.jsx` and `src/components/ChatPanel.jsx` are still chat-first shells, not PRD `Study Session` containers.
- `src/pages/StudyHub.jsx` and `src/components/AI/PersonalizedRecommendations.jsx` still reflect the old Study Hub / recommendations product shape.
- `src/pages/LearningPath.jsx` and `src/components/learning-path/**` still use topic-level mastery / path-snapshot semantics rather than PRD `Question Family -> Question Type -> Variant Tags`.
- `supabase/migrations/20260118091100_010_study_hub_extension.sql` introduces older tables like `ai_tutoring_sessions`, `study_mode_questions`, and enhanced study-hub surfaces that do not match the PRD runtime contract.
- There is no real `Study Session`, `active_scope_bundle`, `lineage`, `Workspace`, `Artifact Inbox`, `ReviewTask`, or PRD-aligned `Question Family / Question Type` layer.

### Stage decision

The next major stage should **not** be “more RAG” and **not** be “more marking families” in isolation.

The next major stage should be:

> **PRD Runtime Foundation Bridge**

This stage exists to turn the current stack from a set of strong but disconnected primitives into the first PRD-aligned learning system slice.

### Explicit non-goals for this stage

- Full multi-subject parity.
- Whole-paper deterministic marking.
- Full Math taxonomy coverage across all families.
- Mobile companion, handwriting, freeform canvas, or community expansion.
- Rebuilding the old Study Hub / Learning Path product surfaces as the canonical future architecture.
- Replacing the current RAG backend or marking ledger instead of wrapping and reusing them.

### Stage cutline

This stage is complete only if the system can support one real PRD-aligned vertical slice:

1. Enter a learning session from a valid anchor (`concept`, `question`, `review_task`, `artifact`, or `workspace_slot`).
2. Run AskAI through a stored `Study Session` with `active_scope_bundle`.
3. Produce conservative learning-state effects from scoring or fallback diagnostics.
4. Surface a topic workspace with stable slots plus review queue entry.
5. Preserve reconciliation and non-released fallback behavior end to end.

## Chunk 2: Canonical Product/Domain Decisions For This Stage

### Decision A: new PRD runtime tables/services, not legacy Study Hub tables

Do not extend `ai_tutoring_sessions`, `learning_paths`, `personalized_recommendations`, or `study_mode_questions` into the PRD runtime.

Use them only as:

- compatibility surfaces,
- migration references,
- or legacy UI data sources during transition.

The PRD-aligned runtime needs its own canonical domain layer.

### Decision B: reuse the evidence ledger as the lower truth layer

The Evidence Ledger already captures the right raw chain:

- `Attempt`
- `MarkingResult`-adjacent run state
- decision rows
- misconception/error events

This stage should **not** invent a parallel scoring-history system.

Instead:

- keep `Attempt` / `MarkingResult` history versioned,
- build learning-state orchestration on top,
- and add PRD-level reconciliation/read models above it.

### Decision C: ship one pilot family slice, not all theoretical scope

The PRD names three released families for Phase 1B, but the runtime foundation should not assume they are all equally ready for the first PRD-aligned slice.

Stage 0 inside this phase must freeze:

- the pilot subject: `9709`
- the pilot family set: one strongest released family first, with optional expansion to the rest only after runtime proof
- the exact `Question Family / Question Type / Variant Tags` seed set used by the slice

The right default is:

- build runtime contracts once
- prove them on one family slice
- then widen family coverage without changing runtime semantics

### Decision D: canonical home is part of the architecture, not a UX detail

This stage must treat `canonical home` and `secondary reference` as first-class architecture constraints.

That means:

- the workspace read model,
- review queue ownership,
- artifact storage,
- and AskAI retrieval semantics

must all share the same canonical-home rule.

## Chunk 3: Main Lines

### Line 1: Learning Domain And Persistence Foundation

**Purpose:** create the canonical PRD-aligned storage and read/write contracts that every later slice depends on.

**Why this line is first and mostly serial:**

- session runtime cannot stabilize before anchors, scope bundles, and lineage exist as persisted contracts
- workspace/review/artifact ownership cannot stabilize before canonical-home rules are encoded
- orchestration cannot be correct if it is built on ambiguous IDs or legacy table semantics

**Deliverables:**

- new persistence/read models for:
  - `learning_sessions`
  - `learning_session_lineage` or equivalent handoff package persistence
  - topic `workspaces`
  - `artifacts` plus inbox/pinned/revised/superseded states
  - `review_tasks`
  - minimal `question_family` / `question_type` / variant-tag seed structures for the pilot slice
- `current_anchor_kind` / `current_anchor_ref` support at the API contract level
- `active_scope_bundle` persistence and read model
- `canonical_home_topic` and `secondary_reference` representation
- migration/backfill strategy for reusing:
  - `curriculum_nodes`
  - `question_bank`
  - `question_concept_links`
  - evidence-ledger tables
  - `user_learning_profiles`

**Likely file areas:**

- Create: `supabase/migrations/*learning_runtime*`
- Create: `api/learning/**`
- Modify: [api/_runtime/route-registry.js](/home/samsen/code/ciecopilot-home/api/_runtime/route-registry.js)
- Modify or wrap: `api/evidence/**`
- Add read-model tests under `api/learning/__tests__/**` and `tests/**`

**Parallelism:** do **not** split this line too early. Freeze schema and ownership rules first. After the contract is stable, follow-on backend/frontend work can branch.

### Line 2: Session Runtime And AskAI Integration

**Purpose:** turn AskAI from a route-scoped chat endpoint into a PRD `Study Session` runtime.

**Deliverables:**

- a session-aware AskAI entry path that:
  - resolves `current_anchor_kind` / `current_anchor_ref`
  - persists and reloads `Study Session`
  - attaches `active_scope_bundle`
  - reads relevant evidence/workspace context
  - supports questionless entry
- session summary and handoff/lineage mechanics
- minimal internal compaction / suggested handoff / explicit new-session flow
- consistent non-released fallback response semantics on imported questions
- compatibility wrapper so current `api/rag/ask` logic can be reused rather than reimplemented

**Likely file areas:**

- Modify or wrap: [api/rag/lib/ask-service.js](/home/samsen/code/ciecopilot-home/api/rag/lib/ask-service.js)
- Create: `api/learning/sessions/[id]/ask.js` or equivalent runtime service
- Create: `api/learning/lib/session-runtime/**`
- Modify: [src/components/ChatPanel.jsx](/home/samsen/code/ciecopilot-home/src/components/ChatPanel.jsx)
- Modify or replace: [src/pages/AskAI.jsx](/home/samsen/code/ciecopilot-home/src/pages/AskAI.jsx)

**Dependencies:** depends on Line 1 contracts.

**Parallelism:** once Line 1 contracts are frozen, backend runtime work and frontend session-shell work can proceed in parallel with a shared API contract.

### Line 3: Learning Loop Orchestration

**Purpose:** convert raw evidence into PRD-aligned conservative learning state.

**Deliverables:**

- pilot-slice `Question Family / Question Type / Variant Tags` seed and lookup path
- mapping from marking/fallback outputs into:
  - provisional signals
  - family-level low-weight signals
  - allowed type-level updates for released scope only
- review task generation and queue ownership rules
- artifact suggestion / inbox promotion rules
- reconciliation triggers and recovery behavior for:
  - reclassification
  - rubric-version changes affecting judgement
  - marking correction
- upgraded evidence context / learning read model for the new UI

**What should be reused instead of replaced:**

- `scripts/aggregation/aggregate-learner-profiles.js`
- `api/evidence/context.js`
- `api/error-book/**`
- `api/marking/lib/ledger-orchestrator.js`

**What must change conceptually:**

- topic-level percentage mastery is no longer the public or orchestration truth
- recommendations cannot remain the primary review/orchestration engine
- error-book indexing becomes one input, not the whole learning state

**Likely file areas:**

- Modify: [api/marking/evaluate-v1.js](/home/samsen/code/ciecopilot-home/api/marking/evaluate-v1.js)
- Modify: `api/marking/lib/**`
- Modify: [api/evidence/context.js](/home/samsen/code/ciecopilot-home/api/evidence/context.js)
- Modify: [api/error-book/lib/error-book-service.js](/home/samsen/code/ciecopilot-home/api/error-book/lib/error-book-service.js)
- Create: `api/learning/lib/mastery/**`, `api/learning/lib/review/**`, `api/learning/lib/artifacts/**`
- Add tests under `tests/aggregation/**`, `tests/evidence-ledger/**`, and new `api/learning/__tests__/**`

**Dependencies:** depends on Line 1. Some parts also depend on Line 2 response/session shapes.

**Parallelism:** after Line 1, the mastery/review/artifact orchestration workers can proceed in parallel with Line 2, as long as contracts are frozen.

### Line 4: Product Surface And Release Hardening

**Purpose:** expose the new runtime through a real product surface and prove it is safe enough to become the new mainline entry for the pilot slice.

**Deliverables:**

- a new session-centric learning container page
- topic workspace page with stable slots:
  - `Overview / Map`
  - `Core Method / Derivation`
  - `Canonical Worked Example`
  - `Common Traps`
  - `My Notes`
  - `Review Queue`
- artifact inbox/pin flow
- review queue entry and post-mark review entry
- replacement or demotion strategy for:
  - old `StudyHub`
  - old `AskAI`
  - old topic-level `LearningPath`
- release gates for:
  - non-released fallback
  - reconciliation correctness
  - canonical-home consistency
  - questionless session entry
  - one full pilot slice end-to-end

**Likely file areas:**

- Modify or replace: [src/pages/StudyHub.jsx](/home/samsen/code/ciecopilot-home/src/pages/StudyHub.jsx)
- Modify or replace: [src/pages/AskAI.jsx](/home/samsen/code/ciecopilot-home/src/pages/AskAI.jsx)
- Modify or deprecate: [src/pages/LearningPath.jsx](/home/samsen/code/ciecopilot-home/src/pages/LearningPath.jsx)
- Create: `src/pages/learning-runtime/**`
- Create: `src/components/learning-runtime/**`
- Modify: [src/App.jsx](/home/samsen/code/ciecopilot-home/src/App.jsx)
- Add contract/integration tests across frontend entry and API boundaries

**Dependencies:** depends on Line 2 contracts and enough of Line 3 to expose meaningful state.

**Parallelism:** this line can begin once session/runtime API contracts are frozen. It should not begin before Line 1 is stable.

## Chunk 4: Parallelism And Execution Order

### Serial trunk that should not be split

These items must be done in order:

1. Freeze pilot scope and pilot family seed set.
2. Freeze canonical learning-runtime schema and API contracts.
3. Freeze canonical-home and questionless-session semantics.

If these three are unstable, parallel implementation will create mergeable code with incompatible behavior.

### Safe parallel block A

After the serial trunk is frozen:

- backend session/runtime API work
- backend mastery/review/artifact orchestration work

can run in parallel, as long as both teams consume the same contract document.

### Safe parallel block B

After the session/runtime API contract is stable:

- frontend session shell
- frontend workspace shell
- compatibility routing / legacy-page demotion

can run in parallel with backend hardening.

### Work that should remain cross-cutting, not “parallel for the sake of it”

- migration review
- reconciliation correctness
- release gating
- contract tests
- terminology consistency

These should be treated as a quality track across every line, not as a fake independent workstream.

## Chunk 5: What “Done” Means For This Stage

The stage is done only when all of the following are true:

- A user can start a `Study Session` from a concept, question, review task, artifact, or workspace slot without fake question IDs.
- AskAI consumes persisted `active_scope_bundle` and session anchor state instead of only route-derived subject scope.
- Imported questions outside released scoring scope follow `non-released fallback` end to end.
- One pilot family slice produces:
  - session runtime behavior,
  - conservative learning-state updates,
  - review-task generation,
  - artifact inbox candidates,
  - workspace revisitability.
- Mixed-scope ownership is stable:
  - canonical-home objects are unique,
  - secondary references are linked, not duplicated.
- Reclassification / rubric correction / marking correction can trigger reconciliation without silent user-visible truth drift.
- The product has a new primary learning surface for the pilot slice; old pages are no longer the implied long-term architecture.

## Chunk 6: Historical Next Actions At Bridge Time

Do not use this chunk as a live checklist anymore. These were the correct next actions when this bridge was written, and they are now resolved or superseded by the frozen downstream docs.

- Completed: freeze the pilot family slice based on strongest existing rubric/test coverage.
  Outcome: first scoring-enabled pilot family is fixed in [2026-03-20-prd-learning-runtime-contract-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md).
- Completed: write the runtime contract doc before code changes start.
  Outcome: [2026-03-20-prd-learning-runtime-contract-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md) is now the normative runtime contract.
- Completed: treat legacy Study Hub / Learning Path tables and pages as compatibility only unless a concrete reuse case is explicitly proven.
  Outcome: that rule is now frozen in the contract doc and enforced in the pilot execution plan.
- Superseded by downstream execution plan: start implementation from Line 1, not from UI polish and not from recommendation tuning.
  Active source: [2026-03-20-prd-learning-runtime-pilot-slice-execution.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md).
- Carried forward as rollout policy: keep every new slice behind feature flags until one end-to-end pilot flow is verified.

## Chunk 7: Practical Guidance For Multi-Agent Execution

Use multiple agents only after the serial trunk is frozen.

Worker split and sequencing in this bridge are illustrative only. Use the frozen execution plan as the authoritative source for ownership boundaries and task order.

Good parallel splits:

- backend session/runtime APIs vs backend learning-state orchestration
- frontend session container vs frontend workspace container
- read-model/reconciliation tests vs UI integration tests

Bad parallel splits:

- two agents inventing competing schemas for sessions/workspaces/review tasks
- frontend and backend both guessing `active_scope_bundle` shape
- multiple agents independently redefining question family/type semantics

Quality-first rule for this stage:

- if a line cannot be parallelized without inventing contract ambiguity, keep it serial
- correctness of ownership, fallback, and reconciliation matters more than throughput

---

Plan complete and saved to `docs/superpowers/plans/2026-03-20-prd-learning-runtime-foundation-bridge.md`. Ready to execute?
