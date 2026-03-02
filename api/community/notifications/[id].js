import { getServiceClient } from '../../lib/supabase/client.js';
import { applyCors, getRequestId, sanitizePlainText, sendApiError } from '../lib/security.js';

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

	if (!applyCors(req, res, ['DELETE', 'OPTIONS'])) {
		return;
	}

	if (req.method !== 'DELETE') {
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

		const id = sanitizePlainText(req.query?.id, 80);
		if (!id) {
			return sendApiError(res, {
				status: 400,
				error: 'invalid_id',
				code: 'INVALID_ID',
				message: 'Notification id is required',
				requestId
			});
		}
		const { error } = await supabase
			.from('community_notifications')
			.delete()
			.eq('id', id)
			.eq('user_id', user.id);

		if (error) {
			throw error;
		}

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error('Delete notification error:', { request_id: requestId, error });
		return sendApiError(res, {
			status: 500,
			error: 'internal_server_error',
			code: 'INTERNAL_SERVER_ERROR',
			message: error?.message || 'Internal server error',
			requestId
		});
	}
}

