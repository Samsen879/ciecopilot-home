import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');

const draftPath = path.join(
  process.cwd(),
  'data/syllabus/9709/canonical_topic_tree_draft_v1.json',
);
const reportPath = path.join(
  process.cwd(),
  'docs/reports/9709-canonical-topic-tree-draft-v1.md',
);
const schemaPath = path.join(
  process.cwd(),
  'data/contracts/9709_syllabus_topic_tree_schema_v1.json',
);
const rawSectionsPath = path.join(process.cwd(), 'data/syllabus/9709/raw_sections_v1.json');
const sourceInventoryPath = path.join(process.cwd(), 'data/syllabus/9709/source_inventory.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function subjectContentSections(rawSections) {
  return rawSections.sections.filter((section) =>
    section.section_id.includes('.3.subject_content.'),
  );
}

function extractBulletLocators(section) {
  const locators = [];
  let current = null;

  for (const line of section.raw_text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('\u2022')) {
      if (current) {
        locators.push(current.trim());
      }
      current = trimmed.replace(/^\u2022\s*/, '');
    } else if (current && trimmed) {
      current = `${current} ${trimmed}`;
    }
  }

  if (current) {
    locators.push(current.trim());
  }

  return locators;
}

function sourceRefKey(sourceRef) {
  return [
    sourceRef.source_document_id,
    sourceRef.raw_section_id,
    sourceRef.locator,
  ].join('\u0000');
}

function collectSourceRefs(node) {
  return [
    ...node.source_refs,
    ...node.assumed_knowledge.flatMap((item) => item.source_refs),
    ...node.aliases.flatMap((item) => item.source_refs),
    ...node.legacy_paths.flatMap((item) => item.source_refs),
  ];
}

describe('9709 canonical topic tree draft v1', () => {
  test('matches the locked topic-tree schema', () => {
    const schema = readJson(schemaPath);
    const draft = readJson(draftPath);
    const validate = new Ajv({ allErrors: true, jsonPointers: true }).compile(schema);

    expect(validate(draft)).toBe(true);
    expect(validate.errors).toBeNull();
  });

  test('keeps every generated node sourced, unapproved, and graph-addressable', () => {
    const draft = readJson(draftPath);
    const ids = new Set();
    const paths = new Set();

    for (const node of draft.nodes) {
      expect(node.source_refs.length).toBeGreaterThan(0);
      expect(['draft', 'needs_human_review']).toContain(node.status);
      expect(node.review_state.state).not.toBe('accepted');
      expect(ids.has(node.node_id)).toBe(false);
      expect(paths.has(node.topic_path.join('/'))).toBe(false);
      ids.add(node.node_id);
      paths.add(node.topic_path.join('/'));
    }

    for (const node of draft.nodes.filter((entry) => entry.parent_node_id)) {
      expect(ids.has(node.parent_node_id)).toBe(true);
    }
  });

  test('resolves source refs to the locked official inventory and raw section layer', () => {
    const draft = readJson(draftPath);
    const rawSections = readJson(rawSectionsPath);
    const sourceInventory = readJson(sourceInventoryPath);
    const officialSourceIds = new Set(
      sourceInventory.official_sources.map((source) => source.id),
    );
    const rawSectionIds = new Set(rawSections.sections.map((section) => section.section_id));

    expect(officialSourceIds.has(draft.source_lock.source_document_id)).toBe(true);

    for (const node of draft.nodes) {
      for (const sourceRef of collectSourceRefs(node)) {
        expect(officialSourceIds.has(sourceRef.source_document_id)).toBe(true);
        expect(rawSectionIds.has(sourceRef.raw_section_id)).toBe(true);
      }
    }
  });

  test('maps every official subject-content bullet to a node source ref', () => {
    const draft = readJson(draftPath);
    const rawSections = readJson(rawSectionsPath);
    const expectedBulletRefs = [];

    for (const section of subjectContentSections(rawSections)) {
      for (const locator of extractBulletLocators(section)) {
        expectedBulletRefs.push(
          sourceRefKey({
            source_document_id: section.source_document,
            raw_section_id: section.section_id,
            locator,
          }),
        );
      }
    }

    const nodeSourceRefs = new Set(
      draft.nodes
        .flatMap((node) => node.source_refs)
        .map((sourceRef) => sourceRefKey(sourceRef)),
    );
    const missing = expectedBulletRefs.filter((ref) => !nodeSourceRefs.has(ref));

    expect(expectedBulletRefs.length).toBe(155);
    expect(missing).toEqual([]);
  });

  test('publishes the human-review report alongside the draft JSON', () => {
    const draft = readJson(draftPath);
    const report = fs.readFileSync(reportPath, 'utf8');
    const reviewNodes = draft.nodes.filter((node) => node.status === 'needs_human_review');

    expect(report).toContain('Mapped subject-content bullets: 155');
    expect(report).toContain('Unmapped subject-content bullets: 0');
    expect(report).toContain('Merge candidates');
    expect(report).toContain('Split candidates');
    expect(reviewNodes.length).toBeGreaterThan(0);
    for (const node of reviewNodes) {
      expect(report).toContain(node.node_id);
    }
  });
});
