export const IMPORTED_QUESTION_PROMPT_POLICY_ID =
  'imported_question_prompt_representation_v1';
export const IMPORTED_QUESTION_RAW_TEXT_RETENTION_POLICY_ID =
  'imported_question_raw_prompt_runtime_v1';
export const IMPORTED_QUESTION_DURABLE_POLICY_ID =
  'imported_question_durable_object_policy_v1';
export const IMPORTED_QUESTION_ANALYSIS_POLICY_ID =
  'imported_question_analysis_snapshot_policy_v1';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value, fallback = null) {
  if (typeof value === 'undefined') {
    return fallback;
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSourceOrigin(provenanceSummary = {}) {
  const normalized = normalizeString(
    provenanceSummary.source_origin
    ?? provenanceSummary.content_origin
    ?? provenanceSummary.raw_source_origin,
  ).toLowerCase();

  if ([
    'first_party',
    'student_authored',
    'released_corpus',
    'paper_backed',
    'third_party',
    'unknown',
  ].includes(normalized)) {
    return normalized;
  }

  return 'unknown';
}

function buildSourceTrustPosture(sourceOrigin) {
  if (sourceOrigin === 'first_party' || sourceOrigin === 'student_authored') {
    return 'user_provided';
  }

  if (sourceOrigin === 'released_corpus' || sourceOrigin === 'paper_backed') {
    return 'released_source';
  }

  return 'third_party_or_unknown';
}

function buildPromptRepresentationPolicy(promptRepresentation = {}) {
  const existingPolicy = isPlainObject(promptRepresentation.policy)
    ? cloneJson(promptRepresentation.policy, {})
    : {};

  return {
    ...existingPolicy,
    policy_id: IMPORTED_QUESTION_PROMPT_POLICY_ID,
    representation_kind: normalizeString(promptRepresentation.type) || null,
    raw_full_text_field: 'prompt_representation.value',
    raw_full_text_retention_policy_id: IMPORTED_QUESTION_RAW_TEXT_RETENTION_POLICY_ID,
    canonical_corpus_allowed: false,
    canonical_corpus_status: 'not_canonical_corpus',
  };
}

function buildRawFullTextRetentionPolicy(provenanceSummary = {}) {
  const existingPolicy = isPlainObject(provenanceSummary.raw_full_text_retention_policy)
    ? cloneJson(provenanceSummary.raw_full_text_retention_policy, {})
    : {};

  return {
    ...existingPolicy,
    policy_id: IMPORTED_QUESTION_RAW_TEXT_RETENTION_POLICY_ID,
    retain_raw_full_text: true,
    raw_full_text_field: 'prompt_representation.value',
    retention_basis: existingPolicy.retention_basis || 'learner_runtime_import',
    retention_scope: 'durable_runtime_question',
    indefinite_retention_allowed: false,
    canonical_corpus_allowed: false,
    deletion_trigger: existingPolicy.deletion_trigger || 'learner_delete_or_policy_expiry',
  };
}

function buildDerivedLearningObjectPolicy(provenanceSummary = {}) {
  const existingPolicy = isPlainObject(provenanceSummary.derived_learning_object_policy)
    ? cloneJson(provenanceSummary.derived_learning_object_policy, {})
    : {};

  return {
    ...existingPolicy,
    allowed: true,
    allowed_object_kinds: [
      'question_analysis_snapshot',
      'review_task',
      'artifact_candidate',
    ],
    raw_corpus_promotion_allowed: false,
    canonical_corpus_allowed: false,
  };
}

export function applyImportedQuestionDurablePolicy({
  promptRepresentation,
  provenanceSummary,
} = {}) {
  const prompt = isPlainObject(promptRepresentation)
    ? cloneJson(promptRepresentation, {})
    : {};
  const provenance = isPlainObject(provenanceSummary)
    ? cloneJson(provenanceSummary, {})
    : {};
  const sourceOrigin = normalizeSourceOrigin(provenance);
  const promptPolicy = buildPromptRepresentationPolicy(prompt);
  const rawFullTextRetentionPolicy = buildRawFullTextRetentionPolicy(provenance);
  const derivedLearningObjectPolicy = buildDerivedLearningObjectPolicy(provenance);
  const importedQuestionPolicy = {
    policy_id: IMPORTED_QUESTION_DURABLE_POLICY_ID,
    source_kind: 'imported_question',
    canonical_corpus_status: 'not_canonical_corpus',
    prompt_representation_policy_id: IMPORTED_QUESTION_PROMPT_POLICY_ID,
    raw_full_text_retention_policy_id: IMPORTED_QUESTION_RAW_TEXT_RETENTION_POLICY_ID,
    analysis_snapshot_policy_id: IMPORTED_QUESTION_ANALYSIS_POLICY_ID,
  };
  const analysisPolicy = {
    policy_id: IMPORTED_QUESTION_ANALYSIS_POLICY_ID,
    source_kind: 'imported_question',
    canonical_corpus_status: 'not_canonical_corpus',
    prompt_representation_policy_id: IMPORTED_QUESTION_PROMPT_POLICY_ID,
    raw_full_text_retention_policy_id: IMPORTED_QUESTION_RAW_TEXT_RETENTION_POLICY_ID,
    derived_learning_object_policy: derivedLearningObjectPolicy,
  };

  return {
    prompt_representation: {
      ...prompt,
      policy: promptPolicy,
    },
    provenance_summary: {
      ...provenance,
      source_kind: 'imported_question',
      import_source: normalizeString(provenance.import_source) || 'runtime_import',
      source_origin: sourceOrigin,
      source_trust_posture: buildSourceTrustPosture(sourceOrigin),
      canonical_corpus_status: 'not_canonical_corpus',
      prompt_representation_policy: promptPolicy,
      raw_full_text_retention_policy: rawFullTextRetentionPolicy,
      derived_learning_object_policy: derivedLearningObjectPolicy,
      imported_question_policy: importedQuestionPolicy,
    },
    analysis_policy: analysisPolicy,
  };
}
