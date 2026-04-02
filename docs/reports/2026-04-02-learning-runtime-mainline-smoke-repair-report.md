# 2026-04-02 Learning Runtime Mainline Smoke Repair Report

## Scope

This report records the approved repair wave for the imported-question mainline on the live Supabase project behind `nbzvlqtgnkmohlamguzz`.

Target flow:

- import the standard `9709` trigonometry sample from `http://localhost:5173/learn/session/new?entry=imported_question`
- enter the runtime session created from that durable imported question
- send the first follow-up turn `What should I do first?`

## Original Failure Summary

The failure chain was multi-stage:

1. Browser import originally failed on the same-origin runtime path, which led to the direct backend probe.
2. The linked Supabase project was behind the repo’s learning-runtime migrations, so the direct backend probe exposed missing runtime tables instead of a healthy import path.
3. After the missing migrations were pushed, the exact approved sample still failed twice on backend writes:
   - request `3f0b51c7-b6d4-4092-9eb3-69f9adefa2f3`
   - `Failed to reserve learning request idempotency row: invalid input syntax for type uuid: "student-1"`
   - root cause: `AUTH_LOCAL_TEST_MODE` mapped `test-user:student-1:student` to a non-UUID `user_id`, but `learning_request_idempotency.user_id` is UUID-backed
4. After the auth mapping fix, the exact sample still failed on imported-question persistence:
   - request `51335caf-5e79-4d9e-95f3-9a2d1ef77fcf`
   - `Failed to insert imported question: invalid input syntax for type uuid: "topic-trig-equations"`
   - root cause: the approved sample passes `primary_topic_id = topic-trig-equations`, but the durable column is UUID-backed

## Migration State

### Before push

Before reconciliation, the live Supabase project was missing the runtime tables required by the imported-question flow:

- `learning_request_idempotency` -> `42P01`
- `learning_question_types` -> `42P01`
- `learning_question_analysis_snapshots` -> `42P01`

The missing schema was already present in repo migrations:

- `20260320110000_expand_question_bank_for_learning_runtime.sql`
- `20260320111000_create_learning_runtime_core.sql`
- `20260320111500_seed_learning_runtime_pilot_registry.sql`
- `20260320112000_create_learning_runtime_read_models.sql`
- `20260324120000_create_learning_request_idempotency.sql`

### Push actions

Applied against the linked project:

```bash
supabase link --project-ref nbzvlqtgnkmohlamguzz
supabase db push --dry-run --yes
supabase db push --yes
```

### After push

Post-push verification:

- `learning_request_idempotency` -> `OK rows=0`
- `learning_question_types` -> `OK rows=3`
- `learning_question_analysis_snapshots` -> `OK rows=0`
- pilot registry row `9709.trigonometry.equations` exists with `release_state = released`
- migration ledger is now `in_sync`

Recorded after-state artifacts:

- `docs/reports/rag_supabase_migration_state.md`
- `runs/backend/rag_supabase_migration_state.json`

## Code Repair Summary

### Local test auth

`api/lib/security/auth-context.js` now provisions or reuses a real `auth.users` row for local-test tokens so UUID-backed runtime tables receive a valid `user_id`.

Observed ensured user:

- email: `student-1@example.test`
- id: `99ab903e-46aa-4cfb-9317-cf09aae34d79`

Regression coverage:

- `api/lib/security/__tests__/auth-context.test.js`

### Imported-question topic normalization

`api/learning/lib/import/question-import-service.js` now normalizes the approved pilot runtime topic aliases before durable writes so the exact plan sample stays unchanged while the stored row stays schema-valid.

Observed compatible behavior for the approved sample:

- incoming `primary_topic_id`: `topic-trig-equations`
- stored `question.primary_topic_id`: `null`
- stored `question.primary_question_type_id`: `9709.trigonometry.equations`

Regression coverage:

- `api/learning/__tests__/question-import-service.test.js`

## Direct Backend Import Result

Command:

```bash
curl -sS -i -X POST http://127.0.0.1:3001/api/learning/questions/import \
  -H 'Authorization: Bearer test-user:student-1:student' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: smoke-import-direct-1' \
  --data '{"subject_code":"9709","prompt_representation":{"type":"text","value":"Solve 2cos(2x)-3sin x=0 for 0<=x<=180 degrees."},"provenance_summary":{"import_source":"manual_paste"},"classification":{"primary_question_type_id":"9709.trigonometry.equations","primary_topic_id":"topic-trig-equations"}}'
```

Final result:

- HTTP `200`
- request id: `bd8d4e11-9200-474a-aeca-f050451c320b`
- question id: `30608d86-b672-4b58-9340-5e31d4531684`
- `question.primary_topic_id = null`
- `question.primary_question_type_id = 9709.trigonometry.equations`
- `scoring_scope_posture.release_scope_status = non_released_fallback`
- `scoring_scope_posture.fallback_reason_code = missing_released_rubric`

## Real-Browser Smoke Result

Browser target:

- `http://localhost:5173/learn/session/new?entry=imported_question`

Sample:

- subject code: `9709`
- runtime context: `9709.trigonometry.equations`
- topic id passed by the UI contract: `topic-trig-equations`
- prompt: `Solve 2cos(2x)-3sin x=0 for 0<=x<=180 degrees.`
- first follow-up: `What should I do first?`

Observed result:

- import request -> HTTP `200`
- create session request -> HTTP `200`
- ask request -> HTTP `200`
- browser import question id: `a02cc6f2-1566-4a3c-b4b3-ead2b5d27d1b`
- browser session id: `d4a0ff40-1589-4ed7-be50-e89b5e29a566`
- session shell shows:
  - `Anchor: question`
  - `Topic: 9709.trigonometry.equations`
  - `Fallback: non_released_fallback`
- follow-up result rendered in the timeline:
  - `I cannot answer right now because the retrieval step failed.`
  - `Fallback reason: missing_released_rubric`
  - `Evidence topic: 9709.trigonometry.equations`

Browser-captured request ids:

- import: `17cfab96-aff4-4bb5-ab03-8c753c7db2ab`
- create session: `e1d44512-0087-41e1-bee7-28aa0c9f4e83`
- ask: `0a97ebc9-7a79-4155-a209-ee5dc18ba931`

Screenshot artifacts:

- `output/playwright/2026-04-02-imported-question-posture.png`
- `output/playwright/2026-04-02-imported-question-follow-up.png`

## Residual Non-Blocking Issues

- The first follow-up still returns a graceful retrieval-fallback message instead of a grounded worked hint. The runtime path is healthy, but retrieval/content readiness is still separate work.
- In this environment, a handcrafted Supabase `localStorage` session blob alone did not cause `supabase-js` to hydrate a live browser session. The smoke harness therefore patched the in-page `supabase.auth.getSession()` to return the same local-test session before driving the UI. The import/session/ask requests themselves still ran through the live browser and backend.
- The navbar still showed `登录 / 注册` during the smoke because that UI is driven by the frontend auth state, not by the runtime API responses exercised here.

## Outcome

The approved mainline is restored for the exact sample:

- direct backend import passes
- browser import passes
- browser session creation passes
- first in-session follow-up passes

The remaining user-visible degradation is in retrieval quality, not in the imported-question runtime contract.
