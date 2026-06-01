-- Seed draft registry rows for deterministic 9709 P6 statistics classifier outputs.
--
-- These rows are FK targets only. They do not promote released scoring; release
-- scope still requires released question types plus released rubric coverage.

INSERT INTO public.learning_question_families (
  family_id,
  subject_code,
  title,
  description,
  release_state
)
VALUES
  (
    '9709.statistics',
    '9709',
    'Probability and Statistics',
    'Draft classifier family for 9709 Paper 5 and Paper 6 probability and statistics questions covering data representation, probability distributions, sampling, estimation, and hypothesis testing.',
    'draft'
  )
ON CONFLICT (family_id) DO UPDATE
SET
  subject_code = EXCLUDED.subject_code,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  release_state = EXCLUDED.release_state,
  updated_at = now();

INSERT INTO public.learning_question_types (
  question_type_id,
  family_id,
  subject_code,
  title,
  description,
  allowed_variant_tags,
  release_state
)
VALUES
  (
    '9709.statistics.poisson_distribution',
    '9709.statistics',
    '9709',
    'The Poisson distribution',
    'Draft classifier type for 9709 Paper 6 Poisson probabilities, interval scaling, and binomial or normal approximations to Poisson models.',
    '["paper:p6", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.linear_combinations_random_variables',
    '9709.statistics',
    '9709',
    'Linear combinations of random variables',
    'Draft classifier type for 9709 Paper 6 expectation, variance, and distribution results for linear combinations of independent random variables.',
    '["paper:p6", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.continuous_random_variables',
    '9709.statistics',
    '9709',
    'Continuous random variables',
    'Draft classifier type for 9709 Paper 6 probability density functions, cumulative probabilities, medians, means, and variances for continuous random variables.',
    '["paper:p6", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.sampling_estimation',
    '9709.statistics',
    '9709',
    'Sampling and estimation',
    'Draft classifier type for 9709 Paper 6 samples, sampling distributions, unbiased estimators, the central limit theorem, and confidence intervals.',
    '["paper:p6", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.hypothesis_tests',
    '9709.statistics',
    '9709',
    'Hypothesis tests',
    'Draft classifier type for 9709 Paper 6 hypothesis tests, critical regions, p-values, one-tailed and two-tailed tests, and contextual conclusions.',
    '["paper:p6", "source:deterministic_classifier"]'::jsonb,
    'draft'
  )
ON CONFLICT (question_type_id) DO UPDATE
SET
  family_id = EXCLUDED.family_id,
  subject_code = EXCLUDED.subject_code,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  allowed_variant_tags = EXCLUDED.allowed_variant_tags,
  release_state = EXCLUDED.release_state,
  updated_at = now();
