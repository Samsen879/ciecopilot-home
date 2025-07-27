import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, BookmarkPlus } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import ErrorBookButton from './ErrorBookButton';

const ChatWidget = ({ embedded = false }) => {
  const [isOpen, setIsOpen] = useState(embedded); // 如果是嵌入模式，默认打开
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  // Use the custom chat hook
  const {
    messages,
    isTyping,
    error,
    messagesEndRef,
    sendMessage,
    clearMessages,
    retryLastMessage
  } = useChat();

  // Focus input when chat opens
  useEffect(() => {
    if ((isOpen || embedded) && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isOpen, embedded]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Animation variants
  const buttonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    },
    hover: { 
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    },
    tap: { scale: 0.95 }
  };

  const chatWindowVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      x: 20,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      x: 20,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  // Render message content with error handling
  const renderMessage = (message) => (
    <div
      key={message.id}
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          message.type === 'user'
            ? 'bg-blue-500 text-white'
            : message.isError
            ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-700'
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-600'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        
        {/* Error Book Button for AI messages */}
        {message.type === 'ai' && !message.isError && message.content.length > 50 && (
          <div className="mt-3 flex justify-start">
            <ErrorBookButton
              question={messages.find((m, idx) => m.type === 'user' && idx < messages.indexOf(message))?.content || 'No question found'}
              userAnswer="User answer not provided"
              correctAnswer={message.content}
              topicId="current-chat"
              errorType="chat-interaction"
              className="text-xs"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${
            message.type === 'user' ? 'text-blue-100' : message.isError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {message.timestamp}
          </p>
          {message.isError && (
            <button
              onClick={retryLastMessage}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline ml-2"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // 如果是嵌入模式，直接返回聊天界面
  if (embedded) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(renderMessage)}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-2">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              className="flex-1 resize-none border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-colors duration-200"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600
                       text-white p-3 rounded-2xl transition-colors flex-shrink-0
                       disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          
          {/* Clear chat button */}
          {messages.length > 1 && (
            <div className="mt-2 text-center">
              <button
                onClick={clearMessages}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Clear chat
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 原有的浮动窗口模式
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            whileHover="hover"
            whileTap="tap"
            onClick={() => setIsOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-colors"
            aria-label="Open chat"
          >
            <MessageCircle size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={chatWindowVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-colors duration-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-semibold">AI Learning Assistant</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map(renderMessage)}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow-sm border border-gray-200 rounded-2xl px-4 py-2">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm 
                           bg-white text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-colors duration-200"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                           text-white p-2 rounded-xl transition-colors disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWidget; 