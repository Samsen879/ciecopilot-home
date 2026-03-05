#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MATRIX_FILE = path.join(ROOT, 'runs', 'backend', 'rag_migration_execution_matrix.json');
const CONTRACT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_canonical_chunk_contract_summary.json');
const RECON_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_reconciliation_summary.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_contract_rollout_status.json');

function main() {
  const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));
  const contract = JSON.parse(fs.readFileSync(CONTRACT_FILE, 'utf8'));
  const reconciliation = JSON.parse(fs.readFileSync(RECON_FILE, 'utf8'));

  const directCanonicalBlockers = (matrix.local_only || []).filter(
    (entry) => entry.directly_related_to_canonical_rollout === true,
  );
  const unrelatedLocalOnly = (matrix.local_only || []).filter(
    (entry) => entry.directly_related_to_canonical_rollout !== true,
  );

  let status = 'safe_auto';
  let reason = 'rollout may proceed under current execution policy';

  if ((matrix.remote_only || []).length > 0 || directCanonicalBlockers.length > 0) {
    status = 'deferred_due_to_migration_state';
    reason = 'canonical rollout still has pending migration-state blockers';
  } else if (contract.status === 'pending_schema_expansion') {
    status = 'deferred_due_to_contract_validation';
    reason = 'remote schema rollout is incomplete because canonical contract columns are still missing';
  } else if (reconciliation.status === 'canonical_empty' && contract.status === 'empty_canonical_corpus') {
    status = 'ready_for_canonical_population_smoke';
    reason = 'canonical schema rollout is complete; next step is population smoke and backfill validation';
  } else if (matrix.rollout_decision === 'safe_but_requires_human_confirmation') {
    status = 'awaiting_human_confirmation';
    reason = 'rollout is additive but remote DB mutation requires explicit human confirmation';
  }

  const payload = {
    generated_at: new Date().toISOString(),
    status,
    migration_rollout_decision: matrix.rollout_decision,
    canonical_contract_status: contract.status,
    reconciliation_status: reconciliation.status,
    direct_canonical_blockers: directCanonicalBlockers.map((entry) => entry.version),
    unrelated_local_only_versions: unrelatedLocalOnly.map((entry) => entry.version),
    can_execute_rollout: status === 'safe_auto' || status === 'ready_for_canonical_population_smoke',
    reason,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n`);
}

main();
