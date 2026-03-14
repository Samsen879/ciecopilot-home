import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { applyApiCors } from '../lib/http/cors.js';
import { getServiceClient } from '../lib/supabase/client.js';
import {
  authenticateRequest,
  generateToken,
  verifyToken,
  hashToken,
  persistRefreshSession,
  recordSecurityEvent,
  rotateRefreshSession,
} from '../middleware/auth.js';
import { getBaseUrl, sendPasswordResetEmail, sendVerificationEmail } from './lib/auth-mailer.js';

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  _supabase = getServiceClient();
  return _supabase;
}

const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  },
);

// 认证配置
const AUTH_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  TOKEN_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  REFRESH_TOKEN_EXPIRES_MS: 7 * 24 * 60 * 60 * 1000,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15分钟
  EMAIL_VERIFICATION_EXPIRES: 24 * 60 * 60 * 1000, // 24小时
  PASSWORD_RESET_EXPIRES: 60 * 60 * 1000 // 1小时
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getRequestId(req) {
  return req?.request_id || null;
}

function getClientIp(req) {
  return req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || null;
}

function getUserAgent(req) {
  return req?.headers?.['user-agent'] || req?.headers?.['User-Agent'] || null;
}

function sendError(req, res, status, code, error, message, extras = {}) {
  return res.status(status).json({
    success: false,
    code,
    error,
    message,
    request_id: getRequestId(req),
    ...extras,
  });
}

function sendSuccess(req, res, status, code, message, payload = {}) {
  return res.status(status).json({
    success: true,
    code,
    message,
    request_id: getRequestId(req),
    ...payload,
  });
}

function createOpaqueToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function buildPublicBaseUrl(req) {
  return getBaseUrl(req?.headers?.origin || null);
}

async function findUserByTokenField(field, rawToken) {
  const candidates = [hashToken(rawToken), rawToken];
  for (const value of candidates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq(field, value)
      .single();
    if (!error && data) {
      return data;
    }
  }
  return null;
}

/**
 * 验证请求方法
 */
function validateMethod(req, res, allowedMethods) {
  if (!applyApiCors(req, res, allowedMethods)) {
    return false;
  }

  if (!allowedMethods.includes(req.method)) {
    sendError(req, res, 405, 'AUTH_METHOD_NOT_ALLOWED', 'Method not allowed', '不支持的请求方法');
    return false;
  }

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
 * 生成安全随机令牌
 */
function generateVerificationCode() {
  return createOpaqueToken();
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
    const { password, name, role = 'student' } = req.body;
    const email = normalizeEmail(req.body?.email);
    
    // 验证输入
    if (!email || !password || !name) {
      return sendError(req, res, 400, 'AUTH_VALIDATION_ERROR', 'Missing required fields', '缺少必填字段');
    }
    
    if (!validateEmail(email)) {
      return sendError(req, res, 400, 'AUTH_INVALID_EMAIL', 'Invalid email', '邮箱格式无效');
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return sendError(req, res, 400, 'AUTH_INVALID_PASSWORD', 'Invalid password', passwordValidation.message);
    }
    
    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return sendError(req, res, 409, 'AUTH_EMAIL_EXISTS', 'Email already exists', '邮箱已被注册');
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
        email_verification_code: hashToken(verificationCode),
        email_verification_expires: verificationExpires.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
      return sendError(req, res, 500, 'AUTH_REGISTRATION_FAILED', 'Registration failed', '注册失败，请稍后重试');
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
    
    const delivery = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationToken: verificationCode,
      baseUrl: buildPublicBaseUrl(req),
    });

    await recordSecurityEvent(user.id, 'register_pending_verification', {
      ip_address: getClientIp(req),
      user_agent: getUserAgent(req),
      delivery_mode: delivery.mode,
    });
    
    return sendSuccess(req, res, 201, 'AUTH_REGISTERED', '注册成功，请检查邮箱验证链接', {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      },
      delivery: {
        mode: delivery.mode,
        degraded: Boolean(delivery.degraded),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return sendError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Internal server error', '服务器内部错误');
  }
}

/**
 * 用户登录
 */
async function loginUser(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body;
    const clientIP = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    // 验证输入
    if (!email || !password) {
      return sendError(req, res, 400, 'AUTH_MISSING_CREDENTIALS', 'Missing credentials', '缺少登录凭据');
    }
    
    // 检查登录尝试次数
    const { locked, attempts } = await checkLoginAttempts(email);
    if (locked) {
      await recordLoginAttempt(email, false, clientIP);
      await recordSecurityEvent(null, 'login_locked', {
        ip_address: clientIP,
        user_agent: userAgent,
        email,
        attempts,
      });
      return sendError(req, res, 429, 'AUTH_ACCOUNT_LOCKED', 'Account locked', `账户已锁定，请${AUTH_CONFIG.LOCKOUT_DURATION / 60000}分钟后重试`, {
        lockoutMinutes: AUTH_CONFIG.LOCKOUT_DURATION / 60000,
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
      await recordSecurityEvent(null, 'login_failed', {
        ip_address: clientIP,
        user_agent: userAgent,
        email,
        reason: 'user_not_found',
      });
      return sendError(req, res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials', '邮箱或密码错误');
    }
    
    // 验证密码
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      await recordLoginAttempt(email, false, clientIP);
      await recordSecurityEvent(user.id, 'login_failed', {
        ip_address: clientIP,
        user_agent: userAgent,
        reason: 'password_mismatch',
      });
      return sendError(req, res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials', '邮箱或密码错误');
    }
    
    // 检查账户状态
    if (user.status === 'suspended') {
      await recordLoginAttempt(email, false, clientIP);
      await recordSecurityEvent(user.id, 'login_blocked', {
        ip_address: clientIP,
        user_agent: userAgent,
        reason: 'account_suspended',
      });
      return sendError(req, res, 403, 'AUTH_ACCOUNT_SUSPENDED', 'Account suspended', '账户已被暂停');
    }
    
    if (user.status === 'pending_verification') {
      await recordLoginAttempt(email, false, clientIP);
      await recordSecurityEvent(user.id, 'login_blocked', {
        ip_address: clientIP,
        user_agent: userAgent,
        reason: 'email_not_verified',
      });
      return sendError(req, res, 403, 'AUTH_EMAIL_NOT_VERIFIED', 'Email not verified', '邮箱尚未验证，请检查验证邮件');
    }
    
    // 生成tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(tokenPayload, AUTH_CONFIG.TOKEN_EXPIRES_IN);
    const refreshToken = generateToken(
      { ...tokenPayload, type: 'refresh', jti: createOpaqueToken() },
      AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN
    );
    const refreshExpiresAt = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_MS).toISOString();

    const sessionPersistence = await persistRefreshSession({
      userId: user.id,
      refreshToken,
      expiresAt: refreshExpiresAt,
      ipAddress: clientIP,
      userAgent,
    });

    if (sessionPersistence.checked && !sessionPersistence.persisted) {
      return sendError(req, res, 500, 'AUTH_SESSION_PERSIST_FAILED', 'Session persistence failed', '会话初始化失败，请稍后重试');
    }
    
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
    await recordSecurityEvent(user.id, 'login_success', {
      ip_address: clientIP,
      user_agent: userAgent,
      session_persisted: Boolean(sessionPersistence.persisted),
    });
    
    return sendSuccess(req, res, 200, 'AUTH_LOGIN_SUCCESS', '登录成功', {
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
        expiresIn: AUTH_CONFIG.TOKEN_EXPIRES_IN,
        refreshExpiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Internal server error', '服务器内部错误');
  }
}

/**
 * 刷新访问令牌
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    const clientIP = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    if (!refreshToken) {
      return sendError(req, res, 400, 'AUTH_REFRESH_TOKEN_REQUIRED', 'Refresh token required', '缺少刷新令牌');
    }
    
    // 验证刷新令牌
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return sendError(req, res, 401, 'AUTH_INVALID_REFRESH_TOKEN', 'Invalid refresh token', '无效的刷新令牌');
    }
    
    // 检查用户状态
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('id, email, role, status')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user || user.status !== 'active') {
      return sendError(req, res, 401, 'AUTH_INVALID_REFRESH_TOKEN', 'Invalid refresh token', '无效的刷新令牌');
    }
    
    // 生成新的访问令牌
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const newAccessToken = generateToken(tokenPayload, AUTH_CONFIG.TOKEN_EXPIRES_IN);
    const newRefreshToken = generateToken(
      { ...tokenPayload, type: 'refresh', jti: createOpaqueToken() },
      AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN
    );
    const refreshExpiresAt = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_MS).toISOString();

    const sessionRotation = await rotateRefreshSession({
      userId: user.id,
      currentRefreshToken: refreshToken,
      nextRefreshToken: newRefreshToken,
      expiresAt: refreshExpiresAt,
      ipAddress: clientIP,
      userAgent,
    });

    if (sessionRotation.checked && !sessionRotation.valid) {
      return sendError(req, res, 401, 'AUTH_INVALID_REFRESH_TOKEN', 'Invalid refresh token', '无效的刷新令牌');
    }

    await recordSecurityEvent(user.id, 'refresh_success', {
      ip_address: clientIP,
      user_agent: userAgent,
      session_checked: sessionRotation.checked,
    });
    
    return sendSuccess(req, res, 200, 'AUTH_REFRESH_SUCCESS', '访问令牌刷新成功', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: AUTH_CONFIG.TOKEN_EXPIRES_IN,
      refreshExpiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return sendError(req, res, 401, 'AUTH_INVALID_REFRESH_TOKEN', 'Invalid refresh token', '无效的刷新令牌');
    }
    
    return sendError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Internal server error', '服务器内部错误');
  }
}

async function verifyAccessToken(req, res) {
  const authResult = await authenticateRequest(req, { optional: false });
  if (!authResult.success) {
    return sendError(req, res, authResult.status, authResult.code, authResult.error, authResult.message);
  }

  return sendSuccess(req, res, 200, 'AUTH_TOKEN_VALID', '访问令牌有效', {
    authenticated: true,
    user: {
      id: authResult.user.id,
      email: authResult.user.email,
      role: authResult.user.role,
      status: authResult.user.status,
    },
  });
}

/**
 * 邮箱验证
 */
async function verifyEmail(req, res) {
  try {
    const { code } = req.query;
    
    if (!code) {
      return sendError(req, res, 400, 'AUTH_VERIFICATION_CODE_REQUIRED', 'Verification code required', '缺少验证码');
    }
    
    // 查找用户
    const user = await findUserByTokenField('email_verification_code', code);
    
    if (!user) {
      return sendError(req, res, 400, 'AUTH_INVALID_VERIFICATION_CODE', 'Invalid verification code', '无效的验证码');
    }
    
    // 检查验证码是否过期
    if (new Date() > new Date(user.email_verification_expires)) {
      return sendError(req, res, 400, 'AUTH_VERIFICATION_CODE_EXPIRED', 'Verification code expired', '验证码已过期');
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
    
    await recordSecurityEvent(user.id, 'email_verified', {
      ip_address: getClientIp(req),
      user_agent: getUserAgent(req),
    });

    return sendSuccess(req, res, 200, 'AUTH_EMAIL_VERIFIED', '邮箱验证成功，账户已激活');
  } catch (error) {
    console.error('Email verification error:', error);
    return sendError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Internal server error', '服务器内部错误');
  }
}

/**
 * 请求密码重置
 */
async function requestPasswordReset(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    
    if (!email || !validateEmail(email)) {
      return sendError(req, res, 400, 'AUTH_INVALID_EMAIL', 'Valid email required', '请提供有效的邮箱地址');
    }
    
    // 查找用户
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('id, email, status')
      .eq('email', email)
      .single();
    
    // 无论用户是否存在都返回成功，避免邮箱枚举攻击
    if (error || !user) {
      return sendSuccess(req, res, 200, 'AUTH_PASSWORD_RESET_REQUEST_ACCEPTED', '如果邮箱存在，重置链接已发送');
    }
    
    if (user.status !== 'active') {
      return sendSuccess(req, res, 200, 'AUTH_PASSWORD_RESET_REQUEST_ACCEPTED', '如果邮箱存在，重置链接已发送');
    }
    
    // 生成重置令牌
    const resetToken = generateVerificationCode();
    const resetExpires = new Date(Date.now() + AUTH_CONFIG.PASSWORD_RESET_EXPIRES);
    
    // 保存重置令牌
    await supabase
      .from('user_profiles')
      .update({
        password_reset_token: hashToken(resetToken),
        password_reset_expires: resetExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    const delivery = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken,
      baseUrl: buildPublicBaseUrl(req),
    });
    await recordSecurityEvent(user.id, 'password_reset_requested', {
      ip_address: getClientIp(req),
      user_agent: getUserAgent(req),
      delivery_mode: delivery.mode,
    });

    return sendSuccess(req, res, 200, 'AUTH_PASSWORD_RESET_REQUEST_ACCEPTED', '如果邮箱存在，重置链接已发送');
  } catch (error) {
    console.error('Password reset request error:', error);
    return sendError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Internal server error', '服务器内部错误');
  }
}

/**
 * 重置密码
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return sendError(req, res, 400, 'AUTH_RESET_TOKEN_REQUIRED', 'Token and new password required', '缺少重置令牌或新密码');
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return sendError(req, res, 400, 'AUTH_INVALID_PASSWORD', 'Invalid password', passwordValidation.message);
    }
    
    // 查找用户
    const user = await findUserByTokenField('password_reset_token', token);
    
    if (!user) {
      return sendError(req, res, 400, 'AUTH_INVALID_RESET_TOKEN', 'Invalid reset token', '无效的重置令牌');
    }
    
    // 检查令牌是否过期
    if (new Date() > new Date(user.password_reset_expires)) {
      return sendError(req, res, 400, 'AUTH_RESET_TOKEN_EXPIRED', 'Reset token expired', '重置令牌已过期');
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
    
    await recordSecurityEvent(user.id, 'password_reset_completed', {
      ip_address: getClientIp(req),
      user_agent: getUserAgent(req),
    });

    return sendSuccess(req, res, 200, 'AUTH_PASSWORD_RESET_COMPLETED', '密码重置成功');
  } catch (error) {
    console.error('Password reset error:', error);
    return sendError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Internal server error', '服务器内部错误');
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
          return sendError(req, res, 405, 'AUTH_METHOD_NOT_ALLOWED', 'Method not allowed', '不支持的请求方法');
        }
        return await refreshToken(req, res);

      case 'verify':
        if (req.method !== 'GET') {
          return sendError(req, res, 405, 'AUTH_METHOD_NOT_ALLOWED', 'Method not allowed', '不支持的请求方法');
        }
        return await verifyAccessToken(req, res);
      
      case 'verify-email':
        if (req.method !== 'GET') {
          return sendError(req, res, 405, 'AUTH_METHOD_NOT_ALLOWED', 'Method not allowed', '不支持的请求方法');
        }
        return await verifyEmail(req, res);
      
      case 'request-reset':
        if (req.method !== 'POST') {
          return sendError(req, res, 405, 'AUTH_METHOD_NOT_ALLOWED', 'Method not allowed', '不支持的请求方法');
        }
        return await requestPasswordReset(req, res);
      
      case 'reset-password':
        if (req.method !== 'POST') {
          return sendError(req, res, 405, 'AUTH_METHOD_NOT_ALLOWED', 'Method not allowed', '不支持的请求方法');
        }
        return await resetPassword(req, res);
      
      default:
        return sendError(req, res, 400, 'AUTH_INVALID_ACTION', 'Invalid action', '无效的操作', {
          availableActions: ['register', 'login', 'refresh', 'verify', 'verify-email', 'request-reset', 'reset-password']
        });
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    return sendError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Internal server error', '服务器内部错误');
  }
}
