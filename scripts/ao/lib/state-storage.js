import * as fs from 'node:fs';
import path from 'node:path';

const syncSleepState = new Int32Array(new SharedArrayBuffer(4));
const DEFAULT_STALE_LOCK_AGE_MS = 30 * 1000;

export function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

export async function sleep(waitMs) {
  const durationMs = Number(waitMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function sleepSync(waitMs) {
  const durationMs = Number(waitMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;

  if (typeof Atomics?.wait === 'function') {
    Atomics.wait(syncSleepState, 0, 0, durationMs);
    return;
  }

  const deadlineMs = Date.now() + durationMs;
  while (Date.now() < deadlineMs) {
    // Busy-wait to keep synchronous repository callers serialized under the same lock.
  }
}

export function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJsonFileAtomic(filePath, payload) {
  ensureDirectory(path.dirname(filePath));
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function isProcessAlive(pid) {
  const normalizedPid = Number(pid);
  if (!Number.isInteger(normalizedPid) || normalizedPid <= 0) {
    return false;
  }

  try {
    process.kill(normalizedPid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function readLinuxProcessStartToken(pid) {
  try {
    const statText = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').trim();
    const suffixStart = statText.lastIndexOf(') ');
    if (suffixStart < 0) return null;
    const suffixFields = statText.slice(suffixStart + 2).split(' ');
    const startToken = suffixFields[19] ?? null;
    return typeof startToken === 'string' && startToken.trim() !== ''
      ? startToken.trim()
      : null;
  } catch {
    return null;
  }
}

export function readLiveProcessIdentity(pid = process.pid) {
  const normalizedPid = Number(pid);
  if (!Number.isInteger(normalizedPid) || normalizedPid <= 0) {
    return null;
  }
  if (!isProcessAlive(normalizedPid)) {
    return null;
  }

  return {
    process_pid: normalizedPid,
    process_start_token: readLinuxProcessStartToken(normalizedPid),
  };
}

export function buildCurrentProcessMetadata({
  pid = process.pid,
  startedAt = new Date().toISOString(),
} = {}) {
  const liveIdentity = readLiveProcessIdentity(pid);
  return {
    process_pid: Number(pid),
    process_started_at: startedAt,
    process_start_token: liveIdentity?.process_start_token ?? null,
  };
}

export function matchesRecordedProcessIdentity(metadata = {}) {
  const normalizedPid = Number(metadata?.process_pid ?? metadata?.pid);
  if (!Number.isInteger(normalizedPid) || normalizedPid <= 0) {
    return false;
  }

  const liveIdentity = readLiveProcessIdentity(normalizedPid);
  if (!liveIdentity) {
    return false;
  }

  const recordedStartToken = typeof metadata?.process_start_token === 'string' && metadata.process_start_token.trim() !== ''
    ? metadata.process_start_token.trim()
    : null;

  if (recordedStartToken != null && liveIdentity.process_start_token != null) {
    return recordedStartToken === liveIdentity.process_start_token;
  }

  return true;
}

function readLockMetadata(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const rawText = fs.readFileSync(filePath, 'utf8').trim();
    if (rawText === '') return null;
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function shouldRecoverStaleLock(filePath, staleLockAgeMs) {
  if (!fs.existsSync(filePath)) return false;

  const metadata = readLockMetadata(filePath);
  const recordedPid = metadata?.pid;
  if (Number.isInteger(recordedPid) && recordedPid > 0) {
    return !matchesRecordedProcessIdentity(metadata);
  }

  const fileStats = fs.statSync(filePath);
  return Date.now() - fileStats.mtimeMs >= staleLockAgeMs;
}

function tryRecoverStaleLock(filePath, staleLockAgeMs) {
  if (!shouldRecoverStaleLock(filePath, staleLockAgeMs)) {
    return false;
  }

  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function withFileLock(
  filePath,
  callback,
  {
    timeoutMs = 1000,
    retryMs = 10,
    sleepFn = sleep,
    staleLockAgeMs = DEFAULT_STALE_LOCK_AGE_MS,
  } = {},
) {
  ensureDirectory(path.dirname(filePath));
  const startedAtMs = Date.now();
  let lockDescriptor = null;

  while (lockDescriptor == null) {
    try {
      lockDescriptor = fs.openSync(filePath, 'wx');
      fs.writeFileSync(
        lockDescriptor,
        `${JSON.stringify({
          pid: process.pid,
          acquired_at: new Date().toISOString(),
          ...buildCurrentProcessMetadata(),
        })}\n`,
        'utf8',
      );
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      if (tryRecoverStaleLock(filePath, staleLockAgeMs)) {
        continue;
      }
      if (Date.now() - startedAtMs >= timeoutMs) {
        throw new Error(`Timed out acquiring file lock ${path.basename(filePath)}`);
      }
      await sleepFn(retryMs);
    }
  }

  try {
    return await callback();
  } finally {
    if (lockDescriptor != null) {
      fs.closeSync(lockDescriptor);
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export function withFileLockSync(
  filePath,
  callback,
  {
    timeoutMs = 1000,
    retryMs = 10,
    sleepFn = sleepSync,
    staleLockAgeMs = DEFAULT_STALE_LOCK_AGE_MS,
  } = {},
) {
  ensureDirectory(path.dirname(filePath));
  const startedAtMs = Date.now();
  let lockDescriptor = null;

  while (lockDescriptor == null) {
    try {
      lockDescriptor = fs.openSync(filePath, 'wx');
      fs.writeFileSync(
        lockDescriptor,
        `${JSON.stringify({
          pid: process.pid,
          acquired_at: new Date().toISOString(),
          ...buildCurrentProcessMetadata(),
        })}\n`,
        'utf8',
      );
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      if (tryRecoverStaleLock(filePath, staleLockAgeMs)) {
        continue;
      }
      if (Date.now() - startedAtMs >= timeoutMs) {
        throw new Error(`Timed out acquiring file lock ${path.basename(filePath)}`);
      }
      sleepFn(retryMs);
    }
  }

  try {
    return callback();
  } finally {
    if (lockDescriptor != null) {
      fs.closeSync(lockDescriptor);
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export function appendJsonLine(filePath, payload) {
  ensureDirectory(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

export function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (text === '') return [];

  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
