#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_EVENT_PIPELINE_GATE_RECEIPT_PATH,
  DEFAULT_EVENT_PIPELINE_GATE_REPORT_PATH,
  DEFAULT_EVENT_PIPELINE_MIGRATION_PATH,
  writeEventPipelineGateOutputs,
} from './lib/event-pipeline-gate.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);

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

function toRelative(filePath) {
  return filePath.replace(/\\/g, '/');
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const migrationPath = cli.migration || DEFAULT_EVENT_PIPELINE_MIGRATION_PATH;
  const outJsonPath = cli['out-json'] || DEFAULT_EVENT_PIPELINE_GATE_RECEIPT_PATH;
  const outMdPath = cli['out-md'] || DEFAULT_EVENT_PIPELINE_GATE_REPORT_PATH;
  const { receipt } = writeEventPipelineGateOutputs({
    rootDir: ROOT,
    migrationPath,
    outJsonPath,
    outMdPath,
  });

  process.stdout.write(`${toRelative(outJsonPath)}\n`);
  process.stdout.write(`${toRelative(outMdPath)}\n`);
  if (receipt.status !== 'pass') {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
