import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BookOpen, Calculator, Atom, TrendingUp, ArrowDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedKeywords from './AnimatedKeywords';

const SimpleHeroSection = () => {
  const { text } = useTheme();
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 视差效果
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // 鼠标移动效果
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20;
    const y = (clientY / window.innerHeight - 0.5) * 20;
    setMousePosition({ x, y });
  };

  // A Level学习元素动画
  const LearningElements = () => (
    <>
      {/* 浮动的数学公式 */}
      {[
        { formula: "∫ x² dx", x: "15%", y: "20%", delay: 0 },
        { formula: "dy/dx", x: "85%", y: "25%", delay: 0.5 },
        { formula: "F = ma", x: "10%", y: "70%", delay: 1 },
        { formula: "E = mc²", x: "90%", y: "75%", delay: 1.5 },
        { formula: "lim x→0", x: "20%", y: "85%", delay: 2 },
        { formula: "∆x/∆y", x: "80%", y: "15%", delay: 2.5 }
      ].map((item, i) => (
        <motion.div
          key={i}
          className="absolute text-blue-300/60 font-mono text-lg select-none"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0.4, 0.8, 0.4],
            y: [0, -15, 0],
            rotate: [0, 5, -5, 0],
            scale: 1
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut"
          }}
        >
          {item.formula}
        </motion.div>
      ))}

      {/* 浮动的学科图标 */}
      {[
        { Icon: Calculator, x: "25%", y: "30%", color: "text-blue-400/50", delay: 0.2 },
        { Icon: Atom, x: "75%", y: "40%", color: "text-sky-400/50", delay: 0.7 },
        { Icon: BookOpen, x: "30%", y: "60%", color: "text-cyan-400/50", delay: 1.2 },
        { Icon: TrendingUp, x: "70%", y: "65%", color: "text-indigo-400/50", delay: 1.7 }
      ].map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.color}`}
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 360],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut"
          }}
        >
          <item.Icon size={28} />
        </motion.div>
      ))}
    </>
  );

  // 简洁的粒子背景
  const SimpleParticles = () => (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-300/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  return (
    <motion.section
      className="relative min-h-screen bg-gradient-to-b from-blue-50 via-sky-50 to-white overflow-hidden"
      style={{ y, opacity }}
      onMouseMove={handleMouseMove}
    >
      {/* 简洁粒子背景 */}
      <SimpleParticles />
      
      {/* A Level学习元素 */}
      <LearningElements />

      {/* 主要内容 */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-8"
          >
            {/* 主标题 */}
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{
                transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.3}px)`
              }}
            >
              {text.heroTitle}
            </motion.h1>

            {/* 副标题 */}
            <motion.p
              className="text-lg md:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              {text.heroSubtitle}
            </motion.p>

            {/* 动态关键词区域 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              <AnimatedKeywords />
            </motion.div>

            {/* 按钮组 */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1 }}
            >
              <motion.button
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.3)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/topics'}
              >
                {text.exploreSubjects}
              </motion.button>

              <motion.button
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-500 rounded-xl hover:bg-blue-50 transition-all duration-300"
                whileHover={{ 
                  scale: 1.05,
                  borderColor: "#2563eb",
                  backgroundColor: "#eff6ff"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {text.viewAllFeatures}
              </motion.button>
            </motion.div>

            {/* 统计数据 */}
            <motion.div
              className="flex justify-center items-center space-x-8 pt-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
            >
              {[
                { number: "50K+", label: "学生用户", color: "text-blue-600" },
                { number: "95%", label: "成绩提升", color: "text-sky-600" },
                { number: "24/7", label: "在线支持", color: "text-cyan-600" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.7 + index * 0.2, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className={`text-2xl md:text-3xl font-bold ${stat.color} mb-1`}>
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* 简洁滚动指示器 */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
        whileHover={{ scale: 1.1 }}
      >
        <div className="w-8 h-12 border-2 border-blue-400 rounded-full flex justify-center bg-white/70 backdrop-blur-sm shadow-lg">
          <motion.div
            className="w-1.5 h-4 bg-blue-500 rounded-full mt-2"
            animate={{ 
              y: [0, 12, 0],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        <motion.div
          className="text-xs text-gray-500 mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <ArrowDown size={16} className="mx-auto" />
        </motion.div>
      </motion.div>

      {/* 底部平滑过渡 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </motion.section>
  );
};

export default SimpleHeroSection;