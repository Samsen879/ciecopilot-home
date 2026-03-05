#!/usr/bin/env node
// scripts/db/cleanup_evidence_ledger.js
// Data retention cleanup for Evidence Ledger tables.
// Deletes mark_runs (and cascading mark_decisions, error_events) older than
// the retention window. Attempts are preserved (lightweight, useful for history).
//
// Usage:
//   node scripts/db/cleanup_evidence_ledger.js                    # dry-run, 180 days
//   node scripts/db/cleanup_evidence_ledger.js --retention-days 90 --apply
//
// Deletion order (respects FK constraints):
//   1. error_events (by attempt_id of old attempts with only old runs)
//   2. mark_decisions (by mark_run_id)
//   3. mark_runs (by created_at)
//
// Attempts are NOT deleted — they are small and serve as a permanent record.

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  let retentionDays = 180;
  let apply = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--retention-days' && args[i + 1]) {
      retentionDays = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--apply') apply = true;
  }

  return { retentionDays, apply };
}

async function main() {
  const { retentionDays, apply } = parseArgs();
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  console.log(`[cleanup] mode=${apply ? 'APPLY' : 'dry-run'}, retention=${retentionDays} days, cutoff=${cutoff}`);

  // 1. Count old mark_runs
  const { count: oldRunCount, error: countErr } = await supabase
    .from('mark_runs')
    .select('mark_run_id', { count: 'exact', head: true })
    .lt('created_at', cutoff);

  if (countErr) throw new Error(`Count failed: ${countErr.message}`);
  console.log(`[cleanup] mark_runs older than ${retentionDays} days: ${oldRunCount}`);

  if (oldRunCount === 0) {
    console.log('[cleanup] Nothing to clean up.');
    return;
  }

  if (!apply) {
    console.log('[cleanup] Dry-run complete. Use --apply to delete.');
    return;
  }

  // 2. Fetch old mark_run_ids in batches and delete related rows
  let deleted = { error_events: 0, mark_decisions: 0, mark_runs: 0 };
  let cursor = null;
  const batchSize = 500;

  while (true) {
    let query = supabase
      .from('mark_runs')
      .select('mark_run_id, attempt_id')
      .lt('created_at', cutoff)
      .order('mark_run_id')
      .limit(batchSize);

    if (cursor) query = query.gt('mark_run_id', cursor);

    const { data: batch, error: batchErr } = await query;
    if (batchErr) throw new Error(`Batch fetch failed: ${batchErr.message}`);
    if (!batch || batch.length === 0) break;

    const runIds = batch.map(r => r.mark_run_id);
    const attemptIds = [...new Set(batch.map(r => r.attempt_id))];
    cursor = runIds[runIds.length - 1];

    // 2a. Delete error_events for these attempts
    const { error: eeErr } = await supabase
      .from('error_events')
      .delete()
      .in('attempt_id', attemptIds);
    if (eeErr) console.error(`error_events delete failed: ${eeErr.message}`);
    else deleted.error_events += attemptIds.length; // approximate

    // 2b. Delete mark_decisions for these runs
    const { error: mdErr } = await supabase
      .from('mark_decisions')
      .delete()
      .in('mark_run_id', runIds);
    if (mdErr) console.error(`mark_decisions delete failed: ${mdErr.message}`);
    else deleted.mark_decisions += runIds.length;

    // 2c. Delete mark_runs
    const { error: mrErr } = await supabase
      .from('mark_runs')
      .delete()
      .in('mark_run_id', runIds);
    if (mrErr) console.error(`mark_runs delete failed: ${mrErr.message}`);
    else deleted.mark_runs += runIds.length;

    console.log(`[cleanup] Batch: ${runIds.length} runs processed`);
  }

  console.log(`[cleanup] Done.`, deleted);
}

main().catch((err) => {
  console.error('[cleanup] Fatal:', err);
  process.exit(1);
});
