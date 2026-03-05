-- Patch migration: prevent rename conflicts between v1 canonical and v2 asset_* tables
-- Purpose: move v1 canonical tables out of the way so 20260131230000_rename_asset_tables_to_canonical.sql can succeed

DO $$
BEGIN
  -- If v2 asset tables exist, move v1 canonical tables to *_deprecated to avoid name collisions.

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'asset_papers' AND c.relkind IN ('r','p')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'exam_papers' AND c.relkind IN ('r','p')
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'exam_papers_deprecated'
      ) THEN
        EXECUTE 'ALTER TABLE public.exam_papers RENAME TO exam_papers_deprecated';
      ELSIF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'exam_papers_deprecated_legacy'
      ) THEN
        EXECUTE 'ALTER TABLE public.exam_papers RENAME TO exam_papers_deprecated_legacy';
      END IF;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'asset_files' AND c.relkind IN ('r','p')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'paper_assets' AND c.relkind IN ('r','p')
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'paper_assets_deprecated'
      ) THEN
        EXECUTE 'ALTER TABLE public.paper_assets RENAME TO paper_assets_deprecated';
      ELSIF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'paper_assets_deprecated_legacy'
      ) THEN
        EXECUTE 'ALTER TABLE public.paper_assets RENAME TO paper_assets_deprecated_legacy';
      END IF;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'asset_ingest_runs' AND c.relkind IN ('r','p')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'ingest_runs' AND c.relkind IN ('r','p')
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'ingest_runs_deprecated'
      ) THEN
        EXECUTE 'ALTER TABLE public.ingest_runs RENAME TO ingest_runs_deprecated';
      ELSIF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'ingest_runs_deprecated_legacy'
      ) THEN
        EXECUTE 'ALTER TABLE public.ingest_runs RENAME TO ingest_runs_deprecated_legacy';
      END IF;
    END IF;
  END IF;
END $$;