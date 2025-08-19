import { supabase } from '../../utils/supabase';
import { handleSupabaseQuery } from './errorHandler.js';

/**
 * 创建或更新学习路径
 * @param {Object} params - 学习路径参数
 * @param {string} params.pathId - 路径ID (可选，新建时自动生成)
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @param {Array} params.topicsSequence - 主题序列
 * @param {Object} params.adaptiveRules - 自适应规则
 * @param {number} params.estimatedCompletionMinutes - 预计完成时间(分钟)
 * @param {string} params.difficultyProgression - 难度进展 (TEXT字段)
 * @param {string} params.title - 路径标题 (可选)
 * @returns {Promise} 操作结果
 */
export async function upsertLearningPath({
	pathId,
	userId,
	subjectCode,
	topicsSequence,
	adaptiveRules,
	estimatedCompletionMinutes,
	difficultyProgression,
	title
}) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}
	
	if (!topicsSequence) {
		throw new Error('主题序列是必需的');
	}

	const pathData = {
		user_id: userId,
		subject_code: subjectCode,
		topics_sequence: topicsSequence,
		adaptive_rules: adaptiveRules || {},
		estimated_completion_time: estimatedCompletionMinutes || 0,
		difficulty_progression: difficultyProgression || '',
		title: title || `${subjectCode} 学习路径`,
		is_active: true,
		updated_at: new Date().toISOString()
	};

	// 如果提供了pathId，则包含在数据中
	if (pathId) {
		pathData.id = pathId;
	}

	return handleSupabaseQuery(
		() => supabase
			.from('learning_paths')
			.upsert(pathData, { onConflict: 'user_id,subject_code' })
			.select(),
		'upsertLearningPath'
	);
}

/**
 * 获取学习路径
 * @param {Object} params - 查询参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @returns {Promise} 学习路径
 */
export async function getLearningPath({ userId, subjectCode }) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('learning_paths')
			.select('*')
			.eq('user_id', userId)
			.eq('subject_code', subjectCode)
			.maybeSingle(),
		'getLearningPath'
	);
}

/**
 * 获取用户所有学习路径
 * @param {string} userId - 用户ID
 * @returns {Promise} 用户所有学习路径
 */
export async function getAllUserLearningPaths(userId) {
	if (!userId) {
		throw new Error('用户ID是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('learning_paths')
			.select('*')
			.eq('user_id', userId)
			.order('updated_at', { ascending: false }),
		'getAllUserLearningPaths'
	);
}

/**
 * 更新学习路径进度
 * @param {Object} params - 更新参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @param {Object} params.completionStatus - 完成状态
 * @param {number} params.progressPercentage - 进度百分比
 * @returns {Promise} 更新结果
 */
export async function updateLearningPathProgress({
	userId,
	subjectCode,
	completionStatus,
	progressPercentage
}) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}
	
	if (progressPercentage !== undefined && (progressPercentage < 0 || progressPercentage > 100)) {
		throw new Error('进度百分比必须在0-100之间');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('learning_paths')
			.update({
				completion_status: completionStatus,
				progress_percentage: progressPercentage,
				updated_at: new Date().toISOString()
			})
			.eq('user_id', userId)
			.eq('subject_code', subjectCode)
			.select(),
		'updateLearningPathProgress'
	);
}

/**
 * 删除学习路径
 * @param {Object} params - 删除参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.subjectCode - 学科代码
 * @returns {Promise} 删除结果
 */
export async function deleteLearningPath({ userId, subjectCode }) {
	if (!userId || !subjectCode) {
		throw new Error('用户ID和学科代码是必需的');
	}

	return handleSupabaseQuery(
		() => supabase
			.from('learning_paths')
			.delete()
			.eq('user_id', userId)
			.eq('subject_code', subjectCode),
		'deleteLearningPath'
	);
}



