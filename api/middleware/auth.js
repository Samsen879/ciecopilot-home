const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 用户角色权限级别定义
const USER_ROLES = {
  STUDENT: 1,      // 学生
  TEACHER: 2,      // 教师
  MODERATOR: 3,    // 版主
  ADMIN: 4         // 管理员
};

// 权限检查配置
const PERMISSION_CONFIG = {
  // 推荐系统权限
  'recommendations.read': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'recommendations.create': [USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'recommendations.update': [USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'recommendations.delete': [USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  
  // 社区系统权限
  'community.questions.read': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.questions.create': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.questions.update': [USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.questions.delete': [USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  
  'community.answers.read': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.answers.create': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.answers.update': [USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.answers.delete': [USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  
  'community.interactions.read': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.interactions.create': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'community.interactions.delete': [USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  
  // 管理权限
  'admin.users.manage': [USER_ROLES.ADMIN],
  'admin.content.moderate': [USER_ROLES.MODERATOR, USER_ROLES.ADMIN],
  'admin.system.config': [USER_ROLES.ADMIN]
};

/**
 * JWT Token 验证中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
async function authenticateToken(req, res, next) {
  try {
    // 从请求头获取 Authorization token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: '需要提供访问令牌'
      });
    }
    
    // 验证 JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 从数据库获取用户信息
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: '无效的访问令牌'
      });
    }
    
    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account inactive',
        message: '账户已被禁用'
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'student',
      roleLevel: USER_ROLES[user.role?.toUpperCase()] || USER_ROLES.STUDENT,
      profile: user
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: '无效的访问令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: '访问令牌已过期'
      });
    }
    
    return res.status(500).json({
      error: 'Authentication failed',
      message: '身份验证失败'
    });
  }
}

/**
 * 权限检查中间件工厂函数
 * @param {string} permission - 需要的权限
 * @returns {Function} 中间件函数
 */
function requirePermission(permission) {
  return (req, res, next) => {
    try {
      // 检查用户是否已认证
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: '需要身份验证'
        });
      }
      
      // 检查权限配置是否存在
      const allowedRoles = PERMISSION_CONFIG[permission];
      if (!allowedRoles) {
        console.warn(`Permission '${permission}' not configured`);
        return res.status(403).json({
          error: 'Permission not configured',
          message: '权限配置错误'
        });
      }
      
      // 检查用户角色是否有权限
      if (!allowedRoles.includes(req.user.roleLevel)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: '权限不足',
          required: permission,
          userRole: req.user.role
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        message: '权限检查失败'
      });
    }
  };
}

/**
 * 资源所有权检查中间件
 * @param {string} resourceType - 资源类型 (question, answer, etc.)
 * @param {string} idParam - 资源ID参数名 (默认为 'id')
 * @returns {Function} 中间件函数
 */
function requireOwnership(resourceType, idParam = 'id') {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const userId = req.user.id;
      
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          message: '缺少资源ID'
        });
      }
      
      // 管理员和版主可以操作所有资源
      if (req.user.roleLevel >= USER_ROLES.MODERATOR) {
        return next();
      }
      
      let tableName;
      let ownerField = 'user_id';
      
      // 根据资源类型确定表名
      switch (resourceType) {
        case 'question':
          tableName = 'community_questions';
          break;
        case 'answer':
          tableName = 'community_answers';
          break;
        case 'recommendation':
          tableName = 'recommendations';
          break;
        case 'feedback':
          tableName = 'recommendation_feedback';
          break;
        default:
          return res.status(400).json({
            error: 'Invalid resource type',
            message: '无效的资源类型'
          });
      }
      
      // 检查资源所有权
      const { data: resource, error } = await supabase
        .from(tableName)
        .select(ownerField)
        .eq('id', resourceId)
        .single();
      
      if (error || !resource) {
        return res.status(404).json({
          error: 'Resource not found',
          message: '资源不存在'
        });
      }
      
      if (resource[ownerField] !== userId) {
        return res.status(403).json({
          error: 'Access denied',
          message: '无权访问此资源'
        });
      }
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        error: 'Ownership check failed',
        message: '所有权检查失败'
      });
    }
  };
}

/**
 * 可选认证中间件 - 如果有token则验证，没有则跳过
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      // 没有token，设置匿名用户
      req.user = null;
      return next();
    }
    
    // 有token，尝试验证
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();
    
    if (!error && user && user.status === 'active') {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || 'student',
        roleLevel: USER_ROLES[user.role?.toUpperCase()] || USER_ROLES.STUDENT,
        profile: user
      };
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // token无效，设置为匿名用户
    req.user = null;
    next();
  }
}

/**
 * 生成JWT Token
 * @param {Object} payload - token载荷
 * @param {string} expiresIn - 过期时间
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn,
    issuer: 'cie-copilot',
    audience: 'cie-users'
  });
}

/**
 * 验证JWT Token（不查询数据库）
 * @param {string} token - JWT token
 * @returns {Object} 解码后的payload
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireOwnership,
  optionalAuth,
  generateToken,
  verifyToken,
  USER_ROLES,
  PERMISSION_CONFIG
};