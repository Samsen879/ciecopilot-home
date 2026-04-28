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
    const expectedCountsByRawSection = new Map();

    for (const section of subjectContentSections(rawSections)) {
      const count = extractBulletLocators(section).length;
      if (count > 0) {
        expectedCountsByRawSection.set(section.section_id, count);
      }
    }

    const actualCountsByRawSection = new Map();
    for (const node of draft.nodes.filter(
      (entry) =>
        ['learning_objective', 'note'].includes(entry.node_type) &&
        /\.lo[0-9]{2}_/.test(entry.node_id),
    )) {
      const rawSectionId = node.source_refs[0].raw_section_id;
      if (expectedCountsByRawSection.has(rawSectionId)) {
        actualCountsByRawSection.set(
          rawSectionId,
          (actualCountsByRawSection.get(rawSectionId) ?? 0) + 1,
        );
      }
    }

    expect([...expectedCountsByRawSection.values()].reduce((sum, count) => sum + count, 0)).toBe(
      155,
    );
    expect(actualCountsByRawSection).toEqual(expectedCountsByRawSection);
  });

  test('keeps notes/examples text out of canonical objective locators', () => {
    const draft = readJson(draftPath);
    const rawSections = readJson(rawSectionsPath);
    const objective = draft.nodes.find(
      (node) =>
        node.node_id ===
        '9709:2026-2027_v4:learning_objective:p4.newton_s_laws_of_motion.lo01_apply_newton_s_laws_of_motion_to_the',
    );
    const rawSection = rawSections.sections.find(
      (section) => section.section_id === objective.source_refs[0].raw_section_id,
    );

    expect(objective).toBeDefined();
    expect(rawSection).toBeDefined();
    expect(objective.canonical_title).toContain(
      'apply Newton\u2019s laws of motion to the linear motion of a particle',
    );
    expect(objective.canonical_title).not.toContain('If any other forces resisting motion');
    expect(objective.canonical_title).not.toContain('this will be indicated in the question');
    expect(objective.source_refs[0].locator).not.toContain('If any other forces resisting motion');
    expect(rawSection.raw_text).toContain(objective.source_refs[0].locator);
  });

  test('keeps all Newtons laws objective titles free of notes/examples fragments', () => {
    const draft = readJson(draftPath);
    const expectedTitles = new Map([
      [
        '9709:2026-2027_v4:learning_objective:p4.newton_s_laws_of_motion.lo01_apply_newton_s_laws_of_motion_to_the',
        'apply Newton\u2019s laws of motion to the linear motion of a particle of constant mass moving under the action of constant forces, which may include friction, tension in an inextensible string and thrust in a connecting rod',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p4.newton_s_laws_of_motion.lo02_use_the_relationship_between_mass_and_weight',
        'use the relationship between mass and weight',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p4.newton_s_laws_of_motion.lo03_solve_simple_problems_which_may_be_modelled_as',
        'solve simple problems which may be modelled as the motion of a particle moving vertically or on an inclined plane with constant acceleration',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p4.newton_s_laws_of_motion.lo04_solve_simple_problems_which_may_be_modelled_as',
        'solve simple problems which may be modelled as the motion of connected particles.',
      ],
    ]);
    const forbiddenFragments = [
      'rough plane where the acceleration',
      'up the plane is different',
      'moving down the plane',
      'string passing over a smooth pulley',
      'car towing',
      'rigid tow-bar',
      'questions are mainly numerical',
      'value 10',
    ];

    for (const [nodeId, expectedTitle] of expectedTitles) {
      const objective = draft.nodes.find((node) => node.node_id === nodeId);
      expect(objective).toBeDefined();
      expect(objective.canonical_title).toBe(expectedTitle);
      for (const forbidden of forbiddenFragments) {
        expect(objective.canonical_title).not.toContain(forbidden);
      }
      expect(objective.source_refs.length).toBeGreaterThan(0);
    }
  });

  test('keeps known 9709 notes and OCR fragments out of draft objective titles', () => {
    const draft = readJson(draftPath);
    const byId = new Map(draft.nodes.map((node) => [node.node_id, node]));
    const expectedTitles = new Map([
      [
        '9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo06_calculate_unbiased_estimates_of_the_population_mean_and',
        'calculate unbiased estimates of the population mean and variance from a sample, using either raw or summarised data',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p6.hypothesis_tests.lo01_understand_the_nature_of_a_hypothesis_test_the',
        'understand the nature of a hypothesis test, the difference between one-tailed and two-tailed tests, and the terms null hypothesis, alternative hypothesis, significance level, rejection region (or critical region), acceptance region and test statistic',
      ],
    ]);
    const pollutedPattern =
      /using either is required|average[’']|alternative questions are set|\^ h\b|sin sin 90c/i;

    for (const [nodeId, expectedTitle] of expectedTitles) {
      const objective = byId.get(nodeId);
      expect(objective).toBeDefined();
      expect(objective.canonical_title).toBe(expectedTitle);
      expect(objective.display_title).toBe(expectedTitle);
    }

    for (const node of draft.nodes) {
      expect(node.canonical_title).not.toMatch(pollutedPattern);
      expect(node.display_title).not.toMatch(pollutedPattern);
    }
  });

  test('keeps broader notes-column fragments out of draft objective titles', () => {
    const draft = readJson(draftPath);
    const byId = new Map(draft.nodes.map((node) => [node.node_id, node]));
    const expectedTitles = new Map([
      [
        '9709:2026-2027_v4:learning_objective:p1.functions.lo03_determine_whether_or_not_a_given_function_is',
        'determine whether or not a given function is one-one, and find the inverse of a one-one function in simple cases',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p1.functions.lo04_illustrate_in_graphical_terms_the_relation_between_a',
        'illustrate in graphical terms the relation between a one-one function and its inverse',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p4.momentum.lo01_use_the_definition_of_linear_momentum_and_show',
        'use the definition of linear momentum and show understanding of its vector nature',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p5.discrete_random_variables.lo03_use_formulae_for_the_expectation_and_variance_of',
        'use formulae for the expectation and variance of the binomial distribution and for the expectation of the geometric distribution.',
      ],
      [
        '9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo05_use_the_central_limit_theorem_where_appropriate',
        'use the Central Limit Theorem where appropriate',
      ],
    ]);

    for (const [nodeId, expectedTitle] of expectedTitles) {
      const objective = byId.get(nodeId);
      expect(objective).toBeDefined();
      expect(objective.status).toBe('draft');
      expect(objective.canonical_title).toBe(expectedTitle);
      expect(objective.display_title).toBe(expectedTitle);
    }

    const forbiddenDraftTitlePattern =
      /Sketches should|For motion in one dimension only|Proofs of formulae|Excluding cases|In 2 or 3 dimensions|The introduction and evaluation|Where a differential equation|Notations Re|Full details of the working|ground on the particle|Central Limit appropriate/i;

    for (const node of draft.nodes.filter(
      (entry) => entry.node_type === 'learning_objective' && entry.status === 'draft',
    )) {
      expect(node.canonical_title).not.toMatch(forbiddenDraftTitlePattern);
      expect(node.display_title).not.toMatch(forbiddenDraftTitlePattern);
    }
  });

  test('keeps OCR-damaged objective titles in the human review queue', () => {
    const draft = readJson(draftPath);
    const reviewRequiredPattern =
      /d p i o v l i a s r io|recognise an integrand of the form ,|continuity 15 correction|tan2 iand/i;

    const damagedNodes = draft.nodes.filter((node) =>
      reviewRequiredPattern.test(`${node.canonical_title} ${node.display_title}`),
    );

    expect(damagedNodes.length).toBeGreaterThan(0);
    for (const node of damagedNodes) {
      expect(node.status).toBe('needs_human_review');
      expect(node.review_state.state).toBe('pending_human_review');
    }
  });

  test('uses raw section headings as section source-ref locators', () => {
    const draft = readJson(draftPath);
    const rawSections = readJson(rawSectionsPath);
    const sectionsById = new Map(rawSections.sections.map((section) => [section.section_id, section]));

    for (const node of draft.nodes.filter((entry) => entry.node_type === 'section')) {
      const sourceRef = node.source_refs[0];
      const rawSection = sectionsById.get(sourceRef.raw_section_id);
      expect(rawSection).toBeDefined();
      expect(sourceRef.locator).toBe(rawSection.raw_text.split(/\r?\n/)[0].trim());
      expect(rawSection.raw_text).toContain(sourceRef.locator);
    }
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
