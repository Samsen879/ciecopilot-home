-- 009_rag_log_add_fields.sql
-- Add degraded/retries fields and update logging function signature

-- 1) Add columns if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rag_search_logs' AND column_name = 'degraded'
  ) THEN
    ALTER TABLE public.rag_search_logs ADD COLUMN degraded BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rag_search_logs' AND column_name = 'retries'
  ) THEN
    ALTER TABLE public.rag_search_logs ADD COLUMN retries INTEGER DEFAULT 0;
  END IF;
END $$;

-- 2) Replace logging function with new signature
DROP FUNCTION IF EXISTS public.rag_log_search(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, REAL, UUID, JSONB);

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
  in_items JSONB,
  in_degraded BOOLEAN,
  in_retries INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.rag_search_logs (
    user_id, query_text, subject_code, paper_code, topic_id, mode, match_count, duration_ms, top_score, top_chunk_id, items, degraded, retries
  ) VALUES (
    in_user_id, in_query_text, in_subject_code, in_paper_code, in_topic_id, in_mode, in_match_count, in_duration_ms, in_top_score, in_top_chunk_id, in_items, in_degraded, in_retries
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.rag_log_search(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, REAL, UUID, JSONB, BOOLEAN, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rag_log_search(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, REAL, UUID, JSONB, BOOLEAN, INTEGER) TO authenticated;



