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
      `Usage: node ${path.join('scripts', 'learning', 'run_question_analysis_backfill.js')} [--force] [--source-kind <kind>] [--manifest <path>] [--evidence-bundles <path>]`,
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

  test('filters paper-question candidates to manifest rows and attaches manifest analysis hints', async () => {
    const module = await import('../run_question_analysis_backfill.js');

    expect(module.attachManifestMetadataToQuestions([
      {
        question_id: 'paper-1',
        source_kind: 'paper_question',
        storage_key: '9709/s19_qp_11/questions/q06.png',
        q_number: 6,
        provenance_summary: {},
      },
      {
        question_id: 'paper-2',
        source_kind: 'paper_question',
        storage_key: '9709/s21_qp_12/questions/q03.png',
        q_number: 3,
        provenance_summary: {},
      },
    ], {
      manifest_id: '9709_question_search_recovery_v1',
      items: [
        {
          storage_key: '9709/s19_qp_11/questions/q06.png',
          q_number: 6,
          primary_topic_path: '9709.p1.trigonometry',
          analysis_hints: {
            question_type_hint_id: '9709.trigonometry.identities',
          },
        },
      ],
    })).toEqual([
      expect.objectContaining({
        question_id: 'paper-1',
        analysisHints: expect.objectContaining({
          topic_path_hint: '9709.p1.trigonometry',
          question_type_hint_id: '9709.trigonometry.identities',
        }),
        manifestItem: expect.objectContaining({
          storage_key: '9709/s19_qp_11/questions/q06.png',
          q_number: 6,
        }),
      }),
    ]);
  });

  test('fails loudly when --evidence-bundles is passed without a value', () => {
    const result = runCli(['--evidence-bundles']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--evidence-bundles requires a file path');
  });

  test('fails loudly when --evidence-bundles is followed by another flag instead of a value', () => {
    const result = runCli(['--evidence-bundles', '--force']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--evidence-bundles requires a file path');
  });

  test('fails loudly when --source-kind is passed without a value', () => {
    const result = runCli(['--source-kind']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--source-kind requires a value');
  });

  test('fails loudly when --source-kind is followed by another flag instead of a value', () => {
    const result = runCli(['--source-kind', '--force']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--source-kind requires a value');
  });
});
