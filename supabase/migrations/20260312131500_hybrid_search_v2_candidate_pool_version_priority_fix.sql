-- Fix ambiguous id references in candidate-pool version-priority hybrid_search_v2.

DROP FUNCTION IF EXISTS public.hybrid_search_v2(text, vector(1536), ltree, int, int, int, real, real, int);
DROP FUNCTION IF EXISTS public.hybrid_search_v2(text, vector(1536), ltree, text[], int, int, int, real, real, int);
DROP FUNCTION IF EXISTS public.hybrid_search_v2(text, vector(1536), ltree, int, int, int, real, real, int, text[]);

CREATE OR REPLACE FUNCTION public.hybrid_search_v2(
  p_query text,
  p_query_embedding vector(1536),
  p_topic_path ltree,
  p_match_count int DEFAULT 12,
  p_dense_pool int DEFAULT 50,
  p_key_pool int DEFAULT 50,
  p_w_sem real DEFAULT 0.3,
  p_w_key real DEFAULT 0.7,
  p_rrf_k int DEFAULT 60,
  p_corpus_versions text[] DEFAULT NULL
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
  dense_candidates AS (
    SELECT
      c.id,
      (c.embedding <=> p_query_embedding) AS sem_distance,
      CASE
        WHEN p_corpus_versions IS NULL THEN 2147483647
        ELSE COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647)
      END AS version_priority,
      COALESCE(c.source_ref->>'asset_id', '') AS dedupe_asset_id,
      COALESCE(c.source_ref->>'paper_id', '') AS dedupe_paper_id,
      COALESCE(c.source_ref->>'chunk_kind', '') AS dedupe_chunk_kind,
      COALESCE(c.source_ref->>'question_id', '') AS dedupe_question_id,
      COALESCE(c.source_ref->>'section_id', '') AS dedupe_section_id,
      COALESCE(c.source_ref->>'page_no', '') AS dedupe_page_no,
      COALESCE(c.source_ref->>'chunk_index', '') AS dedupe_chunk_index,
      COALESCE(c.source_ref->>'subchunk_index', '') AS dedupe_subchunk_index
    FROM public.chunks c
    WHERE c.topic_path <@ p_topic_path
      AND c.topic_path <> 'unmapped'::ltree
      AND (p_corpus_versions IS NULL OR c.corpus_version = ANY(p_corpus_versions))
  ),
  dense_unique AS (
    SELECT DISTINCT ON (
      c.source_type,
      dedupe_asset_id,
      dedupe_paper_id,
      dedupe_chunk_kind,
      dedupe_question_id,
      dedupe_section_id,
      dedupe_page_no,
      dedupe_chunk_index,
      dedupe_subchunk_index
    )
      c.id,
      dense_candidates.sem_distance
    FROM dense_candidates
    JOIN public.chunks c ON c.id = dense_candidates.id
    ORDER BY
      c.source_type,
      dedupe_asset_id,
      dedupe_paper_id,
      dedupe_chunk_kind,
      dedupe_question_id,
      dedupe_section_id,
      dedupe_page_no,
      dedupe_chunk_index,
      dedupe_subchunk_index,
      version_priority ASC,
      dense_candidates.sem_distance ASC,
      c.id ASC
  ),
  dense AS (
    SELECT
      dense_unique.id AS id,
      ROW_NUMBER() OVER (
        ORDER BY sem_distance ASC, dense_unique.id ASC
      )::int AS r_sem
    FROM dense_unique
    ORDER BY sem_distance ASC, dense_unique.id ASC
    LIMIT p_dense_pool
  ),
  key_candidates AS (
    SELECT
      c.id,
      ts_rank_cd(c.fts, websearch_to_tsquery('english', p_query)) AS key_score,
      CASE
        WHEN p_corpus_versions IS NULL THEN 2147483647
        ELSE COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647)
      END AS version_priority,
      COALESCE(c.source_ref->>'asset_id', '') AS dedupe_asset_id,
      COALESCE(c.source_ref->>'paper_id', '') AS dedupe_paper_id,
      COALESCE(c.source_ref->>'chunk_kind', '') AS dedupe_chunk_kind,
      COALESCE(c.source_ref->>'question_id', '') AS dedupe_question_id,
      COALESCE(c.source_ref->>'section_id', '') AS dedupe_section_id,
      COALESCE(c.source_ref->>'page_no', '') AS dedupe_page_no,
      COALESCE(c.source_ref->>'chunk_index', '') AS dedupe_chunk_index,
      COALESCE(c.source_ref->>'subchunk_index', '') AS dedupe_subchunk_index
    FROM public.chunks c
    WHERE c.topic_path <@ p_topic_path
      AND c.topic_path <> 'unmapped'::ltree
      AND (p_corpus_versions IS NULL OR c.corpus_version = ANY(p_corpus_versions))
      AND c.fts @@ websearch_to_tsquery('english', p_query)
  ),
  key_unique AS (
    SELECT DISTINCT ON (
      c.source_type,
      dedupe_asset_id,
      dedupe_paper_id,
      dedupe_chunk_kind,
      dedupe_question_id,
      dedupe_section_id,
      dedupe_page_no,
      dedupe_chunk_index,
      dedupe_subchunk_index
    )
      c.id,
      key_candidates.key_score
    FROM key_candidates
    JOIN public.chunks c ON c.id = key_candidates.id
    ORDER BY
      c.source_type,
      dedupe_asset_id,
      dedupe_paper_id,
      dedupe_chunk_kind,
      dedupe_question_id,
      dedupe_section_id,
      dedupe_page_no,
      dedupe_chunk_index,
      dedupe_subchunk_index,
      version_priority ASC,
      key_candidates.key_score DESC,
      c.id ASC
  ),
  key AS (
    SELECT
      key_unique.id AS id,
      ROW_NUMBER() OVER (
        ORDER BY key_score DESC, key_unique.id ASC
      )::int AS r_key
    FROM key_unique
    ORDER BY key_score DESC, key_unique.id ASC
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
  ),
  dedupe_candidates AS (
    SELECT
      c.id,
      c.content,
      c.topic_path,
      fused.score,
      fused.r_sem,
      fused.r_key,
      CASE
        WHEN p_corpus_versions IS NULL THEN 2147483647
        ELSE COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647)
      END AS version_priority,
      COALESCE(c.source_ref->>'asset_id', '') AS dedupe_asset_id,
      COALESCE(c.source_ref->>'paper_id', '') AS dedupe_paper_id,
      COALESCE(c.source_ref->>'chunk_kind', '') AS dedupe_chunk_kind,
      COALESCE(c.source_ref->>'question_id', '') AS dedupe_question_id,
      COALESCE(c.source_ref->>'section_id', '') AS dedupe_section_id,
      COALESCE(c.source_ref->>'page_no', '') AS dedupe_page_no,
      COALESCE(c.source_ref->>'chunk_index', '') AS dedupe_chunk_index,
      COALESCE(c.source_ref->>'subchunk_index', '') AS dedupe_subchunk_index
    FROM fused
    JOIN public.chunks c ON c.id = fused.id
  ),
  deduped AS (
    SELECT DISTINCT ON (
      c.source_type,
      dedupe_asset_id,
      dedupe_paper_id,
      dedupe_chunk_kind,
      dedupe_question_id,
      dedupe_section_id,
      dedupe_page_no,
      dedupe_chunk_index,
      dedupe_subchunk_index
    )
      c.id,
      dedupe_candidates.content,
      dedupe_candidates.topic_path,
      dedupe_candidates.score,
      dedupe_candidates.r_sem,
      dedupe_candidates.r_key
    FROM dedupe_candidates
    JOIN public.chunks c ON c.id = dedupe_candidates.id
    ORDER BY
      c.source_type,
      dedupe_asset_id,
      dedupe_paper_id,
      dedupe_chunk_kind,
      dedupe_question_id,
      dedupe_section_id,
      dedupe_page_no,
      dedupe_chunk_index,
      dedupe_subchunk_index,
      version_priority ASC,
      dedupe_candidates.score DESC,
      c.id ASC
  )
  SELECT
    deduped.id,
    LEFT(deduped.content, 400) AS snippet,
    deduped.topic_path,
    deduped.score::real,
    deduped.r_sem AS rank_sem,
    deduped.r_key AS rank_key
  FROM deduped
  ORDER BY deduped.score DESC, deduped.id ASC
  LIMIT p_match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.hybrid_search_v2(text, vector(1536), ltree, int, int, int, real, real, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hybrid_search_v2(text, vector(1536), ltree, int, int, int, real, real, int, text[]) TO authenticated;
