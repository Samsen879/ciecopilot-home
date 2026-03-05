#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import request from 'supertest';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'runs', 'backend', 'security_baseline_report.json');
const REDACTION_SCAN = path.join(ROOT, 'runs', 'backend', 'security_redaction_scan.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

  const protectedPaths = [
    '/api/rag/search',
    '/api/rag/chat',
    '/api/ai/tutor/chat',
    '/api/ai/analysis/knowledge-gaps',
    '/api/ai/learning/path-generator',
    '/api/recommendations',
    '/api/community',
    '/api/error-book',
  ];

  const authChecks = [];
  for (const pathName of protectedPaths) {
    const method = pathName.startsWith('/api/ai') || pathName.startsWith('/api/rag') ? 'post' : 'get';
    let req = request(server)[method](pathName).set('Origin', 'http://localhost:3000');
    if (method === 'post') req = req.send({});
    const res = await req;
    authChecks.push({
      path: pathName,
      status: res.status,
      code: res.body?.code || null,
    });
  }

  const corsDenied = await request(server).get('/api/info').set('Origin', 'https://forbidden.example');
  const corsAllowed = await request(server).get('/api/info').set('Origin', 'http://localhost:3000');
  const methodDenied = await request(server).get('/api/rag/search').set('Origin', 'http://localhost:3000');

  await new Promise((resolve) => server.close(resolve));

  let redactionScan = null;
  if (fs.existsSync(REDACTION_SCAN)) {
    redactionScan = JSON.parse(fs.readFileSync(REDACTION_SCAN, 'utf8'));
  }

  const authChecksPassed = authChecks.every((item) => [401, 403].includes(item.status));
  const corsChecksPassed =
    corsDenied.status === 403 &&
    corsDenied.body?.code === 'cors_origin_denied' &&
    corsAllowed.status >= 200 &&
    corsAllowed.status < 300;
  const methodCheckPassed =
    methodDenied.status === 405 &&
    methodDenied.body?.code === 'method_not_allowed';
  const redactionPassed = (redactionScan?.issue_count || 0) === 0;
  const status =
    authChecksPassed && corsChecksPassed && methodCheckPassed && redactionPassed
      ? 'pass'
      : 'fail';

  const payload = {
    generated_at: new Date().toISOString(),
    status,
    jwt_protected_checks: authChecks,
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
    redaction_scan: redactionScan
      ? {
          issue_count: redactionScan.issue_count,
          scanned_files: redactionScan.scanned_files,
        }
      : null,
  };

  ensureDir(OUT);
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
