import { useState, useRef, useEffect, useCallback } from 'react';

export const useChat = (initialMessages = []) => {
  const [messages, setMessages] = useState(
    initialMessages.length > 0 ? initialMessages : [
      {
        id: 1,
        type: 'ai',
        content: "Hello! I'm your AI learning assistant. How can I help you with your CIE studies today?",
        timestamp: new Date().toLocaleTimeString()
      }
    ]
  );
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new message is added
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Call OpenAI API through our backend endpoint
  const getAIResponse = useCallback(async (userMessage) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are a specialized AI tutor for CIE (Cambridge International Education) students. You help with Mathematics, Physics, and Economics at A-Level standard. Provide clear, step-by-step explanations that follow CIE curriculum guidelines. Always identify key concepts and mark scheme points when relevant. When answering in Chinese, ensure mathematical terminology uses standard English terms in parentheses."
            },
            ...messages.slice(-5).map(msg => ({ // Include last 5 messages for context
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: "user",
              content: userMessage
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        
        // Use user-friendly error message if available
        const userMessage = errorData.userMessage || errorData.message || 'AI服务暂时不可用，请稍后重试。';
        throw new Error(userMessage);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('AI回答格式异常，请重新提问。');
      }
      
      return data.choices[0].message.content || "抱歉，我无法生成回答，请重新提问。";
      
    } catch (error) {
      console.error('Error calling AI API:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error("网络连接问题，请检查网络后重试。");
      }
      
      // Return the error message (which should be user-friendly from API)
      throw new Error(error.message || "AI服务遇到问题，请稍后重试。");
    }
  }, [messages]);

  // Send a message
  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    try {
      const aiContent = await getAIResponse(content.trim());
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: error.message,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setMessages(prev => [...prev, errorResponse]);
      setError(error.message);
    } finally {
      setIsTyping(false);
    }
  }, [getAIResponse]);

  // Clear chat history
  const clearMessages = useCallback(() => {
    setMessages([{
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI learning assistant. How can I help you with your CIE studies today?",
      timestamp: new Date().toLocaleTimeString()
    }]);
    setError(null);
  }, []);

  // Retry last message
  const retryLastMessage = useCallback(() => {
    if (messages.length < 2) return;
    
    const lastUserMessage = [...messages].reverse().find(msg => msg.type === 'user');
    if (lastUserMessage) {
      // Remove all messages after the last user message
      const lastUserIndex = messages.findIndex(msg => msg.id === lastUserMessage.id);
      setMessages(messages.slice(0, lastUserIndex + 1));
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  // Add a message (useful for pre-filling questions)
  const addMessage = useCallback((message) => {
    const newMessage = {
      id: Date.now(),
      type: message.type || 'user',
      content: message.content,
      timestamp: new Date().toLocaleTimeString(),
      ...message
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  return {
    // State
    messages,
    isTyping,
    error,
    messagesEndRef,
    
    // Actions
    sendMessage,
    clearMessages,
    retryLastMessage,
    addMessage,
    
    // Utilities
    scrollToBottom,
    hasMessages: messages.length > 1,
    lastMessage: messages[messages.length - 1],
    messageCount: messages.length
  };
}; 