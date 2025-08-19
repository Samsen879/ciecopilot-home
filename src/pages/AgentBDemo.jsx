import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import AITutorChat from '../components/AI/AITutorChat';
import LearningPathVisualizer from '../components/Learning/LearningPathVisualizer';
import KnowledgeGapAnalysis from '../components/Analysis/KnowledgeGapAnalysis';
import { 
  Bot, 
  TrendingUp, 
  AlertTriangle, 
  BookOpen, 
  Target,
  Sparkles,
  User,
  Calendar
} from 'lucide-react';

/**
 * Agent B Demo Page - Agent B 开发的组件演示页面
 * 
 * 展示以下核心功能：
 * 1. AI Tutor Chat - 智能辅导聊天
 * 2. Learning Path Visualizer - 学习路径可视化
 * 3. Knowledge Gap Analysis - 知识缺陷分析
 */
export default function AgentBDemo() {
  const [selectedSubject, setSelectedSubject] = useState('9709');
  const [mockUserId] = useState('demo-user-123');
  const [activeTab, setActiveTab] = useState('ai-tutor');
  const [notifications, setNotifications] = useState([]);

  // === 组件间交互处理 ===
  const handleKnowledgeGapDetected = (gaps) => {
    console.log('Knowledge gaps detected:', gaps);
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'knowledge_gap',
      message: `检测到 ${gaps.length} 个知识薄弱点`,
      gaps: gaps
    }]);
  };

  const handleLearningPathRequested = (gap) => {
    console.log('Learning path requested for:', gap);
    setActiveTab('learning-path');
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'path_request',
      message: `为 "${gap.topic}" 生成专项学习计划`,
      gap: gap
    }]);
  };

  const handlePathUpdated = (path) => {
    console.log('Learning path updated:', path);
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'path_update',
      message: '学习路径已更新',
      path: path
    }]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // === 科目配置 ===
  const subjects = [
    { code: '9709', name: 'Mathematics', icon: '📐' },
    { code: '9702', name: 'Physics', icon: '⚛️' },
    { code: '9231', name: 'Further Mathematics', icon: '🔬' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Agent B 前端组件演示</h1>
                  <p className="text-sm text-gray-600">AI驱动的个性化学习体验</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 科目选择器 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">科目:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {subjects.map(subject => (
                    <option key={subject.code} value={subject.code}>
                      {subject.icon} {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 模拟用户信息 */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">演示用户</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 通知栏 */}
      {notifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border-b border-blue-200 px-4 py-2"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-blue-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">系统通知</span>
              </div>
              <div className="text-sm text-blue-700">
                {notifications[notifications.length - 1]?.message}
              </div>
            </div>
            <button
              onClick={clearNotifications}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              清除
            </button>
          </div>
        </motion.div>
      )}

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* 标签导航 */}
          <TabsList className="grid w-full grid-cols-3 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <TabsTrigger 
              value="ai-tutor" 
              className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Bot className="w-4 h-4" />
              <span>AI辅导</span>
            </TabsTrigger>
            <TabsTrigger 
              value="learning-path"
              className="flex items-center space-x-2 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <TrendingUp className="w-4 h-4" />
              <span>学习路径</span>
            </TabsTrigger>
            <TabsTrigger 
              value="knowledge-gaps"
              className="flex items-center space-x-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>知识分析</span>
            </TabsTrigger>
          </TabsList>

          {/* AI辅导聊天标签页 */}
          <TabsContent value="ai-tutor" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI辅导聊天</h3>
                    <p className="text-sm text-gray-600">智能数学辅导，支持LaTeX公式渲染和知识缺陷检测</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-600">实时AI对话</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-600">数学公式渲染</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-gray-600">知识缺陷检测</span>
                  </div>
                </div>
              </div>
              
              <AITutorChat
                initialSubject={selectedSubject}
                onKnowledgeGapDetected={handleKnowledgeGapDetected}
                onLearningPathRequested={handleLearningPathRequested}
                className="h-[600px]"
              />
            </motion.div>
          </TabsContent>

          {/* 学习路径可视化标签页 */}
          <TabsContent value="learning-path" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">学习路径可视化</h3>
                    <p className="text-sm text-gray-600">个性化学习计划，支持多种视图模式和进度跟踪</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-600">时间线视图</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">里程碑跟踪</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-600">学习资源</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600">智能推荐</span>
                  </div>
                </div>
              </div>
              
              <LearningPathVisualizer
                userId={mockUserId}
                subjectCode={selectedSubject}
                targetExamDate="2024-06-01"
                onPathUpdated={handlePathUpdated}
                className="min-h-[600px]"
              />
            </motion.div>
          </TabsContent>

          {/* 知识缺陷分析标签页 */}
          <TabsContent value="knowledge-gaps" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">知识缺陷分析</h3>
                    <p className="text-sm text-gray-600">AI智能分析学习弱点，提供针对性改进建议</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-gray-600">缺陷识别</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-gray-600">优先级排序</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-600">改进建议</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-600">学习洞察</span>
                  </div>
                </div>
              </div>
              
              <KnowledgeGapAnalysis
                userId={mockUserId}
                subjectCode={selectedSubject}
                recentInteractions={15}
                onLearningPathRequested={handleLearningPathRequested}
                className="min-h-[600px]"
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 页面底部信息 */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">系统状态: 正常运行</span>
              </div>
              <div className="text-sm text-gray-500">
                Agent B v1.0.0 | 前端组件演示
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>开发者: Agent B</span>
              <span>•</span>
              <span>协作伙伴: Agent A</span>
              <span>•</span>
              <span>更新时间: {new Date().toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
