import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import { runQuestionAnalysisBackfill } from './lib/question-analysis-backfill.js';

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine(
    'Usage: node scripts/learning/run_question_analysis_backfill.js [--force] [--source-kind <kind>] [--manifest <path>] [--evidence-bundles <path>]',
  );
}

function normalizeSourceKind(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return 'imported_question';
  }

  if (!['imported_question', 'paper_question'].includes(normalized)) {
    throw new Error(`Unsupported --source-kind: ${value}`);
  }

  return normalized;
}

async function loadCandidateQuestions(client, { sourceKind = 'imported_question' } = {}) {
  const { data, error } = await client
    .from('question_bank')
    .select(
      'question_id, source_kind, subject_code, storage_key, q_number, primary_topic_id, prompt_representation, paper_scope, provenance_summary, classification_snapshot_ref',
    )
    .eq('source_kind', sourceKind);

  if (error) {
    throw new Error(`Failed to load question bank rows for backfill: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeEvidenceBundlePayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.bundles)) {
    return payload.bundles;
  }

  throw new Error('Evidence bundle file must contain an array or a { bundles } payload.');
}

function buildQuestionEvidenceKey(question = {}) {
  const storageKey = question?.provenance_summary?.storage_key ?? question?.storage_key ?? null;
  return {
    questionId: question?.question_id ?? null,
    storageKey: typeof storageKey === 'string' ? storageKey.trim() : null,
  };
}

export function attachEvidenceBundlesToQuestions(questions = [], bundles = []) {
  const bundlesByQuestionId = new Map();
  const bundlesByStorageKey = new Map();

  for (const bundle of bundles) {
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
      continue;
    }

    if (typeof bundle.question_id === 'string' && bundle.question_id.trim()) {
      bundlesByQuestionId.set(bundle.question_id.trim(), bundle);
    }

    const storageKey = typeof bundle.storage_key === 'string'
      ? bundle.storage_key.trim()
      : '';
    if (storageKey) {
      bundlesByStorageKey.set(storageKey, bundle);
    }
  }

  return questions.map((question) => {
    const { questionId, storageKey } = buildQuestionEvidenceKey(question);
    const questionEvidenceBundle = bundlesByQuestionId.get(questionId)
      ?? bundlesByStorageKey.get(storageKey)
      ?? null;

    return questionEvidenceBundle
      ? {
        ...question,
        questionEvidenceBundle,
      }
      : question;
  });
}

function buildManifestQuestionKey(item = {}) {
  const storageKey = typeof item?.storage_key === 'string' ? item.storage_key.trim() : '';
  const qNumber = Number.isInteger(item?.q_number) ? item.q_number : null;

  return storageKey ? `${storageKey}#${qNumber ?? ''}` : '';
}

export function attachManifestMetadataToQuestions(questions = [], manifest = null) {
  const items = Array.isArray(manifest?.items) ? manifest.items : [];
  if (items.length === 0) {
    return questions;
  }

  const manifestItemsByKey = new Map(
    items
      .map((item) => [buildManifestQuestionKey(item), item])
      .filter(([key]) => Boolean(key)),
  );

  return questions.flatMap((question) => {
    const manifestItem = manifestItemsByKey.get(buildManifestQuestionKey(question));
    if (!manifestItem) {
      return [];
    }

    return [{
      ...question,
      manifestItem,
      analysisHints: {
        ...(question?.analysisHints ?? question?.analysis_hints ?? {}),
        ...(manifestItem.analysis_hints ?? manifestItem.analysisHints ?? {}),
        topic_path_hint:
          (manifestItem.analysis_hints ?? manifestItem.analysisHints ?? {}).topic_path_hint
          ?? manifestItem.primary_topic_path
          ?? null,
      },
    }];
  });
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    force: false,
    sourceKind: 'imported_question',
    manifestPath: null,
    evidenceBundlePath: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }

    if (token === '--force') {
      options.force = true;
      continue;
    }

    if (token === '--source-kind') {
      options.sourceKind = normalizeSourceKind(argv[index + 1] ?? null);
      index += 1;
      continue;
    }

    if (token === '--manifest') {
      options.manifestPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token === '--evidence-bundles') {
      options.evidenceBundlePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (options.evidenceBundlePath && options.evidenceBundlePath.startsWith('--')) {
    throw new Error('--evidence-bundles requires a file path.');
  }
  if (argv.includes('--evidence-bundles') && !options.evidenceBundlePath) {
    throw new Error('--evidence-bundles requires a file path.');
  }
  if (options.manifestPath && options.manifestPath.startsWith('--')) {
    throw new Error('--manifest requires a file path.');
  }
  if (argv.includes('--manifest') && !options.manifestPath) {
    throw new Error('--manifest requires a file path.');
  }

  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return;
  }

  const client = getServiceClient();
  let questions = await loadCandidateQuestions(client, {
    sourceKind: options.sourceKind,
  });
  if (options.manifestPath) {
    questions = attachManifestMetadataToQuestions(
      questions,
      readJson(options.manifestPath),
    );
  }
  if (options.evidenceBundlePath) {
    questions = attachEvidenceBundlesToQuestions(
      questions,
      normalizeEvidenceBundlePayload(readJson(options.evidenceBundlePath)),
    );
  }
  const summary = await runQuestionAnalysisBackfill(client, {
    questions,
    force: options.force,
  });

  writeStdoutLine(JSON.stringify(summary, null, 2));
}

export function isQuestionAnalysisBackfillEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isQuestionAnalysisBackfillEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((error) => {
    writeStderrLine(error.message);
    process.exitCode = 1;
  });
}
