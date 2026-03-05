const POLICY_BY_MODULE = Object.freeze({
  'users-profile': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'users-permissions': {
    authMode: 'role',
    coverageActors: ['anonymous', 'invalid_token', 'insufficient_role', 'disallowed_origin'],
    requiredRoles: ['admin'],
  },
  users: {
    authMode: 'role',
    coverageActors: ['anonymous', 'invalid_token', 'insufficient_role', 'disallowed_origin'],
    requiredRoles: ['admin'],
  },
  'recommendations-preferences': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'recommendations-learning-data': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  recommendations: {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  community: {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'ai-tutor': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'ai-analysis': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'ai-learning-path': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'rag-search': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'rag-chat': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'rag-ask': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'marking-evaluate-v1': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  'error-book': {
    authMode: 'ownership',
    coverageActors: ['anonymous', 'invalid_token', 'other_user', 'disallowed_origin'],
  },
  'error-book-id': {
    authMode: 'ownership',
    coverageActors: ['anonymous', 'invalid_token', 'other_user', 'disallowed_origin'],
  },
  'evidence-context': {
    authMode: 'authenticated',
    coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
  },
  auth: {
    authMode: 'public',
    coverageActors: ['disallowed_origin'],
  },
});

function expectedStatusForActor(actor) {
  switch (actor) {
    case 'anonymous':
    case 'invalid_token':
      return 401;
    case 'other_user':
    case 'insufficient_role':
      return 403;
    case 'disallowed_origin':
      return 403;
    default:
      return null;
  }
}

export function getRoutePolicy(routeOrModule) {
  const moduleName = typeof routeOrModule === 'string' ? routeOrModule : routeOrModule?.module;
  const policy = POLICY_BY_MODULE[moduleName];
  if (!policy) {
    return {
      authMode: 'authenticated',
      coverageActors: ['anonymous', 'invalid_token', 'disallowed_origin'],
    };
  }
  return policy;
}

export function listRoutePolicies(routes) {
  return routes.map((route) => ({
    module: route.module,
    pathPrefix: route.pathPrefix,
    auth: route.auth,
    authMode: getRoutePolicy(route).authMode,
    requiredRoles: getRoutePolicy(route).requiredRoles || [],
    coverageActors: getRoutePolicy(route).coverageActors || [],
  }));
}

export function buildAuthorizationMatrix(routes) {
  const rows = [];
  for (const route of routes) {
    const policy = getRoutePolicy(route);
    const methods =
      Array.isArray(route.methods) && route.methods.length > 0 ? route.methods : ['*'];
    const actors = policy.coverageActors || [];
    for (const method of methods) {
      if (method === 'OPTIONS') continue;
      for (const actor of actors) {
        rows.push({
          module: route.module,
          path_prefix: route.pathPrefix,
          method,
          actor,
          auth_mode: policy.authMode,
          expected_status: expectedStatusForActor(actor),
          verification_strategy:
            actor === 'other_user' || actor === 'insufficient_role'
              ? 'domain_contract'
              : 'gateway',
        });
      }
    }
  }
  return rows;
}
