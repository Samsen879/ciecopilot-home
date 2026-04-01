#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { inspectCompletionReviewGate } from './ao/lib/completion-review.js';
import { createCompletionReviewRecord } from './ao/lib/state-contracts.js';
import { createStateRepository } from './ao/lib/state-repository.js';
import {
  DEFAULT_PROJECT_ID,
  loadAoStateReport,
} from './ao/lib/state-runner.js';

const AO_COMPLETION_REVIEW_SCHEMA_VERSION = 'ao.completion-review.v1alpha1';
const AO_COMPLETION_REVIEW_REPORT_FORMAT = 'ao_completion_review_report';

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
    taskId: null,
    headSha: null,
    historyLimit: 5,
    upsertPath: null,
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
    } else if (arg === '--pr') {
      const value = argv[index + 1] ?? null;
      options.prNumber = value == null ? null : Number(value);
      index += 1;
    } else if (arg === '--task') {
      try {
        options.taskId = readOptionValue(argv, index, '--task');
      } catch (error) {
        return { ok: false, error: error.message };
      }
      index += 1;
    } else if (arg === '--head-sha') {
      try {
        options.headSha = readOptionValue(argv, index, '--head-sha');
      } catch (error) {
        return { ok: false, error: error.message };
      }
      index += 1;
    } else if (arg === '--history-limit') {
      const value = argv[index + 1] ?? null;
      options.historyLimit = value == null ? null : Number(value);
      index += 1;
    } else if (arg === '--upsert') {
      try {
        options.upsertPath = readOptionValue(argv, index, '--upsert');
      } catch (error) {
        return { ok: false, error: error.message };
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

  if (options.projectId == null || String(options.projectId).trim() === '') {
    return { ok: false, error: 'Missing value for --project' };
  }

  if (options.prNumber != null && (!Number.isInteger(options.prNumber) || options.prNumber <= 0)) {
    return { ok: false, error: 'Invalid value for --pr' };
  }

  if (!Number.isInteger(options.historyLimit) || options.historyLimit <= 0) {
    return { ok: false, error: 'Invalid value for --history-limit' };
  }

  if (options.upsertPath && !path.isAbsolute(options.upsertPath)) {
    options.upsertPath = path.resolve(process.cwd(), options.upsertPath);
  }

  return {
    ok: true,
    options,
  };
}

function sortByNewest(records = [], key = 'updated_at') {
  return [...records].sort((left, right) => String(right?.[key] ?? '').localeCompare(String(left?.[key] ?? '')));
}

function resolveScopedRecords(records = [], { prNumber = null, taskId = null } = {}) {
  if (prNumber == null && taskId == null) return records;
  return records.filter((record) => (
    (prNumber != null && record?.pr_number === prNumber)
      || (taskId != null && record?.task_id === taskId)
  ));
}

function resolveCurrentReleaseGuard(stateReport, { prNumber = null, taskId = null } = {}) {
  const currentGuards = stateReport?.release?.current_guards ?? [];

  if (prNumber != null) {
    return sortByNewest(
      currentGuards.filter((guard) => guard?.pr_number === prNumber),
      'recorded_at',
    )[0] ?? null;
  }

  if (taskId != null) {
    const binding = (stateReport?.state?.pr_bindings ?? []).find(
      (record) => record?.task_id === taskId && record?.status === 'bound',
    ) ?? null;
    if (!binding) return null;
    return sortByNewest(
      currentGuards.filter((guard) => guard?.pr_number === binding.pr_number),
      'recorded_at',
    )[0] ?? null;
  }

  return null;
}

function buildInspection(stateReport, { prNumber = null, taskId = null, headSha = null } = {}) {
  const currentGuard = resolveCurrentReleaseGuard(stateReport, {
    prNumber,
    taskId,
  });
  const scopedTaskId = taskId
    ?? ((stateReport?.state?.pr_bindings ?? []).find(
      (record) => prNumber != null && record?.pr_number === prNumber && record?.status === 'bound',
    )?.task_id ?? null);

  return inspectCompletionReviewGate({
    state: stateReport?.state ?? {},
    taskId: scopedTaskId,
    prNumber: prNumber ?? currentGuard?.pr_number ?? null,
    branchName: currentGuard?.branch_name ?? null,
    headSha: headSha ?? currentGuard?.head_sha ?? null,
    ownerSessionName: currentGuard?.truth?.owner_session_name ?? null,
    ownerSessionId: null,
  });
}

function buildReport({
  stateReport,
  options,
  persistedRecord = null,
} = {}) {
  const scopedRecords = sortByNewest(
    resolveScopedRecords(stateReport?.completion_reviews?.records ?? [], options),
  );
  const inspection = options.prNumber != null || options.taskId != null || options.headSha != null
    ? buildInspection(stateReport, options)
    : null;

  return {
    schema_version: AO_COMPLETION_REVIEW_SCHEMA_VERSION,
    report_format: AO_COMPLETION_REVIEW_REPORT_FORMAT,
    project_id: stateReport?.project_id ?? DEFAULT_PROJECT_ID,
    scope: {
      pr_number: options.prNumber,
      task_id: options.taskId,
      head_sha: options.headSha,
    },
    summary: {
      total_record_count: stateReport?.summary?.completion_review_count ?? 0,
      active_record_count: stateReport?.summary?.active_completion_review_count ?? 0,
      current_status_counts: stateReport?.summary?.current_completion_review_status_counts ?? {},
    },
    current: inspection,
    inspections: options.prNumber == null && options.taskId == null && options.headSha == null
      ? (stateReport?.completion_reviews?.inspections ?? [])
      : (inspection == null ? [] : [inspection]),
    history: scopedRecords.slice(0, options.historyLimit),
    persisted_record: persistedRecord,
  };
}

function renderHumanSummary(report) {
  const lines = [
    `project: ${report.project_id}`,
  ];

  if (report.current) {
    lines.push(`scope_pr: ${report.scope.pr_number ?? 'none'}`);
    lines.push(`scope_task: ${report.scope.task_id ?? 'none'}`);
    lines.push(`head_sha: ${report.current.head_sha ?? report.scope.head_sha ?? 'unknown'}`);
    lines.push(`status: ${report.current.status ?? 'unknown'}`);
    lines.push(`satisfied: ${String(report.current.satisfied ?? false)}`);
    lines.push(`review_id: ${report.current.review_id ?? 'none'}`);
    lines.push(`reviewer: ${report.current.reviewer_session_name ?? 'none'}`);
    lines.push(`verdict: ${report.current.verdict ?? 'none'}`);
    lines.push(`reason_codes: ${(report.current.reason_codes ?? []).join(', ') || 'none'}`);
    if ((report.current.evidence_refs ?? []).length > 0) {
      lines.push('evidence_refs:');
      for (const evidence of report.current.evidence_refs) {
        lines.push(`  - ${evidence.source}:${evidence.kind}:${evidence.id ?? 'none'} ${evidence.summary}`);
      }
    }
    lines.push(`history_count: ${report.history.length}`);
    return lines.join('\n');
  }

  lines.push(`active_records: ${report.summary.active_record_count}`);
  for (const [status, count] of Object.entries(report.summary.current_status_counts ?? {})) {
    lines.push(`status_${status}: ${count}`);
  }
  lines.push(`inspection_count: ${(report.inspections ?? []).length}`);
  return lines.join('\n');
}

function renderHelp() {
  return [
    'Usage: node scripts/ao-completion-review.js [options]',
    '',
    'Inspect durable AO completion-review posture, or upsert a typed review record.',
    '',
    'Options:',
    '  --project <project_id>      AO project id. Default: ciecopilot-home',
    '  --pr <number>               Inspect one managed PR completion-review posture',
    '  --task <task_id>            Inspect one managed task completion-review posture',
    '  --head-sha <sha>            Override the head SHA used for inspection',
    '  --history-limit <number>    Number of historical records to include. Default: 5',
    '  --upsert <payload.json>     Upsert one completion-review record from JSON payload',
    '  --json                      Print machine-readable JSON output',
    '  -h, --help                  Show help',
    '',
    'Payload JSON must satisfy scripts/ao/lib/state-contracts.js#createCompletionReviewRecord.',
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
    let persistedRecord = null;
    if (options.upsertPath) {
      const payload = JSON.parse(fs.readFileSync(options.upsertPath, 'utf8'));
      const repository = createStateRepository({
        repoRoot: process.cwd(),
        projectId: options.projectId,
      });
      persistedRecord = repository.upsertCompletionReview(createCompletionReviewRecord(payload));
    }

    const stateReport = await loadAoStateReport({
      cwd: process.cwd(),
      projectId: options.projectId,
      auditLimit: options.historyLimit,
    });
    const report = buildReport({
      stateReport,
      options,
      persistedRecord,
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
