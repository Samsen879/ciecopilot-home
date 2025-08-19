// 社区用户档案API端点
// 处理用户档案获取、更新、统计数据等功能

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 档案系统配置
const PROFILE_CONFIG = {
  // 可见性设置
  VISIBILITY: {
    PUBLIC: 'public',
    PRIVATE: 'private',
    FRIENDS_ONLY: 'friends_only'
  },
  
  // 用户角色
  ROLES: {
    STUDENT: 'student',
    TEACHER: 'teacher',
    MODERATOR: 'moderator',
    ADMIN: 'admin'
  },
  
  // 统计数据类型
  STATS_TYPES: {
    QUESTIONS: 'questions',
    ANSWERS: 'answers',
    BEST_ANSWERS: 'best_answers',
    VOTES_RECEIVED: 'votes_received',
    VOTES_GIVEN: 'votes_given',
    BADGES: 'badges',
    REPUTATION: 'reputation'
  },
  
  // 活动类型
  ACTIVITY_TYPES: {
    QUESTION_POSTED: 'question_posted',
    ANSWER_POSTED: 'answer_posted',
    VOTE_CAST: 'vote_cast',
    BADGE_EARNED: 'badge_earned',
    LEVEL_UP: 'level_up',
    BEST_ANSWER: 'best_answer'
  }
};

// 主要的档案API处理函数
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
    if (!['GET', 'PUT', 'POST'].includes(req.method)) {
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
        return await handleGetProfile(req, res, user);
      case 'PUT':
        return await handleUpdateProfile(req, res, user);
      case 'POST':
        return await handleCreateProfile(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Community profiles API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取用户档案
async function handleGetProfile(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { 
      user_id = user.id,
      include_stats = 'true',
      include_badges = 'true',
      include_activity = 'false',
      activity_limit = 20
    } = req.query;

    // 检查是否有权限查看该档案
    const canView = await checkProfileViewPermission(user.id, user_id);
    if (!canView) {
      return res.status(403).json({
        error: 'No permission to view this profile',
        code: 'PROFILE_ACCESS_DENIED'
      });
    }

    // 获取基础档案信息
    const { data: profile, error: profileError } = await supabase
      .from('user_community_profiles')
      .select(`
        *,
        user_profiles!inner(
          id, username, display_name, avatar_url, bio, 
          created_at, updated_at
        )
      `)
      .eq('user_id', user_id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // 如果档案不存在，创建默认档案
    if (!profile) {
      const defaultProfile = await createDefaultProfile(user_id);
      return res.status(200).json({
        success: true,
        data: {
          ...defaultProfile,
          statistics: {},
          badges: [],
          recent_activity: []
        },
        response_time: Date.now() - startTime
      });
    }

    let statistics = {};
    let badges = [];
    let recentActivity = [];

    // 获取统计数据
    if (include_stats === 'true') {
      statistics = await getUserStatistics(user_id);
    }

    // 获取徽章信息
    if (include_badges === 'true') {
      const { data: userBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select(`
          id, badge_id, earned_at,
          badge_definition:badge_definitions(
            id, name, description, category, rarity, icon_url
          )
        `)
        .eq('user_id', user_id)
        .order('earned_at', { ascending: false })
        .limit(50);

      if (badgesError) {
        throw badgesError;
      }

      badges = userBadges || [];
    }

    // 获取最近活动
    if (include_activity === 'true') {
      recentActivity = await getUserRecentActivity(user_id, parseInt(activity_limit));
    }

    // 计算档案完整度
    const completeness = calculateProfileCompleteness(profile);

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        statistics,
        badges,
        recent_activity: recentActivity,
        profile_completeness: completeness,
        is_own_profile: user.id === user_id
      },
      response_time: Date.now() - startTime
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR',
      message: error.message
    });
  }
}

// 更新用户档案
async function handleUpdateProfile(req, res, user) {
  try {
    const { user_id = user.id } = req.query;
    const updates = req.body;

    // 检查权限（只能更新自己的档案或管理员权限）
    if (user_id !== user.id) {
      const userProfile = await getUserCommunityProfile(user.id);
      if (!['admin', 'moderator'].includes(userProfile.role)) {
        return res.status(403).json({
          error: 'No permission to update this profile',
          code: 'UPDATE_ACCESS_DENIED'
        });
      }
    }

    // 验证更新数据
    const validatedUpdates = validateProfileUpdates(updates);
    if (validatedUpdates.errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid update data',
        code: 'VALIDATION_ERROR',
        details: validatedUpdates.errors
      });
    }

    // 更新社区档案
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_community_profiles')
      .update({
        ...validatedUpdates.data,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select(`
        *,
        user_profiles!inner(
          id, username, display_name, avatar_url, bio
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // 如果有基础档案更新，同时更新user_profiles表
    if (validatedUpdates.profileUpdates) {
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          ...validatedUpdates.profileUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id);

      if (profileUpdateError) {
        console.error('Failed to update user profile:', profileUpdateError);
        // 不抛出错误，因为主要更新已成功
      }
    }

    return res.status(200).json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      code: 'UPDATE_ERROR',
      message: error.message
    });
  }
}

// 创建用户档案
async function handleCreateProfile(req, res, user) {
  try {
    const profileData = req.body;

    // 验证创建数据
    const validatedData = validateProfileCreation(profileData);
    if (validatedData.errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid profile data',
        code: 'VALIDATION_ERROR',
        details: validatedData.errors
      });
    }

    // 检查档案是否已存在
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_community_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return res.status(400).json({
        error: 'Profile already exists',
        code: 'PROFILE_EXISTS'
      });
    }

    // 创建新档案
    const { data: newProfile, error: createError } = await supabase
      .from('user_community_profiles')
      .insert({
        user_id: user.id,
        ...validatedData.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        user_profiles!inner(
          id, username, display_name, avatar_url, bio
        )
      `)
      .single();

    if (createError) {
      throw createError;
    }

    return res.status(201).json({
      success: true,
      data: newProfile,
      message: 'Profile created successfully'
    });

  } catch (error) {
    console.error('Create profile error:', error);
    return res.status(500).json({
      error: 'Failed to create profile',
      code: 'CREATE_ERROR',
      message: error.message
    });
  }
}

// 获取用户统计数据
async function getUserStatistics(userId) {
  try {
    // 获取问题统计
    const { count: questionsCount, error: questionsError } = await supabase
      .from('community_questions')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    if (questionsError) throw questionsError;

    // 获取回答统计
    const { count: answersCount, error: answersError } = await supabase
      .from('community_answers')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    if (answersError) throw answersError;

    // 获取最佳答案统计
    const { count: bestAnswersCount, error: bestAnswersError } = await supabase
      .from('community_answers')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('is_best_answer', true);

    if (bestAnswersError) throw bestAnswersError;

    // 获取投票统计
    const { data: voteStats, error: voteError } = await supabase
      .from('community_interactions')
      .select('interaction_type')
      .eq('user_id', userId)
      .in('interaction_type', ['upvote', 'downvote']);

    if (voteError) throw voteError;

    const votesGiven = voteStats?.length || 0;
    const upvotesGiven = voteStats?.filter(v => v.interaction_type === 'upvote').length || 0;
    const downvotesGiven = voteStats?.filter(v => v.interaction_type === 'downvote').length || 0;

    // 获取收到的投票统计
    const { data: receivedVotes, error: receivedError } = await supabase
      .from('community_interactions')
      .select(`
        interaction_type,
        community_questions!inner(author_id),
        community_answers!inner(author_id)
      `)
      .or(`community_questions.author_id.eq.${userId},community_answers.author_id.eq.${userId}`)
      .in('interaction_type', ['upvote', 'downvote']);

    if (receivedError) throw receivedError;

    const votesReceived = receivedVotes?.length || 0;
    const upvotesReceived = receivedVotes?.filter(v => v.interaction_type === 'upvote').length || 0;
    const downvotesReceived = receivedVotes?.filter(v => v.interaction_type === 'downvote').length || 0;

    // 获取徽章统计
    const { count: badgesCount, error: badgesError } = await supabase
      .from('user_badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (badgesError) throw badgesError;

    // 计算活跃天数
    const { data: activityDays, error: activityError } = await supabase
      .from('reputation_history')
      .select('created_at')
      .eq('user_id', userId);

    if (activityError) throw activityError;

    const uniqueDays = new Set(
      activityDays?.map(a => new Date(a.created_at).toDateString()) || []
    ).size;

    return {
      questions_count: questionsCount || 0,
      answers_count: answersCount || 0,
      best_answers_count: bestAnswersCount || 0,
      votes_given: votesGiven,
      upvotes_given: upvotesGiven,
      downvotes_given: downvotesGiven,
      votes_received: votesReceived,
      upvotes_received: upvotesReceived,
      downvotes_received: downvotesReceived,
      badges_count: badgesCount || 0,
      active_days: uniqueDays,
      total_contributions: (questionsCount || 0) + (answersCount || 0),
      helpfulness_ratio: answersCount > 0 ? Math.round((bestAnswersCount / answersCount) * 100) : 0,
      vote_ratio: votesReceived > 0 ? Math.round((upvotesReceived / votesReceived) * 100) : 0
    };

  } catch (error) {
    console.error('Get user statistics error:', error);
    return {
      questions_count: 0,
      answers_count: 0,
      best_answers_count: 0,
      votes_given: 0,
      votes_received: 0,
      badges_count: 0,
      active_days: 0,
      total_contributions: 0,
      helpfulness_ratio: 0,
      vote_ratio: 0
    };
  }
}

// 获取用户最近活动
async function getUserRecentActivity(userId, limit = 20) {
  try {
    const activities = [];

    // 获取最近的问题
    const { data: recentQuestions, error: questionsError } = await supabase
      .from('community_questions')
      .select('id, title, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4));

    if (!questionsError && recentQuestions) {
      activities.push(...recentQuestions.map(q => ({
        type: 'question_posted',
        content_id: q.id,
        content_title: q.title,
        created_at: q.created_at
      })));
    }

    // 获取最近的回答
    const { data: recentAnswers, error: answersError } = await supabase
      .from('community_answers')
      .select(`
        id, content, created_at, is_best_answer,
        community_questions!inner(id, title)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4));

    if (!answersError && recentAnswers) {
      activities.push(...recentAnswers.map(a => ({
        type: a.is_best_answer ? 'best_answer' : 'answer_posted',
        content_id: a.id,
        content_title: a.community_questions.title,
        content_preview: a.content.substring(0, 100) + '...',
        created_at: a.created_at
      })));
    }

    // 获取最近的徽章
    const { data: recentBadges, error: badgesError } = await supabase
      .from('user_badges')
      .select(`
        id, earned_at,
        badge_definition:badge_definitions(
          id, name, description, icon_url
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(Math.floor(limit / 4));

    if (!badgesError && recentBadges) {
      activities.push(...recentBadges.map(b => ({
        type: 'badge_earned',
        content_id: b.id,
        content_title: b.badge_definition.name,
        content_description: b.badge_definition.description,
        created_at: b.earned_at
      })));
    }

    // 获取等级提升记录
    const { data: levelUps, error: levelError } = await supabase
      .from('reputation_history')
      .select('created_at, metadata')
      .eq('user_id', userId)
      .eq('action_type', 'LEVEL_UP')
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4));

    if (!levelError && levelUps) {
      activities.push(...levelUps.map(l => ({
        type: 'level_up',
        content_title: `升级到 ${l.metadata?.new_level?.name || '新等级'}`,
        created_at: l.created_at
      })));
    }

    // 按时间排序并限制数量
    return activities
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

  } catch (error) {
    console.error('Get user recent activity error:', error);
    return [];
  }
}

// 检查档案查看权限
async function checkProfileViewPermission(viewerId, targetUserId) {
  try {
    // 自己的档案总是可以查看
    if (viewerId === targetUserId) {
      return true;
    }

    // 获取目标用户的隐私设置
    const { data: targetProfile, error } = await supabase
      .from('user_community_profiles')
      .select('visibility')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const visibility = targetProfile?.visibility || 'public';

    // 公开档案总是可以查看
    if (visibility === 'public') {
      return true;
    }

    // 私有档案只有管理员可以查看
    if (visibility === 'private') {
      const viewerProfile = await getUserCommunityProfile(viewerId);
      return ['admin', 'moderator'].includes(viewerProfile.role);
    }

    // 朋友可见档案（暂时按公开处理，后续可扩展好友系统）
    if (visibility === 'friends_only') {
      return true; // 暂时允许查看
    }

    return false;

  } catch (error) {
    console.error('Check profile view permission error:', error);
    return false;
  }
}

// 验证档案更新数据
function validateProfileUpdates(updates) {
  const errors = [];
  const validatedData = {};
  const profileUpdates = {};

  // 验证可更新的字段
  const allowedFields = [
    'bio', 'location', 'website', 'twitter', 'github',
    'visibility', 'email_notifications', 'push_notifications',
    'preferred_subjects', 'learning_goals', 'expertise_areas'
  ];

  const profileFields = ['display_name', 'bio', 'avatar_url'];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      // 验证特定字段
      if (key === 'website' && value && !isValidUrl(value)) {
        errors.push(`Invalid website URL: ${value}`);
        continue;
      }

      if (key === 'visibility' && !Object.values(PROFILE_CONFIG.VISIBILITY).includes(value)) {
        errors.push(`Invalid visibility setting: ${value}`);
        continue;
      }

      if (key === 'bio' && value && value.length > 500) {
        errors.push('Bio must be less than 500 characters');
        continue;
      }

      validatedData[key] = value;
    } else if (profileFields.includes(key)) {
      profileUpdates[key] = value;
    } else {
      errors.push(`Field not allowed for update: ${key}`);
    }
  }

  return {
    data: validatedData,
    profileUpdates: Object.keys(profileUpdates).length > 0 ? profileUpdates : null,
    errors
  };
}

// 验证档案创建数据
function validateProfileCreation(data) {
  const errors = [];
  const validatedData = {
    role: 'student',
    reputation_score: 0,
    level: 'NEWCOMER',
    visibility: 'public',
    email_notifications: true,
    push_notifications: true,
    ...data
  };

  // 验证角色
  if (!Object.values(PROFILE_CONFIG.ROLES).includes(validatedData.role)) {
    errors.push(`Invalid role: ${validatedData.role}`);
  }

  // 验证可见性
  if (!Object.values(PROFILE_CONFIG.VISIBILITY).includes(validatedData.visibility)) {
    errors.push(`Invalid visibility: ${validatedData.visibility}`);
  }

  return {
    data: validatedData,
    errors
  };
}

// 计算档案完整度
function calculateProfileCompleteness(profile) {
  const fields = [
    'bio', 'location', 'website', 'preferred_subjects',
    'learning_goals', 'expertise_areas'
  ];
  
  const profileFields = [
    'display_name', 'avatar_url'
  ];

  let completed = 0;
  const total = fields.length + profileFields.length;

  // 检查社区档案字段
  fields.forEach(field => {
    if (profile[field] && profile[field].toString().trim()) {
      completed++;
    }
  });

  // 检查基础档案字段
  if (profile.user_profiles) {
    profileFields.forEach(field => {
      if (profile.user_profiles[field] && profile.user_profiles[field].toString().trim()) {
        completed++;
      }
    });
  }

  return {
    percentage: Math.round((completed / total) * 100),
    completed_fields: completed,
    total_fields: total
  };
}

// 创建默认档案
async function createDefaultProfile(userId) {
  try {
    const { data: newProfile, error } = await supabase
      .from('user_community_profiles')
      .insert({
        user_id: userId,
        role: 'student',
        reputation_score: 0,
        level: 'NEWCOMER',
        visibility: 'public',
        email_notifications: true,
        push_notifications: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        user_profiles!inner(
          id, username, display_name, avatar_url, bio
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return newProfile;

  } catch (error) {
    console.error('Create default profile error:', error);
    throw error;
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
      role: 'student',
      reputation_score: 0,
      level: 'NEWCOMER'
    };

  } catch (error) {
    console.error('Get user community profile error:', error);
    throw error;
  }
}

// 验证URL格式
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// 导出配置供其他模块使用
export { PROFILE_CONFIG };