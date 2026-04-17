import { jest } from '@jest/globals';

const mockGetServiceClient = jest.fn();

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const {
  getWorkspaceView,
  listReviewTasks,
} = await import('../lib/workspaces/workspace-read-service.js');
const { applyLearningEffects } = await import('../lib/mastery/mastery-orchestrator.js');
const { patchLearningReviewTask } = await import('../lib/review/review-task-service.js');
const { patchLearningArtifact } = await import('../lib/artifacts/artifact-service.js');
const { default: workspaceHandler } = await import('../workspaces/[topicId].js');
const { default: reviewTasksHandler } = await import('../review-tasks/index.js');

function createLearningDb(overrides = {}) {
  const queries = [];
  const workspaceProjection = overrides.workspaceProjection ?? {
    workspace_id: 'workspace-1',
    user_id: 'student-1',
    topic_id: 'topic-1',
    topic_path: '9709/trigonometry/equations',
    slot_state: {
      common_traps: 'active',
      review_queue: 'active',
    },
    linked_reference_summary: {
      total_linked_references: 3,
    },
    updated_at: '2026-03-22T08:00:00.000Z',
    slots: [
      {
        workspace_slot_id: 'slot-common-traps',
        slot_key: 'common_traps',
        primary_artifact_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-primary',
        },
        linked_reference_refs: [
          { kind: 'artifact', artifact_id: 'artifact-primary' },
          { kind: 'artifact', artifact_id: 'artifact-linked-1' },
          { kind: 'artifact', artifact_id: 'artifact-linked-1' },
        ],
        updated_at: '2026-03-22T08:00:00.000Z',
      },
      {
        workspace_slot_id: 'slot-review-queue',
        slot_key: 'review_queue',
        primary_artifact_ref: null,
        linked_reference_refs: [
          { kind: 'review_task', review_task_id: 'review-queued-1' },
        ],
        updated_at: '2026-03-22T08:05:00.000Z',
      },
    ],
  };

  const reviewTaskRows = overrides.reviewTaskRows ?? [
    {
      review_task_id: 'review-queued-1',
      user_id: 'student-1',
      target_kind: 'question_type',
      target_topic_id: 'topic-1',
      target_topic_path: '9709/trigonometry/equations',
      target_family_id: '9709.trigonometry_manipulation_equations',
      target_family_title: 'Trigonometric manipulation / equations',
      target_question_type_id: '9709.trigonometry.equations',
      target_question_type_title: 'Trigonometric equations',
      target_misconception_tags: ['domain:interval'],
      related_artifact_refs: [],
      source_question_id: 'question-1',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
      trigger_type: 'immediate_repair',
      mode: 'trap_fix',
      due_at: '2026-03-23T00:00:00.000Z',
      priority: 'high',
      estimated_minutes: 15,
      success_criteria: {
        scheduler_policy: {
          route: 'immediate_repair',
          freshness_bucket: 'fresh',
        },
        explainability: {
          attempt_history: {
            attempt_count: 2,
            latest_source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1b' },
            source_attempt_refs: [
              { kind: 'attempt', attempt_id: 'attempt-1' },
              { kind: 'attempt', attempt_id: 'attempt-1b' },
            ],
            source_question_ids: ['question-1', 'question-1b'],
          },
        },
      },
      completion_evidence: {},
      status: 'open',
      created_at: '2026-03-22T08:10:00.000Z',
      updated_at: '2026-03-22T08:10:00.000Z',
    },
    {
      review_task_id: 'review-other-topic',
      user_id: 'student-1',
      target_kind: 'question_type',
      target_topic_id: 'topic-2',
      target_topic_path: '9709/trigonometry/identities',
      target_family_id: '9709.trigonometry_manipulation_equations',
      target_family_title: 'Trigonometric manipulation / equations',
      target_question_type_id: '9709.trigonometry.identities',
      target_question_type_title: 'Trigonometric identities',
      target_misconception_tags: [],
      related_artifact_refs: [],
      source_question_id: 'question-2',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-2' },
      trigger_type: 'marking_outcome',
      mode: 'redo_variant',
      due_at: '2026-03-24T00:00:00.000Z',
      priority: 'normal',
      estimated_minutes: 10,
      success_criteria: {},
      completion_evidence: {},
      status: 'open',
      created_at: '2026-03-22T08:15:00.000Z',
      updated_at: '2026-03-22T08:15:00.000Z',
    },
    {
      review_task_id: 'review-overload-1',
      user_id: 'student-1',
      target_kind: 'question_type',
      target_topic_id: 'topic-3',
      target_topic_path: '9709/trigonometry/functions',
      target_family_id: '9709.trigonometry_manipulation_equations',
      target_family_title: 'Trigonometric manipulation / equations',
      target_question_type_id: '9709.trigonometry.functions',
      target_question_type_title: 'Trigonometric functions',
      target_misconception_tags: [],
      related_artifact_refs: [],
      source_question_id: 'question-3',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-3' },
      trigger_type: 'immediate_repair',
      mode: 'trap_fix',
      due_at: '2026-03-22T07:00:00.000Z',
      priority: 'high',
      estimated_minutes: 12,
      success_criteria: {
        scheduler_policy: {
          route: 'immediate_repair',
          freshness_bucket: 'fresh',
        },
      },
      completion_evidence: {},
      status: 'open',
      created_at: '2026-03-22T08:05:00.000Z',
      updated_at: '2026-03-22T08:05:00.000Z',
    },
    {
      review_task_id: 'review-overload-2',
      user_id: 'student-1',
      target_kind: 'question_type',
      target_topic_id: 'topic-4',
      target_topic_path: '9709/trigonometry/mixed',
      target_family_id: '9709.trigonometry_manipulation_equations',
      target_family_title: 'Trigonometric manipulation / equations',
      target_question_type_id: '9709.trigonometry.mixed',
      target_question_type_title: 'Mixed trigonometric practice',
      target_misconception_tags: [],
      related_artifact_refs: [],
      source_question_id: 'question-4',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-4' },
      trigger_type: 'regression_recovery',
      mode: 'redo_variant',
      due_at: '2026-03-22T07:30:00.000Z',
      priority: 'urgent',
      estimated_minutes: 20,
      success_criteria: {
        scheduler_policy: {
          route: 'regression_recovery',
          freshness_bucket: 'stale',
        },
      },
      completion_evidence: {},
      status: 'open',
      created_at: '2026-03-22T08:07:00.000Z',
      updated_at: '2026-03-22T08:07:00.000Z',
    },
    {
      review_task_id: 'review-overload-3',
      user_id: 'student-1',
      target_kind: 'question_type',
      target_topic_id: 'topic-5',
      target_topic_path: '9709/trigonometry/revision',
      target_family_id: '9709.trigonometry_manipulation_equations',
      target_family_title: 'Trigonometric manipulation / equations',
      target_question_type_id: '9709.trigonometry.revision',
      target_question_type_title: 'Revision sprint',
      target_misconception_tags: [],
      related_artifact_refs: [],
      source_question_id: 'question-5',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-5' },
      trigger_type: 'exam_polish',
      mode: 'timed_check',
      due_at: '2026-03-22T07:45:00.000Z',
      priority: 'high',
      estimated_minutes: 18,
      success_criteria: {
        scheduler_policy: {
          route: 'exam_polish',
          freshness_bucket: 'cooling',
        },
      },
      completion_evidence: {},
      status: 'open',
      created_at: '2026-03-22T08:08:00.000Z',
      updated_at: '2026-03-22T08:08:00.000Z',
    },
  ];

  const artifactRows = overrides.artifactRows ?? [
    {
      artifact_id: 'artifact-primary',
      artifact_kind: 'misconception_card',
      canonical_home_topic_id: 'topic-1',
      slot_key: 'common_traps',
      trust_status: 'grounded',
      placement_status: 'pinned',
      lifecycle_status: 'active',
      artifact_state: 'verified',
      verified_by: 'operator-1',
      verified_at: '2026-03-22T07:40:00.000Z',
      verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
      updated_at: '2026-03-22T08:00:00.000Z',
    },
    {
      artifact_id: 'artifact-successor-unverified',
      artifact_kind: 'misconception_card',
      canonical_home_topic_id: 'topic-1',
      slot_key: 'common_traps',
      trust_status: 'unverified',
      placement_status: 'inbox',
      lifecycle_status: 'active',
      artifact_state: 'unverified',
      verified_by: null,
      verified_at: null,
      verification_evidence_ref: null,
      updated_at: '2026-03-22T08:04:00.000Z',
    },
  ];

  const artifactContentVersionRows = overrides.artifactContentVersionRows ?? [];

  const sessionRows = overrides.sessionRows ?? [
    {
      session_id: 'session-topic-2-later',
      user_id: 'student-1',
      subject_code: '9709',
      session_goal: 'Refresh trig identities',
      mode: 'learn_concept',
      state: 'active',
      active_scope_bundle: {
        primary_topic_id: 'topic-2',
        primary_topic_path: '9709/trigonometry/identities',
        mode: 'learn_concept',
        current_anchor_kind: 'concept',
        current_anchor_ref: {
          kind: 'concept',
          topic_id: 'topic-2',
          topic_path: '9709/trigonometry/identities',
        },
        current_question_ref: null,
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.identities',
        },
      },
      current_anchor_kind: 'concept',
      current_anchor_ref: {
        kind: 'concept',
        topic_id: 'topic-2',
        topic_path: '9709/trigonometry/identities',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.identities',
      summary_state: {
        resume_title: 'Resume identities review',
        resume_message: 'Return to the concept anchor for identities.',
        resume_summary: 'Carry the identities recap into the next pass.',
      },
      open_questions: [],
      key_artifact_refs: [],
      misconceptions_in_focus: [],
      lineage_ref: {
        parent_session_id: null,
        handoff_kind: null,
      },
      created_at: '2026-03-22T08:20:00.000Z',
      updated_at: '2026-03-22T08:30:00.000Z',
      parent_session_id: null,
      handoff_kind: null,
      summary_snapshot: {
        recap: 'Identity recap.',
      },
    },
    {
      session_id: 'session-topic-1-current',
      user_id: 'student-1',
      subject_code: '9709',
      session_goal: 'Close the interval misconception',
      mode: 'post_mortem_review',
      state: 'active',
      active_scope_bundle: {
        primary_topic_id: 'topic-1',
        primary_topic_path: '9709/trigonometry/equations',
        mode: 'post_mortem_review',
        current_anchor_kind: 'artifact',
        current_anchor_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-primary',
        },
        current_question_ref: null,
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.equations',
        },
      },
      current_anchor_kind: 'artifact',
      current_anchor_ref: {
        kind: 'artifact',
        artifact_id: 'artifact-primary',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.equations',
      summary_state: {
        resume_title: 'Continue interval repair',
        resume_message: 'Resume from the misconception artifact anchored to this workspace.',
        resume_summary: 'Carry the misconception recap into the next pass.',
      },
      open_questions: [],
      key_artifact_refs: [],
      misconceptions_in_focus: ['domain:interval'],
      lineage_ref: {
        parent_session_id: 'session-parent-1',
        handoff_kind: 'explicit_new_session',
      },
      created_at: '2026-03-22T07:30:00.000Z',
      updated_at: '2026-03-22T07:55:00.000Z',
      parent_session_id: 'session-parent-1',
      handoff_kind: 'explicit_new_session',
      summary_snapshot: {
        recap: 'Prior interval repair recap.',
      },
    },
  ];

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orders = [];
      this.selection = null;
    }

    select(selection) {
      this.selection = selection;
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    lte(column, value) {
      this.filters.push({ type: 'lte', column, value });
      return this;
    }

    order(column, options = {}) {
      this.orders.push({ column, options });
      return this;
    }

    async maybeSingle() {
      queries.push({
        table: this.table,
        selection: this.selection,
        filters: [...this.filters],
        orders: [...this.orders],
        single: true,
      });

      if (this.table === 'learning_artifact_content_versions') {
        let rows = [...artifactContentVersionRows];

        for (const filter of this.filters) {
          if (filter.type === 'eq') {
            rows = rows.filter((row) => row[filter.column] === filter.value);
          }
        }

        for (const order of this.orders) {
          rows = rows.sort((left, right) => {
            const leftValue = left[order.column];
            const rightValue = right[order.column];
            const direction = order.options?.ascending === false ? -1 : 1;

            if (leftValue === rightValue) {
              return 0;
            }

            return leftValue > rightValue ? direction : -direction;
          });
        }

        return { data: rows[0] ?? null, error: null };
      }

      if (this.table !== 'learning_workspace_projection') {
        throw new Error(`Unexpected maybeSingle table: ${this.table}`);
      }

      const topicId = this.filters.find((filter) => filter.column === 'topic_id')?.value ?? null;
      const userId = this.filters.find((filter) => filter.column === 'user_id')?.value ?? null;

      if (topicId !== workspaceProjection.topic_id || userId !== workspaceProjection.user_id) {
        return { data: null, error: null };
      }

      return { data: workspaceProjection, error: null };
    }

    then(resolve, reject) {
      queries.push({
        table: this.table,
        selection: this.selection,
        filters: [...this.filters],
        orders: [...this.orders],
        single: false,
      });

      if (this.table === 'learning_session_resume_projection') {
        let rows = [...sessionRows];

        for (const filter of this.filters) {
          if (filter.type === 'eq') {
            rows = rows.filter((row) => row[filter.column] === filter.value);
          }
        }

        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      }

      if (this.table === 'learning_artifacts') {
        let rows = [...artifactRows];

        for (const filter of this.filters) {
          if (filter.type === 'eq') {
            rows = rows.filter((row) => row[filter.column] === filter.value);
          }
        }

        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      }

      if (this.table === 'learning_artifact_content_versions') {
        let rows = [...artifactContentVersionRows];

        for (const filter of this.filters) {
          if (filter.type === 'eq') {
            rows = rows.filter((row) => row[filter.column] === filter.value);
          }
        }

        for (const order of this.orders) {
          rows = rows.sort((left, right) => {
            const leftValue = left[order.column];
            const rightValue = right[order.column];
            const direction = order.options?.ascending === false ? -1 : 1;

            if (leftValue === rightValue) {
              return 0;
            }

            return leftValue > rightValue ? direction : -direction;
          });
        }

        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      }

      if (this.table !== 'learning_review_queue_projection') {
        return Promise.reject(new Error(`Unexpected list table: ${this.table}`)).then(resolve, reject);
      }

      let rows = [...reviewTaskRows];

      for (const filter of this.filters) {
        if (filter.type === 'eq') {
          rows = rows.filter((row) => row[filter.column] === filter.value);
        }

        if (filter.type === 'lte') {
          rows = rows.filter((row) => row[filter.column] !== null && row[filter.column] <= filter.value);
        }
      }

      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    }
  }

  return {
    queries,
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

function createBoundaryLearningDb() {
  const queries = [];
  const state = {
    nextReviewTaskId: 1,
    nextArtifactId: 1,
    nextArtifactContentVersionId: 1,
    nextWorkspaceId: 1,
    nextWorkspaceSlotId: 1,
    nextReconciliationId: 1,
    topics: new Map([
      [
        'repair-target-topic',
        {
          node_id: 'repair-target-topic',
          topic_path: '9709.integration.repair',
        },
      ],
    ]),
    reviewTasks: new Map(),
    artifacts: new Map(),
    artifactContentVersions: new Map(),
    workspaces: new Map(),
    workspaceByUserTopic: new Map(),
    workspaceSlots: new Map(),
    reconciliationRuns: new Map(),
  };

  function workspaceKey(userId, topicId) {
    return `${userId}:${topicId}`;
  }

  function getWorkspaceByTopic(userId, topicId) {
    const workspaceId = state.workspaceByUserTopic.get(workspaceKey(userId, topicId));
    return workspaceId ? state.workspaces.get(workspaceId) || null : null;
  }

  function listWorkspaceSlots(workspaceId) {
    return [...state.workspaceSlots.values()].filter((slot) => slot.workspace_id === workspaceId);
  }

  function listProjectedReviewTasks(filters = []) {
    let rows = [...state.reviewTasks.values()].map((task) => ({
      ...task,
      target_topic_path:
        task.target_topic_path ?? state.topics.get(task.target_topic_id)?.topic_path ?? null,
    }));

    for (const filter of filters) {
      if (filter.type === 'eq') {
        rows = rows.filter((row) => row[filter.column] === filter.value);
      }

      if (filter.type === 'lte') {
        rows = rows.filter((row) => row[filter.column] !== null && row[filter.column] <= filter.value);
      }
    }

    return rows.sort((left, right) => {
      const dueCompare = String(left.due_at ?? '').localeCompare(String(right.due_at ?? ''));
      if (dueCompare !== 0) {
        return dueCompare;
      }

      return String(left.created_at ?? '').localeCompare(String(right.created_at ?? ''));
    });
  }

  function listArtifactContentVersions(filters = []) {
    let rows = [...state.artifactContentVersions.values()];

    for (const filter of filters) {
      if (filter.type === 'eq') {
        rows = rows.filter((row) => row[filter.column] === filter.value);
      }
    }

    return rows.sort((left, right) => Number(right.version_number ?? 0) - Number(left.version_number ?? 0));
  }

  function deriveWorkspaceProjection(userId, topicId) {
    const workspace = getWorkspaceByTopic(userId, topicId);
    const activeArtifacts = [...state.artifacts.values()].filter((artifact) =>
      artifact.canonical_home_topic_id === topicId
      && artifact.lifecycle_status !== 'superseded'
      && artifact.placement_status !== 'archived');
    const reviewTaskRefs = listProjectedReviewTasks([
      { type: 'eq', column: 'user_id', value: userId },
      { type: 'eq', column: 'target_topic_id', value: topicId },
      { type: 'eq', column: 'status', value: 'open' },
    ]).map((task) => ({
      kind: 'review_task',
      review_task_id: task.review_task_id,
    }));

    if (!workspace) {
      return null;
    }

    const workspaceId = workspace.workspace_id;
    const slotsByKey = new Map(
      listWorkspaceSlots(workspaceId).map((slot) => [slot.slot_key, slot]),
    );
    const commonTrapsSlot = slotsByKey.get('common_traps') || null;
    const reviewQueueSlot = slotsByKey.get('review_queue') || null;
    const artifactRefs = activeArtifacts.map((artifact) => ({
      kind: 'artifact',
      artifact_id: artifact.artifact_id,
    }));

    return {
      workspace_id: workspaceId,
      user_id: userId,
      topic_id: topicId,
      topic_path: state.topics.get(topicId)?.topic_path ?? null,
      slot_state: {
        common_traps: artifactRefs.length > 0 || commonTrapsSlot ? 'active' : 'idle',
        review_queue: reviewTaskRefs.length > 0 || reviewQueueSlot ? 'active' : 'idle',
      },
      linked_reference_summary: {
        total_linked_references: artifactRefs.length + reviewTaskRefs.length,
      },
      updated_at: '2026-03-22T09:00:00.000Z',
      slots: [
        {
          workspace_slot_id: commonTrapsSlot?.workspace_slot_id ?? null,
          slot_key: 'common_traps',
          primary_artifact_ref: commonTrapsSlot?.primary_artifact_ref ?? null,
          linked_reference_refs: artifactRefs,
          updated_at: commonTrapsSlot?.updated_at ?? null,
        },
        {
          workspace_slot_id: reviewQueueSlot?.workspace_slot_id ?? null,
          slot_key: 'review_queue',
          primary_artifact_ref: reviewQueueSlot?.primary_artifact_ref ?? null,
          linked_reference_refs: reviewTaskRefs,
          updated_at: reviewQueueSlot?.updated_at ?? null,
        },
      ],
    };
  }

  function findFilter(filters, column) {
    return filters.find((filter) => filter.column === column)?.value ?? null;
  }

  function resolveQuery(query) {
    if (query.table === 'learning_review_tasks' && query.operation === 'insert') {
      const row = {
        review_task_id: `review-task-${state.nextReviewTaskId++}`,
        created_at: '2026-03-22T09:00:00.000Z',
        updated_at: query.payload.updated_at ?? '2026-03-22T09:00:00.000Z',
        ...query.payload,
      };
      state.reviewTasks.set(row.review_task_id, row);
      return { data: row, error: null };
    }

    if (query.table === 'learning_review_tasks' && query.operation === 'select') {
      const reviewTaskId = findFilter(query.filters, 'review_task_id');
      return { data: state.reviewTasks.get(reviewTaskId) || null, error: null };
    }

    if (query.table === 'learning_review_tasks' && query.operation === 'update') {
      const reviewTaskId = findFilter(query.filters, 'review_task_id');
      const current = state.reviewTasks.get(reviewTaskId) || null;
      const next = current ? { ...current, ...query.payload } : null;

      if (next) {
        state.reviewTasks.set(reviewTaskId, next);
      }

      return { data: next, error: null };
    }

    if (query.table === 'learning_review_queue_projection' && query.operation === 'select') {
      const rows = listProjectedReviewTasks(query.filters);
      if (query.options?.single || query.options?.maybeSingle) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null };
    }

    if (query.table === 'learning_artifacts' && query.operation === 'insert') {
      const row = {
        artifact_id: `artifact-${state.nextArtifactId++}`,
        created_at: query.payload.created_at ?? '2026-03-22T09:00:00.000Z',
        updated_at: query.payload.updated_at ?? '2026-03-22T09:00:00.000Z',
        ...query.payload,
      };
      state.artifacts.set(row.artifact_id, row);
      return { data: row, error: null };
    }

    if (query.table === 'learning_artifacts' && query.operation === 'select') {
      let rows = [...state.artifacts.values()];

      for (const filter of query.filters) {
        if (filter.type === 'eq') {
          rows = rows.filter((row) => row[filter.column] === filter.value);
        }
      }

      for (const order of query.orders ?? []) {
        rows = rows.sort((left, right) => {
          const leftValue = left[order.column];
          const rightValue = right[order.column];
          const direction = order.options?.ascending === false ? -1 : 1;

          if (leftValue === rightValue) {
            return 0;
          }

          return leftValue > rightValue ? direction : -direction;
        });
      }

      if (query.options?.single || query.options?.maybeSingle) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null };
    }

    if (query.table === 'learning_artifacts' && query.operation === 'update') {
      const artifactId = findFilter(query.filters, 'artifact_id');
      const current = state.artifacts.get(artifactId) || null;
      const next = current ? { ...current, ...query.payload } : null;

      if (next) {
        state.artifacts.set(artifactId, next);
      }

      return { data: next, error: null };
    }

    if (query.table === 'learning_artifact_content_versions' && query.operation === 'insert') {
      const artifactId = query.payload.artifact_id;
      const existing = listArtifactContentVersions([
        { type: 'eq', column: 'artifact_id', value: artifactId },
      ]);
      const row = {
        artifact_content_version_id:
          `artifact-content-version-${state.nextArtifactContentVersionId++}`,
        created_at: query.payload.created_at ?? '2026-03-22T09:00:00.000Z',
        ...query.payload,
      };
      if (row.version_number == null) {
        row.version_number = (existing[0]?.version_number ?? 0) + 1;
      }
      state.artifactContentVersions.set(row.artifact_content_version_id, row);
      return { data: row, error: null };
    }

    if (query.table === 'learning_artifact_content_versions' && query.operation === 'select') {
      const rows = listArtifactContentVersions(query.filters);
      if (query.options?.single || query.options?.maybeSingle) {
        return { data: rows[0] || null, error: null };
      }
      return { data: rows, error: null };
    }

    if (query.table === 'learning_artifact_content_versions' && query.operation === 'update') {
      const versionId = findFilter(query.filters, 'artifact_content_version_id');
      const current = state.artifactContentVersions.get(versionId) || null;
      const next = current ? { ...current, ...query.payload } : null;

      if (next) {
        state.artifactContentVersions.set(versionId, next);
      }

      return { data: next, error: null };
    }

    if (query.table === 'curriculum_nodes' && query.operation === 'select') {
      const topicId = findFilter(query.filters, 'node_id');
      return { data: state.topics.get(topicId) || null, error: null };
    }

    if (query.table === 'learning_workspaces' && query.operation === 'select') {
      const workspaceId = findFilter(query.filters, 'workspace_id');
      const userId = findFilter(query.filters, 'user_id');
      const topicId = findFilter(query.filters, 'topic_id');

      if (workspaceId) {
        return { data: state.workspaces.get(workspaceId) || null, error: null };
      }

      if (userId && topicId) {
        return { data: getWorkspaceByTopic(userId, topicId), error: null };
      }

      return { data: null, error: null };
    }

    if (query.table === 'learning_workspaces' && query.operation === 'insert') {
      const row = {
        workspace_id: `workspace-${state.nextWorkspaceId++}`,
        updated_at: '2026-03-22T09:00:00.000Z',
        ...query.payload,
      };
      state.workspaces.set(row.workspace_id, row);
      state.workspaceByUserTopic.set(workspaceKey(row.user_id, row.topic_id), row.workspace_id);
      return { data: row, error: null };
    }

    if (query.table === 'learning_workspace_slots' && query.operation === 'select') {
      const workspaceId = findFilter(query.filters, 'workspace_id');
      const slotKey = findFilter(query.filters, 'slot_key');
      const workspaceSlotId = findFilter(query.filters, 'workspace_slot_id');

      if (workspaceSlotId) {
        return { data: state.workspaceSlots.get(workspaceSlotId) || null, error: null };
      }

      const row = [...state.workspaceSlots.values()].find((slot) =>
        slot.workspace_id === workspaceId && slot.slot_key === slotKey) || null;
      return { data: row, error: null };
    }

    if (query.table === 'learning_workspace_slots' && query.operation === 'insert') {
      const row = {
        workspace_slot_id: `workspace-slot-${state.nextWorkspaceSlotId++}`,
        updated_at: '2026-03-22T09:00:00.000Z',
        ...query.payload,
      };
      state.workspaceSlots.set(row.workspace_slot_id, row);
      return { data: row, error: null };
    }

    if (query.table === 'learning_workspace_slots' && query.operation === 'update') {
      const workspaceSlotId = findFilter(query.filters, 'workspace_slot_id');
      const current = state.workspaceSlots.get(workspaceSlotId) || null;
      const next = current ? { ...current, ...query.payload } : null;

      if (next) {
        state.workspaceSlots.set(workspaceSlotId, next);
      }

      return { data: next, error: null };
    }

    if (query.table === 'learning_reconciliation_runs' && query.operation === 'insert') {
      const row = {
        reconciliation_run_id: `recon-${state.nextReconciliationId++}`,
        ...query.payload,
      };
      state.reconciliationRuns.set(row.reconciliation_run_id, row);
      return { data: row, error: null };
    }

    if (query.table === 'learning_workspace_projection' && query.operation === 'select') {
      const topicId = findFilter(query.filters, 'topic_id');
      const userId = findFilter(query.filters, 'user_id');
      return { data: deriveWorkspaceProjection(userId, topicId), error: null };
    }

    if (query.table === 'learning_session_resume_projection' && query.operation === 'select') {
      return { data: [], error: null };
    }

    throw new Error(`Unhandled learning query: ${query.table}:${query.operation}`);
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.operation = 'select';
      this.payload = null;
      this.filters = [];
      this.orders = [];
      this.selection = null;
    }

    select(selection) {
      this.selection = selection;
      return this;
    }

    insert(payload) {
      this.operation = 'insert';
      this.payload = payload;
      return this;
    }

    update(payload) {
      this.operation = 'update';
      this.payload = payload;
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    lte(column, value) {
      this.filters.push({ type: 'lte', column, value });
      return this;
    }

    order(column, options = {}) {
      this.orders.push({ column, options });
      return this;
    }

    single() {
      return this.#resolve({ single: true });
    }

    maybeSingle() {
      return this.#resolve({ maybeSingle: true });
    }

    then(resolve, reject) {
      return this.#resolve({}).then(resolve, reject);
    }

    #resolve(extra = {}) {
      const query = {
        table: this.table,
        operation: this.operation,
        payload: this.payload,
        filters: [...this.filters],
        orders: [...this.orders],
        options: {
          selection: this.selection,
          ...extra,
        },
      };
      queries.push(query);
      return Promise.resolve(resolveQuery(query));
    }
  }

  return {
    queries,
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

function createReq({
  method = 'GET',
  query = {},
  authUserId = 'student-1',
  requestId = 'req-workspace-1',
} = {}) {
  return {
    method,
    query,
    auth_user_id: authUserId,
    request_id: requestId,
  };
}

function createRes() {
  const headers = {};

  return {
    statusCode: 200,
    headers,
    body: null,
    writableEnded: false,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.writableEnded = true;
      return this;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('workspace read service', () => {
  test('workspace returns stable slots plus linked references from secondary topics', async () => {
    const db = createLearningDb();

    const payload = await getWorkspaceView(db, {
      userId: 'student-1',
      topicId: 'topic-1',
      residencyFlagEnabled: true,
    });

    expect(payload.workspace.workspace_id).toBe('workspace-1');
    expect(payload.workspace.slots.overview_map).toEqual({
      workspace_slot_id: null,
      primary_artifact_ref: null,
      primary_artifact: null,
      linked_references: [],
      updated_at: null,
    });
    expect(payload.workspace.slots.common_traps).toEqual({
      workspace_slot_id: 'slot-common-traps',
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: 'artifact-primary',
      },
      primary_artifact: null,
      linked_references: [
        { kind: 'artifact', artifact_id: 'artifact-linked-1' },
      ],
      updated_at: '2026-03-22T08:00:00.000Z',
    });
    expect(payload.workspace.slots.review_queue.linked_references).toEqual([
      { kind: 'review_task', review_task_id: 'review-queued-1' },
    ]);
    expect(payload.review_queue.items).toHaveLength(1);
    expect(payload.review_queue.items[0].review_task_id).toBe('review-queued-1');
  });

  test.each([
    {
      label: 'verified resident stays active when an unverified successor exists',
      workspaceProjection: {
        workspace_id: 'workspace-1',
        user_id: 'student-1',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        slot_state: {
          common_traps: 'active',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T08:00:00.000Z',
        slots: [
          {
            workspace_slot_id: 'slot-common-traps',
            slot_key: 'common_traps',
            primary_artifact_ref: {
              kind: 'artifact',
              artifact_id: 'artifact-primary',
            },
            linked_reference_refs: [],
            updated_at: '2026-03-22T08:00:00.000Z',
          },
        ],
      },
      artifactRows: [
        {
          artifact_id: 'artifact-primary',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-1',
          slot_key: 'common_traps',
          trust_status: 'grounded',
          placement_status: 'pinned',
          lifecycle_status: 'active',
          artifact_state: 'verified',
          verified_by: 'operator-1',
          verified_at: '2026-03-22T07:40:00.000Z',
          verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
          updated_at: '2026-03-22T08:00:00.000Z',
        },
        {
          artifact_id: 'artifact-successor-unverified',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-1',
          slot_key: 'common_traps',
          trust_status: 'unverified',
          placement_status: 'inbox',
          lifecycle_status: 'active',
          artifact_state: 'unverified',
          verified_by: null,
          verified_at: null,
          verification_evidence_ref: null,
          updated_at: '2026-03-22T08:04:00.000Z',
        },
      ],
      artifactContentVersionRows: [
        {
          artifact_content_version_id: 'artifact-content-verified-primary',
          artifact_id: 'artifact-primary',
          version_number: 1,
          is_current: true,
          title: 'Common trap: interval sign slip',
          summary: 'The verified resident stays renderable while the successor remains unverified.',
          body_markdown: 'Keep the verified resident visible until the successor is verified.',
          content_format: 'markdown',
        },
      ],
      expectedPrimaryArtifactId: 'artifact-primary',
      expectedPrimaryArtifact: {
        title: 'Common trap: interval sign slip',
        summary: 'The verified resident stays renderable while the successor remains unverified.',
        current_content_version_number: 1,
      },
      expectedSlotState: 'active',
      expectedInboxArtifactId: 'artifact-successor-unverified',
    },
    {
      label: 'verified resident without current content stays pinned but surfaces missing_artifact_content',
      workspaceProjection: {
        workspace_id: 'workspace-1',
        user_id: 'student-1',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        slot_state: {
          common_traps: 'active',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T08:00:00.000Z',
        slots: [
          {
            workspace_slot_id: 'slot-common-traps',
            slot_key: 'common_traps',
            primary_artifact_ref: {
              kind: 'artifact',
              artifact_id: 'artifact-primary',
            },
            linked_reference_refs: [],
            updated_at: '2026-03-22T08:00:00.000Z',
          },
        ],
      },
      artifactRows: [
        {
          artifact_id: 'artifact-primary',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-1',
          slot_key: 'common_traps',
          trust_status: 'grounded',
          placement_status: 'pinned',
          lifecycle_status: 'active',
          artifact_state: 'verified',
          verified_by: 'operator-1',
          verified_at: '2026-03-22T07:40:00.000Z',
          verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
          updated_at: '2026-03-22T08:00:00.000Z',
        },
      ],
      artifactContentVersionRows: [],
      expectedPrimaryArtifactId: 'artifact-primary',
      expectedPrimaryArtifact: null,
      expectedSlotState: 'missing_artifact_content',
      expectedInboxArtifactId: null,
    },
    {
      label: 'verified resident with current content stays active and exposes renderable resident fields',
      workspaceProjection: {
        workspace_id: 'workspace-1',
        user_id: 'student-1',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        slot_state: {
          common_traps: 'active',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T08:00:00.000Z',
        slots: [
          {
            workspace_slot_id: 'slot-common-traps',
            slot_key: 'common_traps',
            primary_artifact_ref: {
              kind: 'artifact',
              artifact_id: 'artifact-primary',
            },
            linked_reference_refs: [],
            updated_at: '2026-03-22T08:00:00.000Z',
          },
        ],
      },
      artifactRows: [
        {
          artifact_id: 'artifact-primary',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-1',
          slot_key: 'common_traps',
          trust_status: 'grounded',
          placement_status: 'pinned',
          lifecycle_status: 'active',
          artifact_state: 'verified',
          verified_by: 'operator-1',
          verified_at: '2026-03-22T07:40:00.000Z',
          verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
          updated_at: '2026-03-22T08:00:00.000Z',
        },
      ],
      artifactContentVersionRows: [
        {
          artifact_content_version_id: 'artifact-content-1',
          artifact_id: 'artifact-primary',
          version_number: 1,
          is_current: true,
          title: 'Common trap: sign error',
          summary: 'Watch for sign changes before applying the interval restriction.',
          body_markdown: 'Check the sign before you solve for the interval.',
          content_format: 'markdown',
        },
      ],
      expectedPrimaryArtifactId: 'artifact-primary',
      expectedPrimaryArtifact: {
        title: 'Common trap: sign error',
        summary: 'Watch for sign changes before applying the interval restriction.',
        current_content_version_number: 1,
      },
      expectedSlotState: 'active',
      expectedInboxArtifactId: null,
    },
    {
      label: 'resident projection preserves stale warning state',
      workspaceProjection: {
        workspace_id: 'workspace-1',
        user_id: 'student-1',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        slot_state: {
          common_traps: 'stale',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T08:03:00.000Z',
        slots: [
          {
            workspace_slot_id: 'slot-common-traps',
            slot_key: 'common_traps',
            primary_artifact_ref: {
              kind: 'artifact',
              artifact_id: 'artifact-primary',
            },
            linked_reference_refs: [],
            updated_at: '2026-03-22T08:03:00.000Z',
          },
        ],
      },
      artifactRows: [
        {
          artifact_id: 'artifact-primary',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-1',
          slot_key: 'common_traps',
          trust_status: 'grounded',
          placement_status: 'pinned',
          lifecycle_status: 'active',
          artifact_state: 'verified',
          verified_by: 'operator-1',
          verified_at: '2026-03-22T07:40:00.000Z',
          verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
          updated_at: '2026-03-22T08:03:00.000Z',
        },
      ],
      artifactContentVersionRows: [
        {
          artifact_content_version_id: 'artifact-content-stale-primary',
          artifact_id: 'artifact-primary',
          version_number: 1,
          is_current: true,
          title: 'Common trap: stale but renderable',
          summary: 'Resident content stays available even when the projection warning remains stale.',
          body_markdown: 'Preserve the stale warning while keeping the resident renderable.',
          content_format: 'markdown',
        },
      ],
      expectedPrimaryArtifactId: 'artifact-primary',
      expectedPrimaryArtifact: {
        title: 'Common trap: stale but renderable',
        summary: 'Resident content stays available even when the projection warning remains stale.',
        current_content_version_number: 1,
      },
      expectedSlotState: 'stale',
      expectedInboxArtifactId: null,
    },
    {
      label: 'awaiting_verification appears only when the slot has no displayable resident',
      workspaceProjection: {
        workspace_id: 'workspace-1',
        user_id: 'student-1',
        topic_id: 'topic-1',
        topic_path: '9709/trigonometry/equations',
        slot_state: {
          common_traps: 'active',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T08:05:00.000Z',
        slots: [
          {
            workspace_slot_id: 'slot-common-traps',
            slot_key: 'common_traps',
            primary_artifact_ref: {
              kind: 'artifact',
              artifact_id: 'artifact-awaiting-verification',
            },
            linked_reference_refs: [],
            updated_at: '2026-03-22T08:05:00.000Z',
          },
        ],
      },
      artifactRows: [
        {
          artifact_id: 'artifact-awaiting-verification',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-1',
          slot_key: 'common_traps',
          trust_status: 'unverified',
          placement_status: 'pinned',
          lifecycle_status: 'active',
          artifact_state: 'unverified',
          verified_by: null,
          verified_at: null,
          verification_evidence_ref: null,
          updated_at: '2026-03-22T08:05:00.000Z',
        },
      ],
      expectedPrimaryArtifactId: null,
      expectedSlotState: 'awaiting_verification',
      expectedInboxArtifactId: 'artifact-awaiting-verification',
    },
  ])('workspace residency matrix: $label', async ({
    workspaceProjection,
    artifactRows,
    artifactContentVersionRows,
    expectedPrimaryArtifactId,
    expectedPrimaryArtifact,
    expectedSlotState,
    expectedInboxArtifactId,
  }) => {
    const db = createLearningDb({
      workspaceProjection,
      artifactRows,
      artifactContentVersionRows,
    });

    const payload = await getWorkspaceView(db, {
      userId: 'student-1',
      topicId: 'topic-1',
      residencyFlagEnabled: true,
    });

    expect(payload.workspace.slot_state.common_traps).toBe(expectedSlotState);
    expect(payload.workspace.slots.common_traps.primary_artifact_ref).toEqual(
      expectedPrimaryArtifactId
        ? {
          kind: 'artifact',
          artifact_id: expectedPrimaryArtifactId,
        }
        : null,
    );
    expect(payload.workspace.slots.common_traps.primary_artifact ?? null).toEqual(
      expectedPrimaryArtifact
        ? expect.objectContaining(expectedPrimaryArtifact)
        : null,
    );
    if (expectedInboxArtifactId) {
      expect(payload.workspace.artifact_inbox.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            artifact_id: expectedInboxArtifactId,
            slot_key: 'common_traps',
            placement_status: 'inbox',
          }),
        ]),
      );
    } else {
      expect(payload.workspace.artifact_inbox.items).toEqual([]);
    }
  });

  test('workspace revisit payload keeps last-session continuity separate from slot and queue changes', async () => {
    const db = createLearningDb();

    const payload = await getWorkspaceView(db, {
      userId: 'student-1',
      topicId: 'topic-1',
    });

    expect(payload.revisit.last_visit_at).toBe('2026-03-22T07:55:00.000Z');
    expect(payload.revisit.last_session).toMatchObject({
      session_id: 'session-topic-1-current',
      mode: 'post_mortem_review',
      updated_at: '2026-03-22T07:55:00.000Z',
      resume_guidance: {
        title: 'Continue interval repair',
        summary: 'Carry the misconception recap into the next pass.',
        anchor_kind: 'artifact',
        anchor_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-primary',
        },
      },
    });
    expect(payload.revisit.changes_since_last_visit.slot_updates).toEqual([
      {
        slot_key: 'common_traps',
        updated_at: '2026-03-22T08:00:00.000Z',
      },
    ]);
    expect(payload.revisit.changes_since_last_visit.review_updates).toEqual([
      expect.objectContaining({
        review_task_id: 'review-queued-1',
        status: 'open',
        updated_at: '2026-03-22T08:10:00.000Z',
      }),
    ]);
  });

  test('review queue endpoint returns global truth with optional topic filter', async () => {
    const db = createLearningDb();

    const payload = await listReviewTasks(db, {
      userId: 'student-1',
      topicId: 'topic-1',
    });

    expect(payload.scope).toBe('global_queue_projection');
    expect(payload.topic_id).toBe('topic-1');
    expect(payload.policy).toEqual(expect.objectContaining({
      daily_recommendation_cap: 3,
      max_high_priority_open_per_type: 1,
    }));
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      review_task_id: 'review-queued-1',
      target_topic_id: 'topic-1',
      scheduler_state: {
        value: 'escalated',
        label: 'Escalated',
        tone: 'danger',
        reason_code: 'fresh_immediate_repair',
      },
      explanation: {
        posture: 'conservative_fallback',
        freshness: {
          bucket: 'fresh',
          route: 'immediate_repair',
          scheduler_state: 'escalated',
        },
        attempt_history: {
          attempt_count: 2,
          latest_source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1b' },
        },
        evidence: {
          source_question_id: 'question-1',
          source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
          misconception_tags: ['domain:interval'],
        },
      },
    });
  });

  test('workspace review_queue slot stays tied to active tasks even when queue payload is filtered', async () => {
    const db = createLearningDb();

    const payload = await getWorkspaceView(db, {
      userId: 'student-1',
      topicId: 'topic-1',
      reviewStatus: 'completed',
    });

    expect(payload.review_queue.items).toEqual([]);
    expect(payload.workspace.slots.review_queue.linked_references).toEqual([
      { kind: 'review_task', review_task_id: 'review-queued-1' },
    ]);
  });

  test('GET /api/learning/workspaces/:topicId returns stable slots and linked references', async () => {
    const db = createLearningDb();
    mockGetServiceClient.mockReturnValue(db);

    const req = createReq({
      query: { topicId: 'topic-1' },
    });
    const res = createRes();

    await workspaceHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.workspace.slots.common_traps).toMatchObject({
      workspace_slot_id: 'slot-common-traps',
      linked_references: [{ kind: 'artifact', artifact_id: 'artifact-linked-1' }],
    });
    expect(res.body.review_queue.scope).toBe('global_queue_projection');
  });

  test('second-subject workspace reads surface an explicit read-only runtime posture', async () => {
    const db = createLearningDb({
      workspaceProjection: {
        workspace_id: 'workspace-physics-1',
        user_id: 'student-1',
        topic_id: 'topic-physics-1',
        topic_path: '9702.mechanics.force_balance',
        slot_state: {
          common_traps: 'idle',
          review_queue: 'idle',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T08:00:00.000Z',
        slots: [],
      },
      reviewTaskRows: [],
      sessionRows: [
        {
          session_id: 'session-physics-1',
          user_id: 'student-1',
          subject_code: '9702',
          session_goal: 'Read force-balance repair notes',
          mode: 'learn_concept',
          state: 'active',
          active_scope_bundle: {
            primary_topic_id: 'topic-physics-1',
            primary_topic_path: '9702.mechanics.force_balance',
            mode: 'learn_concept',
            current_anchor_kind: 'concept',
            current_anchor_ref: {
              kind: 'concept',
              topic_id: 'topic-physics-1',
              topic_path: '9702.mechanics.force_balance',
            },
            current_question_ref: null,
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9702.mechanics.force_balance',
            },
          },
          current_anchor_kind: 'concept',
          current_anchor_ref: {
            kind: 'concept',
            topic_id: 'topic-physics-1',
            topic_path: '9702.mechanics.force_balance',
          },
          current_question_id: null,
          current_question_type_id: '9702.mechanics.force_balance',
          summary_state: {
            resume_title: 'Resume mechanics read-through',
            resume_message: 'Continue from the stored concept anchor without unlocking scoring.',
            resume_summary: 'Keep the force-balance explanation anchored to the saved runtime state.',
          },
          open_questions: [],
          key_artifact_refs: [],
          misconceptions_in_focus: [],
          lineage_ref: {
            parent_session_id: null,
            handoff_kind: null,
          },
          created_at: '2026-03-22T08:20:00.000Z',
          updated_at: '2026-03-22T08:30:00.000Z',
          parent_session_id: null,
          handoff_kind: null,
          summary_snapshot: {
            recap: 'Force-balance recap.',
          },
        },
      ],
    });
    mockGetServiceClient.mockReturnValue(db);

    const req = createReq({
      query: { topicId: 'topic-physics-1' },
    });
    const res = createRes();

    await workspaceHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.runtime_posture).toMatchObject({
      subject_code: '9702',
      read_only: true,
      authoritative_scoring_allowed: false,
      release_scope_status: 'non_released_fallback',
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'subject_adapter_capability_not_enabled',
      fallback_capabilities: ['marking', 'mastery', 'review'],
    });
    expect(res.body.revisit.last_session).toMatchObject({
      session_id: 'session-physics-1',
      current_question_type_id: '9702.mechanics.force_balance',
    });
  });

  test('workspace reads ignore runtime posture metadata for unregistered subject prefixes', async () => {
    const db = createLearningDb({
      workspaceProjection: {
        workspace_id: 'workspace-unregistered-1',
        user_id: 'student-1',
        topic_id: 'topic-unregistered-1',
        topic_path: '9231.experimental.reading',
        slot_state: {
          common_traps: 'idle',
          review_queue: 'idle',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T08:00:00.000Z',
        slots: [],
      },
      reviewTaskRows: [],
      sessionRows: [],
    });
    mockGetServiceClient.mockReturnValue(db);

    const req = createReq({
      query: { topicId: 'topic-unregistered-1' },
    });
    const res = createRes();

    await workspaceHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.workspace).toMatchObject({
      workspace_id: 'workspace-unregistered-1',
      topic_id: 'topic-unregistered-1',
      topic_path: '9231.experimental.reading',
    });
    expect(res.body.runtime_posture).toBeNull();
  });

  test('GET /api/learning/review-tasks returns global truth with optional topic filter', async () => {
    const db = createLearningDb();
    mockGetServiceClient.mockReturnValue(db);

    const req = createReq({
      query: { topic_id: 'topic-1' },
    });
    const res = createRes();

    await reviewTasksHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.scope).toBe('global_queue_projection');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].review_task_id).toBe('review-queued-1');
  });

  test('marking effect -> review task -> workspace projection -> artifact patch keeps lifecycle and ownership consistent', async () => {
    const db = createBoundaryLearningDb();
    const now = () => new Date('2026-03-22T09:00:00.000Z');

    const outcome = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-2',
        question_context: {
          family_id: '9709.integration_techniques',
          question_type_id: '9709.integration.application',
          question_type_release_state: 'released',
          primary_topic_id: 'source-topic',
          primary_topic_path: '9709.integration.application.source',
          classification_confidence: 0.77,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'integration-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-2' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-2' },
        decisions: [
          {
            awarded: false,
            awarded_marks: 0,
            alignment_confidence: 0.71,
          },
        ],
        uncertainty_validated: false,
        misconception_tags: ['domain:interval'],
        repair_target_topic_id: 'repair-target-topic',
        repair_target_topic_path: '9709.integration.repair',
        repair_target_question_type_id: '9709.integration.application',
      },
      {
        supabase: db,
        now,
      },
    );

    expect(outcome.release_scope_status).toBe('non_released_fallback');
    expect(outcome.review_tasks).toHaveLength(1);
    expect(outcome.artifact_candidates).toHaveLength(1);
    expect(outcome.artifact_candidates[0]).toMatchObject({
      title: expect.any(String),
      summary: expect.any(String),
      current_content_version_number: 1,
      body_markdown: expect.stringContaining('domain interval'),
    });

    await expect(
      getWorkspaceView(db, {
        userId: 'student-1',
        topicId: 'repair-target-topic',
      }),
    ).rejects.toMatchObject({
      code: 'workspace_not_found',
      status: 404,
    });

    const reviewQueueBeforePatch = await listReviewTasks(db, {
      userId: 'student-1',
      topicId: 'repair-target-topic',
    });

    expect(reviewQueueBeforePatch.items).toHaveLength(1);
    expect(reviewQueueBeforePatch.items[0]).toMatchObject({
      review_task_id: outcome.review_tasks[0].review_task_id,
      target_topic_id: 'repair-target-topic',
      target_topic_path: '9709.integration.repair',
      status: 'open',
    });

    const verifyResult = await patchLearningArtifact({
      client: db,
      userId: 'student-1',
      artifactId: outcome.artifact_candidates[0].artifact_id,
      intent: 'mark_verified',
      verificationEvidenceRef: {
        kind: 'review_run',
        review_run_id: 'review-verified-1',
      },
    }, {
      lifecycleFlagEnabled: true,
    });

    expect(verifyResult.artifact).toMatchObject({
      artifact_id: outcome.artifact_candidates[0].artifact_id,
      artifact_state: 'verified',
    });

    const patchResult = await patchLearningArtifact({
      client: db,
      userId: 'student-1',
      artifactId: outcome.artifact_candidates[0].artifact_id,
      intent: 'set_placement_status',
      placementStatus: 'pinned',
    }, {
      lifecycleFlagEnabled: true,
    });

    expect(patchResult.artifact).toMatchObject({
      artifact_id: outcome.artifact_candidates[0].artifact_id,
      canonical_home_topic_id: 'repair-target-topic',
      placement_status: 'pinned',
      lifecycle_status: 'active',
    });
    expect(patchResult.slot_transition).toMatchObject({
      outcome: 'pinned_to_slot',
      slot_key: 'common_traps',
    });

    const workspaceAfterPatch = await getWorkspaceView(db, {
      userId: 'student-1',
      topicId: 'repair-target-topic',
      residencyFlagEnabled: true,
    });

    expect(workspaceAfterPatch.review_queue.items[0].review_task_id)
      .toBe(outcome.review_tasks[0].review_task_id);
    expect(workspaceAfterPatch.workspace.slots.common_traps).toEqual({
      workspace_slot_id: expect.any(String),
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: outcome.artifact_candidates[0].artifact_id,
      },
      primary_artifact: expect.objectContaining({
        artifact_id: outcome.artifact_candidates[0].artifact_id,
        title: expect.any(String),
        summary: expect.any(String),
        current_content_version_number: 1,
      }),
      linked_references: [],
      updated_at: '2026-03-22T09:00:00.000Z',
    });
    expect(workspaceAfterPatch.workspace.slot_state.common_traps).toBe('active');
  });

  test('review-task writes update topic projections and active review-queue references', async () => {
    const db = createBoundaryLearningDb();
    const now = () => new Date('2026-03-22T09:00:00.000Z');

    const outcome = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-2',
        question_context: {
          family_id: '9709.integration_techniques',
          question_type_id: '9709.integration.application',
          question_type_release_state: 'released',
          primary_topic_id: 'source-topic',
          primary_topic_path: '9709.integration.application.source',
          classification_confidence: 0.77,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'integration-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-2' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-2' },
        decisions: [
          {
            awarded: false,
            awarded_marks: 0,
            alignment_confidence: 0.71,
          },
        ],
        uncertainty_validated: true,
        misconception_tags: ['domain:interval'],
        repair_target_topic_id: 'repair-target-topic',
        repair_target_topic_path: '9709.integration.repair',
        repair_target_question_type_id: '9709.integration.application',
      },
      {
        supabase: db,
        now,
      },
    );

    expect(outcome.release_scope_status).toBe('non_released_fallback');
    expect(outcome.authoritative_scoring_allowed).toBe(false);

    await patchLearningArtifact({
      client: db,
      userId: 'student-1',
      artifactId: outcome.artifact_candidates[0].artifact_id,
      intent: 'set_placement_status',
      placementStatus: 'pinned',
    });

    const completed = await patchLearningReviewTask({
      client: db,
      userId: 'student-1',
      reviewTaskId: outcome.review_tasks[0].review_task_id,
      intent: 'complete',
      completionOutcome: 'completed',
      completionEvidence: {
        summary: 'Solved a fresh repair variant.',
        artifact_ref: {
          kind: 'artifact',
          artifact_id: outcome.artifact_candidates[0].artifact_id,
        },
      },
      now,
    });

    expect(completed.review_task).toMatchObject({
      review_task_id: outcome.review_tasks[0].review_task_id,
      status: 'completed',
      completion_evidence: expect.objectContaining({
        summary: 'Solved a fresh repair variant.',
        outcome: 'completed',
      }),
    });

    const workspaceAfterComplete = await getWorkspaceView(db, {
      userId: 'student-1',
      topicId: 'repair-target-topic',
    });

    expect(workspaceAfterComplete.review_queue.items[0]).toMatchObject({
      review_task_id: outcome.review_tasks[0].review_task_id,
      status: 'completed',
    });
    expect(workspaceAfterComplete.workspace.slots.review_queue.linked_references).toEqual([]);

    const reopened = await patchLearningReviewTask({
      client: db,
      userId: 'student-1',
      reviewTaskId: outcome.review_tasks[0].review_task_id,
      intent: 'reopen',
      now,
    });

    expect(reopened.review_task).toMatchObject({
      review_task_id: outcome.review_tasks[0].review_task_id,
      status: 'open',
    });

    const workspaceAfterReopen = await getWorkspaceView(db, {
      userId: 'student-1',
      topicId: 'repair-target-topic',
    });

    expect(workspaceAfterReopen.review_queue.items[0]).toMatchObject({
      review_task_id: outcome.review_tasks[0].review_task_id,
      status: 'open',
    });
    expect(workspaceAfterReopen.workspace.slots.review_queue.linked_references).toEqual([
      {
        kind: 'review_task',
        review_task_id: outcome.review_tasks[0].review_task_id,
      },
    ]);
  });
});
