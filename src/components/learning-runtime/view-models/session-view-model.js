import {
  SESSION_LAUNCH_TOPIC_OPTIONS,
  canSubmitSessionLaunchDraft,
  createSessionLaunchDraft,
} from './session-live-state.js';

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRefId(ref, key) {
  if (!ref || typeof ref !== 'object') {
    return null;
  }

  return normalizeText(ref[key] ?? ref[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)], null);
}

function labelForMode(mode) {
  if (mode === 'post_mortem_review') {
    return 'Post-mortem review';
  }

  return normalizeText(mode, 'learning session').replace(/_/g, ' ');
}

function labelForHandoffKind(handoffKind) {
  return normalizeText(handoffKind, '')
    .replace(/_/g, ' ')
    .trim();
}

function labelForFocusTag(tag) {
  return normalizeText(tag, '')
    .replace(/[:_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTopicOptions(draft) {
  const topicId = normalizeText(draft?.topicId, '');
  const topicPath = normalizeText(draft?.topicPath, '');
  const hasDraftTopic = Boolean(topicId || topicPath);
  const matchesKnownTopic = SESSION_LAUNCH_TOPIC_OPTIONS.some((topic) => (
    (topicId && topic.topicId === topicId)
    || (topicPath && topic.topicPath === topicPath)
  ));

  if (!hasDraftTopic || matchesKnownTopic) {
    return SESSION_LAUNCH_TOPIC_OPTIONS;
  }

  return [
    {
      topicId,
      topicPath,
      title: topicPath || topicId,
      questionTypeId: draft?.currentQuestionTypeId || null,
    },
    ...SESSION_LAUNCH_TOPIC_OPTIONS,
  ];
}

function buildAnchorLabel(anchor, topicPath) {
  if (!anchor) {
    return 'Unknown anchor';
  }

  switch (anchor.kind) {
    case 'concept':
      return topicPath || anchor.topicPath || anchor.topicId || 'Concept anchor';
    case 'question':
      return anchor.questionId || 'Question anchor';
    case 'review_task':
      return anchor.reviewTaskId || 'Review task anchor';
    case 'artifact':
      return anchor.artifactId || 'Artifact anchor';
    case 'workspace_slot':
      return anchor.slotKey
        ? `${anchor.slotKey} workspace slot`
        : 'Workspace slot anchor';
    default:
      return anchor.kind || 'Unknown anchor';
  }
}

function buildAssistantResponseEntry(latestResponse) {
  if (!latestResponse?.assistantMessage) {
    return null;
  }

  return {
    id: 'assistant-response',
    kind: 'assistant_response',
    title: 'Assistant response',
    message: latestResponse.assistantMessage,
    fallbackReasonCode: latestResponse?.fallbackPosture?.fallbackReasonCode ?? null,
    learningSignalPosture: latestResponse?.fallbackPosture?.learningSignalPosture ?? null,
    evidenceTopicPath: latestResponse?.evidenceSummary?.sourceTopicPath ?? null,
    retrievedEvidenceCount: latestResponse?.evidenceSummary?.retrievedEvidenceCount ?? null,
  };
}

function buildTurnEntries(turnHistory = []) {
  return turnHistory.flatMap((turn, index) => {
    const turnId = turn?.clientTurnId || `turn-${index + 1}`;
    const entries = [
      {
        id: `user:${turnId}`,
        kind: 'user_turn',
        title: 'Your follow-up',
        message: turn?.userMessage || '',
      },
    ];
    const assistantEntry = buildAssistantResponseEntry(turn?.response || null);
    if (assistantEntry) {
      entries.push({
        ...assistantEntry,
        id: `assistant:${turnId}`,
      });
    }

    return entries.filter((entry) => entry.message || entry.kind !== 'user_turn');
  });
}

function buildQuestionStateEntry(session) {
  if (session.hasQuestion && session.currentQuestionId) {
    return {
      id: 'current-question',
      kind: 'question',
      title: 'Current question',
      questionId: session.currentQuestionId,
      questionTypeId: session.currentQuestionTypeId,
    };
  }

  return {
    id: 'questionless-state',
    kind: 'questionless_state',
    title: 'Questionless entry',
    description: 'This runtime state is anchored without a current question.',
    questionTypeId: session.currentQuestionTypeId,
  };
}

function buildSessionLineage(sessionPayload = {}) {
  const lineage = sessionPayload?.lineage || {};
  const lineageRef = sessionPayload?.lineageRef || {};

  return {
    parentSessionId: lineage.parentSessionId ?? lineageRef.parentSessionId ?? null,
    handoffKind: lineage.handoffKind ?? lineageRef.handoffKind ?? null,
    summarySnapshot: lineage.summarySnapshot ?? null,
  };
}

function buildContinuityViewModel({ handoff, lineage, resumeGuidance }) {
  const suggestedHandoff = handoff?.suggestedHandoff?.shouldHandoff
    ? {
      ...handoff.suggestedHandoff,
      handoffKindLabel: labelForHandoffKind(handoff.suggestedHandoff.handoffKind),
      message: normalizeText(
        handoff.suggestedHandoff.message,
        'Carry the session summary into the next runtime step.',
      ),
    }
    : null;
  const normalizedResumeGuidance = resumeGuidance
    ? {
      ...resumeGuidance,
      title: normalizeText(resumeGuidance.title, 'Resume this session'),
      message: normalizeText(
        resumeGuidance.message,
        'Return through the saved anchor and continue from the stored summary.',
      ),
      summary: normalizeText(resumeGuidance.summary, ''),
    }
    : null;
  const normalizedLineage = lineage?.parentSessionId || lineage?.handoffKind
    ? {
      ...lineage,
      handoffKindLabel: labelForHandoffKind(lineage.handoffKind),
      summary:
        normalizeText(lineage?.summarySnapshot?.recap, '')
        || normalizeText(lineage?.summarySnapshot?.summary, ''),
    }
    : null;

  return {
    showContinuity: Boolean(
      normalizedResumeGuidance
      || suggestedHandoff
      || normalizedLineage,
    ),
    resumeGuidance: normalizedResumeGuidance,
    suggestedHandoff,
    lineage: normalizedLineage,
  };
}

function buildTimeline(session, latestResponse, turnHistory = []) {
  const entries = buildTurnEntries(turnHistory);

  if (entries.length === 0) {
    const assistantEntry = buildAssistantResponseEntry(latestResponse);
    if (assistantEntry) {
      entries.push(assistantEntry);
    }
  }

  entries.push(buildQuestionStateEntry(session));
  return entries;
}

function buildLauncherViewModel(launcher = {}) {
  const draft = createSessionLaunchDraft(launcher?.draft || {});

  return {
    draft,
    status: launcher?.status || 'idle',
    errorMessage: launcher?.errorMessage || launcher?.error?.message || null,
    canSubmit: typeof launcher?.canSubmit === 'boolean'
      ? launcher.canSubmit
      : canSubmitSessionLaunchDraft(draft),
    anchorOptions: [
      { value: 'concept', label: 'Concept' },
      { value: 'question', label: 'Question' },
      { value: 'review_task', label: 'Review task' },
      { value: 'artifact', label: 'Artifact' },
      { value: 'workspace_slot', label: 'Workspace slot' },
    ],
    modeOptions: [
      { value: 'learn_concept', label: 'Learn concept' },
      { value: 'guided_solve', label: 'Guided solve' },
      { value: 'timed_practice', label: 'Timed practice' },
      { value: 'post_mortem_review', label: 'Post-mortem review' },
      { value: 'spaced_review', label: 'Spaced review' },
    ],
    topicOptions: buildTopicOptions(draft),
    slotOptions: [
      { value: 'review_queue', label: 'review_queue' },
      { value: 'common_traps', label: 'common_traps' },
      { value: 'my_notes', label: 'my_notes' },
      { value: 'overview_map', label: 'overview_map' },
    ],
  };
}

function buildComposerViewModel(composer = {}, hasSession) {
  const message = normalizeText(composer?.message, '');

  return {
    message,
    status: composer?.status || 'idle',
    errorMessage: composer?.errorMessage || composer?.error?.message || null,
    canSubmit: typeof composer?.canSubmit === 'boolean'
      ? composer.canSubmit
      : Boolean(hasSession && message && composer?.status !== 'submitting'),
  };
}

function buildPostMortemArtifactLaunch(candidate, topicPath) {
  const artifactId = normalizeText(candidate?.artifactId ?? candidate?.artifact_id, null);
  if (!artifactId) {
    return null;
  }

  return {
    ctaLabel: 'Start post-mortem review',
    launchPayload: {
      anchorKind: 'artifact',
      artifactId,
      mode: 'post_mortem_review',
      topicId: normalizeText(candidate?.canonicalHomeTopicId ?? candidate?.canonical_home_topic_id, ''),
      topicPath: normalizeText(candidate?.canonicalHomeTopicPath ?? candidate?.canonical_home_topic_path, topicPath || ''),
      currentQuestionTypeId: normalizeText(
        candidate?.targetQuestionTypeId ?? candidate?.target_question_type_id,
        '',
      ),
    },
  };
}

function buildPostMortemViewModel(sessionPayload = {}, session, topicPath) {
  if (session?.mode !== 'post_mortem_review') {
    return null;
  }

  const summaryState = sessionPayload.summaryState || sessionPayload.summary_state || {};
  const raw = summaryState.postMortemReview || summaryState.post_mortem_review || {};
  const scoringPosture = raw.scoringPosture || raw.scoring_posture || null;
  const diagnosticFocus = raw.diagnosticFocus || raw.diagnostic_focus || {};
  const repairHandoff = raw.repairHandoff || raw.repair_handoff || null;
  const misconceptionTags = normalizeArray(
    sessionPayload.misconceptionsInFocus
    ?? sessionPayload.misconceptions_in_focus
    ?? raw.misconceptionTags
    ?? raw.misconception_tags,
  );
  const artifactCandidates = normalizeArray(raw.artifactCandidates ?? raw.artifact_candidates)
    .map((candidate) => {
      const artifactId = normalizeText(candidate?.artifactId ?? candidate?.artifact_id, null);
      if (!artifactId) {
        return null;
      }

      return {
        artifactId,
        artifactKind: normalizeText(candidate?.artifactKind ?? candidate?.artifact_kind, 'artifact'),
        trustStatus: normalizeText(candidate?.trustStatus ?? candidate?.trust_status, null),
        placementStatus: normalizeText(candidate?.placementStatus ?? candidate?.placement_status, null),
        lifecycleStatus: normalizeText(candidate?.lifecycleStatus ?? candidate?.lifecycle_status, null),
        slotKey: normalizeText(candidate?.slotKey ?? candidate?.slot_key, null),
        launch: buildPostMortemArtifactLaunch(candidate, topicPath),
      };
    })
    .filter(Boolean);
  const sourceAttemptId = normalizeRefId(
    diagnosticFocus.sourceAttemptRef ?? diagnosticFocus.source_attempt_ref,
    'attemptId',
  );
  const sourceMarkRunId = normalizeRefId(
    diagnosticFocus.sourceMarkRunRef ?? diagnosticFocus.source_mark_run_ref,
    'markRunId',
  );

  return {
    visible: true,
    title: 'Post-mortem review',
    summary: normalizeText(
      diagnosticFocus.summary,
      'Stay anchored to the scored attempt and the saved runtime evidence before starting repair.',
    ),
    scoringPosture: scoringPosture
      ? {
        releaseScopeStatus:
          scoringPosture.releaseScopeStatus ?? scoringPosture.release_scope_status ?? null,
        authoritativeScoringAllowed:
          typeof scoringPosture.authoritativeScoringAllowed === 'boolean'
            ? scoringPosture.authoritativeScoringAllowed
            : scoringPosture.authoritative_scoring_allowed ?? null,
        fallbackReasonCode:
          scoringPosture.fallbackReasonCode ?? scoringPosture.fallback_reason_code ?? null,
      }
      : null,
    diagnosticFocus: {
      title: normalizeText(diagnosticFocus.title, 'Misconception-focused diagnostic'),
      summary: normalizeText(diagnosticFocus.summary, ''),
      sourceQuestionId:
        normalizeText(diagnosticFocus.sourceQuestionId ?? diagnosticFocus.source_question_id, null)
        ?? session.currentQuestionId,
      sourceAttemptId,
      sourceMarkRunId,
      partResults: normalizeArray(diagnosticFocus.partResults ?? diagnosticFocus.part_results),
    },
    misconceptions: misconceptionTags.map((tag) => ({
      tag,
      label: labelForFocusTag(tag),
    })),
    artifactCandidates,
    repairHandoff: repairHandoff
      ? {
        title: normalizeText(repairHandoff.title, 'Repair handoff'),
        message: normalizeText(
          repairHandoff.message,
          'Continue into the next repair step through the canonical runtime flow.',
        ),
        actionLabel: normalizeText(
          repairHandoff.actionLabel ?? repairHandoff.action_label,
          'Launch repair session',
        ),
        launchPayload: repairHandoff.launchPayload ?? repairHandoff.launch_payload ?? null,
      }
      : null,
  };
}

function buildRuntimePostureViewModel(runtimePosture = null) {
  if (!runtimePosture || typeof runtimePosture !== 'object') {
    return null;
  }

  return {
    subjectCode: normalizeText(runtimePosture.subjectCode ?? runtimePosture.subject_code, null),
    readOnly:
      typeof runtimePosture.readOnly === 'boolean'
        ? runtimePosture.readOnly
        : runtimePosture.read_only ?? false,
    authoritativeScoringAllowed:
      typeof runtimePosture.authoritativeScoringAllowed === 'boolean'
        ? runtimePosture.authoritativeScoringAllowed
        : runtimePosture.authoritative_scoring_allowed ?? null,
    fallbackMode: normalizeText(runtimePosture.fallbackMode ?? runtimePosture.fallback_mode, null),
    fallbackReasonCode: normalizeText(
      runtimePosture.fallbackReasonCode ?? runtimePosture.fallback_reason_code,
      null,
    ),
    learningSignalPosture: normalizeText(
      runtimePosture.learningSignalPosture ?? runtimePosture.learning_signal_posture,
      null,
    ),
    fallbackCapabilities: normalizeArray(
      runtimePosture.fallbackCapabilities ?? runtimePosture.fallback_capabilities,
    ).map((capability) => normalizeText(capability, '')).filter(Boolean),
    summary: normalizeText(runtimePosture.summary, null),
  };
}

export function buildSessionViewModel(payload = {}, options = {}) {
  const sessionPayload = payload.session || {};
  const activeScope = sessionPayload.activeScope || sessionPayload.activeScopeBundle || {};
  const currentAnchor = activeScope.currentAnchor || sessionPayload.currentAnchor || null;
  const currentQuestion = sessionPayload.currentQuestion ?? activeScope.currentQuestion ?? null;
  const currentQuestionType = sessionPayload.currentQuestionType ?? activeScope.currentQuestionType ?? null;
  const currentQuestionId = sessionPayload.currentQuestionId ?? currentQuestion?.questionId ?? null;
  const currentQuestionTypeId =
    sessionPayload.currentQuestionTypeId ?? currentQuestionType?.questionTypeId ?? null;
  const lineage = buildSessionLineage(sessionPayload);
  const handoff = sessionPayload.handoff || null;
  const resumeGuidance = sessionPayload.resumeGuidance || null;
  const topicPath =
    payload?.canonicalHomeContext?.topicRef?.topicPath
    ?? activeScope.primaryTopicPath
    ?? currentAnchor?.topicPath
    ?? null;

  const session = {
    sessionId: sessionPayload.sessionId ?? null,
    state: sessionPayload.state ?? 'active',
    mode: sessionPayload.mode ?? null,
    modeLabel: labelForMode(sessionPayload.mode),
    sessionGoal: normalizeText(sessionPayload.sessionGoal, ''),
    currentAnchorKind: activeScope.currentAnchorKind ?? currentAnchor?.kind ?? null,
    currentAnchor,
    currentQuestion,
    currentQuestionId,
    currentQuestionType,
    currentQuestionTypeId,
    hasQuestion: Boolean(currentQuestionId),
    topicPath,
    misconceptionsInFocus: normalizeArray(
      sessionPayload.misconceptionsInFocus ?? sessionPayload.misconceptions_in_focus,
    ),
    keyArtifactRefs: normalizeArray(
      sessionPayload.keyArtifactRefs ?? sessionPayload.key_artifact_refs,
    ),
    lineage,
    handoff,
    resumeGuidance,
    createdAt: sessionPayload.createdAt ?? null,
    updatedAt: sessionPayload.updatedAt ?? null,
  };
  const hasSession = Boolean(session.sessionId);
  const latestResponse = options.latestResponse || payload.latestResponse || null;
  const runtimePosture = buildRuntimePostureViewModel(
    payload.runtimePosture || payload.runtime_posture || null,
  );
  const launcher = buildLauncherViewModel(options.launcher || {});
  const composer = buildComposerViewModel(options.composer || {}, hasSession);
  const continuity = buildContinuityViewModel({
    handoff,
    lineage,
    resumeGuidance,
  });
  const postMortem = buildPostMortemViewModel(sessionPayload, session, topicPath);

  return {
    hasSession,
    session,
    header: {
      modeLabel: hasSession ? session.modeLabel : 'launch a learning session',
      anchorKind: hasSession ? session.currentAnchorKind : launcher.draft.anchorKind,
      anchorLabel: hasSession
        ? buildAnchorLabel(currentAnchor, topicPath)
        : 'Choose a valid anchor and mode to start a runtime session.',
      topicPath: hasSession ? topicPath : launcher.draft.topicPath,
      fallbackMode: latestResponse?.fallbackPosture?.fallbackMode ?? runtimePosture?.fallbackMode ?? null,
      authoritativeScoringAllowed:
        latestResponse?.fallbackPosture?.authoritativeScoringAllowed
        ?? runtimePosture?.authoritativeScoringAllowed
        ?? null,
      fallbackReasonCode:
        latestResponse?.fallbackPosture?.fallbackReasonCode
        ?? runtimePosture?.fallbackReasonCode
        ?? null,
      learningSignalPosture:
        latestResponse?.fallbackPosture?.learningSignalPosture
        ?? runtimePosture?.learningSignalPosture
        ?? null,
      runtimeSummary: runtimePosture?.summary ?? null,
      fallbackCapabilities: runtimePosture?.fallbackCapabilities ?? [],
      handoffKind:
        continuity?.suggestedHandoff?.handoffKindLabel
        || continuity?.lineage?.handoffKindLabel
        || null,
    },
    latestResponse,
    timeline: hasSession ? buildTimeline(session, latestResponse, options.turnHistory || []) : [],
    continuity,
    postMortem,
    launcher,
    composer,
    runtimePosture,
    timelineUpdating: composer.status === 'submitting',
    featureFlags: payload.featureFlags || {},
  };
}

export default buildSessionViewModel;
