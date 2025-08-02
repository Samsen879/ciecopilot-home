import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp,
  Calendar,
  Award,
  BarChart3
} from 'lucide-react';

// 进度跟踪组件
const ProgressTracker = ({ userId }) => {
  const [progressData, setProgressData] = useState({
    totalTopics: 0,
    completedTopics: 0,
    studyTime: 0,
    streak: 0,
    weeklyGoal: 5,
    achievements: []
  });
  
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [timeRange, setTimeRange] = useState('week');

  // TODO: 当Supabase配置完成后，替换为真实数据获取
  useEffect(() => {
    // 模拟数据加载
    const mockData = {
      totalTopics: 120,
      completedTopics: 45,
      studyTime: 1250, // 分钟
      streak: 7,
      weeklyGoal: 5,
      achievements: [
        { id: 1, title: '连续学习7天', icon: '🔥', date: '2024-01-15' },
        { id: 2, title: '完成50个主题', icon: '🎯', date: '2024-01-10' },
        { id: 3, title: '学习时间达到20小时', icon: '⏰', date: '2024-01-08' }
      ]
    };
    
    setProgressData(mockData);
  }, [userId, selectedSubject, timeRange]);

  // 计算完成百分比
  const completionPercentage = progressData.totalTopics > 0 
    ? Math.round((progressData.completedTopics / progressData.totalTopics) * 100)
    : 0;

  // 格式化学习时间
  const formatStudyTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // 动画变体
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const progressVariants = {
    hidden: { width: 0 },
    visible: { width: `${completionPercentage}%` }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          学习进度
        </h1>
        
        {/* 筛选器 */}
        <div className="flex gap-4">
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">所有科目</option>
            <option value="9709">数学</option>
            <option value="9231">进阶数学</option>
            <option value="9702">物理</option>
          </select>
          
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">今年</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 总体进度 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {completionPercentage}%
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            总体进度
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {progressData.completedTopics} / {progressData.totalTopics} 个主题
          </p>
          
          {/* 进度条 */}
          <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              variants={progressVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 1, delay: 0.5 }}
              className="bg-blue-600 h-2 rounded-full"
            />
          </div>
        </motion.div>

        {/* 学习时间 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatStudyTime(progressData.studyTime)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            学习时间
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            本{timeRange === 'week' ? '周' : timeRange === 'month' ? '月' : '年'}累计
          </p>
        </motion.div>

        {/* 连续天数 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {progressData.streak}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            连续学习
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            天数记录
          </p>
        </motion.div>

        {/* 周目标 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {Math.min(progressData.streak, progressData.weeklyGoal)}/{progressData.weeklyGoal}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            周目标
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            本周学习天数
          </p>
        </motion.div>
      </div>

      {/* 成就展示 */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
      >
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            最近成就
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {progressData.achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span className="text-2xl">{achievement.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {achievement.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {achievement.date}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 学习建议 */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            学习建议
          </h2>
        </div>
        
        <div className="space-y-3">
          {completionPercentage < 30 && (
            <p className="text-gray-700 dark:text-gray-300">
              💡 建议每天至少学习1个主题，保持学习连续性
            </p>
          )}
          {progressData.streak < 3 && (
            <p className="text-gray-700 dark:text-gray-300">
              🔥 尝试连续学习3天以上，养成良好的学习习惯
            </p>
          )}
          {progressData.studyTime < 300 && (
            <p className="text-gray-700 dark:text-gray-300">
              ⏰ 增加每日学习时间，建议每次学习30-45分钟
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProgressTracker;