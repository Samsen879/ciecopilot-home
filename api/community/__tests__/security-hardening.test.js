import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { jest } from '@jest/globals';

function readSource(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

async function importFresh(relPath) {
  const href = pathToFileURL(path.join(process.cwd(), relPath)).href;
  return import(`${href}?t=${Date.now()}_${Math.random()}`);
}

function withSupabaseEnv() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
}

function createMockResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    }
  };
}

async function loadNotificationHandler(
  relPath,
  {
    initialResult = { data: null, error: null },
    mutationOperation = 'delete',
    mutationResult = { data: null, error: null }
  } = {}
) {
  jest.resetModules();
  withSupabaseEnv();

  const authGetUser = jest.fn().mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null
  });

  await jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
    getServiceClient: () => ({
      auth: { getUser: authGetUser },
      from: jest.fn(() => {
        let currentOperation = 'select';

        const builder = {
          select: jest.fn(() => builder),
          update: jest.fn(() => {
            currentOperation = 'update';
            return builder;
          }),
          delete: jest.fn(() => {
            currentOperation = 'delete';
            return builder;
          }),
          eq: jest.fn(() => builder),
          maybeSingle: jest.fn(() => Promise.resolve(
            currentOperation === 'select' ? initialResult : mutationResult
          ))
        };

        if (mutationOperation === 'update') {
          builder[mutationOperation] = builder.update;
        } else {
          builder[mutationOperation] = builder.delete;
        }

        return builder;
      })
    })
  }));

  const module = await importFresh(relPath);
  return module.default;
}

afterEach(() => {
  jest.resetModules();
});

describe('community security hardening (T14)', () => {
  const corsFiles = [
    'api/community/questions.js',
    'api/community/answers.js',
    'api/community/interactions.js',
    'api/community/reputation.js',
    'api/community/badges.js',
    'api/community/profiles.js',
    'api/community/notifications.js',
    'api/community/notifications/read-all.js',
    'api/community/notifications/unread-count.js',
    'api/community/notifications/[id].js',
    'api/community/notifications/[id]/read.js'
  ];

  it('removes wildcard CORS from all community handlers', () => {
    for (const file of corsFiles) {
      const src = readSource(file);
      expect(src).not.toContain("Access-Control-Allow-Origin', '*'");
      expect(src).toContain('applyCors(');
    }
  });

  it('applies input sanitization to question and answer UGC writes', () => {
    const questions = readSource('api/community/questions.js');
    const answers = readSource('api/community/answers.js');

    expect(questions).toContain('sanitizePlainText(');
    expect(questions).toContain('sanitizeTagList(');
    expect(answers).toContain('sanitizePlainText(');
  });

  it('enforces role checks for badge award and reputation update endpoints', () => {
    const badges = readSource('api/community/badges.js');
    const reputation = readSource('api/community/reputation.js');
    const router = readSource('api/community/index.js');

    expect(badges).toContain("isCommunityRoleAllowed(supabase, user.id, ['admin', 'moderator'])");
    expect(reputation).toContain("isCommunityRoleAllowed(supabase, user.id, ['admin', 'moderator'])");
    expect(router).toContain("requirePermission('manage_roles')");
  });

  it('uses query id parameters in notification detail routes without URL split fallback', () => {
    const deleteById = readSource('api/community/notifications/[id].js');
    const markRead = readSource('api/community/notifications/[id]/read.js');

    expect(deleteById).not.toContain('req.url.split');
    expect(markRead).not.toContain('req.url.split');
    expect(deleteById).toContain('req.query?.id');
    expect(markRead).toContain('req.query?.id');
  });

  it('loads the aggregate community router without missing handler exports', async () => {
    withSupabaseEnv();

    await expect(importFresh('api/community/index.js')).resolves.toHaveProperty('default');
  });

  it('returns not found when marking a missing notification as read', async () => {
    const handler = await loadNotificationHandler(
      'api/community/notifications/[id]/read.js',
      {
        initialResult: { data: null, error: null },
        mutationOperation: 'update',
        mutationResult: { data: null, error: null }
      }
    );

    const req = {
      method: 'POST',
      query: { id: 'missing-notification' },
      headers: { authorization: 'Bearer test-token' }
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      code: 'NOTIFICATION_NOT_FOUND'
    });
  });

  it('returns not found when deleting a missing notification', async () => {
    const handler = await loadNotificationHandler(
      'api/community/notifications/[id].js',
      {
        mutationOperation: 'delete',
        mutationResult: { data: null, error: null }
      }
    );

    const req = {
      method: 'DELETE',
      query: { id: 'missing-notification' },
      headers: { authorization: 'Bearer test-token' }
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      code: 'NOTIFICATION_NOT_FOUND'
    });
  });

  it('prevents duplicate non-vote interactions instead of checking only vote conflicts', () => {
    const interactions = readSource('api/community/interactions.js');

    expect(interactions).not.toContain(".in('interaction_type', ['upvote', 'downvote']) // 只检查投票类型的冲突");
    expect(interactions).toContain(".eq('interaction_type', interactionType)");
  });

  it('keeps voter reputation updates symmetric when switching vote types', () => {
    const interactions = readSource('api/community/interactions.js');
    const voterUpdates = interactions.match(/updateUserReputationLocal\(user\.id,/g) || [];

    expect(voterUpdates).toHaveLength(3);
  });
});
