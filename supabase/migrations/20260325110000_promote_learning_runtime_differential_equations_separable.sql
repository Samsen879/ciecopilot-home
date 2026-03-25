-- Promote the first released-scoring differential-equations slice for the learning runtime.

INSERT INTO public.learning_question_families (
  family_id,
  subject_code,
  title,
  description,
  release_state
)
VALUES (
  '9709.differential_equations',
  '9709',
  'Differential equations',
  'Canonical differential-equations family for released-scoring runtime slices.',
  'released'
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
VALUES (
  '9709.differential_equations.separable',
  '9709.differential_equations',
  '9709',
  'Separable differential equations',
  'Released-scoring differential-equations slice covering exact first-order separable equations with initial conditions.',
  '["paper:p3", "answer_form:exact", "structure:separable", "condition:initial_value"]'::jsonb,
  'released'
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
