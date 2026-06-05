export const REVIEW_TASK_COMPLETION_OUTCOMES = new Set([
  'completed',
  'partial',
  'skipped',
  'expired',
]);

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasTypedRef(value) {
  if (!isPlainObject(value) || !normalizeString(value.kind)) {
    return false;
  }

  return Object.entries(value).some(([key, refValue]) =>
    key !== 'kind' && normalizeString(refValue));
}

function hasStringArray(value) {
  return Array.isArray(value) && value.some((item) => normalizeString(item));
}

function hasTypedRefArray(value) {
  return Array.isArray(value) && value.some(hasTypedRef);
}

function hasPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function hasTimedCheckEvidence(value) {
  if (hasTypedRef(value?.timed_attempt_ref)) {
    return true;
  }

  const timedCheck = isPlainObject(value?.timed_check) ? value.timed_check : {};
  return hasPositiveNumber(timedCheck.duration_seconds)
    && Boolean(normalizeString(timedCheck.completed_at));
}

function hasTrapFixEvidence(value) {
  return hasStringArray(value?.fixed_misconception_tags)
    && (
      hasStringArray(value?.corrected_steps)
      || hasTypedRef(value?.corrected_attempt_ref)
      || hasTypedRef(value?.fix_evidence_ref)
      || hasTypedRef(value?.attempt_ref)
    );
}

export function hasReviewTaskCompletionEvidenceSignal(evidence = {}) {
  if (!isPlainObject(evidence)) {
    return false;
  }

  return Boolean(
    normalizeString(evidence.summary)
    || normalizeString(evidence.note)
    || normalizeString(evidence.recall_response)
    || normalizeString(evidence.partial_reason)
    || normalizeString(evidence.skip_reason)
    || normalizeString(evidence.expired_reason)
    || hasStringArray(evidence.derivation_steps)
    || hasStringArray(evidence.corrected_steps)
    || hasStringArray(evidence.fixed_misconception_tags)
    || hasTypedRef(evidence.artifact_ref)
    || hasTypedRef(evidence.attempt_ref)
    || hasTypedRef(evidence.mark_run_ref)
    || hasTypedRef(evidence.recall_response_ref)
    || hasTypedRef(evidence.derivation_ref)
    || hasTypedRef(evidence.variant_attempt_ref)
    || hasTypedRef(evidence.timed_attempt_ref)
    || hasTypedRef(evidence.corrected_attempt_ref)
    || hasTypedRef(evidence.fix_evidence_ref)
    || hasTypedRefArray(evidence.evidence_refs)
    || hasTimedCheckEvidence(evidence)
  );
}

function hasCompletedModeEvidence(mode, evidence = {}) {
  switch (normalizeString(mode)) {
    case 'quick_recall':
      return Boolean(
        normalizeString(evidence.recall_response)
        || hasTypedRef(evidence.recall_response_ref)
      );

    case 'reconstruct_derivation':
      return Boolean(
        hasStringArray(evidence.derivation_steps)
        || hasTypedRef(evidence.derivation_ref)
      );

    case 'redo_variant':
      return Boolean(
        hasTypedRef(evidence.variant_attempt_ref)
        || hasTypedRef(evidence.attempt_ref)
      );

    case 'timed_check':
      return hasTimedCheckEvidence(evidence);

    case 'trap_fix':
      return hasTrapFixEvidence(evidence);

    default:
      return false;
  }
}

function validationKindForOutcome(outcome) {
  if (outcome === 'completed') {
    return 'mode_specific';
  }

  return `${outcome}_evidence`;
}

export function validateReviewTaskCompletionEvidence({
  mode = null,
  outcome = null,
  evidence = null,
} = {}) {
  const normalizedOutcome = normalizeString(outcome);
  const normalizedMode = normalizeString(mode);

  if (!isPlainObject(evidence)) {
    return {
      ok: false,
      field: 'completion_evidence',
      message: 'completion_evidence must be an object.',
    };
  }

  if (!hasReviewTaskCompletionEvidenceSignal(evidence)) {
    return {
      ok: false,
      field: 'completion_evidence',
      message: 'completion_evidence must include behavioral evidence for the requested outcome.',
    };
  }

  if (
    normalizedOutcome === 'completed'
    && !hasCompletedModeEvidence(normalizedMode, evidence)
  ) {
    return {
      ok: false,
      field: normalizedMode
        ? `completion_evidence.${normalizedMode}`
        : 'completion_evidence.mode',
      message: 'completed review tasks require mode-specific behavioral evidence.',
    };
  }

  return {
    ok: true,
    contract: {
      mode: normalizedMode,
      outcome: normalizedOutcome,
      validation: validationKindForOutcome(normalizedOutcome),
    },
  };
}
