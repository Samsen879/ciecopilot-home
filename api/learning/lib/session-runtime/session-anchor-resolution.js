const TERMINAL_REVIEW_TASK_STATUSES = new Set(['completed', 'skipped', 'expired']);
const VALID_WORKSPACE_SLOT_KEYS = new Set([
  'overview_map',
  'core_method_derivation',
  'canonical_worked_example',
  'common_traps',
  'my_notes',
  'review_queue',
]);

function createLearningError(code, {
  status = 500,
  message = 'Internal server error.',
  details = {},
} = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.retryable = false;
  error.details = details;
  return error;
}

async function maybeSingle(query, fallbackMessage) {
  const { data, error } = await query;
  if (error) {
    throw createLearningError('internal_error', {
      status: 500,
      message: error.message || fallbackMessage,
    });
  }
  return data ?? null;
}

async function loadTopic(client, topicId) {
  if (!topicId) return null;
  return maybeSingle(
    client
      .from('curriculum_nodes')
      .select('node_id, topic_path')
      .eq('node_id', topicId)
      .maybeSingle(),
    'Failed to load curriculum node.',
  );
}

async function resolveConceptAnchor(client, {
  subjectCode,
  anchorRef,
  currentQuestionTypeId,
} = {}) {
  const topic = await loadTopic(client, anchorRef.topic_id);

  if (!topic) {
    throw createLearningError('anchor_target_not_found', {
      status: 404,
      message: 'Anchor target not found.',
    });
  }

  if (anchorRef.topic_path && anchorRef.topic_path !== topic.topic_path) {
    throw createLearningError('invalid_anchor_ref', {
      status: 400,
      message: 'Anchor ref does not match the canonical topic path.',
      details: { field: 'anchor_ref.topic_path' },
    });
  }

  if (!String(topic.topic_path || '').startsWith(`${subjectCode}.`)) {
    throw createLearningError('invalid_anchor_ref', {
      status: 400,
      message: 'Concept anchor subject mismatch.',
      details: { field: 'subject_code' },
    });
  }

  return {
    currentQuestionId: null,
    currentQuestionTypeId: currentQuestionTypeId || null,
    canonicalHome: {
      topic_id: topic.node_id,
      topic_path: topic.topic_path,
    },
  };
}

async function resolveQuestionAnchor(client, {
  subjectCode,
  anchorRef,
  currentQuestionId,
  currentQuestionTypeId,
} = {}) {
  const question = await maybeSingle(
    client
      .from('question_bank')
      .select('question_id, subject_code, primary_topic_id, primary_question_type_id')
      .eq('question_id', anchorRef.question_id)
      .maybeSingle(),
    'Failed to load question anchor.',
  );

  if (!question) {
    throw createLearningError('anchor_target_not_found', {
      status: 404,
      message: 'Anchor target not found.',
    });
  }

  if (question.subject_code !== subjectCode) {
    throw createLearningError('invalid_anchor_ref', {
      status: 400,
      message: 'Question anchor subject mismatch.',
      details: { field: 'subject_code' },
    });
  }

  const topic = await loadTopic(client, question.primary_topic_id);
  const resolvedQuestionTypeId = currentQuestionTypeId || question.primary_question_type_id || null;

  return {
    currentQuestionId: currentQuestionId || question.question_id,
    currentQuestionTypeId: resolvedQuestionTypeId,
    canonicalHome: {
      topic_id: topic?.node_id ?? question.primary_topic_id ?? null,
      topic_path: topic?.topic_path ?? resolvedQuestionTypeId ?? null,
    },
  };
}

async function resolveReviewTaskAnchor(client, {
  userId,
  anchorRef,
  currentQuestionId,
  currentQuestionTypeId,
} = {}) {
  const reviewTask = await maybeSingle(
    client
      .from('learning_review_queue_projection')
      .select('*')
      .eq('review_task_id', anchorRef.review_task_id)
      .maybeSingle(),
    'Failed to load review task anchor.',
  );

  if (!reviewTask) {
    throw createLearningError('anchor_target_not_found', {
      status: 404,
      message: 'Anchor target not found.',
    });
  }

  if (reviewTask.user_id !== userId) {
    throw createLearningError('auth_forbidden', {
      status: 403,
      message: 'Authenticated user cannot access this anchor.',
    });
  }

  if (TERMINAL_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    throw createLearningError('session_state_conflict', {
      status: 409,
      message: 'Review task is already terminal.',
    });
  }

  return {
    currentQuestionId: currentQuestionId || reviewTask.source_question_id || null,
    currentQuestionTypeId:
      currentQuestionTypeId || reviewTask.target_question_type_id || null,
    canonicalHome: {
      topic_id: reviewTask.target_topic_id,
      topic_path: reviewTask.target_topic_path,
    },
  };
}

async function resolveWorkspaceSlotAnchor(client, {
  userId,
  anchorRef,
  currentQuestionId,
  currentQuestionTypeId,
} = {}) {
  const workspace = await maybeSingle(
    client
      .from('learning_workspaces')
      .select('workspace_id, user_id, topic_id, topic_path')
      .eq('workspace_id', anchorRef.workspace_id)
      .maybeSingle(),
    'Failed to load workspace anchor.',
  );

  if (!workspace) {
    throw createLearningError('anchor_target_not_found', {
      status: 404,
      message: 'Anchor target not found.',
    });
  }

  if (workspace.user_id !== userId) {
    throw createLearningError('auth_forbidden', {
      status: 403,
      message: 'Authenticated user cannot access this anchor.',
    });
  }

  if (!VALID_WORKSPACE_SLOT_KEYS.has(anchorRef.slot_key)) {
    throw createLearningError('invalid_anchor_ref', {
      status: 400,
      message: 'Workspace slot anchor is invalid.',
      details: { field: 'anchor_ref.slot_key' },
    });
  }

  return {
    currentQuestionId: currentQuestionId || null,
    currentQuestionTypeId: currentQuestionTypeId || null,
    canonicalHome: {
      topic_id: workspace.topic_id,
      topic_path: workspace.topic_path,
    },
  };
}

async function resolveArtifactAnchor(client, {
  userId,
  anchorRef,
  currentQuestionId,
  currentQuestionTypeId,
} = {}) {
  const artifact = await maybeSingle(
    client
      .from('learning_artifacts')
      .select(
        'artifact_id, canonical_home_topic_id, source_session_id, target_question_type_id, lifecycle_status',
      )
      .eq('artifact_id', anchorRef.artifact_id)
      .maybeSingle(),
    'Failed to load artifact anchor.',
  );

  if (!artifact) {
    throw createLearningError('anchor_target_not_found', {
      status: 404,
      message: 'Anchor target not found.',
    });
  }

  if (artifact.lifecycle_status === 'superseded') {
    throw createLearningError('session_state_conflict', {
      status: 409,
      message: 'Artifact cannot be opened from a superseded state.',
    });
  }

  if (artifact.source_session_id) {
    const sourceSession = await maybeSingle(
      client
        .from('learning_sessions')
        .select('session_id, user_id')
        .eq('session_id', artifact.source_session_id)
        .maybeSingle(),
      'Failed to load artifact ownership session.',
    );

    if (sourceSession?.user_id && sourceSession.user_id !== userId) {
      throw createLearningError('auth_forbidden', {
        status: 403,
        message: 'Authenticated user cannot access this anchor.',
      });
    }
  }

  const topic = await loadTopic(client, artifact.canonical_home_topic_id);

  return {
    currentQuestionId: currentQuestionId || null,
    currentQuestionTypeId:
      currentQuestionTypeId || artifact.target_question_type_id || null,
    canonicalHome: {
      topic_id: topic?.node_id ?? artifact.canonical_home_topic_id ?? null,
      topic_path: topic?.topic_path ?? null,
    },
  };
}

export async function resolveCreateSessionAnchor(client, input = {}) {
  const baseInput = {
    userId: input.userId,
    subjectCode: input.subjectCode,
    anchorRef: input.anchorRef,
    currentQuestionId: input.currentQuestionId,
    currentQuestionTypeId: input.currentQuestionTypeId,
  };

  if (input.anchorKind === 'concept') {
    return resolveConceptAnchor(client, baseInput);
  }

  if (input.anchorKind === 'question') {
    return resolveQuestionAnchor(client, baseInput);
  }

  if (input.anchorKind === 'review_task') {
    return resolveReviewTaskAnchor(client, baseInput);
  }

  if (input.anchorKind === 'workspace_slot') {
    return resolveWorkspaceSlotAnchor(client, baseInput);
  }

  if (input.anchorKind === 'artifact') {
    return resolveArtifactAnchor(client, baseInput);
  }

  throw createLearningError('invalid_anchor_kind', {
    status: 400,
    message: 'Anchor kind is invalid.',
    details: { field: 'anchor_kind' },
  });
}
