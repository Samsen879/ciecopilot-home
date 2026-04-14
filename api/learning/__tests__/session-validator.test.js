import { validateCreateSessionInput } from '../lib/validators/session-validator.js';
import { resolveCreateSessionAnchor } from '../lib/session-runtime/session-anchor-resolution.js';

const TOPIC_UUID = '11111111-1111-4111-8111-111111111111';
const TOPIC_PATH = '9709.trigonometry.equations';

function isUuidString(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  );
}

function createCurriculumClient(nodes = []) {
  const calls = [];

  return {
    calls,
    from(table) {
      const filters = [];
      let columns = null;

      return {
        select(value) {
          columns = value;
          return this;
        },
        eq(field, value) {
          filters.push({ field, value });
          return this;
        },
        async maybeSingle() {
          calls.push({
            table,
            columns,
            filters: [...filters],
          });

          if (table !== 'curriculum_nodes') {
            throw new Error(`Unhandled test table: ${table}`);
          }

          const topicId = filters.find((filter) => filter.field === 'node_id')?.value;
          if (topicId !== undefined) {
            if (!isUuidString(topicId)) {
              return {
                data: null,
                error: { message: 'invalid input syntax for type uuid' },
              };
            }

            return {
              data: nodes.find((node) => node.node_id === topicId) ?? null,
              error: null,
            };
          }

          const topicPath = filters.find((filter) => filter.field === 'topic_path')?.value;
          return {
            data: nodes.find((node) => node.topic_path === topicPath) ?? null,
            error: null,
          };
        },
      };
    },
  };
}

test('question anchor requires matching current_question_id', () => {
  expect(() => validateCreateSessionInput({
    mode: 'guided_solve',
    anchor_kind: 'question',
    anchor_ref: { kind: 'question', question_id: 'q-1' },
    current_question_id: 'q-2',
  })).toThrow(/invalid_payload/);
});

test('concept anchor allows questionless learn_concept create with optional question type', () => {
  expect(validateCreateSessionInput({
    mode: 'learn_concept',
    anchor_kind: 'concept',
    anchor_ref: { kind: 'concept', topic_id: 'topic-1', topic_path: 'pure/trigonometry/identities' },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.identities',
  })).toEqual({
    ok: true,
    normalized: {
      mode: 'learn_concept',
      session_goal: null,
      anchor_kind: 'concept',
      anchor_ref: {
        kind: 'concept',
        topic_id: 'topic-1',
        topic_path: 'pure/trigonometry/identities',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.identities',
    },
  });
});

test('review_task anchor may start spaced_review with type context but no concrete question', () => {
  expect(validateCreateSessionInput({
    mode: 'spaced_review',
    anchor_kind: 'review_task',
    anchor_ref: { kind: 'review_task', review_task_id: 'rt-1' },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.equations',
  }).ok).toBe(true);
});

test('malformed anchor refs use the frozen invalid_anchor_ref code', () => {
  expect(() => validateCreateSessionInput({
    mode: 'spaced_review',
    anchor_kind: 'review_task',
    anchor_ref: { kind: 'review_task' },
    current_question_id: null,
    current_question_type_id: null,
  })).toThrow(/invalid_anchor_ref/);
});

test('artifact anchor may resume post_mortem_review without inventing a question id', () => {
  expect(validateCreateSessionInput({
    mode: 'post_mortem_review',
    anchor_kind: 'artifact',
    anchor_ref: { kind: 'artifact', artifact_id: 'art-1' },
    current_question_id: null,
    current_question_type_id: null,
  }).ok).toBe(true);
});

test('workspace_slot.review_queue can start spaced_review without question id', () => {
  expect(validateCreateSessionInput({
    mode: 'spaced_review',
    anchor_kind: 'workspace_slot',
    anchor_ref: { kind: 'workspace_slot', workspace_id: 'ws-1', slot_key: 'review_queue' },
    current_question_id: null,
    current_question_type_id: null,
  }).ok).toBe(true);
});

test('non-review_queue workspace slots cannot start spaced_review', () => {
  expect(() => validateCreateSessionInput({
    mode: 'spaced_review',
    anchor_kind: 'workspace_slot',
    anchor_ref: { kind: 'workspace_slot', workspace_id: 'ws-1', slot_key: 'common_traps' },
    current_question_id: null,
    current_question_type_id: null,
  })).toThrow(/unsupported_mode_for_anchor/);
});

test('resolveCreateSessionAnchor loads concept topic by uuid when topic_id is canonical', async () => {
  const client = createCurriculumClient([
    { node_id: TOPIC_UUID, topic_path: TOPIC_PATH },
  ]);

  await expect(resolveCreateSessionAnchor(client, {
    anchorKind: 'concept',
    subjectCode: '9709',
    anchorRef: {
      kind: 'concept',
      topic_id: TOPIC_UUID,
      topic_path: TOPIC_PATH,
    },
    currentQuestionTypeId: '9709.trigonometry.equations',
  })).resolves.toEqual({
    currentQuestionId: null,
    currentQuestionTypeId: '9709.trigonometry.equations',
    canonicalHome: {
      topic_id: TOPIC_UUID,
      topic_path: TOPIC_PATH,
    },
  });

  expect(client.calls).toEqual([
    {
      table: 'curriculum_nodes',
      columns: 'node_id, topic_path',
      filters: [{ field: 'node_id', value: TOPIC_UUID }],
    },
  ]);
});

test('resolveCreateSessionAnchor falls back to topic_path when concept topic_id is a slug', async () => {
  const client = createCurriculumClient([
    { node_id: TOPIC_UUID, topic_path: TOPIC_PATH },
  ]);

  await expect(resolveCreateSessionAnchor(client, {
    anchorKind: 'concept',
    subjectCode: '9709',
    anchorRef: {
      kind: 'concept',
      topic_id: 'topic-trig-equations',
      topic_path: TOPIC_PATH,
    },
    currentQuestionTypeId: '9709.trigonometry.equations',
  })).resolves.toEqual({
    currentQuestionId: null,
    currentQuestionTypeId: '9709.trigonometry.equations',
    canonicalHome: {
      topic_id: TOPIC_UUID,
      topic_path: TOPIC_PATH,
    },
  });

  expect(client.calls).toEqual([
    {
      table: 'curriculum_nodes',
      columns: 'node_id, topic_path',
      filters: [{ field: 'topic_path', value: TOPIC_PATH }],
    },
  ]);
});

test('resolveCreateSessionAnchor does not fall back to topic_path when concept topic_id is a missing uuid', async () => {
  const client = createCurriculumClient([
    { node_id: TOPIC_UUID, topic_path: TOPIC_PATH },
  ]);

  await expect(resolveCreateSessionAnchor(client, {
    anchorKind: 'concept',
    subjectCode: '9709',
    anchorRef: {
      kind: 'concept',
      topic_id: '22222222-2222-4222-8222-222222222222',
      topic_path: TOPIC_PATH,
    },
    currentQuestionTypeId: '9709.trigonometry.equations',
  })).rejects.toMatchObject({
    code: 'anchor_target_not_found',
    status: 404,
  });

  expect(client.calls).toEqual([
    {
      table: 'curriculum_nodes',
      columns: 'node_id, topic_path',
      filters: [{ field: 'node_id', value: '22222222-2222-4222-8222-222222222222' }],
    },
  ]);
});

test('resolveCreateSessionAnchor returns 404 when concept topic is missing by both uuid and topic_path', async () => {
  const client = createCurriculumClient([]);

  await expect(resolveCreateSessionAnchor(client, {
    anchorKind: 'concept',
    subjectCode: '9709',
    anchorRef: {
      kind: 'concept',
      topic_id: 'topic-trig-equations',
      topic_path: TOPIC_PATH,
    },
    currentQuestionTypeId: '9709.trigonometry.equations',
  })).rejects.toMatchObject({
    code: 'anchor_target_not_found',
    status: 404,
  });

  expect(client.calls).toEqual([
    {
      table: 'curriculum_nodes',
      columns: 'node_id, topic_path',
      filters: [{ field: 'topic_path', value: TOPIC_PATH }],
    },
  ]);
});
