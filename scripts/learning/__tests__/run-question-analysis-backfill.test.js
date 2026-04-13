import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROJECT_ROOT = process.cwd();

function runCli(args = []) {
  return spawnSync(process.execPath, ['scripts/learning/run_question_analysis_backfill.js', ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
}

describe('run_question_analysis_backfill cli', () => {
  test('treats a relative argv[1] as the active script when resolving the entrypoint guard', async () => {
    const module = await import('../run_question_analysis_backfill.js');
    const scriptPath = path.join('scripts', 'learning', 'run_question_analysis_backfill.js');
    const scriptUrl = pathToFileURL(path.join(PROJECT_ROOT, scriptPath)).href;

    expect(module.isQuestionAnalysisBackfillEntrypoint(scriptPath, scriptUrl)).toBe(true);
  });

  test('prints usage when invoked via the documented relative script path', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `Usage: node ${path.join('scripts', 'learning', 'run_question_analysis_backfill.js')} [--force]`,
    );
  });
});
