function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLowerString(value) {
  return normalizeString(value).toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasTrigToken(prompt) {
  return /(?:^|[^a-z])(sin|cos|tan|sec|cosec|cot)(?:[^a-z]|$)/u.test(prompt);
}

function buildRuleMatch({
  questionTypeId,
  baseConfidence,
  variantTags = [],
  skeletonSteps = [],
  difficultyBand = 'medium',
  signalKeys = [],
  familyId,
}) {
  return {
    questionTypeId,
    familyId,
    baseConfidence,
    variantTags,
    skeletonSteps,
    difficultyBand,
    signalKeys,
  };
}

const QUESTION_TYPE_RULES = Object.freeze([
  {
    questionTypeId: '9709.differential_equations.separable',
    familyId: '9709.differential_equations',
    matches(prompt) {
      const signals = [];
      if (/dy\s*\/\s*dx/u.test(prompt) || /differential equation/u.test(prompt)) {
        signals.push('differential_equation');
      }
      if (/given that\s+y\s*=|when\s+x\s*=/u.test(prompt)) {
        signals.push('initial_condition');
      }
      if (/separable/u.test(prompt)) {
        signals.push('explicit_separable');
      }

      if (signals.length === 0) {
        return null;
      }

      return buildRuleMatch({
        questionTypeId: '9709.differential_equations.separable',
        familyId: '9709.differential_equations',
        baseConfidence: signals.includes('differential_equation') ? 0.91 : 0.84,
        variantTags: unique([
          'paper:p3',
          'answer_form:exact',
          'structure:separable',
          signals.includes('initial_condition') ? 'condition:initial_value' : null,
        ]),
        skeletonSteps: unique([
          'separate the variables',
          'integrate both sides',
          signals.includes('initial_condition') ? 'apply the initial condition' : null,
          'state the exact solution',
        ]),
        difficultyBand: signals.includes('initial_condition') ? 'medium' : 'low',
        signalKeys: signals,
      });
    },
  },
  {
    questionTypeId: '9709.trigonometry.identities',
    familyId: '9709.trigonometry_manipulation_equations',
    matches(prompt) {
      const hasTrig = hasTrigToken(prompt);
      const isIdentity = /(prove|show that|hence show|identity)/u.test(prompt);
      if (!hasTrig || !isIdentity) {
        return null;
      }

      return buildRuleMatch({
        questionTypeId: '9709.trigonometry.identities',
        familyId: '9709.trigonometry_manipulation_equations',
        baseConfidence: 0.93,
        variantTags: ['paper:p1', 'answer_form:exact', 'structure:identity_rewrite'],
        skeletonSteps: [
          'rewrite the trigonometric expression into a common form',
          'apply a standard identity consistently',
          'simplify to the target identity',
        ],
        difficultyBand: 'medium',
        signalKeys: ['trigonometric_identity'],
      });
    },
  },
  {
    questionTypeId: '9709.trigonometry.equations',
    familyId: '9709.trigonometry_manipulation_equations',
    matches(prompt) {
      const hasTrig = hasTrigToken(prompt);
      const isEquation = /(solve|find all values of x|0\s*[<≤]=?\s*x|x\s*[<≤]=?\s*360)/u.test(prompt);
      if (!hasTrig || !isEquation) {
        return null;
      }

      return buildRuleMatch({
        questionTypeId: '9709.trigonometry.equations',
        familyId: '9709.trigonometry_manipulation_equations',
        baseConfidence: 0.9,
        variantTags: ['paper:p1', 'answer_form:interval', 'structure:solve_in_domain'],
        skeletonSteps: [
          'isolate the trigonometric term',
          'solve the base trigonometric equation',
          'enumerate solutions in the required domain',
        ],
        difficultyBand: 'medium',
        signalKeys: ['trigonometric_equation'],
      });
    },
  },
  {
    questionTypeId: '9709.integration.application',
    familyId: '9709.integration_techniques',
    matches(prompt) {
      const hasIntegral = /(integral|∫|dx\b)/u.test(prompt);
      if (!hasIntegral) {
        return null;
      }

      const applicationSignals = [];
      if (/(find the value of|evaluate|hence|area|volume|curve)/u.test(prompt)) {
        applicationSignals.push('application_language');
      }
      if (/\(.*\)\^/u.test(prompt) || /\bsubstitut/u.test(prompt)) {
        applicationSignals.push('structured_substitution');
      }

      return buildRuleMatch({
        questionTypeId: '9709.integration.application',
        familyId: '9709.integration_techniques',
        baseConfidence: applicationSignals.length >= 2 ? 0.84 : 0.77,
        variantTags: ['paper:p3', 'answer_form:exact'],
        skeletonSteps: [
          'identify the integration structure',
          'apply the matching substitution or application setup',
          'integrate and simplify the exact result',
        ],
        difficultyBand: applicationSignals.length >= 2 ? 'medium' : 'high',
        signalKeys: ['integral_expression', ...applicationSignals],
      });
    },
  },
]);

function normalizeAnalysisHints(hints = {}) {
  const normalizedHints = hints && typeof hints === 'object' && !Array.isArray(hints)
    ? hints
    : {};

  return {
    runtime_context_id: normalizeString(normalizedHints.runtime_context_id),
    question_type_hint_id: normalizeString(normalizedHints.question_type_hint_id),
    topic_path_hint: normalizeString(normalizedHints.topic_path_hint),
  };
}

function toConfidenceBand(classificationConfidence) {
  if (classificationConfidence === null || classificationConfidence === undefined) {
    return null;
  }

  if (classificationConfidence < 0.8) {
    return 'low';
  }

  if (classificationConfidence < 0.85) {
    return 'medium';
  }

  return 'high';
}

function buildClassificationFromMatch(match, {
  normalizedHints,
  envelope,
  hintMatched,
  hintConflict,
} = {}) {
  const classificationConfidence = hintMatched
    ? Math.min(0.95, Number((match.baseConfidence + 0.05).toFixed(2)))
    : match.baseConfidence;
  const confidenceBand = toConfidenceBand(classificationConfidence);

  return {
    primary_topic_id: null,
    secondary_topic_ids: [],
    prerequisite_topic_ids: [],
    family_id: match.familyId,
    primary_question_type_id: match.questionTypeId,
    secondary_question_type_ids: [],
    variant_tags: match.variantTags,
    classification_source: 'question_intelligence',
    classification_confidence: classificationConfidence,
    confidence_band: confidenceBand,
    canonical_step_skeleton_summary: {
      summary: match.skeletonSteps[0] ?? 'classify and solve via the canonical method',
      steps: match.skeletonSteps,
    },
    difficulty_signal: {
      band: match.difficultyBand,
      source: 'heuristic_question_intelligence',
      supporting_signals: match.signalKeys,
    },
    analysis_audit_metadata: {
      analysis_mode: 'question_intelligence',
      analysis_hints: normalizedHints,
      hint_matched: hintMatched,
      hint_conflict: hintConflict,
      detector_signals: match.signalKeys,
      source_kind: envelope?.source_kind ?? null,
    },
    analysis_version: 'phase_a.v2',
    evidence_source_event_ref: null,
    analysis_provenance_kind: null,
    uncertainty_validated: true,
    uncertainty_posture: {
      status: 'validated',
      source: 'question_intelligence',
      rationale: 'phase_a_deterministic_import_classifier',
    },
  };
}

function buildHintOnlyClassification(normalizedHints, envelope) {
  const questionTypeId = normalizedHints.question_type_hint_id || normalizedHints.runtime_context_id;
  if (!questionTypeId) {
    return {
      primary_topic_id: null,
      secondary_topic_ids: [],
      prerequisite_topic_ids: [],
      family_id: null,
      primary_question_type_id: null,
      secondary_question_type_ids: [],
      variant_tags: [],
      classification_source: 'question_intelligence',
      classification_confidence: null,
      confidence_band: null,
      canonical_step_skeleton_summary: null,
      difficulty_signal: {
        band: 'unknown',
        source: 'heuristic_question_intelligence',
        supporting_signals: [],
      },
      analysis_audit_metadata: {
        analysis_mode: 'question_intelligence',
        analysis_hints: normalizedHints,
        detector_signals: [],
        source_kind: envelope?.source_kind ?? null,
      },
      analysis_version: 'phase_a.v2',
      evidence_source_event_ref: null,
      analysis_provenance_kind: null,
      uncertainty_validated: false,
      uncertainty_posture: null,
    };
  }

  const fallbackFamilyByQuestionType = {
    '9709.trigonometry.identities': '9709.trigonometry_manipulation_equations',
    '9709.trigonometry.equations': '9709.trigonometry_manipulation_equations',
    '9709.integration.application': '9709.integration_techniques',
    '9709.differential_equations.separable': '9709.differential_equations',
  };

  return {
    primary_topic_id: null,
    secondary_topic_ids: [],
    prerequisite_topic_ids: [],
    family_id: fallbackFamilyByQuestionType[questionTypeId] ?? null,
    primary_question_type_id: questionTypeId,
    secondary_question_type_ids: [],
    variant_tags: [],
    classification_source: 'question_intelligence',
    classification_confidence: 0.76,
    confidence_band: 'low',
    canonical_step_skeleton_summary: null,
    difficulty_signal: {
      band: 'unknown',
      source: 'heuristic_question_intelligence',
      supporting_signals: ['hint_only_low_confidence'],
    },
    analysis_audit_metadata: {
      analysis_mode: 'question_intelligence',
      analysis_hints: normalizedHints,
      detector_signals: ['hint_only_low_confidence'],
      source_kind: envelope?.source_kind ?? null,
    },
    analysis_version: 'phase_a.v2',
    evidence_source_event_ref: null,
    analysis_provenance_kind: null,
    uncertainty_validated: true,
    uncertainty_posture: {
      status: 'validated',
      source: 'question_intelligence',
      rationale: 'low_confidence_hint_only_classification',
    },
  };
}

export function analyzeQuestionEnvelope({
  envelope,
  analysisHints = null,
} = {}) {
  const promptValue = normalizeLowerString(envelope?.prompt_representation?.value);
  const normalizedHints = normalizeAnalysisHints(analysisHints);
  const matches = QUESTION_TYPE_RULES
    .map((rule) => rule.matches(promptValue))
    .filter(Boolean)
    .sort((left, right) => right.baseConfidence - left.baseConfidence);

  if (matches.length === 0) {
    return buildHintOnlyClassification(normalizedHints, envelope);
  }

  const selectedMatch = matches[0];
  const hintedQuestionTypeId = normalizedHints.question_type_hint_id || normalizedHints.runtime_context_id;
  const hintMatched = Boolean(hintedQuestionTypeId) && hintedQuestionTypeId === selectedMatch.questionTypeId;
  const hintConflict = Boolean(hintedQuestionTypeId) && hintedQuestionTypeId !== selectedMatch.questionTypeId;

  return buildClassificationFromMatch(selectedMatch, {
    normalizedHints,
    envelope,
    hintMatched,
    hintConflict,
  });
}
