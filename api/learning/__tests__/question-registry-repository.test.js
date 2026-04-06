import {
  findQuestionById,
  findQuestionsByType,
  insertImportedQuestion,
} from '../lib/repositories/question-registry-repository.js';

function createQuestionRegistryDb() {
  const inserts = [];
  const selects = [];
  const updates = [];

  return {
    inserts,
    selects,
    updates,
    from(table) {
      return {
        insert(payload) {
          return {
            select() {
              return this;
            },
            async single() {
              inserts.push({ table, payload });

              if (table === 'question_bank') {
                return {
                  data: {
                    question_id: payload.question_id || 'question-1',
                    ...payload,
                  },
                  error: null,
                };
              }

              if (table === 'learning_question_analysis_snapshots') {
                return {
                  data: {
                    classification_snapshot_id: 'snapshot-1',
                    ...payload,
                  },
                  error: null,
                };
              }

              throw new Error(`Unexpected insert table: ${table}`);
            },
          };
        },
        select(selection) {
          const filters = [];

          const builder = {
            eq(column, value) {
              filters.push({ column, value });
              return builder;
            },
            async maybeSingle() {
              selects.push({ table, selection, filters });

              if (table === 'question_bank') {
                return {
                  data: {
                    question_id: 'question-1',
                    source_kind: 'imported_question',
                    subject_code: '9709',
                    primary_question_type_id: '9709.trigonometry.equations',
                    classification_snapshot_ref: {
                      kind: 'classification_snapshot',
                      classification_snapshot_id: 'snapshot-1',
                    },
                  },
                  error: null,
                };
              }

              throw new Error(`Unexpected select table: ${table}`);
            },
            then(resolve, reject) {
              selects.push({ table, selection, filters });

              if (table === 'learning_question_registry_projection') {
                return Promise.resolve({
                  data: [
                    {
                      question_id: 'question-1',
                      source_kind: 'imported_question',
                      subject_code: '9709',
                      primary_question_type_id: '9709.trigonometry.equations',
                    },
                  ],
                  error: null,
                }).then(resolve, reject);
              }

              return Promise.reject(new Error(`Unexpected select table: ${table}`)).then(
                resolve,
                reject,
              );
            },
          };

          return builder;
        },
        update(payload) {
          return {
            async eq(column, value) {
              updates.push({ table, payload, filters: [{ column, value }] });
              return { data: null, error: null };
            },
          };
        },
      };
    },
  };
}

describe('question-registry-repository', () => {
  test('findQuestionById reads the stored durable question by id', async () => {
    const db = createQuestionRegistryDb();

    const question = await findQuestionById(db, {
      questionId: 'question-1',
    });

    expect(db.selects).toEqual([
      {
        table: 'question_bank',
        selection:
          'question_id, source_kind, subject_code, paper_scope, primary_topic_id, secondary_topic_ids, family_id, primary_question_type_id, secondary_question_type_ids, variant_tags, release_scope_status, prompt_representation, provenance_summary, classification_snapshot_ref',
        filters: [{ column: 'question_id', value: 'question-1' }],
      },
    ]);
    expect(question).toMatchObject({
      question_id: 'question-1',
      classification_snapshot_ref: {
        kind: 'classification_snapshot',
        classification_snapshot_id: 'snapshot-1',
      },
    });
  });

  test('findQuestionsByType reads the registry projection for the requested question type', async () => {
    const db = createQuestionRegistryDb();

    const questions = await findQuestionsByType(db, {
      subjectCode: '9709',
      questionTypeId: '9709.trigonometry.equations',
    });

    expect(db.selects).toEqual([
      {
        table: 'learning_question_registry_projection',
        selection: '*',
        filters: [
          { column: 'subject_code', value: '9709' },
          { column: 'primary_question_type_id', value: '9709.trigonometry.equations' },
        ],
      },
    ]);
    expect(questions).toEqual([
      expect.objectContaining({
        question_id: 'question-1',
        primary_question_type_id: '9709.trigonometry.equations',
      }),
    ]);
  });

  test('insertImportedQuestion stores a durable question without storage_key/q_number requirements and persists a typed snapshot ref', async () => {
    const db = createQuestionRegistryDb();

    const importedInput = {
      question_id: 'question-fixed-1',
      subject_code: '9709',
      prompt_representation: {
        type: 'text',
        value: 'Solve 2sin(x)=1 for 0<=x<=360.',
      },
      provenance_summary: {
        import_source: 'manual_paste',
      },
      release_scope_status: 'non_released_fallback',
      classification: {
        primary_topic_id: 'topic-1',
        secondary_topic_ids: ['topic-2'],
        family_id: '9709.trigonometry_manipulation_equations',
        primary_question_type_id: '9709.trigonometry.equations',
        secondary_question_type_ids: ['9709.trigonometry.identities'],
        variant_tags: ['paper:p1', 'answer_form:interval'],
        classification_source: 'manual_import',
        classification_confidence: 0.82,
        candidate_rubric_refs: [
          {
            kind: 'rubric_release',
            rubric_set_id: '9709.trig.eq',
            rubric_version_id: 'v1',
            scope_level: 'question_type',
            release_state: 'released',
          },
        ],
      },
    };

    const result = await insertImportedQuestion(db, importedInput);

    expect(db.inserts).toHaveLength(2);
    expect(db.inserts[0]).toMatchObject({
      table: 'question_bank',
      payload: {
        source_kind: 'imported_question',
        subject_code: '9709',
        prompt_representation: importedInput.prompt_representation,
        provenance_summary: importedInput.provenance_summary,
        primary_topic_id: 'topic-1',
        secondary_topic_ids: ['topic-2'],
        family_id: '9709.trigonometry_manipulation_equations',
        primary_question_type_id: '9709.trigonometry.equations',
        secondary_question_type_ids: ['9709.trigonometry.identities'],
        variant_tags: ['paper:p1', 'answer_form:interval'],
        release_scope_status: 'non_released_fallback',
      },
    });
    expect(db.inserts[0].payload).not.toHaveProperty('storage_key');
    expect(db.inserts[0].payload).not.toHaveProperty('q_number');

    expect(db.inserts[1]).toMatchObject({
      table: 'learning_question_analysis_snapshots',
      payload: {
        question_id: 'question-fixed-1',
        primary_topic_id: 'topic-1',
        secondary_topic_ids: ['topic-2'],
        family_id: '9709.trigonometry_manipulation_equations',
        primary_question_type_id: '9709.trigonometry.equations',
        secondary_question_type_ids: ['9709.trigonometry.identities'],
        variant_tags: ['paper:p1', 'answer_form:interval'],
        classification_source: 'manual_import',
        classification_confidence: 0.82,
        candidate_rubric_refs: importedInput.classification.candidate_rubric_refs,
      },
    });

    expect(db.updates).toEqual([
      {
        table: 'question_bank',
        payload: {
          classification_snapshot_ref: {
            kind: 'classification_snapshot',
            classification_snapshot_id: 'snapshot-1',
          },
        },
        filters: [{ column: 'question_id', value: 'question-fixed-1' }],
      },
    ]);

    expect(result).toMatchObject({
      question_id: 'question-fixed-1',
      source_kind: 'imported_question',
      primary_question_type_id: '9709.trigonometry.equations',
      classification_snapshot_ref: {
        kind: 'classification_snapshot',
        classification_snapshot_id: 'snapshot-1',
      },
    });
  });
});
