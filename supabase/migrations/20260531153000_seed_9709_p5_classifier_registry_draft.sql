-- Seed draft registry rows for deterministic 9709 P5 statistics classifier outputs.
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
    'Draft classifier family for 9709 Paper 5 probability and statistics questions covering data representation, permutations and combinations, probability, discrete random variables, and normal distribution.',
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
    '9709.statistics.representation_of_data',
    '9709.statistics',
    '9709',
    'Representation of data',
    'Draft classifier type for 9709 Paper 5 stem-and-leaf, box plot, histogram, cumulative frequency, grouped data, mean, variance, and standard deviation questions.',
    '["paper:p5", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.permutations_combinations',
    '9709.statistics',
    '9709',
    'Permutations and combinations',
    'Draft classifier type for 9709 Paper 5 selections, arrangements, restrictions, and repeated-object permutation questions.',
    '["paper:p5", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.probability',
    '9709.statistics',
    '9709',
    'Probability',
    'Draft classifier type for 9709 Paper 5 elementary probability, tree diagrams, exclusive and independent events, and conditional probability questions.',
    '["paper:p5", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.discrete_random_variables',
    '9709.statistics',
    '9709',
    'Discrete random variables',
    'Draft classifier type for 9709 Paper 5 probability distributions, expectation, variance, binomial, and geometric distribution questions.',
    '["paper:p5", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.statistics.normal_distribution',
    '9709.statistics',
    '9709',
    'The normal distribution',
    'Draft classifier type for 9709 Paper 5 normal distribution, standardisation, inverse normal probability, and normal approximation to binomial questions.',
    '["paper:p5", "source:deterministic_classifier"]'::jsonb,
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
