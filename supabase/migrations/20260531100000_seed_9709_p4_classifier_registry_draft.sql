-- Seed draft registry rows for deterministic 9709 P4 mechanics classifier outputs.
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
    '9709.mechanics',
    '9709',
    'Mechanics',
    'Draft classifier family for 9709 Paper 4 mechanics questions covering forces, kinematics, momentum, Newton''s laws, energy, work, and power.',
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
    '9709.mechanics.forces_equilibrium',
    '9709.mechanics',
    '9709',
    'Forces and equilibrium',
    'Draft classifier type for 9709 Paper 4 force diagrams, components, resultants, equilibrium, normal reaction, and limiting-friction questions.',
    '["paper:p4", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.mechanics.kinematics_straight_line',
    '9709.mechanics',
    '9709',
    'Kinematics of motion in a straight line',
    'Draft classifier type for 9709 Paper 4 displacement, velocity, acceleration, straight-line motion graph, and time-calculus kinematics questions.',
    '["paper:p4", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.mechanics.momentum',
    '9709.mechanics',
    '9709',
    'Momentum',
    'Draft classifier type for 9709 Paper 4 linear momentum, direct collisions, coalescence, and one-dimensional post-collision motion questions.',
    '["paper:p4", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.mechanics.newtons_laws',
    '9709.mechanics',
    '9709',
    'Newton''s laws of motion',
    'Draft classifier type for 9709 Paper 4 Newton''s laws, connected particles, tension, thrust, tow-bar, friction, and inclined-plane force questions.',
    '["paper:p4", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.mechanics.energy_work_power',
    '9709.mechanics',
    '9709',
    'Energy, work, and power',
    'Draft classifier type for 9709 Paper 4 kinetic energy, potential energy, work-energy, resistance work, power-force-velocity, and hill-motion questions.',
    '["paper:p4", "source:deterministic_classifier"]'::jsonb,
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
