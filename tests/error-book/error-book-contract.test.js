import { describe, expect, it, jest } from '@jest/globals';

import { loadEnrichmentMap } from '../../api/error-book/lib/error-book-read-model.js';
import { serializeErrorBookItem } from '../../api/error-book/lib/error-book-serializer.js';
import {
  ValidationError,
  validateCreatePayload,
} from '../../api/error-book/lib/error-book-validator.js';
import { createErrorBookService } from '../../api/error-book/lib/error-book-service.js';

function createSupabaseStub(resolveQuery, callStore = []) {
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
      this.filters.push({ operator: 'eq', field, value });
      return this;
    }

    in(field, values) {
      this.filters.push({ operator: 'in', field, value: values });
      return this;
    }

    gte(field, value) {
      this.filters.push({ operator: 'gte', field, value });
      return this;
    }

    lte(field, value) {
      this.filters.push({ operator: 'lte', field, value });
      return this;
    }

    order(field, options = {}) {
      this.options.order = { field, options };
      return this;
    }

    limit(value) {
      this.options.limit = value;
      return this;
    }

    single() {
      const snapshot = this.snapshot({ single: true });
      callStore.push(snapshot);
      return Promise.resolve(resolveQuery(snapshot));
    }

    maybeSingle() {
      const snapshot = this.snapshot({ maybeSingle: true });
      callStore.push(snapshot);
      return Promise.resolve(resolveQuery(snapshot));
    }

    then(resolve, reject) {
      const snapshot = this.snapshot();
      callStore.push(snapshot);
      return Promise.resolve(resolveQuery(snapshot)).then(resolve, reject);
    }

    snapshot(extra = {}) {
      return {
        table: this.table,
        operation: this.operation,
        payload: this.payload,
        filters: this.filters,
        options: {
          ...this.options,
          ...extra,
        },
      };
    }
  }

  return {
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

describe('error-book contract hardening', () => {
  it('normalizes boolean-like is_starred values on create payloads', () => {
    const payload = validateCreatePayload({
      question: 'Boolean normalization',
      is_starred: 'false',
    });

    expect(payload.is_starred).toBe(false);
  });

  it('rejects non-object metadata.review payloads', () => {
    expect(() =>
      validateCreatePayload({
        question: 'Bad review metadata',
        metadata: {
          review: ['bad-shape'],
        },
      })).toThrow(ValidationError);
  });

  it('serializes partial items without leaking invalid counters or raw tag noise', () => {
    const item = serializeErrorBookItem({
      id: 'err-1',
      user_id: 'user-1',
      source: 'manual',
      question: 'Partial serializer payload',
      review_count: 'not-a-number',
      tags: [' algebra ', null, ''],
      metadata: {
        review: {
          review_interval: 0,
        },
      },
      created_at: '2026-03-01T00:00:00.000Z',
    });

    expect(item.review_count).toBe(0);
    expect(item.tags).toEqual(['algebra']);
    expect(item.review_interval).toBe(1);
    expect(item.next_review_at).toBe('2026-03-02T00:00:00.000Z');
  });

  it('backfills attempt via owned error_event and blocks unowned mark_decision enrichment', async () => {
    const calls = [];
    const supabase = createSupabaseStub((query) => {
      if (query.table === 'attempts') {
        const idFilter = query.filters.find((filter) => filter.field === 'attempt_id');
        if (idFilter?.operator === 'in' && idFilter.value.includes('attempt-owned')) {
          return {
            data: [
              {
                attempt_id: 'attempt-owned',
                user_id: 'user-1',
                question_id: 'question-1',
                paper_id: 'paper-1',
                storage_key: 'storage-owned',
                q_number: 7,
                syllabus_code: '9709',
                node_id: 'node-1',
                topic_path: '9709.p1.algebra',
                created_at: '2026-03-01T00:00:00.000Z',
              },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      }

      if (query.table === 'error_events') {
        const explicitEventIds = query.filters.find((filter) => filter.field === 'error_event_id');
        if (explicitEventIds?.operator === 'in') {
          return {
            data: [
              {
                error_event_id: 'event-owned',
                user_id: 'user-1',
                attempt_id: 'attempt-owned',
                mark_decision_id: 'decision-unowned',
                topic_path: '9709.p1.algebra',
                node_id: 'node-1',
                misconception_tag: 'sign_error',
                severity: 'major',
                created_at: '2026-03-02T00:00:00.000Z',
              },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      }

      if (query.table === 'mark_runs') {
        return {
          data: [
            {
              mark_run_id: 'mark-run-owned',
              attempt_id: 'attempt-owned',
              created_at: '2026-03-02T00:00:00.000Z',
            },
          ],
          error: null,
        };
      }

      if (query.table === 'mark_decisions') {
        return { data: [], error: null };
      }

      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const enrichmentMap = await loadEnrichmentMap(supabase, {
      userId: 'user-1',
      records: [
        {
          id: 'err-1',
          user_id: 'user-1',
          question: 'Backfill from event',
          metadata: {
            error_event_id: 'event-owned',
            mark_decision_id: 'decision-unowned',
          },
        },
      ],
    });

    const enrichment = enrichmentMap.get('err-1');
    expect(enrichment.attempt?.attempt_id).toBe('attempt-owned');
    expect(enrichment.errorEvent?.error_event_id).toBe('event-owned');
    expect(enrichment.markDecision).toBeNull();

    const decisionQuery = calls.find((query) => query.table === 'mark_decisions');
    expect(decisionQuery.filters.find((filter) => filter.field === 'mark_run_id')?.value).toEqual(['mark-run-owned']);
  });

  it('uses the read-model path for create responses so enrichment matches get/list', async () => {
    const supabase = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'insert') {
        return {
          data: {
            id: 'err-created',
            ...query.payload,
            storage_key: 'storage-1',
            q_number: 4,
          },
          error: null,
        };
      }

      if (query.table === 'attempts') {
        return {
          data: [
            {
              attempt_id: 'attempt-1',
              user_id: 'user-1',
              question_id: 'question-1',
              paper_id: 'paper-1',
              storage_key: 'storage-1',
              q_number: 4,
              syllabus_code: '9709',
              node_id: 'node-1',
              topic_path: '9709.p1.algebra',
              created_at: '2026-03-01T00:00:00.000Z',
            },
          ],
          error: null,
        };
      }

      if (query.table === 'error_events' || query.table === 'mark_runs' || query.table === 'mark_decisions') {
        return { data: [], error: null };
      }

      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    });

    const service = createErrorBookService({
      supabase,
      now: () => new Date('2026-03-01T00:00:00.000Z'),
      logger: { warn: jest.fn() },
    });

    const result = await service.createEntry({
      userId: 'user-1',
      body: {
        question: 'Created entry',
        storage_key: 'storage-1',
        q_number: 4,
      },
    });

    expect(result.item.enrichment.attempt.attempt_id).toBe('attempt-1');
    expect(result.item.paper_id).toBe('paper-1');
    expect(result.item.node_id).toBe('node-1');
  });
});
