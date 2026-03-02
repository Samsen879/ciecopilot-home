-- Patch migration: rename constraints/indexes on *_deprecated tables to avoid name collisions

DO $$
BEGIN
  IF to_regclass('public.exam_papers_deprecated') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'exam_papers_deprecated' AND c.conname = 'exam_papers_syllabus_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.exam_papers_deprecated RENAME CONSTRAINT exam_papers_syllabus_check TO exam_papers_deprecated_syllabus_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'exam_papers_deprecated' AND c.conname = 'exam_papers_year_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.exam_papers_deprecated RENAME CONSTRAINT exam_papers_year_check TO exam_papers_deprecated_year_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'exam_papers_deprecated' AND c.conname = 'exam_papers_session_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.exam_papers_deprecated RENAME CONSTRAINT exam_papers_session_check TO exam_papers_deprecated_session_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'exam_papers_deprecated' AND c.conname = 'exam_papers_paper_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.exam_papers_deprecated RENAME CONSTRAINT exam_papers_paper_check TO exam_papers_deprecated_paper_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'exam_papers_deprecated' AND c.conname = 'exam_papers_variant_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.exam_papers_deprecated RENAME CONSTRAINT exam_papers_variant_check TO exam_papers_deprecated_variant_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'exam_papers_deprecated' AND c.conname = 'exam_papers_doc_type_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.exam_papers_deprecated RENAME CONSTRAINT exam_papers_doc_type_check TO exam_papers_deprecated_doc_type_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'exam_papers_deprecated' AND c.conname = 'exam_papers_unique'
    ) THEN
      EXECUTE 'ALTER TABLE public.exam_papers_deprecated RENAME CONSTRAINT exam_papers_unique TO exam_papers_deprecated_unique';
    END IF;
  END IF;

  IF to_regclass('public.paper_assets_deprecated') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'paper_assets_deprecated' AND c.conname = 'paper_assets_type_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.paper_assets_deprecated RENAME CONSTRAINT paper_assets_type_check TO paper_assets_deprecated_type_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'paper_assets_deprecated' AND c.conname = 'paper_assets_sha256_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.paper_assets_deprecated RENAME CONSTRAINT paper_assets_sha256_check TO paper_assets_deprecated_sha256_check';
    END IF;
  END IF;

  IF to_regclass('public.ingest_runs_deprecated') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'ingest_runs_deprecated' AND c.conname = 'ingest_runs_type_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.ingest_runs_deprecated RENAME CONSTRAINT ingest_runs_type_check TO ingest_runs_deprecated_type_check';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = 'ingest_runs_deprecated' AND c.conname = 'ingest_runs_status_check'
    ) THEN
      EXECUTE 'ALTER TABLE public.ingest_runs_deprecated RENAME CONSTRAINT ingest_runs_status_check TO ingest_runs_deprecated_status_check';
    END IF;
  END IF;
END $$;

-- Rename indexes to avoid collisions with canonical names after rename migration
ALTER INDEX IF EXISTS idx_exam_papers_syllabus RENAME TO idx_exam_papers_deprecated_syllabus;
ALTER INDEX IF EXISTS idx_exam_papers_year_session RENAME TO idx_exam_papers_deprecated_year_session;

ALTER INDEX IF EXISTS idx_paper_assets_paper_id RENAME TO idx_paper_assets_deprecated_paper_id;
ALTER INDEX IF EXISTS idx_paper_assets_sha256 RENAME TO idx_paper_assets_deprecated_sha256;
ALTER INDEX IF EXISTS idx_paper_assets_type RENAME TO idx_paper_assets_deprecated_type;

ALTER INDEX IF EXISTS idx_ingest_runs_status RENAME TO idx_ingest_runs_deprecated_status;
ALTER INDEX IF EXISTS idx_ingest_runs_started RENAME TO idx_ingest_runs_deprecated_started;