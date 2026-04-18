import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLearningSession } from '../../../api/learning/lib/session-runtime/session-service.js';
import { persistAttemptEventBridge } from '../../../api/learning/lib/events/attempt-event-service.js';
import { patchLearningArtifact } from '../../../api/learning/lib/artifacts/artifact-service.js';
import { getWorkspaceView, listReviewTasks } from '../../../api/learning/lib/workspaces/workspace-read-service.js';
import {
  buildBrowserClosedLoopFixture,
  createClosedLoopLearningDb,
  createInMemoryEffectRepository,
  DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH,
} from './browser-closed-loop-fixture.js';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)), '..');

export const CLOSED_LOOP_RELEASE_GATE_SCHEMA_VERSION =
  'learning_runtime_closed_loop_release_gate_receipt_v1';
export const DEFAULT_CLOSED_LOOP_RELEASE_GATE_RECEIPT_PATH =
  'data/learning_runtime/release_evidence/9709-closed-loop-release-gate-receipt.v1.json';
export const DEFAULT_CLOSED_LOOP_RELEASE_GATE_REPORT_PATH =
  'docs/reports/2026-04-18-9709-closed-loop-release-gate.md';

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeRootDir(rootDir) {
  return typeof rootDir === 'string' && rootDir.trim() ? rootDir : PROJECT_ROOT;
}

function resolveFromRoot(rootDir, relPath) {
  return path.join(normalizeRootDir(rootDir), relPath);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function readFixtureFromDisk(rootDir, fixturePath) {
  const resolvedFixturePath = fixturePath || DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH;
  const absolutePath = resolveFromRoot(rootDir, resolvedFixturePath);

  if (!fs.existsSync(absolutePath)) {
    return buildBrowserClosedLoopFixture();
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function toGateStatus(passed) {
  return passed ? 'pass' : 'fail';
}

function listFailedHandlers(effectExecution = {}) {
  return normalizeArray(effectExecution.receipts)
    .filter((receipt) => receipt?.receipt_state === 'retrying' || receipt?.status === 'failed')
    .map((receipt) => receipt.handler_name)
    .filter(Boolean);
}

async function runGoldClosedLoop(fixture) {
  const client = createClosedLoopLearningDb(fixture);
  const sessionResponse = await createLearningSession(client, {
    userId: fixture.actor.user_id,
    body: fixture.request_intake.body,
  });

  const bridgeInput = {
    ...cloneJson(fixture.marking.bridge_input),
    sessionId: sessionResponse.session.session_id,
  };
  const bridgeResult = await persistAttemptEventBridge(
    client,
    bridgeInput,
    {
      applyDownstreamEffects: true,
      effectRepository: createInMemoryEffectRepository(),
    },
  );

  const reviewTasks = [...client.state.reviewTasks.values()];
  const artifacts = [...client.state.artifacts.values()];
  const schedulerOutput = await listReviewTasks(client, {
    userId: fixture.actor.user_id,
    topicId: fixture.topic.topic_id,
  });
  const firstArtifact = artifacts[0] ?? null;

  if (firstArtifact) {
    await patchLearningArtifact({
      client,
      userId: fixture.actor.user_id,
      artifactId: firstArtifact.artifact_id,
      intent: 'mark_verified',
      verificationEvidenceRef: fixture.workspace_projection.verification_evidence_ref,
    }, {
      lifecycleFlagEnabled: true,
    });

    await patchLearningArtifact({
      client,
      userId: fixture.actor.user_id,
      artifactId: firstArtifact.artifact_id,
      intent: 'set_placement_status',
      placementStatus: 'pinned',
    }, {
      lifecycleFlagEnabled: true,
    });
  }

  const workspace = await getWorkspaceView(client, {
    userId: fixture.actor.user_id,
    topicId: fixture.topic.topic_id,
    residencyFlagEnabled: true,
  });

  const expectedFeatureFlags = fixture.feature_flags;
  const requestIntakePassed =
    sessionResponse.feature_flags.learning_runtime_enabled === expectedFeatureFlags.learning_runtime_enabled
    && sessionResponse.feature_flags.learning_runtime_9709_enabled
      === expectedFeatureFlags.learning_runtime_9709_enabled
    && sessionResponse.session.current_question_id === fixture.question.question_id
    && sessionResponse.session.current_question_type_id === fixture.topic.question_type_id;
  const markingPassed =
    bridgeResult.ok === true
    && bridgeResult.learning_effects?.authoritative_scoring_allowed === true
    && bridgeResult.learning_effects?.release_scope_status === 'released_scoring';
  const attemptEventPassed =
    bridgeResult.pipeline_state?.current_stage === 'LearningUpdateProposed'
    && JSON.stringify(bridgeResult.persisted_event_types)
      === JSON.stringify([
        'AttemptSubmitted',
        'QuestionClassified',
        'MarkingCompleted',
        'LearningUpdateProposed',
      ]);
  const downstreamPassed =
    bridgeResult.learning_effects?.effect_execution?.ok === true
    && reviewTasks.length === 1
    && artifacts.length === 1;
  const schedulerPassed =
    schedulerOutput.items.length === 1
    && schedulerOutput.items[0]?.target_question_type_id === fixture.topic.question_type_id
    && schedulerOutput.items[0]?.status === 'open';
  const workspacePassed =
    workspace.workspace?.slots?.common_traps?.primary_artifact_ref?.artifact_id === firstArtifact?.artifact_id
    && workspace.workspace?.slots?.review_queue?.linked_references?.length === 1;

  return {
    featureFlags: cloneJson(sessionResponse.feature_flags),
    gates: {
      request_intake: {
        status: toGateStatus(requestIntakePassed),
        session_id: sessionResponse.session.session_id,
        current_question_id: sessionResponse.session.current_question_id,
        current_question_type_id: sessionResponse.session.current_question_type_id,
      },
      marking: {
        status: toGateStatus(markingPassed),
        release_scope_status: bridgeResult.learning_effects?.release_scope_status ?? null,
        authoritative_scoring_allowed:
          bridgeResult.learning_effects?.authoritative_scoring_allowed ?? false,
      },
      attempt_event_persistence: {
        status: toGateStatus(attemptEventPassed),
        persisted_event_types: cloneJson(bridgeResult.persisted_event_types),
        current_stage: bridgeResult.pipeline_state?.current_stage ?? null,
        last_sequence_no: bridgeResult.pipeline_state?.last_sequence_no ?? null,
      },
      downstream_materialization: {
        status: toGateStatus(downstreamPassed),
        review_task_count: reviewTasks.length,
        artifact_count: artifacts.length,
        receipt_summary: cloneJson(bridgeResult.learning_effects?.effect_execution?.receipt_summary),
      },
      scheduler_output: {
        status: toGateStatus(schedulerPassed),
        item_count: schedulerOutput.items.length,
        first_item: cloneJson(schedulerOutput.items[0] ?? null),
      },
      workspace_projection: {
        status: toGateStatus(workspacePassed),
        slot_state: cloneJson(workspace.workspace?.slot_state ?? {}),
        common_traps: cloneJson(workspace.workspace?.slots?.common_traps ?? null),
        review_queue_linked_refs:
          cloneJson(workspace.workspace?.slots?.review_queue?.linked_references ?? []),
      },
    },
  };
}

async function runDegradedPath(fixture) {
  const client = createClosedLoopLearningDb(fixture);
  client.state.markRuns.set(fixture.degraded_path.mark_run_id, {
    mark_run_id: fixture.degraded_path.mark_run_id,
    response_summary: {
      authority_posture: cloneJson(fixture.marking.bridge_input.authorityPosture),
    },
  });

  const degradedBridgeInput = {
    ...cloneJson(fixture.marking.bridge_input),
    attemptId: fixture.degraded_path.attempt_id,
    markRunId: fixture.degraded_path.mark_run_id,
    sourceAttemptRef: {
      kind: 'attempt',
      attempt_id: fixture.degraded_path.attempt_id,
    },
    sourceMarkRunRef: {
      kind: 'mark_run',
      mark_run_id: fixture.degraded_path.mark_run_id,
    },
    markingResult: {
      ...cloneJson(fixture.marking.bridge_input.markingResult),
      attempt_id: fixture.degraded_path.attempt_id,
      mark_run_id: fixture.degraded_path.mark_run_id,
    },
  };

  const result = await persistAttemptEventBridge(
    client,
    degradedBridgeInput,
    {
      applyDownstreamEffects: true,
      effectRepository: createInMemoryEffectRepository(),
      handlers: {
        review_tasks: async () => {
          throw new Error('review task write failed');
        },
      },
    },
  );

  const effectExecution = result.learning_effects?.effect_execution ?? {};
  const failedHandlers = listFailedHandlers(effectExecution);
  const debtPending = Boolean(effectExecution.debt_pending);

  return {
    status: debtPending ? 'debt_recorded' : 'no_debt',
    retry_debt: {
      pending: debtPending,
      failed_handlers: failedHandlers,
      receipt_summary: cloneJson(effectExecution.receipt_summary ?? {}),
    },
  };
}

function buildResidualRisks() {
  return [
    'The release gate proves one gold 9709 trigonometric-equations scenario, not the full 9709 release envelope.',
    'The degraded path still surfaces retry debt for downstream handlers; the gate records that debt explicitly rather than auto-healing it.',
    'The proof runs against a focused in-memory runtime harness, so separate live-environment rollout checks still depend on CI and production flag posture.',
  ];
}

export async function buildClosedLoopReleaseGateReceipt({
  rootDir = PROJECT_ROOT,
  fixturePath = DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH,
  fixture = null,
} = {}) {
  const resolvedFixture = fixture || readFixtureFromDisk(rootDir, fixturePath);

  try {
    const gold = await runGoldClosedLoop(resolvedFixture);
    const degradedPath = await runDegradedPath(resolvedFixture);
    const blockedReasons = Object.entries(gold.gates)
      .flatMap(([name, gate]) => (gate.status === 'pass' ? [] : [`${name}_failed`]));
    const releaseReady = blockedReasons.length === 0;

    return {
      schema_version: CLOSED_LOOP_RELEASE_GATE_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      scenario_id: resolvedFixture.scenario_id,
      subject_code: resolvedFixture.subject_code,
      status: releaseReady ? 'pass' : 'fail',
      release_ready: releaseReady,
      blocked_reasons: blockedReasons,
      feature_flags: gold.featureFlags,
      gates: gold.gates,
      degraded_path: degradedPath,
      residual_risks: buildResidualRisks(),
    };
  } catch (error) {
    return {
      schema_version: CLOSED_LOOP_RELEASE_GATE_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      scenario_id: resolvedFixture.scenario_id,
      subject_code: resolvedFixture.subject_code,
      status: 'fail',
      release_ready: false,
      blocked_reasons: ['gate_execution_failed'],
      feature_flags: cloneJson(resolvedFixture.feature_flags),
      gates: {},
      degraded_path: {
        status: 'not_run',
        retry_debt: {
          pending: false,
          failed_handlers: [],
          receipt_summary: {
            total: 0,
            persisted: 0,
            retrying: 0,
            needs_manual_review: 0,
          },
        },
      },
      residual_risks: [
        `Gate execution failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

function formatGateSummaryRow(name, gate = {}) {
  return `| ${name} | ${gate.status ?? 'fail'} | ${JSON.stringify(gate)} |`;
}

function formatResidualRisks(residualRisks = []) {
  return residualRisks.map((risk) => `- ${risk}`).join('\n');
}

export function formatClosedLoopReleaseGateReport(receipt = {}) {
  const gateRows = Object.entries(receipt.gates ?? {})
    .map(([name, gate]) => formatGateSummaryRow(name, gate))
    .join('\n');
  const failedHandlers = normalizeArray(receipt.degraded_path?.retry_debt?.failed_handlers).join(', ') || 'none';

  return `# 9709 Closed-Loop Release Gate

## Summary

- status: \`${receipt.status ?? 'fail'}\`
- release_ready: \`${String(receipt.release_ready ?? false)}\`
- subject_code: \`${receipt.subject_code ?? 'unknown'}\`
- scenario_id: \`${receipt.scenario_id ?? 'unknown'}\`

## Feature Flags

\`${JSON.stringify(receipt.feature_flags ?? {})}\`

## Gate Results

| gate | status | details |
| --- | --- | --- |
${gateRows}

## Degraded Retry Debt

- status: \`${receipt.degraded_path?.status ?? 'unknown'}\`
- pending: \`${String(receipt.degraded_path?.retry_debt?.pending ?? false)}\`
- failed_handlers: \`${failedHandlers}\`
- receipt_summary: \`${JSON.stringify(receipt.degraded_path?.retry_debt?.receipt_summary ?? {})}\`

## Residual Risks

${formatResidualRisks(receipt.residual_risks ?? [])}
`;
}

export async function writeClosedLoopReleaseGateOutputs({
  rootDir = PROJECT_ROOT,
  fixturePath = DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH,
  outJsonPath = DEFAULT_CLOSED_LOOP_RELEASE_GATE_RECEIPT_PATH,
  outMdPath = DEFAULT_CLOSED_LOOP_RELEASE_GATE_REPORT_PATH,
} = {}) {
  const receipt = await buildClosedLoopReleaseGateReceipt({
    rootDir,
    fixturePath,
  });
  const absoluteJsonPath = resolveFromRoot(rootDir, outJsonPath);
  const absoluteMdPath = resolveFromRoot(rootDir, outMdPath);

  ensureParentDir(absoluteJsonPath);
  ensureParentDir(absoluteMdPath);
  fs.writeFileSync(absoluteJsonPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  fs.writeFileSync(absoluteMdPath, formatClosedLoopReleaseGateReport(receipt), 'utf8');

  return {
    receipt,
    absoluteJsonPath,
    absoluteMdPath,
  };
}
