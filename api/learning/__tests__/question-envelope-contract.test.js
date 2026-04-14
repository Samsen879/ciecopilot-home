import { normalizeQuestionEnvelope } from '../lib/question-analysis/question-envelope-contract.js';

describe('question-envelope-contract: normalizeQuestionEnvelope', () => {
  // ─── valid input ───

  test('produces a valid envelope from well-formed input', () => {
    const result = normalizeQuestionEnvelope({
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: { type: 'text', value: 'Solve for x.' },
      paper_scope: { series: 'm24' },
      provenance_summary: { import_source: 'manual_paste' },
    });

    expect(result).toEqual({
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: { type: 'text', value: 'Solve for x.' },
      paper_scope: { series: 'm24' },
      provenance_summary: { import_source: 'manual_paste' },
    });
  });

  // ─── default source_kind ───

  test('defaults source_kind to "imported_question" when empty', () => {
    const result = normalizeQuestionEnvelope({
      subject_code: '9709',
      prompt_representation: { type: 'text', value: 'test' },
    });

    expect(result.source_kind).toBe('imported_question');
  });

  test('defaults source_kind to "imported_question" when missing', () => {
    const result = normalizeQuestionEnvelope({
      subject_code: '9709',
      prompt_representation: { type: 'text', value: 'test' },
    });

    expect(result.source_kind).toBe('imported_question');
  });

  // ─── null handling ───

  test('paper_scope is null when not provided', () => {
    const result = normalizeQuestionEnvelope({
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: { type: 'text', value: 'test' },
    });

    expect(result.paper_scope).toBeNull();
  });

  test('provenance_summary defaults to empty object when not provided', () => {
    const result = normalizeQuestionEnvelope({
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: { type: 'text', value: 'test' },
    });

    expect(result.provenance_summary).toEqual({});
  });

  // ─── validation errors ───

  test('throws when subject_code is missing', () => {
    expect(() =>
      normalizeQuestionEnvelope({
        prompt_representation: { type: 'text', value: 'test' },
      }),
    ).toThrow('subject_code');
  });

  test('throws when prompt_representation is not an object', () => {
    expect(() =>
      normalizeQuestionEnvelope({
        subject_code: '9709',
        prompt_representation: 'not an object',
      }),
    ).toThrow('prompt_representation');
  });

  test('throws when prompt_representation.type is missing', () => {
    expect(() =>
      normalizeQuestionEnvelope({
        subject_code: '9709',
        prompt_representation: { value: 'test' },
      }),
    ).toThrow('prompt_representation.type');
  });

  test('throws when prompt_representation.value is missing', () => {
    expect(() =>
      normalizeQuestionEnvelope({
        subject_code: '9709',
        prompt_representation: { type: 'text' },
      }),
    ).toThrow('prompt_representation.value');
  });

  // ─── immutability ───

  test('returned envelope is a deep clone (mutating input does not affect output)', () => {
    const input = {
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: { type: 'text', value: 'original' },
      paper_scope: { series: 'm24' },
      provenance_summary: { import_source: 'manual_paste' },
    };

    const result = normalizeQuestionEnvelope(input);
    input.prompt_representation.value = 'mutated';

    expect(result.prompt_representation.value).toBe('original');
  });
});
