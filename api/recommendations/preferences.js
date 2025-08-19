// 用户偏好管理API端点
// 处理用户学习偏好的增删改查操作

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 用户偏好配置
const PREFERENCE_CONFIG = {
  MAX_INTERESTS: 20,
  MAX_GOALS: 10,
  VALID_LEARNING_STYLES: ['visual', 'auditory', 'kinesthetic', 'reading'],
  VALID_DIFFICULTY_LEVELS: [1, 2, 3, 4, 5],
  VALID_LEARNING_PACE: ['slow', 'medium', 'fast'],
  CACHE_DURATION: 1800 // 30分钟
};

// 主要的用户偏好API处理函数
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
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
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
        return await handleGetPreferences(req, res, user);
      case 'POST':
        return await handleCreatePreferences(req, res, user);
      case 'PUT':
        return await handleUpdatePreferences(req, res, user);
      case 'DELETE':
        return await handleDeletePreferences(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('User preferences API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取用户偏好
async function handleGetPreferences(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { subject_code, include_profile = true } = req.query;

    // 如果指定了学科代码，获取特定学科的偏好
    if (subject_code) {
      const preferences = await getSubjectPreferences(user.id, subject_code, include_profile === 'true');
      
      return res.status(200).json({
        success: true,
        data: preferences,
        response_time: Date.now() - startTime
      });
    }

    // 获取所有偏好
    const allPreferences = await getAllUserPreferences(user.id, include_profile === 'true');
    
    return res.status(200).json({
      success: true,
      data: allPreferences,
      response_time: Date.now() - startTime
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    return res.status(500).json({
      error: 'Failed to get preferences',
      code: 'PREFERENCES_ERROR',
      message: error.message
    });
  }
}

// 创建用户偏好
async function handleCreatePreferences(req, res, user) {
  try {
    const { 
      subject_code,
      learning_style,
      preferred_difficulty,
      learning_pace,
      content_preferences,
      learning_goals,
      interests,
      time_preferences
    } = req.body;

    // 验证必需参数
    if (!subject_code) {
      return res.status(400).json({
        error: 'subject_code is required',
        code: 'MISSING_SUBJECT_CODE'
      });
    }

    // 验证学习风格
    if (learning_style && !PREFERENCE_CONFIG.VALID_LEARNING_STYLES.includes(learning_style)) {
      return res.status(400).json({
        error: 'Invalid learning_style',
        code: 'INVALID_LEARNING_STYLE',
        valid_styles: PREFERENCE_CONFIG.VALID_LEARNING_STYLES
      });
    }

    // 验证难度等级
    if (preferred_difficulty && !PREFERENCE_CONFIG.VALID_DIFFICULTY_LEVELS.includes(preferred_difficulty)) {
      return res.status(400).json({
        error: 'Invalid preferred_difficulty',
        code: 'INVALID_DIFFICULTY',
        valid_levels: PREFERENCE_CONFIG.VALID_DIFFICULTY_LEVELS
      });
    }

    // 验证学习节奏
    if (learning_pace && !PREFERENCE_CONFIG.VALID_LEARNING_PACE.includes(learning_pace)) {
      return res.status(400).json({
        error: 'Invalid learning_pace',
        code: 'INVALID_LEARNING_PACE',
        valid_pace: PREFERENCE_CONFIG.VALID_LEARNING_PACE
      });
    }

    // 验证兴趣数量
    if (interests && interests.length > PREFERENCE_CONFIG.MAX_INTERESTS) {
      return res.status(400).json({
        error: `Too many interests. Maximum ${PREFERENCE_CONFIG.MAX_INTERESTS} allowed`,
        code: 'TOO_MANY_INTERESTS'
      });
    }

    // 验证学习目标数量
    if (learning_goals && learning_goals.length > PREFERENCE_CONFIG.MAX_GOALS) {
      return res.status(400).json({
        error: `Too many learning goals. Maximum ${PREFERENCE_CONFIG.MAX_GOALS} allowed`,
        code: 'TOO_MANY_GOALS'
      });
    }

    // 检查是否已存在该学科的偏好
    const { data: existingPrefs, error: checkError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject_code', subject_code)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingPrefs) {
      return res.status(409).json({
        error: 'Preferences already exist for this subject',
        code: 'PREFERENCES_EXIST',
        message: 'Use PUT method to update existing preferences'
      });
    }

    // 创建偏好记录
    const preferenceData = {
      user_id: user.id,
      subject_code,
      learning_style: learning_style || 'visual',
      preferred_difficulty: preferred_difficulty || 3,
      learning_pace: learning_pace || 'medium',
      content_preferences: content_preferences || {},
      learning_goals: learning_goals || [],
      interests: interests || [],
      time_preferences: time_preferences || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: preferences, error: createError } = await supabase
      .from('user_preferences')
      .insert(preferenceData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // 同时创建或更新学习档案
    await createOrUpdateLearningProfile(user.id, subject_code, preferenceData);

    return res.status(201).json({
      success: true,
      data: preferences,
      message: 'Preferences created successfully'
    });

  } catch (error) {
    console.error('Create preferences error:', error);
    return res.status(500).json({
      error: 'Failed to create preferences',
      code: 'CREATE_ERROR',
      message: error.message
    });
  }
}

// 更新用户偏好
async function handleUpdatePreferences(req, res, user) {
  try {
    const { subject_code } = req.query;
    const updateData = req.body;

    if (!subject_code) {
      return res.status(400).json({
        error: 'subject_code is required',
        code: 'MISSING_SUBJECT_CODE'
      });
    }

    // 验证更新数据
    const validationError = validatePreferenceData(updateData);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    // 检查偏好是否存在
    const { data: existingPrefs, error: checkError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject_code', subject_code)
      .single();

    if (checkError || !existingPrefs) {
      return res.status(404).json({
        error: 'Preferences not found',
        code: 'PREFERENCES_NOT_FOUND'
      });
    }

    // 准备更新数据
    const finalUpdateData = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // 移除不允许更新的字段
    delete finalUpdateData.user_id;
    delete finalUpdateData.subject_code;
    delete finalUpdateData.created_at;

    // 更新偏好
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_preferences')
      .update(finalUpdateData)
      .eq('user_id', user.id)
      .eq('subject_code', subject_code)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 更新学习档案
    await createOrUpdateLearningProfile(user.id, subject_code, updatedPreferences);

    return res.status(200).json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    return res.status(500).json({
      error: 'Failed to update preferences',
      code: 'UPDATE_ERROR',
      message: error.message
    });
  }
}

// 删除用户偏好
async function handleDeletePreferences(req, res, user) {
  try {
    const { subject_code } = req.query;

    if (!subject_code) {
      return res.status(400).json({
        error: 'subject_code is required',
        code: 'MISSING_SUBJECT_CODE'
      });
    }

    // 检查偏好是否存在
    const { data: existingPrefs, error: checkError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject_code', subject_code)
      .single();

    if (checkError || !existingPrefs) {
      return res.status(404).json({
        error: 'Preferences not found',
        code: 'PREFERENCES_NOT_FOUND'
      });
    }

    // 删除偏好
    const { error: deleteError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id)
      .eq('subject_code', subject_code);

    if (deleteError) {
      throw deleteError;
    }

    // 同时删除相关的学习档案
    await supabase
      .from('user_learning_profiles')
      .delete()
      .eq('user_id', user.id)
      .eq('subject_code', subject_code);

    return res.status(200).json({
      success: true,
      message: 'Preferences deleted successfully'
    });

  } catch (error) {
    console.error('Delete preferences error:', error);
    return res.status(500).json({
      error: 'Failed to delete preferences',
      code: 'DELETE_ERROR',
      message: error.message
    });
  }
}

// 获取特定学科的偏好
async function getSubjectPreferences(userId, subjectCode, includeProfile) {
  try {
    // 获取用户偏好
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_code', subjectCode)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      throw prefError;
    }

    let result = {
      preferences: preferences || null,
      subject_code: subjectCode
    };

    // 如果需要包含学习档案
    if (includeProfile) {
      const { data: profile, error: profileError } = await supabase
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      result.learning_profile = profile || null;
    }

    return result;

  } catch (error) {
    console.error('Get subject preferences error:', error);
    throw error;
  }
}

// 获取所有用户偏好
async function getAllUserPreferences(userId, includeProfile) {
  try {
    // 获取所有偏好
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (prefError) {
      throw prefError;
    }

    let result = {
      preferences: preferences || [],
      total: preferences?.length || 0
    };

    // 如果需要包含学习档案
    if (includeProfile) {
      const { data: profiles, error: profileError } = await supabase
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (profileError) {
        throw profileError;
      }

      result.learning_profiles = profiles || [];
    }

    return result;

  } catch (error) {
    console.error('Get all user preferences error:', error);
    throw error;
  }
}

// 验证偏好数据
function validatePreferenceData(data) {
  // 验证学习风格
  if (data.learning_style && !PREFERENCE_CONFIG.VALID_LEARNING_STYLES.includes(data.learning_style)) {
    return {
      error: 'Invalid learning_style',
      code: 'INVALID_LEARNING_STYLE',
      valid_styles: PREFERENCE_CONFIG.VALID_LEARNING_STYLES
    };
  }

  // 验证难度等级
  if (data.preferred_difficulty && !PREFERENCE_CONFIG.VALID_DIFFICULTY_LEVELS.includes(data.preferred_difficulty)) {
    return {
      error: 'Invalid preferred_difficulty',
      code: 'INVALID_DIFFICULTY',
      valid_levels: PREFERENCE_CONFIG.VALID_DIFFICULTY_LEVELS
    };
  }

  // 验证学习节奏
  if (data.learning_pace && !PREFERENCE_CONFIG.VALID_LEARNING_PACE.includes(data.learning_pace)) {
    return {
      error: 'Invalid learning_pace',
      code: 'INVALID_LEARNING_PACE',
      valid_pace: PREFERENCE_CONFIG.VALID_LEARNING_PACE
    };
  }

  // 验证兴趣数量
  if (data.interests && data.interests.length > PREFERENCE_CONFIG.MAX_INTERESTS) {
    return {
      error: `Too many interests. Maximum ${PREFERENCE_CONFIG.MAX_INTERESTS} allowed`,
      code: 'TOO_MANY_INTERESTS'
    };
  }

  // 验证学习目标数量
  if (data.learning_goals && data.learning_goals.length > PREFERENCE_CONFIG.MAX_GOALS) {
    return {
      error: `Too many learning goals. Maximum ${PREFERENCE_CONFIG.MAX_GOALS} allowed`,
      code: 'TOO_MANY_GOALS'
    };
  }

  return null; // 验证通过
}

// 创建或更新学习档案
async function createOrUpdateLearningProfile(userId, subjectCode, preferenceData) {
  try {
    const profileData = {
      user_id: userId,
      subject_code: subjectCode,
      learning_style: {
        primary: preferenceData.learning_style,
        preferences: preferenceData.content_preferences || {}
      },
      knowledge_level: {
        overall: 3, // 默认中等水平
        topics: {}
      },
      learning_pace: preferenceData.learning_pace,
      preferred_difficulty: preferenceData.preferred_difficulty,
      content_preferences: preferenceData.content_preferences || {},
      weakness_areas: [],
      strength_areas: preferenceData.interests || [],
      goal_preferences: preferenceData.learning_goals || [],
      time_preferences: preferenceData.time_preferences || {},
      updated_at: new Date().toISOString()
    };

    // 尝试更新现有档案，如果不存在则创建
    const { data: profile, error } = await supabase
      .from('user_learning_profiles')
      .upsert(profileData, {
        onConflict: 'user_id,subject_code'
      })
      .select()
      .single();

    if (error) {
      console.error('Create/update learning profile error:', error);
      // 不抛出错误，因为这不是关键操作
    }

    return profile;

  } catch (error) {
    console.error('Create or update learning profile error:', error);
    // 不抛出错误，因为这不是关键操作
    return null;
  }
}

// 获取用户偏好统计
export async function getUserPreferenceStats(userId) {
  try {
    const { data: stats, error } = await supabase
      .from('user_preferences')
      .select('subject_code, learning_style, preferred_difficulty, learning_pace')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // 计算统计信息
    const subjectCount = stats.length;
    const learningStyleDistribution = {};
    const difficultyDistribution = {};
    const paceDistribution = {};

    stats.forEach(pref => {
      // 学习风格分布
      learningStyleDistribution[pref.learning_style] = 
        (learningStyleDistribution[pref.learning_style] || 0) + 1;
      
      // 难度偏好分布
      difficultyDistribution[pref.preferred_difficulty] = 
        (difficultyDistribution[pref.preferred_difficulty] || 0) + 1;
      
      // 学习节奏分布
      paceDistribution[pref.learning_pace] = 
        (paceDistribution[pref.learning_pace] || 0) + 1;
    });

    return {
      total_subjects: subjectCount,
      learning_style_distribution: learningStyleDistribution,
      difficulty_distribution: difficultyDistribution,
      pace_distribution: paceDistribution,
      most_common_style: Object.keys(learningStyleDistribution).reduce((a, b) => 
        learningStyleDistribution[a] > learningStyleDistribution[b] ? a : b, 'visual'),
      average_difficulty: stats.reduce((sum, pref) => sum + pref.preferred_difficulty, 0) / subjectCount || 3
    };

  } catch (error) {
    console.error('Get user preference stats error:', error);
    throw error;
  }
}

// 导出配置供其他模块使用
export { PREFERENCE_CONFIG };