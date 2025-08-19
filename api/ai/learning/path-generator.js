// /api/ai/learning/path-generator.js
// 学习路径生成器API - 基于时间和正确率的自适应学习路径
import { createClient } from '@supabase/supabase-js'

function getEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  if (!SUPABASE_KEY) {
    SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  }

  const CHAT_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const CHAT_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY
  const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'
  
  return { SUPABASE_URL, SUPABASE_KEY, CHAT_BASE_URL, CHAT_API_KEY, CHAT_MODEL }
}

// 获取学科主题结构
async function getSubjectTopics(subjectCode, supabase) {
  try {
    const { data: topics, error } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_code', subjectCode)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching topics:', error)
      return []
    }

    return topics || []
  } catch (error) {
    console.error('Failed to fetch subject topics:', error)
    return []
  }
}

// 获取用户当前学习状态
async function getUserLearningState(userId, subjectCode, supabase) {
  try {
    // 获取用户档案
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError)
    }

    // 获取学习记录统计
    const { data: learningStats, error: statsError } = await supabase
      .from('user_learning_records')
      .select(`
        topic_id,
        is_correct,
        time_spent,
        difficulty_level,
        created_at,
        topics!inner(id, name, subject_code, prerequisites)
      `)
      .eq('user_id', userId)
      .eq('topics.subject_code', subjectCode)
      .order('created_at', { ascending: false })
      .limit(200)

    if (statsError) {
      console.error('Error fetching learning stats:', statsError)
    }

    return {
      profile: profile || null,
      learningStats: learningStats || []
    }
  } catch (error) {
    console.error('Failed to fetch user learning state:', error)
    return { profile: null, learningStats: [] }
  }
}

// 分析主题依赖关系
function analyzeTopicDependencies(topics) {
  const topicMap = new Map()
  const dependencyGraph = new Map()
  
  // 构建主题映射
  topics.forEach(topic => {
    topicMap.set(topic.id, topic)
    dependencyGraph.set(topic.id, {
      topic,
      prerequisites: topic.prerequisites || [],
      dependents: []
    })
  })
  
  // 构建依赖图
  topics.forEach(topic => {
    if (topic.prerequisites && topic.prerequisites.length > 0) {
      topic.prerequisites.forEach(prereqId => {
        const prereqNode = dependencyGraph.get(prereqId)
        if (prereqNode) {
          prereqNode.dependents.push(topic.id)
        }
      })
    }
  })
  
  return { topicMap, dependencyGraph }
}

// 计算主题掌握度
function calculateTopicMastery(topicId, learningStats) {
  const topicRecords = learningStats.filter(record => record.topic_id === topicId)
  
  if (topicRecords.length === 0) {
    return {
      mastery_level: 0,
      confidence: 0,
      total_attempts: 0,
      recent_performance: 0,
      avg_time: 0,
      last_attempt: null
    }
  }
  
  const totalAttempts = topicRecords.length
  const correctAttempts = topicRecords.filter(r => r.is_correct).length
  const overallAccuracy = correctAttempts / totalAttempts
  
  // 计算最近表现（最近10次尝试）
  const recentRecords = topicRecords.slice(0, 10)
  const recentCorrect = recentRecords.filter(r => r.is_correct).length
  const recentPerformance = recentRecords.length > 0 ? recentCorrect / recentRecords.length : 0
  
  // 计算平均用时
  const avgTime = topicRecords.reduce((sum, r) => sum + (r.time_spent || 0), 0) / totalAttempts
  
  // 计算掌握度（综合考虑整体准确率、最近表现、尝试次数）
  let masteryLevel = overallAccuracy * 0.6 + recentPerformance * 0.4
  
  // 根据尝试次数调整置信度
  let confidence = Math.min(1, totalAttempts / 10) // 10次尝试达到满置信度
  
  // 时间衰减因子（长时间未练习降低掌握度）
  if (topicRecords.length > 0) {
    const daysSinceLastAttempt = (Date.now() - new Date(topicRecords[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLastAttempt > 7) {
      const decayFactor = Math.max(0.5, 1 - (daysSinceLastAttempt - 7) * 0.02)
      masteryLevel *= decayFactor
    }
  }
  
  return {
    mastery_level: Math.max(0, Math.min(1, masteryLevel)),
    confidence,
    total_attempts: totalAttempts,
    recent_performance: recentPerformance,
    avg_time: avgTime,
    last_attempt: topicRecords[0]?.created_at || null
  }
}

// 生成学习路径
function generateLearningPath(topics, userState, preferences = {}) {
  const { topicMap, dependencyGraph } = analyzeTopicDependencies(topics)
  const { learningStats } = userState
  
  // 计算每个主题的掌握情况
  const topicMastery = new Map()
  topics.forEach(topic => {
    const mastery = calculateTopicMastery(topic.id, learningStats)
    topicMastery.set(topic.id, mastery)
  })
  
  // 确定学习目标和时间约束
  const targetMasteryLevel = preferences.target_mastery || 0.8
  const dailyStudyTime = preferences.daily_study_time || 60 // 分钟
  const totalDays = preferences.study_duration || 30 // 天
  
  // 识别需要学习的主题
  const topicsToLearn = topics.filter(topic => {
    const mastery = topicMastery.get(topic.id)
    return mastery.mastery_level < targetMasteryLevel
  })
  
  // 按优先级排序主题
  const prioritizedTopics = prioritizeTopics(topicsToLearn, topicMastery, dependencyGraph, preferences)
  
  // 生成时间线
  const timeline = generateTimeline(prioritizedTopics, topicMastery, dailyStudyTime, totalDays)
  
  return {
    path_id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    total_topics: prioritizedTopics.length,
    estimated_duration: totalDays,
    daily_study_time: dailyStudyTime,
    target_mastery: targetMasteryLevel,
    timeline,
    milestones: generateMilestones(timeline),
    adaptive_rules: generateAdaptiveRules(preferences)
  }
}

// 主题优先级排序
function prioritizeTopics(topics, topicMastery, dependencyGraph, preferences) {
  const scored = topics.map(topic => {
    const mastery = topicMastery.get(topic.id)
    const node = dependencyGraph.get(topic.id)
    
    let score = 0
    
    // 基础分数：掌握度越低，优先级越高
    score += (1 - mastery.mastery_level) * 100
    
    // 依赖关系：前置课程优先
    const unmetPrereqs = node.prerequisites.filter(prereqId => {
      const prereqMastery = topicMastery.get(prereqId)
      return prereqMastery && prereqMastery.mastery_level < 0.7
    })
    score -= unmetPrereqs.length * 50 // 有未满足前置条件的降低优先级
    
    // 影响范围：影响更多后续主题的优先级更高
    score += node.dependents.length * 20
    
    // 最近表现：最近表现差的优先级更高
    if (mastery.recent_performance < 0.5) {
      score += 30
    }
    
    // 时间因素：长时间未练习的优先级更高
    if (mastery.last_attempt) {
      const daysSinceLastAttempt = (Date.now() - new Date(mastery.last_attempt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLastAttempt > 14) {
        score += 25
      }
    }
    
    // 用户偏好
    if (preferences.focus_areas && preferences.focus_areas.includes(topic.id)) {
      score += 40
    }
    
    return {
      topic,
      mastery,
      score,
      priority_reason: determinePriorityReason(mastery, unmetPrereqs.length, node.dependents.length)
    }
  })
  
  return scored.sort((a, b) => b.score - a.score)
}

// 确定优先级原因
function determinePriorityReason(mastery, unmetPrereqs, dependents) {
  if (unmetPrereqs > 0) return '需要先完成前置课程'
  if (mastery.mastery_level < 0.3) return '基础薄弱，需要重点加强'
  if (mastery.recent_performance < 0.5) return '最近表现不佳，需要复习'
  if (dependents > 2) return '影响多个后续主题，建议优先掌握'
  if (mastery.mastery_level < 0.6) return '掌握程度一般，需要进一步提升'
  return '巩固提高'
}

// 生成学习时间线
function generateTimeline(prioritizedTopics, topicMastery, dailyStudyTime, totalDays) {
  const timeline = []
  let currentDay = 0
  let remainingDailyTime = dailyStudyTime
  
  for (const { topic, mastery } of prioritizedTopics) {
    if (currentDay >= totalDays) break
    
    // 估算该主题需要的学习时间
    const estimatedTime = estimateTopicStudyTime(topic, mastery)
    
    let allocatedTime = 0
    const sessions = []
    
    while (allocatedTime < estimatedTime && currentDay < totalDays) {
      const sessionTime = Math.min(estimatedTime - allocatedTime, remainingDailyTime, 45) // 最长45分钟一节
      
      if (sessionTime >= 15) { // 最短15分钟
        sessions.push({
          day: currentDay + 1,
          duration: sessionTime,
          activity_type: determineActivityType(allocatedTime, estimatedTime),
          difficulty_level: determineDifficultyLevel(mastery, allocatedTime / estimatedTime)
        })
        
        allocatedTime += sessionTime
        remainingDailyTime -= sessionTime
      }
      
      if (remainingDailyTime < 15) {
        currentDay++
        remainingDailyTime = dailyStudyTime
      }
    }
    
    timeline.push({
      topic_id: topic.id,
      topic_name: topic.name,
      current_mastery: mastery.mastery_level,
      target_mastery: 0.8,
      estimated_time: estimatedTime,
      allocated_time: allocatedTime,
      sessions,
      priority_reason: determinePriorityReason(mastery, 0, 0)
    })
  }
  
  return timeline
}

// 估算主题学习时间
function estimateTopicStudyTime(topic, mastery) {
  const baseTime = 120 // 基础时间2小时
  const complexityMultiplier = topic.difficulty_level === 'advanced' ? 1.5 : topic.difficulty_level === 'beginner' ? 0.8 : 1
  const masteryGap = Math.max(0, 0.8 - mastery.mastery_level)
  
  return Math.round(baseTime * complexityMultiplier * (0.5 + masteryGap))
}

// 确定活动类型
function determineActivityType(completedTime, totalTime) {
  const progress = completedTime / totalTime
  
  if (progress < 0.3) return 'concept_learning'
  if (progress < 0.7) return 'practice'
  return 'review_test'
}

// 确定难度级别
function determineDifficultyLevel(mastery, progress) {
  if (mastery.mastery_level < 0.3) return 'beginner'
  if (mastery.mastery_level < 0.6 || progress < 0.5) return 'intermediate'
  return 'advanced'
}

// 生成里程碑
function generateMilestones(timeline) {
  const milestones = []
  let completedTopics = 0
  let totalTime = 0
  
  timeline.forEach((item, index) => {
    totalTime += item.allocated_time
    completedTopics++
    
    if ((index + 1) % 3 === 0 || index === timeline.length - 1) {
      milestones.push({
        milestone_id: `milestone_${milestones.length + 1}`,
        day: Math.ceil(totalTime / 60), // 假设每天60分钟
        title: `完成${completedTopics}个主题`,
        description: `已掌握${timeline.slice(0, completedTopics).map(t => t.topic_name).join('、')}`,
        reward_type: completedTopics >= timeline.length ? 'completion' : 'progress',
        celebration_message: completedTopics >= timeline.length ? '🎉 恭喜完成所有学习目标！' : `🎯 已完成${Math.round(completedTopics / timeline.length * 100)}%的学习计划`
      })
    }
  })
  
  return milestones
}

// 生成自适应规则
function generateAdaptiveRules(preferences) {
  return {
    performance_adjustment: {
      high_performance: {
        condition: 'recent_accuracy > 0.85',
        action: 'increase_difficulty',
        description: '表现优秀时增加难度'
      },
      low_performance: {
        condition: 'recent_accuracy < 0.5',
        action: 'review_prerequisites',
        description: '表现不佳时复习前置知识'
      }
    },
    time_adjustment: {
      fast_learner: {
        condition: 'avg_time < expected_time * 0.7',
        action: 'add_advanced_topics',
        description: '学习速度快时增加高级内容'
      },
      slow_learner: {
        condition: 'avg_time > expected_time * 1.3',
        action: 'extend_practice_time',
        description: '学习速度慢时延长练习时间'
      }
    },
    motivation_boost: {
      streak_reward: {
        condition: 'consecutive_days >= 7',
        action: 'unlock_bonus_content',
        description: '连续学习7天解锁奖励内容'
      },
      struggle_support: {
        condition: 'failed_attempts >= 3',
        action: 'provide_hints',
        description: '多次失败时提供提示'
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported',
      userMessage: '请求方法不支持，请联系技术支持。'
    })
  }

  try {
    const { SUPABASE_URL, SUPABASE_KEY } = getEnv()
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured',
        userMessage: '服务配置缺失，请联系技术支持。'
      })
    }

    const {
      user_id,
      subject_code,
      preferences = {}
    } = req.body || {}

    // 验证必需参数
    if (!user_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'User ID is required',
        userMessage: '用户身份验证失败，请重新登录。'
      })
    }

    if (!subject_code) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Subject code is required',
        userMessage: '请选择要生成学习路径的学科。'
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    
    // 1. 获取学科主题
    const topics = await getSubjectTopics(subject_code, supabase)
    
    if (topics.length === 0) {
      return res.status(404).json({
        error: 'No topics found',
        message: `No topics found for subject ${subject_code}`,
        userMessage: '该学科暂无可用的学习内容。'
      })
    }
    
    // 2. 获取用户学习状态
    const userState = await getUserLearningState(user_id, subject_code, supabase)
    
    // 3. 生成学习路径
    const learningPath = generateLearningPath(topics, userState, preferences)
    
    // 4. 保存学习路径到数据库（可选）
    try {
      const { error: saveError } = await supabase
        .from('user_learning_paths')
        .upsert({
          user_id,
          subject_code,
          path_data: learningPath,
          preferences,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,subject_code'
        })
      
      if (saveError) {
        console.error('Failed to save learning path:', saveError)
      }
    } catch (saveError) {
      console.error('Error saving learning path:', saveError)
    }
    
    return res.status(200).json({
      success: true,
      data: {
        learning_path: learningPath,
        user_state: {
          total_topics: topics.length,
          topics_to_learn: learningPath.total_topics,
          estimated_completion: `${learningPath.estimated_duration}天`,
          daily_commitment: `${learningPath.daily_study_time}分钟/天`
        },
        next_steps: [
          '开始第一个学习主题',
          '设置每日学习提醒',
          '准备学习材料和笔记'
        ]
      }
    })

  } catch (error) {
    console.error('Learning Path Generator Error:', error)
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      userMessage: '学习路径生成服务暂时不可用，请稍后重试。'
    })
  }
}