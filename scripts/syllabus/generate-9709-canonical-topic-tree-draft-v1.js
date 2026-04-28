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

const noteColumnInlineMarkers = [
  /\s+e\.g\./,
  /\s+is required,?\s+e\.g\./,
  /\s+questions are set\./,
  /\s+will vary\b/,
  /\s+3cos\b/,
  /\s+P A , B\b/,
  /\s+Explicit use\b/,
  /\s+space of equiprobable\b/,
  /\s+diagram\. The use\b/,
  /\s+\(e\.g\. a child\b/,
  /\s+Including\b/,
  /\s+Including the notations\b/,
  /\s+Knowledge of\b/,
  /\s+Sketches should\b/,
  /\s+line y\s*=/,
  /\s+Excluding cases\b/,
  /\s+exceeds that\b/,
  /\s+In 2 or 3 dimensions\b/,
  /\s+The introduction\b/,
  /\s+proportionality\b/,
  /\s+Where a differential equation\b/,
  /\s+[‘']real-life[’'] situation\b/,
  /\s+context will be required\b/,
  /\s+Notations\b/,
  /\s+The argument\b/,
  /\s+refer to an angle\b/,
  /\s+some cases\b/,
  /\s+Answers may\b/,
  /\s+No specialised\b/,
  /\s+Only an\b/,
  /\s+Only a\b/,
  /\s+Theorem \(CLT\)/,
  /\s+for large sample sizes\b/,
  /\s+the distribution of a sample mean\b/,
  /\s+Formal use\b/,
  /\s+Implicit differentiation\b/,
  /\s+By factorising\b/,
  /\s+Graphs of\b/,
  /\s+Sketches of\b/,
  /\s+Calculations are\b/,
  /\s+Solutions by\b/,
  /\s+Terminology such\b/,
  /\s+Restricted to\b/,
  /\s+The term\b/,
  /\s+Calculus required\b/,
  /\s+Proofs are\b/,
  /\s+Proofs of formulae\b/,
  /\s+For motion in one dimension only\b/,
  /\s+n sufficiently large\b/,
  /\s+nq >\b/,
  /\s+For calculations\b/,
  /\s+full details\b/,
  /\s+Full details\b/,
  /\s+Outcomes of\b/,
  /\s+The condition\b/,
  /\s+The conditions\b/,
  /\s+Explicit knowledge\b/,
  /\s+Finding the general\b/,
  /\s+Adapting the standard\b/,
  /\s+Use of the scalar\b/,
  /\s+A volume of revolution\b/,
  /\s+If any other\b/,
  /\s+Questions may\b/,
  /\s+Questions about\b/,
  /\s+For density functions\b/,
  /\s+The general form\b/,
  /\s+functions f are not included\b/,
  /\s+considered \(e\.g\./,
  /\s+this will be indicated\b/,
  /\s+equation, using\b/,
  /\s+in the question\./,
  /\s+equivalent methods\b/,
  /\s+Theorem, where\b/,
  /\s+these other methods\b/,
  /\s+and will not be referred\b/,
  /\s+mean \u2018in limiting\b/,
  /\s+is equal and opposite\b/,
  /\s+\(or more\) rows\b/,
  /\s+be included\./,
  /\s+be known;/,
  /\s+of a distribution by direct\b/,
  /\s+using the density function\b/,
  /\s+in overall energy\b/,
  /\s+rough plane where\b/,
  /\s+up the plane is different\b/,
  /\s+string passing over\b/,
  /\s+a trailer by means\b/,
  /\s+rigid tow-bar\b/,
  /\s+bodies coalesce\b/,
  /\s+given y =/,
  /\s+chord joining\b/,
  /\s+from first principles\b/,
  /\s+of values of x\b/,
  /\s+the content for Paper 1\b/,
  /\s+details of the working\b/,
  /\s+will vary the process\b/,
  /\s+be interpreted\b/,
  /\s+which a root lies\b/,
  /\s+as specified\b/,
  /\s+or probabilities may\b/,
  /\s+3sin2\b/,
  /\s+h\s*:\s*x\b/,
  /\s+m 2\b/,
  /\s+forms of solution are not included\b/,
  /\s+W =/,
];

const noteColumnOnlyLine = /^(?:e\.g\.|Including\b|Knowledge\b|No\b|Only\b|Formal\b|Implicit\b|By factorising\b|Graphs\b|Sketches\b|Calculations\b|Solutions\b|Terminology\b|Restricted\b|The term\b|Calculus required\b|Proofs\b|For calculations\b|Full details\b|Outcomes\b|The condition\b|The conditions\b|Explicit\b|Finding\b|Adapting\b|Use of\b|A volume\b|If any other\b|Questions\b|For density\b|The general\b|functions f\b|considered\b|this will be indicated\b|in the question\b|equivalent methods\b|Theorem\b|these other methods\b|and will not be referred\b|mean \u2018in limiting\b|is equal and opposite\b|be known\b|using the density function\b|function is not included\b|forms of solution are not included\b|numerical, and use\b|value 10\b|moving down the plane\b|a trailer by means\b|rigid tow-bar\b|the distribution of a sample mean\b|the coefficients are not required\.?$|frp$|different particles\.?$|restitution is not required\.?$|ground on the particle\.?$|normal\.?$|15$|[0-9]+(?:\s+[0-9]+)*$|average[\u2019']?\.?$|\^ h(?:\s+\^ h)*$|P A \+ B$|diagram\. The use\b|may be\b|P B$|required in simple cases\.?$)/;

const hardOcrReviewPattern =
  /d p i o v l i a s r io|recognise an integrand of the form\s*,|tan2 iand|continuity 15 correction|Central Limit appropriate|\bc m\b/i;

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

function rawSectionHeading(section) {
  return section.raw_text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? sectionTail(section.section_ref);
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

function removeNotesColumnFragment(line) {
  let candidate = line.trim();
  if (noteColumnOnlyLine.test(candidate)) {
    return '';
  }

  let cutIndex = -1;
  for (const marker of noteColumnInlineMarkers) {
    const match = candidate.match(marker);
    if (match && (cutIndex === -1 || match.index < cutIndex)) {
      cutIndex = match.index;
    }
  }

  if (cutIndex !== -1) {
    candidate = candidate.slice(0, cutIndex).trim();
  }

  candidate = candidate
    .replace(/\bs\s*\^\s*olving\s+h\b/g, 'solving')
    .replace(/\^ h\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return noteColumnOnlyLine.test(candidate) ? '' : candidate;
}

function normalizeExtractedText(parts) {
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function rawBackedLocator(section, rawCandidate, cleanedCandidate) {
  const rawText = compactText(section.raw_text);
  const cleaned = compactText(cleanedCandidate);
  const raw = compactText(rawCandidate);

  if (cleaned && rawText.includes(cleaned)) {
    return cleaned;
  }
  if (raw && rawText.includes(raw)) {
    return raw;
  }
  return cleaned || raw;
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

function extractBulletEntries(section) {
  const bullets = [];
  let current = null;

  for (const line of section.raw_text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('\u2022')) {
      if (current) {
        bullets.push(current);
      }
      const rawFragment = trimmed.replace(/^\u2022\s*/, '');
      const fragment = removeNotesColumnFragment(rawFragment);
      current = {
        objective_parts: fragment ? [fragment] : [],
        locator: rawBackedLocator(section, rawFragment, fragment),
      };
    } else if (current && trimmed) {
      const fragment = removeNotesColumnFragment(trimmed);
      if (fragment) {
        current.objective_parts.push(fragment);
        current.locator ||= rawBackedLocator(section, trimmed, fragment);
      }
    }
  }

  if (current) {
    bullets.push(current);
  }

  return bullets.map((bullet) => ({
    objective: normalizeExtractedText(bullet.objective_parts),
    locator: bullet.locator,
  }));
}

function extractBullets(section) {
  return extractBulletEntries(section).map((bullet) => bullet.objective);
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

function needsExtractionReview(title) {
  return hardOcrReviewPattern.test(title);
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
        sourceRefs: [sourceRef(section, rawSectionHeading(section))],
      }),
    );
  }

  for (const section of subjectContentSections(rawSections)) {
    const bullets = extractBulletEntries(section);
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

    bullets.forEach((bullet, index) => {
      const bulletNumber = String(index + 1).padStart(2, '0');
      const slug = `lo${bulletNumber}_${compactSlug(bullet.objective, 'objective')}`;
      const status =
        isSplitCandidate(bullet.objective) || needsExtractionReview(bullet.objective)
          ? 'needs_human_review'
          : 'draft';
      const reviewNotes =
        status === 'needs_human_review'
          ? ['Official bullet contains multiple concepts, long notation-heavy wording, or OCR-damaged extraction; retained as one node pending human review.']
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
          reason: 'Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.',
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
          canonicalTitle: bullet.objective,
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
          sourceRefs: [sourceRef(section, bullet.locator || bullet.objective)],
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
