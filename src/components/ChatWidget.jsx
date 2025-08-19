import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import ErrorBookButton from './ErrorBookButton';
import { useAIContext } from '../context/AIContext';
import { PureMultimodalInput } from './ui/multimodal-ai-chat-input';

const ChatWidget = ({ embedded = false }) => {
  const { contextSegments, clearContextSegments, isChatOpen, setIsChatOpen, panelWidth, setPanelWidth } = useAIContext();
  const [isOpen, setIsOpenLocal] = useState(embedded);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  // 面板调整大小状态
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);
  
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
    const open = embedded ? true : (typeof isChatOpen === 'boolean' ? isChatOpen : isOpen);
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isChatOpen, isOpen, embedded]);

  useEffect(() => {
    if (!embedded) setIsOpenLocal(isChatOpen);
  }, [isChatOpen, embedded]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const contextPrefix = contextSegments.length
      ? `Use the following selected context when answering. Keep citations concise.\n\n${contextSegments.map((s, i) => `[#${i+1}] ${s.title ? s.title + ': ' : ''}${s.text}`).join('\n\n')}\n\n---\nQuestion: `
      : '';
    const message = contextPrefix + inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  // 面板宽度调整功能
  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 280;
    const maxWidth = Math.min(800, window.innerWidth * 0.8);
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setPanelWidth(newWidth);
      localStorage.setItem('ai-chat-panel-width', newWidth.toString());
    }
  }, [isResizing, setPanelWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

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
          {contextSegments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 text-xs">
              <div className="font-semibold mb-1">Context attached ({contextSegments.length})</div>
              <ul className="list-disc ml-4 space-y-1 max-h-24 overflow-auto">
                {contextSegments.map((s, i) => (
                  <li key={s.id} className="truncate">[#${i+1}] {s.title || s.text.slice(0, 60)}</li>
                ))}
              </ul>
            </div>
          )}
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

  // 右侧抽屉式聊天面板（完全隐藏，只留触发按钮）
  const TRIGGER_BUTTON_SIZE = 48;
  const closedX = panelWidth; // 完全隐藏面板

  return (
    <>
      {/* 独立的触发按钮，面板关闭时显示 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => { setIsOpenLocal(true); setIsChatOpen(true); }}
            className="fixed top-1/2 right-4 -translate-y-1/2 z-50 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label="Open AI chat"
          >
            <MessageCircle size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 聊天面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: panelWidth, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: panelWidth, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed top-16 bottom-0 right-0 z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col"
            style={{ 
              width: `${panelWidth}px`,
              maxWidth: '92vw',
              willChange: 'transform'
            }}
          >
        {/* 左侧拖拽手柄 */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize transition-all duration-200 group ${
            isResizing ? 'bg-blue-500 w-3' : 'bg-transparent hover:bg-blue-200'
          }`}
          style={{ 
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
        >
          {/* 拖拽指示器 */}
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-12 bg-gray-300 group-hover:bg-blue-500 rounded-full transition-all duration-200 flex items-center justify-center shadow-sm ${
            isResizing ? 'bg-blue-600 scale-110' : 'opacity-60 group-hover:opacity-100'
          }`}>
            {/* 三个拖拽点 */}
            <div className="flex flex-col space-y-1">
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
          
          {/* 工具提示 */}
          {!isResizing && (
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              拖拽调整宽度
            </div>
          )}
        </div>

        {/* Header：更平的风格 */}
        <div className="bg-white text-gray-900 p-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bot size={18} />
            <span className="font-semibold text-sm">AI Learning Assistant</span>
          </div>
          <button
            onClick={() => { setIsOpenLocal(false); setIsChatOpen(false); }}
            className="hover:bg-gray-100 p-1 rounded-md"
            aria-label="Close chat"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
          {contextSegments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-2 text-xs">
              <div className="font-semibold mb-1">Context attached ({contextSegments.length})</div>
              <ul className="list-disc ml-4 space-y-1 max-h-20 overflow-auto">
                {contextSegments.map((s, i) => (
                  <li key={s.id} className="truncate">[#${i+1}] {s.title || s.text.slice(0, 50)}</li>
                ))}
              </ul>
            </div>
          )}
          {messages.map(renderMessage)}
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

        {/* 新的多模态输入区 */}
        <div className="p-3 border-t border-gray-200 bg-white">
          <PureMultimodalInput
            chatId="floating"
            messages={messages.map(m => ({ id: String(m.id), role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))}
            attachments={[]}
            setAttachments={() => {}}
            onSendMessage={({ input }) => sendMessage(input)}
            onStopGenerating={() => { /* No streaming stop in this hook */ }}
            isGenerating={isTyping}
            canSend={true}
            selectedVisibilityType="private"
          />
          {contextSegments.length > 0 && (
            <div className="mt-2 text-[11px] text-amber-700 flex items-center justify-between">
              <span>Context will be included in next question.</span>
              <button className="underline" onClick={clearContextSegments}>Clear context</button>
            </div>
          )}
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget; 