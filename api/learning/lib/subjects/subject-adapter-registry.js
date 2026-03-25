import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { resolveReleasedScoringPosture as resolveCoreReleasedScoringPosture } from '../contracts/released-scope.js';
import { LearningHttpError } from '../http/learning-http.js';
import { buildReviewTaskSchedulerSeed } from '../review/review-scheduler-policy.js';
import { createSubjectAdapter } from './subject-adapter-contract.js';

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

function createDisabledArea(subjectCode, selectionState) {
  return () => {
    throw createSubjectAdapterNotEnabledError(subjectCode, selectionState);
  };
}

function mergeCanonicalClassification({ classification = {}, canonicalQuestionType = null } = {}) {
  return {
    ...classification,
    family_id: canonicalQuestionType?.family_id ?? classification.family_id ?? null,
    primary_question_type_id:
      canonicalQuestionType?.question_type_id ?? classification.primary_question_type_id ?? null,
  };
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
        runtime_enabled: false,
        selection_state: 'selected_next',
      },
      classification: {
        mergeCanonicalClassification: createDisabledArea('9702', 'selected_next'),
      },
      marking: {
        resolveReleasedScoringPosture: createDisabledArea('9702', 'selected_next'),
      },
      mastery: {
        buildMasteryProjection: createDisabledArea('9702', 'selected_next'),
      },
      review: {
        buildSchedulerSeed: createDisabledArea('9702', 'selected_next'),
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
