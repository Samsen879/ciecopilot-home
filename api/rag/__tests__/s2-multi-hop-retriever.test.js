import { retrieveS2MultiHopCandidates } from '../lib/s2-multi-hop-retriever.js';

function createSupabaseStub() {
  return {
    rpc: async () => ({ data: [], error: null }),
  };
}

describe('s2 multi-hop retriever', () => {
  it('runs hop-0 and hop-1 retrieval and merges rows', async () => {
    const calls = [];
    const retrieveFn = async ({ currentTopicPath, corpusVersions }) => {
      calls.push({ currentTopicPath, corpusVersions });
      if (currentTopicPath === '9709.P1.1') {
        return [
          { id: 'chunk-1', topic_path: '9709.P1.1', fused_score: 0.9, rank_sem: 1, rank_key: 1 },
          { id: 'chunk-2', topic_path: '9709.P1.1', fused_score: 0.8, rank_sem: 2, rank_key: 2 },
        ];
      }
      return [
        { id: 'chunk-2', topic_path: '9709.P1.1', fused_score: 0.95, rank_sem: 1, rank_key: 1 },
        { id: 'chunk-3', topic_path: '9709.P1.2', fused_score: 0.7, rank_sem: 2, rank_key: 2 },
      ];
    };

    const expandFn = () => ({
      expanded_topic_paths: ['9709.P1.2'],
      expansion_reason_counts: { seed_peer: 1 },
      skipped_topic_paths: [],
    });

    const result = await retrieveS2MultiHopCandidates(
      {
        query: 'compare two topics',
        queryEmbedding: [0.1, 0.2, 0.3],
        currentTopicPath: '9709.P1.1',
        subjectCode: '9709',
        retrievalConfig: {
          matchCount: 4,
          densePool: 8,
          keyPool: 8,
          corpusVersions: ['rag_step3_9709_question_aware_v1'],
          wSem: 0.3,
          wKey: 0.7,
          rrfK: 60,
        },
        maxExpandedTopics: 6,
      },
      {
        supabase: createSupabaseStub(),
        retrieveFn,
        expandFn,
      },
    );

    expect(calls).toEqual([
      {
        currentTopicPath: '9709.P1.1',
        corpusVersions: ['rag_step3_9709_question_aware_v1'],
      },
      {
        currentTopicPath: '9709.P1.2',
        corpusVersions: ['rag_step3_9709_question_aware_v1'],
      },
    ]);
    expect(result.audit.s2_hop_count).toBe(2);
    expect(result.audit.s2_expanded_topic_count).toBe(1);
    expect(result.audit.hop_0_row_count).toBe(2);
    expect(result.audit.hop_1_row_count).toBe(2);
    expect(result.rows.length).toBe(3);
    expect(result.rows[0].id).toBe('chunk-2');
  });

  it('returns hop_count=1 when no expansion paths exist', async () => {
    const result = await retrieveS2MultiHopCandidates(
      {
        query: 'single node',
        queryEmbedding: [0.1],
        currentTopicPath: '9709.P1.1',
        subjectCode: '9709',
        retrievalConfig: {
          matchCount: 3,
          densePool: 3,
          keyPool: 3,
          wSem: 0.3,
          wKey: 0.7,
          rrfK: 60,
        },
      },
      {
        supabase: createSupabaseStub(),
        retrieveFn: async () => [{ id: 'chunk-1', topic_path: '9709.P1.1', fused_score: 0.5 }],
        expandFn: () => ({
          expanded_topic_paths: [],
          expansion_reason_counts: {},
          skipped_topic_paths: [],
        }),
      },
    );

    expect(result.audit.s2_hop_count).toBe(1);
    expect(result.audit.s2_expanded_topic_count).toBe(0);
    expect(result.rows).toHaveLength(1);
  });

  it('throws typed error when hop-1 retrieval fails', async () => {
    await expect(
      retrieveS2MultiHopCandidates(
        {
          query: 'cross-topic',
          queryEmbedding: [0.1],
          currentTopicPath: '9709.P1.1',
          subjectCode: '9709',
          retrievalConfig: {
            matchCount: 3,
            densePool: 3,
            keyPool: 3,
            wSem: 0.3,
            wKey: 0.7,
            rrfK: 60,
          },
        },
        {
          supabase: createSupabaseStub(),
          retrieveFn: async ({ currentTopicPath }) => {
            if (currentTopicPath === '9709.P1.2') {
              throw new Error('rpc timeout');
            }
            return [{ id: 'chunk-1', topic_path: '9709.P1.1', fused_score: 0.5 }];
          },
          expandFn: () => ({
            expanded_topic_paths: ['9709.P1.2'],
            expansion_reason_counts: {},
            skipped_topic_paths: [],
          }),
        },
      ),
    ).rejects.toMatchObject({
      code: 'S2_HOP_RETRIEVER_ERROR',
    });
  });
});
