#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATASET_FILE = path.join(ROOT, 'data', 'eval', 'rag_s2_augmentation_eval_v1.json');
const CORPUS_SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_summary.json');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_readiness_profile.json');

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getTopicDepth(topicPath) {
  return String(topicPath || '')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}

function summarizeDepth(depths) {
  const distribution = {};
  for (const depth of depths) {
    distribution[depth] = (distribution[depth] || 0) + 1;
  }
  return {
    min: depths.length > 0 ? Math.min(...depths) : 0,
    p50: percentile(depths, 0.5),
    p75: percentile(depths, 0.75),
    p90: percentile(depths, 0.9),
    max: depths.length > 0 ? Math.max(...depths) : 0,
    distribution,
  };
}

function chooseRecommendedDepth({ subjectCode, depthSummary, evalCaseCount, corpusRowCount }) {
  const depthMax = Number(depthSummary?.max || 1);
  if (subjectCode === '9709') {
    return Math.min(Math.max(2, Number(depthSummary?.p50 || 2)), depthMax);
  }
  if (corpusRowCount >= 20 && evalCaseCount >= 10) {
    return Math.min(2, depthMax);
  }
  return 1;
}

function main() {
  const dataset = readJson(DATASET_FILE);
  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw new Error(`dataset missing or empty: ${DATASET_FILE}`);
  }
  const corpusSummary = readJson(CORPUS_SUMMARY_FILE) || {};
  const corpusSubjectCounts =
    corpusSummary && typeof corpusSummary.subject_counts === 'object' && corpusSummary.subject_counts
      ? corpusSummary.subject_counts
      : {};

  const grouped = new Map();
  for (const item of dataset) {
    const subjectCode = String(item?.subject_code || '').trim();
    if (!subjectCode) continue;
    const bucket = grouped.get(subjectCode) || [];
    bucket.push(item);
    grouped.set(subjectCode, bucket);
  }

  const subjectProfiles = {};
  const coveredSubjects = [];
  const recommendedDepthBySubject = {};
  for (const [subjectCode, items] of grouped.entries()) {
    const depths = items.map((item) => getTopicDepth(item.current_topic_path)).filter((depth) => depth > 0);
    const depthSummary = summarizeDepth(depths);
    const evalCaseCount = items.length;
    const corpusRowCount = Number(corpusSubjectCounts[subjectCode] || 0);
    const recommendedMaxDepth = chooseRecommendedDepth({
      subjectCode,
      depthSummary,
      evalCaseCount,
      corpusRowCount,
    });
    const readinessCovered = evalCaseCount > 0 || corpusRowCount > 0;

    subjectProfiles[subjectCode] = {
      readiness_covered: readinessCovered,
      coverage_source: corpusRowCount > 0 ? 'corpus_plus_eval' : 'eval_bootstrap_only',
      eval_case_count: evalCaseCount,
      corpus_row_count: corpusRowCount,
      depth_summary: depthSummary,
      max_topic_depth: recommendedMaxDepth,
      max_topic_depth_candidates: {
        conservative: 1,
        balanced: recommendedMaxDepth,
        aggressive: Math.min(Math.max(recommendedMaxDepth + 1, 2), Math.max(depthSummary.max, recommendedMaxDepth)),
      },
    };

    if (readinessCovered) {
      coveredSubjects.push(subjectCode);
      recommendedDepthBySubject[subjectCode] = recommendedMaxDepth;
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_readiness_profile',
    run_config: {
      script: 'scripts/rag/build_s2_readiness_profile.js',
      dataset: toRel(DATASET_FILE),
      corpus_coverage_summary: toRel(CORPUS_SUMMARY_FILE),
    },
    defaults: {
      readiness_guard_enabled: true,
      default_max_topic_depth: 1,
      enforce_subject_coverage: false,
      profile_source_priority: ['subject_profile', 'config_override', 'global_default'],
    },
    covered_subjects: coveredSubjects.sort(),
    subject_profiles: subjectProfiles,
    recommended_max_topic_depth_by_subject: recommendedDepthBySubject,
    notes: [
      'This profile bootstraps readiness coverage from eval dataset + corpus coverage summary.',
      '9709 receives a balanced depth recommendation to increase S2 route share in advisory experiments.',
      'Use with RAG_S2_READINESS_PROFILE_PATH and optionally override via RAG_S2_READINESS_MAX_TOPIC_DEPTH_BY_SUBJECT.',
    ],
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(OUT_FILE)}\n`);
}

main();
