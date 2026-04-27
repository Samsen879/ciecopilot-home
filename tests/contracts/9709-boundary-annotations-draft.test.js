import fs from 'node:fs';
import path from 'node:path';

const artifactPath = path.join(
  process.cwd(),
  'data/syllabus/9709/boundary_annotations_draft_v1.json',
);
const reportPath = path.join(process.cwd(), 'docs/reports/9709-boundary-audit-v1.md');
const rawSectionsPath = path.join(process.cwd(), 'data/syllabus/9709/raw_sections_v1.json');
const sourceInventoryPath = path.join(process.cwd(), 'data/syllabus/9709/source_inventory.json');
const topicTreePath = path.join(
  process.cwd(),
  'data/syllabus/9709/canonical_topic_tree_draft_v1.json',
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function compact(text) {
  return text.replace(/\s+/g, ' ').trim();
}

describe('9709 boundary annotations draft v1', () => {
  test('publishes a separate draft artifact and audit report', () => {
    const artifact = readJson(artifactPath);
    const report = fs.readFileSync(reportPath, 'utf8');

    expect(artifact.schema_version).toBe('9709_boundary_annotations_draft_v1');
    expect(artifact.issue).toBe(290);
    expect(artifact.parent_tracker).toBe(286);
    expect(artifact.boundary_annotations.length).toBeGreaterThan(0);
    expect(artifact.canonical_topic_tree_mutation).toBe(false);
    expect(report).toContain('Issue: #290');
    expect(report).toContain('Boundary annotations remain separate from the canonical topic tree');
  });

  test('keeps every boundary claim sourced to the locked official raw section layer', () => {
    const artifact = readJson(artifactPath);
    const rawSections = readJson(rawSectionsPath);
    const sourceInventory = readJson(sourceInventoryPath);
    const rawById = new Map(rawSections.sections.map((section) => [section.section_id, section]));
    const officialSourceIds = new Set(
      sourceInventory.official_sources.map((source) => source.id),
    );

    expect(officialSourceIds.has(artifact.source_lock.source_document_id)).toBe(true);

    for (const annotation of artifact.boundary_annotations) {
      expect(annotation.source_refs.length).toBeGreaterThan(0);
      for (const sourceRef of annotation.source_refs) {
        expect(sourceRef.source_type).toBe('official_syllabus');
        expect(officialSourceIds.has(sourceRef.source_document_id)).toBe(true);
        expect(rawById.has(sourceRef.raw_section_id)).toBe(true);
        expect(compact(rawById.get(sourceRef.raw_section_id).raw_text)).toContain(
          compact(sourceRef.locator),
        );
      }
    }
  });

  test('links only to existing draft topic-tree nodes when node links are source-supported', () => {
    const artifact = readJson(artifactPath);
    const topicTree = readJson(topicTreePath);
    const nodeIds = new Set(topicTree.nodes.map((node) => node.node_id));

    for (const annotation of artifact.boundary_annotations) {
      expect(annotation.linked_node_ids).toEqual(
        expect.arrayContaining(annotation.linked_node_ids),
      );
      for (const nodeId of annotation.linked_node_ids) {
        expect(nodeIds.has(nodeId)).toBe(true);
      }
    }
  });

  test('represents required boundary categories and all component scopes explicitly', () => {
    const artifact = readJson(artifactPath);
    const kinds = artifact.boundary_annotations.map((annotation) => annotation.boundary_kind);
    const componentCodes =
      artifact.boundary_annotations.flatMap((annotation) =>
        annotation.component_scope.map((component) => component.component_code),
      );

    expect(kinds).toEqual(
      expect.arrayContaining([
        'assessment_scope',
        'component_only_coverage',
        'assumed_knowledge',
        'excluded_knowledge',
        'route_constraint',
      ]),
    );
    expect(componentCodes).toEqual(expect.arrayContaining(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']));
  });

  test('marks cross-component and ambiguous boundaries for human review', () => {
    const artifact = readJson(artifactPath);
    const byId = new Map(
      artifact.boundary_annotations.map((annotation) => [annotation.boundary_id, annotation]),
    );

    for (const annotation of artifact.boundary_annotations) {
      if (annotation.cross_component_claim) {
        expect(
          annotation.component_scope.length + annotation.linked_node_ids.length,
        ).toBeGreaterThan(1);
      }
      if (annotation.review_reasons.length > 0) {
        expect(annotation.needs_human_review).toBe(true);
        expect(annotation.status).toBe('needs_human_review');
      }
    }

    expect(
      byId.get('9709:2026-2027_v4:boundary:route.as_p1_p2.no_a_level_progression')
        .needs_human_review,
    ).toBe(false);
    expect(
      byId.get('9709:2026-2027_v4:boundary:route.no_p4_p6_combination')
        .cross_component_claim,
    ).toBe(true);
    expect(
      byId.get('9709:2026-2027_v4:boundary:relationship.p2_subset_p3')
        .needs_human_review,
    ).toBe(true);
    expect(
      byId.get('9709:2026-2027_v4:boundary:component.p4.no_vector_notation')
        .boundary_kind,
    ).toBe('excluded_knowledge');
  });
});
