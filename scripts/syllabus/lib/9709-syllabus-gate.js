import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));

export const SYLLABUS_GATE_SCHEMA_VERSION = '9709_syllabus_gate_report_v1';
export const DEFAULT_9709_SYLLABUS_GATE_REPORT_PATH =
  'docs/reports/9709-syllabus-gate-report.json';

export const DEFAULT_9709_SYLLABUS_GATE_PATHS = {
  sourceInventory: 'data/syllabus/9709/source_inventory.json',
  rawSections: 'data/syllabus/9709/raw_sections_v1.json',
  canonicalTopicTree: 'data/syllabus/9709/canonical_topic_tree_draft_v1.json',
  boundaryAnnotations: 'data/syllabus/9709/boundary_annotations_draft_v1.json',
  reviewItems: 'data/syllabus/9709/review_items_v1.json',
  humanReviewDecisions: 'data/syllabus/9709/human_review_decisions_v1.json',
  topicTreeSchema: 'data/contracts/9709_syllabus_topic_tree_schema_v1.json',
};

const ALLOWED_TOPIC_NODE_STATUSES = new Set([
  'draft',
  'approved',
  'deprecated',
  'needs_human_review',
]);
const ALLOWED_BOUNDARY_STATUSES = new Set([
  'draft',
  'approved',
  'deprecated',
  'needs_human_review',
]);
const OFFICIAL_SOURCE_TYPES = new Set(['official_syllabus', 'official_syllabus_update']);
const TITLE_CONTAMINATION_PATTERNS = [
  {
    code: 'notes_column_fragment',
    pattern:
      /using either is required|alternative questions are set|average[\u2019']\s*\.?|Sketches should|For motion in one dimension only|Proofs of formulae|Excluding cases|In 2 or 3 dimensions|The introduction and evaluation|Where a differential equation|Notations Re|Full details of the working|ground on the particle|Central Limit appropriate/i,
  },
  {
    code: 'ocr_math_fragment',
    pattern:
      /\^ h\b|sin sin 90c|d p i o v l i a s r io|recognise an integrand of the form\s*,|tan2 iand|continuity 15 correction/i,
  },
];
const REVIEW_REQUIRED_NOTE_PATTERNS = [
  /Repeated official section title/i,
  /Official bullet contains multiple concepts/i,
  /pending human/i,
  /human split review/i,
];

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeRootDir(rootDir) {
  return typeof rootDir === 'string' && rootDir.trim() ? rootDir : PROJECT_ROOT;
}

function resolveFromRoot(rootDir, relPath) {
  return path.join(normalizeRootDir(rootDir), relPath);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(rootDir, relPath) {
  return JSON.parse(fs.readFileSync(resolveFromRoot(rootDir, relPath), 'utf8'));
}

function maybeReadJson(rootDir, relPath) {
  if (!relPath) {
    return null;
  }
  const absolutePath = resolveFromRoot(rootDir, relPath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values)];
}

function sortByStableJson(values) {
  return [...values].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeSupportText(value) {
  return compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(value) {
  const stopWords = new Set([
    'and',
    'are',
    'for',
    'from',
    'into',
    'that',
    'the',
    'then',
    'this',
    'use',
    'when',
    'where',
    'with',
  ]);

  return normalizeSupportText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function titleSupportedByLocator(owner = {}, sourceRef = {}) {
  const locatorTokens = significantTokens(sourceRef.locator);
  if (locatorTokens.length === 0) {
    return true;
  }

  const titleTokens = new Set(significantTokens(owner.canonical_title));
  const supportedTokens = locatorTokens.filter((token) => titleTokens.has(token)).length;
  return supportedTokens / locatorTokens.length >= 0.6;
}

function buildGate(name, errors = [], warnings = []) {
  return {
    name,
    status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
    errors: sortByStableJson(errors),
    warnings: sortByStableJson(warnings),
  };
}

function formatAjvError(error = {}) {
  return {
    code: 'schema_validation_failed',
    path: error.dataPath || error.instancePath || '',
    message: error.message || 'schema validation failed',
    params: cloneJson(error.params ?? {}),
  };
}

function isAllowedSyllabusUpdateDocument(sourceInventory = {}, source = {}) {
  const id = String(source.id ?? '').toLowerCase();
  const title = String(source.title ?? '').toLowerCase();
  const lockedExamYears = sourceInventory.source_lock?.exam_years ?? null;
  const embeddedExamYears = `${id} ${title}`.match(/[0-9]{4}-[0-9]{4}/)?.[0] ?? null;
  const examYears = source.exam_years ?? embeddedExamYears;
  const sameExamYears = Boolean(lockedExamYears) && examYears === lockedExamYears;
  const updateLike = id.includes('update') || title.includes('update');

  return Boolean(source.id) && updateLike && sameExamYears;
}

function observedOfficialDocuments(sourceInventory = {}) {
  return [
    ...normalizeArray(sourceInventory.observed_official_documents),
    ...normalizeArray(sourceInventory.observed_official_non_baseline_documents),
    ...normalizeArray(sourceInventory.official_syllabus_updates),
    ...normalizeArray(sourceInventory.observed_official_syllabus_updates),
  ];
}

function officialSourceIds(sourceInventory = {}, sourceType = 'official_syllabus') {
  const sourceIds = normalizeArray(sourceInventory.official_sources).map((source) => source.id);

  if (sourceType === 'official_syllabus_update') {
    sourceIds.push(
      ...observedOfficialDocuments(sourceInventory)
        .filter((source) => isAllowedSyllabusUpdateDocument(sourceInventory, source))
        .map((source) => source.id),
    );
  }

  return new Set(sourceIds.filter(Boolean));
}

function rawSectionIds(rawSections = {}) {
  return new Set(normalizeArray(rawSections.sections).map((section) => section.section_id));
}

function rawSectionsById(rawSections = {}) {
  return new Map(normalizeArray(rawSections.sections).map((section) => [section.section_id, section]));
}

function legacyInventoryPaths(sourceInventory = {}) {
  return new Set(
    normalizeArray(sourceInventory.existing_repo_syllabus_or_curriculum_files)
      .map((entry) => entry.path)
      .filter(Boolean),
  );
}

function canonicalTopicPath(topicPath) {
  return normalizeArray(topicPath)
    .map((segment) => String(segment).trim().toLowerCase())
    .join('/');
}

function collectTopicSourceRefOwners(canonicalTopicTree = {}) {
  const owners = [];

  for (const node of normalizeArray(canonicalTopicTree.nodes)) {
    owners.push({
      owner_type: 'topic_node',
      owner_id: node.node_id ?? null,
      node_type: node.node_type ?? null,
      status: node.status ?? null,
      canonical_title: node.canonical_title ?? null,
      display_title: node.display_title ?? null,
      source_refs: node.source_refs,
    });

    for (const item of normalizeArray(node.assumed_knowledge)) {
      owners.push({
        owner_type: 'assumed_knowledge',
        owner_id: `${node.node_id ?? 'unknown'}#${item.node_id ?? item.note ?? 'unknown'}`,
        source_refs: item.source_refs,
      });
    }

    for (const item of normalizeArray(node.aliases)) {
      owners.push({
        owner_type: 'alias',
        owner_id: `${node.node_id ?? 'unknown'}#${item.value ?? 'unknown'}`,
        source_refs: item.source_refs,
      });
    }

    for (const item of normalizeArray(node.legacy_paths)) {
      owners.push({
        owner_type: 'legacy_path',
        owner_id: `${node.node_id ?? 'unknown'}#${item.path ?? 'unknown'}`,
        source_refs: item.source_refs,
      });
    }
  }

  return owners;
}

function collectBoundarySourceRefOwners(boundaryAnnotations = {}) {
  return normalizeArray(boundaryAnnotations.boundary_annotations).map((annotation) => ({
    owner_type: 'boundary_claim',
    owner_id: annotation.boundary_id ?? null,
    source_refs: annotation.source_refs,
  }));
}

function collectAllSourceRefOwners({ canonicalTopicTree = {}, boundaryAnnotations = {} } = {}) {
  return [
    ...collectTopicSourceRefOwners(canonicalTopicTree),
    ...collectBoundarySourceRefOwners(boundaryAnnotations),
  ];
}

function validateSchema({ canonicalTopicTree = {}, topicTreeSchema = {} } = {}) {
  const ajv = new Ajv({ allErrors: true, jsonPointers: true });
  const validate = ajv.compile(topicTreeSchema);
  const valid = validate(canonicalTopicTree);

  return buildGate(
    'schema_validation',
    valid ? [] : normalizeArray(validate.errors).map(formatAjvError),
  );
}

function validateSourceLock({
  sourceInventory = {},
  rawSections = {},
  canonicalTopicTree = {},
  boundaryAnnotations = {},
} = {}) {
  const errors = [];
  const lockedSourceDocumentId = sourceInventory.source_lock?.locked_source_document_id;
  const lockedVersion = sourceInventory.source_lock?.syllabus_version_tag;
  const lockedExamYears = sourceInventory.source_lock?.exam_years;
  const officialSource = normalizeArray(sourceInventory.official_sources).find(
    (source) => source.id === lockedSourceDocumentId,
  );

  function stale(field, expected, actual, artifact) {
    if (expected !== undefined && actual !== expected) {
      errors.push({
        code: 'stale_source_lock',
        artifact,
        field,
        expected,
        actual: actual ?? null,
      });
    }
  }

  if (!lockedSourceDocumentId || !officialSource) {
    errors.push({
      code: 'stale_source_lock',
      artifact: 'source_inventory',
      field: 'source_lock.locked_source_document_id',
      expected: 'official source id',
      actual: lockedSourceDocumentId ?? null,
    });
  }

  stale('syllabus_code', sourceInventory.subject_code, canonicalTopicTree.syllabus_code, 'canonical_topic_tree');
  stale('syllabus_version', lockedVersion, canonicalTopicTree.syllabus_version, 'canonical_topic_tree');
  stale('exam_year_range', lockedExamYears, canonicalTopicTree.exam_year_range, 'canonical_topic_tree');
  stale(
    'source_lock.source_document_id',
    lockedSourceDocumentId,
    canonicalTopicTree.source_lock?.source_document_id,
    'canonical_topic_tree',
  );
  stale(
    'source_lock.source_document_id',
    lockedSourceDocumentId,
    boundaryAnnotations.source_lock?.source_document_id,
    'boundary_annotations',
  );
  stale('source_document.id', lockedSourceDocumentId, rawSections.source_document?.id, 'raw_sections');
  stale('source_document.id', lockedSourceDocumentId, officialSource?.id, 'source_inventory');
  stale('source_document.sha256', officialSource?.sha256, canonicalTopicTree.source_lock?.sha256, 'canonical_topic_tree');
  stale('source_document.sha256', officialSource?.sha256, rawSections.source_document?.sha256, 'raw_sections');
  stale(
    'official_pdf_url',
    officialSource?.official_pdf_url,
    canonicalTopicTree.source_lock?.official_pdf_url,
    'canonical_topic_tree',
  );
  stale(
    'official_pdf_url',
    officialSource?.official_pdf_url,
    boundaryAnnotations.source_lock?.official_pdf_url,
    'boundary_annotations',
  );

  return buildGate('source_lock', errors);
}

function validateStatuses({ canonicalTopicTree = {}, boundaryAnnotations = {} } = {}) {
  const errors = [];

  for (const node of normalizeArray(canonicalTopicTree.nodes)) {
    if (!ALLOWED_TOPIC_NODE_STATUSES.has(node.status)) {
      errors.push({
        code: 'invalid_status',
        owner_type: 'topic_node',
        owner_id: node.node_id ?? null,
        status: node.status ?? null,
      });
    }
    if (node.status === 'approved' && node.review_state?.state !== 'accepted') {
      errors.push({
        code: 'invalid_status',
        owner_type: 'topic_node',
        owner_id: node.node_id ?? null,
        status: node.status,
        review_state: node.review_state?.state ?? null,
      });
    }
  }

  for (const annotation of normalizeArray(boundaryAnnotations.boundary_annotations)) {
    if (!ALLOWED_BOUNDARY_STATUSES.has(annotation.status)) {
      errors.push({
        code: 'invalid_status',
        owner_type: 'boundary_claim',
        owner_id: annotation.boundary_id ?? null,
        status: annotation.status ?? null,
      });
    }
    if (annotation.status === 'approved' && annotation.needs_human_review) {
      errors.push({
        code: 'invalid_status',
        owner_type: 'boundary_claim',
        owner_id: annotation.boundary_id ?? null,
        status: annotation.status,
        needs_human_review: annotation.needs_human_review,
      });
    }
  }

  return buildGate('status_contract', errors);
}

function validateIdentityUniqueness({ canonicalTopicTree = {} } = {}) {
  const errors = [];
  const nodeIds = new Map();
  const topicPaths = new Map();

  for (const node of normalizeArray(canonicalTopicTree.nodes)) {
    if (node.node_id) {
      if (nodeIds.has(node.node_id)) {
        errors.push({
          code: 'duplicate_node_id',
          node_id: node.node_id,
          first_owner_id: nodeIds.get(node.node_id),
          duplicate_owner_id: node.node_id,
        });
      } else {
        nodeIds.set(node.node_id, node.node_id);
      }
    }

    const pathKey = canonicalTopicPath(node.topic_path);
    if (pathKey) {
      if (topicPaths.has(pathKey)) {
        errors.push({
          code: 'duplicate_topic_path',
          topic_path: pathKey,
          first_owner_id: topicPaths.get(pathKey),
          duplicate_owner_id: node.node_id ?? null,
        });
      } else {
        topicPaths.set(pathKey, node.node_id ?? null);
      }
    }
  }

  return buildGate('identity_uniqueness', errors);
}

function validateGraphIntegrity({ canonicalTopicTree = {} } = {}) {
  const nodeIds = new Set(normalizeArray(canonicalTopicTree.nodes).map((node) => node.node_id));
  const errors = [];

  for (const node of normalizeArray(canonicalTopicTree.nodes)) {
    if (node.parent_node_id && !nodeIds.has(node.parent_node_id)) {
      errors.push({
        code: 'orphan_node',
        owner_id: node.node_id ?? null,
        missing_parent_node_id: node.parent_node_id,
      });
    }
  }

  return buildGate('graph_integrity', errors);
}

function validateSourceRefs({
  sourceInventory = {},
  rawSections = {},
  canonicalTopicTree = {},
  boundaryAnnotations = {},
  approvedBaselineAttempted = false,
} = {}) {
  const rawIds = rawSectionIds(rawSections);
  const rawById = rawSectionsById(rawSections);
  const errors = [];

  for (const owner of collectAllSourceRefOwners({ canonicalTopicTree, boundaryAnnotations })) {
    const refs = normalizeArray(owner.source_refs);
    if (refs.length === 0) {
      errors.push({
        code: 'missing_source_refs',
        owner_type: owner.owner_type,
        owner_id: owner.owner_id,
      });
      continue;
    }

    for (const sourceRef of refs) {
      const recognizedSourceIds = officialSourceIds(sourceInventory, sourceRef.source_type);
      if (!recognizedSourceIds.has(sourceRef.source_document_id)) {
        errors.push({
          code: 'missing_source_inventory_ref',
          owner_type: owner.owner_type,
          owner_id: owner.owner_id,
          source_document_id: sourceRef.source_document_id ?? null,
        });
      }
      if (!sourceRef.raw_section_id || !rawIds.has(sourceRef.raw_section_id)) {
        errors.push({
          code: 'missing_raw_section_ref',
          owner_type: owner.owner_type,
          owner_id: owner.owner_id,
          raw_section_id: sourceRef.raw_section_id ?? null,
        });
      } else if (
        sourceRef.locator
        && !compactText(rawById.get(sourceRef.raw_section_id)?.raw_text).includes(
          compactText(sourceRef.locator),
        )
      ) {
        errors.push({
          code: 'unsupported_source_locator',
          owner_type: owner.owner_type,
          owner_id: owner.owner_id,
          raw_section_id: sourceRef.raw_section_id,
          locator: sourceRef.locator,
        });
      } else if (
        owner.owner_type === 'topic_node'
        && owner.node_type === 'learning_objective'
        && (approvedBaselineAttempted || owner.status === 'approved')
        && !titleSupportedByLocator(owner, sourceRef)
      ) {
        errors.push({
          code: 'unsupported_title_source_ref',
          owner_type: owner.owner_type,
          owner_id: owner.owner_id,
          raw_section_id: sourceRef.raw_section_id,
          locator: sourceRef.locator ?? null,
          canonical_title: owner.canonical_title ?? null,
        });
      }
    }
  }

  return buildGate('source_refs', errors);
}

function validateTitleCleanliness({
  canonicalTopicTree = {},
  approvedBaselineAttempted = false,
} = {}) {
  const errors = [];

  for (const node of normalizeArray(canonicalTopicTree.nodes)) {
    if (!approvedBaselineAttempted && node.status !== 'approved') {
      continue;
    }

    for (const field of ['canonical_title', 'display_title']) {
      const value = node[field];
      for (const contamination of TITLE_CONTAMINATION_PATTERNS) {
        if (contamination.pattern.test(String(value ?? ''))) {
          errors.push({
            code: 'polluted_approved_title',
            contamination_code: contamination.code,
            owner_type: 'topic_node',
            owner_id: node.node_id ?? null,
            field,
            value: value ?? null,
          });
        }
      }
    }
  }

  return buildGate('title_cleanliness', errors);
}

function validateLegacyFileLeakage({
  sourceInventory = {},
  canonicalTopicTree = {},
  boundaryAnnotations = {},
  paths = DEFAULT_9709_SYLLABUS_GATE_PATHS,
} = {}) {
  const errors = [];
  const legacyPaths = legacyInventoryPaths(sourceInventory);

  for (const [pathKind, relPath] of Object.entries(paths ?? {})) {
    if (legacyPaths.has(relPath)) {
      errors.push({
        code: 'legacy_file_leakage',
        path_kind: pathKind,
        path: relPath,
      });
    }
  }

  for (const entry of normalizeArray(sourceInventory.existing_repo_syllabus_or_curriculum_files)) {
    if (entry.canonical_authority === true) {
      errors.push({
        code: 'legacy_file_leakage',
        path: entry.path ?? null,
        reason: 'legacy inventory entry marked canonical_authority=true',
      });
    }
  }

  for (const owner of collectAllSourceRefOwners({ canonicalTopicTree, boundaryAnnotations })) {
    for (const sourceRef of normalizeArray(owner.source_refs)) {
      const sourceType = sourceRef.source_type ?? null;
      const sourceDocumentId = sourceRef.source_document_id ?? null;
      const sourceLooksLegacy =
        sourceType === 'legacy_taxonomy'
        || legacyPaths.has(sourceDocumentId)
        || normalizeArray([...legacyPaths]).some((legacyPath) =>
          sourceDocumentId === path.basename(legacyPath),
        )
        || !OFFICIAL_SOURCE_TYPES.has(sourceType);

      if (sourceLooksLegacy) {
        errors.push({
          code: 'legacy_file_leakage',
          owner_type: owner.owner_type,
          owner_id: owner.owner_id,
          source_document_id: sourceDocumentId,
          source_type: sourceType,
        });
      }
    }
  }

  for (const node of normalizeArray(canonicalTopicTree.nodes)) {
    for (const legacyPath of normalizeArray(node.legacy_paths)) {
      if (legacyPath.status === 'approved') {
        errors.push({
          code: 'legacy_file_leakage',
          owner_type: 'legacy_path',
          owner_id: node.node_id ?? null,
          path: legacyPath.path ?? null,
          status: legacyPath.status,
        });
      }
    }
    for (const alias of normalizeArray(node.aliases)) {
      if (String(alias.source ?? '').startsWith('legacy_') && alias.status === 'approved') {
        errors.push({
          code: 'legacy_file_leakage',
          owner_type: 'alias',
          owner_id: node.node_id ?? null,
          value: alias.value ?? null,
          status: alias.status,
        });
      }
    }
  }

  return buildGate('legacy_file_leakage', errors);
}

function buildRawSectionMapping({ rawSections = {}, canonicalTopicTree = {}, boundaryAnnotations = {} } = {}) {
  const mappedIds = new Set();
  for (const owner of collectAllSourceRefOwners({ canonicalTopicTree, boundaryAnnotations })) {
    for (const sourceRef of normalizeArray(owner.source_refs)) {
      if (sourceRef.raw_section_id) {
        mappedIds.add(sourceRef.raw_section_id);
      }
    }
  }

  const rawIds = normalizeArray(rawSections.sections).map((section) => section.section_id);
  const unmapped = rawIds.filter((sectionId) => !mappedIds.has(sectionId));
  const warnings = unmapped.map((sectionId) => ({
    code: 'unmapped_raw_section',
    raw_section_id: sectionId,
  }));

  return {
    gate: buildGate('raw_section_mapping', [], warnings),
    mapped: rawIds.filter((sectionId) => mappedIds.has(sectionId)),
    unmapped,
  };
}

function buildReviewSummary({ canonicalTopicTree = {}, boundaryAnnotations = {} } = {}) {
  const unresolvedItems = [];

  for (const node of normalizeArray(canonicalTopicTree.nodes)) {
    if (node.status !== 'approved' || node.review_state?.state !== 'accepted') {
      unresolvedItems.push({
        item_type: 'topic_node',
        item_id: node.node_id ?? null,
        status: node.status ?? null,
        review_state: node.review_state?.state ?? null,
      });
    }
  }

  for (const annotation of normalizeArray(boundaryAnnotations.boundary_annotations)) {
    if (annotation.status !== 'approved' || annotation.needs_human_review) {
      unresolvedItems.push({
        item_type: 'boundary_claim',
        item_id: annotation.boundary_id ?? null,
        status: annotation.status ?? null,
        needs_human_review: Boolean(annotation.needs_human_review),
        review_reasons: cloneJson(annotation.review_reasons ?? []),
      });
    }
  }

  return {
    unresolved_items: unresolvedItems,
    unresolved_count: unresolvedItems.length,
    needs_human_review_count: unresolvedItems.filter(
      (item) => item.status === 'needs_human_review' || item.needs_human_review,
    ).length,
  };
}

function buildApprovedBaselineFreezeGate({ approvedBaselineAttempted, reviewSummary }) {
  if (!approvedBaselineAttempted) {
    return buildGate('approved_baseline_freeze');
  }

  if (reviewSummary.unresolved_items.length === 0) {
    return buildGate('approved_baseline_freeze');
  }

  return buildGate('approved_baseline_freeze', [
    {
      code: 'unresolved_review_items',
      unresolved_count: reviewSummary.unresolved_items.length,
    },
  ]);
}

function recommendedOption(reviewItem = {}) {
  return normalizeArray(reviewItem.recommended_options).find(
    (option) => option.recommended === true,
  );
}

function reviewNotesText(value = {}) {
  return normalizeArray(value.review_state?.notes).join('\n');
}

function requiresExplicitReviewDecision(value = {}) {
  const notes = reviewNotesText(value);
  return REVIEW_REQUIRED_NOTE_PATTERNS.some((pattern) => pattern.test(notes));
}

function normalizeDecisionCoverage(humanReviewDecisions = {}) {
  const topicNodeIds = new Set();
  const boundaryIds = new Set();
  const categoryPredicates = [];

  for (const decision of normalizeArray(humanReviewDecisions.decisions)) {
    const appliedTo = decision.applied_to ?? {};
    for (const nodeId of normalizeArray(appliedTo.topic_node_ids)) {
      topicNodeIds.add(nodeId);
    }
    for (const boundaryId of normalizeArray(appliedTo.boundary_ids)) {
      boundaryIds.add(boundaryId);
    }
    categoryPredicates.push(...normalizeArray(appliedTo.category_predicates));
  }

  return { topicNodeIds, boundaryIds, categoryPredicates };
}

function predicateCoversItem(predicate = {}, item = {}) {
  if (!predicate || typeof predicate !== 'object') {
    return false;
  }

  if (predicate.owner_type && predicate.owner_type !== item.owner_type) {
    return false;
  }
  if (predicate.node_type && predicate.node_type !== item.node_type) {
    return false;
  }
  if (predicate.boundary_kind && predicate.boundary_kind !== item.boundary_kind) {
    return false;
  }
  if (predicate.review_note_contains) {
    return reviewNotesText(item).includes(predicate.review_note_contains);
  }
  if (predicate.review_reason_contains) {
    return normalizeArray(item.review_reasons).join('\n').includes(predicate.review_reason_contains);
  }

  return false;
}

function hasDecisionCoverage(coverage, item = {}) {
  if (item.owner_type === 'topic_node' && coverage.topicNodeIds.has(item.node_id)) {
    return true;
  }
  if (item.owner_type === 'boundary_claim' && coverage.boundaryIds.has(item.boundary_id)) {
    return true;
  }
  return coverage.categoryPredicates.some((predicate) => predicateCoversItem(predicate, item));
}

function validateHumanReviewDecisions({
  approvedBaselineAttempted,
  reviewItems = null,
  humanReviewDecisions = null,
  canonicalTopicTree = {},
  boundaryAnnotations = {},
  reviewItemsPath = DEFAULT_9709_SYLLABUS_GATE_PATHS.reviewItems,
  humanReviewDecisionsPath = DEFAULT_9709_SYLLABUS_GATE_PATHS.humanReviewDecisions,
} = {}) {
  const errors = [];
  const approvedNodes = normalizeArray(canonicalTopicTree.nodes).filter(
    (node) => node.status === 'approved',
  );
  const approvedBoundaries = normalizeArray(boundaryAnnotations.boundary_annotations).filter(
    (annotation) => annotation.status === 'approved',
  );
  const freezeLike =
    approvedBaselineAttempted || approvedNodes.length > 0 || approvedBoundaries.length > 0;

  if (!freezeLike) {
    return buildGate('human_review_decisions');
  }

  if (!humanReviewDecisions) {
    return buildGate('human_review_decisions', [
      {
        code: 'missing_human_review_decisions',
        path: humanReviewDecisionsPath ?? null,
      },
    ]);
  }

  if (humanReviewDecisions.schema_version !== '9709_human_review_decisions_v1') {
    errors.push({
      code: 'invalid_human_review_decisions',
      field: 'schema_version',
      expected: '9709_human_review_decisions_v1',
      actual: humanReviewDecisions.schema_version ?? null,
    });
  }

  if (humanReviewDecisions.issue !== 293) {
    errors.push({
      code: 'invalid_human_review_decisions',
      field: 'issue',
      expected: 293,
      actual: humanReviewDecisions.issue ?? null,
    });
  }

  const carriedReviewItems = normalizeArray(humanReviewDecisions.carried_review_items);
  if (carriedReviewItems.length > 0) {
    errors.push({
      code: 'carried_review_items',
      carried_count: carriedReviewItems.length,
    });
  }

  const decisionMap = new Map(
    normalizeArray(humanReviewDecisions.decisions)
      .filter((decision) => decision.review_item_id)
      .map((decision) => [decision.review_item_id, decision]),
  );
  const decisionCoverage = normalizeDecisionCoverage(humanReviewDecisions);

  for (const reviewItem of normalizeArray(reviewItems?.review_items)) {
    const decision = decisionMap.get(reviewItem.item_id);
    const recommended = recommendedOption(reviewItem);

    if (!decision) {
      errors.push({
        code: 'missing_human_review_decision',
        review_item_id: reviewItem.item_id ?? null,
      });
      continue;
    }

    if (decision.decision_status !== 'approved') {
      errors.push({
        code: 'unapproved_human_review_decision',
        review_item_id: reviewItem.item_id ?? null,
        decision_status: decision.decision_status ?? null,
      });
    }

    if (recommended && decision.selected_option_id !== recommended.option_id) {
      errors.push({
        code: 'non_recommended_human_review_decision',
        review_item_id: reviewItem.item_id ?? null,
        expected: recommended.option_id,
        actual: decision.selected_option_id ?? null,
      });
    }
  }

  for (const decision of normalizeArray(humanReviewDecisions.decisions)) {
    if (!decision.review_item_id) {
      errors.push({ code: 'invalid_human_review_decision', field: 'review_item_id' });
    }
    if (normalizeArray(decision.source_refs).length === 0) {
      errors.push({
        code: 'missing_source_refs',
        owner_type: 'human_review_decision',
        owner_id: decision.review_item_id ?? null,
      });
    }
    const appliedTo = decision.applied_to ?? {};
    const coverageCount =
      normalizeArray(appliedTo.topic_node_ids).length
      + normalizeArray(appliedTo.boundary_ids).length
      + normalizeArray(appliedTo.category_predicates).length;
    if (coverageCount === 0) {
      errors.push({
        code: 'missing_human_review_decision_coverage',
        owner_type: 'human_review_decision',
        owner_id: decision.review_item_id ?? null,
      });
    }
  }

  for (const node of approvedNodes) {
    const notes = normalizeArray(node.review_state?.notes).join('\n');
    if (!notes.includes(humanReviewDecisionsPath)) {
      errors.push({
        code: 'missing_human_review_decision_ref',
        owner_type: 'topic_node',
        owner_id: node.node_id ?? null,
      });
    }
    if (
      requiresExplicitReviewDecision({ ...node, owner_type: 'topic_node' })
      && !hasDecisionCoverage(decisionCoverage, { ...node, owner_type: 'topic_node' })
    ) {
      errors.push({
        code: 'approved_node_missing_review_decision_coverage',
        owner_type: 'topic_node',
        owner_id: node.node_id ?? null,
      });
    }
  }

  for (const annotation of approvedBoundaries) {
    if (annotation.review_state?.decision_artifact !== humanReviewDecisionsPath) {
      errors.push({
        code: 'missing_human_review_decision_ref',
        owner_type: 'boundary_claim',
        owner_id: annotation.boundary_id ?? null,
      });
    }
    if (
      normalizeArray(annotation.review_reasons).length > 0
      && !hasDecisionCoverage(decisionCoverage, { ...annotation, owner_type: 'boundary_claim' })
    ) {
      errors.push({
        code: 'approved_boundary_missing_review_decision_coverage',
        owner_type: 'boundary_claim',
        owner_id: annotation.boundary_id ?? null,
      });
    }
  }

  if (!reviewItems) {
    errors.push({
      code: 'missing_review_items_for_crosscheck',
      path: reviewItemsPath ?? null,
    });
  }

  return buildGate('human_review_decisions', errors);
}

function collectBlockedReasons(gates) {
  return unique(
    gates.flatMap((gate) =>
      gate.status === 'fail'
        ? normalizeArray(gate.errors).map((error) => error.code || `${gate.name}_failed`)
        : [],
    ),
  ).sort();
}

export function load9709SyllabusGateArtifacts({
  rootDir = PROJECT_ROOT,
  paths = DEFAULT_9709_SYLLABUS_GATE_PATHS,
} = {}) {
  return {
    sourceInventory: readJson(rootDir, paths.sourceInventory),
    rawSections: readJson(rootDir, paths.rawSections),
    canonicalTopicTree: readJson(rootDir, paths.canonicalTopicTree),
    boundaryAnnotations: readJson(rootDir, paths.boundaryAnnotations),
    reviewItems: maybeReadJson(rootDir, paths.reviewItems),
    humanReviewDecisions: maybeReadJson(rootDir, paths.humanReviewDecisions),
    topicTreeSchema: readJson(rootDir, paths.topicTreeSchema),
  };
}

export function build9709SyllabusGateReport({
  rootDir = PROJECT_ROOT,
  paths = DEFAULT_9709_SYLLABUS_GATE_PATHS,
  artifacts = null,
  approvedBaselineAttempted = false,
  generatedAt = new Date().toISOString(),
} = {}) {
  const resolvedArtifacts = artifacts || load9709SyllabusGateArtifacts({ rootDir, paths });
  const {
    sourceInventory = {},
    rawSections = {},
    canonicalTopicTree = {},
    boundaryAnnotations = {},
    reviewItems = null,
    humanReviewDecisions = null,
    topicTreeSchema = {},
  } = resolvedArtifacts;

  const review = buildReviewSummary({ canonicalTopicTree, boundaryAnnotations });
  const rawSectionMapping = buildRawSectionMapping({
    rawSections,
    canonicalTopicTree,
    boundaryAnnotations,
  });
  const gates = [
    validateSchema({ canonicalTopicTree, topicTreeSchema }),
    validateSourceLock({ sourceInventory, rawSections, canonicalTopicTree, boundaryAnnotations }),
    validateStatuses({ canonicalTopicTree, boundaryAnnotations }),
    validateIdentityUniqueness({ canonicalTopicTree }),
    validateGraphIntegrity({ canonicalTopicTree }),
    validateSourceRefs({
      sourceInventory,
      rawSections,
      canonicalTopicTree,
      boundaryAnnotations,
      approvedBaselineAttempted,
    }),
    validateTitleCleanliness({ canonicalTopicTree, approvedBaselineAttempted }),
    validateLegacyFileLeakage({ sourceInventory, canonicalTopicTree, boundaryAnnotations, paths }),
    rawSectionMapping.gate,
    validateHumanReviewDecisions({
      approvedBaselineAttempted,
      reviewItems,
      humanReviewDecisions,
      canonicalTopicTree,
      boundaryAnnotations,
      reviewItemsPath: paths.reviewItems,
      humanReviewDecisionsPath: paths.humanReviewDecisions,
    }),
    buildApprovedBaselineFreezeGate({ approvedBaselineAttempted, reviewSummary: review }),
  ];
  const blockedReasons = collectBlockedReasons(gates);
  const approvedBaselineReady = review.unresolved_items.length === 0 && blockedReasons.length === 0;

  return {
    schema_version: SYLLABUS_GATE_SCHEMA_VERSION,
    generated_at: generatedAt,
    subject_code:
      canonicalTopicTree.syllabus_code
      ?? sourceInventory.subject_code
      ?? rawSections.source_document?.syllabus_code
      ?? '9709',
    syllabus_version:
      canonicalTopicTree.syllabus_version
      ?? sourceInventory.source_lock?.syllabus_version_tag
      ?? null,
    status: blockedReasons.length === 0 ? 'pass' : 'fail',
    approved_baseline_attempted: Boolean(approvedBaselineAttempted),
    approved_baseline_ready: approvedBaselineReady,
    blocked_reasons: blockedReasons,
    artifacts: cloneJson(paths),
    source_lock: {
      locked_source_document_id: sourceInventory.source_lock?.locked_source_document_id ?? null,
      source_inventory_version: sourceInventory.source_lock?.syllabus_version_tag ?? null,
      canonical_topic_tree_source_document_id:
        canonicalTopicTree.source_lock?.source_document_id ?? null,
      boundary_source_document_id: boundaryAnnotations.source_lock?.source_document_id ?? null,
      raw_sections_source_document_id: rawSections.source_document?.id ?? null,
    },
    counts: {
      topic_nodes: normalizeArray(canonicalTopicTree.nodes).length,
      boundary_claims: normalizeArray(boundaryAnnotations.boundary_annotations).length,
      official_sources: normalizeArray(sourceInventory.official_sources).length,
      raw_sections: normalizeArray(rawSections.sections).length,
    },
    coverage: {
      raw_sections: {
        total: normalizeArray(rawSections.sections).length,
        mapped: rawSectionMapping.mapped,
        unmapped: rawSectionMapping.unmapped,
        mapped_count: rawSectionMapping.mapped.length,
        unmapped_count: rawSectionMapping.unmapped.length,
      },
    },
    review,
    human_review: {
      decisions_total: normalizeArray(humanReviewDecisions?.decisions).length,
      carried_review_items: cloneJson(humanReviewDecisions?.carried_review_items ?? []),
      authority_id: humanReviewDecisions?.human_authority?.authority_id ?? null,
      decisions_artifact: paths.humanReviewDecisions ?? null,
      review_items_artifact: paths.reviewItems ?? null,
    },
    gates,
  };
}

export function write9709SyllabusGateReport({
  rootDir = PROJECT_ROOT,
  paths = DEFAULT_9709_SYLLABUS_GATE_PATHS,
  outJsonPath = DEFAULT_9709_SYLLABUS_GATE_REPORT_PATH,
  approvedBaselineAttempted = false,
  generatedAt,
} = {}) {
  const report = build9709SyllabusGateReport({
    rootDir,
    paths,
    approvedBaselineAttempted,
    generatedAt,
  });
  const absoluteJsonPath = resolveFromRoot(rootDir, outJsonPath);
  ensureParentDir(absoluteJsonPath);
  fs.writeFileSync(absoluteJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return {
    report,
    absoluteJsonPath,
  };
}
