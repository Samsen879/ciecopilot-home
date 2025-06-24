/**
 * Utility function to interact with OpenAI API through our backend endpoint
 * 
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Optional configuration
 * @returns {Promise<string>} - AI response content
 */
export const callOpenAI = async (messages, options = {}) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        ...options // Allow passing additional OpenAI parameters
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

/**
 * Simple helper for single message queries
 * 
 * @param {string} userMessage - User's message
 * @param {string} systemPrompt - Optional system prompt
 * @returns {Promise<string>} - AI response
 */
export const askAI = async (userMessage, systemPrompt = "You are a helpful AI assistant.") => {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];
  
  return await callOpenAI(messages);
};

/**
 * CIE-specific AI helper for educational content
 * 
 * @param {string} question - Student's question
 * @param {string} subject - Subject area (Math, Physics, Economics)
 * @returns {Promise<string>} - Educational AI response
 */
export const askCIETutor = async (question, subject = "General") => {
  const systemPrompt = `You are a specialized AI tutor for CIE (Cambridge International Education) students. 
  You help with ${subject} at A-Level standard. 
  Provide clear, step-by-step explanations that follow CIE curriculum guidelines. 
  Always identify key concepts and mark scheme points when relevant.
  Use proper academic language while remaining accessible to students.`;
  
  return await askAI(question, systemPrompt);
}; 