import path from 'node:path';
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
      `Usage: node ${path.join('scripts', 'learning', 'run_paper_question_registry_backfill.js')} --manifest <path> [--curriculum-seed <path>] [--dry-run]`,
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
