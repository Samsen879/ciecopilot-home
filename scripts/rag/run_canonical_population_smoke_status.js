#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROLLOUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_contract_rollout_status.json');
const BACKEND_RUNS_DIR = path.join(ROOT, 'runs', 'backend');
const CONTRACT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_canonical_chunk_contract_summary.json');
const RECONCILIATION_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_reconciliation_summary.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_canonical_population_smoke.json');

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveLatestIngestSummary() {
  if (!fs.existsSync(BACKEND_RUNS_DIR)) return null;

  const candidates = fs
    .readdirSync(BACKEND_RUNS_DIR)
    .filter((name) => /^rag_ingest.*\.json$/i.test(name))
    .map((name) => {
      const filePath = path.join(BACKEND_RUNS_DIR, name);
      return {
        name,
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (candidates.length === 0) return null;
  const latest = candidates[0];
  return {
    file: path.relative(ROOT, latest.filePath).replace(/\\/g, '/'),
    payload: JSON.parse(fs.readFileSync(latest.filePath, 'utf8')),
  };
}

function main() {
  const rollout = JSON.parse(fs.readFileSync(ROLLOUT_FILE, 'utf8'));
  const contract = readJsonIfExists(CONTRACT_FILE);
  const reconciliation = readJsonIfExists(RECONCILIATION_FILE);
  const latestIngest = resolveLatestIngestSummary();

  const canonicalRows = reconciliation?.canonical?.total_rows || 0;
  const hasBlockingContractErrors =
    (contract?.missing_columns?.length || 0) > 0 ||
    (contract?.metrics?.source_ref_resolvability_rate ?? 0) < 1;

  let status = 'deferred_due_to_migration_state';
  let reason = rollout.reason;

  if (rollout.can_execute_rollout) {
    if (canonicalRows > 0 && !hasBlockingContractErrors) {
      status = 'verified_non_empty';
      reason = 'canonical smoke population wrote rows and contract checks passed';
    } else if (canonicalRows > 0 && hasBlockingContractErrors) {
      status = 'failed_contract_validation';
      reason = 'canonical smoke population wrote rows but contract validation reported blocking errors';
    } else {
      status = 'ready_for_execution';
      reason = rollout.reason;
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    status,
    reason,
    canonical_rows: canonicalRows,
    contract_status: contract?.status || null,
    reconciliation_status: reconciliation?.status || null,
    last_ingest_summary: latestIngest
      ? {
          file: latestIngest.file,
          write_mode: latestIngest.payload.write_mode,
          corpus_version: latestIngest.payload.corpus_version,
          status: latestIngest.payload.status,
          files_considered: latestIngest.payload.counts?.files_considered || 0,
          files_processed: latestIngest.payload.counts?.files_processed || 0,
          chunks_planned: latestIngest.payload.counts?.chunks_planned || 0,
          canonical_inserts: latestIngest.payload.counts?.canonical_inserts || 0,
          canonical_updates: latestIngest.payload.counts?.canonical_updates || 0,
        }
      : null,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n`);
}

main();
