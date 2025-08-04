import React from 'react';
import { motion } from 'framer-motion';
import { Bot, BookOpen, TrendingUp, Camera, Brain, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SimpleFeatures = () => {
  const { text } = useTheme();

  // 简洁的功能数据
  const features = [
    {
      icon: Bot,
      title: '智能AI导师',
      description: '24/7专业CIE导师，实时解答疑问',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    {
      icon: Camera,
      title: '拍照识题',
      description: '拍照上传题目，AI立即生成详细解答',
      color: 'from-sky-500 to-sky-600',
      bgColor: 'from-sky-50 to-sky-100'
    },
    {
      icon: BookOpen,
      title: 'CIE题库',
      description: '严格按照mark scheme设计的练习题',
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'from-cyan-50 to-cyan-100'
    },
    {
      icon: TrendingUp,
      title: '进度追踪',
      description: '详细的学习分析和成绩预测',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'from-indigo-50 to-indigo-100'
    },
    {
      icon: Brain,
      title: '个性化推荐',
      description: '基于你的水平定制专属学习计划',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    {
      icon: Zap,
      title: '即时反馈',
      description: '快速准确的答案验证和解释',
      color: 'from-pink-500 to-pink-600',
      bgColor: 'from-pink-50 to-pink-100'
    }
  ];

  // 动画配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="features" className="py-16 lg:py-24 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            核心功能
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            六大核心功能，让AI成为你的专属CIE导师
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-sky-500 mx-auto rounded-full mt-8" />
        </motion.div>

        {/* 功能网格 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group cursor-pointer"
                whileHover={{ y: -5 }}
              >
                <div className={`bg-gradient-to-br ${feature.bgColor} rounded-2xl p-8 h-full shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50`}>
                  {/* 图标 */}
                  <motion.div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </motion.div>

                  {/* 内容 */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {feature.description}
                  </p>

                  {/* 装饰元素 */}
                  <motion.div
                    className="mt-6 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full group-hover:w-12 transition-all duration-300"
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 底部统计 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-blue-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: '10K+', label: '练习题目', color: 'text-blue-600' },
                { number: '99.2%', label: 'AI准确率', color: 'text-sky-600' },
                { number: '85%', label: '成绩提升', color: 'text-cyan-600' },
                { number: '3分钟', label: '平均响应', color: 'text-indigo-600' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className={`text-2xl md:text-3xl font-bold ${stat.color} mb-2`}>
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SimpleFeatures;