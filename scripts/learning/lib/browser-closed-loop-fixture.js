import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)), '..');

export const BROWSER_CLOSED_LOOP_FIXTURE_SCHEMA_VERSION =
  'learning_runtime_browser_closed_loop_fixture_v1';
export const DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH =
  'data/learning_runtime/fixtures/9709-browser-closed-loop-gold.v1.json';

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
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

export function buildBrowserClosedLoopFixture() {
  return {
    schema_version: BROWSER_CLOSED_LOOP_FIXTURE_SCHEMA_VERSION,
    scenario_id: '9709.gold.closed_loop.release_gate.v1',
    subject_code: '9709',
    feature_flags: {
      learning_runtime_enabled: true,
      learning_runtime_9709_enabled: true,
    },
    actor: {
      user_id: 'student-9709-release-gate',
    },
    topic: {
      topic_id: 'topic-9709-trig-equations',
      topic_path: '9709/trigonometry/equations',
      question_type_id: '9709.trigonometry.equations',
      family_id: '9709.trigonometry_manipulation_equations',
    },
    question: {
      question_id: 'question-9709-trig-equations-gold',
      source_kind: 'paper_question',
      subject_code: '9709',
      primary_topic_id: 'topic-9709-trig-equations',
      primary_question_type_id: '9709.trigonometry.equations',
      family_id: '9709.trigonometry_manipulation_equations',
    },
    request_intake: {
      body: {
        subject_code: '9709',
        mode: 'guided_solve',
        session_goal: 'Repair trigonometric equation solving',
        anchor_kind: 'question',
        anchor_ref: {
          kind: 'question',
          question_id: 'question-9709-trig-equations-gold',
        },
        current_question_id: 'question-9709-trig-equations-gold',
        current_question_type_id: '9709.trigonometry.equations',
      },
    },
    marking: {
      attempt_id: 'attempt-9709-closed-loop-gold',
      mark_run_id: 'mark-run-9709-closed-loop-gold',
      bridge_input: {
        attemptId: 'attempt-9709-closed-loop-gold',
        learnerId: 'student-9709-release-gate',
        sessionId: null,
        questionId: 'question-9709-trig-equations-gold',
        subjectCode: '9709',
        markRunId: 'mark-run-9709-closed-loop-gold',
        questionContext: {
          source_kind: 'paper_question',
          family_id: '9709.trigonometry_manipulation_equations',
          question_type_id: '9709.trigonometry.equations',
          question_type_release_state: 'released',
          primary_topic_id: 'topic-9709-trig-equations',
          primary_topic_path: '9709/trigonometry/equations',
          classification_confidence: 0.94,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_set_id: '9709.trigonometry.equations',
              rubric_version_id: 'trig-equations-v1',
              release_state: 'released',
            },
          ],
          release_scope_status: 'released_scoring',
        },
        attemptContext: {
          topic_id: 'topic-9709-trig-equations',
          topic_path: '9709/trigonometry/equations',
        },
        authorityPosture: {
          release_scope_status: 'released_scoring',
          authoritative_scoring_allowed: true,
          fallback_mode: null,
          fallback_reason_code: null,
          classification_confidence: 0.94,
          learning_signal_posture: 'authoritative_scoring',
        },
        markingResult: {
          attempt_id: 'attempt-9709-closed-loop-gold',
          mark_run_id: 'mark-run-9709-closed-loop-gold',
          marking_summary: {
            coverage_scope: 'question',
          },
          part_results: [
            {
              part_id: 'part-a',
              subpart_id: null,
              score_awarded: 0,
              score_max: 4,
            },
          ],
        },
        decisions: [
          {
            part_id: 'part-a',
            awarded: false,
            awarded_marks: 0,
            alignment_confidence: 0.78,
          },
        ],
        sourceAttemptRef: {
          kind: 'attempt',
          attempt_id: 'attempt-9709-closed-loop-gold',
        },
        sourceMarkRunRef: {
          kind: 'mark_run',
          mark_run_id: 'mark-run-9709-closed-loop-gold',
        },
        correlationId: '11111111-1111-4111-8111-111111111111',
        submittedAt: '2026-04-18T09:00:00.000Z',
        emittedAt: '2026-04-18T09:00:05.000Z',
        emittedBy: 'evaluate-v1',
        storageKey: '9709/s22/qp11/q01.png',
        qNumber: 1,
        subpart: 'a',
        studentSteps: [
          {
            step_id: 'step-1',
            text: 'Expanded the identity with a sign error.',
          },
        ],
        uncertaintyValidated: true,
        misconceptionTags: ['sign_error'],
      },
    },
    workspace_projection: {
      verification_evidence_ref: {
        kind: 'review_run',
        review_run_id: 'review-run-9709-closed-loop-gold',
      },
    },
    degraded_path: {
      attempt_id: 'attempt-9709-closed-loop-degraded',
      mark_run_id: 'mark-run-9709-closed-loop-degraded',
      failing_handler: 'review_tasks',
    },
  };
}

export function buildReleasedScopeRepairGuardInput() {
  return {
    user_id: 'student-9709-release-gate',
    question_id: 'question-9709-integration-application-guard',
    question_context: {
      family_id: '9709.integration_techniques',
      question_type_id: '9709.integration.application',
      question_type_release_state: 'released',
      primary_topic_id: 'topic-9709-integration-application',
      primary_topic_path: '9709/integration/application',
      classification_confidence: 0.89,
      candidate_rubric_refs: [
        {
          kind: 'rubric_release',
          rubric_set_id: '9709.integration.application',
          rubric_version_id: 'integration-application-v1',
          release_state: 'released',
        },
      ],
    },
    source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-9709-integration-application-guard' },
    source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-9709-integration-application-guard' },
    decisions: [
      {
        awarded: true,
        awarded_marks: 1,
        alignment_confidence: 0.74,
      },
    ],
    marking_result: {
      marking_summary: {
        coverage_scope: 'question',
        local_signal_only: false,
        conservative_part_mapping: true,
        ambiguous_rubric_point_result_count: 1,
      },
    },
    uncertainty_validated: true,
    repair_target_topic_id: 'topic-9709-integration-application',
    repair_target_topic_path: '9709/integration/application',
    repair_target_question_type_id: '9709.integration.application',
  };
}

export function seedBrowserClosedLoopFixture({
  rootDir = PROJECT_ROOT,
  outPath = DEFAULT_BROWSER_CLOSED_LOOP_FIXTURE_PATH,
  fixture = buildBrowserClosedLoopFixture(),
} = {}) {
  const absolutePath = resolveFromRoot(rootDir, outPath);
  ensureParentDir(absolutePath);
  fs.writeFileSync(absolutePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

  return {
    fixture,
    absolutePath,
    relativePath: outPath,
  };
}

function buildResumeProjection(state, sessionId) {
  const session = state.sessions.get(sessionId) || null;
  if (!session) {
    return null;
  }

  const lineage = state.lineages.get(sessionId) || {
    parent_session_id: session.lineage_ref?.parent_session_id ?? null,
    handoff_kind: session.lineage_ref?.handoff_kind ?? null,
    summary_snapshot: session.summary_state ?? {},
  };

  return {
    ...cloneJson(session),
    parent_session_id: lineage.parent_session_id ?? null,
    handoff_kind: lineage.handoff_kind ?? null,
    summary_snapshot: cloneJson(lineage.summary_snapshot ?? session.summary_state ?? {}),
  };
}

function buildWorkspaceKey(userId, topicId) {
  return `${userId}:${topicId}`;
}

function createProjectedReviewTaskRow(state, task = {}) {
  return {
    ...cloneJson(task),
    target_topic_path: task.target_topic_path
      ?? state.topics.get(task.target_topic_id)?.topic_path
      ?? null,
  };
}

function listProjectedReviewTasks(state, filters = []) {
  let rows = [...state.reviewTasks.values()].map((task) => createProjectedReviewTaskRow(state, task));

  for (const filter of filters) {
    if (filter.type === 'eq') {
      rows = rows.filter((row) => row[filter.column] === filter.value);
    }

    if (filter.type === 'lte') {
      rows = rows.filter((row) => row[filter.column] !== null && row[filter.column] <= filter.value);
    }

    if (filter.type === 'in') {
      rows = rows.filter((row) => filter.values.includes(row[filter.column]));
    }
  }

  return rows.sort((left, right) => {
    const dueCompare = String(left.due_at ?? '').localeCompare(String(right.due_at ?? ''));
    if (dueCompare !== 0) {
      return dueCompare;
    }

    return String(left.created_at ?? '').localeCompare(String(right.created_at ?? ''));
  });
}

function listArtifactContentVersions(state, filters = []) {
  let rows = [...state.artifactContentVersions.values()];

  for (const filter of filters) {
    if (filter.type === 'eq') {
      rows = rows.filter((row) => row[filter.column] === filter.value);
    }

    if (filter.type === 'in') {
      rows = rows.filter((row) => filter.values.includes(row[filter.column]));
    }
  }

  return rows.sort(
    (left, right) => Number(right.version_number ?? 0) - Number(left.version_number ?? 0),
  );
}

function getWorkspaceByTopic(state, userId, topicId) {
  const workspaceId = state.workspaceByUserTopic.get(buildWorkspaceKey(userId, topicId));
  return workspaceId ? state.workspaces.get(workspaceId) || null : null;
}

function listWorkspaceSlots(state, workspaceId) {
  return [...state.workspaceSlots.values()].filter((slot) => slot.workspace_id === workspaceId);
}

function deriveWorkspaceProjection(state, userId, topicId) {
  const workspace = getWorkspaceByTopic(state, userId, topicId);
  if (!workspace) {
    return null;
  }

  const activeArtifacts = [...state.artifacts.values()].filter((artifact) =>
    artifact.canonical_home_topic_id === topicId
    && artifact.lifecycle_status !== 'superseded'
    && artifact.placement_status !== 'archived',
  );
  const reviewTaskRefs = listProjectedReviewTasks(state, [
    { type: 'eq', column: 'user_id', value: userId },
    { type: 'eq', column: 'target_topic_id', value: topicId },
    { type: 'eq', column: 'status', value: 'open' },
  ]).map((task) => ({
    kind: 'review_task',
    review_task_id: task.review_task_id,
  }));
  const slotsByKey = new Map(
    listWorkspaceSlots(state, workspace.workspace_id).map((slot) => [slot.slot_key, slot]),
  );
  const commonTrapsSlot = slotsByKey.get('common_traps') || null;
  const reviewQueueSlot = slotsByKey.get('review_queue') || null;
  const artifactRefs = activeArtifacts.map((artifact) => ({
    kind: 'artifact',
    artifact_id: artifact.artifact_id,
  }));

  return {
    workspace_id: workspace.workspace_id,
    user_id: userId,
    topic_id: topicId,
    topic_path: state.topics.get(topicId)?.topic_path ?? null,
    slot_state: {
      common_traps: artifactRefs.length > 0 || commonTrapsSlot ? 'active' : 'idle',
      review_queue: reviewTaskRefs.length > 0 || reviewQueueSlot ? 'active' : 'idle',
    },
    linked_reference_summary: {
      total_linked_references: artifactRefs.length + reviewTaskRefs.length,
    },
    updated_at: '2026-04-18T09:10:00.000Z',
    slots: [
      {
        workspace_slot_id: commonTrapsSlot?.workspace_slot_id ?? null,
        slot_key: 'common_traps',
        primary_artifact_ref: cloneJson(commonTrapsSlot?.primary_artifact_ref ?? null),
        linked_reference_refs: artifactRefs,
        updated_at: commonTrapsSlot?.updated_at ?? null,
      },
      {
        workspace_slot_id: reviewQueueSlot?.workspace_slot_id ?? null,
        slot_key: 'review_queue',
        primary_artifact_ref: cloneJson(reviewQueueSlot?.primary_artifact_ref ?? null),
        linked_reference_refs: reviewTaskRefs,
        updated_at: reviewQueueSlot?.updated_at ?? null,
      },
    ],
  };
}

function findEqFilter(filters = [], column) {
  return filters.find((filter) => filter.type === 'eq' && filter.column === column)?.value ?? null;
}

function createQueryBuilder(state, queries, resolveQuery) {
  return class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.operation = 'select';
      this.payload = null;
      this.filters = [];
      this.orders = [];
      this.options = {};
    }

    select(columns) {
      this.options.columns = columns;
      return this;
    }

    insert(payload) {
      this.operation = 'insert';
      this.payload = payload;
      return this;
    }

    update(payload) {
      this.operation = 'update';
      this.payload = payload;
      return this;
    }

    upsert(payload) {
      this.operation = 'upsert';
      this.payload = payload;
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    in(column, values) {
      this.filters.push({ type: 'in', column, values });
      return this;
    }

    lte(column, value) {
      this.filters.push({ type: 'lte', column, value });
      return this;
    }

    order(column, options = {}) {
      this.orders.push({ column, options });
      return this;
    }

    limit(value) {
      this.options.limit = value;
      return this;
    }

    single() {
      return this.#resolve({ single: true });
    }

    maybeSingle() {
      return this.#resolve({ maybeSingle: true });
    }

    then(resolve, reject) {
      return this.#resolve({}).then(resolve, reject);
    }

    #resolve(extra = {}) {
      const query = {
        table: this.table,
        operation: this.operation,
        payload: cloneJson(this.payload),
        filters: cloneJson(this.filters),
        orders: cloneJson(this.orders),
        options: {
          ...cloneJson(this.options),
          ...extra,
        },
      };
      queries.push(query);
      return Promise.resolve(resolveQuery(query));
    }
  };
}

export function createInMemoryEffectRepository() {
  const receipts = new Map();

  function keyFor(handlerName, effectKey) {
    return `${handlerName}::${effectKey}`;
  }

  return {
    async reserveEffectReceipt(input = {}) {
      const key = keyFor(input.handler_name, input.effect_key);
      const existing = receipts.get(key) ?? null;

      if (existing) {
        if (existing.status === 'failed' && existing.receipt_state === 'retrying') {
          const retried = {
            ...existing,
            event_id: input.event_id,
            aggregate_id: input.aggregate_id,
            truth_revision: input.truth_revision,
            reconciliation_id: input.reconciliation_id ?? null,
            proposal_key: input.proposal_key ?? existing.proposal_key ?? null,
            status: 'started',
            receipt_state: 'pending',
            attempt_count: Number(existing.attempt_count ?? 0) + 1,
            last_attempted_at: '2026-04-18T09:10:00.000Z',
            last_error: null,
          };
          receipts.set(key, retried);
          return {
            inserted: true,
            reason_code: 'retry_failed_effect',
            receipt: cloneJson(retried),
          };
        }

        return {
          inserted: false,
          reason_code: 'duplicate_effect_key',
          receipt: cloneJson(existing),
        };
      }

      const receipt = {
        effect_id: `effect-${receipts.size + 1}`,
        proposal_key: input.proposal_key ?? null,
        event_id: input.event_id,
        aggregate_id: input.aggregate_id,
        truth_revision: input.truth_revision,
        reconciliation_id: input.reconciliation_id ?? null,
        handler_name: input.handler_name,
        effect_key: input.effect_key,
        status: 'started',
        receipt_state: 'pending',
        retry_count: 0,
        attempt_count: 1,
        last_attempted_at: '2026-04-18T09:05:00.000Z',
        last_error: null,
        result_ref_type: null,
        result_ref_id: null,
      };
      receipts.set(key, receipt);

      return {
        inserted: true,
        reason_code: null,
        receipt: cloneJson(receipt),
      };
    },

    async markEffectReceiptSucceeded({
      handler_name: handlerName,
      effect_key: effectKey,
      status = 'succeeded',
      result_ref_type: resultRefType = null,
      result_ref_id: resultRefId = null,
    } = {}) {
      const key = keyFor(handlerName, effectKey);
      const receipt = receipts.get(key);
      const succeeded = {
        ...receipt,
        status,
        receipt_state: 'persisted',
        result_ref_type: resultRefType,
        result_ref_id: resultRefId,
        last_error: null,
      };
      receipts.set(key, succeeded);
      return cloneJson(succeeded);
    },

    async markEffectReceiptFailed({
      handler_name: handlerName,
      effect_key: effectKey,
      error_code: errorCode = 'effect_execution_failed',
      error_message: errorMessage = 'effect execution failed',
      receipt_state: receiptState = 'retrying',
    } = {}) {
      const key = keyFor(handlerName, effectKey);
      const receipt = receipts.get(key);
      const failed = {
        ...receipt,
        status: 'failed',
        receipt_state: receiptState,
        retry_count: Number(receipt?.retry_count ?? 0) + 1,
        last_error: {
          code: errorCode,
          message: errorMessage,
        },
      };
      receipts.set(key, failed);
      return cloneJson(failed);
    },

    async listEffectReceiptsByEventId(eventId) {
      return [...receipts.values()]
        .filter((receipt) => receipt.event_id === eventId)
        .map((receipt) => cloneJson(receipt));
    },
  };
}

export function createClosedLoopLearningDb(fixture = buildBrowserClosedLoopFixture()) {
  const queries = [];
  const state = {
    nextSessionId: 1,
    nextReviewTaskId: 1,
    nextArtifactId: 1,
    nextArtifactContentVersionId: 1,
    nextWorkspaceId: 1,
    nextWorkspaceSlotId: 1,
    nextFamilyMasteryId: 1,
    nextTypeMasteryId: 1,
    topics: new Map([
      [
        fixture.topic.topic_id,
        {
          node_id: fixture.topic.topic_id,
          topic_path: fixture.topic.topic_path,
        },
      ],
    ]),
    questions: new Map([
      [
        fixture.question.question_id,
        {
          question_id: fixture.question.question_id,
          subject_code: fixture.question.subject_code,
          primary_topic_id: fixture.question.primary_topic_id,
          primary_question_type_id: fixture.question.primary_question_type_id,
        },
      ],
    ]),
    sessions: new Map(),
    lineages: new Map(),
    reviewTasks: new Map(),
    artifacts: new Map(),
    artifactContentVersions: new Map(),
    workspaces: new Map(),
    workspaceByUserTopic: new Map(),
    workspaceSlots: new Map(),
    learningEvents: [],
    learningEventsById: new Map(),
    learningEventDeliveries: new Map(),
    attemptPipelineStates: new Map(),
    errorEvents: [],
    familyMasteries: new Map(),
    typeMasteries: new Map(),
    markRuns: new Map([
      [
        fixture.marking.mark_run_id,
        {
          mark_run_id: fixture.marking.mark_run_id,
          response_summary: {
            authority_posture: cloneJson(
              fixture.marking.bridge_input.authorityPosture,
            ),
          },
        },
      ],
    ]),
  };

  function createSessionRow(payload) {
    const suffix = state.nextSessionId.toString(16).padStart(12, '0');
    state.nextSessionId += 1;
    return {
      session_id: `00000000-0000-4000-8000-${suffix}`,
      created_at: '2026-04-18T09:00:00.000Z',
      updated_at: '2026-04-18T09:00:00.000Z',
      ...cloneJson(payload),
    };
  }

  function resolveQuery(query) {
    if (query.table === 'question_bank' && query.operation === 'select') {
      const questionId = findEqFilter(query.filters, 'question_id');
      return {
        data: questionId ? cloneJson(state.questions.get(questionId) || null) : null,
        error: null,
      };
    }

    if (query.table === 'curriculum_nodes' && query.operation === 'select') {
      const topicId = findEqFilter(query.filters, 'node_id');
      const topicPath = findEqFilter(query.filters, 'topic_path');
      if (topicId) {
        return {
          data: cloneJson(state.topics.get(topicId) || null),
          error: null,
        };
      }

      const matchedTopic = [...state.topics.values()].find((topic) => topic.topic_path === topicPath) || null;
      return {
        data: cloneJson(matchedTopic),
        error: null,
      };
    }

    if (query.table === 'learning_sessions' && query.operation === 'insert') {
      const row = createSessionRow(query.payload);
      state.sessions.set(row.session_id, row);
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_sessions' && query.operation === 'select') {
      const sessionId = findEqFilter(query.filters, 'session_id');
      return {
        data: sessionId ? cloneJson(state.sessions.get(sessionId) || null) : null,
        error: null,
      };
    }

    if (query.table === 'learning_session_lineage' && query.operation === 'insert') {
      const row = {
        lineage_id: `lineage-${query.payload.child_session_id}`,
        created_at: '2026-04-18T09:00:00.000Z',
        ...cloneJson(query.payload),
      };
      state.lineages.set(query.payload.child_session_id, row);
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_session_resume_projection' && query.operation === 'select') {
      const sessionId = findEqFilter(query.filters, 'session_id');
      const userId = findEqFilter(query.filters, 'user_id');

      let rows = sessionId
        ? [buildResumeProjection(state, sessionId)].filter(Boolean)
        : [...state.sessions.keys()]
          .map((id) => buildResumeProjection(state, id))
          .filter(Boolean);

      if (userId) {
        rows = rows.filter((row) => row.user_id === userId);
      }

      if (query.orders.length > 0) {
        rows.sort((left, right) => {
          for (const order of query.orders) {
            const leftValue = left?.[order.column];
            const rightValue = right?.[order.column];
            if (leftValue === rightValue) {
              continue;
            }

            if (order.options?.ascending === false) {
              return leftValue < rightValue ? 1 : -1;
            }

            return leftValue > rightValue ? 1 : -1;
          }

          return 0;
        });
      }

      if (query.options.single || query.options.maybeSingle) {
        return {
          data: cloneJson(rows[0] || null),
          error: null,
        };
      }

      return {
        data: cloneJson(rows),
        error: null,
      };
    }

    if (query.table === 'learning_events' && query.operation === 'insert') {
      const rows = normalizeArray(query.payload).map((row) => cloneJson(row));
      rows.forEach((row) => {
        state.learningEvents.push(row);
        state.learningEventsById.set(row.event_id, row);
      });
      return { data: null, error: null };
    }

    if (query.table === 'learning_events' && query.operation === 'select') {
      const eventId = findEqFilter(query.filters, 'event_id');
      if (eventId) {
        return {
          data: cloneJson(state.learningEventsById.get(eventId) || null),
          error: null,
        };
      }

      const aggregateId = findEqFilter(query.filters, 'aggregate_id');
      let rows = aggregateId
        ? state.learningEvents.filter((event) => event.aggregate_id === aggregateId)
        : [...state.learningEvents];

      if (query.orders.length > 0) {
        rows = [...rows].sort((left, right) => {
          for (const order of query.orders) {
            const leftValue = left?.[order.column];
            const rightValue = right?.[order.column];
            if (leftValue === rightValue) {
              continue;
            }

            if (order.options?.ascending === false) {
              return leftValue < rightValue ? 1 : -1;
            }

            return leftValue > rightValue ? 1 : -1;
          }

          return 0;
        });
      }

      if (typeof query.options.limit === 'number') {
        rows = rows.slice(0, query.options.limit);
      }

      if (query.options.single || query.options.maybeSingle) {
        return {
          data: cloneJson(rows[0] || null),
          error: null,
        };
      }

      return {
        data: cloneJson(rows),
        error: null,
      };
    }

    if (query.table === 'learning_event_deliveries' && query.operation === 'select') {
      const stableIdempotencyKey = findEqFilter(query.filters, 'stable_idempotency_key');
      return {
        data: stableIdempotencyKey
          ? cloneJson(state.learningEventDeliveries.get(stableIdempotencyKey) || null)
          : null,
        error: null,
      };
    }

    if (query.table === 'learning_event_deliveries' && query.operation === 'insert') {
      const row = {
        delivery_id: `delivery-${state.learningEventDeliveries.size + 1}`,
        created_at: '2026-04-18T09:00:05.000Z',
        updated_at: '2026-04-18T09:00:05.000Z',
        ...cloneJson(query.payload),
      };
      state.learningEventDeliveries.set(row.stable_idempotency_key, row);
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_event_deliveries' && query.operation === 'update') {
      const stableIdempotencyKey = findEqFilter(query.filters, 'stable_idempotency_key');
      const current = state.learningEventDeliveries.get(stableIdempotencyKey) || null;
      const next = current
        ? {
          ...current,
          ...cloneJson(query.payload),
        }
        : null;
      if (next) {
        state.learningEventDeliveries.set(stableIdempotencyKey, next);
      }
      return { data: cloneJson(next), error: null };
    }

    if (query.table === 'attempt_pipeline_state' && query.operation === 'upsert') {
      state.attemptPipelineStates.set(query.payload.attempt_id, cloneJson(query.payload));
      return { data: cloneJson(query.payload), error: null };
    }

    if (query.table === 'learning_family_masteries' && query.operation === 'upsert') {
      const key = [
        query.payload.user_id,
        query.payload.topic_id,
        query.payload.family_id,
      ].join('::');
      const current = state.familyMasteries.get(key) || null;
      const next = {
        family_mastery_id: current?.family_mastery_id ?? `family-mastery-${state.nextFamilyMasteryId++}`,
        ...cloneJson(current ?? {}),
        ...cloneJson(query.payload),
      };
      state.familyMasteries.set(key, next);
      return { data: cloneJson(next), error: null };
    }

    if (query.table === 'learning_type_masteries' && query.operation === 'upsert') {
      const key = [
        query.payload.user_id,
        query.payload.topic_id,
        query.payload.question_type_id,
      ].join('::');
      const current = state.typeMasteries.get(key) || null;
      const next = {
        type_mastery_id: current?.type_mastery_id ?? `type-mastery-${state.nextTypeMasteryId++}`,
        ...cloneJson(current ?? {}),
        ...cloneJson(query.payload),
      };
      state.typeMasteries.set(key, next);
      return { data: cloneJson(next), error: null };
    }

    if (query.table === 'error_events' && query.operation === 'insert') {
      const rows = normalizeArray(query.payload).map((row) => cloneJson(row));
      state.errorEvents.push(...rows);
      return { data: cloneJson(rows), error: null };
    }

    if (query.table === 'learning_review_tasks' && query.operation === 'insert') {
      const row = {
        review_task_id: `review-task-${state.nextReviewTaskId++}`,
        created_at: '2026-04-18T09:06:00.000Z',
        updated_at: query.payload.updated_at ?? '2026-04-18T09:06:00.000Z',
        ...cloneJson(query.payload),
      };
      state.reviewTasks.set(row.review_task_id, row);
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_review_tasks' && query.operation === 'select') {
      const reviewTaskId = findEqFilter(query.filters, 'review_task_id');
      return {
        data: reviewTaskId ? cloneJson(state.reviewTasks.get(reviewTaskId) || null) : null,
        error: null,
      };
    }

    if (query.table === 'learning_review_tasks' && query.operation === 'update') {
      const reviewTaskId = findEqFilter(query.filters, 'review_task_id');
      const current = state.reviewTasks.get(reviewTaskId) || null;
      const next = current
        ? {
          ...current,
          ...cloneJson(query.payload),
        }
        : null;
      if (next) {
        state.reviewTasks.set(reviewTaskId, next);
      }
      return { data: cloneJson(next), error: null };
    }

    if (query.table === 'learning_review_queue_projection' && query.operation === 'select') {
      const rows = listProjectedReviewTasks(state, query.filters);
      if (query.options.single || query.options.maybeSingle) {
        return { data: cloneJson(rows[0] || null), error: null };
      }

      return { data: cloneJson(rows), error: null };
    }

    if (query.table === 'learning_artifacts' && query.operation === 'insert') {
      const row = {
        artifact_id: `artifact-${state.nextArtifactId++}`,
        created_at: query.payload.created_at ?? '2026-04-18T09:07:00.000Z',
        updated_at: query.payload.updated_at ?? '2026-04-18T09:07:00.000Z',
        ...cloneJson(query.payload),
      };
      state.artifacts.set(row.artifact_id, row);
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_artifacts' && query.operation === 'select') {
      let rows = [...state.artifacts.values()];

      for (const filter of query.filters) {
        if (filter.type === 'eq') {
          rows = rows.filter((row) => row[filter.column] === filter.value);
        }
      }

      for (const order of query.orders) {
        rows = rows.sort((left, right) => {
          const leftValue = left[order.column];
          const rightValue = right[order.column];
          if (leftValue === rightValue) {
            return 0;
          }

          if (order.options?.ascending === false) {
            return leftValue < rightValue ? 1 : -1;
          }

          return leftValue > rightValue ? 1 : -1;
        });
      }

      if (query.options.single || query.options.maybeSingle) {
        return { data: cloneJson(rows[0] || null), error: null };
      }

      return { data: cloneJson(rows), error: null };
    }

    if (query.table === 'learning_artifacts' && query.operation === 'update') {
      const artifactId = findEqFilter(query.filters, 'artifact_id');
      const current = state.artifacts.get(artifactId) || null;
      const next = current
        ? {
          ...current,
          ...cloneJson(query.payload),
        }
        : null;
      if (next) {
        state.artifacts.set(artifactId, next);
      }
      return { data: cloneJson(next), error: null };
    }

    if (query.table === 'learning_artifact_content_versions' && query.operation === 'insert') {
      const row = {
        artifact_content_version_id:
          `artifact-content-version-${state.nextArtifactContentVersionId++}`,
        created_at: query.payload.created_at ?? '2026-04-18T09:07:00.000Z',
        ...cloneJson(query.payload),
      };
      if (row.version_number == null) {
        const existing = listArtifactContentVersions(state, [
          { type: 'eq', column: 'artifact_id', value: row.artifact_id },
        ]);
        row.version_number = (existing[0]?.version_number ?? 0) + 1;
      }
      state.artifactContentVersions.set(row.artifact_content_version_id, row);
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_artifact_content_versions' && query.operation === 'select') {
      const rows = listArtifactContentVersions(state, query.filters);
      if (query.options.single || query.options.maybeSingle) {
        return { data: cloneJson(rows[0] || null), error: null };
      }

      return { data: cloneJson(rows), error: null };
    }

    if (query.table === 'learning_artifact_content_versions' && query.operation === 'update') {
      const versionId = findEqFilter(query.filters, 'artifact_content_version_id');
      const current = state.artifactContentVersions.get(versionId) || null;
      const next = current
        ? {
          ...current,
          ...cloneJson(query.payload),
        }
        : null;
      if (next) {
        state.artifactContentVersions.set(versionId, next);
      }
      return { data: cloneJson(next), error: null };
    }

    if (query.table === 'learning_workspaces' && query.operation === 'select') {
      const workspaceId = findEqFilter(query.filters, 'workspace_id');
      const userId = findEqFilter(query.filters, 'user_id');
      const topicId = findEqFilter(query.filters, 'topic_id');

      if (workspaceId) {
        return {
          data: cloneJson(state.workspaces.get(workspaceId) || null),
          error: null,
        };
      }

      if (userId && topicId) {
        return {
          data: cloneJson(getWorkspaceByTopic(state, userId, topicId)),
          error: null,
        };
      }

      return { data: null, error: null };
    }

    if (query.table === 'learning_workspaces' && query.operation === 'insert') {
      const row = {
        workspace_id: `workspace-${state.nextWorkspaceId++}`,
        updated_at: '2026-04-18T09:08:00.000Z',
        ...cloneJson(query.payload),
      };
      state.workspaces.set(row.workspace_id, row);
      state.workspaceByUserTopic.set(
        buildWorkspaceKey(row.user_id, row.topic_id),
        row.workspace_id,
      );
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_workspace_slots' && query.operation === 'select') {
      const workspaceId = findEqFilter(query.filters, 'workspace_id');
      const slotKey = findEqFilter(query.filters, 'slot_key');
      const workspaceSlotId = findEqFilter(query.filters, 'workspace_slot_id');

      if (workspaceSlotId) {
        return {
          data: cloneJson(state.workspaceSlots.get(workspaceSlotId) || null),
          error: null,
        };
      }

      const row = [...state.workspaceSlots.values()].find((slot) =>
        slot.workspace_id === workspaceId && slot.slot_key === slotKey,
      ) || null;
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_workspace_slots' && query.operation === 'insert') {
      const row = {
        workspace_slot_id: `workspace-slot-${state.nextWorkspaceSlotId++}`,
        updated_at: '2026-04-18T09:08:00.000Z',
        ...cloneJson(query.payload),
      };
      state.workspaceSlots.set(row.workspace_slot_id, row);
      return { data: cloneJson(row), error: null };
    }

    if (query.table === 'learning_workspace_slots' && query.operation === 'update') {
      const workspaceSlotId = findEqFilter(query.filters, 'workspace_slot_id');
      const current = state.workspaceSlots.get(workspaceSlotId) || null;
      const next = current
        ? {
          ...current,
          ...cloneJson(query.payload),
        }
        : null;
      if (next) {
        state.workspaceSlots.set(workspaceSlotId, next);
      }
      return { data: cloneJson(next), error: null };
    }

    if (query.table === 'learning_workspace_projection' && query.operation === 'select') {
      const topicId = findEqFilter(query.filters, 'topic_id');
      const userId = findEqFilter(query.filters, 'user_id');
      return {
        data: cloneJson(deriveWorkspaceProjection(state, userId, topicId)),
        error: null,
      };
    }

    if (query.table === 'mark_runs' && query.operation === 'select') {
      const markRunId = findEqFilter(query.filters, 'mark_run_id');
      return {
        data: markRunId ? cloneJson(state.markRuns.get(markRunId) || null) : null,
        error: null,
      };
    }

    throw new Error(`Unhandled learning query: ${query.table}:${query.operation}`);
  }

  const QueryBuilder = createQueryBuilder(state, queries, resolveQuery);

  return {
    state,
    queries,
    async rpc(name, params) {
      queries.push({
        table: `rpc:${name}`,
        params: cloneJson(params),
      });

      if (name !== 'create_learning_artifact_content_version') {
        throw new Error(`Unhandled rpc: ${name}`);
      }

      const current = listArtifactContentVersions(state, [
        { type: 'eq', column: 'artifact_id', value: params.p_artifact_id },
        { type: 'eq', column: 'is_current', value: true },
      ])[0] ?? null;

      if (params.p_is_current ?? true) {
        if (current) {
          state.artifactContentVersions.set(current.artifact_content_version_id, {
            ...current,
            is_current: false,
          });
        }
      }

      const row = {
        artifact_content_version_id:
          `artifact-content-version-${state.nextArtifactContentVersionId++}`,
        artifact_id: params.p_artifact_id,
        version_number: params.p_version_number,
        lineage_parent_version_id: params.p_lineage_parent_version_id,
        is_current: params.p_is_current,
        title: params.p_title,
        summary: params.p_summary,
        body_markdown: params.p_body_markdown,
        content_format: params.p_content_format,
        render_payload: cloneJson(params.p_render_payload),
        materialization_kind: params.p_materialization_kind,
        source_refs: cloneJson(params.p_source_refs),
        created_at: params.p_created_at ?? '2026-04-18T09:07:00.000Z',
      };
      state.artifactContentVersions.set(row.artifact_content_version_id, row);
      return { data: cloneJson(row), error: null };
    },
    from(table) {
      return new QueryBuilder(table);
    },
  };
}
