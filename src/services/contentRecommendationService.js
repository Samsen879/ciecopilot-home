/**
 * Content Recommendation Service
 * Handles personalized content recommendations based on user behavior and learning patterns
 */

import { db } from '../utils/supabase';
import recommendationEngine from './recommendationEngine';

class ContentRecommendationService {
  /**
   * Get personalized content recommendations for a user
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Personalized recommendations
   */
  async getPersonalizedContent(userId, subjectCode = null, options = {}) {
    try {
      const {
        includeTopics = true,
        includePractice = true,
        includeMaterials = true,
        limit = 10
      } = options;

      const recommendations = {
        recommendedTopics: [],
        practiceProblems: [],
        studyMaterials: [],
        insights: null
      };

      // Use the recommendation engine for intelligent recommendations
      if (includeTopics) {
        recommendations.recommendedTopics = await recommendationEngine.generateTopicRecommendations(
          userId, 
          subjectCode || '9709', 
          { limit, includeCompleted: false }
        );
      }

      if (includePractice) {
        recommendations.practiceProblems = await recommendationEngine.generatePracticeRecommendations(
          userId, 
          subjectCode || '9709', 
          { limit: Math.floor(limit / 2) }
        );
      }

      if (includeMaterials) {
        recommendations.studyMaterials = await recommendationEngine.generateMaterialRecommendations(
          userId, 
          subjectCode || '9709', 
          { limit: Math.floor(limit * 0.8) }
        );
      }

      // Generate insights
      recommendations.insights = await this.generateInsights(
        recommendations,
        userId,
        subjectCode || '9709'
      );

      return recommendations;
    } catch (error) {
      console.error('Error getting personalized content:', error);
      // Return mock data for development
      return this.generateMockRecommendations(userId, subjectCode);
    }
  }

  /**
   * Rank topics by relevance to user profile
   * @param {Array} topics - Array of topic objects
   * @param {Object} userProfile - User profile data
   * @returns {Array} Ranked topics
   */
  async rankTopicsByRelevance(topics, userProfile) {
    try {
      const { statistics, preferences, learning_goals } = userProfile;
      
      // Calculate relevance score for each topic
      const rankedTopics = topics.map(topic => {
        let relevanceScore = 0;
        
        // Factor 1: User's weak areas (higher priority)
        if (statistics?.weak_areas?.includes(topic.id)) {
          relevanceScore += 50;
        }
        
        // Factor 2: Learning goals alignment
        if (learning_goals?.target_topics?.includes(topic.id)) {
          relevanceScore += 40;
        }
        
        // Factor 3: Difficulty level matching
        const userLevel = preferences?.difficulty_level || 'intermediate';
        if (topic.difficulty === userLevel) {
          relevanceScore += 30;
        }
        
        // Factor 4: Learning style preference
        const learningStyle = preferences?.learning_style || 'visual';
        if (topic.learning_styles?.includes(learningStyle)) {
          relevanceScore += 20;
        }
        
        // Factor 5: Recent activity (lower priority for recently studied)
        if (statistics?.recent_topics?.includes(topic.id)) {
          relevanceScore -= 10;
        }
        
        return {
          ...topic,
          relevanceScore
        };
      });
      
      // Sort by relevance score (descending)
      return rankedTopics.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('Rank topics error:', error);
      return topics; // Return original order on error
    }
  }

  /**
   * Suggest practice problems based on weak areas
   * @param {Array} weakAreas - Array of weak topic IDs
   * @returns {Promise<Array>} Suggested practice problems
   */
  async suggestPracticeProblems(weakAreas) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/recommendations/practice-problems', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weak_areas: weakAreas
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to get practice problems');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Suggest practice problems error:', error);
      return this.generateMockPracticeProblems(weakAreas);
    }
  }

  /**
   * Recommend study materials for current topic
   * @param {string} currentTopic - Current topic ID
   * @returns {Promise<Array>} Recommended study materials
   */
  async recommendStudyMaterials(currentTopic) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/recommendations/study-materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic_id: currentTopic
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to get study materials');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Recommend study materials error:', error);
      return this.generateMockStudyMaterials(currentTopic);
    }
  }

  /**
   * Update user preferences for better recommendations
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   * @returns {Promise<Object>} Update result
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/recommendations/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          preferences
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to update preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  }

  /**
   * Generate learning insights based on recommendations and user data
   * @param {Object} recommendations - Generated recommendations
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @returns {Promise<Object>} Learning insights
   */
  async generateInsights(recommendations, userId, subjectCode) {
    try {
      const totalRecommendations = 
        recommendations.recommendedTopics.length +
        recommendations.practiceProblems.length +
        recommendations.studyMaterials.length;

      const highPriorityCount = recommendations.recommendedTopics.filter(
        topic => topic.priority === 'high'
      ).length;

      const estimatedStudyTime = recommendations.recommendedTopics.reduce(
        (total, topic) => total + (topic.estimatedTime || 30), 0
      );

      // Get user's recent performance for completion rate
      const recentPerformance = await recommendationEngine.getRecentPerformance(userId, subjectCode);
      const completionRate = recentPerformance.length > 0 
        ? Math.round(recentPerformance.reduce((sum, item) => sum + (item.score || 0), 0) / recentPerformance.length * 100)
        : 0;

      // Determine next milestone
      const nextMilestone = await this.determineNextMilestone(recommendations, userId, subjectCode);

      return {
        totalRecommendations,
        highPriorityCount,
        estimatedStudyTime,
        completionRate,
        nextMilestone,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        totalRecommendations: 0,
        highPriorityCount: 0,
        estimatedStudyTime: 0,
        completionRate: 0,
        nextMilestone: '开始学习之旅',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Determine the next learning milestone for the user
   * @param {Object} recommendations - Generated recommendations
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @returns {Promise<string>} Next milestone description
   */
  async determineNextMilestone(recommendations, userId, subjectCode) {
    try {
      // Get user's current progress
      const currentTopics = await recommendationEngine.getCurrentTopics(userId, subjectCode);
      
      // Check for incomplete topics first
      if (currentTopics.length > 0) {
        return `完成正在学习的 ${currentTopics[0].title}`;
      }
      
      // Check for high priority recommendations
      const highPriorityTopics = recommendations.recommendedTopics.filter(
        topic => topic.priority === 'high'
      );

      if (highPriorityTopics.length > 0) {
        return `完成 ${highPriorityTopics[0].title} 的学习`;
      }

      // Check for practice problems
      if (recommendations.practiceProblems.length > 0) {
        return `完成 ${recommendations.practiceProblems[0].title} 练习`;
      }

      // Default to first recommended topic
      if (recommendations.recommendedTopics.length > 0) {
        return `开始学习 ${recommendations.recommendedTopics[0].title}`;
      }

      return '继续保持学习进度';
    } catch (error) {
      console.error('Error determining next milestone:', error);
      return '开始学习之旅';
    }
  }

  /**
   * Generate mock recommendations for development
   * @param {string} userId - User ID
   * @param {string} subjectCode - Subject code
   * @returns {Object} Mock recommendations
   */
  generateMockRecommendations(userId, subjectCode) {
    const mockTopics = {
      '9709': [
        {
          id: 'quadratic-equations',
          title: '二次方程',
          description: '掌握二次方程的求解方法和应用',
          difficulty: 'medium',
          estimatedTime: 45,
          priority: 'high',
          reason: '基于你在代数方面的薄弱表现',
          progress: 0,
          type: 'topic'
        },
        {
          id: 'calculus-derivatives',
          title: '微分学',
          description: '理解导数的概念和计算方法',
          difficulty: 'hard',
          estimatedTime: 60,
          priority: 'medium',
          reason: '为积分学习做准备',
          progress: 25,
          type: 'topic'
        },
        {
          id: 'trigonometry-identities',
          title: '三角恒等式',
          description: '掌握常用三角恒等式及其应用',
          difficulty: 'medium',
          estimatedTime: 40,
          priority: 'medium',
          reason: '提高解题效率',
          progress: 60,
          type: 'topic'
        }
      ],
      '9702': [
        {
          id: 'mechanics-forces',
          title: '力学基础',
          description: '理解力的概念和牛顿定律',
          difficulty: 'medium',
          estimatedTime: 50,
          priority: 'high',
          reason: '物理学习的基础',
          progress: 0,
          type: 'topic'
        },
        {
          id: 'waves-oscillations',
          title: '波动与振动',
          description: '掌握波的性质和振动规律',
          difficulty: 'hard',
          estimatedTime: 55,
          priority: 'medium',
          reason: '考试重点内容',
          progress: 30,
          type: 'topic'
        }
      ]
    };

    const practiceProblems = [
      {
        id: 'practice-1',
        title: '二次方程练习题集',
        description: '包含20道不同难度的二次方程题目',
        type: 'practice',
        difficulty: 'mixed',
        estimatedTime: 30,
        questionCount: 20
      },
      {
        id: 'practice-2',
        title: '微分计算专项训练',
        description: '针对导数计算的专项练习',
        type: 'practice',
        difficulty: 'hard',
        estimatedTime: 45,
        questionCount: 15
      }
    ];

    const studyMaterials = [
      {
        id: 'material-1',
        title: '数学公式速查手册',
        description: '包含所有重要数学公式',
        type: 'reference',
        format: 'pdf',
        pages: 25
      },
      {
        id: 'material-2',
        title: '解题技巧视频教程',
        description: '专业老师讲解解题方法',
        type: 'video',
        format: 'mp4',
        duration: '2h 30m'
      }
    ];

    return {
      recommendedTopics: mockTopics[subjectCode] || mockTopics['9709'],
      practiceProblems,
      studyMaterials,
      insights: {
        totalRecommendations: 3,
        highPriorityCount: 1,
        estimatedStudyTime: 145,
        completionRate: 28,
        nextMilestone: '完成二次方程专题学习'
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate mock practice problems
   * @param {Array} weakAreas - Weak areas
   * @returns {Array} Mock practice problems
   */
  generateMockPracticeProblems(weakAreas) {
    return [
      {
        id: 'prob-1',
        title: '基础代数练习',
        description: '针对代数薄弱点的专项练习',
        difficulty: 'easy',
        questionCount: 15,
        estimatedTime: 25,
        topics: weakAreas.slice(0, 2)
      },
      {
        id: 'prob-2',
        title: '综合应用题',
        description: '多知识点综合应用练习',
        difficulty: 'medium',
        questionCount: 10,
        estimatedTime: 40,
        topics: weakAreas
      }
    ];
  }

  /**
   * Generate mock study materials
   * @param {string} currentTopic - Current topic
   * @returns {Array} Mock study materials
   */
  generateMockStudyMaterials(currentTopic) {
    return [
      {
        id: 'mat-1',
        title: `${currentTopic} 知识点总结`,
        type: 'summary',
        format: 'pdf',
        description: '核心知识点梳理和总结'
      },
      {
        id: 'mat-2',
        title: `${currentTopic} 典型例题`,
        type: 'examples',
        format: 'interactive',
        description: '精选典型例题和详细解析'
      }
    ];
  }
}

// Export singleton instance
export default new ContentRecommendationService();