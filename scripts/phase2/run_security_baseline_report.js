#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import request from 'supertest';
import { buildGatewayRouteSnapshot } from '../../api/_runtime/gateway-diagnostics.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'runs', 'backend', 'security_baseline_report.json');
const REDACTION_SCAN = path.join(ROOT, 'runs', 'backend', 'security_redaction_scan.json');
const FORBIDDEN_DIAGNOSTIC_KEYS = new Set([
  'authorization_matrix',
  'requiredRoles',
  'coverageActors',
  'verificationStrategies',
  'rateLimitProfile',
  'legacy_excluded',
]);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toSamplePath(pathPrefix) {
  return pathPrefix.includes(':id') ? pathPrefix.replace(':id', 'sample-id') : pathPrefix;
}

function pickMethod(methods = []) {
  if (!Array.isArray(methods) || methods.length === 0 || methods.includes('*')) return 'GET';
  const chosen = methods.find((method) => method !== 'OPTIONS') || methods[0];
  return String(chosen).toUpperCase();
}

function collectForbiddenKeys(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenKeys(item, found));
    return found;
  }
  if (!value || typeof value !== 'object') {
    return found;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_DIAGNOSTIC_KEYS.has(key)) {
      found.push(key);
    }
    collectForbiddenKeys(nested, found);
  }
  return found;
}

async function runProbe(server, route, headers = {}) {
  const method = pickMethod(route.methods);
  const target = toSamplePath(route.pathPrefix);
  let req = request(server)[method.toLowerCase()](target).set('Origin', 'http://localhost:3000');
  for (const [key, value] of Object.entries(headers)) {
    req = req.set(key, value);
  }
  if (!['GET', 'HEAD'].includes(method)) {
    req = req.send({});
  }
  const res = await req;
  return {
    module: route.module,
    method,
    path: target,
    status: res.status,
    code: res.body?.code || null,
  };
}

export async function buildSecurityBaselineReport() {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_LOCAL_TEST_MODE = 'true';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

  const gatewaySnapshot = buildGatewayRouteSnapshot({ visibility: 'internal' });
  const protectedRoutes = gatewaySnapshot.routes.filter((route) => route.auth !== 'none');
  const publicRoutes = gatewaySnapshot.routes.filter((route) => route.auth === 'none');

  const mod = await import('../../api/index.js');
  const server = http.createServer(mod.default);

  const anonymousChecks = [];
  for (const route of protectedRoutes) {
    anonymousChecks.push(await runProbe(server, route));
  }

  const invalidTokenChecks = [];
  for (const route of protectedRoutes) {
    invalidTokenChecks.push(
      await runProbe(server, route, { Authorization: 'Bearer test-invalid-token' }),
    );
  }

  const publicRouteChecks = [];
  for (const route of publicRoutes) {
    publicRouteChecks.push(await runProbe(server, route));
  }

  const publicInfo = await request(server).get('/api/info').set('Origin', 'http://localhost:3000');
  const publicHealth = await request(server).get('/api/health').set('Origin', 'http://localhost:3000');
  const publicRouteSummary = await request(server)
    .get('/api/routes')
    .set('Origin', 'http://localhost:3000');
  const internalRouteSummary = await request(server)
    .get('/api/routes?view=internal')
    .set('Origin', 'http://localhost:3000');
  const corsDenied = await request(server).get('/api/info').set('Origin', 'https://forbidden.example');
  const corsAllowed = await request(server).get('/api/info').set('Origin', 'http://localhost:3000');
  const methodDenied = await request(server).get('/api/rag/search').set('Origin', 'http://localhost:3000');

  await new Promise((resolve) => server.close(resolve));

  let redactionScan = null;
  if (fs.existsSync(REDACTION_SCAN)) {
    redactionScan = JSON.parse(fs.readFileSync(REDACTION_SCAN, 'utf8'));
  }

  const publicForbiddenKeys = [
    ...collectForbiddenKeys(publicInfo.body),
    ...collectForbiddenKeys(publicHealth.body),
    ...collectForbiddenKeys(publicRouteSummary.body),
  ];
  const anonymousChecksPassed = anonymousChecks.every(
    (item) => item.status === 401 && item.code === 'auth_required',
  );
  const invalidTokenChecksPassed = invalidTokenChecks.every(
    (item) => item.status === 401 && item.code === 'auth_invalid',
  );
  const publicRouteChecksPassed = publicRouteChecks.every(
    (item) => !['auth_required', 'auth_invalid'].includes(item.code),
  );
  const publicDiagnosticsPassed =
    publicInfo.status === 200 &&
    publicHealth.status === 200 &&
    publicRouteSummary.status === 200 &&
    publicInfo.body.routes === undefined &&
    publicRouteSummary.body.routes === undefined &&
    publicForbiddenKeys.length === 0;
  const internalDiagnosticsPassed =
    internalRouteSummary.status === 200 &&
    internalRouteSummary.body?.summary?.route_count === gatewaySnapshot.summary.route_count &&
    internalRouteSummary.body?.authorization_matrix?.length ===
      gatewaySnapshot.summary.authorization_matrix_row_count &&
    Array.isArray(internalRouteSummary.body?.legacy_excluded);
  const corsChecksPassed =
    corsDenied.status === 403 &&
    corsDenied.body?.code === 'cors_origin_denied' &&
    corsAllowed.status >= 200 &&
    corsAllowed.status < 300;
  const methodCheckPassed =
    methodDenied.status === 405 &&
    methodDenied.body?.code === 'method_not_allowed';
  const redactionPassed = (redactionScan?.issue_count || 0) === 0;
  const gatewayConsistencyPassed = gatewaySnapshot.summary.consistency_status === 'pass';
  const status =
    anonymousChecksPassed &&
    invalidTokenChecksPassed &&
    publicRouteChecksPassed &&
    publicDiagnosticsPassed &&
    internalDiagnosticsPassed &&
    corsChecksPassed &&
    methodCheckPassed &&
    redactionPassed &&
    gatewayConsistencyPassed
      ? 'pass'
      : 'fail';

  return {
    generated_at: new Date().toISOString(),
    status,
    gateway_summary: gatewaySnapshot.summary,
    anonymous_protected_checks: anonymousChecks,
    invalid_token_checks: invalidTokenChecks,
    public_route_checks: publicRouteChecks,
    diagnostics_surface: {
      public: {
        info_status: publicInfo.status,
        health_status: publicHealth.status,
        routes_status: publicRouteSummary.status,
        redacted: publicDiagnosticsPassed,
        forbidden_keys_found: publicForbiddenKeys,
      },
      internal: {
        routes_status: internalRouteSummary.status,
        available: internalDiagnosticsPassed,
      },
    },
    cors: {
      denied_status: corsDenied.status,
      denied_code: corsDenied.body?.code || null,
      allowed_status: corsAllowed.status,
      allowed_origin_header: corsAllowed.headers['access-control-allow-origin'] || null,
    },
    method_denied_check: {
      path: '/api/rag/search',
      method: 'GET',
      status: methodDenied.status,
      code: methodDenied.body?.code || null,
    },
    rate_limit_policies: gatewaySnapshot.summary.rate_limit_policy_counts,
    gateway_issues: {
      missing_explicit_policies: gatewaySnapshot.summary.routes_missing_explicit_policy,
      missing_rate_limit_policy_ids: gatewaySnapshot.summary.routes_missing_rate_limit_policy,
      unknown_rate_limit_policies: gatewaySnapshot.summary.routes_with_unknown_rate_limit_policy,
      auth_mode_mismatches: gatewaySnapshot.summary.routes_with_auth_mode_mismatch,
    },
    redaction_scan: redactionScan
      ? {
          issue_count: redactionScan.issue_count,
          scanned_files: redactionScan.scanned_files,
        }
      : null,
  };
}

export async function main() {
  const payload = await buildSecurityBaselineReport();
  ensureDir(OUT);
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT}\n`);
}

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && import.meta.url === entryHref) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
