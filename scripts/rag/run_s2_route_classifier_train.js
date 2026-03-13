#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { evaluateS2RouteByRules } from '../../api/rag/lib/s2-route-rules.js';
import { classifyS2RouteByLocalModel, tokenizeRouteQuery } from '../../api/rag/lib/s2-local-classifier.js';

const ROOT = process.cwd();
const DEFAULT_OUT_MODEL = path.join(ROOT, 'runs', 'backend', 'rag_s2_route_classifier_model.json');
const DEFAULT_OUT_EVAL = path.join(ROOT, 'runs', 'backend', 'rag_s2_route_classifier_eval.json');
const DEFAULT_LABEL_FILE = path.join(ROOT, 'data', 'eval', 'rag_s2_route_classifier_labels_v1.json');
const DEFAULT_SOURCE_FILES = [
  path.join(ROOT, 'data', 'eval', 'rag_s1_3_forced_retrieval_v1.json'),
  path.join(ROOT, 'data', 'eval', 'rag_s1_2_syllabus_qa_core_v1.json'),
  path.join(ROOT, 'data', 'eval', 'rag_live_set_v1.json'),
];

function parseCliArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('-')) continue;
    const eqIndex = token.indexOf('=');
    if (eqIndex !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eqIndex)] = token.slice(eqIndex + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = argv[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function normalizeRouteLabel(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;
  if (
    text === 's2' ||
    text === 's2_augmentation' ||
    text === 'augmentation' ||
    text === 'true' ||
    text === '1'
  ) {
    return 's2_augmentation';
  }
  if (
    text === 's1' ||
    text === 's1_default' ||
    text === 'default' ||
    text === 'false' ||
    text === '0'
  ) {
    return 's1_default';
  }
  return null;
}

function inferManualLabel(row) {
  if (!row || typeof row !== 'object') return null;
  return (
    normalizeRouteLabel(row.route_label) ||
    normalizeRouteLabel(row.retrieval_route) ||
    normalizeRouteLabel(row.label) ||
    normalizeRouteLabel(row.expected_route) ||
    normalizeRouteLabel(row.is_s2_route)
  );
}

function inferQuery(row) {
  if (!row || typeof row !== 'object') return '';
  return String(row.query || row.q || '').trim();
}

function collectSamples({ manualRows = [], sourceRowsByFile = [] }) {
  const samples = [];
  let pseudoCount = 0;
  let manualCount = 0;
  const seenQueries = new Set();

  for (const row of manualRows) {
    const query = inferQuery(row);
    const routeLabel = inferManualLabel(row);
    if (!query || !routeLabel) continue;
    const key = query.toLowerCase();
    if (seenQueries.has(key)) continue;
    seenQueries.add(key);
    samples.push({
      query,
      label: routeLabel,
      pseudo_labeled: false,
      source: 'manual_labels',
    });
    manualCount += 1;
  }

  for (const { filePath, rows } of sourceRowsByFile) {
    for (const row of rows) {
      const query = inferQuery(row);
      if (!query) continue;
      const key = query.toLowerCase();
      if (seenQueries.has(key)) continue;
      seenQueries.add(key);

      const ruleDecision = evaluateS2RouteByRules(query);
      samples.push({
        query,
        label: ruleDecision.retrieval_route,
        pseudo_labeled: true,
        source: `pseudo_rules:${toRel(filePath)}`,
      });
      pseudoCount += 1;
    }
  }

  return {
    samples,
    manualCount,
    pseudoCount,
  };
}

function buildSyntheticBootstrapSamples(samples, minPositive = 40, minNegative = 40) {
  const result = [...samples];
  const positiveTemplates = [
    'Create a cross-topic study plan across chapters and explain prerequisite chain.',
    'Compare two chapters and map the dependency chain before revision.',
    'Build a global revision plan that connects topics with prerequisite ordering.',
    'Across chapters, connect topic A and topic B with a prerequisite path.',
    'Give a cross-topic learning roadmap with dependency chain reasoning.',
  ];
  const negativeTemplates = [
    'What is the definition of this syllabus node?',
    'Stay in the current node only and summarize this topic.',
    'What is the node title for the current syllabus node?',
    'Explain this current node concept in one sentence.',
    'Within current node only, what should students do?',
  ];

  const countByLabel = {
    s2_augmentation: result.filter((row) => row.label === 's2_augmentation').length,
    s1_default: result.filter((row) => row.label === 's1_default').length,
  };

  const used = new Set(result.map((row) => row.query.toLowerCase()));

  function pushTemplateSamples(targetLabel, templates, needed) {
    let cursor = 0;
    let added = 0;
    while (added < needed) {
      const template = templates[cursor % templates.length];
      const query = template;
      cursor += 1;
      result.push({
        query,
        label: targetLabel,
        pseudo_labeled: true,
        source: 'synthetic_bootstrap',
      });
      added += 1;
    }
  }

  if (countByLabel.s2_augmentation < minPositive) {
    pushTemplateSamples('s2_augmentation', positiveTemplates, minPositive - countByLabel.s2_augmentation);
  }
  if (countByLabel.s1_default < minNegative) {
    pushTemplateSamples('s1_default', negativeTemplates, minNegative - countByLabel.s1_default);
  }

  return result;
}

function trainNaiveBayesModel(samples) {
  const tokenCounts = {
    s2_augmentation: new Map(),
    s1_default: new Map(),
  };
  const tokenTotals = {
    s2_augmentation: 0,
    s1_default: 0,
  };
  const classCounts = {
    s2_augmentation: 0,
    s1_default: 0,
  };
  const vocabulary = new Set();

  for (const sample of samples) {
    const label = sample.label;
    if (!tokenCounts[label]) continue;
    classCounts[label] += 1;
    const tokens = tokenizeRouteQuery(sample.query);
    for (const token of tokens) {
      vocabulary.add(token);
      const current = tokenCounts[label].get(token) || 0;
      tokenCounts[label].set(token, current + 1);
      tokenTotals[label] += 1;
    }
  }

  const vocabSize = Math.max(vocabulary.size, 1);
  const priorLogOdds = Math.log((classCounts.s2_augmentation + 1) / (classCounts.s1_default + 1));
  const tokenLogOdds = {};
  for (const token of vocabulary) {
    const pos = (tokenCounts.s2_augmentation.get(token) || 0) + 1;
    const neg = (tokenCounts.s1_default.get(token) || 0) + 1;
    const posProb = pos / (tokenTotals.s2_augmentation + vocabSize);
    const negProb = neg / (tokenTotals.s1_default + vocabSize);
    tokenLogOdds[token] = Number(Math.log(posProb / negProb).toFixed(8));
  }

  return {
    model_version: 's2_local_nb_v1',
    algorithm: 'multinomial_naive_bayes_log_odds_v1',
    label_space: ['s1_default', 's2_augmentation'],
    thresholds: {
      s2_min_prob: 0.7,
      s1_max_prob: 0.35,
    },
    prior_log_odds: Number(priorLogOdds.toFixed(8)),
    token_log_odds: tokenLogOdds,
    training_summary: {
      total_samples: samples.length,
      class_counts: classCounts,
      token_totals: tokenTotals,
      vocabulary_size: vocabulary.size,
    },
  };
}

function evaluateModel(model, samples) {
  const confusion = {
    s2_true_s2_pred: 0,
    s2_true_s1_pred: 0,
    s1_true_s2_pred: 0,
    s1_true_s1_pred: 0,
    ambiguous_predictions: 0,
  };

  let correct = 0;
  let evaluable = 0;
  const routeCounts = {
    s2_augmentation: 0,
    s1_default: 0,
  };

  for (const sample of samples) {
    const predicted = classifyS2RouteByLocalModel(sample.query, { model });
    const route = predicted.retrieval_route;
    routeCounts[route] = (routeCounts[route] || 0) + 1;
    const ambiguous = predicted.route_reason === 'local_classifier_ambiguous_default_s1';
    if (ambiguous) {
      confusion.ambiguous_predictions += 1;
    }

    if (sample.label === 's2_augmentation' && route === 's2_augmentation') confusion.s2_true_s2_pred += 1;
    if (sample.label === 's2_augmentation' && route === 's1_default') confusion.s2_true_s1_pred += 1;
    if (sample.label === 's1_default' && route === 's2_augmentation') confusion.s1_true_s2_pred += 1;
    if (sample.label === 's1_default' && route === 's1_default') confusion.s1_true_s1_pred += 1;

    if (!ambiguous) {
      evaluable += 1;
      if (route === sample.label) correct += 1;
    }
  }

  const total = samples.length || 1;
  const overallCorrect = confusion.s2_true_s2_pred + confusion.s1_true_s1_pred;
  return {
    total_samples: samples.length,
    route_counts: routeCounts,
    confusion,
    metrics: {
      accuracy_all: Number((overallCorrect / total).toFixed(6)),
      non_ambiguous_coverage_rate: Number((evaluable / total).toFixed(6)),
      non_ambiguous_accuracy: evaluable > 0 ? Number((correct / evaluable).toFixed(6)) : null,
      ambiguous_rate: Number((confusion.ambiguous_predictions / total).toFixed(6)),
    },
  };
}

function topWeightedTokens(tokenLogOdds, direction) {
  const pairs = Object.entries(tokenLogOdds || {});
  pairs.sort((a, b) => direction === 'desc' ? b[1] - a[1] : a[1] - b[1]);
  return pairs.slice(0, 20).map(([token, weight]) => ({ token, weight }));
}

function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const outModelPath = argv.out_model
    ? path.resolve(ROOT, String(argv.out_model))
    : DEFAULT_OUT_MODEL;
  const outEvalPath = argv.out_eval
    ? path.resolve(ROOT, String(argv.out_eval))
    : DEFAULT_OUT_EVAL;
  const labelFile = argv.labels
    ? path.resolve(ROOT, String(argv.labels))
    : DEFAULT_LABEL_FILE;
  const sourceFiles = argv.sources
    ? String(argv.sources)
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => path.resolve(ROOT, token))
    : DEFAULT_SOURCE_FILES;

  const manualRowsRaw = readJsonIfExists(labelFile);
  const manualRows = Array.isArray(manualRowsRaw) ? manualRowsRaw : [];

  const sourceRowsByFile = [];
  for (const filePath of sourceFiles) {
    const parsed = readJsonIfExists(filePath);
    if (Array.isArray(parsed)) {
      sourceRowsByFile.push({ filePath, rows: parsed });
    }
  }

  const collected = collectSamples({
    manualRows,
    sourceRowsByFile,
  });
  const withBootstrap = buildSyntheticBootstrapSamples(collected.samples, 40, 40);

  const model = trainNaiveBayesModel(withBootstrap);
  const pseudoLabeledBootstrap = withBootstrap.some((row) => row.pseudo_labeled === true);

  const modelPayload = {
    generated_at: new Date().toISOString(),
    ...model,
    bootstrap: {
      pseudo_labeled_bootstrap: pseudoLabeledBootstrap,
      pseudo_sample_count: withBootstrap.filter((row) => row.pseudo_labeled).length,
      manual_sample_count: withBootstrap.filter((row) => !row.pseudo_labeled).length,
      sources: {
        labels_file: fs.existsSync(labelFile) ? toRel(labelFile) : null,
        seed_files: sourceRowsByFile.map((entry) => toRel(entry.filePath)),
      },
    },
  };

  const evaluation = evaluateModel(modelPayload, withBootstrap);
  const evalPayload = {
    generated_at: new Date().toISOString(),
    model_path: toRel(outModelPath),
    model_version: modelPayload.model_version,
    thresholds: modelPayload.thresholds,
    dataset_summary: {
      total_samples: withBootstrap.length,
      class_counts: modelPayload.training_summary.class_counts,
      pseudo_labeled_bootstrap: pseudoLabeledBootstrap,
      pseudo_sample_count: modelPayload.bootstrap.pseudo_sample_count,
      manual_sample_count: modelPayload.bootstrap.manual_sample_count,
      source_rows: sourceRowsByFile.reduce((acc, entry) => ({
        ...acc,
        [toRel(entry.filePath)]: entry.rows.length,
      }), {}),
    },
    evaluation,
    top_positive_tokens: topWeightedTokens(modelPayload.token_log_odds, 'desc'),
    top_negative_tokens: topWeightedTokens(modelPayload.token_log_odds, 'asc'),
  };

  fs.mkdirSync(path.dirname(outModelPath), { recursive: true });
  fs.mkdirSync(path.dirname(outEvalPath), { recursive: true });
  fs.writeFileSync(outModelPath, `${JSON.stringify(modelPayload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outEvalPath, `${JSON.stringify(evalPayload, null, 2)}\n`, 'utf8');

  process.stdout.write(`${outModelPath}\n${outEvalPath}\n`);
}

main();
