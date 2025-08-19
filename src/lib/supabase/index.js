// Supabase查询模块统一导出

// 用户档案查询
export {
  upsertUserLearningProfile,
  getUserLearningProfile,
  getAllUserLearningProfiles,
  deleteUserLearningProfile
} from './userProfileQueries.js';

// 学习路径查询
export {
  upsertLearningPath,
  getLearningPath,
  getAllUserLearningPaths,
  updateLearningPathProgress,
  deleteLearningPath
} from './learningPathQueries.js';

// AI辅导查询
export {
  createAITutoringSession,
  updateAITutoringSession,
  getAITutoringSession,
  getUserAITutoringSessions,
  endAITutoringSession,
  getUserRecommendations,
  markRecommendationAsViewed,
  markRecommendationAsCompleted,
  getUserLearningAnalytics,
  createLearningAnalyticsEntry
} from './aiTutoringQueries.js';

// 错误处理
export {
  SupabaseError,
  ErrorTypes,
  mapSupabaseError,
  handleSupabaseQuery,
  withRetry,
  getUserFriendlyMessage
} from './errorHandler.js';

// 便捷的查询包装器
import { handleSupabaseQuery } from './errorHandler.js';
import * as userProfileQueries from './userProfileQueries.js';
import * as learningPathQueries from './learningPathQueries.js';
import * as aiTutoringQueries from './aiTutoringQueries.js';

/**
 * 包装所有查询函数，添加统一错误处理
 * 注意：由于查询函数已经内置了错误处理，这里提供的是直接访问接口
 */
const createModuleWrapper = (queryModule, moduleName) => {
  const wrapped = {};
  
  Object.keys(queryModule).forEach(key => {
    if (typeof queryModule[key] === 'function') {
      // 直接使用原函数，因为它们已经包含了错误处理
      wrapped[key] = queryModule[key];
    }
  });
  
  return wrapped;
};

// 导出包装后的查询模块
export const userProfile = createModuleWrapper(userProfileQueries, 'userProfile');
export const learningPath = createModuleWrapper(learningPathQueries, 'learningPath');
export const aiTutoring = createModuleWrapper(aiTutoringQueries, 'aiTutoring');

// 默认导出所有模块
export default {
  userProfile,
  learningPath,
  aiTutoring,
  ErrorTypes,
  SupabaseError,
  getUserFriendlyMessage
};