import { jest } from '@jest/globals';
import http from 'node:http';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.AUTH_LOCAL_TEST_MODE = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const clientState = {
  calls: [],
  nextQuestionId: 1,
  nextSnapshotId: 1,
  registryTypes: new Map(),
  questions: new Map(),
  snapshots: new Map(),
};

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
  ]);
}

function resetClientState() {
  clientState.calls = [];
  clientState.nextQuestionId = 1;
  clientState.nextSnapshotId = 1;
  clientState.questions = new Map();
  clientState.snapshots = new Map();
  seedRegistryTypes();
}

function findFilter(query, field) {
  return query.filters.find((filter) => filter.field === field)?.value ?? null;
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

  if (query.table === 'question_bank' && query.operation === 'insert') {
    const questionId = `question-${clientState.nextQuestionId++}`;
    const row = {
      question_id: questionId,
      ...query.payload,
    };
    clientState.questions.set(questionId, row);
    return { data: row, error: null };
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

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
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

function buildIntegrationInput() {
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
      classification_confidence: 0.77,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.integration.application',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      variant_tags: ['paper:p3'],
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

  test('imported integration question remains fallback-only', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildIntegrationInput(),
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
      primary_question_type_id: '9709.integration.application',
      release_scope_status: 'non_released_fallback',
    });
  });
});

describe('learning question import api', () => {
  let server;

  beforeAll(() => {
    server = http.createServer(apiHandler);
  });

  afterAll((done) => {
    if (!server || !server.listening) {
      done();
      return;
    }

    server.close(done);
  });

  beforeEach(() => {
    resetClientState();
    __resetQuestionImportIdempotencyCache();
    jest.clearAllMocks();
  });

  test('POST /api/learning/questions/import returns a durable question and scoring posture metadata', async () => {
    const res = await request(server)
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
    const first = await request(server)
      .post('/api/learning/questions/import')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'import-1')
      .send(buildTrigIdentityInput());

    const second = await request(server)
      .post('/api/learning/questions/import')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'import-1')
      .send(buildIntegrationInput());

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('idempotency_conflict');
  });
});
