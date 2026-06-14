import {
  assertNoRouteContractCollisions,
  findRoute,
  findRouteContractCollisions,
  listRoutes,
} from '../route-registry.js';

function authMetadataSnapshot() {
  return listRoutes().map((route) => ({
    module: route.module,
    auth: route.auth,
    authMode: route.authMode,
    methods: route.methods,
    moduleOwnsMethodRouting: route.moduleOwnsMethodRouting,
  }));
}

function rateMetadataSnapshot() {
  return listRoutes().map((route) => ({
    module: route.module,
    hasRateLimit: route.hasRateLimit,
    rateLimitMethods: route.rateLimitMethods,
    rateLimitPolicyId: route.rateLimitPolicyId,
  }));
}

describe('route registry collision guard', () => {
  test('fails deterministically for duplicate method and path route definitions', () => {
    const duplicateRoutes = [
      {
        module: 'example-first',
        pathPrefix: '/api/example',
        methods: ['POST', 'GET'],
      },
      {
        module: 'example-second',
        pathPrefix: '/api/example',
        methods: ['POST'],
      },
      {
        module: 'example-third',
        pathPrefix: '/api/example',
        methods: ['GET'],
      },
    ];

    let message = null;
    try {
      assertNoRouteContractCollisions(duplicateRoutes);
    } catch (error) {
      message = error.message;
    }

    expect(message).toBe([
      'Route registry contains duplicate method + path definitions.',
      'GET /api/example: example-first[0] shadows example-third[2]',
      'POST /api/example: example-first[0] shadows example-second[1]',
    ].join('\n'));
  });

  test('passes the live route registry collision lint', () => {
    expect(findRouteContractCollisions()).toEqual([]);
    expect(() => assertNoRouteContractCollisions()).not.toThrow();
  });

  test('keeps the existing auth metadata snapshot unchanged', () => {
    expect(authMetadataSnapshot()).toEqual([
      {
        module: 'learning-sessions-ask',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-sessions-id',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['GET', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-sessions',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-questions-import',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-questions',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['GET', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-workspace-paper',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['GET', 'POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-workspace-topic',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['GET', 'POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-review-task-id',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['PATCH', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-review-tasks',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['GET', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'learning-artifact-id',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['PATCH', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'recommendations-preferences',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['*'],
        moduleOwnsMethodRouting: true,
      },
      {
        module: 'recommendations-learning-data',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['*'],
        moduleOwnsMethodRouting: true,
      },
      {
        module: 'recommendations',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['*'],
        moduleOwnsMethodRouting: true,
      },
      {
        module: 'rag-search',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'rag-ask',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'marking-evaluate-v1',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'error-book-id',
        auth: 'jwt_required',
        authMode: 'ownership',
        methods: ['GET', 'PATCH', 'DELETE', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'error-book',
        auth: 'jwt_required',
        authMode: 'ownership',
        methods: ['GET', 'POST', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'evidence-context',
        auth: 'jwt_required',
        authMode: 'authenticated',
        methods: ['GET', 'OPTIONS'],
        moduleOwnsMethodRouting: false,
      },
      {
        module: 'auth',
        auth: 'none',
        authMode: 'public',
        methods: ['*'],
        moduleOwnsMethodRouting: true,
      },
    ]);
  });

  test('keeps the existing rate metadata snapshot unchanged', () => {
    expect(rateMetadataSnapshot()).toEqual([
      {
        module: 'learning-sessions-ask',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-sessions-id',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-sessions',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-questions-import',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-questions',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-workspace-paper',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-workspace-topic',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-review-task-id',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-review-tasks',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'learning-artifact-id',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'recommendations-preferences',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'recommendations-learning-data',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'recommendations',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'rag-search',
        hasRateLimit: true,
        rateLimitMethods: null,
        rateLimitPolicyId: 'rag_ai_default_v1',
      },
      {
        module: 'rag-ask',
        hasRateLimit: true,
        rateLimitMethods: null,
        rateLimitPolicyId: 'rag_ai_default_v1',
      },
      {
        module: 'marking-evaluate-v1',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'error-book-id',
        hasRateLimit: true,
        rateLimitMethods: ['PATCH', 'DELETE'],
        rateLimitPolicyId: 'error_book_write_v1',
      },
      {
        module: 'error-book',
        hasRateLimit: true,
        rateLimitMethods: ['POST'],
        rateLimitPolicyId: 'error_book_write_v1',
      },
      {
        module: 'evidence-context',
        hasRateLimit: false,
        rateLimitMethods: null,
        rateLimitPolicyId: null,
      },
      {
        module: 'auth',
        hasRateLimit: true,
        rateLimitMethods: null,
        rateLimitPolicyId: 'auth_public_v1',
      },
    ]);
  });

  test('documents first-match dispatch as intentional and guarded by collision lint', () => {
    // findRoute intentionally resolves the first matching route; exact method+path
    // collisions fail before order can shadow a duplicate.
    expect(findRoute('/api/recommendations/preferences', 'GET').route?.module)
      .toBe('recommendations-preferences');
    expect(findRoute('/api/recommendations/other', 'GET').route?.module)
      .toBe('recommendations');
    expect(() => assertNoRouteContractCollisions()).not.toThrow();
  });
});
