import { RagError } from '../errors.js';

function normalizeHybridRows(rows) {
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

const HYBRID_RPC_MAX_ATTEMPTS = 3;
const HYBRID_RPC_RETRY_DELAYS_MS = [100, 300];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRpcMessage(message, error = null) {
  const normalized = String(message || error?.message || '').toLowerCase();
  return (
    normalized.includes('fetch failed') ||
    normalized.includes('network') ||
    normalized.includes('socket') ||
    normalized.includes('timeout') ||
    error?.name === 'AbortError'
  );
}

function buildAssetFamilyKey(metadata) {
  const sourceRef = metadata?.source_ref || {};
  const sourceType = String(metadata?.source_type || '').trim();
  const assetId = String(sourceRef.asset_id || '').trim();
  const paperId = String(sourceRef.paper_id || '').trim();
  const chunkKind = String(sourceRef.chunk_kind || '').trim();
  if (!sourceType || !assetId) return null;
  return `${sourceType}::${assetId}::${paperId}::${chunkKind}`;
}

function enrichRowWithChunkMetadata(row, metadata) {
  if (!metadata || typeof metadata !== 'object') return row;
  const sourceRef = metadata?.source_ref || {};
  return {
    ...row,
    source_type: metadata?.source_type || row?.source_type,
    corpus_version: metadata?.corpus_version || row?.corpus_version,
    asset_id: sourceRef?.asset_id || row?.asset_id,
    question_id: sourceRef?.question_id || row?.question_id,
    parent_question_id: sourceRef?.parent_question_id || row?.parent_question_id,
    paper_id: sourceRef?.paper_id || row?.paper_id,
    chunk_kind: sourceRef?.chunk_kind || row?.chunk_kind,
    section_id: sourceRef?.section_id || row?.section_id,
  };
}

function getCorpusVersionPriority(corpusVersions, corpusVersion) {
  if (!Array.isArray(corpusVersions) || corpusVersions.length === 0) return Number.MAX_SAFE_INTEGER;
  const index = corpusVersions.indexOf(corpusVersion);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

async function shadowOlderAssetFamilyRows(rows, { supabase, corpusVersions }) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  if (!supabase || typeof supabase.from !== 'function') return rows;

  const ids = rows
    .map((row) => Number(row?.id))
    .filter((value) => Number.isFinite(value));
  if (ids.length === 0) return rows;

  let data = null;
  let error = null;
  try {
    const result = await supabase
      .from('chunks')
      .select('id, source_type, corpus_version, source_ref')
      .in('id', ids);
    data = result?.data ?? null;
    error = result?.error ?? null;
  } catch {
    return rows;
  }
  if (error || !Array.isArray(data)) {
    return rows;
  }

  const metadataById = new Map(data.map((row) => [Number(row.id), row]));
  const enrichedRows = rows.map((row) => enrichRowWithChunkMetadata(row, metadataById.get(Number(row.id))));
  if (!Array.isArray(corpusVersions) || corpusVersions.length <= 1) {
    return enrichedRows;
  }
  const familyPriority = new Map();

  for (const row of enrichedRows) {
    const metadata = metadataById.get(Number(row.id));
    const familyKey = buildAssetFamilyKey(metadata);
    if (!familyKey) continue;
    const priority = getCorpusVersionPriority(corpusVersions, metadata?.corpus_version);
    const current = familyPriority.get(familyKey);
    if (current == null || priority < current) {
      familyPriority.set(familyKey, priority);
    }
  }

  return enrichedRows.filter((row) => {
    const metadata = metadataById.get(Number(row.id));
    const familyKey = buildAssetFamilyKey(metadata);
    if (!familyKey) return true;
    return getCorpusVersionPriority(corpusVersions, metadata?.corpus_version) === familyPriority.get(familyKey);
  });
}

export async function callHybridSearchRpc(
  {
    query,
    queryEmbedding,
    currentTopicPath,
    corpusVersions,
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
  for (let attempt = 1; attempt <= HYBRID_RPC_MAX_ATTEMPTS; attempt += 1) {
    try {
      const { data, error } = await supabase.rpc('hybrid_search_v2', {
        p_query: query,
        p_query_embedding: queryEmbedding,
        p_topic_path: currentTopicPath,
        p_corpus_versions: Array.isArray(corpusVersions) && corpusVersions.length > 0 ? corpusVersions : null,
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
        if (attempt < HYBRID_RPC_MAX_ATTEMPTS && isRetryableRpcMessage(message, error)) {
          await sleep(HYBRID_RPC_RETRY_DELAYS_MS[attempt - 1] || 0);
          continue;
        }
        throw new RagError({
          status: 502,
          code: 'RAG_RETRIEVER_RPC_ERROR',
          message,
          details: { db_code: error.code || null },
        });
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error instanceof RagError) {
        throw error;
      }
      if (attempt < HYBRID_RPC_MAX_ATTEMPTS && isRetryableRpcMessage(null, error)) {
        await sleep(HYBRID_RPC_RETRY_DELAYS_MS[attempt - 1] || 0);
        continue;
      }
      throw new RagError({
        status: 502,
        code: 'RAG_RETRIEVER_RPC_ERROR',
        message: error?.message || 'hybrid_search_v2 failed',
        details: { db_code: error?.code || null },
      });
    }
  }

  return [];
}

export async function retrieveHybridCandidates(
  {
    query,
    queryEmbedding,
    currentTopicPath,
    corpusVersions,
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
  const rawMatchCount = Number.isFinite(Number(matchCount)) ? Number(matchCount) : 12;
  const shadowEnabled = Array.isArray(corpusVersions) && corpusVersions.length > 1;
  const requestedMatchCount = shadowEnabled
    ? Math.min(Math.max(rawMatchCount * 4, rawMatchCount), 48)
    : rawMatchCount;
  const rows = await callHybridSearchRpc(
    {
      query,
      queryEmbedding,
      currentTopicPath,
      corpusVersions,
      matchCount: requestedMatchCount,
      densePool,
      keyPool,
      wSem,
      wKey,
      rrfK,
    },
    { supabase },
  );

  const normalizedRows = normalizeHybridRows(rows);
  const filteredRows = await shadowOlderAssetFamilyRows(normalizedRows, { supabase, corpusVersions });
  return filteredRows.slice(0, rawMatchCount);
}
