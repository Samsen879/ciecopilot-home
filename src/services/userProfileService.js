/**
 * User Profile Service
 * Handles user profile management, learning preferences, and progress tracking
 */

import { supabase } from '../utils/supabase';

class UserProfileService {
  /**
   * Get user profile data including preferences and statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(userId) {
    try {
      // Get user session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/user-profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to fetch profile');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Update result
   */
  async updateUserProfile(profileData) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to update profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  /**
   * Create user profile for new users
   * @param {Object} profileData - Initial profile data
   * @returns {Promise<Object>} Creation result
   */
  async createUserProfile(profileData) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to create profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Create user profile error:', error);
      throw error;
    }
  }

  /**
   * Update learning preferences
   * @param {Object} preferences - Learning preferences object
   * @returns {Promise<Object>} Update result
   */
  async updateLearningPreferences(preferences) {
    return this.updateUserProfile({ learningPreferences: preferences });
  }

  /**
   * Update learning goals
   * @param {Array} goals - Array of learning goals
   * @returns {Promise<Object>} Update result
   */
  async updateLearningGoals(goals) {
    return this.updateUserProfile({ goals });
  }

  /**
   * Track study session
   * @param {Object} sessionData - Study session data
   * @returns {Promise<Object>} Tracking result
   */
  async trackStudySession(sessionData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert study record
      const { data, error } = await supabase
        .from('study_records')
        .insert({
          user_id: user.id,
          topic_id: sessionData.topicId,
          study_duration: sessionData.duration,
          questions_attempted: sessionData.questionsAttempted || 0,
          questions_correct: sessionData.questionsCorrect || 0,
          accuracy_rate: sessionData.accuracyRate || 0,
          difficulty_level: sessionData.difficultyLevel || 'medium',
          study_notes: sessionData.notes || null,
          time_tracking: sessionData.timeTracking || {},
          accuracy_tracking: sessionData.accuracyTracking || {},
          learning_path_data: sessionData.learningPathData || {},
          ai_recommendations: sessionData.aiRecommendations || {}
        });

      if (error) {
        throw error;
      }

      // Update study statistics
      await this.updateStudyStatistics(user.id, sessionData);

      return { success: true, data };
    } catch (error) {
      console.error('Track study session error:', error);
      throw error;
    }
  }

  /**
   * Update study statistics
   * @param {string} userId - User ID
   * @param {Object} sessionData - Study session data
   * @returns {Promise<void>}
   */
  async updateStudyStatistics(userId, sessionData) {
    try {
      // Get current statistics
      const { data: currentStats, error: fetchError } = await supabase
        .from('study_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const stats = currentStats || {
        user_id: userId,
        total_study_time: 0,
        topics_completed: 0,
        average_accuracy: 0,
        streak_days: 0,
        last_study_date: null,
        weekly_goals: {},
        monthly_summary: {}
      };

      // Update statistics
      const updatedStats = {
        ...stats,
        total_study_time: (stats.total_study_time || 0) + (sessionData.duration || 0),
        topics_completed: sessionData.topicCompleted ? 
          (stats.topics_completed || 0) + 1 : (stats.topics_completed || 0),
        last_study_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Calculate average accuracy
      if (sessionData.accuracyRate !== undefined) {
        const totalSessions = (stats.total_sessions || 0) + 1;
        const currentAvg = stats.average_accuracy || 0;
        updatedStats.average_accuracy = 
          ((currentAvg * (totalSessions - 1)) + sessionData.accuracyRate) / totalSessions;
        updatedStats.total_sessions = totalSessions;
      }

      // Upsert statistics
      const { error: upsertError } = await supabase
        .from('study_statistics')
        .upsert(updatedStats);

      if (upsertError) {
        throw upsertError;
      }
    } catch (error) {
      console.error('Update study statistics error:', error);
      // Don't throw here to avoid breaking the main flow
    }
  }

  /**
   * Get user study progress
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (subject, timeRange, etc.)
   * @returns {Promise<Object>} Study progress data
   */
  async getStudyProgress(userId, filters = {}) {
    try {
      let query = supabase
        .from('study_records')
        .select(`
          *,
          topics:topic_id (
            id,
            name,
            subject_code,
            paper_code
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.subject) {
        query = query.eq('topics.subject_code', filters.subject);
      }

      if (filters.timeRange) {
        const { start, end } = filters.timeRange;
        if (start) query = query.gte('created_at', start);
        if (end) query = query.lte('created_at', end);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Get study progress error:', error);
      throw error;
    }
  }

  /**
   * Get learning analytics
   * @param {string} userId - User ID
   * @param {string} timeRange - Time range ('week', 'month', 'year')
   * @returns {Promise<Object>} Analytics data
   */
  async getLearningAnalytics(userId, timeRange = 'month') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 1);
      }

      const { data: records, error } = await supabase
        .from('study_records')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        throw error;
      }

      // Process analytics
      const analytics = {
        totalStudyTime: records.reduce((sum, record) => sum + (record.study_duration || 0), 0),
        totalSessions: records.length,
        averageAccuracy: records.length > 0 ? 
          records.reduce((sum, record) => sum + (record.accuracy_rate || 0), 0) / records.length : 0,
        topicsStudied: new Set(records.map(record => record.topic_id)).size,
        dailyProgress: this.calculateDailyProgress(records, startDate, endDate),
        subjectBreakdown: this.calculateSubjectBreakdown(records),
        weakAreas: this.identifyWeakAreas(records)
      };

      return analytics;
    } catch (error) {
      console.error('Get learning analytics error:', error);
      throw error;
    }
  }

  /**
   * Calculate daily progress
   * @private
   */
  calculateDailyProgress(records, startDate, endDate) {
    const dailyData = {};
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = {
        studyTime: 0,
        sessions: 0,
        accuracy: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    records.forEach(record => {
      const dateKey = record.created_at.split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].studyTime += record.study_duration || 0;
        dailyData[dateKey].sessions += 1;
        dailyData[dateKey].accuracy += record.accuracy_rate || 0;
      }
    });

    // Calculate average accuracy for each day
    Object.keys(dailyData).forEach(date => {
      if (dailyData[date].sessions > 0) {
        dailyData[date].accuracy /= dailyData[date].sessions;
      }
    });

    return dailyData;
  }

  /**
   * Calculate subject breakdown
   * @private
   */
  calculateSubjectBreakdown(records) {
    const breakdown = {};
    
    records.forEach(record => {
      const subject = record.topics?.subject_code || 'unknown';
      if (!breakdown[subject]) {
        breakdown[subject] = {
          studyTime: 0,
          sessions: 0,
          accuracy: 0
        };
      }
      
      breakdown[subject].studyTime += record.study_duration || 0;
      breakdown[subject].sessions += 1;
      breakdown[subject].accuracy += record.accuracy_rate || 0;
    });

    // Calculate average accuracy for each subject
    Object.keys(breakdown).forEach(subject => {
      if (breakdown[subject].sessions > 0) {
        breakdown[subject].accuracy /= breakdown[subject].sessions;
      }
    });

    return breakdown;
  }

  /**
   * Identify weak areas
   * @private
   */
  identifyWeakAreas(records) {
    const topicPerformance = {};
    
    records.forEach(record => {
      const topicId = record.topic_id;
      if (!topicPerformance[topicId]) {
        topicPerformance[topicId] = {
          attempts: 0,
          totalAccuracy: 0,
          averageAccuracy: 0,
          topicName: record.topics?.name || 'Unknown Topic'
        };
      }
      
      topicPerformance[topicId].attempts += 1;
      topicPerformance[topicId].totalAccuracy += record.accuracy_rate || 0;
      topicPerformance[topicId].averageAccuracy = 
        topicPerformance[topicId].totalAccuracy / topicPerformance[topicId].attempts;
    });

    // Return topics with accuracy below 70% and at least 3 attempts
    return Object.entries(topicPerformance)
      .filter(([_, performance]) => 
        performance.averageAccuracy < 0.7 && performance.attempts >= 3
      )
      .map(([topicId, performance]) => ({
        topicId,
        topicName: performance.topicName,
        averageAccuracy: performance.averageAccuracy,
        attempts: performance.attempts
      }))
      .sort((a, b) => a.averageAccuracy - b.averageAccuracy);
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();
export default userProfileService;