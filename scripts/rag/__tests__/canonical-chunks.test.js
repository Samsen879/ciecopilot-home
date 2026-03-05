import {
  buildCanonicalChunkRow,
  buildSourceRef,
  canonicalChunkIdentity,
  canonicalChunkMatchesIdentity,
  computeContentHash,
  describeWriteModeTargets,
  normalizeWriteMode,
  resolveCorpusVersion,
  stableStringify,
} from '../lib/canonical-chunks.js';

describe('canonical-chunks', () => {
  test('stableStringify sorts object keys deterministically', () => {
    const left = stableStringify({ b: 2, a: { d: 4, c: 3 } });
    const right = stableStringify({ a: { c: 3, d: 4 }, b: 2 });

    expect(left).toBe(right);
  });

  test('computeContentHash is deterministic', () => {
    expect(computeContentHash('same content')).toBe(computeContentHash('same content'));
    expect(computeContentHash('same content')).not.toBe(computeContentHash('other content'));
  });

  test('normalizeWriteMode defaults to bridge and rejects unknown modes', () => {
    expect(normalizeWriteMode()).toBe('bridge');
    expect(normalizeWriteMode('CANONICAL')).toBe('canonical');
    expect(() => normalizeWriteMode('graph')).toThrow('Unsupported canonical write mode');
  });

  test('describeWriteModeTargets keeps legacy and canonical modes separated', () => {
    expect(describeWriteModeTargets('legacy')).toEqual({
      mode: 'legacy',
      writesLegacy: true,
      writesCanonical: false,
    });
    expect(describeWriteModeTargets('canonical')).toEqual({
      mode: 'canonical',
      writesLegacy: false,
      writesCanonical: true,
    });
    expect(describeWriteModeTargets('bridge')).toEqual({
      mode: 'bridge',
      writesLegacy: true,
      writesCanonical: true,
    });
  });

  test('resolveCorpusVersion prefers cli and env before generated fallback', () => {
    expect(resolveCorpusVersion({ cliValue: 'cli_v1', envValue: 'env_v1' })).toBe('cli_v1');
    expect(resolveCorpusVersion({ envValue: 'env_v1' })).toBe('env_v1');
    expect(resolveCorpusVersion({ runStartedAt: new Date('2026-03-02T10:00:00.000Z') })).toBe('rag_corpus_unification_20260302');
  });

  test('buildSourceRef preserves pdf provenance and fallback question id', () => {
    const pdf = buildSourceRef({
      assetId: 'data/past-papers/9702_s23_qp_12.pdf',
      pageNo: 4,
      chunkIndex: 2,
      paperId: '9702_s23_12',
      sourcePath: 'data/past-papers/9702_s23_qp_12.pdf',
    });
    expect(pdf).toEqual({
      asset_id: 'data/past-papers/9702_s23_qp_12.pdf',
      page_no: 4,
      chunk_index: 2,
      paper_id: '9702_s23_12',
      source_path: 'data/past-papers/9702_s23_qp_12.pdf',
    });

    const note = buildSourceRef({
      assetId: 'src/data/data-notes/9702/ch1.md',
      chunkIndex: 0,
      sectionId: 'chapter-1',
    });
    expect(note).toEqual({
      asset_id: 'src/data/data-notes/9702/ch1.md',
      section_id: 'chapter-1',
      chunk_index: 0,
      question_id: 'chunk:0',
    });
  });

  test('buildCanonicalChunkRow injects canonical defaults', () => {
    const sourceRef = buildSourceRef({
      assetId: 'src/data/data-notes/9702/ch1.md',
      chunkIndex: 1,
    });
    const row = buildCanonicalChunkRow({
      content: '  Functions and transformations  ',
      embedding: [0.1, 0.2],
      syllabusCode: '9702',
      sourceType: 'note_md',
      sourceRef,
      corpusVersion: 'rag_corpus_unification_20260302',
    });

    expect(row).toMatchObject({
      content: 'Functions and transformations',
      embedding: [0.1, 0.2],
      syllabus_code: '9702',
      topic_path: 'unmapped',
      node_id: null,
      source_type: 'note_md',
      source_ref: sourceRef,
      corpus_version: 'rag_corpus_unification_20260302',
    });
    expect(row.content_hash).toBe(computeContentHash('Functions and transformations'));
  });

  test('canonical chunk identity matches rows deterministically', () => {
    const row = {
      source_type: 'note_md',
      source_ref: {
        asset_id: 'src/data/data-notes/9702/ch1.md',
        question_id: 'chunk:0',
      },
      content_hash: 'abc123',
    };
    const identity = canonicalChunkIdentity({
      sourceType: row.source_type,
      sourceRef: row.source_ref,
      contentHash: row.content_hash,
    });
    expect(canonicalChunkMatchesIdentity(row, identity)).toBe(true);
    expect(canonicalChunkMatchesIdentity(row, 'other')).toBe(false);
  });
});
