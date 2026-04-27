import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');

const schemaPath = path.join(
  process.cwd(),
  'data/contracts/9709_syllabus_topic_tree_schema_v1.json',
);

function readSchema() {
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function buildValidator() {
  const ajv = new Ajv({ allErrors: true, jsonPointers: true });
  const validate = ajv.compile(readSchema());
  return validate;
}

function buildValidTopicTree(overrides = {}) {
  const syllabusNodeRef = {
    source_document_id: 'cambridge-9709-syllabus-2026-2027-v4',
    source_type: 'official_syllabus',
    page_ref: 'p. 1',
    section_ref: 'Cover',
    raw_section_id: 'cambridge-9709-syllabus-2026-2027-v4.front_matter.cover',
    locator: 'Use this syllabus for exams in 2026 and 2027.',
  };

  const componentRef = {
    source_document_id: 'cambridge-9709-syllabus-2026-2027-v4',
    source_type: 'official_syllabus',
    page_ref: 'pp. 8-17',
    section_ref: '2 Syllabus overview',
    raw_section_id: 'cambridge-9709-syllabus-2026-2027-v4.2.syllabus_overview',
    locator: 'Paper 1 Pure Mathematics 1',
  };

  const sectionRef = {
    source_document_id: 'cambridge-9709-syllabus-2026-2027-v4',
    source_type: 'official_syllabus',
    page_ref: 'p. 19',
    section_ref: '3 Subject content > 1 Pure Mathematics 1 > 1.1 Quadratics',
    raw_section_id: 'cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_1_quadratics',
    locator: 'Quadratics',
  };

  return {
    schema_version: 'v1',
    contract_id: '9709_syllabus_topic_tree_schema_v1',
    syllabus_code: '9709',
    syllabus_version: '2026-2027_v4',
    exam_year_range: '2026-2027',
    source_lock: {
      source_document_id: 'cambridge-9709-syllabus-2026-2027-v4',
      official_pdf_url: 'https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf',
      official_qualification_page: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/',
      sha256: 'dd0131f3cd8d4e3c270e7936cbb909c15f4cb8053f8337b67c16e8ec0b8bc5e5',
      accessed_date: '2026-04-27',
    },
    nodes: [
      {
        node_id: '9709:2026-2027_v4:syllabus',
        parent_node_id: null,
        node_type: 'syllabus',
        topic_path: ['9709'],
        canonical_title: 'Cambridge International AS & A Level Mathematics 9709',
        display_title: 'Mathematics 9709',
        component_code: null,
        paper: null,
        section_code: null,
        component_scope: [],
        qualification_route_scope: ['AS Level', 'A Level'],
        assumed_knowledge: [],
        status: 'draft',
        review_state: {
          state: 'unreviewed',
          reviewed_by: null,
          reviewed_at: null,
          notes: [],
        },
        source_refs: [syllabusNodeRef],
        aliases: [],
        legacy_paths: [],
      },
      {
        node_id: '9709:2026-2027_v4:component:p1',
        parent_node_id: '9709:2026-2027_v4:syllabus',
        node_type: 'component',
        topic_path: ['9709', 'pure_mathematics_1'],
        canonical_title: 'Pure Mathematics 1',
        display_title: 'Paper 1: Pure Mathematics 1',
        component_code: 'P1',
        paper: 1,
        section_code: null,
        component_scope: [
          {
            component_code: 'P1',
            paper: 1,
          },
        ],
        qualification_route_scope: ['AS Level', 'A Level'],
        assumed_knowledge: [],
        status: 'draft',
        review_state: {
          state: 'unreviewed',
          reviewed_by: null,
          reviewed_at: null,
          notes: [],
        },
        source_refs: [componentRef],
        aliases: [],
        legacy_paths: [
          {
            path: '9709.p1',
            source: 'legacy_topic_path',
            status: 'candidate',
            source_refs: [componentRef],
          },
        ],
      },
      {
        node_id: '9709:2026-2027_v4:section:p1.quadratics',
        parent_node_id: '9709:2026-2027_v4:component:p1',
        node_type: 'section',
        topic_path: ['9709', 'pure_mathematics_1', 'quadratics'],
        canonical_title: 'Quadratics',
        display_title: 'Quadratics',
        component_code: 'P1',
        paper: 1,
        section_code: 'P1.1',
        component_scope: [
          {
            component_code: 'P1',
            paper: 1,
          },
        ],
        qualification_route_scope: ['AS Level', 'A Level'],
        assumed_knowledge: [
          {
            node_id: '9709:2026-2027_v4:section:prerequisite.algebra',
            topic_path: ['9709', 'assumed_knowledge', 'algebra'],
            note: 'Assumed algebraic manipulation knowledge.',
            source_refs: [sectionRef],
          },
        ],
        status: 'needs_human_review',
        review_state: {
          state: 'blocked',
          reviewed_by: null,
          reviewed_at: null,
          notes: ['Awaiting canonical extraction from the official raw section.'],
        },
        source_refs: [sectionRef],
        aliases: [
          {
            value: 'Quadratic equations',
            source: 'legacy_display_title',
            status: 'candidate',
            source_refs: [sectionRef],
          },
        ],
        legacy_paths: [
          {
            path: '9709.p1.quadratics',
            source: 'legacy_topic_path',
            status: 'candidate',
            source_refs: [sectionRef],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function expectInvalid(document, expectedSnippet) {
  const validate = buildValidator();
  const valid = validate(document);
  expect(valid).toBe(false);
  expect(validate.errors.map((error) => `${error.dataPath} ${error.message}`)).toEqual(
    expect.arrayContaining([expect.stringContaining(expectedSnippet)]),
  );
}

describe('9709 syllabus topic tree schema v1', () => {
  test('accepts a 9709 tree that separates durable IDs from display titles and carries source refs', () => {
    const validate = buildValidator();
    const document = buildValidTopicTree();

    expect(validate(document)).toBe(true);
    expect(validate.errors).toBeNull();
  });

  test('requires the issue contract fields on each node-like claim', () => {
    const document = buildValidTopicTree({
      nodes: [
        {
          node_id: '9709:2026-2027_v4:section:p1.quadratics',
          parent_node_id: '9709:2026-2027_v4:component:p1',
          node_type: 'section',
          topic_path: ['9709', 'pure_mathematics_1', 'quadratics'],
          canonical_title: 'Quadratics',
          display_title: 'Quadratics',
        },
      ],
    });

    expectInvalid(document, "should have required property 'source_refs'");
  });

  test('rejects display-title-shaped durable IDs', () => {
    const document = buildValidTopicTree();
    document.nodes[1].node_id = document.nodes[1].display_title;

    expectInvalid(document, 'should match pattern');
  });

  test('rejects invalid lifecycle and review states', () => {
    const document = buildValidTopicTree();
    document.nodes[2].status = 'released';
    document.nodes[2].review_state.state = 'approved_by_script';

    expectInvalid(document, 'should be equal to one of the allowed values');
  });

  test('requires approved nodes to have accepted review state', () => {
    const document = buildValidTopicTree();
    document.nodes[2].status = 'approved';
    document.nodes[2].review_state.state = 'unreviewed';

    expectInvalid(document, 'should be equal to constant');
  });

  test('keeps the schema reusable by not hard-coding 9709 as the only syllabus code', () => {
    const validate = buildValidator();
    const document = buildValidTopicTree({
      syllabus_code: '9231',
      source_lock: {
        source_document_id: 'cambridge-9231-syllabus-placeholder',
        official_pdf_url: 'https://www.cambridgeinternational.org/example.pdf',
        official_qualification_page: 'https://www.cambridgeinternational.org/example/',
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        accessed_date: '2026-04-27',
      },
      nodes: [
        {
          ...buildValidTopicTree().nodes[0],
          node_id: '9231:2026-2027_v1:syllabus',
          topic_path: ['9231'],
          source_refs: [
            {
              source_document_id: 'cambridge-9231-syllabus-placeholder',
              source_type: 'official_syllabus',
              page_ref: 'p. 1',
              section_ref: 'Cover',
              raw_section_id: null,
              locator: 'Placeholder source reference for schema reuse test.',
            },
          ],
        },
      ],
    });

    expect(validate(document)).toBe(true);
    expect(validate.errors).toBeNull();
  });
});
