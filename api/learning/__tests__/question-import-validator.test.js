import { validateQuestionImportInput } from '../lib/validators/question-import-validator.js';

test('import validator requires subject_code and prompt_representation', () => {
  expect(() => validateQuestionImportInput({ subject_code: '9709' })).toThrow(/invalid_payload/);
});

test('import validator rejects non-import source kinds', () => {
  expect(() => validateQuestionImportInput({
    subject_code: '9709',
    source_kind: 'paper_question',
    prompt_representation: { type: 'text', value: 'Solve 2sinx = 1' },
  })).toThrow(/invalid_payload/);
});

test('import validator normalizes imported question source payload before writes', () => {
  expect(validateQuestionImportInput({
    subject_code: ' 9709 ',
    prompt_representation: { type: 'text', value: 'Solve 2sinx = 1' },
  })).toEqual({
    ok: true,
    normalized: {
      source_kind: 'imported_question',
      subject_code: '9709',
      prompt_representation: {
        type: 'text',
        value: 'Solve 2sinx = 1',
      },
    },
  });
});

