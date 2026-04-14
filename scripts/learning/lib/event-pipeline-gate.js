import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  acquireAttemptStreamLock,
  appendLearningEvent,
  buildReplayLearningEvent,
  buildSyntheticAttemptEventFlow,
  createEmptyLearningEventStore,
  markLearningEventEffectStatus,
  releaseAttemptStreamLock,
  tryStartLearningEventEffect,
} from '../../../api/learning/lib/events/event-service.js';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)), '..');

export const EVENT_PIPELINE_GATE_SCHEMA_VERSION = 'learning_runtime_event_pipeline_gate_receipt_v1';
export const DEFAULT_EVENT_PIPELINE_MIGRATION_PATH = 'supabase/migrations/20260412090000_phase0_learning_events_core.sql';
export const DEFAULT_EVENT_PIPELINE_GATE_RECEIPT_PATH = 'data/learning_runtime/release_evidence/event-pipeline-gate-receipt.v1.json';
export const DEFAULT_EVENT_PIPELINE_GATE_REPORT_PATH = 'docs/reports/learning_runtime_event_pipeline_gate_2026-04-12.md';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRootDir(rootDir) {
  return normalizeString(rootDir) || PROJECT_ROOT;
}

function resolveFromRoot(rootDir, relPath) {
  return path.join(normalizeRootDir(rootDir), relPath);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readTextArtifact(rootDir, relPath) {
  return fs.readFileSync(resolveFromRoot(rootDir, relPath), 'utf8');
}

function toGateStatus(passed) {
  return passed ? 'pass' : 'fail';
}

function evaluateMigrationContract(rootDir, migrationPath) {
  const absolutePath = resolveFromRoot(rootDir, migrationPath);
  if (!fs.existsSync(absolutePath)) {
    return {
      status: 'fail',
      checked_path: migrationPath,
      blocked_reasons: ['migration_missing'],
      required_tokens: [],
      missing_tokens: ['migration_missing'],
    };
  }

  const sql = readTextArtifact(rootDir, migrationPath).toLowerCase();
  const requiredTokens = [
    'create table if not exists public.learning_events',
    'create table if not exists public.learning_event_effects',
    'create table if not exists public.attempt_pipeline_state',
    'unique (aggregate_id, sequence_no)',
    'unique (aggregate_id, truth_revision, event_type)',
    'unique (event_type, dedupe_key)',
    'unique (handler_name, effect_key)',
    'attemptsubmitted',
    'artifactsuggestionscreated',
  ];
  const missingTokens = requiredTokens.filter((token) => !sql.includes(token));

  return {
    status: toGateStatus(missingTokens.length === 0),
    checked_path: migrationPath,
    blocked_reasons: missingTokens.length === 0 ? [] : ['migration_contract_missing_token'],
    required_tokens: requiredTokens,
    missing_tokens: missingTokens,
  };
}

function evaluateOrderedPipeline() {
  const store = createEmptyLearningEventStore();
  const flow = buildSyntheticAttemptEventFlow({
    attemptId: 'phase0-attempt',
    learnerId: 'phase0-learner',
    sessionId: 'phase0-session',
    subjectCode: '9709',
    emittedBy: 'event-pipeline-gate',
  });

  const results = flow.map((event) => appendLearningEvent(store, event));
  const finalState = store.pipelineStateByAttempt.get('phase0-attempt') ?? null;
  const passed = results.every((result) => result.inserted)
    && finalState?.current_stage === 'ArtifactSuggestionsCreated'
    && finalState?.last_sequence_no === 7
    && finalState?.current_status === 'completed';

  return {
    status: toGateStatus(passed),
    blocked_reasons: passed ? [] : ['ordered_pipeline_failed'],
    inserted_count: results.filter((result) => result.inserted).length,
    final_stage: finalState?.current_stage ?? null,
    final_status: finalState?.current_status ?? null,
    last_sequence_no: finalState?.last_sequence_no ?? null,
  };
}

function evaluateDedupeGuard() {
  const store = createEmptyLearningEventStore();
  const [attemptSubmitted] = buildSyntheticAttemptEventFlow({
    attemptId: 'phase0-dedupe',
    learnerId: 'phase0-learner',
    sessionId: 'phase0-session',
    subjectCode: '9709',
    emittedBy: 'event-pipeline-gate',
  });

  const first = appendLearningEvent(store, attemptSubmitted);
  const second = appendLearningEvent(store, attemptSubmitted);
  const passed = first.inserted === true && second.inserted === false && second.reason_code === 'duplicate_dedupe_key';

  return {
    status: toGateStatus(passed),
    blocked_reasons: passed ? [] : ['dedupe_guard_failed'],
    first_inserted: first.inserted,
    duplicate_inserted: second.inserted,
    duplicate_reason_code: second.reason_code,
  };
}

function evaluateOutOfOrderGuard() {
  const store = createEmptyLearningEventStore();
  const [attemptSubmitted, , markingCompleted] = buildSyntheticAttemptEventFlow({
    attemptId: 'phase0-order',
    learnerId: 'phase0-learner',
    sessionId: 'phase0-session',
    subjectCode: '9709',
    emittedBy: 'event-pipeline-gate',
  });

  appendLearningEvent(store, attemptSubmitted);

  let errorCode = null;
  try {
    appendLearningEvent(store, markingCompleted);
  } catch (error) {
    errorCode = error instanceof Error ? error.message : String(error);
  }

  const passed = errorCode === 'out_of_order_event';
  return {
    status: toGateStatus(passed),
    blocked_reasons: passed ? [] : ['out_of_order_guard_failed'],
    error_code: errorCode,
  };
}

function evaluateEffectIdempotency() {
  const store = createEmptyLearningEventStore();
  const flow = buildSyntheticAttemptEventFlow({
    attemptId: 'phase0-effect',
    learnerId: 'phase0-learner',
    sessionId: 'phase0-session',
    subjectCode: '9709',
    emittedBy: 'event-pipeline-gate',
  });
  const originalEvent = flow.at(-1);
  const replayEvent = buildReplayLearningEvent(originalEvent, {
    truthRevision: 2,
    sequenceNo: 8,
    emittedBy: 'event-pipeline-gate-replay',
  });

  const first = tryStartLearningEventEffect(store, {
    eventId: originalEvent.event_id,
    handlerName: 'project:artifact-suggestions',
    effectKey: 'artifact-slot:review_queue:stable-output',
    aggregateId: originalEvent.aggregate_id,
    truthRevision: originalEvent.truth_revision,
  });
  const completed = markLearningEventEffectStatus(store, {
    handlerName: 'project:artifact-suggestions',
    effectKey: 'artifact-slot:review_queue:stable-output',
    status: 'succeeded',
    resultRefType: 'artifact_suggestion_version',
    resultRefId: 'artifact-suggestion-1',
  });
  const replay = tryStartLearningEventEffect(store, {
    eventId: replayEvent.event_id,
    handlerName: 'project:artifact-suggestions',
    effectKey: 'artifact-slot:review_queue:stable-output',
    aggregateId: replayEvent.aggregate_id,
    truthRevision: replayEvent.truth_revision,
  });

  const passed = first.inserted === true
    && completed.status === 'succeeded'
    && replay.inserted === false
    && replay.reason_code === 'duplicate_effect_key'
    && store.effects.length === 1;

  return {
    status: toGateStatus(passed),
    blocked_reasons: passed ? [] : ['effect_idempotency_failed'],
    first_inserted: first.inserted,
    completed_status: completed.status,
    replay_inserted: replay.inserted,
    replay_reason_code: replay.reason_code,
    effect_count: store.effects.length,
  };
}

function evaluateAttemptStreamLock() {
  const store = createEmptyLearningEventStore();
  const first = acquireAttemptStreamLock(store, 'phase0-lock');
  const second = acquireAttemptStreamLock(store, 'phase0-lock');
  const released = releaseAttemptStreamLock(store, 'phase0-lock');
  const third = acquireAttemptStreamLock(store, 'phase0-lock');
  const cleanup = releaseAttemptStreamLock(store, 'phase0-lock');
  const passed = first.acquired === true
    && second.acquired === false
    && second.reason_code === 'attempt_stream_locked'
    && released === true
    && third.acquired === true
    && cleanup === true;

  return {
    status: toGateStatus(passed),
    blocked_reasons: passed ? [] : ['attempt_stream_lock_failed'],
    first_acquired: first.acquired,
    second_acquired: second.acquired,
    second_reason_code: second.reason_code,
    released,
    third_acquired: third.acquired,
  };
}

export function buildEventPipelineGateReceipt({
  rootDir = PROJECT_ROOT,
  migrationPath = DEFAULT_EVENT_PIPELINE_MIGRATION_PATH,
} = {}) {
  const migrationContract = evaluateMigrationContract(rootDir, migrationPath);
  const orderedPipeline = evaluateOrderedPipeline();
  const dedupeGuard = evaluateDedupeGuard();
  const effectIdempotency = evaluateEffectIdempotency();
  const attemptStreamLock = evaluateAttemptStreamLock();
  const outOfOrderGuard = evaluateOutOfOrderGuard();
  const gates = {
    migration_contract: migrationContract,
    ordered_pipeline: orderedPipeline,
    dedupe_guard: dedupeGuard,
    effect_idempotency: effectIdempotency,
    attempt_stream_lock: attemptStreamLock,
    out_of_order_guard: outOfOrderGuard,
  };
  const failingGateNames = Object.entries(gates)
    .filter(([, gate]) => gate.status !== 'pass')
    .map(([gateName]) => gateName);

  return {
    schema_version: EVENT_PIPELINE_GATE_SCHEMA_VERSION,
    status: failingGateNames.length === 0 ? 'pass' : 'fail',
    phase0_ready: failingGateNames.length === 0,
    migration_path: migrationPath,
    generated_at: new Date().toISOString(),
    gates,
    failing_gate_names: failingGateNames,
  };
}

export function renderEventPipelineGateReport(receipt) {
  const lines = [
    '# Learning Event Pipeline Gate',
    '',
    `- status: \`${receipt.status}\``,
    `- phase0_ready: \`${receipt.phase0_ready}\``,
    `- generated_at: \`${receipt.generated_at}\``,
    `- migration_path: \`${receipt.migration_path}\``,
    '',
    '## Gates',
    '',
  ];

  for (const [gateName, gate] of Object.entries(receipt.gates)) {
    lines.push(`### ${gateName}`);
    lines.push(`- status: \`${gate.status}\``);
    if (Array.isArray(gate.blocked_reasons) && gate.blocked_reasons.length > 0) {
      lines.push(`- blocked_reasons: \`${JSON.stringify(gate.blocked_reasons)}\``);
    }
    for (const [key, value] of Object.entries(gate)) {
      if (key === 'status' || key === 'blocked_reasons') {
        continue;
      }
      lines.push(`- ${key}: \`${JSON.stringify(value)}\``);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

export function writeEventPipelineGateOutputs({
  rootDir = PROJECT_ROOT,
  migrationPath = DEFAULT_EVENT_PIPELINE_MIGRATION_PATH,
  outJsonPath = DEFAULT_EVENT_PIPELINE_GATE_RECEIPT_PATH,
  outMdPath = DEFAULT_EVENT_PIPELINE_GATE_REPORT_PATH,
} = {}) {
  const receipt = buildEventPipelineGateReceipt({ rootDir, migrationPath });
  const markdown = renderEventPipelineGateReport(receipt);

  const absoluteJsonPath = resolveFromRoot(rootDir, outJsonPath);
  const absoluteMdPath = resolveFromRoot(rootDir, outMdPath);
  ensureParentDir(absoluteJsonPath);
  ensureParentDir(absoluteMdPath);
  fs.writeFileSync(absoluteJsonPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  fs.writeFileSync(absoluteMdPath, markdown, 'utf8');

  return {
    receipt,
    markdown,
    outJsonPath,
    outMdPath,
  };
}
