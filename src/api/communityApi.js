// Community API Client
// 封装社区相关的API调用，包括问题、回答、互动、用户档案、徽章和声誉

// Use provided base URL when set; otherwise use same-origin in production and localhost in dev
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001'));

// 通用请求函数
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
};

// 问题相关API
export const questionsApi = {
  // 获取问题列表
  getQuestions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/questions${queryString ? `?${queryString}` : ''}`);
  },

  // 获取单个问题详情
  getQuestion: async (questionId) => {
    return apiRequest(`/api/community/questions/${questionId}`);
  },

  // 创建问题
  createQuestion: async (questionData) => {
    return apiRequest('/api/community/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  },

  // 更新问题
  updateQuestion: async (questionId, questionData) => {
    return apiRequest(`/api/community/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  },

  // 删除问题
  deleteQuestion: async (questionId) => {
    return apiRequest(`/api/community/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  // 搜索问题
  searchQuestions: async (query, filters = {}) => {
    const params = { q: query, ...filters };
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/questions/search?${queryString}`);
  },
};

// 回答相关API
export const answersApi = {
  // 获取问题的回答列表
  getAnswers: async (questionId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/questions/${questionId}/answers${queryString ? `?${queryString}` : ''}`);
  },

  // 获取单个回答详情
  getAnswer: async (answerId) => {
    return apiRequest(`/api/community/answers/${answerId}`);
  },

  // 创建回答
  createAnswer: async (questionId, answerData) => {
    return apiRequest(`/api/community/questions/${questionId}/answers`, {
      method: 'POST',
      body: JSON.stringify(answerData),
    });
  },

  // 更新回答
  updateAnswer: async (answerId, answerData) => {
    return apiRequest(`/api/community/answers/${answerId}`, {
      method: 'PUT',
      body: JSON.stringify(answerData),
    });
  },

  // 删除回答
  deleteAnswer: async (answerId) => {
    return apiRequest(`/api/community/answers/${answerId}`, {
      method: 'DELETE',
    });
  },

  // 采纳回答
  acceptAnswer: async (answerId) => {
    return apiRequest(`/api/community/answers/${answerId}/accept`, {
      method: 'POST',
    });
  },
};

// 互动相关API
export const interactionsApi = {
  // 点赞/取消点赞
  toggleLike: async (targetType, targetId) => {
    return apiRequest(`/api/community/interactions/like`, {
      method: 'POST',
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    });
  },

  // 收藏/取消收藏
  toggleBookmark: async (targetType, targetId) => {
    return apiRequest(`/api/community/interactions/bookmark`, {
      method: 'POST',
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    });
  },

  // 投票（赞成/反对）
  vote: async (targetType, targetId, voteType) => {
    return apiRequest(`/api/community/interactions/vote`, {
      method: 'POST',
      body: JSON.stringify({ 
        target_type: targetType, 
        target_id: targetId, 
        vote_type: voteType 
      }),
    });
  },

  // 举报内容
  report: async (targetType, targetId, reason) => {
    return apiRequest(`/api/community/interactions/report`, {
      method: 'POST',
      body: JSON.stringify({ 
        target_type: targetType, 
        target_id: targetId, 
        reason 
      }),
    });
  },

  // 获取用户的互动历史
  getUserInteractions: async (userId, type = null) => {
    const params = type ? { type } : {};
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/interactions/user/${userId}${queryString ? `?${queryString}` : ''}`);
  },
};

// 用户档案相关API
export const profilesApi = {
  // 获取用户社区档案
  getUserProfile: async (userId) => {
    return apiRequest(`/api/community/profiles/${userId}`);
  },

  // 更新用户社区档案
  updateUserProfile: async (userId, profileData) => {
    return apiRequest(`/api/community/profiles/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // 获取用户统计信息
  getUserStats: async (userId) => {
    return apiRequest(`/api/community/profiles/${userId}/stats`);
  },

  // 获取用户活动历史
  getUserActivity: async (userId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/profiles/${userId}/activity${queryString ? `?${queryString}` : ''}`);
  },

  // 关注/取消关注用户
  toggleFollow: async (userId) => {
    return apiRequest(`/api/community/profiles/${userId}/follow`, {
      method: 'POST',
    });
  },

  // 获取关注列表
  getFollowing: async (userId) => {
    return apiRequest(`/api/community/profiles/${userId}/following`);
  },

  // 获取粉丝列表
  getFollowers: async (userId) => {
    return apiRequest(`/api/community/profiles/${userId}/followers`);
  },
};

// 徽章相关API
export const badgesApi = {
  // 获取所有徽章类型
  getAllBadges: async () => {
    return apiRequest('/api/community/badges');
  },

  // 获取用户徽章
  getUserBadges: async (userId) => {
    return apiRequest(`/api/community/badges/user/${userId}`);
  },

  // 获取徽章详情
  getBadgeDetails: async (badgeId) => {
    return apiRequest(`/api/community/badges/${badgeId}`);
  },

  // 手动颁发徽章（管理员功能）
  awardBadge: async (userId, badgeType, reason = '') => {
    return apiRequest('/api/community/badges/award', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, badge_type: badgeType, reason }),
    });
  },

  // 获取徽章获得历史
  getBadgeHistory: async (userId) => {
    return apiRequest(`/api/community/badges/user/${userId}/history`);
  },
};

// 声誉相关API
export const reputationApi = {
  // 获取用户声誉
  getUserReputation: async (userId) => {
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return apiRequest(`/api/community/reputation${query}`);
  },

  // 获取声誉历史
  getReputationHistory: async (userId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/reputation/${userId}/history${queryString ? `?${queryString}` : ''}`);
  },

  // 获取声誉排行榜
  getReputationLeaderboard: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/reputation/leaderboard${queryString ? `?${queryString}` : ''}`);
  },

  // 手动调整声誉（管理员功能）
  adjustReputation: async (userId, points, reason) => {
    return apiRequest('/api/community/reputation/adjust', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, points, reason }),
    });
  },
};

// 通知相关API
export const notificationsApi = {
  // 获取用户通知
  getNotifications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/community/notifications${queryString ? `?${queryString}` : ''}`);
  },

  // 标记通知为已读
  markAsRead: async (notificationId) => {
    return apiRequest(`/api/community/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  // 批量标记通知为已读
  markAllAsRead: async () => {
    return apiRequest('/api/community/notifications/read-all', {
      method: 'POST',
    });
  },

  // 删除通知
  deleteNotification: async (notificationId) => {
    return apiRequest(`/api/community/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  // 获取未读通知数量
  getUnreadCount: async () => {
    return apiRequest('/api/community/notifications/unread-count');
  },
};

// 统计相关API
export const statsApi = {
  // 获取社区总体统计
  getCommunityStats: async () => {
    return apiRequest('/api/community/stats');
  },

  // 获取用户参与统计
  getUserParticipationStats: async (userId, timeRange = '30d') => {
    return apiRequest(`/api/community/stats/user/${userId}?range=${timeRange}`);
  },

  // 获取热门标签
  getPopularTags: async (limit = 20) => {
    return apiRequest(`/api/community/stats/tags?limit=${limit}`);
  },

  // 获取活跃用户
  getActiveUsers: async (timeRange = '7d', limit = 10) => {
    return apiRequest(`/api/community/stats/active-users?range=${timeRange}&limit=${limit}`);
  },
};

// 默认导出所有API模块
const communityApi = {
  questions: questionsApi,
  answers: answersApi,
  interactions: interactionsApi,
  profiles: profilesApi,
  badges: badgesApi,
  reputation: reputationApi,
  notifications: notificationsApi,
  stats: statsApi,
};

export default communityApi;

// 错误处理工具函数
export const handleApiError = (error) => {
  console.error('Community API Error:', error);
  
  // 根据错误类型返回用户友好的错误信息
  if (error.message.includes('401')) {
    return '请先登录后再进行此操作';
  } else if (error.message.includes('403')) {
    return '您没有权限执行此操作';
  } else if (error.message.includes('404')) {
    return '请求的资源不存在';
  } else if (error.message.includes('429')) {
    return '操作过于频繁，请稍后再试';
  } else if (error.message.includes('500')) {
    return '服务器内部错误，请稍后再试';
  } else {
    return error.message || '操作失败，请稍后再试';
  }
};

// API状态检查
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('API Health Check Failed:', error);
    return false;
  }
};