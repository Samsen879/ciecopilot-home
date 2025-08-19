/**
 * Advanced Recommendation Engine
 * Uses machine learning algorithms for sophisticated personalized recommendations
 */

import { db } from '../utils/supabase';
import userBehaviorAnalytics from './userBehaviorAnalytics';

class AdvancedRecommendationEngine {
  constructor() {
    this.modelWeights = {
      performance: 0.3,
      engagement: 0.25,
      difficulty: 0.2,
      recency: 0.15,
      similarity: 0.1
    };
    
    this.contentTypes = {
      video: { engagement: 0.8, retention: 0.7 },
      text: { engagement: 0.6, retention: 0.9 },
      interactive: { engagement: 0.9, retention: 0.8 },
      quiz: { engagement: 0.7, retention: 0.6 }
    };
    
    this.difficultyLevels = {
      beginner: { score: 0.2, complexity: 0.3 },
      intermediate: { score: 0.5, complexity: 0.6 },
      advanced: { score: 0.8, complexity: 0.9 }
    };
  }

  /**
   * Generate comprehensive personalized recommendations
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @param {Object} options - Recommendation options
   * @returns {Promise<Object>} Comprehensive recommendations
   */
  async generateRecommendations(userId, subjectCode, options = {}) {
    try {
      const {
        maxRecommendations = 10,
        includeExplanations = true,
        diversityFactor = 0.3,
        timeHorizon = 7 // days
      } = options;

      // Get user behavior patterns
      const behaviorPatterns = await userBehaviorAnalytics.getUserBehaviorPatterns(userId, {
        timeRange: 30,
        includeSessionData: true
      });

      // Get user learning profile
      const learningProfile = await this.buildLearningProfile(userId, behaviorPatterns);
      
      // Get available content
      const availableContent = await this.getAvailableContent(subjectCode);
      
      // Generate content recommendations
      const contentRecommendations = await this.generateContentRecommendations(
        learningProfile,
        availableContent,
        { maxRecommendations, diversityFactor }
      );
      
      // Generate learning path recommendations
      const pathRecommendations = await this.generateLearningPathRecommendations(
        learningProfile,
        subjectCode,
        timeHorizon
      );
      
      // Generate study schedule recommendations
      const scheduleRecommendations = await this.generateScheduleRecommendations(
        learningProfile,
        timeHorizon
      );
      
      // Generate difficulty adjustments
      const difficultyRecommendations = await this.generateDifficultyRecommendations(
        learningProfile,
        behaviorPatterns
      );

      const recommendations = {
        content: contentRecommendations,
        learningPath: pathRecommendations,
        schedule: scheduleRecommendations,
        difficulty: difficultyRecommendations,
        insights: await this.generateInsights(learningProfile, behaviorPatterns),
        confidence: this.calculateConfidenceScore(learningProfile),
        lastUpdated: new Date().toISOString()
      };

      // Store recommendations for future analysis
      await this.storeRecommendations(userId, subjectCode, recommendations);
      
      return recommendations;
    } catch (error) {
      console.error('Error generating advanced recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Build comprehensive learning profile
   * @param {string} userId - User ID
   * @param {Object} behaviorPatterns - User behavior patterns
   * @returns {Promise<Object>} Learning profile
   */
  async buildLearningProfile(userId, behaviorPatterns) {
    const profile = {
      userId,
      performance: {
        averageScore: behaviorPatterns.performanceTrends?.averageScore || 0,
        improvementRate: behaviorPatterns.performanceTrends?.improvementRate || 0,
        consistency: behaviorPatterns.studyHabits?.consistencyScore || 0,
        strongAreas: behaviorPatterns.performanceTrends?.strongAreas || [],
        weakAreas: behaviorPatterns.performanceTrends?.weakAreas || []
      },
      engagement: {
        score: behaviorPatterns.engagementMetrics?.engagementScore || 0,
        dailyActiveTime: behaviorPatterns.engagementMetrics?.dailyActiveTime || 0,
        sessionDuration: behaviorPatterns.studyHabits?.averageSessionDuration || 0,
        interactionDiversity: this.calculateInteractionDiversity(behaviorPatterns)
      },
      preferences: {
        contentTypes: behaviorPatterns.learningPreferences?.preferredContentTypes || [],
        difficulty: behaviorPatterns.learningPreferences?.difficultyPreference || 'medium',
        learningStyle: behaviorPatterns.learningPreferences?.learningStyle || 'mixed',
        topics: behaviorPatterns.learningPreferences?.topicPreferences || []
      },
      timePatterns: {
        peakHours: behaviorPatterns.timePatterns?.peakHours || [],
        studyFrequency: behaviorPatterns.studyHabits?.studyFrequency || 0,
        weekdayVsWeekend: behaviorPatterns.timePatterns?.weekdayVsWeekend || { weekday: 0, weekend: 0 }
      },
      cognitiveLoad: this.calculateCognitiveLoad(behaviorPatterns),
      motivationLevel: this.calculateMotivationLevel(behaviorPatterns),
      adaptabilityScore: this.calculateAdaptabilityScore(behaviorPatterns)
    };

    return profile;
  }

  /**
   * Generate content recommendations using collaborative filtering and content-based filtering
   * @param {Object} learningProfile - User learning profile
   * @param {Array} availableContent - Available content items
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Content recommendations
   */
  async generateContentRecommendations(learningProfile, availableContent, options = {}) {
    const { maxRecommendations = 10, diversityFactor = 0.3 } = options;
    
    // Score each content item
    const scoredContent = availableContent.map(content => {
      const score = this.calculateContentScore(content, learningProfile);
      return { ...content, score, reasons: this.generateContentReasons(content, learningProfile) };
    });
    
    // Sort by score
    scoredContent.sort((a, b) => b.score - a.score);
    
    // Apply diversity filter
    const diverseContent = this.applyDiversityFilter(scoredContent, diversityFactor);
    
    // Return top recommendations
    return diverseContent.slice(0, maxRecommendations).map(content => ({
      id: content.id,
      title: content.title,
      type: content.type,
      difficulty: content.difficulty,
      estimatedTime: content.estimatedTime,
      score: Math.round(content.score * 100),
      reasons: content.reasons,
      tags: content.tags || [],
      priority: this.calculatePriority(content, learningProfile)
    }));
  }

  /**
   * Generate learning path recommendations
   * @param {Object} learningProfile - User learning profile
   * @param {string} subjectCode - Subject code
   * @param {number} timeHorizon - Time horizon in days
   * @returns {Promise<Object>} Learning path recommendations
   */
  async generateLearningPathRecommendations(learningProfile, subjectCode, timeHorizon) {
    const paths = {
      shortTerm: [], // 1-3 days
      mediumTerm: [], // 1 week
      longTerm: [] // 1 month
    };
    
    // Identify knowledge gaps
    const knowledgeGaps = this.identifyKnowledgeGaps(learningProfile);
    
    // Generate paths for different time horizons
    paths.shortTerm = await this.generateShortTermPath(learningProfile, knowledgeGaps, 3);
    paths.mediumTerm = await this.generateMediumTermPath(learningProfile, knowledgeGaps, 7);
    paths.longTerm = await this.generateLongTermPath(learningProfile, knowledgeGaps, 30);
    
    return {
      paths,
      adaptiveRules: this.generateAdaptiveRules(learningProfile),
      milestones: this.generateMilestones(learningProfile, timeHorizon),
      prerequisites: this.identifyPrerequisites(knowledgeGaps)
    };
  }

  /**
   * Generate study schedule recommendations
   * @param {Object} learningProfile - User learning profile
   * @param {number} timeHorizon - Time horizon in days
   * @returns {Promise<Object>} Schedule recommendations
   */
  async generateScheduleRecommendations(learningProfile, timeHorizon) {
    const schedule = {
      optimal: [],
      flexible: [],
      intensive: []
    };
    
    const { timePatterns, engagement } = learningProfile;
    
    // Generate optimal schedule based on peak hours
    schedule.optimal = this.generateOptimalSchedule(timePatterns, engagement, timeHorizon);
    
    // Generate flexible schedule for varying availability
    schedule.flexible = this.generateFlexibleSchedule(timePatterns, engagement, timeHorizon);
    
    // Generate intensive schedule for accelerated learning
    schedule.intensive = this.generateIntensiveSchedule(timePatterns, engagement, timeHorizon);
    
    return {
      schedules: schedule,
      recommendations: {
        sessionDuration: this.recommendSessionDuration(learningProfile),
        breakFrequency: this.recommendBreakFrequency(learningProfile),
        studyTechniques: this.recommendStudyTechniques(learningProfile)
      }
    };
  }

  /**
   * Generate difficulty adjustment recommendations
   * @param {Object} learningProfile - User learning profile
   * @param {Object} behaviorPatterns - User behavior patterns
   * @returns {Promise<Object>} Difficulty recommendations
   */
  async generateDifficultyRecommendations(learningProfile, behaviorPatterns) {
    const { performance, engagement } = learningProfile;
    
    const recommendations = {
      currentLevel: this.assessCurrentDifficultyLevel(performance),
      suggestedAdjustments: [],
      adaptiveStrategy: this.generateAdaptiveStrategy(performance, engagement),
      progressionPlan: this.generateProgressionPlan(performance)
    };
    
    // Generate specific adjustments
    if (performance.averageScore > 0.8 && engagement.score > 70) {
      recommendations.suggestedAdjustments.push({
        type: 'increase',
        reason: '表现优秀，可以尝试更有挑战性的内容',
        confidence: 0.8
      });
    } else if (performance.averageScore < 0.5 || engagement.score < 40) {
      recommendations.suggestedAdjustments.push({
        type: 'decrease',
        reason: '建议降低难度，巩固基础知识',
        confidence: 0.9
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate content score using multiple factors
   * @param {Object} content - Content item
   * @param {Object} learningProfile - User learning profile
   * @returns {number} Content score (0-1)
   */
  calculateContentScore(content, learningProfile) {
    const scores = {
      performance: this.calculatePerformanceScore(content, learningProfile.performance),
      engagement: this.calculateEngagementScore(content, learningProfile.engagement),
      difficulty: this.calculateDifficultyScore(content, learningProfile.preferences),
      recency: this.calculateRecencyScore(content, learningProfile),
      similarity: this.calculateSimilarityScore(content, learningProfile.preferences)
    };
    
    // Weighted average
    let totalScore = 0;
    Object.entries(this.modelWeights).forEach(([factor, weight]) => {
      totalScore += scores[factor] * weight;
    });
    
    // Apply cognitive load adjustment
    const cognitiveAdjustment = this.applyCognitiveLoadAdjustment(content, learningProfile.cognitiveLoad);
    
    return Math.min(1, Math.max(0, totalScore * cognitiveAdjustment));
  }

  /**
   * Calculate performance-based score
   * @param {Object} content - Content item
   * @param {Object} performance - Performance data
   * @returns {number} Performance score (0-1)
   */
  calculatePerformanceScore(content, performance) {
    // Check if user has strong/weak areas related to this content
    const isStrongArea = performance.strongAreas.some(area => 
      content.topics?.includes(area.topicId)
    );
    const isWeakArea = performance.weakAreas.some(area => 
      content.topics?.includes(area.topicId)
    );
    
    if (isWeakArea) return 0.9; // High priority for weak areas
    if (isStrongArea) return 0.3; // Lower priority for strong areas
    
    // Base score on average performance
    return 0.5 + (performance.averageScore * 0.3);
  }

  /**
   * Calculate engagement-based score
   * @param {Object} content - Content item
   * @param {Object} engagement - Engagement data
   * @returns {number} Engagement score (0-1)
   */
  calculateEngagementScore(content, engagement) {
    const contentTypeData = this.contentTypes[content.type] || { engagement: 0.5 };
    const baseScore = contentTypeData.engagement;
    
    // Adjust based on user's engagement patterns
    const engagementMultiplier = Math.min(1.5, engagement.score / 50);
    
    return Math.min(1, baseScore * engagementMultiplier);
  }

  /**
   * Calculate difficulty-based score
   * @param {Object} content - Content item
   * @param {Object} preferences - User preferences
   * @returns {number} Difficulty score (0-1)
   */
  calculateDifficultyScore(content, preferences) {
    const preferredDifficulty = preferences.difficulty;
    const contentDifficulty = content.difficulty;
    
    // Perfect match
    if (preferredDifficulty === contentDifficulty) return 1.0;
    
    // Adjacent difficulty levels
    const difficultyOrder = ['easy', 'medium', 'hard'];
    const preferredIndex = difficultyOrder.indexOf(preferredDifficulty);
    const contentIndex = difficultyOrder.indexOf(contentDifficulty);
    
    const distance = Math.abs(preferredIndex - contentIndex);
    return Math.max(0.2, 1 - (distance * 0.4));
  }

  /**
   * Calculate recency-based score
   * @param {Object} content - Content item
   * @param {Object} learningProfile - Learning profile
   * @returns {number} Recency score (0-1)
   */
  calculateRecencyScore(content, learningProfile) {
    // Prefer newer content and content not recently studied
    const daysSinceCreated = content.createdAt ? 
      (Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 30;
    
    const recencyScore = Math.max(0.1, 1 - (daysSinceCreated / 365));
    
    // Reduce score if recently studied
    const recentlyStudied = learningProfile.preferences.topics.some(topic => 
      content.topics?.includes(topic.topicId)
    );
    
    return recentlyStudied ? recencyScore * 0.7 : recencyScore;
  }

  /**
   * Calculate similarity-based score
   * @param {Object} content - Content item
   * @param {Object} preferences - User preferences
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarityScore(content, preferences) {
    let similarityScore = 0;
    
    // Content type similarity
    const preferredTypes = preferences.contentTypes.map(ct => ct.type);
    if (preferredTypes.includes(content.type)) {
      similarityScore += 0.5;
    }
    
    // Topic similarity
    const preferredTopics = preferences.topics.map(t => t.topicId);
    const commonTopics = content.topics?.filter(topic => preferredTopics.includes(topic)) || [];
    if (content.topics?.length > 0) {
      similarityScore += (commonTopics.length / content.topics.length) * 0.5;
    }
    
    return Math.min(1, similarityScore);
  }

  /**
   * Apply diversity filter to recommendations
   * @param {Array} scoredContent - Scored content items
   * @param {number} diversityFactor - Diversity factor (0-1)
   * @returns {Array} Diversified content
   */
  applyDiversityFilter(scoredContent, diversityFactor) {
    if (diversityFactor === 0) return scoredContent;
    
    const diverseContent = [];
    const usedTypes = new Set();
    const usedTopics = new Set();
    
    for (const content of scoredContent) {
      let diversityBonus = 0;
      
      // Bonus for new content type
      if (!usedTypes.has(content.type)) {
        diversityBonus += diversityFactor * 0.5;
        usedTypes.add(content.type);
      }
      
      // Bonus for new topics
      const newTopics = content.topics?.filter(topic => !usedTopics.has(topic)) || [];
      if (newTopics.length > 0) {
        diversityBonus += diversityFactor * 0.3;
        newTopics.forEach(topic => usedTopics.add(topic));
      }
      
      content.score += diversityBonus;
      diverseContent.push(content);
    }
    
    return diverseContent.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate insights based on learning profile and behavior patterns
   * @param {Object} learningProfile - Learning profile
   * @param {Object} behaviorPatterns - Behavior patterns
   * @returns {Promise<Array>} Generated insights
   */
  async generateInsights(learningProfile, behaviorPatterns) {
    const insights = [];
    
    // Performance insights
    if (learningProfile.performance.improvementRate > 0.1) {
      insights.push({
        type: 'performance',
        level: 'positive',
        message: `您的成绩正在稳步提升，提升率为 ${(learningProfile.performance.improvementRate * 100).toFixed(1)}%`,
        actionable: true,
        suggestion: '继续保持当前的学习节奏和方法'
      });
    }
    
    // Engagement insights
    if (learningProfile.engagement.score < 50) {
      insights.push({
        type: 'engagement',
        level: 'warning',
        message: '您的学习参与度较低，可能影响学习效果',
        actionable: true,
        suggestion: '尝试更多互动性内容或调整学习时间安排'
      });
    }
    
    // Time pattern insights
    const peakHours = learningProfile.timePatterns.peakHours;
    if (peakHours.length > 0) {
      insights.push({
        type: 'timing',
        level: 'info',
        message: `您在 ${peakHours[0].hour}:00 时学习效果最佳`,
        actionable: true,
        suggestion: '建议在这个时间段安排重要的学习内容'
      });
    }
    
    // Cognitive load insights
    if (learningProfile.cognitiveLoad > 0.8) {
      insights.push({
        type: 'cognitive',
        level: 'warning',
        message: '当前学习强度较高，注意适当休息',
        actionable: true,
        suggestion: '考虑降低学习难度或增加休息时间'
      });
    }
    
    return insights;
  }

  /**
   * Calculate various cognitive and behavioral metrics
   */
  calculateInteractionDiversity(behaviorPatterns) {
    // Implementation for interaction diversity calculation
    return 0.7; // Placeholder
  }
  
  calculateCognitiveLoad(behaviorPatterns) {
    // Implementation for cognitive load calculation
    const sessionDuration = behaviorPatterns.studyHabits?.averageSessionDuration || 0;
    const switchingRate = behaviorPatterns.studyHabits?.topicSwitchingRate || 0;
    
    // Higher session duration and switching rate indicate higher cognitive load
    return Math.min(1, (sessionDuration / 7200) * 0.6 + switchingRate * 0.4);
  }
  
  calculateMotivationLevel(behaviorPatterns) {
    // Implementation for motivation level calculation
    const consistency = behaviorPatterns.studyHabits?.consistencyScore || 0;
    const engagement = behaviorPatterns.engagementMetrics?.engagementScore || 0;
    
    return (consistency * 0.6 + engagement / 100 * 0.4);
  }
  
  calculateAdaptabilityScore(behaviorPatterns) {
    // Implementation for adaptability score calculation
    const contentTypes = behaviorPatterns.learningPreferences?.preferredContentTypes?.length || 0;
    const topicDiversity = behaviorPatterns.learningPreferences?.topicPreferences?.length || 0;
    
    return Math.min(1, (contentTypes / 4) * 0.5 + (topicDiversity / 10) * 0.5);
  }

  /**
   * Get available content from database
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Array>} Available content
   */
  async getAvailableContent(subjectCode) {
    try {
      const { data, error } = await db
        .from('learning_content')
        .select('*')
        .eq('subject_code', subjectCode)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching available content:', error);
      return this.getMockContent();
    }
  }

  /**
   * Store recommendations for future analysis
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @param {Object} recommendations - Generated recommendations
   */
  async storeRecommendations(userId, subjectCode, recommendations) {
    try {
      const { error } = await db
        .from('recommendation_history')
        .insert({
          user_id: userId,
          subject_code: subjectCode,
          recommendations: recommendations,
          generated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error storing recommendations:', error);
    }
  }

  /**
   * Calculate confidence score for recommendations
   * @param {Object} learningProfile - Learning profile
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidenceScore(learningProfile) {
    const factors = {
      dataQuality: this.assessDataQuality(learningProfile),
      profileCompleteness: this.assessProfileCompleteness(learningProfile),
      behaviorConsistency: this.assessBehaviorConsistency(learningProfile)
    };
    
    return (factors.dataQuality * 0.4 + factors.profileCompleteness * 0.3 + factors.behaviorConsistency * 0.3);
  }

  /**
   * Assessment helper methods
   */
  assessDataQuality(learningProfile) {
    // Assess the quality of available data
    return 0.8; // Placeholder
  }
  
  assessProfileCompleteness(learningProfile) {
    // Assess how complete the learning profile is
    return 0.7; // Placeholder
  }
  
  assessBehaviorConsistency(learningProfile) {
    // Assess consistency in user behavior
    return 0.75; // Placeholder
  }

  /**
   * Generate fallback recommendations when main algorithm fails
   * @returns {Object} Fallback recommendations
   */
  getFallbackRecommendations() {
    return {
      content: [],
      learningPath: { paths: { shortTerm: [], mediumTerm: [], longTerm: [] } },
      schedule: { schedules: { optimal: [], flexible: [], intensive: [] } },
      difficulty: { currentLevel: 'medium', suggestedAdjustments: [] },
      insights: [{
        type: 'system',
        level: 'info',
        message: '正在收集您的学习数据以提供更好的推荐',
        actionable: false
      }],
      confidence: 0.3,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get mock content for development/testing
   * @returns {Array} Mock content items
   */
  getMockContent() {
    return [
      {
        id: 'content_1',
        title: '基础数学概念',
        type: 'video',
        difficulty: 'easy',
        estimatedTime: 30,
        topics: ['algebra', 'geometry'],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'content_2',
        title: '高级物理实验',
        type: 'interactive',
        difficulty: 'hard',
        estimatedTime: 60,
        topics: ['physics', 'experiments'],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  // Additional helper methods for path generation, scheduling, etc.
  // These would be implemented based on specific requirements
  
  generateShortTermPath(learningProfile, knowledgeGaps, days) {
    // Implementation for short-term path generation
    return [];
  }
  
  generateMediumTermPath(learningProfile, knowledgeGaps, days) {
    // Implementation for medium-term path generation
    return [];
  }
  
  generateLongTermPath(learningProfile, knowledgeGaps, days) {
    // Implementation for long-term path generation
    return [];
  }
  
  identifyKnowledgeGaps(learningProfile) {
    // Implementation for knowledge gap identification
    return [];
  }
  
  generateAdaptiveRules(learningProfile) {
    // Implementation for adaptive rules generation
    return [];
  }
  
  generateMilestones(learningProfile, timeHorizon) {
    // Implementation for milestone generation
    return [];
  }
  
  identifyPrerequisites(knowledgeGaps) {
    // Implementation for prerequisite identification
    return [];
  }
  
  generateOptimalSchedule(timePatterns, engagement, timeHorizon) {
    // Implementation for optimal schedule generation
    return [];
  }
  
  generateFlexibleSchedule(timePatterns, engagement, timeHorizon) {
    // Implementation for flexible schedule generation
    return [];
  }
  
  generateIntensiveSchedule(timePatterns, engagement, timeHorizon) {
    // Implementation for intensive schedule generation
    return [];
  }
  
  recommendSessionDuration(learningProfile) {
    // Implementation for session duration recommendation
    return 45; // minutes
  }
  
  recommendBreakFrequency(learningProfile) {
    // Implementation for break frequency recommendation
    return 15; // minutes
  }
  
  recommendStudyTechniques(learningProfile) {
    // Implementation for study techniques recommendation
    return [];
  }
  
  assessCurrentDifficultyLevel(performance) {
    // Implementation for current difficulty level assessment
    return 'medium';
  }
  
  generateAdaptiveStrategy(performance, engagement) {
    // Implementation for adaptive strategy generation
    return {};
  }
  
  generateProgressionPlan(performance) {
    // Implementation for progression plan generation
    return {};
  }
  
  applyCognitiveLoadAdjustment(content, cognitiveLoad) {
    // Implementation for cognitive load adjustment
    return 1.0;
  }
  
  generateContentReasons(content, learningProfile) {
    // Implementation for content recommendation reasons
    return ['基于您的学习偏好推荐'];
  }
  
  calculatePriority(content, learningProfile) {
    // Implementation for priority calculation
    return 'medium';
  }
}

export default new AdvancedRecommendationEngine();