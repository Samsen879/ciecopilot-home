import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createControllerLease } from '../../scripts/ao/lib/state-contracts.js';
import { createStateRepository } from '../../scripts/ao/lib/state-repository.js';

const mockRunControllerLoop = jest.fn();
const originalAoSessionName = process.env.AO_SESSION_NAME;
const originalAoSessionId = process.env.AO_SESSION_ID;
const originalAoCallerType = process.env.AO_CALLER_TYPE;
const tempDirs = [];
const controllerScriptPath = fileURLToPath(new URL('../../scripts/ao-controller.js', import.meta.url));
const controllerScriptModuleUrl = pathToFileURL(controllerScriptPath).href;

jest.unstable_mockModule('../../scripts/ao/lib/controller-loop.js', () => ({
  runControllerLoop: mockRunControllerLoop,
}));

const { runCli } = await import('../../scripts/ao-controller.js');

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-controller-cli-'));
  fs.mkdirSync(path.join(repoRoot, '.git'));
  tempDirs.push(repoRoot);
  return repoRoot;
}

async function runRealController({
  repoRoot,
  args,
  env = {},
  stopAfterMs = 120,
  killAfterMs = 6000,
  readyPath = '',
} = {}) {
  const child = spawn(process.execPath, [
    '--input-type=module',
    '-e',
    `
import fs from 'node:fs';

const [moduleUrl, readyFilePath, stopAfterMsRaw, argsJson] = process.argv.slice(1);
const stopAfterMs = Number(stopAfterMsRaw);
const args = JSON.parse(argsJson);
const { runCli } = await import(moduleUrl);

async function requestStopWhenReady() {
  if (readyFilePath) {
    const deadlineMs = Date.now() + 5000;
    while (!fs.existsSync(readyFilePath) && Date.now() < deadlineMs) {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
  }

  await new Promise((resolve) => {
    setTimeout(resolve, stopAfterMs);
  });
  process.kill(process.pid, 'SIGTERM');
}

void requestStopWhenReady();
const { exitCode } = await runCli(args, {
  writeStdout: (text) => process.stdout.write(text),
  writeStderr: (text) => process.stderr.write(text),
});
process.exitCode = exitCode;
    `,
    controllerScriptModuleUrl,
    readyPath,
    String(stopAfterMs),
    JSON.stringify(args),
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const killTimer = setTimeout(() => {
    child.kill('SIGKILL');
  }, killAfterMs);

  try {
    const { exitCode, signal } = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code, closeSignal) => resolve({
        exitCode: code,
        signal: closeSignal,
      }));
    });
    return {
      exitCode,
      signal,
      stdout,
      stderr,
    };
  } finally {
    clearTimeout(killTimer);
  }
}

describe('ao controller cli', () => {
  beforeEach(() => {
    process.env.AO_SESSION_NAME = 'test-controller-holder';
    delete process.env.AO_SESSION_ID;
    process.env.AO_CALLER_TYPE = 'session';
    mockRunControllerLoop.mockReset();
    mockRunControllerLoop.mockResolvedValue({
      controller_id: 'default',
      mode: 'assist',
      processed_task_count: 1,
      ingested_observation_count: 2,
      proposed_action_count: 2,
      executed_action_count: 1,
      pass_count: 1,
      runtime_kind: 'oneshot',
      stop_reason: 'completed',
      task_results: [],
    });
  });

  afterEach(() => {
    process.env.AO_SESSION_NAME = originalAoSessionName;
    process.env.AO_SESSION_ID = originalAoSessionId;
    process.env.AO_CALLER_TYPE = originalAoCallerType;
    while (tempDirs.length) {
      fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
    }
  });

  it('parses controller mode and scope arguments', async () => {
    const stdout = [];

    const result = await runCli(['--mode', 'assist', '--issue', '89', '--json'], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockRunControllerLoop).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'ciecopilot-home',
      mode: 'assist',
      issueNumber: 89,
      cwd: process.cwd(),
    }));
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      mode: 'assist',
      proposed_action_count: 2,
      executed_action_count: 1,
    });
  });

  it('parses continuous runtime flags', async () => {
    const stdout = [];

    const result = await runCli([
      '--continuous',
      '--poll-interval-ms',
      '15000',
      '--shutdown-timeout-ms',
      '5000',
      '--json',
    ], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockRunControllerLoop).toHaveBeenCalledWith(expect.objectContaining({
      cwd: process.cwd(),
      continuous: true,
      pollIntervalMs: 15000,
      shutdownTimeoutMs: 5000,
    }));
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      runtime_kind: 'oneshot',
      pass_count: 1,
    });
  });

  it('parses an explicit manual holder identity', async () => {
    delete process.env.AO_SESSION_NAME;
    delete process.env.AO_SESSION_ID;
    const stdout = [];

    const result = await runCli([
      '--holder',
      'manual-controller',
      '--json',
    ], {
      writeStdout: (text) => stdout.push(text),
      writeStderr: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(mockRunControllerLoop).toHaveBeenCalledWith(expect.objectContaining({
      holderId: 'manual-controller',
    }));
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      controller_id: 'default',
    });
  });

  it('rejects invalid controller modes and invalid issue filters', async () => {
    const stderr = [];

    const invalidMode = await runCli(['--mode', 'launch'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const invalidIssue = await runCli(['--issue', 'abc'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });
    const invalidPollInterval = await runCli(['--continuous', '--poll-interval-ms', '0'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(invalidMode.exitCode).toBe(4);
    expect(invalidIssue.exitCode).toBe(4);
    expect(invalidPollInterval.exitCode).toBe(4);
    expect(mockRunControllerLoop).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Invalid value for --mode');
    expect(stderr.join('')).toContain('Invalid value for --issue');
    expect(stderr.join('')).toContain('Invalid value for --poll-interval-ms');
  });

  it('requires --holder for manual starts when AO env is unset', async () => {
    delete process.env.AO_SESSION_NAME;
    delete process.env.AO_SESSION_ID;
    const stderr = [];

    const result = await runCli(['--continuous'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(result.exitCode).toBe(4);
    expect(mockRunControllerLoop).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Manual controller runs require --holder');
  });

  it('treats missing flag values as normal parse errors', async () => {
    const stderr = [];

    const result = await runCli(['--mode'], {
      writeStdout: () => {},
      writeStderr: (text) => stderr.push(text),
    });

    expect(result.exitCode).toBe(4);
    expect(mockRunControllerLoop).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Missing value for --mode');
  });

  it('uses a live default clock for real continuous CLI runs so heartbeat advances over time', async () => {
    const repoRoot = createTempRepo();

    const result = await runRealController({
      repoRoot,
      args: [
        '--continuous',
        '--mode',
        'observe',
        '--poll-interval-ms',
        '25',
        '--shutdown-timeout-ms',
        '100',
        '--json',
      ],
      env: {
        AO_SESSION_NAME: 'cli-live-clock',
        AO_CALLER_TYPE: 'session',
      },
      stopAfterMs: 250,
      readyPath: path.join(
        repoRoot,
        '.ao-control-plane',
        'ciecopilot-home',
        'state.json',
      ),
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      controller_id: 'default',
      runtime_kind: 'continuous',
      stop_reason: 'stop_requested',
      pass_count: expect.any(Number),
    });

    const repository = createStateRepository({
      repoRoot,
      projectId: 'ciecopilot-home',
    });
    const [lease] = repository.getSnapshot().state.controller_leases;
    expect(lease).toEqual(expect.objectContaining({
      holder_id: 'cli-live-clock',
      status: 'released',
    }));
    expect(new Date(lease.heartbeat_at).getTime()).toBeGreaterThan(
      new Date(lease.acquired_at).getTime(),
    );
  }, 15000);

  it('recovers the same holder incarnation for a real restart when the prior process is gone', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: 'ciecopilot-home',
    });
    const acquiredAt = new Date(Date.now() - 5_000).toISOString();
    const heartbeatAt = new Date(Date.now() - 2_000).toISOString();
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    repository.upsertControllerLease(createControllerLease({
      lease_id: 'controller-default-cli-recovery-holder-recovered-incarnation',
      controller_id: 'default',
      holder_id: 'cli-recovery-holder',
      holder_type: 'session',
      incarnation_id: 'recovered-incarnation',
      status: 'active',
      acquired_at: acquiredAt,
      heartbeat_at: heartbeatAt,
      expires_at: expiresAt,
      lease_timeout_ms: 300000,
      runtime_kind: 'continuous',
      poll_interval_ms: 25,
      shutdown_timeout_ms: 100,
      metadata: {
        process_pid: 999999,
        process_started_at: acquiredAt,
      },
    }));

    const result = await runRealController({
      repoRoot,
      args: [
        '--continuous',
        '--mode',
        'observe',
        '--poll-interval-ms',
        '25',
        '--shutdown-timeout-ms',
        '100',
        '--json',
      ],
      env: {
        AO_SESSION_NAME: 'cli-recovery-holder',
        AO_CALLER_TYPE: 'session',
      },
      stopAfterMs: 200,
      readyPath: path.join(
        repoRoot,
        '.ao-control-plane',
        'ciecopilot-home',
        'state.json',
      ),
    });

    expect(result.exitCode).toBe(0);
    const [lease] = createStateRepository({
      repoRoot,
      projectId: 'ciecopilot-home',
    }).getSnapshot().state.controller_leases;
    expect(lease).toEqual(expect.objectContaining({
      lease_id: 'controller-default-cli-recovery-holder-recovered-incarnation',
      holder_id: 'cli-recovery-holder',
      incarnation_id: 'recovered-incarnation',
      status: 'released',
    }));
    expect(lease.metadata.process_pid).not.toBe(999999);
  }, 15000);
});
