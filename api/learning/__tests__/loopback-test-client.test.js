import http from 'node:http';
import { createLoopbackHttpTestClient, LOOPBACK_HOST } from './loopback-test-client.js';

describe('createLoopbackHttpTestClient', () => {
  test('binds test servers to loopback instead of relying on wildcard host defaults', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(204);
      res.end();
    });
    const harness = await createLoopbackHttpTestClient(server);

    try {
      expect(server.listening).toBe(true);
      expect(server.address()).toMatchObject({
        address: LOOPBACK_HOST,
      });
    } finally {
      await harness.close();
    }
  });

  test('routes requests through the loopback-bound supertest client', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, url: req.url }));
    });
    const harness = await createLoopbackHttpTestClient(server);

    try {
      const res = await harness.request.get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, url: '/health' });
    } finally {
      await harness.close();
    }
  });
});
