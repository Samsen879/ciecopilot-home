// 社区回答系统API端点
// 处理问题回答的增删改查和投票操作

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 回答系统配置
const ANSWER_CONFIG = {
  MAX_CONTENT_LENGTH: 10000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_REPUTATION_TO_ANSWER: 0,
  MIN_REPUTATION_TO_VOTE: 10,
  MIN_REPUTATION_TO_MARK_BEST: 50,
  REPUTATION_REWARDS: {
    ANSWER_POSTED: 2,
    ANSWER_UPVOTED: 5,
    ANSWER_DOWNVOTED: -2,
    BEST_ANSWER: 15,
    BEST_ANSWER_REMOVED: -15
  }
};

// 主要的回答API处理函数
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
        return await handleGetAnswers(req, res, user);
      case 'POST':
        return await handleCreateAnswer(req, res, user);
      case 'PUT':
        return await handleUpdateAnswer(req, res, user);
      case 'DELETE':
        return await handleDeleteAnswer(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Community answers API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取回答列表
async function handleGetAnswers(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { 
      answer_id,
      question_id,
      page = 1,
      limit = ANSWER_CONFIG.DEFAULT_PAGE_SIZE,
      sort = 'best_first',
      author_id
    } = req.query;

    // 如果指定了回答ID，获取单个回答详情
    if (answer_id) {
      const answer = await getAnswerById(answer_id, user.id);
      
      if (!answer) {
        return res.status(404).json({
          error: 'Answer not found',
          code: 'ANSWER_NOT_FOUND'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: answer,
        response_time: Date.now() - startTime
      });
    }

    // 验证分页参数
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(ANSWER_CONFIG.MAX_PAGE_SIZE, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 构建查询
    let query = supabase
      .from('community_answers')
      .select(`
        id, content, question_id, author_id, is_best_answer,
        vote_score, created_at, updated_at,
        author:user_community_profiles!author_id(
          display_name, avatar_url, reputation_score, role
        ),
        question:community_questions!question_id(
          id, title, subject_code
        )
      `);

    // 应用过滤条件
    if (question_id) {
      query = query.eq('question_id', question_id);
    }

    if (author_id) {
      query = query.eq('author_id', author_id);
    }

    // 排序
    switch (sort) {
      case 'best_first':
        query = query.order('is_best_answer', { ascending: false })
                    .order('vote_score', { ascending: false })
                    .order('created_at', { ascending: true });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most_voted':
        query = query.order('vote_score', { ascending: false });
        break;
      default:
        query = query.order('is_best_answer', { ascending: false })
                    .order('vote_score', { ascending: false });
    }

    // 获取总数（用于分页）
    let countQuery = supabase
      .from('community_answers')
      .select('*', { count: 'exact', head: true });
    
    if (question_id) {
      countQuery = countQuery.eq('question_id', question_id);
    }
    if (author_id) {
      countQuery = countQuery.eq('author_id', author_id);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    // 应用分页
    query = query.range(offset, offset + limitNum - 1);

    // 执行查询
    const { data: answers, error: answersError } = await query;

    if (answersError) {
      throw answersError;
    }

    // 获取用户对这些回答的投票状态
    const answerIds = answers.map(a => a.id);
    const userVotes = await getUserVotesForAnswers(user.id, answerIds);

    // 合并投票信息
    const answersWithVotes = answers.map(answer => ({
      ...answer,
      user_vote: userVotes[answer.id] || null
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        answers: answersWithVotes,
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
    console.error('Get answers error:', error);
    return res.status(500).json({
      error: 'Failed to get answers',
      code: 'ANSWERS_ERROR',
      message: error.message
    });
  }
}

// 创建新回答
async function handleCreateAnswer(req, res, user) {
  try {
    const { content, question_id } = req.body;

    // 验证必需参数
    if (!content || !question_id) {
      return res.status(400).json({
        error: 'content and question_id are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 验证内容长度
    if (content.length > ANSWER_CONFIG.MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        error: `Content too long. Maximum ${ANSWER_CONFIG.MAX_CONTENT_LENGTH} characters allowed`,
        code: 'CONTENT_TOO_LONG'
      });
    }

    // 检查问题是否存在且状态为开放
    const { data: question, error: questionError } = await supabase
      .from('community_questions')
      .select('id, status, author_id')
      .eq('id', question_id)
      .single();

    if (questionError || !question) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    if (question.status !== 'open') {
      return res.status(400).json({
        error: 'Question is not open for answers',
        code: 'QUESTION_CLOSED'
      });
    }

    // 检查用户声誉是否足够回答
    const userProfile = await getUserCommunityProfile(user.id);
    if (userProfile.reputation_score < ANSWER_CONFIG.MIN_REPUTATION_TO_ANSWER) {
      return res.status(403).json({
        error: 'Insufficient reputation to post answers',
        code: 'INSUFFICIENT_REPUTATION',
        required_reputation: ANSWER_CONFIG.MIN_REPUTATION_TO_ANSWER
      });
    }

    // 检查用户是否已经回答过这个问题
    const { data: existingAnswer, error: checkError } = await supabase
      .from('community_answers')
      .select('id')
      .eq('question_id', question_id)
      .eq('author_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingAnswer) {
      return res.status(400).json({
        error: 'You have already answered this question',
        code: 'DUPLICATE_ANSWER'
      });
    }

    // 创建回答
    const answerData = {
      content: content.trim(),
      question_id,
      author_id: user.id,
      is_best_answer: false,
      vote_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: answer, error: createError } = await supabase
      .from('community_answers')
      .insert(answerData)
      .select(`
        id, content, question_id, author_id, is_best_answer,
        vote_score, created_at, updated_at
      `)
      .single();

    if (createError) {
      throw createError;
    }

    // 更新问题的回答计数
    await updateQuestionAnswerCount(question_id, 1);

    // 更新用户统计
    await updateUserAnswerCount(user.id, 1);

    // 给用户增加声誉分
    await updateUserReputation(user.id, ANSWER_CONFIG.REPUTATION_REWARDS.ANSWER_POSTED);

    // 获取完整的回答信息
    const fullAnswer = await getAnswerById(answer.id, user.id);

    return res.status(201).json({
      success: true,
      data: fullAnswer,
      message: 'Answer created successfully'
    });

  } catch (error) {
    console.error('Create answer error:', error);
    return res.status(500).json({
      error: 'Failed to create answer',
      code: 'CREATE_ERROR',
      message: error.message
    });
  }
}

// 更新回答
async function handleUpdateAnswer(req, res, user) {
  try {
    const { answer_id } = req.query;
    const { content, is_best_answer } = req.body;

    if (!answer_id) {
      return res.status(400).json({
        error: 'answer_id is required',
        code: 'MISSING_ANSWER_ID'
      });
    }

    // 检查回答是否存在
    const { data: existingAnswer, error: checkError } = await supabase
      .from('community_answers')
      .select(`
        id, author_id, question_id, is_best_answer,
        question:community_questions!question_id(
          author_id
        )
      `)
      .eq('id', answer_id)
      .single();

    if (checkError || !existingAnswer) {
      return res.status(404).json({
        error: 'Answer not found',
        code: 'ANSWER_NOT_FOUND'
      });
    }

    // 检查权限
    const userProfile = await getUserCommunityProfile(user.id);
    const isAuthor = existingAnswer.author_id === user.id;
    const isQuestionAuthor = existingAnswer.question.author_id === user.id;
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'moderator';

    // 准备更新数据
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // 内容更新（只有作者或管理员可以修改）
    if (content !== undefined) {
      if (!isAuthor && !isAdmin) {
        return res.status(403).json({
          error: 'Permission denied to edit content',
          code: 'PERMISSION_DENIED'
        });
      }

      if (content.length > ANSWER_CONFIG.MAX_CONTENT_LENGTH) {
        return res.status(400).json({
          error: `Content too long. Maximum ${ANSWER_CONFIG.MAX_CONTENT_LENGTH} characters allowed`,
          code: 'CONTENT_TOO_LONG'
        });
      }
      updateData.content = content.trim();
    }

    // 最佳答案标记（只有问题作者、管理员或有足够声誉的用户可以设置）
    if (is_best_answer !== undefined) {
      const canMarkBest = isQuestionAuthor || isAdmin || 
                         userProfile.reputation_score >= ANSWER_CONFIG.MIN_REPUTATION_TO_MARK_BEST;
      
      if (!canMarkBest) {
        return res.status(403).json({
          error: 'Insufficient permission to mark best answer',
          code: 'INSUFFICIENT_PERMISSION',
          required_reputation: ANSWER_CONFIG.MIN_REPUTATION_TO_MARK_BEST
        });
      }

      // 如果设置为最佳答案，需要先取消其他最佳答案
      if (is_best_answer && !existingAnswer.is_best_answer) {
        await clearOtherBestAnswers(existingAnswer.question_id, answer_id);
        
        // 给回答者增加声誉分
        await updateUserReputation(existingAnswer.author_id, ANSWER_CONFIG.REPUTATION_REWARDS.BEST_ANSWER);
      } else if (!is_best_answer && existingAnswer.is_best_answer) {
        // 取消最佳答案，扣除声誉分
        await updateUserReputation(existingAnswer.author_id, ANSWER_CONFIG.REPUTATION_REWARDS.BEST_ANSWER_REMOVED);
      }

      updateData.is_best_answer = is_best_answer;
    }

    // 更新回答
    const { data: updatedAnswer, error: updateError } = await supabase
      .from('community_answers')
      .update(updateData)
      .eq('id', answer_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 获取完整的回答信息
    const fullAnswer = await getAnswerById(answer_id, user.id);

    return res.status(200).json({
      success: true,
      data: fullAnswer,
      message: 'Answer updated successfully'
    });

  } catch (error) {
    console.error('Update answer error:', error);
    return res.status(500).json({
      error: 'Failed to update answer',
      code: 'UPDATE_ERROR',
      message: error.message
    });
  }
}

// 删除回答
async function handleDeleteAnswer(req, res, user) {
  try {
    const { answer_id } = req.query;

    if (!answer_id) {
      return res.status(400).json({
        error: 'answer_id is required',
        code: 'MISSING_ANSWER_ID'
      });
    }

    // 检查回答是否存在
    const { data: existingAnswer, error: checkError } = await supabase
      .from('community_answers')
      .select('id, author_id, question_id, is_best_answer')
      .eq('id', answer_id)
      .single();

    if (checkError || !existingAnswer) {
      return res.status(404).json({
        error: 'Answer not found',
        code: 'ANSWER_NOT_FOUND'
      });
    }

    // 检查权限
    const userProfile = await getUserCommunityProfile(user.id);
    const isAuthor = existingAnswer.author_id === user.id;
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'moderator';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: 'Permission denied',
        code: 'PERMISSION_DENIED'
      });
    }

    // 删除回答
    const { error: deleteError } = await supabase
      .from('community_answers')
      .delete()
      .eq('id', answer_id);

    if (deleteError) {
      throw deleteError;
    }

    // 更新问题的回答计数
    await updateQuestionAnswerCount(existingAnswer.question_id, -1);

    // 更新用户统计
    await updateUserAnswerCount(user.id, -1);

    // 如果删除的是最佳答案，扣除声誉分
    if (existingAnswer.is_best_answer) {
      await updateUserReputation(existingAnswer.author_id, ANSWER_CONFIG.REPUTATION_REWARDS.BEST_ANSWER_REMOVED);
    }

    return res.status(200).json({
      success: true,
      message: 'Answer deleted successfully'
    });

  } catch (error) {
    console.error('Delete answer error:', error);
    return res.status(500).json({
      error: 'Failed to delete answer',
      code: 'DELETE_ERROR',
      message: error.message
    });
  }
}

// 获取单个回答详情
async function getAnswerById(answerId, currentUserId) {
  try {
    const { data: answer, error: answerError } = await supabase
      .from('community_answers')
      .select(`
        id, content, question_id, author_id, is_best_answer,
        vote_score, created_at, updated_at,
        author:user_community_profiles!author_id(
          display_name, avatar_url, reputation_score, role
        ),
        question:community_questions!question_id(
          id, title, subject_code, author_id
        )
      `)
      .eq('id', answerId)
      .single();

    if (answerError) {
      throw answerError;
    }

    if (!answer) {
      return null;
    }

    // 获取用户对这个回答的投票状态
    const userVotes = await getUserVotesForAnswers(currentUserId, [answerId]);
    answer.user_vote = userVotes[answerId] || null;

    return answer;

  } catch (error) {
    console.error('Get answer by ID error:', error);
    throw error;
  }
}

// 获取用户对回答的投票状态
async function getUserVotesForAnswers(userId, answerIds) {
  try {
    if (answerIds.length === 0) {
      return {};
    }

    const { data: votes, error } = await supabase
      .from('community_interactions')
      .select('content_id, interaction_type')
      .eq('user_id', userId)
      .eq('content_type', 'answer')
      .in('content_id', answerIds)
      .in('interaction_type', ['upvote', 'downvote']);

    if (error) {
      throw error;
    }

    // 按回答ID分组投票
    const votesByAnswer = {};
    votes.forEach(vote => {
      votesByAnswer[vote.content_id] = vote.interaction_type;
    });

    return votesByAnswer;

  } catch (error) {
    console.error('Get user votes for answers error:', error);
    return {};
  }
}

// 清除其他最佳答案
async function clearOtherBestAnswers(questionId, excludeAnswerId) {
  try {
    const { error } = await supabase
      .from('community_answers')
      .update({ 
        is_best_answer: false,
        updated_at: new Date().toISOString()
      })
      .eq('question_id', questionId)
      .neq('id', excludeAnswerId)
      .eq('is_best_answer', true);

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error('Clear other best answers error:', error);
    throw error;
  }
}

// 更新问题回答计数
async function updateQuestionAnswerCount(questionId, increment) {
  try {
    await supabase
      .from('community_questions')
      .update({ 
        answer_count: supabase.sql`COALESCE(answer_count, 0) + ${increment}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId);

  } catch (error) {
    console.error('Update question answer count error:', error);
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

// 更新用户回答计数
async function updateUserAnswerCount(userId, increment) {
  try {
    await supabase
      .from('user_community_profiles')
      .upsert({
        user_id: userId,
        answers_count: supabase.sql`COALESCE(answers_count, 0) + ${increment}`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

  } catch (error) {
    console.error('Update user answer count error:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

// 更新用户声誉
async function updateUserReputation(userId, increment) {
  try {
    await supabase
      .from('user_community_profiles')
      .upsert({
        user_id: userId,
        reputation_score: supabase.sql`COALESCE(reputation_score, 0) + ${increment}`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

  } catch (error) {
    console.error('Update user reputation error:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

// 导出配置供其他模块使用
export { ANSWER_CONFIG };