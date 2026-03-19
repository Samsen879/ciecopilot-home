# Phase E Promotion Bridge Operator Guide

## Purpose

The Phase E promotion bridge turns a reviewed `governance_seed_only` candidate into a `pilot_ready_for_ingest` bundle, updates the canonical whitelist, and emits a promotion receipt.

It does **not** edit `data/evidence/production/rollout_gate_v1.json`.
Rollout remains a separate manual decision.

## Required Inputs

- a reviewed candidate bundle produced by the Phase D promotion-candidate flow
- `--target-bundle-id`
- one or more `--approved-corpus-version` values

Candidate input can be provided as either:

- `--candidate-dir <dir>`
- or `--manifest <manifest.json> --items-json <items.json>`

## Modes

### Apply

Use apply mode to write canonical governance outputs:

```bash
node scripts/rag/run_production_evidence_promotion_bridge.js \
  --candidate-dir tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1 \
  --target-bundle-id phase_e_pilot_ready_9231_v1 \
  --approved-corpus-version rag_production_evidence_pilot_9231_20260318
```

Apply writes:

- `data/evidence/production/<target-bundle-id>/manifest.json`
- `data/evidence/production/<target-bundle-id>/items.json`
- updated `data/evidence/production/whitelist_v1.json`
- `data/evidence/production/receipts/<target-bundle-id>_promotion_receipt.json`
- `docs/reports/rag_phase_e_<target-bundle-id>_promotion_receipt.md`

### Dry Run

Use `--dry-run` to preview the promotion without writing canonical files:

```bash
node scripts/rag/run_production_evidence_promotion_bridge.js \
  --candidate-dir tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1 \
  --target-bundle-id phase_e_pilot_ready_9231_v1 \
  --approved-corpus-version rag_production_evidence_pilot_9231_20260318 \
  --dry-run
```

Check the CLI JSON output and confirm:

- `validation.release_ready` is `true`
- `validation.ingest_permitted` is `true`
- rollout gate is untouched

### Proposal Only

Use `--proposal-only --proposal-dir <dir>` to emit a reviewable proposal without mutating canonical governance inputs:

```bash
node scripts/rag/run_production_evidence_promotion_bridge.js \
  --candidate-dir tmp/review_candidates/phase_d_gap_fill_candidate_9231_v1 \
  --target-bundle-id phase_e_pilot_ready_9231_v1 \
  --approved-corpus-version rag_production_evidence_pilot_9231_20260318 \
  --proposal-only \
  --proposal-dir tmp/proposal
```

Proposal mode writes proposal files only under the chosen proposal directory.

## Receipt

The receipt records:

- source candidate identity
- target bundle identity
- whitelist update status
- approved corpus versions
- validation summary
- rollback guidance paths
- explicit confirmation that rollout gate was not touched

When reading the receipt, treat these fields as the minimum promotion health check:

- `validation.manifest_valid`
- `validation.whitelist_valid`
- `validation.release_ready`
- `validation.ingest_permitted`

Default tracked receipt outputs are:

- `data/evidence/production/receipts/<target-bundle-id>_promotion_receipt.json`
- `docs/reports/rag_phase_e_<target-bundle-id>_promotion_receipt.md`

## Rollout Boundary

Promotion bridge success means the bundle is ready for ingest and eligible for later rollout review.

It does **not** mean live retrieval is enabled.
Any rollout change still requires an explicit manual edit to `data/evidence/production/rollout_gate_v1.json` and the normal rollout verification path.

## Git Rollback

If an apply needs to be reverted, use the receipt `rollback_guidance.paths` together with Git history:

```bash
git log -- data/evidence/production/whitelist_v1.json
git log -- data/evidence/production/<target-bundle-id>
git restore --source <commit> -- data/evidence/production/whitelist_v1.json
git restore --source <commit> -- data/evidence/production/<target-bundle-id>
```

If the receipt itself was written to a tracked path, restore that path from Git as well.
