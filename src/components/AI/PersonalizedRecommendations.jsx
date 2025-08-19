/**
 * PersonalizedRecommendations Component
 * Displays personalized learning recommendations based on user behavior and preferences
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  BookOpen,
  Clock,
  Target,
  Star,
  ChevronRight,
  RefreshCw,
  Settings,
  Play,
  FileText,
  Video,
  Award,
  AlertCircle,
  CheckCircle,
  Brain,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import contentRecommendationService from '../../services/contentRecommendationService';
import userBehaviorAnalytics from '../../services/userBehaviorAnalytics';
import advancedRecommendationEngine from '../../services/advancedRecommendationEngine';
import { Link } from 'react-router-dom';

const PersonalizedRecommendations = ({ 
  subjectCode = '9709',
  className = '',
  onRecommendationClick,
  showPreferences = true
}) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState(null);
  const [advancedRecommendations, setAdvancedRecommendations] = useState(null);
  const [behaviorPatterns, setBehaviorPatterns] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('topics'); // topics, practice, materials
  const [showPreferencesPanel, setShowPreferencesPanel] = useState(false);
  const [preferences, setPreferences] = useState({
    learningStyle: 'visual',
    difficultyLevel: 'intermediate',
    studyTime: 'moderate',
    focusAreas: []
  });

  // Load recommendations on component mount
  useEffect(() => {
    if (user) {
      loadRecommendations();
      loadBehaviorPatterns();
    }
  }, [user, subjectCode]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await contentRecommendationService.getPersonalizedContent(
        user.id,
        subjectCode
      );
      
      setRecommendations(data);
      
      // Get advanced recommendations
      const advancedRecs = await advancedRecommendationEngine.generateRecommendations(
        user.id,
        subjectCode,
        {
          maxRecommendations: 10,
          includeExplanations: true,
          diversityFactor: 0.3,
          timeHorizon: 7
        }
      );
      
      setAdvancedRecommendations(advancedRecs);
      
      // Generate insights based on recommendations
      const generatedInsights = await contentRecommendationService.generateInsights(
        user.id,
        data
      );
      setInsights(generatedInsights.concat(advancedRecs.insights || []));
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBehaviorPatterns = async () => {
    try {
      const patterns = await userBehaviorAnalytics.getUserBehaviorPatterns(user.id, {
        timeRange: 30,
        includeSessionData: true,
        includePreferences: true
      });
      setBehaviorPatterns(patterns);
    } catch (error) {
      console.error('Error loading behavior patterns:', error);
    }
  };

  const handleRefresh = () => {
    loadRecommendations();
  };

  const handlePreferencesUpdate = async (newPreferences) => {
    try {
      await contentRecommendationService.updateUserPreferences(
        user.id,
        newPreferences
      );
      setPreferences(newPreferences);
      setShowPreferencesPanel(false);
      // Reload recommendations with new preferences
      loadRecommendations();
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return <Star className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'hard':
        return <Star className="w-4 h-4 text-red-500" />;
      default:
        return <Star className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderTopicRecommendations = () => {
    if (!recommendations?.recommendedTopics) return null;

    return (
      <div className="space-y-4">
        {recommendations.recommendedTopics.map((topic, index) => (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              // Track recommendation interaction
              userBehaviorAnalytics.trackRecommendationInteraction(
                user.id,
                topic.id,
                'click',
                { type: 'topic', title: topic.title }
              );
              onRecommendationClick?.(topic);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{topic.title}</h4>
                  {getDifficultyIcon(topic.difficulty)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getPriorityColor(topic.priority)
                  }`}>
                    {topic.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{topic.description}</p>
                <p className="text-xs text-blue-600 mb-2">{topic.reason}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{topic.estimatedTime}分钟</span>
                </div>
                {topic.progress > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{topic.progress}% 完成</span>
                  </div>
                )}
              </div>
              
              {topic.progress > 0 && (
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${topic.progress}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderPracticeProblems = () => {
    if (!recommendations?.practiceProblems) return null;

    return (
      <div className="space-y-4">
        {recommendations.practiceProblems.map((problem, index) => (
          <motion.div
            key={problem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onRecommendationClick?.(problem)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Play className="w-4 h-4 text-blue-500" />
                  <h4 className="font-semibold text-gray-900">{problem.title}</h4>
                  {getDifficultyIcon(problem.difficulty)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{problem.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>{problem.questionCount} 题目</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{problem.estimatedTime}分钟</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderStudyMaterials = () => {
    if (!recommendations?.studyMaterials) return null;

    return (
      <div className="space-y-4">
        {recommendations.studyMaterials.map((material, index) => (
          <motion.div
            key={material.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onRecommendationClick?.(material)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {material.type === 'video' ? (
                    <Video className="w-4 h-4 text-purple-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-green-500" />
                  )}
                  <h4 className="font-semibold text-gray-900">{material.title}</h4>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    {material.format}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{material.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="text-sm text-gray-500">
              {material.pages && `${material.pages} 页`}
              {material.duration && material.duration}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderInsights = () => {
    if (!recommendations?.insights) return null;

    const { insights } = recommendations;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 mb-6">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Award className="w-4 h-4 mr-2 text-blue-500" />
          学习洞察
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{insights.totalRecommendations}</div>
            <div className="text-sm text-gray-600">推荐内容</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{insights.highPriorityCount}</div>
            <div className="text-sm text-gray-600">高优先级</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{insights.estimatedStudyTime}分</div>
            <div className="text-sm text-gray-600">预计学时</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{insights.completionRate}%</div>
            <div className="text-sm text-gray-600">完成率</div>
          </div>
        </div>
        
        {insights.nextMilestone && (
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">下一个里程碑:</span>
              <span className="text-sm text-blue-600">{insights.nextMilestone}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPreferencesPanel = () => {
    if (!showPreferencesPanel) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={() => setShowPreferencesPanel(false)}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-4">推荐偏好设置</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学习风格
              </label>
              <select 
                value={preferences.learningStyle}
                onChange={(e) => setPreferences(prev => ({ ...prev, learningStyle: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="visual">视觉型</option>
                <option value="auditory">听觉型</option>
                <option value="kinesthetic">动手型</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                难度偏好
              </label>
              <select 
                value={preferences.difficultyLevel}
                onChange={(e) => setPreferences(prev => ({ ...prev, difficultyLevel: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学习时间
              </label>
              <select 
                value={preferences.studyTime}
                onChange={(e) => setPreferences(prev => ({ ...prev, studyTime: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="light">轻度 (每天30分钟)</option>
                <option value="moderate">中度 (每天1小时)</option>
                <option value="intensive">密集 (每天2小时以上)</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowPreferencesPanel(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => handlePreferencesUpdate(preferences)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">加载推荐内容失败</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">个性化推荐</h3>
          </div>
          <div className="flex items-center gap-2">
            {showPreferences && (
              <button
                onClick={() => setShowPreferencesPanel(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                title="设置偏好"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              title="刷新推荐"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Advanced AI Recommendations */}
        {advancedRecommendations && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Brain className="w-4 h-4 mr-2 text-purple-500" />
              AI 智能推荐
              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                置信度: {Math.round((advancedRecommendations.confidence || 0) * 100)}%
              </span>
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{advancedRecommendations.totalRecommendations || 0}</div>
                <div className="text-sm text-gray-600">智能推荐</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{advancedRecommendations.highPriorityCount || 0}</div>
                <div className="text-sm text-gray-600">高优先级</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{advancedRecommendations.estimatedStudyTime || 0}</div>
                <div className="text-sm text-gray-600">预计学时(分钟)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{insights.length}</div>
                <div className="text-sm text-gray-600">智能洞察</div>
              </div>
            </div>
            
            {advancedRecommendations.nextMilestone && (
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">下一个里程碑:</span>
                  <span className="text-sm text-purple-600">{advancedRecommendations.nextMilestone}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Behavior Insights */}
        {behaviorPatterns && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
              行为洞察
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{behaviorPatterns.engagementMetrics?.engagementScore || 0}</div>
                <div className="text-sm text-gray-600">参与度评分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{behaviorPatterns.performanceTrends?.averageScore?.toFixed(1) || 0}</div>
                <div className="text-sm text-gray-600">平均成绩</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{behaviorPatterns.engagementMetrics?.dailyActiveTime || 0}</div>
                <div className="text-sm text-gray-600">日均学习(分钟)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{behaviorPatterns.sessionCount || 0}</div>
                <div className="text-sm text-gray-600">学习次数</div>
              </div>
            </div>
            
            {insights.length > 0 && (
              <div className="space-y-2">
                {insights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700">{insight.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Insights */}
        {renderInsights()}
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('topics')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'topics'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-1" />
            学习主题
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'practice'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Play className="w-4 h-4 inline mr-1" />
            练习题目
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'materials'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            学习资料
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'topics' && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderTopicRecommendations()}
            </motion.div>
          )}
          {activeTab === 'practice' && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderPracticeProblems()}
            </motion.div>
          )}
          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderStudyMaterials()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Preferences Panel */}
      <AnimatePresence>
        {renderPreferencesPanel()}
      </AnimatePresence>
    </div>
  );
};

export default PersonalizedRecommendations;