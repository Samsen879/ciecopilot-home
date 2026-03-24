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

function createLearningDb() {
  const queries = [];
  const workspaceProjection = {
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

  const reviewTaskRows = [
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
      trigger_type: 'marking_outcome',
      mode: 'redo_variant',
      due_at: '2026-03-23T00:00:00.000Z',
      priority: 'high',
      estimated_minutes: 15,
      success_criteria: {},
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
      const artifactId = findFilter(query.filters, 'artifact_id');
      return { data: state.artifacts.get(artifactId) || null, error: null };
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
    });

    expect(payload.workspace.workspace_id).toBe('workspace-1');
    expect(payload.workspace.slots.overview_map).toEqual({
      workspace_slot_id: null,
      primary_artifact_ref: null,
      linked_references: [],
      updated_at: null,
    });
    expect(payload.workspace.slots.common_traps).toEqual({
      workspace_slot_id: 'slot-common-traps',
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: 'artifact-primary',
      },
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

  test('review queue endpoint returns global truth with optional topic filter', async () => {
    const db = createLearningDb();

    const payload = await listReviewTasks(db, {
      userId: 'student-1',
      topicId: 'topic-1',
    });

    expect(payload.scope).toBe('global_queue_projection');
    expect(payload.topic_id).toBe('topic-1');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      review_task_id: 'review-queued-1',
      target_topic_id: 'topic-1',
    });
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
    expect(outcome.review_tasks).toHaveLength(1);
    expect(outcome.artifact_candidates).toHaveLength(1);

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

    const patchResult = await patchLearningArtifact({
      client: db,
      userId: 'student-1',
      artifactId: outcome.artifact_candidates[0].artifact_id,
      intent: 'set_placement_status',
      placementStatus: 'pinned',
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
    });

    expect(workspaceAfterPatch.review_queue.items[0].review_task_id)
      .toBe(outcome.review_tasks[0].review_task_id);
    expect(workspaceAfterPatch.workspace.slots.common_traps).toEqual({
      workspace_slot_id: expect.any(String),
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: outcome.artifact_candidates[0].artifact_id,
      },
      linked_references: [],
      updated_at: '2026-03-22T09:00:00.000Z',
    });
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
