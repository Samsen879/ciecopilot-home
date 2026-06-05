# ReviewTask Completion Evidence Compatibility Note

Issue: #360
Parent epic: #355
Branch: `task/360-review-completion-evidence`
Scope: backend-only ReviewTask lifecycle evidence hardening.

## Contract Source

- PRD v4.1 keeps `ReviewTask.status` to `open`, `partial`, `completed`, `skipped`, and `expired` and states that completion cannot be a bare done checkbox.
- PRD v4.1 requires mode-specific behavior evidence:
  - `quick_recall`: recall response or oral/text restatement.
  - `reconstruct_derivation`: reconstructed key step chain.
  - `redo_variant`: new attempt.
  - `timed_check`: timed verification.
  - `trap_fix`: proof that the target misconception was fixed in new steps or a new question.

## Compatibility Mode

The retained compatibility mode is write-time only:

- Existing stored `learning_review_tasks` rows are not rewritten, reclassified, or retroactively invalidated.
- Existing callers may still send summary/note-style evidence for `partial`, `skipped`, and `expired` outcomes when it explains the incomplete, skipped, or expired state.
- Existing callers may still include `summary`, `note`, and typed refs alongside completed evidence, but `completed` now also requires behavior evidence matching the task mode.
- A bare `intent: "complete"` request without evidence remains invalid.

## Strict Boundary

For `completion_outcome: "completed"`, the backend validates the stored task mode before writing `status: "completed"`:

- `quick_recall` requires `recall_response` or `recall_response_ref`.
- `reconstruct_derivation` requires `derivation_steps` or `derivation_ref`.
- `redo_variant` requires `attempt_ref` or `variant_attempt_ref`.
- `timed_check` requires `timed_check` duration/completion evidence or `timed_attempt_ref`.
- `trap_fix` requires `fixed_misconception_tags` plus corrected steps or a corrected/fix attempt ref.

Every accepted lifecycle outcome records `completion_evidence.evidence_contract` with the task mode, outcome, and validation kind so downstream metrics can distinguish `completed`, `partial`, `skipped`, and `expired` without inferring from a bare checkbox.

## Non-Goals

- No frontend action-bar changes.
- No marking-engine changes.
- No 9231 or 9709 content production.
- No duplicate paper/topic review queue.
