-- Migration: Create misconception_taxonomy and reason_to_tag_mapping tables
-- Part of Learning Evidence Ledger feature
-- Requirements: 4.3, 4.4, 7.4, 7.5

-- ============================================================
-- 1. misconception_taxonomy table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.misconception_taxonomy (
  tag                  TEXT        PRIMARY KEY,
  display_name         TEXT        NOT NULL,
  description          TEXT,
  applicable_subjects  TEXT[]      NOT NULL DEFAULT '{}',
  default_severity     TEXT        NOT NULL DEFAULT 'major',
  version              TEXT        NOT NULL DEFAULT 'v1',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO public.misconception_taxonomy (tag, display_name, applicable_subjects, default_severity)
VALUES
  ('unclassified',              '未分类',       ARRAY['9709','9231','9702'], 'major'),
  ('calculation_error',         '计算错误',     ARRAY['9709','9231'],       'major'),
  ('sign_error',                '符号错误',     ARRAY['9709','9231'],       'minor'),
  ('missing_prerequisite_step', '缺少前置步骤', ARRAY['9709','9231','9702'], 'major'),
  ('premature_approximation',   '过早近似',     ARRAY['9709','9231'],       'minor'),
  ('skipped_justification',     '跳过论证',     ARRAY['9709','9231','9702'], 'major'),
  ('wrong_formula',             '公式错误',     ARRAY['9709','9231','9702'], 'critical'),
  ('unit_error',                '单位错误',     ARRAY['9702'],              'major')
ON CONFLICT (tag) DO NOTHING;

-- ============================================================
-- 2. reason_to_tag_mapping table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reason_to_tag_mapping (
  mapping_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reason            TEXT        NOT NULL,
  context_pattern   TEXT,
  misconception_tag TEXT        NOT NULL REFERENCES public.misconception_taxonomy(tag),
  priority          INT         NOT NULL DEFAULT 0,
  version           TEXT        NOT NULL DEFAULT 'v1',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed mapping rules (idempotent: skip if reason already exists with same tag)
-- Using a DO block to handle idempotency since there's no natural unique constraint on (reason, misconception_tag)
INSERT INTO public.reason_to_tag_mapping (reason, misconception_tag, priority)
SELECT v.reason, v.misconception_tag, v.priority
FROM (VALUES
  ('below_threshold',    'unclassified',              0),
  ('borderline_score',   'unclassified',              0),
  ('dependency_not_met', 'missing_prerequisite_step', 10),
  ('dependency_error',   'unclassified',              0),
  ('no_match',           'unclassified',              0)
) AS v(reason, misconception_tag, priority)
WHERE NOT EXISTS (
  SELECT 1 FROM public.reason_to_tag_mapping rtm
  WHERE rtm.reason = v.reason AND rtm.misconception_tag = v.misconception_tag
);

-- ============================================================
-- 3. Enable Row Level Security
-- ============================================================
ALTER TABLE public.misconception_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reason_to_tag_mapping ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- misconception_taxonomy: authenticated can only SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'taxonomy_read_authenticated' AND tablename = 'misconception_taxonomy'
  ) THEN
    CREATE POLICY taxonomy_read_authenticated ON public.misconception_taxonomy
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- misconception_taxonomy: service_role can INSERT/UPDATE/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'taxonomy_write_service_role' AND tablename = 'misconception_taxonomy'
  ) THEN
    CREATE POLICY taxonomy_write_service_role ON public.misconception_taxonomy
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- reason_to_tag_mapping: authenticated can only SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'mapping_read_authenticated' AND tablename = 'reason_to_tag_mapping'
  ) THEN
    CREATE POLICY mapping_read_authenticated ON public.reason_to_tag_mapping
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- reason_to_tag_mapping: service_role can INSERT/UPDATE/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'mapping_write_service_role' AND tablename = 'reason_to_tag_mapping'
  ) THEN
    CREATE POLICY mapping_write_service_role ON public.reason_to_tag_mapping
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
