#!/usr/bin/env node
// scripts/aggregation/aggregate-learner-profiles.js
// Aggregation Job — periodically aggregates L1 evidence data (mark_decisions, error_events)
// into L2 user_learning_profiles (mastery_by_node, misconception_frequencies).
// Can be triggered via cron or manually.
//
// Usage:
//   node scripts/aggregation/aggregate-learner-profiles.js [--dry-run] [--user-id UUID]
//
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  MARKING_SEMANTICS_VERSION,
  normalizeUncertainReason,
} from '../../api/marking/lib/marking-semantics-v1.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: false });

// ── Mastery reason policy ────────────────────────────────────────────────────
const COUNTED_NEGATIVE_REASON_CODES = new Set(['below_threshold', 'no_match']);
const UNCERTAIN_REASON_CODES = new Set(['borderline', 'parse_fail', 'no_rubric_points', 'uncertain']);
const STRUCTURAL_GATING_REASON_CODES = new Set(['dependency_not_met', 'dependency_error']);
const LEGACY_STRUCTURAL_GATING_REASONS = new Set(['ft_capped']);

// ── Time decay windows for misconception frequency (in days) ────────────────
const DECAY_WINDOWS = [
  { maxDays: 30, weight: 1.0 },
  { maxDays: 90, weight: 0.5 },
  { maxDays: Infinity, weight: 0.2 },
];

// ── Mastery weighting constants ─────────────────────────────────────────────
const RECENT_COUNT = 5;
const RECENT_WEIGHT = 2.0;
const DEFAULT_WEIGHT = 1.0;
const MAX_ATTEMPTS = 20;
const LOW_CONFIDENCE_THRESHOLD = 3;

// ── CLI argument parsing ────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, userId: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--user-id' && i + 1 < argv.length) {
      args.userId = argv[++i];
    } else if (a.startsWith('--user-id=')) {
      args.userId = a.split('=')[1];
    }
  }
  return args;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function incrementCounter(target, key, delta = 1) {
  const safeKey = String(key || 'unknown');
  target[safeKey] = (target[safeKey] || 0) + delta;
}

function sortCounters(counterMap) {
  return Object.fromEntries(
    Object.entries(counterMap).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function createEmptyNodeDiagnostics() {
  return {
    counted_attempt_count: 0,
    counted_decision_count: 0,
    positive_decision_count: 0,
    negative_decision_count: 0,
    excluded_decision_count: 0,
    uncertain_decision_count: 0,
    structural_gating_decision_count: 0,
    excluded_only_attempt_count: 0,
    mixed_signal_attempt_count: 0,
    excluded_reason_counts: {},
  };
}

function createEmptyMasteryDiagnostics() {
  return {
    reason_semantics_version: MARKING_SEMANTICS_VERSION,
    node_count: 0,
    scored_node_count: 0,
    excluded_only_node_count: 0,
    counted_attempt_count: 0,
    counted_decision_count: 0,
    positive_decision_count: 0,
    negative_decision_count: 0,
    excluded_decision_count: 0,
    uncertain_decision_count: 0,
    structural_gating_decision_count: 0,
    excluded_only_attempt_count: 0,
    mixed_signal_attempt_count: 0,
    excluded_reason_counts: {},
  };
}

function mergeNodeDiagnostics(summary, nodeDiagnostics) {
  summary.counted_attempt_count += nodeDiagnostics.counted_attempt_count;
  summary.counted_decision_count += nodeDiagnostics.counted_decision_count;
  summary.positive_decision_count += nodeDiagnostics.positive_decision_count;
  summary.negative_decision_count += nodeDiagnostics.negative_decision_count;
  summary.excluded_decision_count += nodeDiagnostics.excluded_decision_count;
  summary.uncertain_decision_count += nodeDiagnostics.uncertain_decision_count;
  summary.structural_gating_decision_count += nodeDiagnostics.structural_gating_decision_count;
  summary.excluded_only_attempt_count += nodeDiagnostics.excluded_only_attempt_count;
  summary.mixed_signal_attempt_count += nodeDiagnostics.mixed_signal_attempt_count;

  for (const [reason, count] of Object.entries(nodeDiagnostics.excluded_reason_counts)) {
    incrementCounter(summary.excluded_reason_counts, reason, count);
  }
}

function compareIsoDescThenId(a, b) {
  const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (timeDiff !== 0) return timeDiff;
  return String(a.attempt_id || '').localeCompare(String(b.attempt_id || ''));
}

export function classifyMasteryDecision(decision) {
  const awarded = decision?.awarded === true;
  const sourceReason = typeof decision?.reason === 'string' && decision.reason.trim()
    ? decision.reason.trim()
    : null;
  const rawReasonSemantics = normalizeUncertainReason(sourceReason, { awarded: false });
  const rawReasonKey = sourceReason ? sourceReason.toLowerCase() : null;

  if (rawReasonKey && LEGACY_STRUCTURAL_GATING_REASONS.has(rawReasonKey)) {
    return {
      counted: false,
      polarity: null,
      category: 'structural_gating',
      normalized_reason: rawReasonKey,
      source_reason: sourceReason,
    };
  }

  if (STRUCTURAL_GATING_REASON_CODES.has(rawReasonSemantics)) {
    return {
      counted: false,
      polarity: null,
      category: 'structural_gating',
      normalized_reason: rawReasonSemantics,
      source_reason: sourceReason,
    };
  }

  if (UNCERTAIN_REASON_CODES.has(rawReasonSemantics)) {
    return {
      counted: false,
      polarity: null,
      category: 'uncertain',
      normalized_reason: rawReasonSemantics,
      source_reason: sourceReason,
    };
  }

  if (awarded) {
    return {
      counted: true,
      polarity: 'positive',
      category: 'positive',
      normalized_reason: null,
      source_reason: sourceReason,
    };
  }

  if (COUNTED_NEGATIVE_REASON_CODES.has(rawReasonSemantics)) {
    return {
      counted: true,
      polarity: 'negative',
      category: 'ability_gap',
      normalized_reason: rawReasonSemantics,
      source_reason: sourceReason,
    };
  }

  return {
    counted: true,
    polarity: 'negative',
    category: 'ability_gap',
    normalized_reason: rawReasonSemantics,
    source_reason: sourceReason,
  };
}

// ── Core aggregation functions (exported for testing) ───────────────────────

/**
 * Compute mastery_by_node from mark_decisions for a single user.
 *
 * Algorithm (Requirement 6.1):
 * 1. Group by node_id + attempt_id (attempt-level samples)
 * 2. Classify each decision into:
 *    - counted positive evidence
 *    - counted negative evidence (true ability shortfall)
 *    - excluded uncertainty
 *    - excluded structural gating
 * 3. For each node, compute per-attempt correctness from counted decisions only:
 *    attempt_score = awarded_true_decisions / counted_decisions
 * 4. Drop attempts that contain only excluded evidence
 * 5. For each node, take the most recent 20 counted attempts
 * 6. Most recent 5 attempts get weight 2.0, rest get weight 1.0
 * 7. score = sum(weight * attempt_score) / sum(weight)
 * 8. If sample_count < 3, mark low_confidence = true (Requirement 6.5)
 *
 * @param {object[]} decisions - Rows with: attempt_id, node_id, awarded, reason, created_at
 * @param {Date} [now] - Current time (for last_updated); defaults to new Date()
 * @returns {{mastery_by_node: object, diagnostics: object}} Aggregated mastery data plus audit diagnostics.
 */
export function aggregateMasteryEvidence(decisions, now = new Date()) {
  const diagnostics = createEmptyMasteryDiagnostics();
  if (!Array.isArray(decisions) || decisions.length === 0) {
    return { mastery_by_node: {}, diagnostics };
  }

  const byNode = new Map();
  for (const d of decisions) {
    if (!d.node_id || !d.attempt_id) continue;
    if (!byNode.has(d.node_id)) byNode.set(d.node_id, []);
    byNode.get(d.node_id).push(d);
  }

  diagnostics.node_count = byNode.size;
  if (byNode.size === 0) {
    return { mastery_by_node: {}, diagnostics };
  }

  const result = {};

  for (const nodeId of Array.from(byNode.keys()).sort()) {
    const nodeDecs = byNode.get(nodeId) || [];
    const byAttempt = new Map();
    const nodeDiagnostics = createEmptyNodeDiagnostics();

    for (const d of nodeDecs) {
      const key = d.attempt_id;
      if (!byAttempt.has(key)) {
        byAttempt.set(key, {
          attempt_id: key,
          latest_created_at: d.created_at,
          counted_awarded_true: 0,
          counted_total: 0,
          excluded_decision_count: 0,
        });
      }

      const agg = byAttempt.get(key);
      if (new Date(d.created_at) > new Date(agg.latest_created_at)) {
        agg.latest_created_at = d.created_at;
      }

      const classification = classifyMasteryDecision(d);
      if (classification.counted) {
        agg.counted_total += 1;
        nodeDiagnostics.counted_decision_count += 1;
        if (classification.polarity === 'positive') {
          agg.counted_awarded_true += 1;
          nodeDiagnostics.positive_decision_count += 1;
        } else {
          nodeDiagnostics.negative_decision_count += 1;
        }
        continue;
      }

      agg.excluded_decision_count += 1;
      nodeDiagnostics.excluded_decision_count += 1;
      if (classification.category === 'structural_gating') {
        nodeDiagnostics.structural_gating_decision_count += 1;
      } else if (classification.category === 'uncertain') {
        nodeDiagnostics.uncertain_decision_count += 1;
      }

      incrementCounter(
        nodeDiagnostics.excluded_reason_counts,
        classification.source_reason || classification.normalized_reason || 'unknown',
      );
    }

    const attempts = Array.from(byAttempt.values());
    nodeDiagnostics.excluded_only_attempt_count = attempts.filter(
      (attempt) => attempt.counted_total === 0 && attempt.excluded_decision_count > 0,
    ).length;
    nodeDiagnostics.mixed_signal_attempt_count = attempts.filter(
      (attempt) => attempt.counted_total > 0 && attempt.excluded_decision_count > 0,
    ).length;

    const scoredAttempts = attempts
      .filter((attempt) => attempt.counted_total > 0)
      .map(a => ({
        attempt_id: a.attempt_id,
        created_at: a.latest_created_at,
        attempt_score: a.counted_total > 0 ? (a.counted_awarded_true / a.counted_total) : 0,
      }))
      .sort(compareIsoDescThenId);

    // 4. Keep most recent N attempts for this node
    const recent = scoredAttempts.slice(0, MAX_ATTEMPTS);
    nodeDiagnostics.counted_attempt_count = recent.length;
    nodeDiagnostics.excluded_reason_counts = sortCounters(nodeDiagnostics.excluded_reason_counts);
    mergeNodeDiagnostics(diagnostics, nodeDiagnostics);

    if (recent.length === 0) {
      diagnostics.excluded_only_node_count += 1;
      continue;
    }

    diagnostics.scored_node_count += 1;

    // 5. Assign weights: first RECENT_COUNT get RECENT_WEIGHT, rest get DEFAULT_WEIGHT
    let weightedScore = 0;
    let weightedTotal = 0;

    for (let i = 0; i < recent.length; i++) {
      const w = i < RECENT_COUNT ? RECENT_WEIGHT : DEFAULT_WEIGHT;
      weightedTotal += w;
      weightedScore += w * recent[i].attempt_score;
    }

    // 6. Compute score
    const score = weightedTotal > 0 ? weightedScore / weightedTotal : 0;
    const sampleCount = recent.length;

    result[nodeId] = {
      score: round4(score),
      sample_count: sampleCount,
      weighted_sample_count: weightedTotal,
      low_confidence: sampleCount < LOW_CONFIDENCE_THRESHOLD,
      last_updated: now.toISOString(),
      diagnostics: nodeDiagnostics,
    };
  }

  diagnostics.excluded_reason_counts = sortCounters(diagnostics.excluded_reason_counts);
  return { mastery_by_node: result, diagnostics };
}

export function computeMasteryByNode(decisions, now = new Date()) {
  return aggregateMasteryEvidence(decisions, now).mastery_by_node;
}

/**
 * Compute misconception_frequencies from error_events for a single user.
 *
 * Algorithm (Requirement 6.2):
 * - Group by misconception_tag
 * - Time decay: 0-30 days → 1.0, 30-90 days → 0.5, 90+ days → 0.2
 *
 * @param {object[]} events - Rows with: misconception_tag, created_at
 * @param {Date} [now] - Reference time for decay calculation
 * @returns {object} { [tag]: { count, weighted_count, last_seen } }
 */
export function computeMisconceptionFrequencies(events, now = new Date()) {
  if (!Array.isArray(events) || events.length === 0) return {};

  const byTag = new Map();

  for (const e of events) {
    const tag = e.misconception_tag;
    if (!tag) continue;
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push(e);
  }

  const result = {};
  const nowMs = now.getTime();

  for (const [tag, tagEvents] of byTag) {
    let count = tagEvents.length;
    let weightedCount = 0;
    let lastSeen = null;

    for (const e of tagEvents) {
      const eventDate = new Date(e.created_at);
      const daysDiff = (nowMs - eventDate.getTime()) / (1000 * 60 * 60 * 24);

      // Find the appropriate decay weight
      let weight = 0.2; // default for 90+ days
      for (const window of DECAY_WINDOWS) {
        if (daysDiff <= window.maxDays) {
          weight = window.weight;
          break;
        }
      }
      weightedCount += weight;

      // Track most recent event
      if (!lastSeen || eventDate > new Date(lastSeen)) {
        lastSeen = eventDate.toISOString();
      }
    }

    result[tag] = {
      count,
      weighted_count: Math.round(weightedCount * 10000) / 10000,
      last_seen: lastSeen,
    };
  }

  return result;
}

/**
 * Fetch users who have new mark_decisions since their last aggregation.
 *
 * @param {object} supabase - Supabase client (service-role)
 * @param {string|null} userId - Optional: aggregate only this user
 * @returns {Promise<object[]>} Array of { user_id, subject_code, last_aggregated_at }
 */
async function fetchUsersToAggregate(supabase, userId = null) {
  // Strategy: scan mark_decisions with attempt ownership to find latest
  // decision timestamp per (user_id, subject_code), then compare with
  // user_learning_profiles.last_aggregated_at.

  let query = supabase
    .from('mark_decisions')
    .select(`
      mark_runs!inner (
        attempts!inner (
          user_id,
          syllabus_code
        )
      ),
      created_at
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('mark_runs.attempts.user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(JSON.stringify({
      event: 'aggregation_fetch_users_error',
      error: error.message,
      ts: new Date().toISOString(),
    }));
    return [];
  }

  if (!data || data.length === 0) return [];

  // Find latest decision timestamp per (user_id, subject_code)
  const latestByPair = new Map();
  for (const row of data) {
    const user = row.mark_runs?.attempts?.user_id;
    const subject = row.mark_runs?.attempts?.syllabus_code;
    const createdAt = row.created_at;
    if (!user || !subject || !createdAt) continue;

    const key = `${user}:${subject}`;
    const prev = latestByPair.get(key);
    if (!prev || new Date(createdAt) > new Date(prev.latest_decision_at)) {
      latestByPair.set(key, {
        user_id: user,
        subject_code: subject,
        latest_decision_at: createdAt,
      });
    }
  }

  // Compare latest_decision_at against last_aggregated_at
  const result = [];
  for (const pair of latestByPair.values()) {
    const { data: profile } = await supabase
      .from('user_learning_profiles')
      .select('last_aggregated_at')
      .eq('user_id', pair.user_id)
      .eq('subject_code', pair.subject_code)
      .maybeSingle();

    const lastAggregatedAt = profile?.last_aggregated_at || null;
    if (!lastAggregatedAt || new Date(pair.latest_decision_at) > new Date(lastAggregatedAt)) {
      result.push({
        user_id: pair.user_id,
        subject_code: pair.subject_code,
        last_aggregated_at: lastAggregatedAt,
      });
    }
  }

  return result;
}

/**
 * Fetch mark_decisions for a user+subject, joined through attempts → mark_runs → mark_decisions.
 * Returns all decisions for correct "recent N attempts" recomputation.
 *
 * @param {object} supabase
 * @param {string} userId
 * @param {string} subjectCode
 * @returns {Promise<object[]>} decisions with node_id, awarded, reason, created_at
 */
async function fetchDecisionsForUser(supabase, userId, subjectCode) {
  // We need: node_id (from attempt), awarded, reason, created_at (from mark_decision)
  // Chain: attempts → mark_runs → mark_decisions
  const { data, error } = await supabase
    .from('mark_decisions')
    .select(`
      awarded,
      awarded_marks,
      reason,
      created_at,
      mark_runs!inner (
        attempt_id,
        attempts!inner (
          attempt_id,
          node_id,
          user_id,
          syllabus_code
        )
      )
    `)
    .eq('mark_runs.attempts.user_id', userId)
    .eq('mark_runs.attempts.syllabus_code', subjectCode);

  if (error) {
    console.error(JSON.stringify({
      event: 'aggregation_fetch_decisions_error',
      user_id: userId,
      subject_code: subjectCode,
      error: error.message,
      ts: new Date().toISOString(),
    }));
    return [];
  }

  if (!data) return [];

  // Flatten the nested structure
  return data.map(d => ({
    attempt_id: d.mark_runs?.attempt_id || d.mark_runs?.attempts?.attempt_id || null,
    node_id: d.mark_runs?.attempts?.node_id || null,
    awarded: d.awarded,
    reason: d.reason,
    created_at: d.created_at,
  }));
}

/**
 * Fetch error_events for a user+subject.
 *
 * @param {object} supabase
 * @param {string} userId
 * @param {string} subjectCode
 * @returns {Promise<object[]>} events with misconception_tag, created_at
 */
async function fetchErrorEventsForUser(supabase, userId, subjectCode) {
  const { data, error } = await supabase
    .from('error_events')
    .select(`
      misconception_tag,
      created_at,
      attempts!inner (
        syllabus_code
      )
    `)
    .eq('user_id', userId)
    .eq('attempts.syllabus_code', subjectCode);

  if (error) {
    console.error(JSON.stringify({
      event: 'aggregation_fetch_error_events_error',
      user_id: userId,
      error: error.message,
      ts: new Date().toISOString(),
    }));
    return [];
  }

  return (data || []).map(e => ({
    misconception_tag: e.misconception_tag,
    created_at: e.created_at,
  }));
}

/**
 * Aggregate mastery + misconception data for a single user+subject and upsert.
 *
 * @param {object} params
 * @param {object} params.supabase
 * @param {string} params.userId
 * @param {string} params.subjectCode
 * @param {boolean} params.dryRun
 * @param {Date} [params.now]
 * @returns {Promise<{status: 'success'|'skipped'|'failed', mastery_nodes: number, misconception_tags: number, diagnostics?: object, error?: string}>}
 */
export async function aggregateForUser({ supabase, userId, subjectCode, dryRun = false, now = new Date() }) {
  try {
    // 1. Fetch decisions for mastery aggregation
    const decisions = await fetchDecisionsForUser(supabase, userId, subjectCode);

    // 2. Fetch error events for misconception aggregation
    const errorEvents = await fetchErrorEventsForUser(supabase, userId, subjectCode);

    // 3. Compute aggregations
    const masteryAggregation = aggregateMasteryEvidence(decisions, now);
    const masteryByNode = masteryAggregation.mastery_by_node;
    const masteryDiagnostics = masteryAggregation.diagnostics;
    const misconceptionFreqs = computeMisconceptionFrequencies(errorEvents, now);

    const masteryNodeCount = Object.keys(masteryByNode).length;
    const misconceptionTagCount = Object.keys(misconceptionFreqs).length;

    if (masteryNodeCount === 0 && misconceptionTagCount === 0) {
      console.log(JSON.stringify({
        event: 'aggregation_skip_empty',
        user_id: userId,
        subject_code: subjectCode,
        mastery_diagnostics: masteryDiagnostics,
        ts: now.toISOString(),
      }));
      return {
        status: 'skipped',
        mastery_nodes: 0,
        misconception_tags: 0,
        diagnostics: { mastery: masteryDiagnostics },
      };
    }

    // 4. Upsert to user_learning_profiles
    if (dryRun) {
      console.log(JSON.stringify({
        event: 'aggregation_dry_run',
        user_id: userId,
        subject_code: subjectCode,
        mastery_nodes: masteryNodeCount,
        misconception_tags: misconceptionTagCount,
        mastery_diagnostics: masteryDiagnostics,
        mastery_by_node: masteryByNode,
        misconception_frequencies: misconceptionFreqs,
        ts: now.toISOString(),
      }));
      return {
        status: 'success',
        mastery_nodes: masteryNodeCount,
        misconception_tags: misconceptionTagCount,
        diagnostics: { mastery: masteryDiagnostics },
      };
    }

    const { error: upsertError } = await supabase
      .from('user_learning_profiles')
      .upsert(
        {
          user_id: userId,
          subject_code: subjectCode,
          mastery_by_node: masteryByNode,
          misconception_frequencies: misconceptionFreqs,
          last_aggregated_at: now.toISOString(),
        },
        { onConflict: 'user_id,subject_code' },
      );

    if (upsertError) {
      console.error(JSON.stringify({
        event: 'aggregation_upsert_error',
        user_id: userId,
        subject_code: subjectCode,
        error: upsertError.message,
        ts: now.toISOString(),
      }));
      return { status: 'failed', mastery_nodes: 0, misconception_tags: 0, error: upsertError.message };
    }

    console.log(JSON.stringify({
      event: 'aggregation_complete',
      user_id: userId,
      subject_code: subjectCode,
      mastery_nodes: masteryNodeCount,
      misconception_tags: misconceptionTagCount,
      mastery_diagnostics: masteryDiagnostics,
      ts: now.toISOString(),
    }));

    return {
      status: 'success',
      mastery_nodes: masteryNodeCount,
      misconception_tags: misconceptionTagCount,
      diagnostics: { mastery: masteryDiagnostics },
    };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'aggregation_exception',
      user_id: userId,
      subject_code: subjectCode,
      error: err?.message || String(err),
      ts: now.toISOString(),
    }));
    return { status: 'failed', mastery_nodes: 0, misconception_tags: 0, error: err?.message || String(err) };
  }
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

  console.log(JSON.stringify({
    event: 'aggregation_job_start',
    dry_run: args.dryRun,
    user_id: args.userId || 'all',
    ts: new Date().toISOString(),
  }));

  // Fetch users to aggregate
  const users = await fetchUsersToAggregate(supabase, args.userId);

  if (users.length === 0) {
    console.log(JSON.stringify({
      event: 'aggregation_job_no_users',
      ts: new Date().toISOString(),
    }));
    return;
  }

  console.log(JSON.stringify({
    event: 'aggregation_job_users_found',
    count: users.length,
    ts: new Date().toISOString(),
  }));

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    const result = await aggregateForUser({
      supabase,
      userId: user.user_id,
      subjectCode: user.subject_code,
      dryRun: args.dryRun,
    });

    if (result.status === 'success') succeeded++;
    else if (result.status === 'skipped') skipped++;
    else failed++;
  }

  console.log(JSON.stringify({
    event: 'aggregation_job_complete',
    total: users.length,
    succeeded,
    failed,
    skipped,
    dry_run: args.dryRun,
    ts: new Date().toISOString(),
  }));
}

// Run main when executed directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch(err => {
    console.error(JSON.stringify({
      event: 'aggregation_job_fatal',
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    process.exit(1);
  });
}
