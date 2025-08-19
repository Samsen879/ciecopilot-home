// Lightweight API client for Agent B endpoints with unified error and 429 handling

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function postJson(path, body, init = {}) {
	const url = `${API_BASE_URL}${path}`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(init.headers || {})
		},
		body: JSON.stringify(body),
		...init
	});

	let data = null;
	try {
		data = await response.json();
	} catch (_) {
		// ignore JSON parse errors; will be handled by status
	}

	if (!response.ok) {
		// Standardized 429 contract (retryAfter in seconds)
		if (response.status === 429) {
			const retryAfterHeader = response.headers.get('Retry-After');
			const retryAfter = Number(data?.retryAfter ?? retryAfterHeader ?? 0);
			const error = new Error(data?.message || 'Rate limit exceeded');
			error.name = 'RateLimitError';
			error.retryAfter = Number.isFinite(retryAfter) ? retryAfter : 0;
			throw error;
		}

		const error = new Error(data?.message || `HTTP ${response.status}`);
		error.status = response.status;
		error.details = data || null;
		throw error;
	}

	return data;
}

export async function tutorChat(payload, init) {
	return postJson('/api/ai/tutor/chat', payload, init);
}

export async function generateLearningPath(payload, init) {
	return postJson('/api/ai/learning/path-generator', payload, init);
}

export function getStreamSupportHeader(headers) {
	// Case-insensitive header access for x-stream-support
	for (const [key, value] of headers.entries()) {
		if (key.toLowerCase() === 'x-stream-support') return value;
	}
	return null;
}

export default { tutorChat, generateLearningPath, getStreamSupportHeader };



