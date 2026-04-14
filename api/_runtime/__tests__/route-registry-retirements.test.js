import { findRoute, listRoutes } from '../route-registry.js';

describe('route registry retirements', () => {
  test('does not register retired community, legacy users, or legacy learning-path AI routes', () => {
    const routeModules = listRoutes().map((route) => route.module);

    expect(routeModules).not.toEqual(expect.arrayContaining([
      'community',
      'users-profile',
      'users-permissions',
      'users',
      'ai-analysis',
      'ai-learning-path',
    ]));
  });

  test('does not resolve retired path prefixes', () => {
    expect(findRoute('/api/community', 'POST')).toMatchObject({ route: null, params: {} });
    expect(findRoute('/api/users', 'GET')).toMatchObject({ route: null, params: {} });
    expect(findRoute('/api/users/profile', 'GET')).toMatchObject({ route: null, params: {} });
    expect(findRoute('/api/ai/learning/path-generator', 'POST')).toMatchObject({ route: null, params: {} });
    expect(findRoute('/api/ai/analysis/knowledge-gaps', 'POST')).toMatchObject({ route: null, params: {} });
  });
});
