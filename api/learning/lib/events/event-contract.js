export const LEARNING_EVENT_TYPES = Object.freeze([
  'AttemptSubmitted',
  'QuestionClassified',
  'MarkingCompleted',
  'LearningUpdateProposed',
  'MasteryUpdated',
  'ReviewTasksCreated',
  'ArtifactSuggestionsCreated',
]);

export const LEARNING_EVENT_STAGE_ORDINAL = Object.freeze(
  LEARNING_EVENT_TYPES.reduce((accumulator, eventType, index) => ({
    ...accumulator,
    [eventType]: index + 1,
  }), {}),
);

export const ATTEMPT_PIPELINE_STATUSES = Object.freeze([
  'running',
  'completed',
  'failed',
  'blocked',
  'reconciling',
]);

export const LEARNING_EVENT_EFFECT_STATUSES = Object.freeze([
  'started',
  'succeeded',
  'failed',
  'noop',
  'superseded',
]);

export const ACTIVE_EVENT_POINTER_FIELD_BY_TYPE = Object.freeze({
  QuestionClassified: 'active_classification_event_id',
  MarkingCompleted: 'active_marking_event_id',
  LearningUpdateProposed: 'active_learning_update_event_id',
  MasteryUpdated: 'active_mastery_event_id',
  ReviewTasksCreated: 'active_review_tasks_event_id',
  ArtifactSuggestionsCreated: 'active_artifact_suggestions_event_id',
});

export const TERMINAL_LEARNING_EVENT_TYPE = 'ArtifactSuggestionsCreated';

export function isLearningEventType(value) {
  return LEARNING_EVENT_TYPES.includes(value);
}

export function getLearningEventStageOrdinal(eventType) {
  if (!isLearningEventType(eventType)) {
    throw new Error(`unknown_learning_event_type:${String(eventType)}`);
  }

  return LEARNING_EVENT_STAGE_ORDINAL[eventType];
}
