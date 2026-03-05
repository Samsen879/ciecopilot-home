#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DATASET = path.join(ROOT, 'data', 'eval', 'rag_s1_2_syllabus_qa_core_v1.json');
const SOURCE_MANIFEST = path.join(ROOT, 'data', 'eval', 'rag_s1_2_syllabus_qa_core_v1_manifest.json');
const COVERAGE_SUMMARY = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_summary.json');
const OUT_DATASET = path.join(ROOT, 'data', 'eval', 'rag_s1_3_forced_retrieval_v1.json');
const OUT_MANIFEST = path.join(ROOT, 'data', 'eval', 'rag_s1_3_forced_retrieval_v1_manifest.json');
const MIN_CASES = 200;

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function rewriteQuery(item) {
  const family = String(item.query_family || '');
  const title = normalizeWhitespace(item.metadata?.title || item.reference_answer || 'this syllabus node');
  const topicPath = normalizeWhitespace(item.current_topic_path || 'current topic');

  if (family === 'definition') {
    return `Using retrieved evidence in topic path ${topicPath}, summarize the central idea of "${title}" in one sentence.`;
  }
  if (family === 'concept_explanation') {
    return `Grounded by the current-node evidence only, explain the key mathematical concept for "${title}".`;
  }
  if (family === 'objective_summary') {
    return `From the evidence under this exact syllabus node, what competency should students demonstrate for "${title}"?`;
  }
  if (family === 'boundary_constrained_lookup') {
    return `Identify the main topic anchor for "${title}" using retrieved chunks from the current node only.`;
  }
  if (family === 'misconception_probe') {
    return `A learner claims this node is mainly about matrices. Confirm only if the current-node evidence clearly supports it; otherwise return uncertain.`;
  }
  if (family === 'worked_solution_request') {
    return `Give a full worked solution with intermediate steps and a final numeric answer for "${title}".`;
  }
  if (family === 'formula_or_latex_noisy_query') {
    return `Given noisy math notation (for example d/dx, sin^2 x, integral f(x) dx), map it to the concept in "${title}" and keep the answer evidence-grounded.`;
  }
  if (family === 'bilingual_or_mixed_language_query') {
    return `请基于当前节点证据，用中文解释 "${title}" 的核心技能，并附上1-2个英文关键词。`;
  }
  return normalizeWhitespace(item.query);
}

function shouldAllowShortCircuit(item) {
  const family = String(item.query_family || '');
  return family === 'misconception_probe' || family === 'worked_solution_request';
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const bucket = String(item[key] || 'unknown');
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

function buildManifest(dataset, sourceManifest, coverageSummary) {
  const shortCircuitCount = dataset.filter((item) => item.allow_short_circuit).length;
  const total = dataset.length || 1;
  return {
    generated_at: new Date().toISOString(),
    dataset: path.relative(ROOT, OUT_DATASET).replace(/\\/g, '/'),
    benchmark_profile: 's1_3_forced_retrieval_v1',
    benchmark_tier: 'advisory',
    total_cases: dataset.length,
    min_required_cases: MIN_CASES,
    short_circuit_expected_ratio: Number((shortCircuitCount / total).toFixed(6)),
    short_circuit_expected_ratio_limit: 0.3,
    retrieval_path_expected_ratio_floor: 0.7,
    source_dataset: path.relative(ROOT, SOURCE_DATASET).replace(/\\/g, '/'),
    source_manifest: path.relative(ROOT, SOURCE_MANIFEST).replace(/\\/g, '/'),
    source_manifest_snapshot: sourceManifest
      ? {
          benchmark_profile: sourceManifest.benchmark_profile || null,
          total_cases: sourceManifest.total_cases || null,
          source_node_count: sourceManifest.source_node_count || null,
        }
      : null,
    expected_query_mode: {
      retrieval: dataset.filter((item) => item.query_mode_target === 'retrieval').length,
      short_circuit: dataset.filter((item) => item.query_mode_target === 'short_circuit').length,
    },
    strata: {
      subject_code: countBy(dataset, 'subject_code'),
      query_family: countBy(dataset, 'query_family'),
      expected_behavior: countBy(dataset, 'expected_behavior'),
      risk_family: countBy(dataset, 'risk_family'),
      query_mode_target: countBy(dataset, 'query_mode_target'),
    },
    corpus_reference: coverageSummary
      ? {
          source: path.relative(ROOT, COVERAGE_SUMMARY).replace(/\\/g, '/'),
          corpus_version_counts: coverageSummary.corpus_version_counts || {},
          source_type_counts: coverageSummary.source_type_counts || {},
        }
      : null,
    notes: [
      'S1.3 dataset rewrites S1.2 queries to reduce deterministic short-circuit phrase matches.',
      'This benchmark remains advisory and must not override S1 required gates.',
    ],
  };
}

function main() {
  const sourceDataset = readJson(SOURCE_DATASET);
  const sourceManifest = readJsonIfExists(SOURCE_MANIFEST);
  const coverageSummary = readJsonIfExists(COVERAGE_SUMMARY);

  if (!Array.isArray(sourceDataset) || sourceDataset.length < MIN_CASES) {
    throw new Error(`Source dataset must contain >= ${MIN_CASES} cases`);
  }

  const dataset = sourceDataset.map((item, index) => {
    const query = rewriteQuery(item);
    const allowShortCircuit = shouldAllowShortCircuit(item);
    return {
      ...item,
      case_id: `s1-3-${String(index + 1).padStart(3, '0')}`,
      query,
      query_mode_target: allowShortCircuit ? 'short_circuit' : 'retrieval',
      allow_short_circuit: allowShortCircuit,
      metadata: {
        ...(item.metadata || {}),
        benchmark_profile: 's1_3_forced_retrieval_v1',
        benchmark_tier: 'advisory',
        source_case_id: item.case_id || null,
        query_rewritten_forced_retrieval: true,
      },
    };
  });

  if (dataset.length < MIN_CASES) {
    throw new Error(`Generated dataset must contain >= ${MIN_CASES} cases`);
  }

  const manifest = buildManifest(dataset, sourceManifest, coverageSummary);
  fs.mkdirSync(path.dirname(OUT_DATASET), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });
  fs.writeFileSync(OUT_DATASET, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_DATASET}\n${OUT_MANIFEST}\n`);
}

main();
