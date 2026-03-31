import * as fs from 'node:fs';
import path from 'node:path';

const syncSleepState = new Int32Array(new SharedArrayBuffer(4));

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

export async function withFileLock(
  filePath,
  callback,
  {
    timeoutMs = 1000,
    retryMs = 10,
    sleepFn = sleep,
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
        `${JSON.stringify({ pid: process.pid, acquired_at: new Date().toISOString() })}\n`,
        'utf8',
      );
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
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
        `${JSON.stringify({ pid: process.pid, acquired_at: new Date().toISOString() })}\n`,
        'utf8',
      );
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
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
