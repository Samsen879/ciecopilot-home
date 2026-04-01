import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';

import { createDefaultPolicyRules } from './policy-rules.js';
import {
  REPO_KNOWLEDGE_PROFILE_SCHEMA_VERSION,
  REPO_KNOWLEDGE_LINT_SCHEMA_VERSION,
  createRepoKnowledgeProfile,
  lintRepoKnowledge,
} from './repo-knowledge-lint.js';

export const REPO_KNOWLEDGE_SCHEMA_VERSION = 'ao.repo-knowledge.v1alpha1';
export const REPO_KNOWLEDGE_FORMAT = 'ao_repo_knowledge';
export const REPO_KNOWLEDGE_PROFILE_VERSION = 1;
export const REPO_KNOWLEDGE_DOC_PATH = path.join('docs', 'setup', 'AO_REPO_KNOWLEDGE.md');
export const REPO_KNOWLEDGE_REPORT_SCHEMA_VERSION = 'ao.repo-knowledge-report.v1alpha1';
export const REPO_KNOWLEDGE_REPORT_FORMAT = 'ao_repo_knowledge_report';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJsonValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeRequiredString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${fieldName}`);
  }

  return value.trim();
}

function normalizeOptionalString(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function normalizeIsoTimestamp(value, fieldName) {
  const normalized = normalizeRequiredString(value, fieldName);
  if (Number.isNaN(new Date(normalized).getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return normalized;
}

function normalizeNonNegativeInteger(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized >= 0 ? normalized : null;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function findRepoRoot(startCwd) {
  let currentPath = path.resolve(startCwd);

  while (true) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) return null;
    currentPath = parentPath;
  }
}

function buildReplayKey(snapshot) {
  return `repo_knowledge:${createHash('sha1').update(JSON.stringify({
    project_id: snapshot.project_id,
    profile_version: snapshot.profile_version,
    profile: {
      ...snapshot.profile,
      generated_at: null,
    },
    lint: {
      ...snapshot.lint,
      checked_at: null,
    },
  })).digest('hex')}`;
}

function resolveRepoKnowledgeSnapshot(repoKnowledge) {
  if (!isPlainObject(repoKnowledge)) return null;
  return isPlainObject(repoKnowledge.snapshot) ? repoKnowledge.snapshot : repoKnowledge;
}

export function buildRepoKnowledgeGovernanceRef({
  projectId,
  profileVersion,
} = {}) {
  const normalizedProjectId = normalizeOptionalString(projectId);
  const normalizedProfileVersion = normalizeNonNegativeInteger(profileVersion);
  if (!normalizedProjectId || normalizedProfileVersion == null) return null;
  return `repo_knowledge.${normalizedProjectId}@${normalizedProfileVersion}`;
}

function buildRepoKnowledgeCommandGovernanceRef({
  projectId,
  profileVersion,
  commandId,
} = {}) {
  const normalizedProjectId = normalizeOptionalString(projectId);
  const normalizedProfileVersion = normalizeNonNegativeInteger(profileVersion);
  const normalizedCommandId = normalizeOptionalString(commandId);
  if (!normalizedProjectId || normalizedProfileVersion == null || !normalizedCommandId) return null;
  return `repo_knowledge.${normalizedProjectId}.command.${normalizedCommandId}@${normalizedProfileVersion}`;
}

function buildRepoKnowledgeRiskSurfaceGovernanceRef({
  projectId,
  profileVersion,
  surfaceId,
} = {}) {
  const normalizedProjectId = normalizeOptionalString(projectId);
  const normalizedProfileVersion = normalizeNonNegativeInteger(profileVersion);
  const normalizedSurfaceId = normalizeOptionalString(surfaceId);
  if (!normalizedProjectId || normalizedProfileVersion == null || !normalizedSurfaceId) return null;
  return `repo_knowledge.${normalizedProjectId}.risky_surface.${normalizedSurfaceId}@${normalizedProfileVersion}`;
}

function deriveCanonicalCommands(packageJson = {}) {
  const scripts = isPlainObject(packageJson?.scripts) ? packageJson.scripts : {};
  return {
    setup: [
      {
        command_id: 'setup.install_dependencies',
        command: 'npm install',
        source_ref: 'package.json',
      },
    ],
    verify: typeof scripts.test === 'string'
      ? [
          {
            command_id: 'verify.test_run_in_band',
            command: 'npm test -- --runInBand',
            source_ref: 'package.json#scripts.test',
          },
        ]
      : [],
    build: typeof scripts.build === 'string'
      ? [
          {
            command_id: 'build.production_bundle',
            command: 'npm run build',
            source_ref: 'package.json#scripts.build',
          },
        ]
      : [],
  };
}

function deriveRiskySurfaces() {
  return [
    {
      surface_id: 'workflow.github_workflows',
      kind: 'workflow',
      match_type: 'prefix',
      pattern: '.github/workflows/',
    },
    {
      surface_id: 'infra.github_actions',
      kind: 'infra',
      match_type: 'prefix',
      pattern: '.github/actions/',
    },
    {
      surface_id: 'infra.infrastructure_dir',
      kind: 'infra',
      match_type: 'prefix',
      pattern: 'infra/',
    },
    {
      surface_id: 'infra.pulumi',
      kind: 'infra',
      match_type: 'prefix',
      pattern: 'pulumi/',
    },
    {
      surface_id: 'infra.terraform',
      kind: 'infra',
      match_type: 'prefix',
      pattern: 'terraform/',
    },
    {
      surface_id: 'infra.terraform_files',
      kind: 'infra',
      match_type: 'suffix',
      pattern: '.tf',
    },
    {
      surface_id: 'infra.terraform_vars',
      kind: 'infra',
      match_type: 'suffix',
      pattern: '.tfvars',
    },
    {
      surface_id: 'secret.env_files',
      kind: 'secret',
      match_type: 'prefix',
      pattern: '.env',
    },
    {
      surface_id: 'secret.named_env_files',
      kind: 'secret',
      match_type: 'prefix',
      pattern: '.env.',
    },
    {
      surface_id: 'secret.pem_files',
      kind: 'secret',
      match_type: 'suffix',
      pattern: '.pem',
    },
    {
      surface_id: 'secret.pkcs12_files',
      kind: 'secret',
      match_type: 'suffix',
      pattern: '.p12',
    },
    {
      surface_id: 'secret.pfx_files',
      kind: 'secret',
      match_type: 'suffix',
      pattern: '.pfx',
    },
    {
      surface_id: 'secret.key_files',
      kind: 'secret',
      match_type: 'suffix',
      pattern: '.key',
    },
  ];
}

function deriveRuntimeHints(packageJson = {}) {
  const engines = isPlainObject(packageJson?.engines) ? packageJson.engines : {};
  return {
    runtime_ref: 'runtime.github_local',
    policy_ref: 'policy.operator_gated',
    node_engine: normalizeOptionalString(engines.node),
    package_manager: 'npm',
    test_runner: 'jest',
    npm_engine: normalizeOptionalString(engines.npm),
  };
}

function extractJsonBlock(markdown) {
  const marker = '<!-- ao:repo-knowledge-contract -->';
  const markerIndex = markdown.indexOf(marker);
  if (markerIndex < 0) return null;

  const afterMarker = markdown.slice(markerIndex + marker.length);
  const match = afterMarker.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;

  return match[1].trim();
}

export function extractRepoKnowledgeDocContract(markdown) {
  const jsonText = extractJsonBlock(String(markdown ?? ''));
  if (!jsonText) return null;

  return JSON.parse(jsonText);
}

export function renderRepoKnowledgeDocContract(contract) {
  return [
    '<!-- ao:repo-knowledge-contract -->',
    '```json',
    JSON.stringify(contract, null, 2),
    '```',
  ].join('\n');
}

export function createRepoKnowledgeSnapshot({
  project_id,
  profile_version,
  observed_at,
  profile,
  lint,
} = {}) {
  const normalizedProfile = createRepoKnowledgeProfile(profile);
  const normalizedLint = {
    schema_version: normalizeRequiredString(lint?.schema_version, 'lint.schema_version'),
    format: normalizeRequiredString(lint?.format, 'lint.format'),
    status: normalizeRequiredString(lint?.status, 'lint.status'),
    checked_at: normalizeIsoTimestamp(lint?.checked_at, 'lint.checked_at'),
    findings: Array.isArray(lint?.findings) ? cloneJsonValue(lint.findings) : [],
  };

  const snapshot = {
    schema_version: REPO_KNOWLEDGE_SCHEMA_VERSION,
    format: REPO_KNOWLEDGE_FORMAT,
    project_id: normalizeRequiredString(project_id, 'project_id'),
    profile_version: normalizePositiveInteger(profile_version, 'profile_version'),
    observed_at: normalizeIsoTimestamp(observed_at, 'observed_at'),
    profile: normalizedProfile,
    lint: normalizedLint,
  };

  return {
    ...snapshot,
    replay_key: buildReplayKey(snapshot),
  };
}

export function buildRepoKnowledgeRef(repoKnowledge) {
  const snapshot = resolveRepoKnowledgeSnapshot(repoKnowledge);
  if (!isPlainObject(snapshot)) return null;
  const profileVersion = normalizeNonNegativeInteger(snapshot.profile_version);
  if (profileVersion == null) return null;
  return {
    project_id: normalizeRequiredString(snapshot.project_id, 'project_id'),
    profile_version: profileVersion,
    lint_status: normalizeRequiredString(snapshot?.lint?.status, 'lint.status'),
    governance_ref: buildRepoKnowledgeGovernanceRef({
      projectId: snapshot.project_id,
      profileVersion,
    }),
  };
}

export function listRepoKnowledgeCommands(repoKnowledge, surface) {
  const snapshot = resolveRepoKnowledgeSnapshot(repoKnowledge);
  if (!isPlainObject(snapshot?.profile?.canonical_commands)) return [];
  return cloneJsonValue(snapshot.profile.canonical_commands[surface] ?? []);
}

export function listRepoKnowledgeGovernanceSurfaces(repoKnowledge) {
  const snapshot = resolveRepoKnowledgeSnapshot(repoKnowledge);
  if (!isPlainObject(snapshot?.profile)) {
    return {
      command_refs: [],
      risky_surface_refs: [],
    };
  }

  const projectId = snapshot.project_id;
  const profileVersion = snapshot.profile_version;
  const commandRefs = Object.values(snapshot.profile.canonical_commands ?? {})
    .flatMap((commands) => commands ?? [])
    .map((command) => ({
      governance_ref: buildRepoKnowledgeCommandGovernanceRef({
        projectId,
        profileVersion,
        commandId: command.command_id,
      }),
      command_id: command.command_id,
      command: command.command,
      source_ref: command.source_ref,
    }))
    .filter((record) => record.governance_ref != null);
  const riskySurfaceRefs = (snapshot.profile.risky_surfaces ?? [])
    .map((surface) => ({
      governance_ref: buildRepoKnowledgeRiskSurfaceGovernanceRef({
        projectId,
        profileVersion,
        surfaceId: surface.surface_id,
      }),
      surface_id: surface.surface_id,
      kind: surface.kind,
      match_type: surface.match_type,
      pattern: surface.pattern,
    }))
    .filter((record) => record.governance_ref != null);

  return {
    command_refs: commandRefs,
    risky_surface_refs: riskySurfaceRefs,
  };
}

export function classifyRepoKnowledgeRisk(filePath, repoKnowledge) {
  const snapshot = resolveRepoKnowledgeSnapshot(repoKnowledge);
  const normalizedPath = normalizeOptionalString(filePath)?.replaceAll('\\', '/').replace(/^\.\//, '') ?? null;
  if (!normalizedPath) return null;

  for (const surface of snapshot?.profile?.risky_surfaces ?? []) {
    if (surface.match_type === 'prefix' && normalizedPath.startsWith(surface.pattern)) {
      return surface;
    }
    if (surface.match_type === 'suffix' && normalizedPath.endsWith(surface.pattern)) {
      return surface;
    }
  }

  return null;
}

export function inspectRepoKnowledgeRecordState(record) {
  const snapshot = resolveRepoKnowledgeSnapshot(record);
  if (!isPlainObject(snapshot)) {
    return {
      status: 'missing',
      findings: [
        {
          code: 'missing_repo_knowledge',
          severity: 'error',
          surface: 'repo_knowledge',
          value: 'missing',
          detail: null,
        },
      ],
    };
  }

  const findings = [];
  const topLevelProfileVersion = Number(record?.profile_version ?? snapshot.profile_version ?? 0);
  const topLevelLintStatus = normalizeOptionalString(record?.lint_status ?? snapshot?.lint?.status ?? null);
  const mixedVersion = snapshot.schema_version !== REPO_KNOWLEDGE_SCHEMA_VERSION
    || snapshot.profile?.schema_version == null
    || snapshot.profile.schema_version !== REPO_KNOWLEDGE_PROFILE_SCHEMA_VERSION
    || snapshot.lint?.schema_version !== REPO_KNOWLEDGE_LINT_SCHEMA_VERSION
    || (topLevelLintStatus != null && topLevelLintStatus !== snapshot.lint?.status)
    || (Number.isInteger(topLevelProfileVersion) && snapshot.profile_version !== topLevelProfileVersion);
  if (mixedVersion) {
    findings.push({
      code: 'mixed_repo_knowledge_schema_version',
      severity: 'error',
      surface: 'repo_knowledge',
      value: snapshot.schema_version ?? 'unknown',
      detail: null,
    });
  }

  if (topLevelProfileVersion !== REPO_KNOWLEDGE_PROFILE_VERSION) {
    findings.push({
      code: 'stale_repo_knowledge_profile',
      severity: 'error',
      surface: 'repo_knowledge',
      value: String(topLevelProfileVersion || 'unknown'),
      detail: null,
    });
  }

  if (snapshot.lint?.status !== 'pass') {
    findings.push({
      code: 'repo_knowledge_lint_failed',
      severity: 'error',
      surface: 'repo_knowledge',
      value: snapshot.lint?.status ?? 'missing',
      detail: null,
    });
  }

  if (findings.some((finding) => finding.code === 'mixed_repo_knowledge_schema_version')) {
    return {
      status: 'mixed_version',
      findings,
    };
  }

  if (findings.some((finding) => finding.code === 'stale_repo_knowledge_profile')) {
    return {
      status: 'stale',
      findings,
    };
  }

  if (findings.length > 0) {
    return {
      status: 'fail_closed',
      findings,
    };
  }

  return {
    status: 'current',
    findings: [],
  };
}

export function materializeRepoKnowledge({
  repoRoot,
  projectId,
  now = new Date().toISOString(),
} = {}) {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const docPath = path.join(repoRoot, REPO_KNOWLEDGE_DOC_PATH);
  const packageJson = fs.existsSync(packageJsonPath) ? readJsonFile(packageJsonPath) : {};
  const documentationContract = fs.existsSync(docPath)
    ? extractRepoKnowledgeDocContract(readTextFile(docPath))
    : null;
  const profile = createRepoKnowledgeProfile({
    project_id: projectId,
    profile_version: REPO_KNOWLEDGE_PROFILE_VERSION,
    generated_at: normalizeIsoTimestamp(now, 'now'),
    canonical_commands: deriveCanonicalCommands(packageJson),
    risky_surfaces: deriveRiskySurfaces(createDefaultPolicyRules()),
    runtime_hints: deriveRuntimeHints(packageJson),
  });
  const lint = lintRepoKnowledge({
    profile,
    packageJson,
    documentationContract,
    policyRules: createDefaultPolicyRules(),
    now,
  });

  return createRepoKnowledgeSnapshot({
    project_id: projectId,
    profile_version: REPO_KNOWLEDGE_PROFILE_VERSION,
    observed_at: normalizeIsoTimestamp(now, 'now'),
    profile,
    lint,
  });
}

function formatList(values) {
  if (!values?.length) return 'none';
  return values.join(', ');
}

export function renderRepoKnowledgeHumanSummary(report) {
  const governance = report.governance ?? {
    status: report.inspection?.status ?? 'missing',
    policy_version: null,
    risky_surface_refs: [],
    command_refs: [],
  };
  const findings = (report.snapshot?.lint?.findings ?? []).map((finding) => `${finding.code}:${finding.value}`);
  return [
    `repo_knowledge_status: ${report.inspection.status}`,
    `project_id: ${report.project_id}`,
    `profile_version: ${report.snapshot?.profile_version ?? 'missing'}`,
    `lint_status: ${report.snapshot?.lint?.status ?? 'missing'}`,
    `setup_commands: ${formatList((report.snapshot?.profile?.canonical_commands?.setup ?? []).map((item) => item.command))}`,
    `verify_commands: ${formatList((report.snapshot?.profile?.canonical_commands?.verify ?? []).map((item) => item.command))}`,
    `build_commands: ${formatList((report.snapshot?.profile?.canonical_commands?.build ?? []).map((item) => item.command))}`,
    `lint_findings: ${formatList(findings)}`,
    `governance_status: ${governance.status}`,
    `governance_policy_version: ${governance.policy_version ?? 'missing'}`,
    `governance_command_refs: ${formatList(governance.command_refs.map((item) => item.governance_ref))}`,
    `governance_risky_surfaces: ${formatList(governance.risky_surface_refs.map((item) => item.governance_ref))}`,
  ].join('\n');
}

export async function loadRepoKnowledgeReport({
  cwd = process.cwd(),
  repoRoot = null,
  projectId,
} = {}) {
  const resolvedRepoRoot = repoRoot ?? findRepoRoot(cwd);
  if (!resolvedRepoRoot) {
    throw new Error(`Could not locate repo root from ${cwd}`);
  }

  const { createStateRepository } = await import('./state-repository.js');
  const repository = createStateRepository({
    repoRoot: resolvedRepoRoot,
    projectId,
  });
  const record = repository.ensureRepoKnowledge();
  const inspection = inspectRepoKnowledgeRecordState(record);
  const governanceSurfaces = listRepoKnowledgeGovernanceSurfaces(record);
  const policyRules = createDefaultPolicyRules();

  return {
    schema_version: REPO_KNOWLEDGE_REPORT_SCHEMA_VERSION,
    report_format: REPO_KNOWLEDGE_REPORT_FORMAT,
    project_id: projectId,
    repo_root: resolvedRepoRoot,
    state_root: repository.getSnapshot().paths.stateRoot,
    snapshot: record.snapshot,
    record,
    inspection,
    governance: {
      status: inspection.status,
      policy_version: policyRules.policy_version,
      repo_knowledge_ref: buildRepoKnowledgeRef(record),
      command_refs: governanceSurfaces.command_refs,
      risky_surface_refs: governanceSurfaces.risky_surface_refs,
    },
  };
}
