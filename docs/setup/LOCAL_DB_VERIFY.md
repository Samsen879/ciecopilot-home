# Local DB Verification

## Requirements
- Docker Desktop running
- Supabase CLI available in PATH

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
```

If `DATABASE_URL` is not already exported, use the local Supabase default, for example:

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

## Notes
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
