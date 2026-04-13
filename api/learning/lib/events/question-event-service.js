function cloneJson(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildQuestionEventRef(questionEventId) {
  return {
    kind: 'question_event',
    question_event_id: questionEventId,
    event_type: 'QuestionClassified',
  };
}

function buildQuestionClassifiedEventPayload({
  questionId,
  classificationSnapshotId,
  question = {},
  classification = {},
} = {}) {
  return {
    question_id: questionId,
    classification_snapshot_id: classificationSnapshotId,
    subject_code: question.subject_code ?? null,
    family_id: question.family_id ?? classification.family_id ?? null,
    primary_question_type_id:
      question.primary_question_type_id ?? classification.primary_question_type_id ?? null,
    classification_confidence: classification.classification_confidence ?? null,
    confidence_band: classification.confidence_band ?? null,
    low_confidence_posture: cloneJson(classification.low_confidence_posture),
    candidate_rubric_refs: cloneJson(classification.candidate_rubric_refs ?? []),
    analysis_version: classification.analysis_version ?? null,
  };
}

function buildQuestionClassifiedProvenance({
  question = {},
  classification = {},
} = {}) {
  return {
    source_kind: question.source_kind ?? 'imported_question',
    subject_code: question.subject_code ?? null,
    classification_source: classification.classification_source ?? null,
    analysis_version: classification.analysis_version ?? null,
    analysis_provenance_kind: classification.analysis_provenance_kind ?? null,
    provenance_summary: cloneJson(question.provenance_summary ?? {}),
    audit_metadata: cloneJson(classification.analysis_audit_metadata ?? {}),
  };
}

export async function appendQuestionClassifiedEvent(client, {
  questionId,
  classificationSnapshotId,
  question,
  classification,
} = {}) {
  const normalizedQuestionId = normalizeString(questionId);
  const normalizedSnapshotId = normalizeString(classificationSnapshotId);

  if (!normalizedQuestionId || !normalizedSnapshotId) {
    throw new Error('QuestionClassified event requires question_id and classification_snapshot_id.');
  }

  const { data, error } = await client
    .from('learning_question_events')
    .insert({
      event_type: 'QuestionClassified',
      question_id: normalizedQuestionId,
      classification_snapshot_id: normalizedSnapshotId,
      event_payload: buildQuestionClassifiedEventPayload({
        questionId: normalizedQuestionId,
        classificationSnapshotId: normalizedSnapshotId,
        question,
        classification,
      }),
      provenance: buildQuestionClassifiedProvenance({
        question,
        classification,
      }),
    })
    .select('question_event_id')
    .single();

  if (error || !data?.question_event_id) {
    throw new Error(
      `Failed to insert QuestionClassified event: ${error?.message || 'no data returned'}`,
    );
  }

  return {
    questionEventId: data.question_event_id,
    eventRef: buildQuestionEventRef(data.question_event_id),
  };
}
