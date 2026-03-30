import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRunManageCommand = jest.fn();
const tempDirs = [];

jest.unstable_mockModule('../../scripts/ao/lib/manage-runner.js', () => ({
  DEFAULT_PROJECT_ID: 'ciecopilot-home',
  runManageCommand: mockRunManageCommand,
}));

const { runCli } = await import('../../scripts/ao-manage.js');

describe('ao manage cli', () => {
  beforeEach(() => {
    mockRunManageCommand.mockReset();
    mockRunManageCommand.mockResolvedValue({
      command: 'enroll',
      task: {
        task_id: 'issue-89',
        status: 'active',
      },
      prBinding: null,
      ownershipLease: null,
    });
    process.env.AO_SESSION_NAME = 'cie-50';
    process.env.AO_SESSION_ID = 'cie-50';
  });

  afterEach(() => {
    while (tempDirs.length) {
      fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
    }
  });

  it('parses enroll arguments and forwards them to the manage runner', async () => {
    const stdout = [];
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-manage-cli-'));
    tempDirs.push(tempRoot);
    const taskSpecPath = path.join(tempRoot, 'task-spec.md');
    fs.writeFileSync(taskSpecPath, '## Problem Type\nissue_delivery\n', 'utf8');

    const result = await runCli([
      'enroll',
      '--issue',
      '89',
      '--title',
      'Managed-task enrollment and shadow controller loop',
      '--branch',
      'feat/89',
      '--worktree',
      '/tmp/cie-50',
      '--task-spec-file',
      taskSpecPath,
      '--pr',
      '109',
      '--json',
    ], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockRunManageCommand).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'ciecopilot-home',
      command: 'enroll',
      issueNumber: 89,
      title: 'Managed-task enrollment and shadow controller loop',
      branchName: 'feat/89',
      worktreePath: '/tmp/cie-50',
      taskSpecBody: '## Problem Type\nissue_delivery\n',
      prNumber: 109,
      ownerSessionName: 'cie-50',
      ownerSessionId: 'cie-50',
      cwd: process.cwd(),
    }));
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      task: {
        task_id: 'issue-89',
      },
    });
  });

  it('rejects unsupported commands and invalid numeric arguments', async () => {
    const stderr = [];

    const invalidCommand = await runCli(['launch'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const invalidIssue = await runCli(['enroll', '--issue', 'abc'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(invalidCommand.exitCode).toBe(4);
    expect(invalidIssue.exitCode).toBe(4);
    expect(mockRunManageCommand).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Unsupported command');
    expect(stderr.join('')).toContain('Invalid value for --issue');
  });
});
