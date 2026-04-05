-- Seed the canonical learning-runtime pilot family/type registry.

INSERT INTO public.learning_question_families (
  family_id,
  subject_code,
  title,
  description,
  release_state
)
VALUES (
  '9709.trigonometry_manipulation_equations',
  '9709',
  'Trigonometric manipulation / equations',
  'Canonical pilot family for the first 9709 learning-runtime scoring slice.',
  'released'
)
ON CONFLICT (family_id) DO NOTHING;

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
    '9709.trigonometry.identities',
    '9709.trigonometry_manipulation_equations',
    '9709',
    'Trigonometric identities',
    'Canonical pilot question type for trigonometric identity manipulation.',
    '["paper:p1", "paper:p3", "answer_form:exact", "structure:identity_rewrite"]'::jsonb,
    'released'
  ),
  (
    '9709.trigonometry.equations',
    '9709.trigonometry_manipulation_equations',
    '9709',
    'Trigonometric equations',
    'Canonical pilot question type for trigonometric equation solving in bounded domains.',
    '["paper:p1", "paper:p3", "answer_form:exact", "answer_form:interval", "structure:solve_in_domain"]'::jsonb,
    'released'
  )
ON CONFLICT (question_type_id) DO NOTHING;
