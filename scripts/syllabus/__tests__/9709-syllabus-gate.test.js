import fs from 'node:fs';
import path from 'node:path';

const realPaths = {
  sourceInventory: 'data/syllabus/9709/source_inventory.json',
  rawSections: 'data/syllabus/9709/raw_sections_v1.json',
  canonicalTopicTree: 'data/syllabus/9709/canonical_topic_tree_draft_v1.json',
  boundaryAnnotations: 'data/syllabus/9709/boundary_annotations_draft_v1.json',
  topicTreeSchema: 'data/contracts/9709_syllabus_topic_tree_schema_v1.json',
};

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relPath), 'utf8'));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildFixture() {
  return {
    sourceInventory: readJson(realPaths.sourceInventory),
    rawSections: readJson(realPaths.rawSections),
    canonicalTopicTree: readJson(realPaths.canonicalTopicTree),
    boundaryAnnotations: readJson(realPaths.boundaryAnnotations),
    topicTreeSchema: readJson(realPaths.topicTreeSchema),
  };
}

function gateByName(report, gateName) {
  return report.gates.find((gate) => gate.name === gateName);
}

function expectBlocked(report, reason) {
  expect(report.status).toBe('fail');
  expect(report.blocked_reasons).toEqual(expect.arrayContaining([reason]));
}

describe('9709 syllabus gate', () => {
  test('passes the merged official draft artifacts while reporting review and coverage state', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');

    const report = build9709SyllabusGateReport({
      artifacts: buildFixture(),
    });

    expect(report).toMatchObject({
      schema_version: '9709_syllabus_gate_report_v1',
      subject_code: '9709',
      status: 'pass',
      approved_baseline_attempted: false,
      approved_baseline_ready: false,
      blocked_reasons: [],
    });
    expect(gateByName(report, 'schema_validation').status).toBe('pass');
    expect(gateByName(report, 'identity_uniqueness').status).toBe('pass');
    expect(gateByName(report, 'source_refs').status).toBe('pass');
    expect(report.review.unresolved_items.length).toBeGreaterThan(0);
    expect(report.coverage.raw_sections.total).toBeGreaterThan(0);
    expect(report.coverage.raw_sections.unmapped).toEqual(expect.any(Array));
  });

  test('fails schema validation for malformed canonical topic trees', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    delete fixture.canonicalTopicTree.nodes[0].canonical_title;

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'schema_validation_failed');
    expect(gateByName(report, 'schema_validation').errors[0].message).toContain(
      "should have required property 'canonical_title'",
    );
  });

  test('fails duplicate node IDs and duplicate canonical topic paths', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    fixture.canonicalTopicTree.nodes[1].node_id = fixture.canonicalTopicTree.nodes[0].node_id;
    fixture.canonicalTopicTree.nodes[2].topic_path = cloneJson(
      fixture.canonicalTopicTree.nodes[0].topic_path,
    );

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'duplicate_node_id');
    expectBlocked(report, 'duplicate_topic_path');
    expect(gateByName(report, 'identity_uniqueness').errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate_node_id' }),
        expect.objectContaining({ code: 'duplicate_topic_path' }),
      ]),
    );
  });

  test('fails missing source refs on topic nodes and boundary claims', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    fixture.canonicalTopicTree.nodes[0].source_refs = [];
    fixture.boundaryAnnotations.boundary_annotations[0].source_refs = [];

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'missing_source_refs');
    expect(gateByName(report, 'source_refs').errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_source_refs', owner_type: 'topic_node' }),
        expect.objectContaining({ code: 'missing_source_refs', owner_type: 'boundary_claim' }),
      ]),
    );
  });

  test('fails invalid topic-node or boundary status values', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    fixture.canonicalTopicTree.nodes[0].status = 'ready_to_freeze';
    fixture.boundaryAnnotations.boundary_annotations[0].status = 'ready_to_freeze';

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'invalid_status');
    expect(gateByName(report, 'status_contract').errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_status', owner_type: 'topic_node' }),
        expect.objectContaining({ code: 'invalid_status', owner_type: 'boundary_claim' }),
      ]),
    );
  });

  test('fails orphan nodes', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    fixture.canonicalTopicTree.nodes[1].parent_node_id =
      '9709:2026-2027_v4:section:missing_parent';

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'orphan_node');
    expect(gateByName(report, 'graph_integrity').errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'orphan_node' })]),
    );
  });

  test('fails source refs pointing outside source inventory or raw sections', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    fixture.canonicalTopicTree.nodes[0].source_refs[0].raw_section_id =
      'cambridge-9709-syllabus-2026-2027-v4.3.subject_content.missing';
    fixture.boundaryAnnotations.boundary_annotations[0].source_refs[0].source_document_id =
      'cambridge-9709-syllabus-2023-2025-v1';

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'missing_raw_section_ref');
    expectBlocked(report, 'missing_source_inventory_ref');
    expect(gateByName(report, 'source_refs').errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_raw_section_ref' }),
        expect.objectContaining({ code: 'missing_source_inventory_ref' }),
      ]),
    );
  });

  test('reports unmapped raw syllabus sections without failing the draft gate', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    const unmappedSection = {
      ...cloneJson(fixture.rawSections.sections[0]),
      section_id: 'cambridge-9709-syllabus-2026-2027-v4.synthetic.unmapped_section',
      section_ref: 'Synthetic unmapped section',
      raw_text: 'Synthetic unmapped section',
    };
    fixture.rawSections.sections.push(unmappedSection);

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expect(report.status).toBe('pass');
    const rawSectionMappingGate = gateByName(report, 'raw_section_mapping');
    expect(rawSectionMappingGate.status).toBe('warn');
    expect(rawSectionMappingGate.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unmapped_raw_section',
          raw_section_id: unmappedSection.section_id,
        }),
      ]),
    );
    expect(report.coverage.raw_sections.unmapped).toEqual(
      expect.arrayContaining([unmappedSection.section_id]),
    );
  });

  test('fails stale source version or source-lock drift', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    fixture.sourceInventory.source_lock.syllabus_version_tag = '2028-2030_v1';

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'stale_source_lock');
    expect(gateByName(report, 'source_lock').errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'stale_source_lock' })]),
    );
  });

  test('fails approved baseline attempts while human review items remain unresolved', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');

    const report = build9709SyllabusGateReport({
      artifacts: buildFixture(),
      approvedBaselineAttempted: true,
    });

    expectBlocked(report, 'unresolved_review_items');
    expect(report.approved_baseline_attempted).toBe(true);
    expect(report.approved_baseline_ready).toBe(false);
    expect(gateByName(report, 'approved_baseline_freeze').errors[0]).toMatchObject({
      code: 'unresolved_review_items',
    });
  });

  test('fails legacy-file leakage without rejecting candidate legacy-path metadata', async () => {
    const { build9709SyllabusGateReport } = await import('../lib/9709-syllabus-gate.js');
    const fixture = buildFixture();
    fixture.canonicalTopicTree.nodes[0].source_refs[0] = {
      source_document_id: 'data/syllabus/9709syllabus.txt',
      source_type: 'legacy_taxonomy',
      page_ref: null,
      section_ref: null,
      raw_section_id: null,
      locator: 'legacy syllabus text',
    };

    const report = build9709SyllabusGateReport({ artifacts: fixture });

    expectBlocked(report, 'legacy_file_leakage');
    expect(gateByName(report, 'legacy_file_leakage').errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'legacy_file_leakage',
          source_document_id: 'data/syllabus/9709syllabus.txt',
        }),
      ]),
    );
  });

  test('CLI writes the deterministic gate report JSON', async () => {
    const outJson = 'tmp/9709-syllabus-gate-report-test.json';
    const previousExitCode = process.exitCode;
    const { main } = await import('../run_9709_syllabus_gate.js');

    try {
      await main(['--out-json', outJson]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.existsSync(path.join(process.cwd(), outJson))).toBe(true);
      const report = readJson(outJson);
      expect(report).toMatchObject({
        schema_version: '9709_syllabus_gate_report_v1',
        status: 'pass',
        blocked_reasons: [],
        subject_code: '9709',
      });
      expect(report.artifacts).toMatchObject(realPaths);
    } finally {
      process.exitCode = previousExitCode;
      fs.rmSync(path.join(process.cwd(), outJson), { force: true });
    }
  });
});
