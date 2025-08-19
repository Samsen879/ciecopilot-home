// 社区系统主路由
import express from 'express';
import cors from 'cors';
import { authenticateToken } from '../middleware/auth.js';

// 导入各个模块的处理函数
import { handleGetQuestions, handleCreateQuestion, handleGetQuestionById, handleUpdateQuestion, handleDeleteQuestion } from './questions.js';
import { handleGetAnswers, handleCreateAnswer, handleGetAnswerById, handleUpdateAnswer, handleDeleteAnswer } from './answers.js';
import { handleGetInteractions, handleCreateInteraction, handleDeleteInteraction } from './interactions.js';
import { handleGetBadges, handleAwardBadge } from './badges.js';
import { handleGetReputation, handleUpdateReputation, handleAdjustReputation } from './reputation.js';
import { handleGetProfile, handleUpdateProfile, handleCreateProfile } from './profiles.js';

const router = express.Router();

// CORS配置
router.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// JSON解析中间件
router.use(express.json());

// ==================== 问题相关路由 ====================

// 获取问题列表
router.get('/questions', async (req, res) => {
  try {
    await handleGetQuestions(req, res);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建问题
router.post('/questions', authenticateToken, async (req, res) => {
  try {
    await handleCreateQuestion(req, res);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取单个问题
router.get('/questions/:id', async (req, res) => {
  try {
    await handleGetQuestionById(req, res);
  } catch (error) {
    console.error('Get question by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新问题
router.put('/questions/:id', authenticateToken, async (req, res) => {
  try {
    await handleUpdateQuestion(req, res);
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除问题
router.delete('/questions/:id', authenticateToken, async (req, res) => {
  try {
    await handleDeleteQuestion(req, res);
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 回答相关路由 ====================

// 获取回答列表
router.get('/answers', async (req, res) => {
  try {
    await handleGetAnswers(req, res);
  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建回答
router.post('/answers', authenticateToken, async (req, res) => {
  try {
    await handleCreateAnswer(req, res);
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取单个回答
router.get('/answers/:id', async (req, res) => {
  try {
    await handleGetAnswerById(req, res);
  } catch (error) {
    console.error('Get answer by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新回答
router.put('/answers/:id', authenticateToken, async (req, res) => {
  try {
    await handleUpdateAnswer(req, res);
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除回答
router.delete('/answers/:id', authenticateToken, async (req, res) => {
  try {
    await handleDeleteAnswer(req, res);
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 互动相关路由 ====================

// 获取互动记录
router.get('/interactions', authenticateToken, async (req, res) => {
  try {
    await handleGetInteractions(req, res);
  } catch (error) {
    console.error('Get interactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建互动
router.post('/interactions', authenticateToken, async (req, res) => {
  try {
    await handleCreateInteraction(req, res);
  } catch (error) {
    console.error('Create interaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除互动
router.delete('/interactions/:id', authenticateToken, async (req, res) => {
  try {
    await handleDeleteInteraction(req, res);
  } catch (error) {
    console.error('Delete interaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 通用互动端点（兼容性）
router.post('/:type/:id/interact', authenticateToken, async (req, res) => {
  try {
    // 将参数转换为interactions格式
    req.body.contentType = req.params.type;
    req.body.contentId = req.params.id;
    await handleCreateInteraction(req, res);
  } catch (error) {
    console.error('Interact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 徽章相关路由 ====================

// 获取用户徽章
router.get('/badges/:userId?', async (req, res) => {
  try {
    await handleGetBadges(req, res);
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 颁发徽章（系统调用）
router.post('/badges/award', authenticateToken, async (req, res) => {
  try {
    await handleAwardBadge(req, res);
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 声誉相关路由 ====================

// 获取用户声誉信息
router.get('/reputation/:userId?', async (req, res) => {
  try {
    await handleGetReputation(req, res);
  } catch (error) {
    console.error('Get reputation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新用户声誉（系统调用）
router.post('/reputation/update', authenticateToken, async (req, res) => {
  try {
    await handleUpdateReputation(req, res);
  } catch (error) {
    console.error('Update reputation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 调整用户声誉（管理员功能）
router.post('/reputation/adjust', authenticateToken, async (req, res) => {
  try {
    await handleAdjustReputation(req, res);
  } catch (error) {
    console.error('Adjust reputation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 用户档案相关路由 ====================

// 获取用户档案
router.get('/users/:userId/profile', async (req, res) => {
  try {
    await handleGetProfile(req, res);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新用户档案
router.put('/users/:userId/profile', authenticateToken, async (req, res) => {
  try {
    await handleUpdateProfile(req, res);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建用户档案
router.post('/users/:userId/profile', authenticateToken, async (req, res) => {
  try {
    await handleCreateProfile(req, res);
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 健康检查 ====================

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'community-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==================== 错误处理 ====================

// 404处理
router.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// 全局错误处理
router.use((error, req, res, next) => {
  console.error('Community API Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: error.message 
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Unauthorized access' 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default router;