#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH,
  seedBrowserClosedLoopFixture,
} from './lib/browser-closed-loop-fixture.js';

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

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const outPath = cli.out || DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH;
  const { relativePath } = seedBrowserClosedLoopFixture({
    rootDir: ROOT,
    outPath,
  });

  process.stdout.write(`${relativePath}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
