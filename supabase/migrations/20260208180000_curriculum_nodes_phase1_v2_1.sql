-- Phase 1 v2.1: curriculum_nodes compatible expansion (non-destructive)
-- Goal: align with A1 minimal graph schema while preserving existing constraints/read-only policy.
-- This migration is tolerant to historical schema drift (subject_code/path vs syllabus_code/topic_path).

CREATE EXTENSION IF NOT EXISTS ltree;

DO $$
BEGIN
  IF to_regclass('public.curriculum_nodes') IS NULL THEN
    RAISE EXCEPTION 'public.curriculum_nodes does not exist; run previous migrations first';
  END IF;
END $$;

-- Compatibility columns required by phase1 + evidence-ledger pipeline
ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS topic_path ltree;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS syllabus_code text;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS level text;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS paper smallint;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS version_tag text;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS parent_id uuid;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS sort_order smallint;

ALTER TABLE public.curriculum_nodes
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Backfill syllabus_code from legacy subject_code when needed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_nodes'
      AND column_name = 'subject_code'
  ) THEN
    UPDATE public.curriculum_nodes
    SET syllabus_code = subject_code
    WHERE syllabus_code IS NULL
      AND subject_code IS NOT NULL;
  END IF;
END $$;

-- Backfill topic_path from legacy path/node_path/topic_path_text when needed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'topic_path_text'
  ) THEN
    BEGIN
      UPDATE public.curriculum_nodes
      SET topic_path = topic_path_text::ltree
      WHERE topic_path IS NULL
        AND topic_path_text IS NOT NULL;
    EXCEPTION WHEN others THEN
      UPDATE public.curriculum_nodes
      SET topic_path = regexp_replace(lower(replace(topic_path_text, '/', '.')), '[^a-z0-9_.]+', '_', 'g')::ltree
      WHERE topic_path IS NULL
        AND topic_path_text IS NOT NULL;
    END;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'node_path'
  ) THEN
    BEGIN
      UPDATE public.curriculum_nodes
      SET topic_path = node_path::ltree
      WHERE topic_path IS NULL
        AND node_path IS NOT NULL;
    EXCEPTION WHEN others THEN
      UPDATE public.curriculum_nodes
      SET topic_path = regexp_replace(lower(replace(node_path, '/', '.')), '[^a-z0-9_.]+', '_', 'g')::ltree
      WHERE topic_path IS NULL
        AND node_path IS NOT NULL;
    END;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'path'
  ) THEN
    BEGIN
      UPDATE public.curriculum_nodes
      SET topic_path = path::ltree
      WHERE topic_path IS NULL
        AND path IS NOT NULL;
    EXCEPTION WHEN others THEN
      UPDATE public.curriculum_nodes
      SET topic_path = regexp_replace(lower(replace(path, '/', '.')), '[^a-z0-9_.]+', '_', 'g')::ltree
      WHERE topic_path IS NULL
        AND path IS NOT NULL;
    END;
  END IF;
END $$;

-- Backfill defaults for existing rows before NOT NULL hardening.
UPDATE public.curriculum_nodes
SET version_tag = '2025-2027_v1'
WHERE version_tag IS NULL;

UPDATE public.curriculum_nodes
SET sort_order = 0
WHERE sort_order IS NULL;

UPDATE public.curriculum_nodes
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.curriculum_nodes
  ALTER COLUMN version_tag SET DEFAULT '2025-2027_v1';

ALTER TABLE public.curriculum_nodes
  ALTER COLUMN sort_order SET DEFAULT 0;

ALTER TABLE public.curriculum_nodes
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

ALTER TABLE public.curriculum_nodes
  ALTER COLUMN version_tag SET NOT NULL;

ALTER TABLE public.curriculum_nodes
  ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE public.curriculum_nodes
  ALTER COLUMN metadata SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'curriculum_nodes_parent_id_fkey'
      AND conrelid = 'public.curriculum_nodes'::regclass
  ) THEN
    ALTER TABLE public.curriculum_nodes
      ADD CONSTRAINT curriculum_nodes_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.curriculum_nodes(node_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_curriculum_nodes_paper_range'
      AND conrelid = 'public.curriculum_nodes'::regclass
  ) THEN
    ALTER TABLE public.curriculum_nodes
      ADD CONSTRAINT chk_curriculum_nodes_paper_range
      CHECK (paper IS NULL OR paper BETWEEN 1 AND 6);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_curriculum_nodes_version_tag_not_blank'
      AND conrelid = 'public.curriculum_nodes'::regclass
  ) THEN
    ALTER TABLE public.curriculum_nodes
      ADD CONSTRAINT chk_curriculum_nodes_version_tag_not_blank
      CHECK (length(btrim(version_tag)) > 0);
  END IF;
END $$;

-- Add uniqueness only when columns are present and existing data is clean.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'syllabus_code'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'topic_path'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_nodes' AND column_name = 'version_tag'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'curriculum_nodes_syllabus_topic_version_key'
        AND conrelid = 'public.curriculum_nodes'::regclass
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.curriculum_nodes
        WHERE syllabus_code IS NOT NULL
          AND topic_path IS NOT NULL
          AND version_tag IS NOT NULL
        GROUP BY syllabus_code, topic_path, version_tag
        HAVING count(*) > 1
      ) THEN
        ALTER TABLE public.curriculum_nodes
          ADD CONSTRAINT curriculum_nodes_syllabus_topic_version_key
          UNIQUE (syllabus_code, topic_path, version_tag);
      ELSE
        RAISE NOTICE 'Skip curriculum_nodes_syllabus_topic_version_key due to duplicated existing rows';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'Skip curriculum_nodes_syllabus_topic_version_key because required columns are missing';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_parent_id
  ON public.curriculum_nodes(parent_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_nodes'
      AND column_name = 'syllabus_code'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_syllabus_paper ON public.curriculum_nodes(syllabus_code, paper)';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_nodes'
      AND column_name = 'subject_code'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_subject_paper ON public.curriculum_nodes(subject_code, paper)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_version_tag
  ON public.curriculum_nodes(version_tag);

CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_topic_path_gist
  ON public.curriculum_nodes USING GIST (topic_path);

-- Keep existing read-only posture for anon/authenticated.
ALTER TABLE public.curriculum_nodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'curriculum_nodes'
      AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users"
      ON public.curriculum_nodes
      FOR SELECT
      USING (true);
  END IF;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.curriculum_nodes FROM anon, authenticated;
GRANT SELECT ON public.curriculum_nodes TO anon, authenticated;
