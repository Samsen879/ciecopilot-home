// Supabase统一错误处理模块

/**
 * 标准化的错误类型
 */
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 自定义错误类
 */
export class SupabaseError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN_ERROR, originalError = null, details = {}) {
    super(message);
    this.name = 'SupabaseError';
    this.type = type;
    this.originalError = originalError;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 错误映射函数
 * @param {Object} error - Supabase原始错误对象
 * @returns {SupabaseError} 标准化的错误对象
 */
export function mapSupabaseError(error) {
  if (!error) {
    return new SupabaseError('Unknown error occurred', ErrorTypes.UNKNOWN_ERROR);
  }

  // 网络错误
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return new SupabaseError(
      '网络连接失败，请检查网络连接',
      ErrorTypes.NETWORK_ERROR,
      error
    );
  }

  // 认证错误
  if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401) {
    return new SupabaseError(
      '身份验证失败，请重新登录',
      ErrorTypes.AUTHENTICATION_ERROR,
      error
    );
  }

  // 权限错误
  if (error.status === 403) {
    return new SupabaseError(
      '权限不足，无法执行此操作',
      ErrorTypes.AUTHORIZATION_ERROR,
      error
    );
  }

  // 数据验证错误
  if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
    return new SupabaseError(
      '数据已存在，请检查输入',
      ErrorTypes.CONFLICT,
      error
    );
  }

  // 数据不存在
  if (error.status === 404 || error.message?.includes('not found')) {
    return new SupabaseError(
      '请求的数据不存在',
      ErrorTypes.NOT_FOUND,
      error
    );
  }

  // 限流错误
  if (error.status === 429) {
    return new SupabaseError(
      '请求过于频繁，请稍后再试',
      ErrorTypes.RATE_LIMIT,
      error
    );
  }

  // 服务器错误
  if (error.status >= 500) {
    return new SupabaseError(
      '服务器内部错误，请稍后再试',
      ErrorTypes.SERVER_ERROR,
      error
    );
  }

  // 数据验证错误
  if (error.code?.startsWith('23') || error.message?.includes('invalid') || error.message?.includes('constraint')) {
    return new SupabaseError(
      '数据格式不正确，请检查输入',
      ErrorTypes.VALIDATION_ERROR,
      error,
      { code: error.code }
    );
  }

  // 默认错误
  return new SupabaseError(
    error.message || '操作失败，请稍后再试',
    ErrorTypes.UNKNOWN_ERROR,
    error
  );
}

/**
 * 包装Supabase查询的通用错误处理函数
 * @param {Function} queryFn - 要执行的查询函数
 * @param {string} operation - 操作描述（用于日志）
 * @returns {Promise} 查询结果或抛出标准化错误
 */
export async function handleSupabaseQuery(queryFn, operation = 'database operation') {
  try {
    const result = await queryFn();
    
    // 检查Supabase查询是否有错误
    if (result.error) {
      throw mapSupabaseError(result.error);
    }
    
    return result;
  } catch (error) {
    // 如果已经是SupabaseError，直接抛出
    if (error instanceof SupabaseError) {
      throw error;
    }
    
    // 否则映射为标准错误
    const mappedError = mapSupabaseError(error);
    
    // 记录错误日志（在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Supabase Error] ${operation}:`, {
        type: mappedError.type,
        message: mappedError.message,
        originalError: mappedError.originalError,
        details: mappedError.details,
        timestamp: mappedError.timestamp
      });
    }
    
    throw mappedError;
  }
}

/**
 * 重试机制包装器
 * @param {Function} queryFn - 要执行的查询函数
 * @param {Object} options - 重试选项
 * @returns {Promise} 查询结果
 */
export async function withRetry(queryFn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = (error) => error.type === ErrorTypes.NETWORK_ERROR || error.type === ErrorTypes.SERVER_ERROR
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      
      // 如果是最后一次尝试或错误不满足重试条件，直接抛出
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

/**
 * 用户友好的错误消息映射
 */
export const getUserFriendlyMessage = (error) => {
  if (!(error instanceof SupabaseError)) {
    return '操作失败，请稍后再试';
  }

  switch (error.type) {
    case ErrorTypes.NETWORK_ERROR:
      return '网络连接失败，请检查网络连接后重试';
    case ErrorTypes.AUTHENTICATION_ERROR:
      return '登录状态已过期，请重新登录';
    case ErrorTypes.AUTHORIZATION_ERROR:
      return '您没有权限执行此操作';
    case ErrorTypes.VALIDATION_ERROR:
      return '输入的数据格式不正确，请检查后重试';
    case ErrorTypes.NOT_FOUND:
      return '请求的内容不存在';
    case ErrorTypes.CONFLICT:
      return '数据冲突，请刷新页面后重试';
    case ErrorTypes.RATE_LIMIT:
      return '操作过于频繁，请稍后再试';
    case ErrorTypes.SERVER_ERROR:
      return '服务器暂时不可用，请稍后再试';
    default:
      return error.message || '操作失败，请稍后再试';
  }
};