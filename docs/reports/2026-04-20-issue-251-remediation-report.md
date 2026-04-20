# Issue 251 Remediation Report

Date: 2026-04-20
Issue: `#251`
Branch: `feat/251`

## Scope

This remediation stays pinned to the named `9709.p3.integration` aggregate-probe miss:

- `9709/s17_qp_33/questions/q04.png`

It does not widen to the `9709.p3.trigonometry` misses or to whole-paper changes.

## Authoritative Source Evidence

The main-based branch used for issue `#251` does not carry the Wave A closeout artifacts from PR `#250`.
Per the AO continuation note, the authoritative source evidence for this issue was inspected from
`origin/feat/242` / commit `4427c35`:

- `docs/reports/2026-04-19-9709-wave-a-closeout-report.md`
- `docs/reports/2026-04-19-9709-wave-a-closeout-summary.json`
- `docs/reports/2026-04-19-9709-wave-a-closeout-gate.json`

Those artifacts identify the remaining `9709.p3.integration` miss as:

- `wave-a-gate-04`
- `topic_path = 9709.p3.integration`
- `year = 2017`
- `session = s`
- `paper_number = 3`
- `q_number = 4`
- `query = Find the exact value integral 6 sin squared theta`

The same closeout summary records the PR `#250` baseline gate as green:

- `exact_structured_match_rate = 1`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 1`
- `null_summary_rate = 0`
- `pass = true`

## Remediation

The fix is deliberately narrow:

- add a failing regression for `9709/s17_qp_33/questions/q04.png`
- keep the existing backfill/classification prompt normalization intact
- extend paper-backed search text generation with a search-friendly definite-integral formula surface
- synthesize the exact-value cue the aggregate probe uses:
  - `Find the exact value integral 6 sin squared theta`

No threshold values were changed.
No product ranking weights were changed.
No unrelated topic buckets were modified.

## Verification

### 1. Install worktree dependencies

```bash
npm ci
```

Observed result:

- exit `0`
- `added 903 packages`

### 2. Focused regression suite for the backfill generator

```bash
npm test -- scripts/learning/__tests__/question-analysis-backfill.test.js --runInBand
```

Observed result:

- exit `0`
- `12` tests passed
- includes:
  - `paper_question search text normalizes exact-value definite integrals for aggregate probe retrieval`

### 3. Product-mode ranking regression coverage

```bash
npm test -- api/learning/__tests__/question-search-service.test.js --runInBand
```

Observed result:

- exit `0`
- `7` tests passed
- existing paper-backed-vs-imported product ranking coverage remained green

### 4. Gate runner regression coverage

```bash
npm test -- scripts/evaluation/__tests__/question-search-gate.test.js --runInBand
```

Observed result:

- exit `0`
- `12` tests passed

### 5. Live baseline gate rerun on the current local main-based environment

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/issue-251-baseline-gate.md \
  --json-out /tmp/issue-251-baseline-gate.json \
  --psql-mode docker
```

Observed result:

- exit `1`
- `exact_structured_match_rate = 0.8`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 0.8421`
- `null_summary_rate = 0.3333`
- `gate_pass = false`

Interpretation:

- the authoritative PR `#250` Wave A evidence base records a green baseline gate
- the current local rerun on this main-based branch is red because the local environment is not at the same projection/data state as that evidence base
- this remediation did not change baseline thresholds or gate logic; the proof on this branch is therefore limited to the focused search-text regression plus the preserved gate/unit ranking suites above

## Outcome

Issue `#251` now has a checked-in regression and a narrow retrieval-text repair for the named
`9709.p3.integration` miss without widening scope or softening thresholds.
