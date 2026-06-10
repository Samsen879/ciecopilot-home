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
  generatedOn: '2026-06-10',
  inputJson: 'docs/reports/2026-06-10-9702-question-plain-text-v2.json',
  jsonOut: 'docs/reports/2026-06-10-9702-question-plain-text-v2-consumption.json',
  markdownOut: 'docs/reports/2026-06-10-9702-question-plain-text-v2-consumption-gate.md',
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
    'Usage: node scripts/learning/run_9702_question_plain_text_v2_consumption_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--input-json <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
  ].join('\n'));
}

export function parse9702QuestionPlainTextV2ConsumptionArgs(argv = process.argv.slice(2)) {
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

export function run9702QuestionPlainTextV2ConsumptionGate({
  generatedOn = DEFAULTS.generatedOn,
  inputJson = DEFAULTS.inputJson,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  const sourceLayer = readQuestionPlainTextV2Layer(resolveFromRoot(inputJson));
  const result = buildQuestionPlainTextV2Consumption(sourceLayer, {
    generatedOn,
    sourceArtifactPath: inputJson,
  });
  writeQuestionPlainTextV2ConsumptionArtifacts(result, {
    jsonOut: resolveFromRoot(jsonOut),
    markdownOut: resolveFromRoot(markdownOut),
  });
  return result;
}

export function main(argv = process.argv.slice(2)) {
  const options = parse9702QuestionPlainTextV2ConsumptionArgs(argv);
  if (options.help) {
    printUsage();
    return null;
  }

  const result = run9702QuestionPlainTextV2ConsumptionGate(options);
  console.log(JSON.stringify({
    status: result.status,
    summary: result.summary,
    blockers: result.blockers,
  }, null, 2));

  if (result.status !== 'pass') {
    throw new Error('9702 question_plain_text_v2 consumption gate failed.');
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
