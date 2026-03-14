import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const questionsHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'questions', query: req.query, method: req.method });
});
const answersHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'answers', query: req.query, method: req.method });
});
const interactionsHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'interactions', query: req.query, method: req.method });
});
const profilesHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'profiles', query: req.query, method: req.method });
});
const reputationHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'reputation', query: req.query, method: req.method });
});
const badgesHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'badges', query: req.query, method: req.method });
});
const notificationsHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'notifications', query: req.query, method: req.method });
});
const notificationsReadAllHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'notifications-read-all', query: req.query, method: req.method });
});
const notificationsUnreadCountHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'notifications-unread-count', query: req.query, method: req.method });
});
const notificationItemHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'notification-item', query: req.query, method: req.method });
});
const notificationReadHandler = jest.fn((req, res) => {
  res.status(200).json({ module: 'notification-read', query: req.query, method: req.method });
});

jest.unstable_mockModule('../questions.js', () => ({ default: questionsHandler }));
jest.unstable_mockModule('../answers.js', () => ({ default: answersHandler }));
jest.unstable_mockModule('../interactions.js', () => ({ default: interactionsHandler }));
jest.unstable_mockModule('../profiles.js', () => ({ default: profilesHandler }));
jest.unstable_mockModule('../reputation.js', () => ({ default: reputationHandler }));
jest.unstable_mockModule('../badges.js', () => ({ default: badgesHandler }));
jest.unstable_mockModule('../notifications.js', () => ({ default: notificationsHandler }));
jest.unstable_mockModule('../notifications/read-all.js', () => ({ default: notificationsReadAllHandler }));
jest.unstable_mockModule('../notifications/unread-count.js', () => ({ default: notificationsUnreadCountHandler }));
jest.unstable_mockModule('../notifications/[id].js', () => ({ default: notificationItemHandler }));
jest.unstable_mockModule('../notifications/[id]/read.js', () => ({ default: notificationReadHandler }));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 'trusted-user', role: 'admin', permissions: ['manage_roles'] };
    next();
  },
  requirePermission: () => (_req, _res, next) => next(),
}));

const { default: router } = await import('../index.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/community', router);
  return app;
}

describe('community router contract', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    jest.clearAllMocks();
  });

  it('loads and maps REST-style params into the query contract used by the handlers', async () => {
    const app = createApp();

    const question = await request(app)
      .get('/api/community/questions/question-123')
      .set('Origin', 'http://localhost:3000');
    expect(question.status).toBe(200);
    expect(question.body.module).toBe('questions');
    expect(question.body.query.question_id).toBe('question-123');

    const badge = await request(app)
      .get('/api/community/badges/user-456')
      .set('Origin', 'http://localhost:3000');
    expect(badge.status).toBe(200);
    expect(badge.body.module).toBe('badges');
    expect(badge.body.query.user_id).toBe('user-456');

    const profile = await request(app)
      .get('/api/community/users/user-789/profile')
      .set('Origin', 'http://localhost:3000');
    expect(profile.status).toBe(200);
    expect(profile.body.module).toBe('profiles');
    expect(profile.body.query.user_id).toBe('user-789');

    const reputation = await request(app)
      .get('/api/community/reputation/user-321')
      .set('Origin', 'http://localhost:3000');
    expect(reputation.status).toBe(200);
    expect(reputation.body.module).toBe('reputation');
    expect(reputation.body.query.user_id).toBe('user-321');

    const adjust = await request(app)
      .post('/api/community/reputation/adjust')
      .set('Origin', 'http://localhost:3000');
    expect(adjust.status).toBe(200);
    expect(adjust.body.module).toBe('reputation');
    expect(adjust.body.method).toBe('PUT');
  });

  it('dispatches notification subroutes to the correct dedicated handlers', async () => {
    const app = createApp();

    const list = await request(app)
      .get('/api/community/notifications')
      .set('Origin', 'http://localhost:3000');
    expect(list.status).toBe(200);
    expect(list.body.module).toBe('notifications');

    const readAll = await request(app)
      .post('/api/community/notifications/read-all')
      .set('Origin', 'http://localhost:3000');
    expect(readAll.status).toBe(200);
    expect(readAll.body.module).toBe('notifications-read-all');

    const unreadCount = await request(app)
      .get('/api/community/notifications/unread-count')
      .set('Origin', 'http://localhost:3000');
    expect(unreadCount.status).toBe(200);
    expect(unreadCount.body.module).toBe('notifications-unread-count');

    const markRead = await request(app)
      .post('/api/community/notifications/notif-1/read')
      .set('Origin', 'http://localhost:3000');
    expect(markRead.status).toBe(200);
    expect(markRead.body.module).toBe('notification-read');
    expect(markRead.body.query.id).toBe('notif-1');

    const remove = await request(app)
      .delete('/api/community/notifications/notif-2')
      .set('Origin', 'http://localhost:3000');
    expect(remove.status).toBe(200);
    expect(remove.body.module).toBe('notification-item');
    expect(remove.body.query.id).toBe('notif-2');
  });
});
