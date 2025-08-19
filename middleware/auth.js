const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 用户角色权限级别
const ROLE_LEVELS = {
  student: 1,
  teacher: 2,
  moderator: 3,
  admin: 4
};

// 权限映射
const PERMISSIONS = {
  // 基础权限
  'read_own_profile': ['student', 'teacher', 'moderator', 'admin'],
  'update_own_profile': ['student', 'teacher', 'moderator', 'admin'],
  'create_question': ['student', 'teacher', 'moderator', 'admin'],
  'create_answer': ['student', 'teacher', 'moderator', 'admin'],
  'vote_content': ['student', 'teacher', 'moderator', 'admin'],
  'bookmark_content': ['student', 'teacher', 'moderator', 'admin'],
  
  // 教师权限
  'moderate_own_content': ['teacher', 'moderator', 'admin'],
  'create_exercise': ['teacher', 'moderator', 'admin'],
  'grade_submissions': ['teacher', 'moderator', 'admin'],
  
  // 版主权限
  'moderate_community': ['moderator', 'admin'],
  'delete_any_content': ['moderator', 'admin'],
  'ban_users': ['moderator', 'admin'],
  'manage_tags': ['moderator', 'admin'],
  
  // 管理员权限
  'manage_users': ['admin'],
  'manage_roles': ['admin'],
  'view_analytics': ['admin'],
  'system_settings': ['admin']
};

/**
 * JWT Token 认证中间件
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失',
        code: 'AUTH_001'
      });
    }

    // 验证 JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查用户是否存在且状态正常
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', decoded.userId)
      .eq('status', 'active')
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌或用户不存在',
        code: 'AUTH_002'
      });
    }

    // 检查会话是否有效
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('token_hash', hashToken(token))
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return res.status(401).json({
        success: false,
        message: '会话已过期或无效',
        code: 'AUTH_002'
      });
    }

    // 更新最后活动时间
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', session.id);

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      reputation: user.reputation || 0,
      permissions: await getUserPermissions(user.id, user.role)
    };

    next();
  } catch (error) {
    console.error('认证错误:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期',
        code: 'AUTH_002'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌',
        code: 'AUTH_001'
      });
    }

    return res.status(500).json({
      success: false,
      message: '认证服务错误',
      code: 'AUTH_500'
    });
  }
};

/**
 * 权限检查中间件
 * @param {string|Array} requiredPermissions - 所需权限
 * @param {Object} options - 选项
 */
const requirePermission = (requiredPermissions, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
          code: 'AUTH_001'
        });
      }

      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      // 检查用户是否拥有所需权限
      const hasPermission = permissions.some(permission => {
        if (req.user.permissions.includes(permission)) {
          return true;
        }
        
        // 检查角色权限
        const allowedRoles = PERMISSIONS[permission];
        if (allowedRoles && allowedRoles.includes(req.user.role)) {
          return true;
        }
        
        return false;
      });

      if (!hasPermission) {
        // 记录权限拒绝事件
        await recordSecurityEvent(req.user.id, 'permission_denied', {
          required_permissions: permissions,
          user_role: req.user.role,
          endpoint: req.path,
          method: req.method
        });

        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 'AUTH_003'
        });
      }

      // 检查声誉要求
      if (options.minReputation && req.user.reputation < options.minReputation) {
        return res.status(403).json({
          success: false,
          message: `需要至少 ${options.minReputation} 声誉值`,
          code: 'COMM_003'
        });
      }

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '权限检查服务错误'
      });
    }
  };
};

/**
 * 角色检查中间件
 * @param {string|Array} requiredRoles - 所需角色
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'AUTH_001'
      });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '角色权限不足',
        code: 'AUTH_003'
      });
    }

    next();
  };
};

/**
 * 最低权限级别检查中间件
 * @param {number} minLevel - 最低权限级别
 */
const requireMinLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'AUTH_001'
      });
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    
    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: '权限级别不足',
        code: 'AUTH_003'
      });
    }

    next();
  };
};

/**
 * 资源所有权检查中间件
 * @param {string} resourceIdParam - 资源ID参数名
 * @param {string} tableName - 数据表名
 * @param {string} ownerField - 所有者字段名
 */
const requireOwnership = (resourceIdParam, tableName, ownerField = 'user_id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
          code: 'AUTH_001'
        });
      }

      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: '资源ID缺失'
        });
      }

      // 查询资源所有者
      const { data: resource, error } = await supabase
        .from(tableName)
        .select(ownerField)
        .eq('id', resourceId)
        .single();

      if (error || !resource) {
        return res.status(404).json({
          success: false,
          message: '资源不存在'
        });
      }

      // 检查所有权或管理员权限
      if (resource[ownerField] !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权访问此资源',
          code: 'AUTH_003'
        });
      }

      next();
    } catch (error) {
      console.error('所有权检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '所有权检查服务错误'
      });
    }
  };
};

/**
 * 获取用户权限
 * @param {string} userId - 用户ID
 * @param {string} role - 用户角色
 */
async function getUserPermissions(userId, role) {
  try {
    // 获取特殊权限
    const { data: specialPermissions } = await supabase
      .from('user_permissions')
      .select('permission_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString());

    const permissions = specialPermissions?.map(p => p.permission_name) || [];
    
    // 添加角色默认权限
    Object.entries(PERMISSIONS).forEach(([permission, allowedRoles]) => {
      if (allowedRoles.includes(role) && !permissions.includes(permission)) {
        permissions.push(permission);
      }
    });

    return permissions;
  } catch (error) {
    console.error('获取用户权限错误:', error);
    return [];
  }
}

/**
 * 记录安全事件
 * @param {string} userId - 用户ID
 * @param {string} eventType - 事件类型
 * @param {Object} metadata - 事件元数据
 */
async function recordSecurityEvent(userId, eventType, metadata = {}) {
  try {
    await supabase
      .from('security_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        metadata,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('记录安全事件错误:', error);
  }
}

/**
 * 生成Token哈希
 * @param {string} token - JWT Token
 */
function hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * 可选认证中间件（允许匿名访问）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // 尝试验证token，但不强制要求
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const { data: user } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', decoded.userId)
        .eq('status', 'active')
        .single();

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status,
          reputation: user.reputation || 0,
          permissions: await getUserPermissions(user.id, user.role)
        };
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('可选认证错误:', error);
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  requireMinLevel,
  requireOwnership,
  optionalAuth,
  ROLE_LEVELS,
  PERMISSIONS,
  getUserPermissions,
  recordSecurityEvent
};
