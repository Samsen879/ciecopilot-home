import { getServiceClient } from '../../lib/supabase/client.js';
import { applyCors, getRequestId, sendApiError } from '../lib/security.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_ANON_KEY ||
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_ANON_KEY;
const supabase = getServiceClient();

export default async function handler(req, res) {
	const requestId = getRequestId(req);
	res.setHeader('X-Request-Id', requestId);

	if (!applyCors(req, res, ['GET', 'OPTIONS'])) {
		return;
	}

	if (req.method !== 'GET') {
		return sendApiError(res, {
			status: 405,
			error: 'method_not_allowed',
			code: 'METHOD_NOT_ALLOWED',
			message: 'Method not allowed',
			requestId
		});
	}

	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return sendApiError(res, {
				status: 401,
				error: 'unauthorized',
				code: 'UNAUTHORIZED',
				message: 'Missing or invalid authorization header',
				requestId
			});
		}
		const token = authHeader.substring(7);
		const { data: { user }, error: authError } = await supabase.auth.getUser(token);
		if (authError || !user) {
			return sendApiError(res, {
				status: 401,
				error: 'invalid_token',
				code: 'INVALID_TOKEN',
				message: 'Invalid token',
				requestId
			});
		}

		const { count, error } = await supabase
			.from('community_notifications')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.eq('is_read', false);

		if (error) {
			throw error;
		}

		return res.status(200).json({ count: count || 0 });
	} catch (error) {
		console.error('Unread count error:', { request_id: requestId, error });
		return sendApiError(res, {
			status: 500,
			error: 'internal_server_error',
			code: 'INTERNAL_SERVER_ERROR',
			message: error?.message || 'Internal server error',
			requestId
		});
	}
}
