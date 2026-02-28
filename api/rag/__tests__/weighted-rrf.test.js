import { fuseWeightedRrf } from '../lib/weighted-rrf.js';

describe('weighted rrf fusion', () => {
  it('fuses dense and lexical rankings with expected order', () => {
    const fused = fuseWeightedRrf({
      denseRows: [
        { id: 1, rank_sem: 1, topic_path: '9709.P1', snippet: 'A' },
        { id: 2, rank_sem: 2, topic_path: '9709.P1', snippet: 'B' },
      ],
      lexicalRows: [
        { id: 2, rank_key: 1, topic_path: '9709.P1', snippet: 'B' },
        { id: 3, rank_key: 2, topic_path: '9709.P1', snippet: 'C' },
      ],
      w_sem: 0.3,
      w_key: 0.7,
      rrf_k: 60,
      fused_top_k: 8,
    });

    expect(fused.length).toBe(3);
    expect(fused[0].id).toBe('2');
    expect(fused[0].rank_sem).toBe(2);
    expect(fused[0].rank_key).toBe(1);
    expect(fused[0].fused_rank).toBe(1);
  });
});

