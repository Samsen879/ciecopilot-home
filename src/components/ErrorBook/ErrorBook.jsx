import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookX, 
  Search, 
  Filter, 
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Trash2,
  Edit3,
  Eye,
  Star,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  deleteErrorBookItem,
  listErrorBookItems,
  updateErrorBookItem,
} from '../../services/errorBookService';

// 错题本组件
const ErrorBook = () => {
  const { user, isAuthenticated } = useAuth();
  const [errors, setErrors] = useState([]);
  const [filteredErrors, setFilteredErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('list'); // list, card
  const [selectedError, setSelectedError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 从统一 Error Book API 加载用户错题数据
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // 未登录用户显示演示数据
      const mockErrors = [
        {
          id: 1,
          subject: '9709',
          paper: 'Paper 1',
          topic: '函数与图像',
          question: '求函数 f(x) = x² - 4x + 3 的最小值',
          userAnswer: 'x = 2时，最小值为1',
          correctAnswer: 'x = 2时，最小值为-1',
          explanation: '完成平方：f(x) = (x-2)² - 1，所以最小值为-1',
          errorType: '计算错误',
          difficulty: 'medium',
          tags: ['二次函数', '最值问题'],
          status: 'unresolved',
          createdAt: '2024-01-15',
          reviewCount: 0,
          isStarred: true,
          notes: '需要注意完成平方的计算步骤'
        },
        {
          id: 2,
          subject: '9709',
          paper: 'Paper 3',
          topic: '微分',
          question: '求 y = ln(x² + 1) 的导数',
          userAnswer: 'dy/dx = 1/(x² + 1)',
          correctAnswer: 'dy/dx = 2x/(x² + 1)',
          explanation: '使用链式法则：d/dx[ln(u)] = (1/u) × du/dx，其中u = x² + 1',
          errorType: '概念错误',
          difficulty: 'hard',
          tags: ['导数', '链式法则', '对数函数'],
          status: 'reviewing',
          createdAt: '2024-01-12',
          reviewCount: 2,
          isStarred: false,
          notes: '复习链式法则的应用'
        }
      ];
      setErrors(mockErrors);
      setFilteredErrors(mockErrors);
      setLoading(false);
      return;
    }

    loadUserErrors();
  }, [user, isAuthenticated]);

  const loadUserErrors = async () => {
    try {
      setLoading(true);

      const { items } = await listErrorBookItems();
      setErrors(items);
      setFilteredErrors(items);

    } catch (error) {
      console.error('Error loading user errors:', error);
      setErrors([]);
      setFilteredErrors([]);
    } finally {
      setLoading(false);
    }
  };

  // 筛选和搜索
  useEffect(() => {
    let filtered = [...errors];

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(error => 
        error.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 科目过滤
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(error => error.subject === selectedSubject);
    }

    // 状态过滤
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(error => error.status === selectedStatus);
    }

    // 难度过滤
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(error => error.difficulty === selectedDifficulty);
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
        case 'reviewCount':
          return a.reviewCount - b.reviewCount;
        case 'subject':
          return a.subject.localeCompare(b.subject);
        default:
          return 0;
      }
    });

    setFilteredErrors(filtered);
  }, [errors, searchTerm, selectedSubject, selectedStatus, selectedDifficulty, sortBy]);

  // 获取状态颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'unresolved': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'reviewing': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'resolved': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // 获取难度颜色
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'hard': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const updateErrorLocally = (errorId, updater) => {
    setErrors((prev) =>
      prev.map((error) => (error.id === errorId ? updater(error) : error))
    );
    setSelectedError((prev) =>
      prev?.id === errorId ? updater(prev) : prev
    );
  };

  const replaceErrorLocally = (errorId, nextError) => {
    updateErrorLocally(errorId, () => nextError);
  };

  const removeErrorLocally = (errorId) => {
    const shouldCloseModal = selectedError?.id === errorId;
    setErrors((prev) => prev.filter((error) => error.id !== errorId));
    setSelectedError((prev) => (prev?.id === errorId ? null : prev));
    if (shouldCloseModal) {
      setShowModal(false);
    }
  };

  const hasEnrichmentDetails = (error) => {
    const attempt = error?.enrichment?.attempt;
    const markDecision = error?.enrichment?.mark_decision;
    const errorEvent = error?.enrichment?.error_event;

    return Boolean(
      attempt?.attempt_id ||
      attempt?.topic_path ||
      markDecision?.mark_label ||
      markDecision?.reason ||
      errorEvent?.misconception_tag ||
      errorEvent?.severity ||
      errorEvent?.topic_path
    );
  };

  // 更新错题状态
  const updateErrorStatus = async (errorId, newStatus) => {
    if (!isAuthenticated || !user) {
      // 演示模式下只更新本地状态
      updateErrorLocally(errorId, (error) => ({
        ...error,
        status: newStatus
      }));
      return;
    }

    try {
      const currentError = errors.find(e => e.id === errorId);
      if (!currentError) return;

      const { item } = await updateErrorBookItem(errorId, {
        status: newStatus,
        review_count: (currentError.reviewCount || 0) + 1,
      });

      replaceErrorLocally(errorId, item);
    } catch (error) {
      console.error('Error updating error status:', error);
    }
  };

  // 切换收藏状态
  const toggleStar = async (errorId) => {
    if (!isAuthenticated || !user) {
      // 演示模式下只更新本地状态
      updateErrorLocally(errorId, (error) => ({
        ...error,
        isStarred: !error.isStarred
      }));
      return;
    }

    const currentError = errors.find(e => e.id === errorId);
    if (!currentError) return;

    try {
      const { item } = await updateErrorBookItem(errorId, {
        is_starred: !currentError.isStarred,
      });

      replaceErrorLocally(errorId, item);
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // 删除错题
  const deleteError = async (errorId) => {
    if (!isAuthenticated || !user) {
      // 演示模式下只更新本地状态
      removeErrorLocally(errorId);
      return;
    }

    try {
      await deleteErrorBookItem(errorId);
      removeErrorLocally(errorId);
    } catch (error) {
      console.error('Error deleting error:', error);
    }
  };

  // 动画变体
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -100 }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookX className="w-8 h-8 text-red-600 dark:text-red-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              错题本
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              共 {errors.length} 道错题，{errors.filter(e => e.status === 'unresolved').length} 道待解决
            </p>
          </div>
        </div>
        
        {/* 视图切换 */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            列表
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'card' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            卡片
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* 搜索框 */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索错题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          {/* 科目筛选 */}
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">所有科目</option>
            <option value="9709">数学</option>
            <option value="9231">进阶数学</option>
            <option value="9702">物理</option>
          </select>
          
          {/* 状态筛选 */}
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="unresolved">待解决</option>
            <option value="reviewing">复习中</option>
            <option value="resolved">已解决</option>
          </select>
          
          {/* 难度筛选 */}
          <select 
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">所有难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
          
          {/* 排序 */}
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="date">按日期</option>
            <option value="difficulty">按难度</option>
            <option value="reviewCount">按复习次数</option>
            <option value="subject">按科目</option>
          </select>
        </div>
      </div>

      {/* 错题列表 */}
      <div className={`grid gap-6 ${
        viewMode === 'card' 
          ? 'grid-cols-1 lg:grid-cols-2' 
          : 'grid-cols-1'
      }`}>
        <AnimatePresence>
          {filteredErrors.map((error, index) => (
            <motion.div
              key={error.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              {/* 错题头部 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {error.subject} - {error.paper}
                    </span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {error.topic}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {error.question}
                  </h3>
                  
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(error.status)}`}>
                      {error.status === 'unresolved' ? '待解决' : 
                       error.status === 'reviewing' ? '复习中' : '已解决'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(error.difficulty)}`}>
                      {error.difficulty === 'easy' ? '简单' : 
                       error.difficulty === 'medium' ? '中等' : '困难'}
                    </span>
                    <span
                      data-testid="source-label"
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        error.source === 'mark_engine_auto'
                          ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/20'
                          : 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
                      }`}
                    >
                      {error.source === 'mark_engine_auto' ? '自动' : '手工'}
                    </span>
                    {error.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleStar(error.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      error.isStarred 
                        ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20' 
                        : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${error.isStarred ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedError(error);
                      setShowModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => deleteError(error.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* 错题内容预览 */}
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">我的答案：</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{error.userAnswer}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">正确答案：</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{error.correctAnswer}</p>
                </div>
              </div>
              
              {/* 底部信息 */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {error.createdAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <RotateCcw className="w-4 h-4" />
                    复习 {error.reviewCount} 次
                  </span>
                </div>
                
                {/* 状态更新按钮 */}
                <div className="flex gap-2">
                  {error.status !== 'reviewing' && (
                    <button
                      onClick={() => updateErrorStatus(error.id, 'reviewing')}
                      className="px-3 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-colors"
                    >
                      开始复习
                    </button>
                  )}
                  {error.status !== 'resolved' && (
                    <button
                      onClick={() => updateErrorStatus(error.id, 'resolved')}
                      className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
                    >
                      标记已解决
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {filteredErrors.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <BookX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            没有找到错题
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || selectedSubject !== 'all' || selectedStatus !== 'all' || selectedDifficulty !== 'all'
              ? '尝试调整筛选条件'
              : '开始学习，遇到错题时会自动收录到这里'}
          </p>
        </motion.div>
      )}

      {/* 错题详情模态框 */}
      <AnimatePresence>
        {showModal && selectedError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  错题详情
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* 题目信息 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    题目
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedError.question}</p>
                </div>
                
                {/* 我的答案 */}
                <div>
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                    我的答案
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    {selectedError.userAnswer}
                  </p>
                </div>
                
                {/* 正确答案 */}
                <div>
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                    正确答案
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    {selectedError.correctAnswer}
                  </p>
                </div>
                
                {/* 解析 */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    解析
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    {selectedError.explanation}
                  </p>
                </div>

                {/* 题目与知识点关联 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">题目键</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                      {selectedError.storageKey || '未绑定'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">知识点节点</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                      {selectedError.nodeId || selectedError.topicId || '未绑定'}
                    </p>
                  </div>
                </div>

                {hasEnrichmentDetails(selectedError) && (
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                      判分上下文
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedError.enrichment?.attempt?.attempt_id && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Attempt ID</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.enrichment.attempt.attempt_id}
                          </p>
                        </div>
                      )}
                      {selectedError.enrichment?.mark_decision?.mark_label && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">得分标签</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.enrichment.mark_decision.mark_label}
                          </p>
                        </div>
                      )}
                      {selectedError.enrichment?.error_event?.misconception_tag && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">误区标签</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.enrichment.error_event.misconception_tag}
                          </p>
                        </div>
                      )}
                      {selectedError.enrichment?.error_event?.severity && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">严重度</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.enrichment.error_event.severity}
                          </p>
                        </div>
                      )}
                      {selectedError.enrichment?.attempt?.topic_path && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg md:col-span-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">知识路径</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.enrichment.attempt.topic_path}
                          </p>
                        </div>
                      )}
                      {!selectedError.enrichment?.attempt?.topic_path && selectedError.enrichment?.error_event?.topic_path && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg md:col-span-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">知识路径</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.enrichment.error_event.topic_path}
                          </p>
                        </div>
                      )}
                      {selectedError.enrichment?.mark_decision?.reason && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg md:col-span-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">判分理由</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.enrichment.mark_decision.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 自动判分元数据（仅自动来源显示） */}
                {selectedError.source === 'mark_engine_auto' && selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                  <div data-testid="auto-metadata-section">
                    <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                      自动判分信息
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedError.metadata.rubric_id && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Rubric ID</h4>
                          <p data-testid="meta-rubric-id" className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.metadata.rubric_id}
                          </p>
                        </div>
                      )}
                      {selectedError.metadata.run_id && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Run ID</h4>
                          <p data-testid="meta-run-id" className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.metadata.run_id}
                          </p>
                        </div>
                      )}
                      {selectedError.metadata.rubric_source_version && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Rubric 版本</h4>
                          <p data-testid="meta-rubric-version" className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.metadata.rubric_source_version}
                          </p>
                        </div>
                      )}
                      {selectedError.metadata.decision_reason && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">判分原因</h4>
                          <p data-testid="meta-decision-reason" className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {selectedError.metadata.decision_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 笔记 */}
                {selectedError.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-2">
                      我的笔记
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      {selectedError.notes}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ErrorBook;
