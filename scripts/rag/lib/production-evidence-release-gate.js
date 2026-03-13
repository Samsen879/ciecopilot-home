import { validateProductionEvidenceManifest } from './production-evidence-manifest.js';
import { validateProductionEvidenceWhitelist } from './production-evidence-whitelist.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((item) => normalizeString(item)).filter(Boolean))];
}

function pushReason(reasons, value) {
  if (value && !reasons.includes(value)) {
    reasons.push(value);
  }
}

export function buildProductionEvidenceReleaseGate({
  rootDir = process.cwd(),
  manifest = null,
  items = [],
  manifestPath = '',
  whitelist = null,
} = {}) {
  const manifestResult = validateProductionEvidenceManifest({
    manifest,
    items,
  });
  const whitelistResult = validateProductionEvidenceWhitelist({
    whitelist,
    manifest,
    manifestPath,
  });

  const blockedReasons = [];
  if (!manifestResult.ok) {
    pushReason(blockedReasons, 'manifest_invalid');
  }
  if (!whitelistResult.ok) {
    const errorText = whitelistResult.errors.join('\n');
    if (errorText.includes('bundle_id')) {
      pushReason(blockedReasons, 'bundle_not_whitelisted');
    }
    if (errorText.includes('manifest_path')) {
      pushReason(blockedReasons, 'manifest_path_not_whitelisted');
    }
    if (errorText.includes('allowed_source_types')) {
      pushReason(blockedReasons, 'whitelist_scope_invalid');
    }
    if (!blockedReasons.some((reason) => reason.startsWith('bundle_') || reason.startsWith('manifest_') || reason.startsWith('whitelist_'))) {
      pushReason(blockedReasons, 'whitelist_invalid');
    }
  }

  const entry = whitelistResult.entry || null;
  const releaseChannel = normalizeString(entry?.release_channel);
  const ingestAllowed = entry?.ingest_allowed === true;
  const releaseReadyExpected = entry?.release_ready_expected === true;

  if (manifestResult.ok && whitelistResult.ok) {
    if (releaseChannel && releaseChannel !== 'ready_for_ingest') {
      pushReason(blockedReasons, `release_channel_${releaseChannel}`);
    }
    if (!releaseReadyExpected) {
      pushReason(blockedReasons, 'release_ready_expected_false');
    }
    if (!ingestAllowed) {
      pushReason(blockedReasons, 'ingest_not_allowed');
    }
  }

  const status = manifestResult.ok && whitelistResult.ok ? 'pass' : 'fail';
  const releaseReady = status === 'pass'
    && blockedReasons.length === 0
    && releaseReadyExpected
    && ingestAllowed;

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_release_gate',
    root_dir: rootDir,
    status,
    release_ready: releaseReady,
    blocked_reasons: blockedReasons,
    checks: {
      manifest_valid: manifestResult.ok,
      whitelist_valid: whitelistResult.ok,
      release_channel: releaseChannel,
      ingest_allowed: ingestAllowed,
      release_ready_expected: releaseReadyExpected,
      subject_codes: normalizeStringArray(manifestResult.summary?.subject_codes),
      active_source_types: normalizeStringArray(manifestResult.summary?.active_source_types),
    },
    evidence: {
      manifest_errors: manifestResult.errors,
      whitelist_errors: whitelistResult.errors,
    },
    summary: {
      bundle_id: manifestResult.summary?.bundle_id || whitelistResult.summary?.bundle_id || null,
      manifest_path: whitelistResult.summary?.manifest_path || normalizeString(manifestPath) || null,
      release_channel: releaseChannel,
      ingest_allowed: ingestAllowed,
      release_ready_expected: releaseReadyExpected,
      active_source_types: normalizeStringArray(manifestResult.summary?.active_source_types),
    },
  };
}

export function renderProductionEvidenceReleaseGateReport(result = {}) {
  const lines = [
    '# Production Evidence Release Gate',
    '',
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- status: \`${result.status || 'unknown'}\``,
    `- release_ready: \`${Boolean(result.release_ready)}\``,
    `- release_channel: \`${result.summary?.release_channel || 'unknown'}\``,
    `- ingest_allowed: \`${Boolean(result.summary?.ingest_allowed)}\``,
    `- release_ready_expected: \`${Boolean(result.summary?.release_ready_expected)}\``,
    `- active_source_types: \`${JSON.stringify(result.summary?.active_source_types || [])}\``,
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

export const evaluateProductionEvidenceReleaseGate = buildProductionEvidenceReleaseGate;
