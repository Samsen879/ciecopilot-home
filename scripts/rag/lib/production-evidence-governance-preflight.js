import { validateProductionEvidenceManifest } from './production-evidence-manifest.js';
import { validateProductionEvidenceWhitelist } from './production-evidence-whitelist.js';
import { buildProductionEvidenceReleaseGate } from './production-evidence-release-gate.js';
import { buildProductionEvidenceIngestPreflight } from './production-evidence-ingest-preflight.js';

function mergeReasons(...groups) {
  const out = [];
  for (const group of groups) {
    for (const reason of Array.isArray(group) ? group : []) {
      if (reason && !out.includes(reason)) {
        out.push(reason);
      }
    }
  }
  return out;
}

export function buildProductionEvidenceGovernancePreflight({
  rootDir = process.cwd(),
  manifest = null,
  items = [],
  manifestPath = '',
  whitelist = null,
} = {}) {
  const manifestValidation = validateProductionEvidenceManifest({ manifest, items });
  const whitelistValidation = validateProductionEvidenceWhitelist({
    whitelist,
    manifest,
    manifestPath,
  });
  const releaseGate = buildProductionEvidenceReleaseGate({
    rootDir,
    manifest,
    items,
    manifestPath,
    whitelist,
  });
  const ingestPreflight = buildProductionEvidenceIngestPreflight({
    rootDir,
    manifest,
    items,
    manifestPath,
    whitelist,
    releaseGateResult: releaseGate,
  });

  const governanceValid = Boolean(
    manifestValidation.ok === true
      && whitelistValidation.ok === true
      && releaseGate.status === 'pass',
  );

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_governance_preflight',
    manifest_validation: manifestValidation,
    whitelist_validation: whitelistValidation,
    release_gate: releaseGate,
    ingest_preflight: ingestPreflight,
    summary: {
      bundle_id: manifestValidation.summary?.bundle_id || whitelistValidation.summary?.bundle_id || null,
      governance_valid: governanceValid,
      release_ready: releaseGate.release_ready === true,
      ingest_permitted: ingestPreflight.ingest_permitted === true,
    },
    status: governanceValid ? 'pass' : 'fail',
    blocked_reasons: mergeReasons(releaseGate.blocked_reasons, ingestPreflight.blocked_reasons),
  };
}

export function renderProductionEvidenceGovernancePreflightReport(result = {}) {
  const lines = [
    '# Phase B Production Evidence Governance Preflight',
    '',
    `- status: \`${result.status || 'unknown'}\``,
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- governance_valid: \`${Boolean(result.summary?.governance_valid)}\``,
    `- release_ready: \`${Boolean(result.summary?.release_ready)}\``,
    `- ingest_permitted: \`${Boolean(result.summary?.ingest_permitted)}\``,
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
