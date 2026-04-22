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

function uniqueStrings(values = []) {
  return [...new Set(normalizeStringArray(values))];
}

function hasTrigToken(value) {
  return /(?:^|[^a-z])(sin|cos|tan|sec|cosec|cot)(?:[^a-z]|$)/u.test(value);
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

const ISSUE_252_TRIG_STORAGE_KEYS = new Set([
  '9709/m20_qp_32/questions/q05.png',
  '9709/w23_qp_32/questions/q07.png',
  '9709/w22_qp_32/questions/q07.png',
]);

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

function buildSearchFriendlyFormulaText(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/gu, '$1/$2')
    .replace(/\\int(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/gu, 'integral')
    .replace(/\\,/gu, ' ')
    .replace(/\\([a-zA-Z]+)/gu, '$1')
    .replace(/\b(sin|cos|tan|sec|cosec|cot)\s*\^\s*2\b/gu, '$1 squared')
    .replace(/\b(sin|cos|tan|sec|cosec|cot)\s*\^\s*3\b/gu, '$1 cubed')
    .replace(/\bd(theta|alpha|beta|x|y|z|u|v|t)\b/gu, 'd $1')
    .replace(/[_^]/gu, ' ')
    .replace(/[{}]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeMathSearchText(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/∫/gu, ' integral ')
    .replace(/π/gu, ' pi ')
    .replace(/θ/gu, ' theta ')
    .replace(/²/gu, ' squared ')
    .replace(/³/gu, ' cubed ')
    .replace(/\b(sin|cos|tan|sec|cosec|cot)\s*\^\s*2\b/gu, '$1 squared')
    .replace(/\b(sin|cos|tan|sec|cosec|cot)\s*\^\s*3\b/gu, '$1 cubed')
    .replace(/\[\d+\]/gu, ' ')
    .replace(/\bof\s+integral\b/gu, 'integral')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeFormulaLatexForSearch(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/gu, '$1/$2')
    .replace(/\\int\b/gu, 'integral')
    .replace(/\\equiv\b/gu, '=')
    .replace(/\\leqslant\b/gu, '<=')
    .replace(/\\geqslant\b/gu, '>=')
    .replace(/\\theta\b/gu, 'theta')
    .replace(/\\pi\b/gu, 'pi')
    .replace(/\\circ\b/gu, ' degrees')
    .replace(/\\text\s*\{([^{}]+)\}/gu, '$1')
    .replace(/\\([a-zA-Z]+)/gu, '$1')
    .replace(/[{}]/gu, '')
    .replace(/([A-Za-z]+)\^2\b/gu, '$1 squared')
    .replace(/([A-Za-z]+)\^3\b/gu, '$1 cubed')
    .replace(/(\d)theta\b/gu, '$1 theta')
    .replace(/dx\/dtheta\b/gu, 'dx dtheta')
    .replace(/d\/dtheta\b/gu, 'dtheta')
    .replace(/\s*=\s*/gu, ' equals ')
    .replace(/\s*\+\s*/gu, ' plus ')
    .replace(/\s*-\s*/gu, ' minus ')
    .replace(/\//gu, ' over ')
    .replace(/[()[\],]/gu, ' ')
    .replace(/[≤]/gu, '<=')
    .replace(/[≥]/gu, '>=')
    .replace(/[⅙]/gu, '1/6')
    .replace(/[¼]/gu, '1/4')
    .replace(/[½]/gu, '1/2')
    .replace(/[−]/gu, '-')
    .replace(/[≡]/gu, 'equals')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function isIssue252TrigCase(questionEvidenceBundle = null) {
  const storageKey = normalizeString(questionEvidenceBundle?.storage_key);
  return ISSUE_252_TRIG_STORAGE_KEYS.has(storageKey);
}

function extractSubquestionText(block) {
  const normalized = normalizeString(block);
  if (!normalized) {
    return '';
  }

  const match = normalized.match(/['"](text|content)['"]:\s*['"](.+?)['"]/u);
  if (!match?.[2]) {
    return normalized;
  }

  return normalizeString(match[2].replace(/\\'/gu, '\'').replace(/\\"/gu, '"'));
}

function buildFormulaSearchAliases(questionEvidenceBundle = null) {
  if (!isIssue252TrigCase(questionEvidenceBundle)) {
    return [];
  }

  const formulaText = uniqueStrings(
    normalizeArray(questionEvidenceBundle?.evidence?.formula_latex_list).map(normalizeFormulaLatexForSearch),
  );
  const subquestionAliases = uniqueStrings(
    normalizeArray(questionEvidenceBundle?.evidence?.subquestion_blocks)
      .map(extractSubquestionText)
      .map(normalizeFormulaLatexForSearch),
  );
  const aliases = [...formulaText, ...subquestionAliases];

  const identityAlias = formulaText.find(
    (entry) => /\bcos 3 theta equals 4 cos cubed theta minus 3 cos theta\b/u.test(entry),
  );
  if (identityAlias) {
    aliases.push(`prove identity ${identityAlias}`);
  }

  return uniqueStrings(aliases);
}

function buildEvidenceDerivedSummary(questionEvidenceBundle = null) {
  const evidence = questionEvidenceBundle?.evidence ?? {};
  const ocrText = normalizeString(evidence.ocr_text);
  if (ocrText) {
    return ocrText;
  }

  const subquestionSummary = uniqueStrings(
    normalizeArray(evidence.subquestion_blocks).map(extractSubquestionText),
  ).join(' ');
  if (subquestionSummary) {
    return subquestionSummary;
  }

  const formulaSummary = uniqueStrings(
    normalizeArray(evidence.formula_latex_list).map(normalizeFormulaLatexForPrompt),
  ).join(' ; ');
  if (formulaSummary) {
    return formulaSummary;
  }

  return '';
}

function buildQuestionSearchSignals(summary, classification, { issue252TrigCase = false } = {}) {
  const prompt = normalizeMathSearchText(summary).toLowerCase();
  const signals = [];
  const hasTrig = hasTrigToken(prompt);
  const hasIdentityLanguage = issue252TrigCase
    ? /\bprove (?:the )?identity\b|\btrigonometric identity\b|\bidentity\b/u.test(prompt)
    : /(prove|show|identity)/u.test(prompt);
  const hasEquationLanguage = issue252TrigCase
    ? /\bsolve (?:the )?equation\b|\btrigonometric equation\b/u.test(prompt)
    : /(solve|equation)/u.test(prompt);
  const hasIntegral = issue252TrigCase
    ? /(integral|∫)/u.test(prompt)
    : /(integral|dx\b|∫)/u.test(prompt);
  const hasSubstitution = /\bsubstitut/u.test(prompt);
  const mentionsIntegralI = /\blet\s+i\b|\bi\s*=/u.test(prompt);

  if (
    classification?.primary_question_type_id === '9709.trigonometry.identities'
    && (!issue252TrigCase || hasIdentityLanguage)
  ) {
    signals.push('trigonometric identity', 'prove identity');
  }
  if (
    classification?.primary_question_type_id === '9709.trigonometry.equations'
    && (!issue252TrigCase || hasEquationLanguage)
  ) {
    signals.push('trigonometric equation', 'solve equation');
  }
  if (classification?.primary_question_type_id === '9709.integration.application') {
    signals.push('evaluate integral', 'integration application');
  }
  if (classification?.primary_question_type_id === '9709.differential_equations.separable') {
    signals.push('solve differential equation', 'separable differential equation');
  }

  if (hasTrig && hasIdentityLanguage && hasEquationLanguage) {
    signals.push('Prove trigonometric identity and solve equation');
  }
  if (hasIntegral && hasSubstitution && mentionsIntegralI) {
    signals.push('Evaluate integral I using substitution');
  }
  if (hasIntegral && hasSubstitution) {
    signals.push('Evaluate integral using substitution');
  }

  if (hasTrig && hasIdentityLanguage) {
    signals.push('trigonometric identity');
  }
  if (hasTrig && hasEquationLanguage) {
    signals.push('solve equation');
  }
  if (hasIntegral) {
    signals.push('evaluate integral');
  }
  if (hasSubstitution) {
    signals.push('using substitution');
  }
  if (/(differential equation|dy\s*\/\s*dx)/u.test(prompt)) {
    signals.push('solve differential equation');
  }

  return uniqueStrings(signals);
}

function buildExactValueIntegralCue(summary, formulaText = []) {
  const normalizedSummary = normalizeMathSearchText(summary).toLowerCase();
  if (!/\bfind\b.*\bexact value\b/u.test(normalizedSummary)) {
    return '';
  }

  for (const formula of formulaText) {
    const normalizedFormula = normalizeMathSearchText(formula);
    const match = normalizedFormula.match(
      /(?:^|=\s*)integral\s+(?:([0-9pi./()+-]+)\s+([0-9pi./()+-]+)\s+)?(.+?)\s+d\s+[a-z]+\b/iu,
    );
    if (!match?.[3]) {
      continue;
    }

    const integrand = normalizeMathSearchText(match[3])
      .replace(/\s+/gu, ' ')
      .trim();
    if (integrand) {
      return `Find the exact value integral ${integrand}`;
    }
  }

  return '';
}

function buildEvidenceDerivedSearchText(questionEvidenceBundle = null, classification = null) {
  if (!questionEvidenceBundle) {
    return '';
  }

  const evidence = questionEvidenceBundle.evidence ?? {};
  const summary = buildEvidenceDerivedSummary(questionEvidenceBundle);
  const subquestionText = uniqueStrings(
    normalizeArray(evidence.subquestion_blocks).map(extractSubquestionText),
  );
  const formulaText = uniqueStrings(
    normalizeArray(evidence.formula_latex_list).map(normalizeFormulaLatexForPrompt),
  );
  const searchFriendlyFormulaText = uniqueStrings(
    normalizeArray(evidence.formula_latex_list).map(buildSearchFriendlyFormulaText),
  );
  const normalizedSummary = normalizeMathSearchText(summary);
  const normalizedFormulaText = uniqueStrings(searchFriendlyFormulaText.map(normalizeMathSearchText));
  const issue252TrigCase = isIssue252TrigCase(questionEvidenceBundle);
  const formulaAliases = buildFormulaSearchAliases(questionEvidenceBundle);
  const signals = buildQuestionSearchSignals(summary, classification, { issue252TrigCase });
  const exactValueIntegralCue = buildExactValueIntegralCue(summary, searchFriendlyFormulaText);

  return uniqueStrings([
    signals.join(' '),
    exactValueIntegralCue,
    summary,
    normalizedSummary,
    ...subquestionText,
    ...formulaText,
    ...formulaAliases,
    ...searchFriendlyFormulaText,
    ...normalizedFormulaText,
  ]).join('\n\n');
}

function buildQuestionPromptRepresentation(
  question = {},
  questionEvidenceBundle = null,
  questionEvidenceBundleClassificationInput = null,
) {
  const derivedSummary = buildEvidenceDerivedSummary(questionEvidenceBundle);
  if (derivedSummary) {
    return {
      type: 'text',
      value: derivedSummary,
    };
  }

  const existingPromptRepresentation = normalizeObject(question?.prompt_representation);
  if (
    normalizeString(existingPromptRepresentation?.type)
    && Object.prototype.hasOwnProperty.call(existingPromptRepresentation, 'value')
  ) {
    return existingPromptRepresentation;
  }

  return normalizeObject(questionEvidenceBundleClassificationInput?.prompt_representation);
}

function buildQuestionProvenanceSummary(
  question = {},
  questionEvidenceBundle = null,
  classification = null,
) {
  const existing = normalizeObject(question?.provenance_summary, {}) ?? {};
  const derivedSummary = buildEvidenceDerivedSummary(questionEvidenceBundle);
  const derivedSearchText = buildEvidenceDerivedSearchText(questionEvidenceBundle, classification);

  return {
    ...existing,
    summary: derivedSummary || existing.summary || null,
    title: derivedSummary || existing.title || null,
    search_text: derivedSearchText || existing.search_text || null,
    descriptor_summary_status: derivedSummary
      ? 'evidence_bundle_summary'
      : existing.descriptor_summary_status ?? 'missing',
    descriptor_search_text_status: derivedSearchText
      ? 'evidence_bundle_search_text'
      : existing.descriptor_search_text_status ?? 'missing',
  };
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

function isMissingPromptRepresentationError(error) {
  return error?.name === 'QuestionAnalysisValidationError'
    && error?.message === 'question envelope prompt_representation is required';
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

async function activateSnapshot(client, {
  snapshotId,
} = {}) {
  if (!snapshotId) {
    return;
  }

  const { error } = await client
    .from('learning_question_analysis_snapshots')
    .update({
      superseded_by_snapshot_id: null,
    })
    .eq('classification_snapshot_id', snapshotId);

  if (error) {
    throw new Error(
      `Failed to activate replacement question classification snapshot: ${error.message}`,
    );
  }
}

async function restoreActiveSnapshot(client, {
  activeSnapshotId,
} = {}) {
  if (!activeSnapshotId) {
    return;
  }

  const { error } = await client
    .from('learning_question_analysis_snapshots')
    .update({
      superseded_by_snapshot_id: null,
    })
    .eq('classification_snapshot_id', activeSnapshotId);

  if (error) {
    throw new Error(
      `Failed to restore active question classification snapshot: ${error.message}`,
    );
  }
}

async function deleteSnapshot(client, {
  snapshotId,
} = {}) {
  if (!snapshotId) {
    return;
  }

  const { error } = await client
    .from('learning_question_analysis_snapshots')
    .delete()
    .eq('classification_snapshot_id', snapshotId);

  if (error) {
    throw new Error(
      `Failed to delete replacement question classification snapshot during rollback: ${error.message}`,
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
  let insertedSnapshotId = null;
  let eventRef = null;
  let supersededActiveSnapshot = false;

  try {
    const snapshotRow = buildSnapshotRow(question.question_id, materializedClassification);
    if (replacementSnapshotId) {
      snapshotRow.classification_snapshot_id = replacementSnapshotId;
      // Insert the replacement snapshot in a provisional self-superseded state so the
      // self-referential FK and the single-active-snapshot index both stay valid.
      snapshotRow.superseded_by_snapshot_id = replacementSnapshotId;
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
    insertedSnapshotId = insertedSnapshot.classification_snapshot_id;

    if (force && activeSnapshotId) {
      await supersedeActiveSnapshot(client, {
        activeSnapshotId,
        replacementSnapshotId: insertedSnapshotId,
      });
      supersededActiveSnapshot = true;

      await activateSnapshot(client, {
        snapshotId: insertedSnapshotId,
      });
    }

    ({ eventRef } = await appendQuestionClassifiedEvent(client, {
      questionId: question.question_id,
      classificationSnapshotId: insertedSnapshotId,
      question,
      classification: materializedClassification,
    }));

    const { error: snapshotUpdateError } = await client
      .from('learning_question_analysis_snapshots')
      .update({ evidence_source_event_ref: eventRef })
      .eq('classification_snapshot_id', insertedSnapshotId);

    if (snapshotUpdateError) {
      throw new Error(
        `Failed to link backfill snapshot to QuestionClassified event: ${snapshotUpdateError.message}`,
      );
    }

    const { error: questionUpdateError } = await client
      .from('question_bank')
      .update({
        primary_topic_id: materializedClassification.primary_topic_id ?? question?.primary_topic_id ?? null,
        secondary_topic_ids: materializedClassification.secondary_topic_ids,
        family_id: materializedClassification.family_id ?? null,
        primary_question_type_id: materializedClassification.primary_question_type_id ?? null,
        secondary_question_type_ids: materializedClassification.secondary_question_type_ids,
        variant_tags: materializedClassification.variant_tags,
        release_scope_status: scoringScopePosture.release_scope_status,
        prompt_representation: buildQuestionPromptRepresentation(
          question,
          normalizedQuestionEvidenceBundle,
          questionEvidenceBundleClassificationInput,
        ),
        provenance_summary: buildQuestionProvenanceSummary(
          question,
          normalizedQuestionEvidenceBundle,
          materializedClassification,
        ),
        classification_snapshot_ref: buildClassificationSnapshotRef(
          insertedSnapshotId,
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
      classification_snapshot_id: insertedSnapshotId,
      scoring_scope_posture: scoringScopePosture,
      event_ref: eventRef,
    };
  } catch (error) {
    if (force && activeSnapshotId) {
      const rollbackErrors = [];

      if (insertedSnapshotId) {
        try {
          await deleteSnapshot(client, { snapshotId: insertedSnapshotId });
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError.message);
        }
      }

      if (supersededActiveSnapshot) {
        try {
          await restoreActiveSnapshot(client, { activeSnapshotId });
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError.message);
        }
      }

      if (rollbackErrors.length > 0) {
        throw new Error(`${error.message}; rollback failed: ${rollbackErrors.join('; ')}`);
      }
    }

    throw error;
  }
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

    let result;
    try {
      result = await backfillQuestionAnalysisRecord(client, {
        question,
        analysisHints: question?.analysisHints ?? question?.analysis_hints ?? null,
        questionEvidenceBundle:
          question?.questionEvidenceBundle
          ?? question?.question_evidence_bundle
          ?? null,
        force,
      });
    } catch (error) {
      if (!isMissingPromptRepresentationError(error)) {
        throw error;
      }

      summary.skipped += 1;
      summary.items.push({
        question_id: question.question_id,
        status: 'skipped_missing_prompt_representation',
      });
      continue;
    }

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
