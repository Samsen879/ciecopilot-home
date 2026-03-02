import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import request from 'supertest';
import { listRoutes } from '../_runtime/route-registry.js';

function toSamplePath(pathPrefix) {
  return pathPrefix.includes(':id')
    ? pathPrefix.replace(':id', 'sample-id')
    : pathPrefix;
}

function pickProbeMethod(methods = []) {
  if (!Array.isArray(methods) || methods.length === 0 || methods.includes('*')) {
    return 'GET';
  }
  const candidate = methods.find((m) => m !== 'OPTIONS') || methods[0];
  return String(candidate || 'GET').toUpperCase();
}

describe('api route integration', () => {
  let server;
  let handler;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

    const mod = await import('../index.js');
    handler = mod.default;
    server = http.createServer(handler);
  });

  afterAll((done) => {
    if (!server || !server.listening) {
      done();
      return;
    }
    server.close((err) => {
      if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') {
        done(err);
        return;
      }
      done();
    });
  });

  it('serves info and health endpoints', async () => {
    const info = await request(server).get('/api/info').set('Origin', 'http://localhost:3000');
    expect(info.status).toBe(200);
    expect(info.body).toHaveProperty('routes');

    const health = await request(server).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('healthy');
  });

  it('routes every registered endpoint to a non-404 handler response', async () => {
    const routes = listRoutes();
    for (const route of routes) {
      const method = pickProbeMethod(route.methods);
      const target = toSamplePath(route.pathPrefix);
      let req = request(server)[method.toLowerCase()](target).set('Origin', 'http://localhost:3000');
      if (!['GET', 'HEAD'].includes(method)) {
        req = req.send({});
      }
      const res = await req;
      expect(res.status).not.toBe(404);
      expect(res.body?.code).not.toBe('endpoint_not_found');
    }
  });

  it('returns 405 for disallowed methods and 404 for legacy excluded endpoints', async () => {
    const methodDenied = await request(server).get('/api/rag/search').set('Origin', 'http://localhost:3000');
    expect(methodDenied.status).toBe(405);
    expect(methodDenied.body.code).toBe('method_not_allowed');

    const legacy = await request(server).post('/api/chat').set('Origin', 'http://localhost:3000').send({});
    expect(legacy.status).toBe(404);
    expect(legacy.body.code).toBe('endpoint_not_found');
  });

  it('contains zero under_development stubs in production api sources', () => {
    const files = [];
    function walk(dir) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (item.name === '__tests__' || item.name === 'node_modules') continue;
          walk(full);
          continue;
        }
        if (item.isFile() && item.name.endsWith('.js')) files.push(full);
      }
    }

    walk(path.join(process.cwd(), 'api'));
    const offenders = files.filter((file) => fs.readFileSync(file, 'utf8').includes('under_development'));
    expect(offenders).toEqual([]);
  });
});
