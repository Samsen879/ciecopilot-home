# PRD Learning Runtime Contract Design

**Date:** 2026-03-20
**Scope:** `9709`-first learning runtime foundation bridge
**Status:** frozen
**Document precedence:** [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md) > this contract doc > [2026-03-20-prd-learning-runtime-pilot-slice-execution.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md) > [2026-03-20-prd-learning-runtime-foundation-bridge.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-foundation-bridge.md)
**Depends on:** [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md)
**Historical input only:** [2026-03-20-prd-learning-runtime-foundation-bridge.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-foundation-bridge.md)

## Goal

Freeze the canonical runtime contract that all implementation agents must share before the next major development stage starts.

This document is intentionally narrower than the PRD and more concrete than the stage blueprint. It does not redefine product intent. It freezes the execution-time contract for:

- pilot scope
- canonical domain objects and IDs
- persistence boundaries
- API shapes
- ownership rules
- questionless session legality
- non-released fallback behavior
- reconciliation behavior
- legacy Study Hub demotion rules

## Normative Language

- `MUST`: required for correctness and mergeability
- `SHOULD`: default unless a concrete blocker is documented
- `MAY`: implementation freedom that does not change product behavior

## Locked Facts

1. The PRD already fixes the target object model around `Study Session`, `active_scope_bundle`, `Workspace`, `Artifact`, `ReviewTask`, and `Question Family -> Question Type -> Variant Tags` in [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md#L31).
2. The current codebase already has real lower-layer primitives:
   - AskAI backend in [api/rag/lib/ask-service.js](/home/samsen/code/ciecopilot-home/api/rag/lib/ask-service.js#L1)
   - online marking in [api/marking/evaluate-v1.js](/home/samsen/code/ciecopilot-home/api/marking/evaluate-v1.js#L1)
   - evidence context in [api/evidence/context.js](/home/samsen/code/ciecopilot-home/api/evidence/context.js#L43)
   - evidence ledger tables in [20260217100000_create_attempts_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100000_create_attempts_table.sql#L1), [20260217100001_create_mark_runs_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100001_create_mark_runs_table.sql#L1), [20260217100002_create_mark_decisions_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100002_create_mark_decisions_table.sql#L1), and [20260217100004_create_error_events_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100004_create_error_events_table.sql#L1)
3. The current product surface is still legacy/chat-first rather than PRD-runtime-first, as shown by [src/pages/AskAI.jsx](/home/samsen/code/ciecopilot-home/src/pages/AskAI.jsx#L14) and the older Study Hub schema in [20260118091100_010_study_hub_extension.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260118091100_010_study_hub_extension.sql#L53).
4. The PRD Phase 1B release envelope lists three released families in [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md#L2106), but the repo's blind marking eval coverage is not balanced:
   - `trigonometry` appears `37` times across `v2` + `v3` blind marking eval sets
   - `integration` appears `21` times
   - `differential_equations` does not appear in those blind marking eval sets, and is currently visible mainly in topic-link audit data

## Contract Scope

This contract governs the next major execution stage only.

It does **not** amend the PRD's long-term release envelope. It defines the first runtime slice that will be built now, under quality-first constraints.

## Explicit Legacy Position

`legacy Study Hub` is not an acceptable foundation for the new runtime.

### Hard rule

New runtime behavior `MUST NOT` be implemented by extending any of the following as canonical product truth:

- `public.ai_tutoring_sessions`
- `public.learning_paths`
- `public.personalized_recommendations`
- `public.study_mode_questions`
- the old Study Hub page flow
- the old Learning Path page flow

Relevant legacy schema currently lives in [20260118091100_010_study_hub_extension.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260118091100_010_study_hub_extension.sql#L53).

### Allowed legacy work

Legacy surfaces `MAY` only be touched for:

- compatibility reads during transition
- redirect or handoff routing
- deprecation messaging
- feature-flagged entry-point demotion
- telemetry needed to compare old vs new usage during rollout

### Forbidden legacy work

Legacy surfaces `MUST NOT` gain:

- new session runtime state
- new workspace truth
- new review queue truth
- new artifact lifecycle truth
- new mastery truth
- new reconciliation logic

If a proposed change needs one of those behaviors, it belongs in the new learning-runtime layer instead.

## Pilot Scope Freeze

### Subject

The pilot subject is fixed to `9709`.

### Released authoritative question types

The first runtime slice started with the trigonometry family, but the frozen released-scope contract is now defined by the promoted `9709` question types that pass the released-family evidence gate:

- `9709.trigonometry.identities`
- `9709.trigonometry.equations`
- `9709.integration.application`
- `9709.differential_equations.separable`

These promotions stay narrow:

- `Trigonometric manipulation / equations` remains fully released inside the runtime slice
- `Integration techniques` is released only for `9709.integration.application`
- `Differential equations` is released only for `9709.differential_equations.separable`
- broader `9709.integration.*` and `9709.differential_equations.*` variants remain explicit `non_released_fallback` until they earn separate release evidence

The current runtime slice `MAY` attach variant tags such as:

- `paper:p1`
- `paper:p3`
- `answer_form:exact`
- `answer_form:interval`
- `structure:identity_rewrite`
- `structure:solve_in_domain`

### Important clarification

For this stage:

- authoritative scoring is allowed only for the promoted released question types listed above
- pilot/released-scope membership alone is insufficient; released rubric, confidence, and validated uncertainty gates still apply
- non-promoted `9709` questions still go through the same runtime, but they remain `non_released_fallback`

This is an execution cutline, not a PRD contradiction.

## Canonical ID Contract

### UUID-backed runtime objects

The following objects `MUST` use UUID identities:

- `question_id`
- `attempt_id`
- `mark_run_id`
- `session_id`
- `workspace_id`
- `artifact_id`
- `review_task_id`
- `reconciliation_run_id`

### Stable semantic IDs

The following objects `SHOULD` use stable text IDs rather than UUIDs:

- `family_id`
- `question_type_id`
- `variant_tag`

Recommended initial IDs:

- `family_id = 9709.trigonometry_manipulation_equations`
- `question_type_id = 9709.trigonometry.identities`
- `question_type_id = 9709.trigonometry.equations`

### Topic IDs

Topic identity is frozen as:

- canonical ID: `curriculum_nodes.node_id`
- canonical path string: `curriculum_nodes.topic_path`

Agents `MUST NOT` use display titles as durable IDs.

## Canonical Ref Contract

Any field ending in `_ref` or `_refs` is a typed reference object, not a free-form string.

### Single-object refs

Frozen shapes:

```text
QuestionRef = { kind: "question", question_id: UUID }
QuestionTypeRef = { kind: "question_type", question_type_id: TEXT }
AttemptRef = { kind: "attempt", attempt_id: UUID }
MarkRunRef = { kind: "mark_run", mark_run_id: UUID }
ArtifactRef = { kind: "artifact", artifact_id: UUID }
ReviewTaskRef = { kind: "review_task", review_task_id: UUID }
ClassificationSnapshotRef = { kind: "classification_snapshot", classification_snapshot_id: UUID }
TopicRef = { kind: "topic", topic_id: UUID, topic_path: TEXT }
```

### Session lineage ref

Frozen shape:

```text
SessionLineageRef = {
  parent_session_id: UUID | null,
  handoff_kind: "internal_compaction" | "suggested_handoff" | "explicit_new_session" | null
}
```

### Anchor ref

`current_anchor_ref` is kind-dependent and frozen as:

```text
ConceptAnchorRef = { kind: "concept", topic_id: UUID, topic_path: TEXT }
QuestionAnchorRef = { kind: "question", question_id: UUID }
ReviewTaskAnchorRef = { kind: "review_task", review_task_id: UUID }
ArtifactAnchorRef = { kind: "artifact", artifact_id: UUID }
WorkspaceSlotAnchorRef = { kind: "workspace_slot", workspace_id: UUID, slot_key: TEXT }
```

### Ref arrays

`*_refs` fields are arrays of one of the frozen single-object ref shapes above.

## Canonical Object Contract

### 1. Question

Logical object: `Question`

Physical source of truth:

- base identity: `public.question_bank`, widened from a paper-mapping table into the canonical question registry for both paper-backed and imported questions
- concept/topic linking input: `public.question_concept_links`
- runtime classification sidecar: new learning-runtime table(s)

Base table exists in [20260217100006_create_question_bank_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100006_create_question_bank_table.sql#L1).

`Question` `MUST` expose at least:

```text
question_id
source_kind
subject_code
paper_scope
primary_topic_id
secondary_topic_ids
family_id
primary_question_type_id
secondary_question_type_ids
variant_tags
release_scope_status
classification_snapshot_ref
provenance_summary
```

Rules:

- imported/pasted questions `MUST` become durable `Question` objects before they can participate in review/artifact/mastery workflows
- the runtime `MUST NOT` keep imported questions as chat-only ephemeral payloads
- `question_bank` `MUST` be widened so imported questions do not depend on `(storage_key, q_number)` semantics
- `release_scope_status` `MUST` distinguish at least `released_scoring` vs `non_released_fallback`

### 2. QuestionAnalysisSnapshot

Logical object: `QuestionAnalysisSnapshot`

Purpose:

- freeze the classification and provenance state used by later scoring, review, artifact, and reconciliation logic

It `MUST` expose at least:

```text
classification_snapshot_id
question_id
primary_topic_id
secondary_topic_ids
family_id
primary_question_type_id
secondary_question_type_ids
variant_tags
classification_source
classification_confidence
candidate_rubric_refs
created_at
superseded_by_snapshot_id
```

Rules:

- this is versioned history, not mutable current-state overwrite
- a new classification result creates a new snapshot
- reconciliation works from snapshots, not from silent row mutation

### 2A. RubricReleaseRef

Logical object: `RubricReleaseRef`

Purpose:

- define the canonical rubric/version identifier used by question analysis, scoring, and reconciliation

Physical ownership boundary:

- rubric metadata remains owned by the marking layer and current rubric data sources
- the learning-runtime layer stores references to released rubric units, not rubric-point truth itself

Frozen shape:

```text
RubricReleaseRef = {
  kind: "rubric_release",
  rubric_set_id: TEXT,
  rubric_version_id: TEXT,
  scope_level: "family" | "question_type",
  release_state: "draft" | "validated" | "released"
}
```

Rules:

- `candidate_rubric_refs` is an array of `RubricReleaseRef`
- reconciliation triggered by rubric change is keyed off `rubric_version_id`
- runtime services `MUST NOT` mint ad hoc rubric identifiers that bypass the marking layer
- only `release_state = released` rubric refs may unlock authoritative scoring

### Stage authoritative-scoring gate

For this stage, authoritative scoring is allowed only when all of the following are true:

- the `question_type_id` is inside the promoted released-family runtime slice
- the question analysis snapshot carries at least one matching `RubricReleaseRef` with `release_state = released`
- the scoring path has validated uncertainty behavior for that question/rubric path

Additional clarification:

- released-scope type match alone is insufficient
- draft or validated-but-not-released rubric refs still force `non_released_fallback`
- missing released rubric coverage, missing gold-set confidence, or missing validated uncertainty behavior all force `non_released_fallback`

### 3. Attempt

Logical object: `Attempt`

Physical source of truth:

- `public.attempts`

Base table exists in [20260217100000_create_attempts_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100000_create_attempts_table.sql#L1).

Rules:

- `Attempt` is immutable historical evidence
- no runtime layer may rewrite submitted steps after creation
- topic metadata on attempts may be superseded by later truth, but the original attempt row remains historical fact

### 4. MarkingResult

Logical object: `MarkingResult`

Physical source of truth:

- primary aggregate identity: `public.mark_runs.mark_run_id`
- per-rubric-point decisions: `public.mark_decisions`

Base tables exist in [20260217100001_create_mark_runs_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100001_create_mark_runs_table.sql#L1) and [20260217100002_create_mark_decisions_table.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260217100002_create_mark_decisions_table.sql#L1).

Rules:

- the runtime `MUST NOT` create a second raw scoring-history system
- `MarkingResult` is a logical object derived from one `mark_run_id` plus its decisions and summaries
- historical `MarkingResult` instances are immutable snapshots

### 5. StudySession

Logical object: `StudySession`

Recommended physical table:

- `public.learning_sessions`

`StudySession` `MUST` expose at least:

```text
session_id
user_id
subject_code
session_goal
mode
state
active_scope_bundle
current_anchor_kind
current_anchor_ref
current_question_id
current_question_type_id
summary_state
open_questions
key_artifact_refs
misconceptions_in_focus
lineage_ref
created_at
updated_at
```

Frozen enums:

- `mode`: `learn_concept`, `guided_solve`, `timed_practice`, `post_mortem_review`, `spaced_review`
- `state`: `active`, `handoff_suggested`, `handed_off`, `closed`

Rules:

- `current_anchor_kind` and `current_anchor_ref` are mandatory
- `current_question_id` is nullable
- `current_question_type_id` is nullable
- `current_question_id` and `current_question_type_id` are independently nullable
- a session with no question is still valid if its anchor is valid
- frontend code `MUST NOT` invent placeholder question IDs
- `lineage_ref` uses the frozen `SessionLineageRef` shape
- `current_question_id` and `current_question_type_id` are StudySession-level denormalized fields for resume/render convenience only; they do not redefine the canonical `active_scope_bundle` shape

### 6. ActiveScopeBundle

Logical object: `ActiveScopeBundle`

It may be stored inline on the session row or as a separate read/write object, but contractually it `MUST` expose:

```text
primary_topic_id
primary_topic_path
secondary_topics_in_scope
allowed_prerequisites
paper_context
mode
session_goal
current_anchor_kind
current_anchor_ref
current_question_ref
current_question_type_ref
```

Rules:

- AskAI `MUST` read from persisted `active_scope_bundle`, not only route-derived topic scope
- marking and review generation `MUST` consume the same bundle semantics
- `current_question_ref` and `current_question_type_ref` remain independently nullable
- the canonical persisted/wire shape inside `active_scope_bundle` uses typed refs, not bare IDs
- API responses `MAY` also expose denormalized `current_question_id` and `current_question_type_id` at the enclosing StudySession level, but they `MUST NOT` replace `current_question_ref` or `current_question_type_ref` inside the bundle

### 7. Workspace

Logical object: `Workspace`

Recommended physical table:

- `public.learning_workspaces`

Required uniqueness rule:

- one learner + one topic = one canonical workspace

`Workspace` `MUST` expose at least:

```text
workspace_id
user_id
topic_id
topic_path
slot_state
linked_reference_summary
updated_at
```

Frozen stable slots:

- `overview_map`
- `core_method_derivation`
- `canonical_worked_example`
- `common_traps`
- `my_notes`
- `review_queue`

Rules:

- the workspace is a long-lived topic surface, not a session transcript
- the workspace holds canonical-home objects for that topic and linked references from other topics
- secondary references are links only, never authoritative clones

### 8. Artifact

Logical object: `Artifact`

Recommended physical table:

- `public.learning_artifacts`

Frozen artifact kinds:

- `summary_card`
- `derivation_card`
- `worked_example_card`
- `misconception_card`
- `formula_card`
- `free_note`

Frozen status dimensions:

- `trust_status`: `unverified`, `grounded`, `user_confirmed`, `contested`
- `placement_status`: `inbox`, `pinned`, `archived`
- `lifecycle_status`: `active`, `revised`, `superseded`

`Artifact` `MUST` expose at least:

```text
artifact_id
artifact_kind
canonical_home_topic_id
source_session_id
source_attempt_id
source_mark_run_id
target_family_id
target_question_type_id
slot_key
trust_status
placement_status
lifecycle_status
lineage_parent_artifact_id
grounding_refs
created_at
updated_at
```

Rules:

- pinning is not proof of truth
- artifacts cannot self-ground recursively
- `worked_example_card` anchored to a question uses the question's canonical home by default
- `misconception_card` follows repair target ownership rules, not source question ownership rules

Frozen lifecycle invariants:

- setting `trust_status = contested` changes trust posture only; it does not by itself supersede the artifact
- `superseded_by` requires a real successor artifact in the same `canonical_home_topic_id`
- a successor used for `superseded_by` `MUST` keep the same `slot_key`
- a successor used for `superseded_by` `MUST` have an `artifact_kind` allowed for that `slot_key`
- when `superseded_by` is set, the current artifact `MUST` move to `lifecycle_status = superseded`
- `superseded` does not automatically imply `trust_status = contested`
- contested artifacts `MUST NOT` be newly pinned
- if a pinned artifact is superseded, pinned placement must move atomically to the successor or the slot must become empty pending user confirmation

Frozen slot compatibility mapping:

- `overview_map` -> `summary_card`
- `core_method_derivation` -> `derivation_card`, `formula_card`
- `canonical_worked_example` -> `worked_example_card`
- `common_traps` -> `misconception_card`
- `my_notes` -> `free_note`
- `review_queue` -> no artifact residency

### 9. ReviewTask

Logical object: `ReviewTask`

Recommended physical table:

- `public.learning_review_tasks`

Frozen modes from the PRD:

- `redo_variant`
- `quick_recall`
- `reconstruct_derivation`
- `timed_check`
- `trap_fix`

Frozen statuses from the PRD:

- `open`
- `partial`
- `completed`
- `skipped`
- `expired`

`ReviewTask` `MUST` expose at least:

```text
review_task_id
target_kind
target_topic_id
target_family_id
target_question_type_id
target_misconception_tags
related_artifact_refs
source_question_id
source_attempt_ref
trigger_type
mode
due_at
priority
estimated_minutes
success_criteria
completion_evidence
status
```

Rules:

- each review task has exactly one canonical home topic
- source-topic workspaces may show linked references, but not cloned open tasks
- completion requires evidence, not a bare checkbox

### 10. Mastery Objects

Logical objects:

- `QuestionFamilyMastery`
- `QuestionTypeMastery`

Recommended physical tables:

- `public.learning_family_masteries`
- `public.learning_type_masteries`

Rules:

- these are derived and reconcilable objects, not immutable evidence history
- family mastery may update conservatively under fallback
- positive type-level updates are allowed only for released scoring scope with sufficient confidence
- topic-level percentage mastery `MUST NOT` be the new runtime truth model

## Canonical Home And Secondary Reference Contract

The following ownership rule is frozen for the stage:

- `Question`, `Attempt`, `MarkingResult`, and question-anchored `worked_example_card` default to the question's `primary_topic`
- `ReviewTask` and `misconception_card` belong to the repair target topic / target question type, which may differ from the source question's primary topic
- every long-lived object has exactly one `canonical_home_topic_id`
- secondary topic surfaces store references, never duplicated truth objects

Required consequence:

- AskAI, workspace reads, review queue reads, and artifact reads `MUST` all resolve the same canonical-home object

## Persistence Boundary Contract

### Existing tables to reuse

The new runtime `MUST` reuse these existing lower-layer sources instead of cloning them:

- `question_bank`
- `question_concept_links`
- `attempts`
- `mark_runs`
- `mark_decisions`
- `error_events`
- `user_learning_profiles`

### New canonical persistence layer

The new runtime `SHOULD` introduce these canonical tables or equivalent write-model structures:

- `learning_question_families`
- `learning_question_types`
- `learning_question_analysis_snapshots`
- `learning_sessions`
- `learning_session_lineage`
- `learning_workspaces`
- `learning_workspace_slots`
- `learning_artifacts`
- `learning_artifact_secondary_refs`
- `learning_review_tasks`
- `learning_family_masteries`
- `learning_type_masteries`
- `learning_reconciliation_runs`

Minimum contracts for the thinner persistence units:

- `learning_question_families`

```text
family_id
subject_code
title
description
release_state
created_at
updated_at
```

- `learning_question_types`

```text
question_type_id
family_id
subject_code
title
description
default_primary_topic_id
allowed_variant_tags
release_state
created_at
updated_at
```

- `learning_session_lineage`

```text
lineage_id
parent_session_id
child_session_id
handoff_kind
summary_snapshot
created_at
```

- `learning_workspace_slots`

```text
workspace_slot_id
workspace_id
slot_key
primary_artifact_ref
linked_reference_refs
updated_at
```

- `learning_reconciliation_runs`

```text
reconciliation_run_id
trigger_source
source_ref
affected_object_refs
status
result_summary
started_at
completed_at
```

Notes:

- read models may be implemented as RPCs, views, or service-level aggregations
- raw ledger duplication is forbidden
- `question_bank` reuse here means "promote into general question registry", not "keep it permanently limited to paper-key mapping"
- if SQL table names must change before first merge, the change must be applied consistently in this contract before implementation fans out

### Minimum relational invariants for first merge

The first merged schema for this runtime `MUST` enforce at least:

- `learning_workspaces`: `UNIQUE (user_id, topic_id)`
- `learning_workspace_slots`: `UNIQUE (workspace_id, slot_key)`
- `learning_sessions.mode`: `CHECK` against the frozen session-mode enum
- `learning_sessions.state`: `CHECK` against the frozen session-state enum
- `learning_sessions.current_anchor_kind`: `CHECK` against the frozen anchor-kind enum
- `learning_workspace_slots.slot_key`: `CHECK` against the frozen stable-slot enum
- `learning_question_types.family_id`: referential consistency back to `learning_question_families.family_id`

Registry rule:

- the pilot `family_id` and `question_type_id` rows `MUST` exist as canonical data via migration seed or equivalent bootstrap before runtime fan-out starts
- JS constants may cache seeded IDs for convenience, but they `MUST NOT` become the canonical registry truth

## Session Anchor Contract

Frozen anchor kinds:

- `concept`
- `question`
- `review_task`
- `artifact`
- `workspace_slot`

Validity rules:

1. every session has exactly one active anchor
2. anchors are first-class and may exist without a current question
3. questionless entry is valid for at least:
   - `learn_concept`
   - `spaced_review`
   - `artifact` re-entry
   - `workspace_slot` re-entry
4. `current_question_type_id` may exist without `current_question_id`
5. session legality is determined by anchor validity plus scope validity, not by question presence

### Session-create legality matrix

This matrix is frozen for `POST /api/learning/sessions` only:

| anchor_kind | frozen anchor_ref shape | allowed create modes | current_question_id rule | current_question_type_id rule |
|---|---|---|---|---|
| `concept` | `ConceptAnchorRef` | `learn_concept` | `null` on create | optional |
| `question` | `QuestionAnchorRef` | `guided_solve`, `timed_practice`, `post_mortem_review` | must equal anchor question | optional on create, should resolve quickly |
| `review_task` | `ReviewTaskAnchorRef` | `spaced_review` | optional | optional, but should inherit target type when task has one |
| `artifact` | `ArtifactAnchorRef` | `learn_concept`, `spaced_review`, `post_mortem_review` | optional | optional |
| `workspace_slot` | `WorkspaceSlotAnchorRef` | `learn_concept`, `spaced_review` | optional | optional |

Additional rules:

- `workspace_slot.review_queue` may start `spaced_review`; other slot keys default to `learn_concept`
- unsupported `anchor_kind + mode` combinations return a conflict error, not silent coercion
- create-time legality is independent from later in-session mode transitions defined by the PRD

### Anchor validation rules

- every anchor target must exist and belong to the authenticated user where user ownership is applicable
- `question` anchors require that the referenced question belongs to the same `subject_code`
- `review_task` anchors require the task to be non-terminal on create
- `artifact` anchors require the artifact not to be `superseded` unless explicitly opened as historical lineage view
- `workspace_slot` anchors require both a real workspace and a valid frozen `slot_key`

## Non-Released Fallback Contract

This contract applies to:

- imported/pasted questions outside the stage's released scoring scope
- stage-deferred released families not yet promoted into runtime scoring
- any question lacking released rubric coverage, gold-set confidence, or validated uncertainty behavior

Allowed outputs:

- `provisional classification`
- `guided_solve` or `timed_practice` scaffolding
- `qualitative diagnostic`
- artifact candidates
- conservative review tasks
- uncertainty-tagged family-level low-weight learning signals when confidence is adequate

Forbidden outputs:

- authoritative score
- formal point judgement
- strong positive type-level mastery updates
- falsely grounded artifact promotion

Required response metadata:

```text
fallback_mode
fallback_reason_code
classification_confidence
authoritative_scoring_allowed
learning_signal_posture
```

## Reconciliation Contract

Frozen trigger sources:

- classification or reclassification
- rubric-version change that affects judgement
- marking correction

Required behavior:

1. `Attempt` and historical `MarkingResult` snapshots remain intact
2. derived states are recalculated or invalidated against latest released truth
3. user-visible impacted objects expose lineage using `revised`, `contested`, or `superseded`
4. the system prefers retracting stale strong conclusions over letting conflicting truths coexist indefinitely
5. non-judgement-affecting metadata changes do not trigger full recomputation by default

Objects explicitly classified as reconcilable derived state:

- family mastery
- type mastery
- review task state
- artifact trust state
- diagnostic aggregation
- misconception aggregation
- error-book indexes

Recommended persistence:

- `learning_reconciliation_runs` with trigger source, affected object refs, old snapshot refs, new snapshot refs, and completion status

## API Contract

The new runtime API namespace is frozen as:

- `/api/learning/**`

### Common success and error envelope

Success responses may vary by endpoint payload, but error payloads are frozen as:

```json
{
  "error": {
    "code": "invalid_anchor_ref",
    "message": "Anchor target not found",
    "retryable": false,
    "details": {}
  },
  "request_id": "req_123"
}
```

Stable error codes for this stage:

- `auth_required`
- `auth_forbidden`
- `invalid_payload`
- `invalid_anchor_kind`
- `invalid_anchor_ref`
- `anchor_target_not_found`
- `unsupported_mode_for_anchor`
- `session_not_found`
- `session_state_conflict`
- `question_not_found`
- `workspace_not_found`
- `artifact_not_found`
- `artifact_state_conflict`
- `idempotency_conflict`

Status-code defaults:

- `400` invalid payload or malformed refs
- `401` unauthenticated
- `403` authenticated but forbidden
- `404` referenced object not found
- `409` valid request that conflicts with current state

Important rule:

- `non_released_fallback` is a successful product posture, not an error response

### Idempotency contract for this stage

Endpoints with idempotent create semantics in this stage:

- `POST /api/learning/sessions`
- `POST /api/learning/questions/import`

Frozen request rule:

- clients send `Idempotency-Key` as the HTTP header name; server handling remains case-insensitive at the transport layer

Frozen behavior:

- same authenticated user + same route + same idempotency key + same normalized payload returns the original successful response
- same authenticated user + same route + same idempotency key + different normalized payload returns `409 idempotency_conflict`
- absent `Idempotency-Key` means no replay guarantee for that request

### 1. Create session

`POST /api/learning/sessions`

Request:

```json
{
  "subject_code": "9709",
  "mode": "spaced_review",
  "session_goal": "Repair trigonometric equation solving",
  "anchor_kind": "review_task",
  "anchor_ref": {
    "kind": "review_task",
    "review_task_id": "8c49c3f0-0f53-4a31-b6a5-9bb53c64f231"
  },
  "current_question_id": null,
  "current_question_type_id": "9709.trigonometry.equations"
}
```

Response `MUST` include:

- session summary
- persisted `active_scope_bundle`
- anchor validity result
- canonical-home context summary
- feature flags relevant to this slice

Bundle-shape clarification:

- the persisted `active_scope_bundle` in the response uses `current_question_ref` and `current_question_type_ref`
- any bare `current_question_id` or `current_question_type_id` fields belong to the enclosing session summary only, not to the canonical bundle payload

Errors:

- `401 auth_required`
- `400 invalid_payload`
- `400 invalid_anchor_kind`
- `404 anchor_target_not_found`
- `409 unsupported_mode_for_anchor`
- `409 idempotency_conflict`

### 2. Read session

`GET /api/learning/sessions/:sessionId`

Response `MUST` include enough state for frontend resume without re-deriving IDs client-side.

Errors:

- `401 auth_required`
- `404 session_not_found`

### 3. Ask inside a session

`POST /api/learning/sessions/:sessionId/ask`

Request:

```json
{
  "message": "Can you give me the next hint only?",
  "client_turn_id": "local-turn-001"
}
```

Response `MUST` include:

```text
assistant_message
evidence_summary
fallback_posture
session_delta
suggested_actions
```

Rules:

- the handler reads stored session state first
- the handler does not infer canonical truth from route-only scope
- fallback posture is explicit when authoritative scoring is unavailable

Errors:

- `401 auth_required`
- `404 session_not_found`
- `409 session_state_conflict`

### 4. Import question

`POST /api/learning/questions/import`

Purpose:

- create a durable `Question` before downstream scoring/review/artifact logic

Response `MUST` return:

- `question_id`
- initial classification snapshot ref
- `scoring_scope_posture`

Errors:

- `401 auth_required`
- `400 invalid_payload`
- `409 idempotency_conflict`

### 5. Workspace read

`GET /api/learning/workspaces/:topicId`

Response `MUST` include:

- workspace summary
- stable slot payloads
- linked secondary references
- topic-filtered review queue view

Errors:

- `401 auth_required`
- `404 workspace_not_found`

### 6. Review queue read

`GET /api/learning/review-tasks`

Supported filters:

- `topic_id`
- `status`
- `due_before`

Rules:

- the global queue is the truth source
- topic workspace views are filtered projections, not separate queues

Errors:

- `401 auth_required`

### 7. Artifact lifecycle updates

`PATCH /api/learning/artifacts/:artifactId`

Allowed write intents in this stage:

- `set_placement_status`
- `mark_contested`
- `attach_superseded_by`

Frozen request shapes:

```text
{ intent: "set_placement_status", placement_status: "inbox" | "pinned" | "archived" }
{ intent: "mark_contested" }
{ intent: "attach_superseded_by", successor_artifact_ref: ArtifactRef }
```

Disallowed request shape:

- a generic `{ "state": "..." }` payload is not part of the frozen contract for this stage

Artifact patch invariants:

- `contested` means `trust_status = contested`
- `superseded_by` requires a valid successor artifact ref
- `superseded_by` updates `lifecycle_status`; it does not silently rewrite historical content
- state changes violating canonical-home, `slot_key`, or slot-to-artifact-kind compatibility rules return `409 artifact_state_conflict`

Errors:

- `401 auth_required`
- `404 artifact_not_found`
- `409 artifact_state_conflict`

## Frontend Contract

Frontend code `MUST NOT`:

- fabricate session IDs, question IDs, or type IDs
- silently synthesize fallback posture
- duplicate workspace ownership rules in client-only state
- treat old AskAI or Study Hub page state as the new truth source

Frontend/browser client `SHOULD` expose the imported-question entry path in the same shared `/api/learning/**` client surface when imported questions are part of the pilot user flow.

Frontend code `SHOULD`:

- consume session/workspace/review/artifact read models directly from `/api/learning/**`
- render questionless sessions as normal runtime states
- show lineage and fallback posture explicitly where relevant

## Multi-Agent Merge Contract

Before implementation fans out, these three things must be frozen and treated as authoritative:

1. released-scope contract
2. domain/persistence/API contract
3. canonical-home and questionless-session semantics

After that, safe parallel splits are:

- backend session/runtime APIs
- backend learning-state orchestration
- frontend session shell
- frontend workspace shell

Cross-cutting tracks that should not be split into fake independent product lines:

- migration review
- reconciliation correctness
- fallback correctness
- terminology consistency
- contract tests

## Release Gates For The First Runtime Slice

The slice is not ready unless all of the following pass:

1. a user can start sessions from `concept`, `question`, `review_task`, `artifact`, and `workspace_slot`
2. questionless sessions work without fake IDs
3. AskAI reads persisted `active_scope_bundle`
4. the promoted released `9709` question types support end-to-end scoring and post-mark learning effects
5. imported questions outside released scoring scope produce explicit `non_released_fallback`
6. workspace canonical-home behavior does not duplicate long-lived objects
7. reconciliation can revise derived state without mutating historical attempts/mark runs
8. legacy Study Hub remains compatibility-only and does not regain canonical logic

## Open Follow-Ups After This Contract

These items are intentionally deferred until after the first pilot slice is proven:

- widening additional `integration` question types beyond `9709.integration.application`
- widening additional `differential_equations` question types beyond `9709.differential_equations.separable`
- widening question-type granularity inside the trigonometry family
- replacing the old entry surfaces globally
- expanding beyond `9709`

## Execution Handoff Status

The contract-to-plan handoff is complete:

- the agent-executable implementation breakdown now lives in [2026-03-20-prd-learning-runtime-pilot-slice-execution.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md)
- that execution plan `MUST` consume this contract as fixed input rather than re-debating runtime semantics
- if implementation needs a contract change, update this document first, then realign the execution plan
