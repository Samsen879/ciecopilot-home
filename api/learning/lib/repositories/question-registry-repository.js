import { buildClassificationSnapshotRef } from '../contracts/runtime-contract.js';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildQuestionInsertRow(input) {
  const classification = input.classification || {};

  return {
    question_id: input.question_id ?? undefined,
    source_kind: 'imported_question',
    subject_code: input.subject_code,
    paper_scope: input.paper_scope ?? null,
    primary_topic_id: classification.primary_topic_id ?? input.primary_topic_id ?? null,
    secondary_topic_ids: normalizeArray(
      classification.secondary_topic_ids ?? input.secondary_topic_ids,
    ),
    family_id: classification.family_id ?? input.family_id ?? null,
    primary_question_type_id:
      classification.primary_question_type_id ?? input.primary_question_type_id ?? null,
    secondary_question_type_ids: normalizeArray(
      classification.secondary_question_type_ids ?? input.secondary_question_type_ids,
    ),
    variant_tags: normalizeArray(classification.variant_tags ?? input.variant_tags),
    release_scope_status: input.release_scope_status ?? 'non_released_fallback',
    prompt_representation: input.prompt_representation,
    provenance_summary: input.provenance_summary ?? {},
  };
}

function buildClassificationSnapshotRow(questionId, input) {
  const classification = input.classification || {};

  return {
    question_id: questionId,
    primary_topic_id: classification.primary_topic_id ?? input.primary_topic_id ?? null,
    secondary_topic_ids: normalizeArray(
      classification.secondary_topic_ids ?? input.secondary_topic_ids,
    ),
    family_id: classification.family_id ?? input.family_id ?? null,
    primary_question_type_id:
      classification.primary_question_type_id ?? input.primary_question_type_id ?? null,
    secondary_question_type_ids: normalizeArray(
      classification.secondary_question_type_ids ?? input.secondary_question_type_ids,
    ),
    variant_tags: normalizeArray(classification.variant_tags ?? input.variant_tags),
    classification_source: classification.classification_source ?? 'imported_question',
    classification_confidence: classification.classification_confidence ?? null,
    candidate_rubric_refs: normalizeArray(classification.candidate_rubric_refs),
  };
}

export async function getCanonicalQuestionType(client, {
  subjectCode,
  questionTypeId,
} = {}) {
  const normalizedSubjectCode = typeof subjectCode === 'string' ? subjectCode.trim() : '';
  const normalizedQuestionTypeId = typeof questionTypeId === 'string' ? questionTypeId.trim() : '';

  if (!normalizedSubjectCode || !normalizedQuestionTypeId) {
    return null;
  }

  const { data, error } = await client
    .from('learning_question_types')
    .select('question_type_id, family_id, subject_code, release_state')
    .eq('question_type_id', normalizedQuestionTypeId)
    .eq('subject_code', normalizedSubjectCode)
    .eq('release_state', 'released')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load canonical question type: ${error.message}`);
  }

  return data || null;
}

export async function getCanonicalQuestionTypeTruth(client, {
  subjectCode,
  questionTypeId,
} = {}) {
  const normalizedSubjectCode = typeof subjectCode === 'string' ? subjectCode.trim() : '';
  const normalizedQuestionTypeId = typeof questionTypeId === 'string' ? questionTypeId.trim() : '';

  if (!normalizedSubjectCode || !normalizedQuestionTypeId) {
    return null;
  }

  const { data, error } = await client
    .from('learning_question_types')
    .select('question_type_id, family_id, subject_code, release_state')
    .eq('question_type_id', normalizedQuestionTypeId)
    .eq('subject_code', normalizedSubjectCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load canonical question type truth: ${error.message}`);
  }

  return data || null;
}

export async function getCanonicalQuestionFamilyTruth(client, {
  subjectCode,
  familyId,
} = {}) {
  const normalizedSubjectCode = typeof subjectCode === 'string' ? subjectCode.trim() : '';
  const normalizedFamilyId = typeof familyId === 'string' ? familyId.trim() : '';

  if (!normalizedSubjectCode || !normalizedFamilyId) {
    return null;
  }

  const { data, error } = await client
    .from('learning_question_families')
    .select('family_id, subject_code, release_state')
    .eq('family_id', normalizedFamilyId)
    .eq('subject_code', normalizedSubjectCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load canonical question family truth: ${error.message}`);
  }

  return data || null;
}

export async function getCanonicalReleasedScopeContext(client, {
  subjectCode,
  questionTypeId,
} = {}) {
  const questionType = await getCanonicalQuestionTypeTruth(client, {
    subjectCode,
    questionTypeId,
  });

  if (!questionType?.family_id) {
    return {
      questionType,
      family: null,
    };
  }

  const family = await getCanonicalQuestionFamilyTruth(client, {
    subjectCode,
    familyId: questionType.family_id,
  });

  return {
    questionType,
    family,
  };
}

export async function findQuestionById(client, { questionId } = {}) {
  const normalizedQuestionId = typeof questionId === 'string' ? questionId.trim() : '';

  if (!normalizedQuestionId) {
    return null;
  }

  const { data, error } = await client
    .from('question_bank')
    .select(
      'question_id, source_kind, subject_code, paper_scope, primary_topic_id, secondary_topic_ids, family_id, primary_question_type_id, secondary_question_type_ids, variant_tags, release_scope_status, prompt_representation, provenance_summary, classification_snapshot_ref',
    )
    .eq('question_id', normalizedQuestionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load imported question: ${error.message}`);
  }

  return data || null;
}

export const getQuestionById = findQuestionById;

export async function findQuestionsByType(client, {
  subjectCode,
  questionTypeId,
} = {}) {
  const normalizedSubjectCode = typeof subjectCode === 'string' ? subjectCode.trim() : '';
  const normalizedQuestionTypeId = typeof questionTypeId === 'string' ? questionTypeId.trim() : '';

  if (!normalizedSubjectCode || !normalizedQuestionTypeId) {
    return [];
  }

  const { data, error } = await client
    .from('learning_question_registry_projection')
    .select('*')
    .eq('subject_code', normalizedSubjectCode)
    .eq('primary_question_type_id', normalizedQuestionTypeId);

  if (error) {
    throw new Error(`Failed to load questions for question type: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

export async function insertImportedQuestion(client, input) {
  const questionRow = buildQuestionInsertRow(input);

  if (typeof questionRow.question_id === 'undefined') {
    delete questionRow.question_id;
  }
  const { data: insertedQuestion, error: questionError } = await client
    .from('question_bank')
    .insert(questionRow)
    .select(
      'question_id, source_kind, subject_code, paper_scope, primary_topic_id, secondary_topic_ids, family_id, primary_question_type_id, secondary_question_type_ids, variant_tags, release_scope_status, prompt_representation, provenance_summary',
    )
    .single();

  if (questionError || !insertedQuestion) {
    throw new Error(
      `Failed to insert imported question: ${questionError?.message || 'no data returned'}`,
    );
  }

  const snapshotRow = buildClassificationSnapshotRow(insertedQuestion.question_id, input);
  const { data: insertedSnapshot, error: snapshotError } = await client
    .from('learning_question_analysis_snapshots')
    .insert(snapshotRow)
    .select('classification_snapshot_id')
    .single();

  if (snapshotError || !insertedSnapshot) {
    throw new Error(
      `Failed to insert question classification snapshot: ${snapshotError?.message || 'no data returned'}`,
    );
  }

  const classification_snapshot_ref = buildClassificationSnapshotRef(
    insertedSnapshot.classification_snapshot_id,
  );

  const { error: updateError } = await client
    .from('question_bank')
    .update({ classification_snapshot_ref })
    .eq('question_id', insertedQuestion.question_id);

  if (updateError) {
    throw new Error(
      `Failed to persist classification snapshot ref on question: ${updateError.message}`,
    );
  }

  return {
    ...insertedQuestion,
    classification_snapshot_ref,
  };
}
