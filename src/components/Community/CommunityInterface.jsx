import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Users,
  Heart,
  MessageCircle,
  Share2,
  BookOpen,
  Star,
  Award,
  User,
  ChevronUp,
  ChevronDown,
  Tag,
  Pin,
  Flag,
  MoreHorizontal,
  Edit3,
  Trash2,
  Reply,
  Send,
  Image,
  Paperclip,
  Smile
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchQuestions, createQuestion } from '../../services/communityService';

const CommunityInterface = ({ 
  subjectCode, 
  onQuestionClick,
  onNewQuestion,
  className = "" 
}) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    content: '',
    tags: [],
    subject: subjectCode || '',
    difficulty: 'intermediate'
  });

  // 问题类型配置
  const questionTypes = {
    homework: { icon: BookOpen, color: 'blue', label: '作业求助' },
    concept: { icon: MessageSquare, color: 'purple', label: '概念理解' },
    discussion: { icon: Users, color: 'green', label: '学习讨论' },
    resource: { icon: Share2, color: 'orange', label: '资源分享' },
    exam: { icon: Award, color: 'red', label: '考试相关' }
  };

  // 难度等级配置
  const difficultyConfig = {
    beginner: { label: '初级', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    intermediate: { label: '中级', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    advanced: { label: '高级', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700' }
  };

  // 获取问题列表（改为真实API）
  const fetchQuestionsList = async () => {
    setIsLoading(true);
    try {
      const { questions: items } = await fetchQuestions({
        subjectCode,
        search: searchQuery,
        sort: selectedFilter === 'popular' ? 'popular'
             : selectedFilter === 'recent' ? 'latest'
             : selectedFilter === 'resolved' ? 'latest'
             : selectedFilter === 'unanswered' ? 'latest'
             : sortBy,
        page: 1,
        limit: 20
      });

      // 额外前端层面的过滤（未回答/已解决等，基于现有字段推断）
      let filtered = items;
      if (selectedFilter === 'unanswered') {
        filtered = filtered.filter(q => (q.replies || 0) === 0)
      } else if (selectedFilter === 'resolved') {
        filtered = filtered.filter(q => q.isResolved)
      }

      setQuestions(filtered);
    } catch (error) {
      console.error('获取问题列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionsList();
  }, [searchQuery, selectedFilter, sortBy, subjectCode]);

  // 处理新问题提交
  const handleNewQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) {
      alert('请填写问题标题和内容');
      return;
    }

    try {
      if (!user?.id) {
        alert('请先登录');
        return;
      }

      const created = await createQuestion({
        title: newQuestion.title,
        content: newQuestion.content,
        subject_code: subjectCode || '9709',
        tags: newQuestion.tags
      }, user.id);
      
      // 重置表单
      setNewQuestion({
        title: '',
        content: '',
        tags: [],
        subject: subjectCode || '',
        difficulty: 'intermediate'
      });
      setShowNewQuestionModal(false);
      
      // 刷新问题列表
      fetchQuestionsList();
      
      if (onNewQuestion) {
        onNewQuestion(created);
      }
    } catch (error) {
      console.error('提交问题失败:', error);
      alert('提交问题失败，请稍后重试');
    }
  };

  // 处理点赞
  const handleLike = (questionId) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, likes: q.likes + 1 }
        : q
    ));
  };

  // 格式化时间
  const formatTime = (timeString) => {
    const now = new Date();
    const time = new Date(timeString);
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '刚刚';
    if (diffInHours < 24) return `${diffInHours}小时前`;
    if (diffInHours < 48) return '1天前';
    return `${Math.floor(diffInHours / 24)}天前`;
  };

  // 渲染问题卡片
  const renderQuestionCard = (question) => {
    const TypeIcon = questionTypes[question.type]?.icon || MessageSquare;
    const typeConfig = questionTypes[question.type];
    const difficultyInfo = difficultyConfig[question.difficulty];

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
        onClick={() => onQuestionClick && onQuestionClick(question)}
      >
        {/* 问题头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {question.isPinned && (
                <Pin className="w-4 h-4 text-orange-500" />
              )}
              <div className={`w-6 h-6 bg-${typeConfig?.color}-100 rounded flex items-center justify-center`}>
                <TypeIcon className={`w-3 h-3 text-${typeConfig?.color}-600`} />
              </div>
              <span className="text-xs text-gray-500">{typeConfig?.label}</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyInfo.bgColor} ${difficultyInfo.textColor}`}>
                {difficultyInfo.label}
              </span>
              {question.isResolved && (
                <div className="flex items-center space-x-1 text-green-600">
                  <Award className="w-4 h-4" />
                  <span className="text-xs font-medium">已解决</span>
                </div>
              )}
            </div>
            
            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
              {question.title}
            </h3>
            
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {question.content}
            </p>
            
            {/* 标签 */}
            <div className="flex flex-wrap gap-1 mb-3">
              {question.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* 作者信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{question.author.avatar}</span>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {question.author.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {question.author.badge}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Star className="w-3 h-3" />
                  <span>{question.author.reputation}</span>
                  <span>•</span>
                  <span>{formatTime(question.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 互动统计 */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{question.replies}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span>{question.likes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{question.views}</span>
            </div>
          </div>
        </div>

        {/* 最后回复信息 */}
        {question.lastReply && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              最后回复: {question.lastReply.author} • {formatTime(question.lastReply.time)}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-500" />
            学习社区
          </h2>
          <p className="text-gray-600 mt-1">
            与同学们一起讨论问题，分享学习经验
          </p>
        </div>
        
        <button
          onClick={() => setShowNewQuestionModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>提问</span>
        </button>
      </div>

      {/* 搜索和过滤区域 */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索问题、关键词或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* 过滤器 */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">所有问题</option>
            <option value="unanswered">待解答</option>
            <option value="resolved">已解决</option>
            <option value="popular">热门</option>
            <option value="recent">最新</option>
            <option value="homework">作业求助</option>
            <option value="concept">概念理解</option>
            <option value="discussion">学习讨论</option>
            <option value="resource">资源分享</option>
            <option value="exam">考试相关</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="recent">最新回复</option>
            <option value="popular">最多点赞</option>
            <option value="views">最多浏览</option>
            <option value="replies">最多回复</option>
          </select>
        </div>
      </div>

      {/* 问题列表 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
            ))}
          </div>
        ) : questions.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {questions.map(question => renderQuestionCard(question))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-500 mb-2">
              暂无相关问题
            </p>
            <p className="text-gray-400 mb-4">
              试试调整搜索条件或成为第一个提问的人
            </p>
            <button
              onClick={() => setShowNewQuestionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              提出问题
            </button>
          </div>
        )}
      </div>

      {/* 新问题模态框 */}
      <AnimatePresence>
        {showNewQuestionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewQuestionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-6 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  提出新问题
                </h3>
                
                <form onSubmit={handleNewQuestionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      问题标题 *
                    </label>
                    <input
                      type="text"
                      value={newQuestion.title}
                      onChange={(e) => setNewQuestion(prev => ({
                        ...prev,
                        title: e.target.value
                      }))}
                      placeholder="简明扼要地描述你的问题..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      问题描述 *
                    </label>
                    <textarea
                      value={newQuestion.content}
                      onChange={(e) => setNewQuestion(prev => ({
                        ...prev,
                        content: e.target.value
                      }))}
                      placeholder="详细描述你的问题，包括相关背景、已尝试的方法等..."
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        学科
                      </label>
                      <select
                        value={newQuestion.subject}
                        onChange={(e) => setNewQuestion(prev => ({
                          ...prev,
                          subject: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Mathematics">数学</option>
                        <option value="Physics">物理</option>
                        <option value="Chemistry">化学</option>
                        <option value="Biology">生物</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        难度等级
                      </label>
                      <select
                        value={newQuestion.difficulty}
                        onChange={(e) => setNewQuestion(prev => ({
                          ...prev,
                          difficulty: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="beginner">初级</option>
                        <option value="intermediate">中级</option>
                        <option value="advanced">高级</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标签 (用逗号分隔)
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 二次函数, 顶点公式, 代数"
                      onChange={(e) => setNewQuestion(prev => ({
                        ...prev,
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewQuestionModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>发布问题</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityInterface;
