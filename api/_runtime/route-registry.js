import { getRateLimitPolicy } from '../lib/security/rate-limit-policy.js';
import { getRoutePolicy } from '../lib/security/policy-registry.js';

export const LEGACY_EXCLUDED_ENDPOINTS = [
  '/api/chat',
  '/api/marking/evaluate',
];

const RAG_AI_RATE_LIMIT_POLICY_ID = 'rag_ai_default_v1';
const COMMUNITY_WRITE_RATE_LIMIT_POLICY_ID = 'community_write_v1';
const ERROR_BOOK_WRITE_RATE_LIMIT_POLICY_ID = 'error_book_write_v1';
const RAG_AI_RATE_LIMIT = getRateLimitPolicy(RAG_AI_RATE_LIMIT_POLICY_ID);
const COMMUNITY_WRITE_RATE_LIMIT = getRateLimitPolicy(COMMUNITY_WRITE_RATE_LIMIT_POLICY_ID);
const ERROR_BOOK_WRITE_RATE_LIMIT = getRateLimitPolicy(ERROR_BOOK_WRITE_RATE_LIMIT_POLICY_ID);

const ROUTES = [
  {
    module: 'users-profile',
    pathPrefix: '/api/users/profile',
    importPath: '../users/profile.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['GET', 'PUT', 'OPTIONS'],
  },
  {
    module: 'users-permissions',
    pathPrefix: '/api/users/permissions',
    importPath: '../users/permissions.js',
    auth: 'jwt_required',
    authMode: 'role',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
  {
    module: 'users',
    pathPrefix: '/api/users',
    importPath: '../users/index.js',
    auth: 'jwt_required',
    authMode: 'role',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
  {
    module: 'recommendations-preferences',
    pathPrefix: '/api/recommendations/preferences',
    importPath: '../recommendations/preferences.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['*'],
    moduleOwnsMethodRouting: true,
  },
  {
    module: 'recommendations-learning-data',
    pathPrefix: '/api/recommendations/learning-data',
    importPath: '../recommendations/learning-data.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['*'],
    moduleOwnsMethodRouting: true,
  },
  {
    module: 'recommendations',
    pathPrefix: '/api/recommendations',
    importPath: '../recommendations/index.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['*'],
    moduleOwnsMethodRouting: true,
  },
  {
    module: 'community',
    pathPrefix: '/api/community',
    importPath: '../community/index.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['*'],
    moduleOwnsMethodRouting: true,
    runtime: 'express_router',
    rateLimitPolicyId: COMMUNITY_WRITE_RATE_LIMIT_POLICY_ID,
    rateLimitMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    rateLimit: COMMUNITY_WRITE_RATE_LIMIT,
  },
  {
    module: 'ai-tutor',
    pathPrefix: '/api/ai/tutor/chat',
    importPath: '../ai/tutor/chat.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['POST', 'OPTIONS'],
    rateLimitPolicyId: RAG_AI_RATE_LIMIT_POLICY_ID,
    rateLimit: RAG_AI_RATE_LIMIT,
  },
  {
    module: 'ai-analysis',
    pathPrefix: '/api/ai/analysis/knowledge-gaps',
    importPath: '../ai/analysis/knowledge-gaps.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['POST', 'OPTIONS'],
    rateLimitPolicyId: RAG_AI_RATE_LIMIT_POLICY_ID,
    rateLimit: RAG_AI_RATE_LIMIT,
  },
  {
    module: 'ai-learning-path',
    pathPrefix: '/api/ai/learning/path-generator',
    importPath: '../ai/learning/path-generator.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['POST', 'OPTIONS'],
    rateLimitPolicyId: RAG_AI_RATE_LIMIT_POLICY_ID,
    rateLimit: RAG_AI_RATE_LIMIT,
  },
  {
    module: 'rag-search',
    pathPrefix: '/api/rag/search',
    importPath: '../rag/search.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['POST', 'OPTIONS'],
    rateLimitPolicyId: RAG_AI_RATE_LIMIT_POLICY_ID,
    rateLimit: RAG_AI_RATE_LIMIT,
  },
  {
    module: 'rag-chat',
    pathPrefix: '/api/rag/chat',
    importPath: '../rag/chat.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['POST', 'OPTIONS'],
    rateLimitPolicyId: RAG_AI_RATE_LIMIT_POLICY_ID,
    rateLimit: RAG_AI_RATE_LIMIT,
  },
  {
    module: 'rag-ask',
    pathPrefix: '/api/rag/ask',
    importPath: '../rag/ask.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['POST', 'OPTIONS'],
    rateLimitPolicyId: RAG_AI_RATE_LIMIT_POLICY_ID,
    rateLimit: RAG_AI_RATE_LIMIT,
  },
  {
    module: 'marking-evaluate-v1',
    pathPrefix: '/api/marking/evaluate-v1',
    importPath: '../marking/evaluate-v1.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['POST', 'OPTIONS'],
  },
  {
    module: 'error-book-id',
    pathPrefix: '/api/error-book/:id',
    pattern: /^\/api\/error-book\/[^/]+$/,
    paramExtractor: (path) => {
      const segments = path.split('/');
      return { id: segments[3] || null };
    },
    importPath: '../error-book/[id].js',
    auth: 'jwt_required',
    authMode: 'ownership',
    methods: ['GET', 'PATCH', 'DELETE', 'OPTIONS'],
    rateLimitPolicyId: ERROR_BOOK_WRITE_RATE_LIMIT_POLICY_ID,
    rateLimitMethods: ['PATCH', 'DELETE'],
    rateLimit: ERROR_BOOK_WRITE_RATE_LIMIT,
  },
  {
    module: 'error-book',
    pathPrefix: '/api/error-book',
    importPath: '../error-book/index.js',
    auth: 'jwt_required',
    authMode: 'ownership',
    methods: ['GET', 'POST', 'OPTIONS'],
    rateLimitPolicyId: ERROR_BOOK_WRITE_RATE_LIMIT_POLICY_ID,
    rateLimitMethods: ['POST'],
    rateLimit: ERROR_BOOK_WRITE_RATE_LIMIT,
  },
  {
    module: 'evidence-context',
    pathPrefix: '/api/evidence/context',
    importPath: '../evidence/context.js',
    auth: 'jwt_required',
    authMode: 'authenticated',
    methods: ['GET', 'OPTIONS'],
  },
  {
    module: 'auth',
    pathPrefix: '/api/auth',
    importPath: '../auth/index.js',
    auth: 'none',
    authMode: 'public',
    methods: ['*'],
    moduleOwnsMethodRouting: true,
  },
];

function isMethodAllowed(route, method) {
  if (route.moduleOwnsMethodRouting) return true;
  const methods = route.methods || ['*'];
  if (methods.includes('*')) return true;
  return methods.includes(method);
}

function matchRoutePath(route, path) {
  if (route.pattern) return route.pattern.test(path);
  if (path === route.pathPrefix) return true;
  return path.startsWith(`${route.pathPrefix}/`);
}

export function findRoute(path, method) {
  for (const route of ROUTES) {
    if (!matchRoutePath(route, path)) continue;
    const allowed = isMethodAllowed(route, method);
    const params = typeof route.paramExtractor === 'function' ? route.paramExtractor(path) : {};
    return { route, allowed, params };
  }
  return { route: null, allowed: false, params: {} };
}

export function listRoutes() {
  return ROUTES.map((route) => ({
    module: route.module,
    pathPrefix: route.pathPrefix,
    auth: route.auth,
    authMode: route.authMode || getRoutePolicy(route).authMode,
    methods: route.methods,
    moduleOwnsMethodRouting: Boolean(route.moduleOwnsMethodRouting),
    runtime: route.runtime || 'handler',
    hasRateLimit: Boolean(route.rateLimit),
    rateLimitMethods: route.rateLimitMethods || null,
    rateLimitPolicyId: route.rateLimitPolicyId || null,
  }));
}
