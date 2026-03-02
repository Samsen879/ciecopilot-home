import { RagError } from '../errors.js';

export async function callHybridSearchRpc(
  {
    query,
    queryEmbedding,
    currentTopicPath,
    matchCount,
    densePool,
    keyPool,
    wSem,
    wKey,
    rrfK,
  },
  {
    supabase,
  },
) {
  const { data, error } = await supabase.rpc('hybrid_search_v2', {
    p_query: query,
    p_query_embedding: queryEmbedding,
    p_topic_path: currentTopicPath,
    p_match_count: matchCount,
    p_dense_pool: densePool,
    p_key_pool: keyPool,
    p_w_sem: wSem,
    p_w_key: wKey,
    p_rrf_k: rrfK,
  });

  if (error) {
    const message = error?.message || 'hybrid_search_v2 failed';
    if (message.includes('current_topic_path required')) {
      throw new RagError({
        status: 400,
        code: 'TOPIC_PATH_MISSING',
        message,
      });
    }
    if (message.includes('unknown current_topic_path')) {
      throw new RagError({
        status: 404,
        code: 'TOPIC_PATH_NOT_FOUND',
        message,
      });
    }
    throw new RagError({
      status: 502,
      code: 'RAG_RETRIEVER_RPC_ERROR',
      message,
      details: { db_code: error.code || null },
    });
  }

  return Array.isArray(data) ? data : [];
}

export async function retrieveHybridCandidates(
  {
    query,
    queryEmbedding,
    currentTopicPath,
    matchCount,
    densePool,
    keyPool,
    wSem,
    wKey,
    rrfK,
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
      matchCount,
      densePool,
      keyPool,
      wSem,
      wKey,
      rrfK,
    },
    { supabase },
  );

  return rows.map((row, index) => ({
    ...row,
    rank_sem: Number.isFinite(Number(row.rank_sem)) ? Number(row.rank_sem) : null,
    rank_key: Number.isFinite(Number(row.rank_key)) ? Number(row.rank_key) : null,
    fused_rank: Number.isFinite(Number(row.fused_rank)) ? Number(row.fused_rank) : index + 1,
    fused_score: Number.isFinite(Number(row.fused_score ?? row.score))
      ? Number(row.fused_score ?? row.score)
      : 0,
  }));
}
