import { getServiceClient } from '../../../lib/supabase/client.js';
import { applyCors, getRequestId, sanitizePlainText, sendApiError } from '../../lib/security.js';

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

	if (!applyCors(req, res, ['POST', 'OPTIONS'])) {
		return;
	}

	if (req.method !== 'POST') {
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

		const { data: existingNotification, error: existingError } = await supabase
			.from('community_notifications')
			.select('id, is_read, read_at')
			.eq('id', id)
			.eq('user_id', user.id)
			.maybeSingle();

		if (existingError) {
			throw existingError;
		}

		if (!existingNotification?.id) {
			return sendApiError(res, {
				status: 404,
				error: 'notification_not_found',
				code: 'NOTIFICATION_NOT_FOUND',
				message: 'Notification not found',
				requestId
			});
		}

		if (existingNotification.is_read) {
			return res.status(200).json({
				success: true,
				already_read: true,
				read_at: existingNotification.read_at || null
			});
		}

		const { data, error } = await supabase
			.from('community_notifications')
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq('id', id)
			.eq('user_id', user.id)
			.eq('is_read', false)
			.select('id, read_at')
			.maybeSingle();

		if (error) {
			throw error;
		}

		if (!data?.id) {
			return res.status(200).json({
				success: true,
				already_read: true,
				read_at: existingNotification.read_at || null
			});
		}

		return res.status(200).json({ success: true, read_at: data.read_at || null });
	} catch (error) {
		console.error('Mark as read error:', { request_id: requestId, error });
		return sendApiError(res, {
			status: 500,
			error: 'internal_server_error',
			code: 'INTERNAL_SERVER_ERROR',
			message: error?.message || 'Internal server error',
			requestId
		});
	}
}

