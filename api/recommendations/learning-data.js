import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 学习数据配置
const LEARNING_DATA_CONFIG = {
  MAX_RECORDS_PER_REQUEST: 1000,
  BATCH_SIZE: 50,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分钟
  VALID_ACTIVITY_TYPES: [
    'study', 'practice', 'review', 'assessment', 
    'video_watch', 'reading', 'discussion', 'quiz'
  ],
  VALID_DIFFICULTY_LEVELS: [1, 2, 3, 4, 5],
  MIN_TIME_SPENT: 1, // 最少1秒
  MAX_TIME_SPENT: 4 * 60 * 60 // 最多4小时
};

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
        return await handleGetLearningData(req, res, user);
      case 'POST':
        return await handleCreateLearningData(req, res, user);
      case 'PUT':
        return await handleUpdateLearningData(req, res, user);
      case 'DELETE':
        return await handleDeleteLearningData(req, res, user);

      default:
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Learning data API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}

// 获取学习数据
async function handleGetLearningData(req, res, user) {
  try {
    const { 
      subject_code, 
      start_date, 
      end_date, 
      activity_type, 
      page = 1, 
      limit = 50,
      include_stats = false
    } = req.query;

    // 参数验证
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), LEARNING_DATA_CONFIG.MAX_RECORDS_PER_REQUEST);
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        code: 'INVALID_PARAMS'
      });
    }

    // 构建查询
    let query = supabase
      .from('user_learning_data')
      .select(`
        id,
        user_id,
        subject_code,
        topic_id,
        activity_type,
        content_id,
        time_spent,
        difficulty_level,
        is_correct,
        score,
        session_id,
        metadata,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 添加过滤条件
    if (subject_code) {
      query = query.eq('subject_code', subject_code);
    }
    
    if (activity_type && LEARNING_DATA_CONFIG.VALID_ACTIVITY_TYPES.includes(activity_type)) {
      query = query.eq('activity_type', activity_type);
    }
    
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // 分页
    const offset = (pageNum - 1) * limitNum;
    query = query.range(offset, offset + limitNum - 1);

    const { data: learningData, error, count } = await query;
    
    if (error) {
      throw error;
    }

    // 获取统计信息（如果需要）
    let stats = null;
    if (include_stats === 'true') {
      stats = await getLearningStats(user.id, subject_code, start_date, end_date);
    }

    return res.status(200).json({
      success: true,
      data: {
        learning_data: learningData || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limitNum)
        },
        stats: stats,
        filters: {
          subject_code,
          activity_type,
          start_date,
          end_date
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get learning data error:', error);
    return res.status(500).json({
      error: 'Failed to get learning data',
      code: 'GET_LEARNING_DATA_ERROR',
      message: error.message
    });
  }
}

// 创建学习数据记录
async function handleCreateLearningData(req, res, user) {
  try {
    const {
      subject_code,
      topic_id,
      activity_type,
      content_id,
      time_spent,
      difficulty_level,
      is_correct,
      score,
      session_id,
      metadata = {}
    } = req.body;

    // 参数验证
    if (!subject_code || !topic_id || !activity_type) {
      return res.status(400).json({
        error: 'Missing required fields: subject_code, topic_id, activity_type',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!LEARNING_DATA_CONFIG.VALID_ACTIVITY_TYPES.includes(activity_type)) {
      return res.status(400).json({
        error: 'Invalid activity type',
        code: 'INVALID_ACTIVITY_TYPE',
        valid_types: LEARNING_DATA_CONFIG.VALID_ACTIVITY_TYPES
      });
    }

    if (time_spent !== undefined) {
      const timeSpentNum = parseInt(time_spent);
      if (timeSpentNum < LEARNING_DATA_CONFIG.MIN_TIME_SPENT || 
          timeSpentNum > LEARNING_DATA_CONFIG.MAX_TIME_SPENT) {
        return res.status(400).json({
          error: 'Invalid time_spent value',
          code: 'INVALID_TIME_SPENT',
          min: LEARNING_DATA_CONFIG.MIN_TIME_SPENT,
          max: LEARNING_DATA_CONFIG.MAX_TIME_SPENT
        });
      }
    }

    if (difficulty_level !== undefined && 
        !LEARNING_DATA_CONFIG.VALID_DIFFICULTY_LEVELS.includes(difficulty_level)) {
      return res.status(400).json({
        error: 'Invalid difficulty level',
        code: 'INVALID_DIFFICULTY_LEVEL',
        valid_levels: LEARNING_DATA_CONFIG.VALID_DIFFICULTY_LEVELS
      });
    }

    if (score !== undefined && (score < 0 || score > 100)) {
      return res.status(400).json({
        error: 'Score must be between 0 and 100',
        code: 'INVALID_SCORE'
      });
    }

    // 创建学习数据记录
    const learningDataRecord = {
      user_id: user.id,
      subject_code,
      topic_id,
      activity_type,
      content_id: content_id || null,
      time_spent: time_spent || null,
      difficulty_level: difficulty_level || null,
      is_correct: is_correct || null,
      score: score || null,
      session_id: session_id || generateSessionId(),
      metadata: metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newRecord, error } = await supabase
      .from('user_learning_data')
      .insert([learningDataRecord])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 更新用户学习统计
    await updateUserLearningStats(user.id, subject_code, learningDataRecord);

    // 记录学习活动日志
    await logLearningActivity(user.id, 'data_created', {
      record_id: newRecord.id,
      activity_type,
      subject_code,
      topic_id
    });

    return res.status(201).json({
      success: true,
      data: {
        learning_record: newRecord,
        message: 'Learning data recorded successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create learning data error:', error);
    return res.status(500).json({
      error: 'Failed to create learning data',
      code: 'CREATE_LEARNING_DATA_ERROR',
      message: error.message
    });
  }
}

// 更新学习数据记录
async function handleUpdateLearningData(req, res, user) {
  try {
    const { record_id } = req.query;
    const updateData = req.body;

    if (!record_id) {
      return res.status(400).json({
        error: 'Missing record_id parameter',
        code: 'MISSING_RECORD_ID'
      });
    }

    // 验证记录所有权
    const { data: existingRecord, error: fetchError } = await supabase
      .from('user_learning_data')
      .select('*')
      .eq('id', record_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingRecord) {
      return res.status(404).json({
        error: 'Learning data record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }

    // 验证更新数据
    const allowedFields = [
      'time_spent', 'difficulty_level', 'is_correct', 
      'score', 'metadata'
    ];
    
    const filteredUpdateData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        filteredUpdateData[key] = value;
      }
    }

    if (Object.keys(filteredUpdateData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_VALID_FIELDS',
        allowed_fields: allowedFields
      });
    }

    filteredUpdateData.updated_at = new Date().toISOString();

    // 更新记录
    const { data: updatedRecord, error: updateError } = await supabase
      .from('user_learning_data')
      .update(filteredUpdateData)
      .eq('id', record_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 记录更新日志
    await logLearningActivity(user.id, 'data_updated', {
      record_id,
      updated_fields: Object.keys(filteredUpdateData),
      old_values: existingRecord,
      new_values: updatedRecord
    });

    return res.status(200).json({
      success: true,
      data: {
        learning_record: updatedRecord,
        message: 'Learning data updated successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update learning data error:', error);
    return res.status(500).json({
      error: 'Failed to update learning data',
      code: 'UPDATE_LEARNING_DATA_ERROR',
      message: error.message
    });
  }
}

// 删除学习数据记录
async function handleDeleteLearningData(req, res, user) {
  try {
    const { record_id } = req.query;

    if (!record_id) {
      return res.status(400).json({
        error: 'Missing record_id parameter',
        code: 'MISSING_RECORD_ID'
      });
    }

    // 验证记录所有权
    const { data: existingRecord, error: fetchError } = await supabase
      .from('user_learning_data')
      .select('*')
      .eq('id', record_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingRecord) {
      return res.status(404).json({
        error: 'Learning data record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }

    // 删除记录
    const { error: deleteError } = await supabase
      .from('user_learning_data')
      .delete()
      .eq('id', record_id)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    // 记录删除日志
    await logLearningActivity(user.id, 'data_deleted', {
      record_id,
      deleted_record: existingRecord
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Learning data deleted successfully',
        deleted_record_id: record_id
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete learning data error:', error);
    return res.status(500).json({
      error: 'Failed to delete learning data',
      code: 'DELETE_LEARNING_DATA_ERROR',
      message: error.message
    });
  }
}

// 获取学习统计信息
async function getLearningStats(userId, subjectCode, startDate, endDate) {
  try {
    let query = supabase
      .from('user_learning_data')
      .select('*')
      .eq('user_id', userId);

    if (subjectCode) {
      query = query.eq('subject_code', subjectCode);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: records, error } = await query;
    
    if (error) {
      throw error;
    }

    if (!records || records.length === 0) {
      return {
        total_records: 0,
        total_time_spent: 0,
        average_score: 0,
        accuracy_rate: 0,
        activity_breakdown: {},
        difficulty_breakdown: {},
        daily_activity: []
      };
    }

    // 计算统计信息
    const totalRecords = records.length;
    const totalTimeSpent = records.reduce((sum, record) => sum + (record.time_spent || 0), 0);
    const scoresWithValues = records.filter(record => record.score !== null);
    const averageScore = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((sum, record) => sum + record.score, 0) / scoresWithValues.length 
      : 0;
    
    const correctAnswers = records.filter(record => record.is_correct === true).length;
    const totalAnswers = records.filter(record => record.is_correct !== null).length;
    const accuracyRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // 活动类型分布
    const activityBreakdown = {};
    records.forEach(record => {
      activityBreakdown[record.activity_type] = (activityBreakdown[record.activity_type] || 0) + 1;
    });

    // 难度分布
    const difficultyBreakdown = {};
    records.forEach(record => {
      if (record.difficulty_level) {
        difficultyBreakdown[record.difficulty_level] = (difficultyBreakdown[record.difficulty_level] || 0) + 1;
      }
    });

    // 每日活动统计
    const dailyActivity = {};
    records.forEach(record => {
      const date = record.created_at.split('T')[0];
      if (!dailyActivity[date]) {
        dailyActivity[date] = {
          date,
          count: 0,
          time_spent: 0,
          activities: []
        };
      }
      dailyActivity[date].count += 1;
      dailyActivity[date].time_spent += record.time_spent || 0;
      dailyActivity[date].activities.push(record.activity_type);
    });

    return {
      total_records: totalRecords,
      total_time_spent: totalTimeSpent,
      average_score: Math.round(averageScore * 100) / 100,
      accuracy_rate: Math.round(accuracyRate * 100) / 100,
      activity_breakdown: activityBreakdown,
      difficulty_breakdown: difficultyBreakdown,
      daily_activity: Object.values(dailyActivity).sort((a, b) => a.date.localeCompare(b.date))
    };

  } catch (error) {
    console.error('Get learning stats error:', error);
    return null;
  }
}

// 更新用户学习统计
async function updateUserLearningStats(userId, subjectCode, learningRecord) {
  try {
    // 获取或创建用户学习档案
    const { data: profile, error: profileError } = await supabase
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_code', subjectCode)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    const now = new Date().toISOString();
    
    if (!profile) {
      // 创建新的学习档案
      const newProfile = {
        user_id: userId,
        subject_code: subjectCode,
        total_study_time: learningRecord.time_spent || 0,
        total_activities: 1,
        last_activity_at: now,
        learning_streak: 1,
        knowledge_level: {},
        learning_style: {},
        learning_pace: 'medium',
        preferred_difficulty: learningRecord.difficulty_level || 3,
        content_preferences: {},
        weakness_areas: [],
        strength_areas: [],
        created_at: now,
        updated_at: now
      };

      await supabase
        .from('user_learning_profiles')
        .insert([newProfile]);
    } else {
      // 更新现有档案
      const updatedProfile = {
        total_study_time: (profile.total_study_time || 0) + (learningRecord.time_spent || 0),
        total_activities: (profile.total_activities || 0) + 1,
        last_activity_at: now,
        updated_at: now
      };

      await supabase
        .from('user_learning_profiles')
        .update(updatedProfile)
        .eq('user_id', userId)
        .eq('subject_code', subjectCode);
    }

  } catch (error) {
    console.error('Update user learning stats error:', error);
    // 不抛出错误，避免影响主要功能
  }
}

// 记录学习活动日志
async function logLearningActivity(userId, activityType, metadata) {
  try {
    const logEntry = {
      user_id: userId,
      activity_type: activityType,
      metadata: metadata,
      created_at: new Date().toISOString()
    };

    await supabase
      .from('user_activity_logs')
      .insert([logEntry]);

  } catch (error) {
    console.error('Log learning activity error:', error);
    // 不抛出错误，避免影响主要功能
  }
}

// 生成会话ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}