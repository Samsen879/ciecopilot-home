import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import { runQuestionAnalysisBackfill } from './lib/question-analysis-backfill.js';

function printUsage() {
  console.log(
    'Usage: node scripts/learning/run_question_analysis_backfill.js [--force] [--evidence-bundles <path>]',
  );
}

async function loadCandidateQuestions(client) {
  const { data, error } = await client
    .from('question_bank')
    .select(
      'question_id, source_kind, subject_code, prompt_representation, paper_scope, provenance_summary, classification_snapshot_ref',
    )
    .eq('source_kind', 'imported_question');

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

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) {
    printUsage();
    return;
  }

  const force = argv.includes('--force');
  const evidenceBundlesIndex = argv.findIndex((token) => token === '--evidence-bundles');
  const evidenceBundlePath = evidenceBundlesIndex >= 0
    ? argv[evidenceBundlesIndex + 1] ?? null
    : null;
  if (
    evidenceBundlesIndex >= 0
    && (!evidenceBundlePath || evidenceBundlePath.startsWith('--'))
  ) {
    throw new Error('--evidence-bundles requires a file path.');
  }
  const client = getServiceClient();
  let questions = await loadCandidateQuestions(client);
  if (evidenceBundlePath) {
    questions = attachEvidenceBundlesToQuestions(
      questions,
      normalizeEvidenceBundlePayload(readJson(evidenceBundlePath)),
    );
  }
  const summary = await runQuestionAnalysisBackfill(client, {
    questions,
    force,
  });

  console.log(JSON.stringify(summary, null, 2));
}

export function isQuestionAnalysisBackfillEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isQuestionAnalysisBackfillEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
