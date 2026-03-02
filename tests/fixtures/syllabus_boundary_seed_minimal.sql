-- Minimal seed data for syllabus boundary tests
-- Deterministic embeddings for reproducible CI tests

-- Clear existing data
TRUNCATE public.curriculum_nodes CASCADE;
TRUNCATE public.chunks CASCADE;

-- ============================================================================
-- Curriculum Nodes (2 syllabuses, 5 nodes each)
-- ============================================================================

-- 9709 Mathematics (Pure Mathematics 1)
INSERT INTO public.curriculum_nodes (node_id, syllabus_code, topic_path, title) VALUES
  ('11111111-1111-1111-1111-111111111101', '9709', '9709', 'Cambridge Mathematics 9709'),
  ('11111111-1111-1111-1111-111111111102', '9709', '9709.p1', 'Pure Mathematics 1'),
  ('11111111-1111-1111-1111-111111111103', '9709', '9709.p1.quadratics', 'Quadratics'),
  ('11111111-1111-1111-1111-111111111104', '9709', '9709.p1.functions', 'Functions'),
  ('11111111-1111-1111-1111-111111111105', '9709', '9709.p3', 'Pure Mathematics 3');

-- 9702 Physics
INSERT INTO public.curriculum_nodes (node_id, syllabus_code, topic_path, title) VALUES
  ('22222222-2222-2222-2222-222222222201', '9702', '9702', 'Cambridge Physics 9702'),
  ('22222222-2222-2222-2222-222222222202', '9702', '9702.as', 'AS Level Physics'),
  ('22222222-2222-2222-2222-222222222203', '9702', '9702.as.mechanics', 'Mechanics'),
  ('22222222-2222-2222-2222-222222222204', '9702', '9702.as.waves', 'Waves'),
  ('22222222-2222-2222-2222-222222222205', '9702', '9702.a2', 'A2 Level Physics');

-- ============================================================================
-- Chunks with deterministic embeddings
-- Using 2D direction vectors: [a, b, 0, 0, ...] for different topics
-- Topic 9709.p1.quadratics: direction [1, 0, ...]
-- Topic 9709.p1.functions: direction [0.7, 0.7, ...]
-- Topic 9709.p3: direction [0, 1, ...]
-- Topic 9702.as.mechanics: direction [-1, 0, ...]
-- Topic 9702.as.waves: direction [-0.7, 0.7, ...]
-- ============================================================================

-- Helper function to create deterministic embedding
-- We'll use simple patterns: first 2 dimensions vary, rest are 0.001

-- 9709.p1.quadratics chunks (direction [1, 0, ...])
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (1, 'Quadratic equations have the form ax^2 + bx + c = 0. The quadratic formula is x = (-b ± √(b²-4ac)) / 2a.', '9709', '9709.p1.quadratics', 
   ('[' || 1.0 || ',' || 0.0 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (2, 'Completing the square transforms ax^2 + bx + c into a(x-h)^2 + k form. This helps find the vertex.', '9709', '9709.p1.quadratics',
   ('[' || 0.99 || ',' || 0.01 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (3, 'The discriminant b²-4ac determines the nature of roots: positive means two real roots, zero means one repeated root.', '9709', '9709.p1.quadratics',
   ('[' || 0.98 || ',' || 0.02 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (4, 'Quadratic graphs are parabolas. If a > 0, the parabola opens upward; if a < 0, it opens downward.', '9709', '9709.p1.quadratics',
   ('[' || 0.97 || ',' || 0.03 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector);

-- 9709.p1.functions chunks (direction [0.7, 0.7, ...])
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (5, 'A function maps each input to exactly one output. The domain is the set of valid inputs.', '9709', '9709.p1.functions',
   ('[' || 0.7 || ',' || 0.7 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (6, 'Composite functions combine two functions: (f∘g)(x) = f(g(x)). Apply the inner function first.', '9709', '9709.p1.functions',
   ('[' || 0.71 || ',' || 0.69 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (7, 'Inverse functions reverse the mapping. If f(a) = b, then f⁻¹(b) = a. Not all functions have inverses.', '9709', '9709.p1.functions',
   ('[' || 0.69 || ',' || 0.71 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector);

-- 9709.p3 chunks (direction [0, 1, ...]) - DIFFERENT SUBTREE
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (8, 'Integration is the reverse of differentiation. The integral of x^n is x^(n+1)/(n+1) + C.', '9709', '9709.p3',
   ('[' || 0.0 || ',' || 1.0 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (9, 'Definite integrals calculate the area under a curve between two limits.', '9709', '9709.p3',
   ('[' || 0.01 || ',' || 0.99 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (10, 'Integration by parts: ∫u dv = uv - ∫v du. Choose u and dv wisely.', '9709', '9709.p3',
   ('[' || 0.02 || ',' || 0.98 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector);

-- 9702.as.mechanics chunks (direction [-1, 0, ...])
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (11, 'Newton first law: an object remains at rest or in uniform motion unless acted upon by a force.', '9702', '9702.as.mechanics',
   ('[' || -1.0 || ',' || 0.0 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (12, 'Newton second law: F = ma. Force equals mass times acceleration.', '9702', '9702.as.mechanics',
   ('[' || -0.99 || ',' || 0.01 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (13, 'Momentum is conserved in collisions. Total momentum before equals total momentum after.', '9702', '9702.as.mechanics',
   ('[' || -0.98 || ',' || 0.02 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector);

-- 9702.as.waves chunks (direction [-0.7, 0.7, ...])
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (14, 'Waves transfer energy without transferring matter. Wavelength times frequency equals wave speed.', '9702', '9702.as.waves',
   ('[' || -0.7 || ',' || 0.7 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (15, 'Interference occurs when waves overlap. Constructive interference increases amplitude.', '9702', '9702.as.waves',
   ('[' || -0.71 || ',' || 0.69 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector);

-- Unmapped chunks (should never be returned)
INSERT INTO public.chunks (id, content, syllabus_code, topic_path, embedding) VALUES
  (16, 'This is unmapped content about random topics.', NULL, 'unmapped',
   ('[' || 0.5 || ',' || 0.5 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (17, 'Another unmapped chunk with no topic assignment.', NULL, 'unmapped',
   ('[' || 0.51 || ',' || 0.49 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (18, 'Legacy content without proper categorization.', NULL, 'unmapped',
   ('[' || 0.49 || ',' || 0.51 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (19, 'Old notes that need to be mapped to topics.', NULL, 'unmapped',
   ('[' || 0.52 || ',' || 0.48 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector),
  (20, 'Miscellaneous content awaiting classification.', NULL, 'unmapped',
   ('[' || 0.48 || ',' || 0.52 || ',' || array_to_string(array_fill(0.001::float, ARRAY[1534]), ',') || ']')::vector);

-- Reset sequence
SELECT setval('chunks_id_seq', 20);
