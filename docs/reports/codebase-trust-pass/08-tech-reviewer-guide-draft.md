# Tech Reviewer Guide Draft (Issue #466, optional output)

Purpose: help a human reviewer evaluate next one-PR slices against bounded trust-pass findings.

## What to verify before approving each follow-on PR

1. Confirm the PR keeps `active_scope_bundle` and typed-ref invariants unchanged unless explicitly authorized.
2. Confirm route changes preserve first-match + auth + rate metadata expectations in `api/_runtime/route-registry.js`.
3. Confirm runtime page changes include route-state transition coverage for `/learn/session/:sessionId` and `/learn/workspace/:topicId`.
4. Confirm all modifications in cleanup PRs still preserve non-authoritative fallback behavior for non-released questions.
5. Confirm PR scope is one of the planned slices and does not combine unrelated domains.
6. Confirm docs changes for any AO/no-op workflow ambiguity are explicit (release vs advisory vs AO-only).
7. Confirm no test/coverage assertions are interpreted as full-stack guarantees when they are API-only.
8. Confirm no compatibility bridges are removed as part of cleanup unless explicit migration plan exists.

## One-page reviewer decision rule

- P0 criteria satisfied: coverage semantics + route-collision guard are either implemented or documented with explicit exception handling.
- P1 criteria satisfied: each PR adds one constrained regression prevention mechanism and includes evidence from the original files.
- P2 criteria satisfied: follow-up docs/index changes complete, and no hidden scope expansion is observed.

## Evidence-first review template

- `Issue`: #466
- `Observed changed files`:
- `Route contract impact`:
- `Runtime contract impact`:
- `Gate interpretation`:
- `Acceptance criteria status`: pass / block / defer

## Suggested response format to owner

Reviewer should return one short line per slice with:
`PASS/DEFER + scope + evidence path + next slice`

If any item is deferred, include:
- exact failing assumption,
- exact repo evidence path,
- owner decision required.
