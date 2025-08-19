// 社区数据服务（基于 Supabase）
import { supabase } from '../utils/supabase'

const DEFAULT_PAGE_SIZE = 20

// 将后端记录映射为前端UI所需结构
function mapQuestionRecord(record) {
  if (!record) return null
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    subject_code: record.subject_code,
    tags: record.tags || [],
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    views: record.view_count || 0,
    replies: record.answer_count || 0,
    likes: record.vote_score || 0,
    isResolved: record.status === 'resolved',
    isPinned: record.is_featured || false,
    hasAcceptedAnswer: Boolean(record.answer_count && record.answer_count > 0 && record.best_answer_count > 0),
    author: {
      id: record.author_id,
      name: record.author?.display_name || 'Anonymous',
      avatar: record.author?.avatar_url || '👤',
      reputation: record.author?.reputation_score || 0,
      badge: record.author?.role || 'student'
    },
    lastReply: null
  }
}

export async function fetchQuestions({
  subjectCode,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  search = '',
  sort = 'latest'
} = {}) {
  const offset = (Math.max(1, page) - 1) * Math.max(1, limit)

  // 基础选择及关联作者信息
  let query = supabase
    .from('community_questions')
    .select(`
      id, title, content, subject_code, author_id, status,
      view_count, answer_count, vote_score, is_featured,
      created_at, updated_at,
      author:user_community_profiles!author_id(
        display_name, avatar_url, reputation_score, role
      )
    `, { count: 'exact' })

  if (subjectCode) {
    query = query.eq('subject_code', subjectCode)
  }

  if (search && search.trim()) {
    const s = search.trim()
    query = query.or(`title.ilike.%${s}%,content.ilike.%${s}%`)
  }

  switch (sort) {
    case 'popular':
      query = query.order('vote_score', { ascending: false })
      break
    case 'views':
      query = query.order('view_count', { ascending: false })
      break
    case 'replies':
      query = query.order('answer_count', { ascending: false })
      break
    case 'latest':
    default:
      query = query.order('updated_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error

  // 批量查询标签
  const ids = (data || []).map(q => q.id)
  let tagsByQuestion = {}
  if (ids.length > 0) {
    const { data: tagRows, error: tagErr } = await supabase
      .from('content_tags')
      .select('content_id, tag_name')
      .eq('content_type', 'question')
      .in('content_id', ids)
    if (!tagErr && tagRows) {
      tagsByQuestion = tagRows.reduce((acc, row) => {
        acc[row.content_id] = acc[row.content_id] || []
        acc[row.content_id].push(row.tag_name)
        return acc
      }, {})
    }
  }

  const questions = (data || []).map(q => mapQuestionRecord({
    ...q,
    tags: tagsByQuestion[q.id] || []
  }))

  const total = typeof count === 'number' ? count : questions.length
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)))

  return {
    questions,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  }
}

export async function createQuestion({ title, content, subject_code, tags = [] }, currentUserId) {
  if (!currentUserId) throw new Error('User not authenticated')
  if (!title || !content || !subject_code) throw new Error('Missing required fields')

  const now = new Date().toISOString()

  const { data: inserted, error } = await supabase
    .from('community_questions')
    .insert({
      title: title.trim(),
      content: content.trim(),
      subject_code,
      author_id: currentUserId,
      status: 'open',
      view_count: 0,
      answer_count: 0,
      vote_score: 0,
      is_featured: false,
      created_at: now,
      updated_at: now
    })
    .select('*')
    .single()

  if (error) throw error

  // 插入标签（可选）
  const normalizedTags = (tags || []).map(t => (t || '').trim().toLowerCase()).filter(Boolean)
  if (normalizedTags.length > 0) {
    const tagRows = normalizedTags.map(tag => ({
      content_type: 'question',
      content_id: inserted.id,
      tag_name: tag
    }))
    await supabase.from('content_tags').insert(tagRows)
  }

  // 返回完整记录
  // 重新查询以带上作者与标签
  const { questions } = await fetchQuestions({
    subjectCode: subject_code,
    page: 1,
    limit: 1,
    search: inserted.title
  })
  const created = questions.find(q => q.id === inserted.id) || mapQuestionRecord({ ...inserted, tags: normalizedTags })
  return created
}

export async function fetchQuestionById(questionId) {
  const { data, error } = await supabase
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
    .single()
  if (error) throw error

  // 取标签
  const { data: tagRows } = await supabase
    .from('content_tags')
    .select('content_id, tag_name')
    .eq('content_type', 'question')
    .eq('content_id', questionId)

  const tags = (tagRows || []).map(r => r.tag_name)
  return mapQuestionRecord({ ...data, tags })
}


