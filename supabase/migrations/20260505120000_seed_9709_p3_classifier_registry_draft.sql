-- Seed draft registry rows for deterministic 9709 P3 classifier outputs.
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
    '9709.algebra',
    '9709',
    'Algebra',
    'Draft classifier family for 9709 P3 algebra questions involving polynomial, rational, inequality, factor, remainder, coefficient, and partial-fraction structures.',
    'draft'
  ),
  (
    '9709.complex_numbers',
    '9709',
    'Complex numbers',
    'Draft classifier family for 9709 P3 complex number questions involving algebraic form, modulus, argument, loci, and Argand diagrams.',
    'draft'
  ),
  (
    '9709.logarithmic_and_exponential_functions',
    '9709',
    'Logarithmic and exponential functions',
    'Draft classifier family for 9709 P3 logarithmic, exponential, index-law, equation, and modelling questions.',
    'draft'
  ),
  (
    '9709.numerical_solution_of_equations',
    '9709',
    'Numerical solution of equations',
    'Draft classifier family for 9709 P3 numerical methods questions involving iteration, sign-change reasoning, roots, and convergence.',
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
    '9709.algebra.polynomial_rational',
    '9709.algebra',
    '9709',
    'Polynomial and rational algebra',
    'Draft classifier type for 9709 P3 algebra questions involving polynomials, rational expressions, inequalities, partial fractions, factors, remainders, and coefficients.',
    '["paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.complex_numbers.argand_mod_arg',
    '9709.complex_numbers',
    '9709',
    'Complex numbers, Argand diagrams, modulus, and argument',
    'Draft classifier type for 9709 P3 complex-number questions involving algebraic manipulation, modulus-argument form, loci, regions, and Argand sketches.',
    '["paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.log_exp.equations_models',
    '9709.logarithmic_and_exponential_functions',
    '9709',
    'Logarithmic and exponential equations and models',
    'Draft classifier type for 9709 P3 logarithmic and exponential equations, index-law manipulation, and linearised model questions.',
    '["paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.numerical_methods.iteration',
    '9709.numerical_solution_of_equations',
    '9709',
    'Numerical methods and iteration',
    'Draft classifier type for 9709 P3 numerical-solution questions involving iteration formulae, roots, interval checks, and convergence reasoning.',
    '["paper:p3", "source:deterministic_classifier"]'::jsonb,
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
