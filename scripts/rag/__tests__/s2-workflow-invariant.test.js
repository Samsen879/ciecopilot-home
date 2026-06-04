import fs from 'node:fs';
import path from 'node:path';
import { buildS2WorkflowInvariantCheck } from '../run_s2_workflow_invariant_check.js';

const ROOT = path.resolve(process.cwd());

const VALID_S1_CONTRACT_WORKFLOW = `
name: RAG S1 Contract Gate
jobs:
  rag-s1-contract:
    name: S1 Contract Gate
    steps:
      - uses: actions/upload-artifact@v4
        with:
          path: runs/backend/rag_s1_contract_gate_summary.json
`;

const VALID_S1_METRIC_WORKFLOW = `
name: RAG S1 Metric Gate
jobs:
  rag-s1-metrics:
    name: S1 Metric Gate (Required)
    steps:
      - uses: actions/upload-artifact@v4
        with:
          path: runs/backend/rag_s1_metric_gate_summary.json
`;

const VALID_S2_WORKFLOW = `
name: RAG S2 Advisory Gate
jobs:
  rag-s2-advisory:
    name: S2 Advisory Gate (Non-Blocking)
    continue-on-error: true
    steps:
      - name: Upload S2 advisory artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          path: |
            runs/backend/rag_s2_augmentation_eval_summary.json
            docs/reports/rag_s2_augmentation_eval_report.md
            runs/backend/rag_s2_advisory_gate_summary.json
            runs/backend/rag_s2_workflow_invariant_check.json
            runs/backend/rag_s2_release_decision.json
            docs/reports/rag_s2_release_decision_report.md
`;

function buildCheck(overrides = {}) {
  return buildS2WorkflowInvariantCheck({
    contractWorkflow: VALID_S1_CONTRACT_WORKFLOW,
    metricWorkflow: VALID_S1_METRIC_WORKFLOW,
    s2Workflow: VALID_S2_WORKFLOW,
    ...overrides,
  });
}

describe('S2 workflow invariant check', () => {
  test('passes when S2 advisory workflow is explicitly non-blocking and uploads release artifacts', () => {
    const payload = buildCheck();

    expect(payload.status).toBe('pass');
    expect(payload.gate.advisory_only).toBe(true);
    expect(payload.blocked_reasons).toEqual([]);
  });

  test('fails when S2 advisory workflow lacks continue-on-error true', () => {
    const payload = buildCheck({
      s2Workflow: VALID_S2_WORKFLOW.replace('    continue-on-error: true\n', ''),
    });

    expect(payload.status).toBe('fail');
    expect(payload.blocked_reasons).toContain('s2_advisory_job_continue_on_error_true');
  });

  test('fails when S2 advisory workflow upload is not always-on', () => {
    const payload = buildCheck({
      s2Workflow: VALID_S2_WORKFLOW.replace('        if: always()\n', ''),
    });

    expect(payload.status).toBe('fail');
    expect(payload.blocked_reasons).toContain('s2_advisory_artifact_upload_if_always');
  });

  test('fails when S2 advisory workflow has a required naming collision', () => {
    const payload = buildCheck({
      s2Workflow: VALID_S2_WORKFLOW.replace(
        'name: S2 Advisory Gate (Non-Blocking)',
        'name: S2 Advisory Gate (Required)',
      ),
    });

    expect(payload.status).toBe('fail');
    expect(payload.blocked_reasons).toContain('s2_advisory_job_name_is_non_required');
    expect(payload.blocked_reasons).toContain('s2_advisory_no_required_name_collision');
  });

  test('checked-in S2 advisory workflow satisfies hardened invariants', () => {
    const workflowPath = path.join(ROOT, '.github', 'workflows', 'rag-s2-advisory-gate.yml');
    const payload = buildCheck({
      s2Workflow: fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, 'utf8') : null,
    });

    expect(payload.status).toBe('pass');
  });
});
