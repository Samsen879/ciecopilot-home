import {
  buildAuthorizationMatrix,
  getRoutePolicy,
  hasExplicitRoutePolicy,
} from '../lib/security/policy-registry.js';
import { getRateLimitPolicy } from '../lib/security/rate-limit-policy.js';
import { LEGACY_EXCLUDED_ENDPOINTS, listRoutes } from './route-registry.js';

const PUBLIC_VISIBILITY = 'public';
const INTERNAL_VISIBILITY = 'internal';

function countBy(items, getKey) {
  const counts = {};
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizeVisibility(visibility) {
  return visibility === INTERNAL_VISIBILITY ? INTERNAL_VISIBILITY : PUBLIC_VISIBILITY;
}

function buildRouteKey(route) {
  return `${route.module}:${route.pathPrefix}`;
}

function decorateRoutes(routes, authorizationMatrix) {
  const matrixByRoute = new Map();
  for (const row of authorizationMatrix) {
    const key = `${row.module}:${row.path_prefix}`;
    const bucket = matrixByRoute.get(key) || [];
    bucket.push(row);
    matrixByRoute.set(key, bucket);
  }

  return routes.map((route) => {
    const policy = getRoutePolicy(route);
    const rateLimitProfile = route.rateLimitPolicyId
      ? getRateLimitPolicy(route.rateLimitPolicyId)
      : null;
    const coverageRows = matrixByRoute.get(buildRouteKey(route)) || [];

    return {
      ...route,
      explicitPolicy: hasExplicitRoutePolicy(route.module),
      requiredRoles: policy.requiredRoles || [],
      coverageActors: policy.coverageActors || [],
      verificationStrategies: unique(coverageRows.map((row) => row.verification_strategy)),
      rateLimitProfile,
    };
  });
}

function buildInternalSummary(detailedRoutes, authorizationMatrix) {
  const protectedRoutes = detailedRoutes.filter((route) => route.auth !== 'none');
  const publicRoutes = detailedRoutes.filter((route) => route.auth === 'none');
  const rateLimitedRoutes = detailedRoutes.filter((route) => route.hasRateLimit);
  const routesMissingExplicitPolicy = detailedRoutes
    .filter((route) => !route.explicitPolicy)
    .map((route) => route.module);
  const routesMissingRateLimitPolicy = detailedRoutes
    .filter((route) => route.hasRateLimit && !route.rateLimitPolicyId)
    .map((route) => route.module);
  const routesWithUnknownRateLimitPolicy = detailedRoutes
    .filter((route) => route.rateLimitPolicyId && !route.rateLimitProfile)
    .map((route) => `${route.module}:${route.rateLimitPolicyId}`);
  const routesWithAuthModeMismatch = detailedRoutes
    .filter((route) => (route.auth === 'none' ? route.authMode !== 'public' : route.authMode === 'public'))
    .map((route) => route.module);

  const issueCount =
    routesMissingExplicitPolicy.length +
    routesMissingRateLimitPolicy.length +
    routesWithUnknownRateLimitPolicy.length +
    routesWithAuthModeMismatch.length;

  return {
    route_count: detailedRoutes.length,
    protected_route_count: protectedRoutes.length,
    public_route_count: publicRoutes.length,
    legacy_excluded_count: LEGACY_EXCLUDED_ENDPOINTS.length,
    authorization_matrix_row_count: authorizationMatrix.length,
    rate_limited_route_count: rateLimitedRoutes.length,
    module_owned_method_routing_count: detailedRoutes.filter((route) => route.moduleOwnsMethodRouting)
      .length,
    gateway_owned_method_routing_count: detailedRoutes.filter((route) => !route.moduleOwnsMethodRouting)
      .length,
    runtime_counts: countBy(detailedRoutes, (route) => route.runtime || 'handler'),
    auth_mode_counts: countBy(detailedRoutes, (route) => route.authMode || 'unknown'),
    rate_limit_policy_counts: countBy(
      rateLimitedRoutes.filter((route) => route.rateLimitPolicyId),
      (route) => route.rateLimitPolicyId,
    ),
    verification_strategy_counts: countBy(authorizationMatrix, (row) => row.verification_strategy),
    coverage_actor_counts: countBy(authorizationMatrix, (row) => row.actor),
    protected_modules: unique(protectedRoutes.map((route) => route.module)),
    public_modules: unique(publicRoutes.map((route) => route.module)),
    rate_limited_modules: unique(rateLimitedRoutes.map((route) => route.module)),
    routes_missing_explicit_policy: unique(routesMissingExplicitPolicy),
    routes_missing_rate_limit_policy: unique(routesMissingRateLimitPolicy),
    routes_with_unknown_rate_limit_policy: unique(routesWithUnknownRateLimitPolicy),
    routes_with_auth_mode_mismatch: unique(routesWithAuthModeMismatch),
    issue_count: issueCount,
    consistency_status: issueCount === 0 ? 'pass' : 'warn',
  };
}

function buildPublicSummary(internalSummary) {
  return {
    route_count: internalSummary.route_count,
    protected_route_count: internalSummary.protected_route_count,
    public_route_count: internalSummary.public_route_count,
    rate_limited_route_count: internalSummary.rate_limited_route_count,
    consistency_status: internalSummary.consistency_status,
  };
}

export function buildGatewaySummary(
  options = {},
) {
  const routes = options.routes || listRoutes();
  const authorizationMatrix = options.authorizationMatrix || buildAuthorizationMatrix(routes);
  const detailedRoutes = options.detailedRoutes || decorateRoutes(routes, authorizationMatrix);
  const visibility = normalizeVisibility(options.visibility);
  const internalSummary = buildInternalSummary(detailedRoutes, authorizationMatrix);

  if (visibility === INTERNAL_VISIBILITY) {
    return internalSummary;
  }

  return buildPublicSummary(internalSummary);
}

export function buildGatewayRouteSnapshot({ visibility = PUBLIC_VISIBILITY } = {}) {
  const routes = listRoutes();
  const authorizationMatrix = buildAuthorizationMatrix(routes);
  const detailedRoutes = decorateRoutes(routes, authorizationMatrix);
  const normalizedVisibility = normalizeVisibility(visibility);
  const summary = buildGatewaySummary({
    visibility: normalizedVisibility,
    routes,
    authorizationMatrix,
    detailedRoutes,
  });

  if (normalizedVisibility === INTERNAL_VISIBILITY) {
    return {
      generated_at: new Date().toISOString(),
      summary,
      routes: detailedRoutes,
      authorization_matrix: authorizationMatrix,
      legacy_excluded: [...LEGACY_EXCLUDED_ENDPOINTS],
    };
  }

  return {
    generated_at: new Date().toISOString(),
    summary,
  };
}

export function canExposeInternalDiagnostics(req, { env = process.env.NODE_ENV } = {}) {
  if (env === 'production') {
    return false;
  }

  const requestedView =
    req?.query?.view ||
    req?.headers?.['x-diagnostics-view'] ||
    req?.headers?.['X-Diagnostics-View'] ||
    null;

  return String(requestedView || '').toLowerCase() === INTERNAL_VISIBILITY;
}
