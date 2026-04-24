#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  render9709ReleasePreflightMarkdown,
  validate9709ReleasePreflight,
} from './lib/9709-release-preflight.js';

const DEFAULT_PATHS = Object.freeze({
  manifest: 'data/manifests/9709_authority_ready_batch_300_v1.json',
  authoritySidecar: 'data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json',
  curriculumSeed: 'data/curriculum/9709_authority_ready_batch_300_nodes_v2.json',
  evidenceBundles: null,
  readyManifest: null,
  expectedCount: 300,
  jsonOut: null,
  markdownOut: null,
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine(
    'Usage: node scripts/learning/run_9709_release_preflight.js [--manifest <path>] [--authority-sidecar <path>] [--curriculum-seed <path>] [--evidence-bundles <path>] [--ready-manifest <path>] [--expected-count <n>] [--json-out <path>] [--markdown-out <path>]',
  );
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    ...DEFAULT_PATHS,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--manifest') {
      options.manifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--authority-sidecar') {
      options.authoritySidecar = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--curriculum-seed') {
      options.curriculumSeed = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--evidence-bundles') {
      options.evidenceBundles = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--ready-manifest') {
      options.readyManifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--expected-count') {
      const value = Number(requiredValue(argv, index, token));
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('--expected-count must be a non-negative integer.');
      }
      options.expectedCount = value;
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function writeJson(filePath, payload) {
  ensureParentDir(filePath);
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(filePath, text) {
  ensureParentDir(filePath);
  fs.writeFileSync(path.resolve(filePath), text, 'utf8');
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return 0;
  }

  const result = validate9709ReleasePreflight({
    manifest: readJson(options.manifest),
    authoritySidecar: readJson(options.authoritySidecar),
    curriculumSeed: readJson(options.curriculumSeed),
    evidenceBundles: options.evidenceBundles ? readJson(options.evidenceBundles) : null,
    readyManifest: options.readyManifest ? readJson(options.readyManifest) : null,
    expectedManifestCount: options.expectedCount,
  });

  if (options.jsonOut) {
    writeJson(options.jsonOut, result);
  } else {
    writeStdoutLine(JSON.stringify(result, null, 2));
  }

  if (options.markdownOut) {
    writeText(options.markdownOut, render9709ReleasePreflightMarkdown(result));
  }

  writeStdoutLine(`9709_release_preflight_status=${result.status}`);
  writeStdoutLine(`9709_release_preflight_blockers=${result.blockers.length}`);
  writeStdoutLine(`9709_release_preflight_warnings=${result.warnings.length}`);

  return result.status === 'fail' ? 1 : 0;
}

export function isEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }
  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isEntrypoint(process.argv[1], import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch (error) {
    writeStderrLine(error.message);
    process.exitCode = 1;
  }
}
