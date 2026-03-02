-- Initialize test database with required extensions
-- This runs before seed data

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create chunks table (matches production schema)
CREATE TABLE IF NOT EXISTS public.chunks (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding vector(1536),
  -- New columns for syllabus boundary system
  syllabus_code text,
  topic_path ltree NOT NULL DEFAULT 'unmapped'::ltree,
  node_id uuid,
  fts tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chunks_topic_path_gist ON public.chunks USING GIST (topic_path);
CREATE INDEX IF NOT EXISTS idx_chunks_fts_gin ON public.chunks USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_chunks_syllabus_code ON public.chunks (syllabus_code);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON public.chunks 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Create curriculum_nodes table
CREATE TABLE IF NOT EXISTS public.curriculum_nodes (
  node_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_code text NOT NULL,
  topic_path ltree NOT NULL UNIQUE,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for curriculum_nodes
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_topic_path_gist 
  ON public.curriculum_nodes USING GIST (topic_path);
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_syllabus_code 
  ON public.curriculum_nodes (syllabus_code);

-- Add CHECK constraints
ALTER TABLE public.curriculum_nodes
  ADD CONSTRAINT chk_topic_path_canonical 
  CHECK (topic_path::text ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$');

ALTER TABLE public.curriculum_nodes
  ADD CONSTRAINT chk_topic_path_not_unmapped
  CHECK (topic_path <> 'unmapped'::ltree);


-- Create hybrid_search_v2 RPC function
CREATE OR REPLACE FUNCTION public.hybrid_search_v2(
  p_query text,
  p_query_embedding vector(1536),
  p_topic_path ltree,
  p_match_count int DEFAULT 12,
  p_dense_pool int DEFAULT 50,
  p_key_pool int DEFAULT 50,
  p_w_sem real DEFAULT 0.3,
  p_w_key real DEFAULT 0.7,
  p_rrf_k int DEFAULT 60
)
RETURNS TABLE (
  id bigint,
  snippet text,
  topic_path ltree,
  score real,
  rank_sem int,
  rank_key int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hard guardrail: topic_path is REQUIRED
  IF p_topic_path IS NULL THEN
    RAISE EXCEPTION 'current_topic_path required';
  END IF;

  -- Validate topic_path exists in curriculum_nodes
  IF NOT EXISTS (
    SELECT 1 FROM public.curriculum_nodes cn 
    WHERE cn.topic_path = p_topic_path
  ) THEN
    RAISE EXCEPTION 'unknown current_topic_path: %', p_topic_path;
  END IF;

  RETURN QUERY
  WITH
  -- Dense (semantic) search: top N by vector similarity
  -- Filter by topic_path subtree BEFORE ranking
  -- Add stable tie-breaker with id
  dense AS (
    SELECT
      c.id,
      ROW_NUMBER() OVER (
        ORDER BY (c.embedding <=> p_query_embedding) ASC, c.id ASC
      )::int AS r_sem
    FROM public.chunks c
    WHERE c.topic_path <@ p_topic_path
      AND c.topic_path <> 'unmapped'::ltree
    ORDER BY (c.embedding <=> p_query_embedding) ASC, c.id ASC
    LIMIT p_dense_pool
  ),
  
  -- Keyword search: top N by ts_rank_cd
  -- Filter by topic_path subtree BEFORE ranking
  -- Add stable tie-breaker with id
  key AS (
    SELECT
      c.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery('english', p_query)) DESC, c.id ASC
      )::int AS r_key
    FROM public.chunks c
    WHERE c.topic_path <@ p_topic_path
      AND c.topic_path <> 'unmapped'::ltree
      AND c.fts @@ websearch_to_tsquery('english', p_query)
    ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery('english', p_query)) DESC, c.id ASC
    LIMIT p_key_pool
  ),
  
  -- Weighted RRF fusion
  fused AS (
    SELECT
      COALESCE(dense.id, key.id) AS id,
      dense.r_sem,
      key.r_key,
      (
        CASE WHEN dense.r_sem IS NULL THEN 0 
             ELSE (p_w_sem / (p_rrf_k + dense.r_sem)) 
        END
      ) + (
        CASE WHEN key.r_key IS NULL THEN 0 
             ELSE (p_w_key / (p_rrf_k + key.r_key)) 
        END
      ) AS score
    FROM dense
    FULL OUTER JOIN key USING (id)
  )
  
  -- Final result with chunk content
  SELECT
    c.id,
    LEFT(c.content, 400) AS snippet,
    c.topic_path,
    fused.score::real,
    fused.r_sem AS rank_sem,
    fused.r_key AS rank_key
  FROM fused
  JOIN public.chunks c ON c.id = fused.id
  ORDER BY fused.score DESC, c.id ASC
  LIMIT p_match_count;

END;
$$;

-- For test environment, grant to public (no auth in tests)
GRANT EXECUTE ON FUNCTION public.hybrid_search_v2 TO PUBLIC;
