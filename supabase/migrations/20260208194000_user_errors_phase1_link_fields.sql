-- Phase 1 v2.1 B3: user_errors link fields for question-domain closed loop
-- Non-destructive compatible migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Some environments are missing user_errors despite early migrations being marked as applied.
-- Create a minimal compatible table first, then run additive alterations.
CREATE TABLE IF NOT EXISTS public.user_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS storage_key text;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS syllabus_code text;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS paper smallint;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS q_number integer;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS node_id uuid;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS question text;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.user_errors
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.user_errors
SET source = 'manual'
WHERE source IS NULL;

UPDATE public.user_errors
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

UPDATE public.user_errors
SET question = ''
WHERE question IS NULL;

UPDATE public.user_errors
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.user_errors
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE public.user_errors
  ALTER COLUMN source SET DEFAULT 'manual';

ALTER TABLE public.user_errors
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

ALTER TABLE public.user_errors
  ALTER COLUMN question SET DEFAULT '';

ALTER TABLE public.user_errors
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.user_errors
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.user_errors
  ALTER COLUMN source SET NOT NULL;

ALTER TABLE public.user_errors
  ALTER COLUMN metadata SET NOT NULL;

ALTER TABLE public.user_errors
  ALTER COLUMN question SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.curriculum_nodes') IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_errors_node_id_fkey'
      AND conrelid = 'public.user_errors'::regclass
  ) THEN
    ALTER TABLE public.user_errors
      ADD CONSTRAINT user_errors_node_id_fkey
      FOREIGN KEY (node_id) REFERENCES public.curriculum_nodes(node_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_user_errors_paper_range'
      AND conrelid = 'public.user_errors'::regclass
  ) THEN
    ALTER TABLE public.user_errors
      ADD CONSTRAINT chk_user_errors_paper_range
      CHECK (paper IS NULL OR paper BETWEEN 1 AND 6);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_errors_user_id
  ON public.user_errors(user_id);

CREATE INDEX IF NOT EXISTS idx_user_errors_storage_key
  ON public.user_errors(storage_key);

CREATE INDEX IF NOT EXISTS idx_user_errors_node_id
  ON public.user_errors(node_id);

CREATE INDEX IF NOT EXISTS idx_user_errors_syllabus_paper
  ON public.user_errors(syllabus_code, paper);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_user_errors_user_storage_key_unique'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_errors
      WHERE storage_key IS NOT NULL
      GROUP BY user_id, storage_key
      HAVING count(*) > 1
    ) THEN
      CREATE UNIQUE INDEX idx_user_errors_user_storage_key_unique
        ON public.user_errors(user_id, storage_key)
        WHERE storage_key IS NOT NULL;
    ELSE
      RAISE NOTICE 'Skip idx_user_errors_user_storage_key_unique due to duplicated existing rows';
    END IF;
  END IF;
END $$;
