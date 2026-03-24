import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSpawnSync = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  spawnSync: mockSpawnSync,
}));

const { loadAoProjectObservation } = await import('../../scripts/ao/lib/ao-observation-source.js');

describe('ao observation source', () => {
  beforeEach(() => {
    mockSpawnSync.mockReset();
  });

  it('normalizes orchestrator and worker sessions from ao status json', async () => {
    mockSpawnSync.mockReturnValueOnce({
      status: 0,
      stdout: JSON.stringify({
        project: { id: 'ciecopilot-home' },
        sessions: [
          {
            name: 'cie-orchestrator',
            branch: 'runtime-post-pilot-0323-2239',
            role: 'orchestrator',
            updatedAt: '2026-03-24T10:00:00.000Z',
          },
          {
            name: 'cie-17',
            branch: 'feat/issue-44',
            prNumber: 44,
            role: 'worker',
            updatedAt: '2026-03-24T10:05:00.000Z',
          },
        ],
      }),
      stderr: '',
    });

    const observation = await loadAoProjectObservation({
      projectId: 'ciecopilot-home',
      now: '2026-03-24T10:10:00.000Z',
    });

    expect(observation.orchestrator.session_name).toBe('cie-orchestrator');
    expect(observation.workers[0]).toMatchObject({
      session_name: 'cie-17',
      pr_number: 44,
      freshness: {
        status: 'fresh',
        stale_after_ms: 900000,
      },
    });
  });

  it('marks old sessions stale using the frozen 15-minute threshold', async () => {
    mockSpawnSync.mockReturnValueOnce({
      status: 0,
      stdout: JSON.stringify({
        project: { id: 'ciecopilot-home' },
        sessions: [
          {
            name: 'cie-9',
            role: 'worker',
            updatedAt: '2026-03-24T09:30:00.000Z',
          },
        ],
      }),
      stderr: '',
    });

    const observation = await loadAoProjectObservation({
      projectId: 'ciecopilot-home',
      now: '2026-03-24T10:10:00.000Z',
    });

    expect(observation.workers[0].freshness.status).toBe('stale');
  });

  it('accepts top-level ao status arrays and current field names', async () => {
    mockSpawnSync.mockReturnValueOnce({
      status: 0,
      stdout: JSON.stringify([
        {
          name: 'cie-32',
          role: 'worker',
          branch: 'feat/62',
          prNumber: 74,
          issue: '62',
          status: 'mergeable',
          lastActivity: '10m ago',
        },
        {
          name: 'cie-orchestrator',
          role: 'orchestrator',
          branch: 'runtime-post-pilot-0323-2239',
          status: 'idle',
          lastActivity: '27m ago',
        },
      ]),
      stderr: '',
    });

    const observation = await loadAoProjectObservation({
      projectId: 'ciecopilot-home',
      now: '2026-03-24T10:10:00.000Z',
    });

    expect(observation.orchestrator).toMatchObject({
      session_name: 'cie-orchestrator',
      issue_number: null,
      pr_number: null,
      lifecycle_state: 'idle',
      freshness: {
        status: 'stale',
        stale_after_ms: 900000,
      },
    });
    expect(observation.workers[0]).toMatchObject({
      session_name: 'cie-32',
      branch_name: 'feat/62',
      pr_number: 74,
      issue_number: 62,
      lifecycle_state: 'mergeable',
      freshness: {
        status: 'fresh',
        stale_after_ms: 900000,
      },
    });
    expect(observation.raw_summary).toMatchObject({
      session_count: 2,
      orchestrator_count: 1,
      worker_count: 1,
      branch_count: 2,
      pr_count: 1,
    });
  });

  it('returns a source error when ao status fails', async () => {
    mockSpawnSync.mockReturnValueOnce({
      status: 1,
      stdout: '',
      stderr: 'ao unavailable',
    });

    const observation = await loadAoProjectObservation({
      projectId: 'ciecopilot-home',
      now: '2026-03-24T10:10:00.000Z',
    });

    expect(observation.source_ok).toBe(false);
    expect(observation.source_error).toMatch(/ao unavailable/);
  });

  it('surfaces multiple orchestrators without collapsing them', async () => {
    mockSpawnSync.mockReturnValueOnce({
      status: 0,
      stdout: JSON.stringify({
        project: { id: 'ciecopilot-home' },
        sessions: [
          { name: 'cie-orchestrator', role: 'orchestrator' },
          { name: 'cie-orchestrator-2', role: 'orchestrator' },
        ],
      }),
      stderr: '',
    });

    const observation = await loadAoProjectObservation({
      projectId: 'ciecopilot-home',
      now: '2026-03-24T10:10:00.000Z',
    });

    expect(observation.raw_summary.session_count).toBe(2);
    expect(observation.raw_summary.orchestrator_count).toBe(2);
    expect(observation.raw_summary.orchestrator_session_names).toEqual([
      'cie-orchestrator',
      'cie-orchestrator-2',
    ]);
    expect(observation.orchestrator.session_name).toBe('cie-orchestrator');
  });
});
