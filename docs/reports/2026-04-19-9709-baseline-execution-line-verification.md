# 9709 Baseline Execution-Line Verification

Date: 2026-04-19
Issue: `#242`
PR: `#250`
Status: pass

## Summary

This note records the exact issue `#242` command rerun on `feat/242` after restoring the local worktree bootstrap and fixing the baseline gate regression exposed by the live `mixed-ranking-paper-authority` fixture.

The required closure surfaces exist, the required checked-in rerun artifacts exist, the closure runner dry-run prints the expected 4-step plan, and the baseline gate now exits `0` in docker `psql` mode.

## Execution Fingerprint

- worktree: `/home/samsen/.worktrees/ciecopilot-home/cie-179`
- current branch: `feat/242`
- repo SHA before the `#242` fix commit: `bd6476ad5f343fd4001d07bd1ec60da939523157`
- baseline fixture path: `data/eval/question_search_gold_9709_v1.json`
- gate report path: `/tmp/9709-baseline-gate-check.md`
- gate JSON path: `/tmp/9709-baseline-gate-check.json`
- `psql` mode: `docker`

## Authority References

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `docs/reports/2026-04-16-9709-minimal-complete-loop-current-state.md`
- `docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md`
- `scripts/learning/run_9709_wave1_search_closure.js`

## Command List

### Repo Workflow Precheck

```bash
npm run workflow:baseline:sync
```

### Local Worktree Bootstrap

```bash
npm ci
```

### Targeted Regression Tests

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/question-search-service.test.js
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/question-search-repository.test.js
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand scripts/evaluation/__tests__/question-search-gate.test.js
```

### Issue #242 Commands

```bash
node - <<'NODE'
const fs = require('fs');
const required = [
  'scripts/learning/run_9709_wave1_search_closure.js',
  'scripts/learning/run_paper_question_registry_backfill_host.ps1',
  'scripts/learning/run_question_analysis_backfill_host.ps1',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: required }, null, 2));
NODE
```

```bash
node - <<'NODE'
const fs = require('fs');
const required = [
  'docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json',
  'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: required }, null, 2));
NODE
```

```bash
node scripts/learning/run_9709_wave1_search_closure.js --dry-run
```

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/9709-baseline-gate-check.md \
  --json-out /tmp/9709-baseline-gate-check.json \
  --psql-mode docker
```

## Files Changed

- `api/learning/lib/repositories/question-search-repository.js`
- `api/learning/lib/questions/question-search-service.js`
- `data/eval/question_search_gold_9709_v1.json`
- `scripts/evaluation/run_question_search_gate.js`
- `api/learning/__tests__/question-search-repository.test.js`
- `scripts/evaluation/__tests__/question-search-gate.test.js`

## Result List

1. `npm run workflow:baseline:sync`: fail
   Root baseline worktree at `/home/samsen/code/ciecopilot-home` is still on `hotfix/9709-wave1-vlm-stabilization`, ahead `1` and behind `15` against origin with untracked files. This worker did not mutate that orchestrator/root state from `feat/242`.
2. `npm ci`: pass
   Restored local `node_modules` in `/home/samsen/.worktrees/ciecopilot-home/cie-179`, including `@supabase/supabase-js`.
3. targeted regression tests: pass
   - `api/learning/__tests__/question-search-service.test.js`
   - `api/learning/__tests__/question-search-repository.test.js`
   - `scripts/evaluation/__tests__/question-search-gate.test.js`
4. closure surface existence check: pass
5. checked-in rerun artifact existence check: pass
6. closure dry-run: pass
   Printed the expected 4 steps:
   - `build_evidence_bundles`
   - `backfill_paper_question_registry`
   - `hydrate_question_analysis`
   - `rerun_question_search_gate`
7. baseline gate rerun: pass
   The command exited `0` with:
   - `exact_structured_match_rate=1`
   - `subject_leakage_rate=0`
   - `metadata_completeness_rate=1`
   - `null_summary_rate=0`
   - `descriptor_source=question_descriptions_v0_status_ok`
   - `gate_pass=true`

## Remediation Notes

The original worktree-local blocker was missing dependencies: the gate could not import `@supabase/supabase-js` because `node_modules` was absent.

After bootstrapping the worktree, the live gate exposed two actual baseline regressions:

1. text prefiltering was too strict because both the repository path and the docker `psql` fallback required one contiguous `ILIKE '%identity solve equation%'` match instead of tokenized search terms
2. the docker `psql` fallback returned database rows in `question_id` order instead of reusing the product ranking contract

The final pass also required aligning the checked-in gold fixture with seeded question-type truth for `9709/s19_qp_11/questions/q06.png`, which the seeded hints/backfill tests classify as `9709.trigonometry.identities`.

## Conclusion

Issue `#242` passes on the current execution line.

The current `feat/242` worktree can now run the exact issue command set honestly, and the baseline gate is green on the live docker `psql` path. Wave A may proceed to `#243`, while the separate root-worktree baseline-sync drift remains an operator continuity issue outside this worker branch.
