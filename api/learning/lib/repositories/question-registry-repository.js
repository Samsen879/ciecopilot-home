function buildClassificationSnapshotRef(classificationSnapshotId) {
  return {
    kind: 'classification_snapshot',
    classification_snapshot_id: classificationSnapshotId,
  };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildQuestionInsertRow(input) {
  const classification = input.classification || {};

  return {
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

export async function insertImportedQuestion(client, input) {
  const questionRow = buildQuestionInsertRow(input);
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
