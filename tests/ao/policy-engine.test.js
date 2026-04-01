import { describe, expect, it } from '@jest/globals';

import { evaluatePolicyDecision } from '../../scripts/ao/lib/policy-engine.js';
import { createDefaultPolicyRules } from '../../scripts/ao/lib/policy-rules.js';
import { createRepoKnowledgeProfile } from '../../scripts/ao/lib/repo-knowledge-lint.js';
import { createCredentialProvenanceRecord } from '../../scripts/ao/lib/state-contracts.js';

const NOW = '2026-03-30T10:00:00.000Z';

function createGitHubCredentialProvenance() {
  return createCredentialProvenanceRecord({
    provenance_id: 'cred-gh-cli',
    credential_kind: 'github_token',
    source_kind: 'gh_cli_auth',
    scope: 'github.com',
    created_at: NOW,
    updated_at: NOW,
  });
}

function createRepoKnowledge(overrides = {}) {
  const profile = createRepoKnowledgeProfile({
    project_id: 'ciecopilot-home',
    profile_version: 1,
    generated_at: NOW,
    canonical_commands: {
      setup: [
        {
          command_id: 'setup.install_dependencies',
          command: 'npm install',
          source_ref: 'package.json',
        },
      ],
      verify: [
        {
          command_id: 'verify.test_run_in_band',
          command: 'npm test -- --runInBand',
          source_ref: 'package.json#scripts.test',
        },
      ],
      build: [
        {
          command_id: 'build.production_bundle',
          command: 'npm run build',
          source_ref: 'package.json#scripts.build',
        },
      ],
    },
    risky_surfaces: [
      {
        surface_id: 'workflow.github_workflows',
        kind: 'workflow',
        match_type: 'prefix',
        pattern: '.github/workflows/',
      },
      {
        surface_id: 'infra.terraform',
        kind: 'infra',
        match_type: 'prefix',
        pattern: 'terraform/',
      },
      {
        surface_id: 'secret.env_files',
        kind: 'secret',
        match_type: 'prefix',
        pattern: '.env',
      },
    ],
    runtime_hints: {
      runtime_ref: 'runtime.github_local',
      policy_ref: 'policy.operator_gated',
      node_engine: '>=18.0.0',
      package_manager: 'npm',
      test_runner: 'jest',
    },
  });

  return {
    schema_version: 'ao.repo-knowledge.v1alpha1',
    format: 'ao_repo_knowledge',
    project_id: 'ciecopilot-home',
    profile_version: 1,
    observed_at: NOW,
    replay_key: 'repo_knowledge:test',
    profile,
    lint: {
      schema_version: 'ao.repo-knowledge-lint.v1alpha1',
      format: 'ao_repo_knowledge_lint',
      status: 'pass',
      checked_at: NOW,
      findings: [],
    },
    ...overrides,
  };
}

describe('ao policy engine', () => {
  it('allows known low-risk tool and network inputs', () => {
    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-107',
        action_kind: 'continue_worker',
        action_class: 'continue_worker',
        task_risk: 'low',
        tools: ['gh', 'ao'],
        network_targets: ['github.com', 'api.github.com'],
      },
      rules: createDefaultPolicyRules(),
    });

    expect(decision).toMatchObject({
      decision: 'allow',
      policy_version: 'ao.policy.v2',
      governance_ref: {
        governance_version: 'ao.policy-governance.v2',
        policy_version: 'ao.policy.v2',
        replay_key: expect.stringMatching(/^policy_governance:/),
      },
      governance_status: 'current',
      governance_trace: {
        allowed: expect.arrayContaining([
          expect.objectContaining({
            input_kind: 'tool',
            value: 'ao',
            effect: 'allow',
            governance_ref: 'policy.tool.ao@ao.policy.v2',
          }),
          expect.objectContaining({
            input_kind: 'tool',
            value: 'gh',
            effect: 'allow',
            governance_ref: 'policy.tool.gh@ao.policy.v2',
          }),
          expect.objectContaining({
            input_kind: 'network',
            value: 'api.github.com',
            effect: 'allow',
            governance_ref: 'policy.network.api.github.com@ao.policy.v2',
          }),
        ]),
        denied: [],
        downgraded: [],
      },
      input: {
        tools: ['ao', 'gh'],
        network_targets: ['api.github.com', 'github.com'],
        file_paths: [],
        mcp_servers: [],
        secret_needs: [],
      },
    });
    expect(decision.findings).toEqual([]);
  });

  it('fails closed on unknown tool and unknown MCP server', () => {
    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-107',
        action_kind: 'unknown-tool',
        action_class: 'hold',
        tools: ['terraform'],
        mcp_servers: ['filesystem'],
      },
      rules: createDefaultPolicyRules(),
    });

    expect(decision.decision).toBe('deny');
    expect(decision.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown_tool',
        severity: 'deny',
        surface: 'tool',
        value: 'terraform',
        governance_ref: 'policy.tool_allowlist@ao.policy.v2',
      }),
      expect.objectContaining({
        code: 'unknown_mcp_server',
        severity: 'deny',
        surface: 'mcp_server',
        value: 'filesystem',
        governance_ref: 'policy.mcp_allowlist@ao.policy.v2',
      }),
    ]));
    expect(decision.governance_trace.denied).toEqual(expect.arrayContaining([
      expect.objectContaining({
        input_kind: 'tool',
        value: 'terraform',
        effect: 'deny',
        governance_ref: 'policy.tool_allowlist@ao.policy.v2',
      }),
      expect.objectContaining({
        input_kind: 'mcp_server',
        value: 'filesystem',
        effect: 'deny',
        governance_ref: 'policy.mcp_allowlist@ao.policy.v2',
      }),
    ]));
  });

  it('fails closed on unknown credential provenance for secret-bearing actions', () => {
    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-107',
        action_kind: 'review-secret',
        action_class: 'notify_human',
        tools: ['gh'],
        network_targets: ['api.github.com'],
        secret_needs: [
          {
            credential_kind: 'github_token',
            provenance_id: 'cred-missing',
          },
        ],
      },
      credentialProvenances: [],
      rules: createDefaultPolicyRules(),
    });

    expect(decision.decision).toBe('deny');
    expect(decision.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown_credential_provenance',
        severity: 'deny',
        surface: 'secret',
        value: 'github_token:cred-missing',
      }),
    ]));
  });

  it('allows secret-bearing actions when credential provenance is allowlisted', () => {
    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-107',
        action_kind: 'review-secret',
        action_class: 'notify_human',
        tools: ['gh'],
        network_targets: ['api.github.com'],
        secret_needs: [
          {
            credential_kind: 'github_token',
            provenance_id: 'cred-gh-cli',
          },
        ],
      },
      credentialProvenances: [createGitHubCredentialProvenance()],
      rules: createDefaultPolicyRules(),
    });

    expect(decision).toMatchObject({
      decision: 'allow',
      findings: [],
    });
    expect(decision.governance_trace.allowed).toEqual(expect.arrayContaining([
      expect.objectContaining({
        input_kind: 'secret_need',
        value: 'github_token:cred-gh-cli',
        effect: 'allow',
        governance_ref: 'credential_provenance.cred-gh-cli',
        related_governance_refs: ['policy.credential_source.github_token@ao.policy.v2'],
      }),
    ]));
  });

  it('fails closed on mismatched credential provenance governance records', () => {
    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-107',
        action_kind: 'review-secret',
        action_class: 'notify_human',
        tools: ['gh'],
        secret_needs: [
          {
            credential_kind: 'github_token',
            provenance_id: 'cred-gh-cli',
          },
        ],
      },
      credentialProvenances: [
        createCredentialProvenanceRecord({
          provenance_id: 'cred-gh-cli',
          credential_kind: 'openai_api_key',
          source_kind: 'operator_env',
          created_at: NOW,
          updated_at: NOW,
        }),
      ],
      rules: createDefaultPolicyRules(),
    });

    expect(decision.decision).toBe('deny');
    expect(decision.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'credential_kind_mismatch',
        severity: 'deny',
        surface: 'secret',
        value: 'github_token:cred-gh-cli',
        governance_ref: 'credential_provenance.cred-gh-cli',
        related_governance_refs: ['policy.credential_source.github_token@ao.policy.v2'],
      }),
    ]));
  });

  it('downgrades workflow, infra, and unallowlisted network surfaces', () => {
    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-107',
        action_kind: 'mutate-risky-surfaces',
        action_class: 'hold',
        tools: ['git'],
        file_paths: ['infra/main.tf', '.github/workflows/release.yml'],
        network_targets: ['registry.npmjs.org'],
      },
      rules: createDefaultPolicyRules(),
    });

    expect(decision.decision).toBe('downgrade');
    expect(decision.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'workflow_mutation_requires_review',
        severity: 'downgrade',
        surface: 'file',
        value: '.github/workflows/release.yml',
      }),
      expect.objectContaining({
        code: 'infra_mutation_requires_review',
        severity: 'downgrade',
        surface: 'file',
        value: 'infra/main.tf',
      }),
      expect.objectContaining({
        code: 'network_target_requires_review',
        severity: 'downgrade',
        surface: 'network',
        value: 'registry.npmjs.org',
      }),
    ]));
  });

  it('fails closed when repo knowledge does not label a risky file surface', () => {
    const repoKnowledge = createRepoKnowledge({
      profile: createRepoKnowledgeProfile({
        ...createRepoKnowledge().profile,
        risky_surfaces: [
          {
            surface_id: 'secret.env_files',
            kind: 'secret',
            match_type: 'prefix',
            pattern: '.env',
          },
        ],
      }),
    });

    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-119',
        action_kind: 'workflow-touch',
        action_class: 'hold',
        tools: ['git'],
        file_paths: ['.github/workflows/release.yml'],
      },
      repoKnowledge,
      rules: createDefaultPolicyRules(),
    });

    expect(decision).toMatchObject({
      decision: 'deny',
      repo_knowledge_ref: {
        project_id: 'ciecopilot-home',
        profile_version: 1,
        lint_status: 'pass',
      },
    });
    expect(decision.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown_risky_surface',
        severity: 'deny',
        surface: 'file',
        value: '.github/workflows/release.yml',
        governance_ref: 'policy.repo_knowledge_contract@ao.policy.v2',
      }),
    ]));
  });

  it('fails closed when repo-knowledge governance is stale', () => {
    const decision = evaluatePolicyDecision({
      input: {
        task_id: 'issue-130',
        action_kind: 'stale-governance',
        action_class: 'hold',
        tools: ['git'],
      },
      repoKnowledge: createRepoKnowledge({
        profile_version: 0,
        profile: {
          ...createRepoKnowledge().profile,
          profile_version: 0,
        },
      }),
      rules: createDefaultPolicyRules(),
    });

    expect(decision).toMatchObject({
      decision: 'deny',
      governance_status: 'stale',
      repo_knowledge_ref: {
        project_id: 'ciecopilot-home',
        profile_version: 0,
        lint_status: 'pass',
        governance_ref: 'repo_knowledge.ciecopilot-home@0',
      },
    });
    expect(decision.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'stale_repo_knowledge_governance',
        severity: 'deny',
        surface: 'repo_knowledge',
        value: 'ciecopilot-home@0',
        governance_ref: 'repo_knowledge.ciecopilot-home@0',
      }),
    ]));
  });

  it('is stable under replay for the same seeded state', () => {
    const input = {
      task_id: 'issue-107',
      action_kind: 'stable-replay',
      action_class: 'notify_human',
      task_risk: 'medium',
      tools: ['gh', 'ao', 'gh'],
      network_targets: ['github.com', 'api.github.com', 'github.com'],
      secret_needs: [
        {
          credential_kind: 'github_token',
          provenance_id: 'cred-gh-cli',
        },
      ],
    };

    const left = evaluatePolicyDecision({
      input,
      credentialProvenances: [createGitHubCredentialProvenance()],
      rules: createDefaultPolicyRules(),
    });
    const right = evaluatePolicyDecision({
      input: {
        ...input,
        tools: ['ao', 'gh'],
        network_targets: ['api.github.com', 'github.com'],
      },
      credentialProvenances: [createGitHubCredentialProvenance()],
      rules: createDefaultPolicyRules(),
    });

    expect(left).toEqual(right);
  });
});
