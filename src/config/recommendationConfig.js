/**
 * Recommendation System Configuration
 * Central configuration for the personalized recommendation engine
 */

// 推荐算法配置
export const RECOMMENDATION_CONFIG = {
  // 模型权重配置
  MODEL_WEIGHTS: {
    performance: 0.3,      // 学习表现权重
    engagement: 0.25,      // 参与度权重
    difficulty: 0.2,       // 难度匹配权重
    recency: 0.15,         // 时效性权重
    similarity: 0.1        // 相似度权重
  },

  // 推荐参数
  RECOMMENDATION_PARAMS: {
    maxRecommendations: 10,     // 最大推荐数量
    diversityFactor: 0.3,       // 多样性因子
    confidenceThreshold: 0.5,   // 置信度阈值
    minInteractions: 5,         // 最小交互次数
    learningRateDecay: 0.95     // 学习率衰减
  },

  // 内容类型权重
  CONTENT_TYPE_WEIGHTS: {
    topics: 0.4,           // 学习主题
    exercises: 0.35,       // 练习题目
    materials: 0.25        // 学习资料
  },

  // 难度级别配置
  DIFFICULTY_LEVELS: {
    beginner: {
      label: '初级',
      range: [0, 0.3],
      color: '#10B981'
    },
    intermediate: {
      label: '中级',
      range: [0.3, 0.7],
      color: '#F59E0B'
    },
    advanced: {
      label: '高级',
      range: [0.7, 1.0],
      color: '#EF4444'
    }
  },

  // 学习风格配置
  LEARNING_STYLES: {
    visual: {
      label: '视觉型',
      preferences: ['图表', '图像', '视频'],
      weight: 0.25
    },
    auditory: {
      label: '听觉型',
      preferences: ['音频', '讲解', '讨论'],
      weight: 0.25
    },
    kinesthetic: {
      label: '动觉型',
      preferences: ['实践', '操作', '实验'],
      weight: 0.25
    },
    reading: {
      label: '阅读型',
      preferences: ['文本', '文档', '书籍'],
      weight: 0.25
    }
  },

  // 时间窗口配置
  TIME_WINDOWS: {
    recent: {
      label: '最近',
      days: 7,
      weight: 1.0
    },
    shortTerm: {
      label: '短期',
      days: 30,
      weight: 0.8
    },
    mediumTerm: {
      label: '中期',
      days: 90,
      weight: 0.6
    },
    longTerm: {
      label: '长期',
      days: 365,
      weight: 0.4
    }
  },

  // 行为类型权重
  BEHAVIOR_WEIGHTS: {
    view: 1.0,             // 查看内容
    click: 1.5,            // 点击推荐
    complete: 3.0,         // 完成学习
    like: 2.0,             // 点赞收藏
    share: 2.5,            // 分享内容
    search: 1.2,           // 搜索行为
    quiz_attempt: 2.0,     // 测验尝试
    quiz_complete: 3.5     // 测验完成
  },

  // 推荐类型配置
  RECOMMENDATION_TYPES: {
    content: {
      label: '内容推荐',
      description: '基于学习历史推荐相关内容',
      enabled: true,
      priority: 1
    },
    learningPath: {
      label: '学习路径',
      description: '个性化学习路径规划',
      enabled: true,
      priority: 2
    },
    studyPlan: {
      label: '学习计划',
      description: '智能学习计划安排',
      enabled: true,
      priority: 3
    },
    difficultyAdjustment: {
      label: '难度调整',
      description: '动态难度调整建议',
      enabled: true,
      priority: 4
    }
  },

  // 缓存配置
  CACHE_CONFIG: {
    userProfile: {
      ttl: 3600,           // 1小时
      maxSize: 1000
    },
    recommendations: {
      ttl: 1800,           // 30分钟
      maxSize: 500
    },
    behaviorPatterns: {
      ttl: 7200,           // 2小时
      maxSize: 200
    }
  },

  // 实验配置
  EXPERIMENT_CONFIG: {
    abTesting: {
      enabled: false,
      variants: {
        control: { weight: 0.5 },
        experimental: { weight: 0.5 }
      }
    },
    featureFlags: {
      advancedRecommendations: true,
      behaviorAnalytics: true,
      realTimeUpdates: true,
      crossSubjectRecommendations: false
    }
  },

  // 质量控制配置
  QUALITY_CONFIG: {
    minConfidenceScore: 0.3,
    maxStalenessHours: 24,
    diversityThreshold: 0.7,
    noveltyWeight: 0.2,
    popularityWeight: 0.1
  },

  // 性能配置
  PERFORMANCE_CONFIG: {
    batchSize: 50,
    maxConcurrentRequests: 10,
    timeoutMs: 5000,
    retryAttempts: 3,
    rateLimitPerMinute: 100
  }
};

// 科目特定配置
export const SUBJECT_CONFIGS = {
  MATH: {
    name: '数学',
    difficultyProgression: 'linear',
    prerequisiteWeight: 0.8,
    practiceRatio: 0.6,
    theoryRatio: 0.4,
    specialFeatures: ['step_by_step', 'formula_reference']
  },
  PHYSICS: {
    name: '物理',
    difficultyProgression: 'exponential',
    prerequisiteWeight: 0.9,
    practiceRatio: 0.5,
    theoryRatio: 0.5,
    specialFeatures: ['simulation', 'experiment_guide']
  },
  CHEMISTRY: {
    name: '化学',
    difficultyProgression: 'logarithmic',
    prerequisiteWeight: 0.7,
    practiceRatio: 0.4,
    theoryRatio: 0.6,
    specialFeatures: ['reaction_simulator', 'periodic_table']
  },
  BIOLOGY: {
    name: '生物',
    difficultyProgression: 'linear',
    prerequisiteWeight: 0.6,
    practiceRatio: 0.3,
    theoryRatio: 0.7,
    specialFeatures: ['diagram_analysis', 'case_studies']
  }
};

// 用户分群配置
export const USER_SEGMENTS = {
  beginner: {
    label: '初学者',
    criteria: {
      totalSessions: { max: 10 },
      averageScore: { max: 0.6 },
      timeSpent: { max: 3600 } // 1小时
    },
    recommendations: {
      focusOnBasics: true,
      maxDifficulty: 0.4,
      encouragementLevel: 'high'
    }
  },
  intermediate: {
    label: '中级学习者',
    criteria: {
      totalSessions: { min: 10, max: 50 },
      averageScore: { min: 0.6, max: 0.8 },
      timeSpent: { min: 3600, max: 18000 } // 1-5小时
    },
    recommendations: {
      balancedContent: true,
      maxDifficulty: 0.7,
      challengeLevel: 'moderate'
    }
  },
  advanced: {
    label: '高级学习者',
    criteria: {
      totalSessions: { min: 50 },
      averageScore: { min: 0.8 },
      timeSpent: { min: 18000 } // 5小时以上
    },
    recommendations: {
      advancedContent: true,
      maxDifficulty: 1.0,
      challengeLevel: 'high'
    }
  }
};

// 推荐策略配置
export const RECOMMENDATION_STRATEGIES = {
  collaborative: {
    name: '协同过滤',
    weight: 0.4,
    description: '基于相似用户的推荐',
    enabled: true
  },
  contentBased: {
    name: '基于内容',
    weight: 0.3,
    description: '基于内容特征的推荐',
    enabled: true
  },
  hybrid: {
    name: '混合推荐',
    weight: 0.2,
    description: '结合多种策略的推荐',
    enabled: true
  },
  knowledgeBased: {
    name: '基于知识',
    weight: 0.1,
    description: '基于领域知识的推荐',
    enabled: false
  }
};

// 评估指标配置
export const EVALUATION_METRICS = {
  accuracy: {
    name: '准确率',
    weight: 0.3,
    threshold: 0.7
  },
  diversity: {
    name: '多样性',
    weight: 0.2,
    threshold: 0.6
  },
  novelty: {
    name: '新颖性',
    weight: 0.2,
    threshold: 0.5
  },
  coverage: {
    name: '覆盖率',
    weight: 0.15,
    threshold: 0.8
  },
  serendipity: {
    name: '意外发现',
    weight: 0.15,
    threshold: 0.3
  }
};

// 默认配置获取函数
export const getDefaultConfig = () => {
  return {
    ...RECOMMENDATION_CONFIG,
    subjects: SUBJECT_CONFIGS,
    userSegments: USER_SEGMENTS,
    strategies: RECOMMENDATION_STRATEGIES,
    metrics: EVALUATION_METRICS
  };
};

// 配置验证函数
export const validateConfig = (config) => {
  const errors = [];
  
  // 验证权重总和
  const weightSum = Object.values(config.MODEL_WEIGHTS || {}).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    errors.push('模型权重总和应该等于1.0');
  }
  
  // 验证参数范围
  const params = config.RECOMMENDATION_PARAMS || {};
  if (params.diversityFactor < 0 || params.diversityFactor > 1) {
    errors.push('多样性因子应该在0-1之间');
  }
  
  if (params.confidenceThreshold < 0 || params.confidenceThreshold > 1) {
    errors.push('置信度阈值应该在0-1之间');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 配置更新函数
export const updateConfig = (updates) => {
  const newConfig = {
    ...RECOMMENDATION_CONFIG,
    ...updates
  };
  
  const validation = validateConfig(newConfig);
  if (!validation.isValid) {
    throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
  }
  
  return newConfig;
};

export default RECOMMENDATION_CONFIG;