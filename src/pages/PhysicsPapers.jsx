import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Atom, ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';

const PhysicsPapers = () => {
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

  // 物理levels - 与导航栏完全一致
  const levels = [
    { 
      name: "AS Level", 
      path: "/physics/as-level",
      description: "Mechanics, waves, electricity, and atomic physics fundamentals",
      color: "from-emerald-500 to-teal-600",
      bgColor: "from-emerald-50 to-teal-50"
    },
    { 
      name: "A2 Level", 
      path: "/physics/a2-level",
      description: "Advanced topics including quantum physics, nuclear physics, and electromagnetism",
      color: "from-teal-500 to-cyan-600",
      bgColor: "from-teal-50 to-cyan-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link 
            to="/topics" 
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Subject Selection
          </Link>
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mr-4">
              <Atom size={40} className="text-white" />
            </div>
            <div className="text-left">
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight"
              >
                Physics (9702)
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="text-xl text-gray-600 mt-2"
              >
                Choose a Level to Study
              </motion.p>
            </div>
          </div>
          
          <motion.p
            variants={fadeInUp}
            className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Select from AS Level or A2 Level Physics. Each level covers specific areas of the CIE A Level Physics syllabus.
          </motion.p>
        </motion.div>

        {/* Levels Grid */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto"
        >
          {levels.map((level, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group"
            >
              <Link to={level.path}>
                <div className={`bg-gradient-to-r ${level.bgColor} rounded-2xl border-2 border-transparent hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105`}>
                  
                  {/* Level Header */}
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${level.color} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <BookOpen size={32} className="text-white" />
                      </div>
                      <ChevronRight size={24} className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors duration-300">
                      {level.name}
                    </h3>
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {level.description}
                    </p>
                  </div>

                  {/* Level Footer */}
                  <div className="px-8 pb-8">
                    <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-gray-100 group-hover:border-emerald-200 transition-colors duration-300">
                      <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                        Start Learning
                      </span>
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors duration-300">
                        <ChevronRight size={16} className="text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-center text-white shadow-lg"
        >
          <h3 className="text-2xl font-bold mb-4">
            Complete Physics (9702) Coverage
          </h3>
          <p className="text-emerald-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            Both levels follow the latest CIE syllabus with comprehensive topic coverage, 
            detailed learning objectives, and exam-focused content structure.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {levels.map((level, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-white mb-2">
                  {level.name}
                </div>
                <div className="text-emerald-100 text-sm">
                  Physics Level {index === 0 ? '1' : '2'}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PhysicsPapers;