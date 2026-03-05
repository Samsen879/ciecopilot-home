#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'supabase_connectivity_probe.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const options = {
    rounds: 3,
    intervalSeconds: 10,
    includeRemoteChanges: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--rounds') {
      options.rounds = Number(argv[i + 1] || options.rounds);
      i += 1;
    } else if (arg === '--interval-seconds') {
      options.intervalSeconds = Number(argv[i + 1] || options.intervalSeconds);
      i += 1;
    } else if (arg === '--include-remote-changes') {
      options.includeRemoteChanges = true;
    }
  }

  return options;
}

function runCommand(args) {
  const startedAt = new Date().toISOString();
  const started = Date.now();

  try {
    const stdout = execFileSync('supabase', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      args,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      exit_code: 0,
      ok: true,
      stdout,
      stderr: '',
    };
  } catch (error) {
    return {
      args,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      exit_code: Number.isInteger(error.status) ? error.status : 1,
      ok: false,
      stdout: String(error.stdout || ''),
      stderr: String(error.stderr || error.message || ''),
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const commands = [
    { id: 'status', args: ['status'], required: true },
    { id: 'migration_list', args: ['migration', 'list'], required: true },
  ];

  if (options.includeRemoteChanges) {
    commands.push({
      id: 'db_remote_changes',
      args: ['db', 'remote', 'changes', '--linked'],
      required: true,
    });
  } else {
    commands.push({
      id: 'db_remote_changes',
      args: ['db', 'remote', 'changes', '--linked'],
      required: false,
      skipped: true,
      skip_reason: 'not enabled for this probe; use --include-remote-changes when this repo depends on linked remote change inspection',
    });
  }

  const rounds = [];
  for (let round = 1; round <= options.rounds; round += 1) {
    const checks = [];
    for (const command of commands) {
      if (command.skipped) {
        checks.push({
          id: command.id,
          args: command.args,
          required: command.required,
          skipped: true,
          skip_reason: command.skip_reason,
          ok: true,
        });
        continue;
      }
      checks.push({
        id: command.id,
        required: command.required,
        ...runCommand(command.args),
      });
    }

    rounds.push({
      round,
      checks,
      required_checks_passed: checks.every((check) => !check.required || check.ok),
    });

    if (round < options.rounds) {
      await sleep(options.intervalSeconds * 1000);
    }
  }

  const allRoundsPassed = rounds.every((round) => round.required_checks_passed);
  const payload = {
    generated_at: new Date().toISOString(),
    rounds_requested: options.rounds,
    interval_seconds: options.intervalSeconds,
    include_remote_changes: options.includeRemoteChanges,
    status: allRoundsPassed ? 'pass' : 'fail',
    all_rounds_passed: allRoundsPassed,
    rounds,
    next_action: allRoundsPassed
      ? 'safe_to_enter_db_push_dry_run_phase'
      : 'abort_before_dry_run_and_stabilize_supabase_cli_connectivity',
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n`);

  if (!allRoundsPassed) {
    process.exitCode = 1;
  }
}

await main();
