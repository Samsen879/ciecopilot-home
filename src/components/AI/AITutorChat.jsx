import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Brain, AlertTriangle, Lightbulb, Copy, Trash2, RefreshCw } from 'lucide-react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * AI Tutor Chat Component - 高级AI辅导聊天界面
 * 
 * 功能特性：
 * - 实时AI辅导对话
 * - 数学公式渲染 (KaTeX)
 * - 知识缺陷检测和展示
 * - 学习建议和提示
 * - 响应式设计
 * - 优雅的动画效果
 */
export default function AITutorChat({ 
  initialSubject = '9709', 
  onKnowledgeGapDetected,
  onLearningPathRequested,
  className = '' 
}) {
  // === 状态管理 ===
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是你的AI数学辅导老师。我可以帮助你理解CIE A-Level数学的各个概念，解答疑问，并识别你的知识薄弱点。请随时提问！',
      timestamp: new Date(),
      type: 'greeting'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTyping, setCurrentTyping] = useState('');
  const [knowledgeGaps, setKnowledgeGaps] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  
  // === Refs ===
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // === 效果 ===
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTyping]);
  
  useEffect(() => {
    // 聚焦输入框
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // === 辅助函数 ===
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderMathContent = (content) => {
    // 渲染数学公式和普通文本的混合内容
    try {
      // 查找并替换行内数学公式 $...$
      const inlineMath = content.replace(/\$([^$]+)\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula, { displayMode: false });
        } catch (e) {
          return match; // 如果渲染失败，返回原文本
        }
      });
      
      // 查找并替换块级数学公式 $$...$$
      const blockMath = inlineMath.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
        try {
          return `<div class="math-display">${katex.renderToString(formula, { displayMode: true })}</div>`;
        } catch (e) {
          return match;
        }
      });
      
      return blockMath;
    } catch (e) {
      console.error('Math rendering error:', e);
      return content;
    }
  };

  // === API 调用 ===
  const sendMessage = async (messageContent = input) => {
    if (!messageContent.trim() || isLoading) return;
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.trim(),
      timestamp: new Date(),
      type: 'user_question'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // 模拟打字效果
      setCurrentTyping('正在思考...');
      
      // 这里调用Agent B API client（带429处理）
      const { tutorChat } = await import('../../api/aiClient')
      let data
      try {
        data = await tutorChat({
          message: messageContent,
          context: {
            subject_code: initialSubject,
            previous_messages: messages.slice(-5),
            user_level: 'intermediate'
          }
        }, { signal: abortControllerRef.current.signal })
      } catch (e) {
        if (e.name === 'RateLimitError') {
          throw new Error(`请求过于频繁，请在 ${e.retryAfter} 秒后重试。`)
        }
        throw e
      }
      
      if (data.success) {
        const assistantMessage = {
          id: Date.now().toString() + '_assistant',
          role: 'assistant',
          content: data.response.content,
          timestamp: new Date(),
          type: 'ai_response',
          confidence: data.response.confidence,
          citations: data.response.citations || []
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // 处理知识缺陷检测
        if (data.knowledge_gaps && data.knowledge_gaps.length > 0) {
          setKnowledgeGaps(data.knowledge_gaps);
          onKnowledgeGapDetected?.(data.knowledge_gaps);
        }
        
        // 处理学习建议
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
        
      } else {
        throw new Error(data.error || '响应格式错误');
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Chat API error:', error);
        setError(error.message);
        
        // 添加错误消息
        const errorMessage = {
          id: Date.now().toString() + '_error',
          role: 'assistant',
          content: `抱歉，我遇到了技术问题：${error.message}\n\n请稍后再试，或者换个方式问问题。`,
          timestamp: new Date(),
          type: 'error',
          isError: true
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setCurrentTyping('');
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        // 可以添加复制成功的提示
        console.log('Message copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy message:', err);
      });
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '聊天记录已清空。有什么数学问题需要我帮助解答吗？',
        timestamp: new Date(),
        type: 'greeting'
      }
    ]);
    setKnowledgeGaps([]);
    setSuggestions([]);
    setError(null);
  };

  const retryLastMessage = () => {
    const lastUserMessage = messages.findLast(m => m.role === 'user');
    if (lastUserMessage) {
      // 移除最后的错误消息
      setMessages(prev => prev.filter(m => !m.isError));
      sendMessage(lastUserMessage.content);
    }
  };

  // === 快捷建议 ===
  const quickSuggestions = [
    '解释二次函数的性质',
    '如何求导数？',
    '三角函数的基本公式',
    '向量的运算规则',
    '概率的基本概念'
  ];

  // === 渲染 ===
  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI数学辅导老师</h3>
            <p className="text-sm text-gray-600">CIE A-Level Mathematics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={retryLastMessage}
            disabled={isLoading || !messages.some(m => m.isError)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="重试最后一条消息"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={clearChat}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="清空聊天记录"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 知识缺陷提示 */}
      <AnimatePresence>
        {knowledgeGaps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-amber-50 border-b border-amber-200"
          >
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">检测到知识薄弱点</p>
                <div className="mt-1 space-y-1">
                  {knowledgeGaps.slice(0, 2).map((gap, index) => (
                    <div key={index} className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded inline-block mr-2">
                      {gap.topic}
                    </div>
                  ))}
                  {knowledgeGaps.length > 2 && (
                    <span className="text-xs text-amber-700">+{knowledgeGaps.length - 2} 更多</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 学习建议 */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-green-50 border-b border-green-200"
          >
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">学习建议</p>
                <p className="text-xs text-green-700 mt-1">{suggestions[0]}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-2 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* 头像 */}
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-blue-100' 
                      : message.isError 
                        ? 'bg-red-100' 
                        : 'bg-gray-100'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Bot className={`w-4 h-4 ${message.isError ? 'text-red-600' : 'text-gray-600'}`} />
                    )}
                  </div>
                  
                  {/* 消息内容 */}
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-gray-50 border border-gray-200 text-gray-800'
                  }`}>
                    <div 
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: renderMathContent(message.content) 
                      }}
                    />
                    
                    {/* 置信度指示器 */}
                    {message.confidence && (
                      <div className="mt-2 flex items-center space-x-1">
                        <div className="text-xs text-gray-500">置信度:</div>
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${
                                i < Math.round(message.confidence * 5) ? 'bg-green-400' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 引用信息 */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 border-t border-gray-300 pt-2">
                        <div className="font-medium mb-1">参考资料:</div>
                        <ul className="space-y-1">
                          {message.citations.map((citation, index) => (
                            <li key={index} className="flex items-center space-x-1">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              <span>{citation.title} (p.{citation.page})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* 操作按钮 */}
                  {message.role === 'assistant' && !message.isError && (
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-all"
                      title="复制消息"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {/* 时间戳 */}
                <div className={`text-xs text-gray-400 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {message.timestamp.toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* 打字指示器 */}
        {currentTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gray-100 rounded-full">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="px-4 py-3 bg-gray-100 rounded-2xl">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600">{currentTyping}</span>
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 bg-gray-400 rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ 
                          duration: 1, 
                          repeat: Infinity, 
                          delay: i * 0.2 
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷建议 */}
      {messages.length === 1 && !isLoading && (
        <div className="px-4 pb-2">
          <div className="text-xs text-gray-500 mb-2">快捷提问:</div>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="输入你的数学问题... (支持 LaTeX 公式，如 $x^2 + y^2 = r^2$)"
              disabled={isLoading}
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
