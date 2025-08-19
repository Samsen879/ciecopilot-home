// /api/ai/tutor/chat.js
// AI辅导核心引擎 - 精细化辅导API
import { createClient } from '@supabase/supabase-js'

function getEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  if (!SUPABASE_KEY) {
    SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  }

  const EMBEDDING_BASE_URL =
    process.env.VECTOR_EMBEDDING_BASE_URL ||
    process.env.EMBEDDING_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1'
  const EMBEDDING_API_KEY =
    process.env.VECTOR_EMBEDDING_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_TOKEN ||
    process.env.OPENAI_KEY
  const EMBEDDING_MODEL =
    process.env.VECTOR_EMBEDDING_MODEL ||
    process.env.EMBEDDING_MODEL ||
    'text-embedding-3-small'
  const EMBEDDING_DIMENSIONS = (() => {
    const v = process.env.VECTOR_EMBEDDING_DIMENSIONS || process.env.EMBEDDING_DIMENSIONS
    const n = v ? Number(v) : undefined
    return Number.isFinite(n) && n > 0 ? n : undefined
  })()
  
  const CHAT_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const CHAT_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY
  const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'
  
  return { SUPABASE_URL, SUPABASE_KEY, EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, CHAT_BASE_URL, CHAT_API_KEY, CHAT_MODEL }
}

// 生成向量嵌入
async function generateEmbedding(text, { EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS }) {
  const response = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      ...(EMBEDDING_DIMENSIONS && { dimensions: EMBEDDING_DIMENSIONS })
    })
  })

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

// RAG搜索相关知识
async function searchRelevantKnowledge(query, context, supabase, embeddingConfig) {
  try {
    const embedding = await generateEmbedding(query, embeddingConfig)
    
    let searchQuery = supabase
      .rpc('search_knowledge_chunks', {
        query_embedding: embedding,
        subject_filter: context.subject_code,
        match_count: 6,
        min_similarity: 0.3
      })
    
    if (context.topic_id) {
      searchQuery = searchQuery.eq('topic_id', context.topic_id)
    }
    
    const { data: chunks, error } = await searchQuery
    
    if (error) {
      console.error('RAG search error:', error)
      return []
    }
    
    return chunks || []
  } catch (error) {
    console.error('Knowledge search failed:', error)
    return []
  }
}

// 分析知识点缺陷
function analyzeKnowledgeGaps(userMessage, relevantChunks, context) {
  const gaps = []
  
  // 基于用户问题和检索到的知识块分析可能的知识缺陷
  const questionKeywords = userMessage.toLowerCase().match(/\b(how|why|what|when|where|explain|solve|calculate|find|prove)\b/g) || []
  const mathPhysicsTopics = {
    '9709': ['algebra', 'calculus', 'trigonometry', 'statistics', 'mechanics'],
    '9702': ['mechanics', 'waves', 'electricity', 'magnetism', 'atomic', 'quantum']
  }
  
  const subjectTopics = mathPhysicsTopics[context.subject_code] || []
  
  // 检查是否涉及特定主题但缺乏相关知识
  subjectTopics.forEach(topic => {
    if (userMessage.toLowerCase().includes(topic)) {
      const hasRelevantChunk = relevantChunks.some(chunk => 
        chunk.content?.toLowerCase().includes(topic) || 
        chunk.title?.toLowerCase().includes(topic)
      )
      
      if (!hasRelevantChunk || relevantChunks.length < 2) {
        gaps.push({
          topic_id: `${context.subject_code}_${topic}`,
          topic_name: topic.charAt(0).toUpperCase() + topic.slice(1),
          confidence_score: 0.4,
          priority: 'medium',
          recommended_actions: [
            `复习${topic}的基础概念`,
            `练习${topic}相关题目`,
            `查看${topic}的详细笔记`
          ]
        })
      }
    }
  })
  
  return gaps
}

// 生成个性化建议
function generateSuggestions(userMessage, context, knowledgeGaps) {
  const suggestions = []
  
  // 基于学习风格的建议
  if (context.learning_style === 'visual') {
    suggestions.push({
      type: 'concept',
      title: '可视化学习建议',
      content: '建议查看相关图表、公式推导过程和几何图形来加深理解',
      action_url: `/topics/${context.subject_code}?view=visual`
    })
  } else if (context.learning_style === 'kinesthetic') {
    suggestions.push({
      type: 'practice',
      title: '实践练习建议',
      content: '建议通过大量练习题来巩固概念理解',
      action_url: `/practice/${context.subject_code}`
    })
  }
  
  // 基于难度级别的建议
  if (context.difficulty_level === 'beginner') {
    suggestions.push({
      type: 'review',
      title: '基础概念复习',
      content: '建议先复习相关的基础概念，然后再处理复杂问题',
      action_url: `/topics/${context.subject_code}/basics`
    })
  } else if (context.difficulty_level === 'advanced') {
    suggestions.push({
      type: 'example',
      title: '高级应用示例',
      content: '查看更多高级应用示例和解题技巧',
      action_url: `/examples/${context.subject_code}/advanced`
    })
  }
  
  // 基于知识缺陷的建议
  if (knowledgeGaps.length > 0) {
    suggestions.push({
      type: 'practice',
      title: '针对性练习',
      content: `发现您在${knowledgeGaps[0].topic_name}方面可能需要加强，建议进行针对性练习`,
      action_url: `/practice/${context.subject_code}/${knowledgeGaps[0].topic_id}`
    })
  }
  
  return suggestions
}

// 构建AI辅导提示词
function buildTutorPrompt(userMessage, context, relevantChunks) {
  const subjectNames = {
    '9709': 'A-Level Mathematics',
    '9702': 'A-Level Physics',
    '9231': 'Further Mathematics'
  }
  
  const subjectName = subjectNames[context.subject_code] || 'Academic Subject'
  
  let prompt = `You are an expert AI tutor specializing in ${subjectName} for CIE (Cambridge International Education) students.

Your teaching approach should be:
- Clear and step-by-step explanations
- Identify key concepts and mark scheme points
- Provide examples when helpful
- Encourage critical thinking
- Adapt to the student's learning style: ${context.learning_style}
- Match difficulty level: ${context.difficulty_level}

`
  
  if (relevantChunks.length > 0) {
    prompt += `Relevant knowledge from the curriculum:\n`
    relevantChunks.forEach((chunk, index) => {
      prompt += `[${index + 1}] ${chunk.title || 'Knowledge Point'}: ${chunk.content?.slice(0, 300)}...\n`
    })
    prompt += `\n`
  }
  
  prompt += `Student's question: ${userMessage}\n\nProvide a comprehensive, educational response that helps the student understand the concept thoroughly. If this is a problem-solving question, show the step-by-step solution process.`
  
  return prompt
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
    const { SUPABASE_URL, SUPABASE_KEY, EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, CHAT_BASE_URL, CHAT_API_KEY, CHAT_MODEL } = getEnv()
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured',
        userMessage: '服务配置缺失，请联系技术支持。'
      })
    }
    
    if (!CHAT_API_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'OpenAI API key not configured',
        userMessage: 'AI服务暂时不可用，请稍后重试。'
      })
    }

    const {
      message,
      context = {},
      conversation_id = null
    } = req.body || {}

    // 验证必需参数
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Message is required',
        userMessage: '请输入有效的问题后再提交。'
      })
    }

    if (!context.subject_code) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Subject code is required in context',
        userMessage: '请选择学科后再提问。'
      })
    }

    // 设置默认值
    const tutorContext = {
      subject_code: context.subject_code,
      topic_id: context.topic_id || null,
      difficulty_level: context.difficulty_level || 'intermediate',
      learning_style: context.learning_style || 'visual'
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const embeddingConfig = { EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS }

    // 1. 搜索相关知识
    const relevantChunks = await searchRelevantKnowledge(message, tutorContext, supabase, embeddingConfig)

    // 2. 分析知识点缺陷
    const knowledgeGaps = analyzeKnowledgeGaps(message, relevantChunks, tutorContext)

    // 3. 生成个性化建议
    const suggestions = generateSuggestions(message, tutorContext, knowledgeGaps)

    // 4. 构建AI提示词
    const systemPrompt = buildTutorPrompt(message, tutorContext, relevantChunks)

    // 5. 调用OpenAI API
    const chatResponse = await fetch(`${CHAT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json()
      console.error('OpenAI API Error:', errorData)
      
      let userMessage = 'AI服务遇到问题，请稍后重试。'
      if (chatResponse.status === 429) {
        userMessage = '当前使用人数较多，请稍等片刻后重试。'
      } else if (chatResponse.status === 401) {
        userMessage = 'AI服务认证失败，请联系技术支持。'
      }
      
      return res.status(chatResponse.status).json({
        error: 'OpenAI API Error',
        message: errorData.error?.message || 'Unknown OpenAI API error',
        userMessage
      })
    }

    const chatData = await chatResponse.json()
    const aiResponse = chatData.choices[0]?.message?.content || '抱歉，我无法生成回答。'

    // 6. 生成对话ID（如果没有提供）
    const responseConversationId = conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 7. 返回结构化响应
    return res.status(200).json({
      success: true,
      data: {
        response: aiResponse,
        conversation_id: responseConversationId,
        suggestions,
        knowledge_gaps: knowledgeGaps,
        context: tutorContext,
        citations: relevantChunks.map(chunk => ({
          document_id: chunk.document_id,
          title: chunk.title,
          source_type: chunk.source_type,
          similarity: chunk.similarity
        }))
      }
    })

  } catch (error) {
    console.error('AI Tutor API Error:', error)
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      userMessage: 'AI辅导服务暂时不可用，请稍后重试。'
    })
  }
}