# Local DB Verification

## Requirements
- Docker Desktop running
- Supabase CLI available in PATH
- `http://localhost:5173` is the canonical local frontend URL for learning-runtime smoke
- Learning-runtime smoke depends on repo migrations through `20260324120000_create_learning_request_idempotency.sql`

## PowerShell Runner
```powershell
.\scripts\db\run_verify.ps1
```

## Bash / WSL Manual Flow
```bash
supabase start --debug
supabase db reset --debug
psql "$DATABASE_URL" -f scripts/db/verify_schema.sql
psql "$DATABASE_URL" -f scripts/db/verify_search_guardrail.sql
node scripts/rag/run_supabase_migration_state.js
```

If `DATABASE_URL` is not already exported, use the local Supabase default, for example:

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

## Notes
- Do not stop at the legacy initial schema if you are verifying the current learning-runtime flow. The runtime smoke path requires the March 20 and March 24 repo migrations.
- Runtime verification should include all of the following, not just the schema SQL checks:
  - `node scripts/rag/run_supabase_migration_state.js`
  - direct backend import probe for the imported-question flow
  - real-browser imported-question smoke through `http://localhost:5173/learn/session/new?entry=imported_question`
- Show stash in PowerShell (stash ref must be quoted):
  ```powershell
  git stash show -p --stat "stash@{0}" | Out-Host -Paging
  ```
- Show stash in Bash / WSL:
  ```bash
  git stash show -p --stat stash@{0} | less
  ```
- Avoid Unix tools (head/sed). Use:
  - `Select-Object -First N`
  - `Get-Content <file> -TotalCount N`

## What the script does
1. `supabase start --debug` (skips if DB container already running)
2. `supabase db reset --debug`
3. Runs:
   - `scripts/db/verify_schema.sql`
   - `scripts/db/verify_search_guardrail.sql`

## Learning Runtime Smoke

Use the repo migrations only. Do not hand-create runtime tables in the Supabase dashboard.

### Direct backend import probe

Start the backend in local test-auth mode:

```bash
env AUTH_LOCAL_TEST_MODE=true ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001 npm run api:dev
```

Then run the standard imported-question probe:

```bash
curl -sS -i -X POST http://127.0.0.1:3001/api/learning/questions/import \
  -H 'Authorization: Bearer test-user:student-1:student' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: smoke-import-direct-1' \
  --data '{"subject_code":"9709","prompt_representation":{"type":"text","value":"Solve 2cos(2x)-3sin x=0 for 0<=x<=180 degrees."},"provenance_summary":{"import_source":"manual_paste"},"classification":{"primary_question_type_id":"9709.trigonometry.equations","primary_topic_id":"topic-trig-equations"}}'
```

Expected runtime result:
- `HTTP/1.1 200`
- response includes `question.question_id`
- response includes `scoring_scope_posture`

### Real-browser imported-question smoke

Run the frontend on the canonical port:

```bash
npm run dev -- --port 5173
```

Then use a real browser harness to:
- inject the Supabase local session under `sb-nbzvlqtgnkmohlamguzz-auth-token`
- open `http://localhost:5173/learn/session/new?entry=imported_question`
- paste `Solve 2cos(2x)-3sin x=0 for 0<=x<=180 degrees.`
- click `Import question`
- wait for the posture banner
- click `Enter runtime session`
- wait for the session page
- type `What should I do first?`
- click `Send follow-up`
