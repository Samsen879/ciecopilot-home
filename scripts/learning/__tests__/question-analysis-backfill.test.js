import { runQuestionAnalysisBackfill } from '../lib/question-analysis-backfill.js';

function createBackfillClient() {
  const state = {
    nextSnapshotId: 1,
    nextEventId: 1,
    snapshots: new Map(),
    events: new Map(),
    questions: new Map(),
    registryFamilies: new Map([
      ['9709.trigonometry_manipulation_equations', { family_id: '9709.trigonometry_manipulation_equations', subject_code: '9709', release_state: 'released' }],
      ['9709.integration_techniques', { family_id: '9709.integration_techniques', subject_code: '9709', release_state: 'released' }],
      ['9709.differential_equations', { family_id: '9709.differential_equations', subject_code: '9709', release_state: 'released' }]
    ]),
    registryTypes: new Map([
      ['9709.trigonometry.identities', { question_type_id: '9709.trigonometry.identities', family_id: '9709.trigonometry_manipulation_equations', subject_code: '9709', release_state: 'released' }],
      ['9709.trigonometry.equations', { question_type_id: '9709.trigonometry.equations', family_id: '9709.trigonometry_manipulation_equations', subject_code: '9709', release_state: 'released' }],
      ['9709.integration.application', { question_type_id: '9709.integration.application', family_id: '9709.integration_techniques', subject_code: '9709', release_state: 'released' }],
      ['9709.differential_equations.separable', { question_type_id: '9709.differential_equations.separable', family_id: '9709.differential_equations', subject_code: '9709', release_state: 'released' }]
    ]),
  };

  function findFilter(filters, field) {
    return filters.find((filter) => filter.field === field)?.value ?? null;
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
      if (this.table === 'learning_question_families' && this.operation === 'select') {
        return Promise.resolve({
          data: state.registryFamilies.get(findFilter(this.filters, 'family_id')) || null,
          error: null,
        });
      }

      if (this.table === 'learning_question_types' && this.operation === 'select') {
        return Promise.resolve({
          data: state.registryTypes.get(findFilter(this.filters, 'question_type_id')) || null,
          error: null,
        });
      }

      if (this.table === 'learning_question_analysis_snapshots' && this.operation === 'insert') {
        const snapshotId = `snapshot-${state.nextSnapshotId++}`;
        const row = { classification_snapshot_id: snapshotId, ...this.payload };
        state.snapshots.set(snapshotId, row);
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'learning_question_analysis_snapshots' && this.operation === 'update') {
        const snapshotId = findFilter(this.filters, 'classification_snapshot_id');
        const current = state.snapshots.get(snapshotId);
        state.snapshots.set(snapshotId, { ...current, ...this.payload });
        return Promise.resolve({ data: null, error: null });
      }

      if (this.table === 'learning_question_events' && this.operation === 'insert') {
        const eventId = `question-event-${state.nextEventId++}`;
        const row = { question_event_id: eventId, ...this.payload };
        state.events.set(eventId, row);
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'question_bank' && this.operation === 'update') {
        const questionId = findFilter(this.filters, 'question_id');
        state.questions.set(questionId, {
          ...(state.questions.get(questionId) || {}),
          ...this.payload,
        });
        return Promise.resolve({ data: null, error: null });
      }

      return Promise.resolve({ data: [], error: null });
    }
  }

  return {
    state,
    client: {
      from(table) {
        return new QueryBuilder(table);
      },
    },
  };
}

describe('question-analysis backfill', () => {
  test('backfills missing snapshots and emits QuestionClassified events for imported questions', async () => {
    const { client, state } = createBackfillClient();

    const summary = await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-1',
          source_kind: 'imported_question',
          subject_code: '9709',
          prompt_representation: {
            type: 'text',
            value: 'Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.',
          },
          provenance_summary: {
            import_source: 'manual_paste',
          },
          classification_snapshot_ref: null,
        },
      ],
    });

    expect(summary).toMatchObject({
      processed: 1,
      backfilled: 1,
      skipped: 0,
    });
    expect(state.snapshots.get('snapshot-1')).toMatchObject({
      primary_question_type_id: '9709.differential_equations.separable',
      low_confidence_posture: null,
    });
    expect(state.events.get('question-event-1')).toMatchObject({
      event_type: 'QuestionClassified',
      question_id: 'question-1',
      classification_snapshot_id: 'snapshot-1',
    });
    expect(state.questions.get('question-1')).toMatchObject({
      primary_question_type_id: '9709.differential_equations.separable',
      release_scope_status: 'released_scoring',
    });
  });

  test('skips questions that already have an active snapshot unless force is enabled', async () => {
    const { client } = createBackfillClient();

    const summary = await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-keep',
          source_kind: 'imported_question',
          subject_code: '9709',
          prompt_representation: {
            type: 'text',
            value: 'Prove that 1 - tan^2(x) = cos(2x) / cos^2(x).',
          },
          provenance_summary: {
            import_source: 'manual_paste',
          },
          classification_snapshot_ref: {
            kind: 'classification_snapshot',
            classification_snapshot_id: 'snapshot-existing',
          },
        },
      ],
    });

    expect(summary).toMatchObject({
      processed: 1,
      backfilled: 0,
      skipped: 1,
      items: [
        {
          question_id: 'question-keep',
          status: 'skipped_existing_snapshot',
        },
      ],
    });
  });
});
