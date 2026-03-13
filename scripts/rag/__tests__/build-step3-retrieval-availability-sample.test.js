import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts', 'rag', 'build_step3_retrieval_availability_sample.js');

function buildSample(subjectCode, limit) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `rag-step3-${subjectCode}-`));
  const datasetPath = path.join(tempDir, `sample_${subjectCode}.json`);
  const manifestPath = path.join(tempDir, `sample_${subjectCode}_manifest.json`);

  const result = spawnSync(
    process.execPath,
    [
      SCRIPT,
      '--subject',
      subjectCode,
      '--limit',
      String(limit),
      '--out-dataset',
      datasetPath,
      '--out-manifest',
      manifestPath,
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );

  return {
    tempDir,
    datasetPath,
    manifestPath,
    result,
    dataset: fs.existsSync(datasetPath) ? JSON.parse(fs.readFileSync(datasetPath, 'utf8')) : null,
    manifest: fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null,
  };
}

describe('build_step3_retrieval_availability_sample', () => {
  test('builds a 9702 subject-native manifest with single-subject scope metadata', () => {
    const built = buildSample('9702', 6);

    expect(built.result.status).toBe(0);
    expect(built.manifest.subject_scope).toBe('single_subject');
    expect(built.manifest.subject_codes).toEqual(['9702']);
    expect(built.manifest.corpus_scope_policy).toEqual({
      mode: 'subject_scoped',
      compatible_subject_codes: ['9702'],
      allow_mixed_subject_corpus_versions: false,
    });
    expect(built.manifest.roots_priority).toEqual(['9702', '9702.P1', '9702.P2', '9702.P3', '9702.P4', '9702.P5']);
    expect(new Set(built.dataset.map((item) => item.subject_code))).toEqual(new Set(['9702']));

    fs.rmSync(built.tempDir, { recursive: true, force: true });
  });

  test('builds a 9231 subject-native manifest with single-subject scope metadata', () => {
    const built = buildSample('9231', 12);

    expect(built.result.status).toBe(0);
    expect(built.manifest.subject_scope).toBe('single_subject');
    expect(built.manifest.subject_codes).toEqual(['9231']);
    expect(built.manifest.corpus_scope_policy).toEqual({
      mode: 'subject_scoped',
      compatible_subject_codes: ['9231'],
      allow_mixed_subject_corpus_versions: false,
    });
    expect(built.manifest.roots_priority).toEqual(['9231', '9231.FP1', '9231.FP2', '9231.FM', '9231.FS']);
    expect(new Set(built.dataset.map((item) => item.subject_code))).toEqual(new Set(['9231']));

    fs.rmSync(built.tempDir, { recursive: true, force: true });
  });
});
