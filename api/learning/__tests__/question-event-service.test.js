import {
  buildQuestionEventRef,
  appendQuestionClassifiedEvent,
} from '../lib/events/question-event-service.js';

describe('question-event-service', () => {
  // ─── buildQuestionEventRef ───

  test('buildQuestionEventRef returns a correctly shaped ref', () => {
    const ref = buildQuestionEventRef('evt-abc-123');

    expect(ref).toEqual({
      kind: 'question_event',
      question_event_id: 'evt-abc-123',
      event_type: 'QuestionClassified',
    });
  });

  // ─── appendQuestionClassifiedEvent validation ───

  test('throws when questionId is missing', async () => {
    const mockClient = { from: () => ({}) };

    await expect(
      appendQuestionClassifiedEvent(mockClient, {
        questionId: '',
        classificationSnapshotId: 'snap-1',
      }),
    ).rejects.toThrow('question_id and classification_snapshot_id');
  });

  test('throws when classificationSnapshotId is missing', async () => {
    const mockClient = { from: () => ({}) };

    await expect(
      appendQuestionClassifiedEvent(mockClient, {
        questionId: 'q-1',
        classificationSnapshotId: '',
      }),
    ).rejects.toThrow('question_id and classification_snapshot_id');
  });

  test('throws when both are null', async () => {
    const mockClient = { from: () => ({}) };

    await expect(
      appendQuestionClassifiedEvent(mockClient, {
        questionId: null,
        classificationSnapshotId: null,
      }),
    ).rejects.toThrow('question_id and classification_snapshot_id');
  });

  // ─── successful insert ───

  test('inserts event and returns eventRef when client succeeds', async () => {
    const insertedId = 'evt-generated-uuid';
    const mockChain = {
      insert: () => mockChain,
      select: () => mockChain,
      single: () => Promise.resolve({
        data: { question_event_id: insertedId },
        error: null,
      }),
    };
    const mockClient = { from: () => mockChain };

    const result = await appendQuestionClassifiedEvent(mockClient, {
      questionId: 'q-1',
      classificationSnapshotId: 'snap-1',
      question: { subject_code: '9709', source_kind: 'imported_question' },
      classification: {
        family_id: '9709.trigonometry_manipulation_equations',
        primary_question_type_id: '9709.trigonometry.identities',
        classification_confidence: 0.93,
        analysis_version: 'phase_a.v2',
      },
    });

    expect(result.questionEventId).toBe(insertedId);
    expect(result.eventRef).toEqual(buildQuestionEventRef(insertedId));
  });

  // ─── DB error handling ───

  test('throws when DB returns an error', async () => {
    const mockChain = {
      insert: () => mockChain,
      select: () => mockChain,
      single: () => Promise.resolve({
        data: null,
        error: { message: 'insert failed' },
      }),
    };
    const mockClient = { from: () => mockChain };

    await expect(
      appendQuestionClassifiedEvent(mockClient, {
        questionId: 'q-1',
        classificationSnapshotId: 'snap-1',
      }),
    ).rejects.toThrow('insert failed');
  });
});
