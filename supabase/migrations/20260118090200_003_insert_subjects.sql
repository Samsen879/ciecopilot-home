-- 插入缺失的科目数据
-- 在运行数据迁移前确保所有科目都已创建

-- 插入进阶数学科目
INSERT INTO public.subjects (code, name, description) VALUES
('9231', 'Further Mathematics', 'Cambridge International AS and A Level Further Mathematics')
ON CONFLICT (code) DO NOTHING;

-- 插入物理科目
INSERT INTO public.subjects (code, name, description) VALUES
('9702', 'Physics', 'Cambridge International AS and A Level Physics')
ON CONFLICT (code) DO NOTHING;

-- 插入试卷数据 - 数学9709
WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9709'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper1', 'Pure Mathematics 1', 'Pure Mathematics including algebra, trigonometry, calculus, and vectors', 2
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9709'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper3', 'Pure Mathematics 3', 'Advanced Pure Mathematics including complex numbers, differential equations, and numerical methods', 3
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9709'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper4', 'Mechanics', 'Mechanics including forces, motion, energy, and momentum', 3
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9709'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper5', 'Probability & Statistics', 'Probability and Statistics including data analysis, probability distributions, and hypothesis testing', 3
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

-- 插入试卷数据 - 进阶数学9231
WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9231'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'FP1', 'Further Pure 1', 'Further Pure Mathematics including matrices, series, and complex numbers', 4
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9231'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'FP2', 'Further Pure 2', 'Advanced Further Pure Mathematics including differential equations and vector spaces', 5
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9231'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'FS', 'Further Statistics', 'Further Statistics including continuous distributions and inference', 4
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9231'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'FM', 'Further Mechanics', 'Further Mechanics including rigid bodies and oscillations', 4
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

-- 插入试卷数据 - 物理9702
WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9702'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper1', 'AS Level Paper 1', 'AS Level Physics multiple choice questions', 2
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9702'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper2', 'AS Level Paper 2', 'AS Level Physics structured questions', 2
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9702'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper3', 'A Level Paper 3', 'A Level Physics advanced topics', 3
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9702'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper4', 'A Level Paper 4', 'A Level Physics practical skills', 3
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;

WITH subject_id AS (
  SELECT id FROM public.subjects WHERE code = '9702'
)
INSERT INTO public.papers (subject_id, code, name, description, difficulty_level)
SELECT id, 'paper5', 'A Level Paper 5', 'A Level Physics planning and data analysis', 3
FROM subject_id
ON CONFLICT (subject_id, code) DO NOTHING;