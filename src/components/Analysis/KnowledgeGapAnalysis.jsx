import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  TrendingDown, 
  Target, 
  BookOpen, 
  Brain, 
  CheckCircle,
  XCircle,
  ArrowRight,
  Lightbulb,
  BarChart3,
  PieChart,
  Layers,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';

/**
 * Knowledge Gap Analysis Component - 知识缺陷分析组件
 * 
 * 功能特性：
 * - 知识缺陷可视化分析
 * - 优先级智能排序
 * - 个性化行动建议
 * - 多维度数据展示
 * - 学习路径推荐集成
 */
export default function KnowledgeGapAnalysis({ 
  userId, 
  subjectCode = '9709',
  recentInteractions = 10,
  onRecommendationSelected,
  onLearningPathRequested,
  className = '' 
}) {
  // === 状态管理 ===
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // overview, detailed, priority
  const [selectedGap, setSelectedGap] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all'); // all, critical, moderate, minor
  const [sortBy, setSortBy] = useState('severity'); // severity, difficulty, impact

  // === 效果和API调用 ===
  useEffect(() => {
    if (userId && subjectCode) {
      analyzeKnowledgeGaps();
    }
  }, [userId, subjectCode, recentInteractions]);

  const analyzeKnowledgeGaps = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/analyze/knowledge-gaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || 'test-token'}`
        },
        body: JSON.stringify({
          user_id: userId,
          subject_code: subjectCode,
          recent_interactions: recentInteractions,
          analysis_depth: 'comprehensive'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAnalysisData(data.analysis);
      } else {
        throw new Error(data.error || '知识缺陷分析失败');
      }
      
    } catch (error) {
      console.error('Knowledge gap analysis error:', error);
      setError(error.message);
      
      // 使用模拟数据进行开发
      setAnalysisData(generateMockAnalysisData());
    } finally {
      setIsLoading(false);
    }
  };

  // === 模拟数据生成 ===
  const generateMockAnalysisData = () => {
    return {
      analysis_id: 'analysis_' + Date.now(),
      user_id: userId,
      subject_code: subjectCode,
      analysis_date: new Date().toISOString(),
      overall_score: 72,
      
      knowledge_gaps: [
        {
          id: 'gap_1',
          topic: '导数应用',
          category: 'calculus',
          severity: 'critical',
          confidence: 0.89,
          impact_score: 8.5,
          difficulty_level: 'intermediate',
          estimated_study_hours: 12,
          
          details: {
            specific_areas: ['最值问题', '切线方程', '函数单调性'],
            common_mistakes: ['符号判断错误', '边界条件遗漏', '复合函数求导'],
            prerequisite_gaps: ['基础求导法则'],
            related_topics: ['函数图像', '不等式']
          },
          
          performance_data: {
            accuracy_rate: 0.32,
            attempt_count: 15,
            improvement_trend: -0.05,
            last_attempt_date: '2024-01-15T10:30:00Z'
          },
          
          recommendations: [
            {
              type: 'study_material',
              title: '导数应用专题练习',
              description: '重点练习最值问题和切线方程',
              priority: 'high',
              estimated_time: '4-6小时'
            },
            {
              type: 'prerequisite_review',
              title: '复习基础求导法则',
              description: '巩固链式法则和乘积法则',
              priority: 'medium',
              estimated_time: '2-3小时'
            }
          ]
        },
        
        {
          id: 'gap_2',
          topic: '三角函数恒等式',
          category: 'trigonometry',
          severity: 'moderate',
          confidence: 0.76,
          impact_score: 6.8,
          difficulty_level: 'intermediate',
          estimated_study_hours: 8,
          
          details: {
            specific_areas: ['和差化积', '积化和差', '万能公式'],
            common_mistakes: ['公式记忆错误', '角度范围判断', '符号处理'],
            prerequisite_gaps: [],
            related_topics: ['三角方程', '三角函数图像']
          },
          
          performance_data: {
            accuracy_rate: 0.58,
            attempt_count: 12,
            improvement_trend: 0.12,
            last_attempt_date: '2024-01-16T14:20:00Z'
          },
          
          recommendations: [
            {
              type: 'memory_aid',
              title: '三角恒等式记忆卡片',
              description: '系统化记忆常用恒等式',
              priority: 'high',
              estimated_time: '2-3小时'
            },
            {
              type: 'practice',
              title: '恒等式变换练习',
              description: '渐进式难度练习',
              priority: 'medium',
              estimated_time: '3-4小时'
            }
          ]
        },
        
        {
          id: 'gap_3',
          topic: '向量运算',
          category: 'vectors',
          severity: 'minor',
          confidence: 0.82,
          impact_score: 4.2,
          difficulty_level: 'beginner',
          estimated_study_hours: 5,
          
          details: {
            specific_areas: ['向量乘积', '向量投影'],
            common_mistakes: ['数量积与向量积混淆'],
            prerequisite_gaps: [],
            related_topics: ['几何应用', '空间向量']
          },
          
          performance_data: {
            accuracy_rate: 0.73,
            attempt_count: 8,
            improvement_trend: 0.18,
            last_attempt_date: '2024-01-17T09:15:00Z'
          },
          
          recommendations: [
            {
              type: 'visual_learning',
              title: '向量几何直观理解',
              description: '通过图形加深向量概念理解',
              priority: 'medium',
              estimated_time: '2-3小时'
            }
          ]
        },
        
        {
          id: 'gap_4',
          topic: '概率分布',
          category: 'probability',
          severity: 'moderate',
          confidence: 0.71,
          impact_score: 7.1,
          difficulty_level: 'advanced',
          estimated_study_hours: 10,
          
          details: {
            specific_areas: ['正态分布', '二项分布', '泊松分布'],
            common_mistakes: ['参数理解错误', '分布选择不当'],
            prerequisite_gaps: ['基础概率概念'],
            related_topics: ['统计推断', '假设检验']
          },
          
          performance_data: {
            accuracy_rate: 0.45,
            attempt_count: 10,
            improvement_trend: 0.08,
            last_attempt_date: '2024-01-14T16:45:00Z'
          },
          
          recommendations: [
            {
              type: 'conceptual_review',
              title: '概率分布概念梳理',
              description: '系统理解各种分布的特点和应用',
              priority: 'high',
              estimated_time: '4-5小时'
            }
          ]
        }
      ],
      
      insights: {
        strongest_areas: ['函数基础', '代数运算'],
        improvement_trends: ['三角函数', '向量运算'],
        priority_focus: ['导数应用', '概率分布'],
        estimated_improvement_time: '6-8周',
        confidence_boost_potential: 0.25,
        
        learning_style_analysis: {
          preferred_approach: 'visual',
          effectiveness_scores: {
            visual: 0.78,
            analytical: 0.65,
            practice: 0.82
          }
        },
        
        study_pattern_insights: [
          '练习频率需要提高',
          '对错误的反思不够深入',
          '基础概念需要进一步巩固'
        ]
      }
    };
  };

  // === 数据处理 ===
  const filteredAndSortedGaps = useMemo(() => {
    if (!analysisData?.knowledge_gaps) return [];
    
    let filtered = analysisData.knowledge_gaps;
    
    // 严重程度过滤
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(gap => gap.severity === filterSeverity);
    }
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 3, moderate: 2, minor: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'difficulty':
          const difficultyOrder = { advanced: 3, intermediate: 2, beginner: 1 };
          return difficultyOrder[b.difficulty_level] - difficultyOrder[a.difficulty_level];
        case 'impact':
          return b.impact_score - a.impact_score;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [analysisData, filterSeverity, sortBy]);

  // === 渲染函数 ===
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'moderate': return 'yellow';
      case 'minor': return 'blue';
      default: return 'gray';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return XCircle;
      case 'moderate': return AlertTriangle;
      case 'minor': return Target;
      default: return CheckCircle;
    }
  };

  const renderOverviewStats = () => {
    if (!analysisData) return null;
    
    const { knowledge_gaps, overall_score, insights } = analysisData;
    const criticalCount = knowledge_gaps.filter(g => g.severity === 'critical').length;
    const moderateCount = knowledge_gaps.filter(g => g.severity === 'moderate').length;
    const minorCount = knowledge_gaps.filter(g => g.severity === 'minor').length;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{overall_score}</div>
              <div className="text-sm opacity-90">总体分数</div>
            </div>
            <BarChart3 className="w-8 h-8 opacity-80" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{criticalCount}</div>
              <div className="text-sm opacity-90">严重缺陷</div>
            </div>
            <XCircle className="w-8 h-8 opacity-80" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{moderateCount}</div>
              <div className="text-sm opacity-90">中等缺陷</div>
            </div>
            <AlertTriangle className="w-8 h-8 opacity-80" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{insights.estimated_improvement_time}</div>
              <div className="text-sm opacity-90">预计改善时间</div>
            </div>
            <Target className="w-8 h-8 opacity-80" />
          </div>
        </motion.div>
      </div>
    );
  };

  const renderGapCard = (gap, index) => {
    const SeverityIcon = getSeverityIcon(gap.severity);
    const color = getSeverityColor(gap.severity);
    
    return (
      <motion.div
        key={gap.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedGap(gap)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <SeverityIcon className={`w-4 h-4 text-${color}-600`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{gap.topic}</h4>
              <p className="text-sm text-gray-600 capitalize">{gap.category}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`px-2 py-1 rounded-full text-xs bg-${color}-100 text-${color}-700`}>
              {gap.severity === 'critical' ? '严重' : 
               gap.severity === 'moderate' ? '中等' : '轻微'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              影响分数: {gap.impact_score.toFixed(1)}
            </div>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>掌握程度</span>
            <span>{Math.round(gap.performance_data.accuracy_rate * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full bg-${color}-500`}
              initial={{ width: 0 }}
              animate={{ width: `${gap.performance_data.accuracy_rate * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{gap.estimated_study_hours}h</span>
            </div>
            <div className="flex items-center space-x-1">
              <Brain className="w-3 h-3" />
              <span className="capitalize">{gap.difficulty_level}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 text-gray-500">
            <span className="text-xs">置信度</span>
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i < Math.round(gap.confidence * 5) ? 'bg-green-400' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        
        {gap.details.specific_areas && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-1">
              {gap.details.specific_areas.slice(0, 3).map((area, areaIndex) => (
                <span
                  key={areaIndex}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {area}
                </span>
              ))}
              {gap.details.specific_areas.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  +{gap.details.specific_areas.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderInsights = () => {
    if (!analysisData?.insights) return null;
    
    const { insights } = analysisData;
    
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Lightbulb className="w-4 h-4 mr-2 text-purple-600" />
          学习洞察
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-gray-800 mb-2">优势领域:</h5>
            <ul className="space-y-1">
              {insights.strongest_areas.map((area, index) => (
                <li key={index} className="text-sm text-green-700 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {area}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-800 mb-2">重点关注:</h5>
            <ul className="space-y-1">
              {insights.priority_focus.map((focus, index) => (
                <li key={index} className="text-sm text-red-700 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {focus}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded-lg">
          <h5 className="font-medium text-gray-800 mb-2">学习建议:</h5>
          <ul className="space-y-1">
            {insights.study_pattern_insights.map((insight, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <ArrowRight className="w-3 h-3 mt-1 mr-1 text-blue-500 flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
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
            className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">正在分析知识缺陷...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center text-red-600">
          <p className="mb-4">分析知识缺陷时出错: {error}</p>
          <button
            onClick={analyzeKnowledgeGaps}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
            <h3 className="font-semibold text-gray-900">知识缺陷分析</h3>
            <p className="text-sm text-gray-600">
              基于 {recentInteractions} 次最近交互的智能分析
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 视图模式切换 */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              {[
                { key: 'overview', label: '概览' },
                { key: 'detailed', label: '详情' },
                { key: 'priority', label: '优先级' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    viewMode === key 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* 控制按钮 */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">所有严重程度</option>
              <option value="critical">严重</option>
              <option value="moderate">中等</option>
              <option value="minor">轻微</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="severity">按严重程度</option>
              <option value="impact">按影响程度</option>
              <option value="difficulty">按难度</option>
            </select>
            
            <button
              onClick={analyzeKnowledgeGaps}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="重新分析"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="p-4 space-y-6">
        {/* 概览统计 */}
        {renderOverviewStats()}
        
        {/* 学习洞察 */}
        {renderInsights()}
        
        {/* 知识缺陷列表 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">知识缺陷详情</h4>
            <span className="text-sm text-gray-600">
              显示 {filteredAndSortedGaps.length} 个缺陷
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSortedGaps.map((gap, index) => renderGapCard(gap, index))}
          </div>
        </div>
      </div>

      {/* 缺陷详情模态框 */}
      <AnimatePresence>
        {selectedGap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedGap(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{selectedGap.topic}</h4>
                  <p className="text-gray-600">{selectedGap.category}</p>
                </div>
                <button
                  onClick={() => setSelectedGap(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              {/* 详细信息 */}
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">具体问题领域:</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedGap.details.specific_areas.map((area, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">常见错误:</h5>
                  <ul className="space-y-1">
                    {selectedGap.details.common_mistakes.map((mistake, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <AlertTriangle className="w-3 h-3 mt-1 mr-2 text-yellow-500 flex-shrink-0" />
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">学习建议:</h5>
                  <div className="space-y-3">
                    {selectedGap.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h6 className="font-medium text-blue-900">{rec.title}</h6>
                            <p className="text-sm text-blue-700 mt-1">{rec.description}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            rec.priority === 'high' 
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {rec.priority === 'high' ? '高优先级' : '中优先级'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-blue-600">
                          预计时间: {rec.estimated_time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    onLearningPathRequested?.(selectedGap);
                    setSelectedGap(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  生成学习计划
                </button>
                <button
                  onClick={() => setSelectedGap(null)}
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
