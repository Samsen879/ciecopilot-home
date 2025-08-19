// 社区问答系统API端点
// 处理问题的增删改查和相关操作

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 社区配置
const COMMUNITY_CONFIG = {
  MAX_TITLE_LENGTH: 200,
  MAX_CONTENT_LENGTH: 10000,
  MAX_TAGS: 5,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CACHE_DURATION: 300, // 5分钟
  MIN_REPUTATION_TO_POST: 0,
  MIN_REPUTATION_TO_VOTE: 10
};

// 主要的社区问答API处理函数
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
        return await handleGetQuestions(req, res, user);
      case 'POST':
        return await handleCreateQuestion(req, res, user);
      case 'PUT':
        return await handleUpdateQuestion(req, res, user);
      case 'DELETE':
        return await handleDeleteQuestion(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Community questions API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取问题列表
async function handleGetQuestions(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { 
      question_id,
      subject_code,
      page = 1,
      limit = COMMUNITY_CONFIG.DEFAULT_PAGE_SIZE,
      sort = 'latest',
      search,
      tags,
      status = 'all',
      author_id
    } = req.query;

    // 如果指定了问题ID，获取单个问题详情
    if (question_id) {
      const question = await getQuestionById(question_id, user.id);
      
      if (!question) {
        return res.status(404).json({
          error: 'Question not found',
          code: 'QUESTION_NOT_FOUND'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: question,
        response_time: Date.now() - startTime
      });
    }

    // 验证分页参数
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(COMMUNITY_CONFIG.MAX_PAGE_SIZE, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 构建查询
    let query = supabase
      .from('community_questions')
      .select(`
        id, title, content, subject_code, author_id, status,
        view_count, answer_count, vote_score, is_featured,
        created_at, updated_at,
        author:user_community_profiles!author_id(
          display_name, avatar_url, reputation_score
        )
      `);

    // 应用过滤条件
    if (subject_code) {
      query = query.eq('subject_code', subject_code);
    }

    if (author_id) {
      query = query.eq('author_id', author_id);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // 搜索功能
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 标签过滤
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      // 这里需要通过content_tags表进行关联查询
      const { data: taggedQuestionIds } = await supabase
        .from('content_tags')
        .select('content_id')
        .eq('content_type', 'question')
        .in('tag_name', tagArray);
      
      if (taggedQuestionIds && taggedQuestionIds.length > 0) {
        const questionIds = taggedQuestionIds.map(item => item.content_id);
        query = query.in('id', questionIds);
      } else {
        // 如果没有找到匹配的标签，返回空结果
        return res.status(200).json({
          success: true,
          data: {
            questions: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              total_pages: 0
            }
          },
          response_time: Date.now() - startTime
        });
      }
    }

    // 排序
    switch (sort) {
      case 'latest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most_viewed':
        query = query.order('view_count', { ascending: false });
        break;
      case 'most_answered':
        query = query.order('answer_count', { ascending: false });
        break;
      case 'highest_voted':
        query = query.order('vote_score', { ascending: false });
        break;
      case 'unanswered':
        query = query.eq('answer_count', 0).order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 获取总数（用于分页）
    const { count: totalCount, error: countError } = await supabase
      .from('community_questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject_code', subject_code || '');

    if (countError && subject_code) {
      throw countError;
    }

    // 应用分页
    query = query.range(offset, offset + limitNum - 1);

    // 执行查询
    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      throw questionsError;
    }

    // 获取问题的标签
    const questionIds = questions.map(q => q.id);
    const questionTags = await getQuestionsTags(questionIds);

    // 合并标签信息
    const questionsWithTags = questions.map(question => ({
      ...question,
      tags: questionTags[question.id] || []
    }));

    const totalPages = Math.ceil((totalCount || questions.length) / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        questions: questionsWithTags,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount || questions.length,
          total_pages: totalPages
        }
      },
      response_time: Date.now() - startTime
    });

  } catch (error) {
    console.error('Get questions error:', error);
    return res.status(500).json({
      error: 'Failed to get questions',
      code: 'QUESTIONS_ERROR',
      message: error.message
    });
  }
}

// 创建新问题
async function handleCreateQuestion(req, res, user) {
  try {
    const { title, content, subject_code, tags = [] } = req.body;

    // 验证必需参数
    if (!title || !content || !subject_code) {
      return res.status(400).json({
        error: 'title, content, and subject_code are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 验证标题长度
    if (title.length > COMMUNITY_CONFIG.MAX_TITLE_LENGTH) {
      return res.status(400).json({
        error: `Title too long. Maximum ${COMMUNITY_CONFIG.MAX_TITLE_LENGTH} characters allowed`,
        code: 'TITLE_TOO_LONG'
      });
    }

    // 验证内容长度
    if (content.length > COMMUNITY_CONFIG.MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        error: `Content too long. Maximum ${COMMUNITY_CONFIG.MAX_CONTENT_LENGTH} characters allowed`,
        code: 'CONTENT_TOO_LONG'
      });
    }

    // 验证标签数量
    if (tags.length > COMMUNITY_CONFIG.MAX_TAGS) {
      return res.status(400).json({
        error: `Too many tags. Maximum ${COMMUNITY_CONFIG.MAX_TAGS} allowed`,
        code: 'TOO_MANY_TAGS'
      });
    }

    // 检查用户声誉是否足够发帖
    const userProfile = await getUserCommunityProfile(user.id);
    if (userProfile.reputation_score < COMMUNITY_CONFIG.MIN_REPUTATION_TO_POST) {
      return res.status(403).json({
        error: 'Insufficient reputation to post questions',
        code: 'INSUFFICIENT_REPUTATION',
        required_reputation: COMMUNITY_CONFIG.MIN_REPUTATION_TO_POST
      });
    }

    // 创建问题
    const questionData = {
      title: title.trim(),
      content: content.trim(),
      subject_code,
      author_id: user.id,
      status: 'open',
      view_count: 0,
      answer_count: 0,
      vote_score: 0,
      is_featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: question, error: createError } = await supabase
      .from('community_questions')
      .insert(questionData)
      .select(`
        id, title, content, subject_code, author_id, status,
        view_count, answer_count, vote_score, is_featured,
        created_at, updated_at
      `)
      .single();

    if (createError) {
      throw createError;
    }

    // 添加标签
    if (tags.length > 0) {
      await addQuestionTags(question.id, tags);
    }

    // 更新用户统计
    await updateUserQuestionCount(user.id, 1);

    // 获取完整的问题信息（包括作者信息和标签）
    const fullQuestion = await getQuestionById(question.id, user.id);

    return res.status(201).json({
      success: true,
      data: fullQuestion,
      message: 'Question created successfully'
    });

  } catch (error) {
    console.error('Create question error:', error);
    return res.status(500).json({
      error: 'Failed to create question',
      code: 'CREATE_ERROR',
      message: error.message
    });
  }
}

// 更新问题
async function handleUpdateQuestion(req, res, user) {
  try {
    const { question_id } = req.query;
    const { title, content, tags, status } = req.body;

    if (!question_id) {
      return res.status(400).json({
        error: 'question_id is required',
        code: 'MISSING_QUESTION_ID'
      });
    }

    // 检查问题是否存在且用户有权限修改
    const { data: existingQuestion, error: checkError } = await supabase
      .from('community_questions')
      .select('id, author_id, title, content')
      .eq('id', question_id)
      .single();

    if (checkError || !existingQuestion) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    // 检查权限（只有作者或管理员可以修改）
    const userProfile = await getUserCommunityProfile(user.id);
    const isAuthor = existingQuestion.author_id === user.id;
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'moderator';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: 'Permission denied',
        code: 'PERMISSION_DENIED'
      });
    }

    // 准备更新数据
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) {
      if (title.length > COMMUNITY_CONFIG.MAX_TITLE_LENGTH) {
        return res.status(400).json({
          error: `Title too long. Maximum ${COMMUNITY_CONFIG.MAX_TITLE_LENGTH} characters allowed`,
          code: 'TITLE_TOO_LONG'
        });
      }
      updateData.title = title.trim();
    }

    if (content !== undefined) {
      if (content.length > COMMUNITY_CONFIG.MAX_CONTENT_LENGTH) {
        return res.status(400).json({
          error: `Content too long. Maximum ${COMMUNITY_CONFIG.MAX_CONTENT_LENGTH} characters allowed`,
          code: 'CONTENT_TOO_LONG'
        });
      }
      updateData.content = content.trim();
    }

    if (status !== undefined && isAdmin) {
      const validStatuses = ['open', 'closed', 'resolved', 'deleted'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          code: 'INVALID_STATUS',
          valid_statuses: validStatuses
        });
      }
      updateData.status = status;
    }

    // 更新问题
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('community_questions')
      .update(updateData)
      .eq('id', question_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 更新标签
    if (tags !== undefined) {
      if (tags.length > COMMUNITY_CONFIG.MAX_TAGS) {
        return res.status(400).json({
          error: `Too many tags. Maximum ${COMMUNITY_CONFIG.MAX_TAGS} allowed`,
          code: 'TOO_MANY_TAGS'
        });
      }
      await updateQuestionTags(question_id, tags);
    }

    // 获取完整的问题信息
    const fullQuestion = await getQuestionById(question_id, user.id);

    return res.status(200).json({
      success: true,
      data: fullQuestion,
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('Update question error:', error);
    return res.status(500).json({
      error: 'Failed to update question',
      code: 'UPDATE_ERROR',
      message: error.message
    });
  }
}

// 删除问题
async function handleDeleteQuestion(req, res, user) {
  try {
    const { question_id } = req.query;

    if (!question_id) {
      return res.status(400).json({
        error: 'question_id is required',
        code: 'MISSING_QUESTION_ID'
      });
    }

    // 检查问题是否存在且用户有权限删除
    const { data: existingQuestion, error: checkError } = await supabase
      .from('community_questions')
      .select('id, author_id')
      .eq('id', question_id)
      .single();

    if (checkError || !existingQuestion) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    // 检查权限
    const userProfile = await getUserCommunityProfile(user.id);
    const isAuthor = existingQuestion.author_id === user.id;
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'moderator';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: 'Permission denied',
        code: 'PERMISSION_DENIED'
      });
    }

    // 软删除（更新状态为deleted）而不是物理删除
    const { error: deleteError } = await supabase
      .from('community_questions')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', question_id);

    if (deleteError) {
      throw deleteError;
    }

    // 更新用户统计
    await updateUserQuestionCount(user.id, -1);

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Delete question error:', error);
    return res.status(500).json({
      error: 'Failed to delete question',
      code: 'DELETE_ERROR',
      message: error.message
    });
  }
}

// 获取单个问题详情
async function getQuestionById(questionId, currentUserId) {
  try {
    // 获取问题基本信息
    const { data: question, error: questionError } = await supabase
      .from('community_questions')
      .select(`
        id, title, content, subject_code, author_id, status,
        view_count, answer_count, vote_score, is_featured,
        created_at, updated_at,
        author:user_community_profiles!author_id(
          display_name, avatar_url, reputation_score, role
        )
      `)
      .eq('id', questionId)
      .single();

    if (questionError) {
      throw questionError;
    }

    if (!question) {
      return null;
    }

    // 获取标签
    const tags = await getQuestionsTags([questionId]);
    question.tags = tags[questionId] || [];

    // 增加浏览次数（如果不是作者本人）
    if (question.author_id !== currentUserId) {
      await supabase
        .from('community_questions')
        .update({ view_count: supabase.sql`view_count + 1` })
        .eq('id', questionId);
      
      question.view_count += 1;
    }

    return question;

  } catch (error) {
    console.error('Get question by ID error:', error);
    throw error;
  }
}

// 获取问题的标签
async function getQuestionsTags(questionIds) {
  try {
    if (questionIds.length === 0) {
      return {};
    }

    const { data: tags, error } = await supabase
      .from('content_tags')
      .select('content_id, tag_name')
      .eq('content_type', 'question')
      .in('content_id', questionIds);

    if (error) {
      throw error;
    }

    // 按问题ID分组标签
    const tagsByQuestion = {};
    tags.forEach(tag => {
      if (!tagsByQuestion[tag.content_id]) {
        tagsByQuestion[tag.content_id] = [];
      }
      tagsByQuestion[tag.content_id].push(tag.tag_name);
    });

    return tagsByQuestion;

  } catch (error) {
    console.error('Get questions tags error:', error);
    return {};
  }
}

// 添加问题标签
async function addQuestionTags(questionId, tags) {
  try {
    if (tags.length === 0) {
      return;
    }

    // 准备标签数据
    const tagData = tags.map(tag => ({
      content_type: 'question',
      content_id: questionId,
      tag_name: tag.trim().toLowerCase()
    }));

    // 插入标签
    const { error } = await supabase
      .from('content_tags')
      .insert(tagData);

    if (error) {
      throw error;
    }

    // 更新标签使用计数
    for (const tag of tags) {
      await updateTagUsageCount(tag.trim().toLowerCase(), 1);
    }

  } catch (error) {
    console.error('Add question tags error:', error);
    throw error;
  }
}

// 更新问题标签
async function updateQuestionTags(questionId, newTags) {
  try {
    // 获取现有标签
    const { data: existingTags, error: getError } = await supabase
      .from('content_tags')
      .select('tag_name')
      .eq('content_type', 'question')
      .eq('content_id', questionId);

    if (getError) {
      throw getError;
    }

    const existingTagNames = existingTags.map(tag => tag.tag_name);
    const newTagNames = newTags.map(tag => tag.trim().toLowerCase());

    // 删除不再需要的标签
    const tagsToRemove = existingTagNames.filter(tag => !newTagNames.includes(tag));
    if (tagsToRemove.length > 0) {
      await supabase
        .from('content_tags')
        .delete()
        .eq('content_type', 'question')
        .eq('content_id', questionId)
        .in('tag_name', tagsToRemove);
      
      // 更新标签使用计数
      for (const tag of tagsToRemove) {
        await updateTagUsageCount(tag, -1);
      }
    }

    // 添加新标签
    const tagsToAdd = newTagNames.filter(tag => !existingTagNames.includes(tag));
    if (tagsToAdd.length > 0) {
      await addQuestionTags(questionId, tagsToAdd);
    }

  } catch (error) {
    console.error('Update question tags error:', error);
    throw error;
  }
}

// 更新标签使用计数
async function updateTagUsageCount(tagName, increment) {
  try {
    // 尝试更新现有标签
    const { data: existingTag, error: getError } = await supabase
      .from('community_tags')
      .select('id, usage_count')
      .eq('name', tagName)
      .single();

    if (getError && getError.code !== 'PGRST116') {
      throw getError;
    }

    if (existingTag) {
      // 更新现有标签
      await supabase
        .from('community_tags')
        .update({ 
          usage_count: Math.max(0, existingTag.usage_count + increment),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTag.id);
    } else if (increment > 0) {
      // 创建新标签
      await supabase
        .from('community_tags')
        .insert({
          name: tagName,
          usage_count: increment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('Update tag usage count error:', error);
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

// 更新用户问题计数
async function updateUserQuestionCount(userId, increment) {
  try {
    await supabase
      .from('user_community_profiles')
      .upsert({
        user_id: userId,
        questions_count: supabase.sql`COALESCE(questions_count, 0) + ${increment}`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

  } catch (error) {
    console.error('Update user question count error:', error);
    // 不抛出错误，因为这不是关键操作
  }
}

// 导出配置供其他模块使用
export { COMMUNITY_CONFIG };