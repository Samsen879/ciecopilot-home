import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const token = authHeader.substring(7);
		const { data: { user }, error: authError } = await supabase.auth.getUser(token);
		if (authError || !user) {
			return res.status(401).json({ error: 'Invalid token' });
		}

		const id = req.query?.id || req.url.split('/').slice(-2, -1)[0];

		const { error } = await supabase
			.from('community_notifications')
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq('id', id)
			.eq('user_id', user.id);

		if (error) {
			throw error;
		}

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error('Mark as read error:', error);
		return res.status(500).json({ error: 'Internal server error', message: error.message });
	}
}


