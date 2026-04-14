import { randomUUID } from 'node:crypto';
import {
  ACTIVE_EVENT_POINTER_FIELD_BY_TYPE,
  ATTEMPT_PIPELINE_STATUSES,
  LEARNING_EVENT_EFFECT_STATUSES,
  getLearningEventStageOrdinal,
  LEARNING_EVENT_TYPES,
  TERMINAL_LEARNING_EVENT_TYPE,
} from './event-contract.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function dedupeRef(eventType, dedupeKey) {
  return `${eventType}::${dedupeKey}`;
}

function streamRef(aggregateId, truthRevision, sequenceNo) {
  return `${aggregateId}::${truthRevision}::${sequenceNo}`;
}

function revisionStageRef(aggregateId, truthRevision, eventType) {
  return `${aggregateId}::${truthRevision}::${eventType}`;
}

function effectRef(handlerName, effectKey) {
  return `${handlerName}::${effectKey}`;
}

function getNowIso() {
  return new Date().toISOString();
}

function createDefaultPayload(eventType, attemptId) {
  const proposalKey = `proposal:${attemptId}`;

  switch (eventType) {
    case 'AttemptSubmitted':
      return {
        attempt_id: attemptId,
        attempt_mode: 'guided_solve',
        submitted_at: '2026-04-12T00:00:00.000Z',
        submission: {
          question_ref: { source_kind: 'typed', prompt_hash: `prompt:${attemptId}` },
          answer_parts: [{ part_ref: 'part-a', raw_text: 'synthetic answer' }],
        },
      };
    case 'QuestionClassified':
      return {
        attempt_id: attemptId,
        classification_version: 'phase0.v1',
        classification_confidence: 0.93,
        subject_adapter: { key: 'subject-adapter.synthetic', version: 'phase0.v1' },
        classification: {
          family_key: '9709.synthetic.family',
          type_key: '9709.synthetic.type',
          variant_tags: ['synthetic'],
          question_analysis_ref: 'analysis.synthetic.snapshot',
        },
        uncertain_flags: [],
      };
    case 'MarkingCompleted':
      return {
        attempt_id: attemptId,
        marking_mode: 'authoritative',
        released_scope: false,
        rubric_ref: { rubric_id: 'rubric.synthetic', rubric_version: 'phase0.v1' },
        diagnostics: {
          misconception_tags: [],
          missing_steps: [],
          strengths: ['synthetic-check'],
        },
        uncertain_flags: [],
      };
    case 'LearningUpdateProposed':
      return {
        attempt_id: attemptId,
        proposal_key: proposalKey,
        guardrail_decisions: {
          allow_family_mastery: true,
          allow_type_mastery: false,
          allow_positive_mastery: false,
          reasons: ['synthetic-phase0'],
        },
        proposed_mastery_effects: [],
        proposed_review_tasks: [],
        proposed_artifact_suggestions: [],
      };
    case 'MasteryUpdated':
      return {
        attempt_id: attemptId,
        proposal_key: proposalKey,
        applied_effects: [],
      };
    case 'ReviewTasksCreated':
      return {
        attempt_id: attemptId,
        proposal_key: proposalKey,
        tasks: [],
      };
    case 'ArtifactSuggestionsCreated':
      return {
        attempt_id: attemptId,
        proposal_key: proposalKey,
        suggestions: [],
      };
    default:
      throw new Error(`unsupported_synthetic_event_type:${eventType}`);
  }
}

function createDefaultProvenance(subjectCode, correlationId) {
  return {
    subject_code: subjectCode,
    subject_adapter: {
      key: `subject-adapter:${subjectCode}`,
      version: 'phase0.v1',
    },
    evidence_refs: [],
    lineage: {
      correlation_id: correlationId,
    },
    trust: {
      level: 'provisional',
      reasons: ['synthetic-phase0-gate'],
    },
    source: {
      kind: 'system',
      system: 'phase0-event-gate',
    },
  };
}

function assertPayloadAndProvenance(event) {
  if (!isPlainObject(event.payload)) {
    throw new Error('invalid_payload_shape');
  }

  if (!isPlainObject(event.provenance)) {
    throw new Error('invalid_provenance_shape');
  }

  if (normalizeString(event.payload.attempt_id) !== normalizeString(event.aggregate_id)) {
    throw new Error('payload_attempt_id_mismatch');
  }

  if (normalizeString(event.provenance.subject_code) !== normalizeString(event.subject_code)) {
    throw new Error('provenance_subject_code_mismatch');
  }

  if (!isPlainObject(event.provenance.subject_adapter)) {
    throw new Error('invalid_subject_adapter_ref');
  }

  if (!Array.isArray(event.provenance.evidence_refs)) {
    throw new Error('invalid_evidence_refs');
  }

  if (!isPlainObject(event.provenance.lineage)) {
    throw new Error('invalid_lineage_ref');
  }

  if (!isPlainObject(event.provenance.trust)) {
    throw new Error('invalid_trust_envelope');
  }
}

function assertOrderedAppend(store, event) {
  const state = store.pipelineStateByAttempt.get(event.aggregate_id) ?? null;
  const eventStageOrdinal = getLearningEventStageOrdinal(event.event_type);

  if (!state) {
    if (event.event_type !== 'AttemptSubmitted' || event.sequence_no !== 1 || event.truth_revision !== 1) {
      throw new Error('out_of_order_event');
    }
    return;
  }

  if (event.truth_revision !== state.current_truth_revision) {
    const isNextTruthRevisionStart = event.truth_revision === state.current_truth_revision + 1
      && event.event_type === 'AttemptSubmitted'
      && event.sequence_no === 1;

    if (!isNextTruthRevisionStart) {
      throw new Error('out_of_order_event');
    }

    return;
  }

  const expectedStageOrdinal = getLearningEventStageOrdinal(state.current_stage) + 1;
  const expectedSequenceNo = state.last_sequence_no + 1;
  if (eventStageOrdinal !== expectedStageOrdinal || event.sequence_no !== expectedSequenceNo) {
    throw new Error('out_of_order_event');
  }
}

function buildNextPipelineState(previousState, event) {
  const nextState = !previousState || previousState.current_truth_revision !== event.truth_revision
    ? {
      attempt_id: event.aggregate_id,
      learner_id: event.learner_id,
      session_id: event.session_id ?? null,
      subject_code: event.subject_code,
      current_truth_revision: 1,
      last_sequence_no: 0,
      current_stage: 'AttemptSubmitted',
      current_status: 'running',
      last_event_id: null,
      active_classification_event_id: null,
      active_marking_event_id: null,
      active_learning_update_event_id: null,
      active_mastery_event_id: null,
      active_review_tasks_event_id: null,
      active_artifact_suggestions_event_id: null,
      last_error_code: null,
      last_error_message: null,
      updated_at: null,
    }
    : { ...previousState };

  nextState.learner_id = event.learner_id;
  nextState.session_id = event.session_id ?? null;
  nextState.subject_code = event.subject_code;
  nextState.current_truth_revision = event.truth_revision;
  nextState.last_sequence_no = event.sequence_no;
  nextState.current_stage = event.event_type;
  nextState.current_status = event.event_type === TERMINAL_LEARNING_EVENT_TYPE ? 'completed' : 'running';
  nextState.last_event_id = event.event_id;
  nextState.updated_at = event.emitted_at;

  const pointerField = ACTIVE_EVENT_POINTER_FIELD_BY_TYPE[event.event_type];
  if (pointerField) {
    nextState[pointerField] = event.event_id;
  }

  return nextState;
}

function assertEffectInput(input) {
  const handlerName = normalizeString(input.handlerName ?? input.handler_name);
  const effectKey = normalizeString(input.effectKey ?? input.effect_key);
  const aggregateId = normalizeString(input.aggregateId ?? input.aggregate_id);
  const eventId = normalizeString(input.eventId ?? input.event_id);
  const truthRevision = Number(input.truthRevision ?? input.truth_revision);

  if (!handlerName) {
    throw new Error('missing_handler_name');
  }
  if (!effectKey) {
    throw new Error('missing_effect_key');
  }
  if (!aggregateId) {
    throw new Error('missing_effect_aggregate_id');
  }
  if (!eventId) {
    throw new Error('missing_effect_event_id');
  }
  if (!Number.isInteger(truthRevision) || truthRevision < 1) {
    throw new Error('invalid_effect_truth_revision');
  }

  return {
    event_id: eventId,
    handler_name: handlerName,
    effect_key: effectKey,
    aggregate_id: aggregateId,
    truth_revision: truthRevision,
    reconciliation_id: normalizeString(input.reconciliationId ?? input.reconciliation_id) || null,
  };
}

function cloneEffect(effect) {
  return cloneJson(effect);
}

export function createEmptyLearningEventStore() {
  return {
    events: [],
    effects: [],
    dedupeRefs: new Set(),
    streamRefs: new Set(),
    revisionStageRefs: new Set(),
    effectRefs: new Map(),
    attemptLockRefs: new Set(),
    pipelineStateByAttempt: new Map(),
  };
}

export function buildSyntheticAttemptEventFlow({
  attemptId,
  learnerId,
  sessionId = null,
  subjectCode,
  emittedBy = 'phase0-event-gate',
  correlationId = randomUUID(),
  truthRevision = 1,
} = {}) {
  const normalizedAttemptId = normalizeString(attemptId) || randomUUID();
  const normalizedLearnerId = normalizeString(learnerId) || randomUUID();
  const normalizedSubjectCode = normalizeString(subjectCode) || '9709';
  const normalizedSessionId = normalizeString(sessionId) || null;
  const emittedAt = '2026-04-12T00:00:00.000Z';

  return LEARNING_EVENT_TYPES.map((eventType, index) => ({
    event_id: randomUUID(),
    event_type: eventType,
    aggregate_type: 'attempt',
    aggregate_id: normalizedAttemptId,
    learner_id: normalizedLearnerId,
    session_id: normalizedSessionId,
    subject_code: normalizedSubjectCode,
    truth_revision: truthRevision,
    sequence_no: index + 1,
    correlation_id: correlationId,
    causation_event_id: index === 0 ? null : undefined,
    replay_of_event_id: null,
    supersedes_event_id: null,
    reconciliation_id: null,
    dedupe_key: `${normalizedAttemptId}:${truthRevision}:${eventType}`,
    basis_hash: `basis:${normalizedAttemptId}:${eventType}`,
    emitted_by: emittedBy,
    payload: createDefaultPayload(eventType, normalizedAttemptId),
    provenance: createDefaultProvenance(normalizedSubjectCode, correlationId),
    emitted_at: emittedAt,
  }));
}

export function buildReplayLearningEvent(sourceEvent, {
  eventId = randomUUID(),
  truthRevision = Number(sourceEvent?.truth_revision ?? 0) + 1,
  sequenceNo,
  emittedBy = 'phase0-event-replay',
  replayOfEventId = sourceEvent?.event_id ?? null,
  supersedesEventId = sourceEvent?.event_id ?? null,
  causationEventId = sourceEvent?.event_id ?? null,
  reconciliationId = null,
  dedupeKey,
  basisHash,
  payload,
  provenance,
  emittedAt = getNowIso(),
} = {}) {
  if (!sourceEvent || !sourceEvent.event_type) {
    throw new Error('missing_replay_source_event');
  }

  const normalizedSequenceNo = Number.isInteger(sequenceNo)
    ? sequenceNo
    : (truthRevision === Number(sourceEvent.truth_revision)
        ? Number(sourceEvent.sequence_no ?? 0) + 1
        : Number(sourceEvent.sequence_no ?? 0));

  const replayPayload = cloneJson(payload ?? sourceEvent.payload);
  const replayProvenance = cloneJson(provenance ?? sourceEvent.provenance) ?? {};
  const lineage = isPlainObject(replayProvenance.lineage) ? replayProvenance.lineage : {};
  replayProvenance.lineage = {
    ...lineage,
    replay_of_event_id: replayOfEventId,
    supersedes_event_id: supersedesEventId,
    causation_event_id: causationEventId,
  };

  return {
    event_id: eventId,
    event_type: sourceEvent.event_type,
    aggregate_type: sourceEvent.aggregate_type ?? 'attempt',
    aggregate_id: sourceEvent.aggregate_id,
    learner_id: sourceEvent.learner_id,
    session_id: sourceEvent.session_id ?? null,
    subject_code: sourceEvent.subject_code,
    truth_revision: truthRevision,
    sequence_no: normalizedSequenceNo,
    correlation_id: sourceEvent.correlation_id,
    causation_event_id: causationEventId,
    replay_of_event_id: replayOfEventId,
    supersedes_event_id: supersedesEventId,
    reconciliation_id: reconciliationId,
    dedupe_key: dedupeKey ?? `${sourceEvent.aggregate_id}:${truthRevision}:${sourceEvent.event_type}:replay:${sourceEvent.event_id}`,
    basis_hash: basisHash ?? sourceEvent.basis_hash,
    emitted_by: emittedBy,
    payload: replayPayload,
    provenance: replayProvenance,
    emitted_at: emittedAt,
  };
}

export function appendLearningEvent(store, candidateEvent) {
  const event = cloneJson(candidateEvent);

  if (!event || !event.event_type) {
    throw new Error('missing_learning_event');
  }

  getLearningEventStageOrdinal(event.event_type);
  assertPayloadAndProvenance(event);

  const dedupeKey = dedupeRef(event.event_type, event.dedupe_key);
  if (store.dedupeRefs.has(dedupeKey)) {
    return {
      inserted: false,
      reason_code: 'duplicate_dedupe_key',
      event: null,
      pipeline_state: cloneJson(store.pipelineStateByAttempt.get(event.aggregate_id) ?? null),
    };
  }

  assertOrderedAppend(store, event);

  const streamKey = streamRef(event.aggregate_id, event.truth_revision, event.sequence_no);
  if (store.streamRefs.has(streamKey)) {
    throw new Error('duplicate_stream_sequence');
  }

  const revisionStageKey = revisionStageRef(event.aggregate_id, event.truth_revision, event.event_type);
  if (store.revisionStageRefs.has(revisionStageKey)) {
    throw new Error('duplicate_revision_stage');
  }

  store.events.push(event);
  store.dedupeRefs.add(dedupeKey);
  store.streamRefs.add(streamKey);
  store.revisionStageRefs.add(revisionStageKey);

  const previousState = store.pipelineStateByAttempt.get(event.aggregate_id) ?? null;
  const nextState = buildNextPipelineState(previousState, event);
  store.pipelineStateByAttempt.set(event.aggregate_id, nextState);

  return {
    inserted: true,
    reason_code: null,
    event: cloneJson(event),
    pipeline_state: cloneJson(nextState),
  };
}

export function tryStartLearningEventEffect(store, input) {
  const normalizedInput = assertEffectInput(input);
  const nowIso = getNowIso();
  const ref = effectRef(normalizedInput.handler_name, normalizedInput.effect_key);
  const existing = store.effectRefs.get(ref) ?? null;

  if (existing) {
    return {
      inserted: false,
      reason_code: 'duplicate_effect_key',
      effect: cloneEffect(existing),
    };
  }

  const effect = {
    effect_id: randomUUID(),
    ...normalizedInput,
    status: 'started',
    result_ref_type: null,
    result_ref_id: null,
    error_code: null,
    error_message: null,
    attempt_count: 1,
    first_started_at: nowIso,
    last_updated_at: nowIso,
  };

  store.effects.push(effect);
  store.effectRefs.set(ref, effect);

  return {
    inserted: true,
    reason_code: null,
    effect: cloneEffect(effect),
  };
}

export function markLearningEventEffectStatus(store, {
  handlerName,
  effectKey,
  status,
  resultRefType = null,
  resultRefId = null,
  errorCode = null,
  errorMessage = null,
} = {}) {
  const normalizedHandlerName = normalizeString(handlerName);
  const normalizedEffectKey = normalizeString(effectKey);
  const normalizedStatus = normalizeString(status);

  if (!normalizedHandlerName) {
    throw new Error('missing_handler_name');
  }
  if (!normalizedEffectKey) {
    throw new Error('missing_effect_key');
  }
  if (!LEARNING_EVENT_EFFECT_STATUSES.includes(normalizedStatus)) {
    throw new Error('invalid_effect_status');
  }

  const ref = effectRef(normalizedHandlerName, normalizedEffectKey);
  const effect = store.effectRefs.get(ref) ?? null;
  if (!effect) {
    throw new Error('effect_not_found');
  }

  effect.status = normalizedStatus;
  effect.result_ref_type = resultRefType;
  effect.result_ref_id = resultRefId;
  effect.error_code = errorCode;
  effect.error_message = errorMessage;
  effect.last_updated_at = getNowIso();

  return cloneEffect(effect);
}

export function acquireAttemptStreamLock(store, attemptId) {
  const normalizedAttemptId = normalizeString(attemptId);
  if (!normalizedAttemptId) {
    throw new Error('missing_attempt_id');
  }

  if (store.attemptLockRefs.has(normalizedAttemptId)) {
    return {
      acquired: false,
      reason_code: 'attempt_stream_locked',
      attempt_id: normalizedAttemptId,
    };
  }

  store.attemptLockRefs.add(normalizedAttemptId);
  return {
    acquired: true,
    reason_code: null,
    attempt_id: normalizedAttemptId,
  };
}

export function releaseAttemptStreamLock(store, attemptId) {
  const normalizedAttemptId = normalizeString(attemptId);
  if (!normalizedAttemptId) {
    throw new Error('missing_attempt_id');
  }

  return store.attemptLockRefs.delete(normalizedAttemptId);
}

export async function runWithAttemptStreamLock(store, attemptId, operation) {
  const acquisition = acquireAttemptStreamLock(store, attemptId);
  if (!acquisition.acquired) {
    throw new Error(acquisition.reason_code);
  }

  try {
    return await operation();
  } finally {
    releaseAttemptStreamLock(store, attemptId);
  }
}

export function isAttemptPipelineStatus(value) {
  return ATTEMPT_PIPELINE_STATUSES.includes(value);
}
