import { randomUUID } from 'node:crypto';
import { buildClassificationSnapshotRef } from '../../../api/learning/lib/contracts/runtime-contract.js';
import { appendQuestionClassifiedEvent } from '../../../api/learning/lib/events/question-event-service.js';
import { resolveReleasedScoringPosture } from '../../../api/learning/lib/import/question-import-service.js';
import { analyzeQuestionEnvelope } from '../../../api/learning/lib/question-analysis/question-intelligence-service.js';
import { normalizeQuestionEnvelope } from '../../../api/learning/lib/question-analysis/question-envelope-contract.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => normalizeString(entry)).filter(Boolean);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value, fallback = null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value))
    : fallback;
}

function normalizeAnalysisHints(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const normalized = {
    runtime_context_id: normalizeString(value.runtime_context_id),
    question_type_hint_id: normalizeString(value.question_type_hint_id),
    topic_path_hint: normalizeString(value.topic_path_hint),
  };

  return normalized.runtime_context_id
    || normalized.question_type_hint_id
    || normalized.topic_path_hint
    ? normalized
    : null;
}

function normalizeQuestionEvidenceBundle(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value))
    : null;
}

function normalizeFormulaLatexForPrompt(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/gu, '$1/$2')
    .replace(/\\int\b/gu, 'integral')
    .replace(/\\([a-zA-Z]+)/gu, '$1')
    .replace(/[{}]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function buildQuestionEvidenceBundleClassificationInput(questionEvidenceBundle = null) {
  const evidence = questionEvidenceBundle?.evidence ?? {};
  const sections = [];
  const classificationInputSections = [];

  const ocrText = normalizeString(evidence.ocr_text);
  if (ocrText) {
    sections.push(ocrText);
    classificationInputSections.push('ocr_text');
  }

  const normalizedFormulaLatex = normalizeStringArray(
    normalizeArray(evidence.formula_latex_list).map(normalizeFormulaLatexForPrompt),
  );
  if (normalizedFormulaLatex.length > 0) {
    sections.push(`Formula LaTeX:\n${normalizedFormulaLatex.join('\n')}`);
    classificationInputSections.push('formula_latex_list');
  }

  const subquestionBlocks = normalizeStringArray(evidence.subquestion_blocks);
  if (subquestionBlocks.length > 0) {
    sections.push(`Subquestion Blocks:\n${subquestionBlocks.join('\n')}`);
    classificationInputSections.push('subquestion_blocks');
  }

  const layoutHints = normalizeStringArray(evidence.layout_hints);
  if (layoutHints.length > 0) {
    sections.push(`Layout Hints:\n${layoutHints.join('\n')}`);
    classificationInputSections.push('layout_hints');
  }

  if (typeof evidence.diagram_present === 'boolean') {
    sections.push(`Diagram Present: ${evidence.diagram_present}`);
    classificationInputSections.push('diagram_present');
  }

  const diagramElements = normalizeStringArray(evidence.diagram_elements);
  if (diagramElements.length > 0) {
    sections.push(`Diagram Elements:\n${diagramElements.join('\n')}`);
    classificationInputSections.push('diagram_elements');
  }

  const spatialEvidence = normalizeStringArray(evidence.spatial_evidence);
  if (spatialEvidence.length > 0) {
    sections.push(`Spatial Evidence:\n${spatialEvidence.join('\n')}`);
    classificationInputSections.push('spatial_evidence');
  }

  return {
    mode: sections.length > 0 ? 'structured_bundle_prompt' : 'raw_question_prompt_fallback',
    classification_input_sections: classificationInputSections,
    prompt_representation: sections.length > 0
      ? {
        type: 'text',
        value: sections.join('\n\n'),
      }
      : null,
  };
}

function resolveQuestionAnalysisHints({
  analysisHints = null,
  question = {},
  questionEvidenceBundle = null,
} = {}) {
  const bundleHints = normalizeAnalysisHints(
    questionEvidenceBundle?.analysis_hints ?? questionEvidenceBundle?.analysisHints,
  );
  const questionHints = normalizeAnalysisHints(question?.analysisHints ?? question?.analysis_hints);
  const explicitHints = normalizeAnalysisHints(analysisHints);

  return normalizeAnalysisHints({
    ...bundleHints,
    ...questionHints,
    ...explicitHints,
  });
}

function buildQuestionEvidenceBundleAuditMetadata(
  questionEvidenceBundle,
  questionEvidenceBundleClassificationInput = null,
) {
  if (!questionEvidenceBundle) {
    return {};
  }

  const evidence = questionEvidenceBundle.evidence ?? {};

  return {
    ao_input_source: 'question_evidence_bundle_v1',
    question_evidence_bundle_v1: {
      schema_version: questionEvidenceBundle.schema_version ?? 'question_evidence_bundle_v1',
      question_id: questionEvidenceBundle.question_id ?? null,
      storage_key:
        questionEvidenceBundle.storage_key
        ?? questionEvidenceBundle.route?.input_asset_id
        ?? null,
      analysis_hints: normalizeAnalysisHints(
        questionEvidenceBundle.analysis_hints ?? questionEvidenceBundle.analysisHints,
      ),
      route: normalizeObject(questionEvidenceBundle.route, {}),
      model_provenance: normalizeArray(questionEvidenceBundle.model_provenance),
      lazy_attach_original_image: Boolean(questionEvidenceBundle.lazy_attach_original_image),
      lazy_attach_reasons: normalizeArray(questionEvidenceBundle.lazy_attach_reasons),
      original_image_asset: normalizeObject(questionEvidenceBundle.original_image_asset),
      review_posture: normalizeObject(questionEvidenceBundle.review_posture),
      classification_input_mode:
        questionEvidenceBundleClassificationInput?.mode ?? 'raw_question_prompt_fallback',
      classification_input_sections: normalizeStringArray(
        questionEvidenceBundleClassificationInput?.classification_input_sections,
      ),
      evidence_presence: {
        ocr_text: Boolean(normalizeString(evidence.ocr_text)),
        formula_latex_count: normalizeArray(evidence.formula_latex_list).length,
        subquestion_block_count: normalizeArray(evidence.subquestion_blocks).length,
        layout_hint_count: normalizeArray(evidence.layout_hints).length,
        diagram_present:
          typeof evidence.diagram_present === 'boolean' ? evidence.diagram_present : null,
        diagram_element_count: normalizeArray(evidence.diagram_elements).length,
        spatial_evidence_count: normalizeArray(evidence.spatial_evidence).length,
      },
    },
  };
}

function applyQuestionEvidenceBundle(
  rawClassification,
  questionEvidenceBundle,
  questionEvidenceBundleClassificationInput = null,
) {
  if (!questionEvidenceBundle) {
    return rawClassification;
  }

  return {
    ...rawClassification,
    analysis_audit_metadata: {
      ...(rawClassification.analysis_audit_metadata ?? {}),
      ...buildQuestionEvidenceBundleAuditMetadata(
        questionEvidenceBundle,
        questionEvidenceBundleClassificationInput,
      ),
    },
  };
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

function buildEnvelopeFromQuestion(question, questionEvidenceBundleClassificationInput = null) {
  const promptRepresentation = questionEvidenceBundleClassificationInput?.prompt_representation
    ?? question?.prompt_representation;

  return normalizeQuestionEnvelope({
    source_kind: question?.source_kind ?? 'imported_question',
    subject_code: question?.subject_code ?? null,
    prompt_representation: promptRepresentation,
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
  questionEvidenceBundle = null,
  force = false,
} = {}) {
  const normalizedQuestionEvidenceBundle = normalizeQuestionEvidenceBundle(
    questionEvidenceBundle
      ?? question?.questionEvidenceBundle
      ?? question?.question_evidence_bundle,
  );
  const questionEvidenceBundleClassificationInput =
    buildQuestionEvidenceBundleClassificationInput(normalizedQuestionEvidenceBundle);
  const envelope = buildEnvelopeFromQuestion(question, questionEvidenceBundleClassificationInput);
  const resolvedAnalysisHints = resolveQuestionAnalysisHints({
    analysisHints,
    question,
    questionEvidenceBundle: normalizedQuestionEvidenceBundle,
  });
  const rawClassification = applyQuestionEvidenceBundle(analyzeQuestionEnvelope({
    envelope,
    analysisHints: resolvedAnalysisHints,
  }), normalizedQuestionEvidenceBundle, questionEvidenceBundleClassificationInput);
  const {
    classification,
    scoringScopePosture,
  } = await resolveReleasedScoringPosture(client, {
    subjectCode: question?.subject_code ?? null,
    classification: rawClassification,
    questionEnvelope: envelope,
  });
  const materializedClassification = classification;
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
      analysisHints: question?.analysisHints ?? question?.analysis_hints ?? null,
      questionEvidenceBundle:
        question?.questionEvidenceBundle
        ?? question?.question_evidence_bundle
        ?? null,
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
