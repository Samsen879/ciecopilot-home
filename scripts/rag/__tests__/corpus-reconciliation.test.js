import {
  renderCorpusReconciliationReport,
  summarizeCorpusReconciliation,
  summarizeLegacyBackfill,
} from '../lib/corpus-reconciliation.js';

describe('corpus-reconciliation', () => {
  test('summarizeLegacyBackfill marks absent legacy chain explicitly', () => {
    const summary = summarizeLegacyBackfill({
      tableStates: {
        rag_documents: { exists: false, error: 'missing' },
        rag_chunks: { exists: false, error: 'missing' },
        rag_embeddings: { exists: false, error: 'missing' },
      },
    });

    expect(summary.status).toBe('legacy_chain_absent');
    expect(summary.conclusions).toContain('legacy rag_* tables are absent in the current environment');
  });

  test('summarizeCorpusReconciliation reports canonical empty and legacy dependency', () => {
    const summary = summarizeCorpusReconciliation({
      tableStates: {
        chunks: { exists: true, error: null },
        rag_documents: { exists: false, error: 'missing' },
        rag_chunks: { exists: false, error: 'missing' },
        rag_embeddings: { exists: false, error: 'missing' },
      },
      canonicalRows: [],
      legacyDocuments: [],
      legacyChunks: [],
      legacyEmbeddings: [],
      legacyRouteState: 'unverified_legacy_dependency',
      canonicalContractState: 'missing_contract_columns',
    });

    expect(summary.status).toBe('pending_canonical_contract');
    expect(summary.conclusions).toContain('canonical chunks table exists but provenance/version/hash columns are not yet available');
    expect(renderCorpusReconciliationReport(summary)).toContain('legacy tutor route still depends on unverified search_knowledge_chunks RPC');
  });
});
