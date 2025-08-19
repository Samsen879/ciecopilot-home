import { supabase } from '../../utils/supabase';
import { handleSupabaseQuery } from './errorHandler.js';

/**
 * 创建或更新用户学习档案
 * @param {Object} params - 用户学习档案参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @param {Object} params.studyTimePatterns - 学习时间模式
 * @param {string} params.knowledgeLevel - 知识水平
 * @param {Array} params.learningGoals - 学习目标
 * @param {number} params.preferredDifficulty - 偏好难度 (1-5)
 * @returns {Promise} 操作结果
 */
export async function upsertUserLearningProfile({
	userId,
	subjectCode,
	studyTimePatterns,
	knowledgeLevel,
	learningGoals,
	preferredDifficulty
}) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}
	
	if (preferredDifficulty && (preferredDifficulty < 1 || preferredDifficulty > 5)) {
		throw new Error('偏好难度必须在1-5之间');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('user_learning_profiles')
			.upsert({
				user_id: userId,
				subject_code: subjectCode,
				study_time_patterns: studyTimePatterns,
				knowledge_level: knowledgeLevel,
				learning_goals: learningGoals,
				preferred_difficulty: preferredDifficulty,
				updated_at: new Date().toISOString()
			}, { onConflict: 'user_id,subject_code' })
			.select(),
		'upsertUserLearningProfile'
	);
}

/**
 * 获取用户学习档案
 * @param {Object} params - 查询参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @returns {Promise} 用户学习档案
 */
export async function getUserLearningProfile({ userId, subjectCode }) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('user_learning_profiles')
			.select('*')
			.eq('user_id', userId)
			.eq('subject_code', subjectCode)
			.maybeSingle(),
		'getUserLearningProfile'
	);
}

/**
 * 获取用户所有学科的学习档案
 * @param {string} userId - 用户ID
 * @returns {Promise} 用户所有学习档案
 */
export async function getAllUserLearningProfiles(userId) {
	if (!userId) {
		throw new Error('用户ID是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('user_learning_profiles')
			.select('*')
			.eq('user_id', userId)
			.order('updated_at', { ascending: false }),
		'getAllUserLearningProfiles'
	);
}

/**
 * 删除用户学习档案
 * @param {Object} params - 删除参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @returns {Promise} 删除结果
 */
export async function deleteUserLearningProfile({ userId, subjectCode }) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('user_learning_profiles')
			.delete()
			.eq('user_id', userId)
			.eq('subject_code', subjectCode),
		'deleteUserLearningProfile'
	);
}



