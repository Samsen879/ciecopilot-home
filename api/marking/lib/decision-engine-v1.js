// api/marking/lib/decision-engine-v1.js
// Decision Engine v1 — deterministic scoring using Jaccard similarity.
// Takes student_steps[] and rubric_points[] (from rubric-resolver-v1),
// produces decisions[] with optional v0-compat alignments[].

import {
  FT_MODE,
  buildUncertainReason,
  normalizeFtMode,
} from './marking-semantics-v1.js';

// ── Scoring engine version ──────────────────────────────────────────────────
export const SCORING_ENGINE_VERSION = 'b2_smart_mark_engine_v1';

// ── Default thresholds (match v0 evaluate.js defaults) ──────────────────────
const DEFAULT_MIN_CONFIDENCE = 0.55;
const DEFAULT_UNCERTAIN_MARGIN = 0.15;

// ── Text processing (ported from v0 evaluate.js) ────────────────────────────

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^a-z0-9+\-*/=(). ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalize(text).match(/[a-z0-9]+/g) || [];
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  sa.forEach((x) => { if (sb.has(x)) inter += 1; });
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : 0;
}

// ── Dependency validation ───────────────────────────────────────────────────

/**
 * Validate depends_on references for a set of rubric points.
 * Returns a Map of rubric_id -> error reason (if any).
 */
function validateDependencies(rubricPoints) {
  const idSet = new Set(rubricPoints.map((rp) => rp.rubric_id));
  const errors = new Map();

  for (const rp of rubricPoints) {
    const deps = rp.depends_on;
    if (!Array.isArray(deps) || deps.length === 0) continue;

    for (const depId of deps) {
      if (!idSet.has(depId)) {
        // Missing or cross-question reference
        errors.set(rp.rubric_id, 'dependency_error');
        break;
      }
    }
  }

  // Detect circular dependencies via DFS
  const adjMap = new Map();
  for (const rp of rubricPoints) {
    if (Array.isArray(rp.depends_on) && rp.depends_on.length > 0) {
      adjMap.set(rp.rubric_id, rp.depends_on.filter((d) => idSet.has(d)));
    }
  }

  const VISITING = 1;
  const VISITED = 2;
  const state = new Map();

  function hasCycle(nodeId) {
    if (state.get(nodeId) === VISITED) return false;
    if (state.get(nodeId) === VISITING) return true;
    state.set(nodeId, VISITING);
    const neighbors = adjMap.get(nodeId) || [];
    for (const n of neighbors) {
      if (hasCycle(n)) return true;
    }
    state.set(nodeId, VISITED);
    return false;
  }

  for (const rp of rubricPoints) {
    if (!errors.has(rp.rubric_id) && adjMap.has(rp.rubric_id)) {
      state.clear();
      if (hasCycle(rp.rubric_id)) {
        errors.set(rp.rubric_id, 'dependency_error');
      }
    }
  }

  return errors;
}

// ── Best-match scoring for a single rubric point ────────────────────────────

/**
 * Find the best matching student step for a rubric point.
 * @param {object} rubricPoint - { rubric_id, mark_label, description, ... }
 * @param {object[]} studentSteps - [{ step_id, text }]
 * @returns {{ step_id: string|null, confidence: number }}
 */
function findBestMatch(rubricPoint, studentSteps) {
  const basis = `${rubricPoint.mark_label || ''} ${rubricPoint.description || ''}`.trim();
  const basisTokens = tokenize(basis);

  let bestStepId = null;
  let bestScore = 0;
  let bestStepText = '';

  for (const step of studentSteps) {
    const stepTokens = tokenize(String(step.text || ''));
    const score = jaccard(basisTokens, stepTokens);
    if (score > bestScore) {
      bestScore = score;
      bestStepId = String(step.step_id || '');
      bestStepText = String(step.text || '');
    }
  }

  return {
    step_id: bestStepId,
    confidence: Number(bestScore.toFixed(4)),
    step_text: bestStepText,
  };
}

function getAccuracyPolicy(rubricPoint, options) {
  const defaultPolicy = (options && typeof options.accuracy_policy_default === 'object')
    ? options.accuracy_policy_default
    : {};
  const pointPolicy = (rubricPoint && typeof rubricPoint.accuracy_policy === 'object')
    ? rubricPoint.accuracy_policy
    : {};
  return { ...defaultPolicy, ...pointPolicy };
}

function evaluateThreshold(confidence, policy, options) {
  const minConfidence = Number(
    policy.min_confidence
      ?? options.min_confidence
      ?? DEFAULT_MIN_CONFIDENCE,
  );
  const uncertainMargin = Number(
    policy.uncertain_margin
      ?? options.uncertain_margin
      ?? DEFAULT_UNCERTAIN_MARGIN,
  );
  const awardOnBorderline = Boolean(policy.award_on_borderline === true);

  if (confidence >= minConfidence + uncertainMargin) {
    return { awarded: true, reason: 'best_match' };
  }
  if (confidence >= minConfidence) {
    if (awardOnBorderline) {
      return { awarded: true, reason: 'best_match' };
    }
    return { awarded: false, reason: 'borderline_score' };
  }
  return { awarded: false, reason: 'below_threshold' };
}

function getCaoGroupKey(rubricPoint) {
  if (!rubricPoint?.is_cao) return null;
  const policyGroup = rubricPoint?.accuracy_policy?.cao_group;
  if (policyGroup) return String(policyGroup);
  if (rubricPoint.mark_label) return `label:${rubricPoint.mark_label}`;
  return `rubric:${rubricPoint.rubric_id}`;
}

// ── Main decision engine ────────────────────────────────────────────────────

/**
 * Run the decision engine.
 *
 * @param {object} params
 * @param {object[]} params.student_steps - [{ step_id, text }]
 * @param {object[]} params.rubric_points - from rubric-resolver-v1
 * @param {object}   [params.options]
 * @param {number}   [params.options.min_confidence=0.55]
 * @param {number}   [params.options.uncertain_margin=0.15]
 * @param {boolean}  [params.options.include_uncertain_reason=false]
 * @param {string}   [params.options.compat_mode] - 'v0' to also produce alignments[]
 * @returns {{ decisions: object[], alignments?: object[] }}
 */
export function runDecisionEngine({ student_steps, rubric_points, options = {} }) {
  const compatMode = options.compat_mode || null;
  const includeUncertainReason = options.include_uncertain_reason === true;

  // ── Phase 0: validate dependency graph ──────────────────────────────────
  const depErrors = validateDependencies(rubric_points);

  // ── Phase 1: score each rubric point against student steps ──────────────
  const rawScores = new Map(); // rubric_id -> { step_id, confidence }
  for (const rp of rubric_points) {
    rawScores.set(rp.rubric_id, findBestMatch(rp, student_steps));
  }

  // ── Phase 2: build initial decisions (before dependency checks) ─────────
  const initialDecisions = new Map(); // rubric_id -> decision
  for (const rp of rubric_points) {
    const { step_id, confidence, step_text } = rawScores.get(rp.rubric_id);
    const marks = Number(rp.marks || 0);

    // Fail-safe: dependency graph error
    if (depErrors.has(rp.rubric_id)) {
      initialDecisions.set(rp.rubric_id, {
        rubric_id: rp.rubric_id,
        mark_label: rp.mark_label,
        reason: 'dependency_error',
        awarded: false,
        awarded_marks: 0,
        _confidence: confidence,
        _step_id: step_id,
      });
      continue;
    }

    // Threshold logic with accuracy_policy override
    const accuracyPolicy = getAccuracyPolicy(rp, options);
    const threshold = evaluateThreshold(confidence, accuracyPolicy, options);
    const awarded = threshold.awarded;
    const reason = threshold.reason;

    initialDecisions.set(rp.rubric_id, {
      rubric_id: rp.rubric_id,
      mark_label: rp.mark_label,
      reason,
      awarded,
      awarded_marks: awarded ? marks : 0,
      _confidence: confidence,
      _step_id: step_id,
      _step_text: step_text,
      _ft_mode: normalizeFtMode(rp.ft_mode),
      _is_cao: Boolean(rp.is_cao),
      _accuracy_policy: accuracyPolicy,
    });
  }

  // ── Phase 3: dependency chain check ─────────────────────────────────────
  // If any dependency is not awarded, mark dependent as uncertain.
  for (const rp of rubric_points) {
    const deps = rp.depends_on;
    if (!Array.isArray(deps) || deps.length === 0) continue;
    if (depErrors.has(rp.rubric_id)) continue; // already handled

    const decision = initialDecisions.get(rp.rubric_id);
    if (!decision) continue;
    const ftMode = decision._ft_mode;

    const unmetDep = deps.find((depId) => {
      const depDecision = initialDecisions.get(depId);
      if (!depDecision || !depDecision.awarded) return true;
      if (ftMode === FT_MODE.STRICT_FT && depDecision.reason !== 'best_match') return true;
      return false;
    });

    if (unmetDep) {
      decision.awarded = false;
      decision.awarded_marks = 0;
      decision.reason = 'dependency_not_met';
    }
  }

  // ── Phase 4: CAO all-or-nothing group enforcement ───────────────────────
  const groups = new Map(); // groupKey -> rubric_id[]
  for (const rp of rubric_points) {
    const groupKey = getCaoGroupKey(rp);
    if (!groupKey) continue;
    const list = groups.get(groupKey) || [];
    list.push(rp.rubric_id);
    groups.set(groupKey, list);
  }

  for (const rubricIds of groups.values()) {
    const decisionsInGroup = rubricIds
      .map((rubricId) => initialDecisions.get(rubricId))
      .filter(Boolean);
    if (decisionsInGroup.length === 0) continue;
    const hasFailure = decisionsInGroup.some((d) => !d.awarded);
    if (!hasFailure) continue;

    for (const decision of decisionsInGroup) {
      const wasAwarded = decision.awarded;
      decision.awarded = false;
      decision.awarded_marks = 0;
      if (wasAwarded) {
        decision.reason = 'uncertain';
      }
    }
  }

  // ── Phase 5: build final decisions[] ────────────────────────────────────
  const decisions = rubric_points.map((rp) => {
    const d = initialDecisions.get(rp.rubric_id);
    const stepText = String(d._step_text || '');
    const evidenceSpans = d._step_id
      ? [{
          step_id: d._step_id,
          start: 0,
          end: stepText.length,
        }]
      : [];
    return {
      rubric_id: d.rubric_id,
      mark_label: d.mark_label,
      reason: d.reason,
      ...(includeUncertainReason
        ? { uncertain_reason: buildUncertainReason(d.reason, { awarded: d.awarded }) }
        : {}),
      awarded: d.awarded,
      awarded_marks: d.awarded_marks,
      alignment_confidence: d._confidence,
      evidence_spans: evidenceSpans,
    };
  });

  const result = { decisions };

  // ── Phase 6: v0 compat — build alignments[] ────────────────────────────
  if (compatMode === 'v0') {
    result.alignments = buildV0Alignments(
      rubric_points,
      student_steps,
      initialDecisions,
      { include_uncertain_reason: includeUncertainReason },
    );
  }

  return result;
}

// ── v0 compat: alignments[] builder ─────────────────────────────────────────

/**
 * Build v0-format alignments[] from decisions.
 * v0 format: per-step, each step gets its best rubric match.
 * { step_id, status, confidence, rubric_id, mark_label, reason }
 */
function buildV0Alignments(
  rubricPoints,
  studentSteps,
  decisionsMap,
  { include_uncertain_reason: includeUncertainReason = false } = {},
) {
  return studentSteps.map((step, idx) => {
    const stepId = String(step.step_id || `s${idx + 1}`);
    const stepText = String(step.text || '');

    if (!rubricPoints.length) {
      return {
        step_id: stepId,
        status: 'uncertain',
        confidence: 0,
        rubric_id: null,
        mark_label: null,
        reason: 'no_rubric_points',
        ...(includeUncertainReason
          ? { uncertain_reason: buildUncertainReason('no_rubric_points') }
          : {}),
      };
    }

    // Find best rubric match for this step (same as v0 logic)
    const basisTokens = tokenize(stepText);
    let bestRubricId = null;
    let bestMarkLabel = null;
    let bestConfidence = 0;

    for (const rp of rubricPoints) {
      const rpBasis = `${rp.mark_label || ''} ${rp.description || ''}`.trim();
      const score = jaccard(basisTokens, tokenize(rpBasis));
      if (score > bestConfidence) {
        bestConfidence = score;
        bestRubricId = rp.rubric_id;
        bestMarkLabel = rp.mark_label;
      }
    }

    bestConfidence = Number(bestConfidence.toFixed(4));

    // Derive status from the decision for the matched rubric point
    const decision = bestRubricId ? decisionsMap.get(bestRubricId) : null;
    let status;
    let reason;

    if (!decision) {
      status = 'uncertain';
      reason = 'no_match';
    } else if (decision.awarded) {
      status = 'aligned';
      reason = decision.reason;
    } else {
      status = 'uncertain';
      reason = decision.reason;
    }

    return {
      step_id: stepId,
      status,
      confidence: bestConfidence,
      rubric_id: bestRubricId,
      mark_label: bestMarkLabel,
      reason,
      ...(includeUncertainReason
        ? { uncertain_reason: buildUncertainReason(reason, { awarded: status === 'aligned' }) }
        : {}),
    };
  });
}

// ── Exported for testing ────────────────────────────────────────────────────
export { normalize, tokenize, jaccard, validateDependencies, findBestMatch };
