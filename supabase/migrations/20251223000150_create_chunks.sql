-- Create chunks table for RAG v2 (minimal schema)

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE IF NOT EXISTS public.chunks (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  embedding vector(1536),
  syllabus_code text,
  topic_path ltree NOT NULL DEFAULT 'unmapped'::ltree,
  node_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chunks' AND policyname = 'Enable read access for authenticated users'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users" ON public.chunks
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chunks' AND policyname = 'Service role can manage chunks'
  ) THEN
    CREATE POLICY "Service role can manage chunks" ON public.chunks
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
