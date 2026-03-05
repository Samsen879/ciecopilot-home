#!/usr/bin/env node
// scripts/migration/backfill-mark-decisions.js
// Backfill script — migrates data from legacy marking_runs_v1 into the
// Evidence Ledger tables (attempts, mark_runs, mark_decisions).
//
// Usage:
//   node scripts/migration/backfill-mark-decisions.js [--dry-run] [--batch-size N] [--since ISO_DATE] [--cursor CURSOR_ID]
//
// Requirements: 8.4, 8.5

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: false });

// ── Deterministic question_id from storage_key + q_number ───────────────────

/**
 * Generate a deterministic UUID-like identifier from storage_key + q_number.
 * Used to create stable question_id values for legacy runs that predate the
 * question_bank mapping table.
 *
 * @param {string} storageKey
 * @param {number} qNumber
 * @returns {string} UUID-formatted hash
 */
export function legacyQuestionMapper(storageKey, qNumber) {
  const input = `legacy:${storageKey}:${qNumber}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

// ── Syllabus code parser ────────────────────────────────────────────────────

/**
 * Extract syllabus code (e.g. "9709") from a storage_key.
 *
 * @param {string} storageKey
 * @returns {string|null}
 */
export function parseSyllabusCode(storageKey) {
  if (!storageKey || typeof storageKey !== 'string') return null;
  const match = storageKey.match(/^(\d{4})/);
  return match ? match[1] : null;
}

// ── Structured logging helpers ──────────────────────────────────────────────

function log(event, data = {}) {
  console.log(JSON.stringify({ event, ...data, ts: new Date().toISOString() }));
}

function logError(event, data = {}) {
  console.error(JSON.stringify({ event, ...data, ts: new Date().toISOString() }));
}

// ── CLI argument parsing ────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = { dryRun: false, batchSize: 100, since: null, cursor: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--batch-size' && i + 1 < argv.length) {
      args.batchSize = parseInt(argv[++i], 10) || 100;
    } else if (a.startsWith('--batch-size=')) {
      args.batchSize = parseInt(a.split('=')[1], 10) || 100;
    } else if (a === '--since' && i + 1 < argv.length) {
      args.since = argv[++i];
    } else if (a.startsWith('--since=')) {
      args.since = a.split('=')[1];
    } else if (a === '--cursor' && i + 1 < argv.length) {
      args.cursor = argv[++i];
    } else if (a.startsWith('--cursor=')) {
      args.cursor = a.split('=')[1];
    }
  }
  return args;
}

// ── Core backfill logic ─────────────────────────────────────────────────────

/**
 * Run the backfill migration from marking_runs_v1 → Evidence Ledger tables.
 *
 * @param {object} opts
 * @param {object} opts.supabase - Supabase client (service-role)
 * @param {boolean} [opts.dryRun=false]
 * @param {number} [opts.batchSize=100]
 * @param {string|null} [opts.since=null] - ISO date filter
 * @param {string|null} [opts.cursor=null] - Resume from this run_id (ordered by run_id)
 * @returns {Promise<{processed: number, succeeded: number, failed: number, skipped: number, nextCursor: string|null}>}
 */
export async function runBackfill({ supabase, dryRun = false, batchSize = 100, since = null, cursor = null }) {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let nextCursor = cursor;
  let hasMore = true;

  log('backfill_start', { dry_run: dryRun, batch_size: batchSize, since, cursor });

  while (hasMore) {
    // 1. Fetch batch from marking_runs_v1
    let query = supabase
      .from('marking_runs_v1')
      .select('*')
      .order('run_id', { ascending: true })
      .limit(batchSize);

    if (since) query = query.gte('created_at', since);
      if (nextCursor) query = query.gt('run_id', nextCursor);

    const { data: batch, error: fetchError } = await query;

    if (fetchError) {
      logError('backfill_fetch_error', { error: fetchError.message });
      break;
    }

    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }

    // 2. Process each legacy run
    for (const legacyRun of batch) {
      nextCursor = legacyRun.run_id;
      processed++;

      // Skip if no user_id
      if (!legacyRun.user_id) {
        logError('backfill_failure', { legacy_run_id: legacyRun.run_id, reason: 'missing user_id' });
        failed++;
        continue;
      }

      // Skip if no decisions
      const decisions = legacyRun.response_json?.decisions;
      if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
        log('backfill_skip', { legacy_run_id: legacyRun.run_id, reason: 'no decisions in response_json' });
        skipped++;
        continue;
      }

      // Generate deterministic IDs
      const idempotencyKey = `legacy:${legacyRun.run_id}`;
      const questionId = legacyQuestionMapper(legacyRun.storage_key, legacyRun.q_number);
      const syllabusCode = parseSyllabusCode(legacyRun.storage_key);

      if (dryRun) {
        log('backfill_dry_run', {
          legacy_run_id: legacyRun.run_id,
          decision_count: decisions.length,
          question_id: questionId,
          idempotency_key: idempotencyKey,
          syllabus_code: syllabusCode,
        });
        succeeded++;
        continue;
      }

      try {
        // 3. Create synthetic attempt (idempotent via ON CONFLICT)
        const { data: attempt, error: attErr } = await supabase
          .from('attempts')
          .upsert({
            user_id: legacyRun.user_id,
            question_id: questionId,
            storage_key: legacyRun.storage_key,
            q_number: legacyRun.q_number,
            subpart: legacyRun.subpart || null,
            syllabus_code: syllabusCode,
            submitted_steps: [],
            idempotency_key: idempotencyKey,
          }, { onConflict: 'user_id,idempotency_key' })
          .select('attempt_id')
          .single();

        if (attErr) throw new Error(`attempt upsert: ${attErr.message}`);

        // 4. Create or reuse mark_run (idempotent via run_idempotency_key)
        const inferredStatus = legacyRun.error_book_write_status === 'failed' ? 'failed' : 'completed';
        const totalAwarded = decisions.reduce((sum, d) => sum + (d.awarded_marks || 0), 0);
        const totalAvailable = decisions.length;
        const runIdempotencyKey = `legacy:${legacyRun.run_id}`;

        let markRunId;
        let reusedRun = false;

        const { data: existingRun, error: existingRunErr } = await supabase
          .from('mark_runs')
          .select('mark_run_id')
          .eq('attempt_id', attempt.attempt_id)
          .eq('run_idempotency_key', runIdempotencyKey)
          .maybeSingle();

        if (existingRunErr && existingRunErr.code !== 'PGRST116') {
          throw new Error(`mark_run lookup: ${existingRunErr.message}`);
        }

        if (existingRun?.mark_run_id) {
          markRunId = existingRun.mark_run_id;
          reusedRun = true;
        } else {
          const { data: markRun, error: mrErr } = await supabase
            .from('mark_runs')
            .insert({
              attempt_id: attempt.attempt_id,
              run_idempotency_key: runIdempotencyKey,
              engine_version: legacyRun.scoring_engine_version || 'legacy',
              rubric_version: legacyRun.rubric_source_version || 'legacy',
              total_awarded: totalAwarded,
              total_available: totalAvailable,
              status: inferredStatus,
              decision_write_status: 'pending',
              request_summary: { legacy_run_id: legacyRun.run_id, ...(legacyRun.request_json || {}) },
              response_summary: { legacy_run_id: legacyRun.run_id },
            })
            .select('mark_run_id')
            .single();

          if (mrErr) {
            if (mrErr.code !== '23505') {
              throw new Error(`mark_run insert: ${mrErr.message}`);
            }

            const { data: racedRun, error: racedRunErr } = await supabase
              .from('mark_runs')
              .select('mark_run_id')
              .eq('attempt_id', attempt.attempt_id)
              .eq('run_idempotency_key', runIdempotencyKey)
              .single();

            if (racedRunErr || !racedRun?.mark_run_id) {
              throw new Error(`mark_run conflict lookup: ${racedRunErr?.message || 'no data returned'}`);
            }

            markRunId = racedRun.mark_run_id;
            reusedRun = true;
          } else {
            markRunId = markRun.mark_run_id;
          }
        }

        if (reusedRun) {
          const { data: existingDecision, error: existingDecisionErr } = await supabase
            .from('mark_decisions')
            .select('mark_decision_id')
            .eq('mark_run_id', markRunId)
            .limit(1)
            .maybeSingle();

          if (existingDecisionErr && existingDecisionErr.code !== 'PGRST116') {
            throw new Error(`mark_decisions lookup: ${existingDecisionErr.message}`);
          }

          if (existingDecision?.mark_decision_id) {
            succeeded++;
            log('backfill_skip_existing', {
              legacy_run_id: legacyRun.run_id,
              mark_run_id: markRunId,
              reason: 'mark_run already has decisions',
            });
            continue;
          }
        }

        // 5. Write mark_decisions via RPC
        const decisionsPayload = decisions.map(d => ({
          rubric_id: d.rubric_id || 'unknown',
          mark_label: d.mark_label || null,
          awarded: Boolean(d.awarded),
          awarded_marks: d.awarded_marks || 0,
          reason: d.reason || 'no_match',
        }));

        const { error: decErr } = await supabase.rpc('insert_mark_decisions', {
          p_mark_run_id: markRunId,
          p_decisions: decisionsPayload,
        });

        if (decErr) throw new Error(`decisions rpc: ${decErr.message}`);

        // 6. Update mark_run decision_write_status
        await supabase
          .from('mark_runs')
          .update({ decision_write_status: 'success' })
          .eq('mark_run_id', markRunId);

        succeeded++;
        log('backfill_success', {
          legacy_run_id: legacyRun.run_id,
          attempt_id: attempt.attempt_id,
          mark_run_id: markRunId,
          reused_run: reusedRun,
          decision_count: decisions.length,
        });
      } catch (err) {
        failed++;
        logError('backfill_failure', { legacy_run_id: legacyRun.run_id, reason: err.message });
      }
    }

    log('backfill_batch_complete', { batch_size: batch.length, processed, succeeded, failed, skipped });

    if (batch.length < batchSize) hasMore = false;
  }

  const summary = { processed, succeeded, failed, skipped, nextCursor };
  log('backfill_complete', summary);
  return summary;
}

// ── Main entry point ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const result = await runBackfill({
    supabase,
    dryRun: args.dryRun,
    batchSize: args.batchSize,
    since: args.since,
    cursor: args.cursor,
  });

  if (result.failed > 0) {
    process.exit(1);
  }
}

// Run main when executed directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch(err => {
    console.error(JSON.stringify({
      event: 'backfill_fatal',
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    process.exit(1);
  });
}
