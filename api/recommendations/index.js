// 推荐系统API端点
// 处理个性化推荐相关的请求

import { createClient } from '@supabase/supabase-js';
import { recommendationEngine } from './algorithm-engine.js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 推荐算法配置
const RECOMMENDATION_CONFIG = {
  MAX_RECOMMENDATIONS: 20,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.4, // 提高默认阈值
  CACHE_DURATION: 3600, // 1小时
  ALGORITHM_VERSION: 'v2.0-enhanced',
  USE_ENHANCED_ALGORITHM: true, // 启用增强算法
  FALLBACK_TO_BASIC: true // 增强算法失败时回退到基础算法
};

// 主要的推荐API处理函数
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
        return await handleGetRecommendations(req, res, user);
      case 'POST':
        return await handleCreateRecommendation(req, res, user);
      case 'PUT':
        return await handleUpdateRecommendation(req, res, user);
      case 'DELETE':
        return await handleDeleteRecommendation(req, res, user);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Recommendations API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取推荐内容
async function handleGetRecommendations(req, res, user) {
  const startTime = Date.now();
  
  try {
    const { 
      subject_code, 
      type = 'content', 
      limit = 10, 
      offset = 0,
      min_confidence = RECOMMENDATION_CONFIG.DEFAULT_CONFIDENCE_THRESHOLD,
      refresh = false
    } = req.query;

    // 验证参数
    if (!subject_code) {
      return res.status(400).json({
        error: 'subject_code is required',
        code: 'MISSING_SUBJECT_CODE'
      });
    }

    // 检查缓存（如果不强制刷新）
    if (!refresh) {
      const cachedRecommendations = await getCachedRecommendations(
        user.id, 
        subject_code, 
        type
      );
      
      if (cachedRecommendations) {
        return res.status(200).json({
          success: true,
          data: cachedRecommendations,
          cached: true,
          response_time: Date.now() - startTime
        });
      }
    }

    // 生成新的推荐
    let recommendations;
    let algorithmUsed = 'basic';
    
    if (RECOMMENDATION_CONFIG.USE_ENHANCED_ALGORITHM) {
      try {
        // 尝试使用增强算法
        const enhancedResult = await recommendationEngine.generateEnhancedRecommendations(
          user.id,
          subject_code,
          {
            type,
            limit: parseInt(limit) * 2, // 获取更多候选项
            min_confidence: parseFloat(min_confidence)
          }
        );
        
        recommendations = enhancedResult.recommendations;
        algorithmUsed = 'enhanced';
        
        // 添加增强算法的元数据
        res.setHeader('X-Algorithm-Metadata', JSON.stringify(enhancedResult.metadata));
        
      } catch (enhancedError) {
        console.warn('Enhanced algorithm failed, falling back to basic:', enhancedError);
        
        if (RECOMMENDATION_CONFIG.FALLBACK_TO_BASIC) {
          recommendations = await generateRecommendations(
            user.id,
            subject_code,
            type,
            parseInt(limit),
            parseFloat(min_confidence)
          );
          algorithmUsed = 'basic-fallback';
        } else {
          throw enhancedError;
        }
      }
    } else {
      // 使用基础算法
      recommendations = await generateRecommendations(
        user.id,
        subject_code,
        type,
        parseInt(limit),
        parseFloat(min_confidence)
      );
    }

    // 缓存结果
    await cacheRecommendations(
      user.id,
      subject_code,
      type,
      recommendations
    );

    // 记录推荐展示
    await logRecommendationImpression(user.id, recommendations);

    const responseTime = Date.now() - startTime;
    
    return res.status(200).json({
      success: true,
      data: {
        recommendations: recommendations.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
        total: recommendations.length,
        algorithm_version: RECOMMENDATION_CONFIG.ALGORITHM_VERSION,
        algorithm_used: algorithmUsed,
        generated_at: new Date().toISOString(),
        performance_metrics: {
          response_time: responseTime,
          candidates_processed: recommendations.length,
          confidence_threshold: parseFloat(min_confidence),
          diversity_enabled: algorithmUsed === 'enhanced'
        }
      },
      cached: false,
      response_time: responseTime
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    return res.status(500).json({
      error: 'Failed to get recommendations',
      code: 'RECOMMENDATION_ERROR',
      message: error.message
    });
  }
}

// 创建推荐反馈
async function handleCreateRecommendation(req, res, user) {
  try {
    const { recommendation_id, feedback_type, rating, comment } = req.body;

    // 验证必需参数
    if (!recommendation_id || !feedback_type) {
      return res.status(400).json({
        error: 'recommendation_id and feedback_type are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 验证反馈类型
    const validFeedbackTypes = ['like', 'dislike', 'not_relevant', 'helpful', 'too_easy', 'too_hard'];
    if (!validFeedbackTypes.includes(feedback_type)) {
      return res.status(400).json({
        error: 'Invalid feedback_type',
        code: 'INVALID_FEEDBACK_TYPE',
        valid_types: validFeedbackTypes
      });
    }

    // 验证评分（如果提供）
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING'
      });
    }

    // 检查推荐是否存在且属于当前用户
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, user_id')
      .eq('id', recommendation_id)
      .eq('user_id', user.id)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'RECOMMENDATION_NOT_FOUND'
      });
    }

    // 创建反馈记录
    const { data: feedback, error: feedbackError } = await supabase
      .from('recommendation_feedback')
      .insert({
        recommendation_id,
        user_id: user.id,
        feedback_type,
        rating,
        comment
      })
      .select()
      .single();

    if (feedbackError) {
      throw feedbackError;
    }

    // 更新推荐的点击状态（如果是正面反馈）
    if (['like', 'helpful'].includes(feedback_type)) {
      await supabase
        .from('recommendations')
        .update({ 
          is_clicked: true,
          click_count: supabase.sql`click_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', recommendation_id);
    }

    return res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('Create recommendation feedback error:', error);
    return res.status(500).json({
      error: 'Failed to create feedback',
      code: 'FEEDBACK_ERROR',
      message: error.message
    });
  }
}

// 更新推荐状态
async function handleUpdateRecommendation(req, res, user) {
  try {
    const { recommendation_id } = req.query;
    const { is_dismissed, is_clicked } = req.body;

    if (!recommendation_id) {
      return res.status(400).json({
        error: 'recommendation_id is required',
        code: 'MISSING_RECOMMENDATION_ID'
      });
    }

    // 验证推荐属于当前用户
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, user_id')
      .eq('id', recommendation_id)
      .eq('user_id', user.id)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'RECOMMENDATION_NOT_FOUND'
      });
    }

    // 准备更新数据
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (typeof is_dismissed === 'boolean') {
      updateData.is_dismissed = is_dismissed;
    }

    if (typeof is_clicked === 'boolean') {
      updateData.is_clicked = is_clicked;
      if (is_clicked) {
        updateData.click_count = supabase.sql`click_count + 1`;
      }
    }

    // 更新推荐
    const { data: updatedRecommendation, error: updateError } = await supabase
      .from('recommendations')
      .update(updateData)
      .eq('id', recommendation_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      data: updatedRecommendation,
      message: 'Recommendation updated successfully'
    });

  } catch (error) {
    console.error('Update recommendation error:', error);
    return res.status(500).json({
      error: 'Failed to update recommendation',
      code: 'UPDATE_ERROR',
      message: error.message
    });
  }
}

// 删除推荐
async function handleDeleteRecommendation(req, res, user) {
  try {
    const { recommendation_id } = req.query;

    if (!recommendation_id) {
      return res.status(400).json({
        error: 'recommendation_id is required',
        code: 'MISSING_RECOMMENDATION_ID'
      });
    }

    // 验证推荐属于当前用户
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, user_id')
      .eq('id', recommendation_id)
      .eq('user_id', user.id)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'RECOMMENDATION_NOT_FOUND'
      });
    }

    // 删除推荐（级联删除相关反馈）
    const { error: deleteError } = await supabase
      .from('recommendations')
      .delete()
      .eq('id', recommendation_id);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({
      success: true,
      message: 'Recommendation deleted successfully'
    });

  } catch (error) {
    console.error('Delete recommendation error:', error);
    return res.status(500).json({
      error: 'Failed to delete recommendation',
      code: 'DELETE_ERROR',
      message: error.message
    });
  }
}

// 生成推荐内容
async function generateRecommendations(userId, subjectCode, type, limit, minConfidence) {
  try {
    // 获取用户学习档案
    const userProfile = await getUserLearningProfile(userId, subjectCode);
    
    // 获取用户学习历史
    const learningHistory = await getUserLearningHistory(userId, subjectCode);
    
    // 根据类型生成不同的推荐
    let recommendations = [];
    
    switch (type) {
      case 'content':
        recommendations = await generateContentRecommendations(
          userId, subjectCode, userProfile, learningHistory, limit
        );
        break;
      case 'topic':
        recommendations = await generateTopicRecommendations(
          userId, subjectCode, userProfile, learningHistory, limit
        );
        break;
      case 'learning_path':
        recommendations = await generateLearningPathRecommendations(
          userId, subjectCode, userProfile, learningHistory, limit
        );
        break;
      default:
        recommendations = await generateContentRecommendations(
          userId, subjectCode, userProfile, learningHistory, limit
        );
    }
    
    // 过滤低置信度推荐
    recommendations = recommendations.filter(rec => rec.confidence_score >= minConfidence);
    
    // 按优先级排序
    recommendations.sort((a, b) => b.priority_score - a.priority_score);
    
    // 限制数量
    return recommendations.slice(0, limit);
    
  } catch (error) {
    console.error('Generate recommendations error:', error);
    throw error;
  }
}

// 获取用户学习档案
async function getUserLearningProfile(userId, subjectCode) {
  const { data: profile, error } = await supabase
    .from('user_learning_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_code', subjectCode)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }
  
  return profile || {
    learning_style: {},
    knowledge_level: {},
    learning_pace: 'medium',
    preferred_difficulty: 3,
    content_preferences: {},
    weakness_areas: [],
    strength_areas: []
  };
}

// 获取用户学习历史
async function getUserLearningHistory(userId, subjectCode, limit = 100) {
  const { data: history, error } = await supabase
    .from('user_learning_data')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_code', subjectCode)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    throw error;
  }
  
  return history || [];
}

// 生成内容推荐
async function generateContentRecommendations(userId, subjectCode, userProfile, learningHistory, limit) {
  try {
    // 获取用户未学习的论文
    const viewedPaperIds = learningHistory
      .filter(h => h.paper_id)
      .map(h => h.paper_id);
    
    let query = supabase
      .from('papers')
      .select(`
        id, title, abstract, authors, publication_date, 
        citation_count, difficulty_level, keywords
      `)
      .eq('subject_code', subjectCode)
      .order('citation_count', { ascending: false })
      .limit(limit * 2); // 获取更多候选项
    
    if (viewedPaperIds.length > 0) {
      query = query.not('id', 'in', `(${viewedPaperIds.join(',')})`);
    }
    
    const { data: papers, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // 计算推荐分数
    const recommendations = papers.map(paper => {
      const confidenceScore = calculateContentConfidence(paper, userProfile, learningHistory);
      const relevanceScore = calculateContentRelevance(paper, userProfile);
      const priorityScore = calculateContentPriority(paper, userProfile);
      
      return {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        subject_code: subjectCode,
        recommendation_type: 'content',
        target_type: 'paper',
        target_id: paper.id,
        title: paper.title,
        description: paper.abstract?.substring(0, 200) + '...',
        confidence_score: confidenceScore,
        relevance_score: relevanceScore,
        priority_score: priorityScore,
        algorithm_version: RECOMMENDATION_CONFIG.ALGORITHM_VERSION,
        reasoning: {
          factors: [
            'citation_count',
            'difficulty_match',
            'keyword_relevance'
          ],
          explanation: `基于您的学习偏好和历史记录推荐`
        },
        metadata: {
          paper_data: paper,
          recommendation_factors: {
            citation_count: paper.citation_count,
            difficulty_level: paper.difficulty_level,
            keywords: paper.keywords
          }
        },
        expires_at: new Date(Date.now() + RECOMMENDATION_CONFIG.CACHE_DURATION * 1000).toISOString(),
        created_at: new Date().toISOString()
      };
    });
    
    return recommendations;
    
  } catch (error) {
    console.error('Generate content recommendations error:', error);
    throw error;
  }
}

// 生成主题推荐
async function generateTopicRecommendations(userId, subjectCode, userProfile, learningHistory, limit) {
  try {
    // 获取用户未学习的主题
    const studiedTopicIds = learningHistory
      .filter(h => h.topic_id)
      .map(h => h.topic_id);
    
    let query = supabase
      .from('topics')
      .select('*')
      .eq('subject_code', subjectCode)
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    
    if (studiedTopicIds.length > 0) {
      query = query.not('id', 'in', `(${studiedTopicIds.join(',')})`);
    }
    
    const { data: topics, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // 计算推荐分数
    const recommendations = topics.map(topic => {
      const confidenceScore = calculateTopicConfidence(topic, userProfile, learningHistory);
      const relevanceScore = calculateTopicRelevance(topic, userProfile);
      const priorityScore = calculateTopicPriority(topic, userProfile);
      
      return {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        subject_code: subjectCode,
        recommendation_type: 'topic',
        target_type: 'topic',
        target_id: topic.id,
        title: topic.name,
        description: topic.description?.substring(0, 200) + '...',
        confidence_score: confidenceScore,
        relevance_score: relevanceScore,
        priority_score: priorityScore,
        algorithm_version: RECOMMENDATION_CONFIG.ALGORITHM_VERSION,
        reasoning: {
          factors: [
            'learning_objectives',
            'difficulty_match',
            'prerequisite_completion'
          ],
          explanation: `基于您的学习目标和进度推荐`
        },
        metadata: {
          topic_data: topic
        },
        expires_at: new Date(Date.now() + RECOMMENDATION_CONFIG.CACHE_DURATION * 1000).toISOString(),
        created_at: new Date().toISOString()
      };
    });
    
    return recommendations;
    
  } catch (error) {
    console.error('Generate topic recommendations error:', error);
    throw error;
  }
}

// 生成学习路径推荐
async function generateLearningPathRecommendations(userId, subjectCode, userProfile, learningHistory, limit) {
  try {
    // 获取可用的学习路径
    const { data: paths, error } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('subject_code', subjectCode)
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    
    if (error) {
      throw error;
    }
    
    // 计算推荐分数
    const recommendations = paths.map(path => {
      const confidenceScore = calculatePathConfidence(path, userProfile, learningHistory);
      const relevanceScore = calculatePathRelevance(path, userProfile);
      const priorityScore = calculatePathPriority(path, userProfile);
      
      return {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        subject_code: subjectCode,
        recommendation_type: 'learning_path',
        target_type: 'path',
        target_id: path.id,
        title: path.path_name || path.name,
        description: path.description?.substring(0, 200) + '...',
        confidence_score: confidenceScore,
        relevance_score: relevanceScore,
        priority_score: priorityScore,
        algorithm_version: RECOMMENDATION_CONFIG.ALGORITHM_VERSION,
        reasoning: {
          factors: [
            'learning_goals',
            'current_level',
            'time_availability'
          ],
          explanation: `基于您的学习目标和可用时间推荐`
        },
        metadata: {
          path_data: path
        },
        expires_at: new Date(Date.now() + RECOMMENDATION_CONFIG.CACHE_DURATION * 1000).toISOString(),
        created_at: new Date().toISOString()
      };
    });
    
    return recommendations;
    
  } catch (error) {
    console.error('Generate learning path recommendations error:', error);
    throw error;
  }
}

// 计算内容置信度
function calculateContentConfidence(paper, userProfile, learningHistory) {
  let confidence = 0.5; // 基础置信度
  
  // 基于难度匹配
  const preferredDifficulty = userProfile.preferred_difficulty || 3;
  const difficultyMatch = 1 - Math.abs(paper.difficulty_level - preferredDifficulty) / 4;
  confidence += difficultyMatch * 0.3;
  
  // 基于引用数量（归一化）
  const citationScore = Math.min(paper.citation_count / 100, 1);
  confidence += citationScore * 0.2;
  
  return Math.min(Math.max(confidence, 0), 1);
}

// 计算内容相关性
function calculateContentRelevance(paper, userProfile) {
  let relevance = 0.5; // 基础相关性
  
  // 基于关键词匹配
  const userInterests = userProfile.strength_areas || [];
  const paperKeywords = paper.keywords || [];
  
  const keywordMatches = userInterests.filter(interest => 
    paperKeywords.some(keyword => 
      keyword.toLowerCase().includes(interest.toLowerCase())
    )
  ).length;
  
  if (userInterests.length > 0) {
    relevance += (keywordMatches / userInterests.length) * 0.5;
  }
  
  return Math.min(Math.max(relevance, 0), 1);
}

// 计算内容优先级
function calculateContentPriority(paper, userProfile) {
  let priority = 0.5; // 基础优先级
  
  // 基于发表时间（较新的论文优先级更高）
  const publicationDate = new Date(paper.publication_date);
  const daysSincePublication = (Date.now() - publicationDate.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - daysSincePublication / 365); // 一年内的论文得分更高
  priority += recencyScore * 0.3;
  
  // 基于引用数量
  const citationScore = Math.min(paper.citation_count / 50, 1);
  priority += citationScore * 0.2;
  
  return Math.min(Math.max(priority, 0), 1);
}

// 计算主题置信度
function calculateTopicConfidence(topic, userProfile, learningHistory) {
  let confidence = 0.6; // 主题推荐基础置信度较高
  
  // 基于学习目标匹配
  const learningGoals = userProfile.goal_preferences || {};
  if (Object.keys(learningGoals).length > 0) {
    confidence += 0.2;
  }
  
  return Math.min(Math.max(confidence, 0), 1);
}

// 计算主题相关性
function calculateTopicRelevance(topic, userProfile) {
  let relevance = 0.7; // 主题相关性基础分较高
  
  // 基于弱项改进
  const weaknessAreas = userProfile.weakness_areas || [];
  if (weaknessAreas.some(weakness => 
    topic.name.toLowerCase().includes(weakness.toLowerCase())
  )) {
    relevance += 0.3;
  }
  
  return Math.min(Math.max(relevance, 0), 1);
}

// 计算主题优先级
function calculateTopicPriority(topic, userProfile) {
  let priority = 0.6;
  
  // 基于学习偏好
  const learningPace = userProfile.learning_pace || 'medium';
  if (learningPace === 'fast') {
    priority += 0.2;
  }
  
  return Math.min(Math.max(priority, 0), 1);
}

// 计算路径置信度
function calculatePathConfidence(path, userProfile, learningHistory) {
  return 0.7; // 学习路径推荐置信度
}

// 计算路径相关性
function calculatePathRelevance(path, userProfile) {
  return 0.8; // 学习路径相关性
}

// 计算路径优先级
function calculatePathPriority(path, userProfile) {
  return 0.6; // 学习路径优先级
}

// 获取缓存的推荐
async function getCachedRecommendations(userId, subjectCode, type) {
  try {
    const cacheKey = `rec_${userId}_${subjectCode}_${type}`;
    
    const { data: cache, error } = await supabase
      .from('recommendation_cache')
      .select('recommendation_data, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !cache) {
      return null;
    }
    
    // 更新访问时间和命中次数
    await supabase
      .from('recommendation_cache')
      .update({ 
        last_accessed: new Date().toISOString(),
        hit_count: supabase.sql`hit_count + 1`
      })
      .eq('cache_key', cacheKey);
    
    return cache.recommendation_data;
    
  } catch (error) {
    console.error('Get cached recommendations error:', error);
    return null;
  }
}

// 缓存推荐结果
async function cacheRecommendations(userId, subjectCode, type, recommendations) {
  try {
    const cacheKey = `rec_${userId}_${subjectCode}_${type}`;
    const expiresAt = new Date(Date.now() + RECOMMENDATION_CONFIG.CACHE_DURATION * 1000);
    
    await supabase
      .from('recommendation_cache')
      .upsert({
        cache_key: cacheKey,
        user_id: userId,
        subject_code: subjectCode,
        recommendation_data: recommendations,
        algorithm_version: RECOMMENDATION_CONFIG.ALGORITHM_VERSION,
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        last_accessed: new Date().toISOString()
      });
    
  } catch (error) {
    console.error('Cache recommendations error:', error);
    // 缓存失败不应该影响主要功能
  }
}

// 记录推荐展示
async function logRecommendationImpression(userId, recommendations) {
  try {
    // 批量插入推荐记录
    const recommendationRecords = recommendations.map(rec => ({
      id: rec.id,
      user_id: userId,
      subject_code: rec.subject_code,
      recommendation_type: rec.recommendation_type,
      target_type: rec.target_type,
      target_id: rec.target_id,
      title: rec.title,
      description: rec.description,
      confidence_score: rec.confidence_score,
      relevance_score: rec.relevance_score,
      priority_score: rec.priority_score,
      algorithm_version: rec.algorithm_version,
      reasoning: rec.reasoning,
      metadata: rec.metadata,
      expires_at: rec.expires_at,
      impression_count: 1
    }));
    
    await supabase
      .from('recommendations')
      .upsert(recommendationRecords, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
    
  } catch (error) {
    console.error('Log recommendation impression error:', error);
    // 记录失败不应该影响主要功能
  }
}