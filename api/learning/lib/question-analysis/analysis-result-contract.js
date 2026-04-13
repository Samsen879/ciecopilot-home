import {
  resolveCandidateRubricRefs,
} from './candidate-rubric-ref-resolver.js';
import {
  buildLowConfidencePosture,
  deriveConfidenceBand,
  normalizeConfidenceBand,
} from './low-confidence-posture.js';
import {
  ANALYSIS_PROVENANCE_KINDS,
  validateQuestionAnalysisResult,
} from './runtime-validator.js';

const SEEDED_FAMILY_ID_BY_QUESTION_TYPE = Object.freeze({
  '9709.trigonometry.identities': '9709.trigonometry_manipulation_equations',
  '9709.trigonometry.equations': '9709.trigonometry_manipulation_equations',
  '9709.integration.application': '9709.integration_techniques',
  '9709.differential_equations.separable': '9709.differential_equations',
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (typeof value === 'undefined') {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

function normalizeObjectOrNull(value) {
  return isPlainObject(value) ? cloneJson(value) : null;
}

function normalizeObjectOrEmpty(value) {
  return isPlainObject(value) ? cloneJson(value) : {};
}

function normalizeClassificationConfidence(value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferAnalysisProvenanceKind(envelope, requestedKind) {
  const normalizedRequestedKind = normalizeNullableString(requestedKind)?.toLowerCase() ?? null;
  if (normalizedRequestedKind && ANALYSIS_PROVENANCE_KINDS.includes(normalizedRequestedKind)) {
    return normalizedRequestedKind;
  }

  const provenanceSummary = envelope?.provenance_summary ?? {};
  const marker = normalizeString(
    provenanceSummary.sample_origin
    ?? provenanceSummary.evidence_origin
    ?? provenanceSummary.provenance_kind
    ?? provenanceSummary.synthetic_kind,
  ).toLowerCase();

  if (marker === 'synthetic') {
    return 'synthetic';
  }

  if (marker === 'mixed') {
    return 'mixed';
  }

  return 'real';
}

function buildAnalysisAuditMetadata({
  envelope,
  classification,
  lowConfidencePosture,
  candidateRubricRefsSeeded,
} = {}) {
  const metadata = normalizeObjectOrEmpty(classification.analysis_audit_metadata);

  metadata.source_kind = envelope?.source_kind ?? metadata.source_kind ?? null;
  metadata.provenance_summary = cloneJson(envelope?.provenance_summary ?? metadata.provenance_summary ?? {});
  metadata.candidate_rubric_ref_source = candidateRubricRefsSeeded
    ? 'seeded_pilot_map'
    : metadata.candidate_rubric_ref_source ?? 'provided';

  if (lowConfidencePosture) {
    metadata.low_confidence_posture = lowConfidencePosture;
  }

  return metadata;
}

export function buildQuestionAnalysisResult({
  envelope,
  classification = {},
} = {}) {
  const classificationConfidence = normalizeClassificationConfidence(
    classification.classification_confidence,
  );
  const confidenceBand = normalizeConfidenceBand(classification.confidence_band)
    || deriveConfidenceBand(classificationConfidence);
  const providedCandidateRubricRefs = Array.isArray(classification.candidate_rubric_refs)
    ? classification.candidate_rubric_refs
    : [];
  const candidateRubricRefs = resolveCandidateRubricRefs({
    questionTypeId: classification.primary_question_type_id,
    providedRefs: providedCandidateRubricRefs,
  });
  const lowConfidencePosture = buildLowConfidencePosture({
    classificationConfidence,
    confidenceBand,
  });
  const candidateRubricRefsSeeded = providedCandidateRubricRefs.length === 0
    && candidateRubricRefs.length > 0;

  const result = {
    primary_topic_id: normalizeNullableString(classification.primary_topic_id),
    secondary_topic_ids: normalizeStringArray(classification.secondary_topic_ids),
    prerequisite_topic_ids: normalizeStringArray(classification.prerequisite_topic_ids),
    family_id:
      normalizeNullableString(classification.family_id)
      || SEEDED_FAMILY_ID_BY_QUESTION_TYPE[normalizeNullableString(classification.primary_question_type_id)]
      || null,
    primary_question_type_id: normalizeNullableString(classification.primary_question_type_id),
    secondary_question_type_ids: normalizeStringArray(classification.secondary_question_type_ids),
    variant_tags: normalizeStringArray(classification.variant_tags),
    classification_source:
      normalizeNullableString(classification.classification_source)
      || envelope?.source_kind
      || 'question_analysis',
    classification_confidence: classificationConfidence,
    confidence_band: confidenceBand,
    low_confidence_posture: lowConfidencePosture,
    candidate_rubric_refs: candidateRubricRefs,
    canonical_step_skeleton_summary: normalizeObjectOrNull(
      classification.canonical_step_skeleton_summary,
    ),
    difficulty_signal: normalizeObjectOrNull(classification.difficulty_signal),
    analysis_audit_metadata: buildAnalysisAuditMetadata({
      envelope,
      classification,
      lowConfidencePosture,
      candidateRubricRefsSeeded,
    }),
    analysis_version: normalizeNullableString(classification.analysis_version) || 'phase_a.v1',
    evidence_source_event_ref: normalizeObjectOrNull(classification.evidence_source_event_ref),
    analysis_provenance_kind: inferAnalysisProvenanceKind(
      envelope,
      classification.analysis_provenance_kind,
    ),
    uncertainty_validated: classification.uncertainty_validated === true,
    uncertainty_posture: normalizeObjectOrNull(classification.uncertainty_posture),
  };

  return validateQuestionAnalysisResult(result);
}
