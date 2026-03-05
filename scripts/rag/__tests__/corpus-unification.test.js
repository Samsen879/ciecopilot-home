import { renderCorpusChainInventoryReport, summarizeCorpusChainInventory } from '../lib/corpus-unification.js';

describe('corpus unification inventory', () => {
  it('summarizes canonical/legacy drift and renders report', () => {
    const summary = summarizeCorpusChainInventory({
      chunksRows: [],
      ragDocumentsRows: [
        { id: 'doc-1', subject_code: '9709', source_type: 'note_md', paper_code: 'paper1' },
      ],
      ragChunksRows: [
        { id: 'chunk-1', document_id: 'doc-1' },
        { id: 'chunk-2', document_id: 'doc-1' },
      ],
      ragEmbeddingsRows: [{ id: 'emb-1', chunk_id: 'chunk-1' }],
      tableStates: {
        chunks: { exists: true, error: null },
        rag_documents: { exists: true, error: null },
        rag_chunks: { exists: true, error: null },
        rag_embeddings: { exists: true, error: null },
      },
    });

    expect(summary.chain_state).toBe('writer_reader_misaligned');
    expect(summary.canonical_coverage.total_chunks).toBe(0);
    expect(summary.legacy_coverage.total_documents).toBe(1);
    expect(summary.legacy_coverage.total_chunks).toBe(2);
    expect(summary.reconciliation.legacy_chunks_without_embeddings).toBe(1);
    expect(summary.conclusions).toContain('legacy writer has data while canonical online chunks are empty');

    const report = renderCorpusChainInventoryReport(summary);
    expect(report).toContain('RAG Corpus Chain Inventory');
    expect(report).toContain('writer_reader_misaligned');
    expect(report).toContain('public.chunks');
  });
});
