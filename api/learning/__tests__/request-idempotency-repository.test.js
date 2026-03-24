import {
  buildIdempotencyRequestFingerprint,
  deleteLearningRequestIdempotencyReservation,
  finalizeLearningRequestIdempotency,
  reserveLearningRequestIdempotency,
  setLearningRequestIdempotencyResourceRef,
} from '../lib/repositories/request-idempotency-repository.js';

function createIdempotencyDb() {
  const state = {
    rows: new Map(),
    nextId: 1,
  };
  const calls = [];

  function makeKey(payload) {
    return `${payload.user_id}:${payload.request_path}:${payload.idempotency_key}`;
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

    maybeSingle() {
      return this.#resolve({ maybeSingle: true });
    }

    single() {
      return this.#resolve({ single: true });
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
      calls.push(query);

      if (this.table !== 'learning_request_idempotency') {
        throw new Error(`Unhandled table: ${this.table}`);
      }

      if (this.operation === 'insert') {
        const key = makeKey(this.payload);
        if (state.rows.has(key)) {
          return Promise.resolve({
            data: null,
            error: {
              code: '23505',
              message: 'duplicate key value violates unique constraint',
            },
          });
        }

        const row = {
          request_idempotency_id: `idem-${state.nextId++}`,
          created_at: '2026-03-24T10:00:00.000Z',
          updated_at: '2026-03-24T10:00:00.000Z',
          completed_at: null,
          ...this.payload,
        };
        state.rows.set(key, row);
        return Promise.resolve({ data: row, error: null });
      }

      const key = `${this.filters.find((filter) => filter.field === 'user_id')?.value}:${this.filters.find((filter) => filter.field === 'request_path')?.value}:${this.filters.find((filter) => filter.field === 'idempotency_key')?.value}`;
      const row = state.rows.get(key) || null;

      if (this.operation === 'select') {
        return Promise.resolve({ data: row, error: null });
      }

      if (this.operation === 'update') {
        const next = row ? {
          ...row,
          ...this.payload,
          updated_at: '2026-03-24T10:05:00.000Z',
        } : null;
        if (next) {
          state.rows.set(key, next);
        }
        return Promise.resolve({ data: next, error: null });
      }

      if (this.operation === 'delete') {
        state.rows.delete(key);
        return Promise.resolve({ data: null, error: null });
      }

      throw new Error(`Unhandled operation: ${this.operation}`);
    }
  }

  return {
    calls,
    state,
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

describe('request-idempotency-repository', () => {
  test('buildIdempotencyRequestFingerprint is stable across object key ordering', () => {
    const left = buildIdempotencyRequestFingerprint({
      z: 1,
      nested: {
        b: 2,
        a: 1,
      },
      a: 0,
    });
    const right = buildIdempotencyRequestFingerprint({
      a: 0,
      nested: {
        a: 1,
        b: 2,
      },
      z: 1,
    });

    expect(left).toBe(right);
  });

  test('reserveLearningRequestIdempotency creates a durable pending reservation and reuses it on unique conflict', async () => {
    const db = createIdempotencyDb();
    const input = {
      userId: 'student-1',
      requestPath: '/api/learning/sessions',
      idempotencyKey: 'sess-1',
      requestKind: 'create_learning_session',
      requestPayload: {
        subject_code: '9709',
        mode: 'spaced_review',
      },
    };

    const first = await reserveLearningRequestIdempotency(db, input);
    const second = await reserveLearningRequestIdempotency(db, input);

    expect(first.state).toBe('reserved');
    expect(second.state).toBe('replay');
    expect(second.row.request_idempotency_id).toBe(first.row.request_idempotency_id);
  });

  test('reserveLearningRequestIdempotency flags conflicting replay when the payload fingerprint differs', async () => {
    const db = createIdempotencyDb();

    await reserveLearningRequestIdempotency(db, {
      userId: 'student-1',
      requestPath: '/api/learning/questions/import',
      idempotencyKey: 'import-1',
      requestKind: 'import_learning_question',
      requestPayload: {
        subject_code: '9709',
      },
    });

    const replay = await reserveLearningRequestIdempotency(db, {
      userId: 'student-1',
      requestPath: '/api/learning/questions/import',
      idempotencyKey: 'import-1',
      requestKind: 'import_learning_question',
      requestPayload: {
        subject_code: '9231',
      },
    });

    expect(replay.state).toBe('conflict');
  });

  test('repository stores resource refs, final response payloads, and can delete stale reservations', async () => {
    const db = createIdempotencyDb();

    const reserved = await reserveLearningRequestIdempotency(db, {
      userId: 'student-1',
      requestPath: '/api/learning/sessions',
      idempotencyKey: 'sess-delete-1',
      requestKind: 'create_learning_session',
      requestPayload: {
        subject_code: '9709',
      },
    });

    await setLearningRequestIdempotencyResourceRef(db, {
      userId: 'student-1',
      requestPath: '/api/learning/sessions',
      idempotencyKey: 'sess-delete-1',
      resourceRef: {
        kind: 'learning_session',
        session_id: 'session-fixed-1',
      },
    });

    await finalizeLearningRequestIdempotency(db, {
      userId: 'student-1',
      requestPath: '/api/learning/sessions',
      idempotencyKey: 'sess-delete-1',
      responsePayload: {
        session: {
          session_id: 'session-fixed-1',
        },
      },
    });

    await deleteLearningRequestIdempotencyReservation(db, {
      userId: 'student-1',
      requestPath: '/api/learning/sessions',
      idempotencyKey: 'sess-delete-1',
    });

    expect(reserved.row.request_idempotency_id).toBeDefined();
    expect(db.state.rows.size).toBe(0);
  });
});
