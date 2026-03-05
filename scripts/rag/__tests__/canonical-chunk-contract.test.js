import {
  CANONICAL_CHUNK_COLUMNS,
  renderCanonicalChunkContractReport,
  summarizeCanonicalChunkContract,
} from '../lib/canonical-chunk-contract.js';

describe('canonical chunk contract', () => {
  it('reports missing columns and coverage metrics', () => {
    const summary = summarizeCanonicalChunkContract({
      columnPresence: Object.fromEntries(CANONICAL_CHUNK_COLUMNS.map((column) => [column, column !== 'source_ref'])),
      rows: [
        {
          id: 1,
          content: 'row',
          corpus_version: 'v1',
          content_hash: 'abc',
          source_ref: { asset_id: 'chunk:1', question_id: '1' },
        },
      ],
      probeErrors: {
        source_ref: 'column chunks.source_ref does not exist',
      },
    });

    expect(summary.status).toBe('pending_schema_expansion');
    expect(summary.missing_columns).toContain('source_ref');
    expect(summary.metrics.corpus_version_coverage_rate).toBe(1);
    expect(summary.metrics.content_hash_coverage_rate).toBe(1);

    const report = renderCanonicalChunkContractReport(summary);
    expect(report).toContain('Canonical Chunk Contract');
    expect(report).toContain('pending_schema_expansion');
  });
});
