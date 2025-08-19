const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { generateToken, verifyToken, USER_ROLES } = require('../middleware/auth');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 认证配置
const AUTH_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  TOKEN_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15分钟
  EMAIL_VERIFICATION_EXPIRES: 24 * 60 * 60 * 1000, // 24小时
  PASSWORD_RESET_EXPIRES: 60 * 60 * 1000 // 1小时
};

/**
 * 设置CORS头
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * 验证请求方法
 */
function validateMethod(req, res, allowedMethods) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  
  if (!allowedMethods.includes(req.method)) {
    setCorsHeaders(res);
    return res.status(405).json({
      error: 'Method not allowed',
      message: '不支持的请求方法'
    });
  }
  
  setCorsHeaders(res);
  return true;
}

/**
 * 验证邮箱格式
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码强度
 */
function validatePassword(password) {
  if (!password || password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `密码长度至少${AUTH_CONFIG.PASSWORD_MIN_LENGTH}位` };
  }
  
  if (password.length > AUTH_CONFIG.PASSWORD_MAX_LENGTH) {
    return { valid: false, message: `密码长度不能超过${AUTH_CONFIG.PASSWORD_MAX_LENGTH}位` };
  }
  
  // 检查密码复杂度：至少包含字母和数字
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: '密码必须包含字母和数字' };
  }
  
  return { valid: true };
}

/**
 * 生成随机验证码
 */
function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * 检查用户登录尝试次数
 */
async function checkLoginAttempts(email) {
  const { data: attempts, error } = await supabase
    .from('user_login_attempts')
    .select('*')
    .eq('email', email)
    .gte('created_at', new Date(Date.now() - AUTH_CONFIG.LOCKOUT_DURATION).toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error checking login attempts:', error);
    return { locked: false, attempts: 0 };
  }
  
  const recentAttempts = attempts?.length || 0;
  const locked = recentAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS;
  
  return { locked, attempts: recentAttempts };
}

/**
 * 记录登录尝试
 */
async function recordLoginAttempt(email, success, ip) {
  try {
    await supabase
      .from('user_login_attempts')
      .insert({
        email,
        success,
        ip_address: ip,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error recording login attempt:', error);
  }
}

/**
 * 用户注册
 */
async function registerUser(req, res) {
  try {
    const { email, password, name, role = 'student' } = req.body;
    
    // 验证输入
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '缺少必填字段'
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: '邮箱格式无效'
      });
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordValidation.message
      });
    }
    
    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists',
        message: '邮箱已被注册'
      });
    }
    
    // 加密密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 生成验证码
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + AUTH_CONFIG.EMAIL_VERIFICATION_EXPIRES);
    
    // 创建用户
    const { data: user, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        email,
        password_hash: hashedPassword,
        name,
        role: role.toLowerCase(),
        status: 'pending_verification',
        email_verification_code: verificationCode,
        email_verification_expires: verificationExpires.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({
        error: 'Registration failed',
        message: '注册失败，请稍后重试'
      });
    }
    
    // 创建用户社区档案
    await supabase
      .from('user_community_profiles')
      .insert({
        user_id: user.id,
        reputation: 0,
        questions_count: 0,
        answers_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    // 创建用户学习档案
    await supabase
      .from('user_learning_profiles')
      .insert({
        user_id: user.id,
        learning_style: 'balanced',
        difficulty_preference: 'medium',
        engagement_score: 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    // TODO: 发送验证邮件
    console.log(`Verification code for ${email}: ${verificationCode}`);
    
    res.status(201).json({
      message: '注册成功，请检查邮箱验证链接',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}

/**
 * 用户登录
 */
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // 验证输入
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: '缺少登录凭据'
      });
    }
    
    // 检查登录尝试次数
    const { locked, attempts } = await checkLoginAttempts(email);
    if (locked) {
      await recordLoginAttempt(email, false, clientIP);
      return res.status(429).json({
        error: 'Account locked',
        message: `账户已锁定，请${AUTH_CONFIG.LOCKOUT_DURATION / 60000}分钟后重试`,
        lockoutMinutes: AUTH_CONFIG.LOCKOUT_DURATION / 60000
      });
    }
    
    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      await recordLoginAttempt(email, false, clientIP);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '邮箱或密码错误'
      });
    }
    
    // 验证密码
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      await recordLoginAttempt(email, false, clientIP);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '邮箱或密码错误'
      });
    }
    
    // 检查账户状态
    if (user.status === 'suspended') {
      await recordLoginAttempt(email, false, clientIP);
      return res.status(403).json({
        error: 'Account suspended',
        message: '账户已被暂停'
      });
    }
    
    if (user.status === 'pending_verification') {
      await recordLoginAttempt(email, false, clientIP);
      return res.status(403).json({
        error: 'Email not verified',
        message: '邮箱尚未验证，请检查验证邮件'
      });
    }
    
    // 生成tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(tokenPayload, AUTH_CONFIG.TOKEN_EXPIRES_IN);
    const refreshToken = generateToken(
      { ...tokenPayload, type: 'refresh' },
      AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN
    );
    
    // 更新最后登录时间
    await supabase
      .from('user_profiles')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    // 记录成功登录
    await recordLoginAttempt(email, true, clientIP);
    
    res.status(200).json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: AUTH_CONFIG.TOKEN_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}

/**
 * 刷新访问令牌
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: '缺少刷新令牌'
      });
    }
    
    // 验证刷新令牌
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: '无效的刷新令牌'
      });
    }
    
    // 检查用户状态
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('id, email, role, status')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user || user.status !== 'active') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: '无效的刷新令牌'
      });
    }
    
    // 生成新的访问令牌
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const newAccessToken = generateToken(tokenPayload, AUTH_CONFIG.TOKEN_EXPIRES_IN);
    
    res.status(200).json({
      accessToken: newAccessToken,
      expiresIn: AUTH_CONFIG.TOKEN_EXPIRES_IN
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: '无效的刷新令牌'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}

/**
 * 邮箱验证
 */
async function verifyEmail(req, res) {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        error: 'Verification code required',
        message: '缺少验证码'
      });
    }
    
    // 查找用户
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email_verification_code', code)
      .single();
    
    if (error || !user) {
      return res.status(400).json({
        error: 'Invalid verification code',
        message: '无效的验证码'
      });
    }
    
    // 检查验证码是否过期
    if (new Date() > new Date(user.email_verification_expires)) {
      return res.status(400).json({
        error: 'Verification code expired',
        message: '验证码已过期'
      });
    }
    
    // 激活用户
    await supabase
      .from('user_profiles')
      .update({
        status: 'active',
        email_verified: true,
        email_verification_code: null,
        email_verification_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    res.status(200).json({
      message: '邮箱验证成功，账户已激活'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}

/**
 * 请求密码重置
 */
async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;
    
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        error: 'Valid email required',
        message: '请提供有效的邮箱地址'
      });
    }
    
    // 查找用户
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('id, email, status')
      .eq('email', email)
      .single();
    
    // 无论用户是否存在都返回成功，避免邮箱枚举攻击
    if (error || !user) {
      return res.status(200).json({
        message: '如果邮箱存在，重置链接已发送'
      });
    }
    
    if (user.status !== 'active') {
      return res.status(200).json({
        message: '如果邮箱存在，重置链接已发送'
      });
    }
    
    // 生成重置令牌
    const resetToken = generateVerificationCode();
    const resetExpires = new Date(Date.now() + AUTH_CONFIG.PASSWORD_RESET_EXPIRES);
    
    // 保存重置令牌
    await supabase
      .from('user_profiles')
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    // TODO: 发送重置邮件
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.status(200).json({
      message: '如果邮箱存在，重置链接已发送'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}

/**
 * 重置密码
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password required',
        message: '缺少重置令牌或新密码'
      });
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordValidation.message
      });
    }
    
    // 查找用户
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('password_reset_token', token)
      .single();
    
    if (error || !user) {
      return res.status(400).json({
        error: 'Invalid reset token',
        message: '无效的重置令牌'
      });
    }
    
    // 检查令牌是否过期
    if (new Date() > new Date(user.password_reset_expires)) {
      return res.status(400).json({
        error: 'Reset token expired',
        message: '重置令牌已过期'
      });
    }
    
    // 加密新密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await supabase
      .from('user_profiles')
      .update({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    res.status(200).json({
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}

/**
 * 主处理函数
 */
export default async function handler(req, res) {
  const methodCheck = validateMethod(req, res, ['GET', 'POST']);
  if (methodCheck !== true) return;
  
  try {
    const { action } = req.query;
    
    switch (action) {
      case 'register':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await registerUser(req, res);
      
      case 'login':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await loginUser(req, res);
      
      case 'refresh':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await refreshToken(req, res);
      
      case 'verify-email':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await verifyEmail(req, res);
      
      case 'request-reset':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await requestPasswordReset(req, res);
      
      case 'reset-password':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        return await resetPassword(req, res);
      
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: '无效的操作',
          availableActions: ['register', 'login', 'refresh', 'verify-email', 'request-reset', 'reset-password']
        });
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}