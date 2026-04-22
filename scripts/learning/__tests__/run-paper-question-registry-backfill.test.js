import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROJECT_ROOT = process.cwd();

function runCli(args = []) {
  return spawnSync(
    process.execPath,
    ['scripts/learning/run_paper_question_registry_backfill.js', ...args],
    {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    },
  );
}

describe('run_paper_question_registry_backfill cli', () => {
  test('treats a relative argv[1] as the active script when resolving the entrypoint guard', async () => {
    const module = await import('../run_paper_question_registry_backfill.js');
    const scriptPath = path.join('scripts', 'learning', 'run_paper_question_registry_backfill.js');
    const scriptUrl = pathToFileURL(path.join(PROJECT_ROOT, scriptPath)).href;

    expect(module.isPaperQuestionRegistryBackfillEntrypoint(scriptPath, scriptUrl)).toBe(true);
  });

  test('prints usage when invoked via the documented relative script path', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `Usage: node ${path.join('scripts', 'learning', 'run_paper_question_registry_backfill.js')} --manifest <path> [--curriculum-seed <path>] [--host-repo-root <path>] [--dry-run]`,
    );
  });

  test('parses manifest, curriculum seed, and dry-run flags deterministically', async () => {
    const module = await import('../run_paper_question_registry_backfill.js');

    expect(module.parsePaperQuestionRegistryBackfillArgs([
      '--manifest',
      'data/manifests/9709_question_search_recovery_v1.json',
      '--curriculum-seed',
      'data/curriculum/9709_question_search_recovery_nodes_v1.json',
      '--dry-run',
    ])).toEqual({
      manifestPath: 'data/manifests/9709_question_search_recovery_v1.json',
      curriculumSeedPath: 'data/curriculum/9709_question_search_recovery_nodes_v1.json',
      dryRun: true,
      hostRepoRootPath: null,
    });
  });

  test('loads the service client from --host-repo-root when provided', async () => {
    const module = await import('../run_paper_question_registry_backfill.js');
    const hostRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-host-root-'));
    const clientModulePath = path.join(hostRepoRoot, 'api', 'lib', 'supabase');
    fs.mkdirSync(clientModulePath, { recursive: true });
    fs.writeFileSync(
      path.join(hostRepoRoot, 'package.json'),
      JSON.stringify({ type: 'module' }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(clientModulePath, 'client.js'),
      [
        'export function getServiceClient() {',
        "  return { source: 'host-repo-root-client' };",
        '}',
        '',
      ].join('\n'),
      'utf8',
    );

    await expect(module.loadServiceClient(hostRepoRoot)).resolves.toEqual({
      source: 'host-repo-root-client',
    });
  });

  test('parses --host-repo-root deterministically', async () => {
    const module = await import('../run_paper_question_registry_backfill.js');

    expect(module.parsePaperQuestionRegistryBackfillArgs([
      '--manifest',
      'data/manifests/9709_question_search_recovery_v1.json',
      '--curriculum-seed',
      'data/curriculum/9709_question_search_recovery_nodes_v1.json',
      '--host-repo-root',
      'C:\\repo-root',
      '--dry-run',
    ])).toEqual({
      manifestPath: 'data/manifests/9709_question_search_recovery_v1.json',
      curriculumSeedPath: 'data/curriculum/9709_question_search_recovery_nodes_v1.json',
      dryRun: true,
      hostRepoRootPath: 'C:\\repo-root',
    });
  });

  test('fails loudly when --manifest is missing', () => {
    const result = runCli([]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--manifest is required');
  });

  test('fails loudly when --manifest is followed by another flag instead of a value', () => {
    const result = runCli(['--manifest', '--dry-run']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--manifest requires a file path');
  });
});
