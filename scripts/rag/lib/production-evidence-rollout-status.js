function normalizeString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function normalizeStringList(values = []) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeEntry(rawEntry) {
  const entry = normalizeObject(rawEntry);
  return {
    bundle_id: normalizeString(entry.bundle_id),
    manifest_path: normalizeString(entry.manifest_path),
    subject_scope: normalizeString(entry.subject_scope),
    subject_codes: normalizeStringList(entry.subject_codes),
    rollout_state: normalizeString(entry.rollout_state),
    corpus_versions: normalizeStringList(entry.corpus_versions),
    allowed_source_types: normalizeStringList(entry.allowed_source_types),
  };
}

function normalizeVerificationArtifact(rawArtifact) {
  const artifact = normalizeObject(rawArtifact);
  const payload = normalizeObject(artifact.payload);
  return {
    path: normalizeString(artifact.path),
    payload,
    bundle_id: normalizeString(artifact.bundle_id),
    subject_codes: normalizeStringList(artifact.subject_codes),
  };
}

function hasAll(values = [], expected = []) {
  const valueSet = new Set(normalizeStringList(values));
  return normalizeStringList(expected).every((item) => valueSet.has(item));
}

function summarizeOnlineEntries(entries = []) {
  const onlineEntries = entries.filter((entry) => entry.rollout_state === 'online_enabled');
  return {
    onlineEntries,
    online_bundle_ids: normalizeStringList(onlineEntries.map((entry) => entry.bundle_id)),
    online_subject_codes: normalizeStringList(onlineEntries.flatMap((entry) => entry.subject_codes)),
    online_corpus_versions: normalizeStringList(onlineEntries.flatMap((entry) => entry.corpus_versions)),
  };
}

function extractRuntimeAuditContract(verificationArtifact) {
  const runtimeAudit = normalizeObject(verificationArtifact.payload?.runtime_audit_contract);
  const promotedPath = normalizeObject(runtimeAudit.promoted_path);
  const controlPath = normalizeObject(runtimeAudit.control_path);
  const present = Object.keys(runtimeAudit).length > 0;
  return {
    present,
    promoted_path: normalizeString(promotedPath.status) || 'fail',
    control_path: normalizeString(controlPath.status) || 'fail',
  };
}

function findVerificationArtifactForEntry(entry, verificationArtifacts = []) {
  return verificationArtifacts.find((artifact) => {
    if (!artifact.path || !artifact.bundle_id || artifact.subject_codes.length === 0) return false;
    return artifact.bundle_id === entry.bundle_id
      && hasAll(artifact.subject_codes, entry.subject_codes)
      && hasAll(entry.subject_codes, artifact.subject_codes);
  }) || null;
}

function buildEntryEvaluation(entry, verificationArtifact) {
  if (!verificationArtifact) {
    return {
      bundle_id: entry.bundle_id,
      subject_codes: entry.subject_codes,
      corpus_versions: entry.corpus_versions,
      verification_artifact_path: null,
      verification_status: 'missing',
      target_promoted: false,
      control_blocked: false,
      evidence_reserved_blocked: false,
      s1_passed: false,
      s2_passed: false,
      runtime_audit_contract: {
        promoted_path: 'fail',
        control_path: 'fail',
      },
    };
  }

  const payload = verificationArtifact.payload;
  return {
    bundle_id: entry.bundle_id,
    subject_codes: entry.subject_codes,
    corpus_versions: entry.corpus_versions,
    verification_artifact_path: verificationArtifact.path,
    verification_status: normalizeString(payload.status) || 'unknown',
    target_promoted: payload.summary?.target_promoted === true,
    control_blocked: payload.summary?.control_blocked === true,
    evidence_reserved_blocked: payload.summary?.evidence_reserved_blocked === true,
    s1_passed: payload.summary?.s1_passed === true,
    s2_passed: payload.summary?.s2_passed === true,
    runtime_audit_contract: extractRuntimeAuditContract(verificationArtifact),
  };
}

function buildRollbackReasons({
  gateOk,
  onlineEntries = [],
  entryEvaluations = [],
  sourceArtifacts = {},
} = {}) {
  const reasons = [];
  if (gateOk !== true) reasons.push('rollout_gate_invalid');
  if (sourceArtifacts.rollout_gate?.exists === false) reasons.push('rollout_gate_source_missing');

  for (const entry of onlineEntries) {
    const evaluation = entryEvaluations.find((item) => item.bundle_id === entry.bundle_id) || null;
    if (!evaluation || evaluation.verification_artifact_path === null) {
      reasons.push(
        `online_entry_missing_verification_artifact_mapping:${entry.bundle_id}:${entry.subject_codes.join('|') || 'unknown'}`,
      );
      continue;
    }
    if (evaluation.runtime_audit_contract.present !== true) {
      reasons.push(`verification_artifact_missing_runtime_audit_contract:${entry.bundle_id}`);
    }
    if (evaluation.verification_status !== 'pass') reasons.push(`verification_status_not_pass:${entry.bundle_id}`);
    if (evaluation.target_promoted !== true) reasons.push(`target_not_promoted:${entry.bundle_id}`);
    if (evaluation.control_blocked !== true) reasons.push(`control_not_blocked:${entry.bundle_id}`);
    if (evaluation.evidence_reserved_blocked !== true) reasons.push(`evidence_reserved_not_blocked:${entry.bundle_id}`);
    if (evaluation.s1_passed !== true) reasons.push(`s1_verification_failed:${entry.bundle_id}`);
    if (evaluation.s2_passed !== true) reasons.push(`s2_verification_failed:${entry.bundle_id}`);
    if (evaluation.runtime_audit_contract.promoted_path !== 'pass') {
      reasons.push(`runtime_audit_contract_promoted_failed:${entry.bundle_id}`);
    }
    if (evaluation.runtime_audit_contract.control_path !== 'pass') {
      reasons.push(`runtime_audit_contract_control_failed:${entry.bundle_id}`);
    }
  }

  return normalizeStringList(reasons);
}

function aggregateAuditContract(onlineEntries = [], entryEvaluations = []) {
  if (onlineEntries.length === 0) {
    return {
      contract_source: 'route_audit.route_scores',
      evidence_source: 'focused_verification_artifact',
      promoted_path: 'not_applicable',
      control_path: 'not_applicable',
      promoted_field_names: [
        'production_evidence_rollout_active',
        'production_evidence_rollout_reason',
        'production_evidence_rollout_bundle_ids',
        'production_evidence_rollout_corpus_versions',
        'production_evidence_rollout_source_types',
        'final_execution_route',
        'query_mode',
      ],
      control_field_names: [
        'production_evidence_rollout_active',
        'production_evidence_rollout_reason',
        'production_evidence_rollout_bundle_ids',
        'production_evidence_rollout_corpus_versions',
        'production_evidence_rollout_source_types',
      ],
    };
  }

  const promotedStatuses = entryEvaluations.map((item) => item.runtime_audit_contract.promoted_path);
  const controlStatuses = entryEvaluations.map((item) => item.runtime_audit_contract.control_path);
  return {
    contract_source: 'route_audit.route_scores',
    evidence_source: 'verification_runtime_audit_excerpt',
    promoted_path: promotedStatuses.every((status) => status === 'pass') ? 'pass' : 'fail',
    control_path: controlStatuses.every((status) => status === 'pass') ? 'pass' : 'fail',
    promoted_field_names: [
      'production_evidence_rollout_active',
      'production_evidence_rollout_reason',
      'production_evidence_rollout_bundle_ids',
      'production_evidence_rollout_corpus_versions',
      'production_evidence_rollout_source_types',
      'final_execution_route',
      'query_mode',
    ],
    control_field_names: [
      'production_evidence_rollout_active',
      'production_evidence_rollout_reason',
      'production_evidence_rollout_bundle_ids',
      'production_evidence_rollout_corpus_versions',
      'production_evidence_rollout_source_types',
    ],
  };
}

export function buildProductionEvidenceRolloutStatus({
  rolloutGateArtifact = null,
  rolloutGate = null,
  verificationArtifacts = [],
  sourceArtifacts = {},
} = {}) {
  const gateArtifact = normalizeObject(rolloutGateArtifact);
  const gateEntries = Array.isArray(rolloutGate?.entries) ? rolloutGate.entries.map(normalizeEntry) : [];
  const verificationArtifactList = verificationArtifacts.map(normalizeVerificationArtifact);
  const gateOk = gateArtifact.ok === true;
  const onlineSummary = summarizeOnlineEntries(gateEntries);
  const entryEvaluations = onlineSummary.onlineEntries.map((entry) =>
    buildEntryEvaluation(entry, findVerificationArtifactForEntry(entry, verificationArtifactList)),
  );

  const rollbackReasons = buildRollbackReasons({
    gateOk,
    onlineEntries: onlineSummary.onlineEntries,
    entryEvaluations,
    sourceArtifacts,
  });
  const rollbackRequired = rollbackReasons.length > 0;
  const rolloutHealthy = onlineSummary.onlineEntries.length === 0 ? gateOk && rollbackRequired === false : rollbackRequired === false;
  const runtimeAuditContract = aggregateAuditContract(onlineSummary.onlineEntries, entryEvaluations);

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_rollout_status',
    source_artifacts: sourceArtifacts,
    online_bundle_ids: onlineSummary.online_bundle_ids,
    online_subject_codes: onlineSummary.online_subject_codes,
    online_corpus_versions: onlineSummary.online_corpus_versions,
    verification_mapping: {
      mode: 'explicit_verification_artifact_mapping',
      verification_artifact_paths: verificationArtifactList.map((artifact) => artifact.path).filter(Boolean),
      total_online_entries: onlineSummary.onlineEntries.length,
      mapped_online_entries: entryEvaluations.filter((item) => item.verification_artifact_path).length,
      unmapped_online_entries: entryEvaluations
        .filter((item) => !item.verification_artifact_path)
        .map((item) => ({
          bundle_id: item.bundle_id,
          subject_codes: item.subject_codes,
          corpus_versions: item.corpus_versions,
        })),
      detail_contract: 'single_rollout_fully_verified_multi_rollout_explicit_mapping_only',
    },
    rollouts: entryEvaluations,
    checks: {
      gate_ok: gateOk,
      target_promoted:
        onlineSummary.onlineEntries.length > 0 ? entryEvaluations.every((item) => item.target_promoted === true) : null,
      control_blocked:
        onlineSummary.onlineEntries.length > 0 ? entryEvaluations.every((item) => item.control_blocked === true) : null,
      evidence_reserved_blocked:
        onlineSummary.onlineEntries.length > 0
          ? entryEvaluations.every((item) => item.evidence_reserved_blocked === true)
          : null,
      s1_passed: onlineSummary.onlineEntries.length > 0 ? entryEvaluations.every((item) => item.s1_passed === true) : null,
      s2_passed: onlineSummary.onlineEntries.length > 0 ? entryEvaluations.every((item) => item.s2_passed === true) : null,
    },
    runtime_audit_contract: runtimeAuditContract,
    rollout_healthy: rolloutHealthy,
    rollback_required: rollbackRequired,
    rollback_reasons: rollbackReasons,
    recommended_action:
      onlineSummary.onlineEntries.length === 0 && rollbackRequired === false
        ? 'hold_offline'
        : rollbackRequired
          ? 'rollback_to_offline'
          : 'keep_online',
    status: rolloutHealthy ? 'pass' : 'fail',
  };
}

export function renderProductionEvidenceRolloutStatusReport(result = {}) {
  const lines = [
    '# Phase B Production Evidence Rollout Status',
    '',
    `- status: \`${result.status || 'unknown'}\``,
    `- rollout_healthy: \`${Boolean(result.rollout_healthy)}\``,
    `- rollback_required: \`${Boolean(result.rollback_required)}\``,
    `- recommended_action: \`${normalizeString(result.recommended_action) || 'unknown'}\``,
    `- online_bundle_ids: \`${normalizeStringList(result.online_bundle_ids).join(', ') || 'none'}\``,
    `- online_subject_codes: \`${normalizeStringList(result.online_subject_codes).join(', ') || 'none'}\``,
    `- online_corpus_versions: \`${normalizeStringList(result.online_corpus_versions).join(', ') || 'none'}\``,
    '',
    '## Verification Mapping',
    '',
    `- mode: \`${result.verification_mapping?.mode || 'unknown'}\``,
    `- mapped_online_entries: \`${Number(result.verification_mapping?.mapped_online_entries || 0)}\``,
    `- unmapped_online_entries: \`${Number(result.verification_mapping?.unmapped_online_entries?.length || 0)}\``,
    '',
    '## Checks',
    '',
    `- gate_ok: \`${result.checks?.gate_ok === null ? 'null' : Boolean(result.checks?.gate_ok)}\``,
    `- target_promoted: \`${result.checks?.target_promoted === null ? 'null' : Boolean(result.checks?.target_promoted)}\``,
    `- control_blocked: \`${result.checks?.control_blocked === null ? 'null' : Boolean(result.checks?.control_blocked)}\``,
    `- evidence_reserved_blocked: \`${result.checks?.evidence_reserved_blocked === null ? 'null' : Boolean(result.checks?.evidence_reserved_blocked)}\``,
    `- s1_passed: \`${result.checks?.s1_passed === null ? 'null' : Boolean(result.checks?.s1_passed)}\``,
    `- s2_passed: \`${result.checks?.s2_passed === null ? 'null' : Boolean(result.checks?.s2_passed)}\``,
    '',
    '## Runtime Audit Contract',
    '',
    `- runtime_audit_contract.promoted_path: \`${result.runtime_audit_contract?.promoted_path || 'unknown'}\``,
    `- runtime_audit_contract.control_path: \`${result.runtime_audit_contract?.control_path || 'unknown'}\``,
    `- contract_source: \`${result.runtime_audit_contract?.contract_source || 'unknown'}\``,
    '',
    '## Rollback Reasons',
    '',
  ];

  if (!Array.isArray(result.rollback_reasons) || result.rollback_reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of result.rollback_reasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push('', '## Online Rollouts', '');
  if (!Array.isArray(result.rollouts) || result.rollouts.length === 0) {
    lines.push('- none');
  } else {
    for (const rollout of result.rollouts) {
      lines.push(
        `- bundle_id=\`${rollout.bundle_id || 'unknown'}\` subject_codes=\`${normalizeStringList(
          rollout.subject_codes,
        ).join(', ') || 'none'}\` verification_artifact=\`${rollout.verification_artifact_path || 'missing'}\``,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}
