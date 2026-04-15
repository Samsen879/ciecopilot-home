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

    is(field, value) {
      this.filters.push({ field, value, operator: 'is' });
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
        const activeSnapshot = [...state.snapshots.values()].find(
          (snapshot) => snapshot.question_id === this.payload.question_id
            && (snapshot.superseded_by_snapshot_id ?? null) === null,
        );
        if (activeSnapshot) {
          return Promise.resolve({
            data: null,
            error: {
              message:
                'duplicate key value violates unique constraint "uq_learning_question_analysis_snapshots_active"',
            },
          });
        }

        const snapshotId = this.payload.classification_snapshot_id || `snapshot-${state.nextSnapshotId++}`;
        const row = {
          superseded_by_snapshot_id: null,
          classification_snapshot_id: snapshotId,
          ...this.payload,
        };
        state.snapshots.set(snapshotId, row);
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'learning_question_analysis_snapshots' && this.operation === 'select') {
        const questionId = findFilter(this.filters, 'question_id');
        const supersededBySnapshotIdFilter = this.filters.find(
          (filter) => filter.field === 'superseded_by_snapshot_id' && filter.operator === 'is',
        );
        const row = [...state.snapshots.values()].find((snapshot) => (
          snapshot.question_id === questionId
          && (
            !supersededBySnapshotIdFilter
            || (snapshot.superseded_by_snapshot_id ?? null) === supersededBySnapshotIdFilter.value
          )
        )) || null;

        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'learning_question_analysis_snapshots' && this.operation === 'update') {
        const snapshotId = findFilter(this.filters, 'classification_snapshot_id');
        const current = state.snapshots.get(snapshotId);
        if (!current) {
          return Promise.resolve({
            data: null,
            error: { message: `Snapshot not found for ${snapshotId}` },
          });
        }
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

  test('passes per-question analysisHints through the batch runner when no evidence bundle is present', async () => {
    const { client, state } = createBackfillClient();

    const summary = await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-hints',
          source_kind: 'imported_question',
          subject_code: '9709',
          prompt_representation: {
            type: 'text',
            value: 'What is the capital of France?',
          },
          analysisHints: {
            runtime_context_id: '9709.integration.application',
            question_type_hint_id: '9709.integration.application',
            topic_path_hint: '9709.p3.integration',
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
      primary_question_type_id: '9709.integration.application',
      analysis_audit_metadata: expect.objectContaining({
        analysis_hints: expect.objectContaining({
          question_type_hint_id: '9709.integration.application',
          topic_path_hint: '9709.p3.integration',
        }),
      }),
    });
  });

  test('prefers question evidence bundle OCR text and persists replay provenance for gate-critical rows', async () => {
    const { client, state } = createBackfillClient();

    const summary = await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-bundle',
          source_kind: 'imported_question',
          subject_code: '9709',
          prompt_representation: {
            type: 'text',
            value: 'Unreadable raw image placeholder.',
          },
          questionEvidenceBundle: {
            schema_version: 'question_evidence_bundle_v1',
            storage_key: '9709/s19_qp_11/questions/q06.png',
            analysis_hints: {
              topic_path_hint: '9709.p3.differential_equations',
            },
            evidence: {
              ocr_text: 'Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.',
              formula_latex_list: ['\\frac{dy}{dx} = 2xy'],
              subquestion_blocks: ['(a) Solve the differential equation.'],
              layout_hints: ['single_column_prompt'],
              diagram_present: false,
              diagram_elements: [],
              spatial_evidence: [],
            },
            route: {
              route: 'review_lane',
              model: 'qwen3.6-plus',
              region: 'dashscope-cn',
              prompt_template_version: 'v1',
              response_schema_version: 'v1',
            },
            model_provenance: [
              {
                route: 'review_lane',
                model: 'qwen3.6-plus',
                region: 'dashscope-cn',
                prompt_template_version: 'v1',
                response_schema_version: 'v1',
              },
            ],
            lazy_attach_original_image: true,
            lazy_attach_reasons: ['gate_critical', 'requires_review'],
            original_image_asset: {
              input_asset_id: '9709/s19_qp_11/questions/q06.png',
              input_asset_hash: 'hash-review-1',
            },
            review_posture: {
              requires_review: true,
              gate_critical: true,
            },
          },
          provenance_summary: {
            import_source: 'manual_paste',
            storage_key: '9709/s19_qp_11/questions/q06.png',
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
      analysis_audit_metadata: expect.objectContaining({
        ao_input_source: 'question_evidence_bundle_v1',
        question_evidence_bundle_v1: expect.objectContaining({
          storage_key: '9709/s19_qp_11/questions/q06.png',
          lazy_attach_original_image: true,
          route: expect.objectContaining({
            route: 'review_lane',
            model: 'qwen3.6-plus',
            region: 'dashscope-cn',
            prompt_template_version: 'v1',
            response_schema_version: 'v1',
          }),
        }),
      }),
    });
    expect(state.events.get('question-event-1')).toMatchObject({
      provenance: expect.objectContaining({
        audit_metadata: expect.objectContaining({
          ao_input_source: 'question_evidence_bundle_v1',
        }),
      }),
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

  test('force backfill supersedes the existing active snapshot before inserting the replacement', async () => {
    const { client, state } = createBackfillClient();
    state.snapshots.set('snapshot-existing', {
      classification_snapshot_id: 'snapshot-existing',
      question_id: 'question-force',
      primary_question_type_id: '9709.trigonometry.identities',
      superseded_by_snapshot_id: null,
    });

    const summary = await runQuestionAnalysisBackfill(client, {
      force: true,
      questions: [
        {
          question_id: 'question-force',
          source_kind: 'imported_question',
          subject_code: '9709',
          prompt_representation: {
            type: 'text',
            value: 'Solve the differential equation dy/dx = 2xy given that y = 1 when x = 0.',
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
      backfilled: 1,
      skipped: 0,
      items: [
        {
          question_id: 'question-force',
          status: 'backfilled',
        },
      ],
    });
    const replacementSnapshotId = summary.items[0].classification_snapshot_id;
    expect(typeof replacementSnapshotId).toBe('string');
    expect(replacementSnapshotId).not.toBe('snapshot-existing');
    expect(state.snapshots.get('snapshot-existing')).toMatchObject({
      superseded_by_snapshot_id: replacementSnapshotId,
    });
    expect(state.snapshots.get(replacementSnapshotId)).toMatchObject({
      question_id: 'question-force',
      superseded_by_snapshot_id: null,
      primary_question_type_id: '9709.differential_equations.separable',
    });
    expect(state.questions.get('question-force')).toMatchObject({
      classification_snapshot_ref: {
        kind: 'classification_snapshot',
        classification_snapshot_id: replacementSnapshotId,
      },
    });
  });
});
