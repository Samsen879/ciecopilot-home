import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const syllabusCode = '9709';
const syllabusVersion = '2026-2027_v4';
const examYearRange = '2026-2027';
const sourceDocumentId = 'cambridge-9709-syllabus-2026-2027-v4';

const rawSectionsPath = path.join(repoRoot, 'data/syllabus/9709/raw_sections_v1.json');
const sourceInventoryPath = path.join(repoRoot, 'data/syllabus/9709/source_inventory.json');
const draftOutputPath = path.join(
  repoRoot,
  'data/syllabus/9709/canonical_topic_tree_draft_v1.json',
);
const reportOutputPath = path.join(
  repoRoot,
  'docs/reports/9709-canonical-topic-tree-draft-v1.md',
);

const componentRouteScope = {
  P1: ['AS Level', 'A Level'],
  P2: ['AS Level'],
  P3: ['A Level'],
  P4: ['AS Level', 'A Level'],
  P5: ['AS Level', 'A Level'],
  P6: ['A Level'],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value, fallback = 'item') {
  const slug = String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return slug || fallback;
}

function compactSlug(value, fallback) {
  const parts = slugify(value, fallback).split('_').filter(Boolean);
  return parts.slice(0, 8).join('_') || fallback;
}

function firstSentence(value) {
  return String(value).split(/(?<=[.!?])\s+/)[0].trim();
}

function sectionTail(sectionRef) {
  return sectionRef.split('>').at(-1).trim();
}

function sourceRef(section, locator) {
  return {
    source_document_id: section.source_document,
    source_type: 'official_syllabus',
    page_ref: section.page_ref,
    section_ref: section.section_ref,
    raw_section_id: section.section_id,
    locator,
  };
}

function reviewState(status, notes = []) {
  if (status === 'needs_human_review') {
    return {
      state: 'pending_human_review',
      reviewed_by: null,
      reviewed_at: null,
      notes,
    };
  }

  return {
    state: 'unreviewed',
    reviewed_by: null,
    reviewed_at: null,
    notes,
  };
}

function baseNode({
  nodeId,
  parentNodeId,
  nodeType,
  topicPath,
  canonicalTitle,
  displayTitle = canonicalTitle,
  componentCode = null,
  paper = null,
  sectionCode = null,
  componentScope = [],
  qualificationRouteScope,
  assumedKnowledge = [],
  status = 'draft',
  reviewNotes = [],
  sourceRefs,
}) {
  return {
    node_id: nodeId,
    parent_node_id: parentNodeId,
    node_type: nodeType,
    topic_path: topicPath,
    canonical_title: canonicalTitle,
    display_title: displayTitle,
    component_code: componentCode,
    paper,
    section_code: sectionCode,
    component_scope: componentScope,
    qualification_route_scope: qualificationRouteScope,
    assumed_knowledge: assumedKnowledge,
    status,
    review_state: reviewState(status, reviewNotes),
    source_refs: sourceRefs,
    aliases: [],
    legacy_paths: [],
  };
}

function extractBullets(section) {
  const bullets = [];
  let current = null;

  for (const line of section.raw_text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('\u2022')) {
      if (current) {
        bullets.push(current.trim());
      }
      current = trimmed.replace(/^\u2022\s*/, '');
    } else if (current && trimmed) {
      current = `${current} ${trimmed}`;
    }
  }

  if (current) {
    bullets.push(current.trim());
  }

  return bullets;
}

function subjectContentSections(rawSections) {
  return rawSections.sections.filter((section) =>
    section.section_id.includes('.3.subject_content.'),
  );
}

function componentIntroSections(rawSections) {
  return subjectContentSections(rawSections)
    .filter((section) => /\.subject_content\.p[1-6]\.introduction$/.test(section.section_id))
    .sort((a, b) => a.section_id.localeCompare(b.section_id));
}

function topicSections(rawSections) {
  return subjectContentSections(rawSections)
    .filter((section) => /\.subject_content\.p[1-6]\.[0-9]+_[0-9]+_/.test(section.section_id))
    .sort((a, b) => a.section_id.localeCompare(b.section_id));
}

function parseComponent(section) {
  const match = section.section_id.match(/\.subject_content\.p([1-6])\.introduction$/);
  if (!match) {
    throw new Error(`Unable to parse component section: ${section.section_id}`);
  }

  const paper = Number(match[1]);
  const componentCode = `P${paper}`;
  const tail = sectionTail(section.section_ref);
  const title = tail
    .replace(/^\d+\s+/, '')
    .replace(/\s*\(for Paper \d+\)\s*$/, '')
    .trim();

  return {
    paper,
    componentCode,
    title,
    componentSlug: `p${paper}`,
    titleSlug: slugify(title),
  };
}

function parseTopicSection(section) {
  const match = section.section_id.match(/\.subject_content\.p([1-6])\.([0-9]+)_([0-9]+)_/);
  if (!match) {
    throw new Error(`Unable to parse topic section: ${section.section_id}`);
  }

  const paper = Number(match[1]);
  const componentCode = `P${paper}`;
  const sectionCode = `${match[2]}.${match[3]}`;
  const tail = sectionTail(section.section_ref);
  const title = tail.replace(/^[0-9]+\.[0-9]+\s+/, '').trim();

  return {
    paper,
    componentCode,
    sectionCode,
    title,
    titleSlug: slugify(title),
    sectionIdStem: `p${paper}.${slugify(title)}`,
  };
}

function componentScope(componentCode, paper) {
  return [{ component_code: componentCode, paper }];
}

function findAssumedKnowledge(section, component) {
  const sentences = section.raw_text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => /Knowledge of|assumed|should be familiar/.test(sentence));

  return sentences.map((sentence, index) => ({
    node_id: null,
    topic_path: [
      syllabusCode,
      'assumed_knowledge',
      component.componentSlug,
      `note_${String(index + 1).padStart(2, '0')}`,
    ],
    note: sentence,
    source_refs: [sourceRef(section, sentence)],
  }));
}

function isSplitCandidate(locator) {
  const value = locator.toLowerCase();
  const hasListMarker =
    value.includes(' and ') ||
    value.includes(' and/or ') ||
    value.includes(' including ') ||
    value.includes(' together with ') ||
    value.includes(' or ');
  const hasCompoundPunctuation = /[,;:]/.test(value);

  return locator.length > 220 || (locator.length > 150 && hasListMarker && hasCompoundPunctuation);
}

function buildDraft() {
  const rawSections = readJson(rawSectionsPath);
  const sourceInventory = readJson(sourceInventoryPath);
  const officialSource = sourceInventory.official_sources.find(
    (source) => source.id === sourceDocumentId,
  );
  if (!officialSource) {
    throw new Error(`Missing official source ${sourceDocumentId}`);
  }

  const sectionsById = new Map(rawSections.sections.map((section) => [section.section_id, section]));
  const coverSection = sectionsById.get(`${sourceDocumentId}.front_matter.cover`);
  const priorKnowledgeSection = sectionsById.get(
    `${sourceDocumentId}.3.subject_content.prior_knowledge`,
  );
  if (!coverSection || !priorKnowledgeSection) {
    throw new Error('Missing required cover or prior-knowledge section');
  }

  const nodes = [];
  const rootNodeId = `${syllabusCode}:${syllabusVersion}:syllabus`;

  nodes.push(
    baseNode({
      nodeId: rootNodeId,
      parentNodeId: null,
      nodeType: 'syllabus',
      topicPath: [syllabusCode],
      canonicalTitle: 'Cambridge International AS & A Level Mathematics 9709',
      displayTitle: 'Mathematics 9709',
      qualificationRouteScope: ['AS Level', 'A Level'],
      sourceRefs: [sourceRef(coverSection, 'Use this syllabus for exams in 2026 and 2027.')],
    }),
  );

  const componentByPaper = new Map();
  for (const section of componentIntroSections(rawSections)) {
    const component = parseComponent(section);
    componentByPaper.set(component.paper, component);
    nodes.push(
      baseNode({
        nodeId: `${syllabusCode}:${syllabusVersion}:component:${component.componentSlug}`,
        parentNodeId: rootNodeId,
        nodeType: 'component',
        topicPath: [syllabusCode, component.titleSlug],
        canonicalTitle: component.title,
        displayTitle: `Paper ${component.paper}: ${component.title}`,
        componentCode: component.componentCode,
        paper: component.paper,
        componentScope: componentScope(component.componentCode, component.paper),
        qualificationRouteScope: componentRouteScope[component.componentCode],
        assumedKnowledge: findAssumedKnowledge(section, component),
        sourceRefs: [sourceRef(section, section.raw_text.trim())],
      }),
    );
  }

  const priorKnowledgeNodeId = `${syllabusCode}:${syllabusVersion}:note:prior_knowledge`;
  nodes.push(
    baseNode({
      nodeId: priorKnowledgeNodeId,
      parentNodeId: rootNodeId,
      nodeType: 'note',
      topicPath: [syllabusCode, 'prior_knowledge'],
      canonicalTitle: 'Prior knowledge',
      componentScope: [],
      qualificationRouteScope: ['AS Level', 'A Level'],
      sourceRefs: [sourceRef(priorKnowledgeSection, firstSentence(priorKnowledgeSection.raw_text))],
    }),
  );

  const parsedTopicSections = topicSections(rawSections).map((section) => ({
    section,
    parsed: parseTopicSection(section),
  }));
  const sectionTitles = new Map();
  for (const { parsed } of parsedTopicSections) {
    const key = slugify(parsed.title);
    sectionTitles.set(key, (sectionTitles.get(key) ?? 0) + 1);
  }

  const sectionNodeByRawSectionId = new Map();
  const mergeCandidates = [];
  const splitCandidates = [];
  const bulletMappings = [];

  for (const { section, parsed } of parsedTopicSections) {
    const component = componentByPaper.get(parsed.paper);
    if (!component) {
      throw new Error(`Missing component for paper ${parsed.paper}`);
    }

    const repeatedTitle = sectionTitles.get(slugify(parsed.title)) > 1;
    const status = repeatedTitle ? 'needs_human_review' : 'draft';
    const reviewNotes = repeatedTitle
      ? ['Repeated official section title across components; retained as component-scoped draft pending merge/reuse review.']
      : [];
    const nodeId = `${syllabusCode}:${syllabusVersion}:section:${parsed.sectionIdStem}`;
    sectionNodeByRawSectionId.set(section.section_id, nodeId);
    if (repeatedTitle) {
      mergeCandidates.push({
        node_id: nodeId,
        title: parsed.title,
        section_ref: section.section_ref,
        reason: 'Repeated official section title appears in more than one component.',
      });
    }

    nodes.push(
      baseNode({
        nodeId,
        parentNodeId: `${syllabusCode}:${syllabusVersion}:component:${component.componentSlug}`,
        nodeType: 'section',
        topicPath: [syllabusCode, component.titleSlug, parsed.titleSlug],
        canonicalTitle: parsed.title,
        componentCode: parsed.componentCode,
        paper: parsed.paper,
        sectionCode: parsed.sectionCode,
        componentScope: componentScope(parsed.componentCode, parsed.paper),
        qualificationRouteScope: componentRouteScope[parsed.componentCode],
        status,
        reviewNotes,
        sourceRefs: [sourceRef(section, sectionTail(section.section_ref))],
      }),
    );
  }

  for (const section of subjectContentSections(rawSections)) {
    const bullets = extractBullets(section);
    if (bullets.length === 0) {
      continue;
    }

    const topicParsed = /\.subject_content\.p[1-6]\.[0-9]+_[0-9]+_/.test(section.section_id)
      ? parseTopicSection(section)
      : null;
    const parentNodeId = topicParsed
      ? sectionNodeByRawSectionId.get(section.section_id)
      : priorKnowledgeNodeId;
    const component = topicParsed ? componentByPaper.get(topicParsed.paper) : null;

    bullets.forEach((locator, index) => {
      const bulletNumber = String(index + 1).padStart(2, '0');
      const slug = `lo${bulletNumber}_${compactSlug(locator, 'objective')}`;
      const status = isSplitCandidate(locator) ? 'needs_human_review' : 'draft';
      const reviewNotes =
        status === 'needs_human_review'
          ? ['Official bullet contains multiple concepts or long notation-heavy wording; retained as one node pending human split review.']
          : [];
      const nodeType = topicParsed ? 'learning_objective' : 'note';
      const stem = topicParsed ? topicParsed.sectionIdStem : 'prior_knowledge';
      const nodeId = `${syllabusCode}:${syllabusVersion}:${nodeType}:${stem}.${slug}`;
      const topicPath = topicParsed
        ? [syllabusCode, component.titleSlug, topicParsed.titleSlug, slug]
        : [syllabusCode, 'prior_knowledge', slug];

      if (status === 'needs_human_review') {
        splitCandidates.push({
          node_id: nodeId,
          raw_section_id: section.section_id,
          reason: 'Compound or notation-heavy official bullet kept unsplit for draft v1.',
        });
      }

      bulletMappings.push({
        raw_section_id: section.section_id,
        bullet_number: index + 1,
        node_id: nodeId,
      });

      nodes.push(
        baseNode({
          nodeId,
          parentNodeId,
          nodeType,
          topicPath,
          canonicalTitle: locator,
          componentCode: topicParsed ? topicParsed.componentCode : null,
          paper: topicParsed ? topicParsed.paper : null,
          sectionCode: topicParsed ? topicParsed.sectionCode : null,
          componentScope: topicParsed
            ? componentScope(topicParsed.componentCode, topicParsed.paper)
            : [],
          qualificationRouteScope: topicParsed
            ? componentRouteScope[topicParsed.componentCode]
            : ['AS Level', 'A Level'],
          status,
          reviewNotes,
          sourceRefs: [sourceRef(section, locator)],
        }),
      );
    });
  }

  const draft = {
    schema_version: 'v1',
    contract_id: '9709_syllabus_topic_tree_schema_v1',
    syllabus_code: syllabusCode,
    syllabus_version: syllabusVersion,
    exam_year_range: examYearRange,
    source_lock: {
      source_document_id: officialSource.id,
      official_pdf_url: officialSource.official_pdf_url,
      official_qualification_page: officialSource.official_qualification_page,
      sha256: officialSource.sha256,
      accessed_date: officialSource.accessed_date,
    },
    nodes,
  };

  return {
    draft,
    reportData: {
      bulletMappings,
      mergeCandidates,
      splitCandidates,
      legacyComparisonInputs: sourceInventory.existing_repo_syllabus_or_curriculum_files,
      statusCounts: nodes.reduce((counts, node) => {
        counts[node.status] = (counts[node.status] ?? 0) + 1;
        return counts;
      }, {}),
      nodeTypeCounts: nodes.reduce((counts, node) => {
        counts[node.node_type] = (counts[node.node_type] ?? 0) + 1;
        return counts;
      }, {}),
      sectionBulletCounts: subjectContentSections(rawSections)
        .map((section) => ({
          raw_section_id: section.section_id,
          section_ref: section.section_ref,
          bullet_count: extractBullets(section).length,
        }))
        .filter((entry) => entry.bullet_count > 0),
    },
  };
}

function renderList(items, renderItem) {
  if (items.length === 0) {
    return '- None.\n';
  }
  return `${items.map(renderItem).join('\n')}\n`;
}

function renderReport(reportData, draft) {
  const mappedBulletCount = reportData.bulletMappings.length;
  const unmappedBulletCount = 0;
  const statusSummary = Object.entries(reportData.statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `\`${status}\`: ${count}`)
    .join(', ');
  const nodeTypeSummary = Object.entries(reportData.nodeTypeCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `\`${type}\`: ${count}`)
    .join(', ');

  return `# 9709 canonical topic tree draft v1

Issue: #289
Parent tracker: #286
Source contract predecessors: #287, #288

## Verdict

This is a first draft canonical topic tree for Cambridge International AS & A Level Mathematics 9709, generated from the locked official syllabus source artifacts only.

- Draft JSON: \`data/syllabus/9709/canonical_topic_tree_draft_v1.json\`
- Schema contract: \`data/contracts/9709_syllabus_topic_tree_schema_v1.json\`
- Source inventory: \`data/syllabus/9709/source_inventory.json\`
- Raw section layer: \`data/syllabus/9709/raw_sections_v1.json\`

## Source lock

- Source document ID: \`${draft.source_lock.source_document_id}\`
- Syllabus code: \`${draft.syllabus_code}\`
- Syllabus version: \`${draft.syllabus_version}\`
- Exam year range: \`${draft.exam_year_range}\`
- Official PDF SHA-256: \`${draft.source_lock.sha256}\`
- Accessed date: \`${draft.source_lock.accessed_date}\`

Existing legacy or candidate files under \`data/syllabus\` and \`data/curriculum\` were not used as source truth for this draft. They remain comparison-only inputs for later human reconciliation.

## Coverage summary

- Total nodes: ${draft.nodes.length}
- Node types: ${nodeTypeSummary}
- Status counts: ${statusSummary}
- Mapped subject-content bullets: ${mappedBulletCount}
- Unmapped subject-content bullets: ${unmappedBulletCount}
- Source-ref posture: every generated node has at least one \`official_syllabus\` source ref resolving to the locked raw section layer.
- Boundary posture: no boundary nodes were generated; issue #290 owns boundary extraction.

## Subject-content bullet coverage

Each official subject-content bullet parsed from \`raw_sections_v1.json\` is mapped to one generated node through an exact \`source_refs[].locator\` value. The locator text remains in the JSON source reference; this report keeps the coverage table at section/count level.

| Raw section | Section ref | Bullet count |
| --- | --- | ---: |
${reportData.sectionBulletCounts
  .map(
    (entry) =>
      `| \`${entry.raw_section_id}\` | ${entry.section_ref.replace(/\|/g, '\\|')} | ${entry.bullet_count} |`,
  )
  .join('\n')}

## Unmapped records

- None. All ${mappedBulletCount} official subject-content bullet blocks are mapped to generated nodes.

## Merge candidates

Repeated official section titles were retained as component-scoped nodes and marked for human review instead of being silently merged.

${renderList(
  reportData.mergeCandidates,
  (candidate) =>
    `- \`${candidate.node_id}\` (${candidate.section_ref}): ${candidate.reason}`,
)}

## Split candidates

Compound or notation-heavy official bullet blocks were retained as one learning-objective or note node and marked \`needs_human_review\` instead of being split without official granularity.

${renderList(
  reportData.splitCandidates,
  (candidate) =>
    `- \`${candidate.node_id}\` from \`${candidate.raw_section_id}\`: ${candidate.reason}`,
)}

## Legacy comparison inputs

The following repository files are explicitly non-authoritative for this issue and were not used to generate canonical nodes:

${renderList(
  reportData.legacyComparisonInputs,
  (entry) =>
    `- \`${entry.path}\` - ${entry.classification}; allowed use: ${entry.allowed_use}.`,
)}
`;
}

const { draft, reportData } = buildDraft();
writeJson(draftOutputPath, draft);
fs.writeFileSync(reportOutputPath, `${renderReport(reportData, draft).trimEnd()}\n`);

console.log(JSON.stringify({
  draft: path.relative(repoRoot, draftOutputPath),
  report: path.relative(repoRoot, reportOutputPath),
  node_count: draft.nodes.length,
  mapped_subject_content_bullets: reportData.bulletMappings.length,
  unmapped_subject_content_bullets: 0,
  merge_candidates: reportData.mergeCandidates.length,
  split_candidates: reportData.splitCandidates.length,
}, null, 2));
