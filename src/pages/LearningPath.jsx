import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  Settings,
  Calendar,
  User,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LearningPathVisualizer from '../components/Learning/LearningPathVisualizer';
import { generateLearningPath } from '../api/aiClient';
import { upsertLearningPath, getLearningPath } from '../lib/supabase/learningPathQueries';
import { v4 as uuidv4 } from 'uuid';

const LearningPath = () => {
  const { subjectCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [pathData, setPathData] = useState(null);
  const [userPreferences, setUserPreferences] = useState({
    targetExamDate: '',
    dailyStudyTime: 2,
    weeklyDays: 5,
    learningStyle: 'visual',
    difficultyProgression: 'gradual'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 生成并持久化学习路径（前端生成UUID并落库，时间单位为分钟）
  useEffect(() => {
    let cancelled = false;
    async function ensureLearningPath() {
      if (!user?.id || !subjectCode) return;
      setIsLoading(true);
      try {
        const { data: existing, error: existingErr } = await getLearningPath({ userId: user.id, subjectCode });
        if (existingErr) console.warn('getLearningPath error:', existingErr);
        if (cancelled) return;
        if (existing) {
          setPathData(existing);
          return;
        }
        const api = await generateLearningPath({ subject_code: subjectCode });
        if (cancelled) return;
        const pathId = uuidv4();
        const topicsSequence = api?.data?.path_structure?.topics_sequence || [];
        const adaptiveRules = api?.data?.path_structure?.adaptive_rules || {};
        const estimatedMinutes = api?.data?.path_structure?.estimated_completion_time || 0;
        const difficultyProgression = api?.data?.difficulty_progression || '';
        await upsertLearningPath({
          pathId,
          userId: user.id,
          subjectCode,
          topicsSequence,
          adaptiveRules,
          estimatedCompletionMinutes: estimatedMinutes,
          difficultyProgression
        });
        if (cancelled) return;
        setPathData({
          id: pathId,
          user_id: user.id,
          subject_code: subjectCode,
          topics_sequence: topicsSequence,
          adaptive_rules: adaptiveRules,
          estimated_completion_time: estimatedMinutes,
          difficulty_progression: difficultyProgression
        });
      } catch (err) {
        console.error('Failed to generate learning path:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    ensureLearningPath();
    return () => { cancelled = true; };
  }, [user?.id, subjectCode]);

  // 学科信息映射
  const subjectInfo = {
    '9709': {
      name: 'Mathematics',
      fullName: 'CIE A-Level Mathematics',
      icon: '📐',
      color: 'blue'
    },
    '9702': {
      name: 'Physics',
      fullName: 'CIE A-Level Physics',
      icon: '⚛️',
      color: 'purple'
    }
  };

  const currentSubject = subjectInfo[subjectCode] || {
    name: 'Unknown Subject',
    fullName: 'Unknown Subject',
    icon: '📚',
    color: 'gray'
  };

  // 处理学习路径更新
  const handlePathUpdated = (newPathData) => {
    setPathData(newPathData);
  };

  // 处理设置更新
  const handleSettingsUpdate = (newPreferences) => {
    setUserPreferences(newPreferences);
    setShowSettings(false);
  };

  // 格式化进度百分比
  const formatProgress = (progress) => {
    return Math.round(progress || 0);
  };

  // 计算预计完成时间
  const calculateEstimatedCompletion = () => {
    if (!pathData?.insights) return null;
    
    const { total_estimated_hours, weekly_hours_needed } = pathData.insights;
    const weeksNeeded = Math.ceil(total_estimated_hours / weekly_hours_needed);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + (weeksNeeded * 7));
    
    return completionDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 bg-${currentSubject.color}-100 rounded-lg flex items-center justify-center text-lg`}>
                  {currentSubject.icon}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentSubject.name} 学习路径
                  </h1>
                  <p className="text-sm text-gray-500">{currentSubject.fullName}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {pathData && (
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Target className="w-4 h-4" />
                    <span>{formatProgress(pathData.completion_percentage)}% 完成</span>
                  </div>
                  {pathData.insights && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{pathData.insights.weekly_hours_needed}h/周</span>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 侧边栏 - 学习概览 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 学习统计卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                学习概览
              </h3>
              
              {pathData ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">总进度</span>
                    <span className="font-medium text-blue-600">
                      {formatProgress(pathData.completion_percentage)}%
                    </span>
                  </div>
                  
                  {pathData.insights && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">总学时</span>
                        <span className="font-medium">
                          {pathData.insights.total_estimated_hours}h
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">完成信心</span>
                        <span className="font-medium text-green-600">
                          {Math.round(pathData.insights.confidence_score * 100)}%
                        </span>
                      </div>
                      
                      {calculateEstimatedCompletion() && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">预计完成</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {calculateEstimatedCompletion()}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">正在生成学习路径...</p>
                </div>
              )}
            </motion.div>

            {/* 学习目标卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-4 h-4 mr-2" />
                学习目标
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">目标等级</span>
                  <span className="font-medium text-blue-600">A*</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">每日学习</span>
                  <span className="font-medium">{userPreferences.dailyStudyTime}小时</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">学习风格</span>
                  <span className="font-medium capitalize">
                    {userPreferences.learningStyle === 'visual' ? '视觉型' : 
                     userPreferences.learningStyle === 'auditory' ? '听觉型' : '动手型'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 主要内容 - 学习路径可视化 */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <LearningPathVisualizer
                userId={user?.id}
                subjectCode={subjectCode}
                targetExamDate={userPreferences.targetExamDate}
                onPathUpdated={handlePathUpdated}
                className="w-full"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 mb-4">学习偏好设置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目标考试日期
                </label>
                <input
                  type="date"
                  value={userPreferences.targetExamDate}
                  onChange={(e) => setUserPreferences(prev => ({
                    ...prev,
                    targetExamDate: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  每日学习时间: {userPreferences.dailyStudyTime}小时
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={userPreferences.dailyStudyTime}
                  onChange={(e) => setUserPreferences(prev => ({
                    ...prev,
                    dailyStudyTime: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              
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
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleSettingsUpdate(userPreferences)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存设置
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LearningPath;