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
    `delivery_events: ${report.summary.delivery_event_count ?? 0}`,
    `event_replays: ${formatList(Object.entries(report.summary.event_replay_decision_counts?.delivery_events ?? {})
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${key}=${value}`))}`,
    `controller_cursors: ${report.summary.controller_cursor_count}`,
    `action_visibility: ${formatList(Object.entries(report.summary.action_visibility_counts ?? {})
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${key}=${value}`))}`,
    `action_replays: ${formatList(Object.entries(report.summary.action_replay_decision_counts ?? {})
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${key}=${value}`))}`,
    `repo_knowledge: ${report.summary.repo_knowledge_status ?? 'missing'} (profiles=${report.summary.repo_knowledge_count ?? 0}, version=${report.summary.repo_knowledge_profile_version ?? 'none'}, lint=${report.summary.repo_knowledge_lint_status ?? 'missing'})`,
    `checkpoints: ${report.summary.checkpoint_count} (valid=${report.summary.valid_checkpoint_count}, stale=${report.summary.stale_checkpoint_count}, invalid=${report.summary.invalid_checkpoint_count})`,
    `handoffs: requests=${report.summary.handoff_request_count ?? 0}, claims=${report.summary.handoff_claim_count ?? 0}, decisions=${report.summary.handoff_decision_count ?? 0}, transfers=${report.summary.handoff_transfer_count ?? 0}, active=${report.summary.active_handoff_count ?? 0}`,
    `audit_entries: ${report.summary.audit_entry_count}`,
    `recent_audit: ${formatList(recentAudit)}`,
  ].join('\n');
}
