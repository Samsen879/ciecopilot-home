function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function shouldContinueAfterIngest({ ingestStep = null, ingestSummary = null } = {}) {
  if (ingestStep?.ok === true) return true;
  if (!ingestSummary || String(ingestSummary.status || '').trim().toLowerCase() !== 'completed') {
    return false;
  }

  const filesProcessed = toNumber(ingestSummary?.counts?.files_processed, 0);
  const canonicalInserts = toNumber(ingestSummary?.counts?.canonical_inserts, 0);
  return filesProcessed > 0 && canonicalInserts > 0;
}

export function summarizePilotRetrievalAvailability(evalSummary = null) {
  if (!evalSummary) return null;
  return {
    status: evalSummary.status,
    case_count: evalSummary.case_count || evalSummary.total_requests || null,
    fallback_reason_counts: evalSummary.fallback_reason_counts || {},
    s2_empty_evidence_reason_counts: evalSummary.s2_empty_evidence_reason_counts || {},
    subject_scope_audit: evalSummary.subject_scope_audit || null,
  };
}
