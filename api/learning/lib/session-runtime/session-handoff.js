const VALID_HANDOFF_KINDS = new Set([
  'internal_compaction',
  'suggested_handoff',
  'explicit_new_session',
]);

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

function normalizeSummaryState(summaryState = {}) {
  return isPlainObject(summaryState)
    ? cloneJson(summaryState) ?? {}
    : {};
}

function questionTypeIdFromBundle(bundle = {}, session = {}) {
  return normalizeNullableString(
    bundle?.current_question_type_ref?.question_type_id
    ?? bundle?.currentQuestionTypeRef?.questionTypeId
    ?? session?.current_question_type_id
    ?? session?.currentQuestionTypeId,
  );
}

function normalizeSessionBundle(session = {}) {
  const bundle = isPlainObject(session?.active_scope_bundle)
    ? session.active_scope_bundle
    : isPlainObject(session?.activeScopeBundle)
      ? session.activeScopeBundle
      : {};

  return {
    mode: normalizeNullableString(bundle.mode ?? session?.mode),
    session_goal: normalizeNullableString(bundle.session_goal ?? bundle.sessionGoal ?? session?.session_goal ?? session?.sessionGoal),
    current_anchor_kind: normalizeNullableString(
      bundle.current_anchor_kind
      ?? bundle.currentAnchorKind
      ?? session?.current_anchor_kind
      ?? session?.currentAnchorKind,
    ),
    current_anchor_ref: cloneJson(
      bundle.current_anchor_ref
      ?? bundle.currentAnchorRef
      ?? session?.current_anchor_ref
      ?? session?.currentAnchorRef
      ?? null,
    ),
    current_question_type_id: questionTypeIdFromBundle(bundle, session),
  };
}

export function normalizeSessionHandoffKind(value) {
  const normalized = normalizeNullableString(value);
  return VALID_HANDOFF_KINDS.has(normalized) ? normalized : null;
}

export function buildLineageSummarySnapshot(summaryState = {}) {
  const normalized = normalizeSummaryState(summaryState);
  delete normalized.handoff;
  delete normalized.resume_guidance;
  delete normalized.resumeGuidance;
  return normalized;
}

export function buildSessionLineage(session = {}) {
  const lineageSource = isPlainObject(session?.lineage)
    ? session.lineage
    : {};
  const lineageRef = isPlainObject(session?.lineage_ref)
    ? session.lineage_ref
    : isPlainObject(session?.lineageRef)
      ? session.lineageRef
      : {};
  const summarySnapshotSource =
    lineageSource.summary_snapshot
    ?? lineageSource.summarySnapshot
    ?? session?.summary_snapshot
    ?? session?.summarySnapshot
    ?? session?.lineage_summary_snapshot
    ?? session?.lineageSummarySnapshot
    ?? session?.summary_state
    ?? session?.summaryState
    ?? {};

  return {
    parent_session_id: normalizeNullableString(
      lineageSource.parent_session_id
      ?? lineageSource.parentSessionId
      ?? lineageRef.parent_session_id
      ?? lineageRef.parentSessionId,
    ),
    handoff_kind: normalizeSessionHandoffKind(
      lineageSource.handoff_kind
      ?? lineageSource.handoffKind
      ?? lineageRef.handoff_kind
      ?? lineageRef.handoffKind,
    ),
    summary_snapshot: buildLineageSummarySnapshot(summarySnapshotSource),
  };
}

function buildSuggestedHandoff(session, bundle, summaryState) {
  const sessionState = normalizeNullableString(session?.state);
  const suggestedKind = normalizeSessionHandoffKind(
    summaryState.suggested_handoff_kind ?? summaryState.suggestedHandoffKind,
  ) ?? (sessionState === 'handoff_suggested' ? 'suggested_handoff' : null);
  const shouldHandoff = Boolean(suggestedKind);

  return {
    supported: true,
    should_handoff: shouldHandoff,
    handoff_kind: suggestedKind,
    reason_code: normalizeNullableString(
      summaryState.suggested_handoff_reason_code ?? summaryState.suggestedHandoffReasonCode,
    ) ?? (shouldHandoff ? 'session_state_handoff_suggested' : null),
    message: normalizeNullableString(
      summaryState.suggested_handoff_message ?? summaryState.suggestedHandoffMessage,
    ) ?? (suggestedKind === 'internal_compaction'
      ? 'Compact this runtime session before the next return.'
      : shouldHandoff
        ? 'Start a fresh follow-up session with the carried summary.'
        : null),
    questionless: !normalizeNullableString(
      session?.current_question_id ?? session?.currentQuestionId,
    ),
    recommended_mode: normalizeNullableString(
      summaryState.recommended_mode ?? summaryState.recommendedMode,
    ) ?? bundle.mode,
    recommended_anchor_kind: normalizeNullableString(
      summaryState.recommended_anchor_kind ?? summaryState.recommendedAnchorKind,
    ) ?? bundle.current_anchor_kind,
    recommended_anchor_ref: cloneJson(
      summaryState.recommended_anchor_ref
      ?? summaryState.recommendedAnchorRef
      ?? bundle.current_anchor_ref
      ?? null,
    ),
    current_question_id: normalizeNullableString(
      session?.current_question_id ?? session?.currentQuestionId,
    ),
    current_question_type_id: questionTypeIdFromBundle(bundle, session),
  };
}

function buildInternalCompaction(session, summaryState, suggestedHandoff) {
  return {
    supported: true,
    should_handoff:
      suggestedHandoff.should_handoff && suggestedHandoff.handoff_kind === 'internal_compaction',
    reason_code:
      suggestedHandoff.handoff_kind === 'internal_compaction'
        ? suggestedHandoff.reason_code
        : null,
    message:
      suggestedHandoff.handoff_kind === 'internal_compaction'
        ? suggestedHandoff.message
        : 'Compact the current runtime summary when the thread needs a clean restart.',
    questionless: !normalizeNullableString(
      session?.current_question_id ?? session?.currentQuestionId,
    ),
    summary_snapshot: buildLineageSummarySnapshot(summaryState),
  };
}

function buildExplicitNewSession(session, bundle, lineage, summaryState) {
  return {
    supported: true,
    source_session_id: normalizeNullableString(session?.session_id ?? session?.sessionId),
    parent_session_id: lineage.parent_session_id,
    handoff_kind: lineage.handoff_kind,
    questionless: !normalizeNullableString(
      session?.current_question_id ?? session?.currentQuestionId,
    ),
    recommended_mode: normalizeNullableString(
      summaryState.recommended_mode ?? summaryState.recommendedMode,
    ) ?? bundle.mode,
    recommended_anchor_kind: normalizeNullableString(
      summaryState.recommended_anchor_kind ?? summaryState.recommendedAnchorKind,
    ) ?? bundle.current_anchor_kind,
    recommended_anchor_ref: cloneJson(
      summaryState.recommended_anchor_ref
      ?? summaryState.recommendedAnchorRef
      ?? bundle.current_anchor_ref
      ?? null,
    ),
    current_question_type_id: questionTypeIdFromBundle(bundle, session),
    carry_forward_summary: lineage.parent_session_id
      ? cloneJson(lineage.summary_snapshot)
      : buildLineageSummarySnapshot(summaryState),
  };
}

export function buildSessionResumeGuidance(session = {}) {
  const summaryState = normalizeSummaryState(session?.summary_state ?? session?.summaryState);
  const bundle = normalizeSessionBundle(session);
  const lineage = buildSessionLineage(session);
  const currentQuestionId = normalizeNullableString(
    session?.current_question_id ?? session?.currentQuestionId,
  );
  const currentQuestionTypeId = questionTypeIdFromBundle(bundle, session);
  const questionless = !currentQuestionId;
  const anchorKind = bundle.current_anchor_kind;

  return {
    title: normalizeNullableString(
      summaryState.resume_title ?? summaryState.resumeTitle,
    ) ?? (questionless
      ? 'Resume this anchored runtime session'
      : 'Resume the current question'),
    message: normalizeNullableString(
      summaryState.resume_message ?? summaryState.resumeMessage,
    ) ?? (questionless
      ? `Re-enter through the ${anchorKind ?? 'current'} anchor without inventing a question.`
      : `Return to question ${currentQuestionId}.`),
    summary: normalizeNullableString(
      summaryState.resume_summary
      ?? summaryState.resumeSummary
      ?? summaryState.recap
      ?? lineage.summary_snapshot?.recap
      ?? bundle.session_goal,
    ),
    questionless,
    anchor_kind: anchorKind,
    anchor_ref: cloneJson(bundle.current_anchor_ref),
    current_question_id: currentQuestionId,
    current_question_type_id: currentQuestionTypeId,
    parent_session_id: lineage.parent_session_id,
    handoff_kind: lineage.handoff_kind,
    summary_snapshot: cloneJson(lineage.summary_snapshot),
  };
}

export function createSessionHandoff(session = null) {
  const normalizedSession = session ?? {};
  const summaryState = normalizeSummaryState(
    normalizedSession?.summary_state ?? normalizedSession?.summaryState,
  );
  const bundle = normalizeSessionBundle(normalizedSession);
  const lineage = buildSessionLineage(normalizedSession);
  const suggestedHandoff = buildSuggestedHandoff(normalizedSession, bundle, summaryState);

  return {
    supported: true,
    session_id: normalizeNullableString(
      normalizedSession?.session_id ?? normalizedSession?.sessionId,
    ),
    lineage: cloneJson(lineage),
    suggested_handoff: suggestedHandoff,
    internal_compaction: buildInternalCompaction(
      normalizedSession,
      summaryState,
      suggestedHandoff,
    ),
    explicit_new_session: buildExplicitNewSession(
      normalizedSession,
      bundle,
      lineage,
      summaryState,
    ),
  };
}

export function buildChildSessionLineage({
  parentSession = null,
  parentSessionId = null,
  handoffKind = null,
} = {}) {
  const normalizedParentSessionId = normalizeNullableString(
    parentSessionId ?? parentSession?.session_id ?? parentSession?.sessionId,
  );
  if (!normalizedParentSessionId) {
    return {
      parent_session_id: null,
      handoff_kind: null,
      lineage_summary_snapshot: null,
    };
  }

  return {
    parent_session_id: normalizedParentSessionId,
    handoff_kind: normalizeSessionHandoffKind(handoffKind) ?? 'explicit_new_session',
    lineage_summary_snapshot: buildLineageSummarySnapshot(
      parentSession?.summary_state ?? parentSession?.summaryState ?? {},
    ),
  };
}
