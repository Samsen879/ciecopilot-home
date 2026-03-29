import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRunControllerLoop = jest.fn();

jest.unstable_mockModule('../../scripts/ao/lib/controller-loop.js', () => ({
  runControllerLoop: mockRunControllerLoop,
}));

const { runCli } = await import('../../scripts/ao-controller.js');

describe('ao controller cli', () => {
  beforeEach(() => {
    mockRunControllerLoop.mockReset();
    mockRunControllerLoop.mockResolvedValue({
      controller_id: 'default',
      mode: 'shadow',
      processed_task_count: 1,
      ingested_observation_count: 2,
      proposed_action_count: 2,
      task_results: [],
    });
  });

  it('parses controller mode and scope arguments', async () => {
    const stdout = [];

    const result = await runCli(['--mode', 'shadow', '--issue', '89', '--json'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockRunControllerLoop).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'ciecopilot-home',
      mode: 'shadow',
      issueNumber: 89,
      cwd: process.cwd(),
    }));
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      mode: 'shadow',
      proposed_action_count: 2,
    });
  });

  it('rejects invalid controller modes and invalid issue filters', async () => {
    const stderr = [];

    const invalidMode = await runCli(['--mode', 'assist'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const invalidIssue = await runCli(['--issue', 'abc'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(invalidMode.exitCode).toBe(4);
    expect(invalidIssue.exitCode).toBe(4);
    expect(mockRunControllerLoop).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Invalid value for --mode');
    expect(stderr.join('')).toContain('Invalid value for --issue');
  });
});
