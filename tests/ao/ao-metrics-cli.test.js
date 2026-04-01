import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLoadAoMetricsReport = jest.fn();
const mockPersistAoMetricsReport = jest.fn();
const mockRenderAoMetricsHumanSummary = jest.fn();

jest.unstable_mockModule('../../scripts/ao/lib/run-metrics.js', () => ({
  DEFAULT_PROJECT_ID: 'ciecopilot-home',
  loadAoMetricsReport: mockLoadAoMetricsReport,
  persistAoMetricsReport: mockPersistAoMetricsReport,
  renderAoMetricsHumanSummary: mockRenderAoMetricsHumanSummary,
}));

const { runCli } = await import('../../scripts/ao-metrics.js');

function buildReport(overrides = {}) {
  return {
    schema_version: 'ao.metrics-report.v1alpha1',
    report_format: 'ao_metrics_report',
    report_id: 'metrics-1',
    project_id: 'ciecopilot-home',
    repo_root: '/home/samsen/code/ciecopilot-home',
    generated_at: '2026-03-31T12:10:00.000Z',
    summary: {
      controller_run_count: 2,
      execution_attempt_count: 3,
      intervention_counts: {
        human_gate: 0,
        override: 1,
        explicit_resume: 1,
        successor_handoff: 0,
        policy_block: 1,
        preflight_block: 0,
      },
      failure_class_counts: {
        none: 1,
        policy_block: 1,
        worker_exit: 1,
      },
      retry_cause_counts: {
        none: 2,
        explicit_resume: 1,
        successor_handoff: 0,
        policy_retry: 0,
        preflight_retry: 0,
        unknown: 0,
      },
      action_visibility_counts: {
        proposed: 1,
        executed: 1,
        blocked: 1,
        denied: 1,
        downgraded: 0,
      },
      replay_decision_counts: {
        actions: {
          accepted: 1,
          replayed: 1,
          suppressed: 1,
          executed: 0,
          blocked: 0,
        },
        delivery_events: {
          accepted: 1,
          replayed: 1,
          suppressed: 0,
          executed: 0,
          blocked: 0,
        },
        controller_cursors: {
          accepted: 1,
          replayed: 0,
          suppressed: 1,
          executed: 0,
          blocked: 0,
        },
      },
      backpressure_status_counts: {
        actions: {
          open: 1,
          suppressed: 1,
          exhausted: 0,
        },
        delivery_events: {
          open: 2,
          suppressed: 0,
          exhausted: 0,
        },
        controller_cursors: {
          open: 0,
          suppressed: 1,
          exhausted: 0,
        },
      },
    },
    recent_traces: {
      controller_runs: [],
      execution_attempts: [],
    },
    ...overrides,
  };
}

describe('ao metrics cli', () => {
  beforeEach(() => {
    mockLoadAoMetricsReport.mockReset();
    mockPersistAoMetricsReport.mockReset();
    mockRenderAoMetricsHumanSummary.mockReset();

    mockLoadAoMetricsReport.mockResolvedValue(buildReport());
    mockPersistAoMetricsReport.mockReturnValue({
      report_path: '/tmp/.ao-control-plane/ciecopilot-home/metrics/reports/metrics-1.json',
      latest_report_path: '/tmp/.ao-control-plane/ciecopilot-home/metrics/latest.json',
      operator_report_path: '/tmp/ao-artifacts/ao-metrics/reports/metrics-1.json',
      operator_latest_report_path: '/tmp/ao-artifacts/ao-metrics/latest.json',
    });
    mockRenderAoMetricsHumanSummary.mockReturnValue('controller_runs: 2');
  });

  it('renders project-mode human summary output', async () => {
    const stdout = [];

    const result = await runCli([], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockLoadAoMetricsReport).toHaveBeenCalledWith({
      cwd: process.cwd(),
      projectId: 'ciecopilot-home',
      traceLimit: 5,
    });
    expect(mockPersistAoMetricsReport).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'ciecopilot-home',
      report: expect.objectContaining({
        report_id: 'metrics-1',
      }),
    }));
    expect(stdout.join('')).toContain('controller_runs: 2');
  });

  it('renders JSON output with an explicit trace limit and artifact paths', async () => {
    const stdout = [];

    const result = await runCli(['--json', '--limit', '2'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockLoadAoMetricsReport).toHaveBeenCalledWith({
      cwd: process.cwd(),
      projectId: 'ciecopilot-home',
      traceLimit: 2,
    });
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      report: {
        schema_version: 'ao.metrics-report.v1alpha1',
        summary: {
          controller_run_count: 2,
          execution_attempt_count: 3,
          action_visibility_counts: {
            blocked: 1,
          },
          replay_decision_counts: {
            actions: {
              replayed: 1,
            },
          },
        },
      },
      persisted: {
        operator_latest_report_path: '/tmp/ao-artifacts/ao-metrics/latest.json',
      },
    });
  });

  it('rejects invalid limit values and unknown flags before loading metrics', async () => {
    const stderr = [];

    const invalidLimit = await runCli(['--limit', '0'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const unknownArg = await runCli(['--bogus'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(invalidLimit.exitCode).toBe(4);
    expect(unknownArg.exitCode).toBe(4);
    expect(mockLoadAoMetricsReport).not.toHaveBeenCalled();
    expect(mockPersistAoMetricsReport).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Invalid value for --limit');
    expect(stderr.join('')).toContain('Unknown argument: --bogus');
  });

  it('rejects --project when the next token is another flag', async () => {
    const stderr = [];

    const result = await runCli(['--project', '--json'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(result.exitCode).toBe(4);
    expect(mockLoadAoMetricsReport).not.toHaveBeenCalled();
    expect(mockPersistAoMetricsReport).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Missing value for --project');
  });
});
