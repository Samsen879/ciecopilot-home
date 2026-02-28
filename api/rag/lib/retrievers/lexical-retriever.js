import { callHybridSearchRpc } from './_hybrid-rpc.js';

export async function retrieveLexicalCandidates(
  {
    query,
    queryEmbedding,
    currentTopicPath,
    k_key,
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
      matchCount: k_key,
      densePool: Math.max(k_key, 30),
      keyPool: Math.max(k_key, 30),
      wSem: 0,
      wKey: 1,
      rrfK: rrf_k,
    },
    { supabase },
  );

  return rows.map((row, index) => ({
    ...row,
    rank_key: Number.isFinite(Number(row.rank_key)) ? Number(row.rank_key) : index + 1,
  }));
}

