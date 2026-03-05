import { S1_2_FAILURE_CLASSES } from './s1_2_dataset.js';

export function classifyFailure(row = {}) {
  const expectedBehavior = row.expected_behavior || 'grounded_answer';
  const uncertain = Boolean(row.uncertain);
  const uncertainReason = row.uncertain_reason_code || null;
  const errorCode = row.error_code || row.retrieval_audit?.error_code || null;
  const evidenceCount = Number(row.evidence_count || 0);
  const traceable = row.traceable !== false;
  const retrievalAudit = row.retrieval_audit || {};
  const denseCount = Number(retrievalAudit.dense_row_count || 0);
  const lexicalCount = Number(retrievalAudit.lexical_row_count || 0);

  if (row.case_pass && uncertain && expectedBehavior === 'uncertain') {
    return 'CONTRACTUAL_UNCERTAIN_EXPECTED';
  }

  if (row.case_pass) {
    return 'NONE';
  }

  if (errorCode === 'RAG_BOUNDARY_LOOKUP_FAILED') {
    return 'BOUNDARY_LOOKUP_FAILURE';
  }

  if (errorCode === 'RAG_RETRIEVER_RPC_ERROR' || uncertainReason === 'RETRIEVER_ERROR') {
    return 'RETRIEVER_INFRA_FAILURE';
  }

  if (!traceable || Number(row.source_ref_unresolvable_count || 0) > 0) {
    return 'SOURCE_REF_MISSING';
  }

  if (errorCode === 'RAG_CHAT_ERROR' || errorCode === 'RAG_CHAT_TIMEOUT' || errorCode === 'RAG_CHAT_NETWORK_ERROR') {
    return 'CHAT_OR_RESPONSE_FAILURE';
  }

  if (evidenceCount === 0) {
    return 'NO_RELEVANT_CHUNK';
  }

  if (denseCount > 0 && lexicalCount === 0) {
    return 'KEYWORD_PATH_WEAK';
  }

  if (lexicalCount > 0 && denseCount === 0) {
    return 'SEMANTIC_PATH_WEAK';
  }

  if (denseCount > 0 || lexicalCount > 0) {
    return 'RERANK_OR_FUSION_MISS';
  }

  return 'NO_RELEVANT_CHUNK';
}

export function summarizeFailureClasses(rows = []) {
  return rows.reduce((acc, row) => {
    const key = row.failure_class || classifyFailure(row);
    if (!S1_2_FAILURE_CLASSES.includes(key)) {
      acc.unknown = (acc.unknown || 0) + 1;
      return acc;
    }
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
