import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Bot, TrendingUp, HelpCircle, BarChart } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const CoreFeatures = memo(() => {
  const { text } = useTheme();
  
  // Animation variants
  const fadeInUp = useMemo(() => ({
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  }), []);

  const staggerContainer = useMemo(() => ({
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  }), []);

  // Features array using translations
  const features = useMemo(() => [
    {
      icon: Bot,
      title: text.aiTutoringTitle,
      description: text.aiTutoringDesc
    },
    {
      icon: BookOpen,
      title: text.comprehensiveCoverageTitle,
      description: text.comprehensiveCoverageDesc
    },
    {
      icon: TrendingUp,
      title: text.smartAnalysisTitle,
      description: text.smartAnalysisDesc
    },
    {
      icon: HelpCircle,
      title: text.practiceQuestionsTitle,
      description: text.practiceQuestionsDesc
    },
    {
      icon: BarChart,
      title: text.progressTrackingTitle,
      description: text.progressTrackingDesc
    }
  ], [text]);

  return (
    <section id="features" className="py-16 lg:py-24 bg-white dark:bg-gray-800 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 transition-colors duration-200"
          >
            {text.coreFeatures}
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed transition-colors duration-200"
          >
            {text.coreFeaturesSubtitle}
          </motion.p>
          
          {/* Clean divider */}
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full" />
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group"
              >
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 h-full 
                              shadow-sm hover:shadow-xl transition-all duration-300 
                              hover:border-blue-200/50 dark:hover:border-blue-600/50">
                  {/* Icon */}
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30
                                rounded-2xl flex items-center justify-center mb-6 
                                group-hover:from-blue-100 group-hover:to-indigo-200 dark:group-hover:from-blue-800/50 dark:group-hover:to-indigo-800/50
                                transition-all duration-300">
                    <IconComponent 
                      className="w-7 h-7 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300
                               group-hover:scale-110 transition-all duration-300" 
                    />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 
                               group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm 
                              group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                    {feature.description}
                  </p>
                  
                  {/* Hover indicator */}
                  <div className="mt-6 opacity-0 group-hover:opacity-100 
                                transition-opacity duration-300">
                    <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
});

CoreFeatures.displayName = 'CoreFeatures';

export default CoreFeatures; 