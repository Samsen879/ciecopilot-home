import { validateCreateSessionInput } from '../lib/validators/session-validator.js';

test('question anchor requires matching current_question_id', () => {
  expect(() => validateCreateSessionInput({
    subject_code: '9709',
    mode: 'guided_solve',
    anchor_kind: 'question',
    anchor_ref: { kind: 'question', question_id: 'q-1' },
    current_question_id: 'q-2',
  })).toThrow(/invalid_payload/);
});

test('concept anchor allows questionless learn_concept create with optional question type', () => {
  expect(validateCreateSessionInput({
    subject_code: '9709',
    mode: 'learn_concept',
    anchor_kind: 'concept',
    anchor_ref: { kind: 'concept', topic_id: 'topic-1', topic_path: 'pure/trigonometry/identities' },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.identities',
  })).toEqual({
    ok: true,
    normalized: {
      subject_code: '9709',
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
    subject_code: '9709',
    mode: 'spaced_review',
    anchor_kind: 'review_task',
    anchor_ref: { kind: 'review_task', review_task_id: 'rt-1' },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.equations',
  }).ok).toBe(true);
});

test('artifact anchor may resume post_mortem_review without inventing a question id', () => {
  expect(validateCreateSessionInput({
    subject_code: '9709',
    mode: 'post_mortem_review',
    anchor_kind: 'artifact',
    anchor_ref: { kind: 'artifact', artifact_id: 'art-1' },
    current_question_id: null,
    current_question_type_id: null,
  }).ok).toBe(true);
});

test('workspace_slot.review_queue can start spaced_review without question id', () => {
  expect(validateCreateSessionInput({
    subject_code: '9709',
    mode: 'spaced_review',
    anchor_kind: 'workspace_slot',
    anchor_ref: { kind: 'workspace_slot', workspace_id: 'ws-1', slot_key: 'review_queue' },
    current_question_id: null,
    current_question_type_id: null,
  }).ok).toBe(true);
});

test('non-review_queue workspace slots cannot start spaced_review', () => {
  expect(() => validateCreateSessionInput({
    subject_code: '9709',
    mode: 'spaced_review',
    anchor_kind: 'workspace_slot',
    anchor_ref: { kind: 'workspace_slot', workspace_id: 'ws-1', slot_key: 'common_traps' },
    current_question_id: null,
    current_question_type_id: null,
  })).toThrow(/unsupported_mode_for_anchor/);
});

