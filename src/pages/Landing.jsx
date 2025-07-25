import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Bot, Camera, TrendingUp, Globe, Target, Award, Zap, Languages, ChevronDown, ChevronUp, Star, TrendingUp as Chart } from 'lucide-react';
import AnimatedKeywords from '../components/AnimatedKeywords';
import ChatWidget from '../components/ChatWidget';
import CoreFeatures from '../components/CoreFeatures';

const Landing = () => {
  // FAQ accordion state management
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

  // User feedback data
  const userFeedbacks = [
    {
      id: 1,
      content: "After AI automated error diagnosis, my mathematics grade improved by 2 levels",
      author: "Sarah Chen",
      subject: "Mathematics",
      grade: "B → A*",
      avatar: "🧑‍🎓"
    },
    {
      id: 2,
      content: "CIE-specific answers helped me accurately hit marking points in physics exams",
      author: "James Li",
      subject: "Physics",
      grade: "B → A",
      avatar: "👩‍🎓"
    },
    {
      id: 3,
      content: "Bilingual explanations helped me better understand economics concepts",
      author: "Emma Wang",
      subject: "Economics",
      grade: "C → A",
      avatar: "👨‍💼"
    }
  ];

  // FAQ data
  const faqData = [
    {
      question: "Why does our AI understand exams better than generic AI?",
      answer: "Our AI is specially trained with deep learning on CIE exam board syllabus and mark schemes, accurately identifying marking points and providing answers that meet official standards."
    },
    {
      question: "Do you support other exam boards?",
      answer: "Currently focused on CIE exam board to ensure depth and professionalism. We will gradually expand to other boards like AQA, Edexcel based on user demand."
    },
    {
      question: "Can I ask questions in Chinese?",
      answer: "Absolutely! You can ask in Chinese and receive bilingual answers with English-Chinese explanations, helping you understand concepts while mastering standard English expressions."
    },
    {
      question: "How do you ensure answer accuracy?",
      answer: "All answers are strictly generated according to official mark schemes, with each solution step marked with scoring points, continuously optimized and verified by our professional team."
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
            {/* Main title - large, bold, dark */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-tight"
            >
              Personalized A Level Learning Assistant
            </motion.h1>

            {/* Subtitle - describing website highlights */}
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-4"
            >
              Exclusively designed for CIE exam board with comprehensive syllabus coverage, AI-powered error analysis and past paper pattern summaries
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
              {/* Primary button - blue gradient, white text, shadow - 直接跳转到topics页面 */}
              <button 
                onClick={() => {
                  window.location.href = '/topics';
                }}
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Explore Subjects
              </button>
              
              {/* Secondary button - white background blue border, scroll to features */}
              <button 
                onClick={() => {
                  document.querySelector('#features')?.scrollIntoView({ 
                    behavior: 'smooth' 
                  });
                }}
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-500 rounded-xl hover:bg-blue-50 hover:border-blue-600 transform hover:scale-105 transition-all duration-300"
              >
                View All Features
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Component */}
      <CoreFeatures />

      {/* AI Smart Demo & Competitive Advantages */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section title */}
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
              AI Smart Demo & Competitive Advantages
            </motion.h2>
            <motion.div
              variants={fadeInUp}
              className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full"
            />
          </motion.div>

          {/* Comparison demo area */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
          >
            {/* Left side: Generic AI answer */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <Bot size={24} className="text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700">Generic AI Answer</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <strong>Question:</strong> Find the minimum value of function f(x) = x² + 3x - 4
                  </div>
                  
                  <div className="text-gray-700 leading-relaxed">
                    <p className="mb-3">This is a quadratic function opening upward, so it has a minimum value.</p>
                    <p className="mb-3">Using completing the square: f(x) = (x + 3/2)² - 25/4</p>
                    <p>So the minimum value is -25/4 = -6.25</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right side: Our CIE-Optimized AI answer */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-200 relative overflow-hidden">
                {/* Advantage badge */}
                <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-sky-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  CIE Optimized
                </div>
                
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl flex items-center justify-center mr-4">
                    <Target size={24} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-700">Our CIE-Optimized AI Answer</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                    <strong>Question:</strong> Find the minimum value of function f(x) = x² + 3x - 4
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
                      <strong>Marking Points:</strong> Complete squaring process (4 marks), correctly identify minimum point (1 mark)
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Blue divider line */}
          <motion.div
            variants={fadeInUp}
            className="w-full h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent mb-8"
          />

          {/* Bottom banner */}
          <motion.div
            variants={fadeInUp}
            className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-8 text-center border border-blue-100"
          >
            <p className="text-lg md:text-xl font-semibold text-blue-800 leading-relaxed">
              All answers strictly follow official Mark Schemes, not generic processing, targeted for score improvement
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Exclusively Designed for CIE */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section title */}
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
              Exclusively Designed for CIE Exam Board
            </motion.h2>
            <motion.div
              variants={fadeInUp}
              className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full"
            />
          </motion.div>

          {/* Competitive advantage cards */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Card 1: Syllabus coverage */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                Complete Coverage of CIE latest Syllabus
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Each knowledge point meticulously broken down, ensuring comprehensive coverage of the latest exam syllabus with precise alignment to exam requirements
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>

            {/* Card 2: Mark Scheme */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Award size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                Strictly Follows Official Mark Schemes
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                AI output precisely annotates marking points, answer format completely aligned with official standards, clear path to score improvement
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>

            {/* Card 3: Professional training */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                Professional Model Training & Prompt Design
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Deep adaptation to mathematics, physics, and economics terminology systems, ensuring subject expertise and answer accuracy meets exam standards
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>

            {/* Card 4: Bilingual support */}
            <motion.div
              variants={fadeInUp}
              className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-blue-200"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Languages size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                Chinese Explanations + English Correspondence
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                Lower learning barriers for non-native English speakers, dual guarantee of Chinese understanding + English expression for worry-free exams
              </p>
              <div className="mt-6 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* User Feedback & Common Questions */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          {/* Top title */}
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
              Student Testimonials & FAQ
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
            {/* Left side: User feedback */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Student Testimonials</h3>
              
              {userFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                >
                  {/* User info header */}
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

                  {/* Feedback content */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-4">
                    <p className="text-gray-700 leading-relaxed">"{feedback.content}"</p>
                  </div>

                  {/* Star rating */}
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="text-yellow-400 fill-current" />
                    ))}
                    <span className="text-sm text-gray-600 ml-2">5.0</span>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Right side: FAQ accordion */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h3>
              
              <div className="space-y-4">
                {faqData.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* FAQ question header */}
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

                    {/* FAQ answer content */}
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

      {/* Strong CTA Block */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="bg-gradient-to-r from-[#e0f2ff] to-[#f7fbff] rounded-3xl p-12 lg:p-16 text-center shadow-xl"
          >
            {/* Main title */}
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Ready to Start Your Journey to A*?
            </motion.h2>

            {/* Encouraging message */}
            <motion.p
              variants={fadeInUp}
              className="text-xl lg:text-2xl text-gray-700 mb-10 leading-relaxed"
            >
              Join thousands of CIE students achieving high scores with AI assistance
            </motion.p>

            {/* Main CTA button */}
            <motion.div variants={fadeInUp}>
              <button 
                onClick={() => {
                  window.location.href = '/ask-ai';
                }}
                className="inline-flex items-center px-12 py-5 text-xl font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl"
              >
                Try AI Assistant Now
                <svg className="ml-3 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </motion.div>

            {/* Decorative elements */}
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex items-center justify-center space-x-8 text-sm text-gray-600"
            >
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Free Trial
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                No Credit Card
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Instant Access
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Clean footer */}
      <footer className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-600 mb-4">
            © 2024 CIE AI Learning Assistant. Intelligent learning platform built exclusively for A Level students
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
            <span>•</span>
            <span>Contact Us</span>
          </div>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Landing;
