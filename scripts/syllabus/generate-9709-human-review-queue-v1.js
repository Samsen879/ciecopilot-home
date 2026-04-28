#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const paths = {
  draftTree: 'data/syllabus/9709/canonical_topic_tree_draft_v1.json',
  boundaryAnnotations: 'data/syllabus/9709/boundary_annotations_draft_v1.json',
  rawSections: 'data/syllabus/9709/raw_sections_v1.json',
  queue: 'data/syllabus/9709/human_review_queue_v1.json',
  report: 'docs/reports/9709-human-review-queue-v1.md',
};

const batchOrder = [
  'boundary-overlays',
  'repeated-sections',
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'other',
];

const batchLabels = {
  'boundary-overlays': 'Boundary overlays',
  'repeated-sections': 'Repeated section titles',
  p1: 'P1 Pure Mathematics 1',
  p2: 'P2 Pure Mathematics 2',
  p3: 'P3 Pure Mathematics 3',
  p4: 'P4 Mechanics',
  p5: 'P5 Probability & Statistics 1',
  p6: 'P6 Probability & Statistics 2',
  other: 'Other review items',
};

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'));
}

function writeJson(relPath, value) {
  const absolutePath = path.join(repoRoot, relPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(relPath, value) {
  const absolutePath = path.join(repoRoot, relPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value, 'utf8');
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function shortHash(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 10);
}

function ownerItemId(ownerType, ownerId) {
  return `9709-review-${ownerType === 'boundary_claim' ? 'boundary' : 'topic'}-${shortHash(ownerId)}`;
}

function rawSectionExcerpt(rawSection, locator) {
  const rawText = rawSection?.raw_text ?? '';
  const compactRaw = compactText(rawText);
  const compactLocator = compactText(locator);
  const index = compactLocator ? compactRaw.indexOf(compactLocator) : -1;
  const start = index === -1 ? 0 : Math.max(0, index - 260);
  const end = index === -1
    ? Math.min(compactRaw.length, 850)
    : Math.min(compactRaw.length, index + compactLocator.length + 420);
  return compactRaw.slice(start, end).trim();
}

function flagsForNode(node) {
  const notes = normalizeArray(node.review_state?.notes).join(' ');
  const title = `${node.canonical_title} ${node.display_title}`;
  const flags = [];

  if (/Repeated official section title/i.test(notes)) {
    flags.push('repeated_section_title');
  }
  if (/OCR-damaged extraction|d p i o v l i a s r io|recognise an integrand of the form\s*,|tan2 iand|\bc m\b/i.test(`${notes} ${title}`)) {
    flags.push('ocr_or_formula_damage');
  }
  if (/Notes|Sketches should|Proofs of formulae|For motion in one dimension only|not required|should be known/i.test(title)) {
    flags.push('notes_column_risk');
  }
  if (/multiple concepts|long notation-heavy|[,;:]| and | or |– /.test(`${notes} ${title}`)) {
    flags.push('compound_or_notation_heavy');
  }

  return [...new Set(flags.length > 0 ? flags : ['human_review_required'])];
}

function categoryForNode(node, flags) {
  if (node.node_type === 'section') {
    return 'repeated_section_title';
  }
  if (flags.includes('ocr_or_formula_damage') || flags.includes('notes_column_risk')) {
    return 'ocr_or_notes_cleanup';
  }
  return 'compound_objective_split';
}

function recommendedActionForNode(node, flags) {
  if (node.node_type === 'section') {
    return 'accept_component_scoped_section_or_defer';
  }
  if (flags.includes('ocr_or_formula_damage') || flags.includes('notes_column_risk')) {
    return 'repair_title_from_official_source_or_keep_pending';
  }
  return 'accept_atomic_official_bullet_or_split';
}

function nodeDecisionOptions(node, flags) {
  if (node.node_type === 'section') {
    return [
      'accept_component_scoped_section',
      'merge_with_shared_concept_later',
      'keep_pending',
    ];
  }
  if (flags.includes('ocr_or_formula_damage') || flags.includes('notes_column_risk')) {
    return [
      'rewrite_title_from_official_source',
      'keep_pending_for_pdf_comparison',
      'split_or_deprecate_if_unsalvageable',
    ];
  }
  return [
    'accept_as_atomic_official_bullet',
    'split_into_human_authored_child_objectives',
    'keep_pending',
  ];
}

function reviewReasonForNode(node, flags) {
  if (node.node_type === 'section') {
    return 'Repeated official section title across components; choose whether the approved tree keeps component-scoped sections.';
  }
  if (flags.includes('ocr_or_formula_damage')) {
    return 'Objective title still contains formula/OCR damage or notation-heavy text that should not be approved without human comparison.';
  }
  if (flags.includes('notes_column_risk')) {
    return 'Objective title may contain Notes/examples column text and needs human source comparison.';
  }
  return 'Official bullet is compound or notation-heavy; choose atomic approval, split, or keep pending.';
}

function batchKeyForItem(item) {
  if (item.owner_type === 'boundary_claim') {
    return 'boundary-overlays';
  }
  if (item.node_type === 'section') {
    return 'repeated-sections';
  }
  return String(item.component_code ?? 'other').toLowerCase();
}

function buildTopicReviewItem(node, rawById) {
  const flags = flagsForNode(node);
  const sourceRefs = normalizeArray(node.source_refs);
  const primaryRef = sourceRefs[0] ?? {};
  const rawSection = rawById.get(primaryRef.raw_section_id);

  return {
    item_id: ownerItemId('topic_node', node.node_id),
    owner_type: 'topic_node',
    owner_id: node.node_id,
    node_type: node.node_type,
    component_code: node.component_code,
    paper: node.paper,
    section_code: node.section_code,
    category: categoryForNode(node, flags),
    risk_flags: flags,
    current_title: node.canonical_title,
    display_title: node.display_title,
    review_reason: reviewReasonForNode(node, flags),
    recommended_action: recommendedActionForNode(node, flags),
    decision_options: nodeDecisionOptions(node, flags),
    source_refs: sourceRefs,
    source_context: {
      raw_section_id: primaryRef.raw_section_id ?? null,
      section_ref: primaryRef.section_ref ?? null,
      locator: primaryRef.locator ?? null,
      raw_section_excerpt: rawSectionExcerpt(rawSection, primaryRef.locator),
    },
    decision: {
      status: 'pending',
      selected_option_id: null,
      proposed_title: null,
      notes: [],
    },
  };
}

function buildBoundaryReviewItem(annotation, rawById) {
  const sourceRefs = normalizeArray(annotation.source_refs);
  const primaryRef = sourceRefs[0] ?? {};
  const rawSection = rawById.get(primaryRef.raw_section_id);

  return {
    item_id: ownerItemId('boundary_claim', annotation.boundary_id),
    owner_type: 'boundary_claim',
    owner_id: annotation.boundary_id,
    boundary_kind: annotation.boundary_kind,
    category: 'boundary_overlay',
    risk_flags: normalizeArray(annotation.review_reasons).length > 0
      ? normalizeArray(annotation.review_reasons)
      : ['boundary_human_review_required'],
    current_claim: annotation.claim,
    review_reason: normalizeArray(annotation.review_reasons).join('; ')
      || 'Boundary claim is marked for human review before approved-baseline freeze.',
    recommended_action: 'confirm_boundary_overlay_or_keep_pending',
    decision_options: [
      'approve_boundary_overlay',
      'revise_boundary_claim',
      'keep_pending',
    ],
    source_refs: sourceRefs,
    source_context: {
      raw_section_id: primaryRef.raw_section_id ?? null,
      section_ref: primaryRef.section_ref ?? null,
      locator: primaryRef.locator ?? null,
      raw_section_excerpt: rawSectionExcerpt(rawSection, primaryRef.locator),
    },
    decision: {
      status: 'pending',
      selected_option_id: null,
      proposed_claim: null,
      notes: [],
    },
  };
}

function buildBatches(reviewItems) {
  const grouped = new Map();
  for (const key of batchOrder) {
    grouped.set(key, []);
  }

  for (const item of reviewItems) {
    const key = batchKeyForItem(item);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(item);
  }

  const batches = [];
  let index = 1;
  for (const key of batchOrder) {
    const items = grouped.get(key) ?? [];
    for (let offset = 0; offset < items.length; offset += 20) {
      const chunk = items.slice(offset, offset + 20);
      const suffix = items.length > 20 ? `-${Math.floor(offset / 20) + 1}` : '';
      batches.push({
        batch_id: `9709-human-review-batch-${String(index).padStart(2, '0')}-${key}${suffix}`,
        title: batchLabels[key] ?? key,
        status: 'pending',
        recommended_review_order: index,
        item_ids: chunk.map((item) => item.item_id),
      });
      index += 1;
    }
  }

  return batches;
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function buildReport(queue) {
  const batchRows = queue.review_batches.map((batch) => (
    `| \`${batch.batch_id}\` | ${markdownEscape(batch.title)} | ${batch.item_ids.length} | ${batch.status} |`
  ));
  const itemRows = queue.review_items.map((item) => {
    const label = item.current_title ?? item.current_claim ?? item.owner_id;
    return `| \`${item.item_id}\` | ${item.owner_type} | ${markdownEscape(item.category)} | ${markdownEscape(label).slice(0, 180)} | ${markdownEscape(item.recommended_action)} |`;
  });

  return `# 9709 Human Review Queue V1

Do not freeze from this artifact. This queue is a draft-only human review worklist for unresolved 9709 syllabus nodes and boundary claims.

## Summary

- Topic nodes needing review: ${queue.summary.pending_topic_nodes}
- Boundary claims needing review: ${queue.summary.pending_boundary_claims}
- Total review items: ${queue.summary.review_items_total}
- Approval state: \`${queue.approval_state}\`
- Approved baseline freeze attempted: ${queue.approved_baseline_freeze_attempted}

## Source Artifacts

- Draft topic tree: \`${queue.source_artifacts.canonical_topic_tree_draft}\`
- Draft boundary annotations: \`${queue.source_artifacts.boundary_annotations_draft}\`
- Raw sections: \`${queue.source_artifacts.raw_sections}\`

## Suggested Batches

| Batch | Scope | Items | Status |
| --- | --- | ---: | --- |
${batchRows.join('\n')}

## Review Items

| Item | Owner | Category | Current title/claim | Recommended action |
| --- | --- | --- | --- | --- |
${itemRows.join('\n')}

## Human Decision Rules

- Choose one \`decision_options[]\` value per item in the JSON.
- If the title or claim is rewritten, record the replacement in \`decision.proposed_title\` or \`decision.proposed_claim\`.
- Keep any item pending when the official PDF needs direct visual comparison.
- Only a later explicit decision artifact may be consumed by the freeze script.
`;
}

export function build9709HumanReviewQueueV1({ generatedAt = new Date().toISOString() } = {}) {
  const draftTree = readJson(paths.draftTree);
  const boundaryAnnotations = readJson(paths.boundaryAnnotations);
  const rawSections = readJson(paths.rawSections);
  const rawById = new Map(rawSections.sections.map((section) => [section.section_id, section]));

  const topicReviewItems = normalizeArray(draftTree.nodes)
    .filter((node) => node.status === 'needs_human_review')
    .map((node) => buildTopicReviewItem(node, rawById));
  const boundaryReviewItems = normalizeArray(boundaryAnnotations.boundary_annotations)
    .filter((annotation) => annotation.status === 'needs_human_review' || annotation.needs_human_review)
    .map((annotation) => buildBoundaryReviewItem(annotation, rawById));
  const reviewItems = [...boundaryReviewItems, ...topicReviewItems];

  return {
    schema_version: '9709_human_review_queue_v1',
    generated_at: generatedAt,
    parent_tracker: 286,
    subject_code: '9709',
    syllabus_version: draftTree.syllabus_version,
    approval_state: 'draft_only',
    approved_baseline_freeze_attempted: false,
    source_lock: draftTree.source_lock,
    source_artifacts: {
      canonical_topic_tree_draft: paths.draftTree,
      boundary_annotations_draft: paths.boundaryAnnotations,
      raw_sections: paths.rawSections,
      gate_report: 'docs/reports/9709-syllabus-gate-report.json',
    },
    summary: {
      pending_topic_nodes: topicReviewItems.length,
      pending_boundary_claims: boundaryReviewItems.length,
      review_items_total: reviewItems.length,
    },
    review_batches: buildBatches(reviewItems),
    review_items: reviewItems,
  };
}

export function write9709HumanReviewQueueV1(options = {}) {
  const queue = build9709HumanReviewQueueV1(options);
  writeJson(paths.queue, queue);
  writeText(paths.report, buildReport(queue));
  return {
    queue,
    paths,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = write9709HumanReviewQueueV1();
  process.stdout.write(`${JSON.stringify({
    queue: result.paths.queue,
    report: result.paths.report,
    review_items_total: result.queue.summary.review_items_total,
    batches: result.queue.review_batches.length,
  }, null, 2)}\n`);
}
