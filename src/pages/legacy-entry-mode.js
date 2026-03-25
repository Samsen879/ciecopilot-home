const META_ENV = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};

export const LEARNING_RUNTIME_LEGACY_ROLLBACK_ENV_FLAG = 'VITE_LEARNING_RUNTIME_ROLLBACK_TO_LEGACY';

export const LEARNING_RUNTIME_SESSION_ROUTE_PATH = '/learn/session/:sessionId';
export const LEARNING_RUNTIME_WORKSPACE_ROUTE_PATH = '/learn/workspace/:topicId';
export const LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH = '/learn/review-queue';

export const LEARNING_RUNTIME_ROUTE_PATHS = Object.freeze([
  LEARNING_RUNTIME_SESSION_ROUTE_PATH,
  LEARNING_RUNTIME_WORKSPACE_ROUTE_PATH,
  LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH,
]);

export const LEARNING_RUNTIME_ENTRY_TOPICS = Object.freeze([
  {
    topicId: 'topic-trig-equations',
    topicPath: '9709/trigonometry/equations',
    title: 'Trigonometric equations',
  },
  {
    topicId: 'topic-trig-identities',
    topicPath: '9709/trigonometry/identities',
    title: 'Trigonometric identities',
  },
]);

export function isLearningRuntimeLegacyRollbackActive(options = {}, env = META_ENV) {
  if (typeof options.learningRuntimeRollback === 'boolean') {
    return options.learningRuntimeRollback;
  }

  if (typeof options.featureFlags?.learningRuntimeRollback === 'boolean') {
    return options.featureFlags.learningRuntimeRollback;
  }

  return env[LEARNING_RUNTIME_LEGACY_ROLLBACK_ENV_FLAG] === 'true';
}

export function isLearningRuntimeEnabled(options = {}, env = META_ENV) {
  return !isLearningRuntimeLegacyRollbackActive(options, env);
}

export function getAskAiEntryMode(options = {}, env = META_ENV) {
  return isLearningRuntimeEnabled(options, env) ? 'learning_runtime' : 'legacy_chat';
}

export function getStudyHubSurfaceMode(options = {}, env = META_ENV) {
  return isLearningRuntimeEnabled(options, env) ? 'compatibility_shell' : 'legacy_hub';
}

export function getLearningPathSurfaceMode(options = {}, env = META_ENV) {
  return isLearningRuntimeEnabled(options, env) ? 'compatibility_shell' : 'legacy_path';
}
