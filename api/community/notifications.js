// Community notifications API - Supabase backed
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
	// CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	try {
		if (req.method !== 'GET') {
			return res.status(405).json({ error: 'Method not allowed' });
		}

		// Auth
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const token = authHeader.substring(7);
		const { data: { user }, error: authError } = await supabase.auth.getUser(token);
		if (authError || !user) {
			return res.status(401).json({ error: 'Invalid token' });
		}

		const { page = 1, limit = 20, only_unread } = req.query;
		const pageNum = Math.max(1, parseInt(page));
		const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
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

		return res.status(200).json(
			notifications || []
		);
	} catch (error) {
		console.error('Notifications API error:', error);
		return res.status(500).json({ error: 'Internal server error', message: error.message });
	}
}


