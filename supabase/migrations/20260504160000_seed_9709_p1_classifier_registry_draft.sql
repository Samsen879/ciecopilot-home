-- Seed draft registry rows for deterministic 9709 P1 classifier outputs.
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
    '9709.series',
    '9709',
    'Series',
    'Draft classifier family for 9709 progression, series, and binomial-expansion questions.',
    'draft'
  ),
  (
    '9709.functions',
    '9709',
    'Functions',
    'Draft classifier family for 9709 function, inverse, composite, range, domain, and transformation questions.',
    'draft'
  ),
  (
    '9709.coordinate_geometry',
    '9709',
    'Coordinate geometry',
    'Draft classifier family for 9709 coordinate geometry line, circle, tangent, and curve questions.',
    'draft'
  ),
  (
    '9709.circular_measure',
    '9709',
    'Circular measure',
    'Draft classifier family for 9709 arc, sector, segment, and radian-measure questions.',
    'draft'
  ),
  (
    '9709.differentiation',
    '9709',
    'Differentiation',
    'Draft classifier family for 9709 differentiation, gradient, normal, tangent, rate, and stationary-point questions.',
    'draft'
  ),
  (
    '9709.vectors',
    '9709',
    'Vectors',
    'Draft classifier family for 9709 vector geometry questions, including legacy P1 vector questions canonicalized to the current vector path.',
    'draft'
  ),
  (
    '9709.quadratics',
    '9709',
    'Quadratics',
    'Draft classifier family for 9709 quadratic equations, inequalities, discriminants, and completing-square questions.',
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
    '9709.series.sequence_binomial',
    '9709.series',
    '9709',
    'Series, progressions, and binomial expansion',
    'Draft classifier type for 9709 arithmetic/geometric progressions, series sums, and binomial coefficient extraction.',
    '["paper:p1", "paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.functions.core',
    '9709.functions',
    '9709',
    'Core functions',
    'Draft classifier type for 9709 functions, inverse functions, composite functions, domain, range, and transformations.',
    '["paper:p1", "paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.coordinate_geometry.lines_curves',
    '9709.coordinate_geometry',
    '9709',
    'Lines, circles, and coordinate curves',
    'Draft classifier type for 9709 coordinate geometry constraints involving lines, circles, gradients, tangents, and intersections.',
    '["paper:p1", "paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.circular_measure.arc_sector',
    '9709.circular_measure',
    '9709',
    'Arc, sector, and segment geometry',
    'Draft classifier type for 9709 circular-measure questions involving radians, sectors, arcs, segments, perimeters, and areas.',
    '["paper:p1", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.differentiation.application',
    '9709.differentiation',
    '9709',
    'Differentiation applications',
    'Draft classifier type for 9709 differentiation questions involving gradients, tangents, normals, optimisation, rates, and stationary points.',
    '["paper:p1", "paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.vectors.geometry',
    '9709.vectors',
    '9709',
    'Vector geometry',
    'Draft classifier type for 9709 vector geometry questions involving position vectors, scalar products, angles, and geometric interpretation.',
    '["paper:p1_legacy", "paper:p3", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.quadratics.equations_inequalities',
    '9709.quadratics',
    '9709',
    'Quadratic equations and inequalities',
    'Draft classifier type for 9709 quadratic or reducible-quadratic equations, inequalities, and discriminant conditions.',
    '["paper:p1", "source:deterministic_classifier"]'::jsonb,
    'draft'
  ),
  (
    '9709.trigonometry.general',
    '9709.trigonometry_manipulation_equations',
    '9709',
    'General trigonometry',
    'Draft classifier type for 9709 trigonometric graph, transformation, or mixed trigonometry questions outside the released identity/equation slices.',
    '["paper:p1", "paper:p3", "source:deterministic_classifier"]'::jsonb,
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
