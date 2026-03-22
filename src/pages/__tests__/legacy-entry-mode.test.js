import {
  LEARNING_RUNTIME_ROUTE_PATHS,
  getAskAiEntryMode,
  getLearningPathSurfaceMode,
  getStudyHubSurfaceMode,
} from '../legacy-entry-mode.js';

describe('legacy runtime entry modes', () => {
  test('legacy entry surfaces stay on their pre-runtime modes when the feature flag is absent', () => {
    expect(getAskAiEntryMode()).toBe('legacy_chat');
    expect(getStudyHubSurfaceMode()).toBe('legacy_hub');
    expect(getLearningPathSurfaceMode()).toBe('legacy_path');
  });

  test('legacy ask-ai page routes users into the new learning runtime entry under the feature flag', () => {
    expect(getAskAiEntryMode({ learningRuntimeEnabled: true })).toBe('learning_runtime');
  });

  test('legacy study hub stays a compatibility shell under the runtime feature flag', () => {
    expect(getStudyHubSurfaceMode({ learningRuntimeEnabled: true })).toBe('compatibility_shell');
  });

  test('legacy learning path stays a compatibility shell under the runtime feature flag', () => {
    expect(getLearningPathSurfaceMode({ learningRuntimeEnabled: true })).toBe('compatibility_shell');
  });

  test('App exposes the learning runtime session and workspace routes', () => {
    expect(LEARNING_RUNTIME_ROUTE_PATHS).toEqual(expect.arrayContaining([
      '/learn/session/:sessionId',
      '/learn/workspace/:topicId',
    ]));
  });
});
