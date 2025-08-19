const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 权限配置
const PERMISSION_CONFIG = {
  ROLES: {
    student: {
      level: 1,
      permissions: ['read', 'create_question', 'create_answer', 'vote', 'bookmark']
    },
    teacher: {
      level: 2,
      permissions: [
        'read', 'create_question', 'create_answer', 'vote', 'bookmark',
        'edit_own_content', 'delete_own_content', 'moderate_basic'
      ]
    },
    moderator: {
      level: 3,
      permissions: [
        'read', 'create_question', 'create_answer', 'vote', 'bookmark',
        'edit_own_content', 'delete_own_content', 'moderate_basic',
        'edit_any_content', 'delete_any_content', 'moderate_advanced',
        'manage_tags', 'close_questions'
      ]
    },
    admin: {
      level: 4,
      permissions: [
        'read', 'create_question', 'create_answer', 'vote', 'bookmark',
        'edit_own_content', 'delete_own_content', 'moderate_basic',
        'edit_any_content', 'delete_any_content', 'moderate_advanced',
        'manage_tags', 'close_questions', 'manage_users', 'manage_roles',
        'view_analytics', 'system_admin'
      ]
    }
  },
  SPECIAL_PERMISSIONS: {
    'create_question': { reputation_required: 0 },
    'create_answer': { reputation_required: 0 },
    'vote': { reputation_required: 15 },
    'edit_own_content': { reputation_required: 50 },
    'delete_own_content': { reputation_required: 100 },
    'moderate_basic': { reputation_required: 500 },
    'moderate_advanced': { reputation_required: 1000 }
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
        return await handleGetPermissions(req, res);
      case 'POST':
        return await handleGrantPermission(req, res);
      case 'PUT':
        return await handleUpdateUserRole(req, res);
      case 'DELETE':
        return await handleRevokePermission(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Permissions API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取用户权限
async function handleGetPermissions(req, res) {
  try {
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const { userId } = req.query;
    const targetUserId = userId || authResult.user.id;

    // 检查权限：用户可以查看自己的权限，管理员可以查看任何用户的权限
    const isAdmin = await requirePermission(authResult.user, 'manage_users');
    const isOwner = authResult.user.id === targetUserId;

    if (!isAdmin.success && !isOwner) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, username, role, reputation, status')
      .eq('id', targetUserId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 获取角色权限
    const rolePermissions = PERMISSION_CONFIG.ROLES[user.role] || { level: 0, permissions: [] };

    // 获取特殊权限
    const { data: specialPermissions, error: permError } = await supabase
      .from('user_permissions')
      .select('permission, granted_by, granted_at, expires_at')
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    if (permError) {
      console.error('Error fetching special permissions:', permError);
      return res.status(500).json({ error: 'Failed to fetch permissions' });
    }

    // 计算有效权限
    const effectivePermissions = calculateEffectivePermissions(user, rolePermissions, specialPermissions || []);

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        reputation: user.reputation,
        status: user.status
      },
      permissions: {
        role_permissions: rolePermissions.permissions,
        special_permissions: specialPermissions || [],
        effective_permissions: effectivePermissions,
        role_level: rolePermissions.level
      }
    });
  } catch (error) {
    console.error('Error in handleGetPermissions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 授予特殊权限
async function handleGrantPermission(req, res) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const permissionResult = await requirePermission(authResult.user, 'manage_roles');
    if (!permissionResult.success) {
      return res.status(403).json({ error: permissionResult.error });
    }

    const { userId, permission, expires_at, reason } = req.body;

    if (!userId || !permission) {
      return res.status(400).json({ error: 'User ID and permission are required' });
    }

    // 验证权限是否存在
    const allPermissions = Object.values(PERMISSION_CONFIG.ROLES)
      .flatMap(role => role.permissions)
      .concat(Object.keys(PERMISSION_CONFIG.SPECIAL_PERMISSIONS));

    if (!allPermissions.includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission' });
    }

    // 检查用户是否存在
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, username, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 检查权限是否已存在
    const { data: existingPermission } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('permission', permission)
      .eq('is_active', true)
      .single();

    if (existingPermission) {
      return res.status(409).json({ error: 'Permission already granted' });
    }

    // 授予权限
    const { data: newPermission, error } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        permission,
        granted_by: authResult.user.id,
        granted_at: new Date().toISOString(),
        expires_at: expires_at || null,
        reason: reason || null,
        is_active: true
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error granting permission:', error);
      return res.status(500).json({ error: 'Failed to grant permission' });
    }

    // 记录安全事件
    await logSecurityEvent(userId, 'permission_granted', 'info', req.ip, {
      permission,
      granted_by: authResult.user.id,
      reason
    });

    return res.status(201).json({
      message: 'Permission granted successfully',
      permission: newPermission
    });
  } catch (error) {
    console.error('Error in handleGrantPermission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 更新用户角色
async function handleUpdateUserRole(req, res) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const permissionResult = await requirePermission(authResult.user, 'manage_roles');
    if (!permissionResult.success) {
      return res.status(403).json({ error: permissionResult.error });
    }

    const { userId, newRole, reason } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({ error: 'User ID and new role are required' });
    }

    // 验证角色是否有效
    if (!PERMISSION_CONFIG.ROLES[newRole]) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // 获取当前用户信息
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, username, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 防止降级自己的权限
    if (authResult.user.id === userId && 
        PERMISSION_CONFIG.ROLES[newRole].level < PERMISSION_CONFIG.ROLES[authResult.user.role].level) {
      return res.status(400).json({ error: 'Cannot downgrade your own role' });
    }

    const oldRole = user.role;

    // 更新用户角色
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, role')
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    // 记录角色变更历史
    await supabase
      .from('user_role_history')
      .insert({
        user_id: userId,
        old_role: oldRole,
        new_role: newRole,
        changed_by: authResult.user.id,
        changed_at: new Date().toISOString(),
        reason
      });

    // 记录安全事件
    await logSecurityEvent(userId, 'role_changed', 'info', req.ip, {
      old_role: oldRole,
      new_role: newRole,
      changed_by: authResult.user.id,
      reason
    });

    return res.status(200).json({
      message: 'User role updated successfully',
      user: updatedUser,
      role_change: {
        old_role: oldRole,
        new_role: newRole
      }
    });
  } catch (error) {
    console.error('Error in handleUpdateUserRole:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 撤销特殊权限
async function handleRevokePermission(req, res) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const permissionResult = await requirePermission(authResult.user, 'manage_roles');
    if (!permissionResult.success) {
      return res.status(403).json({ error: permissionResult.error });
    }

    const { userId, permission, reason } = req.body;

    if (!userId || !permission) {
      return res.status(400).json({ error: 'User ID and permission are required' });
    }

    // 撤销权限（软删除）
    const { data: revokedPermission, error } = await supabase
      .from('user_permissions')
      .update({
        is_active: false,
        revoked_by: authResult.user.id,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason
      })
      .eq('user_id', userId)
      .eq('permission', permission)
      .eq('is_active', true)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Permission not found or already revoked' });
      }
      console.error('Error revoking permission:', error);
      return res.status(500).json({ error: 'Failed to revoke permission' });
    }

    // 记录安全事件
    await logSecurityEvent(userId, 'permission_revoked', 'info', req.ip, {
      permission,
      revoked_by: authResult.user.id,
      reason
    });

    return res.status(200).json({
      message: 'Permission revoked successfully',
      permission: revokedPermission
    });
  } catch (error) {
    console.error('Error in handleRevokePermission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 计算有效权限
function calculateEffectivePermissions(user, rolePermissions, specialPermissions) {
  const permissions = new Set(rolePermissions.permissions);

  // 添加有效的特殊权限
  const now = new Date();
  specialPermissions.forEach(perm => {
    if (!perm.expires_at || new Date(perm.expires_at) > now) {
      permissions.add(perm.permission);
    }
  });

  // 检查声誉要求
  const effectivePermissions = Array.from(permissions).filter(permission => {
    const reputationReq = PERMISSION_CONFIG.SPECIAL_PERMISSIONS[permission];
    if (reputationReq && user.reputation < reputationReq.reputation_required) {
      return false;
    }
    return true;
  });

  return effectivePermissions;
}

// 记录安全事件
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