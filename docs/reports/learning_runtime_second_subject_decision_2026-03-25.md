# Learning Runtime Second Subject Decision

**Date:** 2026-03-25  
**Decision:** choose `9702` (Physics) as the second subject after `9709`  
**Status:** selected next, not runtime-enabled yet

## Decision Criteria

- Use live repo evidence, not aspirational product language alone.
- Prefer a subject that already has meaningful content and retrieval surfaces in the repo.
- Avoid a path that can look successful by silently reusing `9709` heuristics.
- Choose a subject that forces the adapter contract to prove itself in classification, marking, mastery, and review semantics.

## Evidence Snapshot

### 1. The shipped runtime is still overwhelmingly `9709`-specific

Repo counts captured from the current branch:

- `api/learning src/components/learning-runtime src/pages/learning-runtime`
  - `9709`: `360`
  - `9231`: `1`
  - `9702`: `0`
- `api/marking tests/marking`
  - `9709`: `29`
  - `9231`: `0`
  - `9702`: `0`

This confirms the issue premise: the current runtime is not a landed multi-subject runtime.

Additional repo evidence:

- `api/rag/lib/ask-service.js` contains a `9709`-specific cross-topic planning heuristic.
- `src/components/learning-runtime/ImportedQuestionIntake.js` and `src/components/learning-runtime/view-models/session-live-state.js` still default to `9709`.

### 2. The repo already has real multi-subject content surfaces

Past-paper files:

- `data/past-papers/9702Physics`: `316`
- `data/past-papers/9231Further-Mathematics`: `156`

Mark-scheme files:

- `data/mark-schemes/9702Physics`: `344`
- `data/mark-schemes/9231Further-Mathematics`: `163`

Topic-note files:

- `src/data/data-notes/9702as+a2`: `43`
- `src/data/data-notes/9231FP4data-notes`: `33`

This shows that the repo already has stronger raw content coverage for `9702` than for `9231`.

### 3. `9702` creates a better adapter test than `9231`

The misconception taxonomy already shows subject-specific behavior:

- `supabase/migrations/20260217100003_create_misconception_tables.sql` gives `9702` a unique `unit_error` tag.
- `9231` mostly shares the existing math-oriented misconception set with `9709`.

That difference matters for this issue. The goal is not to find the closest math neighbor; it is to freeze an adapter boundary that survives a genuinely different subject.

## Why `9702` Wins

- `9702` has better live repo evidence than `9231` across papers, mark schemes, and topic notes.
- `9702` forces the system to acknowledge non-math semantics early instead of pretending math defaults generalize.
- `9702` is closer to the PRD’s open expansion question, which explicitly asks about Physics vs Chemistry rather than about another math syllabus.

## Why `9231` Was Not Chosen First

- It is too easy to treat `9231` as “more math” and accidentally copy `9709` assumptions forward.
- The current repo evidence shows less raw content coverage than `9702`.
- For this foundation issue, similarity is a risk: it can hide a weak adapter boundary instead of validating it.

## Resulting Runtime Rule

- `9709` stays runtime-enabled.
- `9702` is recorded as the next adapter target.
- Any attempt to use `9702` in the learning runtime before rollout must fail explicitly with `subject_adapter_not_enabled`, not silently inherit `9709` behavior.
