#!/usr/bin/env node

import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderPolicyGovernanceHumanSummary } from './ao/lib/policy-engine.js';
import { createStateRepository } from './ao/lib/state-repository.js';
import {
  DEFAULT_PROJECT_ID,
  loadAoStateReport,
} from './ao/lib/state-runner.js';

function createDefaultIo() {
  return {
    writeStdout: (text) => process.stdout.write(text),
    writeStderr: (text) => process.stderr.write(text),
  };
}

function findRepoRoot(startCwd) {
  let currentPath = path.resolve(startCwd);

  while (true) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) return null;
    currentPath = parentPath;
  }
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1] ?? null;
  if (value == null || value.startsWith('-')) {
    throw new Error(`Missing value for ${optionName}`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    projectId: DEFAULT_PROJECT_ID,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--project') {
      try {
        options.projectId = readOptionValue(argv, index, '--project');
      } catch (error) {
        return {
          ok: false,
          error: error.message,
        };
      }
      index += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      return {
        ok: false,
        error: `Unknown argument: ${arg}`,
      };
    }
  }

  return {
    ok: true,
    options,
  };
}

function renderHelp() {
  return [
    'Usage: node scripts/ao-policy.js [options]',
    '',
    'Options:',
    '  --project <project_id>   AO project id. Default: ciecopilot-home',
    '  --json                   Print machine-readable JSON output',
    '  -h, --help               Show help',
  ].join('\n');
}

function exitCodeForGovernanceStatus(status) {
  if (status === 'current') return 0;
  if (status === 'attention') return 2;
  if (status === 'stale') return 10;
  if (status === 'mixed_version') return 11;
  return 12;
}

export async function runCli(argv, io = createDefaultIo()) {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    io.writeStderr(`${parsed.error}\n`);
    return {
      exitCode: 4,
      report: null,
    };
  }

  const { options } = parsed;
  if (options.help) {
    io.writeStdout(`${renderHelp()}\n`);
    return {
      exitCode: 0,
      report: null,
    };
  }

  try {
    const repoRoot = findRepoRoot(process.cwd());
    if (!repoRoot) {
      throw new Error(`Could not locate repo root from ${process.cwd()}`);
    }

    createStateRepository({
      repoRoot,
      projectId: options.projectId,
    }).ensureRepoKnowledge();

    const report = await loadAoStateReport({
      repoRoot,
      projectId: options.projectId,
    });

    if (options.json) {
      io.writeStdout(JSON.stringify(report.governance, null, 2));
    } else {
      io.writeStdout(`${renderPolicyGovernanceHumanSummary(report.governance)}\n`);
    }

    return {
      exitCode: exitCodeForGovernanceStatus(report.governance.status),
      report: report.governance,
    };
  } catch (error) {
    io.writeStderr(`${error.message}\n`);
    return {
      exitCode: 3,
      report: null,
    };
  }
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedFile && executedFile === currentFile) {
  const { exitCode } = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
