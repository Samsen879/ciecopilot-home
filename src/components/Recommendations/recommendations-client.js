import { supabase } from '../../utils/supabase';
import { requireSessionAccessToken } from '../../services/utils/sessionAccessToken.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function buildUrl(path, query = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

async function parseApiResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message ||
      payload?.message ||
      `HTTP ${response.status}`,
    );
    error.status = response.status;
    error.code = payload?.error?.code || payload?.code || 'request_failed';
    error.details = payload?.error?.details || payload || null;
    throw error;
  }

  return payload;
}

export async function fetchRecommendations({
  subjectCode,
  type = 'content',
  limit = 6,
  minConfidence = 0.4,
  refresh = false,
  signal,
} = {}) {
  if (!subjectCode) {
    throw new Error('subjectCode is required');
  }

  const accessToken = await requireSessionAccessToken(supabase);
  const response = await fetch(buildUrl('/api/recommendations', {
    subject_code: subjectCode,
    type,
    limit,
    min_confidence: minConfidence,
    refresh,
  }), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  return parseApiResponse(response);
}
