-- 007_rag_observability.sql
-- Search observability: query logs table and helper function to record events

-- 0) Create table for search logs
CREATE TABLE IF NOT EXISTS public.rag_search_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NULL,
  query_text TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  paper_code TEXT NULL,
  topic_id TEXT NULL,
  mode TEXT NOT NULL, -- 'fulltext' | 'hybrid'
  match_count INTEGER NOT NULL,
  duration_ms INTEGER NULL,
  top_score REAL NULL,
  top_chunk_id UUID NULL,
  items JSONB NULL
);

-- 1) Basic index for time-range queries and subject filter
CREATE INDEX IF NOT EXISTS idx_rag_search_logs_created_at ON public.rag_search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_search_logs_subject ON public.rag_search_logs(subject_code);

-- 2) RLS (optional): allow authenticated users to insert their own logs only
ALTER TABLE public.rag_search_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rag_search_logs' AND policyname = 'insert_own_logs'
  ) THEN
    CREATE POLICY insert_own_logs ON public.rag_search_logs FOR INSERT WITH CHECK (auth.uid() IS NULL OR user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rag_search_logs' AND policyname = 'select_own_logs'
  ) THEN
    CREATE POLICY select_own_logs ON public.rag_search_logs FOR SELECT USING (auth.uid() IS NULL OR user_id = auth.uid());
  END IF;
END $$;

-- 3) Logging helper function (server keys typically call it)
CREATE OR REPLACE FUNCTION public.rag_log_search(
  in_user_id UUID,
  in_query_text TEXT,
  in_subject_code TEXT,
  in_paper_code TEXT,
  in_topic_id TEXT,
  in_mode TEXT,
  in_match_count INTEGER,
  in_duration_ms INTEGER,
  in_top_score REAL,
  in_top_chunk_id UUID,
  in_items JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.rag_search_logs (
    user_id, query_text, subject_code, paper_code, topic_id, mode, match_count, duration_ms, top_score, top_chunk_id, items
  ) VALUES (
    in_user_id, in_query_text, in_subject_code, in_paper_code, in_topic_id, in_mode, in_match_count, in_duration_ms, in_top_score, in_top_chunk_id, in_items
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Grant execute to authenticated
REVOKE ALL ON FUNCTION public.rag_log_search(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, REAL, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rag_log_search(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, REAL, UUID, JSONB) TO authenticated;

-- Done
SELECT 'RAG observability installed' AS message;


