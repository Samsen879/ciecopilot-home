import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  build9231WmSourceRemediationGate,
  render9231WmSourceRemediationMarkdown,
  write9231WmSourceRemediationOutputs,
} from '../build_9231_wm_source_remediation_gate.js';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), '9231-wm-source-remediation-'));
}

function writeJson(root, repoPath, payload) {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return filePath;
}

function writePdf(root, repoPath, body = 'fixture') {
  const filePath = path.join(root, repoPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `%PDF-1.7\n${body}\n%%EOF\n`);
  return filePath;
}

function fakeInspectionByBasename(overrides = {}) {
  return async (filePath) => {
    const base = path.basename(filePath);
    const text = fs.readFileSync(filePath, 'utf8');
    const hasRedContent = text.includes('red current');
    const defaults = {
      page_count: 16,
      title: base,
      first_page_text_sample: 'FURTHER MATHEMATICS 9231/11 Paper 1 May/June 2020',
      red_pixel_summary: {
        scale: 1.5,
        sum_red_pixels: hasRedContent ? 123 : 0,
        max_red_pixels: hasRedContent ? 123 : 0,
        positive_red_pages: hasRedContent ? 1 : 0,
        total_pages_rendered: 16,
      },
    };
    return {
      ...defaults,
      ...(overrides[base] || {}),
    };
  };
}

function writeFreezeManifest(root) {
  writeJson(root, 'data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json', {
    schema_version: '9231_wm_source_freeze_manifest_v1',
    manifest_id: '9231_wm_source_freeze_2026_06_05_manifest_v1',
    generated_on: '2026-06-05',
    subject_code: '9231',
    freeze_status: 'frozen_pending_source_remediation',
    summary: {
      frozen_row_count: 7,
      frozen_source_pdf_count: 1,
      affected_shard_count: 1,
    },
    affected_source_pdfs: {
      'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf': 7,
    },
    affected_shards: {
      '9231_p1_s20_standard_001': 7,
    },
    items: [
      {
        source_manifest: 'data/manifests/9231_p1_s20_standard_001_page_chain_surface_v1.json',
        source_manifest_index: 0,
        shard_id: '9231_p1_s20_standard_001',
        storage_key: '9231/s20_qp_11/questions/q01.png',
        source_pdf: 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf',
        source_pdf_stem: 'WM_9231_s20_qp_11',
        q_number: 1,
        crop_status: 'complete',
      },
    ],
  });
}

describe('9231 WM source remediation gate', () => {
  test('replaces red-positive tracked WM PDF bytes in place and records before/after evidence', async () => {
    const root = fixtureRoot();
    writeFreezeManifest(root);
    writePdf(root, 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf', 'red current');
    writePdf(root, 'tmp/9231_source_candidates/2026-06-06/9231_s20_qp_11.qualifiedquest.pdf', 'clean candidate');

    const result = await build9231WmSourceRemediationGate({
      rootDir: root,
      generatedOn: '2026-06-06',
      candidateDir: 'tmp/9231_source_candidates/2026-06-06',
      replace: true,
      inspectPdf: fakeInspectionByBasename(),
    });

    expect(result.gate_status).toBe('pass');
    expect(result.summary).toMatchObject({
      target_source_pdf_count: 1,
      verified_or_replaced_count: 1,
      replaced_count: 1,
      red_pixel_gate_pass_count: 1,
      provenance_pass_count: 1,
      page_count_match_count: 1,
      pdf_signature_pass_count: 1,
      total_after_red_pixels: 0,
      freeze_posture_lifted_by_machine_gate: true,
      production_ready_claimed: false,
      db_search_rag_consumption_claimed: false,
    });

    const [record] = result.records;
    expect(record.source_pdf).toBe(
      'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf',
    );
    expect(record.candidate.disposition).toBe('selected_clean_replacement');
    expect(record.replacement.action).toBe('replaced_bytes_in_place');
    expect(record.before.sha256).not.toBe(record.after.sha256);
    expect(record.after.sha256).toBe(record.candidate.sha256);
    expect(record.after.red_pixel_summary.sum_red_pixels).toBe(0);
    expect(record.after.pdf_signature_status).toMatchObject({
      starts_with_pdf_signature: true,
      eof_marker_present: true,
    });
  });

  test('stops when a clean candidate changes page count', async () => {
    const root = fixtureRoot();
    writeFreezeManifest(root);
    writePdf(root, 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf', 'red current');
    writePdf(root, 'tmp/9231_source_candidates/2026-06-06/9231_s20_qp_11.qualifiedquest.pdf', 'clean candidate');

    await expect(
      build9231WmSourceRemediationGate({
        rootDir: root,
        generatedOn: '2026-06-06',
        candidateDir: 'tmp/9231_source_candidates/2026-06-06',
        replace: true,
        inspectPdf: fakeInspectionByBasename({
          '9231_s20_qp_11.qualifiedquest.pdf': {
            page_count: 15,
            red_pixel_summary: {
              scale: 1.5,
              sum_red_pixels: 0,
              max_red_pixels: 0,
              positive_red_pages: 0,
              total_pages_rendered: 15,
            },
          },
        }),
      }),
    ).rejects.toMatchObject({
      code: '9231_WM_SOURCE_REMEDIATION_STOP',
      stop_conditions: expect.arrayContaining(['candidate_page_count_mismatch']),
    });
  });

  test('writes remediation manifest and bounded non-production markdown', async () => {
    const root = fixtureRoot();
    writeFreezeManifest(root);
    writePdf(root, 'data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf', 'red current');
    writePdf(root, 'tmp/9231_source_candidates/2026-06-06/9231_s20_qp_11.qualifiedquest.pdf', 'clean candidate');
    const result = await build9231WmSourceRemediationGate({
      rootDir: root,
      generatedOn: '2026-06-06',
      candidateDir: 'tmp/9231_source_candidates/2026-06-06',
      replace: true,
      inspectPdf: fakeInspectionByBasename(),
    });

    const paths = write9231WmSourceRemediationOutputs(result, {
      rootDir: root,
      manifestOut: 'data/manifests/9231_wm_source_remediation_2026_06_06_manifest_v1.json',
      jsonOut: 'docs/reports/2026-06-06-9231-wm-source-remediation-gate.json',
      markdownOut: 'docs/reports/2026-06-06-9231-wm-source-remediation-gate.md',
    });

    expect(fs.existsSync(path.join(root, paths.manifestOut))).toBe(true);
    expect(fs.existsSync(path.join(root, paths.jsonOut))).toBe(true);
    expect(fs.existsSync(path.join(root, paths.markdownOut))).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(path.join(root, paths.manifestOut), 'utf8'));
    expect(manifest.schema_version).toBe('9231_wm_source_remediation_manifest_v1');
    expect(manifest.records).toHaveLength(1);

    const markdown = render9231WmSourceRemediationMarkdown(result);
    expect(markdown).toContain('9231 WM Source Remediation Gate');
    expect(markdown).toContain('Freeze posture lifted by machine gate: `true`');
    expect(markdown).toContain('DB/search/RAG consumption claimed: false');
    expect(markdown).toContain('No crop, visual, text, authority, DB, search, RAG, or release work was run.');
    expect(markdown).not.toContain('production-ready');
  });
});
