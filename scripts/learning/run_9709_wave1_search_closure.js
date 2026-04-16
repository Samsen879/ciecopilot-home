#!/usr/bin/env node

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DEFAULT_9709_WAVE1_CLOSURE_PATHS = Object.freeze({
  manifest: 'data/manifests/9709_question_search_recovery_v1.json',
  laneResults: 'docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json',
  evidenceBundlesOut: 'docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json',
  fixture: 'data/eval/question_search_gold_9709_v1.json',
  gateReport: 'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md',
  gateJson: 'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json',
  gatePsqlMode: 'docker',
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine(
    'Usage: node scripts/learning/run_9709_wave1_search_closure.js [--manifest <path>] [--lane-results <path>] [--evidence-bundles-out <path>] [--fixture <path>] [--gate-report <path>] [--gate-json <path>] [--gate-psql-mode <direct|docker>] [--gate-psql-container <name>] [--dry-run]',
  );
}

function normalizeOptionalString(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function normalizeGatePsqlMode(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!normalized) {
    return DEFAULT_9709_WAVE1_CLOSURE_PATHS.gatePsqlMode;
  }
  if (!['direct', 'docker'].includes(normalized)) {
    throw new Error(`Unsupported --gate-psql-mode: ${value}`);
  }
  return normalized;
}

export function toWindowsWslUncPath(targetPath, distroName = process.env.WSL_DISTRO_NAME || 'Ubuntu') {
  const resolved = path.resolve(targetPath);
  const segments = resolved.split(path.posix.sep).filter(Boolean);
  return `\\\\wsl.localhost\\${distroName}\\${segments.join('\\')}`;
}

export function build9709Wave1SearchClosurePlan({
  manifest = DEFAULT_9709_WAVE1_CLOSURE_PATHS.manifest,
  laneResults = DEFAULT_9709_WAVE1_CLOSURE_PATHS.laneResults,
  evidenceBundlesOut = DEFAULT_9709_WAVE1_CLOSURE_PATHS.evidenceBundlesOut,
  fixture = DEFAULT_9709_WAVE1_CLOSURE_PATHS.fixture,
  gateReport = DEFAULT_9709_WAVE1_CLOSURE_PATHS.gateReport,
  gateJson = DEFAULT_9709_WAVE1_CLOSURE_PATHS.gateJson,
  gatePsqlMode = DEFAULT_9709_WAVE1_CLOSURE_PATHS.gatePsqlMode,
  gatePsqlContainer = null,
} = {}) {
  const gateArgs = [
    'scripts/evaluation/run_question_search_gate.js',
    '--fixture',
    fixture,
    '--report',
    gateReport,
    '--json-out',
    gateJson,
    '--psql-mode',
    normalizeGatePsqlMode(gatePsqlMode),
  ];

  if (normalizeOptionalString(gatePsqlContainer)) {
    gateArgs.push('--psql-container', normalizeOptionalString(gatePsqlContainer));
  }

  return [
    {
      label: 'build_evidence_bundles',
      command: process.execPath,
      args: [
        'scripts/learning/run_question_evidence_bundle_v1.js',
        '--manifest',
        manifest,
        '--lane-results',
        laneResults,
        '--output',
        evidenceBundlesOut,
      ],
    },
    {
      label: 'backfill_paper_question_registry',
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        toWindowsWslUncPath(path.join(PROJECT_ROOT, 'scripts', 'learning', 'run_paper_question_registry_backfill_host.ps1')),
        '-Manifest',
        manifest,
      ],
    },
    {
      label: 'hydrate_question_analysis',
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        toWindowsWslUncPath(path.join(PROJECT_ROOT, 'scripts', 'learning', 'run_question_analysis_backfill_host.ps1')),
        '-Manifest',
        manifest,
        '-EvidenceBundles',
        evidenceBundlesOut,
      ],
    },
    {
      label: 'rerun_question_search_gate',
      command: process.execPath,
      args: gateArgs,
    },
  ];
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    manifest: DEFAULT_9709_WAVE1_CLOSURE_PATHS.manifest,
    laneResults: DEFAULT_9709_WAVE1_CLOSURE_PATHS.laneResults,
    evidenceBundlesOut: DEFAULT_9709_WAVE1_CLOSURE_PATHS.evidenceBundlesOut,
    fixture: DEFAULT_9709_WAVE1_CLOSURE_PATHS.fixture,
    gateReport: DEFAULT_9709_WAVE1_CLOSURE_PATHS.gateReport,
    gateJson: DEFAULT_9709_WAVE1_CLOSURE_PATHS.gateJson,
    gatePsqlMode: DEFAULT_9709_WAVE1_CLOSURE_PATHS.gatePsqlMode,
    gatePsqlContainer: null,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--manifest') {
      options.manifest = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--lane-results') {
      options.laneResults = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--evidence-bundles-out') {
      options.evidenceBundlesOut = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--fixture') {
      options.fixture = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--gate-report') {
      options.gateReport = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--gate-json') {
      options.gateJson = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--gate-psql-mode') {
      options.gatePsqlMode = normalizeGatePsqlMode(argv[index + 1] ?? null);
      index += 1;
      continue;
    }
    if (token === '--gate-psql-container') {
      options.gatePsqlContainer = normalizeOptionalString(argv[index + 1] ?? null);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function renderStep(step) {
  return [step.command, ...step.args].join(' ');
}

async function runStep(step) {
  writeStdoutLine(`== ${step.label} ==`);

  const { stdout, stderr } = await execFileAsync(step.command, step.args, {
    cwd: PROJECT_ROOT,
    maxBuffer: 1024 * 1024 * 8,
    env: {
      ...process.env,
      ...(step.env ?? {}),
    },
  });

  if (stdout.trim()) {
    writeStdoutLine(stdout.trimEnd());
  }
  if (stderr.trim()) {
    writeStderrLine(stderr.trimEnd());
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return;
  }

  const plan = build9709Wave1SearchClosurePlan(options);

  if (options.dryRun) {
    for (const step of plan) {
      writeStdoutLine(`${step.label}: ${renderStep(step)}`);
    }
    return;
  }

  for (const step of plan) {
    await runStep(step);
  }
}

export function is9709Wave1SearchClosureEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (is9709Wave1SearchClosureEntrypoint(process.argv[1], import.meta.url)) {
  try {
    await main();
  } catch (error) {
    writeStderrLine(error.message);
    process.exitCode = 1;
  }
}
