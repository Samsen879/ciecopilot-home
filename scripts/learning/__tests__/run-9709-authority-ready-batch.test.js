import fs from 'node:fs';
import path from 'node:path';

import {
  assert9709ReleasePreflightPassed,
  buildAuthorityReadyBatchArtifacts,
  build9709ReleasePreflightForArtifacts,
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
});
