import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  Circle, 
  BookOpen, 
  Brain,
  Award,
  ArrowRight,
  Filter,
  RotateCcw
} from 'lucide-react';

/**
 * Learning Path Visualizer Component - 学习路径可视化组件
 * 
 * 功能特性：
 * - 多种视图模式：时间线、日历、树状图
 * - 学习进度跟踪
 * - 互动式路径规划
 * - 智能推荐和调整
 * - 响应式设计
 */
export default function LearningPathVisualizer({ 
  userId, 
  subjectCode = '9709',
  targetExamDate,
  onPathUpdated,
  className = '' 
}) {
  // === 状态管理 ===
  const [viewMode, setViewMode] = useState('timeline'); // timeline, calendar, tree
  const [learningPath, setLearningPath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // all, week, month, quarter

  // === 效果和API调用 ===
  useEffect(() => {
    if (userId && subjectCode) {
      generateLearningPath();
    }
  }, [userId, subjectCode, targetExamDate]);

  const generateLearningPath = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/learning/path/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || 'test-token'}`
        },
        body: JSON.stringify({
          user_id: userId,
          subject_code: subjectCode,
          target_exam_date: targetExamDate,
          current_level: 'intermediate',
          time_available: {
            daily_hours: 2,
            weekly_days: 5
          },
          preferences: {
            learning_style: 'visual',
            difficulty_progression: 'gradual'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLearningPath(data.learning_path);
        onPathUpdated?.(data.learning_path);
      } else {
        throw new Error(data.error || '生成学习路径失败');
      }
      
    } catch (error) {
      console.error('Learning path generation error:', error);
      setError(error.message);
      
      // 使用模拟数据进行开发
      setLearningPath(generateMockLearningPath());
    } finally {
      setIsLoading(false);
    }
  };

  // === 模拟数据生成 ===
  const generateMockLearningPath = () => {
    const now = new Date();
    const examDate = targetExamDate ? new Date(targetExamDate) : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    return {
      id: 'path_' + Date.now(),
      subject_code: subjectCode,
      target_exam_date: examDate.toISOString(),
      estimated_duration_weeks: 12,
      completion_percentage: 35,
      last_updated: now.toISOString(),
      
      milestones: [
        {
          id: 'ms1',
          title: '函数基础',
          description: '掌握函数的定义、性质和基本运算',
          target_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          completion_percentage: 100,
          estimated_hours: 15,
          topics: ['函数定义', '复合函数', '反函数', '函数图像'],
          difficulty: 'beginner',
          priority: 'high'
        },
        {
          id: 'ms2',
          title: '导数与微分',
          description: '理解导数概念，掌握求导规则和应用',
          target_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'in_progress',
          completion_percentage: 60,
          estimated_hours: 25,
          topics: ['导数定义', '求导法则', '导数应用', '微分方程'],
          difficulty: 'intermediate',
          priority: 'high'
        },
        {
          id: 'ms3',
          title: '积分学',
          description: '掌握不定积分和定积分的计算方法',
          target_date: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          completion_percentage: 0,
          estimated_hours: 30,
          topics: ['不定积分', '定积分', '积分应用', '数值积分'],
          difficulty: 'intermediate',
          priority: 'medium'
        },
        {
          id: 'ms4',
          title: '三角函数进阶',
          description: '深入学习三角函数的性质和应用',
          target_date: new Date(now.getTime() + 56 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          completion_percentage: 0,
          estimated_hours: 20,
          topics: ['三角恒等式', '三角方程', '三角函数图像变换'],
          difficulty: 'advanced',
          priority: 'medium'
        },
        {
          id: 'ms5',
          title: '综合复习',
          description: '综合练习和考试技巧训练',
          target_date: new Date(examDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          completion_percentage: 0,
          estimated_hours: 40,
          topics: ['综合练习', '历年真题', '考试技巧', '模拟考试'],
          difficulty: 'advanced',
          priority: 'high'
        }
      ],
      
      insights: {
        total_estimated_hours: 130,
        weekly_hours_needed: 10.8,
        confidence_score: 0.85,
        risk_factors: ['时间紧张', '积分学基础薄弱'],
        recommendations: [
          '建议每周增加2小时学习时间',
          '重点关注导数应用部分',
          '建议寻找额外的积分练习题'
        ]
      }
    };
  };

  // === 数据处理 ===
  const filteredMilestones = useMemo(() => {
    if (!learningPath?.milestones) return [];
    
    let filtered = learningPath.milestones;
    
    // 完成状态过滤
    if (filterCompleted) {
      filtered = filtered.filter(m => m.status !== 'completed');
    }
    
    // 时间过滤
    const now = new Date();
    if (timeFilter !== 'all') {
      const daysMap = { week: 7, month: 30, quarter: 90 };
      const cutoffDate = new Date(now.getTime() + daysMap[timeFilter] * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(m => new Date(m.target_date) <= cutoffDate);
    }
    
    return filtered;
  }, [learningPath, filterCompleted, timeFilter]);

  // === 渲染函数 ===
  const renderTimelineView = () => (
    <div className="space-y-6">
      {filteredMilestones.map((milestone, index) => (
        <motion.div
          key={milestone.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative"
        >
          {/* 连接线 */}
          {index < filteredMilestones.length - 1 && (
            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300"></div>
          )}
          
          <div className="flex items-start space-x-4">
            {/* 状态图标 */}
            <div className={`p-2 rounded-full flex-shrink-0 ${
              milestone.status === 'completed' 
                ? 'bg-green-100 text-green-600'
                : milestone.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
            }`}>
              {milestone.status === 'completed' ? (
                <CheckCircle className="w-4 h-4" />
              ) : milestone.status === 'in_progress' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            
            {/* 里程碑内容 */}
            <div 
              className="flex-1 bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedMilestone(milestone)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{milestone.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                  
                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>进度</span>
                      <span>{milestone.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          milestone.status === 'completed' 
                            ? 'bg-green-500'
                            : milestone.status === 'in_progress'
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${milestone.completion_percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.2 }}
                      />
                    </div>
                  </div>
                  
                  {/* 主题标签 */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {milestone.topics.slice(0, 3).map((topic, topicIndex) => (
                      <span
                        key={topicIndex}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                    {milestone.topics.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                        +{milestone.topics.length - 3}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 右侧信息 */}
                <div className="text-right text-sm text-gray-500 ml-4">
                  <div className="flex items-center space-x-1 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(milestone.target_date).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center space-x-1 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>{milestone.estimated_hours}h</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    milestone.priority === 'high' 
                      ? 'bg-red-100 text-red-700'
                      : milestone.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {milestone.priority === 'high' ? '高优先级' : 
                     milestone.priority === 'medium' ? '中优先级' : '低优先级'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderCalendarView = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-center text-gray-500 py-8">
        <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>日历视图开发中...</p>
        <p className="text-sm mt-1">将显示学习计划的月度视图</p>
      </div>
    </div>
  );

  const renderTreeView = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-center text-gray-500 py-8">
        <Brain className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>知识树视图开发中...</p>
        <p className="text-sm mt-1">将显示知识点的层次结构</p>
      </div>
    </div>
  );

  const renderInsights = () => {
    if (!learningPath?.insights) return null;
    
    const { insights } = learningPath;
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          学习分析
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{insights.total_estimated_hours}h</div>
            <div className="text-sm text-gray-600">总学时</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{insights.weekly_hours_needed}h</div>
            <div className="text-sm text-gray-600">周均学时</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(insights.confidence_score * 100)}%</div>
            <div className="text-sm text-gray-600">完成信心</div>
          </div>
        </div>
        
        {insights.recommendations.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-800 mb-2">智能建议:</h5>
            <ul className="space-y-1">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <ArrowRight className="w-3 h-3 mt-1 mr-1 text-blue-500 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // === 主渲染 ===
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">正在生成个性化学习路径...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center text-red-600">
          <p className="mb-4">生成学习路径时出错: {error}</p>
          <button
            onClick={generateLearningPath}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-lg shadow-lg ${className}`}>
      {/* 头部控制 */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">学习路径规划</h3>
            <p className="text-sm text-gray-600">
              {learningPath ? `总进度: ${learningPath.completion_percentage}%` : '加载中...'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 视图切换 */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              {[
                { key: 'timeline', label: '时间线', icon: Clock },
                { key: 'calendar', label: '日历', icon: Calendar },
                { key: 'tree', label: '知识树', icon: Brain }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`px-3 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
                    viewMode === key 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            
            {/* 过滤器 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilterCompleted(!filterCompleted)}
                className={`p-2 rounded-lg transition-colors ${
                  filterCompleted ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="隐藏已完成"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              <button
                onClick={generateLearningPath}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="刷新路径"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="p-4 space-y-6">
        {/* 学习分析 */}
        {renderInsights()}
        
        {/* 视图内容 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'timeline' && renderTimelineView()}
            {viewMode === 'calendar' && renderCalendarView()}
            {viewMode === 'tree' && renderTreeView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 里程碑详情模态框 */}
      <AnimatePresence>
        {selectedMilestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMilestone(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-semibold text-gray-900 mb-2">{selectedMilestone.title}</h4>
              <p className="text-gray-600 mb-4">{selectedMilestone.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">目标日期:</span>
                  <span>{new Date(selectedMilestone.target_date).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">预计学时:</span>
                  <span>{selectedMilestone.estimated_hours} 小时</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">难度等级:</span>
                  <span className="capitalize">{selectedMilestone.difficulty}</span>
                </div>
              </div>
              
              <div className="mt-4">
                <h5 className="font-medium text-gray-800 mb-2">包含主题:</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedMilestone.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedMilestone(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
