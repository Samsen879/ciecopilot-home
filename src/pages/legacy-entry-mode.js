const META_ENV = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};

export const LEARNING_RUNTIME_ROUTE_PATHS = Object.freeze([
  '/learn/session/:sessionId',
  '/learn/workspace/:topicId',
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

export function isLearningRuntimeEnabled(options = {}, env = META_ENV) {
  if (typeof options.learningRuntimeEnabled === 'boolean') {
    return options.learningRuntimeEnabled;
  }

  if (typeof options.featureFlags?.learningRuntimeEnabled === 'boolean') {
    return options.featureFlags.learningRuntimeEnabled;
  }

  return env.VITE_LEARNING_RUNTIME_ENABLED === 'true';
}

export function getAskAiEntryMode(options = {}) {
  return isLearningRuntimeEnabled(options) ? 'learning_runtime' : 'legacy_chat';
}

export function getStudyHubSurfaceMode(options = {}) {
  return isLearningRuntimeEnabled(options) ? 'compatibility_shell' : 'legacy_hub';
}

export function getLearningPathSurfaceMode(options = {}) {
  return isLearningRuntimeEnabled(options) ? 'compatibility_shell' : 'legacy_path';
}
