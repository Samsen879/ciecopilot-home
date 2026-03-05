-- =============================================================================
-- Syllabus Boundary Deterministic Seed (Full Version)
-- PR-2: Extended CI Test Suite
-- 
-- Requirements:
-- - 3 syllabus codes (9709, 9702, 9231)
-- - 10+ curriculum_nodes per syllabus (varying depths)
-- - 100+ chunks with deterministic embeddings
-- - 10+ unmapped chunks
-- - Embeddings use 2D direction vectors to avoid cosine ties
-- =============================================================================

-- Clear existing data
TRUNCATE public.curriculum_nodes CASCADE;
TRUNCATE public.chunks CASCADE;

-- =============================================================================
-- CURRICULUM NODES (3 syllabuses, 10+ nodes each = 36 total)
-- =============================================================================

-- 9709 Mathematics (12 nodes)
INSERT INTO public.curriculum_nodes (node_id, syllabus_code, topic_path, title) VALUES
  ('11111111-1111-1111-1111-111111111101', '9709', '9709', 'Cambridge Mathematics 9709'),
  ('11111111-1111-1111-1111-111111111102', '9709', '9709.p1', 'Pure Mathematics 1'),
  ('11111111-1111-1111-1111-111111111103', '9709', '9709.p1.quadratics', 'Quadratics'),
  ('11111111-1111-1111-1111-111111111104', '9709', '9709.p1.functions', 'Functions'),
  ('11111111-1111-1111-1111-111111111105', '9709', '9709.p1.coordinate', 'Coordinate Geometry'),
  ('11111111-1111-1111-1111-111111111106', '9709', '9709.p1.sequences', 'Sequences and Series'),
  ('11111111-1111-1111-1111-111111111107', '9709', '9709.p3', 'Pure Mathematics 3'),
  ('11111111-1111-1111-1111-111111111108', '9709', '9709.p3.trig', 'Trigonometry'),
  ('11111111-1111-1111-1111-111111111109', '9709', '9709.p3.calculus', 'Calculus'),
  ('11111111-1111-1111-1111-111111111110', '9709', '9709.s1', 'Statistics 1'),
  ('11111111-1111-1111-1111-111111111111', '9709', '9709.s1.probability', 'Probability'),
  ('11111111-1111-1111-1111-111111111112', '9709', '9709.s1.distributions', 'Distributions');

-- 9702 Physics (12 nodes)
INSERT INTO public.curriculum_nodes (node_id, syllabus_code, topic_path, title) VALUES
  ('22222222-2222-2222-2222-222222222201', '9702', '9702', 'Cambridge Physics 9702'),
  ('22222222-2222-2222-2222-222222222202', '9702', '9702.as', 'AS Level Physics'),
  ('22222222-2222-2222-2222-222222222203', '9702', '9702.as.mechanics', 'Mechanics'),
  ('22222222-2222-2222-2222-222222222204', '9702', '9702.as.waves', 'Waves'),
  ('22222222-2222-2222-2222-222222222205', '9702', '9702.as.electricity', 'Electricity'),
  ('22222222-2222-2222-2222-222222222206', '9702', '9702.as.matter', 'Matter'),
  ('22222222-2222-2222-2222-222222222207', '9702', '9702.a2', 'A2 Level Physics'),
  ('22222222-2222-2222-2222-222222222208', '9702', '9702.a2.fields', 'Fields'),
  ('22222222-2222-2222-2222-222222222209', '9702', '9702.a2.nuclear', 'Nuclear Physics'),
  ('22222222-2222-2222-2222-222222222210', '9702', '9702.a2.quantum', 'Quantum Physics'),
  ('22222222-2222-2222-2222-222222222211', '9702', '9702.a2.thermal', 'Thermal Physics'),
  ('22222222-2222-2222-2222-222222222212', '9702', '9702.a2.oscillations', 'Oscillations');

-- 9231 Further Mathematics (12 nodes)
INSERT INTO public.curriculum_nodes (node_id, syllabus_code, topic_path, title) VALUES
  ('33333333-3333-3333-3333-333333333301', '9231', '9231', 'Cambridge Further Mathematics 9231'),
  ('33333333-3333-3333-3333-333333333302', '9231', '9231.p1', 'Further Pure 1'),
  ('33333333-3333-3333-3333-333333333303', '9231', '9231.p1.complex', 'Complex Numbers'),
  ('33333333-3333-3333-3333-333333333304', '9231', '9231.p1.matrices', 'Matrices'),
  ('33333333-3333-3333-3333-333333333305', '9231', '9231.p1.roots', 'Roots of Polynomials'),
  ('33333333-3333-3333-3333-333333333306', '9231', '9231.p1.series', 'Series'),
  ('33333333-3333-3333-3333-333333333307', '9231', '9231.p2', 'Further Pure 2'),
  ('33333333-3333-3333-3333-333333333308', '9231', '9231.p2.hyperbolic', 'Hyperbolic Functions'),
  ('33333333-3333-3333-3333-333333333309', '9231', '9231.p2.polar', 'Polar Coordinates'),
  ('33333333-3333-3333-3333-333333333310', '9231', '9231.p2.diffeq', 'Differential Equations'),
  ('33333333-3333-3333-3333-333333333311', '9231', '9231.m1', 'Mechanics 1'),
  ('33333333-3333-3333-3333-333333333312', '9231', '9231.m1.vectors', 'Vectors');


-- =============================================================================
-- CHUNKS WITH DETERMINISTIC EMBEDDINGS (100+ total)
-- 
-- Embedding Strategy:
-- - Each topic family has a unique 2D direction vector
-- - Small deterministic perturbation based on chunk id to avoid ties
-- - Format: ('[' || a || ',' || b || repeat(',0', 1534) || ']')::vector
-- 
-- Direction assignments:
-- 9709.p1.quadratics:   [1.0, 0.0]
-- 9709.p1.functions:    [0.7, 0.7]
-- 9709.p1.coordinate:   [0.5, 0.866]
-- 9709.p1.sequences:    [0.0, 1.0]
-- 9709.p3.trig:         [-0.5, 0.866]
-- 9709.p3.calculus:     [-0.7, 0.7]
-- 9709.s1.probability:  [-0.866, 0.5]
-- 9709.s1.distributions:[-1.0, 0.0]
-- 9702.as.mechanics:    [-0.866, -0.5]
-- 9702.as.waves:        [-0.7, -0.7]
-- 9702.as.electricity:  [-0.5, -0.866]
-- 9702.a2.fields:       [0.0, -1.0]
-- 9702.a2.nuclear:      [0.5, -0.866]
-- 9702.a2.quantum:      [0.7, -0.7]
-- 9231.p1.complex:      [0.866, -0.5]
-- 9231.p1.matrices:     [0.95, 0.31]
-- 9231.p2.hyperbolic:   [0.31, 0.95]
-- 9231.m1.vectors:      [-0.31, 0.95]
-- =============================================================================

-- Helper: Generate embedding with perturbation
-- a_base, b_base = direction, i = chunk id for perturbation
-- Perturbation: a = a_base + (i % 7) * 0.001, b = b_base + (i % 11) * 0.001

-- =============================================================================
-- 9709.p1.quadratics chunks (8 chunks, direction [1.0, 0.0])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (1, 'Quadratic equations have the form ax^2 + bx + c = 0. The quadratic formula is x = (-b ± √(b²-4ac)) / 2a.', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.001) || ',' || (0.0 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (2, 'Completing the square transforms ax^2 + bx + c into a(x-h)^2 + k form. This helps find the vertex.', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.002) || ',' || (0.0 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (3, 'The discriminant b²-4ac determines the nature of roots: positive means two real roots.', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.003) || ',' || (0.0 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (4, 'Quadratic graphs are parabolas. If a > 0, the parabola opens upward.', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.004) || ',' || (0.0 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (5, 'The vertex form y = a(x-h)^2 + k shows the vertex at point (h, k).', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.005) || ',' || (0.0 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (6, 'Factoring quadratics: find two numbers that multiply to ac and add to b.', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.006) || ',' || (0.0 + 0.006) || repeat(',0', 1534) || ']')::vector),
  (7, 'The sum of roots is -b/a and the product of roots is c/a for ax^2+bx+c=0.', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.007) || ',' || (0.0 + 0.007) || repeat(',0', 1534) || ']')::vector),
  (8, 'Quadratic inequalities: solve by finding roots and testing intervals.', '9709', '9709.p1.quadratics',
   ('[' || (1.0 + 0.008) || ',' || (0.0 + 0.008) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9709.p1.functions chunks (8 chunks, direction [0.7, 0.7])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (9, 'A function maps each input to exactly one output. The domain is the set of valid inputs.', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.001) || ',' || (0.7 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (10, 'Composite functions combine two functions: (f∘g)(x) = f(g(x)).', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.002) || ',' || (0.7 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (11, 'Inverse functions reverse the mapping. If f(a) = b, then f⁻¹(b) = a.', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.003) || ',' || (0.7 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (12, 'The range of a function is the set of all possible output values.', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.004) || ',' || (0.7 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (13, 'One-to-one functions have unique outputs for each input, allowing inverses.', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.005) || ',' || (0.7 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (14, 'Graph transformations: y = f(x) + a shifts up, y = f(x + a) shifts left.', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.006) || ',' || (0.7 + 0.006) || repeat(',0', 1534) || ']')::vector),
  (15, 'Modulus function |x| returns the absolute value, always non-negative.', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.007) || ',' || (0.7 + 0.007) || repeat(',0', 1534) || ']')::vector),
  (16, 'Even functions satisfy f(-x) = f(x), odd functions satisfy f(-x) = -f(x).', '9709', '9709.p1.functions',
   ('[' || (0.7 + 0.008) || ',' || (0.7 + 0.008) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9709.p1.coordinate chunks (6 chunks, direction [0.5, 0.866])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (17, 'Distance formula: d = √((x₂-x₁)² + (y₂-y₁)²) between two points.', '9709', '9709.p1.coordinate',
   ('[' || (0.5 + 0.001) || ',' || (0.866 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (18, 'Midpoint formula: M = ((x₁+x₂)/2, (y₁+y₂)/2) finds the center point.', '9709', '9709.p1.coordinate',
   ('[' || (0.5 + 0.002) || ',' || (0.866 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (19, 'Gradient of a line: m = (y₂-y₁)/(x₂-x₁) measures steepness.', '9709', '9709.p1.coordinate',
   ('[' || (0.5 + 0.003) || ',' || (0.866 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (20, 'Equation of a line: y - y₁ = m(x - x₁) or y = mx + c.', '9709', '9709.p1.coordinate',
   ('[' || (0.5 + 0.004) || ',' || (0.866 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (21, 'Perpendicular lines have gradients that multiply to -1: m₁ × m₂ = -1.', '9709', '9709.p1.coordinate',
   ('[' || (0.5 + 0.005) || ',' || (0.866 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (22, 'Circle equation: (x-a)² + (y-b)² = r² with center (a,b) and radius r.', '9709', '9709.p1.coordinate',
   ('[' || (0.5 + 0.006) || ',' || (0.866 + 0.006) || repeat(',0', 1534) || ']')::vector);


-- =============================================================================
-- 9709.p3.trig chunks (6 chunks, direction [-0.5, 0.866])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (23, 'Sine rule: a/sin(A) = b/sin(B) = c/sin(C) for any triangle.', '9709', '9709.p3.trig',
   ('[' || (-0.5 + 0.001) || ',' || (0.866 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (24, 'Cosine rule: a² = b² + c² - 2bc·cos(A) generalizes Pythagoras.', '9709', '9709.p3.trig',
   ('[' || (-0.5 + 0.002) || ',' || (0.866 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (25, 'Double angle: sin(2A) = 2sin(A)cos(A), cos(2A) = cos²(A) - sin²(A).', '9709', '9709.p3.trig',
   ('[' || (-0.5 + 0.003) || ',' || (0.866 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (26, 'Trigonometric identities: sin²θ + cos²θ = 1, tan θ = sin θ / cos θ.', '9709', '9709.p3.trig',
   ('[' || (-0.5 + 0.004) || ',' || (0.866 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (27, 'Radian measure: π radians = 180°, arc length s = rθ.', '9709', '9709.p3.trig',
   ('[' || (-0.5 + 0.005) || ',' || (0.866 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (28, 'Inverse trig functions: arcsin, arccos, arctan with restricted domains.', '9709', '9709.p3.trig',
   ('[' || (-0.5 + 0.006) || ',' || (0.866 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9709.p3.calculus chunks (6 chunks, direction [-0.7, 0.7])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (29, 'Integration is the reverse of differentiation. ∫xⁿ dx = xⁿ⁺¹/(n+1) + C.', '9709', '9709.p3.calculus',
   ('[' || (-0.7 + 0.001) || ',' || (0.7 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (30, 'Definite integrals calculate area: ∫[a,b] f(x)dx = F(b) - F(a).', '9709', '9709.p3.calculus',
   ('[' || (-0.7 + 0.002) || ',' || (0.7 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (31, 'Integration by parts: ∫u dv = uv - ∫v du for products.', '9709', '9709.p3.calculus',
   ('[' || (-0.7 + 0.003) || ',' || (0.7 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (32, 'Substitution: let u = g(x), then ∫f(g(x))g''(x)dx = ∫f(u)du.', '9709', '9709.p3.calculus',
   ('[' || (-0.7 + 0.004) || ',' || (0.7 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (33, 'Volume of revolution: V = π∫y² dx around x-axis.', '9709', '9709.p3.calculus',
   ('[' || (-0.7 + 0.005) || ',' || (0.7 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (34, 'Differential equations: dy/dx = f(x) solved by integration.', '9709', '9709.p3.calculus',
   ('[' || (-0.7 + 0.006) || ',' || (0.7 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9709.s1.probability chunks (6 chunks, direction [-0.866, 0.5])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (35, 'Probability: P(A) = favorable outcomes / total outcomes, 0 ≤ P(A) ≤ 1.', '9709', '9709.s1.probability',
   ('[' || (-0.866 + 0.001) || ',' || (0.5 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (36, 'Conditional probability: P(A|B) = P(A∩B) / P(B).', '9709', '9709.s1.probability',
   ('[' || (-0.866 + 0.002) || ',' || (0.5 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (37, 'Independent events: P(A∩B) = P(A) × P(B) when A and B are independent.', '9709', '9709.s1.probability',
   ('[' || (-0.866 + 0.003) || ',' || (0.5 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (38, 'Bayes theorem: P(A|B) = P(B|A)P(A) / P(B) for updating probabilities.', '9709', '9709.s1.probability',
   ('[' || (-0.866 + 0.004) || ',' || (0.5 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (39, 'Permutations: nPr = n!/(n-r)! for ordered arrangements.', '9709', '9709.s1.probability',
   ('[' || (-0.866 + 0.005) || ',' || (0.5 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (40, 'Combinations: nCr = n!/[r!(n-r)!] for unordered selections.', '9709', '9709.s1.probability',
   ('[' || (-0.866 + 0.006) || ',' || (0.5 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9702.as.mechanics chunks (8 chunks, direction [-0.866, -0.5])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (41, 'Newton first law: an object remains at rest or uniform motion unless acted upon by a force.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.001) || ',' || (-0.5 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (42, 'Newton second law: F = ma. Force equals mass times acceleration.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.002) || ',' || (-0.5 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (43, 'Newton third law: every action has an equal and opposite reaction.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.003) || ',' || (-0.5 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (44, 'Momentum p = mv is conserved in collisions. Total momentum before = after.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.004) || ',' || (-0.5 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (45, 'Kinematic equations: v = u + at, s = ut + ½at², v² = u² + 2as.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.005) || ',' || (-0.5 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (46, 'Work done W = Fs cos θ, where θ is angle between force and displacement.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.006) || ',' || (-0.5 + 0.006) || repeat(',0', 1534) || ']')::vector),
  (47, 'Kinetic energy KE = ½mv², potential energy PE = mgh.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.007) || ',' || (-0.5 + 0.007) || repeat(',0', 1534) || ']')::vector),
  (48, 'Power P = W/t = Fv, rate of doing work or energy transfer.', '9702', '9702.as.mechanics',
   ('[' || (-0.866 + 0.008) || ',' || (-0.5 + 0.008) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9702.as.waves chunks (8 chunks, direction [-0.7, -0.7])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (49, 'Wave equation: v = fλ, velocity equals frequency times wavelength.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.001) || ',' || (-0.7 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (50, 'Transverse waves: oscillation perpendicular to direction of travel.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.002) || ',' || (-0.7 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (51, 'Longitudinal waves: oscillation parallel to direction of travel.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.003) || ',' || (-0.7 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (52, 'Interference: constructive when path difference = nλ, destructive when (n+½)λ.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.004) || ',' || (-0.7 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (53, 'Diffraction: waves spread out when passing through gaps or around obstacles.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.005) || ',' || (-0.7 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (54, 'Standing waves: formed by superposition of two waves traveling in opposite directions.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.006) || ',' || (-0.7 + 0.006) || repeat(',0', 1534) || ']')::vector),
  (55, 'Doppler effect: frequency changes when source or observer moves.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.007) || ',' || (-0.7 + 0.007) || repeat(',0', 1534) || ']')::vector),
  (56, 'Polarization: transverse waves can be polarized to oscillate in one plane.', '9702', '9702.as.waves',
   ('[' || (-0.7 + 0.008) || ',' || (-0.7 + 0.008) || repeat(',0', 1534) || ']')::vector);


-- =============================================================================
-- 9702.as.electricity chunks (6 chunks, direction [-0.5, -0.866])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (57, 'Ohm law: V = IR, voltage equals current times resistance.', '9702', '9702.as.electricity',
   ('[' || (-0.5 + 0.001) || ',' || (-0.866 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (58, 'Power in circuits: P = IV = I²R = V²/R.', '9702', '9702.as.electricity',
   ('[' || (-0.5 + 0.002) || ',' || (-0.866 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (59, 'Series circuits: total resistance R = R₁ + R₂ + R₃...', '9702', '9702.as.electricity',
   ('[' || (-0.5 + 0.003) || ',' || (-0.866 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (60, 'Parallel circuits: 1/R = 1/R₁ + 1/R₂ + 1/R₃...', '9702', '9702.as.electricity',
   ('[' || (-0.5 + 0.004) || ',' || (-0.866 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (61, 'EMF and internal resistance: ε = V + Ir, terminal pd less than emf.', '9702', '9702.as.electricity',
   ('[' || (-0.5 + 0.005) || ',' || (-0.866 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (62, 'Kirchhoff laws: sum of currents at junction = 0, sum of emfs = sum of pds.', '9702', '9702.as.electricity',
   ('[' || (-0.5 + 0.006) || ',' || (-0.866 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9702.a2.fields chunks (6 chunks, direction [0.0, -1.0])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (63, 'Electric field E = F/q, force per unit positive charge.', '9702', '9702.a2.fields',
   ('[' || (0.0 + 0.001) || ',' || (-1.0 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (64, 'Coulomb law: F = kq₁q₂/r², force between point charges.', '9702', '9702.a2.fields',
   ('[' || (0.0 + 0.002) || ',' || (-1.0 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (65, 'Gravitational field g = F/m = GM/r², force per unit mass.', '9702', '9702.a2.fields',
   ('[' || (0.0 + 0.003) || ',' || (-1.0 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (66, 'Electric potential V = W/q = kQ/r, work done per unit charge.', '9702', '9702.a2.fields',
   ('[' || (0.0 + 0.004) || ',' || (-1.0 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (67, 'Gravitational potential φ = -GM/r, always negative.', '9702', '9702.a2.fields',
   ('[' || (0.0 + 0.005) || ',' || (-1.0 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (68, 'Field lines: direction of force on positive test charge/mass.', '9702', '9702.a2.fields',
   ('[' || (0.0 + 0.006) || ',' || (-1.0 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9702.a2.nuclear chunks (6 chunks, direction [0.5, -0.866])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (69, 'Radioactive decay: N = N₀e^(-λt), exponential decrease.', '9702', '9702.a2.nuclear',
   ('[' || (0.5 + 0.001) || ',' || (-0.866 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (70, 'Half-life t½ = ln2/λ, time for activity to halve.', '9702', '9702.a2.nuclear',
   ('[' || (0.5 + 0.002) || ',' || (-0.866 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (71, 'Alpha decay: nucleus emits He-4, mass number decreases by 4.', '9702', '9702.a2.nuclear',
   ('[' || (0.5 + 0.003) || ',' || (-0.866 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (72, 'Beta decay: neutron converts to proton, emitting electron.', '9702', '9702.a2.nuclear',
   ('[' || (0.5 + 0.004) || ',' || (-0.866 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (73, 'Mass-energy equivalence: E = mc², binding energy from mass defect.', '9702', '9702.a2.nuclear',
   ('[' || (0.5 + 0.005) || ',' || (-0.866 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (74, 'Nuclear fission: heavy nucleus splits into lighter nuclei.', '9702', '9702.a2.nuclear',
   ('[' || (0.5 + 0.006) || ',' || (-0.866 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9702.a2.quantum chunks (6 chunks, direction [0.7, -0.7])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (75, 'Photoelectric effect: E = hf - φ, photon energy minus work function.', '9702', '9702.a2.quantum',
   ('[' || (0.7 + 0.001) || ',' || (-0.7 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (76, 'De Broglie wavelength: λ = h/p = h/mv for matter waves.', '9702', '9702.a2.quantum',
   ('[' || (0.7 + 0.002) || ',' || (-0.7 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (77, 'Energy levels: electrons occupy discrete energy states in atoms.', '9702', '9702.a2.quantum',
   ('[' || (0.7 + 0.003) || ',' || (-0.7 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (78, 'Photon emission: ΔE = hf when electron transitions between levels.', '9702', '9702.a2.quantum',
   ('[' || (0.7 + 0.004) || ',' || (-0.7 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (79, 'Wave-particle duality: light and matter exhibit both wave and particle properties.', '9702', '9702.a2.quantum',
   ('[' || (0.7 + 0.005) || ',' || (-0.7 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (80, 'Heisenberg uncertainty: ΔxΔp ≥ h/4π, cannot know both precisely.', '9702', '9702.a2.quantum',
   ('[' || (0.7 + 0.006) || ',' || (-0.7 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9231.p1.complex chunks (8 chunks, direction [0.866, -0.5])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (81, 'Complex numbers: z = a + bi where i² = -1.', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.001) || ',' || (-0.5 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (82, 'Modulus-argument form: z = r(cos θ + i sin θ) = re^(iθ).', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.002) || ',' || (-0.5 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (83, 'Argand diagram: complex numbers plotted on real-imaginary axes.', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.003) || ',' || (-0.5 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (84, 'De Moivre theorem: (cos θ + i sin θ)ⁿ = cos(nθ) + i sin(nθ).', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.004) || ',' || (-0.5 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (85, 'Complex conjugate: z* = a - bi, zz* = |z|².', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.005) || ',' || (-0.5 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (86, 'Roots of unity: nth roots of 1 are e^(2πik/n) for k = 0,1,...,n-1.', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.006) || ',' || (-0.5 + 0.006) || repeat(',0', 1534) || ']')::vector),
  (87, 'Loci in complex plane: |z - a| = r is circle, arg(z - a) = θ is half-line.', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.007) || ',' || (-0.5 + 0.007) || repeat(',0', 1534) || ']')::vector),
  (88, 'Complex roots of polynomials come in conjugate pairs for real coefficients.', '9231', '9231.p1.complex',
   ('[' || (0.866 + 0.008) || ',' || (-0.5 + 0.008) || repeat(',0', 1534) || ']')::vector);


-- =============================================================================
-- 9231.p1.matrices chunks (8 chunks, direction [0.95, 0.31])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (89, 'Matrix multiplication: (AB)ᵢⱼ = Σₖ AᵢₖBₖⱼ, not commutative.', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.001) || ',' || (0.31 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (90, 'Determinant of 2×2: det(A) = ad - bc for [[a,b],[c,d]].', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.002) || ',' || (0.31 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (91, 'Inverse matrix: A⁻¹ exists iff det(A) ≠ 0, AA⁻¹ = I.', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.003) || ',' || (0.31 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (92, 'Eigenvalues: det(A - λI) = 0, characteristic equation.', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.004) || ',' || (0.31 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (93, 'Eigenvectors: (A - λI)v = 0, non-zero solutions.', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.005) || ',' || (0.31 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (94, 'Diagonalization: A = PDP⁻¹ where D is diagonal of eigenvalues.', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.006) || ',' || (0.31 + 0.006) || repeat(',0', 1534) || ']')::vector),
  (95, 'Linear transformations: matrices represent rotations, reflections, scaling.', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.007) || ',' || (0.31 + 0.007) || repeat(',0', 1534) || ']')::vector),
  (96, 'Cayley-Hamilton: every matrix satisfies its characteristic equation.', '9231', '9231.p1.matrices',
   ('[' || (0.95 + 0.008) || ',' || (0.31 + 0.008) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9231.p2.hyperbolic chunks (6 chunks, direction [0.31, 0.95])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (97, 'Hyperbolic functions: sinh x = (eˣ - e⁻ˣ)/2, cosh x = (eˣ + e⁻ˣ)/2.', '9231', '9231.p2.hyperbolic',
   ('[' || (0.31 + 0.001) || ',' || (0.95 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (98, 'Identity: cosh²x - sinh²x = 1, analogous to trig identity.', '9231', '9231.p2.hyperbolic',
   ('[' || (0.31 + 0.002) || ',' || (0.95 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (99, 'Derivatives: d/dx(sinh x) = cosh x, d/dx(cosh x) = sinh x.', '9231', '9231.p2.hyperbolic',
   ('[' || (0.31 + 0.003) || ',' || (0.95 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (100, 'Inverse hyperbolic: arsinh x = ln(x + √(x²+1)).', '9231', '9231.p2.hyperbolic',
   ('[' || (0.31 + 0.004) || ',' || (0.95 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (101, 'Osborn rule: replace trig with hyperbolic, change sign of sin² products.', '9231', '9231.p2.hyperbolic',
   ('[' || (0.31 + 0.005) || ',' || (0.95 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (102, 'Catenary curve: y = a cosh(x/a), shape of hanging chain.', '9231', '9231.p2.hyperbolic',
   ('[' || (0.31 + 0.006) || ',' || (0.95 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- 9231.m1.vectors chunks (6 chunks, direction [-0.31, 0.95])
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (103, 'Vector dot product: a·b = |a||b|cos θ = a₁b₁ + a₂b₂ + a₃b₃.', '9231', '9231.m1.vectors',
   ('[' || (-0.31 + 0.001) || ',' || (0.95 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (104, 'Vector cross product: a×b = |a||b|sin θ n̂, perpendicular to both.', '9231', '9231.m1.vectors',
   ('[' || (-0.31 + 0.002) || ',' || (0.95 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (105, 'Line equation: r = a + λb, position vector plus direction.', '9231', '9231.m1.vectors',
   ('[' || (-0.31 + 0.003) || ',' || (0.95 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (106, 'Plane equation: r·n = d, or ax + by + cz = d.', '9231', '9231.m1.vectors',
   ('[' || (-0.31 + 0.004) || ',' || (0.95 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (107, 'Distance from point to plane: |ax₀ + by₀ + cz₀ - d|/√(a²+b²+c²).', '9231', '9231.m1.vectors',
   ('[' || (-0.31 + 0.005) || ',' || (0.95 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (108, 'Scalar triple product: a·(b×c) = volume of parallelepiped.', '9231', '9231.m1.vectors',
   ('[' || (-0.31 + 0.006) || ',' || (0.95 + 0.006) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- UNMAPPED CHUNKS (15 chunks, direction [0.5, 0.5] with variations)
-- These should NEVER be returned by hybrid_search_v2
-- =============================================================================
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (109, 'Unmapped content about general mathematics topics.', NULL, 'unmapped',
   ('[' || (0.5 + 0.001) || ',' || (0.5 + 0.001) || repeat(',0', 1534) || ']')::vector),
  (110, 'Legacy physics notes without proper categorization.', NULL, 'unmapped',
   ('[' || (0.5 + 0.002) || ',' || (0.5 + 0.002) || repeat(',0', 1534) || ']')::vector),
  (111, 'Old chemistry content that needs topic assignment.', NULL, 'unmapped',
   ('[' || (0.5 + 0.003) || ',' || (0.5 + 0.003) || repeat(',0', 1534) || ']')::vector),
  (112, 'Miscellaneous study notes awaiting classification.', NULL, 'unmapped',
   ('[' || (0.5 + 0.004) || ',' || (0.5 + 0.004) || repeat(',0', 1534) || ']')::vector),
  (113, 'Random educational content without syllabus mapping.', NULL, 'unmapped',
   ('[' || (0.5 + 0.005) || ',' || (0.5 + 0.005) || repeat(',0', 1534) || ']')::vector),
  (114, 'Unprocessed document fragments from ingestion.', NULL, 'unmapped',
   ('[' || (0.5 + 0.006) || ',' || (0.5 + 0.006) || repeat(',0', 1534) || ']')::vector),
  (115, 'Historical exam content pending topic assignment.', NULL, 'unmapped',
   ('[' || (0.5 + 0.007) || ',' || (0.5 + 0.007) || repeat(',0', 1534) || ']')::vector),
  (116, 'Draft lecture notes not yet categorized.', NULL, 'unmapped',
   ('[' || (0.5 + 0.008) || ',' || (0.5 + 0.008) || repeat(',0', 1534) || ']')::vector),
  (117, 'Supplementary material without topic path.', NULL, 'unmapped',
   ('[' || (0.5 + 0.009) || ',' || (0.5 + 0.009) || repeat(',0', 1534) || ']')::vector),
  (118, 'Practice problems from unknown source.', NULL, 'unmapped',
   ('[' || (0.5 + 0.010) || ',' || (0.5 + 0.010) || repeat(',0', 1534) || ']')::vector),
  (119, 'Tutorial content awaiting syllabus mapping.', NULL, 'unmapped',
   ('[' || (0.5 + 0.011) || ',' || (0.5 + 0.011) || repeat(',0', 1534) || ']')::vector),
  (120, 'Revision notes without topic classification.', NULL, 'unmapped',
   ('[' || (0.5 + 0.012) || ',' || (0.5 + 0.012) || repeat(',0', 1534) || ']')::vector),
  (121, 'Worked examples pending categorization.', NULL, 'unmapped',
   ('[' || (0.5 + 0.013) || ',' || (0.5 + 0.013) || repeat(',0', 1534) || ']')::vector),
  (122, 'Formula sheet content not yet mapped.', NULL, 'unmapped',
   ('[' || (0.5 + 0.014) || ',' || (0.5 + 0.014) || repeat(',0', 1534) || ']')::vector),
  (123, 'Assessment criteria without topic assignment.', NULL, 'unmapped',
   ('[' || (0.5 + 0.015) || ',' || (0.5 + 0.015) || repeat(',0', 1534) || ']')::vector);

-- =============================================================================
-- Reset sequence to max id + 1
-- =============================================================================
SELECT setval('chunks_id_seq', 123);

-- =============================================================================
-- Summary:
-- - 36 curriculum_nodes (12 per syllabus)
-- - 108 mapped chunks (distributed across topics)
-- - 15 unmapped chunks
-- - Total: 123 chunks
-- =============================================================================
