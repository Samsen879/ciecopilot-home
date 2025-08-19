import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  Calendar,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import userProfileService from '../../services/userProfileService';

// 进度跟踪组件
const ProgressTracker = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState({
    statistics: {
      total_study_time: 0,
      topics_completed: 0,
      average_accuracy: 0,
      streak_days: 0
    },
    goals: [],
    recentSessions: [],
    analytics: null
  });
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  // 加载进度数据
  useEffect(() => {
    const loadProgressData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // 获取用户档案数据
        const profileData = await userProfileService.getUserProfile(user.id);
        
        // 获取学习分析数据
        const analytics = await userProfileService.getLearningAnalytics(user.id, timeRange);
        
        setProgressData({
          statistics: profileData.statistics || {
            total_study_time: 0,
            topics_completed: 0,
            average_accuracy: 0,
            streak_days: 0
          },
          goals: profileData.goals || [],
          recentSessions: profileData.recentSessions || [],
          analytics
        });
      } catch (error) {
        console.error('Failed to load progress data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgressData();
  }, [user, timeRange]);

  // 格式化时间
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // 计算目标进度
  const calculateGoalProgress = (goal) => {
    const totalDays = Math.ceil((new Date(goal.target_date) - new Date(goal.created_at)) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24));
    const daysPassed = totalDays - daysLeft;
    return Math.max(0, Math.min(100, (daysPassed / totalDays) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-300 rounded-lg"></div>
              <div className="h-64 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { statistics, goals, recentSessions, analytics } = progressData;

  // 统计卡片数据
  const statsCards = [
    {
      title: '总学习时间',
      value: formatTime(statistics.total_study_time),
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      trend: analytics?.timeComparison || null
    },
    {
      title: '完成主题',
      value: statistics.topics_completed,
      icon: BookOpen,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      trend: analytics?.topicsComparison || null
    },
    {
      title: '平均正确率',
      value: `${Math.round(statistics.average_accuracy)}%`,
      icon: Target,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      trend: analytics?.accuracyComparison || null
    },
    {
      title: '连续学习',
      value: `${statistics.streak_days}天`,
      icon: Zap,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      trend: analytics?.streakComparison || null
    }
  ];

  // 动画变体
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            学习进度追踪
          </h1>
          <p className="text-gray-600">
            查看你的学习成果和进步轨迹
          </p>
        </motion.div>

        {/* 时间范围选择器 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex justify-end"
        >
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">今年</option>
          </select>
        </motion.div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 + index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 ${card.bgColor} rounded-lg`}>
                    <IconComponent className={`w-6 h-6 bg-gradient-to-r ${card.color} bg-clip-text text-transparent`} />
                  </div>
                  {card.trend && (
                    <div className={`flex items-center text-sm ${
                      card.trend > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendingUp className={`w-4 h-4 mr-1 ${
                        card.trend < 0 ? 'rotate-180' : ''
                      }`} />
                      {Math.abs(card.trend)}%
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {card.title}
                </h3>
                
                <div className="flex items-end justify-between">
                  <span className={`text-2xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                    {card.value}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 学习目标 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-lg mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                学习目标
              </h2>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              设置目标
            </button>
          </div>
          
          <div className="space-y-4">
            {goals.length > 0 ? (
              goals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {goal.title}
                    </h3>
                    <span className="text-sm text-gray-600">
                      {new Date(goal.target_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">
                    {goal.description}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${calculateGoalProgress(goal)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(calculateGoalProgress(goal))}%
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>还没有设置学习目标</p>
                <p className="text-sm">设置目标来追踪你的学习进度</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 最近学习记录 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              最近学习记录
            </h2>
          </div>
          
          <div className="space-y-4">
            {recentSessions.length > 0 ? (
              recentSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BookOpen className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {session.subject} - {session.topic}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(session.date).toLocaleDateString()} • {formatTime(session.duration)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {session.score}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {session.questions_answered} 题
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>还没有学习记录</p>
                <p className="text-sm">开始学习来查看你的进度</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProgressTracker;