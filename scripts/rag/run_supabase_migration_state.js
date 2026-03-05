#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_supabase_migration_state.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_supabase_migration_state.md');

function parseMigrationRows(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .map((line) => {
      const match = line.match(/^\s*(\d{14})?\s*\|\s*(\d{14})?\s*\|\s*(.+?)\s*$/);
      if (!match) return null;
      const [, local, remote, time] = match;
      return {
        local: local || null,
        remote: remote || null,
        time_utc: time || null,
      };
    })
    .filter(Boolean);
}

function main() {
  const stdout = execFileSync('supabase', ['migration', 'list'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  const rows = parseMigrationRows(stdout);
  const localOnly = rows.filter((row) => row.local && !row.remote).map((row) => row.local);
  const remoteOnly = rows.filter((row) => row.remote && !row.local).map((row) => row.remote);
  const state = {
    generated_at: new Date().toISOString(),
    status: localOnly.length === 0 && remoteOnly.length === 0 ? 'in_sync' : 'diverged',
    local_only_migrations: localOnly,
    remote_only_migrations: remoteOnly,
    total_rows: rows.length,
  };

  const report = [
    '# Supabase Migration State',
    '',
    `- Generated at: \`${state.generated_at}\``,
    `- Status: \`${state.status}\``,
    `- local_only_migrations: \`${state.local_only_migrations.join(', ') || 'NONE'}\``,
    `- remote_only_migrations: \`${state.remote_only_migrations.join(', ') || 'NONE'}\``,
    '',
    '## Rows',
    '',
    ...rows.map((row) => `- local=\`${row.local || 'NONE'}\` remote=\`${row.remote || 'NONE'}\` time=\`${row.time_utc || 'NONE'}\``),
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, `${report}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main();
