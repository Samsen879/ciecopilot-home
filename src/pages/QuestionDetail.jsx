import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchQuestionById } from '../services/communityService'
import { fetchAnswers, createAnswer } from '../services/communityAnswerService'

const QuestionDetail = () => {
  const { questionId } = useParams()
  const { user } = useAuth()
  const [question, setQuestion] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newAnswer, setNewAnswer] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const q = await fetchQuestionById(questionId)
      const { answers: ans } = await fetchAnswers(questionId, { page: 1, limit: 50 })
      setQuestion(q)
      setAnswers(ans)
    } catch (e) {
      setError(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user?.id) {
      alert('请先登录')
      return
    }
    if (!newAnswer.trim()) return

    try {
      await createAnswer(questionId, newAnswer, user.id)
      setNewAnswer('')
      await load()
    } catch (e) {
      alert(e?.message || '提交失败')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="animate-pulse h-4 w-64 bg-gray-200 rounded" />
      </div>
    )
  }
  if (error) {
    return <div className="container mx-auto p-4 text-red-600">{error}</div>
  }
  if (!question) {
    return <div className="container mx-auto p-4">未找到该问题</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{question.title}</h1>
        <div className="text-sm text-gray-500 mb-4">
          <span className="mr-3">{new Date(question.createdAt).toLocaleString()}</span>
          <span className="mr-3">👀 {question.views}</span>
          <span className="mr-3">💬 {answers.length}</span>
          <span>👍 {question.likes}</span>
        </div>
        <div className="prose max-w-none whitespace-pre-wrap mb-4">{question.content}</div>
        <div className="flex flex-wrap gap-2">
          {(question.tags || []).map(tag => (
            <span key={tag} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">回答</h2>
        <div className="space-y-4">
          {answers.map(ans => (
            <div key={ans.id} className="bg-white shadow-sm rounded-lg p-4 border border-gray-100">
              <div className="text-sm text-gray-500 mb-2">
                <span className="mr-3">{new Date(ans.createdAt).toLocaleString()}</span>
                <span className="mr-3">👍 {ans.likes}</span>
                {ans.isAccepted && <span className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded">已采纳</span>}
              </div>
              <div className="whitespace-pre-wrap">{ans.content}</div>
            </div>
          ))}
          {answers.length === 0 && (
            <div className="text-gray-500">还没有回答，快来第一个回答吧！</div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <h3 className="text-md font-medium mb-2">写下你的回答</h3>
        <textarea
          className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={5}
          value={newAnswer}
          onChange={e => setNewAnswer(e.target.value)}
          placeholder="分享你的思路与解法..."
        />
        <div className="mt-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >提交答案</button>
        </div>
      </form>
    </div>
  )
}

export default QuestionDetail


