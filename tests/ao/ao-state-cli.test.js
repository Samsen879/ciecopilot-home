import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLoadAoStateReport = jest.fn();
const mockRenderAoStateHumanSummary = jest.fn();

jest.unstable_mockModule('../../scripts/ao/lib/state-runner.js', () => ({
  DEFAULT_PROJECT_ID: 'ciecopilot-home',
  loadAoStateReport: mockLoadAoStateReport,
}));

jest.unstable_mockModule('../../scripts/ao/lib/state-report.js', () => ({
  renderAoStateHumanSummary: mockRenderAoStateHumanSummary,
}));

const { runCli } = await import('../../scripts/ao-state.js');

function buildReport(overrides = {}) {
  return {
    schema_version: 'ao.state.v1alpha1',
    report_format: 'ao_state_report',
    project_id: 'ciecopilot-home',
    bootstrapped: true,
    repo_root: '/home/samsen/code/ciecopilot-home',
    state_root: '/home/samsen/code/ciecopilot-home/.ao-control-plane/ciecopilot-home',
    summary: {
      managed_task_count: 1,
      pr_binding_count: 1,
      active_ownership_lease_count: 1,
      active_controller_lease_count: 1,
      action_count: 1,
      active_override_count: 1,
      controller_mode_count: 1,
      controller_modes: ['default=observe'],
      audit_entry_count: 8,
    },
    governance: {
      status: 'current',
      policy_version: 'ao.policy.v2',
      summary: {
        tool_allowlist_count: 9,
        mcp_allowlist_count: 1,
        credential_provenance_count: 1,
        provenance_gap_count: 0,
        unknown_tool_count: 0,
        unknown_mcp_server_count: 0,
        repo_knowledge_drift_count: 0,
      },
    },
    audit: {
      recent_entries: [],
    },
    ...overrides,
  };
}

describe('ao state cli', () => {
  beforeEach(() => {
    mockLoadAoStateReport.mockReset();
    mockRenderAoStateHumanSummary.mockReset();

    mockLoadAoStateReport.mockResolvedValue(buildReport());
    mockRenderAoStateHumanSummary.mockReturnValue('state_status: bootstrapped');
  });

  it('renders project-mode human summary output', async () => {
    const stdout = [];

    const result = await runCli([], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockLoadAoStateReport).toHaveBeenCalledWith({
      cwd: process.cwd(),
      projectId: 'ciecopilot-home',
      auditLimit: 5,
    });
    expect(stdout.join('')).toContain('state_status: bootstrapped');
  });

  it('renders JSON output with explicit audit limit', async () => {
    const stdout = [];

    const result = await runCli(['--json', '--audit-limit', '2'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockLoadAoStateReport).toHaveBeenCalledWith({
      cwd: process.cwd(),
      projectId: 'ciecopilot-home',
      auditLimit: 2,
    });
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      schema_version: 'ao.state.v1alpha1',
      governance: {
        status: 'current',
        policy_version: 'ao.policy.v2',
      },
      summary: {
        managed_task_count: 1,
      },
    });
  });

  it('rejects invalid audit-limit values and unknown flags before loading state', async () => {
    const stderr = [];

    const invalidAuditLimit = await runCli(['--audit-limit', '0'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const unknownArg = await runCli(['--bogus'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(invalidAuditLimit.exitCode).toBe(4);
    expect(unknownArg.exitCode).toBe(4);
    expect(mockLoadAoStateReport).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Invalid value for --audit-limit');
    expect(stderr.join('')).toContain('Unknown argument: --bogus');
  });

  it('rejects --project when the next token is another flag', async () => {
    const stderr = [];

    const result = await runCli(['--project', '--json'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(result.exitCode).toBe(4);
    expect(mockLoadAoStateReport).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Missing value for --project');
  });
});
