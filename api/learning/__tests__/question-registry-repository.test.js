import { insertImportedQuestion } from '../lib/repositories/question-registry-repository.js';

function createQuestionRegistryDb() {
  const inserts = [];
  const updates = [];

  return {
    inserts,
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
                    question_id: 'question-1',
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
  test('insertImportedQuestion stores a durable question without storage_key/q_number requirements and persists a typed snapshot ref', async () => {
    const db = createQuestionRegistryDb();

    const importedInput = {
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
        question_id: 'question-1',
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
        filters: [{ column: 'question_id', value: 'question-1' }],
      },
    ]);

    expect(result).toMatchObject({
      question_id: 'question-1',
      source_kind: 'imported_question',
      primary_question_type_id: '9709.trigonometry.equations',
      classification_snapshot_ref: {
        kind: 'classification_snapshot',
        classification_snapshot_id: 'snapshot-1',
      },
    });
  });
});
