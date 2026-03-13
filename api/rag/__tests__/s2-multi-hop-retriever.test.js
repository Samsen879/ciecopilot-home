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

  it('skips missing hop-1 topic paths and continues with remaining expansions', async () => {
    const calls = [];
    const result = await retrieveS2MultiHopCandidates(
      {
        query: 'cross-topic',
        queryEmbedding: [0.1],
        currentTopicPath: '9231.FP2.Hyperbolic_Functions',
        subjectCode: '9231',
        retrievalConfig: {
          matchCount: 4,
          densePool: 4,
          keyPool: 4,
          wSem: 0.3,
          wKey: 0.7,
          rrfK: 60,
        },
      },
      {
        supabase: createSupabaseStub(),
        retrieveFn: async ({ currentTopicPath }) => {
          calls.push(currentTopicPath);
          if (currentTopicPath === '9231.FP1.Hyperbolic_Functions') {
            const error = new Error('unknown current_topic_path');
            error.code = 'TOPIC_PATH_NOT_FOUND';
            throw error;
          }
          if (currentTopicPath === '9231.FP1') {
            return [
              { id: 'chunk-2', topic_path: '9231.FP1', fused_score: 0.7, rank_sem: 1, rank_key: 1 },
            ];
          }
          return [
            {
              id: 'chunk-1',
              topic_path: '9231.FP2.Hyperbolic_Functions',
              fused_score: 0.9,
              rank_sem: 1,
              rank_key: 1,
            },
          ];
        },
        expandFn: () => ({
          expanded_topic_paths: ['9231.FP1.Hyperbolic_Functions', '9231.FP1'],
          expansion_reason_counts: { paper_related_suffix: 1, paper_related_root: 1 },
          skipped_topic_paths: [],
        }),
      },
    );

    expect(calls).toEqual([
      '9231.FP2.Hyperbolic_Functions',
      '9231.FP1.Hyperbolic_Functions',
      '9231.FP1',
    ]);
    expect(result.audit.s2_expanded_topic_count).toBe(1);
    expect(result.audit.expanded_topic_paths).toEqual(['9231.FP1']);
    expect(result.audit.skipped_topic_paths).toContain('9231.FP1.Hyperbolic_Functions');
    expect(result.rows).toHaveLength(2);
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

  it('skips hop-1 expansion paths that resolve to unknown topic paths', async () => {
    const result = await retrieveS2MultiHopCandidates(
      {
        query: 'cross-topic',
        queryEmbedding: [0.1],
        currentTopicPath: '9709.P3.Complex_Numbers',
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
          if (currentTopicPath === '9709.P2.Complex_Numbers') {
            const error = new Error('unknown current_topic_path: 9709.P2.Complex_Numbers');
            error.code = 'TOPIC_PATH_NOT_FOUND';
            throw error;
          }
          return [{ id: 'chunk-1', topic_path: '9709.P3.Complex_Numbers', fused_score: 0.5 }];
        },
        expandFn: () => ({
          expanded_topic_paths: ['9709.P2.Complex_Numbers'],
          expansion_reason_counts: { paper_related_suffix: 1 },
          skipped_topic_paths: [],
        }),
      },
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('chunk-1');
    expect(result.audit.s2_hop_count).toBe(2);
    expect(result.audit.s2_expanded_topic_count).toBe(1);
    expect(result.audit.hop_1_row_count).toBe(0);
    expect(result.audit.skipped_expansion_paths).toContain('9709.P2.Complex_Numbers');
    expect(result.audit.expansion_reason_counts).toMatchObject({
      paper_related_suffix: 1,
      hop_1_topic_path_not_found: 1,
    });
  });

  it('continues with expansion when hop-0 current topic path is unknown', async () => {
    const calls = [];
    const result = await retrieveS2MultiHopCandidates(
      {
        query: 'integration prerequisites',
        queryEmbedding: [0.1],
        currentTopicPath: '9709.P2.Integration',
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
          calls.push(currentTopicPath);
          if (currentTopicPath === '9709.P2.Integration') {
            const error = new Error('unknown current_topic_path: 9709.P2.Integration');
            error.code = 'TOPIC_PATH_NOT_FOUND';
            throw error;
          }
          return [{ id: 'chunk-parent', topic_path: '9709.P2', fused_score: 0.5 }];
        },
        expandFn: () => ({
          expanded_topic_paths: ['9709.P2'],
          expansion_reason_counts: { current_parent: 1 },
          skipped_topic_paths: [],
        }),
      },
    );

    expect(calls).toEqual(['9709.P2.Integration', '9709.P2']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('chunk-parent');
    expect(result.audit.hop_0_row_count).toBe(0);
    expect(result.audit.hop_1_row_count).toBe(1);
    expect(result.audit.skipped_expansion_paths).toContain('9709.P2.Integration');
    expect(result.audit.expansion_reason_counts).toMatchObject({
      current_parent: 1,
      hop_0_topic_path_not_found: 1,
    });
  });
});
