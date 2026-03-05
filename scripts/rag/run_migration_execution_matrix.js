#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const STATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_supabase_migration_state.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_migration_execution_matrix.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_migration_execution_matrix.md');

function normalizeSqlForEquivalence(sql) {
  return String(sql || '')
    .replace(/\r\n/g, '\n')
    .replace(/(?:;\s*)+$/u, '')
    .trim();
}

function findEquivalentAppliedMigration(fileName, currentVersion, state, allFiles) {
  const currentPath = path.join(MIGRATIONS_DIR, fileName);
  if (!fs.existsSync(currentPath)) {
    return null;
  }

  const currentSql = normalizeSqlForEquivalence(fs.readFileSync(currentPath, 'utf8'));
  const appliedVersions = new Set(
    stateRowsToAppliedVersions(state).filter((version) => version !== currentVersion),
  );

  for (const candidate of allFiles) {
    const match = candidate.match(/^(\d{14})_/);
    const candidateVersion = match ? match[1] : null;
    if (!candidateVersion || !appliedVersions.has(candidateVersion)) {
      continue;
    }
    const candidatePath = path.join(MIGRATIONS_DIR, candidate);
    if (!fs.existsSync(candidatePath)) {
      continue;
    }
    const candidateSql = normalizeSqlForEquivalence(fs.readFileSync(candidatePath, 'utf8'));
    if (candidateSql === currentSql) {
      return {
        version: candidateVersion,
        file_name: candidate,
      };
    }
  }

  return null;
}

function stateRowsToAppliedVersions(state) {
  const localOnly = new Set(state.local_only_migrations || []);
  const remoteOnly = new Set(state.remote_only_migrations || []);
  const versions = [];

  for (const fileName of fs.readdirSync(MIGRATIONS_DIR)) {
    const match = fileName.match(/^(\d{14})_/);
    if (!match) continue;
    const version = match[1];
    if (!localOnly.has(version) || remoteOnly.has(version)) {
      versions.push(version);
    }
  }

  return versions;
}

function classifyLocalMigration(version, fileName, remoteOnlyMigrations, state, allFiles) {
  const lower = fileName.toLowerCase();
  const equivalentApplied = findEquivalentAppliedMigration(fileName, version, state, allFiles);

  if (equivalentApplied) {
    return {
      execution_class: 'unsafe_blocked',
      risk_level: 'high',
      directly_related_to_canonical_rollout: false,
      duplicate_of_version: equivalentApplied.version,
      reason: `local-only migration is semantically equivalent to already-applied migration ${equivalentApplied.version} and should be reconciled via migration history repair or retirement, not pushed again`,
    };
  }

  if (version === '20260302190000') {
    return {
      execution_class: remoteOnlyMigrations.length > 0 ? 'unsafe_blocked' : 'safe_but_requires_human_confirmation',
      risk_level: 'high',
      directly_related_to_canonical_rollout: true,
      reason: remoteOnlyMigrations.length > 0
        ? 'canonical contract migration is additive, but the current migration graph is diverged and includes remote-only history'
        : 'canonical contract migration is additive but still changes the remote DB schema',
    };
  }

  if (lower.includes('evidence') || lower.includes('marking')) {
    return {
      execution_class: 'unsafe_blocked',
      risk_level: 'high',
      directly_related_to_canonical_rollout: false,
      reason: 'unrelated domain migration must not be bundled into a corpus rollout action',
    };
  }

  return {
    execution_class: 'safe_but_requires_human_confirmation',
    risk_level: 'medium',
    directly_related_to_canonical_rollout: false,
    reason: 'migration is not part of the current canonical rollout and requires human review before remote application',
  };
}

function main() {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const allFiles = fs.readdirSync(MIGRATIONS_DIR);
  const localEntries = state.local_only_migrations.map((version) => {
    const fileName = allFiles.find((name) => name.startsWith(version)) || `${version}_UNKNOWN.sql`;
    return {
      version,
      file_name: fileName,
      ...classifyLocalMigration(version, fileName, state.remote_only_migrations || [], state, allFiles),
    };
  });

  const remoteEntries = (state.remote_only_migrations || []).map((version) => ({
    version,
    execution_class: 'unsafe_blocked',
    risk_level: 'high',
    directly_related_to_canonical_rollout: false,
    reason: 'remote-only migration is unknown locally and blocks automatic rollout',
  }));

  const summary = {
    generated_at: new Date().toISOString(),
    migration_state_status: state.status,
    local_only: localEntries,
    remote_only: remoteEntries,
    rollout_decision: localEntries.some((entry) => entry.execution_class === 'unsafe_blocked') || remoteEntries.length > 0
      ? 'unsafe_blocked'
      : 'safe_but_requires_human_confirmation',
  };

  const report = [
    '# RAG Migration Execution Matrix',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- migration_state_status: \`${summary.migration_state_status}\``,
    `- rollout_decision: \`${summary.rollout_decision}\``,
    '',
    '## Local Only',
    '',
    ...summary.local_only.map((entry) => {
      const duplicateNote = entry.duplicate_of_version ? ` | duplicate_of=\`${entry.duplicate_of_version}\`` : '';
      return `- \`${entry.version}\` | \`${entry.file_name}\` | \`${entry.execution_class}\` | related=\`${entry.directly_related_to_canonical_rollout}\`${duplicateNote} | ${entry.reason}`;
    }),
    '',
    '## Remote Only',
    '',
    ...summary.remote_only.map((entry) => `- \`${entry.version}\` | \`${entry.execution_class}\` | ${entry.reason}`),
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, `${report}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main();
