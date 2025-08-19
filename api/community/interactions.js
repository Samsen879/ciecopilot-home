// 社区互动系统API端点
// 处理投票、收藏、举报等用户互动功能

import { createClient } from '@supabase/supabase-js';
import { checkAndAwardBadges } from './badges.js';
import { updateUserReputation, REPUTATION_CONFIG } from './reputation.js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 互动系统配置
const INTERACTION_CONFIG = {
  MIN_REPUTATION_TO_VOTE: 10,
  MIN_REPUTATION_TO_REPORT: 5,
  MAX_REPORTS_PER_USER_PER_DAY: 10,
  REPUTATION_REWARDS: {
    UPVOTE_RECEIVED: 5,
    DOWNVOTE_RECEIVED: -2,
    UPVOTE_GIVEN: 1,
    DOWNVOTE_GIVEN: -1
  },
  VALID_INTERACTIONS: {
    question: ['upvote', 'downvote', 'bookmark', 'report'],
    answer: ['upvote', 'downvote', 'bookmark', 'report']
  },
  VALID_REPORT_REASONS: [
    'spam',
    'inappropriate',
    'harassment',
    'misinformation',
    'copyright',
    'other'
  ]
};

// 主要的互动API处理函数
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
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
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
        return await handleGetInteractions(req, res, user);
      case 'POST':
        return await handleCreateInteraction(req, res, user);
      case 'DELETE':
        return await handleDeleteInteraction(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Community interactions API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取用户互动记录
async function handleGetInteractions(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { 
      content_type,
      content_id,
      interaction_type,
      page = 1,
      limit = 20
    } = req.query;

    // 验证分页参数
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 构建查询
    let query = supabase
      .from('community_interactions')
      .select(`
        id, content_type, content_id, interaction_type,
        metadata, created_at,
        content_question:community_questions!content_id(
          id, title, subject_code
        ),
        content_answer:community_answers!content_id(
          id, content, question_id
        )
      `)
      .eq('user_id', user.id);

    // 应用过滤条件
    if (content_type) {
      query = query.eq('content_type', content_type);
    }

    if (content_id) {
      query = query.eq('content_id', content_id);
    }

    if (interaction_type) {
      query = query.eq('interaction_type', interaction_type);
    }

    // 排序和分页
    query = query.order('created_at', { ascending: false })
                 .range(offset, offset + limitNum - 1);

    // 执行查询
    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      throw interactionsError;
    }

    // 获取总数
    let countQuery = supabase
      .from('community_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (content_type) {
      countQuery = countQuery.eq('content_type', content_type);
    }
    if (content_id) {
      countQuery = countQuery.eq('content_id', content_id);
    }
    if (interaction_type) {
      countQuery = countQuery.eq('interaction_type', interaction_type);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        interactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          total_pages: totalPages
        }
      },
      response_time: Date.now() - startTime
    });

  } catch (error) {
    console.error('Get interactions error:', error);
    return res.status(500).json({
      error: 'Failed to get interactions',
      code: 'INTERACTIONS_ERROR',
      message: error.message
    });
  }
}

// 创建新的互动
async function handleCreateInteraction(req, res, user) {
  try {
    const { content_type, content_id, interaction_type, metadata = {} } = req.body;

    // 验证必需参数
    if (!content_type || !content_id || !interaction_type) {
      return res.status(400).json({
        error: 'content_type, content_id, and interaction_type are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 验证内容类型和互动类型
    if (!INTERACTION_CONFIG.VALID_INTERACTIONS[content_type]) {
      return res.status(400).json({
        error: 'Invalid content_type',
        code: 'INVALID_CONTENT_TYPE',
        valid_types: Object.keys(INTERACTION_CONFIG.VALID_INTERACTIONS)
      });
    }

    if (!INTERACTION_CONFIG.VALID_INTERACTIONS[content_type].includes(interaction_type)) {
      return res.status(400).json({
        error: 'Invalid interaction_type for this content_type',
        code: 'INVALID_INTERACTION_TYPE',
        valid_types: INTERACTION_CONFIG.VALID_INTERACTIONS[content_type]
      });
    }

    // 检查内容是否存在
    const contentExists = await checkContentExists(content_type, content_id);
    if (!contentExists) {
      return res.status(404).json({
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    // 检查用户权限
    const userProfile = await getUserCommunityProfile(user.id);
    
    if (['upvote', 'downvote'].includes(interaction_type)) {
      if (userProfile.reputation_score < INTERACTION_CONFIG.MIN_REPUTATION_TO_VOTE) {
        return res.status(403).json({
          error: 'Insufficient reputation to vote',
          code: 'INSUFFICIENT_REPUTATION',
          required_reputation: INTERACTION_CONFIG.MIN_REPUTATION_TO_VOTE
        });
      }

      // 检查用户是否是内容作者（不能给自己的内容投票）
      const isAuthor = await checkIfUserIsContentAuthor(user.id, content_type, content_id);
      if (isAuthor) {
        return res.status(400).json({
          error: 'Cannot vote on your own content',
          code: 'SELF_VOTE_NOT_ALLOWED'
        });
      }
    }

    if (interaction_type === 'report') {
      if (userProfile.reputation_score < INTERACTION_CONFIG.MIN_REPUTATION_TO_REPORT) {
        return res.status(403).json({
          error: 'Insufficient reputation to report',
          code: 'INSUFFICIENT_REPUTATION',
          required_reputation: INTERACTION_CONFIG.MIN_REPUTATION_TO_REPORT
        });
      }

      // 验证举报原因
      if (!metadata.reason || !INTERACTION_CONFIG.VALID_REPORT_REASONS.includes(metadata.reason)) {
        return res.status(400).json({
          error: 'Invalid or missing report reason',
          code: 'INVALID_REPORT_REASON',
          valid_reasons: INTERACTION_CONFIG.VALID_REPORT_REASONS
        });
      }

      // 检查用户今日举报次数
      const todayReportCount = await getUserTodayReportCount(user.id);
      if (todayReportCount >= INTERACTION_CONFIG.MAX_REPORTS_PER_USER_PER_DAY) {
        return res.status(429).json({
          error: 'Daily report limit exceeded',
          code: 'REPORT_LIMIT_EXCEEDED',
          max_reports: INTERACTION_CONFIG.MAX_REPORTS_PER_USER_PER_DAY
        });
      }
    }

    // 检查是否已存在相同的互动
    const existingInteraction = await getExistingInteraction(user.id, content_type, content_id, interaction_type);
    
    if (existingInteraction) {
      // 对于投票，如果已存在相同投票，则取消；如果是不同投票，则更新
      if (['upvote', 'downvote'].includes(interaction_type)) {
        if (existingInteraction.interaction_type === interaction_type) {
          // 取消投票
          return await handleDeleteInteractionById(existingInteraction.id, user, res);
        } else {
          // 更新投票类型
          return await updateInteractionType(existingInteraction.id, interaction_type, user, res);
        }
      } else {
        return res.status(400).json({
          error: 'Interaction already exists',
          code: 'INTERACTION_EXISTS'
        });
      }
    }

    // 创建新的互动
    const interactionData = {
      user_id: user.id,
      content_type,
      content_id,
      interaction_type,
      metadata,
      created_at: new Date().toISOString()
    };

    const { data: interaction, error: createError } = await supabase
      .from('community_interactions')
      .insert(interactionData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // 更新内容的投票分数
    if (['upvote', 'downvote'].includes(interaction_type)) {
      await updateContentVoteScore(content_type, content_id, interaction_type);
      
      // 更新内容作者的声誉
      const contentAuthorId = await getContentAuthorId(content_type, content_id);
      if (contentAuthorId) {
        const reputationChange = interaction_type === 'upvote' 
          ? INTERACTION_CONFIG.REPUTATION_REWARDS.UPVOTE_RECEIVED
          : INTERACTION_CONFIG.REPUTATION_REWARDS.DOWNVOTE_RECEIVED;
        
        await updateUserReputationLocal(contentAuthorId, reputationChange);
        
        // 检查并颁发徽章给内容作者
        try {
          await checkAndAwardBadges(contentAuthorId);
        } catch (badgeError) {
          console.error('Badge check error for content author:', badgeError);
          // 不影响主流程
        }
      }

      // 更新投票者的声誉
      const voterReputationChange = interaction_type === 'upvote'
        ? INTERACTION_CONFIG.REPUTATION_REWARDS.UPVOTE_GIVEN
        : INTERACTION_CONFIG.REPUTATION_REWARDS.DOWNVOTE_GIVEN;
      
      await updateUserReputationLocal(user.id, voterReputationChange);
      
      // 检查并颁发徽章给投票者
      try {
        await checkAndAwardBadges(user.id);
      } catch (badgeError) {
        console.error('Badge check error for voter:', badgeError);
        // 不影响主流程
      }
    }

    // 如果是举报，创建举报记录
    if (interaction_type === 'report') {
      await createReportRecord({
        reporter_id: user.id,
        content_type,
        content_id,
        reason: metadata.reason,
        description: metadata.description || '',
        status: 'pending'
      });
    }

    return res.status(201).json({
      success: true,
      data: interaction,
      message: 'Interaction created successfully'
    });

  } catch (error) {
    console.error('Create interaction error:', error);
    return res.status(500).json({
      error: 'Failed to create interaction',
      code: 'CREATE_ERROR',
      message: error.message
    });
  }
}

// 删除互动
async function handleDeleteInteraction(req, res, user) {
  try {
    const { content_type, content_id, interaction_type } = req.query;

    if (!content_type || !content_id || !interaction_type) {
      return res.status(400).json({
        error: 'content_type, content_id, and interaction_type are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 查找现有互动
    const existingInteraction = await getExistingInteraction(user.id, content_type, content_id, interaction_type);
    
    if (!existingInteraction) {
      return res.status(404).json({
        error: 'Interaction not found',
        code: 'INTERACTION_NOT_FOUND'
      });
    }

    return await handleDeleteInteractionById(existingInteraction.id, user, res);

  } catch (error) {
    console.error('Delete interaction error:', error);
    return res.status(500).json({
      error: 'Failed to delete interaction',
      code: 'DELETE_ERROR',
      message: error.message
    });
  }
}

// 通过ID删除互动
async function handleDeleteInteractionById(interactionId, user, res) {
  try {
    // 获取互动详情
    const { data: interaction, error: getError } = await supabase
      .from('community_interactions')
      .select('*')
      .eq('id', interactionId)
      .eq('user_id', user.id)
      .single();

    if (getError || !interaction) {
      return res.status(404).json({
        error: 'Interaction not found',
        code: 'INTERACTION_NOT_FOUND'
      });
    }

    // 删除互动
    const { error: deleteError } = await supabase
      .from('community_interactions')
      .delete()
      .eq('id', interactionId);

    if (deleteError) {
      throw deleteError;
    }

    // 更新内容的投票分数
    if (['upvote', 'downvote'].includes(interaction.interaction_type)) {
      const reverseType = interaction.interaction_type === 'upvote' ? 'downvote' : 'upvote';
      await updateContentVoteScore(interaction.content_type, interaction.content_id, reverseType);
      
      // 更新内容作者的声誉（反向操作）
      const contentAuthorId = await getContentAuthorId(interaction.content_type, interaction.content_id);
      if (contentAuthorId) {
        const reputationChange = interaction.interaction_type === 'upvote' 
          ? -INTERACTION_CONFIG.REPUTATION_REWARDS.UPVOTE_RECEIVED
          : -INTERACTION_CONFIG.REPUTATION_REWARDS.DOWNVOTE_RECEIVED;
        
        await updateUserReputationLocal(contentAuthorId, reputationChange);
      }

      // 更新投票者的声誉（反向操作）
      const voterReputationChange = interaction.interaction_type === 'upvote'
        ? -INTERACTION_CONFIG.REPUTATION_REWARDS.UPVOTE_GIVEN
        : -INTERACTION_CONFIG.REPUTATION_REWARDS.DOWNVOTE_GIVEN;
      
      await updateUserReputationLocal(user.id, voterReputationChange);
    }

    return res.status(200).json({
      success: true,
      message: 'Interaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete interaction by ID error:', error);
    throw error;
  }
}

// 更新互动类型（用于投票切换）
async function updateInteractionType(interactionId, newType, user, res) {
  try {
    // 获取现有互动
    const { data: oldInteraction, error: getError } = await supabase
      .from('community_interactions')
      .select('*')
      .eq('id', interactionId)
      .single();

    if (getError || !oldInteraction) {
      throw new Error('Interaction not found');
    }

    // 更新互动类型
    const { data: updatedInteraction, error: updateError } = await supabase
      .from('community_interactions')
      .update({ 
        interaction_type: newType,
        created_at: new Date().toISOString()
      })
      .eq('id', interactionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 更新内容的投票分数（需要考虑从旧类型到新类型的变化）
    await updateContentVoteScoreForTypeChange(
      oldInteraction.content_type, 
      oldInteraction.content_id, 
      oldInteraction.interaction_type, 
      newType
    );

    // 更新声誉分数
    const contentAuthorId = await getContentAuthorId(oldInteraction.content_type, oldInteraction.content_id);
    if (contentAuthorId) {
      // 撤销旧的声誉变化
      const oldReputationChange = oldInteraction.interaction_type === 'upvote' 
        ? -INTERACTION_CONFIG.REPUTATION_REWARDS.UPVOTE_RECEIVED
        : -INTERACTION_CONFIG.REPUTATION_REWARDS.DOWNVOTE_RECEIVED;
      
      // 应用新的声誉变化
      const newReputationChange = newType === 'upvote'
        ? INTERACTION_CONFIG.REPUTATION_REWARDS.UPVOTE_RECEIVED
        : INTERACTION_CONFIG.REPUTATION_REWARDS.DOWNVOTE_RECEIVED;
      
      await updateUserReputationLocal(contentAuthorId, oldReputationChange + newReputationChange);
    }

    return res.status(200).json({
      success: true,
      data: updatedInteraction,
      message: 'Interaction updated successfully'
    });

  } catch (error) {
    console.error('Update interaction type error:', error);
    throw error;
  }
}

// 检查内容是否存在
async function checkContentExists(contentType, contentId) {
  try {
    const tableName = contentType === 'question' ? 'community_questions' : 'community_answers';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', contentId)
      .single();

    return !error && data;

  } catch (error) {
    console.error('Check content exists error:', error);
    return false;
  }
}

// 检查用户是否是内容作者
async function checkIfUserIsContentAuthor(userId, contentType, contentId) {
  try {
    const tableName = contentType === 'question' ? 'community_questions' : 'community_answers';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('author_id')
      .eq('id', contentId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.author_id === userId;

  } catch (error) {
    console.error('Check if user is content author error:', error);
    return false;
  }
}

// 获取现有互动
async function getExistingInteraction(userId, contentType, contentId, interactionType) {
  try {
    const { data, error } = await supabase
      .from('community_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .in('interaction_type', ['upvote', 'downvote']) // 只检查投票类型的冲突
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;

  } catch (error) {
    console.error('Get existing interaction error:', error);
    return null;
  }
}

// 获取用户今日举报次数
async function getUserTodayReportCount(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from('community_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('interaction_type', 'report')
      .gte('created_at', today.toISOString());

    if (error) {
      throw error;
    }

    return count || 0;

  } catch (error) {
    console.error('Get user today report count error:', error);
    return 0;
  }
}

// 更新内容投票分数
async function updateContentVoteScore(contentType, contentId, voteType) {
  try {
    const tableName = contentType === 'question' ? 'community_questions' : 'community_answers';
    const increment = voteType === 'upvote' ? 1 : -1;
    
    await supabase
      .from(tableName)
      .update({ 
        vote_score: supabase.sql`COALESCE(vote_score, 0) + ${increment}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId);

  } catch (error) {
    console.error('Update content vote score error:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

// 更新内容投票分数（类型变化）
async function updateContentVoteScoreForTypeChange(contentType, contentId, oldType, newType) {
  try {
    const tableName = contentType === 'question' ? 'community_questions' : 'community_answers';
    
    // 计算分数变化：撤销旧投票，应用新投票
    let scoreChange = 0;
    if (oldType === 'upvote') scoreChange -= 1;
    if (oldType === 'downvote') scoreChange += 1;
    if (newType === 'upvote') scoreChange += 1;
    if (newType === 'downvote') scoreChange -= 1;
    
    await supabase
      .from(tableName)
      .update({ 
        vote_score: supabase.sql`COALESCE(vote_score, 0) + ${scoreChange}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId);

  } catch (error) {
    console.error('Update content vote score for type change error:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

// 获取内容作者ID
async function getContentAuthorId(contentType, contentId) {
  try {
    const tableName = contentType === 'question' ? 'community_questions' : 'community_answers';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('author_id')
      .eq('id', contentId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.author_id;

  } catch (error) {
    console.error('Get content author ID error:', error);
    return null;
  }
}

// 创建举报记录
async function createReportRecord(reportData) {
  try {
    const { error } = await supabase
      .from('community_reports')
      .insert({
        ...reportData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error('Create report record error:', error);
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
      display_name: 'Anonymous',
      reputation_score: 0,
      role: 'student',
      questions_count: 0,
      answers_count: 0,
      best_answers_count: 0
    };

  } catch (error) {
    console.error('Get user community profile error:', error);
    throw error;
  }
}

// 更新用户声誉（使用reputation.js中的函数）
async function updateUserReputationLocal(userId, increment) {
  try {
    // 使用reputation.js中的updateUserReputation函数
    await updateUserReputation({
      userId: userId,
      pointsChange: increment,
      actionType: 'INTERACTION',
      reason: 'Community interaction',
      triggeredBy: userId
    });
  } catch (error) {
    console.error('Error updating user reputation:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

// 导出配置供其他模块使用
export { INTERACTION_CONFIG };