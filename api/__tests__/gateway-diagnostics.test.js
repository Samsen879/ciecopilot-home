import {
  buildGatewayRouteSnapshot,
  canExposeInternalDiagnostics,
} from '../_runtime/gateway-diagnostics.js';
import { findRoute } from '../_runtime/route-registry.js';
import {
  applyRateLimitHeaders,
  resolveRateLimitDescriptor,
} from '../lib/security/rate-limit-middleware.js';

function createResponseStub() {
  const headers = new Map();
  return {
    setHeader(key, value) {
      headers.set(String(key).toLowerCase(), value);
    },
    getHeader(key) {
      return headers.get(String(key).toLowerCase());
    },
  };
}

describe('gateway diagnostics', () => {
  it('builds a redacted public snapshot by default', () => {
    const snapshot = buildGatewayRouteSnapshot();

    expect(snapshot.summary.route_count).toBeGreaterThan(0);
    expect(snapshot.summary.protected_route_count).toBeGreaterThan(0);
    expect(snapshot.summary.consistency_status).toBe('pass');
    expect(snapshot.summary.auth_mode_counts).toBeUndefined();
    expect(snapshot.routes).toBeUndefined();
    expect(snapshot.authorization_matrix).toBeUndefined();
    expect(snapshot.legacy_excluded).toBeUndefined();
  });

  it('builds a full internal snapshot when explicitly requested', () => {
    const snapshot = buildGatewayRouteSnapshot({ visibility: 'internal' });

    expect(snapshot.summary.route_count).toBe(snapshot.routes.length);
    expect(snapshot.summary.authorization_matrix_row_count).toBe(
      snapshot.authorization_matrix.length,
    );
    expect(snapshot.summary.routes_missing_explicit_policy).toEqual([]);
    expect(snapshot.summary.routes_missing_rate_limit_policy).toEqual([]);
    expect(snapshot.summary.routes_with_unknown_rate_limit_policy).toEqual([]);
    expect(snapshot.summary.routes_with_auth_mode_mismatch).toEqual([]);
    expect(snapshot.legacy_excluded).toEqual(expect.any(Array));
    expect(snapshot.routes[0]).toHaveProperty('coverageActors');
    expect(snapshot.routes[0]).toHaveProperty('verificationStrategies');
    expect(snapshot.routes[0]).toHaveProperty('rateLimitProfile');
  });

  it('only exposes internal diagnostics outside production when explicitly requested', () => {
    expect(canExposeInternalDiagnostics({ query: {} }, { env: 'test' })).toBe(false);
    expect(canExposeInternalDiagnostics({ query: { view: 'internal' } }, { env: 'test' })).toBe(true);
    expect(
      canExposeInternalDiagnostics(
        { headers: { 'x-diagnostics-view': 'internal' } },
        { env: 'development' },
      ),
    ).toBe(true);
    expect(canExposeInternalDiagnostics({ query: { view: 'internal' } }, { env: 'production' })).toBe(false);
  });

  it('surfaces rate limit observability headers from the resolved policy descriptor', () => {
    const route = findRoute('/api/rag/search', 'POST').route;
    const descriptor = resolveRateLimitDescriptor(
      {
        method: 'POST',
        auth_user_id: 'student-1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      },
      route,
    );
    const res = createResponseStub();

    applyRateLimitHeaders(res, route, {
      ...descriptor,
      result: {
        allowed: true,
        remaining: 4,
        retryAfterMs: 0,
        store: 'memory',
        degraded: true,
      },
    });

    expect(descriptor.policyId).toBe('rag_ai_default_v1');
    expect(res.getHeader('x-ratelimit-limit')).toBe('10');
    expect(res.getHeader('x-ratelimit-remaining')).toBe('4');
    expect(res.getHeader('x-ratelimit-policy')).toBe('rag_ai_default_v1');
    expect(res.getHeader('x-ratelimit-scope')).toBe('user');
    expect(res.getHeader('x-ratelimit-store')).toBe('memory');
    expect(res.getHeader('x-ratelimit-degraded')).toBe('true');
  });
});
