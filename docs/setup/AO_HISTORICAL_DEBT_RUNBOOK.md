# AO Historical Debt Runbook

## Scope

This runbook defines the phase-6 operator posture for historical debt in the repo-local AO control plane.

`ao-state --json` should be the first read before manual cleanup.

## Debt Categories

- `keep_evidence` means the local branch, worktree, or other repo-local signal still matches a live task posture and should remain in place.
- `archive_candidate` means the durable AO history is retired and quiet enough to be considered for later archival, but should still remain traceable now.
- `cleanup_candidate` means repo-local noise or stale runtime residue that should be cleaned with an explicit operator action.

`cleanup_candidate` means repo-local noise or stale runtime residue.

## Reading The Debt Surface

Read:

- `debt.summary.category_counts`
- `debt.summary.item_kind_counts`
- `debt.inspections[*].item_kind`
- `debt.inspections[*].category`
- `debt.inspections[*].recommended_action`
- `debt.inspections[*].reason_codes`

Interpretation:

- `task_worktree` and `task_branch` cleanup candidates are usually Git residue that no longer matches current managed task posture.
- `controller_lease` and `ownership_lease` cleanup candidates are usually stale runtime residue, not durable history to delete.
- `managed_task` archive candidates are retired durable records that should remain available for incident replay and audit.
- `artifact` cleanup candidates are loose local outputs that should move into `runs/` or be deleted after review.

## Cleanup Guardrails

- Do not use destructive reset commands as debt cleanup shortcuts.
- Do not delete dirty worktrees or branches just because they are old; read the matched task posture first.
- Prefer state transition or explicit closeout over silent deletion when AO still recognizes the task.
- Keep historical evidence if the operator cannot yet answer why it is safe to remove.

## Minimum Cleanup Loop

1. Run `node scripts/ao-state.js --json`.
2. Review `debt.inspections[*]` and separate `keep_evidence` from `cleanup_candidate`.
3. If the item is a task residue, confirm the corresponding `tasks.inspections[*].closeout_status`.
4. If the item is a stale lease, reclaim or release it with the control-plane command that owns that lifecycle.
5. If the item is a loose artifact, move it under `runs/` or delete it after the evidence is preserved elsewhere.
6. Record what was cleaned and what was intentionally retained.
