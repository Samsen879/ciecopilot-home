import { summarizeCorpusSchemaCompat } from '../lib/corpus-schema-compat.js';

describe('corpus-schema-compat', () => {
  test('passes when migration is additive and hybrid signature is preserved', () => {
    const summary = summarizeCorpusSchemaCompat({
      migrationSql: `
        ALTER TABLE public.chunks
          ADD COLUMN IF NOT EXISTS source_type text,
          ADD COLUMN IF NOT EXISTS source_ref jsonb,
          ADD COLUMN IF NOT EXISTS corpus_version text,
          ADD COLUMN IF NOT EXISTS content_hash text;
      `,
      hybridSql: `
        DROP FUNCTION IF EXISTS public.hybrid_search_v2(
          text,
          vector(1536),
          ltree,
          int,
          int,
          int,
          real,
          real,
          int
        );
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
        AS $$
        BEGIN
          RETURN QUERY
          WITH scoped_chunks AS (
            SELECT
              c.id,
              COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647) AS version_priority,
              COALESCE(c.source_ref->>'asset_id', '') AS family_asset_id,
              COALESCE(c.source_ref->>'paper_id', '') AS family_paper_id,
              COALESCE(c.source_ref->>'chunk_kind', '') AS family_chunk_kind,
              c.source_type,
              COALESCE(c.source_ref->>'asset_id', '') AS dedupe_asset_id,
              COALESCE(c.source_ref->>'paper_id', '') AS dedupe_paper_id,
              COALESCE(c.source_ref->>'chunk_kind', '') AS dedupe_chunk_kind,
              COALESCE(c.source_ref->>'question_id', '') AS dedupe_question_id,
              COALESCE(c.source_ref->>'section_id', '') AS dedupe_section_id,
              COALESCE(c.source_ref->>'page_no', '') AS dedupe_page_no,
              COALESCE(c.source_ref->>'chunk_index', '') AS dedupe_chunk_index,
              COALESCE(c.source_ref->>'subchunk_index', '') AS dedupe_subchunk_index
            FROM public.chunks c
          ),
          asset_family_latest AS (
            SELECT
              source_type,
              family_asset_id,
              family_paper_id,
              family_chunk_kind,
              MIN(version_priority) AS min_version_priority
            FROM scoped_chunks
            GROUP BY source_type, family_asset_id, family_paper_id, family_chunk_kind
          ),
          version_scoped_chunks AS (
            SELECT scoped_chunks.*
            FROM scoped_chunks
            JOIN asset_family_latest
              ON asset_family_latest.source_type = scoped_chunks.source_type
             AND asset_family_latest.family_asset_id = scoped_chunks.family_asset_id
             AND asset_family_latest.family_paper_id = scoped_chunks.family_paper_id
             AND asset_family_latest.family_chunk_kind = scoped_chunks.family_chunk_kind
             AND asset_family_latest.min_version_priority = scoped_chunks.version_priority
          ),
          dense_candidates AS (
            SELECT
              version_scoped_chunks.id,
              version_scoped_chunks.source_type,
              0.1::real AS sem_distance,
              version_scoped_chunks.version_priority,
              version_scoped_chunks.dedupe_asset_id,
              version_scoped_chunks.dedupe_paper_id,
              version_scoped_chunks.dedupe_chunk_kind,
              version_scoped_chunks.dedupe_question_id,
              version_scoped_chunks.dedupe_section_id,
              version_scoped_chunks.dedupe_page_no,
              version_scoped_chunks.dedupe_chunk_index,
              version_scoped_chunks.dedupe_subchunk_index
            FROM version_scoped_chunks
          ),
          dense_unique AS (
            SELECT DISTINCT ON (
              dense_candidates.source_type,
              dedupe_asset_id,
              dedupe_paper_id,
              dedupe_chunk_kind,
              dedupe_question_id,
              dedupe_section_id,
              dedupe_page_no,
              dedupe_chunk_index,
              dedupe_subchunk_index
            )
              dense_candidates.id,
              dense_candidates.sem_distance
            FROM dense_candidates
            ORDER BY
              dense_candidates.source_type,
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
              ROW_NUMBER() OVER (ORDER BY sem_distance ASC, dense_unique.id ASC)::int AS r_sem
            FROM dense_unique
          ),
          key_candidates AS (
            SELECT
              version_scoped_chunks.id,
              version_scoped_chunks.source_type,
              0.9::real AS key_score,
              version_scoped_chunks.version_priority,
              version_scoped_chunks.dedupe_asset_id,
              version_scoped_chunks.dedupe_paper_id,
              version_scoped_chunks.dedupe_chunk_kind,
              version_scoped_chunks.dedupe_question_id,
              version_scoped_chunks.dedupe_section_id,
              version_scoped_chunks.dedupe_page_no,
              version_scoped_chunks.dedupe_chunk_index,
              version_scoped_chunks.dedupe_subchunk_index
            FROM version_scoped_chunks
          ),
          key_unique AS (
            SELECT DISTINCT ON (
              key_candidates.source_type,
              dedupe_asset_id,
              dedupe_paper_id,
              dedupe_chunk_kind,
              dedupe_question_id,
              dedupe_section_id,
              dedupe_page_no,
              dedupe_chunk_index,
              dedupe_subchunk_index
            )
              key_candidates.id,
              key_candidates.key_score
            FROM key_candidates
            ORDER BY
              key_candidates.source_type,
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
              ROW_NUMBER() OVER (ORDER BY key_score DESC, key_unique.id ASC)::int AS r_key
            FROM key_unique
          ),
          fused AS (
            SELECT
              COALESCE(dense.id, key.id) AS id,
              dense.r_sem,
              key.r_key,
              1.0::real AS score
            FROM dense
            FULL OUTER JOIN key USING (id)
          ),
          dedupe_candidates AS (
            SELECT
              c.id,
              fused.score,
              fused.r_sem,
              fused.r_key,
              COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647) AS version_priority,
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
              dedupe_candidates.score,
              dedupe_candidates.r_sem,
              dedupe_candidates.r_key,
              dedupe_candidates.version_priority
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
          SELECT id, ''::text, '9709'::ltree, score, r_sem, r_key
          FROM deduped;
        END;
        $$ LANGUAGE plpgsql
      `,
    });

    expect(summary.status).toBe('pass');
    expect(summary.migration_checks.additive_columns_present).toBe(true);
    expect(summary.hybrid_search_checks.signature_compatible).toBe(true);
    expect(summary.hybrid_search_checks.legacy_signature_drop_present).toBe(true);
    expect(summary.hybrid_search_checks.version_priority_dedupe_present).toBe(true);
    expect(summary.hybrid_search_checks.version_priority_candidate_pool_present).toBe(true);
    expect(summary.hybrid_search_checks.asset_family_version_shadow_present).toBe(true);
  });

  test('fails when migration is destructive or hybrid signature drifts', () => {
    const summary = summarizeCorpusSchemaCompat({
      migrationSql: `
        ALTER TABLE public.chunks DROP COLUMN embedding;
      `,
      hybridSql: `
        CREATE OR REPLACE FUNCTION public.hybrid_search_v2(
          p_query text,
          p_query_embedding vector(1536),
          p_topic_path ltree
        )
        RETURNS TABLE (
          id bigint
        )
      `,
    });

    expect(summary.status).toBe('fail');
    expect(summary.migration_checks.destructive_statements.length).toBeGreaterThan(0);
    expect(summary.hybrid_search_checks.missing_hybrid_fragments.length).toBeGreaterThan(0);
  });

  test('fails when hybrid SQL omits version-priority dedupe', () => {
    const summary = summarizeCorpusSchemaCompat({
      migrationSql: `
        ALTER TABLE public.chunks
          ADD COLUMN IF NOT EXISTS source_type text,
          ADD COLUMN IF NOT EXISTS source_ref jsonb,
          ADD COLUMN IF NOT EXISTS corpus_version text,
          ADD COLUMN IF NOT EXISTS content_hash text;
      `,
      hybridSql: `
        DROP FUNCTION IF EXISTS public.hybrid_search_v2(
          text,
          vector(1536),
          ltree,
          int,
          int,
          int,
          real,
          real,
          int
        );
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
      `,
    });

    expect(summary.status).toBe('fail');
    expect(summary.hybrid_search_checks.version_priority_dedupe_present).toBe(false);
  });

  test('fails when hybrid SQL dedupes on full source_ref json instead of stable source identity', () => {
    const summary = summarizeCorpusSchemaCompat({
      migrationSql: `
        ALTER TABLE public.chunks
          ADD COLUMN IF NOT EXISTS source_type text,
          ADD COLUMN IF NOT EXISTS source_ref jsonb,
          ADD COLUMN IF NOT EXISTS corpus_version text,
          ADD COLUMN IF NOT EXISTS content_hash text;
      `,
      hybridSql: `
        DROP FUNCTION IF EXISTS public.hybrid_search_v2(
          text,
          vector(1536),
          ltree,
          int,
          int,
          int,
          real,
          real,
          int
        );
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
        AS $$
        BEGIN
          RETURN QUERY
          WITH fused AS (
            SELECT 1 AS id, 1 AS r_sem, 1 AS r_key, 1.0::real AS score
          ),
          deduped AS (
            SELECT DISTINCT ON (c.source_type, c.source_ref)
              c.id,
              fused.score,
              fused.r_sem,
              fused.r_key,
              COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647) AS version_priority
            FROM fused
            JOIN public.chunks c ON c.id = fused.id
            ORDER BY c.source_type, c.source_ref, version_priority ASC, fused.score DESC, c.id ASC
          )
          SELECT id, ''::text, '9709'::ltree, score, r_sem, r_key
          FROM deduped;
        END;
        $$ LANGUAGE plpgsql
      `,
    });

    expect(summary.status).toBe('fail');
    expect(summary.hybrid_search_checks.version_priority_dedupe_present).toBe(false);
    expect(summary.hybrid_search_checks.version_priority_stable_identity_present).toBe(false);
  });

  test('fails when version-priority dedupe is applied only after fusion and not in dense/key candidate pools', () => {
    const summary = summarizeCorpusSchemaCompat({
      migrationSql: `
        ALTER TABLE public.chunks
          ADD COLUMN IF NOT EXISTS source_type text,
          ADD COLUMN IF NOT EXISTS source_ref jsonb,
          ADD COLUMN IF NOT EXISTS corpus_version text,
          ADD COLUMN IF NOT EXISTS content_hash text;
      `,
      hybridSql: `
        DROP FUNCTION IF EXISTS public.hybrid_search_v2(
          text,
          vector(1536),
          ltree,
          int,
          int,
          int,
          real,
          real,
          int
        );
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
        AS $$
        BEGIN
          RETURN QUERY
          WITH fused AS (
            SELECT 1 AS id, 1 AS r_sem, 1 AS r_key, 1.0::real AS score
          ),
          dedupe_candidates AS (
            SELECT
              c.id,
              fused.score,
              fused.r_sem,
              fused.r_key,
              COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647) AS version_priority,
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
              dedupe_candidates.score,
              dedupe_candidates.r_sem,
              dedupe_candidates.r_key,
              dedupe_candidates.version_priority
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
          SELECT id, ''::text, '9709'::ltree, score, r_sem, r_key
          FROM deduped;
        END;
        $$ LANGUAGE plpgsql
      `,
    });

    expect(summary.status).toBe('fail');
    expect(summary.hybrid_search_checks.version_priority_candidate_pool_present).toBe(false);
  });

  test('fails when hybrid SQL does not shadow older asset-family versions before dense/key ranking', () => {
    const summary = summarizeCorpusSchemaCompat({
      migrationSql: `
        ALTER TABLE public.chunks
          ADD COLUMN IF NOT EXISTS source_type text,
          ADD COLUMN IF NOT EXISTS source_ref jsonb,
          ADD COLUMN IF NOT EXISTS corpus_version text,
          ADD COLUMN IF NOT EXISTS content_hash text;
      `,
      hybridSql: `
        DROP FUNCTION IF EXISTS public.hybrid_search_v2(
          text,
          vector(1536),
          ltree,
          int,
          int,
          int,
          real,
          real,
          int
        );
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
        AS $$
        BEGIN
          RETURN QUERY
          WITH dense_candidates AS (
            SELECT
              c.id,
              COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647) AS version_priority
            FROM public.chunks c
          ),
          key_candidates AS (
            SELECT
              c.id,
              COALESCE(array_position(p_corpus_versions, c.corpus_version), 2147483647) AS version_priority
            FROM public.chunks c
          )
          SELECT 1, ''::text, '9709'::ltree, 1.0::real, 1, 1;
        END;
        $$ LANGUAGE plpgsql
      `,
    });

    expect(summary.status).toBe('fail');
    expect(summary.hybrid_search_checks.asset_family_version_shadow_present).toBe(false);
  });

  test('fails when dense/key candidate pool SQL leaves id unqualified and triggers plpgsql ambiguity', () => {
    const summary = summarizeCorpusSchemaCompat({
      migrationSql: `
        ALTER TABLE public.chunks
          ADD COLUMN IF NOT EXISTS source_type text,
          ADD COLUMN IF NOT EXISTS source_ref jsonb,
          ADD COLUMN IF NOT EXISTS corpus_version text,
          ADD COLUMN IF NOT EXISTS content_hash text;
      `,
      hybridSql: `
        DROP FUNCTION IF EXISTS public.hybrid_search_v2(
          text,
          vector(1536),
          ltree,
          int,
          int,
          int,
          real,
          real,
          int
        );
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
        AS $$
        BEGIN
          RETURN QUERY
          WITH dense_unique AS (
            SELECT 1 AS id, 0.1::real AS sem_distance
          ),
          dense AS (
            SELECT
              id,
              ROW_NUMBER() OVER (ORDER BY sem_distance ASC, id ASC)::int AS r_sem
            FROM dense_unique
          ),
          key_unique AS (
            SELECT 1 AS id, 0.9::real AS key_score
          ),
          key AS (
            SELECT
              id,
              ROW_NUMBER() OVER (ORDER BY key_score DESC, id ASC)::int AS r_key
            FROM key_unique
          )
          SELECT id, ''::text, '9709'::ltree, 1.0::real, 1, 1;
        END;
        $$ LANGUAGE plpgsql
      `,
    });

    expect(summary.status).toBe('fail');
    expect(summary.hybrid_search_checks.qualified_candidate_id_present).toBe(false);
  });
});
