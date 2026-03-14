import {
  buildReadinessProfile,
  chooseRecommendedDepth,
} from '../build_s2_readiness_profile.js';

describe('build_s2_readiness_profile', () => {
  test('recommends depth 3 for deep subject slices with adequate corpus coverage', () => {
    expect(
      chooseRecommendedDepth({
        subjectCode: '9702',
        depthSummary: {
          min: 3,
          p50: 3,
          p75: 3,
          p90: 3,
          max: 3,
        },
        evalCaseCount: 6,
        corpusRowCount: 193,
      }),
    ).toBe(3);

    expect(
      chooseRecommendedDepth({
        subjectCode: '9231',
        depthSummary: {
          min: 1,
          p50: 3,
          p75: 3,
          p90: 3,
          max: 3,
        },
        evalCaseCount: 12,
        corpusRowCount: 137,
      }),
    ).toBe(3);
  });

  test('preserves balanced depth for mixed 9709 benchmark shape', () => {
    expect(
      chooseRecommendedDepth({
        subjectCode: '9709',
        depthSummary: {
          min: 1,
          p50: 2,
          p75: 3,
          p90: 4,
          max: 4,
        },
        evalCaseCount: 20,
        corpusRowCount: 993,
      }),
    ).toBe(2);
  });

  test('builds a subject profile from custom dataset and corpus summary inputs', () => {
    const profile = buildReadinessProfile({
      dataset: [
        { subject_code: '9231', current_topic_path: '9231' },
        { subject_code: '9231', current_topic_path: '9231' },
        { subject_code: '9231', current_topic_path: '9231' },
        { subject_code: '9231', current_topic_path: '9231.FP1.Matrices' },
        { subject_code: '9231', current_topic_path: '9231.FP1.Complex' },
        { subject_code: '9231', current_topic_path: '9231.FP2.Series' },
        { subject_code: '9231', current_topic_path: '9231.FP2.Vectors' },
        { subject_code: '9231', current_topic_path: '9231.FM.Kinematics' },
        { subject_code: '9231', current_topic_path: '9231.FM.DifferentialEquations' },
        { subject_code: '9231', current_topic_path: '9231.FS.Distributions' },
        { subject_code: '9231', current_topic_path: '9231.FS.HypothesisTests' },
        { subject_code: '9231', current_topic_path: '9231.FP1.Complex' },
      ],
      corpusSummary: {
        subject_counts: {
          '9231': 137,
        },
      },
      runConfig: {
        dataset: 'data/eval/rag_step3_retrieval_availability_sample_9231.json',
        corpus_coverage_summary: 'runs/backend/rag_step3_restricted_official_9231_coverage_summary.json',
      },
    });

    expect(profile.covered_subjects).toEqual(['9231']);
    expect(profile.recommended_max_topic_depth_by_subject).toEqual({
      '9231': 3,
    });
    expect(profile.subject_profiles['9231'].max_topic_depth).toBe(3);
    expect(profile.run_config.dataset).toBe(
      'data/eval/rag_step3_retrieval_availability_sample_9231.json',
    );
  });
});
