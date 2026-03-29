#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runControllerLoop } from './ao/lib/controller-loop.js';
import { findRepoRoot } from './ao/lib/repo-root.js';

function createDefaultIo() {
  return {
    writeStdout: (text) => process.stdout.write(text),
    writeStderr: (text) => process.stderr.write(text),
  };
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
    projectId: 'ciecopilot-home',
    controllerId: 'default',
    mode: null,
    issueNumber: null,
    json: false,
    help: false,
  };

  try {
    for (let index = 0; index < argv.length; index += 1) {
      const arg = argv[index];
      if (arg === '--project') {
        options.projectId = readOptionValue(argv, index, '--project');
        index += 1;
      } else if (arg === '--controller') {
        options.controllerId = readOptionValue(argv, index, '--controller');
        index += 1;
      } else if (arg === '--mode') {
        options.mode = readOptionValue(argv, index, '--mode');
        index += 1;
      } else if (arg === '--issue') {
        options.issueNumber = Number(readOptionValue(argv, index, '--issue'));
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
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (options.mode != null && !['observe', 'shadow', 'assist'].includes(options.mode)) {
    return {
      ok: false,
      error: 'Invalid value for --mode',
    };
  }

  if (options.issueNumber != null && (!Number.isInteger(options.issueNumber) || options.issueNumber <= 0)) {
    return {
      ok: false,
      error: 'Invalid value for --issue',
    };
  }

  return {
    ok: true,
    options,
  };
}

function renderHelp() {
  return [
    'Usage: node scripts/ao-controller.js [options]',
    '',
    'Options:',
    '  --project <project_id>      AO project id. Default: ciecopilot-home',
    '  --controller <id>           Controller id. Default: default',
    '  --mode <observe|shadow|assist> Override the durable controller mode',
    '  --issue <number>            Limit one loop to a specific issue-backed task',
    '  --json                      Print machine-readable JSON output',
    '  -h, --help                  Show help',
  ].join('\n');
}

function renderHumanSummary(result) {
  const taskSummaries = result.task_results.map((taskResult) => `${taskResult.task_id}:${taskResult.derived_trigger}:${taskResult.proposed_action_count}`);

  return [
    `controller_id: ${result.controller_id}`,
    `mode: ${result.mode}`,
    `processed_tasks: ${result.processed_task_count}`,
    `ingested_observations: ${result.ingested_observation_count}`,
    `proposed_actions: ${result.proposed_action_count}`,
    `executed_actions: ${result.executed_action_count ?? 0}`,
    `blocked_actions: ${result.blocked_action_count ?? 0}`,
    `task_results: ${taskSummaries.length ? taskSummaries.join(', ') : 'none'}`,
  ].join('\n');
}

export async function runCli(argv, io = createDefaultIo()) {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    io.writeStderr(`${parsed.error}\n`);
    return {
      exitCode: 4,
      result: null,
    };
  }

  const { options } = parsed;
  if (options.help) {
    io.writeStdout(`${renderHelp()}\n`);
    return {
      exitCode: 0,
      result: null,
    };
  }

  const repoRoot = findRepoRoot(process.cwd());
  if (!repoRoot) {
    io.writeStderr(`Could not locate repo root from ${process.cwd()}\n`);
    return {
      exitCode: 3,
      result: null,
    };
  }

  try {
    const result = await runControllerLoop({
      repoRoot,
      cwd: process.cwd(),
      projectId: options.projectId,
      controllerId: options.controllerId,
      mode: options.mode,
      issueNumber: options.issueNumber,
    });

    if (options.json) {
      io.writeStdout(JSON.stringify(result, null, 2));
    } else {
      io.writeStdout(`${renderHumanSummary(result)}\n`);
    }

    return {
      exitCode: 0,
      result,
    };
  } catch (error) {
    io.writeStderr(`${error.message}\n`);
    return {
      exitCode: 3,
      result: null,
    };
  }
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedFile && executedFile === currentFile) {
  const { exitCode } = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
