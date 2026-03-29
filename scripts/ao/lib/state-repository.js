import { randomUUID } from 'node:crypto';

import {
  CONTROL_PLANE_LATEST_VERSION,
  createActionRecord,
  createControlPlaneAuditEntry,
  createControlPlaneSchema,
  createControllerLease,
  createControllerModeRecord,
  createControllerCursorRecord,
  createEmptyControlPlaneState,
  createManagedTask,
  createObservationRecord,
  createOverrideRecord,
  createOwnershipLease,
  createPrBinding,
} from './state-contracts.js';
import { appendControlPlaneAuditEntry, readControlPlaneAuditEntries } from './state-audit.js';
import {
  bootstrapControlPlaneState,
  readControlPlaneSchema,
  readControlPlaneState,
  resolveControlPlanePaths,
} from './state-migrations.js';
import { writeJsonFileAtomic } from './state-storage.js';

function resolveNow(clock) {
  if (typeof clock === 'function') return resolveNow(clock());
  if (typeof clock === 'string' && clock.trim() !== '') return clock.trim();
  return new Date().toISOString();
}

function cloneJsonValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function buildVirtualSchema(projectId) {
  return createControlPlaneSchema({
    project_id: projectId,
    current_version: 0,
    latest_version: CONTROL_PLANE_LATEST_VERSION,
    created_at: null,
    updated_at: null,
    applied_migrations: [],
  });
}

function buildVirtualState(projectId) {
  return createEmptyControlPlaneState({
    project_id: projectId,
    created_at: null,
    updated_at: null,
  });
}

function sortCollectionByKey(items, key) {
  return [...(items ?? [])].sort((left, right) => String(left?.[key] ?? '').localeCompare(String(right?.[key] ?? '')));
}

export function createStateRepository({
  repoRoot,
  projectId,
  clock = () => new Date().toISOString(),
  auditIdGenerator = randomUUID,
} = {}) {
  const paths = resolveControlPlanePaths({
    repoRoot,
    projectId,
  });

  function readSnapshot() {
    const schema = readControlPlaneSchema({ schemaPath: paths.schemaPath });
    const state = readControlPlaneState({ statePath: paths.statePath });

    if (!schema || !state) {
      return {
        bootstrapped: false,
        schema: buildVirtualSchema(projectId),
        state: buildVirtualState(projectId),
        paths,
      };
    }

    const nextState = cloneJsonValue(state);
    nextState.managed_tasks = sortCollectionByKey(nextState.managed_tasks, 'task_id');
    nextState.pr_bindings = sortCollectionByKey(nextState.pr_bindings, 'binding_id');
    nextState.ownership_leases = sortCollectionByKey(nextState.ownership_leases, 'lease_id');
    nextState.controller_leases = sortCollectionByKey(nextState.controller_leases, 'lease_id');
    nextState.actions = sortCollectionByKey(nextState.actions, 'action_id');
    nextState.overrides = sortCollectionByKey(nextState.overrides, 'override_id');
    nextState.controller_modes = sortCollectionByKey(nextState.controller_modes, 'controller_id');
    nextState.observations = sortCollectionByKey(nextState.observations, 'observation_id');
    nextState.controller_cursors = sortCollectionByKey(nextState.controller_cursors, 'cursor_id');

    return {
      bootstrapped: true,
      schema,
      state: nextState,
      paths,
    };
  }

  function ensureBootstrapped() {
    bootstrapControlPlaneState({
      repoRoot,
      projectId,
      now: clock,
    });
  }

  function persistState({
    state,
    entityKind,
    entityId,
    summary,
    details,
  } = {}) {
    const recordedAt = resolveNow(clock);
    const nextState = cloneJsonValue(state);
    nextState.updated_at = recordedAt;
    writeJsonFileAtomic(paths.statePath, nextState);
    appendControlPlaneAuditEntry({
      auditPath: paths.auditPath,
      entry: createControlPlaneAuditEntry({
        audit_id: auditIdGenerator(),
        project_id: projectId,
        recorded_at: recordedAt,
        entity_kind: entityKind,
        entity_id: entityId,
        operation: 'upsert',
        actor: 'state_repository',
        summary,
        details,
      }),
    });
  }

  function upsertCollectionRecord({
    collectionKey,
    identityKey,
    entityKind,
    record,
    normalize,
    summary,
  } = {}) {
    ensureBootstrapped();
    const snapshot = readSnapshot();
    const nextState = cloneJsonValue(snapshot.state);
    const normalizedRecord = normalize(record);
    const existingIndex = nextState[collectionKey].findIndex(
      (entry) => entry?.[identityKey] === normalizedRecord[identityKey],
    );

    if (existingIndex >= 0) {
      nextState[collectionKey][existingIndex] = normalizedRecord;
    } else {
      nextState[collectionKey].push(normalizedRecord);
    }

    persistState({
      state: nextState,
      entityKind,
      entityId: normalizedRecord[identityKey],
      summary,
      details: normalizedRecord,
    });

    return normalizedRecord;
  }

  return {
    getSnapshot() {
      return readSnapshot();
    },

    listAuditEntries({ limit = null } = {}) {
      return readControlPlaneAuditEntries({
        auditPath: paths.auditPath,
        limit,
      });
    },

    upsertManagedTask(record) {
      return upsertCollectionRecord({
        collectionKey: 'managed_tasks',
        identityKey: 'task_id',
        entityKind: 'managed_task',
        record,
        normalize: createManagedTask,
        summary: `Persisted managed task ${record?.task_id}.`,
      });
    },

    upsertPrBinding(record) {
      return upsertCollectionRecord({
        collectionKey: 'pr_bindings',
        identityKey: 'binding_id',
        entityKind: 'pr_binding',
        record,
        normalize: createPrBinding,
        summary: `Persisted PR binding ${record?.binding_id}.`,
      });
    },

    upsertOwnershipLease(record) {
      return upsertCollectionRecord({
        collectionKey: 'ownership_leases',
        identityKey: 'lease_id',
        entityKind: 'ownership_lease',
        record,
        normalize: createOwnershipLease,
        summary: `Persisted ownership lease ${record?.lease_id}.`,
      });
    },

    upsertControllerLease(record) {
      return upsertCollectionRecord({
        collectionKey: 'controller_leases',
        identityKey: 'lease_id',
        entityKind: 'controller_lease',
        record,
        normalize: createControllerLease,
        summary: `Persisted controller lease ${record?.lease_id}.`,
      });
    },

    upsertAction(record) {
      return upsertCollectionRecord({
        collectionKey: 'actions',
        identityKey: 'action_id',
        entityKind: 'action',
        record,
        normalize: createActionRecord,
        summary: `Persisted action ${record?.action_id}.`,
      });
    },

    upsertOverride(record) {
      return upsertCollectionRecord({
        collectionKey: 'overrides',
        identityKey: 'override_id',
        entityKind: 'override',
        record,
        normalize: createOverrideRecord,
        summary: `Persisted override ${record?.override_id}.`,
      });
    },

    upsertControllerMode(record) {
      return upsertCollectionRecord({
        collectionKey: 'controller_modes',
        identityKey: 'controller_id',
        entityKind: 'controller_mode',
        record,
        normalize: createControllerModeRecord,
        summary: `Persisted controller mode ${record?.controller_id}.`,
      });
    },

    upsertObservation(record) {
      return upsertCollectionRecord({
        collectionKey: 'observations',
        identityKey: 'observation_id',
        entityKind: 'observation',
        record,
        normalize: createObservationRecord,
        summary: `Persisted observation ${record?.observation_id}.`,
      });
    },

    upsertControllerCursor(record) {
      return upsertCollectionRecord({
        collectionKey: 'controller_cursors',
        identityKey: 'cursor_id',
        entityKind: 'controller_cursor',
        record,
        normalize: createControllerCursorRecord,
        summary: `Persisted controller cursor ${record?.cursor_id}.`,
      });
    },
  };
}
