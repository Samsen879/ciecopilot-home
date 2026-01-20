-- curriculum_nodes: enforce READ-ONLY for anon/authenticated
-- Human decision: this table must be read-only; no INSERT/UPDATE/DELETE allowed.

-- Enable RLS (idempotent)
ALTER TABLE public.curriculum_nodes ENABLE ROW LEVEL SECURITY;

-- Drop write policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='curriculum_nodes'
             AND policyname='Enable insert for authenticated users only') THEN
    DROP POLICY "Enable insert for authenticated users only" ON public.curriculum_nodes;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='curriculum_nodes'
             AND policyname='Enable update for authenticated users only') THEN
    DROP POLICY "Enable update for authenticated users only" ON public.curriculum_nodes;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='curriculum_nodes'
             AND policyname='Enable delete for authenticated users only') THEN
    DROP POLICY "Enable delete for authenticated users only" ON public.curriculum_nodes;
  END IF;

  -- Ensure read policy exists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='curriculum_nodes'
                 AND policyname='Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON public.curriculum_nodes FOR SELECT USING (true);
  END IF;
END $$;

-- Privileges hardening (idempotent)
REVOKE INSERT, UPDATE, DELETE ON public.curriculum_nodes FROM anon, authenticated;
GRANT SELECT ON public.curriculum_nodes TO anon, authenticated;
