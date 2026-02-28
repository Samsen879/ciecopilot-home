import { callHybridSearchRpc } from './_hybrid-rpc.js';

export async function retrieveDenseCandidates(
  {
    query,
    queryEmbedding,
    currentTopicPath,
    k_sem,
    rrf_k,
  },
  {
    supabase,
  },
) {
  const rows = await callHybridSearchRpc(
    {
      query,
      queryEmbedding,
      currentTopicPath,
      matchCount: k_sem,
      densePool: Math.max(k_sem, 30),
      keyPool: Math.max(k_sem, 30),
      wSem: 1,
      wKey: 0,
      rrfK: rrf_k,
    },
    { supabase },
  );

  return rows.map((row, index) => ({
    ...row,
    rank_sem: Number.isFinite(Number(row.rank_sem)) ? Number(row.rank_sem) : index + 1,
  }));
}

