import { randomUUID } from 'node:crypto';
import { projectAttemptPipelineState } from './event-service.js';

const BRIDGE_EVENT_TYPES = Object.freeze([
  'AttemptSubmitted',
  'QuestionClassified',
  'MarkingCompleted',
  'LearningUpdateProposed',
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeQuestionNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAuthorityPosture(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? cloneJson(value)
    : {};
}

function normalizePrimaryTopicRef(questionContext = {}, attemptContext = {}) {
  const topicId = normalizeString(attemptContext.topic_id ?? questionContext.primary_topic_id) || null;
  const topicPath = normalizeString(
    attemptContext.topic_path
    ?? questionContext.primary_topic_path
    ?? questionContext.topic_path,
  ) || null;

  if (!topicId && !topicPath) {
    return null;
  }

  return {
    kind: 'topic',
    topic_id: topicId,
    topic_path: topicPath,
  };
}

function buildSubjectAdapterRef(subjectCode) {
  return {
    key: `subject-adapter:${subjectCode}`,
    version: 'evaluate-v1.runtime-bridge.v1',
  };
}

function buildTrustEnvelope(authorityPosture) {
  const fallbackReason = normalizeString(authorityPosture.fallback_reason_code) || null;
  const learningSignalPosture = normalizeString(authorityPosture.learning_signal_posture) || null;

  return {
    level: authorityPosture.authoritative_scoring_allowed ? 'authoritative' : 'conservative',
    reasons: fallbackReason ? [fallbackReason] : [learningSignalPosture || 'runtime_bridge'],
    authority_posture: cloneJson(authorityPosture),
  };
}

function buildEvidenceRefs({
  sourceAttemptRef,
  sourceMarkRunRef,
  questionId,
  questionContext,
  attemptContext,
} = {}) {
  const refs = [];

  if (sourceAttemptRef) {
    refs.push(cloneJson(sourceAttemptRef));
  }

  if (sourceMarkRunRef) {
    refs.push(cloneJson(sourceMarkRunRef));
  }

  if (normalizeString(questionId)) {
    refs.push({
      kind: 'question',
      question_id: normalizeString(questionId),
    });
  }

  const primaryTopicRef = normalizePrimaryTopicRef(questionContext, attemptContext);
  if (primaryTopicRef) {
    refs.push(primaryTopicRef);
  }

  return refs;
}

function buildBaseProvenance({
  subjectCode,
  authorityPosture,
  correlationId,
  sourceAttemptRef,
  sourceMarkRunRef,
  questionId,
  questionContext,
  attemptContext,
} = {}) {
  return {
    subject_code: subjectCode,
    subject_adapter: buildSubjectAdapterRef(subjectCode),
    evidence_refs: buildEvidenceRefs({
      sourceAttemptRef,
      sourceMarkRunRef,
      questionId,
      questionContext,
      attemptContext,
    }),
    lineage: {
      correlation_id: correlationId,
      source_attempt_id: sourceAttemptRef?.attempt_id ?? null,
      source_mark_run_id: sourceMarkRunRef?.mark_run_id ?? null,
    },
    trust: buildTrustEnvelope(authorityPosture),
    source: {
      kind: 'marking_runtime',
      route: 'evaluate-v1',
    },
  };
}

function buildAttemptSubmittedPayload({
  attemptId,
  authorityPosture,
  submittedAt,
  questionId,
  markRunId,
  storageKey,
  qNumber,
  subpart,
  studentSteps,
} = {}) {
  return {
    attempt_id: attemptId,
    authority_posture: cloneJson(authorityPosture),
    attempt_mode: 'guided_solve',
    submitted_at: submittedAt,
    source_question_ref: questionId
      ? {
        kind: 'question',
        question_id: questionId,
      }
      : null,
    source_mark_run_ref: markRunId
      ? {
        kind: 'mark_run',
        mark_run_id: markRunId,
      }
      : null,
    submission: {
      storage_key: normalizeString(storageKey) || null,
      q_number: normalizeQuestionNumber(qNumber),
      subpart: normalizeString(subpart) || null,
      answer_parts: normalizeArray(studentSteps).map((step, index) => ({
        part_ref: normalizeString(subpart) || `part-${index + 1}`,
        step_id: normalizeString(step?.step_id) || `step-${index + 1}`,
        raw_text: normalizeString(step?.text) || '',
      })),
    },
  };
}

function buildQuestionClassifiedPayload({
  attemptId,
  authorityPosture,
  questionId,
  questionContext,
  attemptContext,
  subjectCode,
} = {}) {
  return {
    attempt_id: attemptId,
    authority_posture: cloneJson(authorityPosture),
    classification_version: 'evaluate-v1.runtime-bridge.v1',
    classification_confidence:
      questionContext.classification_confidence
      ?? authorityPosture.classification_confidence
      ?? null,
    subject_adapter: buildSubjectAdapterRef(subjectCode),
    classification: {
      question_id: normalizeString(questionId) || null,
      family_key: normalizeString(questionContext.family_id) || null,
      type_key: normalizeString(questionContext.question_type_id) || null,
      variant_tags: normalizeArray(questionContext.variant_tags),
      primary_topic_ref: normalizePrimaryTopicRef(questionContext, attemptContext),
      release_scope_status: normalizeString(questionContext.release_scope_status) || null,
    },
    uncertain_flags: authorityPosture.authoritative_scoring_allowed
      ? []
      : [normalizeString(authorityPosture.fallback_reason_code) || 'non_authoritative_bridge'],
  };
}

function buildRubricRef(questionContext = {}) {
  const releasedRef = normalizeArray(questionContext.candidate_rubric_refs)[0];
  if (releasedRef && typeof releasedRef === 'object') {
    return cloneJson(releasedRef);
  }

  return {
    kind: 'rubric_release',
    rubric_version_id: null,
    release_state: null,
  };
}

function buildMarkingCompletedPayload({
  attemptId,
  authorityPosture,
  questionContext,
  markRunId,
  decisions,
  markingResult,
} = {}) {
  return {
    attempt_id: attemptId,
    authority_posture: cloneJson(authorityPosture),
    marking_mode: authorityPosture.authoritative_scoring_allowed ? 'authoritative' : 'fallback',
    released_scope: authorityPosture.release_scope_status === 'released_scoring',
    rubric_ref: buildRubricRef(questionContext),
    diagnostics: {
      decision_count: normalizeArray(decisions).length,
      awarded_decision_count: normalizeArray(decisions).filter((decision) => decision?.awarded === true).length,
      misconception_tags: [],
      missing_steps: [],
      strengths: [],
      source_mark_run_ref: markRunId
        ? {
          kind: 'mark_run',
          mark_run_id: markRunId,
        }
        : null,
      marking_result: cloneJson(markingResult ?? null),
    },
    uncertain_flags: authorityPosture.authoritative_scoring_allowed
      ? []
      : [normalizeString(authorityPosture.fallback_reason_code) || 'non_authoritative_bridge'],
  };
}

function buildLearningUpdateProposedPayload({
  attemptId,
  authorityPosture,
  markRunId,
} = {}) {
  const fallbackReason = normalizeString(authorityPosture.fallback_reason_code) || null;

  return {
    attempt_id: attemptId,
    authority_posture: cloneJson(authorityPosture),
    proposal_key: normalizeString(markRunId) ? `mark-run:${markRunId}` : `attempt:${attemptId}`,
    guardrail_decisions: {
      authoritative_scoring_allowed: Boolean(authorityPosture.authoritative_scoring_allowed),
      release_scope_status: normalizeString(authorityPosture.release_scope_status) || null,
      learning_signal_posture: normalizeString(authorityPosture.learning_signal_posture) || null,
      fallback_mode: normalizeString(authorityPosture.fallback_mode) || null,
      fallback_reason_code: fallbackReason,
      reasons: fallbackReason ? [fallbackReason] : ['released_scoring'],
    },
    proposed_mastery_effects: [],
    proposed_review_tasks: [],
    proposed_artifact_suggestions: [],
  };
}

function assertImmutableAttemptId({
  attemptId,
  sourceAttemptRef,
  markingResult,
} = {}) {
  const normalizedAttemptId = normalizeString(attemptId);
  const sourceAttemptId = normalizeString(sourceAttemptRef?.attempt_id);
  const markingResultAttemptId = normalizeString(markingResult?.attempt_id);

  if (!normalizedAttemptId) {
    throw new Error('missing_attempt_id');
  }

  if (sourceAttemptId && sourceAttemptId !== normalizedAttemptId) {
    throw new Error('immutable_attempt_id_mismatch');
  }

  if (markingResultAttemptId && markingResultAttemptId !== normalizedAttemptId) {
    throw new Error('immutable_attempt_id_mismatch');
  }

  return normalizedAttemptId;
}

async function loadExistingStreamHead(client, attemptId) {
  const { data, error } = await client
    .from('learning_events')
    .select('truth_revision, sequence_no')
    .eq('aggregate_id', attemptId)
    .order('truth_revision', { ascending: false })
    .order('sequence_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load learning_events stream head.');
  }

  return data ?? null;
}

function resolveNextTruthRevision(streamHead) {
  const currentTruthRevision = Number(streamHead?.truth_revision);
  return Number.isInteger(currentTruthRevision) && currentTruthRevision >= 1
    ? currentTruthRevision + 1
    : 1;
}

function buildProjectionSeedState(attemptId, streamHead) {
  const currentTruthRevision = Number(streamHead?.truth_revision);
  const lastSequenceNo = Number(streamHead?.sequence_no);

  if (!Number.isInteger(currentTruthRevision) || currentTruthRevision < 1) {
    return null;
  }

  return {
    attempt_id: attemptId,
    current_truth_revision: currentTruthRevision,
    last_sequence_no: Number.isInteger(lastSequenceNo) && lastSequenceNo >= 0 ? lastSequenceNo : 0,
    current_stage: 'LearningUpdateProposed',
    current_status: 'running',
  };
}

function buildBridgeEvents(input = {}) {
  const attemptId = assertImmutableAttemptId(input);
  const learnerId = normalizeString(input.learnerId);
  const subjectCode = normalizeString(input.subjectCode);
  const correlationId = normalizeString(input.correlationId) || randomUUID();
  const emittedBy = normalizeString(input.emittedBy) || 'evaluate-v1';
  const submittedAt = normalizeString(input.submittedAt) || new Date().toISOString();
  const emittedAt = normalizeString(input.emittedAt) || submittedAt;
  const authorityPosture = normalizeAuthorityPosture(input.authorityPosture);
  const markRunId = normalizeString(input.markRunId) || null;
  const questionId = normalizeString(input.questionId) || null;
  const sessionId = normalizeString(input.sessionId) || null;
  const questionContext = cloneJson(input.questionContext ?? {}) ?? {};
  const attemptContext = cloneJson(input.attemptContext ?? {}) ?? {};
  const sourceAttemptRef = cloneJson(input.sourceAttemptRef ?? null);
  const sourceMarkRunRef = cloneJson(input.sourceMarkRunRef ?? null);
  const truthRevision = resolveNextTruthRevision(input.streamHead);

  if (!learnerId) {
    throw new Error('missing_learner_id');
  }

  if (!subjectCode) {
    throw new Error('missing_subject_code');
  }

  const baseProvenance = buildBaseProvenance({
    subjectCode,
    authorityPosture,
    correlationId,
    sourceAttemptRef,
    sourceMarkRunRef,
    questionId,
    questionContext,
    attemptContext,
  });

  const payloads = [
    buildAttemptSubmittedPayload({
      attemptId,
      authorityPosture,
      submittedAt,
      questionId,
      markRunId,
      storageKey: input.storageKey,
      qNumber: input.qNumber,
      subpart: input.subpart,
      studentSteps: input.studentSteps,
    }),
    buildQuestionClassifiedPayload({
      attemptId,
      authorityPosture,
      questionId,
      questionContext,
      attemptContext,
      subjectCode,
    }),
    buildMarkingCompletedPayload({
      attemptId,
      authorityPosture,
      questionContext,
      markRunId,
      decisions: input.decisions,
      markingResult: input.markingResult,
    }),
    buildLearningUpdateProposedPayload({
      attemptId,
      authorityPosture,
      markRunId,
    }),
  ];

  return BRIDGE_EVENT_TYPES.map((eventType, index) => ({
    event_id: randomUUID(),
    event_type: eventType,
    aggregate_type: 'attempt',
    aggregate_id: attemptId,
    learner_id: learnerId,
    session_id: sessionId,
    subject_code: subjectCode,
    truth_revision: truthRevision,
    sequence_no: index + 1,
    correlation_id: correlationId,
    causation_event_id: null,
    replay_of_event_id: null,
    supersedes_event_id: null,
    reconciliation_id: null,
    dedupe_key: `${markRunId || attemptId}:runtime-bridge:${eventType}`,
    basis_hash: `${markRunId || attemptId}:runtime-bridge:${eventType}:v1`,
    emitted_by: emittedBy,
    payload: payloads[index],
    provenance: cloneJson(baseProvenance),
    emitted_at: emittedAt,
  })).map((event, index, events) => ({
    ...event,
    causation_event_id: index === 0 ? null : events[index - 1].event_id,
  }));
}

async function insertLearningEvents(client, events) {
  const { error } = await client
    .from('learning_events')
    .insert(events);

  if (error) {
    throw new Error(error.message || 'Failed to insert learning_events.');
  }
}

async function upsertAttemptPipelineState(client, pipelineState) {
  const { error } = await client
    .from('attempt_pipeline_state')
    .upsert(pipelineState);

  if (error) {
    throw new Error(error.message || 'Failed to upsert attempt_pipeline_state.');
  }
}

async function writeBridgeWarning(client, {
  attemptId,
  attemptContext,
  markRunId,
  authorityPosture,
  failedStage,
  errorMessage,
} = {}) {
  const warningRow = {
    attempt_id: attemptId,
    mark_decision_id: null,
    topic_path: attemptContext?.topic_path ?? null,
    node_id: attemptContext?.topic_id ?? null,
    misconception_tag: 'unclassified',
    severity: 'minor',
    metadata: {
      kind: 'attempt_event_bridge_warning',
      failed_stage: failedStage,
      mark_run_id: markRunId,
      error_message: errorMessage,
      authority_posture: cloneJson(authorityPosture),
    },
  };

  const { error } = await client
    .from('error_events')
    .insert([warningRow]);

  return !error;
}

export async function persistAttemptEventBridge(client, input = {}) {
  const attemptId = assertImmutableAttemptId(input);
  const authorityPosture = normalizeAuthorityPosture(input.authorityPosture);
  const attemptContext = cloneJson(input.attemptContext ?? {}) ?? {};
  const markRunId = normalizeString(input.markRunId) || null;

  try {
    const streamHead = await loadExistingStreamHead(client, attemptId);
    const events = buildBridgeEvents({
      ...input,
      streamHead,
    });
    const pipelineState = projectAttemptPipelineState(
      events,
      buildProjectionSeedState(attemptId, streamHead),
    );

    await insertLearningEvents(client, events);
    await upsertAttemptPipelineState(client, pipelineState);

    return {
      ok: true,
      warningRecorded: false,
      persisted_event_types: events.map((event) => event.event_type),
      pipeline_state: pipelineState,
    };
  } catch (error) {
    const errorMessage = error?.message || String(error);
    const failedStage = /learning_events/i.test(errorMessage)
      ? 'learning_events_insert'
      : /attempt_pipeline_state/i.test(errorMessage)
        ? 'attempt_pipeline_state_upsert'
        : 'bridge_validation';
    const warningRecorded = await writeBridgeWarning(client, {
      attemptId,
      attemptContext,
      markRunId,
      authorityPosture,
      failedStage,
      errorMessage,
    });

    return {
      ok: false,
      warningRecorded,
      reason_code: 'attempt_event_bridge_failed',
      failed_stage: failedStage,
      error_message: errorMessage,
    };
  }
}
