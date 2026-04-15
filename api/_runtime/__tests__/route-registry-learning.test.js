import { findRoute, listRoutes } from '../route-registry.js';

describe('learning route registry', () => {
  test('reserves every frozen /api/learning endpoint with dynamic route support', () => {
    expect(findRoute('/api/learning/sessions/session-1/ask', 'POST')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-sessions-ask',
        importPath: '../learning/sessions/[id]/ask.js',
      }),
      allowed: true,
      params: { id: 'session-1' },
    });

    expect(findRoute('/api/learning/sessions/session-1', 'GET')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-sessions-id',
        importPath: '../learning/sessions/[id].js',
      }),
      allowed: true,
      params: { id: 'session-1' },
    });

    expect(findRoute('/api/learning/sessions', 'POST')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-sessions',
        importPath: '../learning/sessions/index.js',
      }),
      allowed: true,
    });

    expect(findRoute('/api/learning/questions/import', 'POST')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-questions-import',
        importPath: '../learning/questions/import.js',
      }),
      allowed: true,
    });

    expect(findRoute('/api/learning/questions', 'GET')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-questions',
        importPath: '../learning/questions/index.js',
      }),
      allowed: true,
    });

    expect(findRoute('/api/learning/workspaces/topic-1', 'GET')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-workspace-topic',
        importPath: '../learning/workspaces/[topicId].js',
      }),
      allowed: true,
      params: { topicId: 'topic-1' },
    });

    expect(findRoute('/api/learning/review-tasks', 'GET')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-review-tasks',
        importPath: '../learning/review-tasks/index.js',
      }),
      allowed: true,
    });

    expect(findRoute('/api/learning/review-tasks/review-task-1', 'PATCH')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-review-task-id',
        importPath: '../learning/review-tasks/[id].js',
      }),
      allowed: true,
      params: { id: 'review-task-1' },
    });

    expect(findRoute('/api/learning/artifacts/artifact-1', 'PATCH')).toMatchObject({
      route: expect.objectContaining({
        module: 'learning-artifact-id',
        importPath: '../learning/artifacts/[id].js',
      }),
      allowed: true,
      params: { id: 'artifact-1' },
    });
  });

  test('places the dynamic session routes before the base prefix route', () => {
    const routeModules = listRoutes()
      .filter((route) => route.module.startsWith('learning-'))
      .map((route) => route.module);

    expect(routeModules).toEqual([
      'learning-sessions-ask',
      'learning-sessions-id',
      'learning-sessions',
      'learning-questions-import',
      'learning-questions',
      'learning-workspace-topic',
      'learning-review-task-id',
      'learning-review-tasks',
      'learning-artifact-id',
    ]);
  });

  test('rejects unsupported methods without losing the dynamic route match', () => {
    const sessionRead = findRoute('/api/learning/sessions/session-1', 'PATCH');
    expect(sessionRead.route?.module).toBe('learning-sessions-id');
    expect(sessionRead.allowed).toBe(false);

    const sessionAsk = findRoute('/api/learning/sessions/session-1/ask', 'GET');
    expect(sessionAsk.route?.module).toBe('learning-sessions-ask');
    expect(sessionAsk.allowed).toBe(false);

    const reviewTaskPatch = findRoute('/api/learning/review-tasks/review-task-1', 'GET');
    expect(reviewTaskPatch.route?.module).toBe('learning-review-task-id');
    expect(reviewTaskPatch.allowed).toBe(false);
  });

  test('does not let the create-session route match deeper subtree paths', () => {
    expect(findRoute('/api/learning/sessions/session-1/extra', 'POST')).toEqual({
      route: null,
      allowed: false,
      params: {},
    });
  });

  test('does not let the learning questions search route match deeper subtree paths', () => {
    expect(findRoute('/api/learning/questions/foo', 'GET')).toEqual({
      route: null,
      allowed: false,
      params: {},
    });
  });
});
