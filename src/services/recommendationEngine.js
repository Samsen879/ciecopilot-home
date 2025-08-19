/**
 * Recommendation Engine
 * Advanced algorithms for generating personalized learning recommendations
 */

import { db } from '../utils/supabase';

class RecommendationEngine {
  constructor() {
    this.weights = {
      performance: 0.3,
      timeSpent: 0.2,
      difficulty: 0.25,
      recency: 0.15,
      completion: 0.1
    };
  }

  /**
   * Generate personalized topic recommendations based on user behavior
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Recommended topics
   */
  async generateTopicRecommendations(userId, subjectCode, options = {}) {
    try {
      const {
        limit = 10,
        includeCompleted = false,
        difficultyPreference = 'adaptive'
      } = options;

      // Get user's learning history
      const learningHistory = await this.getUserLearningHistory(userId, subjectCode);
      
      // Get user's performance data
      const performanceData = await this.getUserPerformanceData(userId, subjectCode);
      
      // Get available topics
      const availableTopics = await this.getAvailableTopics(subjectCode);
      
      // Calculate knowledge gaps
      const knowledgeGaps = this.identifyKnowledgeGaps(learningHistory, performanceData);
      
      // Score and rank topics
      const scoredTopics = this.scoreTopics(
        availableTopics,
        learningHistory,
        performanceData,
        knowledgeGaps,
        difficultyPreference
      );
      
      // Filter and sort recommendations
      let recommendations = scoredTopics
        .filter(topic => includeCompleted || !topic.completed)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // Add recommendation reasons
      recommendations = recommendations.map(topic => ({
        ...topic,
        reason: this.generateRecommendationReason(topic, knowledgeGaps, performanceData)
      }));
      
      return recommendations;
    } catch (error) {
      console.error('Error generating topic recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate practice problem recommendations
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Recommended practice problems
   */
  async generatePracticeRecommendations(userId, subjectCode, options = {}) {
    try {
      const {
        limit = 5,
        targetDifficulty = 'adaptive',
        focusAreas = []
      } = options;

      // Get user's recent performance
      const recentPerformance = await this.getRecentPerformance(userId, subjectCode);
      
      // Get weak areas
      const weakAreas = this.identifyWeakAreas(recentPerformance);
      
      // Get available practice problems
      const practiceProblems = await this.getAvailablePracticeProblems(subjectCode);
      
      // Score practice problems based on user needs
      const scoredProblems = this.scorePracticeProblems(
        practiceProblems,
        weakAreas,
        recentPerformance,
        targetDifficulty,
        focusAreas
      );
      
      return scoredProblems
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(problem => ({
          ...problem,
          reason: this.generatePracticeReason(problem, weakAreas)
        }));
    } catch (error) {
      console.error('Error generating practice recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate study material recommendations
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Recommended study materials
   */
  async generateMaterialRecommendations(userId, subjectCode, options = {}) {
    try {
      const {
        limit = 8,
        materialTypes = ['notes', 'videos', 'examples'],
        learningStyle = 'visual'
      } = options;

      // Get user's current topics
      const currentTopics = await this.getCurrentTopics(userId, subjectCode);
      
      // Get user's learning preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get available materials
      const materials = await this.getAvailableMaterials(subjectCode, materialTypes);
      
      // Score materials based on relevance and preferences
      const scoredMaterials = this.scoreMaterials(
        materials,
        currentTopics,
        preferences,
        learningStyle
      );
      
      return scoredMaterials
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error generating material recommendations:', error);
      throw error;
    }
  }

  /**
   * Get user's learning history
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Array>} Learning history
   */
  async getUserLearningHistory(userId, subjectCode) {
    try {
      const { data, error } = await db
        .from('user_progress')
        .select(`
          *,
          topics(id, title, difficulty, estimated_time)
        `)
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching learning history:', error);
      return [];
    }
  }

  /**
   * Get user's performance data
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Array>} Performance data
   */
  async getUserPerformanceData(userId, subjectCode) {
    try {
      const { data, error } = await db
        .from('quiz_attempts')
        .select(`
          *,
          quizzes(topic_id, difficulty)
        `)
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching performance data:', error);
      return [];
    }
  }

  /**
   * Get available topics for a subject
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Array>} Available topics
   */
  async getAvailableTopics(subjectCode) {
    try {
      const { data, error } = await db
        .from('topics')
        .select('*')
        .eq('subject_code', subjectCode)
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching available topics:', error);
      return [];
    }
  }

  /**
   * Identify knowledge gaps based on learning history and performance
   * @param {Array} learningHistory - User's learning history
   * @param {Array} performanceData - User's performance data
   * @returns {Object} Knowledge gaps analysis
   */
  identifyKnowledgeGaps(learningHistory, performanceData) {
    const gaps = {
      weakTopics: [],
      missingPrerequisites: [],
      lowPerformanceAreas: [],
      timeSpentAnalysis: {}
    };

    // Analyze performance by topic
    const topicPerformance = {};
    performanceData.forEach(attempt => {
      const topicId = attempt.quizzes?.topic_id;
      if (topicId) {
        if (!topicPerformance[topicId]) {
          topicPerformance[topicId] = {
            attempts: 0,
            totalScore: 0,
            averageScore: 0,
            timeSpent: 0
          };
        }
        topicPerformance[topicId].attempts++;
        topicPerformance[topicId].totalScore += attempt.score || 0;
        topicPerformance[topicId].timeSpent += attempt.time_spent || 0;
      }
    });

    // Calculate averages and identify weak areas
    Object.keys(topicPerformance).forEach(topicId => {
      const perf = topicPerformance[topicId];
      perf.averageScore = perf.totalScore / perf.attempts;
      
      if (perf.averageScore < 0.6) {
        gaps.weakTopics.push({
          topicId,
          averageScore: perf.averageScore,
          attempts: perf.attempts
        });
      }
      
      if (perf.averageScore < 0.4) {
        gaps.lowPerformanceAreas.push(topicId);
      }
    });

    // Analyze time spent patterns
    learningHistory.forEach(progress => {
      const topicId = progress.topic_id;
      gaps.timeSpentAnalysis[topicId] = {
        timeSpent: progress.time_spent || 0,
        completionRate: progress.completion_percentage || 0,
        lastAccessed: progress.updated_at
      };
    });

    return gaps;
  }

  /**
   * Score topics based on various factors
   * @param {Array} topics - Available topics
   * @param {Array} learningHistory - User's learning history
   * @param {Array} performanceData - User's performance data
   * @param {Object} knowledgeGaps - Identified knowledge gaps
   * @param {string} difficultyPreference - User's difficulty preference
   * @returns {Array} Scored topics
   */
  scoreTopics(topics, learningHistory, performanceData, knowledgeGaps, difficultyPreference) {
    return topics.map(topic => {
      let score = 0;
      const factors = {};

      // Performance factor
      const isWeakArea = knowledgeGaps.weakTopics.some(weak => weak.topicId === topic.id);
      if (isWeakArea) {
        factors.performance = 0.8;
        score += this.weights.performance * 0.8;
      } else {
        factors.performance = 0.3;
        score += this.weights.performance * 0.3;
      }

      // Time spent factor
      const timeAnalysis = knowledgeGaps.timeSpentAnalysis[topic.id];
      if (timeAnalysis) {
        const timeScore = Math.min(timeAnalysis.timeSpent / (topic.estimated_time || 60), 1);
        factors.timeSpent = 1 - timeScore; // Less time spent = higher score
        score += this.weights.timeSpent * factors.timeSpent;
      } else {
        factors.timeSpent = 1; // Not studied yet
        score += this.weights.timeSpent * 1;
      }

      // Difficulty factor
      const difficultyScore = this.calculateDifficultyScore(topic.difficulty, difficultyPreference);
      factors.difficulty = difficultyScore;
      score += this.weights.difficulty * difficultyScore;

      // Recency factor (how recently was this topic accessed)
      const recencyScore = this.calculateRecencyScore(timeAnalysis?.lastAccessed);
      factors.recency = recencyScore;
      score += this.weights.recency * recencyScore;

      // Completion factor
      const completionScore = timeAnalysis ? (1 - (timeAnalysis.completionRate / 100)) : 1;
      factors.completion = completionScore;
      score += this.weights.completion * completionScore;

      return {
        ...topic,
        score,
        factors,
        completed: timeAnalysis?.completionRate >= 100,
        progress: timeAnalysis?.completionRate || 0
      };
    });
  }

  /**
   * Calculate difficulty score based on user preference
   * @param {string} topicDifficulty - Topic difficulty level
   * @param {string} preference - User's difficulty preference
   * @returns {number} Difficulty score
   */
  calculateDifficultyScore(topicDifficulty, preference) {
    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    const topicLevel = difficultyMap[topicDifficulty] || 2;
    
    switch (preference) {
      case 'easy':
        return topicLevel === 1 ? 1 : (topicLevel === 2 ? 0.6 : 0.2);
      case 'medium':
        return topicLevel === 2 ? 1 : (topicLevel === 1 ? 0.7 : 0.7);
      case 'hard':
        return topicLevel === 3 ? 1 : (topicLevel === 2 ? 0.6 : 0.2);
      case 'adaptive':
      default:
        // Adaptive: prefer medium difficulty, but consider user's performance
        return topicLevel === 2 ? 1 : 0.6;
    }
  }

  /**
   * Calculate recency score
   * @param {string} lastAccessed - Last access timestamp
   * @returns {number} Recency score
   */
  calculateRecencyScore(lastAccessed) {
    if (!lastAccessed) return 1; // Never accessed
    
    const daysSinceAccess = (Date.now() - new Date(lastAccessed).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceAccess < 1) return 0.2; // Very recent
    if (daysSinceAccess < 3) return 0.4; // Recent
    if (daysSinceAccess < 7) return 0.6; // Somewhat recent
    if (daysSinceAccess < 14) return 0.8; // Not recent
    return 1; // Long time ago
  }

  /**
   * Generate recommendation reason
   * @param {Object} topic - Topic object
   * @param {Object} knowledgeGaps - Knowledge gaps
   * @param {Array} performanceData - Performance data
   * @returns {string} Recommendation reason
   */
  generateRecommendationReason(topic, knowledgeGaps, performanceData) {
    const isWeakArea = knowledgeGaps.weakTopics.some(weak => weak.topicId === topic.id);
    const timeAnalysis = knowledgeGaps.timeSpentAnalysis[topic.id];
    
    if (isWeakArea) {
      return '基于您的测试表现，建议加强这个知识点的学习';
    }
    
    if (!timeAnalysis) {
      return '这是一个新的学习内容，建议开始学习';
    }
    
    if (timeAnalysis.completionRate < 50) {
      return '您之前开始学习这个主题，建议继续完成';
    }
    
    if (topic.factors?.recency > 0.8) {
      return '很久没有复习这个主题了，建议重新学习巩固';
    }
    
    return '根据您的学习进度，推荐学习这个主题';
  }

  /**
   * Get recent performance data
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Array>} Recent performance data
   */
  async getRecentPerformance(userId, subjectCode) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await db
        .from('quiz_attempts')
        .select(`
          *,
          quizzes(topic_id, difficulty, question_count)
        `)
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent performance:', error);
      return [];
    }
  }

  /**
   * Identify weak areas from recent performance
   * @param {Array} recentPerformance - Recent performance data
   * @returns {Array} Weak areas
   */
  identifyWeakAreas(recentPerformance) {
    const topicScores = {};
    
    recentPerformance.forEach(attempt => {
      const topicId = attempt.quizzes?.topic_id;
      if (topicId) {
        if (!topicScores[topicId]) {
          topicScores[topicId] = {
            scores: [],
            averageScore: 0,
            attempts: 0
          };
        }
        topicScores[topicId].scores.push(attempt.score || 0);
        topicScores[topicId].attempts++;
      }
    });
    
    // Calculate averages and identify weak areas
    const weakAreas = [];
    Object.keys(topicScores).forEach(topicId => {
      const scores = topicScores[topicId].scores;
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      topicScores[topicId].averageScore = average;
      
      if (average < 0.6) {
        weakAreas.push({
          topicId,
          averageScore: average,
          attempts: scores.length,
          trend: this.calculateTrend(scores)
        });
      }
    });
    
    return weakAreas.sort((a, b) => a.averageScore - b.averageScore);
  }

  /**
   * Calculate performance trend
   * @param {Array} scores - Array of scores
   * @returns {string} Trend direction
   */
  calculateTrend(scores) {
    if (scores.length < 2) return 'stable';
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Get available practice problems
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Array>} Available practice problems
   */
  async getAvailablePracticeProblems(subjectCode) {
    // This would typically fetch from a practice problems table
    // For now, return mock data
    return [
      {
        id: 'practice_1',
        title: '微积分基础练习',
        description: '包含导数和积分的基础题目',
        difficulty: 'easy',
        questionCount: 10,
        estimatedTime: 30,
        topicIds: ['calculus_basics'],
        type: 'mixed'
      },
      {
        id: 'practice_2',
        title: '复数运算强化',
        description: '复数的四则运算和几何表示',
        difficulty: 'medium',
        questionCount: 15,
        estimatedTime: 45,
        topicIds: ['complex_numbers'],
        type: 'calculation'
      },
      {
        id: 'practice_3',
        title: '三角函数综合题',
        description: '三角恒等式和三角方程',
        difficulty: 'hard',
        questionCount: 8,
        estimatedTime: 60,
        topicIds: ['trigonometry'],
        type: 'problem_solving'
      }
    ];
  }

  /**
   * Score practice problems based on user needs
   * @param {Array} problems - Available practice problems
   * @param {Array} weakAreas - User's weak areas
   * @param {Array} recentPerformance - Recent performance data
   * @param {string} targetDifficulty - Target difficulty
   * @param {Array} focusAreas - Focus areas
   * @returns {Array} Scored practice problems
   */
  scorePracticeProblems(problems, weakAreas, recentPerformance, targetDifficulty, focusAreas) {
    return problems.map(problem => {
      let score = 0;
      
      // Check if problem addresses weak areas
      const addressesWeakArea = weakAreas.some(weak => 
        problem.topicIds.includes(weak.topicId)
      );
      if (addressesWeakArea) score += 0.4;
      
      // Difficulty matching
      const difficultyScore = this.calculateDifficultyScore(problem.difficulty, targetDifficulty);
      score += 0.3 * difficultyScore;
      
      // Focus areas matching
      if (focusAreas.length > 0) {
        const matchesFocus = problem.topicIds.some(topicId => focusAreas.includes(topicId));
        if (matchesFocus) score += 0.2;
      } else {
        score += 0.1; // Default bonus if no specific focus
      }
      
      // Time appropriateness (prefer 30-60 minute sessions)
      const timeScore = problem.estimatedTime >= 30 && problem.estimatedTime <= 60 ? 0.1 : 0.05;
      score += timeScore;
      
      return {
        ...problem,
        score
      };
    });
  }

  /**
   * Generate practice recommendation reason
   * @param {Object} problem - Practice problem
   * @param {Array} weakAreas - Weak areas
   * @returns {string} Recommendation reason
   */
  generatePracticeReason(problem, weakAreas) {
    const addressesWeakArea = weakAreas.some(weak => 
      problem.topicIds.includes(weak.topicId)
    );
    
    if (addressesWeakArea) {
      return '针对您的薄弱环节设计的练习题';
    }
    
    switch (problem.difficulty) {
      case 'easy':
        return '基础练习，帮助巩固核心概念';
      case 'medium':
        return '中等难度，提升解题技巧';
      case 'hard':
        return '挑战题目，锻炼综合应用能力';
      default:
        return '推荐的练习题目';
    }
  }

  /**
   * Get current topics user is studying
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Array>} Current topics
   */
  async getCurrentTopics(userId, subjectCode) {
    try {
      const { data, error } = await db
        .from('user_progress')
        .select(`
          topic_id,
          completion_percentage,
          topics(id, title, difficulty)
        `)
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .gt('completion_percentage', 0)
        .lt('completion_percentage', 100)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data?.map(item => item.topics).filter(Boolean) || [];
    } catch (error) {
      console.error('Error fetching current topics:', error);
      return [];
    }
  }

  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    try {
      const { data, error } = await db
        .from('user_profiles')
        .select('learning_preferences')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.learning_preferences || {};
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return {};
    }
  }

  /**
   * Get available study materials
   * @param {string} subjectCode - Subject code
   * @param {Array} materialTypes - Types of materials to include
   * @returns {Promise<Array>} Available materials
   */
  async getAvailableMaterials(subjectCode, materialTypes) {
    // This would typically fetch from a materials table
    // For now, return mock data
    return [
      {
        id: 'material_1',
        title: '微积分入门指南',
        description: '从基础概念到实际应用的完整指南',
        type: 'notes',
        format: 'PDF',
        pages: 45,
        topicIds: ['calculus_basics'],
        difficulty: 'easy',
        rating: 4.5
      },
      {
        id: 'material_2',
        title: '复数运算视频教程',
        description: '详细讲解复数的各种运算方法',
        type: 'video',
        format: '视频',
        duration: '25分钟',
        topicIds: ['complex_numbers'],
        difficulty: 'medium',
        rating: 4.8
      },
      {
        id: 'material_3',
        title: '三角函数例题解析',
        description: '经典三角函数题目的详细解答',
        type: 'examples',
        format: '在线',
        pages: 30,
        topicIds: ['trigonometry'],
        difficulty: 'medium',
        rating: 4.3
      }
    ];
  }

  /**
   * Score study materials
   * @param {Array} materials - Available materials
   * @param {Array} currentTopics - Current topics
   * @param {Object} preferences - User preferences
   * @param {string} learningStyle - Learning style
   * @returns {Array} Scored materials
   */
  scoreMaterials(materials, currentTopics, preferences, learningStyle) {
    const currentTopicIds = currentTopics.map(topic => topic.id);
    
    return materials.map(material => {
      let score = 0;
      
      // Relevance to current topics
      const isRelevant = material.topicIds.some(topicId => 
        currentTopicIds.includes(topicId)
      );
      if (isRelevant) score += 0.4;
      
      // Learning style matching
      const styleScore = this.calculateStyleScore(material.type, learningStyle);
      score += 0.3 * styleScore;
      
      // Quality (rating)
      score += 0.2 * (material.rating / 5);
      
      // Format preference
      if (preferences.preferredFormats?.includes(material.format)) {
        score += 0.1;
      }
      
      return {
        ...material,
        score
      };
    });
  }

  /**
   * Calculate learning style score
   * @param {string} materialType - Type of material
   * @param {string} learningStyle - User's learning style
   * @returns {number} Style score
   */
  calculateStyleScore(materialType, learningStyle) {
    const styleMatching = {
      visual: {
        video: 1,
        notes: 0.8,
        examples: 0.9,
        interactive: 0.7
      },
      auditory: {
        video: 0.9,
        audio: 1,
        notes: 0.5,
        examples: 0.6
      },
      kinesthetic: {
        interactive: 1,
        examples: 0.8,
        video: 0.6,
        notes: 0.4
      }
    };
    
    return styleMatching[learningStyle]?.[materialType] || 0.5;
  }
}

export default new RecommendationEngine();