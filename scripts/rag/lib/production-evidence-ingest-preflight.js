import { buildProductionEvidenceReleaseGate } from './production-evidence-release-gate.js';

function pushReason(reasons, value) {
  if (value && !reasons.includes(value)) {
    reasons.push(value);
  }
}

export function buildProductionEvidenceIngestPreflight({
  rootDir = process.cwd(),
  manifest = null,
  items = [],
  manifestPath = '',
  whitelist = null,
  releaseGateResult = null,
} = {}) {
  const releaseGate = releaseGateResult || buildProductionEvidenceReleaseGate({
    rootDir,
    manifest,
    items,
    manifestPath,
    whitelist,
  });

  const blockedReasons = [];
  for (const reason of releaseGate.blocked_reasons || []) {
    pushReason(blockedReasons, reason);
  }
  if (releaseGate.status !== 'pass') {
    pushReason(blockedReasons, 'release_gate_failed');
  }
  if (releaseGate.release_ready !== true) {
    pushReason(blockedReasons, 'release_not_ready');
  }
  if (releaseGate.summary?.ingest_allowed !== true) {
    pushReason(blockedReasons, 'ingest_not_allowed');
  }

  const ingestPermitted = blockedReasons.length === 0
    && releaseGate.status === 'pass'
    && releaseGate.release_ready === true
    && releaseGate.summary?.ingest_allowed === true;

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_ingest_preflight',
    root_dir: rootDir,
    status: ingestPermitted ? 'pass' : 'blocked',
    ingest_permitted: ingestPermitted,
    blocked_reasons: blockedReasons,
    checks: {
      release_gate_status: releaseGate.status,
      release_ready: releaseGate.release_ready === true,
      ingest_allowed: releaseGate.summary?.ingest_allowed === true,
    },
    summary: {
      bundle_id: releaseGate.summary?.bundle_id || null,
      manifest_path: releaseGate.summary?.manifest_path || manifestPath || null,
      release_channel: releaseGate.summary?.release_channel || null,
    },
    evidence: {
      release_gate: releaseGate,
    },
  };
}

export function renderProductionEvidenceIngestPreflightReport(result = {}) {
  const lines = [
    '# Production Evidence Ingest Preflight',
    '',
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- status: \`${result.status || 'unknown'}\``,
    `- ingest_permitted: \`${Boolean(result.ingest_permitted)}\``,
    `- release_channel: \`${result.summary?.release_channel || 'unknown'}\``,
    '',
    '## Blocked Reasons',
    '',
  ];

  if (!Array.isArray(result.blocked_reasons) || result.blocked_reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of result.blocked_reasons) {
      lines.push(`- ${reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
