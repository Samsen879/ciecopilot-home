export const AO_POLICY_VERSION = 'ao.policy.v2';
export const AO_POLICY_GOVERNANCE_VERSION = 'ao.policy-governance.v2';

function cloneJsonValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultPolicyRules() {
  return cloneJsonValue({
    policy_version: AO_POLICY_VERSION,
    governance_version: AO_POLICY_GOVERNANCE_VERSION,
    allowed_tools: [
      'ao',
      'bash',
      'gh',
      'git',
      'jest',
      'node',
      'npm',
      'npx',
      'sh',
    ],
    allowed_tool_metadata: {
      ao: {
        label: 'AO CLI',
        rationale: 'Repo-local orchestrator coordination and lifecycle inspection.',
      },
      bash: {
        label: 'Bash',
        rationale: 'Shell entrypoint for repo-automation commands inside the managed worktree.',
      },
      gh: {
        label: 'GitHub CLI',
        rationale: 'Canonical GitHub inspection, review, and pull-request automation surface.',
      },
      git: {
        label: 'Git',
        rationale: 'Version-control mutations and inspection inside the managed repository.',
      },
      jest: {
        label: 'Jest',
        rationale: 'Focused AO verification runner for repo-local tests.',
      },
      node: {
        label: 'Node.js',
        rationale: 'Primary AO runtime and script execution environment.',
      },
      npm: {
        label: 'npm',
        rationale: 'Package-manager surface for dependency install and script execution.',
      },
      npx: {
        label: 'npx',
        rationale: 'Package-scoped command launcher when repo automation requires it.',
      },
      sh: {
        label: 'POSIX shell',
        rationale: 'Compatibility shell entrypoint for repo-local automation.',
      },
    },
    allowed_mcp_servers: [
      'github',
    ],
    allowed_mcp_server_metadata: {
      github: {
        label: 'GitHub MCP',
        rationale: 'Operator-auditable GitHub repository surface for AO review and state automation.',
      },
    },
    allowed_network_targets: [
      'api.github.com',
      'github.com',
    ],
    allowed_network_target_metadata: {
      'api.github.com': {
        rationale: 'GitHub API endpoint used by AO repo automation and status inspection.',
      },
      'github.com': {
        rationale: 'GitHub web and git host used by AO repo automation.',
      },
    },
    credential_source_allowlist: {
      github_token: ['ao_managed', 'gh_cli_auth', 'operator_env'],
      openai_api_key: ['ao_managed', 'operator_env'],
    },
    credential_source_metadata: {
      github_token: {
        rationale: 'GitHub actions require explicit trusted provenance before AO can rely on a token.',
      },
      openai_api_key: {
        rationale: 'OpenAI credentials are only trusted when AO manages them or the operator provides them explicitly.',
      },
    },
    workflow_prefixes: [
      '.github/workflows/',
    ],
    infra_prefixes: [
      '.github/actions/',
      'infra/',
      'pulumi/',
      'terraform/',
    ],
    infra_suffixes: [
      '.tf',
      '.tfvars',
    ],
    secret_prefixes: [
      '.env',
      '.env.',
    ],
    secret_suffixes: [
      '.pem',
      '.p12',
      '.pfx',
      '.key',
    ],
  });
}
