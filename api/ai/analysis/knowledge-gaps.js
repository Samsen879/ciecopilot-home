// /api/ai/analysis/knowledge-gaps.js
// 知识点缺陷分析API
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

// 获取用户学习历史数据
async function getUserLearningHistory(userId, subjectCode, supabase) {
  try {
    // 获取用户的学习记录
    const { data: learningRecords, error: recordsError } = await supabase
      .from('user_learning_records')
      .select(`
        *,
        topics!inner(id, name, subject_code)
      `)
      .eq('user_id', userId)
      .eq('topics.subject_code', subjectCode)
      .order('created_at', { ascending: false })
      .limit(100)

    if (recordsError) {
      console.error('Error fetching learning records:', recordsError)
      return []
    }

    // 获取用户的错题记录
    const { data: errorRecords, error: errorsError } = await supabase
      .from('user_errors')
      .select(`
        *,
        topics!inner(id, name, subject_code)
      `)
      .eq('user_id', userId)
      .eq('topics.subject_code', subjectCode)
      .order('created_at', { ascending: false })
      .limit(50)

    if (errorsError) {
      console.error('Error fetching error records:', errorsError)
    }

    return {
      learningRecords: learningRecords || [],
      errorRecords: errorRecords || []
    }
  } catch (error) {
    console.error('Failed to fetch user learning history:', error)
    return { learningRecords: [], errorRecords: [] }
  }
}

// 分析主题掌握程度
function analyzeTopicMastery(learningRecords, errorRecords) {
  const topicStats = {}
  
  // 分析学习记录
  learningRecords.forEach(record => {
    const topicId = record.topic_id
    if (!topicStats[topicId]) {
      topicStats[topicId] = {
        topic_id: topicId,
        topic_name: record.topics?.name || 'Unknown Topic',
        total_attempts: 0,
        correct_attempts: 0,
        total_time_spent: 0,
        last_attempt: null,
        difficulty_levels: {},
        error_patterns: []
      }
    }
    
    const stats = topicStats[topicId]
    stats.total_attempts += 1
    if (record.is_correct) {
      stats.correct_attempts += 1
    }
    stats.total_time_spent += record.time_spent || 0
    
    if (!stats.last_attempt || new Date(record.created_at) > new Date(stats.last_attempt)) {
      stats.last_attempt = record.created_at
    }
    
    // 记录难度级别表现
    const difficulty = record.difficulty_level || 'intermediate'
    if (!stats.difficulty_levels[difficulty]) {
      stats.difficulty_levels[difficulty] = { attempts: 0, correct: 0 }
    }
    stats.difficulty_levels[difficulty].attempts += 1
    if (record.is_correct) {
      stats.difficulty_levels[difficulty].correct += 1
    }
  })
  
  // 分析错题记录
  errorRecords.forEach(error => {
    const topicId = error.topic_id
    if (topicStats[topicId]) {
      topicStats[topicId].error_patterns.push({
        error_type: error.error_type,
        description: error.description,
        created_at: error.created_at
      })
    }
  })
  
  return Object.values(topicStats)
}

// 计算知识缺陷评分
function calculateKnowledgeGapScore(topicStats) {
  return topicStats.map(stats => {
    let gapScore = 0
    let priority = 'low'
    let confidence = stats.total_attempts > 0 ? stats.correct_attempts / stats.total_attempts : 0
    
    // 基于正确率计算缺陷评分
    if (confidence < 0.3) {
      gapScore = 0.9
      priority = 'high'
    } else if (confidence < 0.6) {
      gapScore = 0.6
      priority = 'medium'
    } else if (confidence < 0.8) {
      gapScore = 0.3
      priority = 'low'
    } else {
      gapScore = 0.1
      priority = 'low'
    }
    
    // 考虑最近学习时间
    if (stats.last_attempt) {
      const daysSinceLastAttempt = (Date.now() - new Date(stats.last_attempt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLastAttempt > 14) {
        gapScore += 0.2 // 长时间未练习增加缺陷评分
      }
    }
    
    // 考虑错误模式
    if (stats.error_patterns.length > 3) {
      gapScore += 0.1
      if (priority === 'low') priority = 'medium'
    }
    
    // 考虑学习时间效率
    if (stats.total_attempts > 0) {
      const avgTimePerAttempt = stats.total_time_spent / stats.total_attempts
      if (avgTimePerAttempt > 300) { // 超过5分钟平均时间
        gapScore += 0.1
      }
    }
    
    return {
      topic_id: stats.topic_id,
      topic_name: stats.topic_name,
      confidence_score: Math.max(0, Math.min(1, confidence)),
      gap_score: Math.max(0, Math.min(1, gapScore)),
      priority,
      total_attempts: stats.total_attempts,
      correct_rate: confidence,
      last_attempt: stats.last_attempt,
      recommended_actions: generateRecommendedActions(stats, gapScore, priority),
      difficulty_analysis: analyzeDifficultyPerformance(stats.difficulty_levels),
      error_patterns: stats.error_patterns.slice(0, 5) // 最近5个错误
    }
  })
}

// 生成推荐行动
function generateRecommendedActions(stats, gapScore, priority) {
  const actions = []
  
  if (priority === 'high') {
    actions.push('立即复习基础概念')
    actions.push('完成基础练习题')
    actions.push('寻求老师或同学帮助')
  } else if (priority === 'medium') {
    actions.push('复习相关知识点')
    actions.push('完成中等难度练习')
    actions.push('总结常见错误模式')
  } else {
    actions.push('定期复习巩固')
    actions.push('尝试更高难度题目')
    actions.push('帮助其他同学学习')
  }
  
  // 基于错误模式添加特定建议
  if (stats.error_patterns.length > 0) {
    const commonErrors = stats.error_patterns.reduce((acc, error) => {
      acc[error.error_type] = (acc[error.error_type] || 0) + 1
      return acc
    }, {})
    
    const mostCommonError = Object.keys(commonErrors).reduce((a, b) => 
      commonErrors[a] > commonErrors[b] ? a : b
    )
    
    if (mostCommonError === 'calculation') {
      actions.push('加强计算练习')
    } else if (mostCommonError === 'concept') {
      actions.push('深入理解概念原理')
    } else if (mostCommonError === 'application') {
      actions.push('多做应用题练习')
    }
  }
  
  return actions
}

// 分析不同难度级别的表现
function analyzeDifficultyPerformance(difficultyLevels) {
  const analysis = {}
  
  Object.keys(difficultyLevels).forEach(level => {
    const data = difficultyLevels[level]
    analysis[level] = {
      attempts: data.attempts,
      correct_rate: data.attempts > 0 ? data.correct / data.attempts : 0,
      recommendation: data.attempts > 0 && data.correct / data.attempts < 0.6 
        ? `需要加强${level}难度练习` 
        : `${level}难度掌握良好`
    }
  })
  
  return analysis
}

// 使用AI分析学习模式
async function analyzeWithAI(knowledgeGaps, chatConfig) {
  try {
    const prompt = `作为教育数据分析专家，请分析以下学生的知识缺陷数据，提供个性化的学习建议：

${JSON.stringify(knowledgeGaps, null, 2)}

请提供：
1. 整体学习状况评估
2. 优先改进的知识点
3. 学习策略建议
4. 预计改进时间

请用中文回答，保持简洁实用。`

    const response = await fetch(`${chatConfig.CHAT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chatConfig.CHAT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: chatConfig.CHAT_MODEL,
        messages: [
          { role: 'system', content: '你是一位专业的教育数据分析师，擅长分析学生学习数据并提供个性化建议。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    }
  } catch (error) {
    console.error('AI analysis failed:', error)
  }
  
  return ''
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
    const { SUPABASE_URL, SUPABASE_KEY, CHAT_BASE_URL, CHAT_API_KEY, CHAT_MODEL } = getEnv()
    
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
      include_ai_analysis = false
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
        userMessage: '请选择要分析的学科。'
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    
    // 1. 获取用户学习历史
    const { learningRecords, errorRecords } = await getUserLearningHistory(user_id, subject_code, supabase)
    
    if (learningRecords.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          knowledge_gaps: [],
          summary: {
            total_topics_analyzed: 0,
            high_priority_gaps: 0,
            medium_priority_gaps: 0,
            low_priority_gaps: 0,
            overall_confidence: 0
          },
          ai_analysis: '暂无学习数据，建议开始学习并完成一些练习后再进行分析。',
          recommendations: [
            '开始学习基础知识点',
            '完成一些练习题',
            '记录学习过程中的问题'
          ]
        }
      })
    }
    
    // 2. 分析主题掌握程度
    const topicStats = analyzeTopicMastery(learningRecords, errorRecords)
    
    // 3. 计算知识缺陷评分
    const knowledgeGaps = calculateKnowledgeGapScore(topicStats)
    
    // 4. 生成汇总统计
    const summary = {
      total_topics_analyzed: knowledgeGaps.length,
      high_priority_gaps: knowledgeGaps.filter(gap => gap.priority === 'high').length,
      medium_priority_gaps: knowledgeGaps.filter(gap => gap.priority === 'medium').length,
      low_priority_gaps: knowledgeGaps.filter(gap => gap.priority === 'low').length,
      overall_confidence: knowledgeGaps.length > 0 
        ? knowledgeGaps.reduce((sum, gap) => sum + gap.confidence_score, 0) / knowledgeGaps.length 
        : 0
    }
    
    // 5. AI分析（可选）
    let aiAnalysis = ''
    if (include_ai_analysis && CHAT_API_KEY) {
      aiAnalysis = await analyzeWithAI(knowledgeGaps.slice(0, 10), { CHAT_BASE_URL, CHAT_API_KEY, CHAT_MODEL })
    }
    
    // 6. 生成整体建议
    const recommendations = []
    if (summary.high_priority_gaps > 0) {
      recommendations.push('优先处理高优先级知识缺陷')
      recommendations.push('寻求额外的学习支持')
    }
    if (summary.medium_priority_gaps > 0) {
      recommendations.push('制定系统的复习计划')
      recommendations.push('增加相关练习量')
    }
    if (summary.overall_confidence > 0.8) {
      recommendations.push('尝试更高难度的挑战')
      recommendations.push('帮助其他同学学习')
    }
    
    // 按优先级和缺陷评分排序
    knowledgeGaps.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.gap_score - a.gap_score
    })
    
    return res.status(200).json({
      success: true,
      data: {
        knowledge_gaps: knowledgeGaps,
        summary,
        ai_analysis: aiAnalysis,
        recommendations,
        analysis_timestamp: new Date().toISOString(),
        subject_code
      }
    })

  } catch (error) {
    console.error('Knowledge Gap Analysis Error:', error)
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      userMessage: '知识缺陷分析服务暂时不可用，请稍后重试。'
    })
  }
}