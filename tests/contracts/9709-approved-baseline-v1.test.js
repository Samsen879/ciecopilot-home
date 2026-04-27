import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');

const root = process.cwd();
const paths = {
  approvedTree: 'data/syllabus/9709/canonical_topic_tree_v1.json',
  approvedBoundaries: 'data/syllabus/9709/boundary_annotations_v1.json',
  humanDecisions: 'data/syllabus/9709/human_review_decisions_v1.json',
  reviewItems: 'data/syllabus/9709/review_items_v1.json',
  schema: 'data/contracts/9709_syllabus_topic_tree_schema_v1.json',
};

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function sourceRefs(value) {
  return Array.isArray(value?.source_refs) ? value.source_refs : [];
}

describe('9709 approved canonical syllabus baseline v1', () => {
  test('records the issue #293 human authority and recommended review decisions', () => {
    const reviewItems = readJson(paths.reviewItems);
    const decisions = readJson(paths.humanDecisions);

    expect(decisions).toMatchObject({
      schema_version: '9709_human_review_decisions_v1',
      issue: 293,
      parent_tracker: 286,
      subject_code: '9709',
      syllabus_version: '2026-2027_v4',
    });
    expect(decisions.human_authority.approval_quote).toBe(
      '我同意，human review通过，以后所有需要human review的都默认通过，继续推进',
    );
    expect(decisions.decision_policy.unresolved_review_items_after_application).toBe(0);
    expect(decisions.carried_review_items).toEqual([]);

    const byId = new Map(decisions.decisions.map((decision) => [decision.review_item_id, decision]));
    expect(byId.size).toBe(reviewItems.review_items.length);

    for (const item of reviewItems.review_items) {
      const decision = byId.get(item.item_id);
      const recommended = item.recommended_options.find((option) => option.recommended === true);
      expect(decision).toBeDefined();
      expect(decision.decision_status).toBe('approved');
      expect(decision.selected_option_id).toBe(recommended.option_id);
      expect(decision.selected_machine_action).toBe(recommended.machine_action);
      expect(decision.selected_option_recommended).toBe(true);
      expect(sourceRefs(decision).length).toBeGreaterThan(0);
    }
  });

  test('freezes all topic-tree nodes as approved while preserving official source refs', () => {
    const schema = readJson(paths.schema);
    const tree = readJson(paths.approvedTree);
    const validate = new Ajv({ allErrors: true, jsonPointers: true }).compile(schema);

    expect(validate(tree)).toBe(true);
    expect(validate.errors).toBeNull();

    for (const node of tree.nodes) {
      expect(node.status).toBe('approved');
      expect(node.review_state.state).toBe('accepted');
      expect(node.review_state.reviewed_by).toBe('human_review_authority:issue_293');
      expect(node.review_state.notes.join('\n')).toContain(
        'data/syllabus/9709/human_review_decisions_v1.json',
      );
      expect(sourceRefs(node).length).toBeGreaterThan(0);
      for (const sourceRef of sourceRefs(node)) {
        expect(sourceRef.source_type).toBe('official_syllabus');
      }
    }
  });

  test('repairs OCR-damaged node IDs before approval and maps old IDs as deprecated aliases', () => {
    const tree = readJson(paths.approvedTree);
    const byId = new Map(tree.nodes.map((node) => [node.node_id, node]));
    const expectedRepairs = [
      [
        '9709:2026-2027_v4:learning_objective:p1.integration.lo01_u_o_n_f_d_d_i_e',
        '9709:2026-2027_v4:learning_objective:p1.integration.lo01_understand_integration_as_the_reverse_process_of_differentiation',
        'understand integration as the reverse process of differentiation',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p6.the_poisson_distribution.lo05_use_the_normal_distribution_with_continuity_15_correction',
        '9709:2026-2027_v4:learning_objective:p6.the_poisson_distribution.lo05_use_the_normal_distribution_as_an_approximation_to_the_poisson_distribution',
        'use the normal distribution, with continuity correction, as an approximation to the Poisson distribution where appropriate',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo05_use_the_central_limit_appropriate_the_distribution_of',
        '9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo05_use_the_central_limit_theorem_where_appropriate',
        'use the Central Limit Theorem where appropriate',
      ],
    ];

    for (const [oldId, newId, expectedTitleFragment] of expectedRepairs) {
      expect(byId.has(oldId)).toBe(false);
      const repaired = byId.get(newId);
      expect(repaired).toBeDefined();
      expect(repaired.canonical_title).toContain(expectedTitleFragment);
      expect(repaired.legacy_paths).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: oldId,
            source: 'manual_audit',
            status: 'deprecated',
          }),
        ]),
      );
    }
  });

  test('freezes boundary annotations separately with source refs and decision references', () => {
    const artifact = readJson(paths.approvedBoundaries);

    expect(artifact.schema_version).toBe('9709_boundary_annotations_v1');
    expect(artifact.approved_baseline).toBe(true);
    expect(artifact.canonical_topic_tree_mutation).toBe(false);
    expect(artifact.boundary_annotations.length).toBeGreaterThan(0);

    for (const annotation of artifact.boundary_annotations) {
      expect(annotation.status).toBe('approved');
      expect(annotation.needs_human_review).toBe(false);
      expect(sourceRefs(annotation).length).toBeGreaterThan(0);
      expect(annotation.review_state).toMatchObject({
        state: 'accepted',
        reviewed_by: 'human_review_authority:issue_293',
        decision_artifact: 'data/syllabus/9709/human_review_decisions_v1.json',
      });
    }
  });

  test('approved baseline passes the freeze gate with no unresolved review queue', async () => {
    const { build9709SyllabusGateReport } = await import(
      '../../scripts/syllabus/lib/9709-syllabus-gate.js'
    );

    const report = build9709SyllabusGateReport({
      paths: {
        sourceInventory: 'data/syllabus/9709/source_inventory.json',
        rawSections: 'data/syllabus/9709/raw_sections_v1.json',
        canonicalTopicTree: paths.approvedTree,
        boundaryAnnotations: paths.approvedBoundaries,
        humanReviewDecisions: paths.humanDecisions,
        reviewItems: paths.reviewItems,
        topicTreeSchema: paths.schema,
      },
      approvedBaselineAttempted: true,
      generatedAt: '2026-04-27T00:00:00.000Z',
    });

    expect(report).toMatchObject({
      status: 'pass',
      approved_baseline_attempted: true,
      approved_baseline_ready: true,
      blocked_reasons: [],
    });
    expect(report.review.unresolved_count).toBe(0);
    expect(report.human_review.decisions_total).toBeGreaterThan(0);
    expect(report.human_review.carried_review_items).toEqual([]);
    expect(report.gates.find((gate) => gate.name === 'human_review_decisions').status).toBe(
      'pass',
    );
  });
});
