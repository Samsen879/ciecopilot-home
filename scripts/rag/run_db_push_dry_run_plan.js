#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const DEFAULT_HOLD_DIR = path.join(ROOT, 'supabase', '_hold_migrations');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'db_push_dry_run_plan.json');
const ENV_FILE = path.join(ROOT, '.env');

function parseArgs(argv) {
  const options = {
    targets: ['20260302190000'],
    hold: ['20260219130000'],
    holdDir: DEFAULT_HOLD_DIR,
    timeoutMs: 120000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') {
      options.targets.push(argv[i + 1]);
      i += 1;
    } else if (arg === '--hold') {
      options.hold.push(argv[i + 1]);
      i += 1;
    } else if (arg === '--hold-dir') {
      options.holdDir = path.isAbsolute(argv[i + 1])
        ? argv[i + 1]
        : path.join(ROOT, argv[i + 1]);
      i += 1;
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = Number(argv[i + 1] || options.timeoutMs);
      i += 1;
    }
  }

  options.targets = [...new Set(options.targets.filter(Boolean))];
  options.hold = [...new Set(options.hold.filter(Boolean).filter((v) => !options.targets.includes(v)))];
  return options;
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (!fs.existsSync(ENV_FILE)) {
    return null;
  }

  const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^DATABASE_URL=(.*)$/);
    if (!match) continue;
    return match[1].trim().replace(/^"(.*)"$/, '$1');
  }

  return null;
}

function extractPasswordFromDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;
  const match = String(databaseUrl).match(/^(postgres(?:ql)?:\/\/)([^:]+):([^@]+)@(.*)$/i);
  if (!match) {
    return null;
  }
  const rawPassword = match[3];
  return rawPassword.startsWith('[') && rawPassword.endsWith(']')
    ? rawPassword.slice(1, -1)
    : rawPassword;
}

function normalizeDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;

  const match = String(databaseUrl).match(/^(postgres(?:ql)?:\/\/)([^:]+):([^@]+)@(.*)$/i);
  if (!match) {
    return databaseUrl;
  }

  const [, scheme, username, rawPassword, remainder] = match;
  const password = rawPassword.startsWith('[') && rawPassword.endsWith(']')
    ? rawPassword.slice(1, -1)
    : rawPassword;

  return `${scheme}${username}:${encodeURIComponent(password)}@${remainder}`;
}

function loadDatabasePassword() {
  if (process.env.SUPABASE_DB_PASSWORD) {
    return process.env.SUPABASE_DB_PASSWORD;
  }
  return extractPasswordFromDatabaseUrl(loadDatabaseUrl());
}

function redactArgs(args) {
  const sensitiveFlags = new Set(['--db-url', '--password']);
  const redacted = [];
  for (let i = 0; i < args.length; i += 1) {
    redacted.push(args[i]);
    if (sensitiveFlags.has(args[i]) && i + 1 < args.length) {
      redacted.push('<redacted>');
      i += 1;
    }
  }
  return redacted;
}

function findMigrationFile(version) {
  const entries = fs.readdirSync(MIGRATIONS_DIR);
  return entries.find((entry) => entry.startsWith(version)) || null;
}

function parsePlannedMigrationVersions(text) {
  const versions = new Set();
  const lines = String(text || '').split(/\r?\n/);
  for (const line of lines) {
    const bulletMatch = line.match(/[•*-]\s*(\d{14})[^\s]*\.sql/i);
    if (bulletMatch) {
      versions.add(bulletMatch[1]);
      continue;
    }
    const pathMatch = line.match(/supabase[\\/](?:_hold_migrations|migrations)[\\/](\d{14})[^\s]*\.sql/i);
    if (pathMatch) {
      versions.add(pathMatch[1]);
    }
  }
  return [...versions];
}

function moveToHold(version, holdDir) {
  const fileName = findMigrationFile(version);
  if (!fileName) {
    return null;
  }

  const fromPath = path.join(MIGRATIONS_DIR, fileName);
  const toPath = path.join(holdDir, fileName);
  fs.mkdirSync(holdDir, { recursive: true });
  fs.renameSync(fromPath, toPath);
  return { version, file_name: fileName, from_path: fromPath, to_path: toPath };
}

function restoreHeldFile(entry) {
  if (!entry) return;
  if (!fs.existsSync(entry.to_path)) return;
  fs.renameSync(entry.to_path, entry.from_path);
}

function runDryRun(options) {
  const databasePassword = loadDatabasePassword();
  const databaseUrl = normalizeDatabaseUrl(loadDatabaseUrl());
  const args = ['db', 'push', '--dry-run', '--yes', '--debug'];
  let connection_mode = 'linked_login_role';

  if (databasePassword) {
    connection_mode = 'linked_password';
    args.push('--password', databasePassword);
  } else if (databaseUrl) {
    connection_mode = 'db_url';
    args.push('--db-url', databaseUrl);
  }

  const safeArgs = redactArgs(args);

  try {
    let stdout = '';
    let stderr = '';

    if (connection_mode === 'linked_password') {
      stdout = execFileSync(
        'powershell',
        ['-Command', '& supabase db push --dry-run --yes --debug --password $env:SUPABASE_DB_PASSWORD 2>&1 | Out-String'],
        {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: options.timeoutMs,
          env: {
            ...process.env,
            SUPABASE_DB_PASSWORD: databasePassword,
          },
        },
      );
    } else {
      stdout = execFileSync('supabase', args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeoutMs,
      });
    }

    return { ok: true, exit_code: 0, stdout, stderr, args: safeArgs, connection_mode };
  } catch (error) {
    return {
      ok: false,
      exit_code: Number.isInteger(error.status) ? error.status : 1,
      stdout: String(error.stdout || ''),
      stderr: String(error.stderr || error.message || ''),
      args: safeArgs,
      connection_mode,
      timed_out: error.code === 'ETIMEDOUT' || /timed out/i.test(String(error.message || '')),
    };
  }
}

function removeHoldDirIfEmpty(holdDir) {
  if (!fs.existsSync(holdDir)) return;
  if (fs.readdirSync(holdDir).length === 0) {
    fs.rmdirSync(holdDir);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  const targetFiles = options.targets.map((version) => ({
    version,
    file_name: findMigrationFile(version),
  }));

  const missingTargets = targetFiles.filter((entry) => !entry.file_name).map((entry) => entry.version);
  if (missingTargets.length > 0) {
    const payload = {
      generated_at: startedAt,
      status: 'fail',
      reason: 'target_migration_missing',
      target_versions: options.targets,
      missing_target_versions: missingTargets,
    };
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    process.stdout.write(`${OUT_JSON}\n`);
    process.exitCode = 1;
    return;
  }

  const holdMoves = [];
  let dryRunResult = null;
  let restoreErrors = [];

  try {
    for (const version of options.hold) {
      const moved = moveToHold(version, options.holdDir);
      if (moved) {
        holdMoves.push(moved);
      }
    }

    dryRunResult = runDryRun(options);
  } finally {
    for (const entry of holdMoves.slice().reverse()) {
      try {
        restoreHeldFile(entry);
      } catch (error) {
        restoreErrors.push({
          version: entry.version,
          message: error.message,
        });
      }
    }
    removeHoldDirIfEmpty(options.holdDir);
  }

  const combinedOutput = `${dryRunResult?.stdout || ''}\n${dryRunResult?.stderr || ''}`;
  const detectedVersions = parsePlannedMigrationVersions(combinedOutput);
  const unexpectedVersions = detectedVersions.filter((version) => !options.targets.includes(version));
  const missingTargetVersions = options.targets.filter((version) => !detectedVersions.includes(version));
  const semanticDryRunSuccess = (
    Boolean(dryRunResult?.ok)
    || /Would push these migrations:/i.test(combinedOutput)
    || /Finished supabase db push\./i.test(combinedOutput)
  ) && !/failed to connect|failed to parse connection string|Rerun the command with --include-all flag/i.test(combinedOutput);
  const status = semanticDryRunSuccess && unexpectedVersions.length === 0 && missingTargetVersions.length === 0 && restoreErrors.length === 0
    ? 'pass'
    : 'fail';

  const payload = {
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    status,
    target_versions: options.targets,
    hold_versions: options.hold,
    hold_dir: path.relative(ROOT, options.holdDir).replace(/\\/g, '/'),
    held_files: holdMoves.map((entry) => ({
      version: entry.version,
      file_name: entry.file_name,
    })),
    dry_run: dryRunResult,
    semantic_dry_run_success: semanticDryRunSuccess,
    detected_versions_in_output: detectedVersions,
    unexpected_versions: unexpectedVersions,
    missing_target_versions: missingTargetVersions,
    restore_errors: restoreErrors,
    next_action: status === 'pass'
      ? 'human_may_review_dry_run_output_before_real_db_push'
      : 'abort_before_db_push',
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n`);

  if (status !== 'pass') {
    process.exitCode = 1;
  }
}

main();
