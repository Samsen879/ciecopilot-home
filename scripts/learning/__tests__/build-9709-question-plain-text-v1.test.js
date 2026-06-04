import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildQuestionPlainTextLayer,
  scoreEvidenceFile,
} from '../build_9709_question_plain_text_v1.js';

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9709-question-text-v1-'));
}

function writeSurface(root, fileName, items) {
  const filePath = path.join(root, 'data', 'manifests', fileName);
  writeJson(filePath, {
    schema_version: '9709_page_chain_surface_v1',
    manifest_id: fileName.replace(/\.json$/, ''),
    subject_code: '9709',
    shard_id: 'p1_m_standard_001',
    items,
  });
  return filePath;
}

function writeEvidence(root, fileName, bundles) {
  const filePath = path.join(root, 'docs', 'reports', fileName);
  writeJson(filePath, {
    manifest_id: fileName.replace(/\.json$/, ''),
    bundles,
  });
  return filePath;
}

function baseSurfaceItem(overrides = {}) {
  return {
    storage_key: '9709/m25_qp_12/questions/q01.png',
    syllabus_code: '9709',
    year: 2025,
    session: 'm',
    paper: 1,
    variant: 2,
    q_number: 1,
    source_pdf: 'data/past-papers/9709Mathematics/paper1/9709_m25_qp_12.pdf',
    shard_id: 'p1_m25_standard_001',
    route_hint: 'ocr_lane',
    diagram_present: false,
    formula_dense: true,
    table_heavy: false,
    surface_evidence_status: 'local_visual_review_accepted',
    review_crop_paths: ['tmp/crops/q01.png'],
    rendered_pdf_page_paths: ['tmp/renders/page_002.png'],
    primary_topic_path: '9709.p1.quadratics',
    ...overrides,
  };
}

function baseEvidenceBundle(overrides = {}) {
  return {
    schema_version: 'question_evidence_bundle_v1',
    storage_key: '9709/m25_qp_12/questions/q01.png',
    question_identity: {
      subject_code: '9709',
      year: 2025,
      session: 'm',
      paper: 1,
      variant: 2,
      q_number: 1,
      primary_topic_path: '9709.p1.quadratics',
    },
    evidence: {
      ocr_text: 'Find the set of values of k.',
      formula_latex_list: [],
      subquestion_blocks: [{ label: null, marks: 4 }],
      layout_hints: [
        "review_crop_paths=['tmp/crops/q01.png']",
      ],
      diagram_present: false,
      diagram_elements: [],
      spatial_evidence: [],
    },
    surface_posture: {
      route_hint: 'ocr_lane',
      diagram_present: false,
      formula_dense: true,
      table_heavy: false,
      surface_evidence_status: 'local_visual_review_accepted',
    },
    model_provenance: [
      {
        model: 'codex-local-visual-review',
        region: 'local',
      },
    ],
    ...overrides,
  };
}

describe('9709 question plain text v1 builder', () => {
  test('builds canonical plain-text rows for no-diagram and diagram questions', () => {
    const root = fixtureRoot();
    const noDiagram = baseSurfaceItem();
    const diagram = baseSurfaceItem({
      storage_key: '9709/m25_qp_12/questions/q02.png',
      q_number: 2,
      route_hint: 'diagram_lane',
      diagram_present: true,
      formula_dense: false,
      review_crop_paths: ['tmp/crops/q02.png'],
      rendered_pdf_page_paths: ['tmp/renders/page_003.png'],
      visual_disposition: {
        question_text: 'A curve diagram is shown; find the gradient at P.',
        authority_topic_path: '9709.p1.differentiation',
        diagram_elements: ['curve', 'point P'],
        spatial_evidence: ['The crop includes the curve diagram.'],
      },
    });

    writeSurface(root, '9709_p1_m25_standard_001_page_chain_surface_v2.json', [noDiagram, diagram]);
    writeEvidence(root, '2026-06-04-9709-p1-m25-standard-001-evidence-bundles-final.json', [
      baseEvidenceBundle(),
      baseEvidenceBundle({
        storage_key: diagram.storage_key,
        question_identity: {
          subject_code: '9709',
          year: 2025,
          session: 'm',
          paper: 1,
          variant: 2,
          q_number: 2,
          primary_topic_path: '9709.p1.differentiation',
        },
        evidence: {
          ocr_text: 'OCR fallback text should not win over visual disposition.',
          formula_latex_list: [],
          subquestion_blocks: [{ label: null, marks: 5 }],
          layout_hints: ["review_crop_paths=['tmp/crops/q02.png']"],
          diagram_present: true,
          diagram_elements: ['curve'],
          spatial_evidence: ['diagram evidence'],
        },
      }),
    ]);

    const layer = buildQuestionPlainTextLayer({
      rootDir: root,
      subject: '9709',
      generatedOn: '2026-06-04',
      surfaceRoot: 'data/manifests',
      evidenceRoot: 'docs/reports',
    });

    expect(layer.status).toBe('pass');
    expect(layer.summary).toMatchObject({
      production_rows: 2,
      plain_text_rows: 2,
      no_diagram_rows: 1,
      no_diagram_plain_text_rows: 1,
      diagram_rows: 1,
      diagram_rows_with_text_and_image_asset: 1,
      duplicate_storage_keys: 0,
      missing_evidence_bundle: 0,
      missing_plain_text: 0,
    });
    expect(layer.items[0]).toMatchObject({
      schema_version: 'question_plain_text_v1',
      storage_key: noDiagram.storage_key,
      plain_text: 'Find the set of values of k.',
      has_diagram: false,
      needs_image_asset: false,
      text_source: 'evidence_ocr_text',
    });
    expect(layer.items[1]).toMatchObject({
      storage_key: diagram.storage_key,
      plain_text: 'A curve diagram is shown; find the gradient at P.',
      has_diagram: true,
      needs_image_asset: true,
      text_source: 'surface_visual_disposition_question_text',
      image_assets: ['tmp/crops/q02.png'],
      primary_topic_path: '9709.p1.differentiation',
    });
  });

  test('prefers final evidence bundles over older duplicate candidates', () => {
    const root = fixtureRoot();
    writeSurface(root, '9709_p1_m_standard_001_page_chain_surface_v1.json', [baseSurfaceItem()]);
    writeEvidence(root, '2026-06-03-9709-p1-m-standard-001-evidence-bundles.json', [
      baseEvidenceBundle({
        evidence: {
          ...baseEvidenceBundle().evidence,
          ocr_text: 'Older non-final text.',
        },
      }),
    ]);
    writeEvidence(root, '2026-06-04-9709-p1-m-standard-001-evidence-bundles-final.json', [
      baseEvidenceBundle({
        evidence: {
          ...baseEvidenceBundle().evidence,
          ocr_text: 'Final text wins.',
        },
      }),
    ]);

    const layer = buildQuestionPlainTextLayer({
      rootDir: root,
      subject: '9709',
      generatedOn: '2026-06-04',
      surfaceRoot: 'data/manifests',
      evidenceRoot: 'docs/reports',
    });

    expect(scoreEvidenceFile('docs/reports/2026-06-04-9709-p1-m-standard-001-evidence-bundles-final.json'))
      .toBeGreaterThan(scoreEvidenceFile('docs/reports/2026-06-03-9709-p1-m-standard-001-evidence-bundles.json'));
    expect(layer.status).toBe('pass');
    expect(layer.items[0]).toMatchObject({
      plain_text: 'Final text wins.',
      source_evidence_bundle: 'docs/reports/2026-06-04-9709-p1-m-standard-001-evidence-bundles-final.json',
    });
  });

  test('blocks when a production surface row has no text evidence', () => {
    const root = fixtureRoot();
    writeSurface(root, '9709_p1_m_standard_001_page_chain_surface_v1.json', [baseSurfaceItem()]);

    const layer = buildQuestionPlainTextLayer({
      rootDir: root,
      subject: '9709',
      generatedOn: '2026-06-04',
      surfaceRoot: 'data/manifests',
      evidenceRoot: 'docs/reports',
    });

    expect(layer.status).toBe('blocked');
    expect(layer.summary.missing_evidence_bundle).toBe(1);
    expect(layer.summary.missing_plain_text).toBe(1);
    expect(layer.blockers).toContainEqual(expect.objectContaining({
      storage_key: '9709/m25_qp_12/questions/q01.png',
      check: 'missing_evidence_bundle',
    }));
  });

  test('blocks duplicate production surface storage keys', () => {
    const root = fixtureRoot();
    writeSurface(root, '9709_p1_m_standard_001_page_chain_surface_v1.json', [
      baseSurfaceItem(),
      baseSurfaceItem({ q_number: 99 }),
    ]);
    writeEvidence(root, '2026-06-04-9709-p1-m-standard-001-evidence-bundles-final.json', [
      baseEvidenceBundle(),
    ]);

    const layer = buildQuestionPlainTextLayer({
      rootDir: root,
      subject: '9709',
      generatedOn: '2026-06-04',
      surfaceRoot: 'data/manifests',
      evidenceRoot: 'docs/reports',
    });

    expect(layer.status).toBe('blocked');
    expect(layer.summary.duplicate_storage_keys).toBe(1);
    expect(layer.blockers).toContainEqual(expect.objectContaining({
      storage_key: '9709/m25_qp_12/questions/q01.png',
      check: 'duplicate_surface_storage_key',
    }));
  });
});
