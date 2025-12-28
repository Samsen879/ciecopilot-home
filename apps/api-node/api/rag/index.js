/**
 * RAG API Router
 *
 * Routes for RAG (Retrieval-Augmented Generation) endpoints.
 */

import { Router } from 'express';
import searchHandler from './search.js';
import chatHandler from './chat.js';
import chatV2Handler from './chat-v2.js';
import recallHandler from './recall.js';

const router = Router();

router.post('/search', searchHandler);
router.post('/chat', chatHandler);
router.post('/chat-v2', chatV2Handler);
router.post('/recall', recallHandler);

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rag',
    endpoints: ['/search', '/chat', '/chat-v2', '/recall'],
    recommended: '/chat-v2',
  });
});

export default router;
