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
      `Usage: node ${path.join('scripts', 'learning', 'run_question_analysis_backfill.js')} [--force] [--evidence-bundles <path>]`,
    );
  });

  test('attaches evidence bundles to matching questions by storage key or question id', async () => {
    const module = await import('../run_question_analysis_backfill.js');

    expect(module.attachEvidenceBundlesToQuestions([
      {
        question_id: 'question-1',
        provenance_summary: {
          storage_key: '9709/s19_qp_11/questions/q06.png',
        },
      },
      {
        question_id: 'question-2',
        provenance_summary: {},
      },
    ], [
      {
        schema_version: 'question_evidence_bundle_v1',
        storage_key: '9709/s19_qp_11/questions/q06.png',
      },
      {
        schema_version: 'question_evidence_bundle_v1',
        question_id: 'question-2',
      },
    ])).toEqual([
      expect.objectContaining({
        question_id: 'question-1',
        questionEvidenceBundle: expect.objectContaining({
          storage_key: '9709/s19_qp_11/questions/q06.png',
        }),
      }),
      expect.objectContaining({
        question_id: 'question-2',
        questionEvidenceBundle: expect.objectContaining({
          question_id: 'question-2',
        }),
      }),
    ]);
  });
});
