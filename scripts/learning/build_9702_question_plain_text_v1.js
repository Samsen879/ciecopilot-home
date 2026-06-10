#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  build9231QuestionPlainTextV1Layer,
  write9231QuestionPlainTextV1Artifacts,
} from './build_9231_question_plain_text_v1.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  subject: '9702',
  generatedOn: '2026-06-10',
  sourceVersion: '9702_phase5_visual_accepted_surface_v1',
  selectionManifest: 'data/manifests/9702_visual_review_2026_06_09_manifest_v1.json',
  surfaceManifestPaths: [],
  visualGateJson: 'docs/reports/2026-06-09-9702-visual-review-gate.json',
  jsonOut: 'docs/reports/2026-06-10-9702-question-plain-text-v1.json',
  markdownOut: 'docs/reports/2026-06-10-9702-question-plain-text-v1-coverage.md',
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printUsage() {
  writeStdoutLine([
    'Usage: node scripts/learning/build_9702_question_plain_text_v1.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--source-version <id>]',
    '  [--selection-manifest <path>]',
    '  [--surface-manifest <path>] (repeatable; overrides --selection-manifest)',
    '  [--visual-gate-json <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
  ].join('\n'));
}

export function parse9702QuestionPlainTextV1Args(argv = process.argv.slice(2)) {
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
    if (token === '--source-version') {
      options.sourceVersion = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--selection-manifest') {
      options.selectionManifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--surface-manifest') {
      options.surfaceManifestPaths = [
        ...(options.surfaceManifestPaths || []),
        requiredValue(argv, index, token),
      ];
      index += 1;
      continue;
    }
    if (token === '--visual-gate-json') {
      options.visualGateJson = requiredValue(argv, index, token);
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

export async function build9702QuestionPlainTextV1Layer(options = {}) {
  return build9231QuestionPlainTextV1Layer({
    ...DEFAULTS,
    ...options,
    subject: '9702',
  });
}

export function write9702QuestionPlainTextV1Artifacts({
  rootDir = ROOT,
  layer,
  jsonOut = DEFAULTS.jsonOut,
  markdownOut = DEFAULTS.markdownOut,
} = {}) {
  write9231QuestionPlainTextV1Artifacts({
    rootDir,
    layer,
    jsonOut,
    markdownOut,
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parse9702QuestionPlainTextV1Args(argv);
  if (options.help) {
    printUsage();
    return 0;
  }
  const layer = await build9702QuestionPlainTextV1Layer(options);
  write9702QuestionPlainTextV1Artifacts({ layer, ...options });
  writeStdoutLine(JSON.stringify({
    status: layer.status,
    verdict: layer.verdict,
    summary: layer.summary,
    json_out: options.jsonOut,
    markdown_out: options.markdownOut,
  }, null, 2));
  return layer.status === 'pass' ? 0 : 1;
}

if (process.argv[1] === __filename) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    writeStderrLine(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
