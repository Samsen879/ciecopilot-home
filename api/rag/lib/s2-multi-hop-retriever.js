import { RagError } from './errors.js';
import { retrieveHybridCandidates } from './retrievers/_hybrid-rpc.js';
import { expandPrerequisiteTopics } from './s2-prereq-expander.js';

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function stableRowId(row) {
  return String(row?.id || row?.chunk_id || row?.node_id || '');
}

function toScore(row) {
  const candidate = Number(row?.fused_score ?? row?.score);
  return Number.isFinite(candidate) ? candidate : 0;
}

function toRank(row, fallback) {
  const candidate = Number(row?.fused_rank);
  if (!Number.isFinite(candidate) || candidate <= 0) return fallback;
  return Math.floor(candidate);
}

function mergeRows(rows, limit) {
  const dedup = new Map();
  for (const row of rows) {
    const id = stableRowId(row);
    if (!id) continue;
    const existing = dedup.get(id);
    if (!existing) {
      dedup.set(id, row);
      continue;
    }
    const existingScore = toScore(existing);
    const nextScore = toScore(row);
    const existingHop = Number(existing.__s2_hop || 0);
    const nextHop = Number(row.__s2_hop || 0);
    const replace =
      nextScore > existingScore ||
      (nextScore === existingScore && nextHop < existingHop) ||
      (nextScore === existingScore &&
        nextHop === existingHop &&
        toRank(row, Number.MAX_SAFE_INTEGER) < toRank(existing, Number.MAX_SAFE_INTEGER));
    if (replace) dedup.set(id, row);
  }

  return [...dedup.values()]
    .sort((left, right) => {
      const scoreDelta = toScore(right) - toScore(left);
      if (scoreDelta !== 0) return scoreDelta;
      const hopDelta = Number(left.__s2_hop || 0) - Number(right.__s2_hop || 0);
      if (hopDelta !== 0) return hopDelta;
      return toRank(left, Number.MAX_SAFE_INTEGER) - toRank(right, Number.MAX_SAFE_INTEGER);
    })
    .slice(0, toPositiveNumber(limit, 8))
    .map((row, index) => ({
      ...row,
      fused_rank: index + 1,
      fused_score: Number(toScore(row).toFixed(6)),
    }));
}

function tagRows(rows, hop, expandedFrom = null) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    __s2_hop: hop,
    __s2_expanded_from: expandedFrom,
  }));
}

export async function retrieveS2MultiHopCandidates(
  {
    query,
    queryEmbedding,
    currentTopicPath,
    subjectCode = null,
    retrievalConfig = {},
    maxExpandedTopics = 6,
  },
  {
    supabase,
    retrieveFn = retrieveHybridCandidates,
    expandFn = expandPrerequisiteTopics,
  } = {},
) {
  if (!supabase) {
    throw new RagError({
      status: 500,
      code: 'RAG_SUPABASE_MISSING',
      message: 'Supabase client is required for S2 retriever',
    });
  }

  const matchCount = Math.floor(toPositiveNumber(retrievalConfig.matchCount, 8));
  const densePool = Math.floor(toPositiveNumber(retrievalConfig.densePool, Math.max(matchCount, 8)));
  const keyPool = Math.floor(toPositiveNumber(retrievalConfig.keyPool, Math.max(matchCount, 8)));
  const wSem = toPositiveNumber(retrievalConfig.wSem, 0.3);
  const wKey = toPositiveNumber(retrievalConfig.wKey, 0.7);
  const rrfK = Math.floor(toPositiveNumber(retrievalConfig.rrfK, 60));
  const expandedLimit = Math.floor(toPositiveNumber(maxExpandedTopics, 6));
  const corpusVersions = Array.isArray(retrievalConfig.corpusVersions) ? retrievalConfig.corpusVersions : null;

  let hop0Rows = [];
  const hop1SkippedPaths = [];
  const hop1ReasonCounts = {};
  try {
    hop0Rows = await retrieveFn(
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
      { supabase },
    );
  } catch (error) {
    if (error?.code !== 'TOPIC_PATH_NOT_FOUND') {
      throw error;
    }
    hop0Rows = [];
    hop1SkippedPaths.push(currentTopicPath);
    hop1ReasonCounts.hop_0_topic_path_not_found = (hop1ReasonCounts.hop_0_topic_path_not_found || 0) + 1;
  }

  const expansion = expandFn({
    currentTopicPath,
    seedRows: hop0Rows,
    maxExpandedTopics: expandedLimit,
    subjectCode,
  });

  const expandedTopicPaths = Array.isArray(expansion?.expanded_topic_paths)
    ? expansion.expanded_topic_paths
    : [];

  const hop1Rows = [];
  hop1SkippedPaths.push(...(Array.isArray(expansion?.skipped_topic_paths) ? expansion.skipped_topic_paths : []));
  Object.assign(hop1ReasonCounts, expansion?.expansion_reason_counts || {});
  const hop1PerPath = Math.max(2, Math.floor(matchCount / Math.max(expandedTopicPaths.length, 2)));
  for (const expandedTopicPath of expandedTopicPaths) {
    try {
      const rows = await retrieveFn(
        {
          query,
          queryEmbedding,
          currentTopicPath: expandedTopicPath,
          corpusVersions,
          matchCount: hop1PerPath,
          densePool: Math.max(hop1PerPath, densePool),
          keyPool: Math.max(hop1PerPath, keyPool),
          wSem,
          wKey,
          rrfK,
        },
        { supabase },
      );
      hop1Rows.push(...tagRows(rows, 1, expandedTopicPath));
    } catch (error) {
      if (error?.code === 'TOPIC_PATH_NOT_FOUND') {
        hop1SkippedPaths.push(expandedTopicPath);
        hop1ReasonCounts.hop_1_topic_path_not_found = (hop1ReasonCounts.hop_1_topic_path_not_found || 0) + 1;
        continue;
      }
      throw new RagError({
        status: 502,
        code: 'S2_HOP_RETRIEVER_ERROR',
        message: error?.message || 'S2 hop retrieval failed',
        details: {
          hop: 'hop_1',
          expanded_topic_path: expandedTopicPath,
        },
      });
    }
  }

  const mergedRows = mergeRows([...tagRows(hop0Rows, 0), ...hop1Rows], matchCount);
  return {
    rows: mergedRows,
    audit: {
      s2_hop_count: expandedTopicPaths.length > 0 ? 2 : 1,
      s2_expanded_topic_count: expandedTopicPaths.length,
      hop_0_row_count: Array.isArray(hop0Rows) ? hop0Rows.length : 0,
      hop_1_row_count: hop1Rows.length,
      merged_row_count: mergedRows.length,
      expanded_topic_paths: expandedTopicPaths,
      expansion_reason_counts: hop1ReasonCounts,
      skipped_expansion_paths: [...new Set(hop1SkippedPaths)],
      max_expanded_topics: expandedLimit,
    },
  };
}
