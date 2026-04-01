#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROJECT_ID,
  loadAoStateReport,
} from './ao/lib/state-runner.js';

const AO_RELEASE_SCHEMA_VERSION = 'ao.release.v1alpha1';
const AO_RELEASE_REPORT_FORMAT = 'ao_release_report';

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
    prNumber: null,
    historyLimit: 5,
    json: false,
    promote: false,
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
    } else if (arg === '--pr') {
      const value = argv[index + 1] ?? null;
      options.prNumber = value == null ? null : Number(value);
      index += 1;
    } else if (arg === '--history-limit') {
      const value = argv[index + 1] ?? null;
      options.historyLimit = value == null ? null : Number(value);
      index += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--promote') {
      options.promote = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      return {
        ok: false,
        error: `Unknown argument: ${arg}`,
      };
    }
  }

  if (options.projectId == null || String(options.projectId).trim() === '') {
    return {
      ok: false,
      error: 'Missing value for --project',
    };
  }

  if (options.prNumber != null && (!Number.isInteger(options.prNumber) || options.prNumber <= 0)) {
    return {
      ok: false,
      error: 'Invalid value for --pr',
    };
  }

  if (!Number.isInteger(options.historyLimit) || options.historyLimit <= 0) {
    return {
      ok: false,
      error: 'Invalid value for --history-limit',
    };
  }

  return {
    ok: true,
    options,
  };
}

function countCurrentStatuses(guards = []) {
  const counts = {
    ready: 0,
    waiting: 0,
    blocked: 0,
    ambiguous: 0,
    not_applicable: 0,
  };

  for (const guard of guards) {
    if (guard?.validity_status !== 'active') continue;
    if (!Object.hasOwn(counts, guard?.status ?? '')) continue;
    counts[guard.status] += 1;
  }

  return counts;
}

function sortGuardsByRecordedAt(guards = []) {
  return [...guards].sort((left, right) => {
    const recordedAtCompare = String(right?.recorded_at ?? '').localeCompare(String(left?.recorded_at ?? ''));
    if (recordedAtCompare !== 0) return recordedAtCompare;
    return String(right?.guard_id ?? '').localeCompare(String(left?.guard_id ?? ''));
  });
}

function buildPromotionCommands(projectId, prNumber, disposition) {
  if (!Number.isInteger(prNumber)) return [];

  if (disposition === 'notify_human_ready') {
    return [
      `gh pr view ${prNumber} --json mergeable,reviewDecision,isDraft,url`,
      `ao review-check ${projectId} --dry-run`,
    ];
  }
  if (disposition === 'await_ci') {
    return [`gh pr checks ${prNumber}`];
  }
  if (disposition === 'await_review') {
    return [`gh pr view ${prNumber} --json reviewDecision,url`];
  }
  if (disposition === 'await_mergeability') {
    return [`gh pr view ${prNumber} --json mergeable,isDraft,url`];
  }

  return [];
}

function buildPromotionSurface(projectId, prNumber, activeGuard) {
  if (!activeGuard) {
    return {
      eligible: false,
      merge_authority: false,
      signal: null,
      disposition: null,
      authoritative: false,
      basis: ['missing_release_guard'],
      commands: [],
    };
  }

  const disposition = activeGuard?.promotion?.disposition ?? null;
  const signal = activeGuard?.promotion?.signal ?? null;

  return {
    eligible: signal === 'notify_human_ready',
    merge_authority: false,
    signal,
    disposition,
    authoritative: Boolean(activeGuard?.promotion?.authoritative),
    basis: (activeGuard?.promotion?.basis?.length ?? 0) > 0
      ? activeGuard.promotion.basis
      : (activeGuard?.basis ?? []),
    commands: buildPromotionCommands(projectId, prNumber, disposition),
  };
}

function buildReleaseReport({
  stateReport,
  prNumber = null,
  historyLimit = 5,
  promote = false,
} = {}) {
  const guards = stateReport?.release?.guards ?? [];
  const currentGuards = stateReport?.release?.current_guards ?? [];
  const scopedGuards = prNumber == null
    ? guards
    : guards.filter((guard) => guard?.pr_number === prNumber);
  const scopedCurrentGuards = prNumber == null
    ? currentGuards
    : currentGuards.filter((guard) => guard?.pr_number === prNumber);
  const activeGuard = prNumber == null ? null : (sortGuardsByRecordedAt(scopedCurrentGuards)[0] ?? null);
  const history = sortGuardsByRecordedAt(scopedGuards).slice(0, historyLimit);
  const promotionSurface = prNumber == null ? null : buildPromotionSurface(
    stateReport?.project_id ?? DEFAULT_PROJECT_ID,
    prNumber,
    activeGuard,
  );

  return {
    schema_version: AO_RELEASE_SCHEMA_VERSION,
    report_format: AO_RELEASE_REPORT_FORMAT,
    project_id: stateReport?.project_id ?? DEFAULT_PROJECT_ID,
    mode: promote ? 'promote' : 'inspect',
    pr_number: prNumber,
    summary: {
      current_guard_count: scopedCurrentGuards.length,
      current_status_counts: countCurrentStatuses(scopedCurrentGuards),
      requested_pr_found: prNumber == null ? null : activeGuard != null,
      promotable: promotionSurface?.eligible ?? false,
    },
    release_guard: activeGuard,
    current_guards: scopedCurrentGuards,
    history,
    promotion_surface: promotionSurface,
  };
}

function renderHumanSummary(report) {
  const lines = [
    `project: ${report.project_id}`,
    `mode: ${report.mode}`,
  ];

  if (Number.isInteger(report.pr_number)) {
    lines.push(`pr: ${report.pr_number}`);
    lines.push(`release_status: ${report.release_guard?.status ?? 'missing'}`);
    lines.push(`head_sha: ${report.release_guard?.head_sha ?? 'missing'}`);
    lines.push(`validity: ${report.release_guard?.validity_status ?? 'missing'}`);
    lines.push(`promotion_signal: ${report.promotion_surface?.signal ?? 'none'}`);
    lines.push(`promotion_disposition: ${report.promotion_surface?.disposition ?? 'none'}`);
    lines.push(`promotion_authoritative: ${String(report.promotion_surface?.authoritative ?? false)}`);
    lines.push(`merge_authority: false`);
    lines.push(`basis: ${(report.promotion_surface?.basis ?? report.release_guard?.basis ?? []).join(', ') || 'none'}`);
    lines.push(`history_count: ${report.history.length}`);

    const commands = report.promotion_surface?.commands ?? [];
    if (commands.length) {
      lines.push('commands:');
      for (const command of commands) {
        lines.push(`  - ${command}`);
      }
    }

    return lines.join('\n');
  }

  lines.push(`current_guard_count: ${report.summary.current_guard_count}`);
  for (const [status, count] of Object.entries(report.summary.current_status_counts ?? {})) {
    lines.push(`status_${status}: ${count}`);
  }
  return lines.join('\n');
}

function renderHelp() {
  return [
    'Usage: node scripts/ao-release.js [options]',
    '',
    'Options:',
    '  --project <project_id>      AO project id. Default: ciecopilot-home',
    '  --pr <number>               Inspect one managed PR release guard',
    '  --promote                   Show promotion-surface output without merge authority',
    '  --history-limit <number>    Number of historical release guards to include. Default: 5',
    '  --json                      Print machine-readable JSON output',
    '  -h, --help                  Show help',
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
    const stateReport = await loadAoStateReport({
      cwd: process.cwd(),
      projectId: options.projectId,
      auditLimit: options.historyLimit,
    });
    const report = buildReleaseReport({
      stateReport,
      prNumber: options.prNumber,
      historyLimit: options.historyLimit,
      promote: options.promote,
    });

    if (options.json) {
      io.writeStdout(JSON.stringify(report, null, 2));
    } else {
      io.writeStdout(`${renderHumanSummary(report)}\n`);
    }

    const promoteBlocked = options.promote && report.promotion_surface?.eligible === false;
    return {
      exitCode: promoteBlocked ? 2 : 0,
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
