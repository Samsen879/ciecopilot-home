# Backend Gate Policy Governance

## Scope

This document describes the Phase2 backend gate governance layer implemented in:

- `scripts/phase2/run_backend_gate.py`
- `config/backend_gate_policy.json`

The focus is policy-driven gate evaluation only (no business API logic changes).

## Required vs Advisory

Gate level is declared in `config/backend_gate_policy.json`:

- `required`: release-signoff blocking signals
- `advisory`: quality and governance signals that degrade readiness but do not become strict blockers unless promoted

`run_backend_gate.py` emits:

- `required_gates`
- `advisory_gates`
- `required_failures` / `required_blocked` / `required_degraded`
- `advisory_alerts`

## Strict-Required Behavior

Policy section:

```json
"strict_required": {
  "block_on_non_pass": true,
  "block_raw_statuses": ["skipped", "missing", "unknown", "missing_artifact"]
}
```

When `--strict-required` is enabled, any required gate that is not `pass` is explicitly surfaced in `strict_required_blockers`.
Additionally, required gates with raw status in `block_raw_statuses` are always treated as blockers.

Outputs:

- `strict_required_policy`
- `strict_required_triggered`
- `strict_required_blockers`

This makes `skipped` / `missing` required gates clearly explainable in strict mode.

## Overall Status Rules

Status model:

- `pass`
- `degraded`
- `blocked`

Resolution order:

1. `strict_required_triggered` -> `blocked`
2. any `required_blocked` -> `blocked`
3. any step failure / advisory alert / required degraded -> `degraded`
4. otherwise -> `pass`

## Migration Audit Signal

`run_backend_gate.py` adds an advisory gate evaluation:

- gate name: `migration_file_audit`
- source: `git status --porcelain --untracked-files=all -- supabase/migrations`

Signal fields are emitted inside `gate_evaluations.migration_file_audit.risk_signals`:

- `deleted_tracked_count` + path list
- `untracked_count` + path list
- `modified_count`
- `rename_count`
- git command exit/stderr tails

`deleted` or `untracked` migration files mark this gate as `degraded`, so migration drift/conflict risk is visible in backend gate summary without modifying any migration SQL.
