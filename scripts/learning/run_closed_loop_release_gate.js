#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH,
} from './lib/browser-closed-loop-fixture.js';
import {
  DEFAULT_CLOSED_LOOP_RELEASE_GATE_RECEIPT_PATH,
  DEFAULT_CLOSED_LOOP_RELEASE_GATE_REPORT_PATH,
  writeClosedLoopReleaseGateOutputs,
} from './lib/closed-loop-release-gate.js';

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

export async function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const fixturePath = cli.fixture || DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH;
  const outJsonPath = cli['out-json'] || DEFAULT_CLOSED_LOOP_RELEASE_GATE_RECEIPT_PATH;
  const outMdPath = cli['out-md'] || DEFAULT_CLOSED_LOOP_RELEASE_GATE_REPORT_PATH;
  const { receipt } = await writeClosedLoopReleaseGateOutputs({
    rootDir: ROOT,
    fixturePath,
    outJsonPath,
    outMdPath,
  });

  process.stdout.write(`${outJsonPath}\n`);
  process.stdout.write(`${outMdPath}\n`);
  if (receipt.status !== 'pass') {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
