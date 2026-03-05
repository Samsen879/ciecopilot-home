import { auditChunkRows, DERIVED_CORPUS_VERSION, normalizeChunkRow } from '../lib/corpus-audit.js';

describe('RAG corpus audit', () => {
  it('derives resolvable source_ref and fallback corpus version', () => {
    const row = normalizeChunkRow({
      id: 7,
      content: 'Definite integrals evaluate signed area.',
      syllabus_code: '9709',
      topic_path: '9709.P1.Integration.LO3',
      node_id: 'node-7',
    });

    expect(row.source_ref).toEqual({
      asset_id: 'chunk:7',
      question_id: '7',
    });
    expect(row.source_ref_resolvable).toBe(true);
    expect(row.corpus_version).toBe(DERIVED_CORPUS_VERSION);
    expect(row.anomalies.missing_explicit_corpus_version).toBe(true);
  });

  it('tracks explicit corpus version and anomaly counts', () => {
    const summary = auditChunkRows([
      {
        id: 1,
        content: '',
        syllabus_code: '9709',
        topic_path: '',
        node_id: null,
      },
      {
        id: 2,
        content: 'ln x is the inverse function of e^x.',
        syllabus_code: '9709',
        topic_path: '9709.P2.LogAndExp.LO2',
        node_id: 'node-2',
        corpus_version: 'rag_ingest_v2',
      },
    ]);

    expect(summary.total_chunks).toBe(2);
    expect(summary.anomaly_counts.missing_topic_path).toBe(1);
    expect(summary.anomaly_counts.empty_snippet).toBe(1);
    expect(summary.anomaly_counts.missing_explicit_corpus_version).toBe(1);
    expect(summary.corpus_version_counts[DERIVED_CORPUS_VERSION]).toBe(1);
    expect(summary.corpus_version_counts.rag_ingest_v2).toBe(1);
    expect(summary.metrics.source_ref_resolvability_rate).toBe(1);
    expect(summary.metrics.explicit_corpus_version_coverage_rate).toBe(0.5);
  });
});
