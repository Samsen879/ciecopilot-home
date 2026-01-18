-- 006_rag_fulltext.sql
-- Add full-text search support for rag_chunks and hybrid search function.

-- 0) Safety: required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Add tsvector column for full-text search (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rag_chunks'
      AND column_name = 'tsv'
  ) THEN
    ALTER TABLE public.rag_chunks ADD COLUMN tsv tsvector;
  END IF;
END $$;

-- 2) Trigger to keep tsv up-to-date using document language when possible
CREATE OR REPLACE FUNCTION public.rag_chunks_tsv_trigger()
RETURNS TRIGGER AS $$
DECLARE
  cfg regconfig := 'simple';
  lang text;
BEGIN
  SELECT COALESCE(rd.language, 'en') INTO lang
  FROM public.rag_documents rd
  WHERE rd.id = NEW.document_id;

  IF lang = 'en' THEN
    cfg := 'english';
  ELSE
    cfg := 'simple';
  END IF;

  NEW.tsv := to_tsvector(cfg, COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rag_chunks_tsv ON public.rag_chunks;
CREATE TRIGGER trg_rag_chunks_tsv
BEFORE INSERT OR UPDATE OF content, document_id
ON public.rag_chunks
FOR EACH ROW EXECUTE FUNCTION public.rag_chunks_tsv_trigger();

-- 3) Backfill existing rows
UPDATE public.rag_chunks rc
SET tsv = to_tsvector('simple', COALESCE(rc.content, ''))
WHERE rc.tsv IS NULL;

-- 4) Indexes for FTS
CREATE INDEX IF NOT EXISTS idx_rag_chunks_tsv ON public.rag_chunks USING GIN(tsv);

-- 5) Helpful indexes on documents
CREATE INDEX IF NOT EXISTS idx_rag_documents_language ON public.rag_documents(language);
CREATE INDEX IF NOT EXISTS idx_rag_documents_tags ON public.rag_documents USING GIN(tags);
-- Composite index to speed up common filters
CREATE INDEX IF NOT EXISTS idx_rag_documents_subject_paper_topic ON public.rag_documents(subject_code, paper_code, topic_id);

-- 6) Strengthen referential integrity between rag_documents and subjects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'rag_documents'
      AND constraint_name = 'fk_rag_documents_subject'
  ) THEN
    ALTER TABLE public.rag_documents
    ADD CONSTRAINT fk_rag_documents_subject
    FOREIGN KEY (subject_code)
    REFERENCES public.subjects(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

-- 7) Full-text search function
CREATE OR REPLACE FUNCTION public.rag_search_fulltext(
  query_text text,
  in_subject_code text,
  in_paper_code text DEFAULT NULL,
  in_topic_id text DEFAULT NULL,
  match_count integer DEFAULT 12
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  rank real,
  highlight text,
  document_id uuid,
  title text,
  source_type text,
  source_path text,
  page_from integer,
  page_to integer,
  subject_code text,
  paper_code text,
  topic_id text
)
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('simple', COALESCE(NULLIF(query_text, ''), 'placeholder')) AS tsq
  )
  SELECT
    rc.id AS chunk_id,
    rc.content,
    ts_rank(rc.tsv, q.tsq)::real AS rank,
    ts_headline('simple', rc.content, q.tsq, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MinWords=5, MaxWords=24') AS highlight,
    rd.id AS document_id,
    rd.title,
    rd.source_type,
    rd.source_path,
    rc.page_from,
    rc.page_to,
    rd.subject_code,
    rd.paper_code,
    rd.topic_id
  FROM q, public.rag_chunks rc
  JOIN public.rag_documents rd ON rd.id = rc.document_id
  WHERE rd.subject_code = in_subject_code
    AND (in_paper_code IS NULL OR rd.paper_code = in_paper_code)
    AND (in_topic_id IS NULL OR rd.topic_id = in_topic_id)
    AND rc.tsv @@ q.tsq
  ORDER BY rank DESC
  LIMIT match_count;
$$ LANGUAGE sql STABLE;

-- 8) Hybrid search (embedding + FTS)
CREATE OR REPLACE FUNCTION public.rag_search_hybrid(
  query_text text,
  query_embedding vector(1536),
  in_subject_code text,
  in_paper_code text DEFAULT NULL,
  in_topic_id text DEFAULT NULL,
  match_count integer DEFAULT 12,
  weight_embedding real DEFAULT 0.6,
  weight_fulltext real DEFAULT 0.4
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  similarity real,
  rank real,
  score real,
  highlight text,
  document_id uuid,
  title text,
  source_type text,
  source_path text,
  page_from integer,
  page_to integer,
  subject_code text,
  paper_code text,
  topic_id text
)
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('simple', COALESCE(NULLIF(query_text, ''), 'placeholder')) AS tsq
  ),
  emb AS (
    SELECT rse.chunk_id,
           rse.content,
           rse.similarity,
           NULL::real AS rank,
           (GREATEST(0, LEAST(1, rse.similarity)) * weight_embedding)::real AS score,
           ts_headline('simple', rse.content, (SELECT tsq FROM q), 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MinWords=5, MaxWords=24') AS highlight,
           rse.document_id,
           rse.title,
           rse.source_type,
           rse.source_path,
           rse.page_from,
           rse.page_to,
           rse.subject_code,
           rse.paper_code,
           rse.topic_id
    FROM public.rag_search_by_embedding(query_embedding, in_subject_code, in_paper_code, in_topic_id, match_count, 0.0) AS rse
  ),
  ft AS (
    SELECT rsf.chunk_id,
           rsf.content,
           NULL::real AS similarity,
           rsf.rank,
           (GREATEST(0, rsf.rank) * weight_fulltext)::real AS score,
           rsf.highlight,
           rsf.document_id,
           rsf.title,
           rsf.source_type,
           rsf.source_path,
           rsf.page_from,
           rsf.page_to,
           rsf.subject_code,
           rsf.paper_code,
           rsf.topic_id
    FROM public.rag_search_fulltext(query_text, in_subject_code, in_paper_code, in_topic_id, match_count) AS rsf
  ),
  unioned AS (
    SELECT * FROM emb
    UNION ALL
    SELECT * FROM ft
  ),
  dedup AS (
    SELECT DISTINCT ON (chunk_id) *
    FROM unioned
    ORDER BY chunk_id, score DESC
  )
  SELECT *
  FROM dedup
  ORDER BY score DESC
  LIMIT match_count;
$$ LANGUAGE sql STABLE;

-- 9) Permissions: allow authenticated to execute read-only search
REVOKE ALL ON FUNCTION public.rag_search_fulltext(text, text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rag_search_hybrid(text, vector, text, text, text, integer, real, real) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rag_search_fulltext(text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rag_search_hybrid(text, vector, text, text, text, integer, real, real) TO authenticated;

-- Done
SELECT 'RAG fulltext and hybrid search ready' AS message;


