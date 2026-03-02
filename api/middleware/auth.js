import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getServiceClient } from '../lib/supabase/client.js';

function getRequiredJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error('Missing required environment variable: JWT_SECRET');
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }
  return secret;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const ENFORCE_SESSIONS = process.env.AUTH_ENFORCE_SESSIONS === 'true';

let supabaseClient = null;
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const error = new Error('Missing Supabase auth configuration: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
    error.code = 'SUPABASE_AUTH_CONFIG_MISSING';
    throw error;
  }
  supabaseClient = getServiceClient();
  return supabaseClient;
}

const ROLE_LEVELS = {
  student: 1,
  teacher: 2,
  moderator: 3,
  admin: 4
};

const USER_ROLES = {
  STUDENT: ROLE_LEVELS.student,
  TEACHER: ROLE_LEVELS.teacher,
  MODERATOR: ROLE_LEVELS.moderator,
  ADMIN: ROLE_LEVELS.admin
};

// Permission -> allowed roles
const PERMISSIONS = {
  // Common
  authenticated: ['student', 'teacher', 'moderator', 'admin'],
  admin: ['admin'],

  // Legacy user management
  manage_users: ['admin'],
  manage_roles: ['admin'],
  view_analytics: ['admin'],
  system_settings: ['admin'],

  // Recommendations
  'recommendations.read': ['student', 'teacher', 'moderator', 'admin'],
  'recommendations.create': ['teacher', 'moderator', 'admin'],
  'recommendations.update': ['teacher', 'moderator', 'admin'],
  'recommendations.delete': ['moderator', 'admin'],

  // Community
  'community.questions.read': ['student', 'teacher', 'moderator', 'admin'],
  'community.questions.create': ['student', 'teacher', 'moderator', 'admin'],
  'community.questions.update': ['teacher', 'moderator', 'admin'],
  'community.questions.delete': ['moderator', 'admin'],
  'community.answers.read': ['student', 'teacher', 'moderator', 'admin'],
  'community.answers.create': ['student', 'teacher', 'moderator', 'admin'],
  'community.answers.update': ['teacher', 'moderator', 'admin'],
  'community.answers.delete': ['moderator', 'admin'],
  'community.interactions.read': ['student', 'teacher', 'moderator', 'admin'],
  'community.interactions.create': ['student', 'teacher', 'moderator', 'admin'],
  'community.interactions.delete': ['moderator', 'admin'],

  // Root middleware compatibility
  read_own_profile: ['student', 'teacher', 'moderator', 'admin'],
  update_own_profile: ['student', 'teacher', 'moderator', 'admin'],
  create_question: ['student', 'teacher', 'moderator', 'admin'],
  create_answer: ['student', 'teacher', 'moderator', 'admin'],
  vote_content: ['student', 'teacher', 'moderator', 'admin'],
  bookmark_content: ['student', 'teacher', 'moderator', 'admin'],
  moderate_own_content: ['teacher', 'moderator', 'admin'],
  create_exercise: ['teacher', 'moderator', 'admin'],
  grade_submissions: ['teacher', 'moderator', 'admin'],
  moderate_community: ['moderator', 'admin'],
  delete_any_content: ['moderator', 'admin'],
  ban_users: ['moderator', 'admin'],
  manage_tags: ['moderator', 'admin'],
  system_admin: ['admin']
};

const PERMISSION_CONFIG = Object.fromEntries(
  Object.entries(PERMISSIONS).map(([permission, allowedRoles]) => [
    permission,
    allowedRoles.map((role) => ROLE_LEVELS[role]).filter((level) => Number.isFinite(level))
  ])
);

const OWNERSHIP_RESOURCES = {
  question: { table: 'community_questions', ownerField: 'author_id' },
  answer: { table: 'community_answers', ownerField: 'author_id' },
  recommendation: { table: 'recommendations', ownerField: 'user_id' },
  feedback: { table: 'recommendation_feedback', ownerField: 'user_id' }
};

function normalizeRole(role) {
  if (!role) {
    return 'student';
  }
  return String(role).toLowerCase();
}

function getRoleLevel(role) {
  return ROLE_LEVELS[normalizeRole(role)] || 0;
}

function isUserLike(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.id !== 'undefined';
}

function parseBearerToken(req) {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isMissingRelationError(error) {
  if (!error) {
    return false;
  }
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return error.code === '42P01' || message.includes('does not exist') || message.includes('relation');
}

function buildFailure(status, error, message, code, extras = {}) {
  return {
    success: false,
    status,
    error,
    message,
    code,
    ...extras
  };
}

function sendFailure(res, failure) {
  if (!res || typeof res.status !== 'function') {
    return failure;
  }
  return res.status(failure.status).json({
    error: failure.error,
    message: failure.message,
    code: failure.code,
    ...(failure.required ? { required: failure.required } : {})
  });
}

function getTokenUserId(decoded) {
  return decoded?.userId || decoded?.sub || decoded?.id || null;
}

async function fetchActiveUserProfile(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, username, role, status, reputation')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.status && data.status !== 'active') {
    return null;
  }

  return data;
}

async function fetchSpecialPermissionRows(userId) {
  const supabase = getSupabaseClient();
  let query = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (query.error && query.error.code === '42703') {
    // Some schemas may not have is_active column.
    query = await supabase.from('user_permissions').select('*').eq('user_id', userId);
  }

  if (query.error) {
    if (!isMissingRelationError(query.error)) {
      console.warn('Failed to load user permissions:', query.error.message || query.error);
    }
    return [];
  }

  return query.data || [];
}

function extractPermissionName(row) {
  return row?.permission || row?.permission_name || row?.name || null;
}

function isPermissionExpired(row) {
  const expiresAt = row?.expires_at || row?.expiresAt || null;
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() <= Date.now();
}

async function getUserPermissions(userId, role) {
  const permissionSet = new Set();
  const normalizedRole = normalizeRole(role);

  for (const [permission, roles] of Object.entries(PERMISSIONS)) {
    if (roles.includes(normalizedRole)) {
      permissionSet.add(permission);
    }
  }

  const specialRows = await fetchSpecialPermissionRows(userId);
  for (const row of specialRows) {
    const name = extractPermissionName(row);
    if (!name) {
      continue;
    }
    if (row.is_active === false) {
      continue;
    }
    if (isPermissionExpired(row)) {
      continue;
    }
    permissionSet.add(name);
  }

  return Array.from(permissionSet);
}

async function validateActiveSession(userId, token) {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('token_hash', hashToken(token))
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return { checked: false, valid: !ENFORCE_SESSIONS, reason: 'session_table_missing' };
      }
      console.warn('Session validation query failed:', error.message || error);
      return { checked: false, valid: !ENFORCE_SESSIONS, reason: 'session_query_error' };
    }

    if (!data) {
      return { checked: true, valid: false, reason: 'session_not_found' };
    }

    return { checked: true, valid: true, sessionId: data.id };
  } catch (error) {
    console.warn('Session validation failed:', error.message || error);
    return { checked: false, valid: !ENFORCE_SESSIONS, reason: 'session_validation_exception' };
  }
}

async function touchSession(sessionId) {
  if (!sessionId) {
    return;
  }
  const supabase = getSupabaseClient();
  try {
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (error) {
    console.warn('Failed to update session activity:', error.message || error);
  }
}

async function recordSecurityEvent(userId, eventType, metadata = {}) {
  const supabase = getSupabaseClient();
  try {
    await supabase
      .from('security_events')
      .insert({
        user_id: userId || null,
        event_type: eventType,
        metadata,
        ip_address: metadata.ip_address || null,
        user_agent: metadata.user_agent || null,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    if (!isMissingRelationError(error)) {
      console.warn('Failed to record security event:', error.message || error);
    }
  }
}

function buildUserContext(user, permissions) {
  const role = normalizeRole(user.role);
  const roleLevel = getRoleLevel(role);
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role,
    status: user.status || 'active',
    reputation: Number(user.reputation || 0),
    roleLevel,
    permissions,
    profile: user
  };
}

async function authenticateRequest(req, { optional = false } = {}) {
  const token = parseBearerToken(req);

  if (!token) {
    if (optional) {
      return { success: true, user: null, anonymous: true };
    }
    return buildFailure(401, 'access_token_required', '需要提供访问令牌', 'AUTH_001');
  }

  try {
    const decoded = jwt.verify(token, getRequiredJwtSecret());
    const userId = getTokenUserId(decoded);

    if (!userId) {
      return buildFailure(401, 'invalid_token_payload', '访问令牌载荷无效', 'AUTH_001');
    }

    const userProfile = await fetchActiveUserProfile(userId);
    if (!userProfile) {
      return buildFailure(401, 'invalid_token', '无效的访问令牌', 'AUTH_002');
    }

    const permissions = await getUserPermissions(userProfile.id, userProfile.role);
    const user = buildUserContext(userProfile, permissions);

    const sessionResult = await validateActiveSession(user.id, token);
    if (!sessionResult.valid) {
      await recordSecurityEvent(user.id, 'invalid_session', {
        reason: sessionResult.reason,
        endpoint: req?.url || req?.path || null,
        method: req?.method || null
      });
      return buildFailure(401, 'session_invalid', '会话已过期或无效', 'AUTH_002');
    }

    if (sessionResult.sessionId) {
      await touchSession(sessionResult.sessionId);
    }

    return {
      success: true,
      user,
      auth: {
        session_checked: sessionResult.checked,
        session_validated: sessionResult.valid,
        session_id: sessionResult.sessionId || null
      }
    };
  } catch (error) {
    if (optional) {
      return { success: true, user: null, anonymous: true };
    }

    if (error.name === 'TokenExpiredError') {
      return buildFailure(401, 'token_expired', '访问令牌已过期', 'AUTH_002');
    }

    if (error.name === 'JsonWebTokenError') {
      return buildFailure(401, 'invalid_token', '无效的访问令牌', 'AUTH_001');
    }

    if (error.code === 'SUPABASE_AUTH_CONFIG_MISSING') {
      return buildFailure(500, 'auth_config_missing', '认证服务配置缺失', 'AUTH_500');
    }
    if (error.code === 'JWT_SECRET_MISSING') {
      return buildFailure(500, 'auth_config_missing', '认证服务配置缺失', 'AUTH_500');
    }

    console.error('Authentication error:', error);
    return buildFailure(500, 'authentication_failed', '身份验证失败', 'AUTH_500');
  }
}

function hasPermission(user, permission) {
  if (!permission || permission === 'authenticated') {
    return true;
  }
  if (!user) {
    return false;
  }

  const normalizedRole = normalizeRole(user.role);
  const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];

  if (permission.startsWith('role:')) {
    const requiredRole = normalizeRole(permission.slice('role:'.length));
    return normalizedRole === requiredRole;
  }

  if (permission === 'admin') {
    return normalizedRole === 'admin';
  }

  if (userPermissions.includes(permission)) {
    return true;
  }

  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(normalizedRole);
}

function checkPermission(user, requiredPermissions, options = {}) {
  if (!user) {
    return buildFailure(401, 'authentication_required', '需要身份验证', 'AUTH_001');
  }

  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  const granted = permissions.some((permission) => hasPermission(user, permission));

  if (!granted) {
    return buildFailure(403, 'insufficient_permissions', '权限不足', 'AUTH_003', {
      required: permissions
    });
  }

  if (
    Number.isFinite(options.minReputation) &&
    Number(user.reputation || 0) < Number(options.minReputation)
  ) {
    return buildFailure(
      403,
      'insufficient_reputation',
      `需要至少 ${options.minReputation} 声誉值`,
      'AUTH_003'
    );
  }

  return { success: true };
}

function checkRole(user, requiredRoles) {
  if (!user) {
    return buildFailure(401, 'authentication_required', '需要身份验证', 'AUTH_001');
  }
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const normalizedRoles = roles.map((role) => normalizeRole(role));
  if (!normalizedRoles.includes(normalizeRole(user.role))) {
    return buildFailure(403, 'insufficient_role', '角色权限不足', 'AUTH_003');
  }
  return { success: true };
}

function checkMinLevel(user, minLevel) {
  if (!user) {
    return buildFailure(401, 'authentication_required', '需要身份验证', 'AUTH_001');
  }
  if (getRoleLevel(user.role) < Number(minLevel)) {
    return buildFailure(403, 'insufficient_level', '权限级别不足', 'AUTH_003');
  }
  return { success: true };
}

async function checkOwnership(user, resourceType, resourceId) {
  if (!user) {
    return buildFailure(401, 'authentication_required', '需要身份验证', 'AUTH_001');
  }
  if (!resourceId) {
    return buildFailure(400, 'resource_id_required', '缺少资源ID', 'AUTH_400');
  }

  if (getRoleLevel(user.role) >= ROLE_LEVELS.moderator) {
    return { success: true };
  }

  const ownershipConfig = OWNERSHIP_RESOURCES[resourceType];
  if (!ownershipConfig) {
    return buildFailure(400, 'invalid_resource_type', '无效的资源类型', 'AUTH_400');
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(ownershipConfig.table)
      .select(ownershipConfig.ownerField)
      .eq('id', resourceId)
      .maybeSingle();

    if (error || !data) {
      return buildFailure(404, 'resource_not_found', '资源不存在', 'AUTH_404');
    }

    if (String(data[ownershipConfig.ownerField]) !== String(user.id)) {
      return buildFailure(403, 'access_denied', '无权访问此资源', 'AUTH_003');
    }

    return { success: true };
  } catch (error) {
    console.error('Ownership check error:', error);
    return buildFailure(500, 'ownership_check_failed', '所有权检查失败', 'AUTH_500');
  }
}

// Supports both styles:
// 1) Express middleware: authenticateToken(req, res, next)
// 2) Direct call: const result = await authenticateToken(req)
async function authenticateToken(req, res, next) {
  if (typeof res === 'undefined' && typeof next === 'undefined') {
    return authenticateRequest(req, { optional: false });
  }

  const authResult = await authenticateRequest(req, { optional: false });
  if (!authResult.success) {
    return sendFailure(res, authResult);
  }

  req.user = authResult.user;
  req.auth = authResult.auth;
  if (typeof next === 'function') {
    return next();
  }
  return authResult;
}

// Supports both styles:
// 1) Express middleware: optionalAuth(req, res, next)
// 2) Direct call: const result = await optionalAuth(req)
async function optionalAuth(req, res, next) {
  if (typeof res === 'undefined' && typeof next === 'undefined') {
    return authenticateRequest(req, { optional: true });
  }

  const authResult = await authenticateRequest(req, { optional: true });
  req.user = authResult.success ? authResult.user : null;
  req.auth = authResult.success ? authResult.auth : null;
  if (typeof next === 'function') {
    return next();
  }
  return authResult;
}

// Supports both styles:
// 1) Middleware factory: requirePermission('manage_roles')
// 2) Direct call: await requirePermission(user, 'manage_roles')
function requirePermission(requiredPermissions, options = {}) {
  if (isUserLike(requiredPermissions)) {
    const user = requiredPermissions;
    const permission = options;
    const callOptions = arguments.length >= 3 ? arguments[2] : {};
    return Promise.resolve(checkPermission(user, permission, callOptions));
  }

  return async (req, res, next) => {
    const permissionResult = checkPermission(req.user, requiredPermissions, options);
    if (!permissionResult.success) {
      if (req.user?.id) {
        await recordSecurityEvent(req.user.id, 'permission_denied', {
          required_permissions: Array.isArray(requiredPermissions)
            ? requiredPermissions
            : [requiredPermissions],
          endpoint: req.path,
          method: req.method
        });
      }
      return sendFailure(res, permissionResult);
    }
    return next();
  };
}

// Supports both styles:
// 1) Middleware factory: requireRole(['moderator', 'admin'])
// 2) Direct call: await requireRole(user, 'admin')
function requireRole(requiredRoles) {
  if (isUserLike(requiredRoles)) {
    const user = requiredRoles;
    const roles = arguments[1];
    return Promise.resolve(checkRole(user, roles));
  }

  return (req, res, next) => {
    const roleResult = checkRole(req.user, requiredRoles);
    if (!roleResult.success) {
      return sendFailure(res, roleResult);
    }
    return next();
  };
}

// Supports both styles:
// 1) Middleware factory: requireMinLevel(3)
// 2) Direct call: await requireMinLevel(user, 3)
function requireMinLevel(minLevel) {
  if (isUserLike(minLevel)) {
    const user = minLevel;
    const level = arguments[1];
    return Promise.resolve(checkMinLevel(user, level));
  }

  return (req, res, next) => {
    const levelResult = checkMinLevel(req.user, minLevel);
    if (!levelResult.success) {
      return sendFailure(res, levelResult);
    }
    return next();
  };
}

// Supports both styles:
// 1) Middleware factory: requireOwnership('question', 'id')
// 2) Direct call: await requireOwnership(user, targetUserId)
function requireOwnership(resourceType, idParam = 'id') {
  if (isUserLike(resourceType)) {
    const user = resourceType;
    const targetUserId = idParam;
    const isPrivileged = getRoleLevel(user.role) >= ROLE_LEVELS.moderator;
    const isOwner = String(user.id) === String(targetUserId);
    if (isOwner || isPrivileged) {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve(buildFailure(403, 'access_denied', '无权访问此资源', 'AUTH_003'));
  }

  return async (req, res, next) => {
    const resourceId = req.params?.[idParam];
    const ownershipResult = await checkOwnership(req.user, resourceType, resourceId);
    if (!ownershipResult.success) {
      return sendFailure(res, ownershipResult);
    }
    return next();
  };
}

function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, getRequiredJwtSecret(), {
    expiresIn,
    issuer: 'cie-copilot',
    audience: 'cie-users'
  });
}

function verifyToken(token) {
  return jwt.verify(token, getRequiredJwtSecret());
}

export {
  authenticateToken,
  authenticateRequest,
  optionalAuth,
  requirePermission,
  checkPermission,
  requireRole,
  requireMinLevel,
  requireOwnership,
  checkOwnership,
  generateToken,
  verifyToken,
  hashToken,
  getUserPermissions,
  recordSecurityEvent,
  USER_ROLES,
  ROLE_LEVELS,
  PERMISSIONS,
  PERMISSION_CONFIG,
};
