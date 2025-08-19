import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  TrendingUp,
  Target,
  Star,
  ChevronRight,
  Filter,
  RefreshCw,
  Settings,
  User,
  Calendar,
  BarChart3,
  Award,
  Lightbulb,
  Play,
  Download,
  Share2
} from 'lucide-react';

const PersonalizedRecommendations = ({ 
  userId, 
  subjectCode, 
  onRecommendationClick,
  onPreferencesUpdate,
  className = "" 
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [showPreferences, setShowPreferences] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    learningStyle: 'visual',
    difficultyLevel: 'intermediate',
    studyTime: 'moderate',
    preferredTopics: [],
    goals: []
  });

  // 推荐类型配置
  const recommendationTypes = {
    study: { icon: BookOpen, color: 'blue', label: '学习内容' },
    practice: { icon: Target, color: 'green', label: '练习题' },
    review: { icon: RefreshCw, color: 'orange', label: '复习材料' },
    concept: { icon: Lightbulb, color: 'purple', label: '概念解释' },
    video: { icon: Play, color: 'red', label: '视频课程' },
    assessment: { icon: BarChart3, color: 'indigo', label: '测评练习' }
  };

  // 优先级标签配置
  const priorityConfig = {
    high: { label: '高优先级', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700' },
    medium: { label: '中优先级', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    low: { label: '低优先级', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' }
  };

  // 生成模拟推荐数据
  const generateMockRecommendations = () => {
    const mockData = [
      {
        id: '1',
        type: 'study',
        title: '二次函数图像与性质',
        description: '基于你在代数部分的表现，建议深入学习二次函数的图像变换规律',
        subject: 'Mathematics',
        topic: 'Algebra',
        priority: 'high',
        confidence: 0.92,
        estimatedTime: 45,
        difficulty: 'intermediate',
        learningObjectives: ['理解二次函数图像', '掌握顶点式转换', '分析函数性质'],
        prerequisite: '基础代数运算',
        actionUrl: '/topics/9709/algebra/quadratic-functions',
        tags: ['函数', '图像', '代数'],
        progress: 0
      },
      {
        id: '2',
        type: 'practice',
        title: '向量运算强化练习',
        description: '针对你在向量计算中的薄弱环节，推荐专项练习题组',
        subject: 'Mathematics',
        topic: 'Vectors',
        priority: 'high',
        confidence: 0.88,
        estimatedTime: 30,
        difficulty: 'intermediate',
        learningObjectives: ['熟练向量加减', '掌握数量积', '理解向量投影'],
        prerequisite: '向量基本概念',
        actionUrl: '/practice/9709/vectors',
        tags: ['向量', '计算', '练习'],
        progress: 0.3
      },
      {
        id: '3',
        type: 'review',
        title: '三角函数复习专题',
        description: '距离考试还有2个月，建议重点复习三角函数的重要知识点',
        subject: 'Mathematics',
        topic: 'Trigonometry',
        priority: 'medium',
        confidence: 0.75,
        estimatedTime: 60,
        difficulty: 'intermediate',
        learningObjectives: ['复习三角恒等式', '掌握解三角形', '理解三角图像'],
        prerequisite: '基础三角函数',
        actionUrl: '/review/9709/trigonometry',
        tags: ['三角函数', '复习', '考试'],
        progress: 0.8
      },
      {
        id: '4',
        type: 'concept',
        title: '微分概念深度理解',
        description: '你在微分应用题上有些困难，建议从概念层面重新理解',
        subject: 'Mathematics',
        topic: 'Calculus',
        priority: 'medium',
        confidence: 0.81,
        estimatedTime: 40,
        difficulty: 'advanced',
        learningObjectives: ['理解导数概念', '掌握求导法则', '应用导数解题'],
        prerequisite: '函数基础',
        actionUrl: '/concepts/9709/calculus/differentiation',
        tags: ['微分', '概念', '应用'],
        progress: 0.1
      },
      {
        id: '5',
        type: 'video',
        title: '统计学基础视频课程',
        description: '适合视觉学习者的统计学入门课程，生动有趣的解释',
        subject: 'Mathematics',
        topic: 'Statistics',
        priority: 'low',
        confidence: 0.70,
        estimatedTime: 25,
        difficulty: 'beginner',
        learningObjectives: ['理解统计基础', '掌握数据分析', '学会概率计算'],
        prerequisite: '基础数学',
        actionUrl: '/videos/9709/statistics/basics',
        tags: ['统计', '视频', '基础'],
        progress: 0
      },
      {
        id: '6',
        type: 'assessment',
        title: '综合能力测评',
        description: '全面评估你当前的数学水平，为后续学习提供参考',
        subject: 'Mathematics',
        topic: 'General',
        priority: 'medium',
        confidence: 0.85,
        estimatedTime: 90,
        difficulty: 'intermediate',
        learningObjectives: ['评估整体水平', '发现知识缺陷', '制定学习计划'],
        prerequisite: '无',
        actionUrl: '/assessment/9709/comprehensive',
        tags: ['测评', '综合', '评估'],
        progress: 0
      }
    ];

    // 应用过滤和排序
    let filteredData = mockData;
    
    if (filterType !== 'all') {
      filteredData = filteredData.filter(item => item.type === filterType);
    }

    // 排序逻辑
    filteredData.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'confidence':
          return b.confidence - a.confidence;
        case 'time':
          return a.estimatedTime - b.estimatedTime;
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        default:
          return 0;
      }
    });

    return filteredData;
  };

  // 获取推荐内容
  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成模拟数据
      const data = generateMockRecommendations();
      setRecommendations(data);
    } catch (err) {
      setError('获取推荐内容失败，请稍后重试');
      console.error('获取推荐失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件初始化
  useEffect(() => {
    fetchRecommendations();
  }, [userId, subjectCode, filterType, sortBy]);

  // 处理推荐项点击
  const handleRecommendationClick = (recommendation) => {
    if (onRecommendationClick) {
      onRecommendationClick(recommendation);
    }
    
    // 可以在这里添加点击跟踪逻辑
    console.log('点击推荐:', recommendation.title);
  };

  // 处理偏好更新
  const handlePreferencesSubmit = (newPreferences) => {
    setUserPreferences(newPreferences);
    setShowPreferences(false);
    
    if (onPreferencesUpdate) {
      onPreferencesUpdate(newPreferences);
    }
    
    // 重新获取推荐
    fetchRecommendations();
  };

  // 渲染推荐卡片
  const renderRecommendationCard = (recommendation) => {
    const TypeIcon = recommendationTypes[recommendation.type]?.icon || BookOpen;
    const typeConfig = recommendationTypes[recommendation.type];
    const priorityInfo = priorityConfig[recommendation.priority];

    return (
      <motion.div
        key={recommendation.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
        onClick={() => handleRecommendationClick(recommendation)}
      >
        {/* 卡片头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-${typeConfig?.color}-100 rounded-lg flex items-center justify-center`}>
              <TypeIcon className={`w-5 h-5 text-${typeConfig?.color}-600`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {recommendation.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityInfo.bgColor} ${priorityInfo.textColor}`}>
                  {priorityInfo.label}
                </span>
                <span className="text-xs text-gray-500">
                  {typeConfig?.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {Math.round(recommendation.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-500">匹配度</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* 描述 */}
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {recommendation.description}
        </p>

        {/* 学习目标 */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">学习目标:</h4>
          <div className="flex flex-wrap gap-1">
            {recommendation.learningObjectives.map((objective, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
              >
                {objective}
              </span>
            ))}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{recommendation.estimatedTime}分钟</span>
            </div>
            <div className="flex items-center space-x-1">
              <BarChart3 className="w-4 h-4" />
              <span className="capitalize">{recommendation.difficulty}</span>
            </div>
          </div>
          
          {recommendation.progress > 0 && (
            <div className="text-sm text-gray-500">
              进度: {Math.round(recommendation.progress * 100)}%
            </div>
          )}
        </div>

        {/* 进度条 */}
        {recommendation.progress > 0 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${recommendation.progress * 100}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-100 h-48 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-500 mb-4">
          <BarChart3 className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-medium">{error}</p>
        </div>
        <button
          onClick={fetchRecommendations}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Star className="w-6 h-6 mr-2 text-yellow-500" />
            个性化推荐
          </h2>
          <p className="text-gray-600 mt-1">
            基于你的学习表现和偏好为你量身定制
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreferences(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="偏好设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={fetchRecommendations}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新推荐"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 过滤和排序控件 */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">类型:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部</option>
            <option value="study">学习内容</option>
            <option value="practice">练习题</option>
            <option value="review">复习材料</option>
            <option value="concept">概念解释</option>
            <option value="video">视频课程</option>
            <option value="assessment">测评练习</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">排序:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="priority">优先级</option>
            <option value="confidence">匹配度</option>
            <option value="time">学习时长</option>
            <option value="difficulty">难度</option>
          </select>
        </div>
      </div>

      {/* 推荐列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {recommendations.map(recommendation => 
            renderRecommendationCard(recommendation)
          )}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {recommendations.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-500 mb-2">
            暂无推荐内容
          </p>
          <p className="text-gray-400">
            试试调整过滤条件或学习偏好设置
          </p>
        </div>
      )}

      {/* 偏好设置模态框 */}
      <AnimatePresence>
        {showPreferences && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreferences(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                学习偏好设置
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学习风格
                  </label>
                  <select
                    value={userPreferences.learningStyle}
                    onChange={(e) => setUserPreferences(prev => ({
                      ...prev,
                      learningStyle: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="visual">视觉型</option>
                    <option value="auditory">听觉型</option>
                    <option value="kinesthetic">动手型</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    难度偏好
                  </label>
                  <select
                    value={userPreferences.difficultyLevel}
                    onChange={(e) => setUserPreferences(prev => ({
                      ...prev,
                      difficultyLevel: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="beginner">初级</option>
                    <option value="intermediate">中级</option>
                    <option value="advanced">高级</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学习时间偏好
                  </label>
                  <select
                    value={userPreferences.studyTime}
                    onChange={(e) => setUserPreferences(prev => ({
                      ...prev,
                      studyTime: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="short">短时间 (15-30分钟)</option>
                    <option value="moderate">中等时间 (30-60分钟)</option>
                    <option value="long">长时间 (60分钟以上)</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handlePreferencesSubmit(userPreferences)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存设置
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalizedRecommendations;
