# 2026-04-21 Issue 264 Artifact Content Activation Re-entry Closeout

## Scope

Issue `#264` must be reconciled against the fresh `#259` through `#262`
baseline before claiming any remaining implementation work.

This report records the truthful narrow outcome only:

- verify whether pilot artifacts are still metadata-only shells on the current
  repo line
- verify whether versioned artifact content already exists and is projected
  through workspace reads
- record the exact rerunnable gate used for the current repo line
- avoid re-implementing behavior that is already landed

This report does not widen into scheduler redesign, effect-engine redesign,
artifact authoring UX, or the final closed-loop release gate.

## Baseline Sync Truth

Required command:

```bash
npm run workflow:baseline:sync
```

Observed result:

- failed in `/home/samsen/code/ciecopilot-home`
- `git pull --ff-only` aborted with `fatal: Not possible to fast-forward,
  aborting.`

That means the preserved root baseline checkout is currently diverged and could
not be used as a clean fast-forward sync point. Reconciliation therefore
continued in the assigned AO task worktree, which was already at current
`origin/main` commit `52519a3`.

## Baseline Reconciliation

The current repo line already contradicts the stale assumption in the issue body
that pilot artifacts are still metadata-only shells.

The key landed proof is commit:

- `3c066ac` `feat: activate artifact content for pilot residents (#236)`

That landed commit already introduced the exact surfaces named by issue `#264`:

- `api/learning/lib/artifacts/artifact-service.js`
- `api/learning/lib/repositories/artifact-content-repository.js`
- `api/learning/lib/repositories/artifact-repository.js`
- `api/learning/lib/workspaces/workspace-read-service.js`
- `api/learning/__tests__/artifact-content-repository.test.js`
- `api/learning/__tests__/artifact-repository.test.js`
- `api/learning/__tests__/artifact-service.test.js`
- `api/learning/__tests__/workspace-read-service.test.js`
- `supabase/migrations/20260417123000_create_learning_artifact_content_versions.sql`

Current-line behavior already present before this branch:

- `learning_artifact_content_versions` stores renderable artifact content as
  versioned rows with `is_current` and lineage metadata
- runtime artifact materialization persists an initial content version alongside
  the artifact metadata row
- topic artifact reads merge current content into the artifact projection
- workspace reads project renderable resident content, preserve slot warnings,
  and distinguish `missing_artifact_content` from
  `awaiting_verification`

Issue `#264` depends on `#261`, and PR `#268` for issue `#261` is still open on
`feat/261`. For the narrow `#264` slice, that open PR is not a clean-completion
blocker because the artifact content persistence and workspace projection work is
already landed on `main`. This report does not claim that the broader retry
re-entry path is fully closed without PR `#268` merging.

## Branch Delta

This branch adds report-only closeout evidence.

No production behavior changed on this branch because reconciliation found no
remaining implementation delta for issue `#264` on the current repo line.

No live PR existed for issue `#264` at the time of reconciliation.

## Fresh Verification

The worktree does not have its own `node_modules` tree, so the default
`npm test` script could not resolve Jest from this AO worktree. The rerunnable
gate below uses the shared dependency tree from the preserved baseline checkout
without changing package state.

Command run from the AO task worktree:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/artifact-content-repository.test.js \
  api/learning/__tests__/artifact-repository.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/workspace-read-service.test.js \
  --verbose
```

Observed result:

- `PASS`
- `4` suites passed
- `46` tests passed

## What The Passing Proof Covers

`api/learning/__tests__/artifact-content-repository.test.js` proves:

- the first content version is persisted as the stable current version
- later content versions preserve historical lineage while promoting the new
  current version
- failed replacement writes do not clear the previous current version

`api/learning/__tests__/artifact-repository.test.js` proves:

- topic artifact reads batch current-content loading into one query
- current version metadata is merged into the artifact read model

`api/learning/__tests__/artifact-service.test.js` proves:

- runtime candidate materialization persists an initial renderable content
  version alongside artifact metadata
- pilot artifact candidates expose current content version metadata immediately
- lifecycle and slot compatibility remain aligned with the existing artifact
  model

`api/learning/__tests__/workspace-read-service.test.js` proves:

- workspace projection returns renderable resident artifact content
- resident slots keep stable visibility when an unverified successor exists
- slot state truth distinguishes renderable, missing-content, and
  awaiting-verification states
- the closed-loop path from marking effect through review-task and workspace
  projection remains compatible with the existing lifecycle model

## Conclusion

Issue `#264` was already materially landed on the current repo line before this
branch.

The truthful closeout is:

- the implementation work for versioned artifact content and renderable
  workspace projection was already landed by commit `3c066ac`
- the current repo line passes the focused artifact-content verification gate
- this branch adds evidence and reconciliation only, not new runtime behavior

That is the narrowest honest PR for issue `#264`.
