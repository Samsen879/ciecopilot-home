export function summarizeCorpusSchemaCompat({
  migrationSql = '',
  hybridSql = '',
} = {}) {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const normalizedMigrationSql = normalize(migrationSql);
  const normalizedHybridSql = normalize(hybridSql);
  const requiredAdditiveClauses = [
    'ADD COLUMN IF NOT EXISTS source_type text',
    'ADD COLUMN IF NOT EXISTS source_ref jsonb',
    'ADD COLUMN IF NOT EXISTS corpus_version text',
    'ADD COLUMN IF NOT EXISTS content_hash text',
  ];

  const requiredHybridFragments = [
    'CREATE OR REPLACE FUNCTION public.hybrid_search_v2(',
    'p_query text,',
    'p_query_embedding vector(1536),',
    'p_topic_path ltree',
    'RETURNS TABLE (',
    'id bigint,',
    'snippet text,',
    'topic_path ltree,',
    'score real,',
    'rank_sem int,',
    'rank_key int',
  ];

  const missingAdditiveClauses = requiredAdditiveClauses.filter((fragment) => !normalizedMigrationSql.includes(normalize(fragment)));
  const missingHybridFragments = requiredHybridFragments.filter((fragment) => !normalizedHybridSql.includes(normalize(fragment)));
  const destructiveStatements = [
    /DROP\s+COLUMN/i,
    /DROP\s+TABLE\s+public\.chunks/i,
    /ALTER\s+TABLE\s+public\.chunks\s+DROP/i,
  ]
    .filter((pattern) => pattern.test(migrationSql))
    .map((pattern) => pattern.toString());

  const status =
    missingAdditiveClauses.length === 0 &&
    missingHybridFragments.length === 0 &&
    destructiveStatements.length === 0
      ? 'pass'
      : 'fail';

  return {
    generated_at: new Date().toISOString(),
    status,
    migration_checks: {
      additive_columns_present: missingAdditiveClauses.length === 0,
      missing_additive_clauses: missingAdditiveClauses,
      destructive_statements: destructiveStatements,
    },
    hybrid_search_checks: {
      signature_compatible: missingHybridFragments.length === 0,
      missing_hybrid_fragments: missingHybridFragments,
    },
  };
}
