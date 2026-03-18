#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeEvidenceDraftReviewScaffoldOutputs } from './lib/evidence-draft-review.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);

function parseCliArgs(args) {
  const out = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    const key = token.slice(token.startsWith('--') ? 2 : 1, eq !== -1 ? eq : undefined);
    const value =
      eq !== -1
        ? token.slice(eq + 1)
        : args[index + 1] && !args[index + 1].startsWith('-')
          ? args[++index]
          : true;
    out[key] = value;
  }
  return out;
}

function resolveCliPath(inputPath) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const bundleDir = resolveCliPath(cli['bundle-dir']);
  const manifestPath = resolveCliPath(cli.manifest);
  const itemsPath = resolveCliPath(cli['items-json']);
  const reviewPath = resolveCliPath(cli['review-md']);
  const outJson = resolveCliPath(cli['out-json']);
  const outMd = resolveCliPath(cli['out-md']);
  const reviewer = typeof cli.reviewer === 'string' ? cli.reviewer : '';
  const reviewId = typeof cli['review-id'] === 'string' ? cli['review-id'] : null;

  if (!bundleDir && !(manifestPath || itemsPath || reviewPath)) {
    throw new Error('bundle dir or explicit manifest/items paths are required');
  }
  if (!outJson) {
    throw new Error('out json path is required');
  }

  const result = writeEvidenceDraftReviewScaffoldOutputs({
    bundleDir,
    manifestPath,
    itemsPath,
    reviewPath,
    outJson,
    outMd,
    reviewer,
    reviewId,
  });

  process.stdout.write(`${toRel(result.outJson)}\n`);
  if (result.outMd) {
    process.stdout.write(`${toRel(result.outMd)}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
