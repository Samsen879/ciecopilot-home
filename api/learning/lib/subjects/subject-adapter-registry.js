import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { resolveReleasedScoringPosture as resolveCoreReleasedScoringPosture } from '../contracts/released-scope.js';
import {
  FALLBACK_REASON_CODES,
  buildFallbackPosture,
} from '../contracts/released-scope-core.js';
import { LearningHttpError } from '../http/learning-http.js';
import { buildReviewTaskSchedulerSeed } from '../review/review-scheduler-policy.js';
import {
  SUBJECT_ADAPTER_CAPABILITY_POSTURES,
  createSubjectAdapter,
} from './subject-adapter-contract.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSubjectCode(value) {
  const normalized = normalizeString(value);
  return /^\d{4}$/.test(normalized) ? normalized : null;
}

function deriveSubjectCodeFromStructuredId(value) {
  const normalized = normalizeString(value);
  const match = normalized.match(/^(\d{4})(?:[./]|$)/);
  return match ? match[1] : null;
}

function getQuestionContext(input = {}) {
  return input.question_context && typeof input.question_context === 'object'
    ? input.question_context
    : {};
}

function createSubjectAdapterNotEnabledError(subjectCode, selectionState = 'unregistered') {
  const normalizedSubjectCode = normalizeSubjectCode(subjectCode) || normalizeString(subjectCode) || 'unknown';
  return new LearningHttpError(
    LEARNING_ERROR_CODES.SUBJECT_ADAPTER_NOT_ENABLED,
    `Subject adapter ${normalizedSubjectCode} is not enabled for the learning runtime.`,
    {
      status: 409,
      details: {
        subject_code: normalizedSubjectCode,
        selection_state: selectionState,
      },
    },
  );
}

function mergeCanonicalClassification({ classification = {}, canonicalQuestionType = null } = {}) {
  return {
    ...classification,
    family_id: canonicalQuestionType?.family_id ?? classification.family_id ?? null,
    primary_question_type_id:
      canonicalQuestionType?.question_type_id ?? classification.primary_question_type_id ?? null,
  };
}

function buildCapabilityFallbackPosture(classificationConfidence = null) {
  return buildFallbackPosture(
    FALLBACK_REASON_CODES.SUBJECT_ADAPTER_CAPABILITY_NOT_ENABLED,
    classificationConfidence,
  );
}

function hasPositiveAuthoritativeSignal(decisions = []) {
  return decisions.some((decision) =>
    decision?.awarded === true && Number(decision?.awarded_marks ?? 0) > 0);
}

function hasConservativePartMapping(markingResult = null) {
  return Boolean(
    markingResult?.marking_summary?.conservative_part_mapping
    || Number(markingResult?.marking_summary?.ambiguous_rubric_point_result_count ?? 0) > 0,
  );
}

function build9709LocalSignals(input = {}, questionContext = {}, releaseScopePosture = {}) {
  const repairTopicId =
    input.repair_target_topic_id
    || questionContext.primary_topic_id
    || input.source_attempt_context?.topic_id
    || null;
  const questionTypeId = questionContext.question_type_id ?? null;
  const familyId = questionContext.family_id ?? null;

  return normalizeArray(input.marking_result?.part_results)
    .filter((partResult) => Number(partResult?.score_awarded ?? 0) > 0)
    .map((partResult) => ({
      scope_kind: partResult?.subpart_id ? 'subpart' : 'part',
      topic_id: repairTopicId,
      family_id: familyId,
      question_type_id: questionTypeId,
      part_id: partResult?.part_id ?? null,
      subpart_id: partResult?.subpart_id ?? null,
      signal_direction: 'positive',
      signal_weight: releaseScopePosture.authoritative_scoring_allowed
        ? 'authoritative_local'
        : 'conservative_local',
      release_scope_status: releaseScopePosture.release_scope_status,
      score_awarded: Number(partResult?.score_awarded ?? 0),
      score_max: Number(partResult?.score_max ?? 0),
    }));
}

function shouldPromote9709QuestionType(input = {}, releaseScopePosture = {}) {
  const markingResult = input.marking_result && typeof input.marking_result === 'object'
    ? input.marking_result
    : null;

  return Boolean(
    releaseScopePosture.authoritative_scoring_allowed
    && hasPositiveAuthoritativeSignal(input.decisions)
    && !markingResult?.marking_summary?.local_signal_only
    && !hasConservativePartMapping(markingResult),
  );
}

function build9709MasteryProjection({ input = {}, questionContext = {}, releaseScopePosture = {} } = {}) {
  const questionTypeId = questionContext.question_type_id ?? null;
  const familyId = questionContext.family_id ?? null;
  const repairTopicId =
    input.repair_target_topic_id
    || questionContext.primary_topic_id
    || input.source_attempt_context?.topic_id
    || null;
  const localSignals = build9709LocalSignals(input, questionContext, releaseScopePosture);
  const masteryUpdates = [];

  if (shouldPromote9709QuestionType(input, releaseScopePosture)) {
    masteryUpdates.push({
      level: 'question_type',
      topic_id: repairTopicId,
      family_id: familyId,
      question_type_id: questionTypeId,
      signal_direction: 'positive',
      signal_weight: 'authoritative',
      release_scope_status: releaseScopePosture.release_scope_status,
    });
  } else if (localSignals.length === 0 && familyId && releaseScopePosture.classification_confidence !== null) {
    masteryUpdates.push({
      level: 'family',
      topic_id: repairTopicId,
      family_id: familyId,
      question_type_id: null,
      signal_direction: 'diagnostic',
      signal_weight: 'conservative',
      release_scope_status: releaseScopePosture.release_scope_status,
    });
  }

  return {
    localSignals,
    masteryUpdates,
  };
}

function buildFallbackOnlyMasteryProjection() {
  return {
    localSignals: [],
    masteryUpdates: [],
  };
}

const SUBJECT_ADAPTER_RUNTIME_CAPABILITIES = Object.freeze([
  'classification',
  'marking',
  'mastery',
  'review',
]);

function buildRuntimePostureSummary(readOnly) {
  if (!readOnly) {
    return null;
  }

  return 'Read-only second-subject runtime slice: scoring, mastery, and review automation stay conservative.';
}

function buildRuntimePostureExplanation({
  adapter,
  supportedCapabilities = [],
  fallbackCapabilities = [],
} = {}) {
  const readOnly = Array.isArray(fallbackCapabilities) && fallbackCapabilities.length > 0;
  if (!readOnly || !adapter) {
    return null;
  }

  const displayName = adapter.meta.display_name ?? adapter.meta.subject_code ?? 'This subject';
  return {
    posture: 'read_only_fallback',
    summary:
      `${displayName} is read-only in the current runtime slice, so mastery and review automation remain conservative.`,
    factors: [
      {
        code: 'selection_state',
        status: adapter.meta.selection_state ?? 'unknown',
        summary:
          `${displayName} is ${String(adapter.meta.selection_state ?? 'unknown').replace(/_/g, ' ')} instead of the current runtime subject.`,
      },
      ...supportedCapabilities.map((capability) => ({
        code: capability,
        status: 'supported',
        summary: `${capability.replace(/_/g, ' ')} remains enabled in this slice.`,
      })),
      ...fallbackCapabilities.map((capability) => ({
        code: capability,
        status: 'fallback_only',
        summary: `${capability.replace(/_/g, ' ')} remains conservative in this slice.`,
      })),
    ],
  };
}

export const SUBJECT_ADAPTER_DECISION = Object.freeze({
  current_runtime_subject: '9709',
  selected_next_subject: '9702',
  decided_on: '2026-03-25',
  evidence_report_path: 'docs/reports/learning_runtime_second_subject_decision_2026-03-25.md',
});

const SUBJECT_ADAPTERS = new Map([
  [
    '9709',
    createSubjectAdapter({
      meta: {
        subject_code: '9709',
        display_name: 'Mathematics',
        runtime_enabled: true,
        selection_state: 'current_runtime',
        capability_posture: {
          classification: SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED,
          marking: SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED,
          mastery: SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED,
          review: SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED,
        },
      },
      classification: {
        mergeCanonicalClassification,
      },
      marking: {
        resolveReleasedScoringPosture: (input = {}) => resolveCoreReleasedScoringPosture(input),
      },
      mastery: {
        buildMasteryProjection: (input = {}) => build9709MasteryProjection(input),
      },
      review: {
        buildSchedulerSeed: (input = {}) => buildReviewTaskSchedulerSeed(input),
      },
    }),
  ],
  [
    '9702',
    createSubjectAdapter({
      meta: {
        subject_code: '9702',
        display_name: 'Physics',
        runtime_enabled: true,
        selection_state: 'selected_next',
        capability_posture: {
          classification: SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED,
          marking: SUBJECT_ADAPTER_CAPABILITY_POSTURES.FALLBACK_ONLY,
          mastery: SUBJECT_ADAPTER_CAPABILITY_POSTURES.FALLBACK_ONLY,
          review: SUBJECT_ADAPTER_CAPABILITY_POSTURES.FALLBACK_ONLY,
        },
      },
      classification: {
        mergeCanonicalClassification,
      },
      marking: {
        resolveReleasedScoringPosture: ({ classificationConfidence = null } = {}) =>
          buildCapabilityFallbackPosture(classificationConfidence),
      },
      mastery: {
        buildMasteryProjection: () => buildFallbackOnlyMasteryProjection(),
      },
      review: {
        buildSchedulerSeed: () => null,
      },
    }),
  ],
]);

export function resolveSubjectCodeFromRuntimeInput(input = {}, questionContext = getQuestionContext(input)) {
  return (
    normalizeSubjectCode(input.subject_code)
    || normalizeSubjectCode(questionContext.subject_code)
    || deriveSubjectCodeFromStructuredId(
      questionContext.question_type_id
      || input.repair_target_question_type_id
      || questionContext.family_id
      || questionContext.primary_topic_path
      || input.repair_target_topic_path
      || input.source_attempt_context?.topic_path
      || null,
    )
  );
}

export function getSubjectAdapter(subjectCode, { allowDisabled = false } = {}) {
  const normalizedSubjectCode = normalizeSubjectCode(subjectCode);
  const adapter = normalizedSubjectCode ? SUBJECT_ADAPTERS.get(normalizedSubjectCode) : null;

  if (!adapter) {
    throw createSubjectAdapterNotEnabledError(normalizedSubjectCode, 'unregistered');
  }

  if (!allowDisabled && !adapter.meta.runtime_enabled) {
    throw createSubjectAdapterNotEnabledError(
      adapter.meta.subject_code,
      adapter.meta.selection_state,
    );
  }

  return adapter;
}

export function getSubjectCapabilityPosture(
  subjectCode,
  capability,
  { allowDisabled = false } = {},
) {
  const adapter = getSubjectAdapter(subjectCode, { allowDisabled });
  return adapter.meta.capability_posture?.[capability]
    ?? SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED;
}

export function buildSubjectRuntimePosture(subjectCode, { allowDisabled = false } = {}) {
  const adapter = getSubjectAdapter(subjectCode, { allowDisabled });
  const supportedCapabilities = [];
  const fallbackCapabilities = [];

  for (const capability of SUBJECT_ADAPTER_RUNTIME_CAPABILITIES) {
    const posture = adapter.meta.capability_posture?.[capability]
      ?? SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED;

    if (posture === SUBJECT_ADAPTER_CAPABILITY_POSTURES.FALLBACK_ONLY) {
      fallbackCapabilities.push(capability);
    } else {
      supportedCapabilities.push(capability);
    }
  }

  const readOnly = fallbackCapabilities.length > 0;
  const fallbackPosture = readOnly
    ? buildFallbackPosture(FALLBACK_REASON_CODES.SUBJECT_ADAPTER_CAPABILITY_NOT_ENABLED, null)
    : {
      release_scope_status: null,
      authoritative_scoring_allowed: null,
      fallback_mode: null,
      fallback_reason_code: null,
      classification_confidence: null,
      learning_signal_posture: null,
    };

  return {
    subject_code: adapter.meta.subject_code,
    display_name: adapter.meta.display_name ?? adapter.meta.subject_code,
    selection_state: adapter.meta.selection_state ?? null,
    runtime_enabled: adapter.meta.runtime_enabled,
    read_only: readOnly,
    ...fallbackPosture,
    supported_capabilities: supportedCapabilities,
    fallback_capabilities: fallbackCapabilities,
    summary: buildRuntimePostureSummary(readOnly),
    explanation: buildRuntimePostureExplanation({
      adapter,
      supportedCapabilities,
      fallbackCapabilities,
    }),
  };
}

export function buildSubjectRuntimePostureOrNull(subjectCode) {
  const normalizedSubjectCode = normalizeSubjectCode(subjectCode);

  if (!normalizedSubjectCode) {
    return null;
  }

  try {
    return buildSubjectRuntimePosture(normalizedSubjectCode, { allowDisabled: true });
  } catch (error) {
    if (error?.code === LEARNING_ERROR_CODES.SUBJECT_ADAPTER_NOT_ENABLED) {
      return null;
    }
    throw error;
  }
}
