// Community notifications API - Supabase backed
import { getServiceClient } from '../lib/supabase/client.js';
import {
	applyCors,
	getRequestId,
	isCommunityRoleAllowed,
	sanitizePlainText,
	sanitizeSafeUrl,
	sendApiError,
	toPositiveInt
} from './lib/security.js';

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

	if (!applyCors(req, res, ['GET', 'POST', 'OPTIONS'])) {
		return;
	}

	try {
		// Auth
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

		if (req.method === 'GET') {
			const { page = 1, limit = 20, only_unread } = req.query;
			const pageNum = toPositiveInt(page, 1, 1, Number.MAX_SAFE_INTEGER);
			const limitNum = toPositiveInt(limit, 20, 1, 100);
			const from = (pageNum - 1) * limitNum;
			const to = from + limitNum - 1;

			let query = supabase
				.from('community_notifications')
				.select('id, notification_type, title, message, link_url, metadata, is_read, read_at, created_at')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.range(from, to);

			if (only_unread === 'true') {
				query = query.eq('is_read', false);
			}

			const { data: notifications, error } = await query;
			if (error) {
				throw error;
			}

			return res.status(200).json(notifications || []);
		}

		if (req.method === 'POST') {
			const canManageNotifications = await isCommunityRoleAllowed(supabase, user.id, ['admin', 'moderator']);
			if (!canManageNotifications) {
				return sendApiError(res, {
					status: 403,
					error: 'insufficient_permissions',
					code: 'INSUFFICIENT_PERMISSIONS',
					message: 'Insufficient permissions',
					requestId
				});
			}

			const {
				user_id = user.id,
				notification_type = 'general',
				title = '',
				message = '',
				link_url = null,
				metadata = {}
			} = req.body || {};

			const targetUserId = sanitizePlainText(user_id, 80);
			const sanitizedType = sanitizePlainText(notification_type, 40).toLowerCase() || 'general';
			const sanitizedTitle = sanitizePlainText(title, 200);
			const sanitizedMessage = sanitizePlainText(message, 4000);
			const sanitizedLink = sanitizeSafeUrl(link_url);
			const { data, error } = await supabase
				.from('community_notifications')
				.insert({
					user_id: targetUserId,
					notification_type: sanitizedType,
					title: sanitizedTitle,
					message: sanitizedMessage,
					link_url: sanitizedLink,
					metadata
				})
				.select('id')
				.single();

			if (error) {
				throw error;
			}

			return res.status(201).json({ success: true, id: data.id });
		}

		return sendApiError(res, {
			status: 405,
			error: 'method_not_allowed',
			code: 'METHOD_NOT_ALLOWED',
			message: 'Method not allowed',
			requestId
		});
	} catch (error) {
		console.error('Notifications API error:', { request_id: requestId, error });
		return sendApiError(res, {
			status: 500,
			error: 'internal_server_error',
			code: 'INTERNAL_SERVER_ERROR',
			message: error?.message || 'Internal server error',
			requestId
		});
	}
}
