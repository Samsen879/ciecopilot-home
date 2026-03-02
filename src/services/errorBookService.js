import { supabase } from '../utils/supabase';
import { transformErrorBookRecord } from './errorBookTransform';
import { requireSessionAccessToken } from './utils/sessionAccessToken';

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Error Book API returned invalid JSON.');
  }
}

async function authorizedRequest(path, { method = 'GET', body } = {}) {
  const accessToken = await requireSessionAccessToken(supabase);
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    const error = new Error(payload?.message || 'Error Book request failed.');
    error.status = response.status;
    error.code = payload?.code || 'request_failed';
    error.details = payload?.details;
    throw error;
  }

  return payload;
}

function toListResult(payload) {
  return {
    items: Array.isArray(payload?.items) ? payload.items.map((item) => transformErrorBookRecord(item)) : [],
    meta: payload?.meta || {},
  };
}

export async function listErrorBookItems() {
  const payload = await authorizedRequest('/api/error-book');
  return toListResult(payload);
}

export async function createErrorBookItem(body) {
  const payload = await authorizedRequest('/api/error-book', {
    method: 'POST',
    body,
  });

  return {
    item: transformErrorBookRecord(payload?.item),
  };
}

export async function updateErrorBookItem(id, body) {
  const payload = await authorizedRequest(`/api/error-book/${id}`, {
    method: 'PATCH',
    body,
  });

  return {
    item: transformErrorBookRecord(payload?.item),
  };
}

export async function deleteErrorBookItem(id) {
  return authorizedRequest(`/api/error-book/${id}`, {
    method: 'DELETE',
  });
}
