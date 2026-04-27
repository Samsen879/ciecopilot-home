#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_9709_SYLLABUS_GATE_PATHS,
  DEFAULT_9709_SYLLABUS_GATE_REPORT_PATH,
  write9709SyllabusGateReport,
} from './lib/9709-syllabus-gate.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

function parseCliArgs(args) {
  const output = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('-')) {
      continue;
    }

    const equalIndex = token.indexOf('=');
    if (equalIndex !== -1) {
      output[token.slice(token.startsWith('--') ? 2 : 1, equalIndex)] = token.slice(equalIndex + 1);
      continue;
    }

    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[index + 1];
    if (next && !next.startsWith('-')) {
      output[key] = next;
      index += 1;
    } else {
      output[key] = true;
    }
  }

  return output;
}

function pathsFromCli(cli) {
  return {
    sourceInventory: cli['source-inventory'] || DEFAULT_9709_SYLLABUS_GATE_PATHS.sourceInventory,
    rawSections: cli['raw-sections'] || DEFAULT_9709_SYLLABUS_GATE_PATHS.rawSections,
    canonicalTopicTree:
      cli['canonical-topic-tree'] || DEFAULT_9709_SYLLABUS_GATE_PATHS.canonicalTopicTree,
    boundaryAnnotations:
      cli['boundary-annotations'] || DEFAULT_9709_SYLLABUS_GATE_PATHS.boundaryAnnotations,
    topicTreeSchema: cli['topic-tree-schema'] || DEFAULT_9709_SYLLABUS_GATE_PATHS.topicTreeSchema,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const outJsonPath = cli['out-json'] || DEFAULT_9709_SYLLABUS_GATE_REPORT_PATH;
  const { report } = write9709SyllabusGateReport({
    rootDir: ROOT,
    paths: pathsFromCli(cli),
    outJsonPath,
    approvedBaselineAttempted: Boolean(cli['attempt-approved-baseline']),
  });

  process.stdout.write(`${outJsonPath}\n`);
  if (report.status !== 'pass') {
    process.exitCode = 1;
  } else if (process.exitCode === 1) {
    process.exitCode = undefined;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
