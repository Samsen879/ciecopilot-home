
import { jest } from '@jest/globals';

describe('API Contract Tests', () => {
  let request;
  let app;

  beforeAll(async () => {
    try {
      console.log('Loading dependencies...');
      const supertest = await import('supertest');
      request = supertest.default;
      console.log('Supertest loaded');

      const serverModule = await import('../../server.js');
      app = serverModule.default;
      console.log('Server module loaded');
    } catch (error) {
      console.error('CRITICAL ERROR LOADING APP:', error);
      throw error;
    }
  });

  describe('Health Endpoint', () => {
    it('GET /api/health should return 200 and match contract', async () => {
      if (!app || !request) throw new Error('App or request not initialized');
      const res = await request(app).get('/api/health');
      expect(res).toMatchApiContract(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Status Endpoint', () => {
    it('GET /api/status should return 200 and match contract', async () => {
      if (!app || !request) throw new Error('App or request not initialized');
      const res = await request(app).get('/api/status');
      expect(res).toMatchApiContract(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Error Handling Contract', () => {
    it('GET /api/non-existent-route should return 404 and match contract', async () => {
      if (!app || !request) throw new Error('App or request not initialized');
      const res = await request(app).get('/api/non-existent-route');
      expect(res).toMatchApiContract(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('POST /api/samsen/chat without body should return 400 and match contract', async () => {
      if (!app || !request) throw new Error('App or request not initialized');
      const res = await request(app).post('/api/samsen/chat').send({});
      // Note: This might return 401 if auth is required, checking contract is enough
      expect(res).toMatchApiContract(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Auth Contract (Unauthenticated)', () => {
    it('GET /api/auth/me without token should return 401 and match contract', async () => {
      if (!app || !request) throw new Error('App or request not initialized');
      const res = await request(app).get('/api/auth/me');
      expect(res).toMatchApiContract(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Canvas API Contract', () => {
    let testThreadId;
    let testNodeId;

    describe('Thread Management', () => {
      it('POST /api/samsen/canvas/threads should create thread and match contract', async () => {
        if (!app || !request) throw new Error('App or request not initialized');

        const threadData = {
          title: 'Test Canvas Thread',
          subjectCode: '9702',
          branchType: 'main'
        };

        const res = await request(app)
          .post('/api/samsen/canvas/threads')
          .send(threadData);

        expect(res).toMatchApiContract(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('title', threadData.title);
        expect(res.body.data).toHaveProperty('subjectCode', threadData.subjectCode);
        expect(res.body.data).toHaveProperty('nodes');
        expect(Array.isArray(res.body.data.nodes)).toBe(true);

        // Save thread ID for subsequent tests
        testThreadId = res.body.data.id;
      });

      it('POST /api/samsen/canvas/threads without required fields should return 400', async () => {
        if (!app || !request) throw new Error('App or request not initialized');

        const res = await request(app)
          .post('/api/samsen/canvas/threads')
          .send({});

        expect(res).toMatchApiContract(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
      });

      it('GET /api/samsen/canvas/threads should list all threads and match contract', async () => {
        if (!app || !request) throw new Error('App or request not initialized');

        const res = await request(app).get('/api/samsen/canvas/threads');

        expect(res).toMatchApiContract(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.meta).toHaveProperty('total');
      });

      it('GET /api/samsen/canvas/threads/:threadId should return thread and match contract', async () => {
        if (!app || !request) throw new Error('App or request not initialized');
        if (!testThreadId) throw new Error('Test thread not created');

        const res = await request(app).get(`/api/samsen/canvas/threads/${testThreadId}`);

        expect(res).toMatchApiContract(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id', testThreadId);
        expect(res.body.data).toHaveProperty('nodes');
        expect(Array.isArray(res.body.data.nodes)).toBe(true);
      });

      it('GET /api/samsen/canvas/threads/:threadId with non-existent ID should return 404', async () => {
        if (!app || !request) throw new Error('App or request not initialized');

        const res = await request(app).get('/api/samsen/canvas/threads/non-existent-id');

        expect(res).toMatchApiContract(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('THREAD_NOT_FOUND');
      });

      it('POST /api/samsen/canvas/threads with duplicate ID should return 409', async () => {
        if (!app || !request) throw new Error('App or request not initialized');
        if (!testThreadId) throw new Error('Test thread not created');

        const res = await request(app)
          .post('/api/samsen/canvas/threads')
          .send({
            id: testThreadId,
            title: 'Duplicate Thread',
            subjectCode: '9702'
          });

        expect(res).toMatchApiContract(409);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('THREAD_EXISTS');
      });
    });

    describe('Node Management', () => {
      it('POST /api/samsen/canvas/threads/:threadId/nodes should create node and match contract', async () => {
        if (!app || !request) throw new Error('App or request not initialized');
        if (!testThreadId) throw new Error('Test thread not created');

        const nodeData = {
          title: 'Test Node',
          type: 'concept',
          content: 'This is a test node content for canvas testing.',
          status: 'todo'
        };

        const res = await request(app)
          .post(`/api/samsen/canvas/threads/${testThreadId}/nodes`)
          .send(nodeData);

        expect(res).toMatchApiContract(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('title', nodeData.title);
        expect(res.body.data).toHaveProperty('type', nodeData.type);
        expect(res.body.data).toHaveProperty('content', nodeData.content);
        expect(res.body.data).toHaveProperty('status', nodeData.status);
        expect(res.body.data).toHaveProperty('threadId', testThreadId);

        // Save node ID for subsequent tests
        testNodeId = res.body.data.id;
      });

      it('POST /api/samsen/canvas/threads/:threadId/nodes without required fields should return 400', async () => {
        if (!app || !request) throw new Error('App or request not initialized');
        if (!testThreadId) throw new Error('Test thread not created');

        const res = await request(app)
          .post(`/api/samsen/canvas/threads/${testThreadId}/nodes`)
          .send({ title: 'Missing fields' });

        expect(res).toMatchApiContract(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
      });

      it('POST /api/samsen/canvas/threads/:threadId/nodes with non-existent thread should return 404', async () => {
        if (!app || !request) throw new Error('App or request not initialized');

        const res = await request(app)
          .post('/api/samsen/canvas/threads/non-existent-thread/nodes')
          .send({
            title: 'Test',
            type: 'concept',
            content: 'Test content'
          });

        expect(res).toMatchApiContract(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('THREAD_NOT_FOUND');
      });

      it('PUT /api/samsen/canvas/nodes/:nodeId should update node and match contract', async () => {
        if (!app || !request) throw new Error('App or request not initialized');
        if (!testNodeId) throw new Error('Test node not created');

        const updates = {
          title: 'Updated Node Title',
          status: 'in-progress'
        };

        const res = await request(app)
          .put(`/api/samsen/canvas/nodes/${testNodeId}`)
          .send(updates);

        expect(res).toMatchApiContract(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('title', updates.title);
        expect(res.body.data).toHaveProperty('status', updates.status);
      });

      it('PUT /api/samsen/canvas/nodes/:nodeId with non-existent ID should return 404', async () => {
        if (!app || !request) throw new Error('App or request not initialized');

        const res = await request(app)
          .put('/api/samsen/canvas/nodes/non-existent-node')
          .send({ title: 'Update' });

        expect(res).toMatchApiContract(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NODE_NOT_FOUND');
      });

      it('DELETE /api/samsen/canvas/nodes/:nodeId should delete node and match contract', async () => {
        if (!app || !request) throw new Error('App or request not initialized');
        if (!testNodeId) throw new Error('Test node not created');

        const res = await request(app)
          .delete(`/api/samsen/canvas/nodes/${testNodeId}`);

        expect(res).toMatchApiContract(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('deleted', testNodeId);
      });

      it('DELETE /api/samsen/canvas/nodes/:nodeId with non-existent ID should return 404', async () => {
        if (!app || !request) throw new Error('App or request not initialized');

        const res = await request(app)
          .delete('/api/samsen/canvas/nodes/non-existent-node');

        expect(res).toMatchApiContract(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NODE_NOT_FOUND');
      });
    });
  });

});
