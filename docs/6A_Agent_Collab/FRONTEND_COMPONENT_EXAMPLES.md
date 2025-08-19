# 前端组件实现示例

本文档提供社区系统核心组件的实现示例，帮助Agent B快速开始开发。

## 1. 问题列表组件 (QuestionList.jsx)

```jsx
// src/components/Community/QuestionList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { communityApi } from '../../api/communityApi';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const QuestionList = ({ subjectCode = null, searchTerm = '' }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    difficulty: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, filters, subjectCode, searchTerm]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm,
        subject_code: subjectCode,
        difficulty_level: filters.difficulty,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder
      };
      
      const response = await communityApi.getQuestions(params);
      setQuestions(response.questions);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getDifficultyColor = (level) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">加载问题时出错: {error}</p>
        <button 
          onClick={fetchQuestions}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <select 
            value={filters.difficulty} 
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有难度</option>
            <option value="beginner">初级</option>
            <option value="intermediate">中级</option>
            <option value="advanced">高级</option>
          </select>
          
          <select 
            value={filters.sortBy} 
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at">发布时间</option>
            <option value="upvotes">点赞数</option>
            <option value="answer_count">回答数</option>
            <option value="view_count">浏览数</option>
          </select>
          
          <select 
            value={filters.sortOrder} 
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
      </div>

      {/* 问题列表 */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">暂无问题</p>
            <Link 
              to="/community/ask" 
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              发布第一个问题
            </Link>
          </div>
        ) : (
          questions.map(question => (
            <div key={question.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <Link 
                    to={`/community/questions/${question.id}`}
                    className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {question.title}
                  </Link>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty_level)}`}>
                    {question.difficulty_level === 'beginner' && '初级'}
                    {question.difficulty_level === 'intermediate' && '中级'}
                    {question.difficulty_level === 'advanced' && '高级'}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {question.content.substring(0, 200)}...
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {question.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>👤 {question.author_name}</span>
                    <span>📅 {formatDistanceToNow(new Date(question.created_at), { addSuffix: true, locale: zhCN })}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      👍 {question.upvotes}
                    </span>
                    <span className="flex items-center">
                      💬 {question.answer_count}
                    </span>
                    <span className="flex items-center">
                      👁️ {question.view_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          
          <span className="px-4 py-2 text-gray-700">
            第 {currentPage} 页，共 {pagination.totalPages} 页
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
            disabled={currentPage === pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionList;
```

## 2. 问题详情组件 (QuestionDetail.jsx)

```jsx
// src/components/Community/QuestionDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { communityApi } from '../../api/communityApi';
import { useAuth } from '../../contexts/AuthContext';
import VoteButtons from './VoteButtons';
import AnswerForm from './AnswerForm';
import AnswerList from './AnswerList';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const QuestionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnswerForm, setShowAnswerForm] = useState(false);

  useEffect(() => {
    fetchQuestionDetail();
  }, [id]);

  const fetchQuestionDetail = async () => {
    try {
      setLoading(true);
      const response = await communityApi.getQuestion(id);
      setQuestion(response.question);
      setAnswers(response.answers || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmitted = (newAnswer) => {
    setAnswers(prev => [newAnswer, ...prev]);
    setShowAnswerForm(false);
    // 更新问题的回答数
    setQuestion(prev => ({
      ...prev,
      answer_count: (prev.answer_count || 0) + 1
    }));
  };

  const handleVoteUpdate = (contentType, contentId, newVotes) => {
    if (contentType === 'question' && contentId === question.id) {
      setQuestion(prev => ({ ...prev, ...newVotes }));
    } else if (contentType === 'answer') {
      setAnswers(prev => prev.map(answer => 
        answer.id === contentId ? { ...answer, ...newVotes } : answer
      ));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow animate-pulse">
          <div className="p-6">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">加载问题详情时出错: {error}</p>
          <button 
            onClick={fetchQuestionDetail}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-600">问题不存在</p>
          <Link to="/community" className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            返回社区
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 问题详情 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{question.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              question.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800' :
              question.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {question.difficulty_level === 'beginner' && '初级'}
              {question.difficulty_level === 'intermediate' && '中级'}
              {question.difficulty_level === 'advanced' && '高级'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
            <span>👤 {question.author?.name || '匿名用户'}</span>
            <span>📅 {new Date(question.created_at).toLocaleString('zh-CN')}</span>
            <span>👁️ {question.view_count || 0} 次浏览</span>
          </div>
          
          <div className="prose max-w-none mb-6">
            <ReactMarkdown 
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {question.content}
            </ReactMarkdown>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {question.tags?.map(tag => (
              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <VoteButtons 
              contentType="question"
              contentId={question.id}
              upvotes={question.upvotes || 0}
              downvotes={question.downvotes || 0}
              onVoteUpdate={(newVotes) => handleVoteUpdate('question', question.id, newVotes)}
            />
            
            {user && (
              <button
                onClick={() => setShowAnswerForm(!showAnswerForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {showAnswerForm ? '取消回答' : '写回答'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 回答表单 */}
      {showAnswerForm && user && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">写下你的回答</h3>
            <AnswerForm 
              questionId={question.id}
              onAnswerSubmitted={handleAnswerSubmitted}
              onCancel={() => setShowAnswerForm(false)}
            />
          </div>
        </div>
      )}

      {/* 回答列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {answers.length} 个回答
          </h3>
          <AnswerList 
            answers={answers}
            onVoteUpdate={handleVoteUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionDetail;
```

## 3. 投票按钮组件 (VoteButtons.jsx)

```jsx
// src/components/Community/VoteButtons.jsx
import React, { useState, useEffect } from 'react';
import { communityApi } from '../../api/communityApi';
import { useAuth } from '../../contexts/AuthContext';

const VoteButtons = ({ 
  contentType, 
  contentId, 
  upvotes = 0, 
  downvotes = 0, 
  onVoteUpdate 
}) => {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState(null); // 'upvote', 'downvote', null
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes);
  const [currentDownvotes, setCurrentDownvotes] = useState(downvotes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserVote();
    }
  }, [user, contentId]);

  const fetchUserVote = async () => {
    try {
      const response = await communityApi.getUserInteractions();
      const vote = response.interactions.find(interaction => 
        interaction.content_id === contentId && 
        (interaction.interaction_type === 'upvote' || interaction.interaction_type === 'downvote')
      );
      if (vote) {
        setUserVote(vote.interaction_type);
      }
    } catch (error) {
      console.error('获取用户投票状态失败:', error);
    }
  };

  const handleVote = async (voteType) => {
    if (!user) {
      alert('请先登录');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      
      // 如果点击的是当前投票类型，则取消投票
      if (userVote === voteType) {
        // 这里需要实现取消投票的API
        // await communityApi.deleteInteraction(interactionId);
        setUserVote(null);
        if (voteType === 'upvote') {
          setCurrentUpvotes(prev => prev - 1);
        } else {
          setCurrentDownvotes(prev => prev - 1);
        }
      } else {
        // 提交新的投票
        await communityApi.createInteraction({
          contentType,
          contentId,
          interactionType: voteType
        });
        
        // 更新本地状态
        if (userVote === 'upvote' && voteType === 'downvote') {
          setCurrentUpvotes(prev => prev - 1);
          setCurrentDownvotes(prev => prev + 1);
        } else if (userVote === 'downvote' && voteType === 'upvote') {
          setCurrentDownvotes(prev => prev - 1);
          setCurrentUpvotes(prev => prev + 1);
        } else if (voteType === 'upvote') {
          setCurrentUpvotes(prev => prev + 1);
        } else {
          setCurrentDownvotes(prev => prev + 1);
        }
        
        setUserVote(voteType);
      }
      
      // 通知父组件更新
      if (onVoteUpdate) {
        onVoteUpdate({
          upvotes: currentUpvotes,
          downvotes: currentDownvotes
        });
      }
    } catch (error) {
      console.error('投票失败:', error);
      alert('投票失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => handleVote('upvote')}
        disabled={loading}
        className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
          userVote === 'upvote' 
            ? 'bg-green-100 text-green-700 border border-green-300' 
            : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="text-lg">👍</span>
        <span className="font-medium">{currentUpvotes}</span>
      </button>
      
      <button
        onClick={() => handleVote('downvote')}
        disabled={loading}
        className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
          userVote === 'downvote' 
            ? 'bg-red-100 text-red-700 border border-red-300' 
            : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="text-lg">👎</span>
        <span className="font-medium">{currentDownvotes}</span>
      </button>
    </div>
  );
};

export default VoteButtons;
```

## 4. 问题发布表单 (QuestionForm.jsx)

```jsx
// src/components/Community/QuestionForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '../../api/communityApi';
import { useAuth } from '../../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const QuestionForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subject_code: '9709',
    tags: '',
    difficulty_level: 'intermediate'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subjectOptions = [
    { value: '9709', label: '数学 (9709)' },
    { value: '9702', label: '物理 (9702)' },
    { value: '9701', label: '化学 (9701)' },
    { value: '9700', label: '生物 (9700)' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('请先登录');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('标题和内容不能为空');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const questionData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        author_id: user.id
      };
      
      const response = await communityApi.createQuestion(questionData);
      
      if (response.success) {
        navigate(`/community/questions/${response.question.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-600">请先登录后再发布问题</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">发布问题</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 标题 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                问题标题 *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="请输入问题标题"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {/* 学科和难度 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject_code" className="block text-sm font-medium text-gray-700 mb-2">
                  学科
                </label>
                <select
                  id="subject_code"
                  name="subject_code"
                  value={formData.subject_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {subjectOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="difficulty_level" className="block text-sm font-medium text-gray-700 mb-2">
                  难度等级
                </label>
                <select
                  id="difficulty_level"
                  name="difficulty_level"
                  value={formData.difficulty_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">初级</option>
                  <option value="intermediate">中级</option>
                  <option value="advanced">高级</option>
                </select>
              </div>
            </div>
            
            {/* 标签 */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                标签 (用逗号分隔)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="例如: 微积分, 导数, 极限"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* 内容编辑器 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  问题内容 * (支持Markdown格式)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  {showPreview ? '编辑' : '预览'}
                </button>
              </div>
              
              {showPreview ? (
                <div className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md bg-gray-50">
                  <div className="prose max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {formData.content || '暂无内容'}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="请详细描述你的问题...\n\n支持Markdown语法，例如:\n- **粗体文字**\n- *斜体文字*\n- `代码`\n- 数学公式: $x^2 + y^2 = z^2$"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
            </div>
            
            {/* 提交按钮 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/community')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? '发布中...' : '发布问题'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;
```

## 5. 用户档案组件 (UserProfile.jsx)

```jsx
// src/components/Community/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { communityApi } from '../../api/communityApi';
import { useAuth } from '../../contexts/AuthContext';
import BadgeDisplay from './BadgeDisplay';
import ReputationCard from './ReputationCard';

const UserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const isOwnProfile = user && user.id === userId;

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [profileResponse, badgesResponse, reputationResponse] = await Promise.all([
        communityApi.getUserProfile(userId),
        communityApi.getUserBadges(userId),
        communityApi.getUserReputation(userId)
      ]);
      
      setProfile(profileResponse.profile);
      setBadges(badgesResponse.badges);
      setReputation(reputationResponse.reputation);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow animate-pulse">
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">加载用户档案时出错: {error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-600">用户不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 用户基本信息 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <img
                src={profile.avatar_url || '/default-avatar.png'}
                alt={profile.display_name}
                className="w-20 h-20 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.display_name || '匿名用户'}
                </h1>
                <p className="text-gray-600">{profile.bio || '这个用户很懒，什么都没写'}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>声誉: {reputation?.current_score || 0}</span>
                  <span>等级: {reputation?.level?.name || '新手'}</span>
                  <span>徽章: {badges?.statistics?.total_earned || 0}</span>
                </div>
              </div>
            </div>
            
            {isOwnProfile && (
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                编辑档案
              </button>
            )}
          </div>
          
          {/* 统计数据 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {profile.statistics?.questions_asked || 0}
              </div>
              <div className="text-sm text-gray-600">提问</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {profile.statistics?.answers_given || 0}
              </div>
              <div className="text-sm text-gray-600">回答</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {profile.statistics?.upvotes_received || 0}
              </div>
              <div className="text-sm text-gray-600">获赞</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {profile.statistics?.best_answers || 0}
              </div>
              <div className="text-sm text-gray-600">最佳答案</div>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: '概览' },
              { id: 'badges', label: '徽章' },
              { id: 'reputation', label: '声誉' },
              { id: 'activity', label: '活动' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">最近活动</h3>
                <div className="space-y-3">
                  {profile.recent_activity?.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">
                        {activity.type === 'question_posted' && '❓'}
                        {activity.type === 'answer_posted' && '💬'}
                        {activity.type === 'badge_earned' && '🏆'}
                      </span>
                      <div>
                        <p className="text-sm text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500">暂无活动记录</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'badges' && badges && (
            <BadgeDisplay badges={badges} />
          )}
          
          {activeTab === 'reputation' && reputation && (
            <ReputationCard reputation={reputation} />
          )}
          
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">完整活动记录</h3>
              <div className="space-y-3">
                {profile.recent_activity?.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <span className="text-2xl">
                      {activity.type === 'question_posted' && '❓'}
                      {activity.type === 'answer_posted' && '💬'}
                      {activity.type === 'badge_earned' && '🏆'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500">暂无活动记录</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
```

## 使用说明

### 1. 安装依赖

```bash
npm install react-markdown remark-math rehype-katex date-fns
```

### 2. 样式配置

确保在项目中引入KaTeX样式：

```javascript
// 在main.jsx或App.jsx中引入
import 'katex/dist/katex.min.css';
```

### 3. 路由配置

在`src/App.jsx`中添加路由：

```jsx
import QuestionList from './components/Community/QuestionList';
import QuestionDetail from './components/Community/QuestionDetail';
import QuestionForm from './components/Community/QuestionForm';
import UserProfile from './components/Community/UserProfile';

// 在路由配置中添加
<Route path="/community" element={<QuestionList />} />
<Route path="/community/questions" element={<QuestionList />} />
<Route path="/community/questions/:id" element={<QuestionDetail />} />
<Route path="/community/ask" element={<QuestionForm />} />
<Route path="/community/users/:userId" element={<UserProfile />} />
<Route path="/community/:subjectCode" element={<QuestionList />} />
```

### 4. API客户端配置

确保按照API集成指南配置好API客户端和认证系统。

### 5. 样式优化

这些组件使用Tailwind CSS，确保项目已正确配置Tailwind。可以根据项目的设计系统调整颜色和样式。

### 6. 功能扩展

- 添加图片上传功能
- 实现实时通知
- 添加搜索高亮
- 实现无限滚动
- 添加离线支持

这些示例组件提供了社区系统的核心功能，Agent B可以基于这些示例快速开始开发，并根据具体需求进行调整和扩展。