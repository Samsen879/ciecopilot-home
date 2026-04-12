import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const require = createRequire(import.meta.url);
const runnerPath = require.resolve('../../output/playwright/learning-runtime-closed-loop/windows-side-runner.cjs');
const ORIGINAL_ENV = { ...process.env };

function loadRunner() {
  jest.resetModules();
  return require(runnerPath);
}

describe('windows-side runner bundle helpers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PLAYWRIGHT_WINDOWS_MODULE;
    delete process.env.APPDATA;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('can be loaded without a machine-specific Playwright path at import time', () => {
    expect(() => loadRunner()).not.toThrow();
  });

  it('builds portable Playwright candidates before Windows global fallbacks', () => {
    const runner = loadRunner();
    const appData = 'C:\\Users\\Runner\\AppData\\Roaming';

    expect(runner.buildPlaywrightModuleCandidates({ APPDATA: appData })).toEqual([
      'playwright',
      'playwright-core',
      path.win32.join(appData, 'npm', 'node_modules', 'playwright'),
      path.win32.join(appData, 'npm', 'node_modules', 'playwright-core'),
      path.win32.join(appData, 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright'),
      path.win32.join(appData, 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright-core'),
    ]);
  });

  it('stores artifact paths relative to the committed bundle', () => {
    const runner = loadRunner();
    const bundleDir = path.join('/tmp', 'repo', 'output', 'playwright', 'learning-runtime-closed-loop');

    expect(runner.toBundleRelativePath(path.join(bundleDir, 'lr-bcl-01.png'), bundleDir)).toBe('lr-bcl-01.png');
    expect(runner.toBundleRelativePath(path.join(bundleDir, 'nested', 'artifact.txt'), bundleDir)).toBe('nested/artifact.txt');
    expect(
      runner.toBundleRelativePath(
        '/home/samsen/code/ciecopilot-home/output/playwright/learning-runtime-closed-loop/lr-bcl-02.png',
        bundleDir,
      ),
    ).toBe('lr-bcl-02.png');
  });

  it('falls back from portable module ids to the APPDATA global CLI bundle', () => {
    const runner = loadRunner();
    const appData = 'C:\\Users\\Runner\\AppData\\Roaming';
    const globalPlaywright = path.win32.join(
      appData,
      'npm',
      'node_modules',
      '@playwright',
      'cli',
      'node_modules',
      'playwright',
    );
    const resolve = jest.fn((specifier) => {
      if (specifier === globalPlaywright) {
        return globalPlaywright;
      }

      const error = new Error(`Cannot find module '${specifier}'`);
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    });

    expect(runner.resolvePlaywrightModule({ env: { APPDATA: appData }, resolve })).toBe(globalPlaywright);
    expect(resolve.mock.calls.map(([specifier]) => specifier)).toEqual([
      'playwright',
      'playwright-core',
      path.win32.join(appData, 'npm', 'node_modules', 'playwright'),
      path.win32.join(appData, 'npm', 'node_modules', 'playwright-core'),
      globalPlaywright,
    ]);
  });
});
