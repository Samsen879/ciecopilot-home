import { runQuestionAnalysisBackfill } from '../lib/question-analysis-backfill.js';

function createBackfillClient() {
  const state = {
    nextSnapshotId: 1,
    nextEventId: 1,
    snapshots: new Map(),
    events: new Map(),
    questions: new Map(),
    failSnapshotInsertForQuestionIds: new Set(),
    failEventInsertForQuestionIds: new Set(),
    failQuestionUpdateForQuestionIds: new Set(),
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

    delete() {
      this.operation = 'delete';
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
        if (state.failSnapshotInsertForQuestionIds.has(this.payload.question_id)) {
          return Promise.resolve({
            data: null,
            error: {
              message: 'simulated snapshot insert failure',
            },
          });
        }

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

      if (this.table === 'learning_question_analysis_snapshots' && this.operation === 'delete') {
        const snapshotId = findFilter(this.filters, 'classification_snapshot_id');
        state.snapshots.delete(snapshotId);
        for (const [eventId, event] of state.events.entries()) {
          if (event.classification_snapshot_id === snapshotId) {
            state.events.delete(eventId);
          }
        }
        return Promise.resolve({ data: null, error: null });
      }

      if (this.table === 'learning_question_events' && this.operation === 'insert') {
        if (state.failEventInsertForQuestionIds.has(this.payload.question_id)) {
          return Promise.resolve({
            data: null,
            error: { message: 'simulated question event insert failure' },
          });
        }

        const eventId = `question-event-${state.nextEventId++}`;
        const row = { question_event_id: eventId, ...this.payload };
        state.events.set(eventId, row);
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'question_bank' && this.operation === 'update') {
        const questionId = findFilter(this.filters, 'question_id');
        if (state.failQuestionUpdateForQuestionIds.has(questionId)) {
          return Promise.resolve({
            data: null,
            error: { message: 'simulated question_bank update failure' },
          });
        }
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

  test('classifies from non-OCR bundle evidence when formula_latex_list carries the signal', async () => {
    const { client, state } = createBackfillClient();

    const summary = await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-formula-only',
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
              ocr_text: '',
              formula_latex_list: ['dy/dx = 2xy'],
              subquestion_blocks: [],
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
            lazy_attach_reasons: ['requires_review'],
            original_image_asset: {
              input_asset_id: '9709/s19_qp_11/questions/q06.png',
              input_asset_hash: 'hash-review-1',
            },
            review_posture: {
              requires_review: true,
              gate_critical: false,
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
      }),
    });
  });

  test('records which structured bundle sections were serialized into the AO classification input', async () => {
    const { client, state } = createBackfillClient();

    await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-structured-sections',
          source_kind: 'imported_question',
          subject_code: '9709',
          prompt_representation: {
            type: 'text',
            value: 'Unreadable raw image placeholder.',
          },
          questionEvidenceBundle: {
            schema_version: 'question_evidence_bundle_v1',
            storage_key: '9709/s20_qp_33/questions/q02.png',
            analysis_hints: {
              topic_path_hint: '9709.p3.integration',
            },
            evidence: {
              ocr_text: '',
              formula_latex_list: ['\\int (2x+1)(x^2+x)^4 \\, dx'],
              subquestion_blocks: ['(a) Evaluate the integral.'],
              layout_hints: ['single_column_prompt'],
              diagram_present: true,
              diagram_elements: ['curve C labelled y=f(x)'],
              spatial_evidence: ['bounded by the x-axis'],
            },
            route: {
              route: 'review_lane',
              model: 'qwen3.6-plus',
              region: 'dashscope-cn',
              prompt_template_version: 'v1',
              response_schema_version: 'v1',
            },
            model_provenance: [],
            lazy_attach_original_image: true,
            lazy_attach_reasons: ['requires_review'],
            original_image_asset: {
              input_asset_id: '9709/s20_qp_33/questions/q02.png',
              input_asset_hash: 'hash-review-2',
            },
            review_posture: {
              requires_review: true,
              gate_critical: false,
            },
          },
          provenance_summary: {
            import_source: 'manual_paste',
            storage_key: '9709/s20_qp_33/questions/q02.png',
          },
          classification_snapshot_ref: null,
        },
      ],
    });

    expect(state.snapshots.get('snapshot-1')).toMatchObject({
      analysis_audit_metadata: expect.objectContaining({
        question_evidence_bundle_v1: expect.objectContaining({
          classification_input_sections: expect.arrayContaining([
            'formula_latex_list',
            'subquestion_blocks',
            'layout_hints',
            'diagram_present',
            'diagram_elements',
            'spatial_evidence',
          ]),
        }),
      }),
    });
  });

  test('paper_question backfill preserves deterministic primary topic and persists evidence-derived summary/search text', async () => {
    const { client, state } = createBackfillClient();

    const summary = await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-paper-trig',
          source_kind: 'paper_question',
          subject_code: '9709',
          storage_key: '9709/s19_qp_11/questions/q06.png',
          q_number: 6,
          primary_topic_id: 'topic-trigonometry',
          paper_scope: {
            year: 2019,
            session: 's',
            paper: 1,
            q_number: 6,
          },
          prompt_representation: null,
          questionEvidenceBundle: {
            schema_version: 'question_evidence_bundle_v1',
            storage_key: '9709/s19_qp_11/questions/q06.png',
            analysis_hints: {
              topic_path_hint: '9709.p1.trigonometry',
            },
            evidence: {
              ocr_text:
                '(i) Prove the identity (1/cos x - tan x)^2 = 1/(1 + sin x). (ii) Hence solve the equation (1/cos 2x - tan 2x)^2 = 2/3 for 0 <= x <= pi.',
              formula_latex_list: [
                '\\left(\\frac{1}{\\cos x} - \\tan x\\right)^2 = \\frac{1}{1 + \\sin x}',
                '\\left(\\frac{1}{\\cos 2x} - \\tan 2x\\right)^2 = \\frac{2}{3}',
              ],
              subquestion_blocks: [
                '(i) Prove the identity.',
                '(ii) Hence solve the equation.',
              ],
              layout_hints: ['vertical_subquestions'],
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
            model_provenance: [],
            lazy_attach_original_image: true,
            lazy_attach_reasons: ['gate_critical'],
            original_image_asset: {
              input_asset_id: '9709/s19_qp_11/questions/q06.png',
              input_asset_hash: 'hash-paper-1',
            },
            review_posture: {
              requires_review: true,
              gate_critical: true,
            },
          },
          provenance_summary: {
            storage_key: '9709/s19_qp_11/questions/q06.png',
            q_number: 6,
            primary_topic_path: '9709.p1.trigonometry',
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
    expect(state.questions.get('question-paper-trig')).toMatchObject({
      primary_topic_id: 'topic-trigonometry',
      prompt_representation: {
        type: 'text',
        value: expect.stringContaining('Prove the identity'),
      },
      provenance_summary: expect.objectContaining({
        summary: expect.stringContaining('Prove the identity'),
        search_text: expect.stringContaining('trigonometric identity'),
        descriptor_summary_status: 'evidence_bundle_summary',
        descriptor_search_text_status: 'evidence_bundle_search_text',
      }),
    });
    expect(state.questions.get('question-paper-trig').provenance_summary.search_text).toEqual(
      expect.stringContaining('solve equation'),
    );
    expect(state.questions.get('question-paper-trig').provenance_summary.search_text).toEqual(
      expect.stringContaining('Prove trigonometric identity and solve equation'),
    );
  });

  test('paper_question search text adds retrieval-oriented integral substitution cues', async () => {
    const { client, state } = createBackfillClient();

    await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-paper-integral',
          source_kind: 'paper_question',
          subject_code: '9709',
          storage_key: '9709/s16_qp_33/questions/q07.png',
          q_number: 7,
          primary_topic_id: 'topic-integration',
          paper_scope: {
            year: 2016,
            session: 's',
            paper: 3,
            q_number: 7,
          },
          prompt_representation: null,
          questionEvidenceBundle: {
            schema_version: 'question_evidence_bundle_v1',
            storage_key: '9709/s16_qp_33/questions/q07.png',
            analysis_hints: {
              topic_path_hint: '9709.p3.integration',
            },
            evidence: {
              ocr_text:
                'Let I = integral from 0 to 1 of x^5/(1 + x^2)^3 dx. (i) Using the substitution u = 1 + x^2, show that I = integral from 1 to 2 of (u - 1)^2/(2u^3) du. (ii) Hence find the exact value of I.',
              formula_latex_list: [
                'I = \\int_{0}^{1} \\frac{x^5}{(1 + x^2)^3} dx',
                'u = 1 + x^2',
                'I = \\int_{1}^{2} \\frac{(u - 1)^2}{2u^3} du',
              ],
              subquestion_blocks: [
                '(i) Using the substitution u = 1 + x^2, show that ...',
                '(ii) Hence find the exact value of I.',
              ],
              layout_hints: ['single_column_prompt'],
              diagram_present: false,
              diagram_elements: [],
              spatial_evidence: [],
            },
            route: {
              route: 'ocr_lane',
              model: 'qwen3.6-plus',
              region: 'dashscope-cn',
              prompt_template_version: 'v1',
              response_schema_version: 'v1',
            },
            model_provenance: [],
            lazy_attach_original_image: false,
            lazy_attach_reasons: [],
            original_image_asset: null,
            review_posture: {
              requires_review: false,
              gate_critical: false,
            },
          },
          provenance_summary: {
            storage_key: '9709/s16_qp_33/questions/q07.png',
            q_number: 7,
            primary_topic_path: '9709.p3.integration',
          },
          classification_snapshot_ref: null,
        },
      ],
    });

    expect(state.questions.get('question-paper-integral').provenance_summary.search_text).toEqual(
      expect.stringContaining('evaluate integral'),
    );
    expect(state.questions.get('question-paper-integral').provenance_summary.search_text).toEqual(
      expect.stringContaining('using substitution'),
    );
    expect(state.questions.get('question-paper-integral').provenance_summary.search_text).toEqual(
      expect.stringContaining('Evaluate integral I using substitution'),
    );
    expect(state.questions.get('question-paper-integral').provenance_summary.search_text).not.toContain(
      'trigonometric identity',
    );
  });

  test('paper_question search text normalizes exact-value definite integrals for aggregate probe retrieval', async () => {
    const { client, state } = createBackfillClient();

    await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-paper-integral-exact-value',
          source_kind: 'paper_question',
          subject_code: '9709',
          storage_key: '9709/s17_qp_33/questions/q04.png',
          q_number: 4,
          primary_topic_id: 'topic-integration',
          paper_scope: {
            year: 2017,
            session: 's',
            paper: 3,
            q_number: 4,
          },
          prompt_representation: null,
          questionEvidenceBundle: {
            schema_version: 'question_evidence_bundle_v1',
            storage_key: '9709/s17_qp_33/questions/q04.png',
            analysis_hints: {
              topic_path_hint: '9709.p3.integration',
            },
            evidence: {
              ocr_text: 'Find the exact value of ∫₀^(π/3) 6 sin²θ dθ. [4]',
              formula_latex_list: [
                '\\int_{0}^{\\frac{\\pi}{3}} 6 \\sin^2 \\theta \\, d\\theta',
              ],
              subquestion_blocks: [],
              layout_hints: [
                'dotted_lines_for_answer',
                'question_number_or_marks_top_right',
              ],
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
            model_provenance: [],
            lazy_attach_original_image: true,
            lazy_attach_reasons: ['route_requires_original_image', 'gate_critical'],
            original_image_asset: {
              input_asset_id: '9709/s17_qp_33/questions/q04.png',
              input_asset_hash: '5d642a571233901518d6ed87b82931330405f853f256fb4dcd9dab8f5cf18c68',
            },
            review_posture: {
              requires_review: false,
              gate_critical: true,
            },
          },
          provenance_summary: {
            storage_key: '9709/s17_qp_33/questions/q04.png',
            q_number: 4,
            primary_topic_path: '9709.p3.integration',
          },
          classification_snapshot_ref: null,
        },
      ],
    });

    expect(
      state.questions.get('question-paper-integral-exact-value').provenance_summary.search_text,
    ).toEqual(expect.stringContaining('Find the exact value integral 6 sin squared theta'));
  });

  test('paper_question exact-value integral cue strips arbitrary leading bounds from the formula integrand', async () => {
    const { client, state } = createBackfillClient();

    await runQuestionAnalysisBackfill(client, {
      questions: [
        {
          question_id: 'question-paper-integral-generic-bounds',
          source_kind: 'paper_question',
          subject_code: '9709',
          storage_key: '9709/mock_qp_33/questions/q05.png',
          q_number: 5,
          primary_topic_id: 'topic-integration',
          paper_scope: {
            year: 2018,
            session: 'w',
            paper: 3,
            q_number: 5,
          },
          prompt_representation: null,
          questionEvidenceBundle: {
            schema_version: 'question_evidence_bundle_v1',
            storage_key: '9709/mock_qp_33/questions/q05.png',
            analysis_hints: {
              topic_path_hint: '9709.p3.integration',
            },
            evidence: {
              ocr_text: 'Find the exact value of ∫₁² 4x cos x dx. [5]',
              formula_latex_list: [
                '\\int_{1}^{2} 4x \\cos x \\, dx',
              ],
              subquestion_blocks: [],
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
            model_provenance: [],
            lazy_attach_original_image: true,
            lazy_attach_reasons: ['route_requires_original_image', 'gate_critical'],
            original_image_asset: null,
            review_posture: {
              requires_review: false,
              gate_critical: true,
            },
          },
          provenance_summary: {
            storage_key: '9709/mock_qp_33/questions/q05.png',
            q_number: 5,
            primary_topic_path: '9709.p3.integration',
          },
          classification_snapshot_ref: null,
        },
      ],
    });

    expect(
      state.questions.get('question-paper-integral-generic-bounds').provenance_summary.search_text,
    ).toEqual(expect.stringContaining('Find the exact value integral 4x cos x'));
    expect(
      state.questions.get('question-paper-integral-generic-bounds').provenance_summary.search_text,
    ).not.toEqual(expect.stringContaining('Find the exact value integral 1 2 4x cos x'));
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

  test('force backfill replaces the existing active snapshot when the replacement succeeds', async () => {
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

  test('force backfill keeps the existing snapshot active when replacement insertion fails', async () => {
    const { client, state } = createBackfillClient();
    state.snapshots.set('snapshot-existing', {
      classification_snapshot_id: 'snapshot-existing',
      question_id: 'question-force-fails',
      primary_question_type_id: '9709.trigonometry.identities',
      superseded_by_snapshot_id: null,
    });
    state.failSnapshotInsertForQuestionIds.add('question-force-fails');

    await expect(runQuestionAnalysisBackfill(client, {
      force: true,
      questions: [
        {
          question_id: 'question-force-fails',
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
    })).rejects.toThrow('Failed to insert backfill question classification snapshot');

    expect(state.snapshots.get('snapshot-existing')).toMatchObject({
      classification_snapshot_id: 'snapshot-existing',
      question_id: 'question-force-fails',
      superseded_by_snapshot_id: null,
    });
    expect([...state.snapshots.keys()]).toEqual(['snapshot-existing']);
    expect(state.events.size).toBe(0);
    expect(state.questions.get('question-force-fails')).toBeUndefined();
  });

  test('force backfill restores the existing snapshot when downstream question_bank update fails', async () => {
    const { client, state } = createBackfillClient();
    state.snapshots.set('snapshot-existing', {
      classification_snapshot_id: 'snapshot-existing',
      question_id: 'question-force-question-update-fails',
      primary_question_type_id: '9709.trigonometry.identities',
      superseded_by_snapshot_id: null,
    });
    state.failQuestionUpdateForQuestionIds.add('question-force-question-update-fails');

    await expect(runQuestionAnalysisBackfill(client, {
      force: true,
      questions: [
        {
          question_id: 'question-force-question-update-fails',
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
    })).rejects.toThrow('Failed to update question_bank during question-analysis backfill');

    expect(state.snapshots.get('snapshot-existing')).toMatchObject({
      classification_snapshot_id: 'snapshot-existing',
      question_id: 'question-force-question-update-fails',
      superseded_by_snapshot_id: null,
    });
    expect([...state.snapshots.keys()]).toEqual(['snapshot-existing']);
    expect(state.events.size).toBe(0);
    expect(state.questions.get('question-force-question-update-fails')).toBeUndefined();
  });
});
