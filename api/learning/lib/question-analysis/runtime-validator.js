import {
  CONFIDENCE_BANDS,
} from './low-confidence-posture.js';

export const ANALYSIS_PROVENANCE_KINDS = Object.freeze(['real', 'synthetic', 'mixed', 'unknown']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new QuestionAnalysisValidationError(message);
  }
}

export class QuestionAnalysisValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuestionAnalysisValidationError';
  }
}

export function validateQuestionEnvelope(envelope = {}) {
  assertCondition(isPlainObject(envelope), 'question envelope must be an object');
  assertCondition(normalizeString(envelope.subject_code), 'question envelope subject_code is required');
  assertCondition(normalizeString(envelope.source_kind), 'question envelope source_kind is required');
  assertCondition(isPlainObject(envelope.prompt_representation), 'question envelope prompt_representation is required');
  assertCondition(
    normalizeString(envelope.prompt_representation.type),
    'question envelope prompt_representation.type is required',
  );
  assertCondition(
    Object.prototype.hasOwnProperty.call(envelope.prompt_representation, 'value'),
    'question envelope prompt_representation.value is required',
  );

  return envelope;
}

export function validateQuestionAnalysisResult(result = {}) {
  assertCondition(isPlainObject(result), 'question analysis result must be an object');

  const confidenceBand = result.confidence_band ?? null;
  if (confidenceBand !== null) {
    assertCondition(
      CONFIDENCE_BANDS.includes(confidenceBand),
      `question analysis result confidence_band must be one of ${CONFIDENCE_BANDS.join(', ')}`,
    );
  }

  const provenanceKind = result.analysis_provenance_kind ?? null;
  if (provenanceKind !== null) {
    assertCondition(
      ANALYSIS_PROVENANCE_KINDS.includes(provenanceKind),
      `question analysis result analysis_provenance_kind must be one of ${ANALYSIS_PROVENANCE_KINDS.join(', ')}`,
    );
  }

  [
    'secondary_topic_ids',
    'prerequisite_topic_ids',
    'secondary_question_type_ids',
    'variant_tags',
    'candidate_rubric_refs',
  ].forEach((field) => {
    if (typeof result[field] !== 'undefined') {
      assertCondition(Array.isArray(result[field]), `question analysis result ${field} must be an array`);
    }
  });

  [
    'canonical_step_skeleton_summary',
    'difficulty_signal',
    'low_confidence_posture',
    'analysis_audit_metadata',
    'evidence_source_event_ref',
    'uncertainty_posture',
  ].forEach((field) => {
    if (result[field] !== null && typeof result[field] !== 'undefined') {
      assertCondition(isPlainObject(result[field]), `question analysis result ${field} must be an object`);
    }
  });

  return result;
}
