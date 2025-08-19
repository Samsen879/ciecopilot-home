/**
 * User Behavior Analytics Service
 * Tracks and analyzes user learning behavior patterns for personalized recommendations
 */

import { db } from '../utils/supabase';

class UserBehaviorAnalytics {
  constructor() {
    this.sessionData = new Map();
    this.behaviorQueue = [];
    this.flushInterval = 30000; // 30 seconds
    this.startPeriodicFlush();
  }

  /**
   * Track user interaction with content
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {Object} context - Action context
   */
  trackInteraction(userId, action, context = {}) {
    const interaction = {
      userId,
      action,
      context,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(userId)
    };

    this.behaviorQueue.push(interaction);
    this.updateSessionData(userId, interaction);

    // Immediate flush for critical actions
    if (this.isCriticalAction(action)) {
      this.flushBehaviorData();
    }
  }

  /**
   * Track topic view
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @param {Object} metadata - Additional metadata
   */
  trackTopicView(userId, topicId, metadata = {}) {
    this.trackInteraction(userId, 'topic_view', {
      topicId,
      ...metadata,
      viewStartTime: Date.now()
    });
  }

  /**
   * Track topic completion
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @param {number} timeSpent - Time spent in seconds
   * @param {number} completionPercentage - Completion percentage
   */
  trackTopicCompletion(userId, topicId, timeSpent, completionPercentage) {
    this.trackInteraction(userId, 'topic_completion', {
      topicId,
      timeSpent,
      completionPercentage,
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Track quiz attempt
   * @param {string} userId - User ID
   * @param {string} quizId - Quiz ID
   * @param {Object} results - Quiz results
   */
  trackQuizAttempt(userId, quizId, results) {
    this.trackInteraction(userId, 'quiz_attempt', {
      quizId,
      score: results.score,
      timeSpent: results.timeSpent,
      correctAnswers: results.correctAnswers,
      totalQuestions: results.totalQuestions,
      difficulty: results.difficulty,
      topicId: results.topicId
    });
  }

  /**
   * Track search behavior
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Array} results - Search results
   * @param {string} selectedResult - Selected result ID
   */
  trackSearch(userId, query, results = [], selectedResult = null) {
    this.trackInteraction(userId, 'search', {
      query,
      resultCount: results.length,
      selectedResult,
      searchTimestamp: new Date().toISOString()
    });
  }

  /**
   * Track recommendation interaction
   * @param {string} userId - User ID
   * @param {string} recommendationId - Recommendation ID
   * @param {string} action - Action taken (view, click, dismiss)
   * @param {Object} metadata - Additional metadata
   */
  trackRecommendationInteraction(userId, recommendationId, action, metadata = {}) {
    this.trackInteraction(userId, 'recommendation_interaction', {
      recommendationId,
      interactionType: action,
      ...metadata
    });
  }

  /**
   * Track study session
   * @param {string} userId - User ID
   * @param {string} sessionType - Type of study session
   * @param {number} duration - Session duration in seconds
   * @param {Array} topicsStudied - Topics studied in session
   */
  trackStudySession(userId, sessionType, duration, topicsStudied = []) {
    this.trackInteraction(userId, 'study_session', {
      sessionType,
      duration,
      topicsStudied,
      sessionEnd: new Date().toISOString()
    });
  }

  /**
   * Get user behavior patterns
   * @param {string} userId - User ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Behavior patterns
   */
  async getUserBehaviorPatterns(userId, options = {}) {
    try {
      const {
        timeRange = 30, // days
        includeSessionData = true,
        includePreferences = true
      } = options;

      const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString();

      // Get behavior data from database
      const { data: behaviorData, error } = await db
        .from('user_behavior_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const patterns = {
        studyHabits: this.analyzeStudyHabits(behaviorData),
        learningPreferences: this.analyzeLearningPreferences(behaviorData),
        performanceTrends: this.analyzePerformanceTrends(behaviorData),
        engagementMetrics: this.analyzeEngagementMetrics(behaviorData),
        timePatterns: this.analyzeTimePatterns(behaviorData)
      };

      if (includeSessionData) {
        patterns.currentSession = this.sessionData.get(userId) || {};
      }

      return patterns;
    } catch (error) {
      console.error('Error getting user behavior patterns:', error);
      return this.getDefaultPatterns();
    }
  }

  /**
   * Analyze study habits from behavior data
   * @param {Array} behaviorData - User behavior data
   * @returns {Object} Study habits analysis
   */
  analyzeStudyHabits(behaviorData) {
    const studySessions = behaviorData.filter(item => item.action === 'study_session');
    const topicViews = behaviorData.filter(item => item.action === 'topic_view');
    
    const habits = {
      averageSessionDuration: 0,
      preferredStudyTimes: [],
      studyFrequency: 0,
      topicSwitchingRate: 0,
      consistencyScore: 0
    };

    if (studySessions.length > 0) {
      // Calculate average session duration
      const totalDuration = studySessions.reduce((sum, session) => 
        sum + (session.context?.duration || 0), 0
      );
      habits.averageSessionDuration = Math.round(totalDuration / studySessions.length);

      // Analyze preferred study times
      const hourCounts = {};
      studySessions.forEach(session => {
        const hour = new Date(session.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      habits.preferredStudyTimes = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour, count]) => ({ hour: parseInt(hour), frequency: count }));

      // Calculate study frequency (sessions per week)
      const daysSinceFirst = (Date.now() - new Date(studySessions[studySessions.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24);
      habits.studyFrequency = Math.round((studySessions.length / daysSinceFirst) * 7 * 10) / 10;
    }

    // Calculate topic switching rate
    if (topicViews.length > 1) {
      let switches = 0;
      for (let i = 1; i < topicViews.length; i++) {
        if (topicViews[i].context?.topicId !== topicViews[i-1].context?.topicId) {
          switches++;
        }
      }
      habits.topicSwitchingRate = Math.round((switches / (topicViews.length - 1)) * 100) / 100;
    }

    // Calculate consistency score (0-1)
    if (studySessions.length >= 7) {
      const dailyStudy = {};
      studySessions.forEach(session => {
        const date = new Date(session.timestamp).toDateString();
        dailyStudy[date] = true;
      });
      
      const studyDays = Object.keys(dailyStudy).length;
      const totalDays = Math.min(30, daysSinceFirst || 30);
      habits.consistencyScore = Math.round((studyDays / totalDays) * 100) / 100;
    }

    return habits;
  }

  /**
   * Analyze learning preferences from behavior data
   * @param {Array} behaviorData - User behavior data
   * @returns {Object} Learning preferences analysis
   */
  analyzeLearningPreferences(behaviorData) {
    const preferences = {
      preferredContentTypes: [],
      difficultyPreference: 'medium',
      learningStyle: 'mixed',
      topicPreferences: [],
      interactionPatterns: {}
    };

    // Analyze content type preferences
    const contentInteractions = {};
    behaviorData.forEach(item => {
      if (item.context?.contentType) {
        const type = item.context.contentType;
        contentInteractions[type] = (contentInteractions[type] || 0) + 1;
      }
    });

    preferences.preferredContentTypes = Object.entries(contentInteractions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, frequency: count }));

    // Analyze difficulty preference
    const quizAttempts = behaviorData.filter(item => item.action === 'quiz_attempt');
    if (quizAttempts.length > 0) {
      const difficultyScores = { easy: [], medium: [], hard: [] };
      
      quizAttempts.forEach(attempt => {
        const difficulty = attempt.context?.difficulty || 'medium';
        const score = attempt.context?.score || 0;
        if (difficultyScores[difficulty]) {
          difficultyScores[difficulty].push(score);
        }
      });

      // Find difficulty with best performance
      let bestDifficulty = 'medium';
      let bestScore = 0;
      
      Object.entries(difficultyScores).forEach(([difficulty, scores]) => {
        if (scores.length > 0) {
          const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          if (avgScore > bestScore) {
            bestScore = avgScore;
            bestDifficulty = difficulty;
          }
        }
      });
      
      preferences.difficultyPreference = bestDifficulty;
    }

    // Analyze topic preferences
    const topicInteractions = {};
    behaviorData.forEach(item => {
      if (item.context?.topicId) {
        const topicId = item.context.topicId;
        topicInteractions[topicId] = (topicInteractions[topicId] || 0) + 1;
      }
    });

    preferences.topicPreferences = Object.entries(topicInteractions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topicId, frequency]) => ({ topicId, frequency }));

    return preferences;
  }

  /**
   * Analyze performance trends from behavior data
   * @param {Array} behaviorData - User behavior data
   * @returns {Object} Performance trends analysis
   */
  analyzePerformanceTrends(behaviorData) {
    const quizAttempts = behaviorData.filter(item => item.action === 'quiz_attempt');
    
    const trends = {
      overallTrend: 'stable',
      averageScore: 0,
      improvementRate: 0,
      strongAreas: [],
      weakAreas: [],
      recentPerformance: []
    };

    if (quizAttempts.length === 0) return trends;

    // Calculate average score
    const scores = quizAttempts.map(attempt => attempt.context?.score || 0);
    trends.averageScore = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;

    // Analyze trend
    if (scores.length >= 5) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
      
      const improvement = secondAvg - firstAvg;
      trends.improvementRate = Math.round(improvement * 100) / 100;
      
      if (improvement > 0.1) trends.overallTrend = 'improving';
      else if (improvement < -0.1) trends.overallTrend = 'declining';
      else trends.overallTrend = 'stable';
    }

    // Analyze performance by topic
    const topicPerformance = {};
    quizAttempts.forEach(attempt => {
      const topicId = attempt.context?.topicId;
      const score = attempt.context?.score || 0;
      
      if (topicId) {
        if (!topicPerformance[topicId]) {
          topicPerformance[topicId] = [];
        }
        topicPerformance[topicId].push(score);
      }
    });

    // Identify strong and weak areas
    Object.entries(topicPerformance).forEach(([topicId, scores]) => {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      if (avgScore >= 0.8) {
        trends.strongAreas.push({ topicId, averageScore: avgScore, attempts: scores.length });
      } else if (avgScore <= 0.5) {
        trends.weakAreas.push({ topicId, averageScore: avgScore, attempts: scores.length });
      }
    });

    // Recent performance (last 10 attempts)
    trends.recentPerformance = quizAttempts
      .slice(0, 10)
      .map(attempt => ({
        score: attempt.context?.score || 0,
        topicId: attempt.context?.topicId,
        timestamp: attempt.timestamp
      }));

    return trends;
  }

  /**
   * Analyze engagement metrics from behavior data
   * @param {Array} behaviorData - User behavior data
   * @returns {Object} Engagement metrics analysis
   */
  analyzeEngagementMetrics(behaviorData) {
    const metrics = {
      totalInteractions: behaviorData.length,
      dailyActiveTime: 0,
      engagementScore: 0,
      dropoffPoints: [],
      mostEngagingContent: []
    };

    // Calculate daily active time
    const studySessions = behaviorData.filter(item => item.action === 'study_session');
    if (studySessions.length > 0) {
      const totalTime = studySessions.reduce((sum, session) => 
        sum + (session.context?.duration || 0), 0
      );
      const uniqueDays = new Set(studySessions.map(session => 
        new Date(session.timestamp).toDateString()
      )).size;
      
      metrics.dailyActiveTime = Math.round((totalTime / uniqueDays) / 60); // minutes
    }

    // Calculate engagement score (0-100)
    const factors = {
      frequency: Math.min(behaviorData.length / 30, 1) * 25, // Max 25 points
      consistency: this.calculateConsistencyScore(behaviorData) * 25, // Max 25 points
      completion: this.calculateCompletionRate(behaviorData) * 25, // Max 25 points
      interaction: this.calculateInteractionDiversity(behaviorData) * 25 // Max 25 points
    };
    
    metrics.engagementScore = Math.round(Object.values(factors).reduce((sum, score) => sum + score, 0));

    return metrics;
  }

  /**
   * Analyze time patterns from behavior data
   * @param {Array} behaviorData - User behavior data
   * @returns {Object} Time patterns analysis
   */
  analyzeTimePatterns(behaviorData) {
    const patterns = {
      peakHours: [],
      weekdayVsWeekend: { weekday: 0, weekend: 0 },
      sessionLengthDistribution: {},
      timeZonePattern: null
    };

    // Analyze peak hours
    const hourCounts = {};
    behaviorData.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    patterns.peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), activity: count }));

    // Analyze weekday vs weekend
    behaviorData.forEach(item => {
      const date = new Date(item.timestamp);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        patterns.weekdayVsWeekend.weekend++;
      } else {
        patterns.weekdayVsWeekend.weekday++;
      }
    });

    return patterns;
  }

  /**
   * Calculate consistency score
   * @param {Array} behaviorData - User behavior data
   * @returns {number} Consistency score (0-1)
   */
  calculateConsistencyScore(behaviorData) {
    if (behaviorData.length === 0) return 0;
    
    const dailyActivity = {};
    behaviorData.forEach(item => {
      const date = new Date(item.timestamp).toDateString();
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });
    
    const activeDays = Object.keys(dailyActivity).length;
    const totalDays = Math.min(30, Math.ceil((Date.now() - new Date(behaviorData[behaviorData.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24)));
    
    return activeDays / totalDays;
  }

  /**
   * Calculate completion rate
   * @param {Array} behaviorData - User behavior data
   * @returns {number} Completion rate (0-1)
   */
  calculateCompletionRate(behaviorData) {
    const completions = behaviorData.filter(item => 
      item.action === 'topic_completion' || 
      (item.action === 'quiz_attempt' && (item.context?.score || 0) >= 0.7)
    );
    
    const attempts = behaviorData.filter(item => 
      item.action === 'topic_view' || item.action === 'quiz_attempt'
    );
    
    return attempts.length > 0 ? completions.length / attempts.length : 0;
  }

  /**
   * Calculate interaction diversity
   * @param {Array} behaviorData - User behavior data
   * @returns {number} Interaction diversity score (0-1)
   */
  calculateInteractionDiversity(behaviorData) {
    const actionTypes = new Set(behaviorData.map(item => item.action));
    const maxTypes = 8; // Maximum expected action types
    
    return Math.min(actionTypes.size / maxTypes, 1);
  }

  /**
   * Get session ID for user
   * @param {string} userId - User ID
   * @returns {string} Session ID
   */
  getSessionId(userId) {
    const sessionKey = `session_${userId}`;
    if (!this.sessionData.has(sessionKey)) {
      this.sessionData.set(sessionKey, {
        id: `${userId}_${Date.now()}`,
        startTime: Date.now(),
        interactions: 0
      });
    }
    return this.sessionData.get(sessionKey).id;
  }

  /**
   * Update session data
   * @param {string} userId - User ID
   * @param {Object} interaction - Interaction data
   */
  updateSessionData(userId, interaction) {
    const sessionKey = `session_${userId}`;
    const session = this.sessionData.get(sessionKey);
    
    if (session) {
      session.interactions++;
      session.lastActivity = Date.now();
      session.actions = session.actions || [];
      session.actions.push({
        action: interaction.action,
        timestamp: interaction.timestamp
      });
    }
  }

  /**
   * Check if action is critical and requires immediate flush
   * @param {string} action - Action type
   * @returns {boolean} Is critical action
   */
  isCriticalAction(action) {
    const criticalActions = [
      'quiz_attempt',
      'topic_completion',
      'study_session'
    ];
    return criticalActions.includes(action);
  }

  /**
   * Flush behavior data to database
   */
  async flushBehaviorData() {
    if (this.behaviorQueue.length === 0) return;

    try {
      const dataToFlush = [...this.behaviorQueue];
      this.behaviorQueue = [];

      // Transform data for database insertion
      const dbRecords = dataToFlush.map(item => ({
        user_id: item.userId,
        action: item.action,
        context: item.context,
        session_id: item.sessionId,
        created_at: item.timestamp
      }));

      const { error } = await db
        .from('user_behavior_analytics')
        .insert(dbRecords);

      if (error) {
        console.error('Error flushing behavior data:', error);
        // Re-add failed data to queue
        this.behaviorQueue.unshift(...dataToFlush);
      }
    } catch (error) {
      console.error('Error in flushBehaviorData:', error);
    }
  }

  /**
   * Start periodic flush of behavior data
   */
  startPeriodicFlush() {
    setInterval(() => {
      this.flushBehaviorData();
    }, this.flushInterval);
  }

  /**
   * Get default patterns for error cases
   * @returns {Object} Default behavior patterns
   */
  getDefaultPatterns() {
    return {
      studyHabits: {
        averageSessionDuration: 0,
        preferredStudyTimes: [],
        studyFrequency: 0,
        topicSwitchingRate: 0,
        consistencyScore: 0
      },
      learningPreferences: {
        preferredContentTypes: [],
        difficultyPreference: 'medium',
        learningStyle: 'mixed',
        topicPreferences: [],
        interactionPatterns: {}
      },
      performanceTrends: {
        overallTrend: 'stable',
        averageScore: 0,
        improvementRate: 0,
        strongAreas: [],
        weakAreas: [],
        recentPerformance: []
      },
      engagementMetrics: {
        totalInteractions: 0,
        dailyActiveTime: 0,
        engagementScore: 0,
        dropoffPoints: [],
        mostEngagingContent: []
      },
      timePatterns: {
        peakHours: [],
        weekdayVsWeekend: { weekday: 0, weekend: 0 },
        sessionLengthDistribution: {},
        timeZonePattern: null
      }
    };
  }
}

export default new UserBehaviorAnalytics();