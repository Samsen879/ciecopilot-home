# PRD Learning Runtime Pilot Slice Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Historical note (2026-04-06):** This execution plan was written before the later released-family promotions for `9709.integration.application` and `9709.differential_equations.separable`. When older examples below mention trig-only pilot released scope, the current frozen contract should instead follow the promoted released-family gate set recorded in [2026-03-20-prd-learning-runtime-contract-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md) and [learning_runtime_released_family_gate_2026-03-25.md](/home/samsen/code/ciecopilot-home/docs/reports/learning_runtime_released_family_gate_2026-03-25.md).

**Goal:** Implement the first `9709` learning-runtime slice defined by the frozen contract: session-centric AskAI, typed anchors, persistent `active_scope_bundle`, released-scope scoring, conservative fallback/orchestration, topic workspace, artifact lifecycle, and review queue projection without building on legacy Study Hub tables or pages.

**Architecture:** Add a new `api/learning/**` and `src/pages/learning-runtime/**` domain layer that wraps the existing ledger, evidence, and RAG primitives rather than rewriting them. Freeze the serial trunk first: runtime contract enums, canonical repositories/migrations, typed refs, session/anchor legality, and registry-backed released-scope posture helpers. Only after that split into safe backend and frontend parallel blocks, with all workers consuming the same contract from [2026-03-20-prd-learning-runtime-contract-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md).

**Tech Stack:** React + Vite, Node API handlers, Supabase/Postgres migrations, Jest, existing RAG/marking/evidence-ledger stack.

---

## File Map

### New backend files

- `api/learning/lib/contracts/runtime-contract.js`: runtime enums, typed ref builders/guards, and slot compatibility map only.
- `api/learning/lib/contracts/error-contract.js`: machine-readable error codes and envelope helpers for `/api/learning/**`.
- `api/learning/lib/contracts/released-scope.js`: released-scope membership helpers plus registry-backed released-scope posture helpers.
- `api/learning/lib/validators/session-validator.js`: create/read/ask payload validation, anchor legality matrix.
- `api/learning/lib/validators/question-import-validator.js`: import payload normalization and validation.
- `api/learning/lib/http/learning-http.js`: JSON success/error helpers reused by every learning handler.
- `api/learning/lib/repositories/question-registry-repository.js`: widened `question_bank` operations and classification snapshot persistence.
- `api/learning/lib/repositories/session-repository.js`: `learning_sessions` + `learning_session_lineage` accessors.
- `api/learning/lib/repositories/workspace-repository.js`: workspace + stable-slot reads.
- `api/learning/lib/repositories/review-task-repository.js`: global queue reads and writes.
- `api/learning/lib/repositories/artifact-repository.js`: artifact lifecycle persistence.
- `api/learning/lib/repositories/reconciliation-repository.js`: reconciliation run persistence.
- `api/learning/lib/session-runtime/session-service.js`: session creation, load, update, lineage handoff.
- `api/learning/lib/session-runtime/session-handoff.js`: compaction and explicit handoff helpers.
- `api/learning/lib/session-runtime/session-anchor-resolution.js`: resolve anchor refs to real objects and ownership checks.
- `api/learning/lib/session-runtime/ask-context-builder.js`: build AskAI request state from session + workspace + evidence.
- `api/learning/lib/import/question-import-service.js`: create durable questions and initial classification snapshots.
- `api/learning/lib/review/review-task-service.js`: trigger-to-task generation and queue ownership.
- `api/learning/lib/artifacts/artifact-service.js`: inbox/pin/contested/superseded transitions.
- `api/learning/lib/mastery/mastery-orchestrator.js`: family/type update posture and fallback signal rules.
- `api/learning/lib/reconciliation/reconciliation-service.js`: trigger handling and derived-state recovery.
- `api/learning/lib/workspaces/workspace-read-service.js`: workspace projection with canonical-home and linked-reference behavior.
- `api/learning/sessions/index.js`: `POST /api/learning/sessions`.
- `api/learning/sessions/[id].js`: `GET /api/learning/sessions/:id`.
- `api/learning/sessions/[id]/ask.js`: `POST /api/learning/sessions/:id/ask`.
- `api/learning/questions/import.js`: `POST /api/learning/questions/import`.
- `api/learning/workspaces/[topicId].js`: `GET /api/learning/workspaces/:topicId`.
- `api/learning/review-tasks/index.js`: `GET /api/learning/review-tasks`.
- `api/learning/artifacts/[id].js`: `PATCH /api/learning/artifacts/:id`.

### New frontend files

- `src/api/learningRuntimeApi.js`: shared browser client for `/api/learning/**`, including imported-question entry.
- `src/pages/learning-runtime/LearningSessionPage.jsx`: new session-centric AskAI page.
- `src/pages/learning-runtime/TopicWorkspacePage.jsx`: topic workspace shell page.
- `src/components/learning-runtime/LearningSessionShell.jsx`: session page container.
- `src/components/learning-runtime/SessionTimeline.jsx`: session turns and evidence/fallback rendering.
- `src/components/learning-runtime/SessionHeader.jsx`: anchor, mode, and fallback/status banner.
- `src/components/learning-runtime/WorkspaceShell.jsx`: stable-slot workspace container.
- `src/components/learning-runtime/StableSlotPanel.jsx`: slot rendering.
- `src/components/learning-runtime/ArtifactInboxPanel.jsx`: inbox and pin flow.
- `src/components/learning-runtime/ReviewQueuePanel.jsx`: topic-filtered review queue panel.
- `src/components/learning-runtime/view-models/session-view-model.js`: pure view-model builder for session payloads.
- `src/components/learning-runtime/view-models/workspace-view-model.js`: pure view-model builder for workspace payloads.

### Modified existing files

- `api/_runtime/route-registry.js`: register `/api/learning/**`.
- `api/rag/lib/ask-service.js`: wrap current AskAI logic with session-aware entry path rather than route-only scope.
- `api/evidence/context.js`: extend read model shape for session/workspace consumers without replacing existing ledger reads.
- `api/marking/evaluate-v1.js`: emit learning-runtime orchestration trigger payloads and pilot released-scope posture.
- `api/marking/lib/ledger-orchestrator.js`: expose enough persisted run info for reconciliation/orchestration reuse.
- `api/error-book/lib/error-book-service.js`: consume reconciliation-safe lifecycle and new source refs where needed.
- `src/components/ChatPanel.jsx`: demote legacy chat-only assumptions and consume session runtime when launched from new page.
- `src/pages/AskAI.jsx`: convert from marketing wrapper into feature-flagged handoff entry to new learning session page.
- `src/pages/StudyHub.jsx`: demote legacy hub to compatibility surface with explicit links to new runtime entry.
- `src/pages/LearningPath.jsx`: demote old topic-level path as non-canonical.
- `src/App.jsx`: register new learning-runtime routes and feature-flagged entry points.

### New tests

- `api/_runtime/__tests__/route-registry-learning.test.js`
- `api/evidence/__tests__/context.test.js`
- `api/learning/__tests__/runtime-contract.test.js`
- `api/learning/__tests__/error-contract.test.js`
- `api/learning/__tests__/session-validator.test.js`
- `api/learning/__tests__/question-import-validator.test.js`
- `api/learning/__tests__/learning-http.test.js`
- `api/learning/__tests__/schema-contract.test.js`
- `api/learning/__tests__/question-registry-repository.test.js`
- `api/learning/__tests__/session-repository.test.js`
- `api/learning/__tests__/workspace-repository.test.js`
- `api/learning/__tests__/question-import-service.test.js`
- `api/learning/__tests__/session-api.test.js`
- `api/learning/__tests__/session-ask.test.js`
- `api/learning/__tests__/workspace-read-service.test.js`
- `api/learning/__tests__/review-task-service.test.js`
- `api/learning/__tests__/artifact-api.test.js`
- `api/learning/__tests__/artifact-service.test.js`
- `api/learning/__tests__/reconciliation-service.test.js`
- `api/learning/__tests__/released-scope.test.js`
- `src/api/__tests__/learningRuntimeApi.test.js`
- `src/components/learning-runtime/__tests__/LearningSessionShell.test.js`
- `src/components/learning-runtime/__tests__/WorkspaceShell.test.js`
- `src/pages/__tests__/legacy-entry-mode.test.js`
- `src/components/learning-runtime/__tests__/view-models.test.js`

### New migrations

- `supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql`
- `supabase/migrations/20260320111000_create_learning_runtime_core.sql`
- `supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql`
- `supabase/migrations/20260320112000_create_learning_runtime_read_models.sql`

## Chunk 1: Serial Trunk Contracts And Validators

### Task 1: Freeze runtime constants, pilot released scope, and error envelopes

**Files:**
- Create: `api/learning/lib/contracts/runtime-contract.js`
- Create: `api/learning/lib/contracts/error-contract.js`
- Create: `api/learning/lib/contracts/released-scope.js`
- Test: `api/learning/__tests__/runtime-contract.test.js`
- Test: `api/learning/__tests__/error-contract.test.js`
- Test: `api/learning/__tests__/released-scope.test.js`

- [ ] **Step 1: Write the failing contract tests**

```js
import { ANCHOR_KINDS, SLOT_COMPATIBILITY, buildReviewTaskRef } from '../lib/contracts/runtime-contract.js';
import { buildLearningError, LEARNING_ERROR_CODES } from '../lib/contracts/error-contract.js';
import { isSeededPilotQuestionType } from '../lib/contracts/released-scope.js';

test('review task refs are typed objects, not bare ids', () => {
  expect(buildReviewTaskRef('rt-1')).toEqual({ kind: 'review_task', review_task_id: 'rt-1' });
});

test('error envelope uses the frozen request_id + error shape', () => {
  expect(buildLearningError('req-1', LEARNING_ERROR_CODES.INVALID_ANCHOR_REF)).toEqual({
    error: { code: 'invalid_anchor_ref', message: expect.any(String), retryable: false, details: {} },
    request_id: 'req-1',
  });
});

test('learning error registry exposes the frozen stage codes', () => {
  expect(LEARNING_ERROR_CODES).toMatchObject({
    AUTH_REQUIRED: 'auth_required',
    AUTH_FORBIDDEN: 'auth_forbidden',
    INVALID_PAYLOAD: 'invalid_payload',
    INVALID_ANCHOR_KIND: 'invalid_anchor_kind',
    INVALID_ANCHOR_REF: 'invalid_anchor_ref',
    ANCHOR_TARGET_NOT_FOUND: 'anchor_target_not_found',
    UNSUPPORTED_MODE_FOR_ANCHOR: 'unsupported_mode_for_anchor',
    SESSION_NOT_FOUND: 'session_not_found',
    SESSION_STATE_CONFLICT: 'session_state_conflict',
    QUESTION_NOT_FOUND: 'question_not_found',
    WORKSPACE_NOT_FOUND: 'workspace_not_found',
    ARTIFACT_NOT_FOUND: 'artifact_not_found',
    ARTIFACT_STATE_CONFLICT: 'artifact_state_conflict',
    IDEMPOTENCY_CONFLICT: 'idempotency_conflict',
  });
});

test('released authoritative question-type membership follows the promoted released-family gate', () => {
  expect(isSeededPilotQuestionType('9709.trigonometry.identities')).toBe(true);
  expect(isSeededPilotQuestionType('9709.integration.application')).toBe(true);
  expect(isSeededPilotQuestionType('9709.differential_equations.separable')).toBe(true);
});
```

- [ ] **Step 2: Run the focused contract tests and verify they fail**

Run: `npm test -- --runInBand api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/released-scope.test.js --verbose`
Expected: FAIL because the contract modules do not exist yet.

- [ ] **Step 3: Implement the shared contract modules with a single ownership boundary**

```js
// runtime-contract.js owns refs, enums, slot compatibility, and typed builders only.
// released-scope.js owns promoted released question-type membership helpers and released-scope posture helpers only.
// released-scope membership alone must not unlock authoritative scoring.
// error-contract.js owns stable stage error codes and envelope builders only.
```

- [ ] **Step 4: Re-run the focused contract tests and verify they pass**

Run: `npm test -- --runInBand api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/released-scope.test.js --verbose`
Expected: PASS for all three suites.

- [ ] **Step 5: Commit**

```bash
git add api/learning/lib/contracts/runtime-contract.js api/learning/lib/contracts/error-contract.js api/learning/lib/contracts/released-scope.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/released-scope.test.js
git commit -m "feat(learning): freeze runtime contracts and error envelopes"
```

### Task 2: Freeze create-time legality matrix, import validation, and HTTP helpers

`current_question_id` and `current_question_type_id` in this task are request and `StudySession` summary fields only. They do not redefine the canonical `active_scope_bundle`, which stays typed-ref based and is asserted later in the session API task.

**Files:**
- Create: `api/learning/lib/validators/session-validator.js`
- Create: `api/learning/lib/validators/question-import-validator.js`
- Create: `api/learning/lib/http/learning-http.js`
- Test: `api/learning/__tests__/session-validator.test.js`
- Test: `api/learning/__tests__/question-import-validator.test.js`
- Test: `api/learning/__tests__/learning-http.test.js`

- [ ] **Step 1: Write the failing validator and HTTP-helper tests**

```js
import { validateCreateSessionInput } from '../lib/validators/session-validator.js';
import { validateQuestionImportInput } from '../lib/validators/question-import-validator.js';
import { sendLearningError } from '../lib/http/learning-http.js';

test('question anchor requires matching current_question_id', () => {
  expect(() => validateCreateSessionInput({
    mode: 'guided_solve',
    anchor_kind: 'question',
    anchor_ref: { kind: 'question', question_id: 'q-1' },
    current_question_id: 'q-2',
  })).toThrow(/invalid_payload/);
});

test('concept anchor allows questionless learn_concept create with optional question type', () => {
  expect(validateCreateSessionInput({
    mode: 'learn_concept',
    anchor_kind: 'concept',
    anchor_ref: { kind: 'concept', topic_id: 'topic-1', topic_path: 'pure/trigonometry/identities' },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.identities',
  }).ok).toBe(true);
});

test('review_task anchor may start spaced_review with type context but no concrete question', () => {
  expect(validateCreateSessionInput({
    mode: 'spaced_review',
    anchor_kind: 'review_task',
    anchor_ref: { kind: 'review_task', review_task_id: 'rt-1' },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.equations',
  }).ok).toBe(true);
});

test('artifact anchor may resume post_mortem_review without inventing a question id', () => {
  expect(validateCreateSessionInput({
    mode: 'post_mortem_review',
    anchor_kind: 'artifact',
    anchor_ref: { kind: 'artifact', artifact_id: 'art-1' },
    current_question_id: null,
    current_question_type_id: null,
  }).ok).toBe(true);
});

test('workspace_slot.review_queue can start spaced_review without question id', () => {
  expect(validateCreateSessionInput({
    mode: 'spaced_review',
    anchor_kind: 'workspace_slot',
    anchor_ref: { kind: 'workspace_slot', workspace_id: 'ws-1', slot_key: 'review_queue' },
    current_question_id: null,
    current_question_type_id: null,
  }).ok).toBe(true);
});

test('non-review_queue workspace slots cannot start spaced_review', () => {
  expect(() => validateCreateSessionInput({
    mode: 'spaced_review',
    anchor_kind: 'workspace_slot',
    anchor_ref: { kind: 'workspace_slot', workspace_id: 'ws-1', slot_key: 'common_traps' },
    current_question_id: null,
    current_question_type_id: null,
  })).toThrow(/unsupported_mode_for_anchor/);
});

test('import validator requires subject_code and prompt_representation', () => {
  expect(() => validateQuestionImportInput({ subject_code: '9709' })).toThrow(/invalid_payload/);
});

test('import validator normalizes imported question source payload before writes', () => {
  expect(validateQuestionImportInput({
    subject_code: '9709',
    prompt_representation: { type: 'text', value: 'Solve 2sinx = 1' },
  })).toMatchObject({
    ok: true,
    normalized: { source_kind: 'imported_question' },
  });
});

test('learning http helper emits the frozen error envelope', () => {
  const res = fakeResponse();
  sendLearningError(res, 'req-2', 'invalid_payload');
  expect(res.jsonPayload.request_id).toBe('req-2');
  expect(res.statusCode).toBe(400);
  expect(res.jsonPayload.error.code).toBe('invalid_payload');
});
```

- [ ] **Step 2: Run the validator/helper suites and verify they fail**

Run: `npm test -- --runInBand api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-validator.test.js api/learning/__tests__/learning-http.test.js --verbose`
Expected: FAIL because the validator and helper files do not exist yet.

- [ ] **Step 3: Implement the validators and HTTP helpers**

```js
export function validateCreateSessionInput(input) {
  // enforce ref shape + the frozen create-time legality matrix only.
  // session-anchor-resolution.js in Task 5 owns target existence and ownership checks.
  // That later task must emit the already-frozen outcomes
  // `anchor_target_not_found` and `auth_forbidden` before parallel work begins.
}

export function validateQuestionImportInput(input) {
  // normalize imported-question payloads before repository writes.
}
```

- [ ] **Step 4: Re-run the validator/helper suites and verify they pass**

Run: `npm test -- --runInBand api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-validator.test.js api/learning/__tests__/learning-http.test.js --verbose`
Expected: PASS with coverage for `concept`, `question`, `review_task`, `artifact`, and `workspace_slot` create-time rules, including questionless entry and the `workspace_slot.review_queue` exception.

- [ ] **Step 5: Commit**

```bash
git add api/learning/lib/validators/session-validator.js api/learning/lib/validators/question-import-validator.js api/learning/lib/http/learning-http.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-validator.test.js api/learning/__tests__/learning-http.test.js
git commit -m "feat(learning): add runtime validators and http helpers"
```

## Chunk 2: Serial Trunk Schema And Routes

### Task 3: Create migration-level schema contract coverage and canonical runtime tables

**Files:**
- Create: `supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql`
- Create: `supabase/migrations/20260320111000_create_learning_runtime_core.sql`
- Create: `supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql`
- Create: `supabase/migrations/20260320112000_create_learning_runtime_read_models.sql`
- Test: `api/learning/__tests__/schema-contract.test.js`

- [ ] **Step 1: Write the failing schema contract test**

```js
test('learning runtime migrations declare every frozen canonical table', () => {
  const sql = readLearningRuntimeMigrations();
  [
    'source_kind',
    'subject_code',
    'paper_scope',
    'primary_topic_id',
    'secondary_topic_ids',
    'family_id',
    'primary_question_type_id',
    'secondary_question_type_ids',
    'variant_tags',
    'release_scope_status',
    'classification_snapshot_ref',
    'prompt_representation',
    'provenance_summary',
  ].forEach((token) => expect(sql).toContain(token));
  expect(sql).toContain('alter column storage_key drop not null');
  expect(sql).toContain('alter column q_number drop not null');
  expect(sql).toContain('where storage_key is not null and q_number is not null');
  expect(sql).toContain('create table if not exists public.learning_question_families');
  expect(sql).toContain('create table if not exists public.learning_question_types');
  expect(sql).toContain('create table if not exists public.learning_question_analysis_snapshots');
  expect(sql).toContain('create table if not exists public.learning_sessions');
  expect(sql).toContain('create table if not exists public.learning_session_lineage');
  expect(sql).toContain('create table if not exists public.learning_workspaces');
  expect(sql).toContain('create table if not exists public.learning_workspace_slots');
  expect(sql).toContain('create table if not exists public.learning_artifacts');
  expect(sql).toContain('create table if not exists public.learning_artifact_secondary_refs');
  expect(sql).toContain('create table if not exists public.learning_review_tasks');
  expect(sql).toContain('create table if not exists public.learning_family_masteries');
  expect(sql).toContain('create table if not exists public.learning_type_masteries');
  expect(sql).toContain('create table if not exists public.learning_reconciliation_runs');
  expect(sql).toContain("unique (user_id, topic_id)");
  expect(sql).toContain("unique (workspace_id, slot_key)");
  expect(sql).toContain("check (mode in ('learn_concept', 'guided_solve', 'timed_practice', 'post_mortem_review', 'spaced_review'))");
  expect(sql).toContain("check (state in ('active', 'handoff_suggested', 'handed_off', 'closed'))");
  expect(sql).toContain("check (current_anchor_kind in ('concept', 'question', 'review_task', 'artifact', 'workspace_slot'))");
  expect(sql).toContain("check (slot_key in ('overview_map', 'core_method_derivation', 'canonical_worked_example', 'common_traps', 'my_notes', 'review_queue'))");
  expect(sql).toContain('references public.learning_question_families');
  expect(sql).toContain('9709.trigonometry_manipulation_equations');
  expect(sql).toContain('9709.trigonometry.identities');
  expect(sql).toContain('9709.trigonometry.equations');
  [
    'user_id',
    'session_goal',
    'mode',
    'state',
    'active_scope_bundle',
    'current_anchor_kind',
    'current_anchor_ref',
    'current_question_id',
    'current_question_type_id',
    'summary_state',
    'open_questions',
    'key_artifact_refs',
    'misconceptions_in_focus',
    'lineage_ref',
  ].forEach((token) => expect(sql).toContain(token));
  [
    'family_id',
    'title',
    'description',
    'release_state',
    'created_at',
    'updated_at',
    'allowed_variant_tags',
    'default_primary_topic_id',
    'parent_session_id',
    'child_session_id',
    'handoff_kind',
    'summary_snapshot',
    'updated_at',
    'workspace_id',
    'slot_key',
    'primary_artifact_ref',
    'linked_reference_refs',
    'status',
    'trigger_source',
    'source_ref',
    'affected_object_refs',
    'result_summary',
    'started_at',
    'completed_at',
  ].forEach((token) => expect(sql).toContain(token));

  const lineageSql = extractTableBlock(sql, 'public.learning_session_lineage');
  ['parent_session_id', 'child_session_id', 'handoff_kind', 'summary_snapshot', 'created_at']
    .forEach((token) => expect(lineageSql).toContain(token));

  const sessionsSql = extractTableBlock(sql, 'public.learning_sessions');
  [
    "check (mode in ('learn_concept', 'guided_solve', 'timed_practice', 'post_mortem_review', 'spaced_review'))",
    "check (state in ('active', 'handoff_suggested', 'handed_off', 'closed'))",
    "check (current_anchor_kind in ('concept', 'question', 'review_task', 'artifact', 'workspace_slot'))",
  ].forEach((token) => expect(sessionsSql).toContain(token));

  const workspacesSql = extractTableBlock(sql, 'public.learning_workspaces');
  ['user_id', 'topic_id', 'unique (user_id, topic_id)']
    .forEach((token) => expect(workspacesSql).toContain(token));

  const workspaceSlotsSql = extractTableBlock(sql, 'public.learning_workspace_slots');
  ['workspace_id', 'slot_key', 'primary_artifact_ref', 'linked_reference_refs', 'updated_at', 'unique (workspace_id, slot_key)']
    .forEach((token) => expect(workspaceSlotsSql).toContain(token));

  const questionTypesSql = extractTableBlock(sql, 'public.learning_question_types');
  ['family_id', 'references public.learning_question_families']
    .forEach((token) => expect(questionTypesSql).toContain(token));
  ['9709.trigonometry.identities', '9709.trigonometry.equations']
    .forEach((token) => expect(sql).toContain(token));

  const reconciliationSql = extractTableBlock(sql, 'public.learning_reconciliation_runs');
  ['trigger_source', 'source_ref', 'affected_object_refs', 'status', 'result_summary', 'started_at', 'completed_at']
    .forEach((token) => expect(reconciliationSql).toContain(token));
});
```

- [ ] **Step 2: Run the schema contract test and verify it fails**

Run: `npm test -- --runInBand api/learning/__tests__/schema-contract.test.js --verbose`
Expected: FAIL because the learning-runtime migrations do not exist yet.

- [ ] **Step 3: Implement the migrations with the full canonical table set**

```sql
-- `20260320110000_*` widens `question_bank`.
-- `20260320111000_*` creates canonical runtime tables + constraints.
-- `20260320111500_*` seeds the pilot family/type registry rows.
-- `20260320112000_*` creates read-model structures if they are kept separate.

alter table if exists public.question_bank add column if not exists source_kind text;
alter table if exists public.question_bank add column if not exists subject_code text;
alter table if exists public.question_bank add column if not exists paper_scope jsonb;
alter table if exists public.question_bank add column if not exists primary_topic_id uuid;
alter table if exists public.question_bank add column if not exists secondary_topic_ids jsonb;
alter table if exists public.question_bank add column if not exists family_id text;
alter table if exists public.question_bank add column if not exists primary_question_type_id text;
alter table if exists public.question_bank add column if not exists secondary_question_type_ids jsonb;
alter table if exists public.question_bank add column if not exists variant_tags jsonb;
alter table if exists public.question_bank add column if not exists release_scope_status text;
alter table if exists public.question_bank add column if not exists classification_snapshot_ref jsonb;
alter table if exists public.question_bank add column if not exists prompt_representation jsonb;
alter table if exists public.question_bank add column if not exists provenance_summary jsonb;
alter table if exists public.question_bank alter column storage_key drop not null;
alter table if exists public.question_bank alter column q_number drop not null;
alter table if exists public.question_bank drop constraint if exists uq_question_bank_storage_q;
create unique index if not exists uq_question_bank_storage_q_present
  on public.question_bank (storage_key, q_number)
  where storage_key is not null and q_number is not null;
create table if not exists public.learning_question_families (
  family_id text primary key,
  subject_code text not null,
  title text not null,
  description text not null,
  release_state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.learning_question_types (
  question_type_id text primary key,
  family_id text not null references public.learning_question_families(family_id),
  subject_code text not null,
  title text not null,
  description text not null,
  default_primary_topic_id uuid null,
  allowed_variant_tags jsonb not null default '[]'::jsonb,
  release_state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.learning_question_analysis_snapshots (...);
create table if not exists public.learning_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  subject_code text not null,
  session_goal text null,
  mode text not null check (mode in ('learn_concept', 'guided_solve', 'timed_practice', 'post_mortem_review', 'spaced_review')),
  state text not null check (state in ('active', 'handoff_suggested', 'handed_off', 'closed')),
  current_anchor_kind text not null check (current_anchor_kind in ('concept', 'question', 'review_task', 'artifact', 'workspace_slot')),
  current_anchor_ref jsonb not null,
  current_question_id uuid null,
  current_question_type_id text null,
  active_scope_bundle jsonb not null,
  summary_state jsonb not null default '{}'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  key_artifact_refs jsonb not null default '[]'::jsonb,
  misconceptions_in_focus jsonb not null default '[]'::jsonb,
  lineage_ref jsonb null
);
create table if not exists public.learning_session_lineage (
  lineage_id uuid primary key,
  parent_session_id uuid null,
  child_session_id uuid not null,
  handoff_kind text null,
  summary_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.learning_workspaces (
  workspace_id uuid primary key,
  user_id uuid not null,
  topic_id uuid not null,
  topic_path text not null,
  unique (user_id, topic_id)
);
create table if not exists public.learning_workspace_slots (
  workspace_slot_id uuid primary key,
  workspace_id uuid not null,
  slot_key text not null check (slot_key in ('overview_map', 'core_method_derivation', 'canonical_worked_example', 'common_traps', 'my_notes', 'review_queue')),
  primary_artifact_ref jsonb null,
  linked_reference_refs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (workspace_id, slot_key)
);
create table if not exists public.learning_artifacts (...);
create table if not exists public.learning_artifact_secondary_refs (...);
create table if not exists public.learning_review_tasks (...);
create table if not exists public.learning_family_masteries (...);
create table if not exists public.learning_type_masteries (...);
create table if not exists public.learning_reconciliation_runs (
  reconciliation_run_id uuid primary key,
  trigger_source text not null,
  source_ref jsonb not null,
  affected_object_refs jsonb not null,
  status text not null,
  result_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz null
);
insert into public.learning_question_families (family_id, subject_code, title, description, release_state)
values ('9709.trigonometry_manipulation_equations', '9709', 'Trigonometric manipulation / equations', 'Pilot runtime family seed', 'released')
on conflict (family_id) do nothing;
insert into public.learning_question_types (question_type_id, family_id, subject_code, title, description, release_state)
values
  ('9709.trigonometry.identities', '9709.trigonometry_manipulation_equations', '9709', 'Trigonometric identities', 'Pilot runtime type seed', 'released'),
  ('9709.trigonometry.equations', '9709.trigonometry_manipulation_equations', '9709', 'Trigonometric equations', 'Pilot runtime type seed', 'released')
on conflict (question_type_id) do nothing;
```

- [ ] **Step 4: Re-run the schema contract test and verify it passes**

Run: `npm test -- --runInBand api/learning/__tests__/schema-contract.test.js --verbose`
Expected: PASS with question-bank widening, canonical registry seed data, relational invariants, and all canonical runtime tables present in the migrations.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql supabase/migrations/20260320111000_create_learning_runtime_core.sql supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql supabase/migrations/20260320112000_create_learning_runtime_read_models.sql api/learning/__tests__/schema-contract.test.js
git commit -m "feat(learning): add learning runtime schema contract"
```

### Task 4: Add focused repositories over the new schema

**Files:**
- Create: `api/learning/lib/repositories/question-registry-repository.js`
- Create: `api/learning/lib/repositories/session-repository.js`
- Create: `api/learning/lib/repositories/workspace-repository.js`
- Test: `api/learning/__tests__/question-registry-repository.test.js`
- Test: `api/learning/__tests__/session-repository.test.js`
- Test: `api/learning/__tests__/workspace-repository.test.js`

- [ ] **Step 1: Write failing repository tests for imported questions, session lineage, workspace slots, and linked references**

```js
test('insertImportedQuestion stores a durable question without storage_key/q_number requirements', async () => {
  const result = await insertImportedQuestion(fakeDb, importedInput);
  expect(result.question_id).toBeTruthy();
  expect(result.classification_snapshot_ref.kind).toBe('classification_snapshot');
});

test('insertSession records a versioned lineage stub on create', async () => {
  const session = await insertSession(fakeDb, createPayload);
  expect(session.lineage.parent_session_id).toBeNull();
});

test('fetchWorkspaceProjection returns slot payloads and linked references separately', async () => {
  const payload = await fetchWorkspaceProjection(fakeDb, { userId: 'u1', topicId: 'topic-1' });
  expect(payload.slots.canonical_worked_example).toBeDefined();
  expect(payload.linked_references).toBeDefined();
});
```

- [ ] **Step 2: Run the repository tests and verify they fail**

Run: `npm test -- --runInBand api/learning/__tests__/question-registry-repository.test.js api/learning/__tests__/session-repository.test.js api/learning/__tests__/workspace-repository.test.js --verbose`
Expected: FAIL because the repository files do not exist yet.

- [ ] **Step 3: Implement the repositories with one responsibility per file**

```js
export async function insertImportedQuestion(client, input) {
  // question registry + classification snapshot writes only
}

export async function insertSession(client, input) {
  // learning_sessions + lineage stub writes only
}

export async function fetchWorkspaceProjection(client, input) {
  // workspace + slot + linked-reference reads only
}
```

- [ ] **Step 4: Re-run the repository tests and verify they pass**

Run: `npm test -- --runInBand api/learning/__tests__/question-registry-repository.test.js api/learning/__tests__/session-repository.test.js api/learning/__tests__/workspace-repository.test.js --verbose`
Expected: PASS with question-registry, snapshot, session-lineage, slot, and linked-reference coverage.

- [ ] **Step 5: Commit**

```bash
git add api/learning/lib/repositories/question-registry-repository.js api/learning/lib/repositories/session-repository.js api/learning/lib/repositories/workspace-repository.js api/learning/__tests__/question-registry-repository.test.js api/learning/__tests__/session-repository.test.js api/learning/__tests__/workspace-repository.test.js
git commit -m "feat(learning): add runtime repositories"
```

### Task 5: Register dynamic session routes and ship create/read skeletons

**Files:**
- Modify: `api/_runtime/route-registry.js`
- Create: `api/learning/sessions/index.js`
- Create: `api/learning/sessions/[id].js`
- Create: `api/learning/sessions/[id]/ask.js`
- Create: `api/learning/questions/import.js`
- Create: `api/learning/workspaces/[topicId].js`
- Create: `api/learning/review-tasks/index.js`
- Create: `api/learning/artifacts/[id].js`
- Create: `api/learning/lib/session-runtime/session-service.js`
- Create: `api/learning/lib/session-runtime/session-handoff.js`
- Create: `api/learning/lib/session-runtime/session-anchor-resolution.js`
- Test: `api/learning/__tests__/session-api.test.js`
- Test: `api/_runtime/__tests__/route-registry-learning.test.js`

- [ ] **Step 1: Write failing API tests for create/read session, missing anchors, and ownership resolution**

```js
test('POST /api/learning/sessions returns persisted active_scope_bundle and typed anchor', async () => {
  const res = await callLearningHandler('POST', '/api/learning/sessions', payload);
  expect(res.statusCode).toBe(200);
  expect(res.body.session.active_scope_bundle.current_anchor_ref.kind).toBe('review_task');
  expect(res.body.anchor_validity.ok).toBe(true);
  expect(res.body.canonical_home_context).toBeDefined();
  expect(res.body.feature_flags.learning_runtime_enabled).toBeDefined();
});

test('POST /api/learning/sessions returns 404 anchor_target_not_found when the anchor object is missing', async () => {
  const res = await callLearningHandler('POST', '/api/learning/sessions', missingReviewTaskPayload);
  expect(res.statusCode).toBe(404);
  expect(res.body.error.code).toBe('anchor_target_not_found');
  expect(res.body.request_id).toEqual(expect.any(String));
});

test('POST /api/learning/sessions returns 403 auth_forbidden when the anchor belongs to another user', async () => {
  const res = await callLearningHandler('POST', '/api/learning/sessions', foreignReviewTaskPayload);
  expect(res.statusCode).toBe(403);
  expect(res.body.error.code).toBe('auth_forbidden');
});

test('POST /api/learning/sessions returns 400 invalid_payload for malformed anchor refs', async () => {
  const res = await callLearningHandler('POST', '/api/learning/sessions', malformedAnchorPayload);
  expect(res.statusCode).toBe(400);
  expect(res.body.error.code).toBe('invalid_payload');
});

test('POST /api/learning/sessions returns 400 invalid_anchor_kind for unknown anchors', async () => {
  const res = await callLearningHandler('POST', '/api/learning/sessions', invalidAnchorKindPayload);
  expect(res.statusCode).toBe(400);
  expect(res.body.error.code).toBe('invalid_anchor_kind');
});

test('POST /api/learning/sessions returns 409 unsupported_mode_for_anchor for illegal create combinations', async () => {
  const res = await callLearningHandler('POST', '/api/learning/sessions', unsupportedModePayload);
  expect(res.statusCode).toBe(409);
  expect(res.body.error.code).toBe('unsupported_mode_for_anchor');
});

test('POST /api/learning/sessions returns 409 idempotency_conflict on conflicting replay', async () => {
  const first = await callLearningHandler('POST', '/api/learning/sessions', idempotentPayloadA, { 'Idempotency-Key': 'sess-create-1' });
  const second = await callLearningHandler('POST', '/api/learning/sessions', idempotentPayloadB, { 'Idempotency-Key': 'sess-create-1' });
  expect(first.statusCode).toBe(200);
  expect(second.statusCode).toBe(409);
  expect(second.body.error.code).toBe('idempotency_conflict');
});

test('GET /api/learning/sessions/:id resolves the dynamic route', async () => {
  const res = await callLearningHandler('GET', '/api/learning/sessions/sess-1');
  expect(res.statusCode).toBe(200);
  expect(res.body.session.active_scope_bundle.current_anchor_ref.kind).toBeDefined();
  expect(res.body.session.active_scope_bundle.current_question_type_ref.kind).toBe('question_type');
  expect(res.body.session.active_scope_bundle.current_question_type_ref.question_type_id).toBeDefined();
});

test('GET /api/learning/sessions/:id returns 404 session_not_found with the frozen envelope', async () => {
  const res = await callLearningHandler('GET', '/api/learning/sessions/missing-session');
  expect(res.statusCode).toBe(404);
  expect(res.body.error).toMatchObject({ code: 'session_not_found', retryable: false });
  expect(res.body.request_id).toEqual(expect.any(String));
});

test('route registry reserves every frozen /api/learning endpoint before backend fan-out starts', () => {
  expect(findRoute('/api/learning/sessions/sess-1', 'GET').route.module).toBe('learning-sessions-id');
  expect(findRoute('/api/learning/sessions', 'POST').route.module).toBe('learning-sessions');
  expect(findRoute('/api/learning/sessions/sess-1/ask', 'POST').route.module).toBe('learning-sessions-ask');
  expect(findRoute('/api/learning/questions/import', 'POST').route.module).toBe('learning-questions-import');
  expect(findRoute('/api/learning/workspaces/topic-1', 'GET').route.module).toBe('learning-workspace-topic');
  expect(findRoute('/api/learning/review-tasks', 'GET').route.module).toBe('learning-review-tasks');
  expect(findRoute('/api/learning/artifacts/art-1', 'PATCH').route.module).toBe('learning-artifact-id');
});
```

- [ ] **Step 2: Run the session API suite and verify it fails**

Run: `npm test -- --runInBand api/learning/__tests__/session-api.test.js api/_runtime/__tests__/route-registry-learning.test.js --verbose`
Expected: FAIL because the route registry and handlers do not exist yet.

- [ ] **Step 3: Implement the route registration, dynamic matcher, and session skeleton**

```js
{
  module: 'learning-sessions-id',
  pathPrefix: '/api/learning/sessions/:id',
  pattern: /^\\/api\\/learning\\/sessions\\/[^/]+$/,
  paramExtractor: (path) => ({ id: path.split('/')[4] || null }),
  importPath: '../learning/sessions/[id].js',
  auth: 'jwt_required',
  authMode: 'authenticated',
  methods: ['GET', 'OPTIONS']
},
{
  module: 'learning-sessions-ask',
  pathPrefix: '/api/learning/sessions/:id/ask',
  pattern: /^\\/api\\/learning\\/sessions\\/[^/]+\\/ask$/,
  paramExtractor: (path) => ({ id: path.split('/')[4] || null }),
  importPath: '../learning/sessions/[id]/ask.js',
  auth: 'jwt_required',
  authMode: 'authenticated',
  methods: ['POST', 'OPTIONS']
},
{
  module: 'learning-sessions',
  pathPrefix: '/api/learning/sessions',
  importPath: '../learning/sessions/index.js',
  auth: 'jwt_required',
  authMode: 'authenticated',
  methods: ['POST', 'OPTIONS']
}

// The same serial-trunk task also reserves:
// POST /api/learning/sessions/:id/ask
// POST /api/learning/questions/import
// GET /api/learning/workspaces/:topicId
// GET /api/learning/review-tasks
// PATCH /api/learning/artifacts/:id
// and creates stub handlers so later workers do not need to edit route-registry.js again.
// Dynamic item routes such as `:id` and `:id/ask` must appear before base prefix routes because `findRoute`
// uses prefix matching for non-pattern entries.
// session-anchor-resolution.js owns `anchor_target_not_found` vs `auth_forbidden`
// mapping for create-time anchor resolution.
```

- [ ] **Step 4: Re-run the session API suite and verify it passes**

Run: `npm test -- --runInBand api/learning/__tests__/session-api.test.js api/_runtime/__tests__/route-registry-learning.test.js --verbose`
Expected: PASS with typed anchor, anchor-validity summary, canonical-home context, feature-flag metadata, `invalid_payload`, `invalid_anchor_kind`, `unsupported_mode_for_anchor`, `idempotency_conflict`, missing-anchor, forbidden-anchor, and `session_not_found` error mapping, dynamic `GET /sessions/:id` coverage, and canonical typed-ref `active_scope_bundle` coverage.

- [ ] **Step 5: Commit**

```bash
git add api/_runtime/route-registry.js api/learning/sessions/index.js api/learning/sessions/[id].js api/learning/sessions/[id]/ask.js api/learning/questions/import.js api/learning/workspaces/[topicId].js api/learning/review-tasks/index.js api/learning/artifacts/[id].js api/learning/lib/session-runtime/session-service.js api/learning/lib/session-runtime/session-handoff.js api/learning/lib/session-runtime/session-anchor-resolution.js api/learning/__tests__/session-api.test.js api/_runtime/__tests__/route-registry-learning.test.js
git commit -m "feat(learning): add dynamic session routes and skeleton handlers"
```

## Chunk 3: Backend Expansion

### Task 6: Add question import flow and released-scope gating against the canonical pilot registry

**Files:**
- Modify: `api/learning/questions/import.js`
- Create: `api/learning/lib/import/question-import-service.js`
- Modify: `api/learning/lib/repositories/question-registry-repository.js`
- Test: `api/learning/__tests__/question-import-service.test.js`

- [ ] **Step 1: Extend the failing import tests to cover pilot trigonometry typing and fallback posture**

```js
test('imported trigonometry identity question gets released scoring posture', async () => {
  const result = await importQuestion(fakeDb, importedTrigIdentityInput);
  expect(result.scoring_scope_posture.authoritative_scoring_allowed).toBe(true);
});

test('trigonometry type without a released rubric ref still falls back', async () => {
  const result = await importQuestion(fakeDb, trigWithoutReleasedRubricInput);
  expect(result.scoring_scope_posture.authoritative_scoring_allowed).toBe(false);
  expect(result.scoring_scope_posture.fallback_mode).toBe('non_released_fallback');
});

test('imported integration application question gets released scoring posture', async () => {
  const result = await importQuestion(fakeDb, importedIntegrationInput);
  expect(result.scoring_scope_posture).toMatchObject({
    authoritative_scoring_allowed: true,
    release_scope_status: 'released_scoring',
    fallback_mode: null,
  });
});

test('POST /api/learning/questions/import returns a durable question and scoring posture metadata', async () => {
  const res = await callLearningHandler('POST', '/api/learning/questions/import', importedTrigIdentityInput);
  expect(res.statusCode).toBe(200);
  expect(res.body.question.question_id).toBeDefined();
  expect(res.body.scoring_scope_posture.authoritative_scoring_allowed).toBe(true);
});

test('POST /api/learning/questions/import returns 409 idempotency_conflict on conflicting replay', async () => {
  const first = await callLearningHandler('POST', '/api/learning/questions/import', importedTrigIdentityInput, { 'Idempotency-Key': 'import-1' });
  const second = await callLearningHandler('POST', '/api/learning/questions/import', importedIntegrationInput, { 'Idempotency-Key': 'import-1' });
  expect(first.statusCode).toBe(200);
  expect(second.statusCode).toBe(409);
  expect(second.body.error.code).toBe('idempotency_conflict');
});
```

- [ ] **Step 2: Run the import suite and verify it fails**

Run: `npm test -- --runInBand api/learning/__tests__/question-import-service.test.js --verbose`
Expected: FAIL until released-scope classification and posture logic exist.

- [ ] **Step 3: Implement import service and consume the canonical pilot registry**

```js
export async function resolveReleasedScoringPosture(deps, analysisSnapshot) {
  // read canonical family/type truth from `learning_question_families` + `learning_question_types`
  // authoritative scoring requires:
  // 1. seeded pilot question type
  // 2. a matching `RubricReleaseRef` with `release_state = released`
  // 3. validated uncertainty posture for this question/rubric path
  // question-type match alone is not sufficient.
}
```

- [ ] **Step 4: Re-run the import suite and verify it passes**

Run: `npm test -- --runInBand api/learning/__tests__/question-import-service.test.js --verbose`
Expected: PASS with registry-backed pilot/fallback posture assertions, released-rubric gating, import-handler response coverage, and import idempotency coverage green.

- [ ] **Step 5: Commit**

```bash
git add api/learning/questions/import.js api/learning/lib/import/question-import-service.js api/learning/lib/repositories/question-registry-repository.js api/learning/__tests__/question-import-service.test.js
git commit -m "feat(learning): add imported question registry and pilot trigonometry scope"
```

### Task 7: Wrap AskAI in session runtime and explicit fallback posture

**Files:**
- Modify: `api/rag/lib/ask-service.js`
- Modify: `api/learning/sessions/[id]/ask.js`
- Create: `api/learning/lib/session-runtime/ask-context-builder.js`
- Test: `api/learning/__tests__/session-ask.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`

- [ ] **Step 1: Write failing tests for session-aware ask behavior**

```js
test('session ask consumes persisted active_scope_bundle instead of route-only scope', async () => {
  const res = await askWithinSession(fakeDeps, sessionPayload, 'next hint');
  expect(res.session_delta).toBeDefined();
});

test('question-type-only ask without released question metadata returns successful fallback posture, not an API error', async () => {
  const res = await askWithinSession(fakeDeps, integrationSession, 'mark this');
  expect(res.fallback_posture).toMatchObject({
    fallback_mode: 'non_released_fallback',
    authoritative_scoring_allowed: false,
    fallback_reason_code: expect.any(String),
    classification_confidence: expect.any(Number),
    learning_signal_posture: expect.any(String),
  });
});

test('POST /api/learning/sessions/:id/ask returns the frozen session-ask response fields', async () => {
  const res = await callLearningHandler('POST', '/api/learning/sessions/sess-1/ask', {
    message: 'Can you give me the next hint only?',
    client_turn_id: 'local-turn-001',
  });
  expect(res.statusCode).toBe(200);
  expect(res.body.assistant_message).toBeDefined();
  expect(res.body.evidence_summary).toBeDefined();
  expect(res.body.fallback_posture).toBeDefined();
  expect(res.body.session_delta).toBeDefined();
  expect(res.body.suggested_actions).toBeDefined();
});
```

- [ ] **Step 2: Run the session ask suites and verify they fail**

Run: `npm test -- --runInBand api/learning/__tests__/session-ask.test.js api/rag/__tests__/ask-service.test.js --verbose`
Expected: FAIL because the session wrapper and fallback contract are not wired in yet.

- [ ] **Step 3: Implement the ask wrapper and current `ask-service` bridge**

```js
export async function askWithinLearningSession(deps, { session, message }) {
  // build AskAI input from persisted active_scope_bundle, workspace context, and evidence context
}
```

- [ ] **Step 4: Re-run the session ask suites and verify they pass**

Run: `npm test -- --runInBand api/learning/__tests__/session-ask.test.js api/rag/__tests__/ask-service.test.js --verbose`
Expected: PASS with explicit fallback posture, frozen session-ask response fields, and no fake question ids.

- [ ] **Step 5: Commit**

```bash
git add api/rag/lib/ask-service.js api/learning/sessions/[id]/ask.js api/learning/lib/session-runtime/ask-context-builder.js api/learning/__tests__/session-ask.test.js
git commit -m "feat(learning): add session-aware ask runtime"
```

### Task 8: Implement conservative mastery, review, artifact, and reconciliation services

**Files:**
- Create: `api/learning/lib/repositories/review-task-repository.js`
- Create: `api/learning/lib/repositories/artifact-repository.js`
- Create: `api/learning/lib/repositories/reconciliation-repository.js`
- Create: `api/learning/lib/mastery/mastery-orchestrator.js`
- Create: `api/learning/lib/review/review-task-service.js`
- Create: `api/learning/lib/artifacts/artifact-service.js`
- Create: `api/learning/lib/reconciliation/reconciliation-service.js`
- Modify: `api/learning/artifacts/[id].js`
- Modify: `api/marking/evaluate-v1.js`
- Modify: `api/marking/lib/ledger-orchestrator.js`
- Modify: `api/error-book/lib/error-book-service.js`
- Test: `api/learning/__tests__/artifact-api.test.js`
- Test: `api/learning/__tests__/review-task-service.test.js`
- Test: `api/learning/__tests__/artifact-service.test.js`
- Test: `api/learning/__tests__/reconciliation-service.test.js`
- Test: `api/marking/__tests__/evaluate-v1.test.js`
- Test: `api/error-book/error-book.test.js`

- [ ] **Step 1: Write failing orchestration tests**

```js
test('pilot scoring run can create a type-level positive update', async () => {
  const result = await applyLearningEffects(pilotReleasedMarkRun);
  expect(result.mastery_updates[0].level).toBe('question_type');
});

test('fallback-only family creates review tasks without authoritative score effects', async () => {
  const result = await applyLearningEffects(fallbackDiagnosticRun);
  expect(result.review_tasks).toHaveLength(1);
  expect(result.mastery_updates.every((item) => item.level !== 'question_type')).toBe(true);
});

test('PATCH /api/learning/artifacts/:id enforces lifecycle transitions without duplicate truth', async () => {
  const res = await callLearningHandler('PATCH', '/api/learning/artifacts/art-1', {
    intent: 'set_placement_status',
    placement_status: 'pinned',
  });
  expect(res.statusCode).toBe(200);
  expect(res.body.artifact.placement_status).toBe('pinned');
  expect(res.body.artifact.lifecycle_status).toBe('active');
});

test('PATCH /api/learning/artifacts/:id rejects illegal transitions with artifact_state_conflict', async () => {
  const res = await callLearningHandler('PATCH', '/api/learning/artifacts/art-contested', {
    intent: 'set_placement_status',
    placement_status: 'pinned',
  });
  expect(res.statusCode).toBe(409);
  expect(res.body.error.code).toBe('artifact_state_conflict');
});

test('misconception_card homes to the repair target topic, not the source question topic', async () => {
  const result = await applyLearningEffects(fallbackDiagnosticRunWithRepairTarget);
  expect(result.artifact_candidates[0].artifact_kind).toBe('misconception_card');
  expect(result.artifact_candidates[0].canonical_home_topic_id).toBe('repair-target-topic');
});

test('superseding a pinned artifact moves the pin to the successor or clears the slot atomically', async () => {
  const res = await callLearningHandler('PATCH', '/api/learning/artifacts/art-pinned', {
    intent: 'attach_superseded_by',
    successor_artifact_ref: { kind: 'artifact', artifact_id: 'art-successor' },
  });
  expect(res.statusCode).toBe(200);
  expect(res.body.artifact.lifecycle_status).toBe('superseded');
  expect(res.body.slot_transition).toMatchObject({
    outcome: expect.stringMatching(/moved_to_successor|slot_cleared_pending_confirmation/),
  });
});
```

- [ ] **Step 2: Run the orchestration suites and verify they fail**

Run: `npm test -- --runInBand api/learning/__tests__/artifact-api.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/marking/__tests__/evaluate-v1.test.js api/error-book/error-book.test.js --verbose`
Expected: FAIL until orchestration and reconciliation behavior exists.

- [ ] **Step 3: Implement the minimal orchestration services**

```js
export async function applyLearningEffects(input) {
  // route pilot scoring to type-level updates,
  // route fallback to conservative family-level/no-positive-type updates,
  // emit review tasks, artifact candidates, and reconciliation traces.
}
```

- [ ] **Step 4: Re-run the orchestration suites and verify they pass**

Run: `npm test -- --runInBand api/learning/__tests__/artifact-api.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/marking/__tests__/evaluate-v1.test.js api/error-book/error-book.test.js --verbose`
Expected: PASS with released-scope, artifact lifecycle success/conflict paths, explicit write intents, misconception-card homing, supersede pin migration semantics, reconciliation assertions, and legacy-marking/error-book regressions green.

- [ ] **Step 5: Commit**

```bash
git add api/learning/lib/repositories/review-task-repository.js api/learning/lib/repositories/artifact-repository.js api/learning/lib/repositories/reconciliation-repository.js api/learning/lib/mastery/mastery-orchestrator.js api/learning/lib/review/review-task-service.js api/learning/lib/artifacts/artifact-service.js api/learning/lib/reconciliation/reconciliation-service.js api/learning/artifacts/[id].js api/marking/evaluate-v1.js api/marking/lib/ledger-orchestrator.js api/error-book/lib/error-book-service.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/marking/__tests__/evaluate-v1.test.js api/error-book/error-book.test.js
git commit -m "feat(learning): add conservative orchestration and reconciliation"
```

### Task 9: Implement workspace and review queue projections

**Files:**
- Modify: `api/learning/workspaces/[topicId].js`
- Modify: `api/learning/review-tasks/index.js`
- Create: `api/learning/lib/workspaces/workspace-read-service.js`
- Modify: `api/evidence/context.js`
- Test: `api/evidence/__tests__/context.test.js`
- Test: `api/learning/__tests__/workspace-read-service.test.js`

Task 9 starts only after Task 8 is merged. The review-queue projection in this task reads `learning_review_tasks` and artifact/reconciliation truth created in Task 8; do not build it against placeholder queue behavior.

- [ ] **Step 1: Add failing workspace/read-model tests for canonical-home and topic-filtered queue behavior**

```js
test('workspace returns stable slots plus linked references from secondary topics', async () => {
  const payload = await getWorkspaceView(fakeDb, args);
  expect(payload.slots.common_traps.linked_references).toBeDefined();
});

test('review queue endpoint returns global truth with optional topic filter', async () => {
  const payload = await listReviewTasks(fakeDb, { topic_id: 'topic-1' });
  expect(payload.scope).toBe('global_queue_projection');
});

test('GET /api/learning/workspaces/:topicId returns stable slots and linked references', async () => {
  const res = await callLearningHandler('GET', '/api/learning/workspaces/topic-1');
  expect(res.statusCode).toBe(200);
  expect(res.body.workspace.slots.common_traps).toBeDefined();
});

test('GET /api/learning/review-tasks returns global truth with optional topic filter', async () => {
  const res = await callLearningHandler('GET', '/api/learning/review-tasks?topic_id=topic-1');
  expect(res.statusCode).toBe(200);
  expect(res.body.scope).toBe('global_queue_projection');
});

test('evidence context exposes learning-runtime anchor and workspace state for projections', async () => {
  const payload = await getEvidenceContext(fakeDeps, { sessionId: 'sess-1', topicId: 'topic-1' });
  expect(payload.learning_runtime.current_anchor_kind).toBeDefined();
  expect(payload.learning_runtime.workspace).toBeDefined();
});
```

- [ ] **Step 2: Run the workspace/read-model suite and verify it fails**

Run: `npm test -- --runInBand api/learning/__tests__/workspace-read-service.test.js api/evidence/__tests__/context.test.js --verbose`
Expected: FAIL because projection services and handlers are not complete.

- [ ] **Step 3: Implement workspace and review-task read services**

```js
export async function getWorkspaceView(client, { userId, topicId }) {
  // return stable slots, artifact inbox summary, and topic-filtered review projection
}
```

- [ ] **Step 4: Re-run the workspace/read-model suite and verify it passes**

Run: `npm test -- --runInBand api/learning/__tests__/workspace-read-service.test.js api/evidence/__tests__/context.test.js --verbose`
Expected: PASS with canonical-home, linked-reference, workspace handler, review-queue handler, and evidence-context assertions green.

- [ ] **Step 5: Commit**

```bash
git add api/learning/workspaces/[topicId].js api/learning/review-tasks/index.js api/learning/lib/workspaces/workspace-read-service.js api/evidence/context.js api/evidence/__tests__/context.test.js api/learning/__tests__/workspace-read-service.test.js
git commit -m "feat(learning): add workspace and review queue projections"
```

## Chunk 4: Frontend Delivery

### Task 10: Add browser client and new learning session page

**Files:**
- Create: `src/api/learningRuntimeApi.js`
- Create: `src/pages/learning-runtime/LearningSessionPage.jsx`
- Create: `src/components/learning-runtime/LearningSessionShell.jsx`
- Create: `src/components/learning-runtime/SessionTimeline.jsx`
- Create: `src/components/learning-runtime/SessionHeader.jsx`
- Create: `src/components/learning-runtime/view-models/session-view-model.js`
- Test: `src/api/__tests__/learningRuntimeApi.test.js`
- Test: `src/components/learning-runtime/__tests__/LearningSessionShell.test.js`
- Test: `src/components/learning-runtime/__tests__/view-models.test.js`

- [ ] **Step 1: Write the failing browser-client and session view-model tests**

```js
test('learning runtime client normalizes typed anchor_ref and fallback posture', async () => {
  const payload = normalizeSessionResponse(serverPayload);
  expect(payload.session.activeScope.currentAnchor.kind).toBe('review_task');
});

test('learning runtime client exports the shared session/workspace/import/artifact contract', () => {
  expect(Object.keys(learningRuntimeApi).sort()).toEqual([
    'askInSession',
    'createSession',
    'getSession',
    'getWorkspace',
    'importQuestion',
    'listReviewTasks',
    'updateArtifact',
  ].sort());
});

test('session view-model preserves questionless runtime state without placeholder ids', () => {
  const vm = buildSessionViewModel(questionlessSessionPayload);
  expect(vm.session.currentQuestion).toBeNull();
  expect(vm.session.currentQuestionTypeId).toBe('9709.trigonometry.identities');
});

test('LearningSessionShell renders questionless sessions without placeholder question chrome', () => {
  const html = renderToStaticMarkup(React.createElement(LearningSessionShell, { viewModel: questionlessSessionVm }));
  expect(html).toContain('learn concept');
  expect(html).not.toContain('placeholder-question-id');
});
```

- [ ] **Step 2: Run the client/view-model suites and verify they fail**

Run: `npm test -- --runInBand src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose`
Expected: FAIL because the browser client and view-model files do not exist yet.

- [ ] **Step 3: Implement the client and session shell**

```js
export const learningRuntimeApi = {
  createSession(payload) { /* POST /api/learning/sessions */ },
  getSession(sessionId) { /* GET /api/learning/sessions/:id */ },
  askInSession(sessionId, payload) { /* POST /api/learning/sessions/:id/ask */ },
  importQuestion(payload) { /* POST /api/learning/questions/import */ },
  getWorkspace(topicId) { /* GET /api/learning/workspaces/:topicId */ },
  listReviewTasks(params) { /* GET /api/learning/review-tasks */ },
  updateArtifact(artifactId, payload) { /* PATCH /api/learning/artifacts/:id */ },
};

// This file owns the full browser contract for `/api/learning/**`.
// Task 11 consumes it, but does not invent a second client shape.
```

- [ ] **Step 4: Re-run the client/view-model suites and verify they pass**

Run: `npm test -- --runInBand src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose`
Expected: PASS with the shared browser-client contract, including imported-question entry, typed refs, fallback posture, questionless-session state normalized in the view-model, and shell-level questionless rendering coverage.

- [ ] **Step 5: Commit**

```bash
git add src/api/learningRuntimeApi.js src/pages/learning-runtime/LearningSessionPage.jsx src/components/learning-runtime/LearningSessionShell.jsx src/components/learning-runtime/SessionTimeline.jsx src/components/learning-runtime/SessionHeader.jsx src/components/learning-runtime/view-models/session-view-model.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/view-models.test.js
git commit -m "feat(web): add learning session page and client"
```

### Task 11: Add workspace UI and demote legacy surfaces

**Files:**
- Create: `src/pages/learning-runtime/TopicWorkspacePage.jsx`
- Create: `src/components/learning-runtime/WorkspaceShell.jsx`
- Create: `src/components/learning-runtime/StableSlotPanel.jsx`
- Create: `src/components/learning-runtime/ArtifactInboxPanel.jsx`
- Create: `src/components/learning-runtime/ReviewQueuePanel.jsx`
- Create: `src/components/learning-runtime/view-models/workspace-view-model.js`
- Modify: `src/components/ChatPanel.jsx`
- Modify: `src/pages/AskAI.jsx`
- Modify: `src/pages/StudyHub.jsx`
- Modify: `src/pages/LearningPath.jsx`
- Modify: `src/App.jsx`
- Test: `src/components/learning-runtime/__tests__/WorkspaceShell.test.js`
- Test: `src/pages/__tests__/legacy-entry-mode.test.js`
- Test: `src/components/learning-runtime/__tests__/view-models.test.js`

- [ ] **Step 1: Extend the failing view-model tests to cover workspace stable slots and linked references**

```js
test('workspace view-model separates canonical slot artifacts from linked references', () => {
  const vm = buildWorkspaceViewModel(serverPayload);
  expect(vm.slots.common_traps.linkedReferences).toHaveLength(1);
});

test('WorkspaceShell renders stable slots and linked references as separate surfaces', () => {
  const html = renderToStaticMarkup(React.createElement(WorkspaceShell, { viewModel: workspaceVm }));
  expect(html).toContain('common traps');
  expect(html).toContain('linked references');
});

test('legacy surfaces demote to compatibility entry modes and App exposes runtime routes', () => {
  expect(getAskAiEntryMode({ learningRuntimeEnabled: true })).toBe('learning_runtime');
  expect(getStudyHubSurfaceMode({ learningRuntimeEnabled: true })).toBe('compatibility_shell');
  expect(getLearningRuntimeRoutePaths()).toEqual(expect.arrayContaining([
    '/learn/session/:sessionId',
    '/learn/workspace/:topicId',
  ]));
});
```

- [ ] **Step 2: Run the workspace view-model suite and verify it fails**

Run: `npm test -- --runInBand src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose`
Expected: FAIL until workspace view-model and UI wiring are implemented.

- [ ] **Step 3: Implement workspace UI and route demotion**

```jsx
<Route path="/learn/session/:sessionId" element={<LearningSessionPage />} />
<Route path="/learn/workspace/:topicId" element={<TopicWorkspacePage />} />
```

- [ ] **Step 4: Re-run the workspace view-model suite and a production build**

Run: `npm test -- --runInBand src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose && npm run build`
Expected: PASS for the shell/page verification suites and a successful Vite production build.

- [ ] **Step 5: Commit**

```bash
git add src/pages/learning-runtime/TopicWorkspacePage.jsx src/components/learning-runtime/WorkspaceShell.jsx src/components/learning-runtime/StableSlotPanel.jsx src/components/learning-runtime/ArtifactInboxPanel.jsx src/components/learning-runtime/ReviewQueuePanel.jsx src/components/learning-runtime/view-models/workspace-view-model.js src/components/ChatPanel.jsx src/pages/AskAI.jsx src/pages/StudyHub.jsx src/pages/LearningPath.jsx src/App.jsx src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js
git commit -m "feat(web): add workspace shell and demote legacy surfaces"
```

## Chunk 5: Convergence And Hardening

### Task 12: Add API boundary tests across session, ask, import, workspace, review, and artifact flows

**Files:**
- Test: `api/_runtime/__tests__/route-registry-learning.test.js`
- Test: `api/evidence/__tests__/context.test.js`
- Test: `api/learning/__tests__/error-contract.test.js`
- Test: `api/learning/__tests__/learning-http.test.js`
- Test: `api/learning/__tests__/session-api.test.js`
- Test: `api/learning/__tests__/session-ask.test.js`
- Test: `api/learning/__tests__/question-import-service.test.js`
- Test: `api/learning/__tests__/workspace-read-service.test.js`
- Test: `api/learning/__tests__/review-task-service.test.js`
- Test: `api/learning/__tests__/artifact-api.test.js`
- Test: `api/learning/__tests__/artifact-service.test.js`
- Test: `api/learning/__tests__/reconciliation-service.test.js`
- Test: `api/learning/__tests__/runtime-contract.test.js`
- Test: `api/learning/__tests__/session-validator.test.js`
- Test: `api/learning/__tests__/released-scope.test.js`

- [ ] **Step 1: Expand the failing contract suites into end-to-end API boundary scenarios**

```js
test('import -> create session -> ask -> workspace read keeps fallback posture and canonical-home consistency', async () => {
  // build the first real vertical-slice test
});

test('marking effect -> review task -> workspace projection -> artifact patch keeps lifecycle and ownership consistent', async () => {
  // build the second vertical-slice test across review/artifact boundaries
});
```

- [ ] **Step 2: Run the full learning API suite and verify any new scenario tests fail**

Run: `npm test -- --runInBand api/_runtime/__tests__/route-registry-learning.test.js api/evidence/__tests__/context.test.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/learning-http.test.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-ask.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/learning/__tests__/released-scope.test.js --verbose`
Expected: FAIL only on the new end-to-end boundary cases you just added.

- [ ] **Step 3: Implement the minimal glue fixes needed for end-to-end consistency**

```js
// No new subsystem here. Only fix integration gaps between already-built runtime units.
```

- [ ] **Step 4: Re-run the full learning API suite and verify it passes**

Run: `npm test -- --runInBand api/_runtime/__tests__/route-registry-learning.test.js api/evidence/__tests__/context.test.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/learning-http.test.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-ask.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/learning/__tests__/released-scope.test.js --verbose`
Expected: PASS across the full learning runtime API boundary suite.

- [ ] **Step 5: Commit**

```bash
git add api/_runtime/__tests__/route-registry-learning.test.js api/evidence/__tests__/context.test.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/learning-http.test.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-ask.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/learning/__tests__/released-scope.test.js
git commit -m "test(learning): add end-to-end runtime contract coverage"
```

### Task 13: Final build, rollout flags, and legacy demotion verification

**Files:**
- Modify: `src/pages/AskAI.jsx`
- Modify: `src/pages/StudyHub.jsx`
- Modify: `src/pages/LearningPath.jsx`
- Modify: `api/rag/lib/ask-service.js`
- Modify: `api/learning/lib/contracts/released-scope.js`
- Create: `docs/superpowers/runbooks/2026-03-20-learning-runtime-pilot-rollout.md`
- Test: `api/rag/__tests__/ask-service.test.js`
- Test: `src/api/__tests__/learningRuntimeApi.test.js`
- Test: `src/components/learning-runtime/__tests__/LearningSessionShell.test.js`
- Test: `src/components/learning-runtime/__tests__/WorkspaceShell.test.js`
- Test: `src/components/learning-runtime/__tests__/view-models.test.js`
- Test: `src/pages/__tests__/legacy-entry-mode.test.js`

- [ ] **Step 1: Add any final failing smoke assertions for feature-flagged runtime entry and legacy demotion**

```js
test('legacy ask-ai page routes users into the new learning runtime entry under the feature flag', () => {
  expect(getAskAiEntryMode({ learningRuntimeEnabled: true })).toBe('learning_runtime');
});

test('legacy study hub stays a compatibility shell under the runtime feature flag', () => {
  expect(getStudyHubSurfaceMode({ learningRuntimeEnabled: true })).toBe('compatibility_shell');
});

test('legacy learning path stays a compatibility shell under the runtime feature flag', () => {
  expect(getLearningPathSurfaceMode({ learningRuntimeEnabled: true })).toBe('compatibility_shell');
});
```

- [ ] **Step 2: Run the final smoke checks and verify the new assertions fail**

Run: `npm test -- --runInBand api/rag/__tests__/ask-service.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose`
Expected: FAIL only on the new smoke assertions.

- [ ] **Step 3: Implement the final glue and run the full verification set**

Run: `npm test -- --runInBand api/_runtime/__tests__/route-registry-learning.test.js api/evidence/__tests__/context.test.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/learning-http.test.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-ask.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/learning/__tests__/released-scope.test.js api/rag/__tests__/ask-service.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose && npm run build`
Expected: all test suites PASS and Vite build completes successfully.

- [ ] **Step 4: Record rollout and migration notes**

```text
- Write `docs/superpowers/runbooks/2026-03-20-learning-runtime-pilot-rollout.md`
- Record the learning runtime feature-flag default
- Record migration order and rollback posture for legacy entry points
- Record which legacy surfaces are compatibility-only after rollout
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/AskAI.jsx src/pages/StudyHub.jsx src/pages/LearningPath.jsx api/rag/lib/ask-service.js api/learning/lib/contracts/released-scope.js docs/superpowers/runbooks/2026-03-20-learning-runtime-pilot-rollout.md src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js
git commit -m "chore(learning): harden rollout and legacy demotion"
```

## Execution Order

### Serial trunk

Tasks `1 -> 2 -> 3 -> 4 -> 5` are strictly serial.

Do not parallelize before Task 5 is complete. Until then, schema, typed refs, anchor legality, repository boundaries, and dynamic session-route semantics are still the critical path.

### Safe backend parallel block

After Task 5:

- Worker A owns Task 6
- Worker B owns Task 7
- Worker C owns Task 8

Worker A should be the same worker that last owned repository files in Task 4. Worker B should be the same worker that last owned session-runtime files in Task 5.

Do not create extra backend workers beyond these three. There is no clean fourth backend slice yet.

Task 9 starts only after Task 8 is merged, because workspace and review projections depend on real artifact/review/mastery side effects rather than placeholder payloads.

### Frontend delivery

Tasks `10 -> 11` stay serial by design.

Do not split them across two frontend workers. They overlap on shared browser-client assumptions, route wiring, and legacy-surface demotion, so parallelizing them would create merge churn rather than speed.

Frontend work starts only after:

- Task 7 has stabilized session/create/read/ask response shapes
- Task 9 has stabilized workspace/review projection shapes

### Convergence

Tasks `12 -> 13` are serial integration/hardening work. Do not split them into fake independent projects.

## Ownership Rules For Multi-Agent Execution

- One worker owns migrations plus the serial-trunk repository slice. No other worker edits `supabase/migrations/*learning_runtime*`, `api/learning/lib/repositories/question-registry-repository.js`, `api/learning/lib/repositories/session-repository.js`, or `api/learning/lib/repositories/workspace-repository.js`.
- One worker owns session runtime and AskAI wrapper files. No other worker edits `api/learning/lib/session-runtime/**`, `api/learning/sessions/**`, or `api/rag/lib/ask-service.js` while that task is active.
- One worker owns orchestration files plus the orchestration repository slice. No other worker edits `api/learning/lib/repositories/review-task-repository.js`, `api/learning/lib/repositories/artifact-repository.js`, `api/learning/lib/repositories/reconciliation-repository.js`, `api/learning/lib/mastery/**`, `api/learning/lib/review/**`, `api/learning/lib/artifacts/**`, `api/learning/lib/reconciliation/**`, `api/marking/evaluate-v1.js`, `api/marking/lib/ledger-orchestrator.js`, or `api/error-book/lib/error-book-service.js`.
- One worker owns workspace projection files. No other worker edits `api/learning/workspaces/**`, `api/learning/review-tasks/**`, or `api/learning/lib/workspaces/**` while that task is active.
- One worker owns frontend runtime delivery. Do not split `src/api/learningRuntimeApi.js`, `src/pages/learning-runtime/**`, `src/components/learning-runtime/**`, `src/App.jsx`, `src/pages/AskAI.jsx`, `src/pages/StudyHub.jsx`, or `src/pages/LearningPath.jsx` across multiple workers in the same stage.
- Legacy surface edits stay minimal and happen only after the new runtime path is already functional.

## Definition Of Done

- `POST /api/learning/sessions` supports all frozen anchor kinds and questionless entry.
- `POST /api/learning/sessions/:id/ask` consumes persisted `active_scope_bundle` with typed refs, not route-only IDs.
- Imported questions become durable runtime questions.
- Pilot family/type registry rows exist in canonical persistence before runtime fan-out starts.
- Pilot trigonometry types support authoritative scoring only when the released-scope gate passes: pilot type, released rubric ref, and validated uncertainty posture.
- Non-pilot families still work through fallback without pretending to be scored releases.
- Workspace and slot uniqueness are enforced in schema, not just in service code.
- Workspace stable slots and review queue projection follow canonical-home rules.
- Artifact lifecycle supports inbox, pinned, contested, and superseded transitions without duplicate truth.
- Reconciliation revises derived state without mutating attempt/mark-run history.
- The new learning-runtime pages are the intended future architecture; old AskAI/StudyHub/LearningPath are compatibility shells only.

---

Plan complete and saved to `docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md`. Ready to execute.
