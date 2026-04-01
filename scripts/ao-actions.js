#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROJECT_ID,
  loadAoActionReport,
} from './ao/lib/state-runner.js';

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
    projectId: DEFAULT_PROJECT_ID,
    limit: 5,
    taskId: null,
    prNumber: null,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--project') {
      try {
        options.projectId = readOptionValue(argv, index, '--project');
      } catch (error) {
        return { ok: false, error: error.message };
      }
      index += 1;
    } else if (arg === '--limit') {
      options.limit = Number(argv[index + 1] ?? null);
      index += 1;
    } else if (arg === '--task') {
      try {
        options.taskId = readOptionValue(argv, index, '--task');
      } catch (error) {
        return { ok: false, error: error.message };
      }
      index += 1;
    } else if (arg === '--pr') {
      options.prNumber = Number(argv[index + 1] ?? null);
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

  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    return { ok: false, error: 'Invalid value for --limit' };
  }
  if (options.prNumber != null && (!Number.isInteger(options.prNumber) || options.prNumber <= 0)) {
    return { ok: false, error: 'Invalid value for --pr' };
  }

  return { ok: true, options };
}

function renderHumanSummary(report) {
  const recentActions = (report.recent_actions ?? [])
    .map((action) => (
      `${action.action_kind}:${action.status}:${action.governance?.last_decision ?? 'accepted'}:${action.lineage?.pr_head_sha ?? 'no-head'}`
    ))
    .join(', ') || 'none';

  return [
    `project_id: ${report.project_id}`,
    `actions: ${report.summary.action_count}`,
    `status: ${Object.entries(report.summary.status_counts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    `visibility: ${Object.entries(report.summary.visibility_counts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    `policy: ${Object.entries(report.summary.policy_decision_counts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    `replay_governance: ${Object.entries(report.summary.replay_decision_counts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    `backpressure: ${Object.entries(report.summary.backpressure_status_counts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    `recent_actions: ${recentActions}`,
  ].join('\n');
}

function renderHelp() {
  return [
    'Usage: node scripts/ao-actions.js [options]',
    '',
    'Options:',
    '  --project <project_id>   AO project id. Default: ciecopilot-home',
    '  --limit <number>         Number of recent actions to include. Default: 5',
    '  --task <task_id>         Filter to one managed task',
    '  --pr <number>            Filter actions to one PR number',
    '  --json                   Print machine-readable JSON output',
    '  -h, --help               Show help',
  ].join('\n');
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
    const report = await loadAoActionReport({
      cwd: process.cwd(),
      projectId: options.projectId,
      limit: options.limit,
      taskId: options.taskId,
      prNumber: options.prNumber,
    });

    if (options.json) {
      io.writeStdout(JSON.stringify(report, null, 2));
    } else {
      io.writeStdout(`${renderHumanSummary(report)}\n`);
    }

    return {
      exitCode: 0,
      report,
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
