/**
 * Learning Analytics Dashboard Component
 * Provides comprehensive learning data visualization and insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Brain,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  BookOpen,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import userBehaviorAnalytics from '../../services/userBehaviorAnalytics';
import contentRecommendationService from '../../services/contentRecommendationService';

const LearningAnalyticsDashboard = ({ subjectCode }) => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [behaviorPatterns, setBehaviorPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    if (user?.id) {
      loadAnalyticsData();
    }
  }, [user?.id, timeRange, subjectCode]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load behavior patterns
      const patterns = await userBehaviorAnalytics.getUserBehaviorPatterns(user.id, {
        timeRange,
        includeSessionData: true,
        includePreferences: true
      });
      setBehaviorPatterns(patterns);

      // Generate comprehensive analytics
      const analytics = await generateAnalytics(patterns);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = async (patterns) => {
    // Process behavior patterns into analytics data
    const analytics = {
      overview: {
        totalStudyTime: patterns.engagementMetrics?.dailyActiveTime * timeRange || 0,
        averageScore: patterns.performanceTrends?.averageScore || 0,
        engagementScore: patterns.engagementMetrics?.engagementScore || 0,
        consistencyScore: patterns.studyHabits?.consistencyScore || 0,
        improvementRate: patterns.performanceTrends?.improvementRate || 0
      },
      performance: {
        trend: patterns.performanceTrends?.overallTrend || 'stable',
        strongAreas: patterns.performanceTrends?.strongAreas || [],
        weakAreas: patterns.performanceTrends?.weakAreas || [],
        recentPerformance: patterns.performanceTrends?.recentPerformance || []
      },
      habits: {
        averageSessionDuration: patterns.studyHabits?.averageSessionDuration || 0,
        preferredStudyTimes: patterns.studyHabits?.preferredStudyTimes || [],
        studyFrequency: patterns.studyHabits?.studyFrequency || 0,
        topicSwitchingRate: patterns.studyHabits?.topicSwitchingRate || 0
      },
      preferences: {
        preferredContentTypes: patterns.learningPreferences?.preferredContentTypes || [],
        difficultyPreference: patterns.learningPreferences?.difficultyPreference || 'medium',
        learningStyle: patterns.learningPreferences?.learningStyle || 'mixed',
        topicPreferences: patterns.learningPreferences?.topicPreferences || []
      },
      timePatterns: {
        peakHours: patterns.timePatterns?.peakHours || [],
        weekdayVsWeekend: patterns.timePatterns?.weekdayVsWeekend || { weekday: 0, weekend: 0 }
      }
    };

    return analytics;
  };

  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    const { overview } = analyticsData;
    
    const cards = [
      {
        title: '总学习时间',
        value: `${Math.round(overview.totalStudyTime)}分钟`,
        icon: Clock,
        color: 'blue',
        trend: overview.totalStudyTime > 0 ? 'up' : 'stable'
      },
      {
        title: '平均成绩',
        value: `${(overview.averageScore * 100).toFixed(1)}%`,
        icon: Target,
        color: 'green',
        trend: overview.improvementRate > 0 ? 'up' : overview.improvementRate < 0 ? 'down' : 'stable'
      },
      {
        title: '参与度评分',
        value: overview.engagementScore,
        icon: Activity,
        color: 'purple',
        trend: overview.engagementScore >= 70 ? 'up' : overview.engagementScore >= 40 ? 'stable' : 'down'
      },
      {
        title: '学习一致性',
        value: `${(overview.consistencyScore * 100).toFixed(0)}%`,
        icon: Calendar,
        color: 'orange',
        trend: overview.consistencyScore >= 0.7 ? 'up' : overview.consistencyScore >= 0.4 ? 'stable' : 'down'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => {
          const IconComponent = card.icon;
          const TrendIcon = card.trend === 'up' ? TrendingUp : card.trend === 'down' ? TrendingDown : Activity;
          
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-${card.color}-100`}>
                    <IconComponent className={`h-6 w-6 text-${card.color}-600`} />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <TrendIcon className={`h-4 w-4 mr-1 ${
                    card.trend === 'up' ? 'text-green-500' : 
                    card.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`} />
                  <span className={`text-sm ${
                    card.trend === 'up' ? 'text-green-600' : 
                    card.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {card.trend === 'up' ? '表现良好' : 
                     card.trend === 'down' ? '需要改进' : '保持稳定'}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderPerformanceAnalysis = () => {
    if (!analyticsData) return null;

    const { performance } = analyticsData;

    return (
      <div className="space-y-6">
        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              成绩趋势分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Badge variant={performance.trend === 'improving' ? 'default' : 
                            performance.trend === 'declining' ? 'destructive' : 'secondary'}>
                {performance.trend === 'improving' ? '持续进步' : 
                 performance.trend === 'declining' ? '需要关注' : '保持稳定'}
              </Badge>
              <span className="text-sm text-gray-600">
                基于最近 {timeRange} 天的学习数据
              </span>
            </div>
            
            {/* Recent Performance Chart */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">最近表现</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {performance.recentPerformance.slice(0, 5).map((item, index) => (
                  <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={`text-lg font-bold ${
                      item.score >= 0.8 ? 'text-green-600' : 
                      item.score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(item.score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strong and Weak Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                优势领域
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performance.strongAreas.length > 0 ? (
                <div className="space-y-3">
                  {performance.strongAreas.map((area, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">{area.topicId}</div>
                        <div className="text-sm text-green-600">{area.attempts} 次练习</div>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {(area.averageScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">暂无数据</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                薄弱环节
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performance.weakAreas.length > 0 ? (
                <div className="space-y-3">
                  {performance.weakAreas.map((area, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium text-red-900">{area.topicId}</div>
                        <div className="text-sm text-red-600">{area.attempts} 次练习</div>
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        {(area.averageScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">表现均衡，继续保持！</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderStudyHabits = () => {
    if (!analyticsData) return null;

    const { habits, timePatterns } = analyticsData;

    return (
      <div className="space-y-6">
        {/* Study Habits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">平均学习时长</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Math.round(habits.averageSessionDuration / 60)}分钟
              </div>
              <p className="text-sm text-gray-600">每次学习会话</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">学习频率</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {habits.studyFrequency.toFixed(1)}次
              </div>
              <p className="text-sm text-gray-600">每周平均</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">专注度</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {((1 - habits.topicSwitchingRate) * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-gray-600">主题专注度</p>
            </CardContent>
          </Card>
        </div>

        {/* Peak Study Times */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最佳学习时间
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {timePatterns.peakHours.map((peak, index) => (
                <div key={index} className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {peak.hour}:00
                  </div>
                  <div className="text-sm text-gray-600">
                    活跃度: {peak.activity}
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    {index === 0 ? '最佳时间' : `第${index + 1}选择`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekday vs Weekend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              学习时间分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {timePatterns.weekdayVsWeekend.weekday}
                </div>
                <div className="text-sm text-gray-600">工作日学习次数</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {timePatterns.weekdayVsWeekend.weekend}
                </div>
                <div className="text-sm text-gray-600">周末学习次数</div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>工作日</span>
                <span>周末</span>
              </div>
              <Progress 
                value={(timePatterns.weekdayVsWeekend.weekday / 
                       (timePatterns.weekdayVsWeekend.weekday + timePatterns.weekdayVsWeekend.weekend)) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderLearningPreferences = () => {
    if (!analyticsData) return null;

    const { preferences } = analyticsData;

    return (
      <div className="space-y-6">
        {/* Content Type Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              内容类型偏好
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preferences.preferredContentTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{type.type}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={(type.frequency / 10) * 100} className="w-24 h-2" />
                    <span className="text-sm text-gray-600">{type.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Difficulty and Learning Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>难度偏好</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {preferences.difficultyPreference === 'easy' ? '简单' :
                 preferences.difficultyPreference === 'hard' ? '困难' : '中等'}
              </div>
              <p className="text-sm text-gray-600">最适合的难度级别</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>学习风格</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {preferences.learningStyle === 'visual' ? '视觉型' :
                 preferences.learningStyle === 'auditory' ? '听觉型' :
                 preferences.learningStyle === 'kinesthetic' ? '动手型' : '混合型'}
              </div>
              <p className="text-sm text-gray-600">主要学习方式</p>
            </CardContent>
          </Card>
        </div>

        {/* Topic Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              主题偏好
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {preferences.topicPreferences.map((topic, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{topic.topicId}</div>
                  <div className="text-sm text-gray-600">学习次数: {topic.frequency}</div>
                  <Badge variant="outline" className="mt-1">
                    {index < 2 ? '高频' : index < 4 ? '中频' : '低频'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">学习分析仪表板</h2>
          <p className="text-gray-600">深入了解您的学习模式和进度</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={timeRange === 7 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(7)}
          >
            7天
          </Button>
          <Button
            variant={timeRange === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(30)}
          >
            30天
          </Button>
          <Button
            variant={timeRange === 90 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(90)}
          >
            90天
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Detailed Analytics */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="performance">成绩分析</TabsTrigger>
          <TabsTrigger value="habits">学习习惯</TabsTrigger>
          <TabsTrigger value="preferences">学习偏好</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  智能洞察
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      您的学习一致性很好，建议继续保持每日学习的习惯。
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      在数学领域表现优秀，可以尝试更有挑战性的题目。
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      物理学习时间较少，建议增加相关练习。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  学习成就
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-900">坚持学习者</div>
                      <div className="text-sm text-purple-600">连续学习7天</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Zap className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">快速进步</div>
                      <div className="text-sm text-green-600">成绩提升20%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          {renderPerformanceAnalysis()}
        </TabsContent>

        <TabsContent value="habits" className="mt-6">
          {renderStudyHabits()}
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          {renderLearningPreferences()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearningAnalyticsDashboard;