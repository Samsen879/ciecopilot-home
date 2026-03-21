import {
  LEARNING_RUNTIME_ROUTE_PATHS,
  getAskAiEntryMode,
  getLearningPathSurfaceMode,
  getStudyHubSurfaceMode,
} from '../legacy-entry-mode.js';

describe('legacy runtime entry modes', () => {
  test('legacy surfaces demote to compatibility entry modes and App exposes runtime routes', () => {
    expect(getAskAiEntryMode({ learningRuntimeEnabled: true })).toBe('learning_runtime');
    expect(getStudyHubSurfaceMode({ learningRuntimeEnabled: true })).toBe('compatibility_shell');
    expect(getLearningPathSurfaceMode({ learningRuntimeEnabled: true })).toBe('compatibility_shell');
    expect(LEARNING_RUNTIME_ROUTE_PATHS).toEqual(expect.arrayContaining([
      '/learn/session/:sessionId',
      '/learn/workspace/:topicId',
    ]));
  });
});
