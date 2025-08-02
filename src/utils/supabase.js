// Supabase客户端配置文件
// 这个文件将在您设置好Supabase后使用

// 当您准备好集成Supabase时，请取消注释以下代码：

import { createClient } from '@supabase/supabase-js'

// 从环境变量获取Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 验证环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 自动刷新token
    autoRefreshToken: true,
    // 持久化会话
    persistSession: true,
    // 检测会话变化
    detectSessionInUrl: true,
    // 存储选项
    storage: window.localStorage
  },
  // 实时订阅配置
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// 数据库表名常量
export const TABLES = {
  USERS: 'users',
  TOPICS: 'topics',
  STUDY_RECORDS: 'study_records',
  ERROR_BOOK: 'error_book',
  USER_PROGRESS: 'user_progress',
  CHAT_HISTORY: 'chat_history'
}

// 认证相关工具函数
export const auth = {
  // 获取当前用户
  getCurrentUser: () => supabase.auth.getUser(),
  
  // 获取当前会话
  getCurrentSession: () => supabase.auth.getSession(),
  
  // 监听认证状态变化
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  },
  
  // 登录
  signIn: (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  },
  
  // 注册
  signUp: (email, password, options = {}) => {
    return supabase.auth.signUp({ email, password, options })
  },
  
  // 登出
  signOut: () => supabase.auth.signOut(),
  
  // 重置密码
  resetPassword: (email) => {
    return supabase.auth.resetPasswordForEmail(email)
  },
  
  // 更新用户信息
  updateUser: (updates) => {
    return supabase.auth.updateUser(updates)
  }
}

// 数据库操作工具函数
export const db = {
  // 通用查询
  from: (table) => supabase.from(table),
  
  // 获取用户学习记录
  getUserStudyRecords: async (userId) => {
    return supabase
      .from(TABLES.STUDY_RECORDS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  },
  
  // 保存学习进度
  saveStudyProgress: async (userId, topicId, progress) => {
    return supabase
      .from(TABLES.STUDY_RECORDS)
      .upsert({
        user_id: userId,
        topic_id: topicId,
        progress,
        last_studied: new Date().toISOString()
      })
  },
  
  // 获取错题本
  getErrorBook: async (userId) => {
    return supabase
      .from(TABLES.ERROR_BOOK)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  },
  
  // 添加错题
  addErrorQuestion: async (userId, questionData) => {
    return supabase
      .from(TABLES.ERROR_BOOK)
      .insert({
        user_id: userId,
        ...questionData,
        created_at: new Date().toISOString()
      })
  },
  
  // 获取聊天历史
  getChatHistory: async (userId, limit = 50) => {
    return supabase
      .from(TABLES.CHAT_HISTORY)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
  },
  
  // 保存聊天记录
  saveChatMessage: async (userId, message, response) => {
    return supabase
      .from(TABLES.CHAT_HISTORY)
      .insert({
        user_id: userId,
        message,
        response,
        created_at: new Date().toISOString()
      })
  }
}

// 实时订阅工具函数
export const realtime = {
  // 订阅用户学习进度变化
  subscribeToUserProgress: (userId, callback) => {
    return supabase
      .channel('user_progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.STUDY_RECORDS,
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },
  
  // 取消订阅
  unsubscribe: (subscription) => {
    return supabase.removeChannel(subscription)
  }
}

// 文件上传工具函数
export const storage = {
  // 上传文件
  uploadFile: async (bucket, path, file) => {
    return supabase.storage
      .from(bucket)
      .upload(path, file)
  },
  
  // 获取文件URL
  getFileUrl: (bucket, path) => {
    return supabase.storage
      .from(bucket)
      .getPublicUrl(path)
  },
  
  // 删除文件
  deleteFile: async (bucket, path) => {
    return supabase.storage
      .from(bucket)
      .remove([path])
  }
}

export default supabase