import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROJECT_ROOT = process.cwd();
const TMP_MANIFEST = path.join(PROJECT_ROOT, 'tmp', 'question-evidence-bundle-v1-manifest.json');

function runCli(args = []) {
  return spawnSync(process.execPath, ['scripts/learning/run_question_evidence_bundle_v1.js', ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
}

function writeManifest() {
  fs.mkdirSync(path.dirname(TMP_MANIFEST), { recursive: true });
  fs.writeFileSync(TMP_MANIFEST, JSON.stringify({
    schema_version: 'v1',
    manifest_id: 'test_manifest',
    items: [
      {
        storage_key: '9709/s24_qp_31/questions/q08.png',
        syllabus_code: '9709',
        year: 2024,
        session: 's',
        paper: 3,
        variant: 1,
        q_number: 8,
        primary_topic_path: '9709.p3.integration',
        route_hint: 'ocr_lane',
        diagram_present: false,
        formula_dense: true,
        table_heavy: false,
        surface_evidence_status: 'verified_primary_asset',
        gate_critical: false,
        requires_review: false,
      },
      {
        storage_key: '9709/s19_qp_11/questions/q06.png',
        syllabus_code: '9709',
        year: 2019,
        session: 's',
        paper: 1,
        variant: 1,
        q_number: 6,
        primary_topic_path: '9709.p1.trigonometry',
        route_hint: 'review_lane',
        diagram_present: false,
        formula_dense: true,
        table_heavy: false,
        surface_evidence_status: 'surface_triage_v1',
        gate_critical: true,
        requires_review: true,
      },
    ],
  }, null, 2));
}

describe('run_question_evidence_bundle_v1 cli', () => {
  beforeEach(() => {
    writeManifest();
  });

  afterEach(() => {
    fs.rmSync(TMP_MANIFEST, { force: true });
  });

  test('treats a relative argv[1] as the active script when resolving the entrypoint guard', async () => {
    const module = await import('../run_question_evidence_bundle_v1.js');
    const scriptPath = path.join('scripts', 'learning', 'run_question_evidence_bundle_v1.js');
    const scriptUrl = pathToFileURL(path.join(PROJECT_ROOT, scriptPath)).href;

    expect(module.isQuestionEvidenceBundleEntrypoint(scriptPath, scriptUrl)).toBe(true);
  });

  test('prints dry-run bundle counts including lazy-attach totals', () => {
    const result = runCli(['--manifest', TMP_MANIFEST, '--dry-run']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('manifest_id: test_manifest');
    expect(result.stdout).toContain('bundles_planned: 2');
    expect(result.stdout).toContain('ocr_lane: 1');
    expect(result.stdout).toContain('review_lane: 1');
    expect(result.stdout).toContain('lazy_attach_original_image: 1');
  });
});
