import { createTaskSpecSnapshot } from './task-spec.js';

export const CONTROL_PLANE_SCHEMA_VERSION = 'ao.control-plane.schema.v1alpha1';
export const CONTROL_PLANE_SCHEMA_FORMAT = 'ao_control_plane_schema';
export const CONTROL_PLANE_STATE_SCHEMA_VERSION = 'ao.control-plane.state.v1alpha1';
export const CONTROL_PLANE_STATE_FORMAT = 'ao_control_plane_state';
export const CONTROL_PLANE_AUDIT_SCHEMA_VERSION = 'ao.control-plane.audit.v1alpha1';
export const CONTROL_PLANE_AUDIT_FORMAT = 'ao_control_plane_audit_entry';
export const CONTROL_PLANE_LATEST_VERSION = 2;
export const CONTROL_PLANE_DEFAULT_CONTROLLER_ID = 'default';

export const MANAGED_TASK_STATUSES = ['active', 'paused', 'retired'];
export const PR_BINDING_STATUSES = ['bound', 'released', 'closed'];
export const OWNERSHIP_LEASE_STATUSES = ['active', 'released', 'expired'];
export const CONTROLLER_LEASE_STATUSES = ['active', 'released', 'expired'];
export const ACTION_STATUSES = ['proposed', 'blocked', 'executed', 'cancelled'];
export const OVERRIDE_SCOPE_KINDS = ['global', 'task', 'pr', 'controller'];
export const OVERRIDE_STATUSES = ['active', 'cleared', 'expired'];
export const CONTROLLER_MODES = ['off', 'observe', 'shadow', 'assist'];
export const OBSERVATION_SOURCE_KINDS = ['ao_poll', 'github_poll'];
export const TASK_SPEC_RECORD_STATES = ['valid', 'invalid'];

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJsonValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeRequiredString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${fieldName}`);
  }

  return value.trim();
}

function normalizeOptionalString(value) {
  if (value == null) return null;
  if (typeof value !== 'string') {
    throw new Error('Expected string or null');
  }

  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function normalizePositiveInteger(value, fieldName, { nullable = false, allowZero = false } = {}) {
  if (value == null && nullable) return null;

  const normalized = Number(value);
  const minimumValue = allowZero ? 0 : 1;
  if (!Number.isInteger(normalized) || normalized < minimumValue) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return normalized;
}

function normalizeIsoTimestamp(value, fieldName, { nullable = false } = {}) {
  if (value == null && nullable) return null;
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}`);
  }

  const normalized = value.trim();
  if (normalized === '') {
    if (nullable) return null;
    throw new Error(`Invalid ${fieldName}`);
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return normalized;
}

function normalizeEnum(value, fieldName, allowedValues) {
  const normalized = normalizeRequiredString(value, fieldName);
  if (!allowedValues.includes(normalized)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return normalized;
}

function normalizeMetadata(value = {}) {
  if (value == null) return {};
  if (!isPlainObject(value)) {
    throw new Error('Invalid metadata');
  }

  return cloneJsonValue(value);
}

export function createControlPlaneSchema({
  project_id,
  current_version,
  latest_version = CONTROL_PLANE_LATEST_VERSION,
  created_at,
  updated_at,
  applied_migrations = [],
} = {}) {
  return {
    schema_version: CONTROL_PLANE_SCHEMA_VERSION,
    format: CONTROL_PLANE_SCHEMA_FORMAT,
    project_id: normalizeRequiredString(project_id, 'project_id'),
    current_version: normalizePositiveInteger(current_version, 'current_version', {
      nullable: current_version == null,
      allowZero: true,
    }),
    latest_version: normalizePositiveInteger(latest_version, 'latest_version'),
    created_at: normalizeIsoTimestamp(created_at, 'created_at', { nullable: true }),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at', { nullable: true }),
    applied_migrations: (applied_migrations ?? []).map((migration) => ({
      version: normalizePositiveInteger(migration?.version, 'migration.version'),
      key: normalizeRequiredString(migration?.key, 'migration.key'),
      applied_at: normalizeIsoTimestamp(migration?.applied_at, 'migration.applied_at'),
    })),
  };
}

export function createEmptyControlPlaneState({
  project_id,
  created_at,
  updated_at,
} = {}) {
  return {
    schema_version: CONTROL_PLANE_STATE_SCHEMA_VERSION,
    format: CONTROL_PLANE_STATE_FORMAT,
    project_id: normalizeRequiredString(project_id, 'project_id'),
    created_at: normalizeIsoTimestamp(created_at, 'created_at', { nullable: true }),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at', { nullable: true }),
    managed_tasks: [],
    pr_bindings: [],
    ownership_leases: [],
    controller_leases: [],
    actions: [],
    overrides: [],
    controller_modes: [],
    observations: [],
    controller_cursors: [],
    task_specs: [],
  };
}

export function createManagedTask({
  task_id,
  issue_number = null,
  title,
  branch_name = null,
  worktree_path = null,
  status,
  created_at,
  updated_at,
  metadata = {},
} = {}) {
  return {
    task_id: normalizeRequiredString(task_id, 'task_id'),
    issue_number: normalizePositiveInteger(issue_number, 'issue_number', { nullable: true }),
    title: normalizeRequiredString(title, 'title'),
    branch_name: normalizeOptionalString(branch_name),
    worktree_path: normalizeOptionalString(worktree_path),
    status: normalizeEnum(status, 'status', MANAGED_TASK_STATUSES),
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    metadata: normalizeMetadata(metadata),
  };
}

export function createPrBinding({
  binding_id,
  task_id,
  pr_number,
  branch_name = null,
  base_branch = null,
  status,
  created_at,
  updated_at,
  metadata = {},
} = {}) {
  return {
    binding_id: normalizeRequiredString(binding_id, 'binding_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    pr_number: normalizePositiveInteger(pr_number, 'pr_number'),
    branch_name: normalizeOptionalString(branch_name),
    base_branch: normalizeOptionalString(base_branch),
    status: normalizeEnum(status, 'status', PR_BINDING_STATUSES),
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    metadata: normalizeMetadata(metadata),
  };
}

export function createOwnershipLease({
  lease_id,
  task_id,
  owner_session_name,
  owner_session_id = null,
  status,
  acquired_at,
  expires_at,
  released_at = null,
  release_reason = null,
  metadata = {},
} = {}) {
  return {
    lease_id: normalizeRequiredString(lease_id, 'lease_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    owner_session_name: normalizeRequiredString(owner_session_name, 'owner_session_name'),
    owner_session_id: normalizeOptionalString(owner_session_id),
    status: normalizeEnum(status, 'status', OWNERSHIP_LEASE_STATUSES),
    acquired_at: normalizeIsoTimestamp(acquired_at, 'acquired_at'),
    expires_at: normalizeIsoTimestamp(expires_at, 'expires_at'),
    released_at: normalizeIsoTimestamp(released_at, 'released_at', { nullable: true }),
    release_reason: normalizeOptionalString(release_reason),
    metadata: normalizeMetadata(metadata),
  };
}

export function createControllerLease({
  lease_id,
  controller_id,
  holder_id,
  holder_type,
  status,
  acquired_at,
  expires_at,
  released_at = null,
  release_reason = null,
  metadata = {},
} = {}) {
  return {
    lease_id: normalizeRequiredString(lease_id, 'lease_id'),
    controller_id: normalizeRequiredString(controller_id, 'controller_id'),
    holder_id: normalizeRequiredString(holder_id, 'holder_id'),
    holder_type: normalizeRequiredString(holder_type, 'holder_type'),
    status: normalizeEnum(status, 'status', CONTROLLER_LEASE_STATUSES),
    acquired_at: normalizeIsoTimestamp(acquired_at, 'acquired_at'),
    expires_at: normalizeIsoTimestamp(expires_at, 'expires_at'),
    released_at: normalizeIsoTimestamp(released_at, 'released_at', { nullable: true }),
    release_reason: normalizeOptionalString(release_reason),
    metadata: normalizeMetadata(metadata),
  };
}

export function createActionRecord({
  action_id,
  task_id = null,
  action_kind,
  status,
  requested_by = null,
  reason = null,
  created_at,
  updated_at,
  payload = {},
} = {}) {
  return {
    action_id: normalizeRequiredString(action_id, 'action_id'),
    task_id: normalizeOptionalString(task_id),
    action_kind: normalizeRequiredString(action_kind, 'action_kind'),
    status: normalizeEnum(status, 'status', ACTION_STATUSES),
    requested_by: normalizeOptionalString(requested_by),
    reason: normalizeOptionalString(reason),
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    payload: cloneJsonValue(payload ?? {}),
  };
}

export function createOverrideRecord({
  override_id,
  scope_kind,
  scope_id,
  override_kind,
  value,
  status,
  created_at,
  expires_at = null,
  cleared_at = null,
  cleared_reason = null,
  created_by = null,
} = {}) {
  return {
    override_id: normalizeRequiredString(override_id, 'override_id'),
    scope_kind: normalizeEnum(scope_kind, 'scope_kind', OVERRIDE_SCOPE_KINDS),
    scope_id: normalizeRequiredString(scope_id, 'scope_id'),
    override_kind: normalizeRequiredString(override_kind, 'override_kind'),
    value: cloneJsonValue(value),
    status: normalizeEnum(status, 'status', OVERRIDE_STATUSES),
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    expires_at: normalizeIsoTimestamp(expires_at, 'expires_at', { nullable: true }),
    cleared_at: normalizeIsoTimestamp(cleared_at, 'cleared_at', { nullable: true }),
    cleared_reason: normalizeOptionalString(cleared_reason),
    created_by: normalizeOptionalString(created_by),
  };
}

export function createControllerModeRecord({
  controller_id,
  mode,
  updated_at,
  updated_by = null,
  reason = null,
} = {}) {
  return {
    controller_id: normalizeRequiredString(controller_id, 'controller_id'),
    mode: normalizeEnum(mode, 'mode', CONTROLLER_MODES),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    updated_by: normalizeOptionalString(updated_by),
    reason: normalizeOptionalString(reason),
  };
}

export function createObservationRecord({
  observation_id,
  task_id,
  source_kind,
  cursor,
  observed_at,
  recorded_at,
  summary = null,
  payload = {},
} = {}) {
  return {
    observation_id: normalizeRequiredString(observation_id, 'observation_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    source_kind: normalizeEnum(source_kind, 'source_kind', OBSERVATION_SOURCE_KINDS),
    cursor: normalizeRequiredString(cursor, 'cursor'),
    observed_at: normalizeIsoTimestamp(observed_at, 'observed_at'),
    recorded_at: normalizeIsoTimestamp(recorded_at, 'recorded_at'),
    summary: normalizeOptionalString(summary),
    payload: cloneJsonValue(payload ?? {}),
  };
}

export function createControllerCursorRecord({
  cursor_id,
  controller_id,
  task_id,
  source_kind,
  last_cursor,
  observed_at,
  updated_at,
} = {}) {
  return {
    cursor_id: normalizeRequiredString(cursor_id, 'cursor_id'),
    controller_id: normalizeRequiredString(controller_id, 'controller_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    source_kind: normalizeEnum(source_kind, 'source_kind', OBSERVATION_SOURCE_KINDS),
    last_cursor: normalizeRequiredString(last_cursor, 'last_cursor'),
    observed_at: normalizeIsoTimestamp(observed_at, 'observed_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
  };
}

export function createTaskSpecRecord({
  task_id,
  source_kind,
  source_issue_number = null,
  created_at,
  updated_at,
  snapshot,
} = {}) {
  const normalizedSnapshot = createTaskSpecSnapshot({
    schema_version: snapshot?.schema_version,
    problem_type: snapshot?.spec?.problem_type,
    acceptance_contract: snapshot?.spec?.acceptance_contract,
    runtime_ref: snapshot?.spec?.runtime_ref,
    policy_ref: snapshot?.spec?.policy_ref,
    human_gates: snapshot?.spec?.human_gates,
  });

  return {
    task_id: normalizeRequiredString(task_id, 'task_id'),
    source_kind: normalizeRequiredString(source_kind, 'source_kind'),
    source_issue_number: normalizePositiveInteger(source_issue_number, 'source_issue_number', {
      nullable: true,
    }),
    state: normalizedSnapshot.valid ? 'valid' : 'invalid',
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    snapshot: normalizedSnapshot,
  };
}

export function createControlPlaneAuditEntry({
  audit_id,
  project_id,
  recorded_at,
  entity_kind,
  entity_id,
  operation,
  actor,
  summary,
  details = {},
} = {}) {
  return {
    schema_version: CONTROL_PLANE_AUDIT_SCHEMA_VERSION,
    format: CONTROL_PLANE_AUDIT_FORMAT,
    audit_id: normalizeRequiredString(audit_id, 'audit_id'),
    project_id: normalizeRequiredString(project_id, 'project_id'),
    recorded_at: normalizeIsoTimestamp(recorded_at, 'recorded_at'),
    entity_kind: normalizeRequiredString(entity_kind, 'entity_kind'),
    entity_id: normalizeRequiredString(entity_id, 'entity_id'),
    operation: normalizeRequiredString(operation, 'operation'),
    actor: normalizeRequiredString(actor, 'actor'),
    summary: normalizeRequiredString(summary, 'summary'),
    details: cloneJsonValue(details ?? {}),
  };
}
