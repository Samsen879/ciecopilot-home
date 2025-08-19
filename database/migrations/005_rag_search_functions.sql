-- RAG search helper SQL functions
-- Requires: 004_rag_embeddings.sql (rag_documents, rag_chunks, rag_embeddings, pgvector)

-- 1) Similarity search by embedding with optional filtering
CREATE OR REPLACE FUNCTION public.rag_search_by_embedding(
  query_embedding vector(1536),
  in_subject_code text,
  in_paper_code text DEFAULT NULL,
  in_topic_id text DEFAULT NULL,
  match_count integer DEFAULT 12,
  min_similarity real DEFAULT 0.20
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  similarity real,
  document_id uuid,
  title text,
  source_type text,
  source_path text,
  page_from integer,
  page_to integer,
  subject_code text,
  paper_code text,
  topic_id text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id AS chunk_id,
    rc.content,
    (1 - (re.embedding <=> query_embedding))::real AS similarity,
    rd.id AS document_id,
    rd.title,
    rd.source_type,
    rd.source_path,
    rc.page_from,
    rc.page_to,
    rd.subject_code,
    rd.paper_code,
    rd.topic_id
  FROM public.rag_embeddings re
  JOIN public.rag_chunks rc ON rc.id = re.chunk_id
  JOIN public.rag_documents rd ON rd.id = rc.document_id
  WHERE rd.subject_code = in_subject_code
    AND (in_paper_code IS NULL OR rd.paper_code = in_paper_code)
    AND (in_topic_id IS NULL OR rd.topic_id = in_topic_id)
  ORDER BY re.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2) Convenience view for top-K results above threshold
CREATE OR REPLACE FUNCTION public.rag_search_filtered(
  query_embedding vector(1536),
  in_subject_code text,
  in_paper_code text DEFAULT NULL,
  in_topic_id text DEFAULT NULL,
  match_count integer DEFAULT 12,
  min_similarity real DEFAULT 0.20
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  similarity real,
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
  SELECT *
  FROM public.rag_search_by_embedding(
    query_embedding,
    in_subject_code,
    in_paper_code,
    in_topic_id,
    match_count,
    min_similarity
  )
  WHERE similarity >= min_similarity
  ORDER BY similarity DESC;
$$ LANGUAGE sql STABLE;

-- 3) Permissions: allow authenticated to execute read-only search
REVOKE ALL ON FUNCTION public.rag_search_by_embedding(vector, text, text, text, integer, real) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rag_search_filtered(vector, text, text, text, integer, real) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rag_search_by_embedding(vector, text, text, text, integer, real) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rag_search_filtered(vector, text, text, text, integer, real) TO authenticated;

-- Done
SELECT 'RAG search functions installed' AS message;


