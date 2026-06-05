import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231NextWaveCandidateGate,
  render9231NextWaveCandidateGateMarkdown,
  write9231NextWaveCandidateGateOutputs,
} from '../build_9231_next_wave_candidate_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-next-wave-candidate-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(root, repoPath, text = 'x') {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function writePdf(root, repoPath) {
  writeText(root, repoPath, '%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
}

function row(overrides = {}) {
  const sourcePdf = overrides.source_pdf || 'data/past-papers/9231Further-Mathematics/paper1/9231_s18_qp_11.pdf';
  const cropPath = overrides.crop_path || 'data/crops/9231-wave2-shards/9231_p1_s18_standard_001/question-crops/9231_s18_qp_11/q01/q01_page_002.png';
  const renderPath = overrides.render_path || 'data/crops/9231-wave2-shards/9231_p1_s18_standard_001/renders/9231_s18_qp_11/9231_s18_qp_11_page_002.png';
  return {
    storage_key: overrides.storage_key || '9231/s18_qp_11/questions/q01.png',
    subject_code: '9231',
    shard_id: overrides.shard_id || '9231_p1_s18_standard_001',
    source_pdf: sourcePdf,
    source_pdf_page_count: 28,
    source_pdf_stem: path.basename(sourcePdf, '.pdf'),
    q_number: overrides.q_number || 1,
    locator_status: 'resolved',
    crop_status: overrides.crop_status || 'complete',
    rendered_pdf_page_paths: overrides.rendered_pdf_page_paths || [renderPath],
    crop_paths: overrides.crop_paths || [cropPath],
    review_crop_paths: overrides.review_crop_paths || [cropPath],
    source_freeze_status: overrides.source_freeze_status || null,
    text_evidence_status: overrides.text_evidence_status || 'not_extracted',
    normalized_plain_text: overrides.normalized_plain_text ?? null,
    text_consumption_status: overrides.text_consumption_status || 'not_ready_missing_question_plain_text',
    production_ready_claimed: false,
    db_consumption_claimed: false,
    search_consumption_claimed: false,
    rag_consumption_claimed: false,
    ...overrides,
  };
}

function surface(shardId, items) {
  return {
    schema_version: '9231_question_shard_split_page_chain_surface_v1',
    manifest_id: `${shardId}_page_chain_surface_v1`,
    subject_code: '9231',
    shard_id: shardId,
    item_count: items.length,
    items,
  };
}

function writeSurfaceFixture(root, shardId, items) {
  const surfacePath = `data/manifests/${shardId}_page_chain_surface_v1.json`;
  writeJson(root, surfacePath, surface(shardId, items));
  return {
    shard_id: shardId,
    page_chain_surface_manifest_path: surfacePath,
    question_row_count: items.length,
  };
}

function writeCropFiles(root, items) {
  for (const item of items) {
    for (const cropPath of item.crop_paths || []) {
      writeText(root, cropPath, 'crop');
    }
    for (const renderPath of item.rendered_pdf_page_paths || []) {
      writeText(root, renderPath, 'render');
    }
  }
}

describe('9231 next-wave candidate gate', () => {
  test('selects only clean, crop-complete, uncovered shard rows', () => {
    const root = fixtureRoot();
    const candidateRows = [
      row(),
      row({
        storage_key: '9231/s18_qp_11/questions/q02.png',
        q_number: 2,
        crop_path: 'data/crops/9231-wave2-shards/9231_p1_s18_standard_001/question-crops/9231_s18_qp_11/q02/q02_page_003.png',
        render_path: 'data/crops/9231-wave2-shards/9231_p1_s18_standard_001/renders/9231_s18_qp_11/9231_s18_qp_11_page_003.png',
      }),
    ];
    const wmRows = [row({
      shard_id: '9231_p1_s20_standard_001',
      storage_key: '9231/s20_qp_11/questions/q01.png',
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf',
      source_freeze_status: 'frozen_pending_source_remediation',
    })];
    const coveredRows = [row({
      shard_id: '9231_p1_s25_standard_001',
      storage_key: '9231/s25_qp_11/questions/q01.png',
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf',
    })];
    const missingCropRows = [row({
      shard_id: '9231_p1_s17_standard_001',
      storage_key: '9231/s17_qp_11/questions/q01.png',
      crop_paths: ['data/crops/missing/q01.png'],
      review_crop_paths: ['data/crops/missing/q01.png'],
      rendered_pdf_page_paths: ['data/crops/missing/page_002.png'],
    })];

    const shards = [
      writeSurfaceFixture(root, '9231_p1_s18_standard_001', candidateRows),
      writeSurfaceFixture(root, '9231_p1_s20_standard_001', wmRows),
      writeSurfaceFixture(root, '9231_p1_s25_standard_001', coveredRows),
      writeSurfaceFixture(root, '9231_p1_s17_standard_001', missingCropRows),
    ];
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', { shards });
    for (const item of [...candidateRows, ...wmRows, ...coveredRows, ...missingCropRows]) {
      writePdf(root, item.source_pdf);
    }
    writeCropFiles(root, [...candidateRows, ...wmRows, ...coveredRows]);
    writeJson(root, 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json', {
      items: coveredRows,
    });
    writeJson(root, 'docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.json', {
      rows: coveredRows,
    });
    writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2.json', {
      items: coveredRows.map((item) => ({ storage_key: item.storage_key, normalized_plain_text: 'covered' })),
    });
    writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json', {
      items: coveredRows.map((item) => ({ storage_key: item.storage_key, normalized_plain_text: 'covered' })),
    });

    const result = build9231NextWaveCandidateGate({
      rootDir: root,
      generatedOn: '2026-06-05',
      inspectPdfTextLayer: false,
    });

    expect(result.gate_status).toBe('candidate_inventory_ready');
    expect(result.summary).toMatchObject({
      scanned_rows: 5,
      crop_ready_rows: 4,
      already_covered_rows: 1,
      wm_or_frozen_rows: 1,
      candidate_rows: 2,
      candidate_shards: 1,
      recommended_shards: 1,
      duplicate_storage_key_rows: 0,
      production_ready_claimed: false,
    });
    expect(result.recommended_shards.map((shard) => shard.shard_id)).toEqual([
      '9231_p1_s18_standard_001',
    ]);
    expect(result.candidate_manifest.items.map((item) => item.storage_key)).toEqual([
      '9231/s18_qp_11/questions/q01.png',
      '9231/s18_qp_11/questions/q02.png',
    ]);
  });

  test('blocks duplicate storage keys from candidacy and records validation counts', () => {
    const root = fixtureRoot();
    const left = row({ shard_id: '9231_p1_s18_standard_001' });
    const right = row({
      shard_id: '9231_p2_s18_standard_001',
      source_pdf: 'data/past-papers/9231Further-Mathematics/paper2/9231_s18_qp_21.pdf',
    });
    const shards = [
      writeSurfaceFixture(root, '9231_p1_s18_standard_001', [left]),
      writeSurfaceFixture(root, '9231_p2_s18_standard_001', [right]),
    ];
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', { shards });
    writePdf(root, left.source_pdf);
    writePdf(root, right.source_pdf);
    writeCropFiles(root, [left, right]);
    writeJson(root, 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json', { items: [] });
    writeJson(root, 'docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.json', { rows: [] });
    writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2.json', { items: [] });
    writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json', { items: [] });

    const result = build9231NextWaveCandidateGate({
      rootDir: root,
      generatedOn: '2026-06-05',
      inspectPdfTextLayer: false,
    });

    expect(result.summary).toMatchObject({
      scanned_rows: 2,
      duplicate_storage_key_rows: 2,
      candidate_rows: 0,
      candidate_shards: 0,
    });
    expect(result.blockers).toContainEqual(expect.objectContaining({
      check: 'duplicate_storage_key',
      storage_key: left.storage_key,
      count: 2,
    }));
  });

  test('writes durable JSON, markdown, and candidate manifest without readiness claims', () => {
    const root = fixtureRoot();
    const candidate = row();
    const shards = [writeSurfaceFixture(root, '9231_p1_s18_standard_001', [candidate])];
    writeJson(root, 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json', { shards });
    writePdf(root, candidate.source_pdf);
    writeCropFiles(root, [candidate]);
    writeJson(root, 'docs/reports/2026-06-05-9231-visual-review-wave1-gate.json', { items: [] });
    writeJson(root, 'docs/reports/2026-06-05-9231-evidence-layers-wave1-gate.json', { rows: [] });
    writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2.json', { items: [] });
    writeJson(root, 'docs/reports/2026-06-05-9231-question-plain-text-v2-consumption.json', { items: [] });

    const result = build9231NextWaveCandidateGate({
      rootDir: root,
      generatedOn: '2026-06-05',
      inspectPdfTextLayer: false,
    });
    const paths = write9231NextWaveCandidateGateOutputs(result, { rootDir: root });
    const markdown = render9231NextWaveCandidateGateMarkdown(result);

    expect(fs.existsSync(path.join(root, paths.jsonOut))).toBe(true);
    expect(fs.existsSync(path.join(root, paths.markdownOut))).toBe(true);
    expect(fs.existsSync(path.join(root, paths.manifestOut))).toBe(true);
    expect(markdown).toContain('Next-Wave Candidate Gate');
    expect(markdown).toContain('production_ready_claimed: `false`');
    expect(markdown).toContain('not question_plain_text_v1/v2');
    expect(markdown).not.toContain('9231 production-ready');
  });
});
