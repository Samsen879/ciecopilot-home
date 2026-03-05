import { countBy } from './corpus-unification.js';

function getCanonicalIdentity(row) {
  const sourceType = row?.source_type || 'unknown';
  const assetId = row?.source_ref?.asset_id || 'unknown';
  const locator = row?.source_ref?.page_no || row?.source_ref?.question_id || row?.id || 'unknown';
  return `${sourceType}::${assetId}::${locator}`;
}

function getLegacyIdentity({ doc, chunk }) {
  const sourceType = doc?.source_type || 'unknown';
  const assetId = doc?.source_path || 'unknown';
  const locator = chunk?.page_from || chunk?.id || `chunk:${chunk?.chunk_index ?? 'unknown'}`;
  return `${sourceType}::${assetId}::${locator}`;
}

export function summarizeLegacyBackfill({
  tableStates = {},
  legacyDocuments = [],
  legacyChunks = [],
  legacyEmbeddings = [],
  bridgeResults = [],
} = {}) {
  const hasLegacyTables = tableStates.rag_documents?.exists && tableStates.rag_chunks?.exists && tableStates.rag_embeddings?.exists;
  const resultCounts = countBy(bridgeResults, (row) => row.status || 'unknown');
  const failureReasons = countBy(
    bridgeResults.filter((row) => row.status === 'failed'),
    (row) => row.reason || 'unknown',
  );

  let status = 'pass';
  if (!hasLegacyTables) {
    status = 'legacy_chain_absent';
  } else if ((resultCounts.failed || 0) > 0) {
    status = 'partial_failure';
  }

  const conclusions = [];
  if (!hasLegacyTables) {
    conclusions.push('legacy rag_* tables are absent in the current environment');
  }
  if (legacyChunks.length > 0 && legacyEmbeddings.length === 0) {
    conclusions.push('legacy chunks exist without legacy embeddings');
  }

  return {
    generated_at: new Date().toISOString(),
    status,
    table_states: tableStates,
    legacy_totals: {
      documents: legacyDocuments.length,
      chunks: legacyChunks.length,
      embeddings: legacyEmbeddings.length,
      subject_counts: countBy(legacyDocuments, (row) => row.subject_code || 'unknown'),
      source_type_counts: countBy(legacyDocuments, (row) => row.source_type || 'unknown'),
    },
    bridge_results: {
      attempted: bridgeResults.length,
      inserted: resultCounts.inserted || 0,
      updated: resultCounts.updated || 0,
      failed: resultCounts.failed || 0,
      failure_reasons: failureReasons,
    },
    conclusions,
  };
}

export function summarizeCorpusReconciliation({
  tableStates = {},
  canonicalRows = [],
  legacyDocuments = [],
  legacyChunks = [],
  legacyEmbeddings = [],
  legacyRouteState = 'unverified_legacy_dependency',
  canonicalContractState = 'unknown',
} = {}) {
  const canonicalIdentities = new Set(canonicalRows.map((row) => getCanonicalIdentity(row)));
  const docById = new Map(legacyDocuments.map((row) => [row.id, row]));
  const legacyIdentities = legacyChunks.map((chunk) => getLegacyIdentity({ doc: docById.get(chunk.document_id), chunk }));

  const overlapCount = legacyIdentities.filter((identity) => canonicalIdentities.has(identity)).length;
  const legacyOnlyCount = legacyIdentities.length - overlapCount;

  let status = 'pass';
  if (tableStates.chunks?.exists !== true) {
    status = 'canonical_unavailable';
  } else if (canonicalContractState === 'missing_contract_columns') {
    status = 'pending_canonical_contract';
  } else if (canonicalRows.length === 0) {
    status = 'canonical_empty';
  } else if (tableStates.rag_documents?.exists !== true) {
    status = 'legacy_chain_absent';
  }

  const conclusions = [];
  if (status === 'canonical_empty') {
    conclusions.push('canonical chunks table is available but empty');
  }
  if (status === 'pending_canonical_contract') {
    conclusions.push('canonical chunks table exists but provenance/version/hash columns are not yet available');
  }
  if (status === 'legacy_chain_absent') {
    conclusions.push('legacy rag_* tables are absent; bridge comparison is limited to canonical-only evidence');
  }
  if (legacyRouteState === 'unverified_legacy_dependency') {
    conclusions.push('legacy tutor route still depends on unverified search_knowledge_chunks RPC');
  }

  return {
    generated_at: new Date().toISOString(),
    status,
    legacy_route_state: legacyRouteState,
    canonical_contract_state: canonicalContractState,
    table_states: tableStates,
    canonical: {
      total_rows: canonicalRows.length,
      subject_counts: countBy(canonicalRows, (row) => row.syllabus_code || 'unknown'),
      source_type_counts: countBy(canonicalRows, (row) => row.source_type || 'unknown'),
      corpus_version_counts: countBy(canonicalRows, (row) => row.corpus_version || 'unknown'),
    },
    legacy: {
      total_documents: legacyDocuments.length,
      total_chunks: legacyChunks.length,
      total_embeddings: legacyEmbeddings.length,
      subject_counts: countBy(legacyDocuments, (row) => row.subject_code || 'unknown'),
      source_type_counts: countBy(legacyDocuments, (row) => row.source_type || 'unknown'),
    },
    reconciliation: {
      overlap_count: overlapCount,
      legacy_only_count: legacyOnlyCount,
      canonical_only_count: Math.max(canonicalRows.length - overlapCount, 0),
    },
    conclusions,
  };
}

export function renderCorpusReconciliationReport(summary) {
  const lines = [
    '# RAG Corpus Reconciliation',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Status: \`${summary.status}\``,
    `- legacy_route_state: \`${summary.legacy_route_state}\``,
    '',
    '## Canonical',
    '',
    `- total_rows: \`${summary.canonical.total_rows}\``,
    '',
    '## Legacy',
    '',
    `- total_documents: \`${summary.legacy.total_documents}\``,
    `- total_chunks: \`${summary.legacy.total_chunks}\``,
    `- total_embeddings: \`${summary.legacy.total_embeddings}\``,
    '',
    '## Reconciliation',
    '',
    `- overlap_count: \`${summary.reconciliation.overlap_count}\``,
    `- legacy_only_count: \`${summary.reconciliation.legacy_only_count}\``,
    `- canonical_only_count: \`${summary.reconciliation.canonical_only_count}\``,
    '',
    '## Conclusions',
    '',
  ];

  if ((summary.conclusions || []).length === 0) {
    lines.push('- None');
  } else {
    for (const conclusion of summary.conclusions) {
      lines.push(`- ${conclusion}`);
    }
  }

  return lines.join('\n');
}
