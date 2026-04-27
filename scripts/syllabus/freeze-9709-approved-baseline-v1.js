#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

const PATHS = {
  draftTree: 'data/syllabus/9709/canonical_topic_tree_draft_v1.json',
  draftBoundaries: 'data/syllabus/9709/boundary_annotations_draft_v1.json',
  reviewItems: 'data/syllabus/9709/review_items_v1.json',
  approvedTree: 'data/syllabus/9709/canonical_topic_tree_v1.json',
  approvedBoundaries: 'data/syllabus/9709/boundary_annotations_v1.json',
  humanDecisions: 'data/syllabus/9709/human_review_decisions_v1.json',
  freezeReport: 'docs/reports/9709-syllabus-baseline-freeze-v1.md',
};

const APPROVAL = {
  authority_id: 'human-approval-2026-04-27-issue-293',
  reviewed_by: 'human_review_authority:issue_293',
  reviewed_at: '2026-04-27T00:00:00.000Z',
  approved_date: '2026-04-27',
  approval_quote: '我同意，human review通过，以后所有需要human review的都默认通过，继续推进',
};

const DECISION_ARTIFACT = PATHS.humanDecisions;

const REPAIR_MAP = new Map([
  [
    '9709:2026-2027_v4:learning_objective:p1.integration.lo01_u_o_n_f_d_d_i_e',
    {
      newId:
        '9709:2026-2027_v4:learning_objective:p1.integration.lo01_understand_integration_as_the_reverse_process_of_differentiation',
      newTopicPathTail: 'lo01_understand_integration_as_the_reverse_process_of_differentiation',
      title:
        'understand integration as the reverse process of differentiation, and integrate (ax + b)^n (for any rational n except -1), together with constant multiples, sums and differences',
    },
  ],
  [
    '9709:2026-2027_v4:learning_objective:p6.the_poisson_distribution.lo05_use_the_normal_distribution_with_continuity_15_correction',
    {
      newId:
        '9709:2026-2027_v4:learning_objective:p6.the_poisson_distribution.lo05_use_the_normal_distribution_as_an_approximation_to_the_poisson_distribution',
      newTopicPathTail:
        'lo05_use_the_normal_distribution_as_an_approximation_to_the_poisson_distribution',
      title:
        'use the normal distribution, with continuity correction, as an approximation to the Poisson distribution where appropriate',
    },
  ],
  [
    '9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo05_use_the_central_limit_appropriate_the_distribution_of',
    {
      newId:
        '9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo05_use_the_central_limit_theorem_where_appropriate',
      newTopicPathTail: 'lo05_use_the_central_limit_theorem_where_appropriate',
      title: 'use the Central Limit Theorem where appropriate',
    },
  ],
]);

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function writeJson(relPath, value) {
  const absolutePath = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(relPath, value) {
  const absolutePath = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value, 'utf8');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function compactArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function recommendedOption(reviewItem) {
  return reviewItem.recommended_options.find((option) => option.recommended === true)
    ?? reviewItem.recommended_options[0];
}

function sourceRefs(value) {
  return Array.isArray(value?.source_refs) ? cloneJson(value.source_refs) : [];
}

function decisionSourceRefs(decision) {
  return sourceRefs(decision);
}

function appliedRefsForReviewItem(reviewItem, repairIdMap) {
  const nodeIds = [
    ...compactArray(reviewItem.candidate_node_ids),
    ...compactArray(reviewItem.representative_node_ids),
  ].map((nodeId) => repairIdMap.get(nodeId) ?? nodeId);

  const boundaryIdsByReviewItem = {
    '9709-review-003-p2-p3-subset-boundary': [
      '9709:2026-2027_v4:boundary:relationship.p2_subset_p3',
    ],
    '9709-review-004-p4-p6-component-conflict': [
      '9709:2026-2027_v4:boundary:route.no_p4_p6_combination',
    ],
  };

  return {
    topic_node_ids: [...new Set(nodeIds)],
    boundary_ids: boundaryIdsByReviewItem[reviewItem.item_id] ?? [],
  };
}

function buildHumanReviewDecisions(reviewItems, repairIdMap) {
  const decisions = reviewItems.review_items.map((item) => {
    const selected = recommendedOption(item);
    return {
      review_item_id: item.item_id,
      category: item.category,
      title: item.title,
      decision_status: 'approved',
      selected_option_id: selected.option_id,
      selected_option_label: selected.label,
      selected_machine_action: selected.machine_action,
      selected_option_recommended: selected.recommended === true,
      resulting_contract_change: selected.resulting_contract_change,
      rationale:
        selected.recommended === true
          ? 'Selected the review-pack recommended/default option under the issue #293 human approval authority.'
          : 'Selected the least-content-changing option under the issue #293 human approval authority because no explicit recommended option was present.',
      applied_to: appliedRefsForReviewItem(item, repairIdMap),
      source_refs: decisionSourceRefs(item),
      downstream_impact: cloneJson(item.downstream_impact ?? {}),
      decided_by: APPROVAL.reviewed_by,
      decided_at: APPROVAL.reviewed_at,
      decision_authority_id: APPROVAL.authority_id,
    };
  });

  return {
    schema_version: '9709_human_review_decisions_v1',
    issue: 293,
    parent_tracker: 286,
    predecessors: [287, 288, 289, 290, 291, 292],
    subject_code: '9709',
    syllabus_version: '2026-2027_v4',
    generated_at: APPROVAL.reviewed_at,
    source_lock: cloneJson(reviewItems.source_lock),
    source_artifacts: {
      review_items: PATHS.reviewItems,
      canonical_topic_tree_draft: PATHS.draftTree,
      boundary_annotations_draft: PATHS.draftBoundaries,
      canonical_topic_tree_v1: PATHS.approvedTree,
      boundary_annotations_v1: PATHS.approvedBoundaries,
    },
    human_authority: {
      authority_id: APPROVAL.authority_id,
      approved_by: 'user',
      approved_date: APPROVAL.approved_date,
      approval_quote: APPROVAL.approval_quote,
      scope: '9709_syllabus_baseline_freeze_v1',
      limitations: [
        'Does not bypass CI, code review, source_refs, gate checks, or non-9709 scope boundaries.',
        'Applies review-pack recommended/default decisions only for the issue #293 baseline freeze.',
        'Does not authorize downstream learning-runtime, mastery, recommendation, frontend, VLM, or question extraction claims.',
      ],
    },
    decision_policy: {
      selection_rule:
        'Use explicit recommended option when present; otherwise choose the least-content-changing option.',
      unresolved_review_items_before_application: reviewItems.review_items.length,
      unresolved_review_items_after_application: 0,
      approved_baseline_freeze_attempted: true,
    },
    decisions,
    carried_review_items: [],
  };
}

function decisionRefsForNode(node, repaired) {
  const refs = new Set(['human-approval-2026-04-27-issue-293']);

  for (const note of compactArray(node.review_state?.notes)) {
    if (note.includes('Repeated official section title')) {
      refs.add('9709-review-001-repeated-section-title-merge-policy');
    }
    if (note.includes('Official bullet contains multiple concepts')) {
      refs.add('9709-review-002-compound-objective-split-policy');
    }
  }

  if (repaired) {
    refs.add('9709-review-005-ocr-damaged-title-id-repair');
  }

  return [...refs];
}

function approvalNotes(existingNotes, decisionRefs) {
  return [
    ...compactArray(existingNotes),
    `Approved by ${APPROVAL.authority_id} for issue #293; decision artifact: ${DECISION_ARTIFACT}; decision refs: ${decisionRefs.join(', ')}.`,
  ];
}

function addDeprecatedLegacyPath(node, oldNodeId) {
  const existing = compactArray(node.legacy_paths);
  if (existing.some((entry) => entry.path === oldNodeId)) {
    return existing;
  }
  return [
    ...existing,
    {
      path: oldNodeId,
      source: 'manual_audit',
      status: 'deprecated',
      source_refs: sourceRefs(node),
    },
  ];
}

function buildApprovedTopicTree(draftTree) {
  const repairIdMap = new Map([...REPAIR_MAP].map(([oldId, repair]) => [oldId, repair.newId]));
  const nodes = draftTree.nodes.map((draftNode) => {
    const node = cloneJson(draftNode);
    const repair = REPAIR_MAP.get(node.node_id);
    const oldNodeId = node.node_id;

    if (repair) {
      node.node_id = repair.newId;
      node.topic_path[node.topic_path.length - 1] = repair.newTopicPathTail;
      node.canonical_title = repair.title;
      node.display_title = repair.title;
      node.legacy_paths = addDeprecatedLegacyPath(node, oldNodeId);
    }

    if (node.parent_node_id && repairIdMap.has(node.parent_node_id)) {
      node.parent_node_id = repairIdMap.get(node.parent_node_id);
    }

    const decisionRefs = decisionRefsForNode(draftNode, Boolean(repair));
    node.status = 'approved';
    node.review_state = {
      state: 'accepted',
      reviewed_by: APPROVAL.reviewed_by,
      reviewed_at: APPROVAL.reviewed_at,
      notes: approvalNotes(draftNode.review_state?.notes, decisionRefs),
    };

    return node;
  });

  return {
    ...cloneJson(draftTree),
    nodes,
  };
}

function decisionRefsForBoundary(annotation) {
  const refs = new Set(['human-approval-2026-04-27-issue-293']);

  if (annotation.boundary_id === '9709:2026-2027_v4:boundary:relationship.p2_subset_p3') {
    refs.add('9709-review-003-p2-p3-subset-boundary');
  }
  if (annotation.boundary_id === '9709:2026-2027_v4:boundary:route.no_p4_p6_combination') {
    refs.add('9709-review-004-p4-p6-component-conflict');
  }

  return [...refs];
}

function buildApprovedBoundaryAnnotations(draftBoundaries) {
  return {
    ...cloneJson(draftBoundaries),
    schema_version: '9709_boundary_annotations_v1',
    issue: 293,
    origin_issue: draftBoundaries.issue,
    generated_at: APPROVAL.reviewed_at,
    approved_baseline: true,
    approval_scope: {
      human_review_decisions_path: DECISION_ARTIFACT,
      decision_authority_id: APPROVAL.authority_id,
      canonical_topic_tree_path: PATHS.approvedTree,
      canonical_topic_tree_mutation: false,
    },
    draft_scope: {
      ...cloneJson(draftBoundaries.draft_scope ?? {}),
      approved_baseline: true,
      notes: [
        ...compactArray(draftBoundaries.draft_scope?.notes),
        `Approved for baseline freeze by ${APPROVAL.authority_id}; unresolved review queue is empty after applying ${DECISION_ARTIFACT}.`,
      ],
    },
    boundary_annotations: draftBoundaries.boundary_annotations.map((draftAnnotation) => {
      const annotation = cloneJson(draftAnnotation);
      const refs = decisionRefsForBoundary(annotation);
      annotation.status = 'approved';
      annotation.needs_human_review = false;
      annotation.review_state = {
        state: 'accepted',
        reviewed_by: APPROVAL.reviewed_by,
        reviewed_at: APPROVAL.reviewed_at,
        decision_artifact: DECISION_ARTIFACT,
        decision_refs: refs,
        notes: [
          `Approved by ${APPROVAL.authority_id} for issue #293; boundary overlay remains separate from the canonical topic tree.`,
        ],
      };
      return annotation;
    }),
  };
}

function buildFreezeReport({ decisions, approvedTree, approvedBoundaries }) {
  const repairedRows = [...REPAIR_MAP].map(([oldId, repair]) => `| \`${oldId}\` | \`${repair.newId}\` | deprecated legacy_path on repaired node |`);
  const decisionRows = decisions.decisions.map(
    (decision) =>
      `| \`${decision.review_item_id}\` | \`${decision.selected_option_id}\` | ${decision.selected_machine_action} |`,
  );

  return `# 9709 Syllabus Baseline Freeze V1

Issue: #293

Parent tracker: #286

## Verdict

The approved canonical syllabus baseline v1 is frozen for Cambridge International AS & A Level Mathematics 9709, syllabus version \`2026-2027_v4\`.

This freeze is limited to the official-syllabus taxonomy and boundary overlay. It does not create downstream learning-runtime, mastery, recommendation, frontend, VLM, question extraction, or question semantic claims.

## Human Review Authority

- Decision artifact: \`${PATHS.humanDecisions}\`
- Authority ID: \`${APPROVAL.authority_id}\`
- Approval date: ${APPROVAL.approved_date}
- Approval quote: \`${APPROVAL.approval_quote}\`
- Selection rule: recommended/default review-pack option where present; least-content-changing option only if no explicit recommendation exists.
- Carried unresolved review items: ${decisions.carried_review_items.length}

## Approved Artifacts

- Topic tree: \`${PATHS.approvedTree}\`
- Boundary annotations: \`${PATHS.approvedBoundaries}\`
- Human decisions: \`${PATHS.humanDecisions}\`
- Gate report: \`docs/reports/9709-syllabus-gate-report.json\`

## Decision Application

| Review item | Selected option | Machine action |
| --- | --- | --- |
${decisionRows.join('\n')}

## Approved Baseline Counts

- Topic nodes: ${approvedTree.nodes.length}
- Boundary annotations: ${approvedBoundaries.boundary_annotations.length}
- Approved topic nodes without source_refs: ${approvedTree.nodes.filter((node) => sourceRefs(node).length === 0).length}
- Approved boundary annotations without source_refs: ${approvedBoundaries.boundary_annotations.filter((annotation) => sourceRefs(annotation).length === 0).length}

## OCR Repair And Legacy Mapping

The naming/ID repair decision is applied only to representative OCR-damaged node IDs already listed in the review pack. The old IDs are not silently dropped; each is retained as a deprecated \`legacy_path\` on the repaired approved node.

| Deprecated draft ID | Approved ID | Mapping posture |
| --- | --- | --- |
${repairedRows.join('\n')}

## Legacy Migration / Quarantine Notes

Legacy and candidate files remain non-authoritative. The source inventory continues to mark the legacy text and derived candidate files as deprecated or comparison-only material; the approved baseline does not cite them as \`source_refs\`.

| Legacy/candidate class | Freeze posture |
| --- | --- |
| \`data/syllabus/9709syllabus.txt\` | deprecated as source baseline; not canonical |
| \`data/syllabus/9709_p1_p3_nodes_v1.json\` | legacy non-authoritative candidate comparison only |
| \`data/curriculum/9709_question_search_recovery_nodes_v1.json\` | candidate comparison input only |
| \`data/curriculum/9709_authority_ready_batch_300_nodes_v2.json\` | candidate comparison input only |

## Gate Contract

The syllabus gate must be run as an approved-baseline attempt. It fails if approved nodes or boundary annotations lack human decision references, if review decisions are missing, if carried review items remain, if source_refs drift outside the locked official extraction layer, or if legacy files leak into canonical authority.

The checked-in gate report may retain non-blocking raw-section mapping warnings for front matter, syllabus context, MF19 formula/table material, and administrative sections outside the canonical topic tree. Review item \`9709-review-006-unmapped-official-content-scope\` approves that there are zero unmapped subject-content bullets while keeping MF19 outside this baseline.
`;
}

export function freeze9709ApprovedBaselineV1() {
  const draftTree = readJson(PATHS.draftTree);
  const draftBoundaries = readJson(PATHS.draftBoundaries);
  const reviewItems = readJson(PATHS.reviewItems);
  const repairIdMap = new Map([...REPAIR_MAP].map(([oldId, repair]) => [oldId, repair.newId]));

  const humanDecisions = buildHumanReviewDecisions(reviewItems, repairIdMap);
  const approvedTree = buildApprovedTopicTree(draftTree);
  const approvedBoundaries = buildApprovedBoundaryAnnotations(draftBoundaries);

  writeJson(PATHS.humanDecisions, humanDecisions);
  writeJson(PATHS.approvedTree, approvedTree);
  writeJson(PATHS.approvedBoundaries, approvedBoundaries);
  writeText(PATHS.freezeReport, buildFreezeReport({
    decisions: humanDecisions,
    approvedTree,
    approvedBoundaries,
  }));

  return {
    paths: PATHS,
    counts: {
      decisions: humanDecisions.decisions.length,
      topic_nodes: approvedTree.nodes.length,
      boundary_annotations: approvedBoundaries.boundary_annotations.length,
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = freeze9709ApprovedBaselineV1();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
