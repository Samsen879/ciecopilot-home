#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SOURCE_DATASET = path.join(ROOT, 'data', 'eval', 'rag_s1_3_forced_retrieval_v1.json');
const OUT_DATASET = path.join(ROOT, 'data', 'eval', 'rag_s2_augmentation_eval_v1.json');
const OUT_MANIFEST = path.join(ROOT, 'data', 'eval', 'rag_s2_augmentation_eval_v1_manifest.json');

const TARGET_SLICES = Object.freeze([
  'cross_topic',
  'global_planning',
  'prerequisite_chain',
]);

const QUERY_FAMILIES = Object.freeze({
  cross_topic: 'cross_topic_linking',
  global_planning: 'global_planning',
  prerequisite_chain: 'prerequisite_chain',
});

const DEFAULT_MAX_NODES = 30;

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function parseCliArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required source dataset not found: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array dataset at ${filePath}`);
  }
  return parsed;
}

function extractNodeLabel(item) {
  const title = normalizeWhitespace(item?.metadata?.title || '');
  if (title) return title;
  const reference = normalizeWhitespace(item?.reference_answer || '');
  if (reference) return reference.split('.').map((part) => part.trim()).find(Boolean) || reference;
  return 'this syllabus topic';
}

function extractKeywords(label) {
  const words = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  return words.length > 0 ? words : ['topic'];
}

function buildUniqueNodes(sourceCases, maxNodes) {
  const byNodeId = new Map();
  for (const item of sourceCases) {
    const nodeId = String(item?.syllabus_node_id || '').trim();
    const topicPath = String(item?.current_topic_path || '').trim();
    if (!nodeId || !topicPath) continue;
    if (byNodeId.has(nodeId)) continue;

    byNodeId.set(nodeId, {
      syllabus_node_id: nodeId,
      current_topic_path: topicPath,
      subject_code: String(item?.subject_code || topicPath.split('.')[0] || '').trim() || null,
      difficulty: String(item?.difficulty || 'medium').trim() || 'medium',
      topic_family: String(item?.topic_family || 'unknown').trim() || 'unknown',
      label: extractNodeLabel(item),
      source_case_id: String(item?.case_id || '').trim() || null,
    });
    if (byNodeId.size >= maxNodes) break;
  }
  return [...byNodeId.values()];
}

function groupBySubject(nodes) {
  const groups = new Map();
  for (const node of nodes) {
    const subjectCode = String(node.subject_code || '').trim() || 'unknown';
    if (!groups.has(subjectCode)) groups.set(subjectCode, []);
    groups.get(subjectCode).push(node);
  }
  return groups;
}

function pickPeerNode(subjectNodes, index, fallbackNode) {
  if (!Array.isArray(subjectNodes) || subjectNodes.length <= 1) return fallbackNode;
  const next = subjectNodes[(index + 1) % subjectNodes.length];
  if (next?.syllabus_node_id === fallbackNode?.syllabus_node_id) {
    return subjectNodes[(index + 2) % subjectNodes.length] || fallbackNode;
  }
  return next || fallbackNode;
}

function buildQuery({ slice, node, peerNode }) {
  const nodeLabel = normalizeWhitespace(node?.label || 'this topic');
  const peerLabel = normalizeWhitespace(peerNode?.label || 'another topic');

  if (slice === 'cross_topic') {
    return `Across chapters, compare "${nodeLabel}" with "${peerLabel}" and explain the cross-topic dependency chain for revision.`;
  }
  if (slice === 'global_planning') {
    return `Create a global study plan and revision plan that connects "${nodeLabel}" with related chapters in this subject.`;
  }
  return `For "${nodeLabel}", map the prerequisite chain and dependency chain before moving to more advanced chapters.`;
}

function buildCases(nodes, { sourceDatasetPath }) {
  const subjectGroups = groupBySubject(nodes);
  const cases = [];
  let caseIndex = 1;

  for (const node of nodes) {
    const subjectNodes = subjectGroups.get(String(node.subject_code || 'unknown')) || [node];
    const peerNode = pickPeerNode(subjectNodes, subjectNodes.findIndex((x) => x.syllabus_node_id === node.syllabus_node_id), node);

    for (const slice of TARGET_SLICES) {
      const query = buildQuery({ slice, node, peerNode });
      const queryFamily = QUERY_FAMILIES[slice];
      const referenceAnswer = `${node.label}. ${normalizeWhitespace(node.current_topic_path)}`;

      cases.push({
        case_id: `s2-aug-${String(caseIndex).padStart(3, '0')}`,
        syllabus_node_id: node.syllabus_node_id,
        current_topic_path: node.current_topic_path,
        subject_code: node.subject_code,
        difficulty: node.difficulty,
        query_family: queryFamily,
        risk_family: 'cross_topic_global_reasoning',
        target_slice: slice,
        expected_behavior: 's2_augmentation_candidate',
        expected_uncertain_reason_code: null,
        topic_family: node.topic_family,
        query,
        reference_answer: referenceAnswer,
        expected_answer_keywords: extractKeywords(node.label),
        min_answer_score: 0.45,
        query_mode_target: 'retrieval',
        allow_short_circuit: false,
        metadata: {
          benchmark_profile: 's2_augmentation_eval_v1',
          benchmark_tier: 'advisory',
          source_dataset: sourceDatasetPath,
          source_case_id: node.source_case_id,
          source_node_label: node.label,
          peer_topic_path: peerNode?.current_topic_path || null,
          peer_node_label: peerNode?.label || null,
          target_slice: slice,
          expected_route: 's2_augmentation',
          fallback_allowed: true,
        },
      });

      caseIndex += 1;
    }
  }

  return cases;
}

function countBy(cases, fieldName) {
  return cases.reduce((acc, item) => {
    const key = String(item?.[fieldName] || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildManifest(cases, { sourceDatasetPath, sourceCaseCount, sourceNodeCount, maxNodes }) {
  const sliceCoverage = countBy(cases, 'target_slice');
  return {
    generated_at: new Date().toISOString(),
    dataset: toRel(OUT_DATASET),
    benchmark_profile: 's2_augmentation_eval_v1',
    benchmark_tier: 'advisory',
    total_cases: cases.length,
    source_dataset: sourceDatasetPath,
    source_dataset_total_cases: sourceCaseCount,
    source_node_count: sourceNodeCount,
    target_slices: TARGET_SLICES,
    coverage: {
      target_slice: sliceCoverage,
      all_target_slices_covered: TARGET_SLICES.every((slice) => Number(sliceCoverage[slice] || 0) > 0),
    },
    strata: {
      subject_code: countBy(cases, 'subject_code'),
      difficulty: countBy(cases, 'difficulty'),
      query_family: countBy(cases, 'query_family'),
      expected_behavior: countBy(cases, 'expected_behavior'),
      target_slice: sliceCoverage,
    },
    run_config: {
      script: toRel(SCRIPT_FILE),
      max_nodes: maxNodes,
      cases_per_node: TARGET_SLICES.length,
      query_families: QUERY_FAMILIES,
      output_dataset: toRel(OUT_DATASET),
      output_manifest: toRel(OUT_MANIFEST),
    },
    notes: [
      'S2 eval set is augmentation-focused and does not replace S1 default routing.',
      'All cases are retrieval-targeted and short-circuit is disabled.',
      'Fallback to S1 is allowed and expected for fail-closed behavior validation.',
    ],
  };
}

function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const maxNodes = toPositiveInteger(argv['max-nodes'], DEFAULT_MAX_NODES);
  const sourceCases = readJsonArray(SOURCE_DATASET);
  const sourceDatasetPath = toRel(SOURCE_DATASET);

  const nodes = buildUniqueNodes(sourceCases, maxNodes);
  if (nodes.length === 0) {
    throw new Error('No valid source nodes found to build S2 eval set');
  }

  const cases = buildCases(nodes, { sourceDatasetPath });
  if (cases.length < TARGET_SLICES.length) {
    throw new Error('Generated S2 eval set is empty or incomplete');
  }

  const manifest = buildManifest(cases, {
    sourceDatasetPath,
    sourceCaseCount: sourceCases.length,
    sourceNodeCount: nodes.length,
    maxNodes,
  });

  fs.mkdirSync(path.dirname(OUT_DATASET), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });
  fs.writeFileSync(OUT_DATASET, `${JSON.stringify(cases, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `${OUT_DATASET}\n${OUT_MANIFEST}\n${JSON.stringify(
      {
        total_cases: cases.length,
        source_node_count: nodes.length,
        target_slices: TARGET_SLICES,
      },
      null,
      2,
    )}\n`,
  );
}

main();
