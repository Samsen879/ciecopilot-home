import { isCompatibleArtifactKindForSlot } from '../../../lib/contracts/runtime-contract-client.js';
import { buildReviewQueueViewModel } from './review-queue-view-model.js';

const SLOT_DEFINITIONS = Object.freeze([
  {
    key: 'overview_map',
    camelKey: 'overviewMap',
    title: 'Overview map',
    description: 'Canonical summary coverage for this topic.',
  },
  {
    key: 'core_method_derivation',
    camelKey: 'coreMethodDerivation',
    title: 'Core method derivation',
    description: 'Pinned derivations and formula cards that stay canonical to this topic.',
  },
  {
    key: 'canonical_worked_example',
    camelKey: 'canonicalWorkedExample',
    title: 'Canonical worked example',
    description: 'Stable worked-example residency for this topic workspace.',
  },
  {
    key: 'common_traps',
    camelKey: 'commonTraps',
    title: 'Common traps',
    description: 'Misconceptions pinned to this canonical-home topic.',
  },
  {
    key: 'my_notes',
    camelKey: 'myNotes',
    title: 'My notes',
    description: 'User-authored notes that belong to this workspace.',
  },
  {
    key: 'review_queue',
    camelKey: 'reviewQueue',
    title: 'Review queue',
    description: 'Filtered review projection for this topic.',
  },
]);

const SLOT_DEFINITION_BY_KEY = Object.freeze(
  Object.fromEntries(SLOT_DEFINITIONS.map((definition) => [definition.key, definition])),
);

const SLOT_EMPTY_STATE = Object.freeze({
  label: 'Empty slot',
  message: 'No canonical artifact is pinned to this slot yet.',
});

function normalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function labelFromToken(token, fallback = 'unknown') {
  return normalizeString(token, fallback).replace(/_/g, ' ');
}

function getIdentifierKey(ref) {
  return Object.keys(ref || {}).find((key) => key !== 'kind') || null;
}

function normalizeRef(ref) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref) || !normalizeString(ref.kind)) {
    return null;
  }

  const identifierKey = getIdentifierKey(ref);
  const label = identifierKey ? normalizeString(ref[identifierKey], ref.kind) : ref.kind;

  return {
    ...ref,
    label,
  };
}

function buildWorkspaceSummary(workspace = {}, fallback = {}) {
  return {
    workspaceId: normalizeString(
      workspace.workspaceId ?? workspace.workspace_id ?? fallback.workspaceId ?? fallback.workspace_id,
    ),
    topicId: normalizeString(workspace.topicId ?? workspace.topic_id),
    topicPath: normalizeString(workspace.topicPath ?? workspace.topic_path, ''),
    paperScope: normalizeString(
      workspace.paperScope ?? workspace.paper_scope ?? fallback.paperScope ?? fallback.paper_scope,
    ),
    workspaceKind: normalizeString(
      workspace.workspaceKind ?? workspace.workspace_kind ?? fallback.workspaceKind ?? fallback.workspace_kind,
    ),
    updatedAt: workspace.updatedAt ?? workspace.updated_at ?? fallback.updatedAt ?? fallback.updated_at ?? null,
  };
}

function readCompatibility(payload = {}) {
  return payload.compatibility || {};
}

function readReviewQueuePayload(payload = {}) {
  return payload.reviewQueue || payload.review_queue || {};
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readTopicSectionFocus(payload = {}) {
  const compatibility = readCompatibility(payload);
  return payload.topicSection
    || payload.topic_section
    || compatibility.topicSectionFocus
    || compatibility.topic_section_focus
    || null;
}

function buildTopicSectionViewModel(section = null) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    return null;
  }

  const canonicalOwnership = normalizeObject(
    section.canonicalOwnership ?? section.canonical_ownership,
  );
  const topicWorkspaceId = normalizeString(
    section.topicWorkspaceId
      ?? section.topic_workspace_id
      ?? section.workspaceId
      ?? section.workspace_id,
  );
  const topicId = normalizeString(section.topicId ?? section.topic_id);
  const topicPath = normalizeString(section.topicPath ?? section.topic_path, '');

  return {
    paperWorkspaceTopicSectionId: normalizeString(
      section.paperWorkspaceTopicSectionId ?? section.paper_workspace_topic_section_id,
    ),
    paperWorkspaceId: normalizeString(section.paperWorkspaceId ?? section.paper_workspace_id),
    topicId,
    topicWorkspaceId,
    workspaceId: topicWorkspaceId,
    topicPath,
    ownerKind: normalizeString(
      canonicalOwnership.ownerKind ?? canonicalOwnership.owner_kind,
    ),
    canonicalOwnership: {
      ownerKind: normalizeString(canonicalOwnership.ownerKind ?? canonicalOwnership.owner_kind),
      topicId: normalizeString(canonicalOwnership.topicId ?? canonicalOwnership.topic_id, topicId),
      topicPath: normalizeString(
        canonicalOwnership.topicPath ?? canonicalOwnership.topic_path,
        topicPath,
      ),
    },
    sectionState: section.sectionState ?? section.section_state ?? {},
    createdAt: section.createdAt ?? section.created_at ?? null,
    updatedAt: section.updatedAt ?? section.updated_at ?? null,
  };
}

function normalizePaperSlotTopicSection(section = null) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    return null;
  }

  return {
    paperWorkspaceTopicSectionId: normalizeString(
      section.paperWorkspaceTopicSectionId ?? section.paper_workspace_topic_section_id,
    ),
    topicId: normalizeString(section.topicId ?? section.topic_id),
    topicPath: normalizeString(section.topicPath ?? section.topic_path, ''),
    workspaceSlotId: normalizeString(section.workspaceSlotId ?? section.workspace_slot_id),
    primaryArtifact: normalizeRef(section.primaryArtifactRef ?? section.primary_artifact_ref),
    slotState: normalizeString(section.slotState ?? section.slot_state),
    updatedAt: section.updatedAt ?? section.updated_at ?? null,
  };
}

function normalizePaperArtifactSummary(artifact = null) {
  const record = normalizeArtifactRecord(artifact || {}, {
    source: 'paper_slot_summary',
  });

  if (!record) {
    return null;
  }

  return {
    ...record,
    topicSectionId: normalizeString(
      artifact.topicSectionId ?? artifact.topic_section_id,
    ),
    topicId: normalizeString(artifact.topicId ?? artifact.topic_id),
    topicPath: normalizeString(artifact.topicPath ?? artifact.topic_path, ''),
  };
}

function readStableSlotRecord(stableSlots = {}, definition) {
  if (!stableSlots || typeof stableSlots !== 'object' || Array.isArray(stableSlots)) {
    return {};
  }

  return stableSlots[definition.camelKey] || stableSlots[definition.key] || {};
}

function buildPaperStableSlotViewModel(definition, stableSlots = {}) {
  const slot = readStableSlotRecord(stableSlots, definition);

  return {
    slotKey: normalizeString(slot.slotKey ?? slot.slot_key, definition.key),
    title: definition.title,
    topicSections: (Array.isArray(slot.topicSections ?? slot.topic_sections)
      ? (slot.topicSections ?? slot.topic_sections)
      : [])
      .map((section) => normalizePaperSlotTopicSection(section))
      .filter(Boolean),
    artifactSummaries: (Array.isArray(slot.artifactSummaries ?? slot.artifact_summaries)
      ? (slot.artifactSummaries ?? slot.artifact_summaries)
      : [])
      .map((artifact) => normalizePaperArtifactSummary(artifact))
      .filter(Boolean),
    linkedReferences: normalizeRefList(slot.linkedReferences ?? slot.linked_references),
    updatedAt: slot.updatedAt ?? slot.updated_at ?? null,
  };
}

function buildPaperStableSlotsViewModel(stableSlots = {}) {
  return Object.fromEntries(
    SLOT_DEFINITIONS.map((definition) => [
      definition.key,
      buildPaperStableSlotViewModel(definition, stableSlots),
    ]),
  );
}

function buildPaperWorkspaceViewModel(payload = {}) {
  const paperWorkspace = payload.paperWorkspace || payload.paper_workspace || null;
  const paperScope = normalizeString(
    payload.paperScope
      ?? payload.paper_scope
      ?? paperWorkspace?.paperScope
      ?? paperWorkspace?.paper_scope,
  );
  const topicSectionsSource = payload.topicSections
    ?? payload.topic_sections
    ?? paperWorkspace?.topicSections
    ?? paperWorkspace?.topic_sections;
  const topicSections = topicSectionsSource ?? [];
  const stableSlots = payload.stableSlots
    ?? payload.stable_slots
    ?? paperWorkspace?.stableSlots
    ?? paperWorkspace?.stable_slots
    ?? {};

  if (!paperWorkspace && !paperScope && !Array.isArray(topicSectionsSource)) {
    return null;
  }

  const visibleOrganizationSummary = normalizeObject(
    paperWorkspace?.visibleOrganizationSummary ?? paperWorkspace?.visible_organization_summary,
  );

  return {
    paperWorkspaceId: normalizeString(
      paperWorkspace?.paperWorkspaceId
        ?? paperWorkspace?.paper_workspace_id
        ?? payload.workspaceId
        ?? payload.workspace_id,
    ),
    userId: normalizeString(paperWorkspace?.userId ?? paperWorkspace?.user_id),
    subjectCode: normalizeString(paperWorkspace?.subjectCode ?? paperWorkspace?.subject_code),
    paperScope,
    workspaceKind: normalizeString(paperWorkspace?.workspaceKind ?? paperWorkspace?.workspace_kind),
    label: normalizeString(visibleOrganizationSummary.label),
    visibleOrganizationSummary,
    linkedTopicSummary: paperWorkspace?.linkedTopicSummary
      ?? paperWorkspace?.linked_topic_summary
      ?? {},
    topicSections: (Array.isArray(topicSections) ? topicSections : [])
      .map((section) => buildTopicSectionViewModel(section))
      .filter(Boolean),
    stableSlots: buildPaperStableSlotsViewModel(stableSlots),
    pinnedArtifacts: (Array.isArray(paperWorkspace?.pinnedArtifacts ?? paperWorkspace?.pinned_artifacts)
      ? (paperWorkspace.pinnedArtifacts ?? paperWorkspace.pinned_artifacts)
      : [])
      .map((artifact) => normalizePaperArtifactSummary(artifact))
      .filter(Boolean),
    linkedReferences: normalizeRefList(
      paperWorkspace?.linkedReferences ?? paperWorkspace?.linked_references,
    ),
    reviewQueueProjectionShape: paperWorkspace?.reviewQueueProjectionShape
      ?? paperWorkspace?.review_queue_projection_shape
      ?? null,
    createdAt: paperWorkspace?.createdAt ?? paperWorkspace?.created_at ?? null,
    updatedAt: paperWorkspace?.updatedAt ?? paperWorkspace?.updated_at ?? null,
  };
}

function buildSurfaceViewModel(payload, workspace, paperWorkspace, topicSection, reviewQueue) {
  const compatibility = readCompatibility(payload);
  const kind = normalizeString(
    compatibility.surface,
    paperWorkspace
      ? topicSection
        ? 'paper_topic_section_workspace'
        : 'paper_workspace'
      : 'legacy_topic_workspace',
  );
  const paperScope = normalizeString(
    payload.paperScope
      ?? payload.paper_scope
      ?? paperWorkspace?.paperScope
      ?? compatibility.paperScope
      ?? compatibility.paper_scope,
  );
  const topicSectionsAreProjections =
    typeof compatibility.topicSectionsAreProjections === 'boolean'
      ? compatibility.topicSectionsAreProjections
      : typeof compatibility.topic_sections_are_projections === 'boolean'
        ? compatibility.topic_sections_are_projections
        : kind === 'paper_workspace' || kind === 'paper_topic_section_workspace';

  return {
    kind,
    workspaceId: normalizeString(
      payload.workspaceId ?? payload.workspace_id ?? workspace.workspaceId,
    ),
    topicId: workspace.topicId || topicSection?.topicId || null,
    topicPath: workspace.topicPath || topicSection?.topicPath || '',
    paperScope,
    reviewQueueScope: reviewQueue.scope,
    reviewQueueScopeLabel: reviewQueue.scopeLabel,
    queueIdentity: reviewQueue.queueIdentity,
    topicSectionsAreProjections,
    legacyTopicFallback: compatibility.legacyTopicFallback
      ?? compatibility.legacy_topic_fallback
      ?? null,
    isPaperWorkspace: kind === 'paper_workspace',
    isPaperTopicSection: kind === 'paper_topic_section_workspace',
    isLegacyTopicWorkspace: kind === 'legacy_topic_workspace',
  };
}

function normalizeCapabilities(capabilities = null) {
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    return null;
  }

  return {
    shellVisible:
      typeof capabilities.shellVisible === 'boolean'
        ? capabilities.shellVisible
        : capabilities.shell_visible ?? null,
    bodyVisible:
      typeof capabilities.bodyVisible === 'boolean'
        ? capabilities.bodyVisible
        : capabilities.body_visible ?? null,
    residentEligible:
      typeof capabilities.residentEligible === 'boolean'
        ? capabilities.residentEligible
        : capabilities.resident_eligible ?? null,
    authoritativeAutomationEligible:
      typeof capabilities.authoritativeAutomationEligible === 'boolean'
        ? capabilities.authoritativeAutomationEligible
        : capabilities.authoritative_automation_eligible ?? null,
  };
}

function readVisualKey(record = {}, camelKey, snakeKey) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return undefined;
  }

  return record[camelKey] ?? record[snakeKey];
}

function normalizeVisualRef(ref = null) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref) || !normalizeString(ref.kind)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(ref)
      .map(([key, value]) => [
        key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase()),
        value,
      ]),
  );
}

function normalizeVisualRefs(refs = []) {
  return (Array.isArray(refs) ? refs : [])
    .map((ref) => normalizeVisualRef(ref))
    .filter(Boolean);
}

function normalizeVisualNode(node = null) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return null;
  }

  const id = normalizeString(node.id);
  const label = normalizeString(node.label);
  if (!id || !label) {
    return null;
  }

  return {
    id,
    label,
    sourceRefs: normalizeVisualRefs(readVisualKey(node, 'sourceRefs', 'source_refs')),
  };
}

function normalizeVisualEdge(edge = null) {
  if (!edge || typeof edge !== 'object' || Array.isArray(edge)) {
    return null;
  }

  const from = normalizeString(edge.from);
  const to = normalizeString(edge.to);
  if (!from || !to) {
    return null;
  }

  return {
    from,
    to,
    relation: normalizeString(edge.relation, 'depends_on'),
    sourceRefs: normalizeVisualRefs(readVisualKey(edge, 'sourceRefs', 'source_refs')),
  };
}

function normalizeVisualStep(step = null) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    return null;
  }

  const stepId = normalizeString(readVisualKey(step, 'stepId', 'step_id'));
  const body = normalizeString(step.body);
  if (!stepId || !body) {
    return null;
  }

  const revealIndex = Number(readVisualKey(step, 'revealIndex', 'reveal_index'));

  return {
    stepId,
    title: normalizeString(step.title),
    body,
    ...(Number.isFinite(revealIndex) && revealIndex > 0 ? { revealIndex } : {}),
    dependsOnStepIds: (Array.isArray(readVisualKey(step, 'dependsOnStepIds', 'depends_on_step_ids'))
      ? readVisualKey(step, 'dependsOnStepIds', 'depends_on_step_ids')
      : [])
      .map((stepIdValue) => normalizeString(stepIdValue))
      .filter(Boolean),
    sourceRefs: normalizeVisualRefs(readVisualKey(step, 'sourceRefs', 'source_refs')),
  };
}

function normalizeVisualObject(visualObject = null) {
  if (!visualObject || typeof visualObject !== 'object' || Array.isArray(visualObject)) {
    return null;
  }

  const kind = normalizeString(visualObject.kind);
  const base = {
    kind,
    sourcePosture: normalizeString(readVisualKey(visualObject, 'sourcePosture', 'source_posture')),
    confidence: normalizeString(visualObject.confidence),
    sourceRefs: normalizeVisualRefs(readVisualKey(visualObject, 'sourceRefs', 'source_refs')),
  };

  if (kind === 'step_reveal_timeline') {
    return {
      ...base,
      steps: (Array.isArray(visualObject.steps) ? visualObject.steps : [])
        .map((step) => normalizeVisualStep(step))
        .filter(Boolean),
    };
  }

  if (kind === 'derivation_tree' || kind === 'dependency_graph') {
    return {
      ...base,
      nodes: (Array.isArray(visualObject.nodes) ? visualObject.nodes : [])
        .map((node) => normalizeVisualNode(node))
        .filter(Boolean),
      edges: (Array.isArray(visualObject.edges) ? visualObject.edges : [])
        .map((edge) => normalizeVisualEdge(edge))
        .filter(Boolean),
    };
  }

  return null;
}

function normalizeVisualStepList(stepList = null) {
  if (!stepList || typeof stepList !== 'object' || Array.isArray(stepList)) {
    return null;
  }

  return {
    kind: 'step_list',
    fallbackFrom: normalizeString(readVisualKey(stepList, 'fallbackFrom', 'fallback_from')),
    fallbackReasonCode: normalizeString(
      readVisualKey(stepList, 'fallbackReasonCode', 'fallback_reason_code'),
    ),
    sourcePosture: normalizeString(readVisualKey(stepList, 'sourcePosture', 'source_posture')),
    confidence: normalizeString(stepList.confidence),
    sourceRefs: normalizeVisualRefs(readVisualKey(stepList, 'sourceRefs', 'source_refs')),
    steps: (Array.isArray(stepList.steps) ? stepList.steps : [])
      .map((step) => normalizeVisualStep(step))
      .filter(Boolean),
  };
}

function normalizeVisualReasoning(renderPayload = null) {
  const payload = normalizeObject(renderPayload);
  const visualReasoning = normalizeObject(
    payload.visualReasoning ?? payload.visual_reasoning,
  );

  if (!visualReasoning || Object.keys(visualReasoning).length === 0) {
    return null;
  }

  return {
    schemaVersion: normalizeString(
      visualReasoning.schemaVersion ?? visualReasoning.schema_version,
      'visual_reasoning_mvp.v1',
    ),
    visualObjects: (Array.isArray(visualReasoning.visualObjects ?? visualReasoning.visual_objects)
      ? (visualReasoning.visualObjects ?? visualReasoning.visual_objects)
      : [])
      .map((visualObject) => normalizeVisualObject(visualObject))
      .filter(Boolean),
    stepList: normalizeVisualStepList(visualReasoning.stepList ?? visualReasoning.step_list),
  };
}

function isResidentEligibleRecord(record = {}) {
  if (typeof record?.capabilities?.residentEligible === 'boolean') {
    return record.capabilities.residentEligible;
  }

  return record?.artifactState === 'verified' || record?.artifactState === 'released';
}

function normalizeCapabilityList(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeString(value))
    .filter(Boolean);
}

function normalizeExplanationFactors(value) {
  return (Array.isArray(value) ? value : []).map((factor) => ({
    code: normalizeString(factor?.code),
    status: normalizeString(factor?.status),
    summary: normalizeString(factor?.summary),
    value: factor?.value ?? null,
  })).filter((factor) => factor.code || factor.summary);
}

function buildExplanationViewModel(explanation = null) {
  if (!explanation || typeof explanation !== 'object') {
    return null;
  }

  return {
    posture: normalizeString(explanation.posture),
    summary: normalizeString(explanation.summary),
    factors: normalizeExplanationFactors(explanation.factors),
  };
}

function buildRuntimePostureViewModel(runtimePosture = null) {
  if (!runtimePosture || typeof runtimePosture !== 'object') {
    return null;
  }

  return {
    subjectCode: normalizeString(runtimePosture.subjectCode ?? runtimePosture.subject_code),
    displayName: normalizeString(runtimePosture.displayName ?? runtimePosture.display_name),
    selectionState: normalizeString(runtimePosture.selectionState ?? runtimePosture.selection_state),
    readOnly:
      typeof runtimePosture.readOnly === 'boolean'
        ? runtimePosture.readOnly
        : runtimePosture.read_only ?? false,
    authoritativeScoringAllowed:
      typeof runtimePosture.authoritativeScoringAllowed === 'boolean'
        ? runtimePosture.authoritativeScoringAllowed
        : runtimePosture.authoritative_scoring_allowed ?? null,
    releaseScopeStatus: normalizeString(
      runtimePosture.releaseScopeStatus ?? runtimePosture.release_scope_status,
    ),
    fallbackMode: normalizeString(runtimePosture.fallbackMode ?? runtimePosture.fallback_mode),
    fallbackReasonCode: normalizeString(
      runtimePosture.fallbackReasonCode ?? runtimePosture.fallback_reason_code,
    ),
    learningSignalPosture: normalizeString(
      runtimePosture.learningSignalPosture ?? runtimePosture.learning_signal_posture,
    ),
    fallbackCapabilities: normalizeCapabilityList(
      runtimePosture.fallbackCapabilities ?? runtimePosture.fallback_capabilities,
    ),
    summary: normalizeString(runtimePosture.summary),
    explanation: buildExplanationViewModel(runtimePosture.explanation),
  };
}

function normalizeRefList(refs) {
  return (Array.isArray(refs) ? refs : [])
    .map((ref) => normalizeRef(ref))
    .filter(Boolean);
}

function readSlotRecord(slots, definition) {
  if (!slots || typeof slots !== 'object') {
    return {};
  }

  return slots[definition.camelKey] || slots[definition.key] || {};
}

function readSlotState(slotState, definition) {
  if (!slotState || typeof slotState !== 'object') {
    return null;
  }

  return normalizeString(slotState[definition.camelKey] || slotState[definition.key]);
}

function buildSurfaceState(rawState) {
  switch (rawState) {
    case 'stale':
      return {
        value: 'stale',
        label: 'Stale projection',
        tone: 'warning',
        message:
          'This slot projection may be out of date. Reload to confirm the latest canonical content.',
      };
    case 'fresh':
      return {
        value: 'fresh',
        label: 'Fresh projection',
        tone: 'neutral',
        message: null,
      };
    case 'active':
      return {
        value: 'active',
        label: 'Active projection',
        tone: 'neutral',
        message: null,
      };
    default:
      return null;
  }
}

function buildContentState(rawState) {
  switch (rawState) {
    case 'missing_content':
    case 'missing_artifact_content':
      return {
        value: 'missing_content',
        label: 'Missing artifact content',
        tone: 'warning',
        message:
          'The workspace knows which artifact belongs here, but its rendered content is missing from this projection.',
      };
    default:
      return null;
  }
}

function kindLabelForRef(refKind) {
  switch (refKind) {
    case 'artifact':
      return 'Artifact';
    case 'review_task':
      return 'Review task';
    case 'workspace_slot':
      return 'Workspace slot';
    case 'question':
      return 'Question';
    case 'concept':
      return 'Concept';
    default:
      return labelFromToken(refKind || 'reference');
  }
}

function kindLabelForArtifactKind(artifactKind) {
  return artifactKind ? labelFromToken(artifactKind) : 'Artifact';
}

function buildUpdatedAtLabel(updatedAt) {
  return normalizeString(updatedAt) ? `Updated ${updatedAt}` : null;
}

function buildVisitLabel(updatedAt) {
  return normalizeString(updatedAt) ? `Last runtime visit ${updatedAt}` : null;
}

function buildSlotLaunch(workspace, slotKey) {
  if (!workspace?.workspaceId || !slotKey) {
    return null;
  }

  return {
    ctaLabel: 'Open slot',
    launchPayload: {
      anchorKind: 'workspace_slot',
      workspaceId: workspace.workspaceId,
      slotKey,
      mode: slotKey === 'review_queue' ? 'spaced_review' : 'learn_concept',
      topicId: workspace.topicId,
      topicPath: workspace.topicPath,
    },
  };
}

function buildReferenceLaunch(ref, workspace) {
  if (!ref?.kind) {
    return null;
  }

  if (ref.kind === 'artifact' && normalizeString(ref.artifactId ?? ref.artifact_id)) {
    return {
      ctaLabel: 'Open artifact',
      launchPayload: {
        anchorKind: 'artifact',
        artifactId: normalizeString(ref.artifactId ?? ref.artifact_id),
        mode: 'learn_concept',
        topicId: workspace.topicId,
        topicPath: workspace.topicPath,
      },
    };
  }

  return null;
}

function defaultArtifactKindForSlot(slotKey) {
  switch (slotKey) {
    case 'overview_map':
      return 'summary_card';
    case 'core_method_derivation':
      return 'derivation_card';
    case 'canonical_worked_example':
      return 'worked_example_card';
    case 'common_traps':
      return 'misconception_card';
    case 'my_notes':
      return 'free_note';
    default:
      return null;
  }
}

function buildArtifactLaunch(record, workspace) {
  if (!record?.artifactId) {
    return null;
  }

  const isPostMortemArtifact = record.artifactKind === 'misconception_card';
  const launchPayload = {
    anchorKind: 'artifact',
    artifactId: record.artifactId,
    mode: isPostMortemArtifact ? 'post_mortem_review' : 'learn_concept',
    topicId: workspace.topicId,
    topicPath: workspace.topicPath,
  };

  if (record.targetQuestionTypeId) {
    launchPayload.currentQuestionTypeId = record.targetQuestionTypeId;
  }

  return {
    ctaLabel: isPostMortemArtifact ? 'Start post-mortem review' : 'Open artifact',
    launchPayload,
  };
}

function readArtifactInbox(workspace = {}) {
  return workspace.artifactInbox || workspace.artifact_inbox || {};
}

function normalizeArtifactRecord(artifact = {}, { source = 'artifact_inbox' } = {}) {
  const artifactId = normalizeString(artifact.artifactId ?? artifact.artifact_id);
  if (!artifactId) {
    return null;
  }

  return {
    artifactId,
    title: normalizeString(artifact.title, artifactId),
    summary: normalizeString(artifact.summary ?? artifact.description, null),
    artifactKind: normalizeString(artifact.artifactKind ?? artifact.artifact_kind, null),
    artifactState: normalizeString(artifact.artifactState ?? artifact.artifact_state, null),
    capabilities: normalizeCapabilities(artifact.capabilities),
    canonicalHomeTopicId: normalizeString(
      artifact.canonicalHomeTopicId ?? artifact.canonical_home_topic_id,
      null,
    ),
    placementStatus: normalizeString(
      artifact.placementStatus ?? artifact.placement_status,
      source === 'slot_primary' ? 'pinned' : 'inbox',
    ),
    trustStatus: normalizeString(artifact.trustStatus ?? artifact.trust_status, null),
    lifecycleStatus: normalizeString(artifact.lifecycleStatus ?? artifact.lifecycle_status, 'active'),
    slotKey: normalizeString(artifact.slotKey ?? artifact.slot_key, null),
    targetQuestionTypeId: normalizeString(
      artifact.targetQuestionTypeId ?? artifact.target_question_type_id,
      null,
    ),
    renderPayload: normalizeObject(artifact.renderPayload ?? artifact.render_payload),
    visualReasoning: normalizeVisualReasoning(artifact.renderPayload ?? artifact.render_payload),
    updatedAt: artifact.updatedAt ?? artifact.updated_at ?? null,
    source,
  };
}

function buildArtifactStatusState(record, fallbackState = null) {
  if (record?.artifactState === 'superseded' || record?.lifecycleStatus === 'superseded') {
    return {
      value: 'superseded',
      label: 'Superseded artifact',
      tone: 'warning',
      message: 'This artifact is historical lineage and no longer occupies an active slot.',
    };
  }

  if (record?.artifactState === 'contested' || record?.trustStatus === 'contested') {
    return {
      value: 'contested',
      label: 'Contested artifact',
      tone: 'warning',
      message: 'This artifact is contested and cannot be pinned until the conflict is resolved.',
    };
  }

  if (record?.placementStatus === 'archived') {
    return {
      value: 'archived',
      label: 'Archived artifact',
      tone: 'neutral',
      message: 'Archived artifacts stay visible for lineage but do not occupy a stable slot.',
    };
  }

  return fallbackState;
}

function buildArtifactActionState(record, workspace) {
  const sameCanonicalHome =
    !record?.canonicalHomeTopicId || record.canonicalHomeTopicId === workspace?.topicId;
  const hasCompatibleSlotMetadata =
    Boolean(record?.slotKey)
    && Boolean(record?.artifactKind)
    && isCompatibleArtifactKindForSlot(record.slotKey, record.artifactKind);
  const residentEligible = isResidentEligibleRecord(record);
  const contested = record?.artifactState === 'contested' || record?.trustStatus === 'contested';

  const canPin =
    record?.source === 'artifact_inbox'
    && record?.placementStatus !== 'pinned'
    && record?.lifecycleStatus !== 'superseded'
    && !contested
    && residentEligible
    && record?.slotKey !== 'review_queue'
    && sameCanonicalHome
    && hasCompatibleSlotMetadata;

  return {
    canPin,
    canUnpin: record?.placementStatus === 'pinned',
    canMarkContested:
      record?.lifecycleStatus !== 'superseded'
      && !contested
      && record?.placementStatus !== 'pinned',
    canSupersede: Boolean(record?.artifactId) && record?.lifecycleStatus !== 'superseded',
    pinBlockedReason:
      canPin
        ? null
        : !sameCanonicalHome
          ? 'Secondary-topic artifacts cannot be pinned into this workspace.'
          : contested
            ? 'Contested artifacts cannot be pinned.'
            : !residentEligible
              ? 'This artifact is not eligible for stable residency.'
            : record?.lifecycleStatus === 'superseded'
              ? 'Superseded artifacts cannot be pinned.'
              : record?.placementStatus === 'pinned'
                ? 'This artifact is already pinned.'
                : record?.slotKey === 'review_queue'
                  ? 'Review queue does not accept artifact residency.'
                  : record?.source === 'artifact_inbox' && !hasCompatibleSlotMetadata
                    ? 'This artifact is not compatible with its slot contract.'
                    : null,
    contestedBlockedReason:
      record?.placementStatus === 'pinned' ? 'Unpin before marking contested.' : null,
  };
}

function buildArtifactCard(record, {
  description,
  fallbackState = null,
  placementLabel,
  slotTitle = null,
  workspace,
} = {}) {
  if (!record) {
    return null;
  }

  return {
    artifactId: record.artifactId,
    artifactKind: record.artifactKind,
    artifactState: record.artifactState,
    capabilities: record.capabilities,
    canonicalHomeTopicId: record.canonicalHomeTopicId,
    placementStatus: record.placementStatus,
    trustStatus: record.trustStatus,
    lifecycleStatus: record.lifecycleStatus,
    slotKey: record.slotKey,
    slotTitle: slotTitle || SLOT_DEFINITION_BY_KEY[record.slotKey]?.title || null,
    source: record.source,
    title: record.title,
    kindLabel: kindLabelForArtifactKind(record.artifactKind),
    placementLabel,
    description,
    visualReasoning: record.visualReasoning,
    updatedAtLabel: buildUpdatedAtLabel(record.updatedAt),
    state: buildArtifactStatusState(record, fallbackState),
    launch: buildArtifactLaunch(record, workspace),
    availableActions: buildArtifactActionState(record, workspace),
  };
}

function buildCardViewModel(ref, {
  placementLabel,
  description,
  updatedAt,
  state,
  launch = null,
  workspace,
} = {}) {
  if (!ref) {
    return null;
  }

  return {
    title: ref.label,
    kindLabel: kindLabelForRef(ref.kind),
    placementLabel,
    description,
    updatedAtLabel: buildUpdatedAtLabel(updatedAt),
    state,
    launch: launch || buildReferenceLaunch(ref, workspace),
  };
}

function buildSlotEmptyState(rawState) {
  if (rawState === 'awaiting_verification') {
    return {
      label: 'Awaiting verification',
      message: 'A candidate artifact is visible in the inbox, but this slot has no resident until verification completes.',
    };
  }

  return SLOT_EMPTY_STATE;
}

function buildSlotViewModel(definition, slots, slotState, workspace) {
  const slot = readSlotRecord(slots, definition);
  const primaryArtifact = normalizeRef(slot.primaryArtifactRef ?? slot.primary_artifact_ref ?? null);
  const primaryArtifactPayload = slot.primaryArtifact ?? slot.primary_artifact ?? null;
  const primaryArtifactRecord = primaryArtifactPayload
    ? normalizeArtifactRecord({
      ...primaryArtifactPayload,
      artifactId:
        primaryArtifactPayload.artifactId
        ?? primaryArtifactPayload.artifact_id
        ?? primaryArtifact?.artifactId
        ?? primaryArtifact?.artifact_id,
      artifactKind:
        primaryArtifactPayload.artifactKind
        ?? primaryArtifactPayload.artifact_kind
        ?? defaultArtifactKindForSlot(definition.key),
      canonicalHomeTopicId:
        primaryArtifactPayload.canonicalHomeTopicId
        ?? primaryArtifactPayload.canonical_home_topic_id
        ?? workspace.topicId,
      lifecycleStatus:
        primaryArtifactPayload.lifecycleStatus
        ?? primaryArtifactPayload.lifecycle_status
        ?? 'active',
      placementStatus:
        primaryArtifactPayload.placementStatus
        ?? primaryArtifactPayload.placement_status
        ?? 'pinned',
      slotKey:
        primaryArtifactPayload.slotKey
        ?? primaryArtifactPayload.slot_key
        ?? definition.key,
      title:
        primaryArtifactPayload.title
        ?? primaryArtifact?.label,
      updatedAt:
        primaryArtifactPayload.updatedAt
        ?? primaryArtifactPayload.updated_at
        ?? slot.updatedAt
        ?? slot.updated_at
        ?? null,
    }, {
      source: 'slot_primary',
    })
    : primaryArtifact
      ? normalizeArtifactRecord({
      artifactId: primaryArtifact.artifactId ?? primaryArtifact.artifact_id,
      artifactKind: defaultArtifactKindForSlot(definition.key),
      canonicalHomeTopicId: workspace.topicId,
      lifecycleStatus: 'active',
      placementStatus: 'pinned',
      slotKey: definition.key,
      title: primaryArtifact.label,
    }, {
      source: 'slot_primary',
    })
      : null;
  const linkedReferences = normalizeRefList(slot.linkedReferences ?? slot.linked_references);
  const rawState = readSlotState(slotState, definition);
  const surfaceState = buildSurfaceState(rawState);
  const contentState = buildContentState(rawState);
  const updatedAt = slot.updatedAt ?? slot.updated_at ?? null;

  return {
    slotKey: definition.key,
    title: definition.title,
    description: definition.description,
    workspaceSlotId: slot.workspaceSlotId ?? slot.workspace_slot_id ?? null,
    primaryArtifact,
    primaryArtifactCard: buildArtifactCard(primaryArtifactRecord, {
      placementLabel: 'Canonical resident',
      description: primaryArtifactRecord?.summary || 'Pinned to the canonical slot for this topic.',
      fallbackState: contentState,
      slotTitle: definition.title,
      workspace,
    }) || buildCardViewModel(primaryArtifact, {
      placementLabel: 'Canonical resident',
      description: 'Pinned to the canonical slot for this topic.',
      updatedAt,
      state: contentState,
      workspace,
    }),
    linkedReferences,
    linkedReferenceCards: linkedReferences.map((reference) => buildCardViewModel(reference, {
      placementLabel: 'Linked reference',
      description: 'Linked from another canonical-home topic.',
      updatedAt: null,
      state: null,
      launch:
        definition.key === 'common_traps' && reference.kind === 'artifact'
          ? {
            ctaLabel: 'Start post-mortem review',
            launchPayload: {
              anchorKind: 'artifact',
              artifactId: normalizeString(reference.artifactId ?? reference.artifact_id),
              mode: 'post_mortem_review',
              topicId: workspace.topicId,
              topicPath: workspace.topicPath,
            },
          }
          : null,
      workspace,
    })),
    updatedAt,
    updatedAtLabel: buildUpdatedAtLabel(updatedAt),
    surfaceState,
    contentState,
    emptyState: primaryArtifact ? null : buildSlotEmptyState(rawState),
    slotLaunch: buildSlotLaunch(workspace, definition.key),
  };
}

function buildArtifactInboxViewModel(workspace, slotList) {
  const artifactInbox = readArtifactInbox(workspace);
  const linkedReferenceSummary =
    workspace?.linkedReferenceSummary
    || workspace?.linked_reference_summary
    || {};
  const items = (Array.isArray(artifactInbox.items) ? artifactInbox.items : [])
    .map((artifact) => normalizeArtifactRecord(artifact, {
      source: 'artifact_inbox',
    }))
    .filter(Boolean)
    .map((record) => buildArtifactCard(record, {
      placementLabel: record.placementStatus === 'pinned' ? 'Pinned artifact' : 'Artifact inbox',
      description:
        record.summary
        || (
          record.slotKey
            ? `Eligible for ${SLOT_DEFINITION_BY_KEY[record.slotKey]?.title || 'workspace'} residency.`
            : 'Visible from the workspace artifact inbox.'
        ),
      slotTitle: SLOT_DEFINITION_BY_KEY[record.slotKey]?.title || null,
      workspace,
    }));

  return {
    populatedSlotCount: slotList.filter((slot) => slot.primaryArtifact).length,
    emptySlotCount: slotList.filter((slot) => !slot.primaryArtifact).length,
    staleSlotCount: slotList.filter((slot) => slot.surfaceState?.value === 'stale').length,
    missingContentCount: slotList.filter((slot) => slot.contentState).length,
    totalLinkedReferences:
      linkedReferenceSummary.totalLinkedReferences
      ?? linkedReferenceSummary.total_linked_references
      ?? 0,
    items,
  };
}

function buildLaunchPayloadFromAnchor({
  anchorKind,
  anchorRef,
  currentQuestionTypeId = null,
  mode = 'learn_concept',
  workspace,
} = {}) {
  const resolvedAnchorKind = normalizeString(anchorKind ?? anchorRef?.kind);
  if (!resolvedAnchorKind) {
    return null;
  }

  const launchPayload = {
    anchorKind: resolvedAnchorKind,
    mode: normalizeString(mode, 'learn_concept'),
    topicId: workspace?.topicId || '',
    topicPath: workspace?.topicPath || '',
  };

  if (currentQuestionTypeId) {
    launchPayload.currentQuestionTypeId = currentQuestionTypeId;
  }

  switch (resolvedAnchorKind) {
    case 'artifact': {
      const artifactId = normalizeString(anchorRef?.artifactId ?? anchorRef?.artifact_id);
      return artifactId
        ? {
          ...launchPayload,
          artifactId,
        }
        : null;
    }
    case 'review_task': {
      const reviewTaskId = normalizeString(anchorRef?.reviewTaskId ?? anchorRef?.review_task_id);
      return reviewTaskId
        ? {
          ...launchPayload,
          reviewTaskId,
        }
        : null;
    }
    case 'workspace_slot': {
      const workspaceId = normalizeString(anchorRef?.workspaceId ?? anchorRef?.workspace_id, workspace?.workspaceId || '');
      const slotKey = normalizeString(anchorRef?.slotKey ?? anchorRef?.slot_key);
      return workspaceId && slotKey
        ? {
          ...launchPayload,
          workspaceId,
          slotKey,
        }
        : null;
    }
    case 'concept': {
      return {
        ...launchPayload,
        topicId: normalizeString(anchorRef?.topicId ?? anchorRef?.topic_id, workspace?.topicId || ''),
        topicPath: normalizeString(anchorRef?.topicPath ?? anchorRef?.topic_path, workspace?.topicPath || ''),
      };
    }
    default:
      return null;
  }
}

function buildReviewQueueSignal(reviewQueue) {
  const escalatedCount = reviewQueue?.summary?.escalated ?? 0;
  const leadItem = (Array.isArray(reviewQueue?.items) ? reviewQueue.items : [])
    .find((item) => item?.queueState?.value === 'escalated' && item?.canLaunch);

  if (!escalatedCount || !leadItem?.launchPayload) {
    return null;
  }

  return {
    key: 'review_queue',
    label: 'Escalated review ready',
    summary: `${escalatedCount} escalated review task${escalatedCount === 1 ? ' is' : 's are'} ready in the canonical queue.`,
    ctaLabel: 'Start spaced review',
    launchPayload: leadItem.launchPayload,
    tone: 'danger',
  };
}

function buildSlotSignal(slot, {
  label,
  summary,
} = {}) {
  if (!slot?.slotLaunch?.launchPayload) {
    return null;
  }

  return {
    key: slot.slotKey,
    label,
    summary,
    ctaLabel: `Open ${slot.title.toLowerCase()}`,
    launchPayload: slot.slotLaunch.launchPayload,
    tone: 'warning',
  };
}

function buildRevisitSignals(slotList, reviewQueue) {
  const signals = [];
  const reviewSignal = buildReviewQueueSignal(reviewQueue);
  if (reviewSignal) {
    signals.push(reviewSignal);
  }

  const staleSlot = slotList.find((slot) => slot?.surfaceState?.value === 'stale');
  if (staleSlot) {
    signals.push(buildSlotSignal(staleSlot, {
      label: 'Stale slot',
      summary: staleSlot.surfaceState?.message,
    }));
  }

  const missingContentSlot = slotList.find((slot) => slot?.contentState?.value === 'missing_content');
  if (missingContentSlot) {
    signals.push(buildSlotSignal(missingContentSlot, {
      label: 'Missing content',
      summary: missingContentSlot.contentState?.message,
    }));
  }

  return signals.filter(Boolean);
}

function buildRevisitContinuation(revisit, workspace) {
  const lastSession = revisit?.lastSession || revisit?.last_session || {};
  const resumeGuidance = lastSession?.resumeGuidance || lastSession?.resume_guidance || null;

  if (!resumeGuidance) {
    return null;
  }

  const launchPayload = buildLaunchPayloadFromAnchor({
    anchorKind: resumeGuidance.anchorKind ?? resumeGuidance.anchor_kind,
    anchorRef: resumeGuidance.anchorRef ?? resumeGuidance.anchor_ref,
    currentQuestionTypeId:
      normalizeString(resumeGuidance.currentQuestionTypeId ?? resumeGuidance.current_question_type_id),
    mode: normalizeString(lastSession.mode, 'learn_concept'),
    workspace,
  });

  if (!launchPayload) {
    return null;
  }

  return {
    title: normalizeString(resumeGuidance.title, 'Continue runtime'),
    summary: normalizeString(resumeGuidance.summary, ''),
    detail: normalizeString(resumeGuidance.message, ''),
    ctaLabel: 'Continue runtime',
    launchPayload,
  };
}

function buildRevisitChanges(revisit = {}) {
  const changesSinceLastVisit = revisit?.changesSinceLastVisit || revisit?.changes_since_last_visit || {};
  const slotUpdates = Array.isArray(changesSinceLastVisit.slotUpdates ?? changesSinceLastVisit.slot_updates)
    ? (changesSinceLastVisit.slotUpdates ?? changesSinceLastVisit.slot_updates)
    : [];
  const reviewUpdates = Array.isArray(changesSinceLastVisit.reviewUpdates ?? changesSinceLastVisit.review_updates)
    ? (changesSinceLastVisit.reviewUpdates ?? changesSinceLastVisit.review_updates)
    : [];

  return [
    ...slotUpdates.map((entry) => {
      const slotKey = normalizeString(entry?.slotKey ?? entry?.slot_key, 'slot');
      const slotTitle = SLOT_DEFINITION_BY_KEY[slotKey]?.title || labelFromToken(slotKey, 'slot');
      return {
        key: `slot:${slotKey}`,
        label: `${slotTitle} slot updated`,
        summary: 'Canonical slot content changed after your previous runtime visit.',
      };
    }),
    ...reviewUpdates.map((entry) => {
      const status = normalizeString(entry?.status, 'updated');
      const completionEvidence = entry?.completionEvidence ?? entry?.completion_evidence ?? {};
      return {
        key: `review:${normalizeString(entry?.reviewTaskId ?? entry?.review_task_id, 'unknown')}`,
        label: status === 'completed'
          ? 'Review task completed'
          : status === 'partial'
            ? 'Review task partially completed'
            : 'Review task updated',
        summary:
          normalizeString(completionEvidence?.summary)
          || `${normalizeString(entry?.targetQuestionTypeTitle ?? entry?.target_question_type_title, 'Review task')} changed after your previous runtime visit.`,
      };
    }),
  ];
}

function buildRevisitNextStep(slotList, reviewQueue) {
  const recommendedReview = (Array.isArray(reviewQueue?.items) ? reviewQueue.items : [])
    .find((item) => item?.queueState?.value === 'escalated' && item?.canLaunch);

  if (recommendedReview?.launchPayload) {
    const escalatedCount = reviewQueue?.summary?.escalated ?? 0;
    return {
      title: 'Recommended next step',
      summary: `${escalatedCount} escalated review task${escalatedCount === 1 ? ' is' : 's are'} ready in the canonical queue.`,
      ctaLabel: 'Start spaced review',
      launchPayload: recommendedReview.launchPayload,
    };
  }

  const staleSlot = slotList.find((slot) => slot?.surfaceState?.value === 'stale' && slot?.slotLaunch?.launchPayload);
  if (staleSlot) {
    return {
      title: 'Recommended next step',
      summary: staleSlot.surfaceState?.message,
      ctaLabel: `Open ${staleSlot.title.toLowerCase()}`,
      launchPayload: staleSlot.slotLaunch.launchPayload,
    };
  }

  return null;
}

function buildRevisitViewModel(revisit = {}, workspace, slotList, reviewQueue) {
  const progressSummary = `${slotList.filter((slot) => slot?.primaryArtifact).length} of ${slotList.length} canonical slots populated and ${(reviewQueue?.summary?.completed ?? 0)} review outcome${(reviewQueue?.summary?.completed ?? 0) === 1 ? '' : 's'} completed.`;
  const changes = buildRevisitChanges(revisit);
  const continuation = buildRevisitContinuation(revisit, workspace);
  const nextStep = buildRevisitNextStep(slotList, reviewQueue);
  const signals = buildRevisitSignals(slotList, reviewQueue);
  const lastVisitAt = normalizeString(revisit?.lastVisitAt ?? revisit?.last_visit_at);
  const available = Boolean(lastVisitAt || continuation || nextStep || changes.length > 0 || signals.length > 0);

  return {
    available,
    headline: 'Return with continuity',
    lastVisitLabel: buildVisitLabel(lastVisitAt),
    progressSummary,
    continuation,
    changes,
    nextStep,
    signals,
  };
}

export function buildWorkspaceViewModel(payload = {}, options = {}) {
  const workspace = payload.workspace || {};
  const paperWorkspace = buildPaperWorkspaceViewModel(payload);
  const topicSection = buildTopicSectionViewModel(readTopicSectionFocus(payload));
  const slotState = workspace.slotState || workspace.slot_state || {};
  const workspaceSummary = buildWorkspaceSummary(workspace, {
    workspaceId: payload.workspaceId ?? payload.workspace_id ?? paperWorkspace?.paperWorkspaceId,
    paperScope: paperWorkspace?.paperScope,
    workspaceKind: paperWorkspace?.workspaceKind,
    updatedAt: paperWorkspace?.updatedAt,
  });
  const runtimePosture = buildRuntimePostureViewModel(
    payload.runtimePosture || payload.runtime_posture || null,
  );
  const stableSlots = Object.fromEntries(
    SLOT_DEFINITIONS.map((definition) => [
      definition.key,
      buildSlotViewModel(definition, workspace.slots || {}, slotState, workspaceSummary),
    ]),
  );
  const slotList = SLOT_DEFINITIONS
    .filter((definition) => definition.key !== 'review_queue')
    .map((definition) => stableSlots[definition.key]);
  const reviewQueue = buildReviewQueueViewModel(readReviewQueuePayload(payload), {
    now: options.now,
  });
  const surface = buildSurfaceViewModel(
    payload,
    workspaceSummary,
    paperWorkspace,
    topicSection,
    reviewQueue,
  );

  return {
    surface,
    workspace: workspaceSummary,
    paperWorkspace,
    topicSection,
    runtimePosture,
    slots: stableSlots,
    slotList,
    artifactInbox: buildArtifactInboxViewModel(workspace, slotList),
    reviewQueue,
    featureFlags: payload.featureFlags || payload.feature_flags || {},
    revisit: buildRevisitViewModel(payload.revisit || {}, workspaceSummary, slotList, reviewQueue),
  };
}

export default buildWorkspaceViewModel;
