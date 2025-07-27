// /api/chat.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only POST requests are supported',
      userMessage: '请求方法不支持，请联系技术支持。'
    });
  }

  try {
    // Extract messages from request body
    const { messages } = req.body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Messages array is required and cannot be empty',
        userMessage: '请输入有效的问题后再提交。'
      });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'OpenAI API key not configured',
        userMessage: 'AI服务暂时不可用，请稍后重试或联系技术支持。'
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
      
      // Handle specific OpenAI error types
      let userMessage = 'AI服务遇到问题，请稍后重试。';
      
      if (response.status === 429) {
        userMessage = '当前使用人数较多，请稍等片刻后重试。';
      } else if (response.status === 401) {
        userMessage = 'AI服务认证失败，请联系技术支持。';
      } else if (response.status === 500) {
        userMessage = 'AI服务暂时不可用，请稍后重试。';
      }
      
      return res.status(response.status).json({ 
        error: 'OpenAI API Error', 
        message: errorData.error?.message || 'Unknown OpenAI API error',
        type: errorData.error?.type || 'api_error',
        userMessage: userMessage
      });
    }

    // Parse the response
    const data = await response.json();
    
    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'OpenAI returned an invalid response structure',
        userMessage: 'AI回答格式异常，请重新提问。'
      });
    }

    // Return successful response
    return res.status(200).json(data);

  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(503).json({
        error: 'Network error',
        message: 'Failed to connect to OpenAI API',
        userMessage: '网络连接问题，请检查网络后重试。'
      });
    }
    
    // Handle other unexpected errors
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message || 'An unexpected error occurred',
      userMessage: '系统遇到未知错误，请稍后重试或联系技术支持。'
    });
  }
}
