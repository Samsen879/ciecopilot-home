import { jest } from '@jest/globals';
import { buildIdempotencyRequestFingerprint } from '../lib/repositories/request-idempotency-repository.js';
import { createLoopbackHttpTestClient } from './loopback-test-client.js';

process.env.NODE_ENV = 'test';
process.env.AUTH_LOCAL_TEST_MODE = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const clientState = {
  calls: [],
  idempotencyRows: new Map(),
  nextIdempotencyId: 1,
  nextQuestionId: 1,
  nextSnapshotId: 1,
  nextSessionId: 1,
  registryTypes: new Map(),
  questions: new Map(),
  snapshots: new Map(),
  topics: new Map(),
  sessions: new Map(),
  lineage: new Map(),
  workspaceProjections: new Map(),
  questionInsertGate: null,
};

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitForCondition(predicate, { attempts = 50, delayMs = 0 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Condition not reached in time.');
}

function seedRegistryTypes() {
  clientState.registryTypes = new Map([
    [
      '9709.trigonometry.identities',
      {
        question_type_id: '9709.trigonometry.identities',
        family_id: '9709.trigonometry_manipulation_equations',
        subject_code: '9709',
        release_state: 'released',
      },
    ],
    [
      '9709.trigonometry.equations',
      {
        question_type_id: '9709.trigonometry.equations',
        family_id: '9709.trigonometry_manipulation_equations',
        subject_code: '9709',
        release_state: 'released',
      },
    ],
    [
      '9709.integration.application',
      {
        question_type_id: '9709.integration.application',
        family_id: '9709.integration_techniques',
        subject_code: '9709',
        release_state: 'released',
      },
    ],
  ]);
}

function seedTopics() {
  clientState.topics = new Map([
    [
      'topic-integration-1',
      {
        node_id: 'topic-integration-1',
        topic_path: '9709.integration.application',
      },
    ],
  ]);
}

function seedWorkspaceProjections() {
  clientState.workspaceProjections = new Map([
    [
      'student-1:topic-integration-1',
      {
        workspace_id: 'workspace-integration-1',
        user_id: 'student-1',
        topic_id: 'topic-integration-1',
        topic_path: '9709.integration.application',
        slot_state: {
          common_traps: 'active',
          review_queue: 'active',
        },
        linked_reference_summary: {
          total_linked_references: 0,
        },
        updated_at: '2026-03-22T09:00:00.000Z',
        slots: [
          {
            workspace_slot_id: 'slot-common-traps-integration',
            slot_key: 'common_traps',
            primary_artifact_ref: null,
            linked_reference_refs: [],
            updated_at: '2026-03-22T09:00:00.000Z',
          },
          {
            workspace_slot_id: 'slot-review-queue-integration',
            slot_key: 'review_queue',
            primary_artifact_ref: null,
            linked_reference_refs: [],
            updated_at: '2026-03-22T09:00:00.000Z',
          },
        ],
      },
    ],
  ]);
}

function resetClientState() {
  clientState.calls = [];
  clientState.idempotencyRows = new Map();
  clientState.nextIdempotencyId = 1;
  clientState.nextQuestionId = 1;
  clientState.nextSnapshotId = 1;
  clientState.nextSessionId = 1;
  clientState.questions = new Map();
  clientState.snapshots = new Map();
  clientState.sessions = new Map();
  clientState.lineage = new Map();
  clientState.questionInsertGate = null;
  seedRegistryTypes();
  seedTopics();
  seedWorkspaceProjections();
}

function findFilter(query, field) {
  return query.filters.find((filter) => filter.field === field)?.value ?? null;
}

function buildIdempotencyKey(userId, requestPath, idempotencyKey) {
  return `${userId}:${requestPath}:${idempotencyKey}`;
}

function createNowTimestamp() {
  return new Date().toISOString();
}

function createSessionRow(payload) {
  const sessionId = `session-${clientState.nextSessionId++}`;
  const now = '2026-03-22T09:00:00.000Z';

  return {
    session_id: sessionId,
    created_at: now,
    updated_at: now,
    ...payload,
  };
}

function buildResumeProjection(sessionId) {
  const session = clientState.sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const lineage = clientState.lineage.get(sessionId) || {
    parent_session_id: null,
    handoff_kind: null,
    summary_snapshot: session.summary_state || {},
  };

  return {
    ...session,
    parent_session_id: lineage.parent_session_id,
    handoff_kind: lineage.handoff_kind,
    summary_snapshot: lineage.summary_snapshot,
  };
}

function resolveQuery(query) {
  if (query.table === 'learning_question_types' && query.operation === 'select') {
    const questionTypeId = findFilter(query, 'question_type_id');
    const subjectCode = findFilter(query, 'subject_code');
    const releaseState = findFilter(query, 'release_state');
    const row = clientState.registryTypes.get(questionTypeId) || null;

    if (!row || (subjectCode && row.subject_code !== subjectCode)) {
      return { data: null, error: null };
    }

    if (releaseState && row.release_state !== releaseState) {
      return { data: null, error: null };
    }

    return { data: row, error: null };
  }

  if (query.table === 'learning_request_idempotency') {
    const userId = query.operation === 'insert'
      ? query.payload?.user_id ?? null
      : findFilter(query, 'user_id');
    const requestPath = query.operation === 'insert'
      ? query.payload?.request_path ?? null
      : findFilter(query, 'request_path');
    const idempotencyKey = query.operation === 'insert'
      ? query.payload?.idempotency_key ?? null
      : findFilter(query, 'idempotency_key');
    const rowKey = buildIdempotencyKey(userId, requestPath, idempotencyKey);

    if (query.operation === 'insert') {
      if (clientState.idempotencyRows.has(rowKey)) {
        return {
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        };
      }

      const now = createNowTimestamp();
      const row = {
        request_idempotency_id: `idem-${clientState.nextIdempotencyId++}`,
        created_at: now,
        updated_at: now,
        completed_at: null,
        ...query.payload,
      };
      clientState.idempotencyRows.set(
        buildIdempotencyKey(row.user_id, row.request_path, row.idempotency_key),
        row,
      );
      return { data: row, error: null };
    }

    if (query.operation === 'select') {
      return {
        data: clientState.idempotencyRows.get(rowKey) || null,
        error: null,
      };
    }

    if (query.operation === 'update') {
      const current = clientState.idempotencyRows.get(rowKey) || null;
      const now = createNowTimestamp();
      const next = current ? {
        ...current,
        ...query.payload,
        updated_at: now,
      } : null;
      if (next) {
        clientState.idempotencyRows.set(rowKey, next);
      }
      return { data: next, error: null };
    }

    if (query.operation === 'delete') {
      clientState.idempotencyRows.delete(rowKey);
      return { data: null, error: null };
    }
  }

  if (query.table === 'question_bank' && query.operation === 'insert') {
    if (clientState.questionInsertGate) {
      const gate = clientState.questionInsertGate;
      clientState.questionInsertGate = null;
      return gate.promise.then(() => resolveQuery(query));
    }

    const questionId = `question-${clientState.nextQuestionId++}`;
    const row = {
      question_id: questionId,
      ...query.payload,
    };
    clientState.questions.set(questionId, row);
    return { data: row, error: null };
  }

  if (query.table === 'question_bank' && query.operation === 'select') {
    const questionId = findFilter(query, 'question_id');
    return { data: clientState.questions.get(questionId) || null, error: null };
  }

  if (query.table === 'learning_question_analysis_snapshots' && query.operation === 'insert') {
    const snapshotId = `snapshot-${clientState.nextSnapshotId++}`;
    const row = {
      classification_snapshot_id: snapshotId,
      ...query.payload,
    };
    clientState.snapshots.set(snapshotId, row);
    return { data: row, error: null };
  }

  if (query.table === 'question_bank' && query.operation === 'update') {
    const questionId = findFilter(query, 'question_id');
    const current = clientState.questions.get(questionId);
    const next = current ? { ...current, ...query.payload } : null;

    if (next) {
      clientState.questions.set(questionId, next);
    }

    return { data: next, error: null };
  }

  if (query.table === 'curriculum_nodes' && query.operation === 'select') {
    const nodeId = findFilter(query, 'node_id');
    return { data: clientState.topics.get(nodeId) || null, error: null };
  }

  if (query.table === 'learning_sessions' && query.operation === 'insert') {
    const row = createSessionRow(query.payload);
    clientState.sessions.set(row.session_id, row);
    return { data: row, error: null };
  }

  if (query.table === 'learning_session_lineage' && query.operation === 'insert') {
    const row = {
      lineage_id: `lineage-${query.payload.child_session_id}`,
      created_at: '2026-03-22T09:00:00.000Z',
      ...query.payload,
    };
    clientState.lineage.set(query.payload.child_session_id, row);
    return { data: row, error: null };
  }

  if (query.table === 'learning_session_resume_projection' && query.operation === 'select') {
    const sessionId = findFilter(query, 'session_id');
    const userId = findFilter(query, 'user_id');
    const row = buildResumeProjection(sessionId);

    if (!row || (userId && row.user_id !== userId)) {
      return { data: null, error: null };
    }

    return { data: row, error: null };
  }

  if (query.table === 'learning_workspace_projection' && query.operation === 'select') {
    const topicId = findFilter(query, 'topic_id');
    const userId = findFilter(query, 'user_id');
    const row = clientState.workspaceProjections.get(`${userId}:${topicId}`) || null;
    return { data: row, error: null };
  }

  if (query.table === 'learning_review_queue_projection' && query.operation === 'select') {
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
    this.options = {};
  }

  select(columns) {
    this.options.columns = columns;
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

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, value });
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
      options: {
        ...this.options,
        ...extra,
      },
    };
    clientState.calls.push(query);
    return Promise.resolve(resolveQuery(query));
  }
}

function createClient() {
  return {
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

const mockGetServiceClient = jest.fn(() => createClient());
const mockAskWithinLearningSession = jest.fn();

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

jest.unstable_mockModule('../../rag/lib/ask-service.js', () => ({
  askWithinLearningSession: mockAskWithinLearningSession,
}));

const {
  __resetQuestionImportIdempotencyCache,
  importQuestion,
} = await import('../lib/import/question-import-service.js');
const { default: apiHandler } = await import('../../index.js');

function buildReleasedRubricRef(overrides = {}) {
  return {
    kind: 'rubric_release',
    rubric_set_id: '9709.trigonometry.identities',
    rubric_version_id: 'v1',
    scope_level: 'question_type',
    release_state: 'released',
    ...overrides,
  };
}

function buildTrigIdentityInput(overrides = {}) {
  const classification = overrides.classification || {};

  return {
    subject_code: '9709',
    prompt_representation: {
      type: 'text',
      value: 'Prove that 1 - tan^2(x) = (cos(2x)) / (cos^2(x)).',
    },
    provenance_summary: {
      import_source: 'manual_paste',
    },
    classification: {
      primary_question_type_id: '9709.trigonometry.identities',
      classification_confidence: 0.93,
      candidate_rubric_refs: [buildReleasedRubricRef()],
      uncertainty_validated: true,
      variant_tags: ['paper:p1', 'structure:identity_rewrite'],
      ...classification,
    },
    ...overrides,
    classification: {
      primary_question_type_id: '9709.trigonometry.identities',
      classification_confidence: 0.93,
      candidate_rubric_refs: [buildReleasedRubricRef()],
      uncertainty_validated: true,
      variant_tags: ['paper:p1', 'structure:identity_rewrite'],
      ...classification,
    },
  };
}

function buildNormalizedQuestionImportPayload(overrides = {}) {
  const input = buildTrigIdentityInput(overrides);
  const classification = input.classification || {};

  return {
    source_kind: 'imported_question',
    subject_code: input.subject_code,
    prompt_representation: input.prompt_representation,
    paper_scope: input.paper_scope ?? null,
    provenance_summary: input.provenance_summary ?? {},
    classification: {
      primary_topic_id: classification.primary_topic_id ?? input.primary_topic_id ?? null,
      secondary_topic_ids: classification.secondary_topic_ids ?? input.secondary_topic_ids ?? [],
      family_id: classification.family_id ?? input.family_id ?? null,
      primary_question_type_id:
        classification.primary_question_type_id ?? input.primary_question_type_id ?? null,
      secondary_question_type_ids:
        classification.secondary_question_type_ids ?? input.secondary_question_type_ids ?? [],
      variant_tags: classification.variant_tags ?? input.variant_tags ?? [],
      classification_source: classification.classification_source ?? 'imported_question',
      classification_confidence: classification.classification_confidence ?? null,
      candidate_rubric_refs: classification.candidate_rubric_refs ?? [],
      uncertainty_validated: classification.uncertainty_validated ?? false,
      uncertainty_posture: classification.uncertainty_posture ?? null,
    },
  };
}

function buildTrigWithoutReleasedRubricInput() {
  return buildTrigIdentityInput({
    classification: {
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          release_state: 'validated',
        }),
      ],
      classification_confidence: 0.88,
      uncertainty_validated: true,
    },
  });
}

function buildPromotedIntegrationInput(overrides = {}) {
  const classification = overrides.classification || {};

  return {
    subject_code: '9709',
    prompt_representation: {
      type: 'text',
      value: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
    },
    provenance_summary: {
      import_source: 'manual_paste',
    },
    classification: {
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.application',
      primary_topic_id: 'topic-integration-1',
      classification_confidence: 0.77,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.integration.application',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      variant_tags: ['paper:p3'],
      ...classification,
    },
    ...overrides,
    classification: {
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.application',
      primary_topic_id: 'topic-integration-1',
      classification_confidence: 0.77,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.integration.application',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      variant_tags: ['paper:p3'],
      ...classification,
    },
  };
}

function buildPromotedIntegrationWithoutUncertaintyInput() {
  return buildPromotedIntegrationInput({
    classification: {
      uncertainty_validated: false,
    },
  });
}

function buildUnpromotedIntegrationInput(overrides = {}) {
  const classification = overrides.classification || {};

  return {
    subject_code: '9709',
    prompt_representation: {
      type: 'text',
      value: 'Find the volume generated when the region is rotated about the x-axis.',
    },
    provenance_summary: {
      import_source: 'manual_paste',
    },
    classification: {
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.volume_of_revolution',
      primary_topic_id: 'topic-integration-1',
      classification_confidence: 0.77,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.integration.volume_of_revolution',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      variant_tags: ['paper:p1'],
      ...classification,
    },
    ...overrides,
    classification: {
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.volume_of_revolution',
      primary_topic_id: 'topic-integration-1',
      classification_confidence: 0.77,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.integration.volume_of_revolution',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      variant_tags: ['paper:p1'],
      ...classification,
    },
  };
}

describe('question import service', () => {
  beforeEach(() => {
    resetClientState();
    __resetQuestionImportIdempotencyCache();
    jest.clearAllMocks();
  });

  test('imported trigonometry identity question gets pilot released scope posture', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigIdentityInput(),
    });

    expect(result.question).toMatchObject({
      question_id: 'question-1',
      family_id: '9709.trigonometry_manipulation_equations',
      primary_question_type_id: '9709.trigonometry.identities',
      release_scope_status: 'released_scoring',
    });
    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
      fallback_mode: null,
    });

    expect(
      clientState.calls.some(
        (call) =>
          call.table === 'learning_question_types'
          && findFilter(call, 'question_type_id') === '9709.trigonometry.identities',
      ),
    ).toBe(true);
  });

  test('trigonometry type without a released rubric ref still falls back', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigWithoutReleasedRubricInput(),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: false,
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'missing_released_rubric',
      classification_confidence: 0.88,
    });
    expect(result.question.release_scope_status).toBe('non_released_fallback');
  });

  test('imported promoted integration question gets released scope posture when all gates pass', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildPromotedIntegrationInput(),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
      fallback_mode: null,
    });
    expect(result.question).toMatchObject({
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.application',
      release_scope_status: 'released_scoring',
    });
  });

  test('promoted integration question still falls back when uncertainty is not validated', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildPromotedIntegrationWithoutUncertaintyInput(),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      fallback_mode: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_reason_code: 'unvalidated_uncertainty_posture',
      classification_confidence: 0.77,
      learning_signal_posture: 'conservative_fallback',
    });
    expect(result.question.release_scope_status).toBe('non_released_fallback');
  });

  test('imported non-promoted integration question remains fallback-only', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildUnpromotedIntegrationInput(),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      fallback_mode: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_reason_code: 'non_pilot_question_type',
      classification_confidence: 0.77,
      learning_signal_posture: 'conservative_fallback',
    });
    expect(result.question).toMatchObject({
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.volume_of_revolution',
      release_scope_status: 'non_released_fallback',
    });
  });

  test('same idempotency key allows only one writer under concurrent durable replay', async () => {
    const gate = createDeferred();
    clientState.questionInsertGate = gate;

    const firstImport = importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigIdentityInput(),
      idempotencyKey: 'import-race-1',
    });
    const secondImport = importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigIdentityInput(),
      idempotencyKey: 'import-race-1',
    });

    await waitForCondition(
      () =>
        clientState.calls.filter(
          (call) => call.table === 'question_bank' && call.operation === 'insert',
        ).length >= 1,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const questionInsertCallsBeforeRelease = clientState.calls.filter(
      (call) => call.table === 'question_bank' && call.operation === 'insert',
    );
    expect(questionInsertCallsBeforeRelease).toHaveLength(1);
    expect(clientState.idempotencyRows.size).toBe(1);

    gate.resolve();
    const [first, second] = await Promise.all([firstImport, secondImport]);

    expect(first.question.question_id).toBe(second.question.question_id);
    expect(
      clientState.calls.filter(
        (call) => call.table === 'question_bank' && call.operation === 'insert',
      ),
    ).toHaveLength(1);
    expect(
      clientState.calls.filter(
        (call) =>
          call.table === 'learning_question_analysis_snapshots' && call.operation === 'insert',
      ),
    ).toHaveLength(1);
    expect(
      clientState.calls.some(
        (call) => call.table === 'learning_request_idempotency' && call.operation === 'update',
      ),
    ).toBe(true);
  });

  test('question import recovers a pending durable reservation when the reserved question already exists', async () => {
    clientState.questions.set('question-recovered-1', {
      question_id: 'question-recovered-1',
      source_kind: 'imported_question',
      subject_code: '9709',
      paper_scope: null,
      primary_topic_id: null,
      secondary_topic_ids: [],
      family_id: '9709.trigonometry_manipulation_equations',
      primary_question_type_id: '9709.trigonometry.identities',
      secondary_question_type_ids: [],
      variant_tags: ['paper:p1', 'structure:identity_rewrite'],
      release_scope_status: 'released_scoring',
      prompt_representation: {
        type: 'text',
        value: 'Recovered question',
      },
      provenance_summary: {
        import_source: 'manual_paste',
      },
      classification_snapshot_ref: {
        kind: 'classification_snapshot',
        classification_snapshot_id: 'snapshot-recovered-1',
      },
    });
    clientState.idempotencyRows.set(
      buildIdempotencyKey('student-1', '/api/learning/questions/import', 'import-recover-1'),
      {
        request_idempotency_id: 'idem-import-recover-1',
        user_id: 'student-1',
        request_path: '/api/learning/questions/import',
        idempotency_key: 'import-recover-1',
        request_kind: 'import_learning_question',
        request_fingerprint: buildIdempotencyRequestFingerprint(
          buildNormalizedQuestionImportPayload(),
        ),
        request_payload: buildNormalizedQuestionImportPayload(),
        status: 'pending',
        resource_ref: {
          kind: 'question',
          question_id: 'question-recovered-1',
        },
        response_payload: null,
        created_at: '2026-03-22T08:50:00.000Z',
        updated_at: '2026-03-22T08:50:00.000Z',
        completed_at: null,
      },
    );

    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigIdentityInput(),
      idempotencyKey: 'import-recover-1',
    });

    expect(result.question.question_id).toBe('question-recovered-1');
    expect(
      clientState.calls.filter(
        (call) => call.table === 'question_bank' && call.operation === 'insert',
      ),
    ).toHaveLength(0);
  });
});

describe('learning question import api', () => {
  let harness;

  beforeAll(async () => {
    harness = await createLoopbackHttpTestClient(apiHandler);
  });

  afterAll(async () => {
    await harness?.close();
  });

  beforeEach(() => {
    resetClientState();
    __resetQuestionImportIdempotencyCache();
    jest.clearAllMocks();
  });

  test('POST /api/learning/questions/import returns a durable question and scoring posture metadata', async () => {
    const res = await harness.request
      .post('/api/learning/questions/import')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildTrigIdentityInput());

    expect(res.status).toBe(200);
    expect(res.body.question.question_id).toBeDefined();
    expect(res.body.question.classification_snapshot_ref).toEqual({
      kind: 'classification_snapshot',
      classification_snapshot_id: 'snapshot-1',
    });
    expect(res.body.scoring_scope_posture.authoritative_scoring_allowed).toBe(true);
    expect(res.body.request_id).toEqual(expect.any(String));
  });

  test('POST /api/learning/questions/import returns 409 idempotency_conflict on conflicting replay', async () => {
    const first = await harness.request
      .post('/api/learning/questions/import')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'import-1')
      .send(buildTrigIdentityInput());

    const second = await harness.request
      .post('/api/learning/questions/import')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'import-1')
      .send(buildPromotedIntegrationInput());

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('idempotency_conflict');
  });

  test('import -> create session -> ask -> workspace read keeps fallback posture and canonical-home consistency', async () => {
    const importRes = await harness.request
      .post('/api/learning/questions/import')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildPromotedIntegrationWithoutUncertaintyInput());

    expect(importRes.status).toBe(200);
    expect(importRes.body.question).toMatchObject({
      release_scope_status: 'non_released_fallback',
      primary_question_type_id: '9709.integration.application',
      primary_topic_id: 'topic-integration-1',
    });

    const questionId = importRes.body.question.question_id;
    const createSessionRes = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        subject_code: '9709',
        mode: 'guided_solve',
        session_goal: 'Repair integration setup',
        anchor_kind: 'question',
        anchor_ref: {
          kind: 'question',
          question_id: questionId,
        },
        current_question_id: questionId,
        current_question_type_id: null,
      });

    expect(createSessionRes.status).toBe(200);
    expect(createSessionRes.body.session.active_scope_bundle).toMatchObject({
      primary_topic_id: 'topic-integration-1',
      primary_topic_path: '9709.integration.application',
      current_question_ref: {
        kind: 'question',
        question_id: questionId,
      },
      current_question_type_ref: {
        kind: 'question_type',
        question_type_id: '9709.integration.application',
      },
    });

    const sessionId = createSessionRes.body.session.session_id;
    mockAskWithinLearningSession.mockResolvedValueOnce({
      assistant_message: 'Choose u = x^2 + x and du = (2x + 1)dx.',
      evidence_summary: {
        source_topic_path: '9709.integration.application',
        retrieved_evidence_count: 0,
      },
      fallback_posture: {
        fallback_mode: 'non_released_fallback',
        authoritative_scoring_allowed: false,
        fallback_reason_code: 'unvalidated_uncertainty_posture',
        classification_confidence: 0.77,
        learning_signal_posture: 'conservative_fallback',
      },
      session_delta: {
        client_turn_id: 'turn-1',
        current_question_ref: {
          kind: 'question',
          question_id: questionId,
        },
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.integration.application',
        },
      },
      suggested_actions: [
        {
          kind: 'review_workspace',
          workspace_id: 'workspace-integration-1',
        },
      ],
    });

    const askRes = await harness.request
      .post(`/api/learning/sessions/${sessionId}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'Give me the next substitution hint only.',
        client_turn_id: 'turn-1',
      });

    expect(askRes.status).toBe(200);
    expect(mockAskWithinLearningSession).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: expect.any(Object),
        req: expect.any(Object),
      }),
      expect.objectContaining({
        clientTurnId: 'turn-1',
        message: 'Give me the next substitution hint only.',
        session: expect.objectContaining({
          session_id: sessionId,
          active_scope_bundle: expect.objectContaining({
            primary_topic_id: 'topic-integration-1',
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9709.integration.application',
            },
          }),
        }),
      }),
    );
    expect(askRes.body.fallback_posture).toMatchObject({
      fallback_mode: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_reason_code: 'unvalidated_uncertainty_posture',
    });

    const workspaceRes = await harness.request
      .get('/api/learning/workspaces/topic-integration-1')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student');

    expect(workspaceRes.status).toBe(200);
    expect(workspaceRes.body.workspace).toMatchObject({
      workspace_id: 'workspace-integration-1',
      topic_id: 'topic-integration-1',
      topic_path: '9709.integration.application',
    });
    expect(workspaceRes.body.workspace.topic_id)
      .toBe(createSessionRes.body.session.active_scope_bundle.primary_topic_id);
    expect(workspaceRes.body.workspace.slots.common_traps).toEqual({
      workspace_slot_id: 'slot-common-traps-integration',
      primary_artifact_ref: null,
      linked_references: [],
      updated_at: '2026-03-22T09:00:00.000Z',
    });
    expect(workspaceRes.body.review_queue).toEqual({
      scope: 'global_queue_projection',
      topic_id: 'topic-integration-1',
      status: null,
      due_before: null,
      items: [],
    });
  });
});
