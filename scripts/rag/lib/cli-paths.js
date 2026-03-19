import path from 'node:path';

export function isAbsoluteCliPath(inputPath) {
  if (!inputPath) return false;
  return path.isAbsolute(inputPath) || path.win32.isAbsolute(inputPath);
}

export function resolveCliPathFromRoot(rootDir, inputPath) {
  if (!inputPath) return null;
  return isAbsoluteCliPath(inputPath) ? inputPath : path.join(rootDir, inputPath);
}
