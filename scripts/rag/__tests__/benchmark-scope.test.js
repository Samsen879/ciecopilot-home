import {
  inferCorpusVersionSubjectScope,
  summarizeDatasetSubjectScope,
  validateBenchmarkScope,
} from '../lib/benchmark-scope.js';

describe('benchmark scope validation', () => {
  test('rejects mixed-subject manifests under single-subject corpus scope', () => {
    expect(() =>
      validateBenchmarkScope({
        manifest: {
          benchmark_profile: 's2_augmentation_eval_v1',
          subject_scope: 'mixed_subject',
          subject_codes: ['9709', '9702', '9231'],
        },
        selectedCases: [
          { case_id: 'a', subject_code: '9709' },
          { case_id: 'b', subject_code: '9231' },
        ],
        corpusVersions: ['rag_step3_9709_pilot_20260309074606'],
      }),
    ).toThrow('mixed-subject benchmark cannot run with a single-subject corpus scope');
  });

  test('rejects single-subject manifests when corpus scope targets a different subject', () => {
    expect(() =>
      validateBenchmarkScope({
        manifest: {
          benchmark_profile: 'rag_step3_retrieval_availability',
          subject_scope: 'single_subject',
          subject_codes: ['9702'],
        },
        selectedCases: [
          { case_id: 'a', subject_code: '9702' },
          { case_id: 'b', subject_code: '9702' },
        ],
        corpusVersions: ['rag_step3_9231_pilot_20260312010101'],
      }),
    ).toThrow('single-subject benchmark corpus scope does not match manifest subject scope');
  });

  test('allows matching single-subject manifest and corpus scope', () => {
    const audit = validateBenchmarkScope({
      manifest: {
        benchmark_profile: 'rag_step3_retrieval_availability',
        subject_scope: 'single_subject',
        subject_codes: ['9231'],
      },
      selectedCases: [
        { case_id: 'a', subject_code: '9231' },
        { case_id: 'b', subject_code: '9231' },
      ],
      corpusVersions: ['rag_step3_9231_pilot_20260312010101'],
    });

    expect(audit.dataset_subject_scope).toBe('single_subject');
    expect(audit.corpus_version_subject_scope).toBe('single_subject');
    expect(audit.corpus_version_subject_codes).toEqual(['9231']);
  });

  test('keeps unknown corpus scope permissive but visible', () => {
    const audit = validateBenchmarkScope({
      manifest: {
        benchmark_profile: 'rag_step3_retrieval_availability',
        subject_scope: 'single_subject',
        subject_codes: ['9702'],
      },
      selectedCases: [{ case_id: 'a', subject_code: '9702' }],
      corpusVersions: ['rag_corpus_unification_20260303'],
    });

    expect(audit.corpus_version_subject_scope).toBe('unknown');
    expect(audit.corpus_version_subject_codes).toEqual([]);
  });

  test('summarizes dataset subject scope and inferred corpus scope', () => {
    expect(
      summarizeDatasetSubjectScope([
        { case_id: 'a', subject_code: '9709' },
        { case_id: 'b', subject_code: '9702' },
      ]),
    ).toEqual({
      scope: 'mixed_subject',
      subject_codes: ['9702', '9709'],
      total_cases: 2,
    });

    expect(
      inferCorpusVersionSubjectScope([
        'rag_step3_9702_pilot_20260312010101',
        'rag_step3_9702_headerfix_20260312020202',
      ]),
    ).toEqual({
      scope: 'single_subject',
      subject_codes: ['9702'],
      corpus_versions: [
        'rag_step3_9702_pilot_20260312010101',
        'rag_step3_9702_headerfix_20260312020202',
      ],
    });
  });
});
