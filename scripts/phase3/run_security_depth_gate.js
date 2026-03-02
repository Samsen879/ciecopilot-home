#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.AUTH_LOCAL_TEST_MODE = 'true';
process.env.RATE_LIMIT_BACKEND = 'memory';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';

const ROOT = process.cwd();
const SUMMARY_OUT = path.join(ROOT, 'runs', 'backend', 'security_depth_summary.json');
const MATRIX_OUT = path.join(ROOT, 'runs', 'backend', 'security_authorization_matrix.json');
const REPORT_OUT = path.join(ROOT, 'docs', 'reports', 'security_authorization_matrix.md');

const { default: handler } = await import('../../api/index.js');
const { listRoutes } = await import('../../api/_runtime/route-registry.js');
const { buildAuthorizationMatrix } = await import('../../api/lib/security/policy-registry.js');
const {
  _clearRateLimitBackendOverrideForTest,
  _resetRateLimitStoreForTest,
} = await import('../../api/lib/security/rate-limit.js');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildRequest(agent, route, method, origin = 'http://localhost:3000') {
  let req = agent[method.toLowerCase()](route.pathPrefix).set('Origin', origin);
  if (method !== 'GET' && method !== 'DELETE') {
    req = req.send({});
  }
  return req;
}

function pickDisallowedMethod(route) {
  const allowed = new Set((route.methods || []).filter((method) => method !== 'OPTIONS'));
  const candidates = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  return candidates.find((method) => !allowed.has(method)) || null;
}

function toMarkdown(rows) {
  const header = [
    '# Security Authorization Matrix',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '| Module | Path Prefix | Method | Actor | Expected Status | Verification Strategy |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  const lines = rows.map(
    (row) =>
      `| ${row.module} | \`${row.path_prefix}\` | ${row.method} | ${row.actor} | ${row.expected_status} | ${row.verification_strategy} |`,
  );
  return `${header.concat(lines).join('\n')}\n`;
}

async function run() {
  const routes = listRoutes();
  const protectedRoutes = routes.filter((route) => route.auth === 'jwt_required');
  const matrix = buildAuthorizationMatrix(routes);
  const server = http.createServer(handler);
  const failures = [];
  const checks = [];

  try {
    for (const route of protectedRoutes) {
      const method =
        (route.methods || ['GET']).find((item) => item !== 'OPTIONS' && item !== '*') || 'GET';

      await _resetRateLimitStoreForTest();
      const anonymous = await buildRequest(request(server), route, method);
      checks.push({
        module: route.module,
        method,
        actor: 'anonymous',
        expected_status: 401,
        actual_status: anonymous.status,
        actual_code: anonymous.body?.code || null,
      });
      if (anonymous.status !== 401 || anonymous.body?.code !== 'auth_required') {
        failures.push({
          module: route.module,
          actor: 'anonymous',
          expected_status: 401,
          actual_status: anonymous.status,
          actual_code: anonymous.body?.code || null,
        });
      }

      await _resetRateLimitStoreForTest();
      const invalid = await buildRequest(request(server), route, method).set(
        'Authorization',
        'Bearer test-invalid-token',
      );
      checks.push({
        module: route.module,
        method,
        actor: 'invalid_token',
        expected_status: 401,
        actual_status: invalid.status,
        actual_code: invalid.body?.code || null,
      });
      if (invalid.status !== 401 || invalid.body?.code !== 'auth_invalid') {
        failures.push({
          module: route.module,
          actor: 'invalid_token',
          expected_status: 401,
          actual_status: invalid.status,
          actual_code: invalid.body?.code || null,
        });
      }

      await _resetRateLimitStoreForTest();
      const disallowed = await buildRequest(request(server), route, method, 'https://evil.example');
      checks.push({
        module: route.module,
        method,
        actor: 'disallowed_origin',
        expected_status: 403,
        actual_status: disallowed.status,
        actual_code: disallowed.body?.code || null,
      });
      if (disallowed.status !== 403 || disallowed.body?.code !== 'cors_origin_denied') {
        failures.push({
          module: route.module,
          actor: 'disallowed_origin',
          expected_status: 403,
          actual_status: disallowed.status,
          actual_code: disallowed.body?.code || null,
        });
      }
    }

    const fixedRoutes = protectedRoutes.filter(
      (route) =>
        !route.moduleOwnsMethodRouting &&
        Array.isArray(route.methods) &&
        !route.methods.includes('*') &&
        route.methods.some((method) => method !== 'OPTIONS'),
    );

    for (const route of fixedRoutes) {
      const wrongMethod = pickDisallowedMethod(route);
      if (!wrongMethod) continue;
      await _resetRateLimitStoreForTest();
      const res = await buildRequest(request(server), route, wrongMethod).set(
        'Authorization',
        'Bearer test-user:student-1:student',
      );
      checks.push({
        module: route.module,
        method: wrongMethod,
        actor: 'wrong_method',
        expected_status: 405,
        actual_status: res.status,
        actual_code: res.body?.code || null,
      });
      if (res.status !== 405 || res.body?.code !== 'method_not_allowed') {
        failures.push({
          module: route.module,
          actor: 'wrong_method',
          expected_status: 405,
          actual_status: res.status,
          actual_code: res.body?.code || null,
        });
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    _clearRateLimitBackendOverrideForTest();
  }

  const summary = {
    generated_at: new Date().toISOString(),
    route_count: routes.length,
    protected_route_count: protectedRoutes.length,
    matrix_row_count: matrix.length,
    check_count: checks.length,
    failure_count: failures.length,
    status: failures.length === 0 ? 'pass' : 'fail',
    failures,
    checks,
  };

  ensureDir(SUMMARY_OUT);
  ensureDir(MATRIX_OUT);
  ensureDir(REPORT_OUT);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MATRIX_OUT, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  fs.writeFileSync(REPORT_OUT, toMarkdown(matrix), 'utf8');
  process.stdout.write(`${SUMMARY_OUT}\n${MATRIX_OUT}\n${REPORT_OUT}\n`);

  if (summary.status !== 'pass') {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
