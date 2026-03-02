import { getServiceClient } from '../lib/supabase/client.js';
import {
  RECOMMENDATIONS_BACKEND_VERSION,
  normalizeStringArray,
  toArray,
  truncateText,
} from './lib/runtime.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const VALID_RECOMMENDATION_TYPES = new Set(['content', 'topic', 'learning_path']);
const POSITIVE_FEEDBACK = new Set(['like', 'helpful']);
const NEGATIVE_FEEDBACK = new Set(['dislike', 'not_relevant', 'too_easy', 'too_hard']);

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function daysSince(isoValue) {
  if (!isoValue) {
    return null;
  }
  const timestamp = new Date(isoValue).getTime();
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return Math.max((Date.now() - timestamp) / 86400000, 0);
}

function recencyScore(isoValue) {
  const ageDays = daysSince(isoValue);
  if (ageDays === null) {
    return 0.45;
  }
  if (ageDays <= 30) {
    return 1;
  }
  if (ageDays <= 180) {
    return 0.8;
  }
  if (ageDays <= 365) {
    return 0.6;
  }
  if (ageDays <= 730) {
    return 0.4;
  }
  return 0.2;
}

function normalizeProfile(profile, history = [], feedback = []) {
  const safeProfile = profile || {};
  const goalPreferences = safeProfile.goal_preferences || safeProfile.learning_goals || [];
  const interestKeywords = uniqueStrings([
    ...normalizeStringArray(safeProfile.weakness_areas),
    ...normalizeStringArray(safeProfile.strength_areas),
    ...normalizeStringArray(goalPreferences),
    ...normalizeStringArray(safeProfile.interests),
  ]);

  return {
    preferred_difficulty: numberOr(safeProfile.preferred_difficulty, 3),
    learning_pace: typeof safeProfile.learning_pace === 'string' ? safeProfile.learning_pace : 'medium',
    interest_keywords: interestKeywords,
    mastery_by_node: safeProfile.mastery_by_node || {},
    history,
    feedback,
  };
}

function extractPositiveFeedbackRatio(feedbackRows = []) {
  if (!feedbackRows.length) {
    return 0.5;
  }

  let positive = 0;
  let negative = 0;

  feedbackRows.forEach((row) => {
    const type = row?.feedback_type;
    if (POSITIVE_FEEDBACK.has(type)) {
      positive += 1;
      return;
    }
    if (NEGATIVE_FEEDBACK.has(type)) {
      negative += 1;
    }
  });

  const total = positive + negative;
  if (!total) {
    return 0.5;
  }

  return positive / total;
}

function difficultyMatch(candidateDifficulty, preferredDifficulty) {
  const difficulty = numberOr(candidateDifficulty, preferredDifficulty || 3);
  const preferred = numberOr(preferredDifficulty, 3);
  const delta = Math.abs(difficulty - preferred);
  return clamp(1 - (delta / 4));
}

function keywordCoverage(candidateTerms, userTerms) {
  if (!userTerms.length) {
    return 0.55;
  }

  const normalizedCandidate = candidateTerms.map((term) => String(term).toLowerCase());
  let hits = 0;

  userTerms.forEach((term) => {
    const normalized = String(term).toLowerCase();
    if (normalizedCandidate.some((candidate) => candidate.includes(normalized) || normalized.includes(candidate))) {
      hits += 1;
    }
  });

  return clamp(hits / userTerms.length);
}

function buildReasoning({ type, keywordScore, difficultyScore, noveltyScore, recency }) {
  const factors = [];

  if (keywordScore >= 0.65) {
    factors.push('goal_alignment');
  }
  if (difficultyScore >= 0.7) {
    factors.push('difficulty_fit');
  }
  if (noveltyScore >= 0.95) {
    factors.push('novel_content');
  }
  if (recency >= 0.75) {
    factors.push('recently_updated');
  }

  if (!factors.length) {
    factors.push('profile_baseline');
  }

  return {
    summary: `${type} recommendation ranked from profile fit and learning history.`,
    factors,
  };
}

function buildCandidateTerms(candidate) {
  return uniqueStrings([
    candidate.title,
    candidate.description,
    ...(toArray(candidate.keywords) || []),
    ...(toArray(candidate.topic_tags) || []),
    ...(toArray(candidate.learning_objectives) || []),
  ].filter(Boolean));
}

function sortRecommendations(left, right) {
  if (right.priority_score !== left.priority_score) {
    return right.priority_score - left.priority_score;
  }
  if (right.confidence_score !== left.confidence_score) {
    return right.confidence_score - left.confidence_score;
  }
  return String(left.title || '').localeCompare(String(right.title || ''));
}

export class RecommendationEngine {
  constructor({ supabaseFactory = getServiceClient } = {}) {
    this.supabaseFactory = supabaseFactory;
  }

  getClient() {
    return this.supabaseFactory();
  }

  async generateRecommendations({ userId, subjectCode, type = 'content', limit = DEFAULT_LIMIT, minConfidence = 0.4 }) {
    if (!VALID_RECOMMENDATION_TYPES.has(type)) {
      const error = new Error(`Unsupported recommendation type: ${type}`);
      error.code = 'INVALID_RECOMMENDATION_TYPE';
      throw error;
    }

    const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const normalizedMinConfidence = clamp(numberOr(minConfidence, 0.4), 0, 1);

    const [profileResult, historyResult, feedbackResult] = await Promise.all([
      this.getClient()
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .maybeSingle(),
      this.getClient()
        .from('user_learning_data')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_code', subjectCode)
        .order('created_at', { ascending: false })
        .limit(100),
      this.getClient()
        .from('recommendation_feedback')
        .select('feedback_type, rating, recommendation_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      throw profileResult.error;
    }
    if (historyResult.error) {
      throw historyResult.error;
    }
    if (feedbackResult.error) {
      throw feedbackResult.error;
    }

    const learningHistory = historyResult.data || [];
    const normalizedProfile = normalizeProfile(profileResult.data, learningHistory, feedbackResult.data || []);
    const candidates = await this.fetchCandidates({ subjectCode, type, limit: normalizedLimit * 3, learningHistory });
    const feedbackRatio = extractPositiveFeedbackRatio(normalizedProfile.feedback);

    const recommendations = candidates
      .map((candidate) => this.scoreCandidate({ candidate, normalizedProfile, feedbackRatio, type }))
      .filter((candidate) => candidate.confidence_score >= normalizedMinConfidence)
      .sort(sortRecommendations)
      .slice(0, normalizedLimit);

    return {
      items: recommendations,
      engine_version: RECOMMENDATIONS_BACKEND_VERSION,
      metadata: {
        candidate_count: candidates.length,
        returned_count: recommendations.length,
        min_confidence: normalizedMinConfidence,
      },
    };
  }

  async fetchCandidates({ subjectCode, type, limit, learningHistory }) {
    switch (type) {
      case 'content':
        return this.fetchContentCandidates(subjectCode, limit, learningHistory);
      case 'topic':
        return this.fetchTopicCandidates(subjectCode, limit, learningHistory);
      case 'learning_path':
        return this.fetchLearningPathCandidates(subjectCode, limit, learningHistory);
      default:
        return [];
    }
  }

  async fetchContentCandidates(subjectCode, limit, learningHistory) {
    const seenIds = new Set(
      learningHistory
        .map((row) => row.paper_id || row.content_id || row.target_id)
        .filter(Boolean),
    );

    const { data, error } = await this.getClient()
      .from('papers')
      .select('id, title, name, description, abstract, keywords, difficulty_level, citation_count, publication_date, updated_at, created_at, subject_code')
      .eq('subject_code', subjectCode)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || [])
      .filter((row) => !seenIds.has(row.id))
      .map((row) => ({
        recommendation_type: 'content',
        target_type: 'paper',
        target_id: row.id,
        title: row.title || row.name || 'Untitled paper',
        description: truncateText(row.abstract || row.description || null, 260),
        difficulty_level: row.difficulty_level,
        keywords: toArray(row.keywords),
        citation_count: row.citation_count,
        published_at: row.publication_date || row.updated_at || row.created_at || null,
        source_row: row,
      }));
  }

  async fetchTopicCandidates(subjectCode, limit, learningHistory) {
    const seenIds = new Set(
      learningHistory
        .map((row) => row.topic_id || row.target_id)
        .filter(Boolean),
    );

    const { data, error } = await this.getClient()
      .from('topics')
      .select('id, name, description, difficulty_level, learning_objectives, created_at, updated_at, subject_code')
      .eq('subject_code', subjectCode)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || [])
      .filter((row) => !seenIds.has(row.id))
      .map((row) => ({
        recommendation_type: 'topic',
        target_type: 'topic',
        target_id: row.id,
        title: row.name || 'Untitled topic',
        description: truncateText(row.description || null, 260),
        difficulty_level: row.difficulty_level,
        learning_objectives: toArray(row.learning_objectives),
        published_at: row.updated_at || row.created_at || null,
        source_row: row,
      }));
  }

  async fetchLearningPathCandidates(subjectCode, limit, learningHistory) {
    const seenIds = new Set(
      learningHistory
        .map((row) => row.path_id || row.target_id)
        .filter(Boolean),
    );

    const { data, error } = await this.getClient()
      .from('learning_paths')
      .select('id, name, path_name, description, difficulty_level, estimated_duration, estimated_completion_time, created_at, updated_at, subject_code')
      .eq('subject_code', subjectCode)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || [])
      .filter((row) => !seenIds.has(row.id))
      .map((row) => ({
        recommendation_type: 'learning_path',
        target_type: 'path',
        target_id: row.id,
        title: row.path_name || row.name || 'Untitled path',
        description: truncateText(row.description || null, 260),
        difficulty_level: row.difficulty_level,
        estimated_duration: row.estimated_duration || row.estimated_completion_time || null,
        published_at: row.updated_at || row.created_at || null,
        source_row: row,
      }));
  }

  scoreCandidate({ candidate, normalizedProfile, feedbackRatio, type }) {
    const userTerms = normalizedProfile.interest_keywords;
    const candidateTerms = buildCandidateTerms(candidate);
    const keywordScore = keywordCoverage(candidateTerms, userTerms);
    const difficultyScore = difficultyMatch(candidate.difficulty_level, normalizedProfile.preferred_difficulty);
    const noveltyScore = 1;
    const recency = recencyScore(candidate.published_at);
    const paceBonus = normalizedProfile.learning_pace === 'fast' ? 0.05 : 0;
    const citationSignal = clamp(numberOr(candidate.citation_count, 0) / 100);

    const confidenceScore = clamp(
      0.2 +
      (difficultyScore * 0.3) +
      (keywordScore * 0.25) +
      (feedbackRatio * 0.15) +
      (recency * 0.05) +
      paceBonus,
    );

    const relevanceScore = clamp(
      0.2 +
      (keywordScore * 0.45) +
      (noveltyScore * 0.15) +
      (recency * 0.1) +
      (citationSignal * 0.1),
    );

    const priorityScore = clamp(
      (confidenceScore * 0.45) +
      (relevanceScore * 0.35) +
      (noveltyScore * 0.1) +
      (recency * 0.1),
    );

    return {
      recommendation_type: candidate.recommendation_type,
      target_type: candidate.target_type,
      target_id: candidate.target_id,
      title: candidate.title,
      description: candidate.description,
      confidence_score: Number(confidenceScore.toFixed(4)),
      relevance_score: Number(relevanceScore.toFixed(4)),
      priority_score: Number(priorityScore.toFixed(4)),
      algorithm_version: RECOMMENDATIONS_BACKEND_VERSION,
      reasoning: buildReasoning({
        type,
        keywordScore,
        difficultyScore,
        noveltyScore,
        recency,
      }),
      metadata: {
        candidate_terms: candidateTerms,
        source_type: candidate.target_type,
        source_id: candidate.target_id,
        source_row: candidate.source_row,
      },
    };
  }
}

export const recommendationEngine = new RecommendationEngine();
export { VALID_RECOMMENDATION_TYPES };
