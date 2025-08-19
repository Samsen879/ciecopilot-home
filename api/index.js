// API 路由配置文件
// 统一管理所有API端点
import http from 'http';
import url from 'url';

const handler = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // 解析请求路径
  const { url: requestUrl } = req;
  const path = requestUrl.split('?')[0]; // 移除查询参数
  const pathSegments = path.split('/').filter(segment => segment !== '');

  try {
    // 路由到相应的处理器
    if (pathSegments.length === 0 || pathSegments[0] !== 'api') {
      return handleApiInfo(req, res);
    }

    const module = pathSegments[1];
    const subModule = pathSegments[2];

    switch (module) {
      case 'auth':
        return await routeAuth(req, res, subModule);
      case 'users':
        return await routeUsers(req, res, subModule);
      case 'recommendations':
        return await routeRecommendations(req, res, subModule);
      case 'community':
        return await routeCommunity(req, res, subModule);
      case 'ai':
        return await routeAI(req, res, subModule);
      case 'health':
        return handleHealthCheck(req, res);
      case 'info':
        return handleApiInfo(req, res);
      case '':
      case undefined:
        return handleApiInfo(req, res);
      default:
        res.statusCode = 404;
        return res.end(JSON.stringify({ 
          error: 'API endpoint not found',
          available_modules: ['auth', 'users', 'recommendations', 'community', 'ai', 'health', 'info']
        }));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.statusCode = 500;
    return res.end(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }));
  }
};

// API 信息
function handleApiInfo(req, res) {
  res.statusCode = 200;
  return res.end(JSON.stringify({
    name: 'CIE Copilot API',
    version: '1.0.0',
    description: 'AI-powered learning platform API',
    endpoints: {
      auth: {
        base: '/api/auth',
        description: 'Authentication and authorization',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/refresh',
          'POST /api/auth/logout',
          'POST /api/auth/verify-email',
          'POST /api/auth/forgot-password',
          'POST /api/auth/reset-password'
        ]
      },
      users: {
        base: '/api/users',
        description: 'User management',
        endpoints: [
          'GET /api/users',
          'POST /api/users',
          'PUT /api/users',
          'DELETE /api/users',
          'GET /api/users/profile',
          'PUT /api/users/profile',
          'GET /api/users/permissions',
          'POST /api/users/permissions',
          'PUT /api/users/permissions',
          'DELETE /api/users/permissions'
        ]
      },
      recommendations: {
        base: '/api/recommendations',
        description: 'AI-powered content recommendations',
        endpoints: [
          'GET /api/recommendations',
          'POST /api/recommendations',
          'PUT /api/recommendations',
          'DELETE /api/recommendations',
          'GET /api/recommendations/preferences',
          'POST /api/recommendations/preferences',
          'PUT /api/recommendations/preferences',
          'DELETE /api/recommendations/preferences',
          'GET /api/recommendations/learning-data',
          'POST /api/recommendations/learning-data',
          'PUT /api/recommendations/learning-data',
          'DELETE /api/recommendations/learning-data',
          'POST /api/recommendations/feedback'
        ]
      },
      community: {
        base: '/api/community',
        description: 'Community Q&A system with reputation and badges',
        endpoints: [
          'GET /api/community/questions',
          'POST /api/community/questions',
          'PUT /api/community/questions/:id',
          'DELETE /api/community/questions/:id',
          'GET /api/community/answers',
          'POST /api/community/answers',
          'PUT /api/community/answers/:id',
          'DELETE /api/community/answers/:id',
          'GET /api/community/interactions',
          'POST /api/community/interactions',
          'DELETE /api/community/interactions/:id',
          'POST /api/community/:type/:id/interact',
          'GET /api/community/badges',
          'POST /api/community/badges',
          'GET /api/community/badges/:userId',
          'GET /api/community/reputation/:userId',
          'POST /api/community/reputation/update',
          'GET /api/community/users/:userId/profile',
          'PUT /api/community/users/:userId/profile'
        ]
      },
      ai: {
        base: '/api/ai',
        description: 'AI services for learning and analysis',
        endpoints: [
          'POST /api/ai/learning/path-generator',
          'POST /api/ai/analysis/knowledge-gaps'
        ]
      }
    },
    status: 'active',
    timestamp: new Date().toISOString()
  }));
}

// 健康检查
function handleHealthCheck(req, res) {
  res.statusCode = 200;
  return res.end(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }));
}

// 认证模块路由
async function routeAuth(req, res, subModule) {
  // 临时返回，等待实际模块实现
  res.statusCode = 200;
  return res.end(JSON.stringify({ 
    message: 'Auth module endpoint',
    subModule,
    status: 'under_development'
  }));
}

// 用户模块路由
async function routeUsers(req, res, subModule) {
  // 临时返回，等待实际模块实现
  res.statusCode = 200;
  return res.end(JSON.stringify({ 
    message: 'Users module endpoint',
    subModule,
    status: 'under_development'
  }));
}

// 推荐系统模块路由
async function routeRecommendations(req, res, subModule) {
  // 临时返回，等待实际模块实现
  res.statusCode = 200;
  return res.end(JSON.stringify({ 
    message: 'Recommendations module endpoint',
    subModule,
    status: 'under_development'
  }));
}

// 社区模块路由
async function routeCommunity(req, res, subModule) {
  // 解析完整路径以支持嵌套路由
  const { url: requestUrl } = req;
  const path = requestUrl.split('?')[0];
  const pathSegments = path.split('/').filter(segment => segment !== '');
  
  // 移除 'api' 和 'community' 前缀
  const communityPath = pathSegments.slice(2);
  const mainModule = communityPath[0];
  
  // 处理嵌套路由
   if (communityPath.includes('users') && communityPath.includes('profile')) {
     // 处理 /users/{userId}/profile 路由
     res.statusCode = 200;
     return res.end(JSON.stringify({ 
       message: 'Community user profile endpoint',
       path: communityPath,
       status: 'under_development'
     }));
  }
  
  if (communityPath.includes('interact')) {
     // 处理 /:type/:id/interact 路由
     res.statusCode = 200;
     return res.end(JSON.stringify({ 
       message: 'Community interaction endpoint',
       path: communityPath,
       status: 'under_development'
     }));
  }
  
  switch (mainModule) {
     case 'questions':
       res.statusCode = 200;
       return res.end(JSON.stringify({ 
         message: 'Community questions endpoint',
         status: 'under_development'
       }));
     case 'answers':
       res.statusCode = 200;
       return res.end(JSON.stringify({ 
         message: 'Community answers endpoint',
         status: 'under_development'
       }));
     case 'interactions':
       res.statusCode = 200;
       return res.end(JSON.stringify({ 
         message: 'Community interactions endpoint',
         status: 'under_development'
       }));
     case 'badges':
       res.statusCode = 200;
       return res.end(JSON.stringify({ 
         message: 'Community badges endpoint',
         status: 'under_development'
       }));
     case 'reputation':
       res.statusCode = 200;
       return res.end(JSON.stringify({ 
         message: 'Community reputation endpoint',
         status: 'under_development'
       }));
     case 'users':
       res.statusCode = 200;
       return res.end(JSON.stringify({ 
         message: 'Community users endpoint',
         status: 'under_development'
       }));
     default:
       res.statusCode = 404;
       return res.end(JSON.stringify({ error: 'Community endpoint not found' }));
  }
}

// AI模块路由
async function routeAI(req, res, subModule) {
  // 临时返回，等待实际模块实现
  res.statusCode = 200;
  return res.end(JSON.stringify({ 
    message: 'AI module endpoint',
    subModule,
    status: 'under_development'
  }));
}

// 在本地开发或非无服务器环境下才启动独立 HTTP 服务器
// Vercel 无服务器函数会直接调用导出的 handler，不应调用 listen
const isServerlessEnvironment = Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.NOW_REGION);

if (!isServerlessEnvironment && process.env.NODE_ENV !== 'test') {
  const server = http.createServer(handler);
  const PORT = process.env.PORT || 3001;

  server.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}

export default handler;