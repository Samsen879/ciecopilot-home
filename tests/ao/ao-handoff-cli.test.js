import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindRepoRoot = jest.fn();
const mockCreateStateRepository = jest.fn();
const mockCreateHandoffProtocol = jest.fn();

jest.unstable_mockModule('../../scripts/ao/lib/repo-root.js', () => ({
  findRepoRoot: mockFindRepoRoot,
}));

jest.unstable_mockModule('../../scripts/ao/lib/state-repository.js', () => ({
  createStateRepository: mockCreateStateRepository,
}));

jest.unstable_mockModule('../../scripts/ao/lib/handoff-protocol.js', () => ({
  createHandoffProtocol: mockCreateHandoffProtocol,
}));

const { runCli } = await import('../../scripts/ao-handoff.js');

describe('ao handoff cli', () => {
  beforeEach(() => {
    mockFindRepoRoot.mockReset();
    mockCreateStateRepository.mockReset();
    mockCreateHandoffProtocol.mockReset();

    mockFindRepoRoot.mockReturnValue('/repo');
    mockCreateStateRepository.mockReturnValue({ kind: 'repository' });
    mockCreateHandoffProtocol.mockReturnValue({
      requestHandoff: jest.fn().mockReturnValue({
        request_id: 'handoff-issue-117',
        task_id: 'issue-117',
        status: 'open',
        successor_session_name: 'cie-59',
      }),
      claimHandoff: jest.fn(),
      acceptHandoff: jest.fn(),
      rejectHandoff: jest.fn(),
      expireHandoff: jest.fn(),
      inspectTaskHandoff: jest.fn().mockReturnValue({
        task_id: 'issue-117',
        top_status: 'accepted',
        reason_codes: [],
      }),
      inspectAllHandoffs: jest.fn().mockReturnValue([]),
    });
  });

  it('dispatches request in JSON mode with explicit successor and operator surfaces', async () => {
    const stdout = [];

    const result = await runCli([
      'request',
      '--issue', '117',
      '--successor-session', 'cie-59',
      '--successor-session-id', 'cie-59',
      '--operator-session', 'operator-1',
      '--operator-session-id', 'operator-1',
      '--reason', 'owner_stale',
      '--json',
    ], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockCreateStateRepository).toHaveBeenCalledWith({
      repoRoot: '/repo',
      projectId: 'ciecopilot-home',
    });
    expect(mockCreateHandoffProtocol().requestHandoff).toHaveBeenCalledWith({
      taskId: null,
      issueNumber: 117,
      requestedBySessionName: null,
      requestedBySessionId: null,
      operatorSessionName: 'operator-1',
      operatorSessionId: 'operator-1',
      successorSessionName: 'cie-59',
      successorSessionId: 'cie-59',
      reason: 'owner_stale',
      requestId: null,
      claimId: null,
    });
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      request_id: 'handoff-issue-117',
      status: 'open',
    });
  });

  it('dispatches inspect against a task scope', async () => {
    const stdout = [];

    const result = await runCli(['inspect', '--issue', '117', '--json'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockCreateHandoffProtocol().inspectTaskHandoff).toHaveBeenCalledWith({
      taskId: null,
      issueNumber: 117,
      requestId: null,
    });
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      task_id: 'issue-117',
      top_status: 'accepted',
    });
  });

  it('rejects unsupported commands before touching the repo', async () => {
    const stderr = [];

    const result = await runCli(['bogus'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(result.exitCode).toBe(4);
    expect(mockFindRepoRoot).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Unsupported command');
  });
});
