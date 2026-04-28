import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const draftPath = 'data/syllabus/9709/canonical_topic_tree_draft_v1.json';

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

describe('9709 freeze approval semantics', () => {
  test('requires explicit decision coverage before a needs-human-review draft node can be approved', async () => {
    const { validateFreezeDecisionCoverage } = await import(
      '../../scripts/syllabus/freeze-9709-approved-baseline-v1.js'
    );
    expect(validateFreezeDecisionCoverage).toEqual(expect.any(Function));

    const draftTree = readJson(draftPath);
    const reviewNode = draftTree.nodes.find((node) => node.status === 'needs_human_review');
    expect(reviewNode).toBeDefined();

    const result = validateFreezeDecisionCoverage({
      draftTree,
      humanReviewDecisions: {
        schema_version: '9709_human_review_decisions_v1',
        decisions: [],
        carried_review_items: [],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'approved_node_missing_review_decision_coverage',
          owner_type: 'topic_node',
          owner_id: reviewNode.node_id,
        }),
      ]),
    );
  });
});
