import {
  STABLE_SLOT_KEYS,
  buildConceptAnchorRef,
  buildQuestionRef,
  buildQuestionTypeRef,
  buildTopicRef,
} from '../contracts/runtime-contract.js';
import {
  PAPER_WORKSPACE_ROUTE,
  normalizePaperScope,
} from './paper-workspace-contract.js';

const SUPPORTED_ENTRY_ANCHOR_KINDS = new Set([
  'paper_scope',
  'topic',
  'concept',
  'question',
  'review_task',
  'artifact',
  'workspace_slot',
]);

const TERMINAL_REVIEW_TASK_STATUSES = new Set(['completed', 'skipped', 'expired']);
const VALID_WORKSPACE_SLOT_KEYS = new Set(STABLE_SLOT_KEYS);

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

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAnchorKind(value) {
  const normalized = normalizeString(value);

  if (normalized === 'paper' || normalized === 'paper_workspace') {
    return 'paper_scope';
  }

  if (normalized === 'topic_id') {
    return 'topic';
  }

  return normalized;
}

function normalizeAnchorInput(input = {}) {
  const anchorRef = isPlainObject(input.anchorRef)
    ? input.anchorRef
    : isPlainObject(input.anchor_ref)
      ? input.anchor_ref
      : isPlainObject(input.entryAnchor)
        ? input.entryAnchor
        : isPlainObject(input.anchor)
          ? input.anchor
          : {};
  const anchorKind = normalizeAnchorKind(
    input.anchorKind ?? input.anchor_kind ?? anchorRef.kind,
  );

  return {
    anchorKind,
    anchorRef,
  };
}

function buildResolverError(code, message, details = {}) {
  return {
    code,
    message,
    retryable: false,
    details,
  };
}

function normalizeErrorDetails(details = {}) {
  return isPlainObject(details) ? details : {};
}

function buildBaseResult({
  ok,
  resolutionStatus,
  anchorKind,
  anchorRef,
  paperWorkspace = null,
  topicSectionFocus = null,
  canonicalTopicOwnership = null,
  linkedReferencePosture,
  activeScopeBundle = null,
  activeScopeCompatibility,
  browseScopeContext = null,
  error = null,
}) {
  return {
    ok,
    resolution_status: resolutionStatus,
    entry_anchor: {
      kind: anchorKind ?? null,
      ref: anchorRef ?? null,
    },
    paper_workspace: paperWorkspace,
    topic_section_focus: topicSectionFocus,
    canonical_topic_ownership: canonicalTopicOwnership,
    linked_reference_posture: linkedReferencePosture,
    active_scope_compatibility: activeScopeCompatibility,
    active_scope_bundle: activeScopeBundle,
    browse_scope_context: browseScopeContext,
    error,
    errors: error ? [error] : [],
  };
}

function buildFailedResult({
  anchorKind,
  anchorRef,
  status = 'failed_closed',
  errorCode,
  message,
  details = {},
  posture = 'failed_closed',
  reasonCode = errorCode,
  paperWorkspace = null,
  topicSectionFocus = null,
  canonicalTopicOwnership = null,
  linkedReferencePosture = {},
}) {
  return buildBaseResult({
    ok: false,
    resolutionStatus: status,
    anchorKind,
    anchorRef,
    paperWorkspace,
    topicSectionFocus,
    canonicalTopicOwnership,
    linkedReferencePosture: {
      posture,
      reason_code: reasonCode,
      ...linkedReferencePosture,
    },
    activeScopeCompatibility: {
      status: 'blocked',
      reason_code: reasonCode,
    },
    error: buildResolverError(errorCode, message, normalizeErrorDetails(details)),
  });
}

async function maybeSingle(query, fallbackMessage) {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || fallbackMessage);
  }

  return data ?? null;
}

async function listRows(query, fallbackMessage) {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || fallbackMessage);
  }

  return Array.isArray(data) ? data : [];
}

function normalizePaperScopeOrNull(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  try {
    return normalizePaperScope(normalized);
  } catch {
    return null;
  }
}

function extractPaperScopeFromValue(value, subjectCode = null) {
  if (!value) {
    return {
      paperScope: null,
      source: null,
      reasonCode: 'paper_scope_missing',
    };
  }

  const direct = normalizePaperScopeOrNull(value);
  if (direct) {
    return {
      paperScope: direct,
      source: 'paper_scope.string',
      reasonCode: null,
    };
  }

  if (!isPlainObject(value)) {
    return {
      paperScope: null,
      source: null,
      reasonCode: 'paper_scope_malformed',
    };
  }

  const explicitKeys = [
    'paper_scope',
    'paperScope',
    'paper_scope_key',
    'paperScopeKey',
    'canonical_paper_scope',
    'canonicalPaperScope',
    'workspace_scope',
    'workspaceScope',
  ];

  for (const key of explicitKeys) {
    const scopedValue = normalizePaperScopeOrNull(value[key]);
    if (scopedValue) {
      return {
        paperScope: scopedValue,
        source: `paper_scope.${key}`,
        reasonCode: null,
      };
    }
  }

  const subject = normalizeString(value.subject_code ?? value.subjectCode ?? subjectCode);
  const paperNumber = normalizeString(value.paper_number ?? value.paperNumber);
  if (subject && /^[0-9]{4}$/.test(subject) && paperNumber && /^[1-9][0-9]*$/.test(paperNumber)) {
    return {
      paperScope: `${subject}:paper:p${paperNumber}`,
      source: 'paper_scope.paper_number',
      reasonCode: null,
    };
  }

  const paper = normalizeString(value.paper);
  if (subject && /^[0-9]{4}$/.test(subject) && paper && /^p?[1-9][0-9]*$/i.test(paper)) {
    const paperSegment = paper.toLowerCase().startsWith('p') ? paper.toLowerCase() : `p${paper}`;
    return {
      paperScope: `${subject}:paper:${paperSegment}`,
      source: 'paper_scope.paper',
      reasonCode: null,
    };
  }

  return {
    paperScope: null,
    source: null,
    reasonCode: 'legacy_question_paper_scope_unresolved',
  };
}

function extractInputPaperScope(input = {}, anchorRef = {}) {
  return extractPaperScopeFromValue(
    input.paperScope
      ?? input.paper_scope
      ?? input.paper_context?.paper_scope
      ?? anchorRef.paper_scope
      ?? anchorRef.paperScope
      ?? anchorRef.paper_scope_key
      ?? anchorRef.paperScopeKey,
    input.subjectCode ?? input.subject_code ?? null,
  );
}

function normalizeTopicSection(section = null) {
  if (!section) {
    return null;
  }

  return {
    paper_workspace_topic_section_id: section.paper_workspace_topic_section_id ?? null,
    topic_id: section.topic_id ?? null,
    topic_path: section.topic_path ?? null,
    topic_workspace_id: section.topic_workspace_id ?? null,
    section_state: isPlainObject(section.section_state) ? section.section_state : {},
    created_at: section.created_at ?? null,
    updated_at: section.updated_at ?? null,
  };
}

function normalizePaperWorkspaceIdentity(projection = null) {
  if (!projection) {
    return null;
  }

  return {
    paper_workspace_id: projection.paper_workspace_id ?? null,
    user_id: projection.user_id ?? null,
    subject_code: projection.subject_code ?? null,
    paper_scope: projection.paper_scope ?? null,
    workspace_kind: projection.workspace_kind ?? 'paper_main',
    route: PAPER_WORKSPACE_ROUTE,
    visible_organization_summary: isPlainObject(projection.visible_organization_summary)
      ? projection.visible_organization_summary
      : {},
    linked_topic_summary: isPlainObject(projection.linked_topic_summary)
      ? projection.linked_topic_summary
      : {},
    created_at: projection.created_at ?? null,
    updated_at: projection.updated_at ?? null,
  };
}

function findTopicSection(projection = null, { topicId = null, topicPath = null } = {}) {
  const normalizedTopicId = normalizeString(topicId);
  const normalizedTopicPath = normalizeString(topicPath);

  if (!projection || (!normalizedTopicId && !normalizedTopicPath)) {
    return null;
  }

  return normalizeArray(projection.topic_sections).find((section) =>
    (!normalizedTopicId || section.topic_id === normalizedTopicId)
    && (!normalizedTopicPath || section.topic_path === normalizedTopicPath)) ?? null;
}

async function loadTopic(client, { topicId = null, topicPath = null } = {}) {
  const normalizedTopicId = normalizeString(topicId);
  const normalizedTopicPath = normalizeString(topicPath);

  if (normalizedTopicId) {
    const topic = await maybeSingle(
      client
        .from('curriculum_nodes')
        .select('node_id, topic_path')
        .eq('node_id', normalizedTopicId)
        .maybeSingle(),
      'Failed to load curriculum topic.',
    );

    if (topic) {
      return {
        topic_id: topic.node_id,
        topic_path: topic.topic_path ?? normalizedTopicPath,
      };
    }
  }

  if (normalizedTopicPath) {
    const topic = await maybeSingle(
      client
        .from('curriculum_nodes')
        .select('node_id, topic_path')
        .eq('topic_path', normalizedTopicPath)
        .maybeSingle(),
      'Failed to load curriculum topic by path.',
    );

    if (topic) {
      return {
        topic_id: topic.node_id,
        topic_path: topic.topic_path,
      };
    }
  }

  if (!normalizedTopicId && !normalizedTopicPath) {
    return null;
  }

  return {
    topic_id: normalizedTopicId,
    topic_path: normalizedTopicPath,
  };
}

async function loadTopicRefs(client, topicIds = []) {
  const refs = [];
  const seen = new Set();

  for (const topicId of normalizeArray(topicIds)) {
    const normalizedTopicId = normalizeString(topicId);
    if (!normalizedTopicId || seen.has(normalizedTopicId)) {
      continue;
    }

    seen.add(normalizedTopicId);
    const topic = await loadTopic(client, { topicId: normalizedTopicId });
    refs.push(buildTopicRef(topic.topic_id, topic.topic_path));
  }

  return refs;
}

async function loadQuestion(client, questionId) {
  const normalizedQuestionId = normalizeString(questionId);
  if (!normalizedQuestionId) {
    return null;
  }

  return maybeSingle(
    client
      .from('question_bank')
      .select(
        'question_id, source_kind, subject_code, paper_scope, primary_topic_id, secondary_topic_ids, family_id, primary_question_type_id, secondary_question_type_ids',
      )
      .eq('question_id', normalizedQuestionId)
      .maybeSingle(),
    'Failed to load question entry anchor.',
  );
}

async function loadReviewTask(client, reviewTaskId) {
  const normalizedReviewTaskId = normalizeString(reviewTaskId);
  if (!normalizedReviewTaskId) {
    return null;
  }

  return maybeSingle(
    client
      .from('learning_review_queue_projection')
      .select('*')
      .eq('review_task_id', normalizedReviewTaskId)
      .maybeSingle(),
    'Failed to load review task entry anchor.',
  );
}

async function loadArtifact(client, artifactId) {
  const normalizedArtifactId = normalizeString(artifactId);
  if (!normalizedArtifactId) {
    return null;
  }

  return maybeSingle(
    client
      .from('learning_artifacts')
      .select(
        'artifact_id, canonical_home_topic_id, source_session_id, target_question_type_id, lifecycle_status',
      )
      .eq('artifact_id', normalizedArtifactId)
      .maybeSingle(),
    'Failed to load artifact entry anchor.',
  );
}

async function loadSession(client, sessionId) {
  const normalizedSessionId = normalizeString(sessionId);
  if (!normalizedSessionId) {
    return null;
  }

  return maybeSingle(
    client
      .from('learning_sessions')
      .select('session_id, user_id, active_scope_bundle')
      .eq('session_id', normalizedSessionId)
      .maybeSingle(),
    'Failed to load source session for entry anchor.',
  );
}

async function loadWorkspace(client, workspaceId) {
  const normalizedWorkspaceId = normalizeString(workspaceId);
  if (!normalizedWorkspaceId) {
    return null;
  }

  return maybeSingle(
    client
      .from('learning_workspaces')
      .select('workspace_id, user_id, topic_id, topic_path')
      .eq('workspace_id', normalizedWorkspaceId)
      .maybeSingle(),
    'Failed to load workspace slot entry anchor.',
  );
}

async function loadPaperWorkspaceByScope(client, { userId, paperScope } = {}) {
  return maybeSingle(
    client
      .from('learning_paper_workspace_projection')
      .select('*')
      .eq('user_id', userId)
      .eq('paper_scope', paperScope)
      .maybeSingle(),
    'Failed to load paper workspace entry scope.',
  );
}

async function listPaperWorkspacesByUser(client, { userId } = {}) {
  return listRows(
    client
      .from('learning_paper_workspace_projection')
      .select('*')
      .eq('user_id', userId),
    'Failed to list paper workspace entry scopes.',
  );
}

async function resolvePaperWorkspaceForTopic(client, {
  userId,
  paperScope = null,
  topicId = null,
  topicPath = null,
} = {}) {
  const normalizedPaperScope = normalizePaperScopeOrNull(paperScope);

  if (paperScope && !normalizedPaperScope) {
    return {
      ok: false,
      status: 'failed_closed',
      errorCode: 'invalid_paper_scope',
      message: 'Paper scope is not a canonical paper workspace scope.',
      posture: 'invalid_paper_scope',
      reasonCode: 'invalid_paper_scope',
    };
  }

  if (normalizedPaperScope) {
    const projection = await loadPaperWorkspaceByScope(client, {
      userId,
      paperScope: normalizedPaperScope,
    });

    if (!projection) {
      return {
        ok: false,
        status: 'failed_closed',
        errorCode: 'paper_workspace_not_found',
        message: 'Paper workspace was not found.',
        posture: 'missing_paper_workspace',
        reasonCode: 'paper_workspace_not_found',
      };
    }

    return {
      ok: true,
      projection,
      topicSection: findTopicSection(projection, {
        topicId,
        topicPath,
      }),
    };
  }

  if (!topicId && !topicPath) {
    return {
      ok: false,
      status: 'degraded',
      errorCode: 'paper_scope_unresolved',
      message: 'Paper scope could not be resolved for this entry anchor.',
      posture: 'degraded_missing_paper_scope',
      reasonCode: 'paper_scope_unresolved',
    };
  }

  const projections = await listPaperWorkspacesByUser(client, { userId });
  const matches = projections
    .map((projection) => ({
      projection,
      topicSection: findTopicSection(projection, {
        topicId,
        topicPath,
      }),
    }))
    .filter((match) => match.topicSection);

  if (matches.length === 0) {
    return {
      ok: false,
      status: 'degraded',
      errorCode: 'paper_scope_unresolved',
      message: 'No paper workspace topic section matched this entry anchor.',
      posture: 'degraded_missing_paper_scope',
      reasonCode: 'no_paper_workspace_matches_topic',
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      status: 'failed_closed',
      errorCode: 'ambiguous_paper_scope',
      message: 'More than one paper workspace matched this entry anchor.',
      posture: 'ambiguous_paper_scope',
      reasonCode: 'multiple_paper_workspaces_match_topic',
      details: {
        paper_scopes: matches.map((match) => match.projection.paper_scope),
      },
    };
  }

  return {
    ok: true,
    ...matches[0],
  };
}

function buildCanonicalTopicOwnership(topic, source) {
  if (!topic?.topic_id && !topic?.topic_path) {
    return null;
  }

  return {
    owner_kind: 'topic',
    topic_id: topic.topic_id ?? null,
    topic_path: topic.topic_path ?? null,
    authority: 'canonical_home',
    source,
  };
}

function normalizeQuestionTypeRef(questionTypeId) {
  const normalizedQuestionTypeId = normalizeString(questionTypeId);
  return normalizedQuestionTypeId ? buildQuestionTypeRef(normalizedQuestionTypeId) : null;
}

function normalizeQuestionRef(questionId) {
  const normalizedQuestionId = normalizeString(questionId);
  return normalizedQuestionId ? buildQuestionRef(normalizedQuestionId) : null;
}

function buildCurrentAnchorForActiveScope(anchorKind, anchorRef, topic = null) {
  if (anchorKind === 'topic' || anchorKind === 'concept') {
    return {
      current_anchor_kind: 'concept',
      current_anchor_ref: buildConceptAnchorRef(topic?.topic_id, topic?.topic_path),
    };
  }

  return {
    current_anchor_kind: anchorKind,
    current_anchor_ref: anchorRef,
  };
}

function buildActiveScopeBundle({
  anchorKind,
  anchorRef,
  topic,
  paperProjection,
  topicSection,
  secondaryTopicRefs = [],
  questionId = null,
  questionTypeId = null,
  mode = null,
  sessionGoal = null,
} = {}) {
  if (!topic?.topic_id || anchorKind === 'paper_scope') {
    return null;
  }

  const activeAnchor = buildCurrentAnchorForActiveScope(anchorKind, anchorRef, topic);

  return {
    primary_topic_id: topic.topic_id,
    primary_topic_path: topic.topic_path ?? null,
    secondary_topics_in_scope: secondaryTopicRefs,
    allowed_prerequisites: [],
    paper_context: {
      paper_scope: paperProjection?.paper_scope ?? null,
      paper_workspace_ref: paperProjection?.paper_workspace_id
        ? {
          kind: 'paper_workspace',
          paper_workspace_id: paperProjection.paper_workspace_id,
        }
        : null,
      topic_section_ref: topicSection?.paper_workspace_topic_section_id
        ? {
          kind: 'paper_workspace_topic_section',
          paper_workspace_topic_section_id: topicSection.paper_workspace_topic_section_id,
          topic_id: topicSection.topic_id ?? null,
        }
        : null,
    },
    mode,
    session_goal: sessionGoal,
    ...activeAnchor,
    current_question_ref: normalizeQuestionRef(questionId),
    current_question_type_ref: normalizeQuestionTypeRef(questionTypeId),
  };
}

function buildBrowseScopeContext({
  resolutionStatus,
  anchorKind,
  anchorRef,
  paperWorkspace,
  topicSectionFocus,
  linkedReferencePosture,
  subjectCode = null,
} = {}) {
  return {
    subject_code: paperWorkspace?.subject_code ?? subjectCode ?? null,
    paper_scope: paperWorkspace?.paper_scope ?? null,
    current_anchor_kind: anchorKind ?? null,
    current_anchor_ref: anchorRef ?? null,
    topic_section_focus: topicSectionFocus,
    resolution_status: resolutionStatus,
    linked_reference_posture: linkedReferencePosture,
  };
}

function buildResolvedResult({
  anchorKind,
  anchorRef,
  paperProjection,
  topicSection = null,
  canonicalTopicOwnership = null,
  linkedReferencePosture,
  activeScopeBundle = null,
  subjectCode = null,
}) {
  const paperWorkspace = normalizePaperWorkspaceIdentity(paperProjection);
  const topicSectionFocus = normalizeTopicSection(topicSection);
  const activeScopeCompatibility = activeScopeBundle
    ? {
      status: 'compatible',
      reason_code: 'active_scope_bundle_ready',
    }
    : {
      status: 'degraded',
      reason_code: 'paper_scope_anchor_requires_formal_topic_or_object_anchor',
    };

  return buildBaseResult({
    ok: true,
    resolutionStatus: 'resolved',
    anchorKind,
    anchorRef,
    paperWorkspace,
    topicSectionFocus,
    canonicalTopicOwnership,
    linkedReferencePosture,
    activeScopeBundle,
    activeScopeCompatibility,
    browseScopeContext: buildBrowseScopeContext({
      resolutionStatus: 'resolved',
      anchorKind,
      anchorRef,
      paperWorkspace,
      topicSectionFocus,
      linkedReferencePosture,
      subjectCode,
    }),
  });
}

function buildPaperResolutionFailure({
  anchorKind,
  anchorRef,
  paperResolution,
  canonicalTopicOwnership = null,
  reasonCode = null,
  posture = null,
  linkedReferencePosture = {},
}) {
  return buildFailedResult({
    anchorKind,
    anchorRef,
    status: paperResolution.status,
    errorCode: paperResolution.errorCode,
    message: paperResolution.message,
    details: paperResolution.details,
    posture: posture ?? paperResolution.posture,
    reasonCode: reasonCode ?? paperResolution.reasonCode,
    canonicalTopicOwnership,
    linkedReferencePosture,
  });
}

function buildSourceAttributionRefs({ sourceQuestion = null, sourceTopic = null, targetTopic = null } = {}) {
  const refs = [];

  if (sourceQuestion?.question_id) {
    refs.push(buildQuestionRef(sourceQuestion.question_id));
  }

  if (
    sourceTopic?.topic_id
    && sourceTopic.topic_id !== targetTopic?.topic_id
  ) {
    refs.push(buildTopicRef(sourceTopic.topic_id, sourceTopic.topic_path));
  }

  return refs;
}

async function resolveDirectPaperScope(client, input, anchorKind, anchorRef) {
  const extracted = extractInputPaperScope(input, anchorRef);
  if (!extracted.paperScope) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: extracted.reasonCode || 'paper_scope_unresolved',
      message: 'Paper scope could not be resolved for this entry anchor.',
      posture: 'degraded_missing_paper_scope',
      reasonCode: extracted.reasonCode || 'paper_scope_unresolved',
      status: 'degraded',
    });
  }

  const paperResolution = await resolvePaperWorkspaceForTopic(client, {
    userId: input.userId,
    paperScope: extracted.paperScope,
  });

  if (!paperResolution.ok) {
    return buildPaperResolutionFailure({
      anchorKind,
      anchorRef,
      paperResolution,
    });
  }

  return buildResolvedResult({
    anchorKind,
    anchorRef,
    paperProjection: paperResolution.projection,
    linkedReferencePosture: {
      posture: 'paper_scope_only',
      reason_code: 'direct_paper_scope_anchor',
      secondary_topic_refs: [],
      source_refs: [],
    },
    subjectCode: paperResolution.projection.subject_code,
  });
}

async function resolveTopicEntry(client, input, anchorKind, anchorRef) {
  const topic = await loadTopic(client, {
    topicId: anchorRef.topic_id ?? input.topicId ?? input.topic_id,
    topicPath: anchorRef.topic_path ?? input.topicPath ?? input.topic_path,
  });

  if (!topic?.topic_id && !topic?.topic_path) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'anchor_target_not_found',
      message: 'Topic entry anchor target was not found.',
      posture: 'missing_anchor_target',
      reasonCode: 'topic_not_found',
    });
  }

  const paperHint = extractInputPaperScope(input, anchorRef);
  const paperResolution = await resolvePaperWorkspaceForTopic(client, {
    userId: input.userId,
    paperScope: paperHint.paperScope,
    topicId: topic.topic_id,
    topicPath: topic.topic_path,
  });
  const canonicalTopicOwnership = buildCanonicalTopicOwnership(topic, 'topic.anchor');

  if (!paperResolution.ok) {
    return buildPaperResolutionFailure({
      anchorKind,
      anchorRef,
      paperResolution,
      canonicalTopicOwnership,
    });
  }

  if (!paperResolution.topicSection) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'degraded',
      errorCode: 'topic_section_not_found',
      message: 'Paper workspace does not contain this canonical topic section.',
      posture: 'degraded_missing_topic_section',
      reasonCode: 'topic_section_not_found',
      paperWorkspace: normalizePaperWorkspaceIdentity(paperResolution.projection),
      canonicalTopicOwnership,
    });
  }

  const activeScopeBundle = buildActiveScopeBundle({
    anchorKind,
    anchorRef,
    topic,
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
  });

  return buildResolvedResult({
    anchorKind,
    anchorRef,
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    canonicalTopicOwnership,
    linkedReferencePosture: {
      posture: 'canonical_home',
      reason_code: 'canonical_topic_in_paper_workspace',
      secondary_topic_refs: [],
      source_refs: [],
    },
    activeScopeBundle,
  });
}

async function resolveQuestionEntry(client, input, anchorKind, anchorRef) {
  const question = await loadQuestion(client, anchorRef.question_id ?? input.questionId ?? input.question_id);
  if (!question) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'anchor_target_not_found',
      message: 'Question entry anchor target was not found.',
      posture: 'missing_anchor_target',
      reasonCode: 'question_not_found',
    });
  }

  const primaryTopic = await loadTopic(client, {
    topicId: question.primary_topic_id,
  });
  const secondaryTopicRefs = await loadTopicRefs(client, question.secondary_topic_ids);
  const canonicalTopicOwnership = buildCanonicalTopicOwnership(primaryTopic, 'question.primary_topic');
  const questionPaperScope = extractPaperScopeFromValue(
    question.paper_scope,
    question.subject_code ?? input.subjectCode ?? input.subject_code,
  );

  if (!questionPaperScope.paperScope) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'degraded',
      errorCode: 'paper_scope_unresolved',
      message: 'Question paper scope could not be resolved without guessing from topic membership.',
      posture: 'degraded_missing_paper_scope',
      reasonCode: questionPaperScope.reasonCode || 'legacy_question_paper_scope_unresolved',
      canonicalTopicOwnership,
    });
  }

  const paperResolution = await resolvePaperWorkspaceForTopic(client, {
    userId: input.userId,
    paperScope: questionPaperScope.paperScope,
    topicId: primaryTopic?.topic_id,
    topicPath: primaryTopic?.topic_path,
  });

  if (!paperResolution.ok) {
    return buildPaperResolutionFailure({
      anchorKind,
      anchorRef,
      paperResolution,
      canonicalTopicOwnership,
    });
  }

  if (!paperResolution.topicSection) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'degraded',
      errorCode: 'topic_section_not_found',
      message: 'Question canonical topic is not present in the resolved paper workspace.',
      posture: 'canonical_topic_outside_paper_workspace',
      reasonCode: 'question_primary_topic_not_in_paper_workspace',
      paperWorkspace: normalizePaperWorkspaceIdentity(paperResolution.projection),
      canonicalTopicOwnership,
      linkedReferencePosture: {
        secondary_topic_refs: secondaryTopicRefs,
        source_refs: [buildQuestionRef(question.question_id)],
      },
    });
  }

  const activeScopeBundle = buildActiveScopeBundle({
    anchorKind,
    anchorRef: {
      kind: 'question',
      question_id: question.question_id,
    },
    topic: primaryTopic,
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    secondaryTopicRefs,
    questionId: question.question_id,
    questionTypeId: question.primary_question_type_id,
  });

  return buildResolvedResult({
    anchorKind,
    anchorRef: {
      kind: 'question',
      question_id: question.question_id,
    },
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    canonicalTopicOwnership,
    linkedReferencePosture: {
      posture: secondaryTopicRefs.length > 0
        ? 'canonical_home_with_secondary_links'
        : 'canonical_home',
      reason_code: secondaryTopicRefs.length > 0
        ? 'secondary_topics_are_linked_references'
        : 'canonical_topic_in_paper_workspace',
      secondary_topic_refs: secondaryTopicRefs,
      source_refs: [],
    },
    activeScopeBundle,
    subjectCode: question.subject_code,
  });
}

async function resolveReviewTaskEntry(client, input, anchorKind, anchorRef) {
  const reviewTask = await loadReviewTask(
    client,
    anchorRef.review_task_id ?? input.reviewTaskId ?? input.review_task_id,
  );

  if (!reviewTask) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'anchor_target_not_found',
      message: 'Review task entry anchor target was not found.',
      posture: 'missing_anchor_target',
      reasonCode: 'review_task_not_found',
    });
  }

  if (reviewTask.user_id !== input.userId) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'auth_forbidden',
      message: 'Authenticated user cannot access this review task anchor.',
      posture: 'forbidden_anchor_target',
      reasonCode: 'review_task_user_mismatch',
    });
  }

  if (TERMINAL_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'failed_closed',
      errorCode: 'session_state_conflict',
      message: 'Review task is already terminal.',
      posture: 'terminal_anchor_target',
      reasonCode: 'review_task_terminal',
    });
  }

  const targetTopic = await loadTopic(client, {
    topicId: reviewTask.target_topic_id,
    topicPath: reviewTask.target_topic_path,
  });
  const sourceQuestion = await loadQuestion(client, reviewTask.source_question_id);
  const sourceTopic = sourceQuestion
    ? await loadTopic(client, { topicId: sourceQuestion.primary_topic_id })
    : null;
  const sourcePaperScope = sourceQuestion
    ? extractPaperScopeFromValue(sourceQuestion.paper_scope, sourceQuestion.subject_code)
    : { paperScope: null };
  const inputPaperScope = extractInputPaperScope(input, anchorRef);
  const paperScopeWasExplicit = Boolean(inputPaperScope.paperScope);
  let paperResolution = await resolvePaperWorkspaceForTopic(client, {
    userId: input.userId,
    paperScope: inputPaperScope.paperScope ?? sourcePaperScope.paperScope,
    topicId: targetTopic?.topic_id,
    topicPath: targetTopic?.topic_path,
  });
  const canonicalTopicOwnership = buildCanonicalTopicOwnership(targetTopic, 'review_task.target_topic');

  if (
    !paperScopeWasExplicit
    && sourcePaperScope.paperScope
    && (!paperResolution.ok || !paperResolution.topicSection)
  ) {
    const fallbackPaperResolution = inputPaperScope.paperScope || sourcePaperScope.paperScope
      ? await resolvePaperWorkspaceForTopic(client, {
        userId: input.userId,
        topicId: targetTopic?.topic_id,
        topicPath: targetTopic?.topic_path,
      })
      : paperResolution;

    if (fallbackPaperResolution.ok) {
      paperResolution = fallbackPaperResolution;
    }
  }

  if (!paperResolution.ok) {
    return buildPaperResolutionFailure({
      anchorKind,
      anchorRef,
      paperResolution,
      canonicalTopicOwnership,
    });
  }

  if (!paperResolution.topicSection) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'degraded',
      errorCode: 'topic_section_not_found',
      message: 'Review task target topic is not present in the resolved paper workspace.',
      posture: 'canonical_topic_outside_paper_workspace',
      reasonCode: 'review_task_target_topic_not_in_paper_workspace',
      paperWorkspace: normalizePaperWorkspaceIdentity(paperResolution.projection),
      canonicalTopicOwnership,
    });
  }

  const sourceRefs = buildSourceAttributionRefs({
    sourceQuestion,
    sourceTopic,
    targetTopic,
  });
  const activeScopeBundle = buildActiveScopeBundle({
    anchorKind,
    anchorRef: {
      kind: 'review_task',
      review_task_id: reviewTask.review_task_id,
    },
    topic: targetTopic,
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    questionId: reviewTask.source_question_id,
    questionTypeId: reviewTask.target_question_type_id,
  });

  return buildResolvedResult({
    anchorKind,
    anchorRef: {
      kind: 'review_task',
      review_task_id: reviewTask.review_task_id,
    },
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    canonicalTopicOwnership,
    linkedReferencePosture: {
      posture: sourceRefs.length > 0
        ? 'canonical_home_with_source_attribution'
        : 'canonical_home',
      reason_code: sourceRefs.length > 0
        ? 'source_question_is_linked_reference'
        : 'canonical_topic_in_paper_workspace',
      secondary_topic_refs: [],
      source_refs: sourceRefs,
    },
    activeScopeBundle,
  });
}

async function resolveArtifactEntry(client, input, anchorKind, anchorRef) {
  const artifact = await loadArtifact(client, anchorRef.artifact_id ?? input.artifactId ?? input.artifact_id);

  if (!artifact) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'anchor_target_not_found',
      message: 'Artifact entry anchor target was not found.',
      posture: 'missing_anchor_target',
      reasonCode: 'artifact_not_found',
    });
  }

  if (artifact.lifecycle_status === 'superseded') {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'failed_closed',
      errorCode: 'session_state_conflict',
      message: 'Artifact cannot be opened from a superseded state.',
      posture: 'terminal_anchor_target',
      reasonCode: 'artifact_superseded',
    });
  }

  const sourceSession = await loadSession(client, artifact.source_session_id);
  if (sourceSession?.user_id && sourceSession.user_id !== input.userId) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'auth_forbidden',
      message: 'Authenticated user cannot access this artifact anchor.',
      posture: 'forbidden_anchor_target',
      reasonCode: 'artifact_source_session_user_mismatch',
    });
  }

  const canonicalTopic = await loadTopic(client, {
    topicId: artifact.canonical_home_topic_id,
  });
  const sourceSessionPaperScope = extractPaperScopeFromValue(
    sourceSession?.active_scope_bundle?.paper_context?.paper_scope,
  );
  const inputPaperScope = extractInputPaperScope(input, anchorRef);
  const paperResolution = await resolvePaperWorkspaceForTopic(client, {
    userId: input.userId,
    paperScope: inputPaperScope.paperScope ?? sourceSessionPaperScope.paperScope,
    topicId: canonicalTopic?.topic_id,
    topicPath: canonicalTopic?.topic_path,
  });
  const canonicalTopicOwnership = buildCanonicalTopicOwnership(
    canonicalTopic,
    'artifact.canonical_home_topic',
  );

  if (!paperResolution.ok) {
    return buildPaperResolutionFailure({
      anchorKind,
      anchorRef,
      paperResolution,
      canonicalTopicOwnership,
    });
  }

  if (!paperResolution.topicSection) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'degraded',
      errorCode: 'topic_section_not_found',
      message: 'Artifact canonical topic is not present in the resolved paper workspace.',
      posture: 'canonical_topic_outside_paper_workspace',
      reasonCode: 'artifact_canonical_topic_not_in_paper_workspace',
      paperWorkspace: normalizePaperWorkspaceIdentity(paperResolution.projection),
      canonicalTopicOwnership,
    });
  }

  const activeScopeBundle = buildActiveScopeBundle({
    anchorKind,
    anchorRef: {
      kind: 'artifact',
      artifact_id: artifact.artifact_id,
    },
    topic: canonicalTopic,
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    questionTypeId: artifact.target_question_type_id,
  });

  return buildResolvedResult({
    anchorKind,
    anchorRef: {
      kind: 'artifact',
      artifact_id: artifact.artifact_id,
    },
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    canonicalTopicOwnership,
    linkedReferencePosture: {
      posture: 'canonical_home',
      reason_code: 'canonical_topic_in_paper_workspace',
      secondary_topic_refs: [],
      source_refs: sourceSession?.session_id
        ? [{ kind: 'session', session_id: sourceSession.session_id }]
        : [],
    },
    activeScopeBundle,
  });
}

async function resolveWorkspaceSlotEntry(client, input, anchorKind, anchorRef) {
  const slotKey = normalizeString(anchorRef.slot_key ?? input.slotKey ?? input.slot_key);

  if (!VALID_WORKSPACE_SLOT_KEYS.has(slotKey)) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'invalid_anchor_ref',
      message: 'Workspace slot anchor is invalid.',
      posture: 'invalid_anchor_ref',
      reasonCode: 'workspace_slot_key_invalid',
      details: { field: 'anchor_ref.slot_key' },
    });
  }

  const workspace = await loadWorkspace(client, anchorRef.workspace_id ?? input.workspaceId ?? input.workspace_id);
  if (!workspace) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'anchor_target_not_found',
      message: 'Workspace slot entry anchor target was not found.',
      posture: 'missing_anchor_target',
      reasonCode: 'workspace_not_found',
    });
  }

  if (workspace.user_id !== input.userId) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'auth_forbidden',
      message: 'Authenticated user cannot access this workspace slot anchor.',
      posture: 'forbidden_anchor_target',
      reasonCode: 'workspace_user_mismatch',
    });
  }

  const topic = await loadTopic(client, {
    topicId: workspace.topic_id,
    topicPath: workspace.topic_path,
  });
  const paperHint = extractInputPaperScope(input, anchorRef);
  const paperResolution = await resolvePaperWorkspaceForTopic(client, {
    userId: input.userId,
    paperScope: paperHint.paperScope,
    topicId: topic?.topic_id,
    topicPath: topic?.topic_path,
  });
  const canonicalTopicOwnership = buildCanonicalTopicOwnership(topic, 'workspace_slot.topic_workspace');

  if (!paperResolution.ok) {
    return buildPaperResolutionFailure({
      anchorKind,
      anchorRef,
      paperResolution,
      canonicalTopicOwnership,
    });
  }

  if (!paperResolution.topicSection) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      status: 'degraded',
      errorCode: 'topic_section_not_found',
      message: 'Workspace slot topic is not present in the resolved paper workspace.',
      posture: 'degraded_missing_topic_section',
      reasonCode: 'workspace_topic_not_in_paper_workspace',
      paperWorkspace: normalizePaperWorkspaceIdentity(paperResolution.projection),
      canonicalTopicOwnership,
    });
  }

  const normalizedAnchorRef = {
    kind: 'workspace_slot',
    workspace_id: workspace.workspace_id,
    slot_key: slotKey,
  };
  const activeScopeBundle = buildActiveScopeBundle({
    anchorKind,
    anchorRef: normalizedAnchorRef,
    topic,
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
  });

  return buildResolvedResult({
    anchorKind,
    anchorRef: normalizedAnchorRef,
    paperProjection: paperResolution.projection,
    topicSection: paperResolution.topicSection,
    canonicalTopicOwnership,
    linkedReferencePosture: {
      posture: 'canonical_home',
      reason_code: 'canonical_topic_in_paper_workspace',
      secondary_topic_refs: [],
      source_refs: [],
    },
    activeScopeBundle,
  });
}

export async function resolvePaperWorkspaceEntryAnchor(client, input = {}) {
  const { anchorKind, anchorRef } = normalizeAnchorInput(input);

  if (!SUPPORTED_ENTRY_ANCHOR_KINDS.has(anchorKind)) {
    return buildFailedResult({
      anchorKind,
      anchorRef,
      errorCode: 'unsupported_anchor_kind',
      message: 'Entry anchor kind is not supported by the paper workspace resolver.',
      posture: 'unsupported_anchor',
      reasonCode: 'unsupported_anchor_kind',
      details: {
        supported_anchor_kinds: [...SUPPORTED_ENTRY_ANCHOR_KINDS],
      },
    });
  }

  if (anchorKind === 'paper_scope') {
    return resolveDirectPaperScope(client, input, anchorKind, anchorRef);
  }

  if (anchorKind === 'topic' || anchorKind === 'concept') {
    return resolveTopicEntry(client, input, anchorKind, anchorRef);
  }

  if (anchorKind === 'question') {
    return resolveQuestionEntry(client, input, anchorKind, anchorRef);
  }

  if (anchorKind === 'review_task') {
    return resolveReviewTaskEntry(client, input, anchorKind, anchorRef);
  }

  if (anchorKind === 'artifact') {
    return resolveArtifactEntry(client, input, anchorKind, anchorRef);
  }

  return resolveWorkspaceSlotEntry(client, input, anchorKind, anchorRef);
}
