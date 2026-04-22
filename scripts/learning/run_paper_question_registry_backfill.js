import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runPaperQuestionRegistryBackfill } from './lib/paper-question-registry-backfill.js';

const DEFAULT_CURRICULUM_SEED_PATH = 'data/curriculum/9709_question_search_recovery_nodes_v1.json';

function printUsage() {
  console.log(
    `Usage: node ${path.join('scripts', 'learning', 'run_paper_question_registry_backfill.js')} --manifest <path> [--curriculum-seed <path>] [--host-repo-root <path>] [--dry-run]`,
  );
}

function resolveOptionValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a file path.`);
  }
  return value;
}

function normalizeOptionalPath(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

export function parsePaperQuestionRegistryBackfillArgs(argv = []) {
  const options = {
    manifestPath: null,
    curriculumSeedPath: DEFAULT_CURRICULUM_SEED_PATH,
    hostRepoRootPath: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--manifest') {
      options.manifestPath = resolveOptionValue(argv, index, '--manifest');
      index += 1;
      continue;
    }

    if (token === '--curriculum-seed') {
      options.curriculumSeedPath = resolveOptionValue(argv, index, '--curriculum-seed');
      index += 1;
      continue;
    }

    if (token === '--host-repo-root') {
      options.hostRepoRootPath = normalizeOptionalPath(
        resolveOptionValue(argv, index, '--host-repo-root'),
      );
      index += 1;
      continue;
    }

    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (token === '--help') {
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  if (!options.manifestPath) {
    throw new Error('--manifest is required.');
  }

  return options;
}

function readJson(filePath) {
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
}

export async function loadServiceClient(hostRepoRootPath = null) {
  const moduleUrl = hostRepoRootPath
    ? pathToFileURL(path.join(hostRepoRootPath, 'api', 'lib', 'supabase', 'client.js')).href
    : new URL('../../api/lib/supabase/client.js', import.meta.url).href;
  const { getServiceClient } = await import(moduleUrl);
  return getServiceClient();
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) {
    printUsage();
    return;
  }

  const options = parsePaperQuestionRegistryBackfillArgs(argv);
  const client = await loadServiceClient(options.hostRepoRootPath);
  const summary = await runPaperQuestionRegistryBackfill(client, {
    manifest: readJson(options.manifestPath),
    curriculumSeed: readJson(options.curriculumSeedPath),
    dryRun: options.dryRun,
  });

  console.log(JSON.stringify(summary, null, 2));

  if (summary.conflicts > 0) {
    throw new Error('Backfill detected imported_question conflicts for manifest-backed paper rows.');
  }
}

export function isPaperQuestionRegistryBackfillEntrypoint(
  entryScriptPath,
  metaUrl = import.meta.url,
) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isPaperQuestionRegistryBackfillEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
