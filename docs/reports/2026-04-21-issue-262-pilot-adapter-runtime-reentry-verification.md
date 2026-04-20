# 2026-04-21 Issue 262 Pilot Adapter Runtime Re-entry Verification

## Scope

Issue `#262` requires truthful reconciliation against the fresh `#259` / `#260` /
`#261` baseline before assuming the pilot adapter runtime slice is missing.

This report covers the narrow `9709` pilot adapter runtime only:

- the approved `adapter_method` dispatcher surface
- rubric-template binding into `evaluate-v1`
- the real `evaluate-v1` marking path
- authoritative versus conservative runtime posture as it exists today

This report does not widen into the effect-engine core, scheduler redesign,
artifact rendering, or the final closed-loop gate.

## Baseline-Sync Note

The required preflight command was run from the AO task worktree:

```bash
npm run workflow:baseline:sync
```

Observed result:

- the script fetched `origin`
- the root repo baseline pull failed with `git pull --ff-only`
- the root repo branch is currently divergent, so the sync script aborted without
  changing the AO task worktree

Relevant current-line fact for this task:

- the assigned AO worktree `feat/262` is still exactly at `origin/main`
- both `HEAD` and `origin/main` resolved to `52519a3e775136da79e42d47990199716869068e`

That means the truthful reconciliation target for `#262` is still the current
repo line on `main`, even though the root baseline helper could not fast-forward
its separate checkout.

## Current-Line Reconciliation

Issue `#262` is already materially landed on the current repo line.

The landing commit for this slice is already present on `main`:

- `dcf3eb4` `feat: execute 9709 pilot adapter templates in evaluate-v1 (#237)`

The fresh `#259` re-entry audit on PR `#266` classifies the corresponding
adapter-runtime slice (`#230`) as `landed` on the 2026-04-21 repo line. The
current `#262` issue body asks for the same narrow runtime surface against the
fresh baseline, so the first honest question is whether that slice is still
missing now. The answer is no.

Current-line proof surfaces for the adapter-runtime slice are:

- `api/learning/lib/marking/adapter-method-dispatcher.js`
- `api/learning/lib/subjects/subject-adapter-registry.js`
- `api/marking/lib/rubric-resolver-v1.js`
- `api/marking/evaluate-v1.js`
- `api/learning/__tests__/adapter-method-dispatcher.test.js`
- `api/learning/__tests__/subject-adapter-registry.test.js`
- `api/marking/__tests__/rubric-resolver-v1.test.js`
- `api/marking/__tests__/evaluate-v1.test.js`
- `docs/reports/2026-04-18-issue-230-pilot-adapter-runtime-coverage-note.md`

The adjacent baseline items do not reopen this slice:

- PR `#267` closes out `#260` as runtime-effects verification only
- PR `#268` adds bridge retry persistence for `#261`
- neither PR claims that the pilot adapter runtime itself is missing on the
  current line

## Fresh Verification

After reconciling current repo truth, the focused adapter-runtime proof was run
from the AO task worktree with its local `node_modules` install:

```bash
npm test -- --runInBand \
  api/learning/__tests__/adapter-method-dispatcher.test.js \
  api/learning/__tests__/subject-adapter-registry.test.js \
  api/marking/__tests__/rubric-resolver-v1.test.js \
  api/marking/__tests__/evaluate-v1.test.js \
  --verbose
```

Observed result:

- `PASS`
- `4` suites passed
- `59` tests passed

## What The Passing Proof Covers

`api/learning/__tests__/adapter-method-dispatcher.test.js` proves:

- runtime dispatch stays limited to the approved `9709` pilot methods
- dependency gating is preserved inside the adapter runtime
- trivial non-proof trig input stays conservative for the released identities
  template

`api/learning/__tests__/subject-adapter-registry.test.js` proves:

- the registry binds released pilot templates only through approved released
  rubric versions
- `9709` remains the fully supported current runtime subject
- non-current subjects still fail closed behind explicit fallback posture

`api/marking/__tests__/rubric-resolver-v1.test.js` proves:

- released pilot template metadata binds behind the runtime flag
- unreleased or missing rubric refs do not bind pilot template metadata
- resolver audit logs record whether a pilot template was bound and which
  adapter methods were activated

`api/marking/__tests__/evaluate-v1.test.js` proves:

- at least one released-scope `9709` pilot template executes through the real
  `evaluate-v1` marking path
- runtime dispatch flows from template metadata into awarded and withheld marks
- trivial trig input remains conservative under the same runtime
- low-confidence released-scope posture still keeps downstream learning effects
  conservative even when the pilot runtime executes

## Residual Delta

There is no honest remaining product-code delta inside the `#262` slice itself.

The still-open runtime re-entry risks named by the `#259` audit remain outside
this issue:

- the `#232` scheduler / runtime-state seam is still only partially landed
- the `#233` proof surface is still narrower than an authoritative whole-line
  gate

Those are real blockers for the broader closed-loop claim, but they are not a
reason to invent new adapter-runtime work under `#262`.

## Conclusion

Issue `#262` is already materially landed on the current repo line.

The honest closeout for this issue is checked-in verification, not new adapter
runtime implementation. The current line already contains:

- the narrow `adapter-method-dispatcher`
- rubric-template adapter metadata binding into `evaluate-v1`
- real marking-path execution for the released `9709` pilot templates
- explicit authoritative versus conservative runtime posture behavior

This report should be used as the checked-in closeout record for `#262`.
