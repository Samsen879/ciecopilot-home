const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireOwnership } = require('../middleware/auth');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 个人资料配置
const PROFILE_CONFIG = {
  MAX_BIO_LENGTH: 500,
  MAX_LOCATION_LENGTH: 100,
  MAX_WEBSITE_LENGTH: 200,
  ALLOWED_AVATAR_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  PASSWORD_MIN_LENGTH: 8
};

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 验证请求方法
  if (!['GET', 'PUT'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 根据请求方法路由
    switch (req.method) {
      case 'GET':
        return await handleGetProfile(req, res);
      case 'PUT':
        return await handleUpdateProfile(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取用户个人资料
async function handleGetProfile(req, res) {
  try {
    const { userId } = req.query;
    
    // 如果没有指定用户ID，需要认证获取当前用户
    if (!userId) {
      const authResult = await authenticateToken(req);
      if (!authResult.success) {
        return res.status(401).json({ error: authResult.error });
      }
      return await getUserProfile(authResult.user.id, res, true);
    }
    
    // 获取指定用户的公开资料
    return await getUserProfile(userId, res, false);
  } catch (error) {
    console.error('Error in handleGetProfile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 更新用户个人资料
async function handleUpdateProfile(req, res) {
  try {
    // 验证用户认证
    const authResult = await authenticateToken(req);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error });
    }

    const { userId } = req.query;
    const targetUserId = userId || authResult.user.id;

    // 检查权限：用户只能更新自己的资料
    const ownershipResult = await requireOwnership(authResult.user, targetUserId);
    if (!ownershipResult.success) {
      return res.status(403).json({ error: ownershipResult.error });
    }

    const {
      username,
      full_name,
      bio,
      location,
      website,
      avatar_url,
      preferences,
      current_password,
      new_password
    } = req.body;

    // 验证数据
    const validationResult = validateProfileData({
      username,
      full_name,
      bio,
      location,
      website,
      new_password
    });

    if (!validationResult.valid) {
      return res.status(400).json({ error: validationResult.error });
    }

    // 如果要更新密码，验证当前密码
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      const passwordValid = await verifyCurrentPassword(targetUserId, current_password);
      if (!passwordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // 检查用户名是否已被使用
    if (username) {
      const usernameExists = await checkUsernameExists(username, targetUserId);
      if (usernameExists) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }

    // 构建更新数据
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (username !== undefined) updateData.username = username;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (preferences !== undefined) updateData.preferences = preferences;

    // 如果要更新密码
    if (new_password) {
      const hashedPassword = await bcrypt.hash(new_password, 12);
      updateData.password_hash = hashedPassword;
      updateData.password_updated_at = new Date().toISOString();
      
      // 记录密码历史
      await addPasswordHistory(targetUserId, hashedPassword);
    }

    // 更新用户资料
    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', targetUserId)
      .select(`
        id,
        email,
        username,
        full_name,
        bio,
        location,
        website,
        avatar_url,
        role,
        reputation,
        preferences,
        email_verified,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // 记录安全事件
    if (new_password) {
      await logSecurityEvent(targetUserId, 'password_changed', 'info', req.ip, {
        changed_by_user: true
      });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error in handleUpdateProfile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 获取用户资料的辅助函数
async function getUserProfile(userId, res, includePrivate = false) {
  try {
    let selectFields = `
      id,
      username,
      full_name,
      bio,
      location,
      website,
      avatar_url,
      role,
      reputation,
      created_at
    `;

    // 如果是私有查看（用户查看自己的资料），包含更多字段
    if (includePrivate) {
      selectFields = `
        id,
        email,
        username,
        full_name,
        bio,
        location,
        website,
        avatar_url,
        role,
        reputation,
        preferences,
        email_verified,
        last_login_at,
        created_at,
        updated_at
      `;
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(selectFields)
      .eq('id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    // 获取用户统计信息
    const stats = await getUserStats(userId);

    return res.status(200).json({
      profile: {
        ...profile,
        stats
      }
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 验证个人资料数据
function validateProfileData(data) {
  const { username, full_name, bio, location, website, new_password } = data;

  // 验证用户名
  if (username !== undefined) {
    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return { valid: false, error: 'Username must be between 3 and 30 characters' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }
  }

  // 验证全名
  if (full_name !== undefined && typeof full_name === 'string' && full_name.length > 100) {
    return { valid: false, error: 'Full name must be less than 100 characters' };
  }

  // 验证简介
  if (bio !== undefined && typeof bio === 'string' && bio.length > PROFILE_CONFIG.MAX_BIO_LENGTH) {
    return { valid: false, error: `Bio must be less than ${PROFILE_CONFIG.MAX_BIO_LENGTH} characters` };
  }

  // 验证位置
  if (location !== undefined && typeof location === 'string' && location.length > PROFILE_CONFIG.MAX_LOCATION_LENGTH) {
    return { valid: false, error: `Location must be less than ${PROFILE_CONFIG.MAX_LOCATION_LENGTH} characters` };
  }

  // 验证网站
  if (website !== undefined && typeof website === 'string') {
    if (website.length > PROFILE_CONFIG.MAX_WEBSITE_LENGTH) {
      return { valid: false, error: `Website URL must be less than ${PROFILE_CONFIG.MAX_WEBSITE_LENGTH} characters` };
    }
    if (website && !/^https?:\/\/.+/.test(website)) {
      return { valid: false, error: 'Website must be a valid URL starting with http:// or https://' };
    }
  }

  // 验证新密码
  if (new_password !== undefined) {
    if (typeof new_password !== 'string' || new_password.length < PROFILE_CONFIG.PASSWORD_MIN_LENGTH) {
      return { valid: false, error: `Password must be at least ${PROFILE_CONFIG.PASSWORD_MIN_LENGTH} characters long` };
    }
  }

  return { valid: true };
}

// 验证当前密码
async function verifyCurrentPassword(userId, currentPassword) {
  try {
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return false;
    }

    return await bcrypt.compare(currentPassword, user.password_hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

// 检查用户名是否已存在
async function checkUsernameExists(username, excludeUserId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .neq('id', excludeUserId)
      .single();

    return !error && data;
  } catch (error) {
    return false;
  }
}

// 获取用户统计信息
async function getUserStats(userId) {
  try {
    // 获取社区统计
    const [questionsResult, answersResult, interactionsResult] = await Promise.all([
      supabase
        .from('community_questions')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId),
      supabase
        .from('community_answers')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId),
      supabase
        .from('community_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('interaction_type', 'upvote')
    ]);

    return {
      questions_count: questionsResult.count || 0,
      answers_count: answersResult.count || 0,
      upvotes_given: interactionsResult.count || 0
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      questions_count: 0,
      answers_count: 0,
      upvotes_given: 0
    };
  }
}

// 添加密码历史记录
async function addPasswordHistory(userId, passwordHash) {
  try {
    await supabase
      .from('user_password_history')
      .insert({
        user_id: userId,
        password_hash: passwordHash,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error adding password history:', error);
  }
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