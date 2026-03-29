import path from 'node:path';

import {
  CONTROL_PLANE_DEFAULT_CONTROLLER_ID,
  CONTROL_PLANE_LATEST_VERSION,
  createControlPlaneAuditEntry,
  createControlPlaneSchema,
  createControllerModeRecord,
  createEmptyControlPlaneState,
} from './state-contracts.js';
import { appendControlPlaneAuditEntry } from './state-audit.js';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomic,
} from './state-storage.js';

export const CONTROL_PLANE_BOOTSTRAP_MIGRATION = {
  version: 1,
  key: '0001_bootstrap_control_plane_v1',
};

function resolveNow(now) {
  if (typeof now === 'function') return resolveNow(now());
  if (typeof now === 'string' && now.trim() !== '') return now.trim();
  return new Date().toISOString();
}

function cloneJsonValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeProjectId(projectId) {
  if (typeof projectId !== 'string') {
    throw new Error('Invalid projectId');
  }

  const normalizedProjectId = projectId.trim();
  if (!/^[A-Za-z0-9._-]+$/.test(normalizedProjectId)) {
    throw new Error('Invalid projectId');
  }

  return normalizedProjectId;
}

function buildDefaultControllerMode(now) {
  return createControllerModeRecord({
    controller_id: CONTROL_PLANE_DEFAULT_CONTROLLER_ID,
    mode: 'off',
    updated_at: now,
    updated_by: 'bootstrap',
    reason: 'Initialized repo-local AO control-plane state.',
  });
}

function buildMigratedState({
  projectId,
  now,
  existingState,
} = {}) {
  const state = createEmptyControlPlaneState({
    project_id: projectId,
    created_at: existingState?.created_at ?? now,
    updated_at: now,
  });

  for (const collectionKey of [
    'managed_tasks',
    'pr_bindings',
    'ownership_leases',
    'controller_leases',
    'actions',
    'overrides',
    'controller_modes',
  ]) {
    if (Array.isArray(existingState?.[collectionKey])) {
      state[collectionKey] = cloneJsonValue(existingState[collectionKey]);
    }
  }

  if (!state.controller_modes.length) {
    state.controller_modes.push(buildDefaultControllerMode(now));
  }

  return state;
}

export function resolveControlPlanePaths({
  repoRoot,
  projectId,
} = {}) {
  const normalizedRepoRoot = path.resolve(String(repoRoot));
  const normalizedProjectId = normalizeProjectId(projectId);
  const stateRoot = path.join(normalizedRepoRoot, '.ao-control-plane', normalizedProjectId);

  return {
    repoRoot: normalizedRepoRoot,
    stateRoot,
    schemaPath: path.join(stateRoot, 'schema.json'),
    statePath: path.join(stateRoot, 'state.json'),
    auditPath: path.join(stateRoot, 'audit-log.jsonl'),
  };
}

export function readControlPlaneSchema({ schemaPath } = {}) {
  return readJsonFile(schemaPath);
}

export function readControlPlaneState({ statePath } = {}) {
  return readJsonFile(statePath);
}

export function bootstrapControlPlaneState({
  repoRoot,
  projectId,
  now,
} = {}) {
  const paths = resolveControlPlanePaths({
    repoRoot,
    projectId,
  });
  ensureDirectory(paths.stateRoot);

  const existingSchema = readControlPlaneSchema({ schemaPath: paths.schemaPath });
  const existingState = readControlPlaneState({ statePath: paths.statePath });
  const currentVersion = Number(existingSchema?.current_version ?? 0);
  const isCurrent = currentVersion >= CONTROL_PLANE_LATEST_VERSION
    && existingSchema != null
    && existingState != null;

  if (isCurrent) {
    return {
      bootstrapped: true,
      migrated: false,
      state_root: paths.stateRoot,
      schema: existingSchema,
      state: existingState,
    };
  }

  const timestamp = resolveNow(now);
  const appliedMigration = {
    version: CONTROL_PLANE_BOOTSTRAP_MIGRATION.version,
    key: CONTROL_PLANE_BOOTSTRAP_MIGRATION.key,
    applied_at: timestamp,
  };
  const nextState = buildMigratedState({
    projectId,
    now: timestamp,
    existingState,
  });
  const priorMigrations = Array.isArray(existingSchema?.applied_migrations)
    ? existingSchema.applied_migrations.filter(
        (migration) => Number(migration?.version) !== CONTROL_PLANE_BOOTSTRAP_MIGRATION.version,
      )
    : [];
  const nextSchema = createControlPlaneSchema({
    project_id: projectId,
    current_version: CONTROL_PLANE_LATEST_VERSION,
    latest_version: CONTROL_PLANE_LATEST_VERSION,
    created_at: existingSchema?.created_at ?? timestamp,
    updated_at: timestamp,
    applied_migrations: [...priorMigrations, appliedMigration],
  });

  writeJsonFileAtomic(paths.schemaPath, nextSchema);
  writeJsonFileAtomic(paths.statePath, nextState);
  appendControlPlaneAuditEntry({
    auditPath: paths.auditPath,
    entry: createControlPlaneAuditEntry({
      audit_id: `migration-${CONTROL_PLANE_BOOTSTRAP_MIGRATION.version}`,
      project_id: projectId,
      recorded_at: timestamp,
      entity_kind: 'schema',
      entity_id: `v${CONTROL_PLANE_BOOTSTRAP_MIGRATION.version}`,
      operation: 'bootstrap',
      actor: 'bootstrap',
      summary: 'Applied control-plane bootstrap migration.',
      details: {
        migration_key: CONTROL_PLANE_BOOTSTRAP_MIGRATION.key,
        migration_version: CONTROL_PLANE_BOOTSTRAP_MIGRATION.version,
      },
    }),
  });

  return {
    bootstrapped: true,
    migrated: true,
    state_root: paths.stateRoot,
    schema: nextSchema,
    state: nextState,
  };
}
