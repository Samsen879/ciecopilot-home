# Local DB Verification (Windows PowerShell)

## Requirements
- Docker Desktop running
- Supabase CLI available in PATH

## One-command run
```powershell
.\scripts\db\run_verify.ps1
```

## Notes (PowerShell)
- Show stash in PowerShell (stash ref must be quoted):
  ```powershell
  git stash show -p --stat "stash@{0}" | Out-Host -Paging
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
