import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const originalPaths = [
  'data/syllabus/9709/canonical_topic_tree_v1.json',
  'data/syllabus/9709/boundary_annotations_v1.json',
  'data/syllabus/9709/human_review_decisions_v1.json',
  'docs/reports/9709-syllabus-baseline-freeze-v1.md',
];
const quarantineRoot = 'data/syllabus/9709/quarantine/rejected-baseline-issue-301';
const quarantinePaths = {
  manifest: `${quarantineRoot}/rejection_manifest.json`,
  canonicalTopicTree: `${quarantineRoot}/canonical_topic_tree_v1.json`,
  boundaryAnnotations: `${quarantineRoot}/boundary_annotations_v1.json`,
  humanReviewDecisions: `${quarantineRoot}/human_review_decisions_v1.json`,
  freezeReport: 'docs/reports/quarantine/9709-syllabus-baseline-freeze-v1.rejected.md',
};

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

describe('9709 rejected approved-baseline quarantine', () => {
  test('removes rejected approved baseline artifacts from canonical default locations', () => {
    for (const relPath of originalPaths) {
      expect(exists(relPath)).toBe(false);
    }
  });

  test('keeps the rejected baseline only under an explicit issue #301 quarantine manifest', () => {
    for (const relPath of Object.values(quarantinePaths)) {
      expect(exists(relPath)).toBe(true);
    }

    const manifest = readJson(quarantinePaths.manifest);
    expect(manifest).toMatchObject({
      schema_version: '9709_rejected_baseline_quarantine_v1',
      issue: 301,
      parent_tracker: 286,
      subject_code: '9709',
      rejected_baseline: true,
      canonical_authority: false,
    });
    expect(manifest.rejection_reasons.join('\n')).toMatch(
      /OCR|Notes contamination|wholesale approval/i,
    );
    expect(manifest.artifacts.map((artifact) => artifact.original_path)).toEqual(originalPaths);
    expect(manifest.artifacts.map((artifact) => artifact.quarantine_path)).toEqual([
      quarantinePaths.canonicalTopicTree,
      quarantinePaths.boundaryAnnotations,
      quarantinePaths.humanReviewDecisions,
      quarantinePaths.freezeReport,
    ]);
  });
});
