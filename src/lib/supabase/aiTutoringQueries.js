import { supabase } from '../../utils/supabase';
import { handleSupabaseQuery } from './errorHandler.js';

/**
 * 创建AI辅导会话
 * @param {Object} params - 会话参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @param {string} params.topicId - 主题ID (可选)
 * @param {string} params.sessionType - 会话类型
 * @param {string} params.initialQuery - 初始查询
 * @returns {Promise} 创建的会话
 */
export async function createAITutoringSession({
	userId,
	subjectCode,
	topicId = null,
	sessionType = 'general',
	initialQuery
}) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}
	
	if (!initialQuery) {
		throw new Error('初始查询是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('ai_tutoring_sessions')
			.insert({
				user_id: userId,
				subject_code: subjectCode,
				topic_id: topicId,
				session_type: sessionType,
				initial_query: initialQuery,
				status: 'active'
			})
			.select()
			.single(),
		'createAITutoringSession'
	);
}

/**
 * 更新AI辅导会话
 * @param {string} sessionId - 会话ID
 * @param {Object} updates - 更新数据
 * @returns {Promise} 更新的会话
 */
export async function updateAITutoringSession(sessionId, updates) {
	if (!sessionId) {
		throw new Error('会话ID是必需的');
	}
	
	if (!updates || Object.keys(updates).length === 0) {
		throw new Error('更新数据不能为空');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('ai_tutoring_sessions')
			.update({
				...updates,
				updated_at: new Date().toISOString()
			})
			.eq('id', sessionId)
			.select()
			.single(),
		'updateAITutoringSession'
	);
}

/**
 * 获取AI辅导会话
 * @param {string} sessionId - 会话ID
 * @returns {Promise} 会话详情
 */
export async function getAITutoringSession(sessionId) {
	if (!sessionId) {
		throw new Error('会话ID是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('ai_tutoring_sessions')
			.select('*')
			.eq('id', sessionId)
			.single(),
		'getAITutoringSession'
	);
}

/**
 * 获取用户的AI辅导会话列表
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {number} options.limit - 限制数量
 * @param {number} options.offset - 偏移量
 * @returns {Promise} 会话列表
 */
export async function getUserAITutoringSessions(userId, { limit = 10, offset = 0 } = {}) {
	if (!userId) {
		throw new Error('用户ID是必需的');
	}
	
	if (limit < 1 || limit > 100) {
		throw new Error('限制数量必须在1-100之间');
	}
	
	if (offset < 0) {
		throw new Error('偏移量不能为负数');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('ai_tutoring_sessions')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1),
		'getUserAITutoringSessions'
	);
}

/**
 * 结束AI辅导会话
 * @param {string} sessionId - 会话ID
 * @param {string} summary - 会话总结 (可选)
 * @returns {Promise} 更新的会话
 */
export async function endAITutoringSession(sessionId, summary = null) {
	if (!sessionId) {
		throw new Error('会话ID是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('ai_tutoring_sessions')
			.update({
				status: 'completed',
				session_summary: summary,
				ended_at: new Date().toISOString()
			})
			.eq('id', sessionId)
			.select()
			.single(),
		'endAITutoringSession'
	);
}

/**
 * 获取用户推荐内容
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {string} options.subjectCode - 学科代码 (可选)
 * @param {number} options.limit - 限制数量
 * @returns {Promise} 推荐列表
 */
export async function getUserRecommendations(userId, { subjectCode = null, limit = 5 } = {}) {
	if (!userId) {
		throw new Error('用户ID是必需的');
	}
	
	if (limit < 1 || limit > 100) {
		throw new Error('限制数量必须在1-100之间');
	}

	return handleSupabaseQuery(
		() => {
			let query = supabase
				.from('personalized_recommendations')
				.select('*')
				.eq('user_id', userId)
				.eq('is_active', true)
				.order('priority_score', { ascending: false })
				.limit(limit);

			if (subjectCode) {
				query = query.eq('subject_code', subjectCode);
			}

			return query;
		},
		'getUserRecommendations'
	);
}

/**
 * 标记推荐为已查看
 * @param {string} recommendationId - 推荐ID
 * @returns {Promise} 更新结果
 */
export async function markRecommendationAsViewed(recommendationId) {
	if (!recommendationId) {
		throw new Error('推荐ID是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('personalized_recommendations')
			.update({ 
				is_viewed: true,
				viewed_at: new Date().toISOString()
			})
			.eq('id', recommendationId),
		'markRecommendationAsViewed'
	);
}

/**
 * 标记推荐为已完成
 * @param {string} recommendationId - 推荐ID
 * @returns {Promise} 更新结果
 */
export async function markRecommendationAsCompleted(recommendationId) {
	if (!recommendationId) {
		throw new Error('推荐ID是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('personalized_recommendations')
			.update({ 
				is_active: false,
				completed_at: new Date().toISOString()
			})
			.eq('id', recommendationId),
		'markRecommendationAsCompleted'
	);
}

/**
 * 获取用户学习分析数据
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {string} options.subjectCode - 学科代码 (可选)
 * @param {string} options.timeRange - 时间范围 (可选)
 * @returns {Promise} 学习分析数据
 */
export async function getUserLearningAnalytics(userId, { subjectCode = null, timeRange = '30d' } = {}) {
	if (!userId) {
		throw new Error('用户ID是必需的');
	}
	
	const validTimeRanges = ['7d', '30d', '90d'];
	if (!validTimeRanges.includes(timeRange)) {
		throw new Error('时间范围必须是7d、30d或90d之一');
	}

	return handleSupabaseQuery(
		() => {
			let query = supabase
				.from('learning_analytics')
				.select('*')
				.eq('user_id', userId);

			if (subjectCode) {
				query = query.eq('subject_code', subjectCode);
			}

			// 根据时间范围过滤
			const startDate = new Date();
			switch (timeRange) {
				case '7d':
					startDate.setDate(startDate.getDate() - 7);
					break;
				case '30d':
					startDate.setDate(startDate.getDate() - 30);
					break;
				case '90d':
					startDate.setDate(startDate.getDate() - 90);
					break;
			}

			return query
				.gte('created_at', startDate.toISOString())
				.order('created_at', { ascending: false });
		},
		'getUserLearningAnalytics'
	);
}

/**
 * 创建学习分析记录
 * @param {Object} params - 分析记录参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @param {string} params.topicId - 主题ID (可选)
 * @param {string} params.analyticsType - 分析类型
 * @param {Object} params.analyticsData - 分析数据
 * @returns {Promise} 创建的记录
 */
export async function createLearningAnalyticsEntry({
	userId,
	subjectCode,
	topicId = null,
	analyticsType,
	analyticsData
}) {
	if (!userId || !subjectCode || !analyticsType) {
		throw new Error('用户ID、学科代码和分析类型是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('learning_analytics')
			.insert({
				user_id: userId,
				subject_code: subjectCode,
				topic_id: topicId,
				analytics_type: analyticsType,
				analytics_data: analyticsData
			})
			.select()
			.single(),
		'createLearningAnalyticsEntry'
	);
}