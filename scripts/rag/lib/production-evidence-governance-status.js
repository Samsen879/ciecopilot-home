function normalizeBlockedReasons(...groups) {
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

export function buildProductionEvidenceGovernanceStatus({
  requiredArtifacts = {},
  manifestCheck = null,
  whitelistCheck = null,
  releaseGate = null,
  ingestPreflight = null,
} = {}) {
  const artifacts = requiredArtifacts && typeof requiredArtifacts === 'object' ? requiredArtifacts : {};
  const allArtifactsPresent = Object.values(artifacts).every((item) => item?.exists === true);
  const governanceValid = Boolean(
    manifestCheck?.ok === true
      && whitelistCheck?.ok === true
      && releaseGate?.status === 'pass',
  );
  const releaseReady = releaseGate?.release_ready === true;
  const ingestPermitted = ingestPreflight?.ingest_permitted === true;

  const blockedReasons = normalizeBlockedReasons(
    releaseGate?.blocked_reasons,
    ingestPreflight?.blocked_reasons,
  );

  if (!allArtifactsPresent) {
    blockedReasons.push('required_phase_b_artifacts_missing');
  }
  if (!governanceValid) {
    blockedReasons.push('phase_b_governance_invalid');
  }

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_governance_status',
    required_artifacts: artifacts,
    checks: {
      all_required_artifacts_present: allArtifactsPresent,
      manifest_check_passed: manifestCheck?.ok === true,
      whitelist_check_passed: whitelistCheck?.ok === true,
      release_gate_passed: releaseGate?.status === 'pass',
      ingest_preflight_present: Boolean(ingestPreflight),
    },
    summary: {
      bundle_id:
        manifestCheck?.summary?.bundle_id
        || whitelistCheck?.summary?.bundle_id
        || releaseGate?.summary?.bundle_id
        || ingestPreflight?.summary?.bundle_id
        || null,
      governance_valid: governanceValid,
      release_ready: releaseReady,
      ingest_permitted: ingestPermitted,
    },
    status: allArtifactsPresent && governanceValid ? 'pass' : 'fail',
    blocked_reasons: blockedReasons,
  };
}

export function renderProductionEvidenceGovernanceStatusReport(result = {}) {
  const lines = [
    '# Phase B Production Evidence Governance Status',
    '',
    `- status: \`${result.status || 'unknown'}\``,
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- governance_valid: \`${Boolean(result.summary?.governance_valid)}\``,
    `- release_ready: \`${Boolean(result.summary?.release_ready)}\``,
    `- ingest_permitted: \`${Boolean(result.summary?.ingest_permitted)}\``,
    '',
    '## Required Artifacts',
    '',
  ];

  for (const [name, artifact] of Object.entries(result.required_artifacts || {})) {
    lines.push(`- ${name}: path=\`${artifact?.path || 'unknown'}\` exists=\`${Boolean(artifact?.exists)}\``);
  }

  lines.push('', '## Blocked Reasons', '');
  if (!Array.isArray(result.blocked_reasons) || result.blocked_reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of result.blocked_reasons) {
      lines.push(`- ${reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
