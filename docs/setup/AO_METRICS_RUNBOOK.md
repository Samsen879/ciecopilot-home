# AO Metrics Runbook

## Scope

This runbook defines the canonical AO metrics workflow for repo-local operator inspection.

Metrics summarize durable AO control-plane state. They are built from persisted state and measurement records, not anecdotal operator memory.

## Canonical Commands

### Human summary mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:metrics
```

### JSON mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:metrics:json
```

### Reduce the recent-trace window

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-metrics.js --limit 2
```

## What Metrics Report

The AO metrics report includes:

- controller run count
- execution attempt count
- intervention counts
- failure class counts
- retry cause counts
- recent controller traces
- recent execution-attempt traces

Each run also persists a versioned metrics artifact plus stable latest pointers.

## Artifact Paths

Control-plane paths:

- `.ao-control-plane/<project>/metrics/reports/<report-id>.json`
- `.ao-control-plane/<project>/metrics/latest.json`

Operator paths:

- `ao-artifacts/ao-metrics/reports/<report-id>.json`
- `ao-artifacts/ao-metrics/latest.json`

These paths are also exposed through `ao:state` so operators can inspect the current eval and metrics artifacts from one report.

## Operator Workflow

Use metrics alongside eval:

1. run `npm run ao:metrics`
2. inspect interventions, failures, retries, and recent traces
3. run `npm run ao:state` when you need the artifact pointers plus current state summary
4. pair metrics with `node scripts/ao-eval.js --baseline ao/mainline` before promoting a mainline candidate

Metrics are descriptive. Eval comparison is the regression gate.
