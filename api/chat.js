// /api/chat.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only POST requests are supported' 
    });
  }

  try {
    // Extract messages from request body
    const { messages } = req.body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Messages array is required and cannot be empty' 
      });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'OpenAI API key not configured' 
      });
    }

    // Call OpenAI Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview', // GPT-4 Turbo (latest stable version)
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    // Check if OpenAI API request was successful
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      
      return res.status(response.status).json({ 
        error: 'OpenAI API Error', 
        message: errorData.error?.message || 'Unknown OpenAI API error',
        type: errorData.error?.type || 'api_error'
      });
    }

    // Parse and return the successful response
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Server Error:', error);
    
    // Return generic error to client (don't expose internal details)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: 'An unexpected error occurred while processing your request'
    });
  }
}
