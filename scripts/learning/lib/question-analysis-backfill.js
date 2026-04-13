import { randomUUID } from 'node:crypto';
import { buildClassificationSnapshotRef } from '../../../api/learning/lib/contracts/runtime-contract.js';
import { appendQuestionClassifiedEvent } from '../../../api/learning/lib/events/question-event-service.js';
import { resolveReleasedScoringPosture } from '../../../api/learning/lib/import/question-import-service.js';
import { analyzeQuestionEnvelope } from '../../../api/learning/lib/question-analysis/question-intelligence-service.js';
import { buildQuestionAnalysisResult } from '../../../api/learning/lib/question-analysis/analysis-result-contract.js';
import { normalizeQuestionEnvelope } from '../../../api/learning/lib/question-analysis/question-envelope-contract.js';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value, fallback = null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value))
    : fallback;
}

function buildSnapshotRow(questionId, classification) {
  return {
    question_id: questionId,
    primary_topic_id: classification.primary_topic_id ?? null,
    secondary_topic_ids: normalizeArray(classification.secondary_topic_ids),
    prerequisite_topic_ids: normalizeArray(classification.prerequisite_topic_ids),
    family_id: classification.family_id ?? null,
    primary_question_type_id: classification.primary_question_type_id ?? null,
    secondary_question_type_ids: normalizeArray(classification.secondary_question_type_ids),
    variant_tags: normalizeArray(classification.variant_tags),
    classification_source: classification.classification_source ?? 'question_analysis_backfill',
    classification_confidence: classification.classification_confidence ?? null,
    confidence_band: classification.confidence_band ?? null,
    low_confidence_posture: normalizeObject(classification.low_confidence_posture),
    candidate_rubric_refs: normalizeArray(classification.candidate_rubric_refs),
    canonical_step_skeleton_summary: normalizeObject(classification.canonical_step_skeleton_summary),
    difficulty_signal: normalizeObject(classification.difficulty_signal),
    analysis_audit_metadata: normalizeObject(classification.analysis_audit_metadata, {}),
    analysis_version: classification.analysis_version ?? 'phase_a.v2',
    evidence_source_event_ref: null,
    analysis_provenance_kind: classification.analysis_provenance_kind ?? 'real',
  };
}

function buildEnvelopeFromQuestion(question) {
  return normalizeQuestionEnvelope({
    source_kind: question?.source_kind ?? 'imported_question',
    subject_code: question?.subject_code ?? null,
    prompt_representation: question?.prompt_representation,
    paper_scope: question?.paper_scope ?? null,
    provenance_summary: question?.provenance_summary ?? {},
  });
}

async function findActiveSnapshotId(client, { questionId } = {}) {
  if (!questionId) {
    return null;
  }

  const { data, error } = await client
    .from('learning_question_analysis_snapshots')
    .select('classification_snapshot_id')
    .eq('question_id', questionId)
    .is('superseded_by_snapshot_id', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active question classification snapshot: ${error.message}`);
  }

  return data?.classification_snapshot_id ?? null;
}

async function supersedeActiveSnapshot(client, {
  activeSnapshotId,
  replacementSnapshotId,
} = {}) {
  if (!activeSnapshotId) {
    return;
  }

  const { error } = await client
    .from('learning_question_analysis_snapshots')
    .update({
      superseded_by_snapshot_id: replacementSnapshotId,
    })
    .eq('classification_snapshot_id', activeSnapshotId);

  if (error) {
    throw new Error(
      `Failed to supersede active question classification snapshot: ${error.message}`,
    );
  }
}

export async function backfillQuestionAnalysisRecord(client, {
  question,
  analysisHints = null,
  force = false,
} = {}) {
  const envelope = buildEnvelopeFromQuestion(question);
  const rawClassification = analyzeQuestionEnvelope({
    envelope,
    analysisHints,
  });
  const {
    classification,
    scoringScopePosture,
  } = await resolveReleasedScoringPosture(client, {
    subjectCode: question?.subject_code ?? null,
    classification: rawClassification,
    questionEnvelope: envelope,
  });
  const materializedClassification = buildQuestionAnalysisResult({
    envelope,
    classification,
  });
  const activeSnapshotId = force
    ? await findActiveSnapshotId(client, { questionId: question?.question_id ?? null })
    : null;
  const replacementSnapshotId = activeSnapshotId ? randomUUID() : null;

  if (force && activeSnapshotId) {
    await supersedeActiveSnapshot(client, {
      activeSnapshotId,
      replacementSnapshotId,
    });
  }

  const snapshotRow = buildSnapshotRow(question.question_id, materializedClassification);
  if (replacementSnapshotId) {
    snapshotRow.classification_snapshot_id = replacementSnapshotId;
  }

  const { data: insertedSnapshot, error: snapshotError } = await client
    .from('learning_question_analysis_snapshots')
    .insert(snapshotRow)
    .select('classification_snapshot_id')
    .single();

  if (snapshotError || !insertedSnapshot) {
    throw new Error(
      `Failed to insert backfill question classification snapshot: ${snapshotError?.message || 'no data returned'}`,
    );
  }

  const { eventRef } = await appendQuestionClassifiedEvent(client, {
    questionId: question.question_id,
    classificationSnapshotId: insertedSnapshot.classification_snapshot_id,
    question,
    classification: materializedClassification,
  });

  const { error: snapshotUpdateError } = await client
    .from('learning_question_analysis_snapshots')
    .update({ evidence_source_event_ref: eventRef })
    .eq('classification_snapshot_id', insertedSnapshot.classification_snapshot_id);

  if (snapshotUpdateError) {
    throw new Error(
      `Failed to link backfill snapshot to QuestionClassified event: ${snapshotUpdateError.message}`,
    );
  }

  const { error: questionUpdateError } = await client
    .from('question_bank')
    .update({
      primary_topic_id: materializedClassification.primary_topic_id ?? null,
      secondary_topic_ids: materializedClassification.secondary_topic_ids,
      family_id: materializedClassification.family_id ?? null,
      primary_question_type_id: materializedClassification.primary_question_type_id ?? null,
      secondary_question_type_ids: materializedClassification.secondary_question_type_ids,
      variant_tags: materializedClassification.variant_tags,
      release_scope_status: scoringScopePosture.release_scope_status,
      classification_snapshot_ref: buildClassificationSnapshotRef(
        insertedSnapshot.classification_snapshot_id,
      ),
    })
    .eq('question_id', question.question_id);

  if (questionUpdateError) {
    throw new Error(
      `Failed to update question_bank during question-analysis backfill: ${questionUpdateError.message}`,
    );
  }

  return {
    question_id: question.question_id,
    classification_snapshot_id: insertedSnapshot.classification_snapshot_id,
    scoring_scope_posture: scoringScopePosture,
    event_ref: eventRef,
  };
}

export async function runQuestionAnalysisBackfill(client, {
  questions = [],
  force = false,
} = {}) {
  const summary = {
    processed: 0,
    backfilled: 0,
    skipped: 0,
    items: [],
  };

  for (const question of questions) {
    summary.processed += 1;
    if (!force && question?.classification_snapshot_ref) {
      summary.skipped += 1;
      summary.items.push({
        question_id: question.question_id,
        status: 'skipped_existing_snapshot',
      });
      continue;
    }

    const result = await backfillQuestionAnalysisRecord(client, {
      question,
      force,
    });
    summary.backfilled += 1;
    summary.items.push({
      question_id: question.question_id,
      status: 'backfilled',
      classification_snapshot_id: result.classification_snapshot_id,
      question_event_id: result.event_ref.question_event_id,
    });
  }

  return summary;
}
