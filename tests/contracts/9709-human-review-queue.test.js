import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queuePath = path.join(root, 'data/syllabus/9709/human_review_queue_v1.json');
const reportPath = path.join(root, 'docs/reports/9709-human-review-queue-v1.md');
const draftPath = path.join(root, 'data/syllabus/9709/canonical_topic_tree_draft_v1.json');
const boundariesPath = path.join(root, 'data/syllabus/9709/boundary_annotations_draft_v1.json');
const rawSectionsPath = path.join(root, 'data/syllabus/9709/raw_sections_v1.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('9709 node-level human review queue v1', () => {
  test('publishes one pending review item per unresolved topic node and boundary claim', () => {
    const queue = readJson(queuePath);
    const draft = readJson(draftPath);
    const boundaries = readJson(boundariesPath);

    const pendingTopicIds = draft.nodes
      .filter((node) => node.status === 'needs_human_review')
      .map((node) => node.node_id)
      .sort();
    const pendingBoundaryIds = boundaries.boundary_annotations
      .filter((annotation) => annotation.status === 'needs_human_review' || annotation.needs_human_review)
      .map((annotation) => annotation.boundary_id)
      .sort();

    expect(queue).toMatchObject({
      schema_version: '9709_human_review_queue_v1',
      subject_code: '9709',
      syllabus_version: '2026-2027_v4',
      approval_state: 'draft_only',
    });
    expect(queue.summary.pending_topic_nodes).toBe(pendingTopicIds.length);
    expect(queue.summary.pending_boundary_claims).toBe(pendingBoundaryIds.length);
    expect(queue.summary.review_items_total).toBe(pendingTopicIds.length + pendingBoundaryIds.length);
    expect(queue.review_items.length).toBe(queue.summary.review_items_total);

    const topicIds = queue.review_items
      .filter((item) => item.owner_type === 'topic_node')
      .map((item) => item.owner_id)
      .sort();
    const boundaryIds = queue.review_items
      .filter((item) => item.owner_type === 'boundary_claim')
      .map((item) => item.owner_id)
      .sort();

    expect(topicIds).toEqual(pendingTopicIds);
    expect(boundaryIds).toEqual(pendingBoundaryIds);
  });

  test('anchors every review item in official raw source context', () => {
    const queue = readJson(queuePath);
    const rawSections = readJson(rawSectionsPath);
    const rawById = new Map(rawSections.sections.map((section) => [section.section_id, section]));
    const ids = new Set();

    for (const item of queue.review_items) {
      expect(ids.has(item.item_id)).toBe(false);
      ids.add(item.item_id);
      expect(['topic_node', 'boundary_claim']).toContain(item.owner_type);
      expect(item.owner_id).toEqual(expect.any(String));
      expect(item.review_reason).toEqual(expect.any(String));
      expect(item.recommended_action).toEqual(expect.any(String));
      expect(item.decision_options.length).toBeGreaterThanOrEqual(3);
      expect(item.decision.status).toBe('pending');
      expect(item.source_refs.length).toBeGreaterThan(0);

      for (const sourceRef of item.source_refs) {
        const rawSection = rawById.get(sourceRef.raw_section_id);
        expect(rawSection).toBeDefined();
        expect(sourceRef.source_type).toBe('official_syllabus');
        expect(rawSection.raw_text).toContain(sourceRef.locator);
      }

      expect(item.source_context.raw_section_excerpt).toEqual(expect.any(String));
      expect(item.source_context.raw_section_excerpt.length).toBeLessThanOrEqual(900);
    }
  });

  test('groups review items into small human batches without approving anything', () => {
    const queue = readJson(queuePath);
    const report = fs.readFileSync(reportPath, 'utf8');
    const batchedIds = new Set(queue.review_batches.flatMap((batch) => batch.item_ids));
    const itemIds = new Set(queue.review_items.map((item) => item.item_id));

    expect(queue.review_batches.length).toBeGreaterThan(1);
    for (const batch of queue.review_batches) {
      expect(batch.item_ids.length).toBeGreaterThan(0);
      expect(batch.item_ids.length).toBeLessThanOrEqual(20);
      expect(batch.status).toBe('pending');
    }
    expect(batchedIds).toEqual(itemIds);
    expect(queue.approved_baseline_freeze_attempted).toBe(false);

    expect(report).toContain('# 9709 Human Review Queue V1');
    expect(report).toContain('Do not freeze from this artifact');
    for (const batch of queue.review_batches) {
      expect(report).toContain(batch.batch_id);
    }
  });
});
