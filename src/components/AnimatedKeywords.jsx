import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedKeywords = () => {
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [isNewUser, setIsNewUser] = useState(true);

  // 新用户关键词池
  const newUserKeywords = [
    "Affordable, high-quality, modular.",
    "Fast progress, efficient learning.",
    "Instantly analyze your mistakes.",
    "Personalized AI tutoring, just for you.",
    "Real exam strategies, not just knowledge.",
    "Data-driven learning feedback.",
    "Your success, our mission."
  ];

  // 老用户关键词池
  const returningUserKeywords = [
    "Ready to unlock your potential today?",
    "Let's keep the momentum going.",
    "Stay curious, stay unstoppable.",
    "Need a quick recap? I'm here for you."
  ];

  // 根据用户身份选择关键词池和切换间隔
  const keywords = isNewUser ? newUserKeywords : returningUserKeywords;
  const switchInterval = isNewUser ? 2500 : 4000; // 新用户2.5秒，老用户4秒

  // 检查用户身份
  useEffect(() => {
    const hasVisited = localStorage.getItem('visited');
    if (hasVisited) {
      setIsNewUser(false);
    } else {
      // 标记用户已访问
      localStorage.setItem('visited', 'true');
      setIsNewUser(true);
    }
  }, []);

  // 自动切换关键词
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentKeywordIndex((prevIndex) => 
        (prevIndex + 1) % keywords.length
      );
    }, switchInterval);

    return () => clearInterval(timer);
  }, [keywords.length, switchInterval]);

  // 动画配置
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const textVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.8,
      y: 10
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      y: -10,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className="flex justify-center items-center min-h-[80px] my-6"
    >
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentKeywordIndex}
            variants={textVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <p className="text-lg md:text-xl lg:text-2xl font-medium text-blue-700 max-w-3xl mx-auto leading-relaxed px-4">
              {keywords[currentKeywordIndex]}
            </p>
            
            {/* 装饰元素 */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "60px" }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 mx-auto mt-3 rounded-full"
            />
          </motion.div>
        </AnimatePresence>
        
        {/* 进度指示器 */}
        <div className="flex justify-center mt-4 space-x-1">
          {keywords.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentKeywordIndex 
                  ? 'bg-blue-500 scale-125' 
                  : 'bg-blue-200 hover:bg-blue-300'
              }`}
              whileHover={{ scale: 1.2 }}
              onClick={() => setCurrentKeywordIndex(index)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AnimatedKeywords; 