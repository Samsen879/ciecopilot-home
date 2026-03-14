function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function pushError(errors, message) {
  errors.push(message);
}

function getCounts(ingestPayload = {}) {
  return {
    attempted: Number(ingestPayload?.row_counts?.attempted || 0),
    inserted: Number(ingestPayload?.row_counts?.inserted || 0),
    updated: Number(ingestPayload?.row_counts?.updated || 0),
    skipped_existing: Number(ingestPayload?.row_counts?.skipped_existing || 0),
    failed: Number(ingestPayload?.row_counts?.failed || 0),
    verified: 0,
  };
}

export function buildProductionEvidencePostWriteAudit({
  ingestPayload = null,
  readbackRows = [],
} = {}) {
  const payload = ingestPayload && typeof ingestPayload === 'object' ? ingestPayload : {};
  const writes = Array.isArray(payload.writes) ? payload.writes : [];
  const readbacks = Array.isArray(readbackRows) ? readbackRows : [];
  const readbackById = new Map(readbacks.map((row) => [row?.id, row]));
  const errors = [];
  const counts = getCounts(payload);

  if (payload.status !== 'pass') {
    pushError(errors, `ingest status must be pass before post-write audit, received ${payload.status || 'unknown'}`);
  }

  for (const write of writes) {
    const rowId = write?.row?.id;
    const readback = readbackById.get(rowId);
    if (!rowId) {
      pushError(errors, `write operation ${write?.operation || 'unknown'} is missing row.id`);
      continue;
    }
    if (!readback) {
      pushError(errors, `readback row missing for id ${rowId}`);
      continue;
    }

    let rowOk = true;
    if (normalizeString(readback.source_type) !== normalizeString(write.source_type)) {
      rowOk = false;
      pushError(errors, `readback row ${rowId} source_type mismatch: expected ${write.source_type}, received ${readback.source_type}`);
    }
    if (normalizeString(readback.topic_path) !== normalizeString(write.topic_path)) {
      rowOk = false;
      pushError(errors, `readback row ${rowId} topic_path mismatch: expected ${write.topic_path}, received ${readback.topic_path}`);
    }
    if (normalizeString(readback.corpus_version) !== normalizeString(write.corpus_version)) {
      rowOk = false;
      pushError(errors, `readback row ${rowId} corpus_version mismatch: expected ${write.corpus_version}, received ${readback.corpus_version}`);
    }
    if (rowOk) {
      counts.verified += 1;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_post_write_audit',
    status: errors.length === 0 ? 'pass' : 'fail',
    summary: {
      bundle_id: payload?.summary?.bundle_id || null,
      corpus_version: payload?.summary?.corpus_version || null,
    },
    counts,
    errors,
  };
}

export function renderProductionEvidencePostWriteAuditReport(result = {}) {
  const lines = [
    '# Phase B Production Evidence Post-Write Audit',
    '',
    `- status: \`${result.status || 'unknown'}\``,
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- corpus_version: \`${result.summary?.corpus_version || 'unknown'}\``,
    `- attempted: \`${result.counts?.attempted || 0}\``,
    `- inserted: \`${result.counts?.inserted || 0}\``,
    `- updated: \`${result.counts?.updated || 0}\``,
    `- skipped_existing: \`${result.counts?.skipped_existing || 0}\``,
    `- verified: \`${result.counts?.verified || 0}\``,
    '',
    '## Errors',
    '',
  ];

  if (!Array.isArray(result.errors) || result.errors.length === 0) {
    lines.push('- none');
  } else {
    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
