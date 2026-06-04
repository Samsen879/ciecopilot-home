#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildQuestionPlainTextV2Consumption,
  readQuestionPlainTextV2Layer,
  writeQuestionPlainTextV2ConsumptionArtifacts,
} from './lib/question-plain-text-v2-consumption.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-04',
  inputJson: 'docs/reports/2026-06-04-9709-question-plain-text-v2.json',
  jsonOut: 'docs/reports/2026-06-04-9709-question-plain-text-v2-consumption.json',
  markdownOut: 'docs/reports/2026-06-04-9709-question-plain-text-v2-consumption-gate.md',
});

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printUsage() {
  console.log([
    'Usage: node scripts/learning/run_9709_question_plain_text_v2_consumption_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--input-json <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
  ].join('\n'));
}

export function parseQuestionPlainTextV2ConsumptionArgs(argv = process.argv.slice(2)) {
  const options = {
    ...DEFAULTS,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--generated-on') {
      options.generatedOn = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--input-json') {
      options.inputJson = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--json-out') {
      options.jsonOut = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--markdown-out') {
      options.markdownOut = requiredValue(argv, index, token);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function resolveFromRoot(repoPath) {
  return path.isAbsolute(repoPath) ? repoPath : path.resolve(ROOT, repoPath);
}

export function runQuestionPlainTextV2ConsumptionGate({
  generatedOn = DEFAULTS.generatedOn,
  inputJson = DEFAULTS.inputJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  const sourceLayer = readQuestionPlainTextV2Layer(resolveFromRoot(inputJson));
  const result = buildQuestionPlainTextV2Consumption(sourceLayer, {
    generatedOn,
    sourceArtifactPath: inputJson,
    workflowGaps: [
      '`npm run workflow:codex-preflight -- --json` is missing from package.json in this repo snapshot; recorded as workflow gap, not a content blocker.',
    ],
  });
  writeQuestionPlainTextV2ConsumptionArtifacts(result, {
    jsonOut: resolveFromRoot(jsonOut),
    markdownOut: resolveFromRoot(markdownOut),
  });
  return result;
}

export function isQuestionPlainTextV2ConsumptionEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }
  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

export function main(argv = process.argv.slice(2)) {
  const options = parseQuestionPlainTextV2ConsumptionArgs(argv);
  if (options.help) {
    printUsage();
    return null;
  }

  const result = runQuestionPlainTextV2ConsumptionGate(options);
  console.log(JSON.stringify({
    status: result.status,
    summary: result.summary,
    blockers: result.blockers,
  }, null, 2));

  if (result.status !== 'pass') {
    throw new Error('question_plain_text_v2 consumption gate failed.');
  }
  return result;
}

if (isQuestionPlainTextV2ConsumptionEntrypoint(process.argv[1], import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
