// 社区声誉系统API端点
// 处理声誉计算、等级提升、声誉历史等功能

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 声誉系统配置
const REPUTATION_CONFIG = {
  // 声誉积分规则
  POINTS: {
    QUESTION_POSTED: 2,
    ANSWER_POSTED: 5,
    ANSWER_UPVOTED: 10,
    ANSWER_DOWNVOTED: -2,
    QUESTION_UPVOTED: 5,
    QUESTION_DOWNVOTED: -1,
    BEST_ANSWER_SELECTED: 15,
    BEST_ANSWER_RECEIVED: 25,
    HELPFUL_MARKED: 10,
    ANSWER_ACCEPTED: 20,
    DAILY_LOGIN: 1,
    PROFILE_COMPLETED: 10,
    FIRST_CONTRIBUTION: 5,
    CONSECUTIVE_DAYS: 2, // 连续登录奖励
    QUALITY_CONTENT: 5,  // 高质量内容奖励
    COMMUNITY_CONTRIBUTION: 15, // 社区贡献奖励
    MODERATION_ACTION: 3, // 版主行为奖励
    SPAM_PENALTY: -10,
    INAPPROPRIATE_CONTENT: -5,
    VIOLATION_PENALTY: -20
  },
  
  // 声誉等级
  LEVELS: {
    NEWCOMER: { min: 0, max: 49, name: '新手', privileges: ['ask', 'answer'] },
    CONTRIBUTOR: { min: 50, max: 199, name: '贡献者', privileges: ['ask', 'answer', 'comment'] },
    ACTIVE_MEMBER: { min: 200, max: 499, name: '活跃成员', privileges: ['ask', 'answer', 'comment', 'vote'] },
    TRUSTED_USER: { min: 500, max: 999, name: '信任用户', privileges: ['ask', 'answer', 'comment', 'vote', 'edit'] },
    EXPERT: { min: 1000, max: 2499, name: '专家', privileges: ['ask', 'answer', 'comment', 'vote', 'edit', 'close'] },
    MODERATOR: { min: 2500, max: 4999, name: '版主', privileges: ['ask', 'answer', 'comment', 'vote', 'edit', 'close', 'moderate'] },
    SENIOR_MODERATOR: { min: 5000, max: 9999, name: '高级版主', privileges: ['ask', 'answer', 'comment', 'vote', 'edit', 'close', 'moderate', 'admin'] },
    LEGEND: { min: 10000, max: Infinity, name: '传奇', privileges: ['all'] }
  },
  
  // 声誉变化类型
  CHANGE_TYPES: {
    CONTENT_INTERACTION: 'content_interaction',
    QUALITY_ASSESSMENT: 'quality_assessment',
    COMMUNITY_PARTICIPATION: 'community_participation',
    MODERATION_ACTION: 'moderation_action',
    SYSTEM_ADJUSTMENT: 'system_adjustment',
    PENALTY: 'penalty',
    BONUS: 'bonus'
  },
  
  // 每日声誉变化限制
  DAILY_LIMITS: {
    MAX_GAIN_FROM_VOTES: 200,
    MAX_LOSS_FROM_VOTES: -50,
    MAX_TOTAL_CHANGE: 300
  }
};

// 主要的声誉API处理函数
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 验证请求方法
    if (!['GET', 'POST', 'PUT'].includes(req.method)) {
      return res.status(405).json({
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // 获取用户认证信息
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // 路由处理
    switch (req.method) {
      case 'GET':
        return await handleGetReputation(req, res, user);
      case 'POST':
        return await handleUpdateReputation(req, res, user);
      case 'PUT':
        return await handleAdjustReputation(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Community reputation API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取用户声誉信息
async function handleGetReputation(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { 
      user_id = user.id,
      include_history = 'false',
      include_breakdown = 'false',
      days = 30
    } = req.query;

    // 获取用户声誉档案
    const { data: profile, error: profileError } = await supabase
      .from('user_community_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    const currentReputation = profile?.reputation_score || 0;
    const currentLevel = calculateLevel(currentReputation);
    const nextLevel = getNextLevel(currentLevel);
    
    let reputationHistory = [];
    let reputationBreakdown = {};
    
    // 获取声誉历史记录
    if (include_history === 'true') {
      const { data: history, error: historyError } = await supabase
        .from('reputation_history')
        .select('*')
        .eq('user_id', user_id)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyError) {
        throw historyError;
      }

      reputationHistory = history || [];
    }
    
    // 获取声誉来源分析
    if (include_breakdown === 'true') {
      reputationBreakdown = await getReputationBreakdown(user_id, days);
    }

    // 计算今日声誉变化
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: todayChanges, error: todayError } = await supabase
      .from('reputation_history')
      .select('points_change')
      .eq('user_id', user_id)
      .gte('created_at', todayStart.toISOString());

    if (todayError) {
      throw todayError;
    }

    const todayTotal = todayChanges?.reduce((sum, change) => sum + change.points_change, 0) || 0;
    
    return res.status(200).json({
      success: true,
      data: {
        user_id,
        current_reputation: currentReputation,
        current_level: currentLevel,
        next_level: nextLevel,
        progress_to_next: nextLevel ? {
          current: currentReputation - currentLevel.min,
          required: nextLevel.min - currentLevel.min,
          percentage: Math.round(((currentReputation - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
        } : null,
        today_change: todayTotal,
        privileges: currentLevel.privileges,
        reputation_history: reputationHistory,
        reputation_breakdown: reputationBreakdown,
        daily_limits: {
          ...REPUTATION_CONFIG.DAILY_LIMITS,
          remaining_gain: Math.max(0, REPUTATION_CONFIG.DAILY_LIMITS.MAX_GAIN_FROM_VOTES - Math.max(0, todayTotal)),
          remaining_loss: Math.max(0, Math.abs(REPUTATION_CONFIG.DAILY_LIMITS.MAX_LOSS_FROM_VOTES) - Math.abs(Math.min(0, todayTotal)))
        }
      },
      response_time: Date.now() - startTime
    });

  } catch (error) {
    console.error('Get reputation error:', error);
    return res.status(500).json({
      error: 'Failed to get reputation',
      code: 'REPUTATION_ERROR',
      message: error.message
    });
  }
}

// 更新用户声誉（系统调用）
async function handleUpdateReputation(req, res, user) {
  try {
    const { 
      user_id, 
      action_type, 
      points_change, 
      reason, 
      related_content_id,
      related_content_type,
      metadata = {}
    } = req.body;

    // 验证必需参数
    if (!user_id || !action_type || points_change === undefined) {
      return res.status(400).json({
        error: 'user_id, action_type, and points_change are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 验证积分变化是否在合理范围内
    if (Math.abs(points_change) > 100) {
      return res.status(400).json({
        error: 'Points change too large',
        code: 'INVALID_POINTS_CHANGE'
      });
    }

    // 检查今日声誉变化限制
    const todayLimits = await checkDailyLimits(user_id, points_change);
    if (!todayLimits.allowed) {
      return res.status(400).json({
        error: 'Daily reputation change limit exceeded',
        code: 'DAILY_LIMIT_EXCEEDED',
        details: todayLimits
      });
    }

    // 执行声誉更新
    const result = await updateUserReputation({
      userId: user_id,
      pointsChange: points_change,
      actionType: action_type,
      reason: reason,
      relatedContentId: related_content_id,
      relatedContentType: related_content_type,
      metadata: metadata,
      triggeredBy: user.id
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Reputation updated successfully'
    });

  } catch (error) {
    console.error('Update reputation error:', error);
    return res.status(500).json({
      error: 'Failed to update reputation',
      code: 'UPDATE_ERROR',
      message: error.message
    });
  }
}

// 调整用户声誉（管理员功能）
async function handleAdjustReputation(req, res, user) {
  try {
    const { user_id, new_reputation, reason } = req.body;

    // 验证必需参数
    if (!user_id || new_reputation === undefined || !reason) {
      return res.status(400).json({
        error: 'user_id, new_reputation, and reason are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 检查权限（只有管理员可以调整声誉）
    const userProfile = await getUserCommunityProfile(user.id);
    if (!['admin', 'moderator'].includes(userProfile.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions to adjust reputation',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 获取当前声誉
    const currentProfile = await getUserCommunityProfile(user_id);
    const currentReputation = currentProfile.reputation_score || 0;
    const pointsChange = new_reputation - currentReputation;

    // 执行声誉调整
    const result = await updateUserReputation({
      userId: user_id,
      pointsChange: pointsChange,
      actionType: 'ADMIN_ADJUSTMENT',
      reason: reason,
      metadata: {
        previous_reputation: currentReputation,
        new_reputation: new_reputation,
        adjusted_by: user.id
      },
      triggeredBy: user.id,
      skipLimits: true
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Reputation adjusted successfully'
    });

  } catch (error) {
    console.error('Adjust reputation error:', error);
    return res.status(500).json({
      error: 'Failed to adjust reputation',
      code: 'ADJUST_ERROR',
      message: error.message
    });
  }
}

// 核心声誉更新函数
export async function updateUserReputation({
  userId,
  pointsChange,
  actionType,
  reason,
  relatedContentId = null,
  relatedContentType = null,
  metadata = {},
  triggeredBy = null,
  skipLimits = false
}) {
  try {
    // 检查每日限制
    if (!skipLimits) {
      const limitsCheck = await checkDailyLimits(userId, pointsChange);
      if (!limitsCheck.allowed) {
        throw new Error(`Daily limit exceeded: ${limitsCheck.reason}`);
      }
    }

    // 获取当前用户档案
    const currentProfile = await getUserCommunityProfile(userId);
    const oldReputation = currentProfile.reputation_score || 0;
    const oldLevel = calculateLevel(oldReputation);
    
    // 计算新声誉（确保不低于0）
    const newReputation = Math.max(0, oldReputation + pointsChange);
    const newLevel = calculateLevel(newReputation);
    
    // 检查是否等级提升
    const levelUp = newLevel.min > oldLevel.min;
    
    // 开始事务
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_community_profiles')
      .upsert({
        user_id: userId,
        reputation_score: newReputation,
        level: newLevel.name,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 记录声誉历史
    const { error: historyError } = await supabase
      .from('reputation_history')
      .insert({
        user_id: userId,
        points_change: pointsChange,
        action_type: actionType,
        reason: reason,
        previous_reputation: oldReputation,
        new_reputation: newReputation,
        related_content_id: relatedContentId,
        related_content_type: relatedContentType,
        metadata: metadata,
        triggered_by: triggeredBy,
        created_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Failed to record reputation history:', historyError);
      // 不抛出错误，因为主要操作已成功
    }

    // 如果等级提升，触发相关事件
    if (levelUp) {
      await handleLevelUp(userId, oldLevel, newLevel);
    }

    return {
      user_id: userId,
      old_reputation: oldReputation,
      new_reputation: newReputation,
      points_change: pointsChange,
      old_level: oldLevel,
      new_level: newLevel,
      level_up: levelUp,
      action_type: actionType,
      reason: reason
    };

  } catch (error) {
    console.error('Update user reputation error:', error);
    throw error;
  }
}

// 计算用户等级
function calculateLevel(reputation) {
  for (const [levelKey, levelData] of Object.entries(REPUTATION_CONFIG.LEVELS)) {
    if (reputation >= levelData.min && reputation <= levelData.max) {
      return {
        key: levelKey,
        name: levelData.name,
        min: levelData.min,
        max: levelData.max,
        privileges: levelData.privileges
      };
    }
  }
  
  // 默认返回新手等级
  return {
    key: 'NEWCOMER',
    name: REPUTATION_CONFIG.LEVELS.NEWCOMER.name,
    min: REPUTATION_CONFIG.LEVELS.NEWCOMER.min,
    max: REPUTATION_CONFIG.LEVELS.NEWCOMER.max,
    privileges: REPUTATION_CONFIG.LEVELS.NEWCOMER.privileges
  };
}

// 获取下一个等级
function getNextLevel(currentLevel) {
  const levels = Object.entries(REPUTATION_CONFIG.LEVELS);
  const currentIndex = levels.findIndex(([key]) => key === currentLevel.key);
  
  if (currentIndex >= 0 && currentIndex < levels.length - 1) {
    const [nextKey, nextData] = levels[currentIndex + 1];
    return {
      key: nextKey,
      name: nextData.name,
      min: nextData.min,
      max: nextData.max,
      privileges: nextData.privileges
    };
  }
  
  return null; // 已经是最高等级
}

// 检查每日声誉变化限制
async function checkDailyLimits(userId, pointsChange) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: todayChanges, error } = await supabase
      .from('reputation_history')
      .select('points_change, action_type')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString());

    if (error) {
      throw error;
    }

    const todayTotal = todayChanges?.reduce((sum, change) => sum + change.points_change, 0) || 0;
    const todayGain = todayChanges?.filter(c => c.points_change > 0).reduce((sum, c) => sum + c.points_change, 0) || 0;
    const todayLoss = todayChanges?.filter(c => c.points_change < 0).reduce((sum, c) => sum + c.points_change, 0) || 0;
    
    // 检查各种限制
    if (pointsChange > 0) {
      if (todayGain + pointsChange > REPUTATION_CONFIG.DAILY_LIMITS.MAX_GAIN_FROM_VOTES) {
        return {
          allowed: false,
          reason: 'Daily gain limit exceeded',
          current_gain: todayGain,
          max_gain: REPUTATION_CONFIG.DAILY_LIMITS.MAX_GAIN_FROM_VOTES
        };
      }
    } else {
      if (todayLoss + pointsChange < REPUTATION_CONFIG.DAILY_LIMITS.MAX_LOSS_FROM_VOTES) {
        return {
          allowed: false,
          reason: 'Daily loss limit exceeded',
          current_loss: todayLoss,
          max_loss: REPUTATION_CONFIG.DAILY_LIMITS.MAX_LOSS_FROM_VOTES
        };
      }
    }
    
    if (Math.abs(todayTotal + pointsChange) > REPUTATION_CONFIG.DAILY_LIMITS.MAX_TOTAL_CHANGE) {
      return {
        allowed: false,
        reason: 'Daily total change limit exceeded',
        current_total: todayTotal,
        max_total: REPUTATION_CONFIG.DAILY_LIMITS.MAX_TOTAL_CHANGE
      };
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Check daily limits error:', error);
    return { allowed: true }; // 出错时允许操作
  }
}

// 获取声誉来源分析
async function getReputationBreakdown(userId, days) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data: history, error } = await supabase
      .from('reputation_history')
      .select('action_type, points_change')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw error;
    }

    const breakdown = {};
    history?.forEach(record => {
      const type = record.action_type;
      if (!breakdown[type]) {
        breakdown[type] = { count: 0, total_points: 0 };
      }
      breakdown[type].count++;
      breakdown[type].total_points += record.points_change;
    });

    return breakdown;
    
  } catch (error) {
    console.error('Get reputation breakdown error:', error);
    return {};
  }
}

// 处理等级提升
async function handleLevelUp(userId, oldLevel, newLevel) {
  try {
    // 记录等级提升事件
    await supabase
      .from('reputation_history')
      .insert({
        user_id: userId,
        points_change: 0,
        action_type: 'LEVEL_UP',
        reason: `Level up from ${oldLevel.name} to ${newLevel.name}`,
        metadata: {
          old_level: oldLevel,
          new_level: newLevel
        },
        created_at: new Date().toISOString()
      });

    // 可以在这里添加其他等级提升相关的逻辑
    // 比如发送通知、解锁新功能等
    
  } catch (error) {
    console.error('Handle level up error:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

// 获取用户社区档案
async function getUserCommunityProfile(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('user_community_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return profile || {
      user_id: userId,
      reputation_score: 0,
      level: 'NEWCOMER',
      role: 'student'
    };

  } catch (error) {
    console.error('Get user community profile error:', error);
    throw error;
  }
}

// 批量更新声誉（用于系统维护）
export async function batchUpdateReputation(updates) {
  const results = [];
  
  for (const update of updates) {
    try {
      const result = await updateUserReputation(update);
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ 
        success: false, 
        user_id: update.userId, 
        error: error.message 
      });
    }
  }
  
  return results;
}

// 导出配置供其他模块使用
export { REPUTATION_CONFIG };