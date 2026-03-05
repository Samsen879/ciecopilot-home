export function countBy(items = [], keySelector) {
  return items.reduce((acc, item) => {
    const key = String(typeof keySelector === 'function' ? keySelector(item) : item?.[keySelector] || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function summarizeCorpusChainInventory({
  chunksRows = [],
  ragDocumentsRows = [],
  ragChunksRows = [],
  ragEmbeddingsRows = [],
  tableStates = {},
} = {}) {
  const chunksTotal = chunksRows.length;
  const ragDocumentsTotal = ragDocumentsRows.length;
  const ragChunksTotal = ragChunksRows.length;
  const ragEmbeddingsTotal = ragEmbeddingsRows.length;

  let chainState = 'empty_everywhere';
  if (chunksTotal > 0 && ragChunksTotal === 0) {
    chainState = 'canonical_only';
  } else if (chunksTotal === 0 && ragChunksTotal > 0) {
    chainState = 'writer_reader_misaligned';
  } else if (chunksTotal > 0 && ragChunksTotal > 0) {
    chainState = 'dual_population';
  }

  const canonicalCoverage = {
    total_chunks: chunksTotal,
    subject_counts: countBy(chunksRows, (row) => row.syllabus_code || 'unknown'),
    mapped_node_count: chunksRows.filter((row) => row.node_id).length,
    unmapped_topic_path_count: chunksRows.filter((row) => !String(row.topic_path || '').trim()).length,
  };

  const legacyCoverage = {
    total_documents: ragDocumentsTotal,
    total_chunks: ragChunksTotal,
    total_embeddings: ragEmbeddingsTotal,
    subject_counts: countBy(ragDocumentsRows, (row) => row.subject_code || 'unknown'),
    source_type_counts: countBy(ragDocumentsRows, (row) => row.source_type || 'unknown'),
  };

  const conclusions = [];
  if (chainState === 'writer_reader_misaligned') {
    conclusions.push('legacy writer has data while canonical online chunks are empty');
  }
  if (tableStates.chunks?.exists === false) {
    conclusions.push('public.chunks is not available in the current environment');
  }
  if (tableStates.rag_documents?.exists === false) {
    conclusions.push('legacy rag_documents table is not available in the current environment');
  }
  if (chunksTotal === 0) {
    conclusions.push('current online retrieval corpus has no auditable rows');
  }
  if (ragChunksTotal > 0 && ragEmbeddingsTotal === 0) {
    conclusions.push('legacy chunk table is populated without embeddings');
  }

  return {
    generated_at: new Date().toISOString(),
    canonical_reader: {
      route: 'api/rag/* -> hybrid_search_v2 -> public.chunks',
      table: 'public.chunks',
      rpc: 'public.hybrid_search_v2',
    },
    legacy_writer: {
      script: 'scripts/rag_ingest.js',
      tables: ['public.rag_documents', 'public.rag_chunks', 'public.rag_embeddings'],
    },
    legacy_route: {
      route: 'api/ai/tutor/chat.js -> search_knowledge_chunks',
      status: 'unverified_legacy_dependency',
    },
    table_states: tableStates,
    chain_state: chainState,
    canonical_coverage: canonicalCoverage,
    legacy_coverage: legacyCoverage,
    reconciliation: {
      chunks_minus_legacy_chunks: chunksTotal - ragChunksTotal,
      documents_without_chunks: Math.max(ragDocumentsTotal - ragChunksTotal, 0),
      legacy_chunks_without_embeddings: Math.max(ragChunksTotal - ragEmbeddingsTotal, 0),
    },
    conclusions,
  };
}

export function renderCorpusChainInventoryReport(summary) {
  const lines = [
    '# RAG Corpus Chain Inventory',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Chain state: \`${summary.chain_state}\``,
    '',
    '## Canonical Reader',
    '',
    `- route: \`${summary.canonical_reader.route}\``,
    `- table: \`${summary.canonical_reader.table}\``,
    `- rpc: \`${summary.canonical_reader.rpc}\``,
    '',
    '## Legacy Writer',
    '',
    `- script: \`${summary.legacy_writer.script}\``,
    `- tables: \`${summary.legacy_writer.tables.join(', ')}\``,
    '',
    '## Table States',
    '',
  ];

  for (const [tableName, state] of Object.entries(summary.table_states || {})) {
    lines.push(`- \`${tableName}\`: exists=\`${state.exists}\` error=\`${state.error || 'NONE'}\``);
  }

  lines.push(
    '',
    '## Canonical Coverage',
    '',
    `- total_chunks: \`${summary.canonical_coverage.total_chunks}\``,
    `- mapped_node_count: \`${summary.canonical_coverage.mapped_node_count}\``,
    `- unmapped_topic_path_count: \`${summary.canonical_coverage.unmapped_topic_path_count}\``,
    '',
    '## Legacy Coverage',
    '',
    `- total_documents: \`${summary.legacy_coverage.total_documents}\``,
    `- total_chunks: \`${summary.legacy_coverage.total_chunks}\``,
    `- total_embeddings: \`${summary.legacy_coverage.total_embeddings}\``,
    '',
    '## Reconciliation',
    '',
    `- chunks_minus_legacy_chunks: \`${summary.reconciliation.chunks_minus_legacy_chunks}\``,
    `- documents_without_chunks: \`${summary.reconciliation.documents_without_chunks}\``,
    `- legacy_chunks_without_embeddings: \`${summary.reconciliation.legacy_chunks_without_embeddings}\``,
    '',
    '## Conclusions',
    '',
  );

  if ((summary.conclusions || []).length === 0) {
    lines.push('- None');
  } else {
    for (const conclusion of summary.conclusions) {
      lines.push(`- ${conclusion}`);
    }
  }

  lines.push(
    '',
    '## Repro',
    '',
    '```bash',
    'node scripts/rag/run_corpus_unification_preflight.js',
    'node scripts/rag/run_corpus_chain_inventory.js',
    '```',
    '',
  );

  return lines.join('\n');
}
