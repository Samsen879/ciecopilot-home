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
          p_corpus_versions text[] DEFAULT NULL,
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

    expect(summary.status).toBe('pass');
    expect(summary.migration_checks.additive_columns_present).toBe(true);
    expect(summary.hybrid_search_checks.signature_compatible).toBe(true);
    expect(summary.hybrid_search_checks.legacy_signature_drop_present).toBe(true);
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
});
