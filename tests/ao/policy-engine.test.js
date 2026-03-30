import { describe, expect, it } from '@jest/globals';

import { evaluatePolicyDecision } from '../../scripts/ao/lib/policy-engine.js';
import { createDefaultPolicyRules } from '../../scripts/ao/lib/policy-rules.js';
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
      policy_version: 'ao.policy.v1',
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
      }),
      expect.objectContaining({
        code: 'unknown_mcp_server',
        severity: 'deny',
        surface: 'mcp_server',
        value: 'filesystem',
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
