import { createHash } from 'node:crypto';

import { createDefaultPolicyRules } from './policy-rules.js';
import {
  buildRepoKnowledgeRef,
  classifyRepoKnowledgeRisk,
  inspectRepoKnowledgeRecordState,
  listRepoKnowledgeGovernanceSurfaces,
} from './repo-knowledge.js';

export const POLICY_DECISION_SCHEMA_VERSION = 'ao.policy-decision.v1alpha1';
export const POLICY_DECISION_FORMAT = 'ao_control_plane_policy_decision_result';
export const POLICY_GOVERNANCE_SCHEMA_VERSION = 'ao.policy-governance.v1alpha1';
export const POLICY_GOVERNANCE_FORMAT = 'ao_policy_governance_report';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJsonValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeOptionalString(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function normalizeFilePath(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return normalized.replaceAll('\\', '/').replace(/^\.\//, '');
}

function normalizeToolName(value) {
  const normalized = normalizeOptionalString(value);
  return normalized == null ? null : normalized.toLowerCase();
}

function normalizeMcpServerName(value) {
  const normalized = normalizeOptionalString(value);
  return normalized == null ? null : normalized.toLowerCase();
}

function normalizeNetworkTarget(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;

  try {
    if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(normalized)) {
      return new URL(normalized).hostname.toLowerCase();
    }
  } catch {
    return normalized.toLowerCase();
  }

  return normalized
    .replace(/^[^@]+@/, '')
    .split(/[/?#:]/)[0]
    .toLowerCase();
}

function normalizeSecretNeed(need) {
  if (!isPlainObject(need)) return null;

  const credentialKind = normalizeOptionalString(need.credential_kind);
  const provenanceId = normalizeOptionalString(need.provenance_id);
  if (!credentialKind || !provenanceId) return null;

  return {
    credential_kind: credentialKind,
    provenance_id: provenanceId,
  };
}

function uniqueSortedStrings(values, normalizer) {
  return [...new Set((values ?? [])
    .map((value) => normalizer(value))
    .filter((value) => value != null))]
    .sort((left, right) => left.localeCompare(right));
}

function uniqueSortedSecretNeeds(values) {
  const items = (values ?? [])
    .map((value) => normalizeSecretNeed(value))
    .filter((value) => value != null);
  const deduped = new Map();
  for (const item of items) {
    deduped.set(`${item.credential_kind}:${item.provenance_id}`, item);
  }
  return [...deduped.values()].sort((left, right) => {
    const leftKey = `${left.credential_kind}:${left.provenance_id}`;
    const rightKey = `${right.credential_kind}:${right.provenance_id}`;
    return leftKey.localeCompare(rightKey);
  });
}

function normalizePositiveInteger(value) {
  if (value == null) return null;
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function tokenizeCommand(command) {
  return String(command ?? '')
    .match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? [];
}

function stripQuotes(token) {
  return String(token).replace(/^['"]|['"]$/g, '');
}

function extractPrimaryTool(command) {
  const tokens = tokenizeCommand(command).map((token) => stripQuotes(token));
  while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(tokens[0])) {
    tokens.shift();
  }

  if (tokens[0] === 'env') {
    tokens.shift();
    while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(tokens[0])) {
      tokens.shift();
    }
  }

  return normalizeToolName(tokens[0]);
}

function extractNodeScriptPath(command) {
  const tokens = tokenizeCommand(command).map((token) => stripQuotes(token));
  if (normalizeToolName(tokens[0]) !== 'node') return null;
  if (tokens[1] == null || tokens[1].startsWith('-')) return null;
  return normalizeFilePath(tokens[1]);
}

function extractUrlHosts(command) {
  return uniqueSortedStrings(
    [...String(command ?? '').matchAll(/https?:\/\/[^\s'"]+/g)].map((match) => match[0]),
    normalizeNetworkTarget,
  );
}

function hashJson(value) {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

function buildFinding(
  code,
  severity,
  surface,
  value,
  detail = null,
  {
    governanceRef = null,
    relatedGovernanceRefs = [],
  } = {},
) {
  return {
    code,
    severity,
    surface,
    value,
    detail: normalizeOptionalString(detail),
    governance_ref: normalizeOptionalString(governanceRef),
    related_governance_refs: uniqueSortedStrings(
      relatedGovernanceRefs,
      normalizeOptionalString,
    ),
  };
}

function buildTraceEntry({
  inputKind,
  value,
  effect,
  governanceRef,
  detail = null,
  relatedGovernanceRefs = [],
} = {}) {
  return {
    input_kind: normalizeOptionalString(inputKind),
    value: normalizeOptionalString(value),
    effect: normalizeOptionalString(effect),
    governance_ref: normalizeOptionalString(governanceRef),
    detail: normalizeOptionalString(detail),
    related_governance_refs: uniqueSortedStrings(
      relatedGovernanceRefs,
      normalizeOptionalString,
    ),
  };
}

function sortTraceEntries(entries = []) {
  return [...entries].sort((left, right) => (
    `${left.effect}:${left.input_kind}:${left.value}`.localeCompare(
      `${right.effect}:${right.input_kind}:${right.value}`,
    )
  ));
}

function formatHumanList(values) {
  if (!values?.length) return 'none';
  return values.join(', ');
}

function classifyFilePath(filePath, rules) {
  const normalized = normalizeFilePath(filePath);
  if (!normalized) return 'ordinary';

  if ((rules.workflow_prefixes ?? []).some((prefix) => normalized.startsWith(prefix))) {
    return 'workflow';
  }

  if (
    (rules.infra_prefixes ?? []).some((prefix) => normalized.startsWith(prefix))
    || (rules.infra_suffixes ?? []).some((suffix) => normalized.endsWith(suffix))
  ) {
    return 'infra';
  }

  if (
    (rules.secret_prefixes ?? []).some((prefix) => normalized.startsWith(prefix))
    || (rules.secret_suffixes ?? []).some((suffix) => normalized.endsWith(suffix))
  ) {
    return 'secret';
  }

  return 'ordinary';
}

function buildDecisionSummary(decision, findings) {
  if (decision === 'allow') {
    return 'Allow seeded policy action.';
  }

  if (findings.length === 1) {
    return `${decision[0].toUpperCase()}${decision.slice(1)} action due to ${findings[0].code}.`;
  }

  return `${decision[0].toUpperCase()}${decision.slice(1)} action due to ${findings.length} policy findings.`;
}

function resolveActiveRules(rules) {
  const activeRules = createDefaultPolicyRules();
  const providedRules = isPlainObject(rules) ? rules : {};
  Object.assign(activeRules, cloneJsonValue(providedRules));
  return activeRules;
}

function buildPolicyScopedRef(suffix, policyVersion) {
  return `policy.${suffix}@${policyVersion}`;
}

function buildToolGovernanceRef(tool, rules) {
  return buildPolicyScopedRef(`tool.${tool}`, rules.policy_version);
}

function buildMcpGovernanceRef(server, rules) {
  return buildPolicyScopedRef(`mcp.${server}`, rules.policy_version);
}

function buildNetworkGovernanceRef(target, rules) {
  return buildPolicyScopedRef(`network.${target}`, rules.policy_version);
}

function buildCredentialSourceGovernanceRef(credentialKind, rules) {
  return buildPolicyScopedRef(`credential_source.${credentialKind}`, rules.policy_version);
}

function buildCredentialProvenanceGovernanceRef(provenanceId) {
  return `credential_provenance.${provenanceId}`;
}

function summarizeCredentialProvenances(records = []) {
  return sortTraceEntries(records
    .filter((record) => record?.provenance_id != null)
    .map((record) => buildTraceEntry({
      inputKind: 'credential_provenance',
      value: String(record.provenance_id),
      effect: record.trust_decision === 'trusted' ? 'allow' : 'deny',
      governanceRef: buildCredentialProvenanceGovernanceRef(record.provenance_id),
      detail: `${record.credential_kind}:${record.source_kind}`,
    })));
}

function summarizeRepoKnowledgeInspection(repoKnowledge, { requireRepoKnowledge = true } = {}) {
  if (repoKnowledge == null) {
    if (!requireRepoKnowledge) {
      return {
        status: 'current',
        findings: [],
      };
    }

    return {
      status: 'fail_closed',
      findings: [
        {
          code: 'missing_repo_knowledge_governance',
          severity: 'error',
          surface: 'repo_knowledge',
          value: 'missing',
          detail: null,
        },
      ],
    };
  }

  return inspectRepoKnowledgeRecordState(repoKnowledge);
}

function buildRepoKnowledgeRiskSurfaceMap(repoKnowledge) {
  const governanceSurfaces = listRepoKnowledgeGovernanceSurfaces(repoKnowledge);
  return new Map(governanceSurfaces.risky_surface_refs.map((surface) => ([
    `${surface.kind}:${surface.match_type}:${surface.pattern}`,
    surface,
  ])));
}

function summarizePolicyFindingCounts(policyDecisions = []) {
  const counts = {
    unknown_tool_count: 0,
    unknown_mcp_server_count: 0,
    provenance_gap_count: 0,
    repo_knowledge_drift_count: 0,
  };
  const provenanceGapCodes = new Set([
    'unknown_credential_provenance',
    'untrusted_credential_provenance',
    'credential_kind_mismatch',
    'credential_provenance_not_allowlisted',
  ]);
  const repoKnowledgeDriftCodes = new Set([
    'unknown_risky_surface',
    'repo_knowledge_invalid',
    'stale_repo_knowledge_governance',
    'mixed_repo_knowledge_governance',
  ]);

  for (const decision of policyDecisions ?? []) {
    for (const finding of decision?.findings ?? []) {
      if (finding?.code === 'unknown_tool') counts.unknown_tool_count += 1;
      if (finding?.code === 'unknown_mcp_server') counts.unknown_mcp_server_count += 1;
      if (provenanceGapCodes.has(finding?.code)) counts.provenance_gap_count += 1;
      if (repoKnowledgeDriftCodes.has(finding?.code)) counts.repo_knowledge_drift_count += 1;
    }
  }

  return counts;
}

export function normalizePolicyInput(input = {}) {
  const workflowPaths = uniqueSortedStrings(input.workflow_paths, normalizeFilePath);
  const filePaths = uniqueSortedStrings(
    [...(input.file_paths ?? []), ...workflowPaths],
    normalizeFilePath,
  );

  return {
    task_id: normalizeOptionalString(input.task_id),
    pr_number: normalizePositiveInteger(input.pr_number),
    action_kind: normalizeOptionalString(input.action_kind) ?? 'unknown_action',
    action_class: normalizeOptionalString(input.action_class) ?? 'unknown',
    task_risk: normalizeOptionalString(input.task_risk) ?? 'medium',
    tools: uniqueSortedStrings(input.tools, normalizeToolName),
    mcp_servers: uniqueSortedStrings(input.mcp_servers, normalizeMcpServerName),
    file_paths: filePaths,
    workflow_paths: workflowPaths,
    network_targets: uniqueSortedStrings(input.network_targets, normalizeNetworkTarget),
    secret_needs: uniqueSortedSecretNeeds(input.secret_needs),
  };
}

export function buildPolicyInputForAction({
  task,
  prNumber = null,
  action,
} = {}) {
  const explicitInputs = isPlainObject(action?.policy_inputs) ? action.policy_inputs : {};
  const toolSet = new Set(uniqueSortedStrings(explicitInputs.tools, normalizeToolName));
  const mcpServerSet = new Set(uniqueSortedStrings(explicitInputs.mcp_servers, normalizeMcpServerName));
  const filePathSet = new Set(uniqueSortedStrings(explicitInputs.file_paths, normalizeFilePath));
  const workflowPathSet = new Set(uniqueSortedStrings(explicitInputs.workflow_paths, normalizeFilePath));
  const networkTargetSet = new Set(uniqueSortedStrings(explicitInputs.network_targets, normalizeNetworkTarget));

  for (const command of action?.commands ?? []) {
    const tool = extractPrimaryTool(command);
    if (tool) {
      toolSet.add(tool);
      if (tool === 'gh') {
        networkTargetSet.add('api.github.com');
        networkTargetSet.add('github.com');
      }
    }

    const nodeScriptPath = extractNodeScriptPath(command);
    if (nodeScriptPath) {
      filePathSet.add(nodeScriptPath);
    }

    for (const host of extractUrlHosts(command)) {
      networkTargetSet.add(host);
    }
  }

  return normalizePolicyInput({
    ...explicitInputs,
    task_id: task?.task_id ?? explicitInputs.task_id ?? null,
    pr_number: prNumber ?? explicitInputs.pr_number ?? null,
    action_kind: action?.id ?? explicitInputs.action_kind ?? null,
    action_class: action?.action_class ?? explicitInputs.action_class ?? null,
    task_risk: task?.metadata?.task_risk ?? explicitInputs.task_risk ?? 'medium',
    tools: [...toolSet],
    mcp_servers: [...mcpServerSet],
    file_paths: [...filePathSet],
    workflow_paths: [...workflowPathSet],
    network_targets: [...networkTargetSet],
    secret_needs: explicitInputs.secret_needs ?? [],
  });
}

export function buildPolicyGovernanceReport({
  projectId = null,
  credentialProvenances = [],
  rules = createDefaultPolicyRules(),
  repoKnowledge = null,
  policyDecisions = [],
  requireRepoKnowledge = true,
} = {}) {
  const activeRules = resolveActiveRules(rules);
  const repoKnowledgeRef = buildRepoKnowledgeRef(repoKnowledge);
  const repoKnowledgeInspection = summarizeRepoKnowledgeInspection(repoKnowledge, {
    requireRepoKnowledge,
  });
  const repoKnowledgeGovernance = listRepoKnowledgeGovernanceSurfaces(repoKnowledge);
  const toolAllowlist = (activeRules.allowed_tools ?? []).map((tool) => ({
    governance_ref: buildToolGovernanceRef(tool, activeRules),
    tool,
    label: activeRules.allowed_tool_metadata?.[tool]?.label ?? tool,
    rationale: activeRules.allowed_tool_metadata?.[tool]?.rationale ?? null,
  }));
  const mcpAllowlist = (activeRules.allowed_mcp_servers ?? []).map((server) => ({
    governance_ref: buildMcpGovernanceRef(server, activeRules),
    server,
    label: activeRules.allowed_mcp_server_metadata?.[server]?.label ?? server,
    rationale: activeRules.allowed_mcp_server_metadata?.[server]?.rationale ?? null,
  }));
  const credentialPolicies = Object.entries(activeRules.credential_source_allowlist ?? {})
    .map(([credentialKind, allowedSources]) => ({
      governance_ref: buildCredentialSourceGovernanceRef(credentialKind, activeRules),
      credential_kind: credentialKind,
      allowed_sources: uniqueSortedStrings(allowedSources, normalizeOptionalString),
      rationale: activeRules.credential_source_metadata?.[credentialKind]?.rationale ?? null,
    }))
    .sort((left, right) => left.credential_kind.localeCompare(right.credential_kind));
  const policyDecisionCounts = summarizePolicyFindingCounts(policyDecisions);
  const mixedVersionPolicyDecisions = (policyDecisions ?? []).filter((decision) => (
    normalizeOptionalString(decision?.policy_version) != null
      && decision.policy_version !== activeRules.policy_version
  ));
  const missingGovernanceRefs = (policyDecisions ?? []).filter((decision) => (
    !isPlainObject(decision?.result?.governance_ref)
      || !isPlainObject(decision?.result?.governance_trace)
  ));
  const findings = [];
  const governanceContractRef = buildPolicyScopedRef('governance_contract', activeRules.policy_version);
  const repoKnowledgeContractRef = buildPolicyScopedRef('repo_knowledge_contract', activeRules.policy_version);

  for (const finding of repoKnowledgeInspection.findings ?? []) {
    findings.push({
      ...finding,
      governance_ref: repoKnowledgeRef?.governance_ref ?? repoKnowledgeContractRef,
    });
  }

  if (mixedVersionPolicyDecisions.length > 0) {
    findings.push({
      code: 'mixed_policy_version_state',
      severity: 'error',
      surface: 'policy',
      value: activeRules.policy_version,
      detail: `${mixedVersionPolicyDecisions.length} decision(s) still cite an older policy version.`,
      governance_ref: governanceContractRef,
    });
  }

  if (missingGovernanceRefs.length > 0) {
    findings.push({
      code: 'missing_policy_governance_reference',
      severity: 'error',
      surface: 'policy',
      value: String(missingGovernanceRefs.length),
      detail: 'Persisted policy decisions are missing governance refs or governance traces.',
      governance_ref: governanceContractRef,
    });
  }

  if (policyDecisionCounts.unknown_tool_count > 0) {
    findings.push({
      code: 'unknown_tool_seen',
      severity: 'warn',
      surface: 'tool',
      value: String(policyDecisionCounts.unknown_tool_count),
      detail: 'Policy decisions encountered unknown tools.',
      governance_ref: buildPolicyScopedRef('tool_allowlist', activeRules.policy_version),
    });
  }

  if (policyDecisionCounts.unknown_mcp_server_count > 0) {
    findings.push({
      code: 'unknown_mcp_server_seen',
      severity: 'warn',
      surface: 'mcp_server',
      value: String(policyDecisionCounts.unknown_mcp_server_count),
      detail: 'Policy decisions encountered unknown MCP servers.',
      governance_ref: buildPolicyScopedRef('mcp_allowlist', activeRules.policy_version),
    });
  }

  if (policyDecisionCounts.provenance_gap_count > 0) {
    findings.push({
      code: 'credential_provenance_gap_seen',
      severity: 'warn',
      surface: 'secret',
      value: String(policyDecisionCounts.provenance_gap_count),
      detail: 'Policy decisions encountered credential provenance gaps or mismatches.',
      governance_ref: buildPolicyScopedRef('credential_provenance_registry', activeRules.policy_version),
    });
  }

  if (policyDecisionCounts.repo_knowledge_drift_count > 0) {
    findings.push({
      code: 'repo_knowledge_drift_seen',
      severity: 'warn',
      surface: 'repo_knowledge',
      value: String(policyDecisionCounts.repo_knowledge_drift_count),
      detail: 'Policy decisions encountered repo-knowledge drift or missing risky-surface labels.',
      governance_ref: repoKnowledgeRef?.governance_ref ?? repoKnowledgeContractRef,
    });
  }

  let status = 'current';
  if (repoKnowledgeInspection.status === 'mixed_version' || mixedVersionPolicyDecisions.length > 0) {
    status = 'mixed_version';
  } else if (repoKnowledgeInspection.status === 'stale') {
    status = 'stale';
  } else if (
    repoKnowledgeInspection.status === 'fail_closed'
    || repoKnowledgeInspection.status === 'missing'
    || missingGovernanceRefs.length > 0
  ) {
    status = 'fail_closed';
  } else if (findings.length > 0) {
    status = 'attention';
  }

  return {
    schema_version: POLICY_GOVERNANCE_SCHEMA_VERSION,
    format: POLICY_GOVERNANCE_FORMAT,
    governance_ref: {
      governance_version: activeRules.governance_version,
      policy_version: activeRules.policy_version,
      replay_key: `policy_governance:${hashJson({
        policy_version: activeRules.policy_version,
        governance_version: activeRules.governance_version,
        project_id: projectId,
        repo_knowledge_ref: repoKnowledgeRef,
        tools: activeRules.allowed_tools,
        mcp_servers: activeRules.allowed_mcp_servers,
        credential_provenances: (credentialProvenances ?? []).map((record) => ({
          provenance_id: record?.provenance_id,
          credential_kind: record?.credential_kind,
          source_kind: record?.source_kind,
          trust_decision: record?.trust_decision,
          updated_at: record?.updated_at,
        })),
      })}`,
    },
    project_id: normalizeOptionalString(projectId) ?? repoKnowledgeRef?.project_id ?? null,
    status,
    policy_version: activeRules.policy_version,
    repo_knowledge_ref: repoKnowledgeRef,
    allowlists: {
      tools: toolAllowlist,
      mcp_servers: mcpAllowlist,
      credential_sources: credentialPolicies,
    },
    credential_provenances: summarizeCredentialProvenances(credentialProvenances),
    repo_knowledge: {
      status: repoKnowledgeInspection.status,
      command_refs: repoKnowledgeGovernance.command_refs,
      risky_surface_refs: repoKnowledgeGovernance.risky_surface_refs,
    },
    summary: {
      tool_allowlist_count: toolAllowlist.length,
      mcp_allowlist_count: mcpAllowlist.length,
      credential_provenance_count: (credentialProvenances ?? []).length,
      provenance_gap_count: policyDecisionCounts.provenance_gap_count,
      unknown_tool_count: policyDecisionCounts.unknown_tool_count,
      unknown_mcp_server_count: policyDecisionCounts.unknown_mcp_server_count,
      repo_knowledge_drift_count: (repoKnowledgeInspection.findings?.length ?? 0)
        + policyDecisionCounts.repo_knowledge_drift_count,
      mixed_version_policy_decision_count: mixedVersionPolicyDecisions.length,
      missing_governance_reference_count: missingGovernanceRefs.length,
    },
    findings,
  };
}

export function renderPolicyGovernanceHumanSummary(report) {
  const findings = (report.findings ?? []).map((finding) => `${finding.code}:${finding.value}`);
  return [
    `governance_status: ${report.status}`,
    `policy_version: ${report.policy_version}`,
    `repo_knowledge_status: ${report.repo_knowledge?.status ?? 'missing'}`,
    `tool_allowlist: ${formatHumanList((report.allowlists?.tools ?? []).map((item) => item.tool))}`,
    `mcp_allowlist: ${formatHumanList((report.allowlists?.mcp_servers ?? []).map((item) => item.server))}`,
    `credential_provenances: ${formatHumanList((report.credential_provenances ?? []).map((item) => item.value))}`,
    `unknown_tool_count: ${report.summary?.unknown_tool_count ?? 0}`,
    `unknown_mcp_server_count: ${report.summary?.unknown_mcp_server_count ?? 0}`,
    `provenance_gap_count: ${report.summary?.provenance_gap_count ?? 0}`,
    `repo_knowledge_drift_count: ${report.summary?.repo_knowledge_drift_count ?? 0}`,
    `governance_findings: ${formatHumanList(findings)}`,
  ].join('\n');
}

export function evaluatePolicyDecision({
  input,
  credentialProvenances = [],
  rules = createDefaultPolicyRules(),
  repoKnowledge = null,
} = {}) {
  const normalizedInput = normalizePolicyInput(input);
  const activeRules = resolveActiveRules(rules);
  const governanceReport = buildPolicyGovernanceReport({
    credentialProvenances,
    rules: activeRules,
    repoKnowledge,
    requireRepoKnowledge: false,
  });
  const allowedTools = new Set((activeRules.allowed_tools ?? []).map((value) => String(value).toLowerCase()));
  const allowedMcpServers = new Set((activeRules.allowed_mcp_servers ?? []).map((value) => String(value).toLowerCase()));
  const allowedNetworkTargets = new Set((activeRules.allowed_network_targets ?? []).map((value) => String(value).toLowerCase()));
  const credentialProvenanceMap = new Map((credentialProvenances ?? [])
    .filter((record) => record?.provenance_id != null)
    .map((record) => [String(record.provenance_id), record]));
  const repoKnowledgeRef = buildRepoKnowledgeRef(repoKnowledge);
  const repoKnowledgeInspection = summarizeRepoKnowledgeInspection(repoKnowledge, {
    requireRepoKnowledge: false,
  });
  const repoKnowledgeRiskSurfaceMap = buildRepoKnowledgeRiskSurfaceMap(repoKnowledge);
  const findings = [];
  const governanceTrace = {
    allowed: [],
    denied: [],
    downgraded: [],
  };
  const toolAllowlistRef = buildPolicyScopedRef('tool_allowlist', activeRules.policy_version);
  const mcpAllowlistRef = buildPolicyScopedRef('mcp_allowlist', activeRules.policy_version);
  const networkAllowlistRef = buildPolicyScopedRef('network_allowlist', activeRules.policy_version);
  const repoKnowledgeContractRef = buildPolicyScopedRef('repo_knowledge_contract', activeRules.policy_version);
  const credentialRegistryRef = buildPolicyScopedRef('credential_provenance_registry', activeRules.policy_version);

  if (repoKnowledgeInspection.status === 'mixed_version') {
    findings.push(buildFinding(
      'mixed_repo_knowledge_governance',
      'deny',
      'repo_knowledge',
      repoKnowledgeRef == null ? 'missing' : `${repoKnowledgeRef.project_id}@${repoKnowledgeRef.profile_version}`,
      null,
      {
        governanceRef: repoKnowledgeRef?.governance_ref ?? repoKnowledgeContractRef,
      },
    ));
  } else if (repoKnowledgeInspection.status === 'stale') {
    findings.push(buildFinding(
      'stale_repo_knowledge_governance',
      'deny',
      'repo_knowledge',
      repoKnowledgeRef == null ? 'missing' : `${repoKnowledgeRef.project_id}@${repoKnowledgeRef.profile_version}`,
      null,
      {
        governanceRef: repoKnowledgeRef?.governance_ref ?? repoKnowledgeContractRef,
      },
    ));
  } else if (repoKnowledgeRef?.lint_status && repoKnowledgeRef.lint_status !== 'pass') {
    findings.push(buildFinding(
      'repo_knowledge_invalid',
      'deny',
      'repo_knowledge',
      `${repoKnowledgeRef.project_id}@${repoKnowledgeRef.profile_version}`,
      null,
      {
        governanceRef: repoKnowledgeRef.governance_ref,
      },
    ));
  }

  for (const tool of normalizedInput.tools) {
    if (!allowedTools.has(tool)) {
      findings.push(buildFinding('unknown_tool', 'deny', 'tool', tool, null, {
        governanceRef: toolAllowlistRef,
      }));
      governanceTrace.denied.push(buildTraceEntry({
        inputKind: 'tool',
        value: tool,
        effect: 'deny',
        governanceRef: toolAllowlistRef,
      }));
      continue;
    }

    governanceTrace.allowed.push(buildTraceEntry({
      inputKind: 'tool',
      value: tool,
      effect: 'allow',
      governanceRef: buildToolGovernanceRef(tool, activeRules),
    }));
  }

  for (const server of normalizedInput.mcp_servers) {
    if (!allowedMcpServers.has(server)) {
      findings.push(buildFinding('unknown_mcp_server', 'deny', 'mcp_server', server, null, {
        governanceRef: mcpAllowlistRef,
      }));
      governanceTrace.denied.push(buildTraceEntry({
        inputKind: 'mcp_server',
        value: server,
        effect: 'deny',
        governanceRef: mcpAllowlistRef,
      }));
      continue;
    }

    governanceTrace.allowed.push(buildTraceEntry({
      inputKind: 'mcp_server',
      value: server,
      effect: 'allow',
      governanceRef: buildMcpGovernanceRef(server, activeRules),
    }));
  }

  for (const secretNeed of normalizedInput.secret_needs) {
    const credentialPolicyRef = buildCredentialSourceGovernanceRef(
      secretNeed.credential_kind,
      activeRules,
    );
    const provenance = credentialProvenanceMap.get(secretNeed.provenance_id) ?? null;
    if (!provenance) {
      findings.push(buildFinding(
        'unknown_credential_provenance',
        'deny',
        'secret',
        `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        null,
        {
          governanceRef: credentialRegistryRef,
          relatedGovernanceRefs: [credentialPolicyRef],
        },
      ));
      governanceTrace.denied.push(buildTraceEntry({
        inputKind: 'secret_need',
        value: `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        effect: 'deny',
        governanceRef: credentialRegistryRef,
        relatedGovernanceRefs: [credentialPolicyRef],
      }));
      continue;
    }

    const provenanceRef = buildCredentialProvenanceGovernanceRef(provenance.provenance_id);
    if (provenance.trust_decision !== 'trusted') {
      findings.push(buildFinding(
        'untrusted_credential_provenance',
        'deny',
        'secret',
        `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        null,
        {
          governanceRef: provenanceRef,
          relatedGovernanceRefs: [credentialPolicyRef],
        },
      ));
      governanceTrace.denied.push(buildTraceEntry({
        inputKind: 'secret_need',
        value: `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        effect: 'deny',
        governanceRef: provenanceRef,
        relatedGovernanceRefs: [credentialPolicyRef],
      }));
      continue;
    }

    if (provenance.credential_kind !== secretNeed.credential_kind) {
      findings.push(buildFinding(
        'credential_kind_mismatch',
        'deny',
        'secret',
        `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        null,
        {
          governanceRef: provenanceRef,
          relatedGovernanceRefs: [credentialPolicyRef],
        },
      ));
      governanceTrace.denied.push(buildTraceEntry({
        inputKind: 'secret_need',
        value: `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        effect: 'deny',
        governanceRef: provenanceRef,
        relatedGovernanceRefs: [credentialPolicyRef],
      }));
      continue;
    }

    const allowedSources = activeRules.credential_source_allowlist?.[secretNeed.credential_kind] ?? [];
    if (!allowedSources.includes(provenance.source_kind)) {
      findings.push(buildFinding(
        'credential_provenance_not_allowlisted',
        'deny',
        'secret',
        `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        null,
        {
          governanceRef: credentialPolicyRef,
          relatedGovernanceRefs: [provenanceRef],
        },
      ));
      governanceTrace.denied.push(buildTraceEntry({
        inputKind: 'secret_need',
        value: `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
        effect: 'deny',
        governanceRef: credentialPolicyRef,
        relatedGovernanceRefs: [provenanceRef],
      }));
      continue;
    }

    governanceTrace.allowed.push(buildTraceEntry({
      inputKind: 'secret_need',
      value: `${secretNeed.credential_kind}:${secretNeed.provenance_id}`,
      effect: 'allow',
      governanceRef: provenanceRef,
      relatedGovernanceRefs: [credentialPolicyRef],
    }));
  }

  for (const target of normalizedInput.network_targets) {
    if (!allowedNetworkTargets.has(target)) {
      findings.push(buildFinding(
        'network_target_requires_review',
        'downgrade',
        'network',
        target,
        null,
        {
          governanceRef: networkAllowlistRef,
        },
      ));
      governanceTrace.downgraded.push(buildTraceEntry({
        inputKind: 'network',
        value: target,
        effect: 'downgrade',
        governanceRef: networkAllowlistRef,
      }));
      continue;
    }

    governanceTrace.allowed.push(buildTraceEntry({
      inputKind: 'network',
      value: target,
      effect: 'allow',
      governanceRef: buildNetworkGovernanceRef(target, activeRules),
    }));
  }

  for (const filePath of normalizedInput.file_paths) {
    const classification = classifyFilePath(filePath, activeRules);
    const repoKnowledgeRiskSurface = classifyRepoKnowledgeRisk(filePath, repoKnowledge);
    const effectiveClassification = repoKnowledgeRiskSurface?.kind ?? classification;
    const repoRiskSurfaceRecord = repoKnowledgeRiskSurface == null
      ? null
      : repoKnowledgeRiskSurfaceMap.get(
          `${repoKnowledgeRiskSurface.kind}:${repoKnowledgeRiskSurface.match_type}:${repoKnowledgeRiskSurface.pattern}`,
        ) ?? null;
    if (
      repoKnowledgeRef != null
      && classification !== 'ordinary'
      && repoKnowledgeRiskSurface == null
    ) {
      findings.push(buildFinding(
        'unknown_risky_surface',
        'deny',
        'file',
        filePath,
        null,
        {
          governanceRef: repoKnowledgeContractRef,
        },
      ));
      governanceTrace.denied.push(buildTraceEntry({
        inputKind: 'file',
        value: filePath,
        effect: 'deny',
        governanceRef: repoKnowledgeContractRef,
      }));
      continue;
    }

    if (effectiveClassification === 'workflow') {
      const governanceRef = repoRiskSurfaceRecord?.governance_ref
        ?? buildPolicyScopedRef('workflow_surface', activeRules.policy_version);
      findings.push(buildFinding(
        'workflow_mutation_requires_review',
        'downgrade',
        'file',
        filePath,
        null,
        {
          governanceRef,
        },
      ));
      governanceTrace.downgraded.push(buildTraceEntry({
        inputKind: 'file',
        value: filePath,
        effect: 'downgrade',
        governanceRef,
      }));
      continue;
    }

    if (effectiveClassification === 'infra') {
      const governanceRef = repoRiskSurfaceRecord?.governance_ref
        ?? buildPolicyScopedRef('infra_surface', activeRules.policy_version);
      findings.push(buildFinding(
        'infra_mutation_requires_review',
        'downgrade',
        'file',
        filePath,
        null,
        {
          governanceRef,
        },
      ));
      governanceTrace.downgraded.push(buildTraceEntry({
        inputKind: 'file',
        value: filePath,
        effect: 'downgrade',
        governanceRef,
      }));
      continue;
    }

    if (effectiveClassification === 'secret') {
      const governanceRef = repoRiskSurfaceRecord?.governance_ref
        ?? buildPolicyScopedRef('secret_surface', activeRules.policy_version);
      findings.push(buildFinding(
        'secret_file_requires_review',
        'downgrade',
        'file',
        filePath,
        null,
        {
          governanceRef,
        },
      ));
      governanceTrace.downgraded.push(buildTraceEntry({
        inputKind: 'file',
        value: filePath,
        effect: 'downgrade',
        governanceRef,
      }));
    }
  }

  const decision = findings.some((finding) => finding.severity === 'deny')
    ? 'deny'
    : findings.some((finding) => finding.severity === 'downgrade')
      ? 'downgrade'
      : 'allow';

  return {
    schema_version: POLICY_DECISION_SCHEMA_VERSION,
    format: POLICY_DECISION_FORMAT,
    policy_version: activeRules.policy_version,
    governance_ref: governanceReport.governance_ref,
    governance_status: repoKnowledgeInspection.status,
    governance_trace: {
      allowed: sortTraceEntries(governanceTrace.allowed),
      denied: sortTraceEntries(governanceTrace.denied),
      downgraded: sortTraceEntries(governanceTrace.downgraded),
    },
    decision,
    summary: buildDecisionSummary(decision, findings),
    repo_knowledge_ref: repoKnowledgeRef,
    input: cloneJsonValue(normalizedInput),
    findings,
  };
}
