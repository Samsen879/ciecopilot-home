// Community notifications API (minimal implementation to avoid 404)

export default async function handler(req, res) {
	// CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	try {
		if (req.method === 'GET') {
			// Return empty notifications list for now
			return res.status(200).json([]);
		}

		return res.status(405).json({ error: 'Method not allowed' });
	} catch (error) {
		console.error('Notifications API error:', error);
		return res.status(500).json({ error: 'Internal server error', message: error.message });
	}
}


