import { buildUncertainReason } from '../../../marking/lib/marking-semantics-v1.js';
import { APPROVED_9709_PILOT_ADAPTER_METHODS } from '../subjects/subject-adapter-registry.js';

export const PILOT_9709_ADAPTER_METHODS = Object.freeze([
  ...APPROVED_9709_PILOT_ADAPTER_METHODS,
]);

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function hasAny(text, patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasEquationSignal(text) {
  return text.includes('=') || text.includes('=>') || text.includes('->')
    || hasAny(text, [/\bhence\b/, /\btherefore\b/, /\bprove[sd]?\b/]);
}

function hasTrigSignal(text) {
  return hasAny(text, [/\bsin\b/, /\bcos\b/, /\btan\b/, /\bcosec\b/, /\bsec\b/, /\bcot\b/]);
}

function hasIntegralSignal(text) {
  return hasAny(text, [/\bintegral\b/, /∫/, /\bln\b/, /\+ c\b/, /\banti-?derivative\b/]);
}

function hasSubstitutionSignal(text) {
  return hasAny(text, [/\blet\s+[a-z]\s*=/, /\bu\s*=/, /\bsubstitut/, /\bchange of variable/]);
}

function hasSeparationSignal(text) {
  return hasAny(text, [
    /\bdy\s*\/\s*dx\b/,
    /\bdy\b.*\bdx\b/,
    /\bseparat/,
  ]);
}

function hasInitialConditionSignal(text) {
  return hasAny(text, [/\binitial\b/, /\bx\s*=/, /\by\s*=/, /\bc\s*=/]);
}

function hasDomainSignal(text) {
  return hasAny(text, [/\bdomain\b/, /\bdegree/, /<=/, /π/, /\bpi\b/, /\bnπ\b/]);
}

function hasNumericSignal(text) {
  return /[0-9]/.test(text);
}

function scoreMethodMatch(adapterMethod, params = {}, text) {
  switch (adapterMethod) {
    case 'proof_structure_check':
      return hasTrigSignal(text) && hasEquationSignal(text) ? 0.94 : 0;
    case 'symbolic_check':
      if (params?.expects_target_identity === true) {
        return hasTrigSignal(text) && hasEquationSignal(text) ? 0.93 : 0;
      }
      if (params?.checks === 'base_trigonometric_equation') {
        return hasTrigSignal(text) && hasEquationSignal(text) ? 0.92 : 0;
      }
      if (params?.expects_exact_integral === true) {
        return hasIntegralSignal(text) && hasEquationSignal(text) ? 0.9 : 0;
      }
      return hasEquationSignal(text) ? 0.82 : 0;
    case 'numeric_check':
      if (params?.requires_domain_filter === true) {
        return hasNumericSignal(text) && hasDomainSignal(text) ? 0.91 : 0;
      }
      if (params?.requires_initial_condition === true) {
        return hasInitialConditionSignal(text) ? 0.92 : 0;
      }
      return hasNumericSignal(text) ? 0.8 : 0;
    case 'transform_bundle_check':
      if (params?.requires_substitution === true) {
        return hasSubstitutionSignal(text) ? 0.91 : 0;
      }
      if (params?.requires_separation === true) {
        return hasSeparationSignal(text) ? 0.9 : 0;
      }
      return hasAny(text, [/\btransform\b/, /\brewrite\b/, /\bsubstitut/, /\bseparat/]) ? 0.8 : 0;
    default:
      return 0;
  }
}

function findBestMatchingStep(studentSteps = [], adapterMethod, params = {}) {
  let bestStep = null;
  let bestConfidence = 0;

  for (const step of normalizeArray(studentSteps)) {
    const stepText = normalizeText(step?.text);
    const confidence = scoreMethodMatch(adapterMethod, params, stepText);

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestStep = step;
    }
  }

  return {
    step: bestStep,
    confidence: Number(bestConfidence.toFixed(4)),
  };
}

function flattenTemplatePoints(parts = [], parentPartId = null) {
  const points = [];

  for (const part of normalizeArray(parts)) {
    const partId = normalizeString(part?.part_id) || parentPartId || null;

    for (const point of normalizeArray(part?.points)) {
      const verification = point?.verification_condition ?? {};
      const dependencyChain = point?.dependency_chain ?? {};

      points.push({
        rubric_id: normalizeString(point?.point_id),
        mark_label: normalizeString(point?.official_mark_notation) || null,
        kind: normalizeString(point?.mark_family) || null,
        marks: Number(point?.max_score ?? 0),
        description: normalizeString(point?.point_id).replace(/[-_]+/g, ' ') || null,
        depends_on: normalizeArray(dependencyChain?.prerequisite_point_ids),
        ft_mode: point?.follow_through?.enabled === true
          ? (dependencyChain?.strict === true ? 'strict_ft' : 'ft')
          : 'none',
        part_id: partId,
        subpart_id: null,
        adapter_method: normalizeString(verification?.adapter_method),
        adapter_params: verification?.params && typeof verification.params === 'object'
          ? JSON.parse(JSON.stringify(verification.params))
          : {},
      });
    }

    if (Array.isArray(part?.subparts)) {
      points.push(...flattenTemplatePoints(part.subparts, partId));
    }
  }

  return points;
}

function buildDecision({
  rubricPoint,
  includeUncertainReason = false,
  awarded = false,
  reason = 'pilot_adapter_mismatch',
  confidence = 0,
  step = null,
} = {}) {
  const stepText = normalizeString(step?.text);
  const decision = {
    rubric_id: rubricPoint.rubric_id,
    mark_label: rubricPoint.mark_label,
    reason,
    awarded,
    awarded_marks: awarded ? Number(rubricPoint.marks ?? 0) : 0,
    alignment_confidence: confidence,
    evidence_spans: step
      ? [
        {
          step_id: normalizeString(step?.step_id) || null,
          start: 0,
          end: stepText.length,
        },
      ]
      : [],
    part_id: rubricPoint.part_id,
    subpart_id: rubricPoint.subpart_id,
  };

  if (includeUncertainReason) {
    decision.uncertain_reason = buildUncertainReason(reason, { awarded });
  }

  return decision;
}

function buildPilotCompatAlignments(
  studentSteps = [],
  decisions = [],
  { includeUncertainReason = false } = {},
) {
  const normalizedDecisions = normalizeArray(decisions);
  const consumedDecisionIndexes = new Set();
  const stepDecisionIndexes = normalizeArray(studentSteps).map((step, index) => {
    const stepId = normalizeString(step?.step_id) || `s${index + 1}`;
    const directDecisionIndex = normalizedDecisions.findIndex((decision, decisionIndex) =>
      !consumedDecisionIndexes.has(decisionIndex)
      && normalizeArray(decision?.evidence_spans).some((span) => normalizeString(span?.step_id) === stepId));

    if (directDecisionIndex >= 0) {
      consumedDecisionIndexes.add(directDecisionIndex);
      return directDecisionIndex;
    }

    return null;
  });

  let nextFallbackDecisionIndex = 0;

  return normalizeArray(studentSteps).map((step, index) => {
    const stepId = normalizeString(step?.step_id) || `s${index + 1}`;
    let matchingDecisionIndex = stepDecisionIndexes[index];

    if (matchingDecisionIndex == null) {
      while (
        nextFallbackDecisionIndex < normalizedDecisions.length
        && consumedDecisionIndexes.has(nextFallbackDecisionIndex)
      ) {
        nextFallbackDecisionIndex += 1;
      }

      if (nextFallbackDecisionIndex < normalizedDecisions.length) {
        matchingDecisionIndex = nextFallbackDecisionIndex;
        consumedDecisionIndexes.add(matchingDecisionIndex);
        nextFallbackDecisionIndex += 1;
      }
    }

    const matchingDecision = matchingDecisionIndex == null
      ? null
      : normalizedDecisions[matchingDecisionIndex] ?? null;

    if (!matchingDecision) {
      return {
        step_id: stepId,
        status: 'uncertain',
        confidence: 0,
        rubric_id: null,
        mark_label: null,
        reason: 'no_match',
        ...(includeUncertainReason
          ? { uncertain_reason: buildUncertainReason('no_match') }
          : {}),
      };
    }

    const status = matchingDecision.awarded === true ? 'aligned' : 'uncertain';
    return {
      step_id: stepId,
      status,
      confidence: Number(matchingDecision.alignment_confidence ?? 0),
      rubric_id: matchingDecision.rubric_id ?? null,
      mark_label: matchingDecision.mark_label ?? null,
      reason: matchingDecision.reason ?? null,
      ...(includeUncertainReason
        ? {
          uncertain_reason: buildUncertainReason(matchingDecision.reason, {
            awarded: status === 'aligned',
          }),
        }
        : {}),
    };
  });
}

export function dispatchAdapterMethod({
  adapterMethod,
  studentSteps = [],
  params = {},
} = {}) {
  const normalizedMethod = normalizeString(adapterMethod);

  if (!PILOT_9709_ADAPTER_METHODS.includes(normalizedMethod)) {
    return {
      awarded: false,
      reason: 'pilot_adapter_mismatch',
      confidence: 0,
      step: null,
    };
  }

  const { step, confidence } = findBestMatchingStep(studentSteps, normalizedMethod, params);

  return {
    awarded: confidence >= 0.9,
    reason: confidence >= 0.9 ? 'pilot_adapter_match' : 'pilot_adapter_mismatch',
    confidence,
    step,
  };
}

export function buildPilotRuntimeRubricPoints(rubricTemplate = {}) {
  return flattenTemplatePoints(rubricTemplate?.parts);
}

export function runPilotAdapterRuntime({
  rubricTemplate = {},
  studentSteps = [],
  includeUncertainReason = false,
  compatMode = null,
} = {}) {
  const rubricPoints = buildPilotRuntimeRubricPoints(rubricTemplate);
  const decisions = [];
  const awardedRubricIds = new Set();

  for (const rubricPoint of rubricPoints) {
    if (!rubricPoint.rubric_id) {
      continue;
    }

    const unmetDependency = normalizeArray(rubricPoint.depends_on).find(
      (dependencyId) => !awardedRubricIds.has(normalizeString(dependencyId)),
    );

    if (unmetDependency) {
      decisions.push(buildDecision({
        rubricPoint,
        includeUncertainReason,
        awarded: false,
        reason: 'dependency_not_met',
        confidence: 0,
        step: null,
      }));
      continue;
    }

    const dispatched = dispatchAdapterMethod({
      adapterMethod: rubricPoint.adapter_method,
      studentSteps,
      params: rubricPoint.adapter_params,
    });
    const decision = buildDecision({
      rubricPoint,
      includeUncertainReason,
      awarded: dispatched.awarded,
      reason: dispatched.reason,
      confidence: dispatched.confidence,
      step: dispatched.step,
    });

    if (decision.awarded) {
      awardedRubricIds.add(rubricPoint.rubric_id);
    }

    decisions.push(decision);
  }

  return {
    decisions,
    ...(compatMode === 'v0'
      ? {
        alignments: buildPilotCompatAlignments(studentSteps, decisions, {
          includeUncertainReason,
        }),
      }
      : {}),
    rubric_points: rubricPoints,
    execution_summary: {
      execution_path: 'pilot_adapter_runtime',
      adapter_methods: [...new Set(rubricPoints.map((point) => point.adapter_method))].sort(),
      rubric_template_id: normalizeString(rubricTemplate?.rubric_template_id) || null,
      question_type_id: normalizeString(rubricTemplate?.question_type_id) || null,
    },
  };
}
