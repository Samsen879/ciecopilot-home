import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRunDoctor = jest.fn();
const mockBuildLifecycleReport = jest.fn();
const mockRenderLifecycleHumanSummary = jest.fn();

jest.unstable_mockModule('../../scripts/ao/lib/doctor-runner.js', () => ({
  DEFAULT_PROJECT_ID: 'ciecopilot-home',
  runDoctor: mockRunDoctor,
}));

jest.unstable_mockModule('../../scripts/ao/lib/lifecycle-engine.js', () => ({
  buildLifecycleReport: mockBuildLifecycleReport,
}));

jest.unstable_mockModule('../../scripts/ao/lib/lifecycle-report.js', () => ({
  renderLifecycleHumanSummary: mockRenderLifecycleHumanSummary,
}));

const { runCli } = await import('../../scripts/ao-lifecycle.js');

function buildReport(overrides = {}) {
  return {
    top_status: 'continue',
    source_health: {
      reconciliation: 'ok',
      doctor: 'ok',
    },
    routing_decision: {
      action: 'continue_current_worker',
      owner_session: 'cie-44',
      target_pr_number: 44,
      reason_codes: ['ownership_clear'],
      authoritative: true,
    },
    release_decision: {
      disposition: 'no_release_action',
      basis: [],
      authoritative: false,
    },
    findings: [],
    actions: [],
    ...overrides,
  };
}

describe('ao lifecycle cli', () => {
  beforeEach(() => {
    mockRunDoctor.mockReset();
    mockBuildLifecycleReport.mockReset();
    mockRenderLifecycleHumanSummary.mockReset();

    mockRunDoctor.mockResolvedValue({
      report: {
        top_status: 'healthy',
        findings: [],
        suggestions: [],
      },
    });
    mockBuildLifecycleReport.mockReturnValue(buildReport());
    mockRenderLifecycleHumanSummary.mockReturnValue('top_status: continue');
  });

  it('renders project-mode human summary output', async () => {
    const stdout = [];

    const result = await runCli([], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockRunDoctor).toHaveBeenCalledWith({
      projectId: 'ciecopilot-home',
      prNumber: null,
      cwd: process.cwd(),
    });
    expect(stdout.join('')).toContain('top_status: continue');
  });

  it('renders PR-mode JSON output with trigger parsing', async () => {
    mockBuildLifecycleReport.mockReturnValue(buildReport({
      top_status: 'hold',
    }));
    const stdout = [];

    const result = await runCli(['--pr', '44', '--trigger', 'ci_failed', '--json'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockRunDoctor).toHaveBeenCalledWith({
      projectId: 'ciecopilot-home',
      prNumber: 44,
      cwd: process.cwd(),
    });
    expect(mockBuildLifecycleReport).toHaveBeenCalledWith(expect.objectContaining({
      scope: expect.objectContaining({
        mode: 'pr',
        pr_number: 44,
        trigger: 'ci_failed',
      }),
    }));
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      top_status: 'hold',
    });
  });

  it('uses fixed strict exit-code mapping in human and JSON modes', async () => {
    mockBuildLifecycleReport
      .mockReturnValueOnce(buildReport({ top_status: 'observe' }))
      .mockReturnValueOnce(buildReport({ top_status: 'hold' }))
      .mockReturnValueOnce(buildReport({ top_status: 'handoff' }))
      .mockReturnValueOnce(buildReport({ top_status: 'human_gate' }))
      .mockReturnValueOnce(buildReport({ top_status: 'source_failure' }));

    const observeResult = await runCli(['--strict'], {
      writeStdout: () => {},
      writeStderr: () => {},
    });
    const holdResult = await runCli(['--strict'], {
      writeStdout: () => {},
      writeStderr: () => {},
    });
    const handoffResult = await runCli(['--strict'], {
      writeStdout: () => {},
      writeStderr: () => {},
    });
    const humanGateResult = await runCli(['--strict', '--json'], {
      writeStdout: () => {},
      writeStderr: () => {},
    });
    const sourceFailureResult = await runCli(['--strict'], {
      writeStdout: () => {},
      writeStderr: () => {},
    });

    expect(observeResult.exitCode).toBe(30);
    expect(holdResult.exitCode).toBe(31);
    expect(handoffResult.exitCode).toBe(32);
    expect(humanGateResult.exitCode).toBe(33);
    expect(sourceFailureResult.exitCode).toBe(34);
  });

  it('rejects invalid PR values, invalid triggers, and mixed scope flags before probes run', async () => {
    const stderr = [];

    const invalidPr = await runCli(['--pr', 'abc'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const invalidTrigger = await runCli(['--trigger', 'bad-trigger'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const mixedScope = await runCli(['--project', 'ciecopilot-home', '--pr', '44'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(invalidPr.exitCode).toBe(4);
    expect(invalidTrigger.exitCode).toBe(4);
    expect(mixedScope.exitCode).toBe(4);
    expect(mockRunDoctor).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Invalid value for --pr');
    expect(stderr.join('')).toContain('Invalid value for --trigger');
    expect(stderr.join('')).toContain('Cannot use --project and --pr together');
  });
});
