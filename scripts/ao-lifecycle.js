#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LIFECYCLE_STRICT_EXIT_CODES,
  createLifecycleProjectScope,
  createLifecyclePrScope,
  normalizeLifecycleTrigger,
} from './ao/lib/lifecycle-contracts.js';
import {
  DEFAULT_PROJECT_ID,
  runDoctor,
} from './ao/lib/doctor-runner.js';
import { buildLifecycleReport } from './ao/lib/lifecycle-engine.js';
import { renderLifecycleHumanSummary } from './ao/lib/lifecycle-report.js';

function createDefaultIo() {
  return {
    writeStdout: (text) => process.stdout.write(text),
    writeStderr: (text) => process.stderr.write(text),
  };
}

function parseArgs(argv) {
  const options = {
    projectId: DEFAULT_PROJECT_ID,
    explicitProject: false,
    prNumber: null,
    trigger: 'manual',
    json: false,
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--project') {
      options.projectId = argv[index + 1] ?? null;
      options.explicitProject = true;
      index += 1;
    } else if (arg === '--pr') {
      const value = argv[index + 1] ?? null;
      options.prNumber = value == null ? null : Number(value);
      index += 1;
    } else if (arg === '--trigger') {
      options.trigger = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      return {
        ok: false,
        error: `Unknown argument: ${arg}`,
      };
    }
  }

  if (options.explicitProject && options.prNumber != null) {
    return {
      ok: false,
      error: 'Cannot use --project and --pr together',
    };
  }

  if (options.projectId == null || options.projectId === '') {
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

  try {
    options.trigger = normalizeLifecycleTrigger(options.trigger);
  } catch {
    return {
      ok: false,
      error: 'Invalid value for --trigger',
    };
  }

  return {
    ok: true,
    options,
  };
}

function exitCodeForReport(report, strict) {
  if (strict) {
    return LIFECYCLE_STRICT_EXIT_CODES[report.top_status] ?? LIFECYCLE_STRICT_EXIT_CODES.invalid_usage;
  }

  if (report.top_status === 'source_failure') return 3;
  return 0;
}

function renderHelp() {
  return [
    'Usage: node scripts/ao-lifecycle.js [options]',
    '',
    'Options:',
    '  --project <project_id>   Diagnose one AO project. Default: ciecopilot-home',
    '  --pr <number>            Diagnose one explicit PR scope',
    '  --trigger <name>         Lifecycle trigger. Default: manual',
    '  --json                   Print machine-readable JSON output',
    '  --strict                 Use fixed lifecycle strict exit-code mapping',
    '  -h, --help               Show help',
  ].join('\n');
}

export async function runCli(argv, io = createDefaultIo()) {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    io.writeStderr(`${parsed.error}\n`);
    return {
      exitCode: argv.includes('--strict') ? LIFECYCLE_STRICT_EXIT_CODES.invalid_usage : 4,
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

  const scope = options.prNumber != null
    ? createLifecyclePrScope({
        projectId: options.projectId,
        prNumber: options.prNumber,
        trigger: options.trigger,
      })
    : createLifecycleProjectScope({
        projectId: options.projectId,
        trigger: options.trigger,
      });

  const doctorResult = await runDoctor({
    projectId: options.projectId,
    prNumber: options.prNumber,
    cwd: process.cwd(),
  });
  const report = buildLifecycleReport({
    scope,
    reconciliationReport: doctorResult.reconciliationReport,
    doctorReport: doctorResult.report,
    controlPlaneSnapshot: doctorResult.controlPlaneSnapshot ?? null,
  });

  if (options.json) {
    io.writeStdout(JSON.stringify(report, null, 2));
  } else {
    io.writeStdout(`${renderLifecycleHumanSummary(report)}\n`);
  }

  return {
    exitCode: exitCodeForReport(report, options.strict),
    report,
  };
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedFile && executedFile === currentFile) {
  const { exitCode } = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
