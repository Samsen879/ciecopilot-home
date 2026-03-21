import { jest } from '@jest/globals';

const mockGetServiceClient = jest.fn();

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const {
  getWorkspaceView,
  listReviewTasks,
} = await import('../lib/workspaces/workspace-read-service.js');
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
});
