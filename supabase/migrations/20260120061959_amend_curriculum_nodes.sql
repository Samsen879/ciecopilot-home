-- Idempotent indexes, constraints, and policies for curriculum_nodes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_nodes'
      AND column_name = 'topic_path'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_topic_path_gist
      ON public.curriculum_nodes USING GIST (topic_path);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_nodes'
      AND column_name = 'syllabus_code'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_syllabus_code
      ON public.curriculum_nodes (syllabus_code);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_nodes'
      AND column_name = 'topic_path'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'chk_topic_path_canonical'
        AND conrelid = 'public.curriculum_nodes'::regclass
    ) THEN
      ALTER TABLE public.curriculum_nodes
        ADD CONSTRAINT chk_topic_path_canonical
        CHECK (topic_path::text ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$');
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'chk_topic_path_not_unmapped'
        AND conrelid = 'public.curriculum_nodes'::regclass
    ) THEN
      ALTER TABLE public.curriculum_nodes
        ADD CONSTRAINT chk_topic_path_not_unmapped
        CHECK (topic_path <> 'unmapped'::ltree);
    END IF;
  END IF;
END $$;

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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'curriculum_nodes'
      AND policyname = 'Enable insert for authenticated users only'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users only"
      ON public.curriculum_nodes
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'curriculum_nodes'
      AND policyname = 'Enable update for authenticated users only'
  ) THEN
    CREATE POLICY "Enable update for authenticated users only"
      ON public.curriculum_nodes
      FOR UPDATE
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'curriculum_nodes'
      AND policyname = 'Enable delete for authenticated users only'
  ) THEN
    CREATE POLICY "Enable delete for authenticated users only"
      ON public.curriculum_nodes
      FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;
