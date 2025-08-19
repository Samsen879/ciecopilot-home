// 社区回答与互动服务（基于 Supabase）
import { supabase } from '../utils/supabase'

const DEFAULT_PAGE_SIZE = 20

function mapAnswerRecord(record) {
  if (!record) return null
  return {
    id: record.id,
    questionId: record.question_id,
    content: record.content,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    likes: record.vote_score || 0,
    isAccepted: !!record.is_accepted,
    author: {
      id: record.author_id,
      name: record.author?.display_name || 'Anonymous',
      avatar: record.author?.avatar_url || '👤',
      reputation: record.author?.reputation_score || 0,
      badge: record.author?.role || 'student'
    }
  }
}

export async function fetchAnswers(questionId, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const offset = (Math.max(1, page) - 1) * Math.max(1, limit)
  const { data, error, count } = await supabase
    .from('community_answers')
    .select(`
      id, question_id, content, author_id, vote_score, is_accepted,
      created_at, updated_at,
      author:user_community_profiles!author_id(
        display_name, avatar_url, reputation_score, role
      )
    `, { count: 'exact' })
    .eq('question_id', questionId)
    .order('is_accepted', { ascending: false })
    .order('vote_score', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error
  const answers = (data || []).map(mapAnswerRecord)
  return {
    answers,
    pagination: {
      page,
      limit,
      total: typeof count === 'number' ? count : answers.length,
      totalPages: Math.max(1, Math.ceil((count || answers.length) / Math.max(1, limit)))
    }
  }
}

export async function createAnswer(questionId, content, currentUserId) {
  if (!currentUserId) throw new Error('User not authenticated')
  if (!questionId || !content) throw new Error('Missing required fields')
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('community_answers')
    .insert({
      question_id: questionId,
      content: content.trim(),
      author_id: currentUserId,
      vote_score: 0,
      is_accepted: false,
      created_at: now,
      updated_at: now
    })
    .select('*')
    .single()

  if (error) throw error
  return mapAnswerRecord(data)
}

// 简版点赞：直接累加 vote_score（生产中建议使用 votes 表防重复）
export async function upvoteAnswer(answerId, delta = 1) {
  const { data, error } = await supabase
    .rpc('increment_answer_votes', { p_answer_id: answerId, p_delta: delta })

  // 如未创建 RPC，兜底为直接更新
  if (error) {
    // 读-改-写回退方案（注意并发下建议使用 RPC 或乐观锁）
    const { data: current, error: getErr } = await supabase
      .from('community_answers')
      .select('vote_score')
      .eq('id', answerId)
      .single()
    if (getErr) throw getErr

    const newScore = ((current?.vote_score ?? 0) + delta)
    const { data: updated, error: updErr } = await supabase
      .from('community_answers')
      .update({ vote_score: newScore })
      .eq('id', answerId)
      .select('id, vote_score')
      .single()
    if (updErr) throw updErr
    return updated
  }
  return data
}

export async function acceptAnswer(questionId, answerId, actingUserId) {
  if (!questionId || !answerId) throw new Error('Missing required fields')
  // 生产中请在 RLS/触发器中校验 actingUserId 是否为问题作者

  // 取消其他回答的 is_accepted
  const { error: clearErr } = await supabase
    .from('community_answers')
    .update({ is_accepted: false })
    .eq('question_id', questionId)
  if (clearErr) throw clearErr

  // 设定目标回答为已采纳
  const { data, error } = await supabase
    .from('community_answers')
    .update({ is_accepted: true })
    .eq('id', answerId)
    .select('*')
    .single()
  if (error) throw error

  // 同步问题的状态为 resolved（如果有该字段）
  await supabase
    .from('community_questions')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', questionId)

  return mapAnswerRecord(data)
}


