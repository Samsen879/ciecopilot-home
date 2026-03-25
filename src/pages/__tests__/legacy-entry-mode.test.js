import {
  LEARNING_RUNTIME_LEGACY_ROLLBACK_ENV_FLAG,
  LEARNING_RUNTIME_ROUTE_PATHS,
  LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH,
  getAskAiEntryMode,
  getLearningPathSurfaceMode,
  getStudyHubSurfaceMode,
} from '../legacy-entry-mode.js';

describe('legacy runtime entry modes', () => {
  test('runtime-first entry is the default posture when no rollback override is active', () => {
    expect(getAskAiEntryMode()).toBe('learning_runtime');
    expect(getStudyHubSurfaceMode()).toBe('compatibility_shell');
    expect(getLearningPathSurfaceMode()).toBe('compatibility_shell');
  });

  test('legacy surfaces only recover their pre-runtime modes when rollback is explicit', () => {
    expect(getAskAiEntryMode({ learningRuntimeRollback: true })).toBe('legacy_chat');
    expect(getStudyHubSurfaceMode({ learningRuntimeRollback: true })).toBe('legacy_hub');
    expect(getLearningPathSurfaceMode({ learningRuntimeRollback: true })).toBe('legacy_path');
  });

  test('rollback env flag restores legacy entry surfaces', () => {
    const rollbackEnv = {
      [LEARNING_RUNTIME_LEGACY_ROLLBACK_ENV_FLAG]: 'true',
    };

    expect(getAskAiEntryMode({}, rollbackEnv)).toBe('legacy_chat');
    expect(getStudyHubSurfaceMode({}, rollbackEnv)).toBe('legacy_hub');
    expect(getLearningPathSurfaceMode({}, rollbackEnv)).toBe('legacy_path');
  });

  test('retired frontend pilot flag no longer controls the canonical runtime entry', () => {
    const retiredFlagEnv = {
      VITE_LEARNING_RUNTIME_ENABLED: 'false',
    };

    expect(getAskAiEntryMode({}, retiredFlagEnv)).toBe('learning_runtime');
    expect(getStudyHubSurfaceMode({}, retiredFlagEnv)).toBe('compatibility_shell');
    expect(getLearningPathSurfaceMode({}, retiredFlagEnv)).toBe('compatibility_shell');
  });

  test('App exposes the learning runtime session and workspace routes', () => {
    expect(LEARNING_RUNTIME_ROUTE_PATHS).toEqual(expect.arrayContaining([
      '/learn/session/:sessionId',
      '/learn/workspace/:topicId',
      '/learn/review-queue',
    ]));
    expect(LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH).toBe('/learn/review-queue');
  });
});
