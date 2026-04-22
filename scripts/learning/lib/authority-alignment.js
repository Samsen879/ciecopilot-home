import { createHash, randomUUID } from 'node:crypto';

const UNCOMPARABLE_VISUAL_GUESS = '__UNCOMPARABLE__';

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  return [...new Set(value.map((entry) => normalizeString(entry)).filter(Boolean))];
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

export function buildSourceManifestDigest(item = {}) {
  return createHash('sha256')
    .update(stableStringify({
      storage_key: normalizeNullableString(item.storage_key),
      syllabus_code: normalizeNullableString(item.syllabus_code),
      year: item.year ?? null,
      session: normalizeNullableString(item.session),
      paper: item.paper ?? null,
      variant: item.variant ?? null,
      q_number: item.q_number ?? null,
    }))
    .digest('hex');
}

export function normalizeAuthorityRef(ref = {}, fieldName = 'topic_authority_refs[]') {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
    throw new Error(`${fieldName} must contain objects.`);
  }

  const kind = normalizeString(ref.kind);
  const locator = normalizeString(ref.locator);
  if (!kind || !locator) {
    throw new Error(`${fieldName} entries require kind and locator.`);
  }

  return {
    kind,
    locator,
    note: normalizeNullableString(ref.note),
  };
}

export function classifyAuthorityPack(pack = {}) {
  return normalizeNullableString(pack.canonical_primary_topic_path) ? 'frozen' : 'missing';
}

function normalizeAuthorityPack(pack, storageKey, sourceLabel) {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    throw new Error(`Manifest item ${storageKey} has invalid ${sourceLabel} authority input pack.`);
  }

  if (!('canonical_primary_topic_path' in pack)) {
    throw new Error(`Manifest item ${storageKey} is missing canonical_primary_topic_path in ${sourceLabel} authority input pack.`);
  }

  const normalizedPack = {
    canonical_primary_topic_path: normalizeNullableString(pack.canonical_primary_topic_path),
    curriculum_version_tag: normalizeNullableString(pack.curriculum_version_tag),
    topic_authority_sources: normalizeStringArray(
      pack.topic_authority_sources,
      `${sourceLabel} topic_authority_sources`,
    ),
    topic_authority_refs: Array.isArray(pack.topic_authority_refs)
      ? pack.topic_authority_refs.map((ref, index) => normalizeAuthorityRef(
        ref,
        `${sourceLabel} topic_authority_refs[${index}]`,
      ))
      : (() => {
        throw new Error(`${sourceLabel} topic_authority_refs must be an array.`);
      })(),
    cross_paper_dependency_note: normalizeNullableString(pack.cross_paper_dependency_note),
  };

  if (classifyAuthorityPack(normalizedPack) === 'frozen') {
    const missingFields = [];
    if (!normalizedPack.curriculum_version_tag) {
      missingFields.push('curriculum_version_tag');
    }
    if (normalizedPack.topic_authority_sources.length === 0) {
      missingFields.push('topic_authority_sources');
    }
    if (normalizedPack.topic_authority_refs.length === 0) {
      missingFields.push('topic_authority_refs');
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Manifest item ${storageKey} has an invalid frozen authority pack: ${missingFields.join(', ')}.`,
      );
    }
  }

  return normalizedPack;
}

function stableAuthorityPackDigest(pack) {
  return stableStringify(pack);
}

function resolveRawAuthorityPack(item, authoritySidecarByStorageKey = {}) {
  const inlinePack = item?.authority_input_pack;
  const sidecarEntry = authoritySidecarByStorageKey[normalizeString(item?.storage_key)];
  const sidecarPack = sidecarEntry?.authority_input_pack ?? sidecarEntry ?? null;

  if (typeof inlinePack === 'undefined' && sidecarPack === null) {
    throw new Error(`Manifest item ${normalizeString(item?.storage_key) || '<unknown>'} is missing authority input pack.`);
  }

  return { inlinePack, sidecarPack };
}

function mergeAuthorityPack(item, authoritySidecarByStorageKey = {}) {
  const storageKey = normalizeString(item?.storage_key) || '<unknown>';
  const { inlinePack, sidecarPack } = resolveRawAuthorityPack(item, authoritySidecarByStorageKey);
  const normalizedInlinePack =
    typeof inlinePack === 'undefined' ? null : normalizeAuthorityPack(inlinePack, storageKey, 'inline');
  const normalizedSidecarPack =
    sidecarPack === null ? null : normalizeAuthorityPack(sidecarPack, storageKey, 'sidecar');

  if (normalizedInlinePack && normalizedSidecarPack) {
    if (stableAuthorityPackDigest(normalizedInlinePack) !== stableAuthorityPackDigest(normalizedSidecarPack)) {
      throw new Error(`Manifest item ${storageKey} has inconsistent authority input pack between inline and sidecar sources.`);
    }
  }

  return normalizedInlinePack ?? normalizedSidecarPack;
}

function validateManifestItem(item = {}, index = 0) {
  const storageKey = normalizeString(item.storage_key);
  if (!storageKey) {
    throw new Error(`Manifest item at index ${index} is missing storage_key.`);
  }

  const syllabusCode = normalizeString(item.syllabus_code);
  if (!syllabusCode) {
    throw new Error(`Manifest item ${storageKey} is missing syllabus_code.`);
  }

  return {
    ...cloneJson(item),
    storage_key: storageKey,
    syllabus_code: syllabusCode,
  };
}

function validateJoinManifestItem(item = {}, index = 0) {
  const storageKey = normalizeString(item.storage_key);
  if (!storageKey) {
    throw new Error(`Manifest item at index ${index} is missing storage_key.`);
  }

  const provisionalAlignmentVerdict = normalizeString(item.provisional_alignment_verdict);
  if (!provisionalAlignmentVerdict) {
    throw new Error(`Manifest item ${storageKey} is missing provisional_alignment_verdict.`);
  }

  return {
    ...cloneJson(item),
    storage_key: storageKey,
    canonical_primary_topic_path: normalizeNullableString(item.canonical_primary_topic_path),
    provisional_alignment_verdict: provisionalAlignmentVerdict,
  };
}

function mapProvisionalAlignmentVerdict({
  authorityTruthStatus,
  taxonomyResolutionStatus,
} = {}) {
  if (authorityTruthStatus === 'missing') {
    return 'blocked_authority_missing';
  }

  if (taxonomyResolutionStatus === 'resolved') {
    return 'ready';
  }

  if (taxonomyResolutionStatus === 'needs_seed') {
    return 'blocked_needs_seed';
  }

  return 'blocked_taxonomy_invalid';
}

function mapBlockedOverallVerdict(provisionalAlignmentVerdict) {
  if (provisionalAlignmentVerdict === 'blocked_needs_seed') {
    return 'blocked_needs_seed';
  }

  if (provisionalAlignmentVerdict === 'blocked_authority_missing') {
    return 'blocked_authority_missing';
  }

  if (provisionalAlignmentVerdict === 'blocked_taxonomy_invalid') {
    return 'blocked_taxonomy_invalid';
  }

  throw new Error(`Unsupported provisional_alignment_verdict: ${provisionalAlignmentVerdict}`);
}

async function resolveTaxonomyStatus({
  manifestItem,
  authorityPack,
  resolveCurriculumNodeStatus,
} = {}) {
  if (classifyAuthorityPack(authorityPack) === 'missing') {
    return {
      status: 'blocked',
      node: null,
      reason_code: 'authority_missing',
    };
  }

  if (typeof resolveCurriculumNodeStatus !== 'function') {
    throw new Error('authorityFreezeManifest requires resolveCurriculumNodeStatus.');
  }

  const result = await resolveCurriculumNodeStatus({
    syllabusCode: manifestItem.syllabus_code,
    topicPath: authorityPack.canonical_primary_topic_path,
    curriculumVersionTag: authorityPack.curriculum_version_tag,
    manifestItem: cloneJson(manifestItem),
    authorityPack: cloneJson(authorityPack),
  });

  const status = normalizeString(result?.status);
  if (!['resolved', 'needs_seed', 'blocked'].includes(status)) {
    throw new Error(
      `Curriculum resolver returned invalid status "${result?.status ?? ''}" for ${manifestItem.storage_key}.`,
    );
  }

  return {
    status,
    node: cloneJson(result?.node) ?? null,
    reason_code: normalizeNullableString(result?.reason_code),
  };
}

function buildRunId() {
  return `authority-alignment-${randomUUID()}`;
}

export async function authorityFreezeManifest({
  manifest,
  authoritySidecarByStorageKey = {},
  resolveCurriculumNodeStatus,
} = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Manifest must be an object.');
  }

  const items = Array.isArray(manifest.items) ? manifest.items : [];
  if (items.length === 0) {
    throw new Error('Manifest must contain at least one item.');
  }

  const authorityAlignmentRunId = buildRunId();
  const enrichedItems = [];

  for (const [index, rawItem] of items.entries()) {
    const manifestItem = validateManifestItem(rawItem, index);
    const authorityPack = mergeAuthorityPack(manifestItem, authoritySidecarByStorageKey);
    const authorityTruthStatus = classifyAuthorityPack(authorityPack);
    const taxonomyStatus = await resolveTaxonomyStatus({
      manifestItem,
      authorityPack,
      resolveCurriculumNodeStatus,
    });
    const provisionalAlignmentVerdict = mapProvisionalAlignmentVerdict({
      authorityTruthStatus,
      taxonomyResolutionStatus: taxonomyStatus.status,
    });

    enrichedItems.push({
      ...manifestItem,
      authority_alignment_run_id: authorityAlignmentRunId,
      source_manifest_digest: buildSourceManifestDigest(manifestItem),
      primary_topic_path:
        authorityTruthStatus === 'frozen'
          ? authorityPack.canonical_primary_topic_path
          : null,
      canonical_primary_topic_path: authorityPack.canonical_primary_topic_path,
      curriculum_version_tag: authorityPack.curriculum_version_tag,
      authority_truth_status: authorityTruthStatus,
      taxonomy_resolution_status: taxonomyStatus.status,
      manual_action_required: provisionalAlignmentVerdict !== 'ready',
      provisional_alignment_verdict: provisionalAlignmentVerdict,
      topic_authority_sources: authorityPack.topic_authority_sources,
      topic_authority_refs: authorityPack.topic_authority_refs,
      cross_paper_dependency_note: authorityPack.cross_paper_dependency_note,
    });
  }

  return {
    ...cloneJson(manifest),
    authority_alignment_run_id: authorityAlignmentRunId,
    items: enrichedItems,
  };
}

function normalizeVisualDisposition(disposition = {}) {
  if (!disposition || typeof disposition !== 'object' || Array.isArray(disposition)) {
    return {
      visual_topic_guess_status: null,
      replacement_visual_topic_guess: null,
    };
  }

  return {
    visual_topic_guess_status: normalizeNullableString(disposition.visual_topic_guess_status),
    replacement_visual_topic_guess: normalizeNullableString(disposition.replacement_visual_topic_guess),
  };
}

function applyVisualDisposition(visualTopicGuess, disposition) {
  if (disposition.replacement_visual_topic_guess) {
    return disposition.replacement_visual_topic_guess;
  }

  if (disposition.visual_topic_guess_status === 'invalidated_by_operator_review') {
    return null;
  }

  return visualTopicGuess;
}

async function normalizeComparableVisualGuess({
  manifestItem,
  visualTopicGuess,
  normalizeVisualTopicGuess,
} = {}) {
  if (!visualTopicGuess) {
    return null;
  }

  if (typeof normalizeVisualTopicGuess !== 'function') {
    return visualTopicGuess;
  }

  const normalizedGuess = await normalizeVisualTopicGuess({
    visualTopicGuess,
    curriculumVersionTag: manifestItem.curriculum_version_tag ?? null,
    canonicalPrimaryTopicPath: manifestItem.canonical_primary_topic_path ?? null,
    manifestItem: cloneJson(manifestItem),
  });

  return normalizeNullableString(normalizedGuess) ?? UNCOMPARABLE_VISUAL_GUESS;
}

export async function alignmentJoinManifest({
  manifest,
  visualTopicGuessByStorageKey = {},
  visualDispositionByStorageKey = {},
  normalizeVisualTopicGuess,
} = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Manifest must be an object.');
  }

  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const joinedItems = [];

  for (const [index, rawItem] of items.entries()) {
    const manifestItem = validateJoinManifestItem(rawItem, index);
    const visualTopicGuess = normalizeNullableString(
      visualTopicGuessByStorageKey[manifestItem.storage_key],
    );
    const disposition = normalizeVisualDisposition(
      visualDispositionByStorageKey[manifestItem.storage_key],
    );
    const effectiveVisualTopicGuess = applyVisualDisposition(visualTopicGuess, disposition);

    let alignmentStatus = 'not_compared';
    let alignmentReviewRequired = false;
    let manualActionRequired = manifestItem.provisional_alignment_verdict !== 'ready';
    let overallAlignmentVerdict = manifestItem.provisional_alignment_verdict === 'ready'
      ? 'ready'
      : mapBlockedOverallVerdict(manifestItem.provisional_alignment_verdict);

    if (manifestItem.provisional_alignment_verdict === 'ready' && effectiveVisualTopicGuess) {
      const comparableVisualGuess = await normalizeComparableVisualGuess({
        manifestItem,
        visualTopicGuess: effectiveVisualTopicGuess,
        normalizeVisualTopicGuess,
      });

      if (comparableVisualGuess === UNCOMPARABLE_VISUAL_GUESS) {
        alignmentStatus = 'contested';
        alignmentReviewRequired = true;
        manualActionRequired = true;
        overallAlignmentVerdict = 'blocked_for_review';
      } else if (comparableVisualGuess === manifestItem.canonical_primary_topic_path) {
        alignmentStatus = 'aligned';
        manualActionRequired = false;
        overallAlignmentVerdict = 'ready';
      } else if (comparableVisualGuess) {
        alignmentStatus = 'contested';
        alignmentReviewRequired = true;
        manualActionRequired = true;
        overallAlignmentVerdict = 'blocked_for_review';
      }
    }

    joinedItems.push({
      ...manifestItem,
      visual_topic_guess: effectiveVisualTopicGuess,
      alignment_status: alignmentStatus,
      alignment_review_required: alignmentReviewRequired,
      manual_action_required: manualActionRequired,
      overall_alignment_verdict: overallAlignmentVerdict,
    });
  }

  return {
    ...cloneJson(manifest),
    items: joinedItems,
  };
}
