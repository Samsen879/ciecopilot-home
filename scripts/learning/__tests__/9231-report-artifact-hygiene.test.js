import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function readJson(repoPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, repoPath), 'utf8'));
}

function readText(repoPath) {
  return fs.readFileSync(path.join(ROOT, repoPath), 'utf8');
}

function indexBulletFor(indexText, artifactName) {
  return indexText
    .split('\n')
    .find((line) => line.startsWith('- ') && line.includes(artifactName));
}

describe('9231 report artifact hygiene', () => {
  test('INDEX describes the current generic next-wave candidate gate summary', () => {
    const report = readJson('docs/reports/2026-06-05-9231-next-wave-candidate-gate.json');
    const index = readText('docs/reports/INDEX.md');
    const line = indexBulletFor(index, '2026-06-05-9231-next-wave-candidate-gate.md/json');
    const summary = report.summary;

    expect(line).toBeDefined();
    expect(line).toContain(`Scanned 64 surfaces / ${summary.scanned_rows} rows`);
    expect(line).toContain(`crop-ready ${summary.crop_ready_rows}`);
    expect(line).toContain(`crop/render incomplete ${summary.crop_or_render_incomplete_rows}`);
    expect(line).toContain(`already covered ${summary.already_covered_rows}`);
    expect(line).toContain(`WM/frozen ${summary.wm_or_frozen_rows}`);
    expect(line).toContain(`duplicate storage-key rows ${summary.duplicate_storage_key_rows}`);
    expect(line).toContain(
      `recommends ${summary.recommended_shards} candidate shards / ${summary.candidate_rows} rows / ${summary.candidate_source_pdfs} source PDFs`,
    );
    expect(line).toContain('not production-ready and not DB/search/RAG live consumption');

    const manifestLine = indexBulletFor(
      index,
      'data/manifests/9231_next_wave_candidates_2026_06_05_manifest_v1.json',
    );
    expect(manifestLine).toBeDefined();
    expect(manifestLine).toContain(
      `${summary.recommended_shards} candidate shards / ${summary.candidate_rows} rows`,
    );
    expect(manifestLine).toContain(`${summary.candidate_source_pdfs} source PDFs`);
  });

  test('generic candidate manifest mirrors the generic candidate gate summary', () => {
    const report = readJson('docs/reports/2026-06-05-9231-next-wave-candidate-gate.json');
    const manifest = readJson('data/manifests/9231_next_wave_candidates_2026_06_05_manifest_v1.json');

    expect(manifest.summary).toMatchObject({
      candidate_rows: report.summary.candidate_rows,
      candidate_shards: report.summary.candidate_shards,
      recommended_shards: report.summary.recommended_shards,
      source_pdfs: report.summary.candidate_source_pdfs,
    });
    expect(manifest.items).toHaveLength(report.summary.candidate_rows);
    expect(manifest.recommended_shard_ids).toHaveLength(report.summary.recommended_shards);
  });
});
