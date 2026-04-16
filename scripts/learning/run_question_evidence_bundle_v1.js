import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildQuestionEvidenceBundlesV1,
  summarizeQuestionEvidenceBundlesV1,
} from './lib/question-evidence-bundle-v1.js';

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine(
    'Usage: node scripts/learning/run_question_evidence_bundle_v1.js --manifest <path> [--lane-results <path>] [--output <path>] [--dry-run]',
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeLaneOutputPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.outputs)) {
    return payload.outputs;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  throw new Error('Lane results file must contain an array of outputs or a { results } payload.');
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    manifest: null,
    laneResults: [],
    output: null,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }

    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (token === '--manifest') {
      options.manifest = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token === '--lane-results') {
      options.laneResults.push(argv[index + 1] ?? null);
      index += 1;
      continue;
    }

    if (token === '--output') {
      options.output = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function loadLaneOutputs(paths = []) {
  return paths.flatMap((filePath) => normalizeLaneOutputPayload(readJson(filePath)));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help || !options.manifest) {
    printUsage();
    return;
  }

  const manifest = readJson(options.manifest);
  const laneOutputs = loadLaneOutputs(options.laneResults.filter(Boolean));
  const bundles = buildQuestionEvidenceBundlesV1({
    manifest,
    laneOutputs,
  });
  const summary = summarizeQuestionEvidenceBundlesV1(bundles);

  writeStdoutLine(`manifest_id: ${manifest.manifest_id ?? 'unknown'}`);
  writeStdoutLine(`bundles_planned: ${summary.bundles_planned}`);
  for (const [route, count] of Object.entries(summary.route_counts).sort(([left], [right]) => left.localeCompare(right))) {
    writeStdoutLine(`${route}: ${count}`);
  }
  writeStdoutLine(`lazy_attach_original_image: ${summary.lazy_attach_original_image}`);

  if (options.dryRun) {
    return;
  }

  const payload = {
    manifest_id: manifest.manifest_id ?? null,
    bundles,
    summary,
  };

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(payload, null, 2));
    writeStdoutLine(`wrote_evidence_bundles: ${options.output}`);
    return;
  }

  writeStdoutLine(JSON.stringify(payload, null, 2));
}

export function isQuestionEvidenceBundleEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isQuestionEvidenceBundleEntrypoint(process.argv[1], import.meta.url)) {
  try {
    await main();
  } catch (error) {
    writeStderrLine(error.message);
    process.exitCode = 1;
  }
}
