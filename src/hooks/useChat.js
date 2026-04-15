import { useState, useRef, useEffect, useCallback } from 'react';
import { ragApi } from '../api/ragApi';
import { appendUserMessage, prepareRetry } from './chatHistory.js';

export const useChat = (initialMessages = [], requestContext = {}) => {
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
  const messagesRef = useRef(messages);

  const setMessagesAndRef = useCallback((updater) => {
    setMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesRef.current = next;
      return next;
    });
  }, []);

  // Auto scroll to bottom when new message is added
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Call the current ask endpoint through the RAG compatibility adapter.
  const getAIResponse = useCallback(async (conversationMessages) => {
    try {
      const response = await ragApi.chat({
        messages: conversationMessages.map((message) => ({
          role: message.type === 'user' ? 'user' : 'assistant',
          content: message.content,
        })),
        ...requestContext,
      });

      if (typeof response?.answer !== 'string' || response.answer.length === 0) {
        throw new Error('AI回答格式异常，请重新提问。');
      }

      return response.answer || "抱歉，我无法生成回答，请重新提问。";
      
    } catch (error) {
      console.error('Error calling AI API:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error("网络连接问题，请检查网络后重试。");
      }
      
      // Return the error message (which should be user-friendly from API)
      throw new Error(error.message || "AI服务遇到问题，请稍后重试。");
    }
  }, [requestContext]);

  // Send a message
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;
    const baseMessages = Array.isArray(options.history) ? options.history : messagesRef.current;
    const nextMessages = appendUserMessage(baseMessages, content, new Date().toLocaleTimeString());
    setMessagesAndRef(nextMessages);
    setIsTyping(true);
    setError(null);

    try {
      const aiContent = await getAIResponse(nextMessages);
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessagesAndRef(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: error.message,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setMessagesAndRef(prev => [...prev, errorResponse]);
      setError(error.message);
    } finally {
      setIsTyping(false);
    }
  }, [getAIResponse, setMessagesAndRef]);

  // Clear chat history
  const clearMessages = useCallback(() => {
    const initial = [{
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI learning assistant. How can I help you with your CIE studies today?",
      timestamp: new Date().toLocaleTimeString()
    }];
    setMessagesAndRef(initial);
    setError(null);
  }, [setMessagesAndRef]);

  // Retry last message
  const retryLastMessage = useCallback(() => {
    const currentMessages = messagesRef.current;
    if (currentMessages.length < 2) return;

    const { retryContent, history } = prepareRetry(currentMessages);
    if (retryContent) {
      sendMessage(retryContent, { history });
    }
  }, [sendMessage]);

  // Add a message (useful for pre-filling questions)
  const addMessage = useCallback((message) => {
    const newMessage = {
      id: Date.now(),
      type: message.type || 'user',
      content: message.content,
      timestamp: new Date().toLocaleTimeString(),
      ...message
    };
    setMessagesAndRef(prev => [...prev, newMessage]);
  }, [setMessagesAndRef]);

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
