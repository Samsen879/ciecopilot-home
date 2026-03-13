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
    'p_topic_path ltree,',
    'p_rrf_k int DEFAULT 60,',
    'p_corpus_versions text[] DEFAULT NULL',
    'RETURNS TABLE (',
    'id bigint,',
    'snippet text,',
    'topic_path ltree,',
    'score real,',
    'rank_sem int,',
    'rank_key int',
  ];
  const requiredVersionPriorityDedupeFragments = [
    'COALESCE(c.source_ref->>\'asset_id\', \'\') AS dedupe_asset_id',
    'COALESCE(c.source_ref->>\'paper_id\', \'\') AS dedupe_paper_id',
    'COALESCE(c.source_ref->>\'chunk_kind\', \'\') AS dedupe_chunk_kind',
    'COALESCE(c.source_ref->>\'question_id\', \'\') AS dedupe_question_id',
    'COALESCE(c.source_ref->>\'section_id\', \'\') AS dedupe_section_id',
    'COALESCE(c.source_ref->>\'page_no\', \'\') AS dedupe_page_no',
    'COALESCE(c.source_ref->>\'chunk_index\', \'\') AS dedupe_chunk_index',
    'COALESCE(c.source_ref->>\'subchunk_index\', \'\') AS dedupe_subchunk_index',
    'array_position(p_corpus_versions, c.corpus_version)',
  ];
  const requiredCandidatePoolFragments = [
    'dense_candidates AS (',
    'dense_unique AS (',
    'key_candidates AS (',
    'key_unique AS (',
  ];
  const requiredAssetFamilyShadowFragments = [
    'scoped_chunks AS (',
    'COALESCE(c.source_ref->>\'asset_id\', \'\') AS family_asset_id',
    'COALESCE(c.source_ref->>\'paper_id\', \'\') AS family_paper_id',
    'COALESCE(c.source_ref->>\'chunk_kind\', \'\') AS family_chunk_kind',
    'asset_family_latest AS (',
    'MIN(version_priority) AS min_version_priority',
    'version_scoped_chunks AS (',
    'asset_family_latest.min_version_priority = scoped_chunks.version_priority',
  ];
  const requiredQualifiedCandidateIdFragments = [
    'dense_unique.id AS id',
    'key_unique.id AS id',
  ];

  const missingAdditiveClauses = requiredAdditiveClauses.filter((fragment) => !normalizedMigrationSql.includes(normalize(fragment)));
  const missingHybridFragments = requiredHybridFragments.filter((fragment) => !normalizedHybridSql.includes(normalize(fragment)));
  const missingVersionPriorityDedupeFragments = requiredVersionPriorityDedupeFragments.filter(
    (fragment) => !normalizedHybridSql.includes(normalize(fragment)),
  );
  const missingCandidatePoolFragments = requiredCandidatePoolFragments.filter(
    (fragment) => !normalizedHybridSql.includes(normalize(fragment)),
  );
  const missingAssetFamilyShadowFragments = requiredAssetFamilyShadowFragments.filter(
    (fragment) => !normalizedHybridSql.includes(normalize(fragment)),
  );
  const missingQualifiedCandidateIdFragments = requiredQualifiedCandidateIdFragments.filter(
    (fragment) => !normalizedHybridSql.includes(normalize(fragment)),
  );
  const stableIdentityKeyList = normalize(
    'dedupe_asset_id, dedupe_paper_id, dedupe_chunk_kind, dedupe_question_id, dedupe_section_id, dedupe_page_no, dedupe_chunk_index, dedupe_subchunk_index',
  );
  const hasStableDistinctOn =
    normalizedHybridSql.includes(normalize(`DISTINCT ON ( c.source_type, ${stableIdentityKeyList} )`)) ||
    normalizedHybridSql.includes(normalize(`DISTINCT ON ( dedupe_candidates.source_type, ${stableIdentityKeyList} )`)) ||
    normalizedHybridSql.includes(normalize(`DISTINCT ON ( dense_candidates.source_type, ${stableIdentityKeyList} )`)) ||
    normalizedHybridSql.includes(normalize(`DISTINCT ON ( key_candidates.source_type, ${stableIdentityKeyList} )`));
  const hasStableDedupeOrderBy =
    normalizedHybridSql.includes(normalize(`ORDER BY c.source_type, ${stableIdentityKeyList}, version_priority ASC, dedupe_candidates.score DESC, c.id ASC`)) ||
    normalizedHybridSql.includes(normalize(`ORDER BY dedupe_candidates.source_type, ${stableIdentityKeyList}, version_priority ASC, dedupe_candidates.score DESC, dedupe_candidates.id ASC`));
  const missingStableIdentityStructure = [];
  if (!hasStableDistinctOn) {
    missingStableIdentityStructure.push(
      'DISTINCT ON stable identity key set missing for version-priority dedupe',
    );
  }
  if (!hasStableDedupeOrderBy) {
    missingStableIdentityStructure.push(
      'stable identity ORDER BY version_priority/score tie-break missing for dedupe_candidates',
    );
  }
  const hasDenseCandidateOrder =
    normalizedHybridSql.includes(normalize('version_priority ASC, dense_candidates.sem_distance ASC, c.id ASC')) ||
    normalizedHybridSql.includes(normalize('version_priority ASC, dense_candidates.sem_distance ASC, dense_candidates.id ASC'));
  const hasKeyCandidateOrder =
    normalizedHybridSql.includes(normalize('version_priority ASC, key_candidates.key_score DESC, c.id ASC')) ||
    normalizedHybridSql.includes(normalize('version_priority ASC, key_candidates.key_score DESC, key_candidates.id ASC'));
  const missingCandidatePoolStructure = [];
  if (!hasDenseCandidateOrder) {
    missingCandidatePoolStructure.push('dense_unique ORDER BY does not prioritize version_priority before sem_distance');
  }
  if (!hasKeyCandidateOrder) {
    missingCandidatePoolStructure.push('key_unique ORDER BY does not prioritize version_priority before key_score');
  }
  const hasDenseQualifiedId =
    normalizedHybridSql.includes(normalize('dense_unique.id AS id')) &&
    normalizedHybridSql.includes(normalize('dense_unique.id ASC')) &&
    normalizedHybridSql.includes(normalize('r_sem'));
  const hasKeyQualifiedId =
    normalizedHybridSql.includes(normalize('key_unique.id AS id')) &&
    normalizedHybridSql.includes(normalize('key_unique.id ASC')) &&
    normalizedHybridSql.includes(normalize('r_key'));
  const missingQualifiedIdStructure = [];
  if (!hasDenseQualifiedId) {
    missingQualifiedIdStructure.push('dense_unique id qualification missing');
  }
  if (!hasKeyQualifiedId) {
    missingQualifiedIdStructure.push('key_unique id qualification missing');
  }
  const legacySignatureDropPresent = /DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.hybrid_search_v2\s*\(\s*text\s*,\s*vector\(1536\)\s*,\s*ltree\s*,\s*int\s*,\s*int\s*,\s*int\s*,\s*real\s*,\s*real\s*,\s*int\s*\)\s*;/i.test(hybridSql);
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
    missingVersionPriorityDedupeFragments.length === 0 &&
    missingStableIdentityStructure.length === 0 &&
    missingCandidatePoolFragments.length === 0 &&
    missingCandidatePoolStructure.length === 0 &&
    missingAssetFamilyShadowFragments.length === 0 &&
    missingQualifiedCandidateIdFragments.length === 0 &&
    missingQualifiedIdStructure.length === 0 &&
    legacySignatureDropPresent &&
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
      signature_compatible:
        missingHybridFragments.length === 0 &&
        missingVersionPriorityDedupeFragments.length === 0 &&
        missingStableIdentityStructure.length === 0 &&
        missingCandidatePoolFragments.length === 0 &&
        missingCandidatePoolStructure.length === 0 &&
        missingAssetFamilyShadowFragments.length === 0 &&
        missingQualifiedCandidateIdFragments.length === 0 &&
        missingQualifiedIdStructure.length === 0 &&
        legacySignatureDropPresent,
      legacy_signature_drop_present: legacySignatureDropPresent,
      missing_hybrid_fragments: missingHybridFragments,
      version_priority_dedupe_present: missingVersionPriorityDedupeFragments.length === 0,
      version_priority_stable_identity_present:
        missingVersionPriorityDedupeFragments.length === 0 &&
        missingStableIdentityStructure.length === 0,
      version_priority_candidate_pool_present:
        missingCandidatePoolFragments.length === 0 &&
        missingCandidatePoolStructure.length === 0,
      asset_family_version_shadow_present: missingAssetFamilyShadowFragments.length === 0,
      qualified_candidate_id_present:
        missingQualifiedCandidateIdFragments.length === 0 &&
        missingQualifiedIdStructure.length === 0,
      missing_version_priority_dedupe_fragments: missingVersionPriorityDedupeFragments,
      missing_candidate_pool_fragments: [
        ...missingCandidatePoolFragments,
        ...missingCandidatePoolStructure,
      ],
      missing_asset_family_shadow_fragments: missingAssetFamilyShadowFragments,
      missing_qualified_candidate_id_fragments: [
        ...missingQualifiedCandidateIdFragments,
        ...missingQualifiedIdStructure,
      ],
      missing_version_priority_stable_identity_fragments: missingStableIdentityStructure,
    },
  };
}
