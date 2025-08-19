// 社区徽章系统API端点
// 处理徽章获取、颁发、进度跟踪等功能

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 徽章系统配置
const BADGE_CONFIG = {
  CATEGORIES: {
    CONTRIBUTION: 'contribution',
    QUALITY: 'quality', 
    MILESTONE: 'milestone',
    SPECIAL: 'special',
    SUBJECT: 'subject'
  },
  RARITIES: {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
  },
  BADGE_DEFINITIONS: {
    // 贡献类徽章
    FIRST_QUESTION: {
      id: 'first_question',
      name: '初次提问',
      description: '发布第一个问题',
      category: 'contribution',
      rarity: 'common',
      icon: '❓',
      criteria: { questions_count: 1 }
    },
    FIRST_ANSWER: {
      id: 'first_answer',
      name: '初次回答',
      description: '回答第一个问题',
      category: 'contribution',
      rarity: 'common',
      icon: '💬',
      criteria: { answers_count: 1 }
    },
    ACTIVE_CONTRIBUTOR: {
      id: 'active_contributor',
      name: '活跃贡献者',
      description: '发布10个问题或回答',
      category: 'contribution',
      rarity: 'uncommon',
      icon: '🔥',
      criteria: { total_posts: 10 }
    },
    PROLIFIC_CONTRIBUTOR: {
      id: 'prolific_contributor',
      name: '多产贡献者',
      description: '发布50个问题或回答',
      category: 'contribution',
      rarity: 'rare',
      icon: '⭐',
      criteria: { total_posts: 50 }
    },
    
    // 质量类徽章
    HELPFUL_ANSWER: {
      id: 'helpful_answer',
      name: '有用回答',
      description: '获得第一个最佳答案',
      category: 'quality',
      rarity: 'uncommon',
      icon: '✅',
      criteria: { best_answers_count: 1 }
    },
    EXPERT_HELPER: {
      id: 'expert_helper',
      name: '专家助手',
      description: '获得5个最佳答案',
      category: 'quality',
      rarity: 'rare',
      icon: '🎯',
      criteria: { best_answers_count: 5 }
    },
    MASTER_EDUCATOR: {
      id: 'master_educator',
      name: '教育大师',
      description: '获得20个最佳答案',
      category: 'quality',
      rarity: 'epic',
      icon: '👑',
      criteria: { best_answers_count: 20 }
    },
    
    // 里程碑徽章
    REPUTATION_100: {
      id: 'reputation_100',
      name: '声誉新星',
      description: '达到100声誉点',
      category: 'milestone',
      rarity: 'uncommon',
      icon: '🌟',
      criteria: { reputation_score: 100 }
    },
    REPUTATION_500: {
      id: 'reputation_500',
      name: '声誉专家',
      description: '达到500声誉点',
      category: 'milestone',
      rarity: 'rare',
      icon: '💎',
      criteria: { reputation_score: 500 }
    },
    REPUTATION_1000: {
      id: 'reputation_1000',
      name: '声誉大师',
      description: '达到1000声誉点',
      category: 'milestone',
      rarity: 'epic',
      icon: '🏆',
      criteria: { reputation_score: 1000 }
    },
    
    // 学科类徽章
    PHYSICS_EXPERT: {
      id: 'physics_expert',
      name: '物理专家',
      description: '在物理学科获得10个最佳答案',
      category: 'subject',
      rarity: 'rare',
      icon: '⚛️',
      criteria: { subject_best_answers: { subject: 'physics', count: 10 } }
    },
    MATH_EXPERT: {
      id: 'math_expert',
      name: '数学专家',
      description: '在数学学科获得10个最佳答案',
      category: 'subject',
      rarity: 'rare',
      icon: '📐',
      criteria: { subject_best_answers: { subject: 'mathematics', count: 10 } }
    },
    
    // 特殊徽章
    EARLY_ADOPTER: {
      id: 'early_adopter',
      name: '早期用户',
      description: '平台早期注册用户',
      category: 'special',
      rarity: 'legendary',
      icon: '🚀',
      criteria: { manual_award: true }
    }
  }
};

// 主要的徽章API处理函数
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
    if (!['GET', 'POST'].includes(req.method)) {
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
        return await handleGetBadges(req, res, user);
      case 'POST':
        return await handleAwardBadge(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Community badges API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取用户徽章
async function handleGetBadges(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { 
      user_id = user.id,
      category,
      rarity,
      include_progress = 'false'
    } = req.query;

    // 获取用户已获得的徽章
    let badgeQuery = supabase
      .from('user_badges')
      .select(`
        id, badge_id, earned_at, progress,
        badge_definition:badge_definitions(
          id, name, description, category, rarity, icon_url, criteria
        )
      `)
      .eq('user_id', user_id)
      .order('earned_at', { ascending: false });

    if (category) {
      badgeQuery = badgeQuery.eq('badge_definition.category', category);
    }

    if (rarity) {
      badgeQuery = badgeQuery.eq('badge_definition.rarity', rarity);
    }

    const { data: userBadges, error: badgesError } = await badgeQuery;

    if (badgesError) {
      throw badgesError;
    }

    // 如果需要包含进度信息，获取所有可用徽章和进度
    let availableBadges = [];
    let badgeProgress = {};
    
    if (include_progress === 'true') {
      // 获取所有徽章定义
      const { data: allBadges, error: allBadgesError } = await supabase
        .from('badge_definitions')
        .select('*');

      if (allBadgesError) {
        throw allBadgesError;
      }

      availableBadges = allBadges;
      
      // 计算每个徽章的进度
      const userStats = await getUserStats(user_id);
      badgeProgress = await calculateBadgeProgress(userStats, allBadges, userBadges);
    }

    return res.status(200).json({
      success: true,
      data: {
        earned_badges: userBadges,
        available_badges: availableBadges,
        badge_progress: badgeProgress,
        statistics: {
          total_earned: userBadges.length,
          by_category: groupBadgesByCategory(userBadges),
          by_rarity: groupBadgesByRarity(userBadges)
        }
      },
      response_time: Date.now() - startTime
    });

  } catch (error) {
    console.error('Get badges error:', error);
    return res.status(500).json({
      error: 'Failed to get badges',
      code: 'BADGES_ERROR',
      message: error.message
    });
  }
}

// 颁发徽章（管理员功能或自动触发）
async function handleAwardBadge(req, res, user) {
  try {
    const { user_id, badge_id, manual_award = false } = req.body;

    // 验证必需参数
    if (!user_id || !badge_id) {
      return res.status(400).json({
        error: 'user_id and badge_id are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 检查权限（只有管理员可以手动颁发徽章）
    if (manual_award) {
      const userProfile = await getUserCommunityProfile(user.id);
      if (!['admin', 'moderator'].includes(userProfile.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions to manually award badges',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }

    // 检查徽章是否存在
    const { data: badgeDefinition, error: badgeError } = await supabase
      .from('badge_definitions')
      .select('*')
      .eq('id', badge_id)
      .single();

    if (badgeError || !badgeDefinition) {
      return res.status(404).json({
        error: 'Badge not found',
        code: 'BADGE_NOT_FOUND'
      });
    }

    // 检查用户是否已经拥有该徽章
    const { data: existingBadge, error: existingError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', user_id)
      .eq('badge_id', badge_id)
      .single();

    if (existingBadge) {
      return res.status(400).json({
        error: 'User already has this badge',
        code: 'BADGE_ALREADY_EARNED'
      });
    }

    // 如果不是手动颁发，检查是否满足条件
    if (!manual_award) {
      const userStats = await getUserStats(user_id);
      const meetsRequirements = await checkBadgeRequirements(userStats, badgeDefinition);
      
      if (!meetsRequirements) {
        return res.status(400).json({
          error: 'User does not meet badge requirements',
          code: 'REQUIREMENTS_NOT_MET'
        });
      }
    }

    // 颁发徽章
    const { data: newBadge, error: awardError } = await supabase
      .from('user_badges')
      .insert({
        user_id,
        badge_id,
        earned_at: new Date().toISOString(),
        awarded_by: manual_award ? user.id : null
      })
      .select(`
        id, badge_id, earned_at,
        badge_definition:badge_definitions(
          id, name, description, category, rarity, icon_url
        )
      `)
      .single();

    if (awardError) {
      throw awardError;
    }

    // 更新用户统计
    await updateUserBadgeStats(user_id);

    return res.status(201).json({
      success: true,
      data: newBadge,
      message: 'Badge awarded successfully'
    });

  } catch (error) {
    console.error('Award badge error:', error);
    return res.status(500).json({
      error: 'Failed to award badge',
      code: 'AWARD_ERROR',
      message: error.message
    });
  }
}

// 获取用户统计数据
async function getUserStats(userId) {
  try {
    // 获取用户社区档案
    const { data: profile, error: profileError } = await supabase
      .from('user_community_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // 获取学科专业统计
    const { data: subjectStats, error: subjectError } = await supabase
      .from('community_answers')
      .select(`
        community_questions!inner(
          subject_code
        )
      `)
      .eq('author_id', userId)
      .eq('is_best_answer', true);

    if (subjectError) {
      throw subjectError;
    }

    // 统计各学科的最佳答案数量
    const subjectBestAnswers = {};
    subjectStats?.forEach(answer => {
      const subject = answer.community_questions.subject_code;
      subjectBestAnswers[subject] = (subjectBestAnswers[subject] || 0) + 1;
    });

    return {
      ...profile,
      total_posts: (profile?.questions_count || 0) + (profile?.answers_count || 0),
      subject_best_answers: subjectBestAnswers
    };

  } catch (error) {
    console.error('Get user stats error:', error);
    return {
      reputation_score: 0,
      questions_count: 0,
      answers_count: 0,
      best_answers_count: 0,
      total_posts: 0,
      subject_best_answers: {}
    };
  }
}

// 检查徽章要求
async function checkBadgeRequirements(userStats, badgeDefinition) {
  try {
    const criteria = badgeDefinition.criteria;
    
    // 检查各种条件
    if (criteria.questions_count && userStats.questions_count < criteria.questions_count) {
      return false;
    }
    
    if (criteria.answers_count && userStats.answers_count < criteria.answers_count) {
      return false;
    }
    
    if (criteria.best_answers_count && userStats.best_answers_count < criteria.best_answers_count) {
      return false;
    }
    
    if (criteria.reputation_score && userStats.reputation_score < criteria.reputation_score) {
      return false;
    }
    
    if (criteria.total_posts && userStats.total_posts < criteria.total_posts) {
      return false;
    }
    
    if (criteria.subject_best_answers) {
      const { subject, count } = criteria.subject_best_answers;
      const userSubjectCount = userStats.subject_best_answers[subject] || 0;
      if (userSubjectCount < count) {
        return false;
      }
    }
    
    if (criteria.manual_award) {
      return false; // 手动颁发的徽章不能自动获得
    }
    
    return true;
    
  } catch (error) {
    console.error('Check badge requirements error:', error);
    return false;
  }
}

// 计算徽章进度
async function calculateBadgeProgress(userStats, allBadges, earnedBadges) {
  const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_id));
  const progress = {};
  
  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) {
      progress[badge.id] = { current: 1, required: 1, percentage: 100 };
      continue;
    }
    
    const criteria = badge.criteria;
    let current = 0;
    let required = 1;
    
    if (criteria.questions_count) {
      current = userStats.questions_count;
      required = criteria.questions_count;
    } else if (criteria.answers_count) {
      current = userStats.answers_count;
      required = criteria.answers_count;
    } else if (criteria.best_answers_count) {
      current = userStats.best_answers_count;
      required = criteria.best_answers_count;
    } else if (criteria.reputation_score) {
      current = userStats.reputation_score;
      required = criteria.reputation_score;
    } else if (criteria.total_posts) {
      current = userStats.total_posts;
      required = criteria.total_posts;
    } else if (criteria.subject_best_answers) {
      const { subject, count } = criteria.subject_best_answers;
      current = userStats.subject_best_answers[subject] || 0;
      required = count;
    }
    
    const percentage = Math.min(100, Math.round((current / required) * 100));
    progress[badge.id] = { current, required, percentage };
  }
  
  return progress;
}

// 按类别分组徽章
function groupBadgesByCategory(badges) {
  const grouped = {};
  badges.forEach(badge => {
    const category = badge.badge_definition?.category || 'unknown';
    grouped[category] = (grouped[category] || 0) + 1;
  });
  return grouped;
}

// 按稀有度分组徽章
function groupBadgesByRarity(badges) {
  const grouped = {};
  badges.forEach(badge => {
    const rarity = badge.badge_definition?.rarity || 'unknown';
    grouped[rarity] = (grouped[rarity] || 0) + 1;
  });
  return grouped;
}

// 更新用户徽章统计
async function updateUserBadgeStats(userId) {
  try {
    const { count: badgeCount, error } = await supabase
      .from('user_badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    await supabase
      .from('user_community_profiles')
      .upsert({
        user_id: userId,
        badges_count: badgeCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

  } catch (error) {
    console.error('Update user badge stats error:', error);
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
      role: 'student',
      reputation_score: 0
    };

  } catch (error) {
    console.error('Get user community profile error:', error);
    throw error;
  }
}

// 自动检查并颁发徽章
export async function checkAndAwardBadges(userId) {
  try {
    const userStats = await getUserStats(userId);
    
    // 获取所有徽章定义
    const { data: allBadges, error: badgesError } = await supabase
      .from('badge_definitions')
      .select('*');

    if (badgesError) {
      throw badgesError;
    }

    // 获取用户已有徽章
    const { data: earnedBadges, error: earnedError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (earnedError) {
      throw earnedError;
    }

    const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_id));
    const newBadges = [];

    // 检查每个徽章
    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge.id)) {
        continue; // 已经拥有
      }

      if (await checkBadgeRequirements(userStats, badge)) {
        // 颁发徽章
        const { data: newBadge, error: awardError } = await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id,
            earned_at: new Date().toISOString()
          })
          .select(`
            id, badge_id, earned_at,
            badge_definition:badge_definitions(
              id, name, description, category, rarity, icon_url
            )
          `)
          .single();

        if (!awardError && newBadge) {
          newBadges.push(newBadge);
        }
      }
    }

    // 更新用户徽章统计
    if (newBadges.length > 0) {
      await updateUserBadgeStats(userId);
    }

    return newBadges;

  } catch (error) {
    console.error('Check and award badges error:', error);
    return [];
  }
}

// 导出配置供其他模块使用
export { BADGE_CONFIG };