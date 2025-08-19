const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 用户配置
const USER_CONFIG = {
  DEFAULT_ROLE: 'student',
  DEFAULT_REPUTATION: 0,
  ROLES: {
    student: { level: 1, permissions: ['read'] },
    teacher: { level: 2, permissions: ['read', 'write', 'moderate_basic'] },
    moderator: { level: 3, permissions: ['read', 'write', 'moderate_basic', 'moderate_advanced'] },
    admin: { level: 4, permissions: ['read', 'write', 'moderate_basic', 'moderate_advanced', 'admin'] }
  },
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  }
};

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 验证请求方法
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 根据请求方法路由
    switch (req.method) {
      case 'GET':
        return await handleGetUsers(req, res);
      case 'POST':
        return await handleCreateUser(req, res);
      case 'PUT':
        return await handleUpdateUser(req, res);
      case 'DELETE':
        return await handleDeleteUser(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取用户列表
async function handleGetUsers(req, res) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const permissionResult = await requirePermission(authResult.user, 'admin');
    if (!permissionResult.success) {
      return res.status(403).json({ error: permissionResult.error });
    }

    const { page = 1, limit = USER_CONFIG.PAGINATION.DEFAULT_LIMIT, search, role, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const actualLimit = Math.min(parseInt(limit), USER_CONFIG.PAGINATION.MAX_LIMIT);

    // 构建查询
    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        username,
        full_name,
        role,
        reputation,
        status,
        email_verified,
        last_login_at,
        created_at,
        updated_at
      `);

    // 添加搜索条件
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // 获取总数
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .or(search ? `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%` : '')
      .eq(role ? 'role' : 'id', role || 'id')
      .eq(status ? 'status' : 'id', status || 'id');

    // 执行查询
    const { data: users, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + actualLimit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    return res.status(200).json({
      users,
      pagination: {
        page: parseInt(page),
        limit: actualLimit,
        total: count,
        totalPages: Math.ceil(count / actualLimit)
      }
    });
  } catch (error) {
    console.error('Error in handleGetUsers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 创建用户（管理员功能）
async function handleCreateUser(req, res) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const permissionResult = await requirePermission(authResult.user, 'admin');
    if (!permissionResult.success) {
      return res.status(403).json({ error: permissionResult.error });
    }

    const { email, password, username, full_name, role = USER_CONFIG.DEFAULT_ROLE } = req.body;

    // 验证必填字段
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    // 验证角色
    if (!USER_CONFIG.ROLES[role]) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const { data: newUser, error } = await supabase
      .from('user_profiles')
      .insert({
        email,
        username,
        full_name,
        role,
        password_hash: hashedPassword,
        reputation: USER_CONFIG.DEFAULT_REPUTATION,
        status: 'active',
        email_verified: false
      })
      .select(`
        id,
        email,
        username,
        full_name,
        role,
        reputation,
        status,
        email_verified,
        created_at
      `)
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // 记录安全事件
    await logSecurityEvent(newUser.id, 'user_created_by_admin', 'info', req.ip, {
      created_by: authResult.user.id,
      user_role: role
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error in handleCreateUser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 更新用户信息
async function handleUpdateUser(req, res) {
  try {
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const { userId } = req.query;
    const { username, full_name, role, status, email_verified } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 检查权限：用户只能更新自己的信息，管理员可以更新任何用户
    const isAdmin = await requirePermission(authResult.user, 'admin');
    const isOwner = authResult.user.id === userId;

    if (!isAdmin.success && !isOwner) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // 构建更新数据
    const updateData = {};
    
    if (username !== undefined) updateData.username = username;
    if (full_name !== undefined) updateData.full_name = full_name;
    
    // 只有管理员可以更新角色、状态和邮箱验证状态
    if (isAdmin.success) {
      if (role !== undefined) {
        if (!USER_CONFIG.ROLES[role]) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        updateData.role = role;
      }
      if (status !== undefined) updateData.status = status;
      if (email_verified !== undefined) updateData.email_verified = email_verified;
    }

    updateData.updated_at = new Date().toISOString();

    // 更新用户
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        email,
        username,
        full_name,
        role,
        reputation,
        status,
        email_verified,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    // 记录角色变更
    if (role && isAdmin.success) {
      await logRoleChange(userId, authResult.user.id, role);
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error in handleUpdateUser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 删除用户（软删除）
async function handleDeleteUser(req, res) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const permissionResult = await requirePermission(authResult.user, 'admin');
    if (!permissionResult.success) {
      return res.status(403).json({ error: permissionResult.error });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 防止删除自己
    if (authResult.user.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // 软删除用户（设置状态为 deleted）
    const { data: deletedUser, error } = await supabase
      .from('user_profiles')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, email')
      .single();

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    // 记录安全事件
    await logSecurityEvent(userId, 'user_deleted_by_admin', 'warning', req.ip, {
      deleted_by: authResult.user.id
    });

    return res.status(200).json({
      message: 'User deleted successfully',
      user: deletedUser
    });
  } catch (error) {
    console.error('Error in handleDeleteUser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 辅助函数：记录安全事件
async function logSecurityEvent(userId, eventType, severity, ipAddress, metadata) {
  try {
    await supabase
      .from('security_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        severity,
        ip_address: ipAddress,
        metadata,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}

// 辅助函数：记录角色变更
async function logRoleChange(userId, changedBy, newRole) {
  try {
    await supabase
      .from('user_role_history')
      .insert({
        user_id: userId,
        old_role: null, // 需要先查询当前角色
        new_role: newRole,
        changed_by: changedBy,
        changed_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging role change:', error);
  }
}