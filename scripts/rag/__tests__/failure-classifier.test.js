import { classifyFailure, summarizeFailureClasses } from '../lib/failure-classifier.js';

describe('S1.2 failure classifier', () => {
  it('classifies correct uncertain rows as CONTRACTUAL_UNCERTAIN_EXPECTED', () => {
    expect(
      classifyFailure({
        case_pass: true,
        uncertain: true,
        expected_behavior: 'uncertain',
      }),
    ).toBe('CONTRACTUAL_UNCERTAIN_EXPECTED');
  });

  it('classifies boundary lookup failures explicitly', () => {
    expect(
      classifyFailure({
        case_pass: false,
        expected_behavior: 'grounded_answer',
        error_code: 'RAG_BOUNDARY_LOOKUP_FAILED',
      }),
    ).toBe('BOUNDARY_LOOKUP_FAILURE');
  });

  it('classifies retriever failures as infrastructure failures', () => {
    expect(
      classifyFailure({
        case_pass: false,
        expected_behavior: 'grounded_answer',
        uncertain_reason_code: 'RETRIEVER_ERROR',
      }),
    ).toBe('RETRIEVER_INFRA_FAILURE');
  });

  it('classifies missing source_ref cases', () => {
    expect(
      classifyFailure({
        case_pass: false,
        expected_behavior: 'grounded_answer',
        evidence_count: 2,
        source_ref_unresolvable_count: 1,
      }),
    ).toBe('SOURCE_REF_MISSING');
  });

  it('classifies passed rows as NONE and summarizes breakdowns', () => {
    const rows = [
      {
        case_pass: true,
        uncertain: false,
        expected_behavior: 'grounded_answer',
        failure_class: 'NONE',
      },
      {
        case_pass: true,
        uncertain: true,
        expected_behavior: 'uncertain',
      },
    ];

    expect(classifyFailure(rows[0])).toBe('NONE');
    expect(summarizeFailureClasses(rows)).toEqual({
      NONE: 1,
      CONTRACTUAL_UNCERTAIN_EXPECTED: 1,
    });
  });
});
