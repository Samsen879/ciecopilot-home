// 推荐算法引擎 - 增强版
// 实现内容评分、排序、多样性优化和匹配度计算

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 算法配置
const ALGORITHM_CONFIG = {
  // 评分权重
  SCORING_WEIGHTS: {
    CONTENT_QUALITY: 0.25,      // 内容质量权重
    USER_PREFERENCE: 0.30,      // 用户偏好权重
    LEARNING_PROGRESS: 0.20,    // 学习进度权重
    SOCIAL_SIGNALS: 0.15,       // 社交信号权重
    TEMPORAL_RELEVANCE: 0.10    // 时间相关性权重
  },
  
  // 多样性配置
  DIVERSITY: {
    MIN_DIVERSITY_SCORE: 0.3,   // 最小多样性分数
    MAX_SIMILAR_ITEMS: 3,       // 最大相似项目数
    TOPIC_DISTRIBUTION: 0.4,    // 主题分布权重
    DIFFICULTY_SPREAD: 0.3,     // 难度分布权重
    CONTENT_TYPE_MIX: 0.3       // 内容类型混合权重
  },
  
  // 匹配度阈值
  MATCHING: {
    MIN_CONFIDENCE: 0.4,        // 最小置信度
    PERFECT_MATCH_THRESHOLD: 0.9, // 完美匹配阈值
    GOOD_MATCH_THRESHOLD: 0.7,  // 良好匹配阈值
    ACCEPTABLE_THRESHOLD: 0.5   // 可接受阈值
  },
  
  // 学习曲线配置
  LEARNING_CURVE: {
    MASTERY_THRESHOLD: 0.8,     // 掌握阈值
    STRUGGLE_THRESHOLD: 0.4,    // 困难阈值
    OPTIMAL_CHALLENGE: 0.7,     // 最优挑战度
    ADAPTATION_RATE: 0.1        // 适应速率
  }
};

/**
 * 增强推荐算法引擎
 */
export class RecommendationEngine {
  constructor() {
    this.userProfiles = new Map();
    this.contentCache = new Map();
    this.performanceMetrics = {
      totalRecommendations: 0,
      successfulMatches: 0,
      averageConfidence: 0,
      diversityScore: 0
    }
   
   /**
    * 计算多样性分数
    */
   calculateDiversityScore(candidate, existingRecommendations) {
     if (existingRecommendations.length === 0) return 1.0;
     
     const candidateTopic = this.getTopicKey(candidate);
     const candidateDifficulty = this.getDifficultyLevel(candidate);
     const candidateType = candidate.target_type;
     
     let diversityScore = 1.0;
     
     existingRecommendations.forEach(existing => {
       const existingTopic = this.getTopicKey(existing);
       const existingDifficulty = this.getDifficultyLevel(existing);
       const existingType = existing.target_type;
       
       // 主题多样性
       if (candidateTopic === existingTopic) {
         diversityScore *= 0.7;
       } else if (candidateTopic.split('_')[0] === existingTopic.split('_')[0]) {
         diversityScore *= 0.85;
       }
       
       // 难度多样性
       if (candidateDifficulty === existingDifficulty) {
         diversityScore *= 0.9;
       }
       
       // 类型多样性
       if (candidateType === existingType) {
         diversityScore *= 0.8;
       }
     });
     
     return Math.max(diversityScore, 0.1);
   }
   
   /**
    * 检查能力匹配
    */
   checkAbilityMatch(candidate, userProfile) {
     const userLevel = userProfile.basic.current_level || 3;
     const candidateLevel = candidate.difficulty_level || 3;
     
     const levelDiff = Math.abs(candidateLevel - userLevel);
     
     // 最佳匹配是稍微高于用户当前水平
     if (candidateLevel === userLevel + 1) return 1.0;
     if (candidateLevel === userLevel) return 0.9;
     if (candidateLevel === userLevel - 1) return 0.8;
     
     return Math.max(0, 1 - levelDiff * 0.2);
   }
   
   /**
    * 检查目标匹配
    */
   checkGoalMatch(candidate, userProfile) {
     const userGoals = userProfile.basic.learning_goals || [];
     const candidateTopics = candidate.topic_tags || [];
     
     if (userGoals.length === 0) return 0.5;
     
     const matches = userGoals.filter(goal => 
       candidateTopics.some(topic => 
         topic.toLowerCase().includes(goal.toLowerCase()) ||
         goal.toLowerCase().includes(topic.toLowerCase())
       )
     );
     
     return matches.length / userGoals.length;
   }
   
   /**
    * 检查时间匹配
    */
   checkTimeMatch(candidate, userProfile) {
     const userAvailableTime = userProfile.patterns.session_duration || 30;
     const candidateTime = candidate.estimated_duration || 30;
     
     if (candidateTime <= userAvailableTime) return 1.0;
     
     const timeRatio = userAvailableTime / candidateTime;
     return Math.max(timeRatio, 0.3);
   }
   
   /**
    * 获取置信度解释
    */
   getConfidenceExplanation(confidenceScore) {
     if (confidenceScore > 0.8) return '高置信度推荐';
     if (confidenceScore > 0.6) return '中等置信度推荐';
     if (confidenceScore > 0.4) return '低置信度推荐';
     return '探索性推荐';
   }
   
   /**
    * 获取匹配质量
    */
   getMatchQuality(overallScore) {
     if (overallScore > 0.8) return 'excellent';
     if (overallScore > 0.6) return 'good';
     if (overallScore > 0.4) return 'fair';
     return 'poor';
   }
   
   /**
    * 获取置信度等级
    */
   getConfidenceLevel(confidenceScore) {
     if (confidenceScore > 0.8) return 'high';
     if (confidenceScore > 0.6) return 'medium';
     if (confidenceScore > 0.4) return 'low';
     return 'very_low';
   }
   
   /**
    * 检查难度平衡
    */
   checkDifficultyBalance(difficulty, distribution, currentCount) {
     const maxPerDifficulty = Math.ceil(currentCount * 0.6);
     return distribution[difficulty] < maxPerDifficulty;
   }
   
   /**
    * 检查类型平衡
    */
   checkTypeBalance(contentType, distribution, currentCount) {
     const maxPerType = Math.ceil(currentCount * 0.7);
     return distribution[contentType] < maxPerType;
   }
   
   /**
    * 按主题分组
    */
   groupByTopic(candidates) {
     const groups = {};
     
     candidates.forEach(candidate => {
       const topicKey = this.getTopicKey(candidate);
       if (!groups[topicKey]) {
         groups[topicKey] = [];
       }
       groups[topicKey].push(candidate);
     });
     
     return groups;
   }
   
   /**
    * 获取难度分数
    */
   getDifficultyScore(candidate) {
     return (candidate.difficulty_level || 3) / 5;
   }
   
   /**
    * 计算排序分数
    */
   calculateSortScore(recommendation, userProfile) {
     const scores = recommendation.enhanced_scores;
     const weights = {
       final: 0.4,
       confidence: 0.3,
       diversity: 0.2,
       temporal: 0.1
     };
     
     return (
       scores.final * weights.final +
       recommendation.confidence_score * weights.confidence +
       (recommendation.diversity_score || 0.5) * weights.diversity +
       (scores.temporal_relevance || 0.5) * weights.temporal
     );
   };
  }

  /**
   * 生成增强推荐
   */
  async generateEnhancedRecommendations(userId, subjectCode, options = {}) {
    const startTime = Date.now();
    
    try {
      // 1. 获取用户完整档案
      const userProfile = await this.getUserCompleteProfile(userId, subjectCode);
      
      // 2. 获取候选内容
      const candidates = await this.getCandidateContent(subjectCode, userProfile, options);
      
      // 3. 计算增强评分
      const scoredCandidates = await this.calculateEnhancedScores(candidates, userProfile);
      
      // 4. 应用多样性优化
      const diversifiedResults = this.applyDiversityOptimization(scoredCandidates, userProfile);
      
      // 5. 智能排序
      const sortedRecommendations = this.intelligentSort(diversifiedResults, userProfile);
      
      // 6. 应用匹配度过滤
      const filteredRecommendations = this.applyMatchingFilter(sortedRecommendations);
      
      // 7. 生成推荐解释
      const explainedRecommendations = this.generateExplanations(filteredRecommendations, userProfile);
      
      // 8. 更新性能指标
      this.updatePerformanceMetrics(explainedRecommendations);
      
      const processingTime = Date.now() - startTime;
      
      return {
        recommendations: explainedRecommendations,
        metadata: {
          algorithm_version: '2.0-enhanced',
          processing_time: processingTime,
          total_candidates: candidates.length,
          final_count: explainedRecommendations.length,
          diversity_score: this.calculateOverallDiversity(explainedRecommendations),
          average_confidence: this.calculateAverageConfidence(explainedRecommendations)
        }
      };
      
    } catch (error) {
      console.error('Enhanced recommendation generation error:', error);
      throw error;
    }
  }

  /**
   * 获取用户完整档案
   */
  async getUserCompleteProfile(userId, subjectCode) {
    const cacheKey = `profile_${userId}_${subjectCode}`;
    
    if (this.userProfiles.has(cacheKey)) {
      return this.userProfiles.get(cacheKey);
    }
    
    try {
      // 获取基础档案
      const { data: basicProfile } = await supabase
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .single();
      
      // 获取学习历史
      const { data: learningHistory } = await supabase
        .from('user_learning_data')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // 获取反馈历史
      const { data: feedbackHistory } = await supabase
        .from('recommendation_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // 计算学习模式
      const learningPatterns = this.analyzeLearningPatterns(learningHistory);
      
      // 计算偏好权重
      const preferenceWeights = this.calculatePreferenceWeights(feedbackHistory);
      
      // 计算知识图谱
      const knowledgeMap = this.buildKnowledgeMap(learningHistory, subjectCode);
      
      const completeProfile = {
        ...basicProfile,
        learning_history: learningHistory || [],
        feedback_history: feedbackHistory || [],
        learning_patterns: learningPatterns,
        preference_weights: preferenceWeights,
        knowledge_map: knowledgeMap,
        profile_completeness: this.calculateProfileCompleteness(basicProfile, learningHistory, feedbackHistory)
      };
      
      // 缓存档案（5分钟）
      this.userProfiles.set(cacheKey, completeProfile);
      setTimeout(() => this.userProfiles.delete(cacheKey), 5 * 60 * 1000);
      
      return completeProfile;
      
    } catch (error) {
      console.error('Get user complete profile error:', error);
      return this.getDefaultProfile(userId, subjectCode);
    }
  }

  /**
   * 获取候选内容
   */
  async getCandidateContent(subjectCode, userProfile, options) {
    try {
      const limit = options.limit || 50;
      const excludeIds = options.excludeIds || [];
      
      // 获取论文候选
      const paperCandidates = await this.getPaperCandidates(subjectCode, userProfile, limit, excludeIds);
      
      // 获取主题候选
      const topicCandidates = await this.getTopicCandidates(subjectCode, userProfile, limit, excludeIds);
      
      // 获取学习路径候选
      const pathCandidates = await this.getPathCandidates(subjectCode, userProfile, limit, excludeIds);
      
      return [
        ...paperCandidates,
        ...topicCandidates,
        ...pathCandidates
      ];
      
    } catch (error) {
      console.error('Get candidate content error:', error);
      return [];
    }
  }

  /**
   * 计算增强评分
   */
  async calculateEnhancedScores(candidates, userProfile) {
    return candidates.map(candidate => {
      // 1. 内容质量评分
      const contentQualityScore = this.calculateContentQuality(candidate);
      
      // 2. 用户偏好匹配评分
      const preferenceScore = this.calculatePreferenceMatch(candidate, userProfile);
      
      // 3. 学习进度适配评分
      const progressScore = this.calculateProgressAlignment(candidate, userProfile);
      
      // 4. 社交信号评分
      const socialScore = this.calculateSocialSignals(candidate);
      
      // 5. 时间相关性评分
      const temporalScore = this.calculateTemporalRelevance(candidate, userProfile);
      
      // 6. 多维度评分计算
      const multiDimensionalScores = this.computeMultiDimensionalScore(candidate, userProfile, {
        contentQualityScore,
        preferenceScore,
        progressScore,
        socialScore,
        temporalScore
      });
      
      // 综合评分
      const overallScore = (
        contentQualityScore * ALGORITHM_CONFIG.SCORING_WEIGHTS.CONTENT_QUALITY +
        preferenceScore * ALGORITHM_CONFIG.SCORING_WEIGHTS.USER_PREFERENCE +
        progressScore * ALGORITHM_CONFIG.SCORING_WEIGHTS.LEARNING_PROGRESS +
        socialScore * ALGORITHM_CONFIG.SCORING_WEIGHTS.SOCIAL_SIGNALS +
        temporalScore * ALGORITHM_CONFIG.SCORING_WEIGHTS.TEMPORAL_RELEVANCE
      );
      
      const finalScore = this.computeFinalScore(multiDimensionalScores, overallScore);
      
      return {
        ...candidate,
        enhanced_scores: {
          overall: overallScore,
          content_quality: contentQualityScore,
          preference_match: preferenceScore,
          progress_alignment: progressScore,
          social_signals: socialScore,
          temporal_relevance: temporalScore,
          multi_dimensional: multiDimensionalScores,
          final: finalScore
        },
        confidence_score: this.calculateConfidence(finalScore, userProfile.profile_completeness),
        explanation: this.generateScoreExplanation(multiDimensionalScores, candidate)
      };
    });
  }

  /**
   * 应用多样性优化
   */
  applyDiversityOptimization(scoredCandidates, userProfile) {
    const limit = 20; // 默认限制
    const diversityConfig = ALGORITHM_CONFIG.DIVERSITY;
    
    if (scoredCandidates.length <= limit) {
      return scoredCandidates;
    }
    
    // 按主题分组
    const topicGroups = this.groupByTopic(scoredCandidates);
    
    // 按难度分组
    const difficultyGroups = this.groupByDifficulty(scoredCandidates);
    
    // 按内容类型分组
    const typeGroups = this.groupByContentType(scoredCandidates);
    
    const diversifiedResults = [];
    const usedTopics = new Set();
    const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    const typeDistribution = { paper: 0, topic: 0, path: 0 };
    const remaining = [...scoredCandidates.sort((a, b) => b.enhanced_scores.final - a.enhanced_scores.final)];
    
    // 第一个选择最高分的
    if (remaining.length > 0) {
      const first = remaining.shift();
      diversifiedResults.push({
        ...first,
        diversity_score: 1.0
      });
      
      const topicKey = this.getTopicKey(first);
      const difficulty = this.getDifficultyLevel(first);
      const contentType = first.target_type;
      
      usedTopics.add(topicKey);
      difficultyDistribution[difficulty]++;
      typeDistribution[contentType]++;
    }
    
    // 后续选择考虑多样性
    while (diversifiedResults.length < limit && remaining.length > 0) {
      let bestCandidate = null;
      let bestScore = -1;
      let bestIndex = -1;
      
      remaining.forEach((candidate, index) => {
        const topicKey = this.getTopicKey(candidate);
        const difficulty = this.getDifficultyLevel(candidate);
        const contentType = candidate.target_type;
        
        // 检查多样性约束
        const topicCount = Array.from(usedTopics).filter(t => t.startsWith(topicKey.split('_')[0])).length;
        const shouldInclude = (
          topicCount < diversityConfig.MAX_SIMILAR_ITEMS &&
          this.checkDifficultyBalance(difficulty, difficultyDistribution, diversifiedResults.length) &&
          this.checkTypeBalance(contentType, typeDistribution, diversifiedResults.length)
        );
        
        if (shouldInclude) {
          // 计算多样性分数
          const diversityScore = this.calculateDiversityScore(candidate, diversifiedResults);
          
          // 结合原始分数和多样性分数
          const combinedScore = 
            candidate.enhanced_scores.final * (1 - 0.3) +
            diversityScore * 0.3;
          
          if (combinedScore > bestScore) {
            bestScore = combinedScore;
            bestCandidate = candidate;
            bestIndex = index;
          }
        }
      });
      
      if (bestCandidate) {
        diversifiedResults.push({
          ...bestCandidate,
          diversity_score: this.calculateDiversityScore(bestCandidate, diversifiedResults)
        });
        
        const topicKey = this.getTopicKey(bestCandidate);
        const difficulty = this.getDifficultyLevel(bestCandidate);
        const contentType = bestCandidate.target_type;
        
        usedTopics.add(topicKey);
        difficultyDistribution[difficulty]++;
        typeDistribution[contentType]++;
        
        remaining.splice(bestIndex, 1);
      } else {
        break;
      }
    }
    
    return diversifiedResults;
  }

  /**
   * 智能排序
   */
  intelligentSort(recommendations, userProfile) {
    const sortingStrategy = this.determineSortingStrategy(userProfile);
    
    return recommendations.sort((a, b) => {
      switch (sortingStrategy) {
        case 'confidence_first':
          return this.compareByConfidenceFirst(a, b);
        case 'relevance_first':
          return this.compareByRelevanceFirst(a, b);
        case 'balanced':
          return this.compareByBalanced(a, b);
        case 'learning_curve':
          return this.compareByLearningCurve(a, b, userProfile);
        default:
          // 综合排序分数
          const scoreA = this.calculateSortScore(a, userProfile);
          const scoreB = this.calculateSortScore(b, userProfile);
          
          return scoreB - scoreA;
      }
    });
  }

  /**
   * 计算排序分数
   */
  calculateSortScore(recommendation, userProfile) {
    const baseScore = recommendation.enhanced_scores.overall;
    const diversityBonus = recommendation.diversity_score * 0.1;
    const confidenceBonus = recommendation.confidence_score * 0.1;
    
    // 根据用户学习模式调整
    const patternBonus = this.calculatePatternBonus(recommendation, userProfile.learning_patterns);
    
    return baseScore + diversityBonus + confidenceBonus + patternBonus;
  }

  /**
   * 应用匹配度过滤
   */
  applyMatchingFilter(recommendations) {
    return recommendations.filter(rec => {
      // 基础置信度过滤
      if (rec.confidence_score < ALGORITHM_CONFIG.MATCHING.MIN_CONFIDENCE) {
        return false;
      }
      
      // 学习能力匹配检查
      const abilityMatch = this.checkAbilityMatch(rec);
      if (abilityMatch < ALGORITHM_CONFIG.MATCHING.ACCEPTABLE_THRESHOLD) {
        return false;
      }
      
      // 内容质量检查
      const qualityCheck = rec.enhanced_scores.content_quality >= 0.3;
      if (!qualityCheck) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 生成推荐解释
   */
  generateExplanations(recommendations, userProfile) {
    return recommendations.map(rec => {
      const explanation = this.generateDetailedExplanation(rec, userProfile);
      
      return {
        ...rec,
        explanation: explanation,
        reasoning: {
          ...rec.reasoning,
          detailed_factors: explanation.factors,
          confidence_level: this.getConfidenceLevel(rec.confidence_score),
          match_quality: this.getMatchQuality(rec.enhanced_scores.overall),
          learning_impact: this.calculateLearningImpact(rec, userProfile),
          adaptation_suggestions: this.generateAdaptationSuggestions(rec, userProfile)
        }
      };
    });
  }

  // ============ 辅助计算方法 ============

  /**
   * 计算内容质量
   */
  calculateContentQuality(candidate) {
    let score = 0.5; // 基础分
    
    // 引用数量影响
    if (candidate.citation_count) {
      score += Math.min(candidate.citation_count / 100, 0.3);
    }
    
    // 发表时间影响
    if (candidate.publication_date) {
      const daysSince = (Date.now() - new Date(candidate.publication_date)) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSince / 1095); // 3年内
      score += recencyScore * 0.2;
    }
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 计算偏好匹配
   */
  calculatePreferenceMatch(candidate, userProfile) {
    let score = 0.5;
    
    const preferences = userProfile.preference_weights || {};
    const candidateFeatures = this.extractCandidateFeatures(candidate);
    
    // 计算特征匹配度
    for (const [feature, weight] of Object.entries(preferences)) {
      if (candidateFeatures[feature]) {
        score += weight * candidateFeatures[feature] * 0.1;
      }
    }
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 计算学习进度适配
   */
  calculateProgressAlignment(candidate, userProfile) {
    const knowledgeMap = userProfile.knowledge_map || {};
    const candidateTopic = this.getTopicKey(candidate);
    
    const currentMastery = knowledgeMap[candidateTopic] || 0;
    const candidateDifficulty = this.getDifficultyScore(candidate);
    
    // 计算最优挑战度
    const optimalDifficulty = currentMastery + ALGORITHM_CONFIG.LEARNING_CURVE.OPTIMAL_CHALLENGE;
    const difficultyGap = Math.abs(candidateDifficulty - optimalDifficulty);
    
    return Math.max(0, 1 - difficultyGap);
  }

  /**
   * 计算社交信号
   */
  calculateSocialSignals(candidate) {
    let score = 0.5;
    
    // 基于点赞、分享等社交数据
    if (candidate.like_count) {
      score += Math.min(candidate.like_count / 50, 0.3);
    }
    
    if (candidate.share_count) {
      score += Math.min(candidate.share_count / 20, 0.2);
    }
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 计算时间相关性
   */
  calculateTemporalRelevance(candidate, userProfile) {
    const learningPatterns = userProfile.learning_patterns || {};
    const currentHour = new Date().getHours();
    
    // 基于用户活跃时间模式
    const activeHours = learningPatterns.active_hours || [9, 10, 11, 14, 15, 16, 19, 20];
    const isActiveTime = activeHours.includes(currentHour);
    
    return isActiveTime ? 0.8 : 0.6;
  }

  // ============ 分析方法 ============

  /**
   * 分析学习模式
   */
  analyzeLearningPatterns(learningHistory) {
    if (!learningHistory || learningHistory.length === 0) {
      return this.getDefaultLearningPatterns();
    }
    
    // 分析活跃时间
    const activeHours = learningHistory
      .map(h => new Date(h.created_at).getHours())
      .reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});
    
    // 分析学习频率
    const learningFrequency = this.calculateLearningFrequency(learningHistory);
    
    // 分析偏好难度
    const preferredDifficulty = this.calculatePreferredDifficulty(learningHistory);
    
    return {
      active_hours: Object.entries(activeHours)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([hour]) => parseInt(hour)),
      learning_frequency: learningFrequency,
      preferred_difficulty: preferredDifficulty,
      session_duration: this.calculateAverageSessionDuration(learningHistory)
    };
  }

  /**
   * 计算偏好权重
   */
  calculatePreferenceWeights(feedbackHistory) {
    if (!feedbackHistory || feedbackHistory.length === 0) {
      return {};
    }
    
    const weights = {};
    
    feedbackHistory.forEach(feedback => {
      const feature = feedback.feedback_type;
      const weight = feedback.rating || (feedback.feedback_type === 'like' ? 1 : -1);
      
      weights[feature] = (weights[feature] || 0) + weight * 0.1;
    });
    
    return weights;
  }

  /**
   * 构建知识图谱
   */
  buildKnowledgeMap(learningHistory, subjectCode) {
    const knowledgeMap = {};
    
    if (!learningHistory || learningHistory.length === 0) {
      return knowledgeMap;
    }
    
    learningHistory.forEach(record => {
      const topic = record.topic_name || 'general';
      const performance = record.performance_score || 0.5;
      
      if (!knowledgeMap[topic]) {
        knowledgeMap[topic] = [];
      }
      
      knowledgeMap[topic].push(performance);
    });
    
    // 计算每个主题的平均掌握度
    for (const topic in knowledgeMap) {
      const scores = knowledgeMap[topic];
      knowledgeMap[topic] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
    
    return knowledgeMap;
  }

  // ============ 工具方法 ============

  getDefaultProfile(userId, subjectCode) {
    return {
      user_id: userId,
      subject_code: subjectCode,
      learning_style: {},
      knowledge_level: {},
      learning_pace: 'medium',
      preferred_difficulty: 3,
      content_preferences: {},
      weakness_areas: [],
      strength_areas: [],
      learning_history: [],
      feedback_history: [],
      learning_patterns: this.getDefaultLearningPatterns(),
      preference_weights: {},
      knowledge_map: {},
      profile_completeness: 0.3
    };
  }

  getDefaultLearningPatterns() {
    return {
      active_hours: [9, 10, 11, 14, 15, 16, 19, 20],
      learning_frequency: 'medium',
      preferred_difficulty: 0.6,
      session_duration: 30
    };
  }

  calculateProfileCompleteness(basicProfile, learningHistory, feedbackHistory) {
    let completeness = 0;
    
    if (basicProfile) completeness += 0.4;
    if (learningHistory && learningHistory.length > 0) completeness += 0.3;
    if (feedbackHistory && feedbackHistory.length > 0) completeness += 0.3;
    
    return Math.min(completeness, 1);
  }

  updatePerformanceMetrics(recommendations) {
    this.performanceMetrics.totalRecommendations += recommendations.length;
    
    const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence_score, 0) / recommendations.length;
    this.performanceMetrics.averageConfidence = avgConfidence;
    
    this.performanceMetrics.diversityScore = this.calculateOverallDiversity(recommendations);
  }

  calculateOverallDiversity(recommendations) {
    if (recommendations.length === 0) return 0;
    
    const topics = new Set(recommendations.map(rec => this.getTopicKey(rec)));
    const difficulties = new Set(recommendations.map(rec => this.getDifficultyLevel(rec)));
    const types = new Set(recommendations.map(rec => rec.target_type));
    
    return (topics.size + difficulties.size + types.size) / (recommendations.length * 3);
  }

  calculateAverageConfidence(recommendations) {
    if (recommendations.length === 0) return 0;
    
    return recommendations.reduce((sum, rec) => sum + rec.confidence_score, 0) / recommendations.length;
  }

  // ============ 核心候选内容获取方法 ============

  async getPaperCandidates(subjectCode, userProfile, limit, excludeIds) {
    try {
      const { data: papers } = await supabase
        .from('papers')
        .select(`
          id, title, abstract, keywords, authors,
          publication_date, citation_count, difficulty_level,
          subject_code, topic_tags, content_type
        `)
        .eq('subject_code', subjectCode)
        .eq('status', 'published')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('publication_date', { ascending: false })
        .limit(limit);
      
      return (papers || []).map(paper => ({
        ...paper,
        target_type: 'paper',
        target_id: paper.id,
        topic_name: paper.topic_tags?.[0] || 'general'
      }));
    } catch (error) {
      console.error('Error fetching paper candidates:', error);
      return [];
    }
  }

  async getTopicCandidates(subjectCode, userProfile, limit, excludeIds) {
    try {
      const { data: topics } = await supabase
        .from('topics')
        .select(`
          id, name, description, difficulty_level,
          subject_code, prerequisites, learning_objectives
        `)
        .eq('subject_code', subjectCode)
        .eq('status', 'active')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(limit);
      
      return (topics || []).map(topic => ({
        ...topic,
        target_type: 'topic',
        target_id: topic.id,
        topic_name: topic.name,
        title: topic.name
      }));
    } catch (error) {
      console.error('Error fetching topic candidates:', error);
      return [];
    }
  }

  async getPathCandidates(subjectCode, userProfile, limit, excludeIds) {
    try {
      const { data: paths } = await supabase
        .from('learning_paths')
        .select(`
          id, name, description, difficulty_level,
          subject_code, estimated_duration, path_type
        `)
        .eq('subject_code', subjectCode)
        .eq('status', 'active')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(Math.floor(limit / 3));
      
      return (paths || []).map(path => ({
        ...path,
        target_type: 'path',
        target_id: path.id,
        topic_name: path.name,
        title: path.name
      }));
    } catch (error) {
      console.error('Error fetching path candidates:', error);
      return [];
    }
  }

  getTopicKey(candidate) {
    return candidate.topic_name || candidate.subject_code || 'general';
  }

  getDifficultyLevel(candidate) {
    const level = candidate.difficulty_level || 3;
    if (level <= 2) return 'easy';
    if (level <= 4) return 'medium';
    return 'hard';
  }

  getDifficultyScore(candidate) {
    return (candidate.difficulty_level || 3) / 5;
  }

  extractCandidateFeatures(candidate) {
    return {
      topic: candidate.topic_name || '',
      difficulty: candidate.difficulty_level || 3,
      type: candidate.target_type || 'content'
    };
  }

  groupByTopic(candidates) {
    return candidates.reduce((groups, candidate) => {
      const topic = this.getTopicKey(candidate);
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(candidate);
      return groups;
    }, {});
  }

  groupByDifficulty(candidates) {
    return candidates.reduce((groups, candidate) => {
      const difficulty = this.getDifficultyLevel(candidate);
      if (!groups[difficulty]) groups[difficulty] = [];
      groups[difficulty].push(candidate);
      return groups;
    }, {});
  }

  groupByContentType(candidates) {
    return candidates.reduce((groups, candidate) => {
      const type = candidate.target_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(candidate);
      return groups;
    }, {});
  }

  checkDifficultyBalance(difficulty, distribution, totalCount) {
    if (totalCount === 0) return true;
    
    const currentRatio = distribution[difficulty] / totalCount;
    return currentRatio < 0.6; // 不超过60%
  }

  checkTypeBalance(type, distribution, totalCount) {
    if (totalCount === 0) return true;
    
    const currentRatio = distribution[type] / totalCount;
    return currentRatio < 0.7; // 不超过70%
  }

  calculateDiversityScore(candidate, existingRecommendations) {
    if (existingRecommendations.length === 0) return 1;
    
    const candidateTopic = this.getTopicKey(candidate);
    const candidateDifficulty = this.getDifficultyLevel(candidate);
    const candidateType = candidate.target_type;
    
    const similarCount = existingRecommendations.filter(rec => 
      this.getTopicKey(rec) === candidateTopic ||
      this.getDifficultyLevel(rec) === candidateDifficulty ||
      rec.target_type === candidateType
    ).length;
    
    return Math.max(0, 1 - similarCount / existingRecommendations.length);
  }

  calculatePatternBonus(recommendation, patterns) {
    // 根据学习模式计算奖励分数
    return 0;
  }

  calculateConfidence(overallScore, profileCompleteness) {
    return overallScore * (0.5 + profileCompleteness * 0.5);
  }

  generateExplanation(recommendation, userProfile) {
    const factors = [];
    const scores = recommendation.enhanced_scores;
    
    if (scores.content_quality > 0.7) {
      factors.push('高质量内容');
    }
    
    if (scores.preference_match > 0.7) {
      factors.push('符合您的偏好');
    }
    
    if (scores.progress_alignment > 0.7) {
      factors.push('适合您的学习进度');
    }
    
    return {
      summary: `基于${factors.join('、')}为您推荐`,
      factors: factors,
      confidence_explanation: this.getConfidenceExplanation(recommendation.confidence_score)
    };
  }

  getConfidenceLevel(score) {
    if (score >= ALGORITHM_CONFIG.MATCHING.PERFECT_MATCH_THRESHOLD) return 'perfect';
    if (score >= ALGORITHM_CONFIG.MATCHING.GOOD_MATCH_THRESHOLD) return 'good';
    if (score >= ALGORITHM_CONFIG.MATCHING.ACCEPTABLE_THRESHOLD) return 'acceptable';
    return 'low';
  }

  getMatchQuality(score) {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'fair';
    return 'poor';
  }

  getConfidenceExplanation(score) {
    if (score >= 0.9) return '我们非常确信这个推荐适合您';
    if (score >= 0.7) return '这个推荐很可能符合您的需求';
    if (score >= 0.5) return '这个推荐可能对您有帮助';
    return '这个推荐的匹配度较低';
  }

  /**
   * 生成详细解释
   */
  generateDetailedExplanation(recommendation, userProfile) {
    const factors = [];
    const scores = recommendation.enhanced_scores;
    
    if (scores.content_quality > 0.7) {
      factors.push('高质量内容');
    }
    
    if (scores.preference_match > 0.7) {
      factors.push('符合您的偏好');
    }
    
    if (scores.progress_alignment > 0.7) {
      factors.push('适合您的学习进度');
    }
    
    if (scores.multi_dimensional.adaptability > 0.6) {
      factors.push('良好的适应性');
    }
    
    return {
      summary: `基于${factors.join('、')}为您推荐`,
      factors: factors,
      confidence_explanation: this.getConfidenceExplanation(recommendation.confidence_score),
      learning_benefits: this.identifyLearningBenefits(recommendation, userProfile),
      potential_challenges: this.identifyPotentialChallenges(recommendation, userProfile)
    };
  }

  /**
   * 检查能力匹配
   */
  checkAbilityMatch(recommendation) {
    const difficulty = recommendation.enhanced_scores.progress_alignment || 0.5;
    const quality = recommendation.enhanced_scores.content_quality || 0.5;
    return (difficulty + quality) / 2;
  }

  /**
   * 计算学习影响
   */
  calculateLearningImpact(recommendation, userProfile) {
    const knowledgeGap = this.calculateKnowledgeGap(recommendation, userProfile);
    const skillImprovement = this.calculateSkillImprovement(recommendation, userProfile);
    
    return {
      knowledge_gain: knowledgeGap,
      skill_development: skillImprovement,
      overall_impact: (knowledgeGap + skillImprovement) / 2
    };
  }

  /**
   * 生成适应性建议
   */
  generateAdaptationSuggestions(recommendation, userProfile) {
    const suggestions = [];
    
    if (recommendation.enhanced_scores.multi_dimensional.cognitive_load > 0.8) {
      suggestions.push('建议分段学习，避免认知过载');
    }
    
    if (recommendation.enhanced_scores.progress_alignment < 0.5) {
      suggestions.push('可能需要先学习相关基础知识');
    }
    
    return suggestions;
  }

  /**
   * 识别学习收益
   */
  identifyLearningBenefits(recommendation, userProfile) {
    const benefits = [];
    
    if (recommendation.enhanced_scores.content_quality > 0.8) {
      benefits.push('高质量学习资源');
    }
    
    if (recommendation.enhanced_scores.multi_dimensional.relevance > 0.7) {
      benefits.push('高度相关的内容');
    }
    
    return benefits;
  }

  /**
   * 识别潜在挑战
   */
  identifyPotentialChallenges(recommendation, userProfile) {
    const challenges = [];
    
    if (recommendation.difficulty_level > 4) {
      challenges.push('内容难度较高');
    }
    
    if (recommendation.enhanced_scores.multi_dimensional.cognitive_load > 0.8) {
      challenges.push('认知负荷较重');
    }
    
    return challenges;
  }

  /**
   * 计算知识差距
   */
  calculateKnowledgeGap(recommendation, userProfile) {
    const knowledgeMap = userProfile.knowledge_map || {};
    const topicKey = this.getTopicKey(recommendation);
    const currentLevel = knowledgeMap[topicKey] || 0;
    const targetLevel = this.getDifficultyScore(recommendation);
    
    return Math.max(0, targetLevel - currentLevel);
  }

  /**
   * 计算技能提升
   */
  calculateSkillImprovement(recommendation, userProfile) {
    // 基于内容类型和用户当前技能水平计算预期提升
    const baseImprovement = 0.1;
    const difficultyBonus = (recommendation.difficulty_level || 3) * 0.02;
    const qualityBonus = recommendation.enhanced_scores.content_quality * 0.05;
    
    return Math.min(baseImprovement + difficultyBonus + qualityBonus, 0.3);
  }

  calculateLearningFrequency(history) {
    // 计算学习频率
    if (!history || history.length === 0) return 'low';
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentSessions = history.filter(session => 
      new Date(session.created_at) > oneWeekAgo
    );
    
    const frequency = recentSessions.length / 7; // 每天平均学习次数
    
    if (frequency > 1) return 'high';
    if (frequency > 0.5) return 'medium';
    return 'low';
  }

  calculatePreferredDifficulty(history) {
    // 计算偏好难度
    if (!history || history.length === 0) return 0.6;
    
    const difficultyScores = history
      .filter(h => h.difficulty_level)
      .map(h => h.difficulty_level / 5); // 标准化到0-1
    
    if (difficultyScores.length === 0) return 0.6;
    
    return difficultyScores.reduce((sum, score) => sum + score, 0) / difficultyScores.length;
  }

  calculateAverageSessionDuration(history) {
    // 计算平均学习时长
    if (!history || history.length === 0) return 30;
    
    const durations = history
      .filter(h => h.time_spent && h.time_spent > 0)
      .map(h => h.time_spent);
    
    if (durations.length === 0) return 30;
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  /**
   * 分析难度偏好
   */
  analyzeDifficultyPreference(history) {
    const avgDifficulty = this.calculatePreferredDifficulty(history);
    
    if (avgDifficulty < 0.4) return 'easy';
    if (avgDifficulty > 0.7) return 'hard';
    return 'medium';
  }

  /**
   * 分析学习高峰时间
   */
  analyzePeakLearningHours(history) {
    if (!history || history.length === 0) return [9, 14, 19];
    
    const hourCounts = {};
    
    history.forEach(session => {
      const hour = new Date(session.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  /**
   * 分析学习风格
   */
  analyzeLearningStyle(history) {
    if (!history || history.length === 0) return 'balanced';
    
    const contentTypes = {};
    
    history.forEach(session => {
      const type = session.content_type || 'text';
      contentTypes[type] = (contentTypes[type] || 0) + 1;
    });
    
    const totalSessions = history.length;
    const visualRatio = (contentTypes.visual || 0) / totalSessions;
    const practicalRatio = (contentTypes.practical || 0) / totalSessions;
    
    if (visualRatio > 0.6) return 'visual';
    if (practicalRatio > 0.6) return 'practical';
    return 'balanced';
  }

  // ============ 新增核心评分计算方法 ============

  /**
   * 计算多维度评分
   */
  computeMultiDimensionalScore(candidate, userProfile, baseScores) {
    const {
      contentQualityScore,
      preferenceScore,
      progressScore,
      socialScore,
      temporalScore
    } = baseScores;

    // 计算学习适应性评分
    const adaptabilityScore = this.calculateAdaptabilityScore(candidate, userProfile);
    
    // 计算认知负荷评分
    const cognitiveLoadScore = this.calculateCognitiveLoadScore(candidate, userProfile);
    
    // 计算个性化匹配评分
    const personalizationScore = this.calculatePersonalizationScore(candidate, userProfile);
    
    return {
      relevance: (contentQualityScore + preferenceScore) / 2,
      confidence: (progressScore + adaptabilityScore) / 2,
      priority: (socialScore + temporalScore) / 2,
      adaptability: adaptabilityScore,
      cognitive_load: cognitiveLoadScore,
      personalization: personalizationScore
    };
  }

  /**
   * 计算最终评分
   */
  computeFinalScore(multiDimensionalScores, overallScore) {
    const weights = {
      relevance: 0.3,
      confidence: 0.25,
      priority: 0.2,
      adaptability: 0.15,
      personalization: 0.1
    };

    const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (multiDimensionalScores[key] || 0) * weight;
    }, 0);

    // 结合原始综合评分
    return (weightedScore * 0.7) + (overallScore * 0.3);
  }

  /**
   * 生成评分解释
   */
  generateScoreExplanation(scores, candidate) {
    const explanations = [];
    
    if (scores.relevance > 0.8) {
      explanations.push('高度相关');
    }
    
    if (scores.confidence > 0.8) {
      explanations.push('高置信度匹配');
    }
    
    if (scores.adaptability > 0.7) {
      explanations.push('良好适应性');
    }
    
    return {
      summary: explanations.join('、') || '基础推荐',
      details: scores,
      reasoning: `基于多维度分析，该内容在相关性(${(scores.relevance * 100).toFixed(1)}%)、置信度(${(scores.confidence * 100).toFixed(1)}%)等方面表现良好`
    };
  }

  /**
   * 确定排序策略
   */
  determineSortingStrategy(userProfile) {
    const learningPatterns = userProfile.learning_patterns || {};
    const profileCompleteness = userProfile.profile_completeness || 0;
    
    if (profileCompleteness < 0.3) {
      return 'confidence_first';
    }
    
    if (learningPatterns.preferred_difficulty === 'adaptive') {
      return 'learning_curve';
    }
    
    if (learningPatterns.learning_frequency === 'high') {
      return 'relevance_first';
    }
    
    return 'balanced';
  }

  /**
   * 按置信度优先比较
   */
  compareByConfidenceFirst(a, b) {
    const confidenceDiff = b.confidence_score - a.confidence_score;
    if (Math.abs(confidenceDiff) > 0.1) {
      return confidenceDiff;
    }
    return b.enhanced_scores.final - a.enhanced_scores.final;
  }

  /**
   * 按相关性优先比较
   */
  compareByRelevanceFirst(a, b) {
    const relevanceDiff = b.enhanced_scores.multi_dimensional.relevance - a.enhanced_scores.multi_dimensional.relevance;
    if (Math.abs(relevanceDiff) > 0.1) {
      return relevanceDiff;
    }
    return b.enhanced_scores.final - a.enhanced_scores.final;
  }

  /**
   * 平衡比较
   */
  compareByBalanced(a, b) {
    const scoreA = (a.enhanced_scores.final + a.confidence_score + a.diversity_score) / 3;
    const scoreB = (b.enhanced_scores.final + b.confidence_score + b.diversity_score) / 3;
    return scoreB - scoreA;
  }

  /**
   * 按学习曲线比较
   */
  compareByLearningCurve(a, b, userProfile) {
    const adaptabilityA = a.enhanced_scores.multi_dimensional.adaptability;
    const adaptabilityB = b.enhanced_scores.multi_dimensional.adaptability;
    
    const adaptabilityDiff = adaptabilityB - adaptabilityA;
    if (Math.abs(adaptabilityDiff) > 0.1) {
      return adaptabilityDiff;
    }
    
    return b.enhanced_scores.final - a.enhanced_scores.final;
  }

  /**
   * 计算适应性评分
   */
  calculateAdaptabilityScore(candidate, userProfile) {
    const knowledgeMap = userProfile.knowledge_map || {};
    const candidateTopic = this.getTopicKey(candidate);
    const currentMastery = knowledgeMap[candidateTopic] || 0.5;
    
    const candidateDifficulty = this.getDifficultyScore(candidate);
    const optimalGap = Math.abs(candidateDifficulty - (currentMastery + 0.1));
    
    return Math.max(0, 1 - optimalGap * 2);
  }

  /**
   * 计算认知负荷评分
   */
  calculateCognitiveLoadScore(candidate, userProfile) {
    const learningPatterns = userProfile.learning_patterns || {};
    const sessionDuration = learningPatterns.session_duration || 30;
    
    // 基于内容复杂度和用户学习能力
    const contentComplexity = candidate.difficulty_level || 3;
    const userCapacity = Math.min(sessionDuration / 30, 2); // 标准化到2倍
    
    const loadRatio = contentComplexity / (userCapacity * 5);
    return Math.max(0, 1 - Math.abs(loadRatio - 0.7)); // 最优负荷为70%
  }

  /**
   * 计算个性化匹配评分
   */
  calculatePersonalizationScore(candidate, userProfile) {
    const preferences = userProfile.preference_weights || {};
    const learningStyle = userProfile.learning_style || {};
    
    let score = 0.5;
    
    // 基于学习风格匹配
    if (learningStyle.visual && candidate.content_type === 'visual') {
      score += 0.2;
    }
    
    if (learningStyle.practical && candidate.keywords?.includes('实践')) {
      score += 0.2;
    }
    
    // 基于偏好权重
    const preferenceMatch = Object.entries(preferences).reduce((sum, [key, weight]) => {
      if (candidate.topic_tags?.includes(key)) {
        return sum + Math.abs(weight) * 0.1;
      }
      return sum;
    }, 0);
    
    score += Math.min(preferenceMatch, 0.3);
    
    return Math.min(Math.max(score, 0), 1);
  }
}

// 导出单例实例
export const recommendationEngine = new RecommendationEngine();