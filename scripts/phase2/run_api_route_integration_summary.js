#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import request from 'supertest';
import { buildGatewayRouteSnapshot } from '../../api/_runtime/gateway-diagnostics.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'runs', 'backend', 'api_route_integration_summary.json');
const PLATFORM_SCAN_ROOTS = [
  'api/index.js',
  'api/_runtime',
  'api/lib/security',
  'api/auth',
  'api/users',
  'middleware',
];
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

function walkPlatformFiles() {
  const files = [];
  for (const relativePath of PLATFORM_SCAN_ROOTS) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const stat = fs.statSync(absolutePath);
    if (stat.isFile()) {
      files.push(absolutePath);
      continue;
    }
    for (const item of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      const full = path.join(absolutePath, item.name);
      if (item.isDirectory()) {
        if (item.name === '__tests__' || item.name === 'node_modules') continue;
        for (const nested of walkDirectory(full)) {
          files.push(nested);
        }
        continue;
      }
      if (item.isFile() && item.name.endsWith('.js')) {
        files.push(full);
      }
    }
  }
  return files;
}

function walkDirectory(dir) {
  const files = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === '__tests__' || item.name === 'node_modules') continue;
      files.push(...walkDirectory(full));
      continue;
    }
    if (item.isFile() && item.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function countStubOffenders() {
  return walkPlatformFiles()
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('under_development'))
    .map((filePath) => path.relative(ROOT, filePath).replaceAll('\\', '/'));
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

export async function buildApiRouteIntegrationSummary() {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_LOCAL_TEST_MODE = 'true';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

  const gatewaySnapshot = buildGatewayRouteSnapshot({ visibility: 'internal' });
  const mod = await import('../../api/index.js');
  const server = http.createServer(mod.default);

  const publicInfo = await request(server).get('/api/info').set('Origin', 'http://localhost:3000');
  const publicHealth = await request(server).get('/api/health').set('Origin', 'http://localhost:3000');
  const publicRoutes = await request(server).get('/api/routes').set('Origin', 'http://localhost:3000');
  const internalRoutes = await request(server)
    .get('/api/routes?view=internal')
    .set('Origin', 'http://localhost:3000');

  const probes = [];
  for (const route of gatewaySnapshot.routes) {
    const method = pickMethod(route.methods);
    const target = toSamplePath(route.pathPrefix);
    let req = request(server)[method.toLowerCase()](target).set('Origin', 'http://localhost:3000');
    if (!['GET', 'HEAD'].includes(method)) req = req.send({});
    const res = await req;
    probes.push({
      module: route.module,
      method,
      path: target,
      status: res.status,
      code: res.body?.code || null,
      routed: res.status !== 404 || res.body?.code !== 'endpoint_not_found',
    });
  }

  const methodDenied = await request(server).get('/api/rag/search').set('Origin', 'http://localhost:3000');
  const legacyChecks = [];
  for (const legacyPath of gatewaySnapshot.legacy_excluded) {
    const legacyRes = await request(server)
      .post(legacyPath)
      .set('Origin', 'http://localhost:3000')
      .send({});
    legacyChecks.push({
      path: legacyPath,
      status: legacyRes.status,
      code: legacyRes.body?.code || null,
    });
  }

  await new Promise((resolve) => server.close(resolve));

  const publicForbiddenKeys = [
    ...collectForbiddenKeys(publicInfo.body),
    ...collectForbiddenKeys(publicHealth.body),
    ...collectForbiddenKeys(publicRoutes.body),
  ];
  const publicRoutesRedacted =
    publicInfo.status === 200 &&
    publicHealth.status === 200 &&
    publicRoutes.status === 200 &&
    publicInfo.body.routes === undefined &&
    publicRoutes.body.routes === undefined &&
    publicForbiddenKeys.length === 0;
  const internalRoutesAvailable =
    internalRoutes.status === 200 &&
    internalRoutes.body?.summary?.route_count === gatewaySnapshot.summary.route_count &&
    internalRoutes.body?.authorization_matrix?.length ===
      gatewaySnapshot.summary.authorization_matrix_row_count &&
    Array.isArray(internalRoutes.body?.legacy_excluded);
  const stubOffenders = countStubOffenders();
  const allProbesRouted = probes.every((probe) => probe.routed);
  const legacyChecksPassed = legacyChecks.every(
    (item) => item.status === 404 && item.code === 'endpoint_not_found',
  );
  const methodCheckPassed =
    methodDenied.status === 405 && methodDenied.body?.code === 'method_not_allowed';
  const diagnosticsPassed = publicRoutesRedacted && internalRoutesAvailable;
  const status =
    allProbesRouted &&
    legacyChecksPassed &&
    methodCheckPassed &&
    diagnosticsPassed &&
    stubOffenders.length === 0
      ? 'pass'
      : 'fail';

  return {
    generated_at: new Date().toISOString(),
    status,
    gateway_summary: gatewaySnapshot.summary,
    total_routes: gatewaySnapshot.summary.route_count,
    public_diagnostics: {
      info_status: publicInfo.status,
      health_status: publicHealth.status,
      routes_status: publicRoutes.status,
      redacted: publicRoutesRedacted,
      forbidden_keys_found: publicForbiddenKeys,
    },
    internal_diagnostics: {
      routes_status: internalRoutes.status,
      available: internalRoutesAvailable,
      route_count: internalRoutes.body?.summary?.route_count || null,
      authorization_matrix_row_count:
        internalRoutes.body?.summary?.authorization_matrix_row_count || null,
    },
    probes,
    method_denied_probe: {
      path: '/api/rag/search',
      method: 'GET',
      status: methodDenied.status,
      code: methodDenied.body?.code || null,
    },
    legacy_excluded_checks: legacyChecks,
    stub_offender_count: stubOffenders.length,
    stub_offenders: stubOffenders,
  };
}

export async function main() {
  const payload = await buildApiRouteIntegrationSummary();
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
