-- Recreate hybrid_search_v2 to align with curriculum_nodes schema

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
SET search_path = public, extensions
AS $$
BEGIN
  IF p_topic_path IS NULL THEN
    RAISE EXCEPTION 'current_topic_path required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.curriculum_nodes cn
    WHERE cn.topic_path = p_topic_path
  ) THEN
    RAISE EXCEPTION 'unknown current_topic_path: %', p_topic_path;
  END IF;

  RETURN QUERY
  WITH
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

REVOKE ALL ON FUNCTION public.hybrid_search_v2(text, vector(1536), ltree, int, int, int, real, real, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hybrid_search_v2 TO authenticated;
