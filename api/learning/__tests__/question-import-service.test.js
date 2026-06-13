import { jest } from '@jest/globals';
import { createLoopbackHttpTestClient } from './loopback-test-client.js';

process.env.NODE_ENV = 'test';
process.env.AUTH_LOCAL_TEST_MODE = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const LOCAL_TEST_USER_ID = '99ab903e-46aa-4cfb-9317-cf09aae34d79';

const clientState = {
  calls: [],
  idempotencyRows: new Map(),
  nextIdempotencyId: 1,
  nextQuestionId: 1,
  nextSnapshotId: 1,
  nextQuestionEventId: 1,
  registryFamilies: new Map(),
  registryTypes: new Map(),
  questions: new Map(),
  snapshots: new Map(),
  questionEvents: new Map(),
};

function seedCanonicalRegistry() {
  clientState.registryFamilies = new Map([
    [
      '9709.trigonometry_manipulation_equations',
      {
        family_id: '9709.trigonometry_manipulation_equations',
        subject_code: '9709',
        release_state: 'released',
      },
    ],
    [
      '9709.integration_techniques',
      {
        family_id: '9709.integration_techniques',
        subject_code: '9709',
        release_state: 'released',
      },
    ],
    [
      '9709.differential_equations',
      {
        family_id: '9709.differential_equations',
        subject_code: '9709',
        release_state: 'released',
      },
    ],
  ]);

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
    [
      '9709.differential_equations.separable',
      {
        question_type_id: '9709.differential_equations.separable',
        family_id: '9709.differential_equations',
        subject_code: '9709',
        release_state: 'released',
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
  clientState.nextQuestionEventId = 1;
  clientState.questions = new Map();
  clientState.snapshots = new Map();
  clientState.questionEvents = new Map();
  seedCanonicalRegistry();
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

function resolveRegistryRow(map, {
  idField,
  idValue,
  subjectCode,
  releaseState,
}) {
  const row = map.get(idValue) || null;

  if (!row) {
    return { data: null, error: null };
  }

  if (subjectCode && row.subject_code !== subjectCode) {
    return { data: null, error: null };
  }

  if (releaseState && row.release_state !== releaseState) {
    return { data: null, error: null };
  }

  return {
    data: {
      [idField]: idValue,
      ...row,
    },
    error: null,
  };
}

function resolveQuery(query) {
  if (query.table === 'learning_question_families' && query.operation === 'select') {
    return resolveRegistryRow(clientState.registryFamilies, {
      idField: 'family_id',
      idValue: findFilter(query, 'family_id'),
      subjectCode: findFilter(query, 'subject_code'),
      releaseState: findFilter(query, 'release_state'),
    });
  }

  if (query.table === 'learning_question_types' && query.operation === 'select') {
    return resolveRegistryRow(clientState.registryTypes, {
      idField: 'question_type_id',
      idValue: findFilter(query, 'question_type_id'),
      subjectCode: findFilter(query, 'subject_code'),
      releaseState: findFilter(query, 'release_state'),
    });
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
      clientState.idempotencyRows.set(rowKey, row);
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
      if (!current) {
        return { data: null, error: null };
      }

      const next = {
        ...current,
        ...query.payload,
        updated_at: createNowTimestamp(),
      };
      clientState.idempotencyRows.set(rowKey, next);
      return { data: next, error: null };
    }

    if (query.operation === 'delete') {
      clientState.idempotencyRows.delete(rowKey);
      return { data: null, error: null };
    }
  }

  if (query.table === 'question_bank' && query.operation === 'insert') {
    const questionId = query.payload?.question_id || `question-${clientState.nextQuestionId++}`;
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

  if (query.table === 'question_bank' && query.operation === 'update') {
    const questionId = findFilter(query, 'question_id');
    const current = clientState.questions.get(questionId) || null;

    if (!current) {
      return { data: null, error: null };
    }

    const next = {
      ...current,
      ...query.payload,
    };
    clientState.questions.set(questionId, next);
    return { data: next, error: null };
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

  if (query.table === 'learning_question_analysis_snapshots' && query.operation === 'update') {
    const snapshotId = findFilter(query, 'classification_snapshot_id');
    const current = clientState.snapshots.get(snapshotId) || null;

    if (!current) {
      return { data: null, error: null };
    }

    const next = {
      ...current,
      ...query.payload,
    };
    clientState.snapshots.set(snapshotId, next);
    return { data: next, error: null };
  }

  if (query.table === 'learning_question_events' && query.operation === 'insert') {
    const questionEventId = `question-event-${clientState.nextQuestionEventId++}`;
    const row = {
      question_event_id: questionEventId,
      ...query.payload,
    };
    clientState.questionEvents.set(questionEventId, row);
    return { data: row, error: null };
  }

  throw new Error(`Unhandled learning query: ${query.table}:${query.operation}`);
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.operation = 'select';
    this.payload = null;
    this.filters = [];
  }

  select() {
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
    return this.#resolve();
  }

  maybeSingle() {
    return this.#resolve();
  }

  then(resolve, reject) {
    return this.#resolve().then(resolve, reject);
  }

  #resolve() {
    const query = {
      table: this.table,
      operation: this.operation,
      payload: this.payload,
      filters: [...this.filters],
    };
    clientState.calls.push(query);
    return Promise.resolve(resolveQuery(query));
  }
}

function createClient() {
  const listUsers = jest.fn(async () => ({
    data: {
      users: [
        {
          id: LOCAL_TEST_USER_ID,
          email: 'student-1@example.test',
          user_metadata: {
            name: 'student-1',
            role: 'student',
            auth_source: 'local_test',
          },
          app_metadata: {
            role: 'student',
            auth_source: 'local_test',
          },
        },
      ],
      nextPage: 0,
    },
    error: null,
  }));

  const createUser = jest.fn(async ({ email, user_metadata = {}, app_metadata = {} }) => ({
    data: {
      user: {
        id: LOCAL_TEST_USER_ID,
        email,
        user_metadata,
        app_metadata,
      },
    },
    error: null,
  }));

  return {
    from(table) {
      return new QueryBuilder(table);
    },
    auth: {
      admin: {
        listUsers,
        createUser,
      },
    },
  };
}

const mockGetServiceClient = jest.fn(() => createClient());

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const { importQuestion } = await import('../lib/import/question-import-service.js');
const { default: apiHandler } = await import('../../index.js');

function buildReleasedRubricRef(overrides = {}) {
  return {
    kind: 'rubric_release',
    rubric_set_id: '9709.trigonometry.identities',
    rubric_version_id: 'trig-identities-v1',
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
      value: 'Prove that 1 - tan^2(x) = cos(2x) / cos^2(x).',
    },
    provenance_summary: {
      import_source: 'manual_paste',
    },
    classification: {
      primary_question_type_id: '9709.trigonometry.identities',
      classification_confidence: 0.93,
      candidate_rubric_refs: [buildReleasedRubricRef()],
      uncertainty_validated: true,
      uncertainty_posture: {
        status: 'validated',
      },
      variant_tags: ['paper:p1', 'structure:identity_rewrite'],
      ...classification,
    },
    ...overrides,
    classification: {
      primary_question_type_id: '9709.trigonometry.identities',
      classification_confidence: 0.93,
      candidate_rubric_refs: [buildReleasedRubricRef()],
      uncertainty_validated: true,
      uncertainty_posture: {
        status: 'validated',
      },
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

function buildIntegrationInput(overrides = {}) {
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
      primary_question_type_id: '9709.integration.application',
      classification_confidence: 0.77,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.integration.application',
          rubric_version_id: 'integration-application-v1',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      uncertainty_posture: {
        status: 'validated',
      },
      variant_tags: ['paper:p3'],
      ...classification,
    },
    ...overrides,
    classification: {
      primary_question_type_id: '9709.integration.application',
      classification_confidence: 0.77,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.integration.application',
          rubric_version_id: 'integration-application-v1',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      uncertainty_posture: {
        status: 'validated',
      },
      variant_tags: ['paper:p3'],
      ...classification,
    },
  };
}

function buildDifferentialInput(overrides = {}) {
  const classification = overrides.classification || {};

  return {
    subject_code: '9709',
    prompt_representation: {
      type: 'text',
      value: 'Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.',
    },
    provenance_summary: {
      import_source: 'manual_paste',
    },
    classification: {
      primary_question_type_id: '9709.differential_equations.separable',
      classification_confidence: 0.82,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.differential_equations.separable',
          rubric_version_id: 'differential-separable-v1',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      uncertainty_posture: {
        status: 'validated',
      },
      variant_tags: ['paper:p3'],
      ...classification,
    },
    ...overrides,
    classification: {
      primary_question_type_id: '9709.differential_equations.separable',
      classification_confidence: 0.82,
      candidate_rubric_refs: [
        buildReleasedRubricRef({
          rubric_set_id: '9709.differential_equations.separable',
          rubric_version_id: 'differential-separable-v1',
          release_state: 'released',
        }),
      ],
      uncertainty_validated: true,
      uncertainty_posture: {
        status: 'validated',
      },
      variant_tags: ['paper:p3'],
      ...classification,
    },
  };
}

function buildAnalysisHints(overrides = {}) {
  return {
    runtime_context_id: '9709.trigonometry.equations',
    question_type_hint_id: '9709.trigonometry.equations',
    ...overrides,
  };
}

function buildPromptOnlyInput({
  promptValue,
  analysisHints = null,
  classification = undefined,
  provenanceSummary = {
    import_source: 'manual_paste',
  },
} = {}) {
  const body = {
    subject_code: '9709',
    prompt_representation: {
      type: 'text',
      value: promptValue,
    },
    provenance_summary: provenanceSummary,
  };

  if (analysisHints) {
    body.analysis_hints = analysisHints;
  }

  if (typeof classification !== 'undefined') {
    body.classification = classification;
  }

  return body;
}

describe('question import service', () => {
  let harness;

  beforeAll(async () => {
    harness = await createLoopbackHttpTestClient(apiHandler);
  });

  afterAll(async () => {
    if (harness) {
      await harness.close();
    }
  });

  beforeEach(() => {
    resetClientState();
    jest.clearAllMocks();
  });

  test('imported trigonometry identity question gets authoritative scoring only when the pilot released gate is satisfied', async () => {
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
    expect(
      clientState.calls.some(
        (call) =>
          call.table === 'learning_question_families'
          && findFilter(call, 'family_id') === '9709.trigonometry_manipulation_equations',
      ),
    ).toBe(true);
  });

  test('import analysis derives canonical type from prompt text even when caller classification disagrees', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildPromptOnlyInput({
        promptValue: 'Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.',
        analysisHints: buildAnalysisHints({
          runtime_context_id: '9709.trigonometry.equations',
          question_type_hint_id: '9709.trigonometry.equations',
        }),
        classification: {
          primary_question_type_id: '9709.trigonometry.equations',
          classification_confidence: 0.99,
          candidate_rubric_refs: [buildReleasedRubricRef()],
          uncertainty_validated: true,
          uncertainty_posture: {
            status: 'validated',
          },
        },
      }),
    });

    expect(result.question).toMatchObject({
      family_id: '9709.differential_equations',
      primary_question_type_id: '9709.differential_equations.separable',
    });
    expect(result.scoring_scope_posture).toMatchObject({
      release_scope_status: 'released_scoring',
      authoritative_scoring_allowed: true,
    });
    expect(clientState.snapshots.get('snapshot-1')).toMatchObject({
      analysis_audit_metadata: expect.objectContaining({
        analysis_mode: 'question_intelligence',
        analysis_hints: expect.objectContaining({
          question_type_hint_id: '9709.trigonometry.equations',
        }),
      }),
    });
  });

  test('import analysis can classify prompt-only trig identities without caller-supplied classification', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildPromptOnlyInput({
        promptValue: 'Prove that 1 - tan^2(x) = cos(2x) / cos^2(x).',
        analysisHints: buildAnalysisHints({
          runtime_context_id: '9709.trigonometry.identities',
          question_type_hint_id: '9709.trigonometry.identities',
        }),
      }),
    });

    expect(result.question).toMatchObject({
      family_id: '9709.trigonometry_manipulation_equations',
      primary_question_type_id: '9709.trigonometry.identities',
      release_scope_status: 'released_scoring',
    });
    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
    });
  });

  test('caller-supplied rubric refs do not override the analyzer-selected pilot rubric package', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigWithoutReleasedRubricInput(),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      fallback_mode: null,
      fallback_reason_code: null,
      classification_confidence: 0.95,
    });
    expect(result.question.release_scope_status).toBe('released_scoring');
    expect(clientState.snapshots.get('snapshot-1')).toMatchObject({
      candidate_rubric_refs: [
        expect.objectContaining({
          rubric_set_id: '9709.trigonometry.identities',
          release_state: 'released',
        }),
      ],
    });
  });

  test('imported integration application question gets authoritative scoring from analyzer output when released gates are satisfied', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildIntegrationInput(),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
      fallback_mode: null,
      fallback_reason_code: null,
      classification_confidence: 0.95,
    });
    expect(result.question).toMatchObject({
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.application',
      release_scope_status: 'released_scoring',
    });
    expect(clientState.snapshots.get('snapshot-1')).toMatchObject({
      confidence_band: 'high',
      low_confidence_posture: null,
    });
  });

  test('imported questions record analysis hints but keep analyzer-owned confidence posture', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildIntegrationInput({
        classification: {
          classification_confidence: 0.79,
          confidence_band: 'medium',
        },
      }),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
      fallback_mode: null,
      fallback_reason_code: null,
      classification_confidence: 0.95,
    });
    expect(result.question).toMatchObject({
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.application',
      release_scope_status: 'released_scoring',
    });
    expect(clientState.snapshots.get('snapshot-1')).toMatchObject({
      confidence_band: 'high',
      analysis_audit_metadata: expect.objectContaining({
        analysis_hints: expect.objectContaining({
          question_type_hint_id: '9709.integration.application',
        }),
      }),
    });
  });

  test('imported differential equations separable question gets authoritative scoring when released gates are satisfied', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildDifferentialInput(),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
      fallback_mode: null,
    });
    expect(result.question).toMatchObject({
      family_id: '9709.differential_equations',
      primary_question_type_id: '9709.differential_equations.separable',
      release_scope_status: 'released_scoring',
    });
  });

  test('seeded pilot rubric refs are filled when import input omits explicit candidate refs', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigIdentityInput({
        classification: {
          candidate_rubric_refs: [],
        },
      }),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
    });
    expect(clientState.snapshots.get('snapshot-1')).toMatchObject({
      candidate_rubric_refs: [
        expect.objectContaining({
          rubric_set_id: '9709.trigonometry.identities',
          release_state: 'released',
        }),
      ],
      confidence_band: 'high',
      analysis_provenance_kind: 'real',
    });
  });

  test('imported questions expose fallback released_scope_check when registry evidence is missing', async () => {
    clientState.registryTypes.delete('9709.trigonometry.identities');

    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildTrigIdentityInput(),
    });

    expect(result.question).toMatchObject({
      family_id: '9709.trigonometry_manipulation_equations',
      primary_question_type_id: '9709.trigonometry.identities',
      release_scope_status: 'non_released_fallback',
    });
    expect(result.scoring_scope_posture).toMatchObject({
      release_scope_status: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_mode: 'non_released_fallback',
      released_scope_check: {
        contract_version: 'phase_1a_released_scope_check.v1',
        released_scoring: false,
        non_released_fallback: true,
        release_scope_status: 'non_released_fallback',
        fallback_mode: 'non_released_fallback',
        allowed_outputs: {
          authoritative_score: false,
          formal_point_judgement: false,
          strong_positive_type_level_mastery: false,
        },
      },
    });
  });

  test('unknown-source pasted imports persist non-corpus raw-text retention policy on the durable chain', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildPromptOnlyInput({
        promptValue: 'A pasted third-party worksheet asks for the inverse of f(x)=2x+3.',
        analysisHints: buildAnalysisHints({
          runtime_context_id: '9709.functions.core',
          question_type_hint_id: '9709.functions.core',
        }),
        provenanceSummary: {
          import_source: 'manual_paste',
          source_origin: 'unknown',
          provenance_summary: 'Pasted from an unknown third-party worksheet.',
          canonical_corpus_status: 'canonical_corpus',
        },
      }),
    });

    expect(result.question).toMatchObject({
      source_kind: 'imported_question',
      release_scope_status: 'non_released_fallback',
      prompt_representation: expect.objectContaining({
        type: 'text',
        value: 'A pasted third-party worksheet asks for the inverse of f(x)=2x+3.',
        policy: expect.objectContaining({
          policy_id: 'imported_question_prompt_representation_v1',
          canonical_corpus_allowed: false,
          raw_full_text_retention_policy_id: 'imported_question_raw_prompt_runtime_v1',
        }),
      }),
      provenance_summary: expect.objectContaining({
        import_source: 'manual_paste',
        source_origin: 'unknown',
        source_trust_posture: 'third_party_or_unknown',
        canonical_corpus_status: 'not_canonical_corpus',
        derived_learning_object_policy: expect.objectContaining({
          allowed: true,
          raw_corpus_promotion_allowed: false,
        }),
        raw_full_text_retention_policy: expect.objectContaining({
          policy_id: 'imported_question_raw_prompt_runtime_v1',
          raw_full_text_field: 'prompt_representation.value',
          indefinite_retention_allowed: false,
          canonical_corpus_allowed: false,
        }),
      }),
    });

    expect(result.scoring_scope_posture).toMatchObject({
      release_scope_status: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      released_scope_check: {
        released_scoring: false,
        non_released_fallback: true,
        allowed_outputs: {
          authoritative_score: false,
          formal_point_judgement: false,
          strong_positive_type_level_mastery: false,
        },
      },
    });
    expect(clientState.snapshots.get('snapshot-1')).toMatchObject({
      primary_question_type_id: '9709.functions.core',
      analysis_audit_metadata: expect.objectContaining({
        imported_question_policy: expect.objectContaining({
          canonical_corpus_status: 'not_canonical_corpus',
          raw_full_text_retention_policy_id: 'imported_question_raw_prompt_runtime_v1',
        }),
        released_scope_check: expect.objectContaining({
          released_scoring: false,
          non_released_fallback: true,
        }),
      }),
    });
  });

  test('import persists a real QuestionClassified event and links the active snapshot to it', async () => {
    const result = await importQuestion(createClient(), {
      userId: 'student-1',
      body: buildPromptOnlyInput({
        promptValue: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
        analysisHints: buildAnalysisHints({
          runtime_context_id: '9709.integration.application',
          question_type_hint_id: '9709.integration.application',
        }),
      }),
    });

    expect(result.question.classification_snapshot_ref).toEqual({
      kind: 'classification_snapshot',
      classification_snapshot_id: 'snapshot-1',
    });
    expect(clientState.questionEvents.get('question-event-1')).toMatchObject({
      event_type: 'QuestionClassified',
      question_id: 'question-1',
      classification_snapshot_id: 'snapshot-1',
      event_payload: expect.objectContaining({
        question_id: 'question-1',
        classification_snapshot_id: 'snapshot-1',
        primary_question_type_id: '9709.integration.application',
      }),
    });
    expect(clientState.snapshots.get('snapshot-1')).toMatchObject({
      evidence_source_event_ref: {
        kind: 'question_event',
        question_event_id: 'question-event-1',
        event_type: 'QuestionClassified',
      },
    });
  });

  test('POST /api/learning/questions/import returns 200 with question id and scoring posture', async () => {
    const response = await harness.request
      .post('/api/learning/questions/import')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildTrigIdentityInput());

    expect(response.status).toBe(200);
    expect(response.body.question.question_id).toEqual(expect.any(String));
    expect(response.body.scoring_scope_posture).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
    });
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
      .send(buildIntegrationInput());

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('idempotency_conflict');
  });
});
