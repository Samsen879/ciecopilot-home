# AO Eval Runbook

## Scope

This runbook defines the canonical AO eval workflow for repo-local baseline governance.

Eval is the operator-facing contract for:

- running the fixture-backed AO eval harness
- persisting versioned scorecards
- blessing or updating named baselines
- comparing current AO behavior against the current baseline before promotion

Eval remains fixture-backed and reproducible. It is not subjective grading.

## Canonical Commands

### Human summary mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:eval
```

This runs the full AO eval pack set and prints the human summary.

### JSON mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:eval:json
```

### Compare current scorecard to a baseline

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-eval.js --baseline ao/mainline
```

`--baseline` accepts:

- a named baseline alias such as `ao/mainline`
- a scorecard id
- a JSON file path

### Bless a new baseline alias

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-eval.js --bless-baseline ao/mainline
```

Use `--bless-baseline` only when the alias does not already exist.

### Update an existing baseline alias

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-eval.js --update-baseline ao/mainline
```

Use `--update-baseline` only after an explicit operator decision to move the baseline forward.

## Baseline Governance Posture

Baseline aliases are operator-controlled governance references.

- `bless` means create the initial canonical alias for a scorecard
- `update` means replace an existing alias after deliberate review
- `compare` means treat current-vs-baseline regression findings as first-class AO governance output

The CLI fails closed when:

- scenarios fail verification
- replay or continuity regress
- intervention rate regresses
- failure-class counts regress
- baseline scope does not match the current scorecard scope

Regression findings are emitted as `baseline_governance` findings in the comparison payload.

## Artifact Paths

Eval writes stable repo-local artifacts to both control-plane and operator-visible paths.

Control-plane paths:

- `.ao-control-plane/<project>/eval/scorecards/<scorecard-id>.json`
- `.ao-control-plane/<project>/eval/latest.json`
- `.ao-control-plane/<project>/eval/baselines/<baseline-alias>.json`

Operator paths:

- `ao-artifacts/ao-eval/scorecards/<scorecard-id>.json`
- `ao-artifacts/ao-eval/latest.json`
- `ao-artifacts/ao-eval/baselines/<baseline-alias>.json`

## Mainline Candidate Workflow

Before promoting an AO mainline candidate:

1. run `npm run ao:eval`
2. run `node scripts/ao-eval.js --baseline ao/mainline`
3. inspect comparison status and findings
4. only if the candidate is intentionally better and regression-free, update the baseline with:

```bash
node scripts/ao-eval.js --update-baseline ao/mainline
```

Do not auto-promote baselines. Baseline movement is an explicit operator action.
