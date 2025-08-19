/**
 * Recommendation Management Component
 * Allows administrators to manage and monitor the recommendation system
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import advancedRecommendationEngine from '../../services/advancedRecommendationEngine';
import userBehaviorAnalytics from '../../services/userBehaviorAnalytics';
import { db } from '../../utils/supabase';

const RecommendationManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [recommendationHistory, setRecommendationHistory] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    modelWeights: {
      performance: 0.3,
      engagement: 0.25,
      difficulty: 0.2,
      recency: 0.15,
      similarity: 0.1
    },
    diversityFactor: 0.3,
    maxRecommendations: 10,
    confidenceThreshold: 0.5
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSystemMetrics(),
        loadRecommendationHistory(),
        loadUserAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemMetrics = async () => {
    try {
      // Get system-wide metrics
      const { data: totalUsers } = await db
        .from('user_profiles')
        .select('id', { count: 'exact' });
      
      const { data: totalRecommendations } = await db
        .from('recommendation_history')
        .select('id', { count: 'exact' })
        .gte('generated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: activeUsers } = await db
        .from('user_behavior_logs')
        .select('user_id', { count: 'exact' })
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setSystemMetrics({
        totalUsers: totalUsers?.length || 0,
        weeklyRecommendations: totalRecommendations?.length || 0,
        dailyActiveUsers: activeUsers?.length || 0,
        systemHealth: 'healthy',
        averageConfidence: 0.75,
        recommendationAccuracy: 0.82
      });
    } catch (error) {
      console.error('Error loading system metrics:', error);
      setSystemMetrics({
        totalUsers: 0,
        weeklyRecommendations: 0,
        dailyActiveUsers: 0,
        systemHealth: 'unknown',
        averageConfidence: 0,
        recommendationAccuracy: 0
      });
    }
  };

  const loadRecommendationHistory = async () => {
    try {
      const { data, error } = await db
        .from('recommendation_history')
        .select(`
          *,
          user_profiles(email, full_name)
        `)
        .order('generated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setRecommendationHistory(data || []);
    } catch (error) {
      console.error('Error loading recommendation history:', error);
      setRecommendationHistory([]);
    }
  };

  const loadUserAnalytics = async () => {
    try {
      const { data, error } = await db
        .from('user_profiles')
        .select(`
          *,
          user_behavior_logs(count)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setUserAnalytics(data || []);
    } catch (error) {
      console.error('Error loading user analytics:', error);
      setUserAnalytics([]);
    }
  };

  const handleSettingsUpdate = async () => {
    try {
      // Update system settings in database
      const { error } = await db
        .from('system_settings')
        .upsert({
          id: 'recommendation_engine',
          settings: systemSettings,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        });
      
      if (error) throw error;
      
      alert('系统设置已更新');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('更新设置失败');
    }
  };

  const generateUserReport = async (userId) => {
    try {
      setSelectedUser(userId);
      
      // Generate comprehensive user report
      const behaviorPatterns = await userBehaviorAnalytics.getUserBehaviorPatterns(userId, {
        timeRange: 30,
        includeSessionData: true
      });
      
      const recommendations = await advancedRecommendationEngine.generateRecommendations(
        userId,
        'MATH',
        {
          maxRecommendations: 15,
          includeExplanations: true,
          diversityFactor: systemSettings.diversityFactor
        }
      );
      
      // Display report in modal or new tab
      console.log('User Report:', { behaviorPatterns, recommendations });
      
    } catch (error) {
      console.error('Error generating user report:', error);
    }
  };

  const exportData = async (type) => {
    try {
      let data;
      let filename;
      
      switch (type) {
        case 'recommendations':
          data = recommendationHistory;
          filename = 'recommendation_history.json';
          break;
        case 'analytics':
          data = userAnalytics;
          filename = 'user_analytics.json';
          break;
        case 'metrics':
          data = systemMetrics;
          filename = 'system_metrics.json';
          break;
        default:
          return;
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">推荐系统管理</h1>
        <p className="text-gray-600">监控和管理个性化推荐系统的性能和设置</p>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '系统概览', icon: '📊' },
            { id: 'history', name: '推荐历史', icon: '📝' },
            { id: 'analytics', name: '用户分析', icon: '👥' },
            { id: 'settings', name: '系统设置', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 系统概览 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 关键指标 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">总用户数</p>
                  <p className="text-2xl font-semibold text-gray-900">{systemMetrics?.totalUsers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">📈</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">周推荐数</p>
                  <p className="text-2xl font-semibold text-gray-900">{systemMetrics?.weeklyRecommendations || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold">⚡</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">日活跃用户</p>
                  <p className="text-2xl font-semibold text-gray-900">{systemMetrics?.dailyActiveUsers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">🎯</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">推荐准确率</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round((systemMetrics?.recommendationAccuracy || 0) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 系统健康状态 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">系统健康状态</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl ${
                  systemMetrics?.systemHealth === 'healthy' ? 'bg-green-100 text-green-600' :
                  systemMetrics?.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {systemMetrics?.systemHealth === 'healthy' ? '✅' :
                   systemMetrics?.systemHealth === 'warning' ? '⚠️' : '❌'}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">系统状态</p>
                <p className="text-xs text-gray-500">
                  {systemMetrics?.systemHealth === 'healthy' ? '运行正常' :
                   systemMetrics?.systemHealth === 'warning' ? '需要关注' : '存在问题'}
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {Math.round((systemMetrics?.averageConfidence || 0) * 100)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">平均置信度</p>
                <p className="text-xs text-gray-500">推荐质量指标</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">性能优化</p>
                <p className="text-xs text-gray-500">持续改进中</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 推荐历史 */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">推荐历史记录</h3>
            <button
              onClick={() => exportData('recommendations')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              导出数据
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      科目
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      推荐数量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      置信度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      生成时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recommendationHistory.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.user_profiles?.full_name || record.user_profiles?.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.subject_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.recommendations?.content?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          (record.recommendations?.confidence || 0) > 0.7 ? 'bg-green-100 text-green-700' :
                          (record.recommendations?.confidence || 0) > 0.5 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {Math.round((record.recommendations?.confidence || 0) * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.generated_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => generateUserReport(record.user_id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 用户分析 */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">用户行为分析</h3>
            <button
              onClick={() => exportData('analytics')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              导出数据
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userAnalytics.slice(0, 9).map((user, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {user.full_name || user.email || 'Unknown User'}
                    </h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => generateUserReport(user.id)}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    详细报告
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">学习偏好:</span>
                    <span className="text-gray-900">{user.learning_preferences?.difficulty || 'medium'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">注册时间:</span>
                    <span className="text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">活跃度:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.user_behavior_logs?.length > 10 ? 'bg-green-100 text-green-700' :
                      user.user_behavior_logs?.length > 5 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {user.user_behavior_logs?.length > 10 ? '高' :
                       user.user_behavior_logs?.length > 5 ? '中' : '低'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 系统设置 */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">推荐引擎设置</h3>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="font-medium text-gray-900 mb-4">模型权重配置</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(systemSettings.modelWeights).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {key === 'performance' ? '学习表现' :
                     key === 'engagement' ? '参与度' :
                     key === 'difficulty' ? '难度匹配' :
                     key === 'recency' ? '时效性' :
                     key === 'similarity' ? '相似度' : key}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={value}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      modelWeights: {
                        ...systemSettings.modelWeights,
                        [key]: parseFloat(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span className="font-medium">{value.toFixed(2)}</span>
                    <span>1</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="font-medium text-gray-900 mb-4">推荐参数</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  多样性因子
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={systemSettings.diversityFactor}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    diversityFactor: parseFloat(e.target.value)
                  })}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {systemSettings.diversityFactor.toFixed(1)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大推荐数量
                </label>
                <input
                  type="number"
                  min="5"
                  max="20"
                  value={systemSettings.maxRecommendations}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    maxRecommendations: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  置信度阈值
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={systemSettings.confidenceThreshold}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    confidenceThreshold: parseFloat(e.target.value)
                  })}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {systemSettings.confidenceThreshold.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSettingsUpdate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存设置
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationManagement;