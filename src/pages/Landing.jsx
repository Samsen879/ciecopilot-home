import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Bot, Camera, TrendingUp, Globe, Target, Award, Zap, Languages, ChevronDown, ChevronUp, Star, TrendingUp as Chart } from 'lucide-react';
import AnimatedKeywords from '../components/AnimatedKeywords';
import ChatWidget from '../components/ChatWidget';

const Landing = () => {
  // FAQ 手风琴状态管理
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  // 用户反馈数据
  const userFeedbacks = [
    {
      id: 1,
      content: "AI 自动诊断错因后，我数学成绩提升了 2 个等级",
      author: "张同学",
      subject: "Mathematics",
      grade: "A* → A*",
      avatar: "🧑‍🎓"
    },
    {
      id: 2,
      content: "CIE 专属解答让我在物理考试中准确命中评分点",
      author: "李同学",
      subject: "Physics",
      grade: "B → A",
      avatar: "👩‍🎓"
    },
    {
      id: 3,
      content: "双语解释功能帮我更好理解经济学概念",
      author: "王家长",
      subject: "Economics",
      grade: "C → A",
      avatar: "👨‍💼"
    }
  ];

  // FAQ数据
  const faqData = [
    {
      question: "为什么比普通 AI 更懂考试？",
      answer: "我们的AI经过专门训练，深度学习了CIE考试局的syllabus和mark scheme，能够准确识别评分点，提供符合官方标准的解答格式。"
    },
    {
      question: "是否支持其他考试局？",
      answer: "目前专注于CIE考试局，确保深度和专业性。未来会根据用户需求逐步扩展到其他考试局如AQA、Edexcel等。"
    },
    {
      question: "能否用中文提问？",
      answer: "完全支持！您可以用中文提问，系统会给出中英文对照的解答，帮助理解概念的同时掌握标准英文表达。"
    },
    {
      question: "如何保障答案准确性？",
      answer: "所有答案都严格参照官方mark scheme生成，每个解答步骤都标注评分点，并由专业团队持续优化和验证。"
    }
  ];

  // 核心功能数据
  const coreFeatures = [
    {
      id: "knowledge-cards",
      title: "知识卡片速览",
      description: "覆盖 CIE 全套 syllabus，模块化复习，考点一目了然",
      icon: BookOpen,
      anchor: "#knowledge-cards"
    },
    {
      id: "gpt-qa",
      title: "GPT-4 智能问答",
      description: "数理经济专属 Prompt，解题讲解直击得分点",
      icon: Bot,
      anchor: "#gpt-qa"
    },
    {
      id: "error-analysis",
      title: "错题图像分析",
      description: "上传拍照，AI 自动诊断错误并给出评分要点",
      icon: Camera,
      anchor: "#error-analysis"
    },
    {
      id: "progress-tracking",
      title: "学习进度追踪",
      description: "周报生成，任务规划，查漏补缺",
      icon: TrendingUp,
      anchor: "#progress-tracking"
    },
    {
      id: "multilingual",
      title: "多语言支持",
      description: "支持中文提问+英文术语双语解释",
      icon: Globe,
      anchor: "#multilingual"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-b from-[#e0f2ff] to-white flex items-center justify-center">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-8"
          >
            {/* 主标题 - 大字号、加粗、深色 */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-tight"
            >
              一对一定制化 A Level 学习助手
            </motion.h1>

            {/* 副标题 - 描述网站亮点 */}
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-4"
            >
              专为 CIE 考试局定制，精细化覆盖考试大纲，AI智能错题分析与真题题型总结
            </motion.p>

            {/* 动态关键词区域 */}
            <motion.div variants={fadeInUp}>
              <AnimatedKeywords />
            </motion.div>

            {/* 按钮组 */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
            >
              {/* 主按钮 - 蓝色渐变、白字、阴影 */}
              <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                开始学习
              </button>
              
              {/* 次按钮 - 白底蓝边框，点击滚动到功能区 */}
              <button 
                onClick={() => {
                  document.querySelector('#features')?.scrollIntoView({ 
                    behavior: 'smooth' 
                  });
                }}
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-500 rounded-xl hover:bg-blue-50 hover:border-blue-600 transform hover:scale-105 transition-all duration-300"
              >
                查看全部功能
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 核心功能一览 */}
      <section id="features" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* 顶部标题 */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
            >
              核心功能一览
            </motion.h2>
            <motion.div
              variants={fadeInUp}
              className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full"
            />
          </motion.div>

          {/* 功能卡片网格 - 3列lg、2列md、1列sm */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {coreFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={feature.id}
                  variants={fadeInUp}
                  className="group cursor-pointer"
                  onClick={() => {
                    // 点击跳转到详细介绍锚点
                    console.log(`跳转到: ${feature.anchor}`);
                  }}
                >
                  {/* 卡片容器 - 白色背景、圆角、阴影、hover效果 */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-8 h-full shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200">
                    
                    {/* 图标区域 */}
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent 
                        size={32} 
                        className="text-blue-600 group-hover:text-blue-700 transition-colors duration-300" 
                      />
                    </div>

                    {/* 主标题 */}
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                      {feature.title}
                    </h3>

                    {/* 功能描述 */}
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {feature.description}
                    </p>

                    {/* 底部装饰线 */}
                    <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* AI 智能演示与差异化优势 */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          {/* 模块标题 */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              AI 智能演示与差异化优势
            </motion.h2>
            <motion.div
              variants={fadeInUp}
              className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full"
            />
          </motion.div>

          {/* 对比演示区域 */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
          >
            {/* 左侧：普通 AI 回答 */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <Bot size={24} className="text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700">普通 AI 回答</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <strong>题目：</strong>求函数 f(x) = x² + 3x - 4 的最小值
                  </div>
                  
                  <div className="text-gray-700 leading-relaxed">
                    <p className="mb-3">这是一个二次函数，开口向上，所以有最小值。</p>
                    <p className="mb-3">使用配方法：f(x) = (x + 3/2)² - 25/4</p>
                    <p>所以最小值是 -25/4 = -6.25</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 右侧：本产品 CIE 优化 AI 回答 */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-200 relative overflow-hidden">
                {/* 优势标签 */}
                <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-sky-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  CIE 优化
                </div>
                
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl flex items-center justify-center mr-4">
                    <Target size={24} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-700">本产品 CIE 优化 AI 回答</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                    <strong>题目：</strong>求函数 f(x) = x² + 3x - 4 的最小值
                  </div>
                  
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong className="text-blue-600">[Method - Completing the square]</strong></p>
                    <p>f(x) = x² + 3x - 4</p>
                    <p><strong className="text-blue-600">[A1]</strong> f(x) = (x + 3/2)² - (3/2)² - 4</p>
                    <p><strong className="text-blue-600">[A1]</strong> f(x) = (x + 3/2)² - 9/4 - 4</p>
                    <p><strong className="text-blue-600">[A1]</strong> f(x) = (x + 3/2)² - 25/4</p>
                    <p><strong className="text-blue-600">[A1]</strong> Minimum value = -25/4 at x = -3/2</p>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      <strong>评分要点：</strong>完整配方过程 (4分)，正确识别最小值点 (1分)
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* 蓝色分割线 */}
          <motion.div
            variants={fadeInUp}
            className="w-full h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent mb-8"
          />

          {/* 底部横幅 */}
          <motion.div
            variants={fadeInUp}
            className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-8 text-center border border-blue-100"
          >
            <p className="text-lg md:text-xl font-semibold text-blue-800 leading-relaxed">
              所有答案均严格参照官方 Mark Scheme，非泛化处理，针对性直击提分
            </p>
          </motion.div>
        </div>
      </section>

      {/* 为什么专为 CIE 定制 */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          {/* 模块标题 */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              专为 CIE 考试局深度定制
            </motion.h2>
            <motion.div
              variants={fadeInUp}
              className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full"
            />
          </motion.div>

          {/* 差异化优势卡片 */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* 卡片1：syllabus覆盖 */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                完全覆盖 CIE 2024 syllabus
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                每个知识点细致拆分，确保无遗漏覆盖最新考试大纲，精准对标考试要求
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>

            {/* 卡片2：Mark Scheme */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Award size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                严格遵循官方 Mark Scheme
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                AI 输出精确标注评分点，答案格式完全对标官方标准，提分路径清晰可见
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>

            {/* 卡片3：专业训练 */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                专业模型训练与 Prompt 设计
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                深度适配数理经济术语体系，确保学科专业性和答案准确性达到考试标准
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>

            {/* 卡片4：双语支持 */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Languages size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                中文解释 + 英文对照
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                降低非英语母语用户学习门槛，中文理解+英文表达双重保障，考试无忧
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 用户反馈与常见问题 */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          {/* 顶部标题 */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              学生真实反馈 & 常见疑问
            </motion.h2>
            <motion.div
              variants={fadeInUp}
              className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full"
            />
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12"
          >
            {/* 左侧：用户反馈 */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">学生真实反馈</h3>
              
              {userFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                >
                  {/* 用户信息头部 */}
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-sky-50 rounded-full flex items-center justify-center text-2xl mr-4">
                      {feedback.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{feedback.author}</h4>
                        <div className="flex items-center space-x-1">
                          <Chart size={16} className="text-green-500" />
                          <span className="text-sm font-medium text-green-600">{feedback.grade}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{feedback.subject}</p>
                    </div>
                  </div>

                  {/* 反馈内容 */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-4">
                    <p className="text-gray-700 leading-relaxed">"{feedback.content}"</p>
                  </div>

                  {/* 星级评分 */}
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="text-yellow-400 fill-current" />
                    ))}
                    <span className="text-sm text-gray-600 ml-2">5.0</span>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* 右侧：FAQ手风琴 */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">常见疑问解答</h3>
              
              <div className="space-y-4">
                {faqData.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* FAQ问题头部 */}
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                    >
                      <h4 className="font-semibold text-gray-900 pr-4">{faq.question}</h4>
                      {openFAQ === index ? (
                        <ChevronUp className="text-blue-600 flex-shrink-0" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400 flex-shrink-0" size={20} />
                      )}
                    </button>

                    {/* FAQ答案内容 */}
                    <motion.div
                      initial={false}
                      animate={{
                        height: openFAQ === index ? "auto" : 0,
                        opacity: openFAQ === index ? 1 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5">
                        <div className="bg-blue-50 rounded-xl p-4">
                          <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 强CTA区块 */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="bg-gradient-to-r from-[#e0f2ff] to-[#f7fbff] rounded-3xl p-12 lg:p-16 text-center shadow-xl"
          >
            {/* 主标题 */}
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              准备开启你的A*之路了吗？
            </motion.h2>

            {/* 鼓励语 */}
            <motion.p
              variants={fadeInUp}
              className="text-xl lg:text-2xl text-gray-700 mb-10 leading-relaxed"
            >
              加入数千名 CIE 学生，用 AI 助力高分目标
            </motion.p>

            {/* 主CTA按钮 */}
            <motion.div variants={fadeInUp}>
              <button className="inline-flex items-center px-12 py-5 text-xl font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl">
                立即开始学习
                <svg className="ml-3 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </motion.div>

            {/* 装饰元素 */}
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex items-center justify-center space-x-8 text-sm text-gray-600"
            >
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                免费试用
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                无需信用卡
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                即时体验
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 简洁页脚 */}
      <footer className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-600 mb-4">
            © 2024 CIE AI Learning Assistant. 专为A Level学生打造的智能学习平台
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <span>隐私政策</span>
            <span>•</span>
            <span>服务条款</span>
            <span>•</span>
            <span>联系我们</span>
          </div>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Landing;
