function normalizeString(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  return String(value).trim();
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (typeof value === 'undefined') {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function hasComparableContinuationContext(context = {}) {
  return Object.values(context).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (isPlainObject(value)) {
      return Object.keys(value).length > 0;
    }

    return normalizeNullableString(value) !== null;
  });
}

function readQuestionRefId(ref = {}) {
  return normalizeNullableString(ref?.question_id ?? ref?.questionId);
}

function readQuestionTypeRefId(ref = {}) {
  return normalizeNullableString(ref?.question_type_id ?? ref?.questionTypeId);
}

function readTopicSectionId(ref = {}) {
  return normalizeNullableString(
    ref?.paper_workspace_topic_section_id ?? ref?.paperWorkspaceTopicSectionId,
  );
}

function normalizeStoredScope(session = {}) {
  const bundle = isPlainObject(session?.active_scope_bundle)
    ? session.active_scope_bundle
    : isPlainObject(session?.activeScopeBundle)
      ? session.activeScopeBundle
      : {};
  const paperContext = isPlainObject(bundle.paper_context)
    ? bundle.paper_context
    : isPlainObject(bundle.paperContext)
      ? bundle.paperContext
      : {};
  const topicSectionRef = isPlainObject(paperContext.topic_section_ref)
    ? paperContext.topic_section_ref
    : isPlainObject(paperContext.topicSectionRef)
      ? paperContext.topicSectionRef
      : {};

  return {
    primary_topic_id: normalizeNullableString(
      bundle.primary_topic_id ?? bundle.primaryTopicId,
    ),
    primary_topic_path: normalizeNullableString(
      bundle.primary_topic_path ?? bundle.primaryTopicPath,
    ),
    current_question_id: readQuestionRefId(
      bundle.current_question_ref ?? bundle.currentQuestionRef,
    ) ?? normalizeNullableString(session?.current_question_id ?? session?.currentQuestionId),
    current_question_type_id: readQuestionTypeRefId(
      bundle.current_question_type_ref ?? bundle.currentQuestionTypeRef,
    ) ?? normalizeNullableString(
      session?.current_question_type_id ?? session?.currentQuestionTypeId,
    ),
    paper_scope: normalizeNullableString(
      paperContext.paper_scope ?? paperContext.paperScope,
    ),
    topic_section_id: readTopicSectionId(topicSectionRef),
  };
}

function normalizeRequestedScope(clientContext = {}) {
  if (!isPlainObject(clientContext)) {
    return {};
  }

  const bundle = isPlainObject(clientContext.active_scope_bundle)
    ? clientContext.active_scope_bundle
    : isPlainObject(clientContext.activeScopeBundle)
      ? clientContext.activeScopeBundle
      : clientContext;
  const paperContext = isPlainObject(bundle.paper_context)
    ? bundle.paper_context
    : isPlainObject(bundle.paperContext)
      ? bundle.paperContext
      : {};
  const topicSectionRef = isPlainObject(paperContext.topic_section_ref)
    ? paperContext.topic_section_ref
    : isPlainObject(paperContext.topicSectionRef)
      ? paperContext.topicSectionRef
      : {};

  return {
    primary_topic_id: normalizeNullableString(
      bundle.primary_topic_id
      ?? bundle.primaryTopicId
      ?? clientContext.primary_topic_id
      ?? clientContext.primaryTopicId
      ?? clientContext.topic_id
      ?? clientContext.topicId,
    ),
    primary_topic_path: normalizeNullableString(
      bundle.primary_topic_path
      ?? bundle.primaryTopicPath
      ?? clientContext.primary_topic_path
      ?? clientContext.primaryTopicPath
      ?? clientContext.topic_path
      ?? clientContext.topicPath,
    ),
    current_question_id: readQuestionRefId(
      bundle.current_question_ref ?? bundle.currentQuestionRef,
    ) ?? normalizeNullableString(
      bundle.current_question_id
      ?? bundle.currentQuestionId
      ?? clientContext.current_question_id
      ?? clientContext.currentQuestionId,
    ),
    current_question_type_id: readQuestionTypeRefId(
      bundle.current_question_type_ref ?? bundle.currentQuestionTypeRef,
    ) ?? normalizeNullableString(
      bundle.current_question_type_id
      ?? bundle.currentQuestionTypeId
      ?? clientContext.current_question_type_id
      ?? clientContext.currentQuestionTypeId,
    ),
    paper_scope: normalizeNullableString(
      paperContext.paper_scope
      ?? paperContext.paperScope
      ?? clientContext.paper_scope
      ?? clientContext.paperScope,
    ),
    topic_section_id: readTopicSectionId(topicSectionRef),
  };
}

function buildNoDrift() {
  return {
    detected: false,
    reason_code: null,
    stored_primary_topic_id: null,
    requested_primary_topic_id: null,
    stored_primary_topic_path: null,
    requested_primary_topic_path: null,
    stored_current_question_id: null,
    requested_current_question_id: null,
    stored_current_question_type_id: null,
    requested_current_question_type_id: null,
    stored_paper_scope: null,
    requested_paper_scope: null,
    stored_topic_section_id: null,
    requested_topic_section_id: null,
  };
}

function buildTopicDrift(stored, requested) {
  const comparisons = [
    {
      key: 'primary_topic_path',
      reasonCode: 'primary_topic_path_mismatch',
      storedKey: 'stored_primary_topic_path',
      requestedKey: 'requested_primary_topic_path',
    },
    {
      key: 'primary_topic_id',
      reasonCode: 'primary_topic_id_mismatch',
      storedKey: 'stored_primary_topic_id',
      requestedKey: 'requested_primary_topic_id',
    },
    {
      key: 'current_question_type_id',
      reasonCode: 'current_question_type_mismatch',
      storedKey: 'stored_current_question_type_id',
      requestedKey: 'requested_current_question_type_id',
    },
    {
      key: 'current_question_id',
      reasonCode: 'current_question_mismatch',
      storedKey: 'stored_current_question_id',
      requestedKey: 'requested_current_question_id',
    },
    {
      key: 'paper_scope',
      reasonCode: 'paper_scope_mismatch',
      storedKey: 'stored_paper_scope',
      requestedKey: 'requested_paper_scope',
    },
    {
      key: 'topic_section_id',
      reasonCode: 'topic_section_mismatch',
      storedKey: 'stored_topic_section_id',
      requestedKey: 'requested_topic_section_id',
    },
  ];

  for (const comparison of comparisons) {
    const storedValue = stored[comparison.key];
    const requestedValue = requested[comparison.key];

    if (!requestedValue || requestedValue === storedValue) {
      continue;
    }

    return {
      ...buildNoDrift(),
      detected: true,
      reason_code: comparison.reasonCode,
      [comparison.storedKey]: storedValue,
      [comparison.requestedKey]: requestedValue,
    };
  }

  return buildNoDrift();
}

function buildSuggestedExplicitHandoff(reasonCode) {
  return {
    supported: true,
    should_handoff: true,
    handoff_kind: 'explicit_new_session',
    reason_code: reasonCode,
    message:
      'Start an explicit new session because the runtime cannot prove a safe continuation.',
  };
}

function buildInternalCompactionPosture(reasonCode) {
  return {
    supported: true,
    should_handoff: false,
    reason_code: null,
    message: reasonCode === 'topic_drift_detected'
      ? 'Internal compaction is not enough when topic drift is detected; start an explicit new session.'
      : 'Internal compaction is available only after the stored active scope remains authoritative.',
  };
}

function buildResumeValidation({
  valid,
  safeContinuation,
  reasonCode = null,
} = {}) {
  return {
    valid,
    safe_continuation: safeContinuation,
    reason_code: reasonCode,
    validated_against: 'persisted_active_scope_bundle',
  };
}

function buildContextHealth({
  status,
  authoritativeActiveScope,
  reasonCode = null,
  handoffRequired = false,
} = {}) {
  return {
    status,
    authoritative_active_scope: authoritativeActiveScope,
    reason_code: reasonCode,
    active_scope_source: 'persisted_active_scope_bundle',
    handoff_required: handoffRequired,
  };
}

function buildConflictDetails(reasonCode, topicDrift) {
  return {
    reason_code: reasonCode,
    context_health: buildContextHealth({
      status: 'handoff_required',
      authoritativeActiveScope: false,
      reasonCode,
      handoffRequired: true,
    }),
    topic_drift: topicDrift,
    suggested_handoff: buildSuggestedExplicitHandoff(reasonCode),
    internal_compaction: buildInternalCompactionPosture(reasonCode),
    resume_validation: buildResumeValidation({
      valid: false,
      safeContinuation: false,
      reasonCode,
    }),
  };
}

function buildContinuationEvaluationFromHealth(health) {
  const unsafeContinuation =
    health?.resume_validation?.safe_continuation === false
    || health?.context_health?.authoritative_active_scope === false;

  if (!unsafeContinuation) {
    return {
      ...health,
      ok: true,
    };
  }

  return {
    ...buildConflictDetails(
      health?.resume_validation?.reason_code
      ?? health?.context_health?.reason_code
      ?? 'unsafe_continuation',
      health?.topic_drift ?? buildNoDrift(),
    ),
    ok: false,
  };
}

export function normalizeContinuationClientContext(body = {}) {
  if (!isPlainObject(body)) {
    return {};
  }

  if (isPlainObject(body.client_context)) {
    return cloneJson(body.client_context);
  }

  if (isPlainObject(body.clientContext)) {
    return cloneJson(body.clientContext);
  }

  if (isPlainObject(body.active_scope_bundle) || isPlainObject(body.activeScopeBundle)) {
    return {
      active_scope_bundle: cloneJson(body.active_scope_bundle ?? body.activeScopeBundle),
    };
  }

  return {};
}

export function buildSessionContextHealth(session = {}) {
  const stored = normalizeStoredScope(session);
  const missingActiveScope =
    !stored.primary_topic_path
    || !normalizeNullableString(
      session?.active_scope_bundle?.current_anchor_kind
      ?? session?.activeScopeBundle?.currentAnchorKind
      ?? session?.current_anchor_kind
      ?? session?.currentAnchorKind,
    );

  if (missingActiveScope) {
    const reasonCode = 'active_scope_bundle_incomplete';
    return {
      context_health: buildContextHealth({
        status: 'handoff_required',
        authoritativeActiveScope: false,
        reasonCode,
        handoffRequired: true,
      }),
      topic_drift: buildNoDrift(),
      resume_validation: buildResumeValidation({
        valid: false,
        safeContinuation: false,
        reasonCode,
      }),
    };
  }

  const handoffSuggested = normalizeNullableString(session?.state) === 'handoff_suggested';
  const reasonCode = handoffSuggested ? 'session_handoff_suggested' : null;

  return {
    context_health: buildContextHealth({
      status: handoffSuggested ? 'handoff_suggested' : 'healthy',
      authoritativeActiveScope: true,
      reasonCode,
      handoffRequired: handoffSuggested,
    }),
    topic_drift: buildNoDrift(),
    resume_validation: buildResumeValidation({
      valid: true,
      safeContinuation: true,
      reasonCode: null,
    }),
  };
}

export function evaluateSessionContinuationContext(session = {}, clientContext = {}) {
  const requested = normalizeRequestedScope(clientContext);
  if (!hasComparableContinuationContext(requested)) {
    return buildContinuationEvaluationFromHealth(buildSessionContextHealth(session));
  }

  const stored = normalizeStoredScope(session);
  const topicDrift = buildTopicDrift(stored, requested);

  if (topicDrift.detected) {
    const reasonCode = 'topic_drift_detected';
    return {
      ...buildConflictDetails(reasonCode, topicDrift),
      ok: false,
    };
  }

  return {
    ...buildContinuationEvaluationFromHealth(buildSessionContextHealth(session)),
  };
}

export function createSessionStateConflictError(details) {
  const error = new Error('Session continuation context no longer matches the stored active scope.');
  error.code = 'session_state_conflict';
  error.status = 409;
  error.retryable = false;
  error.details = details;
  return error;
}

export function validateSessionContinuationContext(session = {}, clientContext = {}) {
  const evaluation = evaluateSessionContinuationContext(session, clientContext);
  if (evaluation.ok === false) {
    throw createSessionStateConflictError({
      reason_code: evaluation.reason_code,
      context_health: evaluation.context_health,
      topic_drift: evaluation.topic_drift,
      suggested_handoff: evaluation.suggested_handoff,
      internal_compaction: evaluation.internal_compaction,
      resume_validation: evaluation.resume_validation,
    });
  }

  return evaluation;
}
