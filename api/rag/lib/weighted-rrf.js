export function fuseWeightedRrf(
  {
    denseRows = [],
    lexicalRows = [],
    w_sem,
    w_key,
    rrf_k,
    fused_top_k,
  },
) {
  const byId = new Map();

  function upsert(row, channel) {
    const id = String(row.id);
    const current = byId.get(id) || {
      id,
      snippet: row.snippet || '',
      topic_path: row.topic_path ? String(row.topic_path) : null,
      rank_sem: null,
      rank_key: null,
      source_row: row,
    };

    if (channel === 'dense') {
      current.rank_sem = Number.isFinite(Number(row.rank_sem)) ? Number(row.rank_sem) : null;
    } else if (channel === 'lexical') {
      current.rank_key = Number.isFinite(Number(row.rank_key)) ? Number(row.rank_key) : null;
    }

    if (!current.snippet && row.snippet) current.snippet = row.snippet;
    if (!current.topic_path && row.topic_path) current.topic_path = String(row.topic_path);
    if (!current.source_row && row) current.source_row = row;
    byId.set(id, current);
  }

  for (const row of denseRows) upsert(row, 'dense');
  for (const row of lexicalRows) upsert(row, 'lexical');

  const merged = [];
  for (const item of byId.values()) {
    const denseScore = item.rank_sem == null ? 0 : Number(w_sem) / (Number(rrf_k) + item.rank_sem);
    const lexicalScore = item.rank_key == null ? 0 : Number(w_key) / (Number(rrf_k) + item.rank_key);
    merged.push({
      ...item,
      fused_score: denseScore + lexicalScore,
    });
  }

  merged.sort((a, b) => {
    if (b.fused_score !== a.fused_score) return b.fused_score - a.fused_score;
    return Number(a.id) - Number(b.id);
  });

  return merged.slice(0, fused_top_k).map((item, index) => ({
    id: item.id,
    snippet: item.snippet || '',
    topic_path: item.topic_path,
    rank_sem: item.rank_sem,
    rank_key: item.rank_key,
    fused_rank: index + 1,
    fused_score: Number(item.fused_score.toFixed(8)),
  }));
}

