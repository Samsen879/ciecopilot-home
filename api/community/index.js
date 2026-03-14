import express from 'express';
import cors from 'cors';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { getRequestId, sendApiError } from './lib/security.js';

import questionsHandler from './questions.js';
import answersHandler from './answers.js';
import interactionsHandler from './interactions.js';
import badgesHandler from './badges.js';
import reputationHandler from './reputation.js';
import profilesHandler from './profiles.js';
import notificationsHandler from './notifications.js';
import notificationsReadAllHandler from './notifications/read-all.js';
import notificationsUnreadCountHandler from './notifications/unread-count.js';
import notificationItemHandler from './notifications/[id].js';
import notificationReadHandler from './notifications/[id]/read.js';

const router = express.Router();

router.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

router.use(express.json());
router.use((req, res, next) => {
  const requestId = getRequestId(req);
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

function delegate(handler, { query, body, method } = {}) {
  return async (req, res, next) => {
    const originalQuery = req.query;
    const originalBody = req.body;
    const originalMethod = req.method;

    if (typeof query === 'function') {
      req.query = {
        ...(req.query || {}),
        ...query(req),
      };
    }

    if (typeof body === 'function') {
      req.body = {
        ...(req.body || {}),
        ...body(req),
      };
    }

    if (typeof method === 'string' && method) {
      req.method = method;
    }

    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    } finally {
      req.query = originalQuery;
      req.body = originalBody;
      req.method = originalMethod;
    }
  };
}

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'community-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.all('/questions', delegate(questionsHandler));
router.all('/questions/:id', delegate(questionsHandler, {
  query: (req) => ({ question_id: req.params.id }),
}));

router.all('/answers', delegate(answersHandler));
router.all('/answers/:id', delegate(answersHandler, {
  query: (req) => ({ answer_id: req.params.id }),
}));

router.all('/interactions', delegate(interactionsHandler));
router.delete('/interactions/:id', delegate(interactionsHandler, {
  query: (req) => ({ interaction_id: req.params.id }),
}));
router.post('/:type/:id/interact', authenticateToken, delegate(interactionsHandler, {
  body: (req) => ({
    content_type: req.params.type,
    content_id: req.params.id,
  }),
}));

router.post('/badges/award', authenticateToken, requirePermission('manage_roles'), delegate(badgesHandler));
router.all('/badges', delegate(badgesHandler));
router.all('/badges/:userId', delegate(badgesHandler, {
  query: (req) => ({ user_id: req.params.userId }),
}));

router.post('/reputation/update', authenticateToken, requirePermission('manage_roles'), delegate(reputationHandler));
router.post('/reputation/adjust', authenticateToken, requirePermission('manage_roles'), delegate(reputationHandler, {
  method: 'PUT',
}));
router.all('/reputation', delegate(reputationHandler));
router.all('/reputation/:userId', delegate(reputationHandler, {
  query: (req) => ({ user_id: req.params.userId }),
}));

router.all('/profiles', delegate(profilesHandler));
router.all('/profiles/:userId', delegate(profilesHandler, {
  query: (req) => ({ user_id: req.params.userId }),
}));
router.all('/users/:userId/profile', delegate(profilesHandler, {
  query: (req) => ({ user_id: req.params.userId }),
}));

router.post('/notifications/read-all', delegate(notificationsReadAllHandler));
router.get('/notifications/unread-count', delegate(notificationsUnreadCountHandler));
router.all('/notifications', delegate(notificationsHandler));
router.all('/notifications/:id/read', delegate(notificationReadHandler, {
  query: (req) => ({ id: req.params.id }),
}));
router.all('/notifications/:id', delegate(notificationItemHandler, {
  query: (req) => ({ id: req.params.id }),
}));

router.use('*', (req, res) => {
  sendApiError(res, {
    status: 404,
    error: 'not_found',
    code: 'ENDPOINT_NOT_FOUND',
    message: 'Endpoint not found',
    requestId: req.requestId,
    details: {
      path: req.originalUrl,
      method: req.method,
    },
  });
});

router.use((error, req, res, next) => {
  void next;
  console.error('Community API Error:', { request_id: req.requestId, error });

  if (error.name === 'ValidationError') {
    return sendApiError(res, {
      status: 400,
      error: 'validation_failed',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      requestId: req.requestId,
      details: error.message,
    });
  }

  if (error.name === 'UnauthorizedError') {
    return sendApiError(res, {
      status: 401,
      error: 'unauthorized',
      code: 'UNAUTHORIZED',
      message: 'Unauthorized access',
      requestId: req.requestId,
    });
  }

  return sendApiError(res, {
    status: 500,
    error: 'internal_server_error',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId: req.requestId,
  });
});

export default router;
