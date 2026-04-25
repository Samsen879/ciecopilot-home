import {
  applySurfaceTriageToManifest,
  compareQuestionEvidenceBundles,
} from '../lib/9709-surface-triage-rerun.js';
import { main as runSurfaceTriageRerun } from '../run_9709_surface_triage_rerun.js';
import fs from 'node:fs';
import path from 'node:path';

const TMP_DIR = path.join(process.cwd(), 'tmp', '9709-surface-triage-rerun-test');

function writeJson(relativeName, payload) {
  const filePath = path.join(TMP_DIR, relativeName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

function buildManifestItem(overrides = {}) {
  return {
    storage_key: '9709/s24_qp_13/questions/q09.png',
    route_hint: 'ocr_lane',
    diagram_present: false,
    formula_dense: null,
    table_heavy: null,
    surface_evidence_status: 'backfilled_from_audit',
    ...overrides,
  };
}

describe('9709 surface triage rerun helpers', () => {
  beforeEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  test('applies qwen surface triage while preserving human-reviewed diagram_present', () => {
    const manifest = {
      manifest_id: 'test_manifest',
      items: [
        buildManifestItem({
          diagram_present: false,
          formula_dense: null,
          table_heavy: null,
        }),
      ],
    };
    const triage = {
      results: [
        {
          storage_key: '9709/s24_qp_13/questions/q09.png',
          triage: {
            diagram_present: true,
            formula_dense: true,
            table_heavy: false,
            surface_confidence: 0.88,
            surface_reasons: ['formula dense text-only question'],
          },
        },
      ],
    };

    const { manifest: nextManifest, summary } = applySurfaceTriageToManifest({
      manifest,
      triageResults: triage,
      preserveDiagramPresent: true,
    });

    expect(summary).toMatchObject({
      total: 1,
      updated: 1,
      missing_triage: 0,
      qwen_diagram_disagreements: 1,
    });
    expect(nextManifest.items[0]).toMatchObject({
      diagram_present: false,
      formula_dense: true,
      table_heavy: false,
      surface_evidence_status: 'surface_triage_v1',
      surface_triage: {
        schema_version: 'surface_triage_v1',
        source: 'qwen3.6-plus',
        qwen_diagram_present: true,
        qwen_diagram_disagrees_with_manifest: true,
        formula_dense: true,
        table_heavy: false,
      },
    });
  });

  test('reports per-question bundle diffs without deleting baseline evidence', () => {
    const baseline = {
      bundles: [
        {
          storage_key: '9709/s24_qp_13/questions/q09.png',
          route: { route: 'ocr_lane' },
          evidence: {
            ocr_text: 'Find x.',
            diagram_present: false,
            formula_latex_list: ['x^2=4'],
            subquestion_blocks: ['(a)'],
            diagram_elements: [],
            spatial_evidence: [],
          },
        },
      ],
    };
    const candidate = {
      bundles: [
        {
          storage_key: '9709/s24_qp_13/questions/q09.png',
          route: { route: 'diagram_lane' },
          evidence: {
            ocr_text: 'Find x from the diagram.',
            diagram_present: true,
            formula_latex_list: ['x^2=4', 'x>0'],
            subquestion_blocks: ['(a)', '(b)'],
            diagram_elements: ['curve'],
            spatial_evidence: ['axes shown'],
          },
        },
      ],
    };

    const diff = compareQuestionEvidenceBundles({ baseline, candidate });

    expect(diff.summary).toMatchObject({
      total: 1,
      route_changed: 1,
      diagram_present_changed: 1,
      ocr_text_changed: 1,
      formula_count_changed: 1,
      subquestion_count_changed: 1,
      diagram_elements_changed: 1,
      spatial_evidence_changed: 1,
      high_risk_changed: 1,
    });
    expect(diff.items[0]).toMatchObject({
      storage_key: '9709/s24_qp_13/questions/q09.png',
      baseline_route: 'ocr_lane',
      candidate_route: 'diagram_lane',
      risk_level: 'high',
      recommended_action: 'manual_review',
    });
  });

  test('cli writes a triaged manifest and optional bundle diff', async () => {
    const manifestPath = writeJson('manifest.json', {
      manifest_id: 'test_manifest',
      items: [buildManifestItem()],
    });
    const triagePath = writeJson('triage.json', {
      results: [
        {
          storage_key: '9709/s24_qp_13/questions/q09.png',
          triage: {
            diagram_present: false,
            formula_dense: true,
            table_heavy: false,
            surface_confidence: 0.9,
          },
        },
      ],
    });
    const baselinePath = writeJson('baseline.json', { bundles: [] });
    const candidatePath = writeJson('candidate.json', { bundles: [] });
    const outputManifest = path.join(TMP_DIR, 'triaged-manifest.json');
    const diffOutput = path.join(TMP_DIR, 'diff.json');

    const exitCode = await runSurfaceTriageRerun([
      '--manifest', manifestPath,
      '--surface-triage', triagePath,
      '--output-manifest', outputManifest,
      '--baseline-bundles', baselinePath,
      '--candidate-bundles', candidatePath,
      '--diff-output', diffOutput,
    ]);

    expect(exitCode).toBe(0);
    expect(JSON.parse(fs.readFileSync(outputManifest, 'utf8')).items[0]).toMatchObject({
      formula_dense: true,
      table_heavy: false,
      surface_evidence_status: 'surface_triage_v1',
    });
    expect(JSON.parse(fs.readFileSync(diffOutput, 'utf8'))).toMatchObject({
      schema_version: '9709_evidence_bundle_diff_v1',
    });
  });
});
