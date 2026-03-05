#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import request from 'supertest';
import { listRoutes, LEGACY_EXCLUDED_ENDPOINTS } from '../../api/_runtime/route-registry.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'runs', 'backend', 'api_route_integration_summary.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toSamplePath(pathPrefix) {
  return pathPrefix.includes(':id')
    ? pathPrefix.replace(':id', 'sample-id')
    : pathPrefix;
}

function pickMethod(methods = []) {
  if (!Array.isArray(methods) || methods.length === 0 || methods.includes('*')) return 'GET';
  const chosen = methods.find((m) => m !== 'OPTIONS') || methods[0];
  return String(chosen).toUpperCase();
}

function countStubOffenders() {
  const offenders = [];
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name === '__tests__' || item.name === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!item.isFile() || !item.name.endsWith('.js')) continue;
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('under_development')) offenders.push(path.relative(ROOT, full).replaceAll('\\', '/'));
    }
  }
  walk(path.join(ROOT, 'api'));
  return offenders;
}

async function main() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

  const mod = await import('../../api/index.js');
  const server = http.createServer(mod.default);

  const routes = listRoutes();
  const probes = [];

  for (const route of routes) {
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
  for (const legacy of LEGACY_EXCLUDED_ENDPOINTS) {
    const r = await request(server).post(legacy).set('Origin', 'http://localhost:3000').send({});
    legacyChecks.push({ path: legacy, status: r.status, code: r.body?.code || null });
  }

  await new Promise((resolve) => server.close(resolve));

  const stubOffenders = countStubOffenders();
  const allProbesRouted = probes.every((probe) => probe.routed);
  const legacyChecksPassed = legacyChecks.every(
    (item) => item.status === 404 && item.code === 'endpoint_not_found',
  );
  const methodCheckPassed = methodDenied.status === 405 && methodDenied.body?.code === 'method_not_allowed';
  const status = allProbesRouted && legacyChecksPassed && methodCheckPassed && stubOffenders.length === 0
    ? 'pass'
    : 'fail';

  const payload = {
    generated_at: new Date().toISOString(),
    status,
    total_routes: routes.length,
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

  ensureDir(OUT);
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
