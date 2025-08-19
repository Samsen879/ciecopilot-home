import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Star,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PersonalizedRecommendations from '../components/Recommendations/PersonalizedRecommendations';
import CommunityInterface from '../components/Community/CommunityInterface';

const CommunityAndRecommendations = () => {
  const { subjectCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('recommendations');

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
    },
    '9701': {
      name: 'Chemistry',
      fullName: 'CIE A-Level Chemistry',
      icon: '🧪',
      color: 'green'
    },
    '9700': {
      name: 'Biology',
      fullName: 'CIE A-Level Biology',
      icon: '🧬',
      color: 'emerald'
    }
  };

  const currentSubject = subjectInfo[subjectCode] || {
    name: 'All Subjects',
    fullName: 'CIE A-Level 全学科',
    icon: '📚',
    color: 'gray'
  };

  // 标签页配置
  const tabs = [
    {
      id: 'recommendations',
      name: '个性化推荐',
      icon: Star,
      description: '基于你的学习表现量身定制'
    },
    {
      id: 'community',
      name: '学习社区',
      icon: Users,
      description: '与同学们讨论问题和分享经验'
    }
  ];

  // 处理推荐点击
  const handleRecommendationClick = (recommendation) => {
    console.log('推荐点击:', recommendation);
    if (recommendation.actionUrl) {
      navigate(recommendation.actionUrl);
    }
  };

  // 处理偏好更新
  const handlePreferencesUpdate = (preferences) => {
    console.log('偏好更新:', preferences);
    // 这里可以保存用户偏好到后端
  };

  // 处理问题点击
  const handleQuestionClick = (question) => {
    console.log('问题点击:', question);
    // 导航到问题详情页面
    navigate(`/community/question/${question.id}`);
  };

  // 处理新问题
  const handleNewQuestion = (question) => {
    console.log('新问题:', question);
    // 这里可以添加成功提示
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
                    {currentSubject.name} 学习中心
                  </h1>
                  <p className="text-sm text-gray-500">{currentSubject.fullName}</p>
                </div>
              </div>
            </div>
            
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">
                  欢迎回来, {user.email?.split('@')[0] || '同学'}
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'recommendations' ? (
            <PersonalizedRecommendations
              userId={user?.id}
              subjectCode={subjectCode}
              onRecommendationClick={handleRecommendationClick}
              onPreferencesUpdate={handlePreferencesUpdate}
            />
          ) : (
            <CommunityInterface
              subjectCode={subjectCode}
              onQuestionClick={handleQuestionClick}
              onNewQuestion={handleNewQuestion}
            />
          )}
        </motion.div>
      </div>

      {/* 底部快速操作 */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        {activeTab === 'recommendations' && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setActiveTab('community')}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            title="切换到学习社区"
          >
            <MessageSquare className="w-5 h-5" />
          </motion.button>
        )}
        
        {activeTab === 'community' && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setActiveTab('recommendations')}
            className="w-12 h-12 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600 transition-colors flex items-center justify-center"
            title="切换到个性化推荐"
          >
            <Star className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default CommunityAndRecommendations;
