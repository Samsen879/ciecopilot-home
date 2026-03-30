function formatList(values) {
  if (!values?.length) return 'none';
  return values.join(', ');
}

export function renderAoStateHumanSummary(report) {
  const recentAudit = (report.audit?.recent_entries ?? [])
    .map((entry) => `${entry.entity_kind}.${entry.operation}:${entry.entity_id}`);

  return [
    `state_status: ${report.bootstrapped ? 'bootstrapped' : 'missing'}`,
    `project_id: ${report.project_id}`,
    `state_root: ${report.state_root}`,
    `schema_version: ${report.schema.current_version} of ${report.schema.latest_version}`,
    `managed_tasks: ${report.summary.managed_task_count}`,
    `pr_bindings: ${report.summary.pr_binding_count}`,
    `active_ownership_leases: ${report.summary.active_ownership_lease_count}`,
    `active_controller_leases: ${report.summary.active_controller_lease_count}`,
    `actions: ${report.summary.action_count}`,
    `active_overrides: ${report.summary.active_override_count}`,
    `controller_modes: ${formatList(report.summary.controller_modes)}`,
    `observations: ${report.summary.observation_count}`,
    `controller_cursors: ${report.summary.controller_cursor_count}`,
    `checkpoints: ${report.summary.checkpoint_count} (valid=${report.summary.valid_checkpoint_count}, stale=${report.summary.stale_checkpoint_count}, invalid=${report.summary.invalid_checkpoint_count})`,
    `audit_entries: ${report.summary.audit_entry_count}`,
    `recent_audit: ${formatList(recentAudit)}`,
  ].join('\n');
}
