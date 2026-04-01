#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROJECT_ID,
  loadAoEventReport,
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
  const recentEvents = (report.recent_events ?? [])
    .map((event) => (
      `${event.event_family}:${event.pr_number ?? 'none'}:${event.governance?.last_decision ?? 'accepted'}:${event.dedupe_key}`
    ))
    .join(', ') || 'none';
  const cursors = (report.controller_cursors ?? [])
    .map((cursor) => (
      `${cursor.source_kind}:${cursor.task_id}:${cursor.governance?.last_decision ?? 'accepted'}`
    ))
    .join(', ') || 'none';

  return [
    `project_id: ${report.project_id}`,
    `delivery_events: ${report.summary.delivery_event_count}`,
    `controller_cursors: ${report.summary.controller_cursor_count}`,
    `families: ${Object.entries(report.summary.family_counts ?? {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    `event_replays: delivery(${Object.entries(report.summary.replay_decision_counts?.delivery_events ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}), cursors(${Object.entries(report.summary.replay_decision_counts?.controller_cursors ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'})`,
    `backpressure: delivery(${Object.entries(report.summary.backpressure_status_counts?.delivery_events ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}), cursors(${Object.entries(report.summary.backpressure_status_counts?.controller_cursors ?? {}).filter(([, value]) => value > 0).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'})`,
    `recent_events: ${recentEvents}`,
    `recent_cursors: ${cursors}`,
  ].join('\n');
}

function renderHelp() {
  return [
    'Usage: node scripts/ao-events.js [options]',
    '',
    'Options:',
    '  --project <project_id>   AO project id. Default: ciecopilot-home',
    '  --limit <number>         Number of recent events/cursors to include. Default: 5',
    '  --task <task_id>         Filter to one managed task',
    '  --pr <number>            Filter delivery events to one PR number',
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
    const report = await loadAoEventReport({
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
