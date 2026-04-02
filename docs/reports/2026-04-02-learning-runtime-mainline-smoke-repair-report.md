# 2026-04-02 Learning Runtime Mainline Smoke Repair Report

## Scope

This repair wave stayed inside the AO handoff scope:

- restore the canonical frontend dev port to `5173`
- proxy frontend `/api` traffic to `http://127.0.0.1:3001`
- stop the imported-question intake from sending fake topic IDs into the runtime import API
- repair the imported-question session handoff so the first in-session follow-up no longer fails with `409 session_state_conflict`

## Code Changes

### Frontend/dev-server

- `vite.config.js`
  - changed the Vite dev server port from `5174` to `5173`
  - added a `/api` proxy to `http://127.0.0.1:3001`
- `tests/vite.config.test.js`
  - added a regression test for the canonical port and backend proxy

### Imported-question intake

- `src/components/learning-runtime/ImportedQuestionIntake.js`
  - stopped sending the placeholder runtime-context `primary_topic_id`
  - preserved `primary_question_type_id` so the backend still receives the intended canonical question type
- `src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js`
  - updated the regression expectation to require `primary_topic_id: null`

### Session-anchor repair

- `api/learning/lib/session-runtime/session-anchor-resolution.js`
  - when a question anchor cannot recover a canonical topic path from `question.primary_topic_id`, it now falls back to the resolved `primary_question_type_id` for `active_scope_bundle.primary_topic_path`
  - this keeps imported-question sessions legal for the ask path even when the durable imported question has no stored topic UUID
- `api/learning/__tests__/question-import-service.test.js`
  - added a regression test covering imported-question session creation with `primary_topic_id: null`

## Verification

### Targeted automated tests

Command:

```bash
npm test -- --runInBand \
  tests/vite.config.test.js \
  src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js \
  api/learning/__tests__/question-import-service.test.js \
  api/learning/__tests__/session-api.test.js \
  --verbose
```

Outcome:

- PASS `4` suites
- PASS `41` tests

### Direct backend import probe

Method:

- signed up a fresh local Supabase user against `http://127.0.0.1:54321/auth/v1/signup`
- called `POST http://127.0.0.1:3001/api/learning/questions/import` with:
  - `subject_code: 9709`
  - `primary_question_type_id: 9709.trigonometry.equations`
  - `primary_topic_id: null`

Outcome:

- HTTP `200`
- imported question persisted successfully
- `question.primary_topic_id` remained `null`
- `scoring_scope_posture.fallback_mode` returned `non_released_fallback`

### Real browser smoke

Method:

- used a headless Playwright/Chromium run against the live frontend at `http://127.0.0.1:5173`
- signed up a fresh user in the real auth modal
- opened `/learn/session/new?entry=imported_question`
- imported the standard `9709` sample `Solve 2sin x = 1 for 0 <= x < 360.`
- entered the runtime session
- sent the first follow-up

Outcome:

- signup: HTTP/UI success
- import: HTTP `200`
- create session: HTTP `200`
- created session bundle included `primary_topic_path: 9709.trigonometry.equations`
- first follow-up ask: HTTP `200`
- ask posture remained `non_released_fallback`

Observed assistant message:

> I cannot answer right now because the retrieval step failed.

That message still represents a successful session ask response from the runtime path; the earlier `409` blocker is resolved.

## Environment Notes

- local Supabase migrations were reconciled against the existing repo migrations only
- the backend dev server had to be restarted after the code fix so the live browser smoke would exercise the updated session-anchor resolver
- for this machine, browser smoke required user-local extraction of missing Chromium shared libraries under `/tmp`; no repo files were changed for that setup

## Remaining Non-Blocking Issues

- `/api/community/*` requests still log `401` console noise during authenticated browser sessions; this did not block the learning-runtime import/session/ask flow
- the first follow-up returned a graceful retrieval-fallback message instead of a grounded worked hint; that appears to be a separate RAG/content availability issue rather than an imported-question session-contract failure
