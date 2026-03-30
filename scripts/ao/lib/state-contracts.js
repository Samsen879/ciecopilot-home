import { createRuntimePreflightSnapshot } from './runtime-contracts.js';
import { createTaskSpecSnapshot } from './task-spec.js';

export const CONTROL_PLANE_SCHEMA_VERSION = 'ao.control-plane.schema.v1alpha1';
export const CONTROL_PLANE_SCHEMA_FORMAT = 'ao_control_plane_schema';
export const CONTROL_PLANE_STATE_SCHEMA_VERSION = 'ao.control-plane.state.v1alpha1';
export const CONTROL_PLANE_STATE_FORMAT = 'ao_control_plane_state';
export const CONTROL_PLANE_AUDIT_SCHEMA_VERSION = 'ao.control-plane.audit.v1alpha1';
export const CONTROL_PLANE_AUDIT_FORMAT = 'ao_control_plane_audit_entry';
export const CONTROL_PLANE_LATEST_VERSION = 7;
export const CONTROL_PLANE_DEFAULT_CONTROLLER_ID = 'default';
export const CHECKPOINT_SCHEMA_VERSION = 'ao.checkpoint.v1alpha1';
export const CHECKPOINT_FORMAT = 'ao_checkpoint';
export const HANDOFF_REQUEST_SCHEMA_VERSION = 'ao.handoff-request.v1alpha1';
export const HANDOFF_REQUEST_FORMAT = 'ao_handoff_request';
export const HANDOFF_CLAIM_SCHEMA_VERSION = 'ao.handoff-claim.v1alpha1';
export const HANDOFF_CLAIM_FORMAT = 'ao_handoff_claim';
export const HANDOFF_DECISION_SCHEMA_VERSION = 'ao.handoff-decision.v1alpha1';
export const HANDOFF_DECISION_FORMAT = 'ao_handoff_decision';
export const HANDOFF_TRANSFER_SCHEMA_VERSION = 'ao.handoff-transfer.v1alpha1';
export const HANDOFF_TRANSFER_FORMAT = 'ao_handoff_transfer';

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
export const DELIVERY_EVENT_FAMILIES = ['pr', 'check', 'review', 'review_comment'];
export const POLICY_DECISIONS = ['allow', 'deny', 'downgrade'];
export const CREDENTIAL_PROVENANCE_TRUST_DECISIONS = ['trusted', 'untrusted'];
export const HANDOFF_REQUEST_STATUSES = ['open', 'accepted', 'rejected', 'expired', 'completed'];
export const HANDOFF_CLAIM_STATUSES = ['pending', 'blocked', 'accepted', 'rejected', 'expired'];
export const HANDOFF_DECISION_OUTCOMES = ['accept', 'reject', 'expire'];

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

function normalizeStringArray(values, fieldName) {
  if (!Array.isArray(values)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return values.map((value, index) => normalizeRequiredString(value, `${fieldName}[${index}]`));
}

function normalizeMetadata(value = {}) {
  if (value == null) return {};
  if (!isPlainObject(value)) {
    throw new Error('Invalid metadata');
  }

  return cloneJsonValue(value);
}

function normalizeLineage(value = {}) {
  if (!isPlainObject(value)) {
    throw new Error('Invalid lineage');
  }

  return {
    source_observation_id: normalizeRequiredString(
      value.source_observation_id,
      'lineage.source_observation_id',
    ),
    source_cursor: normalizeRequiredString(value.source_cursor, 'lineage.source_cursor'),
  };
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
    delivery_events: [],
    controller_cursors: [],
    policy_decisions: [],
    credential_provenances: [],
    task_specs: [],
    runtime_preflights: [],
    checkpoints: [],
    handoff_requests: [],
    handoff_claims: [],
    handoff_decisions: [],
    handoff_transfers: [],
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

export function createDeliveryEventRecord({
  event_id,
  task_id,
  pr_number = null,
  source_kind,
  event_family,
  event_type,
  dedupe_key,
  lifecycle_trigger = null,
  controller_action_hint = null,
  observed_at,
  recorded_at,
  lineage = {},
  payload = {},
} = {}) {
  return {
    event_id: normalizeRequiredString(event_id, 'event_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    pr_number: normalizePositiveInteger(pr_number, 'pr_number', { nullable: true }),
    source_kind: normalizeRequiredString(source_kind, 'source_kind'),
    event_family: normalizeEnum(event_family, 'event_family', DELIVERY_EVENT_FAMILIES),
    event_type: normalizeRequiredString(event_type, 'event_type'),
    dedupe_key: normalizeRequiredString(dedupe_key, 'dedupe_key'),
    lifecycle_trigger: normalizeOptionalString(lifecycle_trigger),
    controller_action_hint: normalizeOptionalString(controller_action_hint),
    observed_at: normalizeIsoTimestamp(observed_at, 'observed_at'),
    recorded_at: normalizeIsoTimestamp(recorded_at, 'recorded_at'),
    lineage: normalizeLineage(lineage),
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

function normalizePolicyFindings(findings = []) {
  if (!Array.isArray(findings)) {
    throw new Error('Invalid findings');
  }

  return findings.map((finding) => ({
    code: normalizeRequiredString(finding?.code, 'finding.code'),
    severity: normalizeEnum(finding?.severity, 'finding.severity', POLICY_DECISIONS),
    surface: normalizeRequiredString(finding?.surface, 'finding.surface'),
    value: normalizeRequiredString(finding?.value, 'finding.value'),
    detail: normalizeOptionalString(finding?.detail),
  }));
}

export function createCredentialProvenanceRecord({
  provenance_id,
  credential_kind,
  source_kind,
  trust_decision = 'trusted',
  scope = null,
  created_at,
  updated_at,
  metadata = {},
} = {}) {
  return {
    provenance_id: normalizeRequiredString(provenance_id, 'provenance_id'),
    credential_kind: normalizeRequiredString(credential_kind, 'credential_kind'),
    source_kind: normalizeRequiredString(source_kind, 'source_kind'),
    trust_decision: normalizeEnum(
      trust_decision,
      'trust_decision',
      CREDENTIAL_PROVENANCE_TRUST_DECISIONS,
    ),
    scope: normalizeOptionalString(scope),
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    metadata: normalizeMetadata(metadata),
  };
}

export function createPolicyDecisionRecord({
  decision_id,
  task_id,
  action_id = null,
  action_kind = null,
  subject_kind,
  decision,
  policy_version,
  input_fingerprint,
  recorded_at,
  summary = null,
  findings = [],
  input = {},
  result = {},
} = {}) {
  return {
    decision_id: normalizeRequiredString(decision_id, 'decision_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    action_id: normalizeOptionalString(action_id),
    action_kind: normalizeOptionalString(action_kind),
    subject_kind: normalizeRequiredString(subject_kind, 'subject_kind'),
    decision: normalizeEnum(decision, 'decision', POLICY_DECISIONS),
    policy_version: normalizeRequiredString(policy_version, 'policy_version'),
    input_fingerprint: normalizeRequiredString(input_fingerprint, 'input_fingerprint'),
    recorded_at: normalizeIsoTimestamp(recorded_at, 'recorded_at'),
    summary: normalizeOptionalString(summary),
    findings: normalizePolicyFindings(findings),
    input: cloneJsonValue(input ?? {}),
    result: cloneJsonValue(result ?? {}),
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

export function createRuntimePreflightRecord({
  recorded_at,
  snapshot,
} = {}) {
  const normalizedSnapshot = createRuntimePreflightSnapshot({
    runtime_ref: snapshot?.runtime_ref,
    provider_id: snapshot?.provider_id ?? null,
    observed_at: snapshot?.observed_at,
    status: snapshot?.status,
    contract: snapshot?.contract ?? null,
    checks: snapshot?.checks ?? [],
  });

  return {
    runtime_ref: normalizeRequiredString(normalizedSnapshot.runtime_ref, 'runtime_ref'),
    provider_id: normalizeOptionalString(normalizedSnapshot.provider_id),
    status: normalizeRequiredString(normalizedSnapshot.status, 'status'),
    observed_at: normalizeIsoTimestamp(normalizedSnapshot.observed_at, 'observed_at'),
    recorded_at: normalizeIsoTimestamp(recorded_at, 'recorded_at'),
    replay_key: normalizeRequiredString(normalizedSnapshot.replay_key, 'replay_key'),
    snapshot: normalizedSnapshot,
  };
}

function normalizeCheckpointPrBinding(value) {
  if (value == null) return null;
  if (!isPlainObject(value)) {
    throw new Error('Invalid checkpoint pr_binding');
  }

  return {
    binding_id: normalizeRequiredString(value.binding_id, 'pr_binding.binding_id'),
    pr_number: normalizePositiveInteger(value.pr_number, 'pr_binding.pr_number'),
    branch_name: normalizeOptionalString(value.branch_name),
    base_branch: normalizeOptionalString(value.base_branch),
    updated_at: normalizeIsoTimestamp(value.updated_at, 'pr_binding.updated_at'),
    status: normalizeRequiredString(value.status, 'pr_binding.status'),
  };
}

function normalizeCheckpointTaskRef(value = {}) {
  if (!isPlainObject(value)) {
    throw new Error('Invalid task_ref');
  }

  return {
    task_id: normalizeRequiredString(value.task_id, 'task_ref.task_id'),
    issue_number: normalizePositiveInteger(value.issue_number, 'task_ref.issue_number', {
      nullable: true,
    }),
    title: normalizeRequiredString(value.title, 'task_ref.title'),
    branch_name: normalizeOptionalString(value.branch_name),
    worktree_path: normalizeOptionalString(value.worktree_path),
    updated_at: normalizeIsoTimestamp(value.updated_at, 'task_ref.updated_at'),
    pr_binding: normalizeCheckpointPrBinding(value.pr_binding),
  };
}

function normalizeCheckpointTaskSpecRef(value) {
  if (value == null) return null;
  if (!isPlainObject(value)) {
    throw new Error('Invalid verification_ref.task_spec');
  }

  return {
    task_id: normalizeRequiredString(value.task_id, 'verification_ref.task_spec.task_id'),
    updated_at: normalizeIsoTimestamp(value.updated_at, 'verification_ref.task_spec.updated_at'),
    state: normalizeRequiredString(value.state, 'verification_ref.task_spec.state'),
    snapshot_schema_version: normalizeRequiredString(
      value.snapshot_schema_version,
      'verification_ref.task_spec.snapshot_schema_version',
    ),
  };
}

function normalizeCheckpointRuntimePreflightRef(value) {
  if (value == null) return null;
  if (!isPlainObject(value)) {
    throw new Error('Invalid verification_ref.runtime_preflight');
  }

  return {
    runtime_ref: normalizeRequiredString(
      value.runtime_ref,
      'verification_ref.runtime_preflight.runtime_ref',
    ),
    recorded_at: normalizeIsoTimestamp(
      value.recorded_at,
      'verification_ref.runtime_preflight.recorded_at',
    ),
    replay_key: normalizeRequiredString(
      value.replay_key,
      'verification_ref.runtime_preflight.replay_key',
    ),
    status: normalizeRequiredString(value.status, 'verification_ref.runtime_preflight.status'),
    snapshot_schema_version: normalizeRequiredString(
      value.snapshot_schema_version,
      'verification_ref.runtime_preflight.snapshot_schema_version',
    ),
  };
}

function normalizeCheckpointVerificationRef(value = {}) {
  if (!isPlainObject(value)) {
    throw new Error('Invalid verification_ref');
  }

  return {
    task_spec: normalizeCheckpointTaskSpecRef(value.task_spec),
    runtime_preflight: normalizeCheckpointRuntimePreflightRef(value.runtime_preflight),
  };
}

function normalizeCheckpointExecutionRef(value = {}) {
  if (!isPlainObject(value)) {
    throw new Error('Invalid execution_ref');
  }

  return {
    controller_id: normalizeRequiredString(value.controller_id, 'execution_ref.controller_id'),
    controller_mode: normalizeEnum(value.controller_mode, 'execution_ref.controller_mode', CONTROLLER_MODES),
    controller_mode_updated_at: normalizeIsoTimestamp(
      value.controller_mode_updated_at,
      'execution_ref.controller_mode_updated_at',
    ),
    derived_trigger: normalizeOptionalString(value.derived_trigger),
    lifecycle_top_status: normalizeOptionalString(value.lifecycle_top_status),
    observed_at: normalizeIsoTimestamp(value.observed_at, 'execution_ref.observed_at'),
    action_ids: normalizeStringArray(value.action_ids ?? [], 'execution_ref.action_ids'),
  };
}

export function createCheckpointSnapshot({
  schema_version = CHECKPOINT_SCHEMA_VERSION,
  format = CHECKPOINT_FORMAT,
  task_ref,
  verification_ref,
  execution_ref,
} = {}) {
  return {
    schema_version: normalizeRequiredString(schema_version, 'schema_version'),
    format: normalizeRequiredString(format, 'format'),
    task_ref: normalizeCheckpointTaskRef(task_ref),
    verification_ref: normalizeCheckpointVerificationRef(verification_ref),
    execution_ref: normalizeCheckpointExecutionRef(execution_ref),
  };
}

export function createCheckpointRecord({
  checkpoint_id,
  task_id,
  recorded_at,
  snapshot,
  created_by = null,
  reason = null,
  metadata = {},
} = {}) {
  const normalizedSnapshot = createCheckpointSnapshot({
    schema_version: snapshot?.schema_version,
    format: snapshot?.format,
    task_ref: snapshot?.task_ref,
    verification_ref: snapshot?.verification_ref,
    execution_ref: snapshot?.execution_ref,
  });
  const normalizedTaskId = normalizeRequiredString(task_id, 'task_id');

  if (normalizedTaskId !== normalizedSnapshot.task_ref.task_id) {
    throw new Error('Checkpoint task_id must match snapshot.task_ref.task_id');
  }

  return {
    checkpoint_id: normalizeRequiredString(checkpoint_id, 'checkpoint_id'),
    task_id: normalizedTaskId,
    recorded_at: normalizeIsoTimestamp(recorded_at, 'recorded_at'),
    created_by: normalizeOptionalString(created_by),
    reason: normalizeOptionalString(reason),
    metadata: normalizeMetadata(metadata),
    snapshot: normalizedSnapshot,
  };
}

function normalizeReasonCodes(reasonCodes = []) {
  return normalizeStringArray(reasonCodes ?? [], 'reason_codes');
}

function normalizeHandoffLineage(value = {}) {
  if (!isPlainObject(value)) {
    throw new Error('Invalid lineage');
  }

  return {
    checkpoint_id: normalizeRequiredString(value.checkpoint_id, 'lineage.checkpoint_id'),
    checkpoint_recorded_at: normalizeIsoTimestamp(
      value.checkpoint_recorded_at,
      'lineage.checkpoint_recorded_at',
    ),
    checkpoint_state: normalizeRequiredString(value.checkpoint_state, 'lineage.checkpoint_state'),
    prior_ownership_lease_id: normalizeOptionalString(value.prior_ownership_lease_id),
    prior_owner_session_name: normalizeOptionalString(value.prior_owner_session_name),
    prior_owner_session_id: normalizeOptionalString(value.prior_owner_session_id),
    prior_ownership_status: normalizeOptionalString(value.prior_ownership_status),
    pr_binding_id: normalizeOptionalString(value.pr_binding_id),
    pr_number: normalizePositiveInteger(value.pr_number, 'lineage.pr_number', { nullable: true }),
  };
}

export function createHandoffRequestRecord({
  request_id,
  task_id,
  status,
  created_at,
  updated_at,
  requested_by_session_name = null,
  requested_by_session_id = null,
  operator_session_name = null,
  operator_session_id = null,
  successor_session_name = null,
  successor_session_id = null,
  reason = null,
  expires_at = null,
  selected_claim_id = null,
  accepted_decision_id = null,
  completed_transfer_id = null,
  reason_codes = [],
  lineage,
  metadata = {},
} = {}) {
  return {
    schema_version: HANDOFF_REQUEST_SCHEMA_VERSION,
    format: HANDOFF_REQUEST_FORMAT,
    request_id: normalizeRequiredString(request_id, 'request_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    status: normalizeEnum(status, 'status', HANDOFF_REQUEST_STATUSES),
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    requested_by_session_name: normalizeOptionalString(requested_by_session_name),
    requested_by_session_id: normalizeOptionalString(requested_by_session_id),
    operator_session_name: normalizeOptionalString(operator_session_name),
    operator_session_id: normalizeOptionalString(operator_session_id),
    successor_session_name: normalizeOptionalString(successor_session_name),
    successor_session_id: normalizeOptionalString(successor_session_id),
    reason: normalizeOptionalString(reason),
    expires_at: normalizeIsoTimestamp(expires_at, 'expires_at', { nullable: true }),
    selected_claim_id: normalizeOptionalString(selected_claim_id),
    accepted_decision_id: normalizeOptionalString(accepted_decision_id),
    completed_transfer_id: normalizeOptionalString(completed_transfer_id),
    reason_codes: normalizeReasonCodes(reason_codes),
    lineage: normalizeHandoffLineage(lineage),
    metadata: normalizeMetadata(metadata),
  };
}

export function createHandoffClaimRecord({
  claim_id,
  request_id,
  task_id,
  status,
  created_at,
  updated_at,
  successor_session_name,
  successor_session_id = null,
  operator_session_name = null,
  operator_session_id = null,
  decision_id = null,
  reason = null,
  reason_codes = [],
  metadata = {},
} = {}) {
  return {
    schema_version: HANDOFF_CLAIM_SCHEMA_VERSION,
    format: HANDOFF_CLAIM_FORMAT,
    claim_id: normalizeRequiredString(claim_id, 'claim_id'),
    request_id: normalizeRequiredString(request_id, 'request_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    status: normalizeEnum(status, 'status', HANDOFF_CLAIM_STATUSES),
    created_at: normalizeIsoTimestamp(created_at, 'created_at'),
    updated_at: normalizeIsoTimestamp(updated_at, 'updated_at'),
    successor_session_name: normalizeRequiredString(successor_session_name, 'successor_session_name'),
    successor_session_id: normalizeOptionalString(successor_session_id),
    operator_session_name: normalizeOptionalString(operator_session_name),
    operator_session_id: normalizeOptionalString(operator_session_id),
    decision_id: normalizeOptionalString(decision_id),
    reason: normalizeOptionalString(reason),
    reason_codes: normalizeReasonCodes(reason_codes),
    metadata: normalizeMetadata(metadata),
  };
}

export function createHandoffDecisionRecord({
  decision_id,
  request_id,
  claim_id = null,
  task_id,
  outcome,
  decided_at,
  operator_session_name,
  operator_session_id = null,
  successor_session_name = null,
  successor_session_id = null,
  grant_expires_at = null,
  reason = null,
  reason_codes = [],
  metadata = {},
} = {}) {
  return {
    schema_version: HANDOFF_DECISION_SCHEMA_VERSION,
    format: HANDOFF_DECISION_FORMAT,
    decision_id: normalizeRequiredString(decision_id, 'decision_id'),
    request_id: normalizeRequiredString(request_id, 'request_id'),
    claim_id: normalizeOptionalString(claim_id),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    outcome: normalizeEnum(outcome, 'outcome', HANDOFF_DECISION_OUTCOMES),
    decided_at: normalizeIsoTimestamp(decided_at, 'decided_at'),
    operator_session_name: normalizeRequiredString(operator_session_name, 'operator_session_name'),
    operator_session_id: normalizeOptionalString(operator_session_id),
    successor_session_name: normalizeOptionalString(successor_session_name),
    successor_session_id: normalizeOptionalString(successor_session_id),
    grant_expires_at: normalizeIsoTimestamp(grant_expires_at, 'grant_expires_at', { nullable: true }),
    reason: normalizeOptionalString(reason),
    reason_codes: normalizeReasonCodes(reason_codes),
    metadata: normalizeMetadata(metadata),
  };
}

export function createHandoffTransferRecord({
  transfer_id,
  request_id,
  claim_id,
  decision_id,
  task_id,
  checkpoint_id,
  previous_ownership_lease_id = null,
  previous_owner_session_name = null,
  previous_owner_session_id = null,
  successor_ownership_lease_id,
  successor_session_name,
  successor_session_id = null,
  transferred_at,
  transferred_by = null,
  reason = null,
  metadata = {},
} = {}) {
  return {
    schema_version: HANDOFF_TRANSFER_SCHEMA_VERSION,
    format: HANDOFF_TRANSFER_FORMAT,
    transfer_id: normalizeRequiredString(transfer_id, 'transfer_id'),
    request_id: normalizeRequiredString(request_id, 'request_id'),
    claim_id: normalizeRequiredString(claim_id, 'claim_id'),
    decision_id: normalizeRequiredString(decision_id, 'decision_id'),
    task_id: normalizeRequiredString(task_id, 'task_id'),
    checkpoint_id: normalizeRequiredString(checkpoint_id, 'checkpoint_id'),
    previous_ownership_lease_id: normalizeOptionalString(previous_ownership_lease_id),
    previous_owner_session_name: normalizeOptionalString(previous_owner_session_name),
    previous_owner_session_id: normalizeOptionalString(previous_owner_session_id),
    successor_ownership_lease_id: normalizeRequiredString(
      successor_ownership_lease_id,
      'successor_ownership_lease_id',
    ),
    successor_session_name: normalizeRequiredString(successor_session_name, 'successor_session_name'),
    successor_session_id: normalizeOptionalString(successor_session_id),
    transferred_at: normalizeIsoTimestamp(transferred_at, 'transferred_at'),
    transferred_by: normalizeOptionalString(transferred_by),
    reason: normalizeOptionalString(reason),
    metadata: normalizeMetadata(metadata),
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
