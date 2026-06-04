import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assert9709ReleasePreflightPassed,
  buildAuthorityReadyBatchArtifacts,
  build9709ReleasePreflightForArtifacts,
  main,
} from '../run_9709_authority_ready_batch.js';

const STORAGE_KEY = '9709/s17_qp_63/questions/q07.png';
const EXPECTED_TOPIC_PATH = '9709.p5.representation_of_data';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

function pickManifestRow(manifest) {
  return {
    ...manifest,
    items: (manifest.items ?? []).filter((item) => item?.storage_key === STORAGE_KEY),
  };
}

function pickAuthoritySidecarEntry(sidecar) {
  const entry = (sidecar.items ?? []).find((item) => item?.storage_key === STORAGE_KEY);
  if (!entry) {
    throw new Error(`Missing authority sidecar entry for ${STORAGE_KEY}`);
  }
  return {
    [STORAGE_KEY]: entry.authority_input_pack,
  };
}

function pickLaneOutputs(payload) {
  const outputs = Array.isArray(payload) ? payload : payload.results ?? payload.items ?? payload.outputs ?? [];
  return outputs.filter((item) => item?.input_asset_id === STORAGE_KEY);
}

describe('9709 authority-ready batch q07 recovery', () => {
  test('advances the remaining authority-missing histogram row through the ready batch', async () => {
    const manifest = pickManifestRow(readJson('data/manifests/9709_authority_ready_batch_300_v1.json'));
    const authoritySidecar = pickAuthoritySidecarEntry(
      readJson('data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json'),
    );
    const curriculumSeed = readJson('data/curriculum/9709_authority_ready_batch_300_nodes_v2.json');
    const laneOutputs = pickLaneOutputs(
      readJson('docs/reports/2026-04-16-9709-diagram-lane-live-probe-results.json'),
    );

    expect(manifest.items).toHaveLength(1);
    expect(laneOutputs).toHaveLength(1);

    const result = await buildAuthorityReadyBatchArtifacts({
      manifest,
      authoritySidecar,
      curriculumSeed,
      laneOutputs,
    });

    expect(result.authorityManifest.items).toHaveLength(1);
    expect(result.authorityManifest.items[0]).toMatchObject({
      storage_key: STORAGE_KEY,
      primary_topic_path: EXPECTED_TOPIC_PATH,
      canonical_primary_topic_path: EXPECTED_TOPIC_PATH,
      authority_truth_status: 'frozen',
      taxonomy_resolution_status: 'resolved',
      provisional_alignment_verdict: 'ready',
    });

    expect(result.alignedManifest.items[0]).toMatchObject({
      storage_key: STORAGE_KEY,
      overall_alignment_verdict: 'ready',
      manual_action_required: false,
    });
    expect(result.readyManifest.items).toHaveLength(1);
    expect(result.readyManifest.items[0]).toMatchObject({
      storage_key: STORAGE_KEY,
      primary_topic_path: EXPECTED_TOPIC_PATH,
    });
    expect(result.bundles).toHaveLength(1);
    expect(result.bundles[0]).toMatchObject({
      storage_key: STORAGE_KEY,
      analysis_hints: {
        topic_path_hint: EXPECTED_TOPIC_PATH,
      },
    });
  });

  test('release preflight blocks authority-ready batch artifacts before write steps', async () => {
    const manifest = {
      manifest_id: 'broken-9709-release-preflight',
      items: [
        {
          storage_key: '9709/s24_qp_13/questions/q09.png',
          syllabus_code: '9709',
          paper: 1,
          primary_topic_path: '9709.p1.integration',
          diagram_present: null,
        },
      ],
    };
    const authoritySidecar = {
      items: [
        {
          storage_key: '9709/s24_qp_13/questions/q09.png',
          authority_input_pack: {
            canonical_primary_topic_path: '9709.p1.integration',
          },
        },
      ],
    };
    const curriculumSeed = {
      syllabus_code: '9709',
      version_tag: '2025-2027_v1',
      nodes: [
        {
          syllabus_code: '9709',
          version_tag: '2025-2027_v1',
          topic_path: '9709.p1.integration',
        },
      ],
    };
    const artifacts = {
      bundles: [],
      readyManifest: {
        items: [
          {
            storage_key: '9709/s24_qp_13/questions/q09.png',
            overall_alignment_verdict: 'ready',
          },
        ],
      },
    };

    const preflight = build9709ReleasePreflightForArtifacts({
      manifest,
      authoritySidecarPayload: authoritySidecar,
      curriculumSeed,
      artifacts,
      expectedManifestCount: 1,
    });

    expect(preflight.status).toBe('fail');
    expect(() => assert9709ReleasePreflightPassed(preflight)).toThrow(/9709 release preflight failed/);
  });

  test('artifacts-only mode writes authority artifacts without running downstream steps', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), '9709-authority-artifacts-only-'));
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const sidecarPath = path.join(tmpDir, 'sidecar.json');
    const seedPath = path.join(tmpDir, 'seed.json');
    const lanePath = path.join(tmpDir, 'lane.json');
    const authorityOut = path.join(tmpDir, 'authority.json');
    const alignedOut = path.join(tmpDir, 'aligned.json');
    const readyOut = path.join(tmpDir, 'ready.json');
    const bundlesOut = path.join(tmpDir, 'bundles.json');

    fs.writeFileSync(manifestPath, JSON.stringify({
      manifest_id: 'p1-m25-artifacts-only-test',
      items: [
        {
          storage_key: '9709/m25_qp_12/questions/q01.png',
          syllabus_code: '9709',
          year: 2025,
          session: 'm',
          paper: 1,
          variant: 2,
          q_number: 1,
          primary_topic_path: null,
          diagram_present: false,
          formula_dense: true,
          table_heavy: false,
          route_hint: 'ocr_lane',
          requires_review: false,
          gate_critical: false,
          surface_evidence_status: 'local_visual_review_accepted',
        },
      ],
    }), 'utf8');
    fs.writeFileSync(sidecarPath, JSON.stringify({
      items: [
        {
          storage_key: '9709/m25_qp_12/questions/q01.png',
          authority_input_pack: {
            canonical_primary_topic_path: '9709.p1.quadratics',
            curriculum_version_tag: '2025-2027_v1',
            topic_authority_sources: ['operator_visual_review'],
            topic_authority_refs: [
              {
                kind: 'operator_visual_review',
                locator: 'test',
                note: 'test local visual authority mapping',
              },
            ],
            cross_paper_dependency_note: null,
          },
        },
      ],
    }), 'utf8');
    fs.writeFileSync(seedPath, JSON.stringify({
      syllabus_code: '9709',
      version_tag: '2025-2027_v1',
      nodes: [
        {
          syllabus_code: '9709',
          version_tag: '2025-2027_v1',
          topic_path: '9709.p1.quadratics',
        },
      ],
    }), 'utf8');
    fs.writeFileSync(lanePath, JSON.stringify({
      results: [
        {
          route: 'ocr_lane',
          model: 'codex-local-visual-review',
          input_asset_id: '9709/m25_qp_12/questions/q01.png',
          confidence: 1,
          failure_reason: null,
          output: {
            evidence: [
              { field: 'ocr_text', value: 'Find the set of values of k for which the curve and line do not meet.' },
              { field: 'diagram_present', value: false },
              { field: 'visual_topic_guess', value: '9709.p1.quadratics' },
            ],
            warnings: [],
          },
        },
      ],
    }), 'utf8');

    const result = await main([
      '--manifest', manifestPath,
      '--authority-sidecar', sidecarPath,
      '--curriculum-seed', seedPath,
      '--lane-results', lanePath,
      '--authority-manifest-out', authorityOut,
      '--aligned-manifest-out', alignedOut,
      '--ready-manifest-out', readyOut,
      '--evidence-bundles-out', bundlesOut,
      '--skip-release-preflight',
      '--artifacts-only',
    ]);

    expect(result.readyManifest.items).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(authorityOut, 'utf8')).items).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(alignedOut, 'utf8')).items[0]).toMatchObject({
      overall_alignment_verdict: 'ready',
    });
    expect(JSON.parse(fs.readFileSync(readyOut, 'utf8')).items).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(bundlesOut, 'utf8')).bundles).toHaveLength(1);
  });
});
