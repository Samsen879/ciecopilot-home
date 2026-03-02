function buildSourceRef(row) {
  const assetId = row?.asset_id || row?.node_id || row?.document_id || `chunk:${row.id}`;
  if (row?.page_no && Number.isFinite(Number(row.page_no))) {
    return {
      asset_id: String(assetId),
      page_no: Number(row.page_no),
    };
  }
  return {
    asset_id: String(assetId),
    question_id: String(row?.question_id || row.id),
  };
}

function isSourceRefResolvable(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') return false;
  if (!sourceRef.asset_id || typeof sourceRef.asset_id !== 'string') return false;
  const hasPageNo = Number.isFinite(Number(sourceRef.page_no)) && Number(sourceRef.page_no) > 0;
  const hasQuestionId = typeof sourceRef.question_id === 'string' && sourceRef.question_id.trim().length > 0;
  return hasPageNo || hasQuestionId;
}

export async function assembleEvidence(
  {
    fusedRows,
    currentTopicPath,
    fallbackNode = null,
  },
  {
    supabase,
  } = {},
) {
  const evidence = [];

  if (Array.isArray(fusedRows)) {
    for (const row of fusedRows) {
      const source_ref = buildSourceRef(row);
      evidence.push({
        id: String(row.id),
        topic_path: String(row.topic_path || currentTopicPath || ''),
        snippet: String(row.snippet || '').slice(0, 500),
        score: Number(row.fused_score ?? row.score ?? 0),
        source_type: row.source_type || 'chunk',
        source_ref,
        rank_key: Number.isFinite(Number(row.rank_key)) ? Number(row.rank_key) : undefined,
        rank_sem: Number.isFinite(Number(row.rank_sem)) ? Number(row.rank_sem) : undefined,
        fused_rank: Number.isFinite(Number(row.fused_rank)) ? Number(row.fused_rank) : undefined,
        _traceable: isSourceRefResolvable(source_ref),
      });
    }
  }

  if (evidence.length === 0 && fallbackNode?.syllabus_node_id) {
    const source_ref = {
      asset_id: String(fallbackNode.syllabus_node_id),
      question_id: String(fallbackNode.syllabus_node_id),
    };
    evidence.push({
      id: `node:${fallbackNode.syllabus_node_id}`,
      topic_path: String(fallbackNode.current_topic_path || ''),
      snippet: [fallbackNode.title, fallbackNode.description].filter(Boolean).join(' - ') || 'Syllabus node context',
      score: 1,
      source_type: 'syllabus_node',
      source_ref,
      rank_key: 1,
      rank_sem: 1,
      fused_rank: 1,
      _traceable: true,
    });
  }

  const traceableCount = evidence.filter((x) => x._traceable).length;
  const traceability_rate = evidence.length > 0 ? traceableCount / evidence.length : 0;

  return {
    evidence: evidence.map(({ _traceable, ...rest }) => rest),
    traceability: {
      total: evidence.length,
      traceable: traceableCount,
      evidence_traceability_rate: Number(traceability_rate.toFixed(6)),
    },
  };
}

