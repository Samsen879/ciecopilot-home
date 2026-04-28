import React from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PersonalizedRecommendations from '../components/Recommendations/PersonalizedRecommendations';

const Recommendations = () => {
  const { subjectCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const subjectInfo = {
    '9709': {
      name: 'Mathematics',
      fullName: 'CIE A-Level Mathematics',
      icon: '📐',
      badgeClass: 'bg-blue-100',
    },
    '9702': {
      name: 'Physics',
      fullName: 'CIE A-Level Physics',
      icon: '⚛️',
      badgeClass: 'bg-purple-100',
    },
  };

  const currentSubject = subjectInfo[subjectCode] || {
    name: 'All Subjects',
    fullName: 'CIE A-Level 全学科',
    icon: '📚',
    badgeClass: 'bg-gray-100',
  };

  const handleRecommendationClick = (recommendation) => {
    console.log('推荐点击:', recommendation);
    if (recommendation.actionUrl) {
      navigate(recommendation.actionUrl);
    }
  };

  const handlePreferencesUpdate = (preferences) => {
    console.log('偏好更新:', preferences);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
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
                <div className={`w-10 h-10 ${currentSubject.badgeClass} rounded-lg flex items-center justify-center text-lg`}>
                  {currentSubject.icon}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentSubject.name} 个性化推荐
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PersonalizedRecommendations
            userId={user?.id}
            subjectCode={subjectCode}
            onRecommendationClick={handleRecommendationClick}
            onPreferencesUpdate={handlePreferencesUpdate}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Recommendations;
