import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen,      // Topic Navigation
  Bot,           // AI-Powered Q&A & CIE-Style Prompt Templates (merged feature)
  Camera,        // Multi-Modal Image Analysis (new standalone)
  TrendingUp,    // Error Book & Progress Tracking (split from old progress tracking)
  Brain          // Smart Revision Recommendations (new standalone)
} from 'lucide-react';

const CoreFeatures = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 40,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 15,
        duration: 0.6
      }
    }
  };

  const hoverVariants = {
    scale: 1.03,
    y: -5,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  };

  // SIMPLIFIED 4-FEATURE LIST - 核心功能，易于理解
  const features = [
    {
      id: 1,
      icon: BookOpen,
      title: "Topic Navigation",
      description: "Browse all CIE subjects and topics with precise syllabus mapping. Find what you need instantly."
    },
    {
      id: 2,
      icon: Bot,
      title: "AI-Powered Q&A",
      description: "Ask any CIE question and get detailed, step-by-step answers with official marking points."
    },
    
    {
      id: 3,
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Track your mistakes, monitor improvement, and get personalized weekly reports."
    },
    {
      id: 4,
      icon: Brain,
      title: "Smart Recommendations",
      description: "AI suggests exactly what to study next based on your performance and weak areas."
    }
    
  ];

  return (
    <section id="features" className="py-16 lg:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          {/* Large headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Core Features
          </h2>
          
          {/* Simple subtitle */}
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
            Everything you need for CIE A-Level success
          </p>
          
          {/* Clean divider */}
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full" />
        </motion.div>

        {/* Features Grid - Optimized for 4 features */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-5xl mx-auto"
        >
          {features.map((feature) => {
            const IconComponent = feature.icon;
            
            return (
              <motion.div
                key={feature.id}
                variants={cardVariants}
                whileHover={hoverVariants}
                className="group cursor-pointer"
              >
                <div className="bg-white rounded-xl p-8 h-full shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:border-blue-200 text-center">
                  {/* Icon Container */}
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                    <IconComponent 
                      size={28} 
                      className="text-blue-600 group-hover:text-purple-600 transition-colors duration-300" 
                    />
                  </div>

                  {/* Feature Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                    {feature.title}
                  </h3>

                  {/* Feature Description - Short and clear */}
                  <p className="text-gray-600 text-base leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default CoreFeatures; 