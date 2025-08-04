import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, TrendingUp, Award } from 'lucide-react';

const SuccessStories = memo(() => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Success stories data
  const stories = [
    {
      id: 1,
      name: "Sarah Chen",
      subject: "Mathematics & Physics",
      improvement: "D → A*",
      grade: "A*A*A",
      avatar: "👩‍🎓",
      quote: "The AI tutor helped me understand complex calculus concepts that I struggled with for months. The step-by-step explanations were game-changing!",
      timeframe: "6 months",
      university: "Cambridge University"
    },
    {
      id: 2,
      name: "Ahmed Hassan",
      subject: "Chemistry & Biology",
      improvement: "C → A",
      grade: "AAB",
      avatar: "👨‍🎓",
      quote: "Photo recognition feature saved me hours. I could instantly get solutions for organic chemistry mechanisms during revision.",
      timeframe: "4 months",
      university: "Imperial College London"
    },
    {
      id: 3,
      name: "Emily Johnson",
      subject: "Mathematics & Economics",
      improvement: "B → A*",
      grade: "A*A*A*",
      avatar: "👩‍💼",
      quote: "The personalized study plans adapted to my weak areas. Statistics became my strongest topic thanks to targeted practice!",
      timeframe: "5 months",
      university: "Oxford University"
    },
    {
      id: 4,
      name: "Marcus Williams",
      subject: "Physics & Mathematics",
      improvement: "C → A",
      grade: "A*AA",
      avatar: "👨‍🔬",
      quote: "Progress tracking kept me motivated. Seeing my improvement graphs from C to A was incredibly satisfying and encouraging.",
      timeframe: "7 months",
      university: "UCL"
    },
    {
      id: 5,
      name: "Priya Patel",
      subject: "Chemistry & Mathematics",
      improvement: "D → A",
      grade: "AAA",
      avatar: "👩‍🔬",
      quote: "The CIE question bank was exactly what I needed. Every question felt like it could be on my actual exam - and many were!",
      timeframe: "6 months",
      university: "King's College London"
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === stories.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, stories.length]);

  const nextStory = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === stories.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevStory = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? stories.length - 1 : prevIndex - 1
    );
  };

  const goToStory = (index) => {
    setCurrentIndex(index);
  };

  const currentStory = stories[currentIndex];

  return (
    <section className="py-16 lg:py-24 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 transition-colors duration-200">
            🌟 Success Stories
          </h2>
          <p className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed transition-colors duration-200">
            Real students, real results - discover how our platform transforms A Level performance
          </p>
          
          {/* Clean divider */}
          <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-blue-500 mx-auto rounded-full" />
        </motion.div>

        {/* Main Carousel */}
        <div 
          className="relative"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-3xl p-8 md:p-12 shadow-2xl"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left side - Student info */}
                <div className="text-center md:text-left">
                  {/* Avatar and basic info */}
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                    <div className="text-6xl">{currentStory.avatar}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {currentStory.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {currentStory.subject}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {currentStory.university}
                      </p>
                    </div>
                  </div>

                  {/* Achievement badges */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full px-4 py-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {currentStory.improvement}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full px-4 py-2">
                      <Award className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {currentStory.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full px-4 py-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {currentStory.timeframe}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side - Quote */}
                <div className="relative">
                  {/* Quote marks */}
                  <div className="absolute -top-4 -left-4 text-6xl text-blue-500/30 font-serif">"</div>
                  <div className="absolute -bottom-4 -right-4 text-6xl text-blue-500/30 font-serif">"</div>
                  
                  <blockquote className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed italic relative z-10">
                    {currentStory.quote}
                  </blockquote>
                  
                  {/* Star rating */}
                  <div className="flex justify-center md:justify-start gap-1 mt-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={prevStory}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-full flex items-center justify-center hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-300 group"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
          </button>
          
          <button
            onClick={nextStory}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-full flex items-center justify-center hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-300 group"
          >
            <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
          </button>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-3 mt-8">
          {stories.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStory(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-blue-500 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
        >
          <div className="text-center p-6 bg-white/5 dark:bg-gray-800/10 backdrop-blur-sm rounded-2xl border border-white/10 dark:border-gray-700/30">
            <div className="text-3xl font-bold text-green-500 mb-2">95%</div>
            <div className="text-gray-600 dark:text-gray-400">Grade Improvement</div>
          </div>
          <div className="text-center p-6 bg-white/5 dark:bg-gray-800/10 backdrop-blur-sm rounded-2xl border border-white/10 dark:border-gray-700/30">
            <div className="text-3xl font-bold text-blue-500 mb-2">4.9★</div>
            <div className="text-gray-600 dark:text-gray-400">Average Rating</div>
          </div>
          <div className="text-center p-6 bg-white/5 dark:bg-gray-800/10 backdrop-blur-sm rounded-2xl border border-white/10 dark:border-gray-700/30">
            <div className="text-3xl font-bold text-purple-500 mb-2">50K+</div>
            <div className="text-gray-600 dark:text-gray-400">Success Stories</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

SuccessStories.displayName = 'SuccessStories';

export default SuccessStories;