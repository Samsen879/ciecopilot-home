import { buildMarkingResult } from '../lib/marking-result-contract.js';

describe('marking-result-contract', () => {
  test('maps rubric point results back to explicit part and subpart ids', () => {
    const result = buildMarkingResult({
      questionId: 'question-1',
      attemptId: 'attempt-1',
      markRunId: 'mark-run-1',
      questionTypeId: '9709.trigonometry.equations',
      decisions: [
        {
          rubric_id: 'rubric-1',
          mark_label: 'M1',
          awarded: true,
          awarded_marks: 1,
          reason: 'best_match',
          alignment_confidence: 0.91,
        },
        {
          rubric_id: 'rubric-2',
          mark_label: 'A1',
          awarded: false,
          awarded_marks: 0,
          reason: 'no_match',
          alignment_confidence: 0.42,
        },
      ],
      rubricPoints: [
        {
          rubric_id: 'rubric-1',
          mark_label: 'M1',
          marks: 1,
          subpart: 'a_i',
        },
        {
          rubric_id: 'rubric-2',
          mark_label: 'A1',
          marks: 2,
          part_id: 'b',
          subpart_id: 'b_ii',
        },
      ],
    });

    expect(result.marking_summary).toMatchObject({
      total_awarded: 1,
      total_available: 3,
      coverage_scope: 'question',
      local_signal_only: false,
      part_result_count: 2,
      ambiguous_rubric_point_result_count: 0,
    });
    expect(result.part_results).toEqual([
      expect.objectContaining({
        part_id: 'a',
        subpart_id: 'a_i',
        score_awarded: 1,
        score_max: 1,
        mapped_question_type_refs: [
          {
            kind: 'question_type',
            question_type_id: '9709.trigonometry.equations',
          },
        ],
        rubric_point_results: [
          expect.objectContaining({
            rubric_id: 'rubric-1',
            part_id: 'a',
            subpart_id: 'a_i',
            score_max: 1,
          }),
        ],
      }),
      expect.objectContaining({
        part_id: 'b',
        subpart_id: 'b_ii',
        score_awarded: 0,
        score_max: 2,
      }),
    ]);
  });

  test('inherits explicit request scope for local subpart runs', () => {
    const result = buildMarkingResult({
      questionId: 'question-1',
      attemptId: 'attempt-1',
      markRunId: 'mark-run-1',
      requestSubpartId: 'a_i',
      decisions: [
        {
          rubric_id: 'rubric-1',
          mark_label: 'M1',
          awarded: true,
          awarded_marks: 1,
          reason: 'best_match',
        },
      ],
      rubricPoints: [
        {
          rubric_id: 'rubric-1',
          mark_label: 'M1',
          marks: 1,
        },
      ],
    });

    expect(result.marking_summary).toMatchObject({
      coverage_scope: 'subpart',
      local_signal_only: true,
      ambiguous_rubric_point_result_count: 0,
    });
    expect(result.part_results).toEqual([
      expect.objectContaining({
        part_id: 'a',
        subpart_id: 'a_i',
        score_awarded: 1,
        score_max: 1,
      }),
    ]);
  });

  test('falls back conservatively when point mappings are incomplete', () => {
    const result = buildMarkingResult({
      questionId: 'question-1',
      attemptId: 'attempt-1',
      markRunId: 'mark-run-1',
      decisions: [
        {
          rubric_id: 'rubric-1',
          mark_label: 'M1',
          awarded: true,
          awarded_marks: 1,
          reason: 'best_match',
        },
        {
          rubric_id: 'rubric-2',
          mark_label: 'A1',
          awarded: false,
          awarded_marks: 0,
          reason: 'no_match',
        },
      ],
      rubricPoints: [
        {
          rubric_id: 'rubric-1',
          mark_label: 'M1',
          marks: 1,
          subpart: 'a_i',
        },
        {
          rubric_id: 'rubric-2',
          mark_label: 'A1',
          marks: 1,
        },
      ],
    });

    expect(result.marking_summary).toMatchObject({
      ambiguous_rubric_point_result_count: 1,
      conservative_part_mapping: true,
    });
    expect(result.learning_hints).toMatchObject({
      conservative_part_mapping: true,
    });
    expect(result.part_results).toEqual([
      expect.objectContaining({
        part_id: 'a',
        subpart_id: 'a_i',
      }),
    ]);
  });
});
