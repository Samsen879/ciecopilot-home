import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, TrendingUp, Award } from 'lucide-react';

const StudentTestimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // 学生成功案例数据
  const testimonials = [
    {
      id: 1,
      name: "Emma Chen",
      school: "International School of Beijing",
      subjects: ["Mathematics", "Physics"],
      beforeGrade: "C",
      afterGrade: "A*",
      improvement: "+3 grades",
      timeframe: "4 months",
      comment: "The AI tutor's personalized approach helped me master Complex Numbers and Mechanics. The step-by-step explanations were exactly what I needed.",
      avatar: "👩‍🎓",
      university: "Cambridge University",
      courses: "Engineering",
      features: ["AI Tutor", "Photo Recognition", "Progress Tracking"]
    },
    {
      id: 2,
      name: "James Wilson",
      school: "British School in Shanghai",
      subjects: ["Physics", "Mathematics"],
      beforeGrade: "D",
      afterGrade: "B",
      improvement: "+2 grades",
      timeframe: "6 months",
      comment: "The CIE Question Bank with official mark schemes was game-changing. I could practice complex physics problems with immediate feedback.",
      avatar: "👨‍🔬",
      university: "Imperial College",
      courses: "Engineering Physics",
      features: ["Question Bank", "Instant Feedback", "Mark Schemes"]
    },
    {
      id: 3,
      name: "Sarah Kim",
      school: "Singapore American School",
      subjects: ["Further Mathematics", "Physics"],
      beforeGrade: "B",
      afterGrade: "A*",
      improvement: "+2 grades",
      timeframe: "3 months",
      comment: "The personalized study plans adapted to my weak areas in Integration techniques and Electromagnetic theory. Brilliant AI recommendations!",
      avatar: "👩‍💻",
      university: "MIT",
      courses: "Applied Mathematics",
      features: ["Personalized AI", "Study Plans", "Adaptive Learning"]
    },
    {
      id: 4,
      name: "Alex Thompson",
      school: "Dulwich College Shanghai",
      subjects: ["Mathematics", "Economics"],
      beforeGrade: "C",
      afterGrade: "A",
      improvement: "+2 grades",
      timeframe: "5 months",
      comment: "24/7 AI availability meant I could get help with Calculus problems anytime. The grade prediction feature kept me motivated throughout.",
      avatar: "👨‍💼",
      university: "Oxford University",
      courses: "Economics & Management",
      features: ["24/7 Support", "Grade Prediction", "Real-time Help"]
    },
    {
      id: 5,
      name: "Lily Zhang",
      school: "Harrow International School",
      subjects: ["Physics", "Mathematics"],
      beforeGrade: "D",
      afterGrade: "A",
      improvement: "+3 grades",
      timeframe: "7 months",
      comment: "Photo recognition made studying so much faster. I could snap pictures of complex diagrams and get detailed explanations instantly.",
      avatar: "👩‍🔬",
      university: "UCL",
      courses: "Engineering Physics",
      features: ["Photo Recognition", "OCR Technology", "Physics Diagrams"]
    }
  ];

  // 自动轮播
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const currentTestimonial = testimonials[currentIndex];

  const gradeColors = {
    'A*': 'text-green-600 bg-green-100',
    'A': 'text-blue-600 bg-blue-100',
    'B': 'text-purple-600 bg-purple-100',
    'C': 'text-orange-600 bg-orange-100',
    'D': 'text-red-600 bg-red-100'
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            🎓 Student Success Stories
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real results from students who transformed their A Level performance with our AI platform
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-sky-500 mx-auto rounded-full mt-8" />
        </motion.div>

        {/* 主要轮播区域 */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-100"
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              <div className="grid md:grid-cols-2 gap-0">
                {/* 左侧：学生信息 */}
                <div className="p-8 lg:p-12 bg-gradient-to-br from-blue-50 to-sky-50">
                  <div className="space-y-6">
                    {/* 学生头像和基本信息 */}
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center text-3xl">
                        {currentTestimonial.avatar}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{currentTestimonial.name}</h3>
                        <p className="text-gray-600">{currentTestimonial.school}</p>
                      </div>
                    </div>

                    {/* 成绩提升展示 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">GRADE IMPROVEMENT</span>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${gradeColors[currentTestimonial.beforeGrade]}`}>
                            {currentTestimonial.beforeGrade}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Before</p>
                        </div>
                        
                        <div className="flex-1 flex items-center">
                          <div className="flex-1 h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-full relative">
                            <motion.div
                              className="absolute right-0 top-0 h-2 w-8 bg-green-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: "32px" }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${gradeColors[currentTestimonial.afterGrade]}`}>
                            {currentTestimonial.afterGrade}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">After</p>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <span className="text-2xl font-bold text-green-600">{currentTestimonial.improvement}</span>
                        <span className="text-gray-500 ml-2">in {currentTestimonial.timeframe}</span>
                      </div>
                    </div>

                    {/* 学科信息 */}
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">SUBJECTS</p>
                      <div className="flex flex-wrap gap-2">
                        {currentTestimonial.subjects.map((subject, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 大学录取信息 */}
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-800">University Admission</span>
                      </div>
                      <p className="text-purple-700 font-semibold">{currentTestimonial.university}</p>
                      <p className="text-purple-600 text-sm">{currentTestimonial.courses}</p>
                    </div>
                  </div>
                </div>

                {/* 右侧：评价和功能 */}
                <div className="p-8 lg:p-12">
                  <div className="space-y-6">
                    {/* 五星评价 */}
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                      <span className="text-gray-600 ml-2">5.0</span>
                    </div>

                    {/* 学生评价 */}
                    <blockquote className="text-lg text-gray-700 leading-relaxed italic">
                      "{currentTestimonial.comment}"
                    </blockquote>

                    {/* 使用的功能 */}
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-3">KEY FEATURES USED</p>
                      <div className="space-y-2">
                        {currentTestimonial.features.map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center space-x-2"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-gray-700 text-sm">{feature}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* CTA按钮 */}
                    <motion.button
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.location.href = '/ask-ai'}
                    >
                      Start Your Success Story →
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 导航按钮 */}
          <button
            onClick={prevTestimonial}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-gray-600 hover:text-blue-600"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextTestimonial}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-gray-600 hover:text-blue-600"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* 轮播指示器 */}
        <div className="flex justify-center space-x-3 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                w-3 h-3 rounded-full transition-all duration-200
                ${index === currentIndex ? 'bg-blue-500 w-8' : 'bg-gray-300 hover:bg-gray-400'}
              `}
            />
          ))}
        </div>

        {/* 自动播放指示 */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            {isAutoPlaying ? "🔄 Auto-playing" : "⏸️ Paused"} • Hover to pause
          </p>
        </div>
      </div>
    </section>
  );
};

export default StudentTestimonials;