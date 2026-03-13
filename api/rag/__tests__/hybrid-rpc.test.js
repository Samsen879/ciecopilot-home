import { retrieveHybridCandidates } from '../lib/retrievers/_hybrid-rpc.js';

function createHybridSupabaseStub({
  rpcRows = [],
  rpcErrors = [],
  chunkRows = [],
  chunkError = null,
  throwOnChunkLookup = false,
} = {}) {
  const rpcCalls = [];
  const chunkSelectCalls = [];
  return {
    from(table) {
      if (table !== 'chunks') throw new Error(`Unexpected table: ${table}`);
      return {
        select(columns) {
          if (throwOnChunkLookup) {
            throw new Error('chunk lookup unavailable');
          }
          chunkSelectCalls.push({ columns });
          return {
            in(column, values) {
              chunkSelectCalls[chunkSelectCalls.length - 1].column = column;
              chunkSelectCalls[chunkSelectCalls.length - 1].values = values;
              return Promise.resolve({
                data: chunkRows,
                error: chunkError,
              });
            },
          };
        },
      };
    },
    async rpc(name, params) {
      rpcCalls.push({ name, params });
      if (name !== 'hybrid_search_v2') throw new Error(`Unexpected rpc: ${name}`);
      if (rpcErrors.length > 0) {
        return {
          data: null,
          error: rpcErrors.shift(),
        };
      }
      return {
        data: rpcRows,
        error: null,
      };
    },
    __rpcCalls: rpcCalls,
    __chunkSelectCalls: chunkSelectCalls,
  };
}

describe('retrieveHybridCandidates', () => {
  test('enriches returned rows with chunk source metadata for downstream evidence anchoring', async () => {
    const supabase = createHybridSupabaseStub({
      rpcRows: [
        { id: 2256, snippet: 'Q6a', topic_path: '9709.P2', score: 0.9, rank_sem: 1, rank_key: 1 },
      ],
      chunkRows: [
        {
          id: 2256,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_new',
          source_ref: {
            asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf',
            paper_id: '9709_w23_23',
            chunk_kind: 'mark_scheme_question',
            question_id: 'Q6a',
            parent_question_id: 'Q6',
          },
        },
      ],
    });

    const rows = await retrieveHybridCandidates({
      query: 'trigonometric identity',
      queryEmbedding: Array(1536).fill(0),
      currentTopicPath: '9709.P2',
      corpusVersions: ['rag_new'],
      matchCount: 1,
      densePool: 10,
      keyPool: 10,
      wSem: 0.3,
      wKey: 0.7,
      rrfK: 60,
    }, { supabase });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 2256,
      source_type: 'mark_scheme_pdf',
      asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf',
      question_id: 'Q6a',
      paper_id: '9709_w23_23',
      chunk_kind: 'mark_scheme_question',
      parent_question_id: 'Q6',
    });
  });

  test('shadows older asset-family versions when newer corpus rows are present', async () => {
    const supabase = createHybridSupabaseStub({
      rpcRows: [
        { id: 2023, snippet: 'old ms row', topic_path: '9709.P2', score: 0.9, rank_sem: 1, rank_key: 1 },
        { id: 2256, snippet: 'new ms row', topic_path: '9709.P2', score: 0.8, rank_sem: 2, rank_key: 2 },
        { id: 2054, snippet: 'different asset', topic_path: '9709.P3', score: 0.7, rank_sem: 3, rank_key: 3 },
      ],
      chunkRows: [
        {
          id: 2023,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_old',
          source_ref: { asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf', paper_id: '9709_w23_23', chunk_kind: 'mark_scheme_question' },
        },
        {
          id: 2256,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_new',
          source_ref: { asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf', paper_id: '9709_w23_23', chunk_kind: 'mark_scheme_question' },
        },
        {
          id: 2054,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_old',
          source_ref: { asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_33.pdf', paper_id: '9709_w23_33', chunk_kind: 'mark_scheme_question' },
        },
      ],
    });

    const rows = await retrieveHybridCandidates({
      query: 'solve polynomial',
      queryEmbedding: Array(1536).fill(0),
      currentTopicPath: '9709.P2',
      corpusVersions: ['rag_new', 'rag_old'],
      matchCount: 3,
      densePool: 10,
      keyPool: 10,
      wSem: 0.3,
      wKey: 0.7,
      rrfK: 60,
    }, { supabase });

    expect(rows.map((row) => row.id)).toEqual([2256, 2054]);
  });

  test('keeps multiple rows from the preferred version within the same asset family', async () => {
    const supabase = createHybridSupabaseStub({
      rpcRows: [
        { id: 2256, snippet: 'Q6a', topic_path: '9709.P2', score: 0.9, rank_sem: 1, rank_key: 1 },
        { id: 2257, snippet: 'Q6b', topic_path: '9709.P2', score: 0.8, rank_sem: 2, rank_key: 2 },
        { id: 2023, snippet: 'old mixed row', topic_path: '9709.P2', score: 0.85, rank_sem: 3, rank_key: 3 },
      ],
      chunkRows: [
        {
          id: 2256,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_new',
          source_ref: { asset_id: 'ms23', paper_id: '9709_w23_23', chunk_kind: 'mark_scheme_question', question_id: 'Q6a' },
        },
        {
          id: 2257,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_new',
          source_ref: { asset_id: 'ms23', paper_id: '9709_w23_23', chunk_kind: 'mark_scheme_question', question_id: 'Q6b' },
        },
        {
          id: 2023,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_old',
          source_ref: { asset_id: 'ms23', paper_id: '9709_w23_23', chunk_kind: 'mark_scheme_question', question_id: 'Q19' },
        },
      ],
    });

    const rows = await retrieveHybridCandidates({
      query: 'trigonometric identity',
      queryEmbedding: Array(1536).fill(0),
      currentTopicPath: '9709.P2',
      corpusVersions: ['rag_new', 'rag_old'],
      matchCount: 3,
      densePool: 10,
      keyPool: 10,
      wSem: 0.3,
      wKey: 0.7,
      rrfK: 60,
    }, { supabase });

    expect(rows.map((row) => row.id)).toEqual([2256, 2257]);
  });

  test('falls back to raw rpc rows when chunk metadata lookup fails', async () => {
    const supabase = createHybridSupabaseStub({
      rpcRows: [
        { id: 2023, snippet: 'old ms row', topic_path: '9709.P2', score: 0.9, rank_sem: 1, rank_key: 1 },
        { id: 2256, snippet: 'new ms row', topic_path: '9709.P2', score: 0.8, rank_sem: 2, rank_key: 2 },
      ],
      chunkRows: [],
      chunkError: { message: 'fetch failed' },
    });

    const rows = await retrieveHybridCandidates({
      query: 'solve polynomial',
      queryEmbedding: Array(1536).fill(0),
      currentTopicPath: '9709.P2',
      corpusVersions: ['rag_new', 'rag_old'],
      matchCount: 2,
      densePool: 10,
      keyPool: 10,
      wSem: 0.3,
      wKey: 0.7,
      rrfK: 60,
    }, { supabase });

    expect(rows.map((row) => row.id)).toEqual([2023, 2256]);
  });

  test('falls back to raw rpc rows when chunk metadata lookup throws', async () => {
    const supabase = createHybridSupabaseStub({
      rpcRows: [
        { id: 2023, snippet: 'old ms row', topic_path: '9709.P2', score: 0.9, rank_sem: 1, rank_key: 1 },
        { id: 2256, snippet: 'new ms row', topic_path: '9709.P2', score: 0.8, rank_sem: 2, rank_key: 2 },
      ],
      throwOnChunkLookup: true,
    });

    const rows = await retrieveHybridCandidates({
      query: 'solve polynomial',
      queryEmbedding: Array(1536).fill(0),
      currentTopicPath: '9709.P2',
      corpusVersions: ['rag_new', 'rag_old'],
      matchCount: 2,
      densePool: 10,
      keyPool: 10,
      wSem: 0.3,
      wKey: 0.7,
      rrfK: 60,
    }, { supabase });

    expect(rows.map((row) => row.id)).toEqual([2023, 2256]);
  });

  test('retries transient rpc fetch failures before succeeding', async () => {
    const supabase = createHybridSupabaseStub({
      rpcErrors: [{ message: 'TypeError: fetch failed', code: null }],
      rpcRows: [
        { id: 2256, snippet: 'Q6a', topic_path: '9709.P2', score: 0.9, rank_sem: 1, rank_key: 1 },
      ],
      chunkRows: [
        {
          id: 2256,
          source_type: 'mark_scheme_pdf',
          corpus_version: 'rag_new',
          source_ref: {
            asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf',
            paper_id: '9709_w23_23',
            chunk_kind: 'mark_scheme_question',
            question_id: 'Q6a',
          },
        },
      ],
    });

    const rows = await retrieveHybridCandidates({
      query: 'integration prerequisites',
      queryEmbedding: Array(1536).fill(0),
      currentTopicPath: '9709.P2',
      corpusVersions: ['rag_new'],
      matchCount: 1,
      densePool: 10,
      keyPool: 10,
      wSem: 0.3,
      wKey: 0.7,
      rrfK: 60,
    }, { supabase });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(2256);
    expect(supabase.__rpcCalls).toHaveLength(2);
  });
});
